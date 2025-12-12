import { EventEmitter } from 'events'
import { ChatGroq } from '@langchain/groq'
import * as cheerio from 'cheerio'
import type { AgentEvent, ExtractedLead, SearchResult, ScrapedPage } from './types'

const OUR_SERVICES = `
Our agency specializes in:
- Next.js web application development
- Electron.js cross-platform desktop applications
- React Native mobile apps
- Full-stack web development
- Custom software solutions

We help businesses build modern digital solutions to grow their online presence.
`

const AGENT_SYSTEM = `You are an intelligent email research agent for a software development agency.

${OUR_SERVICES}

Your role:
1. Deeply analyze niches to find businesses that need our services
2. Identify quality email contacts for outreach
3. Skip irrelevant businesses (competitors, email sellers, directories)
4. Speak naturally and explain your thinking clearly

Keep responses concise but informative. Be conversational.`

export class EmailAgent extends EventEmitter {
  private serperApiKey: string
  private stopped = false
  private llm: ChatGroq

  constructor(groqApiKey: string, serperApiKey: string, model: string = 'llama-3.3-70b-versatile') {
    super()
    this.serperApiKey = serperApiKey
    this.llm = new ChatGroq({
      apiKey: groqApiKey,
      model: model,
      temperature: 0.7
    })
  }

  stop(): void {
    this.stopped = true
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

  private emitStatus(content: string): void {
    if (this.stopped || !content.trim()) return
    this.emit('event', { type: 'status', content, timestamp: Date.now() } as AgentEvent)
  }

  private async speak(prompt: string): Promise<string> {
    try {
      const response = await this.llm.invoke([
        { role: 'system', content: AGENT_SYSTEM },
        { role: 'user', content: prompt }
      ])
      return typeof response.content === 'string' ? response.content : ''
    } catch {
      return ''
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
      const analysisResponse = await this.speak(
        `I need to deeply analyze this niche: "${niche}"

Please provide a thorough analysis covering:
1. What types of businesses are in this niche?
2. What are their typical digital needs and pain points?
3. How could our development services (Next.js, Electron.js, React Native, web/mobile apps) help them?
4. What search terms would find REAL businesses (not directories or email sellers)?

End with exactly 5 search queries in this format:
QUERIES: ["query1", "query2", "query3", "query4", "query5"]`
      )

      this.emitThinking(analysisResponse)
      if (this.stopped) return

      // Extract queries from analysis
      let queries: string[] = []
      const queriesMatch = analysisResponse.match(/QUERIES:\s*\n?\s*(\[[\s\S]*?\])/i)
      if (queriesMatch) {
        try {
          queries = JSON.parse(queriesMatch[1])
        } catch {
          queries = [`${niche} business contact`, `${niche} companies near me`, `${niche} services`]
        }
      } else {
        queries = [`${niche} business contact`, `${niche} companies near me`, `${niche} services`]
      }

      // Step 2: Announce search plan
      const planResponse = await this.speak(
        `Based on my analysis, I've identified ${queries.length} search queries to find potential clients in the "${niche}" niche. I'll now search for businesses and analyze each one to find quality contacts.`
      )
      this.emitResponse(planResponse)
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
          const websiteAnalysis = await this.speak(
            `I just scraped this website. Analyze if this is a potential client for our development services:

URL: ${page.url}
Title: ${page.title}
Content (excerpt): ${page.content.slice(0, 2000)}
Emails found: ${page.emails.join(', ') || 'None'}

Determine:
1. Is this a real business that could benefit from our services?
2. Or is it a directory, competitor, email seller, or irrelevant site?
3. If there are emails, are they worth contacting?

Be brief and decisive. If it's a good lead, say so clearly.`
          )

          // Check if LLM thinks it's a good lead
          const isGoodLead =
            websiteAnalysis.toLowerCase().includes('good lead') ||
            websiteAnalysis.toLowerCase().includes('potential client') ||
            websiteAnalysis.toLowerCase().includes('worth contacting') ||
            websiteAnalysis.toLowerCase().includes('real business')

          const isSkip =
            websiteAnalysis.toLowerCase().includes('skip') ||
            websiteAnalysis.toLowerCase().includes('competitor') ||
            websiteAnalysis.toLowerCase().includes('directory') ||
            websiteAnalysis.toLowerCase().includes('irrelevant') ||
            websiteAnalysis.toLowerCase().includes('email seller')

          if (isSkip && !isGoodLead) {
            this.emitThinking(websiteAnalysis)
            continue
          }

          if (page.emails.length === 0) {
            this.emitResponse(websiteAnalysis)
            continue
          }

          // Step 6: Process emails
          for (const email of page.emails) {
            if (this.stopped) break
            if (processedEmails.has(email.toLowerCase())) continue
            processedEmails.add(email.toLowerCase())

            // LLM evaluates the email
            const emailEval = await this.speak(
              `Evaluate this email for outreach: ${email}
From business: ${page.title}
Website: ${page.url}

Is this a quality contact worth adding to our lead list? Consider:
- Is it a personal/decision-maker email or generic (info@, support@)?
- Would they likely respond to a development services pitch?

Be brief. If it's good, I'll add it to the list.`
            )

            const isQualityEmail =
              emailEval.toLowerCase().includes('add') ||
              emailEval.toLowerCase().includes('quality') ||
              emailEval.toLowerCase().includes('worth') ||
              emailEval.toLowerCase().includes('good contact') ||
              emailEval.toLowerCase().includes('decision maker')

            if (!isQualityEmail) {
              this.emitThinking(emailEval)
              continue
            }

            // Generate email template
            const templateResponse = await this.speak(
              `Generate a personalized cold email for:
Business: ${page.title}
Email: ${email}
Niche: ${niche}

Write a short, professional outreach email introducing our development services.
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
                summary: websiteAnalysis.slice(0, 200)
              },
              template,
              foundAt: Date.now()
            }

            this.emit('lead', lead)

            // Announce the lead
            const leadAnnouncement = await this.speak(
              `I found a qualified lead! ${email} from ${page.title}. This looks like a good fit for our services. Added to the list.`
            )
            this.emitResponse(leadAnnouncement)

            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Final summary
      const summary = await this.speak(
        `I've completed my research on the "${niche}" niche. Found ${leadCount} qualified leads. ${leadCount > 0 ? 'These contacts look promising for outreach about our development services.' : 'I may need different search terms to find better leads in this niche.'}`
      )
      this.emitResponse(summary)

      this.emit('complete')
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'))
    }
  }
}
