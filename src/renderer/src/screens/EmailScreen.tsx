import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button, Input } from '../components/ui'
import { CascadeStreamView, LeadCard } from '../components/agent'
import type { AgentEvent, ExtractedLead } from '../components/agent'

type TabState = 'idle' | 'running' | 'completed' | 'error'

type EmailTab = {
  id: string
  title: string
  nicheText: string
  state: TabState
  events: AgentEvent[]
  leads: ExtractedLead[]
  error?: string
}

function EmailScreen(): React.JSX.Element {
  const nextTabNumberRef = useRef(2)

  const [tabs, setTabs] = useState<EmailTab[]>([
    {
      id: 'tab-1',
      title: 'Tab 1',
      nicheText: '',
      state: 'idle',
      events: [],
      leads: []
    }
  ])
  const [activeTabId, setActiveTabId] = useState<EmailTab['id']>('tab-1')

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  }, [activeTabId, tabs])

  const showLeads = activeTab.leads.length > 0

  const addTab = (): void => {
    const tabNumber = nextTabNumberRef.current++
    const newTab: EmailTab = {
      id: `tab-${tabNumber}`,
      title: `Tab ${tabNumber}`,
      nicheText: '',
      state: 'idle',
      events: [],
      leads: []
    }

    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  // Agent event handlers
  const updateTabState = useCallback((tabId: string, updates: Partial<EmailTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t)))
  }, [])

  const addEventToTab = useCallback((tabId: string, event: AgentEvent) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, events: [...t.events, event] } : t))
    )
  }, [])

  const addLeadToTab = useCallback((tabId: string, lead: ExtractedLead) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, leads: [...t.leads, lead] } : t)))
  }, [])

  // Subscribe to agent events
  useEffect(() => {
    const unsubEvent = window.api.onAgentEvent(({ tabId, event }) => {
      addEventToTab(tabId, event)
    })

    const unsubLead = window.api.onAgentLead(({ tabId, lead }) => {
      addLeadToTab(tabId, lead)
    })

    const unsubComplete = window.api.onAgentComplete(({ tabId }) => {
      updateTabState(tabId, { state: 'completed' })
    })

    const unsubError = window.api.onAgentError(({ tabId, error }) => {
      updateTabState(tabId, { state: 'error', error })
    })

    return () => {
      unsubEvent()
      unsubLead()
      unsubComplete()
      unsubError()
    }
  }, [addEventToTab, addLeadToTab, updateTabState])

  const startAgent = async (): Promise<void> => {
    if (!activeTab.nicheText.trim()) return

    updateTabState(activeTab.id, { state: 'running', events: [], leads: [], error: undefined })

    const result = await window.api.startAgent(activeTab.id, activeTab.nicheText.trim())
    if (!result.success) {
      updateTabState(activeTab.id, { state: 'error', error: result.error })
    }
  }

  const stopAgent = async (): Promise<void> => {
    await window.api.stopAgent(activeTab.id)
    updateTabState(activeTab.id, { state: 'completed' })
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

      {activeTab.state === 'idle' ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-xl space-y-4">
            <Input
              placeholder="Okay, enter your niche or more relevant text"
              value={activeTab.nicheText}
              onChange={(e) => updateActiveTabText(e.target.value)}
            />

            <div className="flex justify-center">
              <Button variant="primary" onClick={startAgent} disabled={!activeTab.nicheText.trim()}>
                Start Process
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface/20 px-4 py-3">
            <div>
              <span className="text-sm text-text-muted">Niche: </span>
              <span className="text-sm font-medium text-text-main">{activeTab.nicheText}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeTab.state === 'running' && (
                <Button variant="outline" onClick={stopAgent}>
                  Stop
                </Button>
              )}
              {(activeTab.state === 'completed' || activeTab.state === 'error') && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    updateTabState(activeTab.id, { state: 'idle', events: [], leads: [] })
                  }
                >
                  New Search
                </Button>
              )}
            </div>
          </div>

          {activeTab.error && (
            <div className="mx-4 mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {activeTab.error}
            </div>
          )}

          <div className="flex flex-1 gap-4 overflow-hidden p-4 justify-between">
            {showLeads ? (
              <div className="flex-1 overflow-hidden max-w-4xl">
                <CascadeStreamView
                  events={activeTab.events}
                  isRunning={activeTab.state === 'running'}
                  niche={activeTab.nicheText}
                />
              </div>
            ) : (
              <div className="flex flex-1 justify-center overflow-hidden">
                <div className="h-full w-full max-w-4xl overflow-hidden">
                  <CascadeStreamView
                    events={activeTab.events}
                    isRunning={activeTab.state === 'running'}
                    niche={activeTab.nicheText}
                  />
                </div>
              </div>
            )}

            {showLeads && (
              <div className="w-fit shrink-0 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text-main">
                    Qualified Leads ({activeTab.leads.length})
                  </h3>
                  <span className="text-xs text-green-400">✓ Verified</span>
                </div>
                <div className="space-y-3">
                  {activeTab.leads.map((lead, index) => (
                    <LeadCard key={lead.id} lead={lead} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { EmailScreen }
