import { JSX, useState } from 'react'

type TabType = 'mail' | 'whatsapp' | 'telegram'

interface AiCopywriterPageProps {
  initialTab?: TabType
}

function AiCopywriterPage({ initialTab = 'mail' }: AiCopywriterPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Update active tab when prop changes (from sidebar navigation)
  if (activeTab !== initialTab) {
    setActiveTab(initialTab)
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-6 text-white">
      {activeTab === 'mail' && <h1 className="text-2xl font-bold">Hello World Mail</h1>}
      {activeTab === 'whatsapp' && <h1 className="text-2xl font-bold">Hello World WhatsApp</h1>}
      {activeTab === 'telegram' && <h1 className="text-2xl font-bold">Hello World Telegram</h1>}
    </div>
  )
}

export default AiCopywriterPage
