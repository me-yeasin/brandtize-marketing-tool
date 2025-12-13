import { useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ThinkingBlockProps {
  thinking: string
  defaultExpanded?: boolean
}

function ThinkingBlock({
  thinking,
  defaultExpanded = false
}: ThinkingBlockProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!thinking.trim()) {
    return <></>
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main transition-colors"
      >
        {isExpanded ? (
          <FiChevronDown className="w-4 h-4" />
        ) : (
          <FiChevronRight className="w-4 h-4" />
        )}
        <span className="font-medium">Thoughts</span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-2 pl-4 border-l-2 border-primary bg-surface/50 rounded-r-lg py-2 pr-3">
          <div className="text-sm text-text-muted">
            <MarkdownRenderer content={thinking} className="prose-sm" />
          </div>
        </div>
      )}
    </div>
  )
}

export { ThinkingBlock }
