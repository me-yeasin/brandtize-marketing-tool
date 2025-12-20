import { useState } from 'react'

import { IconSidebar, type TabId } from '../components/sidebar/IconSidebar'
import { EmailScreen } from './EmailScreen'
import { TemplatesScreen } from './TemplatesScreen'
import { ResultsScreen } from './ResultsScreen'
import { SettingsScreen } from './SettingsScreen'

function HomeScreen(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('email')

  const renderScreen = (): React.JSX.Element => {
    switch (activeTab) {
      case 'email':
        return <EmailScreen />
      case 'templates':
        return <TemplatesScreen />
      case 'results':
        return <ResultsScreen />
      case 'settings':
        return <SettingsScreen />
      default:
        return <EmailScreen />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-main">
      <IconSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 min-h-0 overflow-y-auto">{renderScreen()}</main>
    </div>
  )
}

export { HomeScreen }
