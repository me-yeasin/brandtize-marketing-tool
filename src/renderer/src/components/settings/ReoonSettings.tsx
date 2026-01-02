import { JSX, useEffect, useState } from 'react'
import { FaGlobe } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function ReoonSettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [keyCooldowns, setKeyCooldowns] = useState<
    Record<string, { rateLimitedAt: number; resetAt: number }>
  >({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getReoonApiKey()
        const keys = await window.api.getReoonApiKeys()
        const cooldowns = await window.api.getApiKeyCooldowns('reoon')
        setApiKey(key || '')
        setMultiKeys(keys || [])
        setKeyCooldowns(cooldowns || {})
      } catch (error) {
        console.error('Failed to load Reoon keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setReoonApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setReoonApiKeys(keys)
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
        <h2>Reoon API Settings</h2>
        <p>Configure your Reoon API for email verification</p>
      </div>

      <ApiKeyCard
        title="Reoon"
        description="Email verification and validation service"
        icon={<FaGlobe size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
        keyCooldowns={keyCooldowns}
      />

      <div className="settings-info-box">
        <h4>How to get your Reoon API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://reoon.com" target="_blank" rel="noreferrer">
              reoon.com
            </a>
          </li>
          <li>Create an account</li>
          <li>Navigate to API section</li>
          <li>Generate and copy your API key</li>
        </ol>
      </div>
    </div>
  )
}

export default ReoonSettings
