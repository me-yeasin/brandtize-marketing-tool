import type { SettingsTab } from '../types'

interface SettingsTabsProps {
  activeTab: SettingsTab
  onChange: (tab: SettingsTab) => void
  statuses: {
    profile: boolean
    aiProvider: boolean
    searchApi: boolean
    email: boolean
  }
  items: { id: SettingsTab; label: string; icon: React.ReactNode }[]
}

function SettingsTabs({
  activeTab,
  onChange,
  statuses,
  items
}: SettingsTabsProps): React.JSX.Element {
  return (
    <nav className="space-y-1">
      {items.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            activeTab === tab.id
              ? 'bg-primary/20 text-primary'
              : 'text-text-muted hover:bg-surface hover:text-text-main'
          ].join(' ')}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.id === 'profile' && statuses.profile && (
            <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
          )}
          {tab.id === 'ai-provider' && statuses.aiProvider && (
            <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
          )}
          {tab.id === 'search-api' && statuses.searchApi && (
            <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
          )}
        </button>
      ))}
    </nav>
  )
}

export { SettingsTabs }
