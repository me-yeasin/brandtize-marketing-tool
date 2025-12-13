/**
 * Rate Limiter Tool - Check and manage rate limits
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  RateLimiterState
} from './types'

export interface RateLimiterParams {
  action?: 'check' | 'status'
}

export interface RateLimiterData {
  canContinue: boolean
  state: RateLimiterState
  message: string
}

export class RateLimiterTool implements AgentTool<RateLimiterParams, RateLimiterData> {
  name = 'check_rate_limit'
  description = `Check if you can continue making tool calls. Use this to see how many searches and page fetches you have remaining before hitting limits.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform: "check" (default) or "status"',
        enum: ['check', 'status'],
        default: 'check'
      }
    },
    required: []
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    _params: RateLimiterParams,
    context: ToolContext
  ): Promise<ToolResult<RateLimiterData>> {
    const state = context.rateLimiter
    const elapsed = Date.now() - state.startTime
    const remaining = Math.max(0, state.maxDurationMs - elapsed)

    const searchesLeft = state.maxSearches - state.searchCount
    const fetchesLeft = state.maxFetches - state.fetchCount

    const canContinue = searchesLeft > 0 && fetchesLeft > 0 && remaining > 0

    let message = ''
    if (!canContinue) {
      if (searchesLeft <= 0) {
        message = `Search limit reached (${state.maxSearches} searches used)`
      } else if (fetchesLeft <= 0) {
        message = `Fetch limit reached (${state.maxFetches} pages fetched)`
      } else {
        message = `Time limit reached (${Math.floor(state.maxDurationMs / 1000)}s elapsed)`
      }
    } else {
      message = `OK: ${searchesLeft} searches, ${fetchesLeft} fetches, ${Math.floor(remaining / 1000)}s remaining`
    }

    return {
      success: true,
      data: {
        canContinue,
        state: { ...state },
        message
      }
    }
  }
}

export const rateLimiterTool = new RateLimiterTool()
