import { FiPlus, FiX } from 'react-icons/fi'

import type { EmailTab } from '../logic/tabs'

interface EmailTabBarProps {
  tabs: EmailTab[]
  activeTabId: string
  onSwitchTab: (tabId: string) => void
  onRemoveTab: (tabId: string) => void
  onAddTab: () => void
}

function EmailTabBar({
  tabs,
  activeTabId,
  onSwitchTab,
  onRemoveTab,
  onAddTab
}: EmailTabBarProps): React.JSX.Element {
  return (
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
            onClick={() => onSwitchTab(tab.id)}
          >
            <span className="text-text-main text-sm truncate flex-1 mr-2">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveTab(tab.id)
                }}
                className="text-text-muted hover:text-text-main transition-colors p-0.5 rounded hover:bg-surface/50"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onAddTab}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface/50 hover:bg-surface/70 border border-border/50 transition-all duration-200 group"
        >
          <FiPlus
            size={16}
            className="text-text-muted group-hover:text-text-main transition-colors"
          />
        </button>
      </div>
    </div>
  )
}

export { EmailTabBar }
