/**
 * Fetch Page Tool - Download and parse web pages
 */

import * as cheerio from 'cheerio'
import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  FetchedPage
} from './types'

export interface FetchPageParams {
  url: string
  timeout?: number
}

export class FetchPageTool implements AgentTool<FetchPageParams, FetchedPage> {
  name = 'fetch_page'
  description = `Fetch and parse a web page to extract its content. Use this tool to read the actual content of a webpage, find contact information, or analyze a business website. Returns cleaned text content.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL of the page to fetch (must include http:// or https://)'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 10000)',
        default: 10000
      }
    },
    required: ['url']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(params: FetchPageParams, context: ToolContext): Promise<ToolResult<FetchedPage>> {
    const { url, timeout = 10000 } = params

    if (!url || !url.trim()) {
      return {
        success: false,
        error: 'URL is required'
      }
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        success: false,
        error: 'URL must start with http:// or https://'
      }
    }

    // Check if already processed
    if (context.processedUrls.has(url)) {
      return {
        success: false,
        error: 'This URL has already been processed in this session'
      }
    }

    // Check rate limit
    if (context.rateLimiter.fetchCount >= context.rateLimiter.maxFetches) {
      return {
        success: false,
        error: `Fetch rate limit reached (${context.rateLimiter.maxFetches} pages). Cannot fetch more pages.`
      }
    }

    // Mark as processed and increment counter
    context.processedUrls.add(url)
    context.rateLimiter.fetchCount++

    context.emitEvent({
      type: 'status',
      content: `Fetching: ${url}`,
      timestamp: Date.now()
    })

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return {
          success: false,
          error: `Unsupported content type: ${contentType}`
        }
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Remove non-content elements
      $('script, style, nav, footer, header, aside, noscript, iframe, svg').remove()

      const title = $('title').text().trim() || $('h1').first().text().trim() || url
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)

      return {
        success: true,
        data: {
          url,
          finalUrl: response.url,
          title,
          content: bodyText,
          statusCode: response.status,
          contentType
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out'
        }
      }
      return {
        success: false,
        error: `Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const fetchPageTool = new FetchPageTool()
