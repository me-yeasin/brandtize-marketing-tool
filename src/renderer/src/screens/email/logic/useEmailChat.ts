import { useCallback, useEffect, useRef, useState } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface ModelStatus {
  visible: boolean
  currentModel: string
  attempt: number
  maxAttempts: number
  isModelSwitch: boolean
  previousModel?: string
}

interface UseEmailChatResult {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  modelStatus: ModelStatus
  sendMessage: (text: string) => void
  clearError: () => void
  hideModelStatus: () => void
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function useEmailChat(initialPrompt: string): UseEmailChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!initialPrompt.trim()) return []

    return [
      { id: generateId(), role: 'user', text: initialPrompt.trim() },
      { id: generateId(), role: 'assistant', text: '' }
    ]
  })
  const [isStreaming, setIsStreaming] = useState(() => !!initialPrompt.trim())
  const [error, setError] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    visible: false,
    currentModel: '',
    attempt: 0,
    maxAttempts: 3,
    isModelSwitch: false
  })
  const streamingMessageIdRef = useRef<string | null>(null)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (hasInitializedRef.current) return
    if (!initialPrompt.trim()) return

    hasInitializedRef.current = true

    const assistantMsg = messages.find((m) => m.role === 'assistant')
    if (assistantMsg) {
      streamingMessageIdRef.current = assistantMsg.id
    }

    const userMessages = messages.filter((m) => m.role === 'user')
    window.api.streamChat(userMessages)
  }, [initialPrompt, messages])

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        text: text.trim()
      }

      const assistantMessageId = generateId()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        text: ''
      }

      streamingMessageIdRef.current = assistantMessageId

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)
      setError(null)

      const allMessages = [...messages, userMessage]
      window.api.streamChat(allMessages)
    },
    [isStreaming, messages]
  )

  useEffect(() => {
    const unsubToken = window.api.onChatToken((token) => {
      if (!streamingMessageIdRef.current) return

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageIdRef.current ? { ...msg, text: msg.text + token } : msg
        )
      )
    })

    const unsubComplete = window.api.onChatComplete(() => {
      streamingMessageIdRef.current = null
      setIsStreaming(false)
      setModelStatus((prev) => ({ ...prev, visible: false }))
    })

    const unsubError = window.api.onChatError((errorMsg) => {
      streamingMessageIdRef.current = null
      setIsStreaming(false)
      setError(errorMsg)
      setModelStatus((prev) => ({ ...prev, visible: false }))
    })

    const unsubRetry = window.api.onChatRetry((data) => {
      setModelStatus({
        visible: true,
        currentModel: data.model,
        attempt: data.attempt,
        maxAttempts: data.maxAttempts,
        isModelSwitch: false
      })
    })

    const unsubModelSwitch = window.api.onChatModelSwitch((data) => {
      setModelStatus({
        visible: true,
        currentModel: data.toModel,
        attempt: 0,
        maxAttempts: 3,
        isModelSwitch: true,
        previousModel: data.fromModel
      })
    })

    return () => {
      unsubToken()
      unsubComplete()
      unsubError()
      unsubRetry()
      unsubModelSwitch()
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const hideModelStatus = useCallback(() => {
    setModelStatus((prev) => ({ ...prev, visible: false }))
  }, [])

  return {
    messages,
    isStreaming,
    error,
    modelStatus,
    sendMessage,
    clearError,
    hideModelStatus
  }
}

export { useEmailChat }
