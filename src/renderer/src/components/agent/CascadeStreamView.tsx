import { useEffect, useRef, useState } from 'react'
import { FiChevronDown, FiChevronRight, FiSearch, FiArrowRight } from 'react-icons/fi'
import type { AgentEvent } from './AgentStreamingLog'

interface CascadeStreamViewProps {
  events: AgentEvent[]
  isRunning: boolean
  niche?: string
}

function ThinkingBlock({ content }: { content: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-2 text-left text-purple-400 hover:text-purple-300"
      >
        <span className="mt-0.5 shrink-0">
          {expanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </span>
        <span className="text-xs uppercase tracking-wide opacity-70">Thinking...</span>
      </button>
      {expanded && (
        <div className="mt-1 pl-5 text-text-muted">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        </div>
      )}
    </div>
  )
}

function SearchBlock({
  query,
  urls
}: {
  query: string
  urls?: Array<{ title: string; url: string }>
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <FiSearch className="shrink-0" size={14} />
        <span>Searched web for &ldquo;{query}&rdquo;</span>
        {urls && urls.length > 0 && (
          <span className="text-xs opacity-60">({urls.length} results)</span>
        )}
        <span className="text-xs">
          {expanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </span>
      </button>
      {expanded && urls && urls.length > 0 && (
        <div className="mt-2 space-y-1 pl-6 text-xs text-text-muted">
          {urls.map((u, i) => (
            <div key={i} className="truncate">
              <FiArrowRight className="inline text-cyan-400" size={10} /> {u.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CascadeStreamView({
  events,
  isRunning,
  niche
}: CascadeStreamViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events])

  const handleScroll = (): void => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100
  }

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-text-muted">
        <p className="text-base">Ready to research &ldquo;{niche || 'your niche'}&rdquo;</p>
        <p className="mt-2 text-sm opacity-70">
          Click &ldquo;Start Process&rdquo; to begin finding leads
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto">
      <div className="space-y-1 p-4 text-sm leading-relaxed">
        {events.map((event, index) => {
          if (event.type === 'thinking') {
            return <ThinkingBlock key={index} content={event.content} />
          }

          if (event.type === 'search') {
            return <SearchBlock key={index} query={event.content} urls={event.metadata?.urls} />
          }

          if (event.type === 'response') {
            return (
              <div key={index} className="my-2 whitespace-pre-wrap text-text-main">
                {event.content}
              </div>
            )
          }

          if (event.type === 'status') {
            return (
              <div key={index} className="my-1 text-blue-400">
                {event.content}
              </div>
            )
          }

          return (
            <div key={index} className="text-text-muted">
              {event.content}
            </div>
          )
        })}

        {isRunning && (
          <div className="mt-2 flex items-center gap-2 text-text-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export { CascadeStreamView }
