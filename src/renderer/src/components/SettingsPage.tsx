import { JSX, useState } from 'react'
import {
  FaArrowLeft,
  FaBolt,
  FaBuilding,
  FaBullhorn,
  FaChevronRight,
  FaCloud,
  FaDatabase,
  FaGlobe,
  FaKey,
  FaMicrochip,
  FaNetworkWired,
  FaRobot,
  FaSearch,
  FaUserCircle
} from 'react-icons/fa'
import {
  AIHubSettings,
  ApifySettings,
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
    icon: <FaRobot />,
    children: [
      {
        id: 'ai-hub',
        label: 'AI Hub',
        icon: <FaMicrochip />
      },
      {
        id: 'groq',
        label: 'Groq',
        icon: <FaBolt />
      },
      {
        id: 'gemini',
        label: 'Gemini',
        icon: <FaNetworkWired />
      },
      {
        id: 'mistral',
        label: 'Mistral',
        icon: <FaCloud />
      }
    ]
  },
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: <FaKey />,
    children: [
      {
        id: 'serper',
        label: 'Serper API',
        icon: <FaSearch />
      },
      {
        id: 'jina',
        label: 'Jina Reader',
        icon: <FaDatabase />
      },
      {
        id: 'hunter',
        label: 'Hunter.io',
        icon: <FaSearch />
      },
      {
        id: 'reoon',
        label: 'Reoon API',
        icon: <FaGlobe />
      },
      {
        id: 'snov',
        label: 'Snov.io',
        icon: <FaBullhorn />
      },
      {
        id: 'apify',
        label: 'Apify',
        icon: <FaDatabase />
      }
    ]
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <FaUserCircle />,
    children: [
      {
        id: 'agency-profile',
        label: 'Agency Profile',
        icon: <FaBuilding />
      },
      {
        id: 'voice-profile',
        label: 'Voice Profile',
        icon: <FaBullhorn />
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
            <FaArrowLeft size={18} />
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
                  <FaChevronRight size={14} />
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
        {activeSettingsRoute === 'apify' && <ApifySettings />}
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
