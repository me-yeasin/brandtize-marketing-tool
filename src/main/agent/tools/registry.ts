/**
 * Tool Registry - Central hub for tool management
 *
 * The registry handles:
 * - Tool registration and discovery
 * - Tool lookup by name
 * - Generating tool definitions for LLM function calling
 * - Creating tool context with shared resources
 */

import type {
  AgentTool,
  ToolDefinition,
  ToolContext,
  ToolResult,
  RateLimiterState,
  ToolEvent
} from './types'

/**
 * Configuration for creating a tool registry
 */
export interface ToolRegistryConfig {
  serperApiKey: string
  maxSearches?: number
  maxFetches?: number
  maxDurationMs?: number
  onEvent?: (event: ToolEvent) => void
}

/**
 * Tool Registry - manages all available tools
 */
export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map()
  private config: ToolRegistryConfig
  private rateLimiter: RateLimiterState
  private processedUrls: Set<string> = new Set()
  private processedEmails: Set<string> = new Set()

  constructor(config: ToolRegistryConfig) {
    this.config = config
    this.rateLimiter = {
      searchCount: 0,
      fetchCount: 0,
      maxSearches: config.maxSearches ?? 10,
      maxFetches: config.maxFetches ?? 30,
      startTime: Date.now(),
      maxDurationMs: config.maxDurationMs ?? 5 * 60 * 1000 // 5 minutes default
    }
  }

  /**
   * Register a tool with the registry
   */
  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: AgentTool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get all tool definitions for LLM function calling
   * This is what you pass to the model so it knows what tools are available
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition())
  }

  /**
   * Get tool definitions formatted for LLM system prompt
   */
  getToolsPrompt(): string {
    const definitions = this.getToolDefinitions()

    const toolDescriptions = definitions
      .map((def) => {
        const params = def.parameters.properties
          ? Object.entries(def.parameters.properties)
              .map(([key, prop]) => `    - ${key}: ${prop.description}`)
              .join('\n')
          : '    (no parameters)'

        return `## ${def.name}
${def.description}
Parameters:
${params}`
      })
      .join('\n\n')

    return toolDescriptions
  }

  /**
   * Create execution context for tools
   */
  private createContext(): ToolContext {
    return {
      serperApiKey: this.config.serperApiKey,
      rateLimiter: this.rateLimiter,
      processedUrls: this.processedUrls,
      processedEmails: this.processedEmails,
      emitEvent: (event: ToolEvent) => {
        this.config.onEvent?.(event)
      }
    }
  }

  /**
   * Execute a tool by name with given arguments
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name)

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found. Available tools: ${this.getToolNames().join(', ')}`
      }
    }

    // Check rate limits
    if (this.isRateLimited()) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before making more tool calls.'
      }
    }

    // Check timeout
    if (this.isTimedOut()) {
      return {
        success: false,
        error: 'Maximum execution time exceeded.'
      }
    }

    const context = this.createContext()

    // Emit tool start event (status type for direct display)
    context.emitEvent({
      type: 'status',
      toolName: name,
      content: `Running ${name}...`,
      timestamp: Date.now(),
      metadata: { toolEvent: 'start', arguments: args }
    })

    try {
      const result = await tool.execute(args, context)

      // Emit tool end event (status type for direct display)
      context.emitEvent({
        type: 'status',
        toolName: name,
        content: result.success ? `✓ ${name} completed` : `✗ ${name} failed: ${result.error}`,
        timestamp: Date.now(),
        metadata: { toolEvent: 'end', success: result.success }
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      context.emitEvent({
        type: 'status',
        toolName: name,
        content: `✗ ${name} error: ${errorMessage}`,
        timestamp: Date.now(),
        metadata: { toolEvent: 'error', success: false, error: errorMessage }
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Check if rate limited
   */
  isRateLimited(): boolean {
    return (
      this.rateLimiter.searchCount >= this.rateLimiter.maxSearches ||
      this.rateLimiter.fetchCount >= this.rateLimiter.maxFetches
    )
  }

  /**
   * Check if timed out
   */
  isTimedOut(): boolean {
    return Date.now() - this.rateLimiter.startTime > this.rateLimiter.maxDurationMs
  }

  /**
   * Get current rate limiter state
   */
  getRateLimiterState(): RateLimiterState {
    return { ...this.rateLimiter }
  }

  /**
   * Reset the registry state (for new agent runs)
   */
  reset(): void {
    this.rateLimiter = {
      searchCount: 0,
      fetchCount: 0,
      maxSearches: this.config.maxSearches ?? 10,
      maxFetches: this.config.maxFetches ?? 30,
      startTime: Date.now(),
      maxDurationMs: this.config.maxDurationMs ?? 5 * 60 * 1000
    }
    this.processedUrls.clear()
    this.processedEmails.clear()
  }

  /**
   * Increment search counter
   */
  incrementSearchCount(): void {
    this.rateLimiter.searchCount++
  }

  /**
   * Increment fetch counter
   */
  incrementFetchCount(): void {
    this.rateLimiter.fetchCount++
  }
}

/**
 * Create a pre-configured tool registry with all default tools
 */
export function createToolRegistry(config: ToolRegistryConfig): ToolRegistry {
  const registry = new ToolRegistry(config)

  // Tools will be registered by the agent after importing them
  // This keeps the registry independent of specific tool implementations

  return registry
}
