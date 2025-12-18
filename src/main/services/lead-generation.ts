import {
  getApiKeys,
  getAgencyProfile,
  getNeutrinoApiKeys,
  getLinkPreviewApiKeys,
  getSerperApiKeys,
  getJinaApiKeys,
  type ApiKeyEntry
} from '../store'
import { executeWithAiRotation, resetAiRotationState } from './ai-rotation-manager'

// Key Rotation State Manager
interface KeyRotationState {
  currentIndex: number
  exhaustedKeys: Set<number>
  lastError: string
}

const keyRotationState: Record<string, KeyRotationState> = {
  serper: { currentIndex: 0, exhaustedKeys: new Set(), lastError: '' },
  jina: { currentIndex: 0, exhaustedKeys: new Set(), lastError: '' },
  neutrino: { currentIndex: 0, exhaustedKeys: new Set(), lastError: '' },
  linkPreview: { currentIndex: 0, exhaustedKeys: new Set(), lastError: '' }
}

function resetKeyRotation(): void {
  Object.keys(keyRotationState).forEach((key) => {
    keyRotationState[key] = { currentIndex: 0, exhaustedKeys: new Set(), lastError: '' }
  })
}

function getNextKey(
  service: string,
  keys: ApiKeyEntry[]
): { key: ApiKeyEntry | null; index: number; allExhausted: boolean } {
  const state = keyRotationState[service]
  if (!state || keys.length === 0) {
    return { key: null, index: -1, allExhausted: true }
  }

  // Find next available key
  for (let i = 0; i < keys.length; i++) {
    const index = (state.currentIndex + i) % keys.length
    if (!state.exhaustedKeys.has(index)) {
      return { key: keys[index], index, allExhausted: false }
    }
  }

  // All keys exhausted - reset and try first key (maybe it's reset)
  state.exhaustedKeys.clear()
  return { key: keys[0], index: 0, allExhausted: true }
}

function markKeyExhausted(service: string, index: number, error: string): void {
  const state = keyRotationState[service]
  if (state) {
    state.exhaustedKeys.add(index)
    state.lastError = error
    state.currentIndex = (index + 1) % 100 // Move to next
  }
}

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

// Neutrino API - Smart URL categorization with multi-key rotation
async function categorizeUrlWithNeutrino(
  url: string,
  mainWindow: Electron.BrowserWindow | null
): Promise<{ category: string | null; error: string | null; keyIndex?: number }> {
  // Try multi-keys first
  const multiKeys = getNeutrinoApiKeys()
  if (multiKeys.length > 0) {
    const { key, index, allExhausted } = getNextKey('neutrino', multiKeys)

    if (key && key.key && key.userId) {
      try {
        const response = await fetch('https://neutrinoapi.net/url-info', {
          method: 'POST',
          headers: {
            'User-ID': key.userId,
            'API-Key': key.key,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `url=${encodeURIComponent(url)}&fetch-content=false`
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMsg = errorData['api-error-msg'] || `HTTP ${response.status}`

          // Check if rate limited
          if (errorMsg.includes('LIMIT') || response.status === 429) {
            markKeyExhausted('neutrino', index, errorMsg)
            mainWindow?.webContents.send('leads:keyRotation', {
              service: 'Neutrino',
              keyIndex: index + 1,
              totalKeys: multiKeys.length,
              reason: errorMsg
            })

            // Try next key recursively
            if (!allExhausted) {
              return categorizeUrlWithNeutrino(url, mainWindow)
            }
          }

          return { category: null, error: `Neutrino API error: ${errorMsg}`, keyIndex: index }
        }

        const data = await response.json()
        console.log(
          `Neutrino[${index + 1}/${multiKeys.length}] categorized ${url} as: ${data['content-type'] || 'unknown'}`
        )
        return { category: data['content-type'] || null, error: null, keyIndex: index }
      } catch (error) {
        return { category: null, error: `Neutrino API connection error: ${error}`, keyIndex: index }
      }
    }
  }

  // Fallback to single key
  const { neutrinoApiKey, neutrinoUserId } = getApiKeys()
  if (!neutrinoApiKey || !neutrinoUserId) {
    return {
      category: null,
      error: 'Neutrino API credentials not configured. Please add User ID and API Key in Settings.'
    }
  }

  try {
    const response = await fetch('https://neutrinoapi.net/url-info', {
      method: 'POST',
      headers: {
        'User-ID': neutrinoUserId,
        'API-Key': neutrinoApiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `url=${encodeURIComponent(url)}&fetch-content=false`
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData['api-error-msg'] || `HTTP ${response.status}`
      return { category: null, error: `Neutrino API error: ${errorMsg}` }
    }

    const data = await response.json()
    console.log(`Neutrino categorized ${url} as: ${data['content-type'] || 'unknown'}`)
    return { category: data['content-type'] || null, error: null }
  } catch (error) {
    return { category: null, error: `Neutrino API connection error: ${error}` }
  }
}

// LinkPreview API - Fallback URL categorization with multi-key rotation
async function categorizeUrlWithLinkPreview(
  url: string,
  mainWindow: Electron.BrowserWindow | null
): Promise<{ category: string | null; error: string | null }> {
  // Try multi-keys first
  const multiKeys = getLinkPreviewApiKeys()
  if (multiKeys.length > 0) {
    const { key, index, allExhausted } = getNextKey('linkPreview', multiKeys)

    if (key && key.key) {
      try {
        const response = await fetch(`https://api.linkpreview.net/?q=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'X-Linkpreview-Api-Key': key.key
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMsg = errorData.error || `HTTP ${response.status}`

          // Check if rate limited (425 or 429)
          if (response.status === 425 || response.status === 429 || errorMsg.includes('limit')) {
            markKeyExhausted('linkPreview', index, errorMsg)
            mainWindow?.webContents.send('leads:keyRotation', {
              service: 'LinkPreview',
              keyIndex: index + 1,
              totalKeys: multiKeys.length,
              reason: errorMsg
            })

            // Try next key recursively
            if (!allExhausted) {
              return categorizeUrlWithLinkPreview(url, mainWindow)
            }
          }

          return { category: null, error: `LinkPreview API error: ${errorMsg}` }
        }

        const data = await response.json()
        const content =
          `${data.title || ''} ${data.description || ''} ${data.site_name || ''}`.toLowerCase()

        let category = 'website'
        if (content.includes('job') || content.includes('career') || content.includes('hiring')) {
          category = 'job-board'
        } else if (
          content.includes('facebook') ||
          content.includes('instagram') ||
          content.includes('twitter') ||
          content.includes('linkedin') ||
          content.includes('tiktok')
        ) {
          category = 'social-media'
        }

        console.log(
          `LinkPreview[${index + 1}/${multiKeys.length}] categorized ${url} as: ${category}`
        )
        return { category, error: null }
      } catch (error) {
        return { category: null, error: `LinkPreview API connection error: ${error}` }
      }
    }
  }

  // Fallback to single key
  const { linkPreviewApiKey } = getApiKeys()
  if (!linkPreviewApiKey) {
    return {
      category: null,
      error: 'LinkPreview API key not configured. Please add API Key in Settings.'
    }
  }

  try {
    const response = await fetch(`https://api.linkpreview.net/?q=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'X-Linkpreview-Api-Key': linkPreviewApiKey
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        category: null,
        error: `LinkPreview API error: ${errorData.error || response.status}`
      }
    }

    const data = await response.json()
    // LinkPreview returns title/description - analyze for keywords
    const content =
      `${data.title || ''} ${data.description || ''} ${data.site_name || ''}`.toLowerCase()

    // Determine category from content keywords
    let category = 'unknown'
    if (content.includes('job') || content.includes('career') || content.includes('hiring')) {
      category = 'job-board'
    } else if (
      content.includes('facebook') ||
      content.includes('instagram') ||
      content.includes('twitter') ||
      content.includes('linkedin') ||
      content.includes('tiktok')
    ) {
      category = 'social-media'
    } else if (content.includes('classified') || content.includes('craigslist')) {
      category = 'classifieds'
    } else {
      category = 'website'
    }

    console.log(`LinkPreview categorized ${url} as: ${category}`)
    return { category, error: null }
  } catch (error) {
    return { category: null, error: `LinkPreview API connection error: ${error}` }
  }
}

// Check if URL should be blocked based on category
function shouldBlockCategory(category: string | null): boolean {
  if (!category) return false

  const blockedCategories = [
    'job-board',
    'job',
    'recruitment',
    'careers',
    'employment',
    'social-media',
    'social',
    'classifieds',
    'dating',
    'gambling',
    'porn',
    'adult'
  ]

  return blockedCategories.some((blocked) => category.toLowerCase().includes(blocked))
}

// AI-powered URL validation - Second opinion for blocked/uncertain URLs
async function validateUrlWithAI(
  url: string,
  title: string,
  snippet: string,
  category: string,
  niche: string
): Promise<{ isValidLead: boolean; reason: string }> {
  const prompt = `You are a lead qualification expert. Analyze this URL to determine if it could be a potential business client.

URL: ${url}
Title: ${title}
Snippet: ${snippet}
Category detected: ${category}
Target niche: ${niche}

The URL was initially categorized as "${category}" which would normally be blocked.

Your task: Determine if this is actually a legitimate business that could be a potential client, or if it truly is a job board/social media/irrelevant site.

Consider:
1. Is this a real business website that happens to have a careers page?
2. Could this business benefit from services in the "${niche}" niche?
3. Is this a company's main website vs a pure job listing site?

Respond in JSON format only:
{
  "isValidLead": true/false,
  "reason": "Brief explanation"
}

Examples:
- "acme-corp.com/careers" → isValidLead: true (company website with careers section)
- "indeed.com" → isValidLead: false (pure job board)
- "linkedin.com/company/acme" → isValidLead: false (social media platform)
- "acme-restaurant.com" → isValidLead: true (business website)`

  const defaultValue = { isValidLead: true, reason: 'AI not configured - allowing URL' }

  return executeWithAiRotation(
    prompt,
    (response: string) => {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          isValidLead: Boolean(parsed.isValidLead),
          reason: parsed.reason || 'AI analysis'
        }
      }
      return { isValidLead: true, reason: 'Could not parse AI response - allowing URL' }
    },
    defaultValue,
    {
      onModelSwitch: (from, to) => console.log(`[URL Validation] Model switch: ${from} -> ${to}`),
      onKeySwitch: (idx, total) => console.log(`[URL Validation] Key switch: ${idx}/${total}`)
    }
  )
}

async function searchWithSerper(query: string): Promise<SearchResult[]> {
  // Try multi-keys first with rotation on rate limit (429)
  const multiKeys = getSerperApiKeys()
  if (multiKeys.length > 0) {
    const { key, index, allExhausted } = getNextKey('serper', multiKeys)

    if (key && key.key) {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': key.key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: 10
        })
      })

      if (!response.ok) {
        // Only rotate on rate limit errors (429)
        if (response.status === 429) {
          markKeyExhausted('serper', index, `Rate limit (429)`)
          console.log(
            `Serper key ${index + 1}/${multiKeys.length} rate limited, switching to next...`
          )

          // Try next key recursively if not all exhausted
          if (!allExhausted) {
            return searchWithSerper(query)
          }
        }
        throw new Error(`Serper API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Serper[${index + 1}/${multiKeys.length}] search successful`)
      return (data.organic || []).map((item: { title: string; link: string; snippet: string }) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || ''
      }))
    }
  }

  // Fallback to single key
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

// Session state for Neutrino API
let neutrinoDisabledForSession = false
let neutrinoLastError = ''

// Reset session state (call when starting new lead generation)
function resetCleanupSessionState(): void {
  neutrinoDisabledForSession = false
  neutrinoLastError = ''
}

// URL Cleanup - Use Neutrino API with LinkPreview fallback + AI validation
async function cleanupUrls(
  results: SearchResult[],
  mainWindow: Electron.BrowserWindow | null,
  niche: string
): Promise<string[]> {
  const cleanedUrls: string[] = []
  const MAX_RETRIES = 3

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const url = result.link
    let category: string | null = null
    let usedService = ''

    // Send progress update to UI
    mainWindow?.webContents.send('leads:cleanupProgress', {
      current: i + 1,
      total: results.length,
      url: url,
      status: 'processing'
    })

    // Try Neutrino API first (if not disabled for session)
    if (!neutrinoDisabledForSession) {
      let neutrinoSuccess = false

      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        const neutrinoResult = await categorizeUrlWithNeutrino(url, mainWindow)

        if (!neutrinoResult.error && neutrinoResult.category) {
          category = neutrinoResult.category
          usedService = 'Neutrino'
          neutrinoSuccess = true
          break
        }

        neutrinoLastError = neutrinoResult.error || 'Unknown error'

        if (retry < MAX_RETRIES - 1) {
          console.log(`Neutrino retry ${retry + 1}/${MAX_RETRIES} for ${url}...`)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // If all retries failed, disable Neutrino for this session
      if (!neutrinoSuccess) {
        neutrinoDisabledForSession = true
        console.log(
          `Neutrino disabled for session after ${MAX_RETRIES} retries. Reason: ${neutrinoLastError}`
        )

        // Notify UI about service switch
        mainWindow?.webContents.send('leads:serviceSwitched', {
          from: 'Neutrino',
          to: 'LinkPreview',
          reason: neutrinoLastError
        })
      }
    }

    // Use LinkPreview if Neutrino didn't work
    if (!category) {
      const linkPreviewResult = await categorizeUrlWithLinkPreview(url, mainWindow)

      if (!linkPreviewResult.error && linkPreviewResult.category) {
        category = linkPreviewResult.category
        usedService = 'LinkPreview'
      } else {
        // Both services failed - treat as secure website (likely has bot protection)
        category = 'secure-website'
        usedService = 'Assumed'
        console.log(`${url} has protection, treating as secure-website`)

        // Notify UI about protected URL
        mainWindow?.webContents.send('leads:protectedUrl', {
          url: url,
          reason: linkPreviewResult.error || 'Bot protection detected'
        })
      }
    }

    let shouldBlock = shouldBlockCategory(category)
    let aiOverride = false
    let aiReason = ''

    // If URL would be blocked, use AI for second opinion
    if (shouldBlock && category) {
      mainWindow?.webContents.send('leads:cleanupProgress', {
        current: i + 1,
        total: results.length,
        url: url,
        status: 'ai-validating'
      })

      const aiResult = await validateUrlWithAI(url, result.title, result.snippet, category, niche)

      if (aiResult.isValidLead) {
        shouldBlock = false
        aiOverride = true
        aiReason = aiResult.reason
        console.log(`AI OVERRIDE: ${url} - ${aiResult.reason}`)

        mainWindow?.webContents.send('leads:aiOverride', {
          url: url,
          originalCategory: category,
          reason: aiResult.reason
        })
      } else {
        console.log(`AI CONFIRMED BLOCK: ${url} - ${aiResult.reason}`)
      }
    }

    const finalStatus = shouldBlock ? 'blocked' : aiOverride ? 'ai-allowed' : 'allowed'
    console.log(
      `${usedService}: ${url} -> ${category} - ${finalStatus}${aiOverride ? ` (AI: ${aiReason})` : ''}`
    )

    // Send progress update with result
    mainWindow?.webContents.send('leads:cleanupProgress', {
      current: i + 1,
      total: results.length,
      url: url,
      status: finalStatus,
      service: usedService,
      category: category,
      aiOverride: aiOverride,
      aiReason: aiReason
    })

    if (!shouldBlock) {
      cleanedUrls.push(url)
    }
  }

  return cleanedUrls
}

// Jina Reader API - Content Scraping with key rotation on rate limit
async function scrapeWithJina(url: string): Promise<ScrapedContent> {
  const multiKeys = getJinaApiKeys()

  // Helper to make the actual Jina request
  const makeJinaRequest = async (apiKey: string): Promise<Response> => {
    return fetch(`https://r.jina.ai/${url}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/plain'
      }
    })
  }

  // Helper to parse successful response
  const parseResponse = async (response: Response): Promise<ScrapedContent> => {
    const content = await response.text()
    return {
      url,
      content: content.slice(0, 15000),
      title: url
    }
  }

  // Try multi-keys with rotation on rate limit (429)
  if (multiKeys.length > 0) {
    let currentKeyIndex = keyRotationState.jina.currentIndex % multiKeys.length

    // Try each key until one works or all exhausted
    for (let keyAttempt = 0; keyAttempt < multiKeys.length; keyAttempt++) {
      const keyEntry = multiKeys[currentKeyIndex]
      if (!keyEntry || !keyEntry.key) {
        currentKeyIndex = (currentKeyIndex + 1) % multiKeys.length
        continue
      }

      console.log(`Jina[${currentKeyIndex + 1}/${multiKeys.length}] scraping ${url}`)

      const response = await makeJinaRequest(keyEntry.key)

      if (response.ok) {
        return parseResponse(response)
      }

      // Non-rate-limit error: stop immediately with human-readable message
      if (response.status !== 429) {
        throw new Error(
          `Jina API error (${response.status}): Unable to scrape content. Please check your API key or try again later.`
        )
      }

      // Rate limit (429): wait 60 seconds and retry same key
      console.log(
        `Jina[${currentKeyIndex + 1}/${multiKeys.length}] rate limited. Waiting 60 seconds...`
      )
      await new Promise((resolve) => setTimeout(resolve, 60000))

      // Retry same key after waiting
      const retryResponse = await makeJinaRequest(keyEntry.key)

      if (retryResponse.ok) {
        return parseResponse(retryResponse)
      }

      // Still failing after wait: switch to next key
      console.log(
        `Jina[${currentKeyIndex + 1}/${multiKeys.length}] still failing after wait. Switching to next key...`
      )
      markKeyExhausted('jina', currentKeyIndex, `Rate limit persisted`)
      currentKeyIndex = (currentKeyIndex + 1) % multiKeys.length
      keyRotationState.jina.currentIndex = currentKeyIndex
    }

    // All keys exhausted
    throw new Error(
      'All Jina API keys exhausted due to rate limits. Please wait and try again later.'
    )
  }

  // Fallback to single key
  const { jinaApiKey } = getApiKeys()
  if (!jinaApiKey) throw new Error('Jina API key not configured')

  const response = await makeJinaRequest(jinaApiKey)

  if (response.ok) {
    return parseResponse(response)
  }

  // Non-rate-limit error: stop with human-readable message
  if (response.status !== 429) {
    throw new Error(
      `Jina API error (${response.status}): Unable to scrape content. Please check your API key or try again later.`
    )
  }

  // Rate limit on single key: wait 60 seconds and retry once
  console.log('Jina rate limited. Waiting 60 seconds before retry...')
  await new Promise((resolve) => setTimeout(resolve, 60000))

  const retryResponse = await makeJinaRequest(jinaApiKey)

  if (retryResponse.ok) {
    return parseResponse(retryResponse)
  }

  // Still failing after wait with single key: stop with error
  throw new Error(
    `Jina API still rate limited after waiting. Please try again later or add more API keys in Settings.`
  )
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

// Snov.io API - Token cache
let snovAccessToken: string | null = null
let snovTokenExpiry: number = 0

// Snov.io API - Get access token
async function getSnovAccessToken(): Promise<string | null> {
  const { snovClientId, snovClientSecret } = getApiKeys()
  if (!snovClientId || !snovClientSecret) return null

  // Return cached token if still valid (with 5 min buffer)
  if (snovAccessToken && Date.now() < snovTokenExpiry - 300000) {
    return snovAccessToken
  }

  try {
    const response = await fetch('https://api.snov.io/v1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: snovClientId,
        client_secret: snovClientSecret
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.access_token) {
      snovAccessToken = data.access_token
      snovTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000
      return snovAccessToken
    }
    return null
  } catch {
    return null
  }
}

// Snov.io API - Find emails by domain (async flow)
async function findEmailByDomainSnov(domain: string): Promise<string | null> {
  const token = await getSnovAccessToken()
  if (!token) return null

  try {
    // Step 1: Start domain search
    const startResponse = await fetch('https://api.snov.io/v2/domain-search/domain-emails/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ domain })
    })

    if (!startResponse.ok) return null

    const startData = await startResponse.json()
    const taskHash = startData.meta?.task_hash || startData.data?.task_hash

    if (!taskHash) return null

    // Step 2: Poll for results (max 10 attempts, 1 second apart)
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const resultResponse = await fetch(
        `https://api.snov.io/v2/domain-search/domain-emails/result/${taskHash}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (!resultResponse.ok) continue

      const resultData = await resultResponse.json()

      if (resultData.status === 'completed' && resultData.data?.length > 0) {
        // Return first valid email
        const validEmail = resultData.data.find(
          (e: { email: string; smtp_status?: string }) =>
            e.email && (e.smtp_status === 'valid' || !e.smtp_status)
        )
        if (validEmail) return validEmail.email
        // Fallback to first email if none marked valid
        return resultData.data[0].email
      }

      if (resultData.status === 'completed') break
    }

    return null
  } catch {
    return null
  }
}

// Snov.io API - Find email by name and domain
async function findEmailByNameSnov(
  firstName: string,
  lastName: string,
  domain: string
): Promise<string | null> {
  const token = await getSnovAccessToken()
  if (!token) return null

  try {
    // Step 1: Start email search
    const startResponse = await fetch('https://api.snov.io/v2/emails-by-domain-by-name/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rows: [{ first_name: firstName, last_name: lastName, domain }]
      })
    })

    if (!startResponse.ok) return null

    const startData = await startResponse.json()
    const taskHash = startData.data?.task_hash

    if (!taskHash) return null

    // Step 2: Poll for results (max 10 attempts, 1 second apart)
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const resultResponse = await fetch(
        `https://api.snov.io/v2/emails-by-domain-by-name/result?task_hash=${taskHash}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (!resultResponse.ok) continue

      const resultData = await resultResponse.json()

      if (resultData.status === 'completed' && resultData.data?.length > 0) {
        const personResult = resultData.data[0]
        if (personResult.result?.length > 0) {
          // Find valid email
          const validEmail = personResult.result.find(
            (e: { email: string; smtp_status?: string }) =>
              e.email && (e.smtp_status === 'valid' || e.smtp_status === 'unknown')
          )
          if (validEmail) return validEmail.email
          return personResult.result[0].email
        }
      }

      if (resultData.status === 'completed') break
    }

    return null
  } catch {
    return null
  }
}

// Combined email finder with Hunter.io primary and Snov.io fallback
async function findEmailWithFallback(
  domain: string,
  firstName?: string,
  lastName?: string
): Promise<{ email: string | null; source: string }> {
  // Try Hunter.io first
  let email: string | null = null

  if (firstName && lastName) {
    email = await findEmailByName(firstName, lastName, domain)
    if (email) return { email, source: 'hunter_name' }
  }

  email = await findEmailByDomain(domain)
  if (email) return { email, source: 'hunter_domain' }

  // Fallback to Snov.io
  const { snovClientId, snovClientSecret } = getApiKeys()
  if (!snovClientId || !snovClientSecret) {
    return { email: null, source: 'none' }
  }

  console.log('[Lead Generation] Hunter.io returned no result, trying Snov.io fallback...')

  if (firstName && lastName) {
    email = await findEmailByNameSnov(firstName, lastName, domain)
    if (email) return { email, source: 'snov_name' }
  }

  email = await findEmailByDomainSnov(domain)
  if (email) return { email, source: 'snov_domain' }

  return { email: null, source: 'none' }
}

// AI Analysis - Extract email and decision maker from content
interface AiAnalysisResult {
  email: string | null
  decisionMaker: string | null
}

async function analyzeContentWithAi(content: string): Promise<AiAnalysisResult> {
  const prompt = `Analyze the following website content and extract:
1. Any email addresses you find (look for patterns like name@domain.com)
2. The name of the business owner, CEO, founder, or main decision maker

Respond ONLY in this exact JSON format, nothing else:
{"email": "found_email@example.com or null", "decisionMaker": "Person Name or null"}

Website content:
${content.slice(0, 8000)}`

  const defaultValue: AiAnalysisResult = { email: null, decisionMaker: null }

  return executeWithAiRotation(
    prompt,
    (response: string) => {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          email: parsed.email === 'null' ? null : parsed.email || null,
          decisionMaker: parsed.decisionMaker === 'null' ? null : parsed.decisionMaker || null
        }
      }
      return { email: null, decisionMaker: null }
    },
    defaultValue,
    {
      onModelSwitch: (from, to) => console.log(`[AI Analysis] Model switch: ${from} -> ${to}`),
      onKeySwitch: (idx, total) => console.log(`[AI Analysis] Key switch: ${idx}/${total}`)
    }
  )
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

  const defaultValue: ServiceMatchResult = {
    needsServices: true,
    reason: 'AI not configured - accepting lead'
  }

  return executeWithAiRotation(
    prompt,
    (response: string) => {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          needsServices: parsed.needsServices === true,
          reason: parsed.reason || null
        }
      }
      return { needsServices: false, reason: 'Could not analyze - skipping to save credits' }
    },
    defaultValue,
    {
      onModelSwitch: (from, to) => console.log(`[Service Match] Model switch: ${from} -> ${to}`),
      onKeySwitch: (idx, total) => console.log(`[Service Match] Key switch: ${idx}/${total}`)
    }
  )
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
  callbacks: LeadGenerationCallbacks,
  mainWindow: Electron.BrowserWindow | null = null
): Promise<void> {
  const leads: LeadResult[] = []

  // Reset key rotation state for new lead generation
  resetKeyRotation()

  // Reset AI rotation state for new lead generation
  resetAiRotationState()

  // Reset cleanup session state for new lead generation
  resetCleanupSessionState()

  try {
    // Step 1: Web Search with Serper
    callbacks.onSearchStart(input.searchQuery)
    const searchResults = await searchWithSerper(input.searchQuery)
    callbacks.onSearchComplete(searchResults)

    // Step 2: URL Cleanup with AI validation
    const cleanedUrls = await cleanupUrls(searchResults, mainWindow, input.niche)
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
        let emailSource: 'direct' | 'hunter_name' | 'hunter_domain' | 'snov_name' | 'snov_domain' =
          'direct'

        // Step 5: If no direct email found, try Hunter.io with Snov.io fallback (only for qualified leads)
        if (!finalEmail) {
          let firstName: string | undefined
          let lastName: string | undefined

          if (aiResult.decisionMaker) {
            const nameParts = aiResult.decisionMaker.split(' ')
            if (nameParts.length >= 2) {
              firstName = nameParts[0]
              lastName = nameParts.slice(1).join(' ')
            }
          }

          // Use combined finder with fallback
          callbacks.onHunterStart(url, firstName && lastName ? 'name' : 'domain')
          const result = await findEmailWithFallback(domain, firstName, lastName)
          finalEmail = result.email
          emailSource = result.source as typeof emailSource
          callbacks.onHunterResult(url, finalEmail)
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
