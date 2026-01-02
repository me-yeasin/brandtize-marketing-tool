import { ChatGroq } from '@langchain/groq'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatVertexAI } from '@langchain/google-vertexai'
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'

import {
  getApiKeys,
  getSelectedModel,
  getSelectedAiProvider,
  getSelectedGoogleMode,
  getGoogleProjectId,
  getGoogleLocation
} from '../store'
import {
  GROQ_MODELS,
  MISTRAL_MODELS,
  GOOGLE_MODELS,
  findModelIndex,
  findMistralModelIndex,
  findGoogleModelIndex,
  getNextModelIndex,
  getNextMistralModelIndex,
  getNextGoogleModelIndex
} from './models'
import {
  isRetryableError,
  calculateBackoffDelay,
  sleep,
  formatErrorForUser,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig
} from './retry-utils'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: string) => void
  onModelSwitch?: (fromModel: string, toModel: string) => void
  onRetry?: (model: string, attempt: number, maxAttempts: number) => void
}

interface StreamState {
  partialText: string
  hasStartedStreaming: boolean
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message === 'Aborted'
  }
  return false
}

function createGroqClientWithModel(modelId: string): ChatGroq | null {
  const { groqApiKey } = getApiKeys()

  if (!groqApiKey) {
    return null
  }

  return new ChatGroq({
    apiKey: groqApiKey,
    model: modelId,
    temperature: 0.7,
    streaming: true
  })
}

function createMistralClientWithModel(modelId: string): ChatMistralAI | null {
  const { mistralApiKey } = getApiKeys()

  if (!mistralApiKey) {
    return null
  }

  return new ChatMistralAI({
    apiKey: mistralApiKey,
    model: modelId,
    temperature: 0.7,
    streaming: true
  })
}

type GoogleChatModel = ChatGoogleGenerativeAI | ChatVertexAI

function createGoogleClientWithModel(modelId: string): GoogleChatModel | null {
  const { googleApiKey } = getApiKeys()

  if (!googleApiKey) {
    return null
  }

  const googleMode = getSelectedGoogleMode()

  if (googleMode === 'vertexApiKey') {
    const projectId = getGoogleProjectId()
    const location = getGoogleLocation()
    return new ChatVertexAI({
      model: modelId,
      temperature: 0.7,
      streaming: true,
      authOptions: { apiKey: googleApiKey },
      ...(projectId && { projectId }),
      ...(location && { location })
    })
  }

  return new ChatGoogleGenerativeAI({
    apiKey: googleApiKey,
    model: modelId,
    temperature: 0.7,
    streaming: true
  })
}

function convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.text)
    }
    return new AIMessage(msg.text)
  })
}

function createContinuationMessages(
  originalMessages: ChatMessage[],
  partialResponse: string
): BaseMessage[] {
  const baseMessages = convertToLangChainMessages(originalMessages)

  if (partialResponse.trim()) {
    baseMessages.push(new AIMessage(partialResponse))
    baseMessages.push(
      new SystemMessage(
        'Continue from exactly where the previous response stopped. Do not repeat any text that was already generated. Continue seamlessly.'
      )
    )
  }

  return baseMessages
}

async function attemptStreamWithGroqModel(
  modelId: string,
  langChainMessages: BaseMessage[],
  callbacks: StreamCallbacks,
  state: StreamState,
  signal?: AbortSignal
): Promise<{ success: boolean; error?: unknown }> {
  const client = createGroqClientWithModel(modelId)

  if (!client) {
    return { success: false, error: new Error('Groq API key not configured') }
  }

  try {
    const stream = await client.stream(langChainMessages)

    for await (const chunk of stream) {
      if (signal?.aborted) {
        const err = new Error('Aborted')
        ;(err as { name?: string }).name = 'AbortError'
        throw err
      }
      const token = chunk.content as string

      if (token) {
        state.partialText += token
        state.hasStartedStreaming = true
        callbacks.onToken(token)
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

async function attemptStreamWithMistralModel(
  modelId: string,
  langChainMessages: BaseMessage[],
  callbacks: StreamCallbacks,
  state: StreamState,
  signal?: AbortSignal
): Promise<{ success: boolean; error?: unknown }> {
  const client = createMistralClientWithModel(modelId)

  if (!client) {
    return { success: false, error: new Error('Mistral API key not configured') }
  }

  try {
    const stream = await client.stream(langChainMessages)

    for await (const chunk of stream) {
      if (signal?.aborted) {
        const err = new Error('Aborted')
        ;(err as { name?: string }).name = 'AbortError'
        throw err
      }
      const token = chunk.content as string

      if (token) {
        state.partialText += token
        state.hasStartedStreaming = true
        callbacks.onToken(token)
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

async function attemptStreamWithGoogleModel(
  modelId: string,
  langChainMessages: BaseMessage[],
  callbacks: StreamCallbacks,
  state: StreamState,
  signal?: AbortSignal
): Promise<{ success: boolean; error?: unknown }> {
  const client = createGoogleClientWithModel(modelId)

  if (!client) {
    return { success: false, error: new Error('Google API key not configured') }
  }

  try {
    const stream = await client.stream(langChainMessages)

    for await (const chunk of stream) {
      if (signal?.aborted) {
        const err = new Error('Aborted')
        ;(err as { name?: string }).name = 'AbortError'
        throw err
      }
      const token = chunk.content as string

      if (token) {
        state.partialText += token
        state.hasStartedStreaming = true
        callbacks.onToken(token)
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export async function streamChatResponse(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  signal?: AbortSignal
): Promise<void> {
  const provider = getSelectedAiProvider()
  const { groqApiKey, mistralApiKey, googleApiKey } = getApiKeys()

  if (provider === 'groq' && !groqApiKey) {
    callbacks.onError('Groq API key not configured. Please set it in Settings.')
    return
  }

  if (provider === 'mistral' && !mistralApiKey) {
    callbacks.onError('Mistral API key not configured. Please set it in Settings.')
    return
  }

  if (provider === 'google' && !googleApiKey) {
    callbacks.onError('Google API key not configured. Please set it in Settings.')
    return
  }

  const selectedModel = getSelectedModel()

  let models = GROQ_MODELS
  let findIndex = findModelIndex
  let getNextIndex = getNextModelIndex
  let attemptStream = attemptStreamWithGroqModel

  if (provider === 'mistral') {
    models = MISTRAL_MODELS
    findIndex = findMistralModelIndex
    getNextIndex = getNextMistralModelIndex
    attemptStream = attemptStreamWithMistralModel
  } else if (provider === 'google') {
    models = GOOGLE_MODELS
    findIndex = findGoogleModelIndex
    getNextIndex = getNextGoogleModelIndex
    attemptStream = attemptStreamWithGoogleModel
  }

  let currentModelIndex = findIndex(selectedModel)
  const startingModelIndex = currentModelIndex

  const state: StreamState = {
    partialText: '',
    hasStartedStreaming: false
  }

  let langChainMessages = convertToLangChainMessages(messages)
  let totalModelSwitches = 0

  while (true) {
    if (signal?.aborted) {
      callbacks.onError('Aborted')
      return
    }
    const currentModel = models[currentModelIndex].id

    for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
      if (signal?.aborted) {
        callbacks.onError('Aborted')
        return
      }
      if (attempt > 0) {
        callbacks.onRetry?.(currentModel, attempt + 1, retryConfig.maxRetries)
        const delay = calculateBackoffDelay(attempt, retryConfig)
        await sleep(delay, signal)
      }

      const result = await attemptStream(currentModel, langChainMessages, callbacks, state, signal)

      if (result.success) {
        callbacks.onComplete(state.partialText)
        return
      }

      const error = result.error
      if (isAbortError(error)) {
        callbacks.onError('Aborted')
        return
      }

      if (!isRetryableError(error)) {
        callbacks.onError(formatErrorForUser(error))
        return
      }

      console.log(
        `[AI Service] Retryable error on model ${currentModel}, attempt ${attempt + 1}/${retryConfig.maxRetries}:`,
        error
      )
    }

    const previousModel = currentModel
    currentModelIndex = getNextIndex(currentModelIndex)
    const nextModel = models[currentModelIndex].id
    totalModelSwitches++

    console.log(
      `[AI Service] Switching model from ${previousModel} to ${nextModel} (switch #${totalModelSwitches})`
    )

    callbacks.onModelSwitch?.(previousModel, nextModel)

    if (state.hasStartedStreaming && state.partialText.trim()) {
      langChainMessages = createContinuationMessages(messages, state.partialText)
      console.log(
        `[AI Service] Continuing from partial response (${state.partialText.length} chars)`
      )
    }

    if (currentModelIndex === startingModelIndex && totalModelSwitches >= models.length) {
      console.log('[AI Service] Completed full cycle through all models, starting new cycle...')
    }
  }
}
