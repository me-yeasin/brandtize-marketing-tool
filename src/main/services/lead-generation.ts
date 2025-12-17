import { ChatGroq } from '@langchain/groq'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatVertexAI } from '@langchain/google-vertexai'
import { HumanMessage } from '@langchain/core/messages'
import {
  getApiKeys,
  getSelectedAiProvider,
  getSelectedModel,
  getSelectedGoogleMode,
  getGoogleProjectId,
  getGoogleLocation,
  getAgencyProfile
} from '../store'

// Types
export interface LeadGenerationInput {
  searchQuery: string
  niche: string
  location: string
}

export interface SearchResult {
  title: string
  link: string
  snippet: string
}

export interface ScrapedContent {
  url: string
  content: string
  title: string
}

export interface LeadResult {
  url: string
  email: string | null
  decisionMaker: string | null
  verified: boolean
  source: 'direct' | 'hunter_name' | 'hunter_domain'
  needsServices: boolean
  serviceMatchReason: string | null
}

export interface LeadGenerationCallbacks {
  onSearchStart: (query: string) => void
  onSearchComplete: (results: SearchResult[]) => void
  onCleanupComplete: (urls: string[]) => void
  onScrapeStart: (url: string) => void
  onScrapeComplete: (url: string, content: ScrapedContent) => void
  onScrapeError: (url: string, error: string) => void
  onAiAnalysisStart: (url: string) => void
  onAiAnalysisResult: (url: string, email: string | null, decisionMaker: string | null) => void
  onServiceMatchStart: (url: string) => void
  onServiceMatchResult: (url: string, needsServices: boolean, reason: string | null) => void
  onHunterStart: (url: string, type: 'name' | 'domain') => void
  onHunterResult: (url: string, email: string | null) => void
  onVerificationStart: (email: string) => void
  onVerificationResult: (email: string, verified: boolean) => void
  onLeadFound: (lead: LeadResult) => void
  onComplete: (leads: LeadResult[]) => void
  onError: (error: string) => void
}

// URLs to filter out (not useful for lead generation)
const BLOCKED_DOMAINS = [
  'yelp.com',
  'yellowpages.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'tripadvisor.com',
  'indeed.com',
  'glassdoor.com',
  'craigslist.org',
  'pinterest.com',
  'youtube.com',
  'tiktok.com',
  'reddit.com',
  'wikipedia.org',
  'bing.com',
  'google.com',
  'amazon.com',
  'ebay.com'
]

// Serper API - Web Search
async function searchWithSerper(query: string): Promise<SearchResult[]> {
  const { serperApiKey } = getApiKeys()
  if (!serperApiKey) throw new Error('Serper API key not configured')

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': serperApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: query,
      num: 10
    })
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`)
  }

  const data = await response.json()
  return (data.organic || []).map((item: { title: string; link: string; snippet: string }) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet || ''
  }))
}

// URL Cleanup - Filter out unwanted domains
function cleanupUrls(results: SearchResult[]): string[] {
  return results
    .map((r) => r.link)
    .filter((url) => {
      const urlLower = url.toLowerCase()
      return !BLOCKED_DOMAINS.some((domain) => urlLower.includes(domain))
    })
}

// Jina Reader API - Content Scraping
async function scrapeWithJina(url: string): Promise<ScrapedContent> {
  const { jinaApiKey } = getApiKeys()
  if (!jinaApiKey) throw new Error('Jina API key not configured')

  const response = await fetch(`https://r.jina.ai/${url}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jinaApiKey}`,
      Accept: 'text/plain'
    }
  })

  if (!response.ok) {
    throw new Error(`Jina API error: ${response.status}`)
  }

  const content = await response.text()
  return {
    url,
    content: content.slice(0, 15000), // Limit content size for AI processing
    title: url
  }
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Hunter.io API - Find email by domain
async function findEmailByDomain(domain: string): Promise<string | null> {
  const { hunterApiKey } = getApiKeys()
  if (!hunterApiKey) return null

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterApiKey}`
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.data?.emails?.length > 0) {
      // Return the first email found
      return data.data.emails[0].value
    }
    return null
  } catch {
    return null
  }
}

// Hunter.io API - Find email by name and domain
async function findEmailByName(
  firstName: string,
  lastName: string,
  domain: string
): Promise<string | null> {
  const { hunterApiKey } = getApiKeys()
  if (!hunterApiKey) return null

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${hunterApiKey}`
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.data?.email) {
      return data.data.email
    }
    return null
  } catch {
    return null
  }
}

// AI Analysis - Extract email and decision maker from content
interface AiAnalysisResult {
  email: string | null
  decisionMaker: string | null
}

async function analyzeContentWithAi(content: string): Promise<AiAnalysisResult> {
  const provider = getSelectedAiProvider()
  const { groqApiKey, mistralApiKey, googleApiKey } = getApiKeys()
  const selectedModel = getSelectedModel()

  const prompt = `Analyze the following website content and extract:
1. Any email addresses you find (look for patterns like name@domain.com)
2. The name of the business owner, CEO, founder, or main decision maker

Respond ONLY in this exact JSON format, nothing else:
{"email": "found_email@example.com or null", "decisionMaker": "Person Name or null"}

Website content:
${content.slice(0, 8000)}`

  try {
    let response: string = ''

    if (provider === 'groq' && groqApiKey) {
      const client = new ChatGroq({
        apiKey: groqApiKey,
        model: selectedModel,
        temperature: 0
      })
      const result = await client.invoke([new HumanMessage(prompt)])
      response = result.content as string
    } else if (provider === 'mistral' && mistralApiKey) {
      const client = new ChatMistralAI({
        apiKey: mistralApiKey,
        model: selectedModel,
        temperature: 0
      })
      const result = await client.invoke([new HumanMessage(prompt)])
      response = result.content as string
    } else if (provider === 'google' && googleApiKey) {
      const googleMode = getSelectedGoogleMode()
      let client
      if (googleMode === 'vertexApiKey') {
        const projectId = getGoogleProjectId()
        const location = getGoogleLocation()
        client = new ChatVertexAI({
          model: selectedModel,
          temperature: 0,
          authOptions: { apiKey: googleApiKey },
          ...(projectId && { projectId }),
          ...(location && { location })
        })
      } else {
        client = new ChatGoogleGenerativeAI({
          apiKey: googleApiKey,
          model: selectedModel,
          temperature: 0
        })
      }
      const result = await client.invoke([new HumanMessage(prompt)])
      response = result.content as string
    } else {
      return { email: null, decisionMaker: null }
    }

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        email: parsed.email === 'null' ? null : parsed.email || null,
        decisionMaker: parsed.decisionMaker === 'null' ? null : parsed.decisionMaker || null
      }
    }
    return { email: null, decisionMaker: null }
  } catch (error) {
    console.error('AI analysis error:', error)
    return { email: null, decisionMaker: null }
  }
}

// Service Matching - Check if the business needs our services (saves Hunter.io and Reoon credits)
interface ServiceMatchResult {
  needsServices: boolean
  reason: string | null
}

async function checkServiceMatch(content: string): Promise<ServiceMatchResult> {
  const profile = getAgencyProfile()
  const services = profile.services.filter((s) => s.trim().length > 0)

  if (services.length === 0) {
    return { needsServices: true, reason: 'No services defined in profile - accepting all leads' }
  }

  const provider = getSelectedAiProvider()
  const { groqApiKey, mistralApiKey, googleApiKey } = getApiKeys()
  const selectedModel = getSelectedModel()

  const prompt = `You are a lead qualification expert. Analyze this website content and determine if this business could benefit from these services:

SERVICES WE OFFER:
${services.map((s, i) => `${i + 1}. ${s}`).join('\n')}

WEBSITE CONTENT:
${content.slice(0, 6000)}

Analyze if this business shows ANY of these signs:
1. Outdated website (old copyright dates like 2019-2022, old design patterns)
2. Missing features we could provide (no mobile optimization, poor SEO, etc.)
3. Job postings or "we're hiring" for services we offer
4. Explicit mentions of needing help with services we provide
5. Poor quality in areas where we excel
6. send your resume to
7. 

Be STRICT - only say YES if there's clear evidence they need our services.

Respond ONLY in this exact JSON format:
{"needsServices": true/false, "reason": "One sentence explaining WHY they need or don't need our services"}`

  try {
    let response: string = ''

    if (provider === 'groq' && groqApiKey) {
      const client = new ChatGroq({
        apiKey: groqApiKey,
        model: selectedModel,
        temperature: 0
      })
      const result = await client.invoke([new HumanMessage(prompt)])
      response = result.content as string
    } else if (provider === 'mistral' && mistralApiKey) {
      const client = new ChatMistralAI({
        apiKey: mistralApiKey,
        model: selectedModel,
        temperature: 0
      })
      const result = await client.invoke([new HumanMessage(prompt)])
      response = result.content as string
    } else if (provider === 'google' && googleApiKey) {
      const googleMode = getSelectedGoogleMode()
      let client
      if (googleMode === 'vertexApiKey') {
        const projectId = getGoogleProjectId()
        const location = getGoogleLocation()
        client = new ChatVertexAI({
          model: selectedModel,
          temperature: 0,
          authOptions: { apiKey: googleApiKey },
          ...(projectId && { projectId }),
          ...(location && { location })
        })
      } else {
        client = new ChatGoogleGenerativeAI({
          apiKey: googleApiKey,
          model: selectedModel,
          temperature: 0
        })
      }
      const result = await client.invoke([new HumanMessage(prompt)])
      response = result.content as string
    } else {
      return { needsServices: true, reason: 'AI not configured - accepting lead' }
    }

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        needsServices: parsed.needsServices === true,
        reason: parsed.reason || null
      }
    }
    return { needsServices: false, reason: 'Could not analyze - skipping to save credits' }
  } catch (error) {
    console.error('Service match error:', error)
    return { needsServices: false, reason: 'Analysis failed - skipping to save credits' }
  }
}

// Reoon API - Email Verification (Power Mode)
async function verifyEmailWithReoon(email: string): Promise<boolean> {
  const { reoonApiKey } = getApiKeys()
  if (!reoonApiKey) return false

  try {
    const response = await fetch(
      `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${reoonApiKey}&mode=power`
    )

    if (!response.ok) return false

    const data = await response.json()
    // Reoon returns status: "valid", "invalid", "unknown", etc.
    return data.status === 'valid' || data.status === 'safe'
  } catch {
    return false
  }
}

// Export the main lead generation function
export async function generateLeads(
  input: LeadGenerationInput,
  callbacks: LeadGenerationCallbacks
): Promise<void> {
  const leads: LeadResult[] = []

  try {
    // Step 1: Web Search with Serper
    callbacks.onSearchStart(input.searchQuery)
    const searchResults = await searchWithSerper(input.searchQuery)
    callbacks.onSearchComplete(searchResults)

    // Step 2: URL Cleanup
    const cleanedUrls = cleanupUrls(searchResults)
    callbacks.onCleanupComplete(cleanedUrls)

    if (cleanedUrls.length === 0) {
      callbacks.onError('No valid URLs found after cleanup')
      callbacks.onComplete(leads)
      return
    }

    // Step 3-7: Process each URL sequentially for quality
    for (const url of cleanedUrls) {
      try {
        // Step 3: Scrape content with Jina
        callbacks.onScrapeStart(url)
        const scraped = await scrapeWithJina(url)
        callbacks.onScrapeComplete(url, scraped)

        // Step 4: AI Analysis - uses selected provider from settings
        callbacks.onAiAnalysisStart(url)
        const aiResult = await analyzeContentWithAi(scraped.content)
        callbacks.onAiAnalysisResult(url, aiResult.email, aiResult.decisionMaker)

        // Step 4.5: Service Match - Check if they need our services BEFORE using paid APIs
        callbacks.onServiceMatchStart(url)
        const serviceMatch = await checkServiceMatch(scraped.content)
        callbacks.onServiceMatchResult(url, serviceMatch.needsServices, serviceMatch.reason)

        // Skip if they don't need our services - SAVES Hunter.io and Reoon credits!
        if (!serviceMatch.needsServices) {
          continue
        }

        const domain = extractDomain(url)
        let finalEmail: string | null = aiResult.email
        let emailSource: 'direct' | 'hunter_name' | 'hunter_domain' = 'direct'

        // Step 5: If no direct email found, try Hunter.io (only for qualified leads)
        if (!finalEmail) {
          if (aiResult.decisionMaker) {
            // Try to find email by name
            callbacks.onHunterStart(url, 'name')
            const nameParts = aiResult.decisionMaker.split(' ')
            if (nameParts.length >= 2) {
              finalEmail = await findEmailByName(nameParts[0], nameParts.slice(1).join(' '), domain)
              emailSource = 'hunter_name'
            }
            callbacks.onHunterResult(url, finalEmail)
          }

          if (!finalEmail) {
            // Try to find email by domain
            callbacks.onHunterStart(url, 'domain')
            finalEmail = await findEmailByDomain(domain)
            emailSource = 'hunter_domain'
            callbacks.onHunterResult(url, finalEmail)
          }
        }

        // Step 6: Verify email with Reoon
        let verified = false
        if (finalEmail) {
          callbacks.onVerificationStart(finalEmail)
          verified = await verifyEmailWithReoon(finalEmail)
          callbacks.onVerificationResult(finalEmail, verified)
        }

        // Step 7: Add to leads if we have a verified email
        if (finalEmail && verified) {
          const lead: LeadResult = {
            url,
            email: finalEmail,
            decisionMaker: aiResult.decisionMaker,
            verified: true,
            source: emailSource,
            needsServices: serviceMatch.needsServices,
            serviceMatchReason: serviceMatch.reason
          }
          leads.push(lead)
          callbacks.onLeadFound(lead)
        }
      } catch (urlError) {
        const errorMsg = urlError instanceof Error ? urlError.message : 'Unknown error'
        callbacks.onScrapeError(url, errorMsg)
      }
    }

    callbacks.onComplete(leads)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    callbacks.onError(errorMsg)
    callbacks.onComplete(leads)
  }
}
