import { useState } from 'react'

import { EmailPromptView } from './email/components/EmailPromptView'
import { EmailSubmittedView } from './email/components/EmailSubmittedView'
import { EmailTabBar } from './email/components/EmailTabBar'
import { getTabTitleFromPrompt, type EmailTab } from './email/logic/tabs'

function EmailScreen(): React.JSX.Element {
  const [tabs, setTabs] = useState<EmailTab[]>([
    {
      id: '1',
      title: 'New Tab',
      prompt: '',
      submittedPrompt: ''
    }
  ])
  const [activeTabId, setActiveTabId] = useState<string>('1')

  const addNewTab = (): void => {
    const newTab: EmailTab = {
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

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Chrome-style Tab Bar */}
      <EmailTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onRemoveTab={removeTab}
        onAddTab={addNewTab}
      />

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab?.submittedPrompt ? (
          <EmailSubmittedView />
        ) : (
          <EmailPromptView
            activeTabId={activeTabId}
            prompt={activeTab?.prompt ?? ''}
            onPromptChange={(next) => updateTabPrompt(activeTabId, next)}
            onSubmit={() => submitTabPrompt(activeTabId)}
          />
        )}
      </div>
    </div>
  )
}

export { EmailScreen }
