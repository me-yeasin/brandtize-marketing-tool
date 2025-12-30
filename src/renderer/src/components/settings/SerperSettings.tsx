import { JSX, useEffect, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function SerperSettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getSerperApiKey()
        const keys = await window.api.getSerperApiKeys()
        setApiKey(key || '')
        setMultiKeys(keys || [])
      } catch (error) {
        console.error('Failed to load Serper keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setSerperApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setSerperApiKeys(keys)
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
        <h2>Serper API Settings</h2>
        <p>Configure your Serper API for Google search capabilities</p>
      </div>

      <ApiKeyCard
        title="Serper"
        description="Fast and affordable Google Search API"
        icon={<FaSearch size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
      />

      <div className="settings-info-box">
        <h4>How to get your Serper API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://serper.dev" target="_blank" rel="noreferrer">
              serper.dev
            </a>
          </li>
          <li>Sign up for an account</li>
          <li>Go to your dashboard</li>
          <li>Copy your API key</li>
        </ol>
      </div>
    </div>
  )
}

export default SerperSettings
