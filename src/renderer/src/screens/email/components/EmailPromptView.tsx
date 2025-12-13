import { FiSend } from 'react-icons/fi'

interface EmailPromptViewProps {
  activeTabId: string
  prompt: string
  onPromptChange: (nextPrompt: string) => void
  onSubmit: () => void
}

function EmailPromptView({
  activeTabId,
  prompt,
  onPromptChange,
  onSubmit
}: EmailPromptViewProps): React.JSX.Element {
  return (
    <div className="h-full w-full flex flex-col p-3 items-center justify-center">
      <h1 className="text-4xl font-medium mb-8 pb-1 bg-linear-to-r from-purple-400 via-primary to-indigo-400 bg-clip-text text-transparent">
        Lets start generating the leads
      </h1>
      <div className="bg-slate-800 rounded-xl p-2 w-[40%] min-w-[400px]">
        <input
          type="text"
          name="prompt"
          id={`prompt-${activeTabId}`}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
          className="bg-transparent text-white placeholder-white/70 text-xl focus:outline-none w-full pt-2 pl-4 text-left"
          placeholder="e.g. gym in Los Angeles"
        />
        <div className="h-10 w-full flex justify-end items-center">
          <button
            type="button"
            className="p-3 text-white hover:text-primary transition-colors"
            onClick={onSubmit}
          >
            <FiSend size={25} />
          </button>
        </div>
      </div>
    </div>
  )
}

export { EmailPromptView }
