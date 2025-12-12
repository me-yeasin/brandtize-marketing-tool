import { type ReactNode } from 'react'

type TabId = 'email' | 'settings'

interface IconSidebarProps {
  activeTab: TabId
  onSelectTab: (tab: TabId) => void
}

interface IconTabButtonProps {
  isActive: boolean
  onClick: () => void
  ariaLabel: string
  icon: ReactNode
}

function IconTabButton({
  isActive,
  onClick,
  ariaLabel,
  icon
}: IconTabButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={[
        'flex h-11 w-11 items-center justify-center rounded-md border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background',
        isActive
          ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_18px_rgba(99,102,241,0.25)]'
          : 'border-transparent text-text-muted hover:bg-surface hover:text-text-main'
      ].join(' ')}
    >
      {icon}
    </button>
  )
}

function EmailIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 7 8-7" />
    </svg>
  )
}

function SettingsIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconSidebar({ activeTab, onSelectTab }: IconSidebarProps): React.JSX.Element {
  return (
    <aside className="glass-panel w-[72px] shrink-0">
      <div className="flex h-full flex-col items-center gap-2 p-3">
        <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-md bg-surface text-text-main">
          <span className="text-sm font-semibold">AR</span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <IconTabButton
            ariaLabel="Email"
            isActive={activeTab === 'email'}
            onClick={() => onSelectTab('email')}
            icon={<EmailIcon />}
          />
          <IconTabButton
            ariaLabel="Settings"
            isActive={activeTab === 'settings'}
            onClick={() => onSelectTab('settings')}
            icon={<SettingsIcon />}
          />
        </div>

        <div className="mt-auto" />
      </div>
    </aside>
  )
}

export { IconSidebar, type TabId }
