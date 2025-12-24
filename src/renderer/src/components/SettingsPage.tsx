import { JSX, useState } from 'react'
import {
  AIHubSettings,
  GeminiSettings,
  GroqSettings,
  HunterSettings,
  JinaSettings,
  MistralSettings,
  ReoonSettings,
  SerperSettings,
  SnovSettings
} from './settings'

// Settings navigation structure with parent-child relationships
interface SettingsNavChild {
  id: string
  label: string
  icon: JSX.Element
}

interface SettingsNavGroup {
  id: string
  label: string
  icon: JSX.Element
  children: SettingsNavChild[]
}

const settingsNavigationGroups: SettingsNavGroup[] = [
  {
    id: 'ai-providers',
    label: 'AI Providers',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
        <circle cx="7.5" cy="14.5" r="1.5"></circle>
        <circle cx="16.5" cy="14.5" r="1.5"></circle>
      </svg>
    ),
    children: [
      {
        id: 'ai-hub',
        label: 'AI Hub',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
          </svg>
        )
      },
      {
        id: 'groq',
        label: 'Groq',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
        )
      },
      {
        id: 'gemini',
        label: 'Gemini',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
          </svg>
        )
      },
      {
        id: 'mistral',
        label: 'Mistral',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
          </svg>
        )
      }
    ]
  },
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
      </svg>
    ),
    children: [
      {
        id: 'serper',
        label: 'Serper API',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        )
      },
      {
        id: 'jina',
        label: 'Jina Reader',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        )
      },
      {
        id: 'hunter',
        label: 'Hunter.io',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        )
      },
      {
        id: 'reoon',
        label: 'Reoon API',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        )
      },
      {
        id: 'snov',
        label: 'Snov.io',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
        )
      }
    ]
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
    children: [
      {
        id: 'agency-profile',
        label: 'Agency Profile',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        )
      },
      {
        id: 'voice-profile',
        label: 'Voice Profile',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
        )
      }
    ]
  }
]

interface SettingsPageProps {
  onBack: () => void
}

function SettingsPage({ onBack }: SettingsPageProps): JSX.Element {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'ai-providers': true, // Default expanded
    'api-keys': false,
    profile: false
  })
  const [activeSettingsRoute, setActiveSettingsRoute] = useState('ai-hub')

  const toggleGroup = (groupId: string): void => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const handleChildClick = (childId: string): void => {
    setActiveSettingsRoute(childId)
  }

  return (
    <div className="settings-page">
      {/* Settings Sidebar */}
      <aside className="settings-sidebar">
        {/* Settings Header with Back Button */}
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack} title="Back to Main">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5"></path>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <span className="settings-title">SETTINGS</span>
        </div>

        {/* Settings Navigation Groups */}
        <nav className="sidebar-nav">
          {settingsNavigationGroups.map((group) => (
            <div key={group.id} className="nav-group">
              {/* Parent Button */}
              <button
                className={`nav-parent ${expandedGroups[group.id] ? 'expanded' : ''}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="nav-parent-icon">{group.icon}</span>
                <span className="nav-parent-label">{group.label}</span>
                <span className="nav-parent-arrow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </button>

              {/* Children */}
              <div className={`nav-children ${expandedGroups[group.id] ? 'expanded' : ''}`}>
                {group.children.map((child) => (
                  <button
                    key={child.id}
                    className={`nav-child ${activeSettingsRoute === child.id ? 'active' : ''}`}
                    onClick={() => handleChildClick(child.id)}
                  >
                    <span className="nav-child-icon">{child.icon}</span>
                    <span className="nav-child-label">{child.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Settings Content Area */}
      <main className="settings-content">
        {activeSettingsRoute === 'ai-hub' && <AIHubSettings />}
        {activeSettingsRoute === 'groq' && <GroqSettings />}
        {activeSettingsRoute === 'gemini' && <GeminiSettings />}
        {activeSettingsRoute === 'mistral' && <MistralSettings />}
        {activeSettingsRoute === 'serper' && <SerperSettings />}
        {activeSettingsRoute === 'jina' && <JinaSettings />}
        {activeSettingsRoute === 'hunter' && <HunterSettings />}
        {activeSettingsRoute === 'reoon' && <ReoonSettings />}
        {activeSettingsRoute === 'snov' && <SnovSettings />}
        {(activeSettingsRoute === 'agency-profile' || activeSettingsRoute === 'voice-profile') && (
          <div className="settings-content-inner">
            <h1>Coming Soon</h1>
            <p>This settings section is under development</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default SettingsPage
