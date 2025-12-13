import { useEffect, useRef, useState, useMemo } from 'react'
import { FiChevronDown, FiChevronRight, FiSearch, FiArrowRight } from 'react-icons/fi'
import type { AgentEvent } from './AgentStreamingLog'

interface CascadeStreamViewProps {
  events: AgentEvent[]
  isRunning: boolean
  niche?: string
}

// Threshold for content length - anything longer goes into thinking panel
const LONG_CONTENT_THRESHOLD = 120

/**
 * Check if content looks like raw JSON that should be parsed
 */
function looksLikeJson(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith('{') && trimmed.includes('"')
}

/**
 * Try to parse JSON content and extract display parts
 */
function parseJsonContent(content: string): {
  thinking?: string
  status?: string
  summary?: string
  done?: boolean
  tool?: string
  params?: Record<string, unknown>
  message?: string
  rawText?: string
} {
  try {
    const parsed = JSON.parse(content.trim())
    return {
      thinking: parsed.thinking,
      status: parsed.status,
      summary: parsed.summary,
      done: parsed.done,
      tool: parsed.tool,
      params: parsed.params,
      message: parsed.message
    }
  } catch {
    // Not valid JSON, return as raw text
    return { rawText: content }
  }
}

/**
 * Determine if content should go into thinking panel
 * - Long content (> threshold)
 * - Content that contains detailed analysis keywords
 */
function shouldBeInThinkingPanel(content: string): boolean {
  if (content.length > LONG_CONTENT_THRESHOLD) return true

  // Check for analysis/reasoning keywords
  const thinkingKeywords = [
    'analyzing',
    'analysis',
    'examining',
    'evaluating',
    'considering',
    'this appears to be',
    'i found',
    'i notice',
    'looking at',
    'the search results',
    'this website',
    'this business'
  ]
  const lowerContent = content.toLowerCase()
  return thinkingKeywords.some((kw) => lowerContent.includes(kw))
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

/**
 * Process and normalize events for display
 * - Parse JSON content and extract parts
 * - Route long content to thinking panel
 * - Skip duplicate/redundant events
 */
function useProcessedEvents(events: AgentEvent[]): AgentEvent[] {
  return useMemo(() => {
    const processed: AgentEvent[] = []
    const seenContent = new Set<string>()

    for (const event of events) {
      const content = event.content.trim()

      // Skip empty content
      if (!content) continue

      // Skip exact duplicates
      const contentKey = `${event.type}:${content.slice(0, 100)}`
      if (seenContent.has(contentKey)) continue
      seenContent.add(contentKey)

      // Check if content looks like raw JSON
      if (looksLikeJson(content)) {
        const parsed = parseJsonContent(content)
        let hasStructuredContent = false

        // PRIORITY 1: Summary - always show directly on screen (completion message)
        if (parsed.summary) {
          hasStructuredContent = true
          const summaryKey = `response:${parsed.summary.slice(0, 50)}`
          if (!seenContent.has(summaryKey)) {
            seenContent.add(summaryKey)
            processed.push({
              ...event,
              type: 'response',
              content: parsed.summary
            })
          }
        }

        // PRIORITY 2: Status - always show directly on screen (short updates)
        if (parsed.status) {
          hasStructuredContent = true
          const statusKey = `status:${parsed.status.slice(0, 50)}`
          if (!seenContent.has(statusKey)) {
            seenContent.add(statusKey)
            processed.push({
              ...event,
              type: 'status',
              content: parsed.status
            })
          }
        }

        // PRIORITY 3: Message - show directly on screen
        if (parsed.message) {
          hasStructuredContent = true
          const msgKey = `response:${parsed.message.slice(0, 50)}`
          if (!seenContent.has(msgKey)) {
            seenContent.add(msgKey)
            processed.push({
              ...event,
              type: 'response',
              content: parsed.message
            })
          }
        }

        // PRIORITY 4: Thinking - goes into expandable panel
        if (parsed.thinking) {
          hasStructuredContent = true
          processed.push({
            ...event,
            type: 'thinking',
            content: parsed.thinking
          })
        }

        // PRIORITY 5: Tool info - show as status
        if (parsed.tool) {
          hasStructuredContent = true
          const toolStatus = `Using tool: ${parsed.tool}`
          if (!seenContent.has(`status:${toolStatus}`)) {
            seenContent.add(`status:${toolStatus}`)
            processed.push({
              ...event,
              type: 'status',
              content: toolStatus
            })
          }
        }

        // If it's raw text that couldn't be parsed, handle normally
        if (parsed.rawText && !hasStructuredContent) {
          // Check if this long content should be in thinking panel
          if (shouldBeInThinkingPanel(parsed.rawText)) {
            processed.push({
              ...event,
              type: 'thinking',
              content: parsed.rawText
            })
          } else {
            processed.push({
              ...event,
              content: parsed.rawText
            })
          }
        }
      } else {
        // Not JSON - check if long content should go to thinking panel
        if (event.type === 'response' && shouldBeInThinkingPanel(content)) {
          processed.push({
            ...event,
            type: 'thinking',
            content
          })
        } else {
          processed.push(event)
        }
      }
    }

    return processed
  }, [events])
}

function CascadeStreamView({
  events,
  isRunning,
  niche
}: CascadeStreamViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Process events to properly route content
  const processedEvents = useProcessedEvents(events)

  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [processedEvents])

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
        {processedEvents.map((event, index) => {
          // Thinking events go into expandable panel
          if (event.type === 'thinking') {
            return <ThinkingBlock key={index} content={event.content} />
          }

          // Search events get special treatment
          if (event.type === 'search') {
            return <SearchBlock key={index} query={event.content} urls={event.metadata?.urls} />
          }

          // Response events shown directly (short messages)
          if (event.type === 'response') {
            return (
              <div key={index} className="my-2 whitespace-pre-wrap text-text-main">
                {event.content}
              </div>
            )
          }

          // Status events shown directly (short status updates)
          if (event.type === 'status') {
            return (
              <div key={index} className="my-1 text-blue-400">
                {event.content}
              </div>
            )
          }

          // Default fallback
          return (
            <div key={index} className="text-text-muted">
              {event.content}
            </div>
          )
        })}

        {isRunning && (
          <div className="mt-2 flex items-center gap-2 text-text-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="animate-pulse">Processing...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export { CascadeStreamView }
