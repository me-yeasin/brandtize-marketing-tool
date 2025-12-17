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
      <div className="flex-1 overflow-hidden">
        <EmailPromptView activeTabId={activeTabId} />
      </div>
    </div>
  )
}

export { EmailScreen }
