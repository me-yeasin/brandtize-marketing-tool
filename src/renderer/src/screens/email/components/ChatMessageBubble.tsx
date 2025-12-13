import type { ChatMessage } from '../logic/useEmailChat'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

function ChatMessageBubble({ message }: ChatMessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user'

  const userStyle = 'bg-surface text-text-main text-lg font-medium'
  const assistantStyle = 'text-text-main text-lg'

  return (
    <div className={['w-full flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[75%] px-4 py-2 leading-relaxed whitespace-pre-wrap',
          'rounded-xl',
          isUser ? userStyle : assistantStyle
        ].join(' ')}
      >
        {message.text || (message.role === 'assistant' && <span className="opacity-50"></span>)}
      </div>
    </div>
  )
}

export { ChatMessageBubble }
