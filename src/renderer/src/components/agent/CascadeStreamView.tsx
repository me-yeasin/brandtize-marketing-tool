import { useEffect, useRef } from 'react'
import type { AgentEvent } from './AgentStreamingLog'

interface CascadeStreamViewProps {
  events: AgentEvent[]
  isRunning: boolean
  niche?: string
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

  const formatMessage = (event: AgentEvent): string => {
    const { type, category, content } = event

    if (type === 'status') {
      return content
    }

    if (category === 'search') {
      const match = content.match(/Searching web for: "(.+)"/)
      if (match) {
        return `Searched web for "${match[1]}"`
      }
      return content
    }

    if (category === 'visit') {
      const match = content.match(/Visiting: (.+)/)
      if (match) {
        return `Visiting ${match[1]}`
      }
      return content
    }

    if (category === 'analyze') {
      if (content.includes('Deep analyzing')) {
        return `Analyzing website to determine if this is a potential client...`
      }
      if (content.includes('Validating email')) {
        return content
      }
      if (content.includes('Qualified:')) {
        return `✓ ${content.replace('✓ Qualified: ', '')}`
      }
      if (content.includes('Skipped:') || content.includes('Skipping')) {
        return `⊘ ${content.replace('✗ Skipped: ', '').replace('Skipping ', '')}`
      }
      return content
    }

    if (category === 'extract') {
      if (content.includes('QUALIFIED Lead')) {
        return `\n✓ Found a valid email that could be your client. Added to the list.\n`
      }
      return content
    }

    if (category === 'plan') {
      return content
    }

    if (category === 'scrape') {
      const match = content.match(/Scraped page: (.+)\.\.\. Found (\d+) email/)
      if (match) {
        return `Analyzed content from "${match[1]}..." - Found ${match[2]} email(s)`
      }
      return content
    }

    if (category === 'generate') {
      return content
    }

    return content
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
          const message = formatMessage(event)
          const isImportant = event.category === 'extract' && event.content.includes('QUALIFIED')
          const isSkipped = event.content.includes('Skipped') || event.content.includes('Skipping')
          const isSearch = event.category === 'search'
          const isPlan = event.category === 'plan' || event.type === 'thinking'

          return (
            <div
              key={index}
              className={[
                'whitespace-pre-wrap',
                isImportant ? 'text-green-400 font-medium' : '',
                isSkipped ? 'text-text-muted opacity-60' : '',
                isSearch ? 'text-blue-400' : '',
                isPlan && !isImportant && !isSkipped ? 'text-text-main' : '',
                !isImportant && !isSkipped && !isSearch && !isPlan ? 'text-text-muted' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {message}
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
