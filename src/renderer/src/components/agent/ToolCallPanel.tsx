import { useState } from 'react'

interface ToolCallPanelProps {
  tool: string
  description: string
  timestamp?: number
  status?: 'running' | 'completed' | 'error'
  details?: Record<string, unknown>
}

function ToolCallPanel({
  tool,
  description,
  timestamp,
  status = 'completed',
  details
}: ToolCallPanelProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  const toolIcons: Record<string, string> = {
    search: '🔍',
    visit: '🌐',
    scrape: '📄',
    extract: '📧',
    analyze: '🧠',
    generate: '✨',
    default: '⚙️'
  }

  const statusStyles = {
    running: 'border-blue-500/30 bg-blue-500/5',
    completed: 'border-slate-600/50 bg-slate-800/30',
    error: 'border-red-500/30 bg-red-500/5'
  }

  const icon = toolIcons[tool] || toolIcons.default

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={`rounded-md border ${statusStyles[status]} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-left text-sm text-text-main">{description}</span>
        {status === 'running' && (
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        )}
        {timestamp && <span className="text-xs text-text-muted">{formatTime(timestamp)}</span>}
        {details && (
          <svg
            className={`w-3 h-3 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isExpanded && details && (
        <div className="px-3 py-2 border-t border-border/50 bg-black/20">
          <pre className="text-xs text-text-muted overflow-x-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export { ToolCallPanel }
