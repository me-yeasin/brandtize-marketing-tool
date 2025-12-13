/**
 * LLM Provider Manager - Handles model failover, retry/backoff, and rate limit management
 *
 * Features:
 * - Multiple model rotation with automatic failover
 * - Retry with exponential backoff for rate limits (429)
 * - Per-model cooldown tracking
 * - Context preservation for seamless model switching
 * - Error classification to determine appropriate action
 */

import { ChatGroq } from '@langchain/groq'
import { EventEmitter } from 'events'

/**
 * Supported Groq models for rotation
 * Ordered by capability/preference - will try in order
 */
export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-groq-70b-8192-tool-use-preview',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'gemma2-9b-it',
  'mixtral-8x7b-32768'
] as const

export type GroqModel = (typeof GROQ_MODELS)[number]

/**
 * Error types that determine how we handle failures
 */
export type LLMErrorType =
  | 'rate_limit' // 429 - retry with backoff, then failover
  | 'timeout' // Request timeout - retry, then failover
  | 'server_error' // 5xx - retry, then failover
  | 'context_length' // Context too long - must summarize, not failover
  | 'auth_error' // 401/403 - cannot recover by failover
  | 'bad_request' // 400 - fix input, not failover
  | 'unknown' // Unknown error - try failover

/**
 * Model state tracking
 */
interface ModelState {
  model: GroqModel
  instance: ChatGroq | null
  cooldownUntil: number // Timestamp when model becomes available again
  consecutiveFailures: number
  lastError: string | null
  lastUsed: number
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

/**
 * Invocation result with metadata
 */
export interface LLMInvocationResult {
  success: boolean
  content: string
  model: GroqModel
  retryCount: number
  switchCount: number
  error?: string
  errorType?: LLMErrorType
}

/**
 * Handoff snapshot for context preservation when switching models
 */
export interface HandoffSnapshot {
  currentObjective: string
  progressSummary: string
  keyFacts: string[]
  openTasks: string[]
  lastSuccessfulStep: string
  lastAttemptedAction: string
  recentToolResults: Array<{ tool: string; result: string }>
}

/**
 * Events emitted by the provider manager
 */
export interface LLMProviderEvents {
  'model:switch': { from: GroqModel; to: GroqModel; reason: string }
  'model:cooldown': { model: GroqModel; until: number; reason: string }
  'retry:attempt': { model: GroqModel; attempt: number; maxRetries: number; delayMs: number }
  'error:classified': { errorType: LLMErrorType; message: string; recoverable: boolean }
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
}

/**
 * LLM Provider Manager
 *
 * Manages multiple LLM models with automatic failover and retry logic
 */
export class LLMProviderManager extends EventEmitter {
  private apiKey: string
  private models: Map<GroqModel, ModelState> = new Map()
  private currentModelIndex: number = 0
  private modelOrder: GroqModel[]
  private retryConfig: RetryConfig
  private temperature: number

  // Stats
  private totalInvocations: number = 0
  private totalRetries: number = 0
  private totalSwitches: number = 0
  private totalFailures: number = 0

  constructor(
    apiKey: string,
    options: {
      preferredModel?: string
      modelOrder?: GroqModel[]
      retryConfig?: Partial<RetryConfig>
      temperature?: number
    } = {}
  ) {
    super()
    this.apiKey = apiKey
    this.temperature = options.temperature ?? 0.3
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig }

    // Set up model order - preferred model first, then others
    if (options.modelOrder && options.modelOrder.length > 0) {
      this.modelOrder = options.modelOrder
    } else if (options.preferredModel && this.isValidModel(options.preferredModel)) {
      // Put preferred model first, then add others
      const preferred = options.preferredModel as GroqModel
      this.modelOrder = [preferred, ...GROQ_MODELS.filter((m) => m !== preferred)]
    } else {
      this.modelOrder = [...GROQ_MODELS]
    }

    // Initialize model states
    for (const model of this.modelOrder) {
      this.models.set(model, {
        model,
        instance: null,
        cooldownUntil: 0,
        consecutiveFailures: 0,
        lastError: null,
        lastUsed: 0
      })
    }

    // Find initial available model
    this.currentModelIndex = this.findNextAvailableModelIndex(0)
  }

  /**
   * Check if a model string is valid
   */
  private isValidModel(model: string): model is GroqModel {
    return GROQ_MODELS.includes(model as GroqModel)
  }

  /**
   * Get or create a ChatGroq instance for a model
   */
  private getModelInstance(model: GroqModel): ChatGroq {
    const state = this.models.get(model)!
    if (!state.instance) {
      state.instance = new ChatGroq({
        apiKey: this.apiKey,
        model: model,
        temperature: this.temperature
      })
    }
    return state.instance
  }

  /**
   * Get current active model
   */
  getCurrentModel(): GroqModel {
    return this.modelOrder[this.currentModelIndex]
  }

  /**
   * Get the ChatGroq instance for current model
   */
  getCurrentModelInstance(): ChatGroq {
    return this.getModelInstance(this.getCurrentModel())
  }

  /**
   * Classify error type from an error object
   */
  classifyError(error: unknown): { type: LLMErrorType; retryAfterMs?: number } {
    const err = error as {
      status?: number
      message?: string
      error?: { error?: { code?: string; type?: string; message?: string } }
      headers?: { 'retry-after'?: string }
    }

    const status = err.status
    const message = err.message || ''
    const errorCode = err.error?.error?.code || ''
    const errorType = err.error?.error?.type || ''

    // Rate limit (429)
    if (status === 429 || errorCode === 'rate_limit_exceeded' || errorType === 'tokens') {
      let retryAfterMs = 3000 // Default 3 seconds
      if (err.headers?.['retry-after']) {
        retryAfterMs = parseInt(err.headers['retry-after'], 10) * 1000
      }
      // Also check error message for retry time
      const retryMatch = message.match(/try again in (\d+(?:\.\d+)?)/i)
      if (retryMatch) {
        retryAfterMs = Math.ceil(parseFloat(retryMatch[1]) * 1000)
      }
      return { type: 'rate_limit', retryAfterMs }
    }

    // Auth errors (401, 403)
    if (status === 401 || status === 403) {
      return { type: 'auth_error' }
    }

    // Bad request (400)
    if (status === 400) {
      // Check if it's context length
      if (
        message.toLowerCase().includes('context') ||
        message.toLowerCase().includes('token') ||
        message.toLowerCase().includes('length')
      ) {
        return { type: 'context_length' }
      }
      return { type: 'bad_request' }
    }

    // Server errors (5xx)
    if (status && status >= 500 && status < 600) {
      return { type: 'server_error' }
    }

    // Timeout
    if (
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('timed out') ||
      message.toLowerCase().includes('econnreset')
    ) {
      return { type: 'timeout' }
    }

    return { type: 'unknown' }
  }

  /**
   * Check if an error type is recoverable via retry/failover
   */
  isRecoverable(errorType: LLMErrorType): boolean {
    return ['rate_limit', 'timeout', 'server_error', 'unknown'].includes(errorType)
  }

  /**
   * Find the next available model index (not in cooldown)
   */
  private findNextAvailableModelIndex(startFrom: number = 0): number {
    const now = Date.now()
    const totalModels = this.modelOrder.length

    // First pass: find a model not in cooldown
    for (let i = 0; i < totalModels; i++) {
      const index = (startFrom + i) % totalModels
      const model = this.modelOrder[index]
      const state = this.models.get(model)!
      if (now >= state.cooldownUntil) {
        return index
      }
    }

    // All models in cooldown - find the one with shortest remaining cooldown
    let shortestWait = Infinity
    let bestIndex = startFrom

    for (let i = 0; i < totalModels; i++) {
      const index = (startFrom + i) % totalModels
      const model = this.modelOrder[index]
      const state = this.models.get(model)!
      const waitTime = state.cooldownUntil - now
      if (waitTime < shortestWait) {
        shortestWait = waitTime
        bestIndex = index
      }
    }

    return bestIndex
  }

  /**
   * Put a model in cooldown
   */
  private setModelCooldown(model: GroqModel, durationMs: number, reason: string): void {
    const state = this.models.get(model)!
    state.cooldownUntil = Date.now() + durationMs
    state.consecutiveFailures++

    this.emit('model:cooldown', {
      model,
      until: state.cooldownUntil,
      reason
    })
  }

  /**
   * Switch to the next available model
   */
  private switchToNextModel(reason: string): GroqModel {
    const fromModel = this.getCurrentModel()
    const nextIndex = this.findNextAvailableModelIndex(this.currentModelIndex + 1)

    if (nextIndex !== this.currentModelIndex) {
      this.currentModelIndex = nextIndex
      const toModel = this.getCurrentModel()
      this.totalSwitches++

      this.emit('model:switch', {
        from: fromModel,
        to: toModel,
        reason
      })

      return toModel
    }

    return fromModel
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseOverride?: number): number {
    const base = baseOverride ?? this.retryConfig.baseDelayMs
    const delay = base * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1)
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs)
  }

  /**
   * Sleep for a specified duration
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Wait until the current model is out of cooldown
   */
  private async waitForModelAvailability(): Promise<void> {
    const model = this.getCurrentModel()
    const state = this.models.get(model)!
    const now = Date.now()

    if (state.cooldownUntil > now) {
      const waitTime = state.cooldownUntil - now
      console.log(`[LLMProvider] Waiting ${waitTime}ms for model ${model} cooldown to end...`)
      await this.sleep(waitTime)
    }
  }

  /**
   * Main invocation method with retry and failover
   */
  async invoke(
    messages: Array<{ role: string; content: string }>,
    options: {
      handoffSnapshot?: HandoffSnapshot
      onRetry?: (attempt: number, model: GroqModel) => void
      onSwitch?: (from: GroqModel, to: GroqModel) => void
    } = {}
  ): Promise<LLMInvocationResult> {
    this.totalInvocations++

    let retryCount = 0
    let switchCount = 0
    let lastError: Error | null = null
    let lastErrorType: LLMErrorType = 'unknown'

    // Track models we've tried in this invocation to prevent infinite loops
    const triedModels = new Set<GroqModel>()
    const maxTotalAttempts = this.modelOrder.length * this.retryConfig.maxRetries

    for (let totalAttempts = 0; totalAttempts < maxTotalAttempts; totalAttempts++) {
      const currentModel = this.getCurrentModel()

      // Check if we've cycled through all models
      if (triedModels.size === this.modelOrder.length) {
        // All models tried - wait for cooldown and reset
        await this.waitForModelAvailability()
        triedModels.clear()
      }

      triedModels.add(currentModel)
      const state = this.models.get(currentModel)!

      // Wait if model is in cooldown
      if (state.cooldownUntil > Date.now()) {
        const waitTime = state.cooldownUntil - Date.now()
        if (waitTime > 0 && waitTime < 60000) {
          // Wait up to 60s
          console.log(`[LLMProvider] Model ${currentModel} in cooldown, waiting ${waitTime}ms...`)
          await this.sleep(waitTime)
        } else if (waitTime >= 60000) {
          // Too long, try another model
          this.switchToNextModel('cooldown too long')
          switchCount++
          options.onSwitch?.(currentModel, this.getCurrentModel())
          continue
        }
      }

      try {
        const llm = this.getModelInstance(currentModel)

        // Prepare messages - inject handoff context if switching models
        let finalMessages = messages
        if (options.handoffSnapshot && switchCount > 0) {
          finalMessages = this.injectHandoffContext(messages, options.handoffSnapshot)
        }

        const response = await llm.invoke(
          finalMessages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content
          }))
        )

        // Success - reset consecutive failures
        state.consecutiveFailures = 0
        state.lastUsed = Date.now()
        state.lastError = null

        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        return {
          success: true,
          content,
          model: currentModel,
          retryCount,
          switchCount
        }
      } catch (error) {
        lastError = error as Error
        const { type: errorType, retryAfterMs } = this.classifyError(error)
        lastErrorType = errorType

        state.lastError = lastError.message

        this.emit('error:classified', {
          errorType,
          message: lastError.message,
          recoverable: this.isRecoverable(errorType)
        })

        console.error(`[LLMProvider] Error with model ${currentModel}:`, lastError.message)
        console.log(`[LLMProvider] Error type: ${errorType}`)

        // Handle based on error type
        if (!this.isRecoverable(errorType)) {
          // Non-recoverable errors - report and fail
          this.totalFailures++
          return {
            success: false,
            content: '',
            model: currentModel,
            retryCount,
            switchCount,
            error: lastError.message,
            errorType
          }
        }

        // For rate limits, respect retry-after
        if (errorType === 'rate_limit') {
          const cooldownMs = retryAfterMs || 5000

          // Should we retry same model or switch?
          if (retryCount < this.retryConfig.maxRetries && cooldownMs < 10000) {
            // Short cooldown - retry same model
            retryCount++
            this.totalRetries++
            const delay = Math.max(cooldownMs, this.calculateRetryDelay(retryCount))

            this.emit('retry:attempt', {
              model: currentModel,
              attempt: retryCount,
              maxRetries: this.retryConfig.maxRetries,
              delayMs: delay
            })

            options.onRetry?.(retryCount, currentModel)
            console.log(
              `[LLMProvider] Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${this.retryConfig.maxRetries})`
            )

            await this.sleep(delay)
            continue
          } else {
            // Long cooldown or max retries - put in cooldown and switch
            this.setModelCooldown(currentModel, cooldownMs, 'rate_limit')
            const previousModel = currentModel
            this.switchToNextModel('rate limit exceeded')
            switchCount++
            options.onSwitch?.(previousModel, this.getCurrentModel())
            retryCount = 0 // Reset retry count for new model
            continue
          }
        }

        // For other recoverable errors (timeout, server error, unknown)
        if (retryCount < this.retryConfig.maxRetries) {
          retryCount++
          this.totalRetries++
          const delay = this.calculateRetryDelay(retryCount)

          this.emit('retry:attempt', {
            model: currentModel,
            attempt: retryCount,
            maxRetries: this.retryConfig.maxRetries,
            delayMs: delay
          })

          options.onRetry?.(retryCount, currentModel)
          console.log(
            `[LLMProvider] ${errorType} error, retrying in ${delay}ms (attempt ${retryCount}/${this.retryConfig.maxRetries})`
          )

          await this.sleep(delay)
          continue
        }

        // Max retries reached - switch model
        this.setModelCooldown(currentModel, 30000, `max retries: ${errorType}`)
        const previousModel = currentModel
        this.switchToNextModel(`max retries reached: ${errorType}`)
        switchCount++
        options.onSwitch?.(previousModel, this.getCurrentModel())
        retryCount = 0
      }
    }

    // All attempts exhausted
    this.totalFailures++
    return {
      success: false,
      content: '',
      model: this.getCurrentModel(),
      retryCount,
      switchCount,
      error: lastError?.message || 'All models exhausted',
      errorType: lastErrorType
    }
  }

  /**
   * Inject handoff context into messages when switching models
   */
  private injectHandoffContext(
    messages: Array<{ role: string; content: string }>,
    snapshot: HandoffSnapshot
  ): Array<{ role: string; content: string }> {
    const handoffMessage = `
[CONTEXT HANDOFF - Previous model hit rate limit, continuing with new model]

Current Objective: ${snapshot.currentObjective}

Progress So Far:
${snapshot.progressSummary}

Key Facts:
${snapshot.keyFacts.map((f) => `- ${f}`).join('\n')}

Open Tasks:
${snapshot.openTasks.map((t) => `- ${t}`).join('\n')}

Last Successful Step: ${snapshot.lastSuccessfulStep}
Last Attempted Action: ${snapshot.lastAttemptedAction}

Recent Tool Results:
${snapshot.recentToolResults.map((r) => `[${r.tool}]: ${r.result}`).join('\n')}

[END CONTEXT HANDOFF - Continue from where the previous model left off]
`

    // Find the system message and inject context after it
    const systemIndex = messages.findIndex((m) => m.role === 'system')
    if (systemIndex >= 0) {
      const result = [...messages]
      result.splice(systemIndex + 1, 0, {
        role: 'user',
        content: handoffMessage
      })
      return result
    }

    // No system message - prepend
    return [{ role: 'user', content: handoffMessage }, ...messages]
  }

  /**
   * Create a handoff snapshot from current agent state
   */
  createHandoffSnapshot(params: {
    objective: string
    progress: string
    facts: string[]
    tasks: string[]
    lastSuccess: string
    lastAttempt: string
    recentResults: Array<{ tool: string; result: string }>
  }): HandoffSnapshot {
    return {
      currentObjective: params.objective,
      progressSummary: params.progress,
      keyFacts: params.facts.slice(-10), // Keep last 10 facts
      openTasks: params.tasks.slice(0, 5), // Keep top 5 tasks
      lastSuccessfulStep: params.lastSuccess,
      lastAttemptedAction: params.lastAttempt,
      recentToolResults: params.recentResults.slice(-5) // Keep last 5 results
    }
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    totalInvocations: number
    totalRetries: number
    totalSwitches: number
    totalFailures: number
    currentModel: GroqModel
    modelStates: Array<{
      model: GroqModel
      inCooldown: boolean
      cooldownRemaining: number
      consecutiveFailures: number
      lastError: string | null
    }>
  } {
    const now = Date.now()
    const modelStates = this.modelOrder.map((model) => {
      const state = this.models.get(model)!
      return {
        model,
        inCooldown: state.cooldownUntil > now,
        cooldownRemaining: Math.max(0, state.cooldownUntil - now),
        consecutiveFailures: state.consecutiveFailures,
        lastError: state.lastError
      }
    })

    return {
      totalInvocations: this.totalInvocations,
      totalRetries: this.totalRetries,
      totalSwitches: this.totalSwitches,
      totalFailures: this.totalFailures,
      currentModel: this.getCurrentModel(),
      modelStates
    }
  }

  /**
   * Reset all model states (useful for new sessions)
   */
  reset(): void {
    for (const state of this.models.values()) {
      state.cooldownUntil = 0
      state.consecutiveFailures = 0
      state.lastError = null
    }
    this.currentModelIndex = 0
    this.totalInvocations = 0
    this.totalRetries = 0
    this.totalSwitches = 0
    this.totalFailures = 0
  }

  /**
   * Force switch to a specific model (if available)
   */
  forceModel(model: string): boolean {
    if (!this.isValidModel(model)) return false

    const index = this.modelOrder.indexOf(model as GroqModel)
    if (index >= 0) {
      this.currentModelIndex = index
      return true
    }
    return false
  }
}

// Singleton instance for shared usage
let providerInstance: LLMProviderManager | null = null

/**
 * Get or create the LLM provider manager singleton
 */
export function getLLMProvider(
  apiKey: string,
  options?: {
    preferredModel?: string
    modelOrder?: GroqModel[]
    temperature?: number
  }
): LLMProviderManager {
  if (!providerInstance || options) {
    providerInstance = new LLMProviderManager(apiKey, options)
  }
  return providerInstance
}

/**
 * Reset the provider singleton (useful for testing or reconfiguration)
 */
export function resetLLMProvider(): void {
  providerInstance?.reset()
  providerInstance = null
}
