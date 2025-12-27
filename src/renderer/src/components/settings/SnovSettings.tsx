import { JSX, useEffect, useState } from 'react'
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const credentials = await window.api.getSnovCredentials()
        const keys = await window.api.getSnovApiKeys()
        setClientId(credentials.clientId || '')
        setClientSecret(credentials.clientSecret || '')
        setMultiKeys(keys || [])
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
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
        }
        apiKey={clientId}
        onSaveKey={handleSaveKey}
        hasSecondField={true}
        secondFieldLabel="Client Secret"
        secondFieldValue={clientSecret}
        onSaveSecondField={handleSaveSecondField}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
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
