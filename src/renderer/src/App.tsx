import { JSX, useState } from 'react'
import SettingsPage from './components/SettingsPage'
import Sidebar from './components/Sidebar'
import './styles/index.css'

// Page types
type PageType = 'main' | 'settings'

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<PageType>('main')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeRoute, setActiveRoute] = useState('maps-scout')

  // Navigate to settings
  const handleOpenSettings = (): void => {
    setCurrentPage('settings')
  }

  // Navigate back from settings
  const handleBackFromSettings = (): void => {
    setCurrentPage('main')
  }

  // Render Settings Page (completely separate layout)
  if (currentPage === 'settings') {
    return <SettingsPage onBack={handleBackFromSettings} />
  }

  // Render Main Page
  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeRoute={activeRoute}
        onRouteChange={setActiveRoute}
        onOpenSettings={handleOpenSettings}
      />

      {/* Main Content Area */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Toggle button when sidebar is hidden */}
        {!sidebarOpen && (
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            title="Open Sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Page Content */}
        <div className="page-content">
          <h1>Hello World</h1>
          <p>Welcome to Brandtize Marketing Tool</p>
          <p className="active-route">
            Active Route: <code>{activeRoute}</code>
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
