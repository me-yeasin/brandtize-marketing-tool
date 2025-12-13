import { FiSend, FiPlus, FiX } from 'react-icons/fi'
import { useState } from 'react'

interface Tab {
  id: string
  title: string
  prompt: string
  submittedPrompt: string
}

function getTabTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return 'New Tab'

  const words = trimmed.split(/\s+/).filter(Boolean)
  const previewWords = words.slice(0, 3)
  return `${previewWords.join(' ')}...`
}

function EmailScreen(): React.JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: '1',
      title: 'New Tab',
      prompt: '',
      submittedPrompt: ''
    }
  ])
  const [activeTabId, setActiveTabId] = useState<string>('1')

  const addNewTab = (): void => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: 'New Tab',
      prompt: '',
      submittedPrompt: ''
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  const updateTabPrompt = (tabId: string, prompt: string): void => {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, prompt } : tab)))
  }

  const submitTabPrompt = (tabId: string): void => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab

        const trimmed = tab.prompt.trim()
        if (!trimmed) {
          return {
            ...tab,
            title: 'New Tab',
            submittedPrompt: ''
          }
        }

        return {
          ...tab,
          title: getTabTitleFromPrompt(tab.prompt),
          submittedPrompt: trimmed
        }
      })
    )
  }

  const removeTab = (tabId: string): void => {
    if (tabs.length === 1) return

    const newTabs = tabs.filter((tab) => tab.id !== tabId)
    setTabs(newTabs)

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
  }

  const switchTab = (tabId: string): void => {
    setActiveTabId(tabId)
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Chrome-style Tab Bar */}
      <div className="flex items-center bg-surface border-b border-border px-2 pt-2">
        <div className="flex items-center flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                relative flex items-center min-w-[120px] max-w-[240px] h-8 px-3 py-1 mr-1 rounded-t-lg cursor-pointer transition-all duration-200
                ${
                  activeTabId === tab.id
                    ? 'bg-background border border-border border-b-transparent'
                    : 'bg-surface/50 hover:bg-surface/70 border border-border/50'
                }
              `}
              onClick={() => switchTab(tab.id)}
            >
              <span className="text-text-main text-sm truncate flex-1 mr-2">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTab(tab.id)
                  }}
                  className="text-text-muted hover:text-text-main transition-colors p-0.5 rounded hover:bg-surface/50"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          ))}
          {/* Add New Tab Button */}
          <button
            onClick={addNewTab}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface/50 hover:bg-surface/70 border border-border/50 transition-all duration-200 group"
          >
            <FiPlus
              size={16}
              className="text-text-muted group-hover:text-text-main transition-colors"
            />
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab?.submittedPrompt ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-2xl font-medium text-text-main">Hello World</div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col p-3 items-center justify-center">
            <h1 className="text-4xl font-medium mb-8 pb-1 bg-linear-to-r from-purple-400 via-primary to-indigo-400 bg-clip-text text-transparent">
              Lets start generating the leads
            </h1>
            <div className="bg-slate-800 rounded-xl p-2 w-[40%] min-w-[400px]">
              <input
                type="text"
                name="prompt"
                id={`prompt-${activeTabId}`}
                value={activeTab?.prompt ?? ''}
                onChange={(e) => updateTabPrompt(activeTabId, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitTabPrompt(activeTabId)
                  }
                }}
                className="bg-transparent text-white placeholder-white/70 text-xl focus:outline-none w-full pt-2 pl-4 text-left"
                placeholder="e.g. gym in Los Angeles"
              />
              <div className="h-10 w-full flex justify-end items-center">
                <button
                  type="button"
                  className="p-3 text-white hover:text-primary transition-colors"
                  onClick={() => submitTabPrompt(activeTabId)}
                >
                  <FiSend size={25} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { EmailScreen }
