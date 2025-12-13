const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]
const RETRYABLE_ERROR_PATTERNS = [
  /rate limit/i,
  /quota/i,
  /too many requests/i,
  /overloaded/i,
  /temporarily unavailable/i,
  /timeout/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /network/i,
  /service unavailable/i
]

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
}

export function isRetryableError(error: unknown): boolean {
  if (!error) return false

  const errorObj = error as Record<string, unknown>

  if (typeof errorObj.status === 'number') {
    if (RETRYABLE_STATUS_CODES.includes(errorObj.status)) {
      return true
    }
  }

  if (typeof errorObj.statusCode === 'number') {
    if (RETRYABLE_STATUS_CODES.includes(errorObj.statusCode)) {
      return true
    }
  }

  const message = error instanceof Error ? error.message : String(error)

  for (const pattern of RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return true
    }
  }

  return false
}

export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * config.baseDelayMs
  const delay = exponentialDelay + jitter

  return Math.min(delay, config.maxDelayMs)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred'
}
