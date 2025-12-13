import { EmailPromptView } from './email/components/EmailPromptView'
import { EmailAgentStreamingView } from './email/components/EmailSubmittedView'
import { EmailTabBar } from './email/components/EmailTabBar'
import { useEmailTabs } from './email/logic/useEmailTabs'

function EmailScreen(): React.JSX.Element {
  const {
    tabs,
    activeTabId,
    activeTab,
    addNewTab,
    removeTab,
    switchTab,
    updateTabPrompt,
    submitTabPrompt
  } = useEmailTabs()

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
          <EmailAgentStreamingView />
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
