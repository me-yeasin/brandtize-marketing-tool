import { EmailPromptView } from './email/components/EmailPromptView'
import { EmailTabBar } from './email/components/EmailTabBar'
import { useEmailTabs } from './email/logic/useEmailTabs'

function EmailScreen(): React.JSX.Element {
  const { tabs, activeTabId, addNewTab, removeTab, switchTab } = useEmailTabs()

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
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              display: tab.id === activeTabId ? 'block' : 'none',
              height: '100%',
              width: '100%'
            }}
          >
            <EmailPromptView tabId={tab.id} />
          </div>
        ))}
      </div>
    </div>
  )
}

export { EmailScreen }
