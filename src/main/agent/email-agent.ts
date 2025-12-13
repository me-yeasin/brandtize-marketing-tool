import { EventEmitter } from 'events'
import * as cheerio from 'cheerio'
import type { AgencyProfile } from '../store'
import type { AgentEvent, ExtractedLead, SearchResult, ScrapedPage } from './types'
import { LLMProviderManager } from './core'

const DEFAULT_PROFILE_CONTEXT = `
Our agency specializes in:
- Next.js web application development
- Electron.js cross-platform desktop applications
- React Native mobile apps
- Full-stack web development
- Custom software solutions

We help businesses build modern digital solutions to grow their online presence.
`

const AGENT_ROLE_AND_FORMAT = `You are an intelligent email research agent.

Your role:
1. Deeply analyze niches to find businesses that need our services
2. Identify quality email contacts for outreach
3. Skip irrelevant businesses (competitors, email sellers, directories)
4. Speak naturally and explain your thinking clearly

IMPORTANT - Response Format:
Always structure your responses with TWO parts:

[STATUS]
A brief 2-5 line summary of: what you just did, what you found, and what you'll do next.
This is shown directly to the user - keep it short and action-focused.
[/STATUS]

[DETAILS]
Your full reasoning, analysis, and detailed thoughts.
This goes into an expandable panel - be as thorough as needed here.
[/DETAILS]

Always include both sections in every response. The STATUS must be concise (max 5 lines), while DETAILS can be comprehensive.`

const JSON_ONLY_RULE = `If the user explicitly asks for JSON output (for example: "Format as JSON"), output ONLY valid JSON with no additional text and do not include [STATUS] or [DETAILS] tags.`

export class EmailAgent extends EventEmitter {
  private serperApiKey: string
  private stopped = false
  private llmProvider: LLMProviderManager
  private profile?: AgencyProfile

  constructor(
    groqApiKey: string,
    serperApiKey: string,
    model: string = 'llama-3.3-70b-versatile',
    profile?: AgencyProfile
  ) {
    super()
    this.serperApiKey = serperApiKey
    this.profile = profile

    // Initialize LLM Provider Manager with failover support
    this.llmProvider = new LLMProviderManager(groqApiKey, {
      preferredModel: model,
      temperature: 0.7
    })

    // Set up provider event listeners for status updates
    this.setupProviderListeners()
  }

  private setupProviderListeners(): void {
    this.llmProvider.on('model:switch', ({ from, to, reason }) => {
      console.log(`[EmailAgent] Switching model: ${from} -> ${to} (${reason})`)
      this.emit('event', {
        type: 'response',
        content: `Switching AI model (${reason}). Continuing...`,
        timestamp: Date.now()
      } as AgentEvent)
    })

    this.llmProvider.on('retry:attempt', ({ model, attempt, maxRetries, delayMs }) => {
      console.log(`[EmailAgent] Retrying ${model} (${attempt}/${maxRetries}) in ${delayMs}ms`)
    })
  }

  stop(): void {
    this.stopped = true
  }

  private truncate(text: string, maxLen: number): string {
    const trimmed = text.trim()
    if (trimmed.length <= maxLen) return trimmed
    return trimmed.slice(0, maxLen).trim() + '…'
  }

  private emitResponse(content: string): void {
    if (this.stopped || !content.trim()) return
    this.emit('event', { type: 'response', content, timestamp: Date.now() } as AgentEvent)
  }

  private emitThinking(content: string): void {
    if (this.stopped || !content.trim()) return
    this.emit('event', { type: 'thinking', content, timestamp: Date.now() } as AgentEvent)
  }

  private emitSearch(query: string, urls: Array<{ title: string; url: string }>): void {
    if (this.stopped) return
    this.emit('event', {
      type: 'search',
      content: query,
      timestamp: Date.now(),
      metadata: { urls }
    } as AgentEvent)
  }

  private parseStructuredResponse(response: string): { status: string; details: string } {
    let status = ''
    let details = ''

    // Try format with closing tags first: [STATUS]...[/STATUS]
    const statusMatchClosed = response.match(/\[STATUS\]([\s\S]*?)\[\/STATUS\]/i)
    const detailsMatchClosed = response.match(/\[DETAILS\]([\s\S]*?)\[\/DETAILS\]/i)

    if (statusMatchClosed) {
      status = statusMatchClosed[1].trim()
    }
    if (detailsMatchClosed) {
      details = detailsMatchClosed[1].trim()
    }

    // Try format without closing tags: [STATUS]...content...[DETAILS]...content...
    if (!status && !details) {
      const statusStart = response.search(/\[STATUS\]/i)
      const detailsStart = response.search(/\[DETAILS\]/i)

      if (statusStart !== -1 && detailsStart !== -1 && statusStart < detailsStart) {
        // Both tags present, STATUS comes before DETAILS
        status = response.slice(statusStart + 8, detailsStart).trim()
        details = response.slice(detailsStart + 9).trim()
      } else if (statusStart !== -1 && detailsStart === -1) {
        // Only STATUS tag
        status = response.slice(statusStart + 8).trim()
      } else if (detailsStart !== -1 && statusStart === -1) {
        // Only DETAILS tag
        details = response.slice(detailsStart + 9).trim()
      } else if (statusStart !== -1 && detailsStart !== -1 && detailsStart < statusStart) {
        // DETAILS comes before STATUS (unusual but handle it)
        details = response.slice(detailsStart + 9, statusStart).trim()
        status = response.slice(statusStart + 8).trim()
      }
    }

    // Final fallback: no tags at all, split by line count
    if (!status && !details) {
      const lines = response
        .trim()
        .split('\n')
        .filter((l) => l.trim())
      if (lines.length <= 5) {
        status = response.trim()
      } else {
        status = lines.slice(0, 4).join('\n')
        details = lines.slice(4).join('\n')
      }
    } else if (!status && details) {
      // Only details provided, extract a brief status from start
      const lines = details.split('\n').filter((l) => l.trim())
      status = lines.slice(0, 3).join('\n')
    }

    // Clean up any remaining tag artifacts from status and details
    const tagPattern = /\[\/?(STATUS|DETAILS)\]/gi
    status = status.replace(tagPattern, '').trim()
    details = details.replace(tagPattern, '').trim()

    // Additional cleanup: remove any lines that are just tags
    status = status
      .split('\n')
      .filter((line) => !line.trim().match(/^\[\/?(STATUS|DETAILS)\]$/i))
      .join('\n')
      .trim()
    details = details
      .split('\n')
      .filter((line) => !line.trim().match(/^\[\/?(STATUS|DETAILS)\]$/i))
      .join('\n')
      .trim()

    return { status, details }
  }

  private getServicesInline(): string {
    const services = this.profile?.services
      ?.map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)

    if (!services || services.length === 0) return 'software development services'
    return services.join(', ')
  }

  private ensureServiceTargetedQueries(niche: string, queries: string[]): string[] {
    const primaryService = (this.profile?.services ?? []).map((s) => s.trim()).find(Boolean)
    if (!primaryService) return queries

    const primaryLower = primaryService.toLowerCase()
    const keywords = primaryLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 4)

    const mentionsService = (q: string): boolean => {
      const qLower = q.toLowerCase()
      if (qLower.includes(primaryLower)) return true
      return keywords.some((k) => qLower.includes(k))
    }

    if (queries.some(mentionsService)) return queries

    const targetedQuery = `${niche} ${primaryService} contact email`
    if (queries.length === 0) return [targetedQuery]

    const next = [...queries]
    next[next.length - 1] = targetedQuery
    return next
  }

  private getProfileContext(): string {
    if (!this.profile) return DEFAULT_PROFILE_CONTEXT

    const services = (this.profile.services ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((s) => `- ${s}`)
      .join('\n')

    const portfolio = (this.profile.portfolio ?? [])
      .filter((p) => p.title.trim() && p.description.trim())
      .slice(0, 2)
      .map((p) => {
        const tech = p.technologies?.length
          ? ` (Tech: ${p.technologies.slice(0, 8).join(', ')})`
          : ''
        return `- ${p.title}: ${p.description}${tech}`
      })
      .join('\n')

    return [
      `Profile:`,
      `Type: ${this.profile.type}`,
      `Name: ${this.profile.name}`,
      '',
      'Services Offered:',
      services || '- (none)',
      this.profile.tagline.trim() ? `\nTagline: ${this.truncate(this.profile.tagline, 160)}` : '',
      this.profile.bio.trim() ? `\nBio: ${this.truncate(this.profile.bio, 900)}` : '',
      portfolio ? `\nPortfolio Highlights:\n${portfolio}` : ''
    ]
      .filter(Boolean)
      .join('\n')
  }

  private getSystemPrompt(): string {
    const context = this.getProfileContext()
    return `You are an intelligent email research agent for a software development business.

${context}

Key objective: Find real businesses in the provided niche that are likely to need our services (${this.getServicesInline()}).

${JSON_ONLY_RULE}

${AGENT_ROLE_AND_FORMAT}`
  }

  private async speak(prompt: string): Promise<string> {
    try {
      // Use LLM Provider Manager with automatic retry and failover
      const result = await this.llmProvider.invoke([
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ])

      if (result.success) {
        return result.content
      } else {
        console.error('[EmailAgent] LLM invocation failed:', result.error)
        return ''
      }
    } catch (error) {
      console.error('[EmailAgent] Speak error:', error)
      return ''
    }
  }

  private async speakStructured(prompt: string): Promise<{ status: string; details: string }> {
    const response = await this.speak(prompt)
    return this.parseStructuredResponse(response)
  }

  private emitStructured(response: { status: string; details: string }): void {
    if (response.details) {
      this.emitThinking(response.details)
    }
    if (response.status) {
      this.emitResponse(response.status)
    }
  }

  private async searchWeb(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, num: 10 })
      })
      if (!response.ok) return []
      const data = await response.json()
      return (data.organic || []).map((item: { title: string; link: string; snippet: string }) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || ''
      }))
    } catch {
      return []
    }
  }

  private async scrapePage(url: string): Promise<ScrapedPage | null> {
    if (this.stopped) return null
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: controller.signal
      })
      clearTimeout(timeout)
      if (!response.ok) return null

      const html = await response.text()
      const $ = cheerio.load(html)
      $('script, style, nav, footer, header').remove()

      const title = $('title').text().trim() || url
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const emails = [...new Set(html.match(emailRegex) || [])].filter((email) => {
        const lower = email.toLowerCase()
        return (
          !lower.includes('example.com') &&
          !lower.includes('domain.com') &&
          !lower.includes('.png') &&
          !lower.includes('.jpg') &&
          !lower.endsWith('.js') &&
          !lower.endsWith('.css')
        )
      })

      return { url, title, content: bodyText, emails }
    } catch {
      return null
    }
  }

  async run(niche: string): Promise<void> {
    const processedEmails = new Set<string>()
    const processedUrls = new Set<string>()
    let leadCount = 0

    try {
      // Step 1: Deep niche analysis
      const analysisResponse = await this.speakStructured(
        `I need to deeply analyze this niche: "${niche}"

Please provide a thorough analysis covering:
1. What types of businesses are in this niche?
2. What are their typical digital needs and pain points?
3. How could our services (${this.getServicesInline()}) help them?
4. What search terms would find REAL businesses that need these services (not directories or email sellers)?

End with exactly 5 search queries in this format:
QUERIES: ["query1", "query2", "query3", "query4", "query5"]

Remember to format your response with [STATUS] and [DETAILS] sections.`
      )

      this.emitStructured(analysisResponse)
      if (this.stopped) return

      // Extract queries from analysis (check both status and details for QUERIES)
      const fullAnalysis = `${analysisResponse.status}\n${analysisResponse.details}`
      let queries: string[] = []
      const queriesMatch = fullAnalysis.match(/QUERIES:\s*\n?\s*(\[[\s\S]*?\])/i)
      if (queriesMatch) {
        try {
          queries = JSON.parse(queriesMatch[1])
        } catch {
          queries = [`${niche} business contact`, `${niche} companies near me`, `${niche} services`]
        }
      } else {
        queries = [`${niche} business contact`, `${niche} companies near me`, `${niche} services`]
      }

      queries = this.ensureServiceTargetedQueries(niche, queries)

      // Step 2: Announce search plan
      const planResponse = await this.speakStructured(
        `Based on my analysis, I've identified ${queries.length} search queries to find potential clients in the "${niche}" niche. I'll now search for businesses and analyze each one to find quality contacts.

Remember to format your response with [STATUS] and [DETAILS] sections.`
      )
      this.emitStructured(planResponse)
      if (this.stopped) return

      // Step 3: Execute searches
      for (const query of queries) {
        if (this.stopped) break

        const results = await this.searchWeb(query)
        if (results.length > 0) {
          this.emitSearch(
            query,
            results.slice(0, 10).map((r) => ({ title: r.title, url: r.link }))
          )
        }

        // Step 4: Analyze each result
        for (const result of results) {
          if (this.stopped) break
          if (processedUrls.has(result.link)) continue
          processedUrls.add(result.link)

          const page = await this.scrapePage(result.link)
          if (!page) continue

          // Step 5: LLM analyzes the website
          const websiteAnalysisRaw = await this.speak(
            `I just scraped this website. Analyze if this is a potential client for our services (${this.getServicesInline()}):

URL: ${page.url}
Title: ${page.title}
Content (excerpt): ${page.content.slice(0, 2000)}
Emails found: ${page.emails.join(', ') || 'None'}

Determine:
1. Is this a real business that could benefit from our services?
2. Or is it a directory, competitor, email seller, or irrelevant site?
3. If there are emails, are they worth contacting?

Be brief and decisive. If it's a good lead, say so clearly.

Remember to format your response with [STATUS] and [DETAILS] sections.`
          )
          const websiteAnalysis = this.parseStructuredResponse(websiteAnalysisRaw)
          const websiteAnalysisFull = `${websiteAnalysis.status}\n${websiteAnalysis.details}`

          // Check if LLM thinks it's a good lead
          const isGoodLead =
            websiteAnalysisFull.toLowerCase().includes('good lead') ||
            websiteAnalysisFull.toLowerCase().includes('potential client') ||
            websiteAnalysisFull.toLowerCase().includes('worth contacting') ||
            websiteAnalysisFull.toLowerCase().includes('real business')

          const isSkip =
            websiteAnalysisFull.toLowerCase().includes('skip') ||
            websiteAnalysisFull.toLowerCase().includes('competitor') ||
            websiteAnalysisFull.toLowerCase().includes('directory') ||
            websiteAnalysisFull.toLowerCase().includes('irrelevant') ||
            websiteAnalysisFull.toLowerCase().includes('email seller')

          if (isSkip && !isGoodLead) {
            this.emitStructured(websiteAnalysis)
            continue
          }

          if (page.emails.length === 0) {
            this.emitStructured(websiteAnalysis)
            continue
          }

          // Step 6: Process emails
          for (const email of page.emails) {
            if (this.stopped) break
            if (processedEmails.has(email.toLowerCase())) continue
            processedEmails.add(email.toLowerCase())

            // LLM evaluates the email
            const emailEvalRaw = await this.speak(
              `Evaluate this email for outreach: ${email}
From business: ${page.title}
Website: ${page.url}

Is this a quality contact worth adding to our lead list? Consider:
- Is it a personal/decision-maker email or generic (info@, support@)?
- Would they likely respond to a pitch for our services (${this.getServicesInline()})?

Be brief. If it's good, I'll add it to the list.

Remember to format your response with [STATUS] and [DETAILS] sections.`
            )
            const emailEval = this.parseStructuredResponse(emailEvalRaw)
            const emailEvalFull = `${emailEval.status}\n${emailEval.details}`

            const isQualityEmail =
              emailEvalFull.toLowerCase().includes('add') ||
              emailEvalFull.toLowerCase().includes('quality') ||
              emailEvalFull.toLowerCase().includes('worth') ||
              emailEvalFull.toLowerCase().includes('good contact') ||
              emailEvalFull.toLowerCase().includes('decision maker')

            if (!isQualityEmail) {
              this.emitStructured(emailEval)
              continue
            }

            // Generate email template
            const templateResponse = await this.speak(
              `Generate a personalized cold email for:
Business: ${page.title}
Email: ${email}
Niche: ${niche}

Write a short, professional outreach email introducing our services (${this.getServicesInline()}).
Use a friendly but professional tone. Keep it concise.
Include a brief sign-off using our name: ${this.profile?.name ?? 'Our team'}.

Format as JSON: {"subject": "...", "body": "..."}`
            )

            let template = {
              subject: `Partnership opportunity`,
              body: `Hi, I'd love to discuss how we can help your business grow.`
            }
            try {
              const jsonMatch = templateResponse.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/)
              if (jsonMatch) {
                template = JSON.parse(jsonMatch[0])
              }
            } catch {
              // Use default template
            }

            leadCount++
            const lead: ExtractedLead = {
              id: `lead-${Date.now()}-${leadCount}`,
              email,
              source: page.url,
              context: {
                businessName: page.title,
                website: page.url,
                summary: websiteAnalysis.status.slice(0, 200)
              },
              template,
              foundAt: Date.now()
            }

            this.emit('lead', lead)

            // Announce the lead
            const leadAnnouncement = await this.speakStructured(
              `I found a qualified lead! ${email} from ${page.title}. This looks like a good fit for our services. Added to the list.

Remember to format your response with [STATUS] and [DETAILS] sections.`
            )
            this.emitStructured(leadAnnouncement)

            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Final summary
      const summary = await this.speakStructured(
        `I've completed my research on the "${niche}" niche. Found ${leadCount} qualified leads. ${leadCount > 0 ? `These contacts look promising for outreach about our services (${this.getServicesInline()}).` : 'I may need different search terms to find better leads in this niche.'}

Remember to format your response with [STATUS] and [DETAILS] sections.`
      )
      this.emitStructured(summary)

      this.emit('complete')
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'))
    }
  }
}
