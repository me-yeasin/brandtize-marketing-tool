/**
 * Key Rotation Manager
 *
 * A reusable module for managing API key rotation across multiple services.
 * This can be used for any service that requires rotating through multiple API keys
 * when rate limits are hit or keys are exhausted.
 *
 * Usage:
 * ```typescript
 * import { executeWithKeyRotation, registerService, resetKeyRotation } from './key-rotation-manager'
 *
 * // Register a service with its keys
 * registerService('myService', [
 *   { key: 'api_key_1' },
 *   { key: 'api_key_2' }
 * ])
 *
 * // Execute a function with automatic key rotation
 * const result = await executeWithKeyRotation({
 *   serviceName: 'myService',
 *   operation: async (key) => {
 *     const response = await fetch(`https://api.example.com?key=${key}`)
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`)
 *     return response.json()
 *   },
 *   isRateLimitError: (error) => error.message.includes('429'),
 *   onKeySwitch: (index, total) => console.log(`Switched to key ${index}/${total}`)
 * })
 * ```
 */

// Key entry interface
export interface KeyEntry {
  key: string
  userId?: string // Optional for services like Snov.io that need client ID + secret
  metadata?: Record<string, unknown> // Optional metadata
}

// Key Rotation State per service
interface KeyRotationState {
  currentIndex: number
  exhaustedKeys: Set<number>
  lastError: string
  keys: KeyEntry[]
}

// Global rotation state for all services
const keyRotationState: Map<string, KeyRotationState> = new Map()

/**
 * Register a service with its API keys.
 * Call this before using executeWithKeyRotation for a service.
 */
export function registerService(serviceName: string, keys: KeyEntry[]): void {
  keyRotationState.set(serviceName, {
    currentIndex: 0,
    exhaustedKeys: new Set(),
    lastError: '',
    keys: [...keys]
  })
}

/**
 * Update keys for an already registered service.
 * Preserves rotation state if possible.
 */
export function updateServiceKeys(serviceName: string, keys: KeyEntry[]): void {
  const existingState = keyRotationState.get(serviceName)
  if (existingState) {
    existingState.keys = [...keys]
    // Reset index if it's out of bounds
    if (existingState.currentIndex >= keys.length) {
      existingState.currentIndex = 0
    }
  } else {
    registerService(serviceName, keys)
  }
}

/**
 * Check if a service is registered.
 */
export function isServiceRegistered(serviceName: string): boolean {
  return keyRotationState.has(serviceName)
}

/**
 * Get the number of keys for a service.
 */
export function getServiceKeyCount(serviceName: string): number {
  const state = keyRotationState.get(serviceName)
  return state?.keys.length || 0
}

/**
 * Reset rotation state for a specific service.
 */
export function resetServiceRotation(serviceName: string): void {
  const state = keyRotationState.get(serviceName)
  if (state) {
    state.currentIndex = 0
    state.exhaustedKeys.clear()
    state.lastError = ''
  }
}

/**
 * Reset rotation state for all services.
 */
export function resetAllKeyRotation(): void {
  keyRotationState.forEach((state) => {
    state.currentIndex = 0
    state.exhaustedKeys.clear()
    state.lastError = ''
  })
}

/**
 * Get the next available key for a service.
 * Returns null if all keys are exhausted.
 */
export function getNextKey(serviceName: string): {
  key: KeyEntry | null
  index: number
  allExhausted: boolean
} {
  const state = keyRotationState.get(serviceName)
  if (!state || state.keys.length === 0) {
    return { key: null, index: -1, allExhausted: true }
  }

  // Find next available key
  for (let i = 0; i < state.keys.length; i++) {
    const index = (state.currentIndex + i) % state.keys.length
    if (!state.exhaustedKeys.has(index)) {
      return { key: state.keys[index], index, allExhausted: false }
    }
  }

  // All keys exhausted - reset and try first key (maybe it's reset)
  state.exhaustedKeys.clear()
  return { key: state.keys[0], index: 0, allExhausted: true }
}

/**
 * Mark a key as exhausted (rate limited).
 */
export function markKeyExhausted(serviceName: string, index: number, error: string): void {
  const state = keyRotationState.get(serviceName)
  if (state) {
    state.exhaustedKeys.add(index)
    state.lastError = error
    state.currentIndex = (index + 1) % Math.max(state.keys.length, 1) // Move to next
  }
}

/**
 * Get the last error for a service.
 */
export function getLastError(serviceName: string): string {
  const state = keyRotationState.get(serviceName)
  return state?.lastError || ''
}

/**
 * Check if all keys for a service are exhausted.
 */
export function areAllKeysExhausted(serviceName: string): boolean {
  const state = keyRotationState.get(serviceName)
  if (!state) return true
  return state.exhaustedKeys.size >= state.keys.length
}

/**
 * Get the count of exhausted keys for a service.
 */
export function getExhaustedKeyCount(serviceName: string): number {
  const state = keyRotationState.get(serviceName)
  return state?.exhaustedKeys.size || 0
}

/**
 * Clear exhausted state and reset current index for a service.
 */
export function clearExhaustedState(serviceName: string): void {
  const state = keyRotationState.get(serviceName)
  if (state) {
    state.exhaustedKeys.clear()
    state.currentIndex = 0
  }
}

// Rate limit detection helper
export function isRateLimitResponse(response: Response, data?: unknown): boolean {
  if (response.status === 429) return true
  if (response.status === 402) return true // Payment required / quota exceeded
  if (response.status === 401) return true // Unauthorized (invalid/expired key)

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (d.error === 'rate_limit' || d.error === 'quota_exceeded') return true
    if (typeof d.message === 'string' && d.message.toLowerCase().includes('rate limit')) return true
  }
  return false
}

// Generic error type for rotation operations
export interface RotationError extends Error {
  isRateLimit: boolean
  keyIndex: number
  serviceName: string
}

// Callback interface for rotation events
export interface KeyRotationCallbacks {
  onKeySwitch?: (keyIndex: number, totalKeys: number, serviceName: string) => void
  onAllKeysExhausted?: (serviceName: string) => void
  onKeyReset?: (serviceName: string) => void
  onError?: (error: Error, keyIndex: number, serviceName: string) => void
}

// Options for executeWithKeyRotation
export interface ExecuteWithKeyRotationOptions<T> {
  serviceName: string
  operation: (key: KeyEntry, index: number) => Promise<T>
  isRateLimitError?: (error: unknown) => boolean
  callbacks?: KeyRotationCallbacks
  checkFirstKeyReset?: boolean
  maxRetries?: number
}

/**
 * Execute an operation with automatic key rotation.
 *
 * This function will:
 * 1. Get the next available key for the service
 * 2. Execute the operation with that key
 * 3. If rate limited, mark the key as exhausted and try the next key
 * 4. If all keys are exhausted, optionally check if the first key has reset
 * 5. Return the result or throw a final error
 */
export async function executeWithKeyRotation<T>(
  options: ExecuteWithKeyRotationOptions<T>
): Promise<T> {
  const {
    serviceName,
    operation,
    isRateLimitError = (error: unknown) => {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        return msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')
      }
      return false
    },
    callbacks,
    checkFirstKeyReset = true,
    maxRetries = 1
  } = options

  const state = keyRotationState.get(serviceName)
  if (!state || state.keys.length === 0) {
    throw new Error(`Service "${serviceName}" not registered or has no keys`)
  }

  const totalKeys = state.keys.length

  // Try each key with rotation
  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const { key: keyEntry, index, allExhausted } = getNextKey(serviceName)

    if (!keyEntry) break

    // Try with retries for each key
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(
          `[${serviceName}] Key ${index + 1}/${totalKeys} - Attempt ${retry + 1}/${maxRetries}`
        )
        const result = await operation(keyEntry, index)
        return result
      } catch (error) {
        const isRateLimit = isRateLimitError(error)

        if (isRateLimit) {
          console.log(`[${serviceName}] Key ${index + 1}/${totalKeys} rate limited`)
          markKeyExhausted(
            serviceName,
            index,
            error instanceof Error ? error.message : 'Rate limited'
          )
          callbacks?.onError?.(
            error instanceof Error ? error : new Error(String(error)),
            index,
            serviceName
          )
          break // Exit retry loop, move to next key
        }

        // Non-rate-limit error on last retry
        if (retry === maxRetries - 1) {
          callbacks?.onError?.(
            error instanceof Error ? error : new Error(String(error)),
            index,
            serviceName
          )
          throw error
        }

        // Wait before retry
        await sleep(500 * (retry + 1))
      }
    }

    // Notify about key switch if we're moving to next key
    if (attempt < totalKeys - 1) {
      const nextKey = getNextKey(serviceName)
      if (nextKey.key) {
        callbacks?.onKeySwitch?.(nextKey.index + 1, totalKeys, serviceName)
        console.log(`[${serviceName}] Switching to key ${nextKey.index + 1}/${totalKeys}`)
      }
    }

    // If all keys exhausted after this attempt
    if (allExhausted || areAllKeysExhausted(serviceName)) {
      callbacks?.onAllKeysExhausted?.(serviceName)

      // Check if first key has reset
      if (checkFirstKeyReset && state.keys.length > 0) {
        console.log(`[${serviceName}] All keys exhausted, checking if first key has reset...`)

        try {
          const result = await operation(state.keys[0], 0)
          // First key works again!
          console.log(`[${serviceName}] First key has reset! Continuing...`)
          resetServiceRotation(serviceName)
          callbacks?.onKeyReset?.(serviceName)
          return result
        } catch (firstKeyError) {
          if (isRateLimitError(firstKeyError)) {
            // First key still rate limited - all truly exhausted
            console.log(`[${serviceName}] First key still rate limited - ALL KEYS EXHAUSTED`)
            throw new Error(
              `All ${serviceName} API keys have hit rate limits. Please wait until they reset or add new API keys.`
            )
          }
          // Non-rate-limit error
          throw firstKeyError
        }
      }
    }
  }

  throw new Error(`All ${serviceName} API keys exhausted`)
}

/**
 * Execute an operation with key rotation, returning a result object instead of throwing.
 * Useful for operations where you want to handle exhaustion gracefully.
 */
export async function executeWithKeyRotationSafe<T>(
  options: ExecuteWithKeyRotationOptions<T>
): Promise<{
  success: boolean
  result?: T
  error?: string
  allKeysExhausted: boolean
  keyIndex: number
}> {
  try {
    const result = await executeWithKeyRotation(options)
    const state = keyRotationState.get(options.serviceName)
    return {
      success: true,
      result,
      allKeysExhausted: false,
      keyIndex: state?.currentIndex || 0
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const state = keyRotationState.get(options.serviceName)
    return {
      success: false,
      error: errorMsg,
      allKeysExhausted: areAllKeysExhausted(options.serviceName),
      keyIndex: state?.currentIndex || 0
    }
  }
}

// Utility sleep function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Export common service names as constants for type safety
export const SERVICE_NAMES = {
  SERPER: 'serper',
  JINA: 'jina',
  HUNTER: 'hunter',
  SNOV: 'snov',
  REOON: 'reoon'
} as const

export type ServiceName = (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES]
