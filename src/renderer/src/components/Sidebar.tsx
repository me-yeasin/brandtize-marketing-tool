import { JSX, useState } from 'react'
import {
  FaAddressBook,
  FaBug,
  FaChevronDown,
  FaEnvelope,
  FaLinkedin,
  FaPaperPlane,
  FaReddit,
  FaRobot,
  FaSave,
  FaSearchLocation,
  FaShareAlt,
  FaSignal,
  FaTelegramPlane,
  FaTwitter,
  FaWhatsapp
} from 'react-icons/fa'
import { TfiWrite } from 'react-icons/tfi'

// Navigation structure with parent-child relationships
interface NavChild {
  id: string
  label: string
  icon: JSX.Element
  children?: NavChild[]
}

interface NavGroup {
  id: string
  label: string
  icon: JSX.Element
  children: NavChild[]
}

const navigationGroups: NavGroup[] = [
  {
    id: 'direct-reach',
    label: 'Direct Reach',
    icon: <FaPaperPlane />,
    children: [
      {
        id: 'maps-scout',
        label: 'Maps Scout',
        icon: <FaSearchLocation />
      },

      {
        id: 'bug-hunter',
        label: 'Bug Hunter',
        icon: <FaBug />
      },
      {
        id: 'direct-contact',
        label: 'Direct Contact',
        icon: <FaAddressBook />
      },

      {
        id: 'social-leads',
        label: 'Social',
        icon: <FaShareAlt />
      },
      {
        id: 'automation',
        label: 'Automation',
        icon: <FaRobot />
      },
      {
        id: 'saved-leads',
        label: 'Saved Leads',
        icon: <FaSave />
      }
    ]
  },
  {
    id: 'social-signal',
    label: 'Social Signal',
    icon: <FaSignal />,
    children: [
      {
        id: 'x-monitor',
        label: 'X Monitor',
        icon: <FaTwitter />
      },
      {
        id: 'linkedin-pulse',
        label: 'LinkedIn Pulse',
        icon: <FaLinkedin />
      },
      {
        id: 'reddit-community',
        label: 'Reddit / Community',
        icon: <FaReddit />
      }
    ]
  },
  {
    id: 'ai-copywriter-group',
    label: 'AI Copywriter',
    icon: <TfiWrite />,
    children: [
      {
        id: 'ai-copywriter-mail',
        label: 'Mail',
        icon: <FaEnvelope className="text-xs" />
      },
      {
        id: 'ai-copywriter-whatsapp',
        label: 'WhatsApp',
        icon: <FaWhatsapp className="text-xs" />
      },
      {
        id: 'ai-copywriter-telegram',
        label: 'Telegram',
        icon: <FaTelegramPlane className="text-xs" />
      }
    ]
  }
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeRoute: string
  onRouteChange: (route: string) => void
  onOpenSettings: () => void
  taskStatusByRoute?: Record<string, 'idle' | 'running' | 'completed'>
}

function Sidebar({
  isOpen,
  onToggle,
  activeRoute,
  onRouteChange,
  onOpenSettings,
  taskStatusByRoute
}: SidebarProps): JSX.Element {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'direct-reach': true, // Default expanded
    'social-signal': false,
    'ai-copywriter-group': true
  })

  const toggleGroup = (groupId: string): void => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const handleChildClick = (childId: string): void => {
    onRouteChange(childId)
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="text-white text-lg font-medium">BRANDTIZE</span>
        </div>
        <button className="sidebar-close-btn" onClick={onToggle} title="Close Sidebar">
          <FaChevronDown className="rotate-90" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {navigationGroups.map((group) => (
          <div key={group.id} className="nav-group">
            {/* Parent Button */}
            <button
              className={`nav-parent ${expandedGroups[group.id] ? 'expanded' : ''}`}
              onClick={() => toggleGroup(group.id)}
            >
              <span className="nav-parent-icon">{group.icon}</span>
              <span className="nav-parent-label">{group.label}</span>
              <span className="nav-parent-arrow">
                <FaChevronDown size={14} />
              </span>
            </button>

            {/* Children */}
            <div className={`nav-children ${expandedGroups[group.id] ? 'expanded' : ''}`}>
              {group.children.map((child) => (
                <div key={child.id}>
                  <button
                    className={`nav-child ${activeRoute === child.id ? 'active' : ''}`}
                    onClick={() => {
                      if (child.children) {
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [child.id]: !prev[child.id]
                        }))
                      } else {
                        handleChildClick(child.id)
                      }
                    }}
                  >
                    <span className="nav-child-icon">{child.icon}</span>
                    <span className="nav-child-label flex-1 text-left">{child.label}</span>
                    {taskStatusByRoute?.[child.id] &&
                      taskStatusByRoute[child.id] !== 'idle' &&
                      !child.children && (
                        <span className={`nav-task-indicator ${taskStatusByRoute[child.id]}`} />
                      )}
                    {child.children && (
                      <span
                        className={`nav-child-arrow transition-transform ${expandedGroups[child.id] ? 'rotate-180' : ''}`}
                      >
                        <FaChevronDown size={12} />
                      </span>
                    )}
                  </button>

                  {/* Nested Children (Grandchildren) */}
                  {child.children && (
                    <div
                      className={`nav-grandchildren pl-4 overflow-hidden transition-all duration-300 ${expandedGroups[child.id] ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      {child.children.map((grandchild) => (
                        <button
                          key={grandchild.id}
                          className={`nav-child ${activeRoute === grandchild.id ? 'active' : ''}`}
                          onClick={() => handleChildClick(grandchild.id)}
                        >
                          <span className="nav-child-icon">{grandchild.icon}</span>
                          <span className="nav-child-label">{grandchild.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button className="nav-footer-btn" onClick={onOpenSettings}>
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
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
