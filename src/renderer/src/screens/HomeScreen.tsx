import { useState } from 'react'

import { IconSidebar, type TabId } from '../components/sidebar/IconSidebar'
import { EmailScreen } from './EmailScreen'
import { SettingsScreen } from './SettingsScreen'

function HomeScreen(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('email')

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-main">
      <IconSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'email' ? <EmailScreen /> : <SettingsScreen />}
      </main>
    </div>
  )
}

export { HomeScreen }
