import { type ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

function DashboardLayout({ children, sidebar }: DashboardLayoutProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="glass-panel w-[250px] flex-shrink-0 border-r border-border">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b border-border px-4">
            <span className="text-lg font-semibold text-text-main">AR Branding</span>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">{sidebar}</nav>
        </div>
      </aside>

      <main className="flex-1 bg-background p-8">{children}</main>
    </div>
  )
}

export { DashboardLayout, type DashboardLayoutProps }
