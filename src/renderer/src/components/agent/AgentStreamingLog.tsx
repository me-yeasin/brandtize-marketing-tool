import { useEffect, useRef } from 'react'

interface AgentEvent {
  type: 'response' | 'thinking' | 'search' | 'status'
  content: string
  timestamp: number
  metadata?: {
    urls?: Array<{ title: string; url: string }>
    thinkingComplete?: boolean
    [key: string]: unknown
  }
}

interface AgentStreamingLogProps {
  events: AgentEvent[]
  isRunning: boolean
}

function getEventIcon(event: AgentEvent): string {
  switch (event.type) {
    case 'thinking':
      return '�'
    case 'response':
      return '�'
    case 'search':
      return '�'
    case 'status':
      return '📋'
    default:
      return '•'
  }
}

function getEventColor(event: AgentEvent): string {
  switch (event.type) {
    case 'thinking':
      return 'text-purple-400'
    case 'response':
      return 'text-text-main'
    case 'search':
      return 'text-cyan-400'
    case 'status':
      return 'text-blue-400'
    default:
      return 'text-text-muted'
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function AgentStreamingLog({ events, isRunning }: AgentStreamingLogProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-background/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-main">Agent Activity</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Running
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted">{events.length} events</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-muted">
            <p>Waiting for agent to start...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div key={index} className="flex gap-3">
                <span className="shrink-0 text-xs text-text-muted">
                  {formatTime(event.timestamp)}
                </span>
                <span className="shrink-0">{getEventIcon(event)}</span>
                <div className="flex-1">
                  <span className={getEventColor(event)}>{event.content}</span>
                  {event.metadata && (
                    <div className="mt-1 rounded bg-surface/50 p-2 text-xs text-text-muted">
                      {event.metadata.queries ? (
                        <div>
                          <span className="text-text-main">Queries: </span>
                          {(event.metadata.queries as string[]).join(', ')}
                        </div>
                      ) : null}
                      {event.metadata.results ? (
                        <div className="mt-1 space-y-1">
                          {(event.metadata.results as Array<{ title: string; url: string }>).map(
                            (r, i) => (
                              <div key={i} className="truncate">
                                <span className="text-cyan-400">→</span> {r.title}
                              </div>
                            )
                          )}
                        </div>
                      ) : null}
                      {event.metadata.url ? (
                        <div className="truncate">
                          <span className="text-text-main">URL: </span>
                          <span className="text-cyan-400">{String(event.metadata.url)}</span>
                        </div>
                      ) : null}
                      {event.metadata.email ? (
                        <div>
                          <span className="text-text-main">Email: </span>
                          <span className="text-pink-400">{String(event.metadata.email)}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-text-muted">
                <span className="animate-pulse">▌</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { AgentStreamingLog, type AgentEvent }
