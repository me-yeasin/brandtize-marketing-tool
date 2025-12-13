/**
 * Tool System Types - Core interfaces for the scalable tool architecture
 *
 * This file defines the contracts that all tools must follow.
 * The design enables:
 * - Dynamic tool discovery and registration
 * - Type-safe parameter and result handling
 * - LLM-compatible tool schemas (function calling format)
 * - Easy addition of new tools without modifying core agent logic
 */

/**
 * JSON Schema type for tool parameters
 * Used to describe tool inputs in a format LLMs understand
 */
export interface ToolParameterSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  properties?: Record<string, ToolPropertySchema>
  required?: string[]
  items?: ToolPropertySchema
  description?: string
}

export interface ToolPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: ToolPropertySchema
  default?: unknown
}

/**
 * Tool definition schema - describes a tool to the LLM
 * This is what gets passed to the model for function calling
 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameterSchema
}

/**
 * Result of a tool execution
 */
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Context passed to tools during execution
 * Contains shared resources and state
 */
export interface ToolContext {
  serperApiKey: string
  rateLimiter: RateLimiterState
  processedUrls: Set<string>
  processedEmails: Set<string>
  emitEvent: (event: ToolEvent) => void
  profile?: {
    name?: string
    type?: string
    services?: string[]
  }
}

/**
 * Rate limiter state for controlling tool usage
 */
export interface RateLimiterState {
  searchCount: number
  fetchCount: number
  maxSearches: number
  maxFetches: number
  startTime: number
  maxDurationMs: number
}

/**
 * Events emitted by tools for UI updates
 */
export interface ToolEvent {
  type: 'tool_start' | 'tool_end' | 'tool_progress' | 'search' | 'thinking' | 'response' | 'status'
  toolName?: string
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Base interface that all tools must implement
 * This is the core contract for the tool system
 */
export interface AgentTool<TParams = unknown, TResult = unknown> {
  /** Unique identifier for the tool */
  name: string

  /** Human-readable description of what the tool does */
  description: string

  /** JSON Schema describing the tool's parameters */
  parameters: ToolParameterSchema

  /** Execute the tool with given parameters and context */
  execute(params: TParams, context: ToolContext): Promise<ToolResult<TResult>>

  /** Get the tool definition for LLM function calling */
  getDefinition(): ToolDefinition
}

/**
 * Tool call request from the LLM
 */
export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

/**
 * Parsed tool call with validation status
 */
export interface ParsedToolCall {
  valid: boolean
  toolName?: string
  arguments?: Record<string, unknown>
  error?: string
}

// ============================================
// Tool-specific types
// ============================================

/**
 * Web search result item
 */
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  position: number
}

/**
 * Fetched page data
 */
export interface FetchedPage {
  url: string
  finalUrl: string
  title: string
  content: string
  statusCode: number
  contentType: string
}

/**
 * Extracted email with context
 */
export interface ExtractedEmail {
  email: string
  context: string
  location: 'body' | 'header' | 'footer' | 'contact_page' | 'unknown'
}

/**
 * Domain classification result
 */
export interface DomainClassification {
  category: 'real_business' | 'directory' | 'competitor' | 'spam' | 'email_seller' | 'unknown'
  confidence: number
  reasoning: string
  isGoodLead: boolean
}

/**
 * Contact/email classification result
 */
export interface ContactClassification {
  role: 'decision_maker' | 'generic' | 'support' | 'sales' | 'personal' | 'unknown'
  quality: 'high' | 'medium' | 'low'
  reasoning: string
}

/**
 * Extracted company information
 */
export interface CompanyInfo {
  name: string
  industry?: string
  location?: string
  services?: string[]
  website?: string
  signals?: string[]
  summary: string
  products?: string
}

/**
 * Lead data structure
 */
export interface LeadData {
  id: string
  email: string
  source: string
  company: CompanyInfo
  contactQuality: ContactClassification
  template: {
    subject: string
    body: string
  }
  verified?: boolean
  personalizationNote?: string
  foundAt: number
}
