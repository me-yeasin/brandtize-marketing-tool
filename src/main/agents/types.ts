import type { BaseMessage } from '@langchain/core/messages'

export interface AgentState {
  messages: BaseMessage[]
}

export interface AgentConfig {
  name: string
  description: string
  version: string
}

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
