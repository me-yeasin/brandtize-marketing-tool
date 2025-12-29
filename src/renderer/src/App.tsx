import { JSX, useCallback, useEffect, useState } from 'react'
import AiCopywriterPage from './components/AiCopywriterPage'
import MapsScoutPage from './components/MapsScoutPage'
import SavedLeadsPage from './components/SavedLeadsPage'
import SettingsPage from './components/SettingsPage'
import Sidebar from './components/Sidebar'
import SocialLeadsPage from './components/SocialLeadsPage'
import './styles/index.css'

// Page types
type PageType = 'main' | 'settings'
type TaskStatus = 'idle' | 'running' | 'completed'

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<PageType>('main')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeRoute, setActiveRoute] = useState('maps-scout')
  const [taskStatusByRoute, setTaskStatusByRoute] = useState<Record<string, TaskStatus>>({
    'maps-scout': 'idle',
    'social-leads': 'idle'
  })
  const [updateProgress, setUpdateProgress] = useState<{
    percent: number
    transferred: number
    total: number
    bytesPerSecond: number
  } | null>(null)
  const [updateAvailableVersion, setUpdateAvailableVersion] = useState<string | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  // Navigate to settings
  const handleOpenSettings = (): void => {
    setCurrentPage('settings')
  }

  // Navigate back from settings
  const handleBackFromSettings = (): void => {
    setCurrentPage('main')
  }

  const updateTaskStatus = useCallback((route: string, status: TaskStatus): void => {
    setTaskStatusByRoute((prev) => {
      if (prev[route] === status) return prev
      return { ...prev, [route]: status }
    })
  }, [])

  useEffect(() => {
    window.api.onUpdateAvailable(({ version }) => {
      setUpdateAvailableVersion(version)
      setUpdateDownloaded(false)
    })

    window.api.onUpdateDownloadProgress((progress) => {
      setUpdateProgress(progress)
    })

    window.api.onUpdateDownloaded(() => {
      setUpdateProgress(null)
      setUpdateDownloaded(true)
    })

    window.api.onUpdateError(() => {
      setUpdateProgress(null)
    })
  }, [])

  const renderOtherRouteContent = (): JSX.Element => {
    switch (activeRoute) {
      case 'ai-copywriter-mail':
        return <AiCopywriterPage initialTab="mail" />
      case 'ai-copywriter-whatsapp':
        return <AiCopywriterPage initialTab="whatsapp" />
      case 'ai-copywriter-telegram':
        return <AiCopywriterPage initialTab="telegram" />
      case 'saved-leads':
        return <SavedLeadsPage />
      default:
        return (
          <div className="page-content">
            <h1>Coming Soon</h1>
            <p>This feature is under development</p>
            <p className="active-route">
              Active Route: <code>{activeRoute}</code>
            </p>
          </div>
        )
    }
  }

  const handleRestartToUpdate = async (): Promise<void> => {
    await window.api.updateQuitAndInstall()
  }

  const renderUpdateBanner = (): JSX.Element | null => {
    if (updateDownloaded) {
      return (
        <div className="update-banner update-ready" role="status" aria-live="polite">
          <div className="update-banner-row">
            <div className="update-banner-title">
              Update downloaded{updateAvailableVersion ? ` (v${updateAvailableVersion})` : ''}.
            </div>
            <div className="update-banner-actions">
              <button className="update-banner-btn primary" onClick={handleRestartToUpdate}>
                Restart
              </button>
              <button className="update-banner-btn" onClick={() => setUpdateDownloaded(false)}>
                Later
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (!updateProgress) return null

    const percent = Math.max(0, Math.min(100, updateProgress.percent || 0))

    return (
      <div className="update-banner" role="status" aria-live="polite">
        <div className="update-banner-row">
          <div className="update-banner-title">Downloading update… {Math.round(percent)}%</div>
        </div>
        <div className="update-banner-bar" aria-hidden="true">
          <div className="update-banner-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={currentPage === 'settings' ? 'page-hidden' : ''}>
        <div className="app-container">
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            activeRoute={activeRoute}
            onRouteChange={setActiveRoute}
            onOpenSettings={handleOpenSettings}
            taskStatusByRoute={taskStatusByRoute}
          />

          <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
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

            <div className="route-host">
              <div className={activeRoute === 'maps-scout' ? '' : 'page-hidden'}>
                <MapsScoutPage
                  onTaskStatusChange={(status) => updateTaskStatus('maps-scout', status)}
                />
              </div>
              <div className={activeRoute === 'social-leads' ? '' : 'page-hidden'}>
                <SocialLeadsPage
                  onTaskStatusChange={(status) => updateTaskStatus('social-leads', status)}
                />
              </div>
              {activeRoute !== 'maps-scout' && activeRoute !== 'social-leads' && (
                <div>{renderOtherRouteContent()}</div>
              )}
            </div>
          </main>
        </div>
      </div>

      {currentPage === 'settings' && <SettingsPage onBack={handleBackFromSettings} />}

      {renderUpdateBanner()}
    </>
  )
}

export default App
