import { JSX, useEffect, useState } from 'react'
import { FaNetworkWired } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function GeminiSettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getGoogleApiKey()
        const keys = await window.api.getGoogleApiKeys()
        setApiKey(key || '')
        setMultiKeys(keys || [])
      } catch (error) {
        console.error('Failed to load Google keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setGoogleApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setGoogleApiKeys(keys)
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
        <h2>Gemini API Settings</h2>
        <p>Configure your Google Gemini API key for AI capabilities</p>
      </div>

      <ApiKeyCard
        title="Google Gemini"
        description="Google's most capable AI model with multimodal abilities"
        icon={<FaNetworkWired size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
      />

      <div className="settings-info-box">
        <h4>How to get your Gemini API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              Google AI Studio
            </a>
          </li>
          <li>Sign in with your Google account</li>
          <li>Click &quot;Create API key&quot;</li>
          <li>Copy the key and paste it here</li>
        </ol>
      </div>
    </div>
  )
}

export default GeminiSettings
