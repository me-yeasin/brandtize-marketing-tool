/**
 * Web Search Tool - Search the web using Serper API
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  WebSearchResult
} from './types'

export interface WebSearchParams {
  query: string
  numResults?: number
}

export interface WebSearchData {
  results: WebSearchResult[]
  query: string
  totalResults: number
}

export class WebSearchTool implements AgentTool<WebSearchParams, WebSearchData> {
  name = 'web_search'
  description = `Search the web for information using Google. Use this tool when you need to find businesses, contact information, or research a niche. Returns a list of search results with titles, URLs, and snippets.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to execute. Be specific and include relevant keywords.'
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return (default: 10, max: 20)',
        default: 10
      }
    },
    required: ['query']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(params: WebSearchParams, context: ToolContext): Promise<ToolResult<WebSearchData>> {
    const { query, numResults = 10 } = params

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Search query is required and cannot be empty'
      }
    }

    // Check rate limit
    if (context.rateLimiter.searchCount >= context.rateLimiter.maxSearches) {
      return {
        success: false,
        error: `Search rate limit reached (${context.rateLimiter.maxSearches} searches). Cannot perform more searches.`
      }
    }

    // Increment search counter
    context.rateLimiter.searchCount++

    // Emit search event for UI
    context.emitEvent({
      type: 'search',
      content: `Searching: "${query}"`,
      timestamp: Date.now(),
      metadata: { query }
    })

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': context.serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: Math.min(numResults, 20)
        })
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Search API error: ${response.status} ${response.statusText}`
        }
      }

      const data = await response.json()
      const organic = data.organic || []

      const results: WebSearchResult[] = organic.map(
        (item: { title: string; link: string; snippet: string }, index: number) => ({
          title: item.title || '',
          url: item.link || '',
          snippet: item.snippet || '',
          position: index + 1
        })
      )

      // Emit results for UI
      context.emitEvent({
        type: 'search',
        content: `Found ${results.length} results for "${query}"`,
        timestamp: Date.now(),
        metadata: {
          urls: results.slice(0, 10).map((r) => ({ title: r.title, url: r.url }))
        }
      })

      return {
        success: true,
        data: {
          results,
          query,
          totalResults: results.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const webSearchTool = new WebSearchTool()
