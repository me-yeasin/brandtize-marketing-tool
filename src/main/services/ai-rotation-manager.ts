import { ChatGroq } from '@langchain/groq'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatVertexAI } from '@langchain/google-vertexai'
import { HumanMessage } from '@langchain/core/messages'

import {
  getApiKeys,
  getSelectedAiProvider,
  getSelectedGoogleMode,
  getGoogleProjectId,
  getGoogleLocation,
  getGroqApiKeys,
  getMistralApiKeys,
  getGoogleApiKeys,
  type ApiKeyEntry,
  type AiProvider
} from '../store'

import { GROQ_MODELS, MISTRAL_MODELS, GOOGLE_MODELS } from './models'

// Rotation state for AI providers
interface AiRotationState {
  currentKeyIndex: number
  currentModelIndex: number
  startingKeyIndex: number
  startingModelIndex: number
  totalKeyCycles: number
}

const aiRotationState: Record<AiProvider, AiRotationState> = {
  groq: {
    currentKeyIndex: 0,
    currentModelIndex: 0,
    startingKeyIndex: 0,
    startingModelIndex: 0,
    totalKeyCycles: 0
  },
  mistral: {
    currentKeyIndex: 0,
    currentModelIndex: 0,
    startingKeyIndex: 0,
    startingModelIndex: 0,
    totalKeyCycles: 0
  },
  google: {
    currentKeyIndex: 0,
    currentModelIndex: 0,
    startingKeyIndex: 0,
    startingModelIndex: 0,
    totalKeyCycles: 0
  }
}

// Reset rotation state for a new session
export function resetAiRotationState(): void {
  const providers: AiProvider[] = ['groq', 'mistral', 'google']
  providers.forEach((provider) => {
    aiRotationState[provider] = {
      currentKeyIndex: 0,
      currentModelIndex: 0,
      startingKeyIndex: 0,
      startingModelIndex: 0,
      totalKeyCycles: 0
    }
  })
}

// Get models list for a provider
function getModelsForProvider(provider: AiProvider): { id: string; name: string }[] {
  switch (provider) {
    case 'groq':
      return GROQ_MODELS
    case 'mistral':
      return MISTRAL_MODELS
    case 'google':
      return GOOGLE_MODELS
    default:
      return GROQ_MODELS
  }
}

// Get multi-keys for a provider
function getKeysForProvider(provider: AiProvider): ApiKeyEntry[] {
  switch (provider) {
    case 'groq':
      return getGroqApiKeys()
    case 'mistral':
      return getMistralApiKeys()
    case 'google':
      return getGoogleApiKeys()
    default:
      return []
  }
}

// Get single key for a provider (fallback)
function getSingleKeyForProvider(provider: AiProvider): string {
  const keys = getApiKeys()
  switch (provider) {
    case 'groq':
      return keys.groqApiKey
    case 'mistral':
      return keys.mistralApiKey
    case 'google':
      return keys.googleApiKey
    default:
      return ''
  }
}

// Get current API key (from multi-keys or single key)
function getCurrentApiKey(provider: AiProvider): string | null {
  const multiKeys = getKeysForProvider(provider)
  const state = aiRotationState[provider]

  if (multiKeys.length > 0 && state.currentKeyIndex < multiKeys.length) {
    return multiKeys[state.currentKeyIndex].key || null
  }

  // Fallback to single key
  const singleKey = getSingleKeyForProvider(provider)
  return singleKey || null
}

// Get current model
function getCurrentModel(provider: AiProvider, selectedModel: string): string {
  const models = getModelsForProvider(provider)
  const state = aiRotationState[provider]

  // Initialize starting model index based on selected model
  if (state.startingModelIndex === 0 && state.currentModelIndex === 0) {
    const selectedIndex = models.findIndex((m) => m.id === selectedModel)
    if (selectedIndex >= 0) {
      state.startingModelIndex = selectedIndex
      state.currentModelIndex = selectedIndex
    }
  }

  return models[state.currentModelIndex]?.id || selectedModel
}

// Move to next model (same key)
function moveToNextModel(provider: AiProvider): { switched: boolean; loopedBack: boolean } {
  const models = getModelsForProvider(provider)
  const state = aiRotationState[provider]

  const previousIndex = state.currentModelIndex
  state.currentModelIndex = (state.currentModelIndex + 1) % models.length

  // Check if we've looped back to starting model
  const loopedBack = state.currentModelIndex === state.startingModelIndex

  return { switched: previousIndex !== state.currentModelIndex, loopedBack }
}

// Move to next API key (reset model to first)
function moveToNextKey(provider: AiProvider): { switched: boolean; loopedBack: boolean } {
  const multiKeys = getKeysForProvider(provider)
  const state = aiRotationState[provider]

  if (multiKeys.length <= 1) {
    // No multi-keys or only one key, can't switch
    return { switched: false, loopedBack: true }
  }

  const previousKeyIndex = state.currentKeyIndex
  state.currentKeyIndex = (state.currentKeyIndex + 1) % multiKeys.length

  // Reset model to starting model when switching keys
  state.currentModelIndex = state.startingModelIndex

  // Check if we've looped back to starting key
  const loopedBack = state.currentKeyIndex === state.startingKeyIndex
  if (loopedBack) {
    state.totalKeyCycles++
  }

  return { switched: previousKeyIndex !== state.currentKeyIndex, loopedBack }
}

// Callbacks for rotation events
export interface AiRotationCallbacks {
  onRetry?: (model: string, attempt: number, maxAttempts: number) => void
  onModelSwitch?: (fromModel: string, toModel: string) => void
  onKeySwitch?: (keyIndex: number, totalKeys: number) => void
  onFullCycleComplete?: () => void
}

// Execute AI prompt with rotation logic
export async function executeWithAiRotation<T>(
  prompt: string,
  parseResponse: (response: string) => T,
  defaultValue: T,
  callbacks?: AiRotationCallbacks,
  maxRetries: number = 2
): Promise<T> {
  const provider = getSelectedAiProvider()
  const models = getModelsForProvider(provider)
  const multiKeys = getKeysForProvider(provider)
  const state = aiRotationState[provider]

  // Initialize starting positions
  let selectedModel = ''

  switch (provider) {
    case 'groq':
      selectedModel = models[0]?.id || 'llama-3.3-70b-versatile'
      break
    case 'mistral':
      selectedModel = models[0]?.id || 'mistral-large-2512'
      break
    case 'google':
      selectedModel = models[0]?.id || 'gemini-2.0-flash'
      break
  }

  // Store starting positions for cycle detection
  state.startingKeyIndex = state.currentKeyIndex
  state.startingModelIndex = state.currentModelIndex

  const totalKeys = multiKeys.length > 0 ? multiKeys.length : 1
  let totalAttempts = 0
  const maxTotalAttempts = totalKeys * models.length * maxRetries

  while (totalAttempts < maxTotalAttempts) {
    const currentApiKey = getCurrentApiKey(provider)
    const currentModel = getCurrentModel(provider, selectedModel)

    if (!currentApiKey) {
      console.log(`[AI Rotation] No API key configured for ${provider}`)
      return defaultValue
    }

    // Try with current model/key
    for (let retry = 0; retry < maxRetries; retry++) {
      totalAttempts++

      if (retry > 0) {
        callbacks?.onRetry?.(currentModel, retry + 1, maxRetries)
        await sleep(500 * (retry + 1)) // Simple backoff
      }

      try {
        const response = await invokeAi(provider, currentApiKey, currentModel, prompt)
        return parseResponse(response)
      } catch (error) {
        console.log(
          `[AI Rotation] Error with ${provider}/${currentModel} (attempt ${retry + 1}/${maxRetries}):`,
          error
        )

        if (retry === maxRetries - 1) {
          // All retries exhausted for this model, try next model
          const previousModel = currentModel
          const modelResult = moveToNextModel(provider)

          if (modelResult.loopedBack) {
            // All models exhausted for this key, check first model again
            const firstModelKey = getCurrentApiKey(provider)
            const firstModel = getCurrentModel(provider, selectedModel)

            try {
              console.log(`[AI Rotation] Checking if first model ${firstModel} has reset...`)
              const response = await invokeAi(provider, firstModelKey!, firstModel, prompt)
              return parseResponse(response)
            } catch {
              // First model still failing, switch to next key
              const keyResult = moveToNextKey(provider)

              if (keyResult.switched) {
                callbacks?.onKeySwitch?.(state.currentKeyIndex + 1, totalKeys)
                console.log(
                  `[AI Rotation] Switched to API key ${state.currentKeyIndex + 1}/${totalKeys}`
                )
              }

              if (keyResult.loopedBack) {
                callbacks?.onFullCycleComplete?.()
                console.log(`[AI Rotation] Full cycle complete, starting over...`)
              }
            }
          } else {
            const newModel = getCurrentModel(provider, selectedModel)
            callbacks?.onModelSwitch?.(previousModel, newModel)
            console.log(`[AI Rotation] Switched model: ${previousModel} -> ${newModel}`)
          }
        }
      }
    }
  }

  console.log(`[AI Rotation] All attempts exhausted for ${provider}`)
  return defaultValue
}

// Invoke AI with specific key and model
async function invokeAi(
  provider: AiProvider,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const googleMode = getSelectedGoogleMode()
  const projectId = getGoogleProjectId()
  const location = getGoogleLocation()

  let client: ChatGroq | ChatMistralAI | ChatGoogleGenerativeAI | ChatVertexAI

  switch (provider) {
    case 'groq':
      client = new ChatGroq({
        apiKey,
        model,
        temperature: 0
      })
      break
    case 'mistral':
      client = new ChatMistralAI({
        apiKey,
        model,
        temperature: 0
      })
      break
    case 'google':
      if (googleMode === 'vertexApiKey') {
        client = new ChatVertexAI({
          model,
          temperature: 0,
          authOptions: { apiKey },
          ...(projectId && { projectId }),
          ...(location && { location })
        })
      } else {
        client = new ChatGoogleGenerativeAI({
          apiKey,
          model,
          temperature: 0
        })
      }
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  const result = await client.invoke([new HumanMessage(prompt)])
  return result.content as string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Export types
export type { AiProvider }
