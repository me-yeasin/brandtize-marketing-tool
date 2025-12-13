import { useMemo, useState } from 'react'

import { getTabTitleFromPrompt, type EmailTab } from './tabs'

interface UseEmailTabsResult {
  tabs: EmailTab[]
  activeTabId: string
  activeTab: EmailTab
  addNewTab: () => void
  removeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  updateTabPrompt: (tabId: string, prompt: string) => void
  submitTabPrompt: (tabId: string) => void
}

function createEmptyTab(id: string): EmailTab {
  return {
    id,
    title: 'New Tab',
    prompt: '',
    submittedPrompt: ''
  }
}

function createDefaultTabs(): EmailTab[] {
  return [createEmptyTab('1')]
}

function useEmailTabs(): UseEmailTabsResult {
  const [tabs, setTabs] = useState<EmailTab[]>(createDefaultTabs)
  const [activeTabId, setActiveTabId] = useState<string>('1')

  const addNewTab = (): void => {
    const id = Date.now().toString()
    setTabs((prev) => [...prev, createEmptyTab(id)])
    setActiveTabId(id)
  }

  const removeTab = (tabId: string): void => {
    setTabs((prev) => {
      if (prev.length === 1) return prev

      const next = prev.filter((tab) => tab.id !== tabId)

      setActiveTabId((current) => (current === tabId ? next[next.length - 1].id : current))

      return next
    })
  }

  const switchTab = (tabId: string): void => {
    setActiveTabId(tabId)
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

  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  }, [activeTabId, tabs])

  return {
    tabs,
    activeTabId,
    activeTab,
    addNewTab,
    removeTab,
    switchTab,
    updateTabPrompt,
    submitTabPrompt
  }
}

export { useEmailTabs }
