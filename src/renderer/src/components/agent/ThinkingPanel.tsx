import { useState } from 'react'

interface ThinkingPanelProps {
  title: string
  content: string
  timestamp?: number
  isExpanded?: boolean
  variant?: 'thinking' | 'action' | 'result' | 'plan'
  children?: React.ReactNode
}

function ThinkingPanel({
  title,
  content,
  timestamp,
  isExpanded: defaultExpanded = true,
  variant = 'thinking',
  children
}: ThinkingPanelProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const variantStyles = {
    thinking: {
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/5',
      icon: '💭',
      headerBg: 'bg-purple-500/10',
      accent: 'text-purple-400'
    },
    action: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/5',
      icon: '⚡',
      headerBg: 'bg-cyan-500/10',
      accent: 'text-cyan-400'
    },
    result: {
      border: 'border-green-500/30',
      bg: 'bg-green-500/5',
      icon: '✓',
      headerBg: 'bg-green-500/10',
      accent: 'text-green-400'
    },
    plan: {
      border: 'border-yellow-500/30',
      bg: 'bg-yellow-500/5',
      icon: '📋',
      headerBg: 'bg-yellow-500/10',
      accent: 'text-yellow-400'
    }
  }

  const style = variantStyles[variant]

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${style.headerBg} hover:opacity-90 transition-opacity`}
      >
        <span className="text-lg">{style.icon}</span>
        <div className="flex-1 text-left">
          <span className={`font-medium ${style.accent}`}>{title}</span>
        </div>
        {timestamp && <span className="text-xs text-text-muted">{formatTime(timestamp)}</span>}
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 space-y-3">
          <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">{content}</p>
          {children}
        </div>
      )}
    </div>
  )
}

export { ThinkingPanel }
