/**
 * Extract Emails Tool - Find email addresses in page content
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  ExtractedEmail
} from './types'

export interface ExtractEmailsParams {
  content: string
  url?: string
}

export interface ExtractEmailsData {
  emails: ExtractedEmail[]
  totalFound: number
  uniqueCount: number
}

export class ExtractEmailsTool implements AgentTool<ExtractEmailsParams, ExtractEmailsData> {
  name = 'extract_emails'
  description = `Extract email addresses from text content. Use this after fetching a webpage to find contact emails. Returns a list of unique emails with context about where they were found.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The text content to search for email addresses'
      },
      url: {
        type: 'string',
        description: 'Optional: The source URL for context'
      }
    },
    required: ['content']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    params: ExtractEmailsParams,
    context: ToolContext
  ): Promise<ToolResult<ExtractEmailsData>> {
    const { content, url } = params

    if (!content || content.trim().length === 0) {
      return {
        success: true,
        data: {
          emails: [],
          totalFound: 0,
          uniqueCount: 0
        }
      }
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = content.match(emailRegex) || []

    // Filter out invalid/unwanted emails
    const invalidPatterns = [
      'example.com',
      'domain.com',
      'test.com',
      'email.com',
      'yoursite.com',
      'website.com',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.js',
      '.css',
      '.woff',
      '.ttf',
      'sentry.io',
      'webpack',
      '2x.png',
      'placeholder'
    ]

    const validEmails = matches.filter((email) => {
      const lower = email.toLowerCase()
      return !invalidPatterns.some((pattern) => lower.includes(pattern))
    })

    // Dedupe and track new vs seen
    const uniqueEmails: ExtractedEmail[] = []
    const seen = new Set<string>()

    for (const email of validEmails) {
      const normalized = email.toLowerCase()
      if (seen.has(normalized)) continue
      seen.add(normalized)

      // Skip if already processed in this session
      if (context.processedEmails.has(normalized)) continue
      context.processedEmails.add(normalized)

      // Determine location context
      let location: ExtractedEmail['location'] = 'unknown'
      const lowerContent = content.toLowerCase()
      const emailIndex = lowerContent.indexOf(normalized)

      if (emailIndex !== -1) {
        const surrounding = lowerContent.slice(
          Math.max(0, emailIndex - 100),
          Math.min(lowerContent.length, emailIndex + 100)
        )
        if (
          surrounding.includes('contact') ||
          surrounding.includes('reach') ||
          surrounding.includes('email us')
        ) {
          location = 'contact_page'
        } else if (surrounding.includes('footer') || surrounding.includes('copyright')) {
          location = 'footer'
        } else if (surrounding.includes('header') || surrounding.includes('nav')) {
          location = 'header'
        } else {
          location = 'body'
        }
      }

      // Extract surrounding context
      const contextStart = Math.max(0, emailIndex - 50)
      const contextEnd = Math.min(content.length, emailIndex + email.length + 50)
      const emailContext = content.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim()

      uniqueEmails.push({
        email,
        context: emailContext,
        location
      })
    }

    if (uniqueEmails.length > 0) {
      context.emitEvent({
        type: 'status',
        content: `Found ${uniqueEmails.length} new email(s)${url ? ` from ${url}` : ''}`,
        timestamp: Date.now(),
        metadata: { emails: uniqueEmails.map((e) => e.email) }
      })
    }

    return {
      success: true,
      data: {
        emails: uniqueEmails,
        totalFound: matches.length,
        uniqueCount: uniqueEmails.length
      }
    }
  }
}

export const extractEmailsTool = new ExtractEmailsTool()
