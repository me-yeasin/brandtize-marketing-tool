import { useRef, useEffect } from 'react'

import { useEmailChat } from '../logic/useEmailChat'
import { ChatMessageBubble } from './ChatMessageBubble'
import { StreamingIndicator } from './StreamingIndicator'

interface EmailAgentStreamingViewProps {
  initialPrompt: string
}

function EmailAgentStreamingView({
  initialPrompt
}: EmailAgentStreamingViewProps): React.JSX.Element {
  const { messages, isStreaming, error } = useEmailChat(initialPrompt)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="h-full w-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="w-full max-w-3xl mx-auto space-y-3">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}

          {isStreaming && <StreamingIndicator />}

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">{error}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export { EmailAgentStreamingView }
