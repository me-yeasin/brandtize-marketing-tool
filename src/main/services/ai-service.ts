import { ChatGroq } from '@langchain/groq'
import { HumanMessage, AIMessage, type BaseMessage } from '@langchain/core/messages'

import { getApiKeys, getSelectedModel } from '../store'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: string) => void
}

function createGroqClient(): ChatGroq | null {
  const { groqApiKey } = getApiKeys()

  if (!groqApiKey) {
    return null
  }

  const model = getSelectedModel()

  return new ChatGroq({
    apiKey: groqApiKey,
    model,
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

export async function streamChatResponse(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const client = createGroqClient()

  if (!client) {
    callbacks.onError('Groq API key not configured. Please set it in Settings.')
    return
  }

  try {
    const langChainMessages = convertToLangChainMessages(messages)
    let fullText = ''

    const stream = await client.stream(langChainMessages)

    for await (const chunk of stream) {
      const token = chunk.content as string

      if (token) {
        fullText += token
        callbacks.onToken(token)
      }
    }

    callbacks.onComplete(fullText)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    callbacks.onError(errorMessage)
  }
}
