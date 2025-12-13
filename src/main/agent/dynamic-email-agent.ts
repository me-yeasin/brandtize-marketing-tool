/**
 * Dynamic Email Agent - Uses tool registry for dynamic tool calling
 *
 * This agent implements a ReAct-style loop where the LLM decides which tools
 * to use based on the current context and goals.
 */

import { EventEmitter } from 'events'
import { ChatGroq } from '@langchain/groq'
import type { AgencyProfile } from '../store'
import type { AgentEvent, ExtractedLead } from './types'
import { ToolRegistry } from './tools/registry'
import { webSearchTool } from './tools/web-search'
import { fetchPageTool } from './tools/fetch-page'
import { extractEmailsTool } from './tools/extract-emails'
import { urlPolicyTool } from './tools/url-policy'
import { rateLimiterTool } from './tools/rate-limiter'
import { domainClassifierTool } from './tools/domain-classifier'
import { contactClassifierTool } from './tools/contact-classifier'
import { companyExtractorTool } from './tools/company-extractor'
import { emitLeadTool } from './tools/emit-lead'
import type { ToolContext, ToolEvent, RateLimiterState } from './tools/types'

const MAX_ITERATIONS = 25

interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
  tool_call_id?: string
  name?: string
}

export class DynamicEmailAgent extends EventEmitter {
  private serperApiKey: string
  private stopped = false
  private llm: ChatGroq
  private profile?: AgencyProfile
  private registry: ToolRegistry
  private toolContext!: ToolContext

  constructor(
    groqApiKey: string,
    serperApiKey: string,
    model: string = 'llama-3.3-70b-versatile',
    profile?: AgencyProfile
  ) {
    super()
    this.serperApiKey = serperApiKey
    this.profile = profile
    this.llm = new ChatGroq({
      apiKey: groqApiKey,
      model: model,
      temperature: 0.3
    })

    this.registry = new ToolRegistry({
      serperApiKey: this.serperApiKey,
      maxSearches: 15,
      maxFetches: 40,
      maxDurationMs: 5 * 60 * 1000,
      onEvent: (event) => {
        this.emit('event', {
          type: event.type as AgentEvent['type'],
          content: event.content,
          timestamp: event.timestamp,
          metadata: event.metadata
        } as AgentEvent)
      }
    })
    this.registerTools()
  }

  private registerTools(): void {
    this.registry.register(webSearchTool)
    this.registry.register(fetchPageTool)
    this.registry.register(extractEmailsTool)
    this.registry.register(urlPolicyTool)
    this.registry.register(rateLimiterTool)
    this.registry.register(domainClassifierTool)
    this.registry.register(contactClassifierTool)
    this.registry.register(companyExtractorTool)
    this.registry.register(emitLeadTool)
  }

  stop(): void {
    this.stopped = true
  }

  private getServicesInline(): string {
    const services = this.profile?.services
      ?.map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8)
    if (!services || services.length === 0) return 'software development services'
    return services.join(', ')
  }

  private getSystemPrompt(niche: string): string {
    const profileContext = this.profile
      ? `Agency: ${this.profile.name}\nType: ${this.profile.type}\nServices: ${this.getServicesInline()}`
      : 'A software development agency'

    const toolDescriptions = this.registry
      .getToolDefinitions()
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n')

    return `You are an intelligent lead research agent for a software development business.

${profileContext}

YOUR GOAL: Find businesses in the "${niche}" niche that could benefit from our services, extract their contact emails, and register qualified leads.

AVAILABLE TOOLS:
${toolDescriptions}

WORKFLOW:
1. Start by searching for businesses in the niche using web_search
2. For each promising result, use fetch_page to get the content
3. Use extract_emails to find contact emails
4. Use classify_domain to verify it's a real business (not a directory/competitor)
5. Use classify_contact to evaluate email quality
6. Use extract_company_info to gather business details
7. For qualified leads, use emit_lead to register them

IMPORTANT RULES:
- Always check url_policy_check before fetching unknown URLs
- Use check_rate_limit periodically to monitor your budget
- Skip directories, email sellers, and competitor agencies
- Prioritize personal/decision-maker emails over generic ones
- Generate personalized email templates for each lead
- Be efficient - don't fetch pages that are clearly irrelevant
- Stop when you've found several good leads or exhausted search results

RESPONSE FORMAT:
Always respond with valid JSON only. Use one of these formats:

1. To use a tool:
{"tool": "tool_name", "params": {...}}

2. To share your detailed analysis/reasoning (shown in expandable panel):
{"thinking": "your detailed analysis, reasoning, or observations here..."}

3. To share a brief status update with the user (shown directly on screen):
{"status": "brief 1-2 sentence update"}

4. When you're done:
{"done": true, "summary": "brief summary of what you found"}

Guidelines:
- Use "thinking" for detailed analysis, observations about websites, reasoning about lead quality
- Use "status" for brief progress updates the user should see immediately
- You can combine them: {"tool": "...", "params": {...}, "status": "Searching for businesses..."}

Always respond with valid JSON only. No other text.`
  }

  private createToolContext(): ToolContext {
    const rateLimiter: RateLimiterState = {
      searchCount: 0,
      fetchCount: 0,
      maxSearches: 15,
      maxFetches: 40,
      startTime: Date.now(),
      maxDurationMs: 5 * 60 * 1000
    }

    return {
      serperApiKey: this.serperApiKey,
      profile: this.profile,
      processedUrls: new Set<string>(),
      processedEmails: new Set<string>(),
      rateLimiter,
      emitEvent: (event: ToolEvent) => {
        const agentEvent: AgentEvent = {
          type: event.type as AgentEvent['type'],
          content: event.content,
          timestamp: event.timestamp,
          metadata: event.metadata
        }
        this.emit('event', agentEvent)

        if (event.metadata?.lead) {
          const leadData = event.metadata.lead as {
            id: string
            email: string
            source: string
            company?: { name?: string; website?: string; summary?: string }
            template?: { subject: string; body: string }
            foundAt: number
          }
          const lead: ExtractedLead = {
            id: leadData.id,
            email: leadData.email,
            source: leadData.source,
            context: {
              businessName: leadData.company?.name || 'Unknown',
              website: leadData.company?.website || leadData.source,
              summary: leadData.company?.summary || ''
            },
            template: leadData.template || {
              subject: 'Partnership Opportunity',
              body: 'Hi, I would love to discuss how we can help your business.'
            },
            foundAt: leadData.foundAt
          }
          this.emit('lead', lead)
        }
      }
    }
  }

  private parseAgentResponse(response: string): {
    tool?: string
    params?: Record<string, unknown>
    message?: string
    thinking?: string
    status?: string
    done?: boolean
    summary?: string
  } {
    try {
      const cleaned = response.trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return { message: response }
    } catch {
      return { message: response }
    }
  }

  private async invokeWithTools(messages: AgentMessage[]): Promise<string> {
    try {
      const response = await this.llm.invoke(
        messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      )
      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)
    } catch (error) {
      console.error('LLM invocation error:', error)
      return JSON.stringify({ done: true, summary: 'Error occurred during processing' })
    }
  }

  async run(niche: string): Promise<void> {
    this.toolContext = this.createToolContext()
    const messages: AgentMessage[] = [
      { role: 'system', content: this.getSystemPrompt(niche) },
      {
        role: 'user',
        content: `Find businesses in the "${niche}" niche that could benefit from our services (${this.getServicesInline()}). Search for real businesses, analyze their websites, extract contact emails, and register qualified leads. Start by searching.`
      }
    ]

    // Emit initial status (short, shown directly on screen)
    this.emit('event', {
      type: 'status',
      content: `Starting research for "${niche}" niche...`,
      timestamp: Date.now()
    } as AgentEvent)

    let iteration = 0
    let leadCount = 0

    while (!this.stopped && iteration < MAX_ITERATIONS) {
      iteration++

      const elapsed = Date.now() - this.toolContext.rateLimiter.startTime
      if (elapsed > this.toolContext.rateLimiter.maxDurationMs) {
        this.emit('event', {
          type: 'response',
          content: 'Time limit reached. Wrapping up research.',
          timestamp: Date.now()
        } as AgentEvent)
        break
      }

      try {
        const response = await this.invokeWithTools(messages)
        const parsed = this.parseAgentResponse(response)

        if (parsed.done) {
          this.emit('event', {
            type: 'response',
            content: parsed.summary || `Research complete. Found ${leadCount} leads.`,
            timestamp: Date.now()
          } as AgentEvent)
          break
        }

        // Handle detailed thinking (goes into expandable panel)
        if (parsed.thinking) {
          this.emit('event', {
            type: 'thinking',
            content: parsed.thinking,
            timestamp: Date.now()
          } as AgentEvent)
        }

        // Handle brief status updates (shown directly on screen)
        if (parsed.status) {
          this.emit('event', {
            type: 'status',
            content: parsed.status,
            timestamp: Date.now()
          } as AgentEvent)
        }

        // Handle legacy message format (treat as response)
        if (parsed.message) {
          this.emit('event', {
            type: 'response',
            content: parsed.message,
            timestamp: Date.now()
          } as AgentEvent)
          messages.push({ role: 'assistant', content: response })
          messages.push({ role: 'user', content: 'Continue with the next step.' })
          continue
        }

        if (parsed.tool && parsed.params) {
          const toolName = parsed.tool
          const params = parsed.params

          // Short status for tool usage (shown directly on screen)
          this.emit('event', {
            type: 'status',
            content: `Using tool: ${toolName}`,
            timestamp: Date.now()
          } as AgentEvent)

          const result = await this.registry.executeTool(toolName, params)

          if (toolName === 'emit_lead' && result.success) {
            leadCount++
          }

          const resultSummary = result.success
            ? JSON.stringify(result.data, null, 2).slice(0, 2000)
            : `Error: ${result.error}`

          messages.push({ role: 'assistant', content: response })
          messages.push({
            role: 'user',
            content: `Tool result for ${toolName}:\n${resultSummary}\n\nAnalyze this result and decide what to do next. Remember to use emit_lead when you find a qualified business with contact emails.`
          })

          if (messages.length > 30) {
            const systemMsg = messages[0]
            const recentMessages = messages.slice(-20)
            messages.length = 0
            messages.push(systemMsg, ...recentMessages)
          }

          continue
        }

        messages.push({ role: 'assistant', content: response })
        messages.push({
          role: 'user',
          content:
            'Please respond with valid JSON. Use {"tool": "tool_name", "params": {...}} to use a tool, {"message": "..."} to share findings, or {"done": true} when finished.'
        })
      } catch (error) {
        console.error('Agent loop error:', error)
        this.emit('event', {
          type: 'response',
          content: 'Encountered an issue. Attempting to continue...',
          timestamp: Date.now()
        } as AgentEvent)

        messages.push({
          role: 'user',
          content:
            'There was an error. Please try a different approach or summarize your findings so far.'
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (this.stopped) {
      this.emit('event', {
        type: 'response',
        content: 'Research stopped by user.',
        timestamp: Date.now()
      } as AgentEvent)
    }

    this.emit('complete')
  }
}
