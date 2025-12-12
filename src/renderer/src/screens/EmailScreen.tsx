import { useMemo, useRef, useState } from 'react'

import { Button, Input } from '../components/ui'

type EmailTab = {
  id: string
  title: string
  nicheText: string
}

function EmailScreen(): React.JSX.Element {
  const nextTabNumberRef = useRef(2)

  const [tabs, setTabs] = useState<EmailTab[]>([
    {
      id: 'tab-1',
      title: 'Tab 1',
      nicheText: ''
    }
  ])
  const [activeTabId, setActiveTabId] = useState<EmailTab['id']>('tab-1')

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  }, [activeTabId, tabs])

  const addTab = (): void => {
    const tabNumber = nextTabNumberRef.current++
    const newTab: EmailTab = {
      id: `tab-${tabNumber}`,
      title: `Tab ${tabNumber}`,
      nicheText: ''
    }

    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId: EmailTab['id']): void => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev

      const idx = prev.findIndex((t) => t.id === tabId)
      const nextTabs = prev.filter((t) => t.id !== tabId)

      if (activeTabId === tabId) {
        const fallback = nextTabs[idx - 1] ?? nextTabs[idx] ?? nextTabs[0]
        setActiveTabId(fallback.id)
      }

      return nextTabs
    })
  }

  const updateActiveTabText = (value: string): void => {
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, nicheText: value } : t)))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md bg-surface/20">
      <div
        role="tablist"
        aria-label="Email tabs"
        className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface/40 px-2 py-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id
          const canClose = tabs.length > 1

          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              onClick={() => setActiveTabId(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveTabId(tab.id)
                }
              }}
              className={[
                'group flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm transition-colors',
                isActive
                  ? 'bg-background text-text-main shadow-[0_0_16px_rgba(99,102,241,0.18)]'
                  : 'text-text-muted hover:bg-surface hover:text-text-main'
              ].join(' ')}
            >
              <span className="whitespace-nowrap">{tab.title}</span>

              {canClose && (
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-surface hover:text-text-main group-hover:opacity-100"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}

        <button
          type="button"
          aria-label="Add tab"
          onClick={addTab}
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text-main"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-4">
          <Input
            placeholder="Okay, enter your niche or more relevant text"
            value={activeTab.nicheText}
            onChange={(e) => updateActiveTabText(e.target.value)}
          />

          <div className="flex justify-center">
            <Button variant="primary">Start Process</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { EmailScreen }
