import { JSX, useEffect, useState } from 'react'
import { FaDatabase } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function ApifySettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getApifyApiKey()
        const keys = await window.api.getApifyApiKeys()
        setApiKey(key || '')
        setMultiKeys(keys || [])
      } catch (error) {
        console.error('Failed to load Apify keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setApifyApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setApifyApiKeys(keys)
    setMultiKeys(keys)
    return result
  }

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2>Apify API Settings</h2>
        <p>Configure your Apify API key for Facebook page scraping</p>
      </div>

      <ApiKeyCard
        title="Apify"
        description="Web scraping and automation platform for Facebook data"
        icon={<FaDatabase size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
      />

      <div className="settings-info-box">
        <h4>How to get your Apify API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://console.apify.com/sign-up" target="_blank" rel="noreferrer">
              console.apify.com
            </a>
          </li>
          <li>Sign up for a free account (includes $5 monthly credits)</li>
          <li>
            Go to{' '}
            <a
              href="https://console.apify.com/account/integrations"
              target="_blank"
              rel="noreferrer"
            >
              Settings → Integrations
            </a>
          </li>
          <li>Copy your Personal API Token</li>
        </ol>
        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
          💡 <strong>Tip:</strong> Scraping 100 Facebook pages costs approximately $1.00. The free
          tier includes $5/month, which is enough for ~500 pages.
        </p>
      </div>
    </div>
  )
}

export default ApifySettings
