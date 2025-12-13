import { useMemo } from 'react'
import type { ChatMessage } from '../logic/useEmailChat'
import { MarkdownRenderer, ThinkingBlock } from '../../../components/ui'
import { parseReasoning } from '../../../utils/reasoning-parser'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

function ChatMessageBubble({ message }: ChatMessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user'

  const parsed = useMemo(() => {
    if (isUser || !message.text) {
      return { thinking: '', content: message.text || '', hasThinking: false }
    }
    return parseReasoning(message.text)
  }, [message.text, isUser])

  const userStyle = 'bg-surface text-text-main text-lg font-medium'
  const assistantStyle = 'text-text-main'

  return (
    <div className={['w-full flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] px-4 py-2 leading-relaxed',
          'rounded-xl',
          isUser ? userStyle : assistantStyle
        ].join(' ')}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.text}</span>
        ) : message.text ? (
          <>
            {parsed.hasThinking && <ThinkingBlock thinking={parsed.thinking} />}
            <MarkdownRenderer content={parsed.content} />
          </>
        ) : (
          <span className="opacity-50"></span>
        )}
      </div>
    </div>
  )
}

export { ChatMessageBubble }
