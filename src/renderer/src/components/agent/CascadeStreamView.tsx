import { useEffect, useRef } from 'react'
import { ThinkingPanel } from './ThinkingPanel'
import { ToolCallPanel } from './ToolCallPanel'

interface AgentEvent {
  type: 'thinking' | 'action' | 'result' | 'status'
  category?: 'plan' | 'search' | 'visit' | 'scrape' | 'extract' | 'generate' | 'analyze'
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

interface CascadeStreamViewProps {
  events: AgentEvent[]
  isRunning: boolean
  niche: string
}

interface GroupedEvent {
  type: 'thinking' | 'tool' | 'result'
  title: string
  content: string
  timestamp: number
  variant: 'thinking' | 'action' | 'result' | 'plan'
  toolName?: string
  details?: Record<string, unknown>
}

function groupEvents(events: AgentEvent[]): GroupedEvent[] {
  const grouped: GroupedEvent[] = []

  for (const event of events) {
    if (event.type === 'thinking') {
      grouped.push({
        type: 'thinking',
        title: 'Thinking...',
        content: event.content,
        timestamp: event.timestamp,
        variant: 'thinking'
      })
    } else if (event.type === 'status') {
      const isPlanning =
        event.content.toLowerCase().includes('plan') ||
        event.content.toLowerCase().includes('strateg')
      grouped.push({
        type: 'thinking',
        title: isPlanning ? 'Planning Strategy' : 'Status Update',
        content: event.content,
        timestamp: event.timestamp,
        variant: isPlanning ? 'plan' : 'action'
      })
    } else if (event.type === 'action') {
      const toolName = event.category || 'action'
      const toolTitles: Record<string, string> = {
        search: 'Searching the web',
        visit: 'Visiting website',
        scrape: 'Extracting page content',
        extract: 'Finding contact information',
        analyze: 'Analyzing business',
        generate: 'Generating email template'
      }
      grouped.push({
        type: 'tool',
        title: toolTitles[toolName] || 'Executing action',
        content: event.content,
        timestamp: event.timestamp,
        variant: 'action',
        toolName,
        details: event.metadata
      })
    } else if (event.type === 'result') {
      grouped.push({
        type: 'result',
        title: 'Result',
        content: event.content,
        timestamp: event.timestamp,
        variant: 'result',
        details: event.metadata
      })
    }
  }

  return grouped
}

function CascadeStreamView({
  events,
  isRunning,
  niche
}: CascadeStreamViewProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const groupedEvents = groupEvents(events)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-background/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-main">Email Research Agent</h3>
            <p className="text-xs text-text-muted">Researching: {niche}</p>
          </div>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs text-green-400">Working</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedEvents.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-4xl">🔍</div>
              <p className="text-text-muted">Starting research...</p>
            </div>
          </div>
        ) : (
          <>
            {groupedEvents.map((event, index) => {
              if (event.type === 'thinking') {
                return (
                  <ThinkingPanel
                    key={index}
                    title={event.title}
                    content={event.content}
                    timestamp={event.timestamp}
                    variant={event.variant}
                    isExpanded={index >= groupedEvents.length - 3}
                  />
                )
              }

              if (event.type === 'tool') {
                return (
                  <ToolCallPanel
                    key={index}
                    tool={event.toolName || 'action'}
                    description={event.content}
                    timestamp={event.timestamp}
                    status="completed"
                    details={event.details}
                  />
                )
              }

              if (event.type === 'result') {
                return (
                  <div
                    key={index}
                    className="rounded-lg border border-green-500/30 bg-green-500/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">✓</span>
                      <div className="flex-1">
                        <p className="text-sm text-green-400 font-medium mb-1">{event.title}</p>
                        <p className="text-sm text-text-main">{event.content}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              return null
            })}

            {isRunning && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-sm text-blue-400">Processing...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export { CascadeStreamView }
