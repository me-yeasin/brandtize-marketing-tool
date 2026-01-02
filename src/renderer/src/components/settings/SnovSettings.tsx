import { JSX, useEffect, useState } from 'react'
import { FaBullhorn } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function SnovSettings(): JSX.Element {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [keyCooldowns, setKeyCooldowns] = useState<
    Record<string, { rateLimitedAt: number; resetAt: number }>
  >({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const credentials = await window.api.getSnovCredentials()
        const keys = await window.api.getSnovApiKeys()
        const cooldowns = await window.api.getApiKeyCooldowns('snov')
        setClientId(credentials.clientId || '')
        setClientSecret(credentials.clientSecret || '')
        setMultiKeys(keys || [])
        setKeyCooldowns(cooldowns || {})
      } catch (error) {
        console.error('Failed to load Snov keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    // For Snov, the "key" field is the Client ID
    const result = await window.api.setSnovClientId(key)
    setClientId(key)
    return result
  }

  const handleSaveSecondField = async (value: string): Promise<boolean> => {
    const result = await window.api.setSnovClientSecret(value)
    setClientSecret(value)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setSnovApiKeys(keys)
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
        <h2>Snov.io API Settings</h2>
        <p>Configure your Snov.io credentials for email finding</p>
      </div>

      <ApiKeyCard
        title="Snov.io"
        description="Email finder and outreach automation platform"
        icon={<FaBullhorn size={24} />}
        apiKey={clientId}
        onSaveKey={handleSaveKey}
        hasSecondField={true}
        secondFieldLabel="Client Secret"
        secondFieldValue={clientSecret}
        onSaveSecondField={handleSaveSecondField}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
        keyCooldowns={keyCooldowns}
      />

      <div className="settings-info-box">
        <h4>How to get your Snov.io credentials:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://snov.io" target="_blank" rel="noreferrer">
              snov.io
            </a>
          </li>
          <li>Sign up or log in to your account</li>
          <li>Go to Settings → API</li>
          <li>Copy both Client ID and Client Secret</li>
        </ol>
        <p className="info-note">
          <strong>Note:</strong> Snov.io requires both a Client ID and Client Secret for
          authentication.
        </p>
      </div>
    </div>
  )
}

export default SnovSettings
