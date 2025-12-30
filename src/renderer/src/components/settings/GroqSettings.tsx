import { JSX, useEffect, useState } from 'react'
import { FaBolt } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function GroqSettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getGroqApiKey()
        const keys = await window.api.getGroqApiKeys()
        setApiKey(key || '')
        setMultiKeys(keys || [])
      } catch (error) {
        console.error('Failed to load Groq keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setGroqApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setGroqApiKeys(keys)
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
        <h2>Groq API Settings</h2>
        <p>Configure your Groq API key for fast AI inference</p>
      </div>

      <ApiKeyCard
        title="Groq"
        description="Ultra-fast LLM inference with Llama, Mixtral, and more"
        icon={<FaBolt size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
      />

      <div className="settings-info-box">
        <h4>How to get your Groq API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer">
              console.groq.com
            </a>
          </li>
          <li>Sign up or log in to your account</li>
          <li>Navigate to API Keys section</li>
          <li>Create a new API key and copy it here</li>
        </ol>
      </div>
    </div>
  )
}

export default GroqSettings
