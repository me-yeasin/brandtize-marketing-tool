function EmailAgentStreamingView(): React.JSX.Element {
  const messages = [
    {
      id: '1',
      role: 'user' as const,
      text: 'Generate leads for gyms in Los Angeles.'
    },
    {
      id: '2',
      role: 'assistant' as const,
      text: "Got it. I'll start by identifying gym categories and collecting a list of local businesses."
    }
  ]

  const userSideStyle = `bg-surface text-text-main text-lg font-medium`
  const assistantSideStyle = `text-text-main text-lg`

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="w-full max-w-3xl mx-auto space-y-3">
          {messages.map((message) => {
            const isUser = message.role === 'user'

            return (
              <div
                key={message.id}
                className={['w-full flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}
              >
                <div
                  className={[
                    'max-w-[75%] px-4 py-2 leading-relaxed whitespace-pre-wrap',
                    'rounded-xl',
                    isUser ? userSideStyle : assistantSideStyle
                  ].join(' ')}
                >
                  {message.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { EmailAgentStreamingView }
