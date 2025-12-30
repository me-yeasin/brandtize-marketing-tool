import { JSX, useEffect, useState } from 'react'
import { FaCloud } from 'react-icons/fa'
import ApiKeyCard from './ApiKeyCard'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

function MistralSettings(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [multiKeys, setMultiKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadKeys = async (): Promise<void> => {
      try {
        const key = await window.api.getMistralApiKey()
        const keys = await window.api.getMistralApiKeys()
        setApiKey(key || '')
        setMultiKeys(keys || [])
      } catch (error) {
        console.error('Failed to load Mistral keys:', error)
      }
      setIsLoading(false)
    }
    loadKeys()
  }, [])

  const handleSaveKey = async (key: string): Promise<boolean> => {
    const result = await window.api.setMistralApiKey(key)
    setApiKey(key)
    return result
  }

  const handleSaveMultiKeys = async (keys: ApiKeyEntry[]): Promise<boolean> => {
    const result = await window.api.setMistralApiKeys(keys)
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
        <h2>Mistral API Settings</h2>
        <p>Configure your Mistral AI API key</p>
      </div>

      <ApiKeyCard
        title="Mistral AI"
        description="Efficient and powerful open-weight models from Mistral"
        icon={<FaCloud size={24} />}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        multiKeys={multiKeys}
        onSaveMultiKeys={handleSaveMultiKeys}
      />

      <div className="settings-info-box">
        <h4>How to get your Mistral API key:</h4>
        <ol>
          <li>
            Visit{' '}
            <a href="https://console.mistral.ai" target="_blank" rel="noreferrer">
              console.mistral.ai
            </a>
          </li>
          <li>Create an account or sign in</li>
          <li>Go to API Keys section</li>
          <li>Generate a new key and copy it here</li>
        </ol>
      </div>
    </div>
  )
}

export default MistralSettings
