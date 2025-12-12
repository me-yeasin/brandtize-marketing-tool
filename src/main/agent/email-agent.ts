import { EventEmitter } from 'events'
import { ChatGroq } from '@langchain/groq'
import * as cheerio from 'cheerio'
import type { AgentEvent, ExtractedLead, SearchResult, ScrapedPage } from './types'

interface WebsiteAnalysis {
  isRelevantBusiness: boolean
  isCompetitor: boolean
  isEmailListSeller: boolean
  isActualBusiness: boolean
  businessType: string
  potentialClient: boolean
  reason: string
}

interface EmailValidation {
  isValid: boolean
  isBusinessContact: boolean
  isGenericEmail: boolean
  isDecisionMaker: boolean
  qualityScore: number
  reason: string
}

export class EmailAgent extends EventEmitter {
  private groqApiKey: string
  private serperApiKey: string
  private stopped = false
  private llm: ChatGroq

  constructor(groqApiKey: string, serperApiKey: string) {
    super()
    this.groqApiKey = groqApiKey
    this.serperApiKey = serperApiKey
    this.llm = new ChatGroq({
      apiKey: this.groqApiKey,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3
    })
  }

  stop(): void {
    this.stopped = true
  }

  private emitEvent(event: Omit<AgentEvent, 'timestamp'>): void {
    if (this.stopped) return
    this.emit('event', { ...event, timestamp: Date.now() })
  }

  private async searchWeb(query: string): Promise<SearchResult[]> {
    this.emitEvent({
      type: 'action',
      category: 'search',
      content: `Searching web for: "${query}"`
    })

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, num: 10 })
      })

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`)
      }

      const data = await response.json()
      const results: SearchResult[] = (data.organic || []).map(
        (item: { title: string; link: string; snippet: string }) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet || ''
        })
      )

      this.emitEvent({
        type: 'result',
        category: 'search',
        content: `Found ${results.length} search results`,
        metadata: { results: results.slice(0, 5).map((r) => ({ title: r.title, url: r.link })) }
      })

      return results
    } catch (error) {
      this.emitEvent({
        type: 'status',
        content: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return []
    }
  }

  private async scrapePage(url: string): Promise<ScrapedPage | null> {
    if (this.stopped) return null

    this.emitEvent({
      type: 'action',
      category: 'visit',
      content: `Visiting: ${url}`
    })

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Remove script and style tags
      $('script, style, nav, footer, header').remove()

      const title = $('title').text().trim() || url
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)

      // Extract emails using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const emails = [...new Set(html.match(emailRegex) || [])].filter((email) => {
        // Filter out common non-personal emails and invalid patterns
        const lower = email.toLowerCase()
        return (
          !lower.includes('example.com') &&
          !lower.includes('domain.com') &&
          !lower.includes('.png') &&
          !lower.includes('.jpg') &&
          !lower.includes('.gif') &&
          !lower.endsWith('.js') &&
          !lower.endsWith('.css')
        )
      })

      this.emitEvent({
        type: 'result',
        category: 'scrape',
        content: `Scraped page: ${title.slice(0, 50)}... Found ${emails.length} email(s)`,
        metadata: { url, emailCount: emails.length }
      })

      return {
        url,
        title,
        content: bodyText,
        emails
      }
    } catch (error) {
      this.emitEvent({
        type: 'status',
        content: `Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return null
    }
  }

  private async analyzeNiche(niche: string): Promise<string[]> {
    this.emitEvent({
      type: 'thinking',
      category: 'plan',
      content: `Analyzing niche: "${niche}" to understand the target audience and create search strategy...`
    })

    try {
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: `You are an expert email marketing researcher. Your goal is to find business contacts for outreach.
Given a niche, generate 5 specific search queries that would help find:
1. Business websites in this niche
2. Contact pages or team pages
3. Business directories for this niche
4. LinkedIn profiles or professional pages
5. Local business listings

Output ONLY a JSON array of 5 search query strings, nothing else.
Example output: ["dentists in Austin contact", "dental clinic Austin email", ...]`
        },
        {
          role: 'user',
          content: `Niche: ${niche}`
        }
      ])

      const content = typeof response.content === 'string' ? response.content : ''
      const queries = JSON.parse(content) as string[]

      this.emitEvent({
        type: 'result',
        category: 'plan',
        content: `Generated ${queries.length} search queries for niche research`,
        metadata: { queries }
      })

      return queries
    } catch {
      // Fallback queries
      const fallbackQueries = [
        `${niche} business contact email`,
        `${niche} companies directory`,
        `${niche} professionals contact`,
        `${niche} local business email`,
        `${niche} service providers contact page`
      ]

      this.emitEvent({
        type: 'status',
        content: 'Using fallback search queries'
      })

      return fallbackQueries
    }
  }

  private async generateEmailTemplate(
    email: string,
    context: ExtractedLead['context'],
    niche: string
  ): Promise<{ subject: string; body: string }> {
    this.emitEvent({
      type: 'action',
      category: 'generate',
      content: `Generating personalized email template for: ${email}`
    })

    try {
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: `You are an expert cold email copywriter. Write personalized, professional outreach emails.
Your emails should be:
- Concise (under 150 words)
- Personalized based on the business context provided
- Value-focused (what can you offer them)
- Have a clear, soft call-to-action
- Professional but warm tone

Output ONLY valid JSON with "subject" and "body" fields. Do not include any markdown or extra text.`
        },
        {
          role: 'user',
          content: `Write a cold outreach email for this lead:

Niche: ${niche}
Business: ${context.businessName || 'Unknown'}
Business Type: ${context.businessType || 'Unknown'}
Location: ${context.location || 'Unknown'}
Website: ${context.website || 'Unknown'}
Context Summary: ${context.summary}

The goal is to introduce our services and see if they're interested in learning more.`
        }
      ])

      const content = typeof response.content === 'string' ? response.content : ''
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const template = JSON.parse(cleanContent) as { subject: string; body: string }

      this.emitEvent({
        type: 'result',
        category: 'generate',
        content: `Generated email template with subject: "${template.subject.slice(0, 50)}..."`
      })

      return template
    } catch {
      // Fallback template
      return {
        subject: `Quick question about ${context.businessName || 'your business'}`,
        body: `Hi there,

I came across your business and was impressed by what you do in the ${niche} space.

I help businesses like yours grow through targeted strategies. Would you be open to a brief chat about how we might be able to help?

Best regards`
      }
    }
  }

  private async analyzeWebsite(page: ScrapedPage, niche: string): Promise<WebsiteAnalysis> {
    this.emitEvent({
      type: 'thinking',
      category: 'analyze',
      content: `Deep analyzing website: "${page.title.slice(0, 50)}..." to determine if this is a potential client...`
    })

    try {
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: `You are an expert business analyst helping to identify potential clients for a web/mobile development agency.

CRITICAL: We are looking for ACTUAL BUSINESSES who might need web or mobile development services.
We do NOT want:
- Companies that SELL email lists or marketing data
- Marketing agencies or competitors who offer similar services
- Directory websites or aggregator sites
- News sites or blogs
- Job boards or recruitment sites

We DO want:
- Small to medium businesses in the target niche
- Businesses with outdated websites that could use improvement
- Businesses without mobile apps who could benefit from one
- Local businesses looking to grow their online presence
- Businesses that provide services and might need better digital tools

Analyze the website and determine:
1. Is this an actual business in the niche (not a directory, list seller, or competitor)?
2. Could they potentially benefit from web or mobile development services?
3. Are they likely to respond positively to a service proposal?

Output ONLY valid JSON:
{
  "isRelevantBusiness": boolean,
  "isCompetitor": boolean,
  "isEmailListSeller": boolean,
  "isActualBusiness": boolean,
  "businessType": "string describing what they do",
  "potentialClient": boolean,
  "reason": "2-3 sentence explanation of your decision"
}`
        },
        {
          role: 'user',
          content: `Target Niche: ${niche}
URL: ${page.url}
Title: ${page.title}
Content: ${page.content.slice(0, 4000)}`
        }
      ])

      const content = typeof response.content === 'string' ? response.content : ''
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const analysis = JSON.parse(cleanContent) as WebsiteAnalysis

      this.emitEvent({
        type: 'result',
        category: 'analyze',
        content: analysis.potentialClient
          ? `✓ Qualified: ${analysis.reason.slice(0, 100)}...`
          : `✗ Skipped: ${analysis.reason.slice(0, 100)}...`
      })

      return analysis
    } catch {
      return {
        isRelevantBusiness: false,
        isCompetitor: false,
        isEmailListSeller: false,
        isActualBusiness: false,
        businessType: 'unknown',
        potentialClient: false,
        reason: 'Could not analyze website'
      }
    }
  }

  private async validateEmail(
    email: string,
    page: ScrapedPage,
    niche: string
  ): Promise<EmailValidation> {
    this.emitEvent({
      type: 'thinking',
      category: 'analyze',
      content: `Validating email quality: ${email}`
    })

    const emailLower = email.toLowerCase()
    const genericPatterns = [
      'noreply',
      'no-reply',
      'donotreply',
      'do-not-reply',
      'info@',
      'contact@',
      'support@',
      'help@',
      'hello@',
      'admin@',
      'webmaster@',
      'postmaster@',
      'sales@',
      'marketing@',
      'newsletter@',
      'subscribe@',
      'unsubscribe@'
    ]

    const isGeneric = genericPatterns.some((pattern) => emailLower.includes(pattern))

    try {
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: `You are an email quality analyst. Evaluate if an email is worth contacting for business outreach.

Good emails:
- Personal business emails (owner, founder, manager names)
- Decision-maker emails
- Emails that look like they belong to someone who can make purchasing decisions

Bad emails:
- Generic emails (info@, contact@, support@, etc.)
- Automated/system emails (noreply@, etc.)
- Emails that appear to be for customer support only
- Emails from large corporations (hard to reach decision makers)

Output ONLY valid JSON:
{
  "isValid": boolean,
  "isBusinessContact": boolean,
  "isGenericEmail": boolean,
  "isDecisionMaker": boolean,
  "qualityScore": number (1-10, 10 being best for outreach),
  "reason": "brief explanation"
}`
        },
        {
          role: 'user',
          content: `Email: ${email}
Website: ${page.url}
Business Title: ${page.title}
Niche: ${niche}`
        }
      ])

      const content = typeof response.content === 'string' ? response.content : ''
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const validation = JSON.parse(cleanContent) as EmailValidation

      if (isGeneric && validation.qualityScore > 5) {
        validation.qualityScore = 5
        validation.isGenericEmail = true
      }

      this.emitEvent({
        type: 'result',
        category: 'analyze',
        content:
          validation.qualityScore >= 6
            ? `✓ Quality email (score: ${validation.qualityScore}/10): ${validation.reason}`
            : `✗ Low quality email (score: ${validation.qualityScore}/10): ${validation.reason}`
      })

      return validation
    } catch {
      return {
        isValid: !isGeneric,
        isBusinessContact: !isGeneric,
        isGenericEmail: isGeneric,
        isDecisionMaker: false,
        qualityScore: isGeneric ? 3 : 5,
        reason: 'Could not fully validate email'
      }
    }
  }

  private async extractBusinessContext(
    page: ScrapedPage,
    niche: string
  ): Promise<ExtractedLead['context']> {
    this.emitEvent({
      type: 'action',
      category: 'extract',
      content: `Extracting detailed business context...`
    })

    try {
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: `You are a business analyst. Extract key information to help craft a personalized outreach email.
Focus on finding:
- What specific services/products they offer
- Their target market
- Any pain points visible (outdated website, no mobile presence, etc.)
- What digital solutions could help them

Output ONLY valid JSON:
{
  "businessName": "string",
  "businessType": "string",
  "location": "string or null",
  "needs": ["array of potential digital needs"],
  "summary": "2-3 sentences about what they do and how we could help"
}`
        },
        {
          role: 'user',
          content: `Niche: ${niche}
URL: ${page.url}
Title: ${page.title}
Content: ${page.content.slice(0, 3000)}`
        }
      ])

      const content = typeof response.content === 'string' ? response.content : ''
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const context = JSON.parse(cleanContent) as ExtractedLead['context']

      this.emitEvent({
        type: 'result',
        category: 'extract',
        content: `Business: ${context.businessName || 'Unknown'} | Needs: ${(context.needs || []).slice(0, 2).join(', ')}`
      })

      return { ...context, website: page.url }
    } catch {
      return {
        businessName: page.title,
        website: page.url,
        summary: `Business in the ${niche} niche.`
      }
    }
  }

  async run(niche: string): Promise<void> {
    this.emitEvent({
      type: 'status',
      content: `Starting intelligent email research for niche: "${niche}"`
    })

    this.emitEvent({
      type: 'thinking',
      category: 'plan',
      content: `I will carefully research "${niche}" to find REAL potential clients who could benefit from web/mobile development services. I will deeply analyze each website to ensure we're not contacting email list sellers, competitors, or irrelevant businesses. Each email will be validated for quality before being added as a lead.`
    })

    const processedEmails = new Set<string>()
    const processedUrls = new Set<string>()
    let leadCount = 0
    let analyzedSites = 0
    let skippedSites = 0

    try {
      // Step 1: Analyze niche and generate search queries
      const searchQueries = await this.analyzeNiche(niche)
      if (this.stopped) return

      // Step 2: Search and scrape for each query
      for (const query of searchQueries) {
        if (this.stopped) break

        const searchResults = await this.searchWeb(query)
        if (this.stopped) break

        // Step 3: Visit each result and analyze
        for (const result of searchResults) {
          if (this.stopped) break
          if (processedUrls.has(result.link)) continue
          processedUrls.add(result.link)

          const page = await this.scrapePage(result.link)
          if (!page) continue

          analyzedSites++

          // Step 4: CRITICAL - Analyze website to determine if it's a potential client
          const websiteAnalysis = await this.analyzeWebsite(page, niche)
          if (this.stopped) break

          // Skip if not a potential client
          if (
            !websiteAnalysis.potentialClient ||
            websiteAnalysis.isEmailListSeller ||
            websiteAnalysis.isCompetitor
          ) {
            skippedSites++
            this.emitEvent({
              type: 'thinking',
              category: 'analyze',
              content: `Skipping "${page.title.slice(0, 40)}...": ${websiteAnalysis.reason}`
            })
            continue
          }

          // No emails found on this page
          if (page.emails.length === 0) {
            this.emitEvent({
              type: 'status',
              content: `No contact emails found on this business page`
            })
            continue
          }

          // Step 5: Extract business context for qualified sites
          const context = await this.extractBusinessContext(page, niche)
          if (this.stopped) break

          // Step 6: Process and validate each found email
          for (const email of page.emails) {
            if (this.stopped) break
            if (processedEmails.has(email.toLowerCase())) continue
            processedEmails.add(email.toLowerCase())

            // Validate email quality
            const emailValidation = await this.validateEmail(email, page, niche)
            if (this.stopped) break

            // Skip low quality emails
            if (emailValidation.qualityScore < 5) {
              this.emitEvent({
                type: 'thinking',
                category: 'analyze',
                content: `Skipping email "${email}": ${emailValidation.reason}`
              })
              continue
            }

            // Step 7: Generate personalized email template
            const template = await this.generateEmailTemplate(email, context, niche)
            if (this.stopped) break

            leadCount++

            const lead: ExtractedLead = {
              id: `lead-${Date.now()}-${leadCount}`,
              email,
              source: page.url,
              context,
              template,
              foundAt: Date.now()
            }

            this.emit('lead', lead)

            this.emitEvent({
              type: 'result',
              category: 'extract',
              content: `✓ QUALIFIED Lead #${leadCount}: ${email} (Quality: ${emailValidation.qualityScore}/10)`
            })

            // Delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1500))
          }
        }

        // Delay between queries
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      this.emitEvent({
        type: 'status',
        content: `Research complete! Analyzed ${analyzedSites} sites, skipped ${skippedSites} irrelevant sites, found ${leadCount} qualified leads.`
      })

      this.emit('complete')
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'))
    }
  }
}
