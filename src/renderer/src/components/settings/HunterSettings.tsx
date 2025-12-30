import { JSX, useEffect, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function HunterSettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getHunterApiKey()
        const keys = await window.api.getHunterApiKeys()
        setApiKey(key || '')
        setMultiKeys(keys || [])
      } catch (error) {
        console.error('Failed to load Hunter keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setHunterApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setHunterApiKeys(keys)
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
        <h2>Hunter.io API Settings</h2>
        <p>Configure your Hunter.io API for email finding</p>
      </div>

      <ApiKeyCard
        title="Hunter.io"
        description="Find professional email addresses in seconds"
        icon={<FaSearch size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
      />

      <div className="settings-info-box">
        <h4>How to get your Hunter.io API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://hunter.io" target="_blank" rel="noreferrer">
              hunter.io
            </a>
          </li>
          <li>Sign up for an account (free tier available)</li>
          <li>Go to API section in your dashboard</li>
          <li>Copy your API key</li>
        </ol>
      </div>
    </div>
  )
}

export default HunterSettings
