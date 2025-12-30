import { JSX, useEffect, useState } from 'react'
import { FaBolt, FaCheck, FaCloud, FaNetworkWired } from 'react-icons/fa'

type AiProvider = 'groq' | 'mistral' | 'google'

interface ProviderInfo {
  id: AiProvider
  name: string
  displayName: string
  description: string
  icon: JSX.Element
}

const providers: ProviderInfo[] = [
  {
    id: 'groq',
    name: 'groq',
    displayName: 'Groq',
    description: 'Ultra-fast LLM inference with Llama, Mixtral, and more. Best for speed.',
    icon: <FaBolt size={32} />
  },
  {
    id: 'google',
    name: 'gemini',
    displayName: 'Gemini',
    description: "Google's most capable AI model with multimodal abilities.",
    icon: <FaNetworkWired size={32} />
  },
  {
    id: 'mistral',
    name: 'mistral',
    displayName: 'Mistral',
    description: 'Efficient and powerful open-weight models from Mistral AI.',
    icon: <FaCloud size={32} />
  }
]

function AIHubSettings(): JSX.Element {
  const [activeProvider, setActiveProvider] = useState<AiProvider>('groq')
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({
    groq: false,
    google: false,
    mistral: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Load active provider
        const provider = await window.api.getSelectedAiProvider()
        setActiveProvider(provider)

        // Check which providers have API keys configured
        const allKeys = await window.api.getApiKeys()
        setApiKeyStatus({
          groq: Boolean(allKeys.groqApiKey),
          google: Boolean(allKeys.googleApiKey),
          mistral: Boolean(allKeys.mistralApiKey)
        })
      } catch (error) {
        console.error('Failed to load AI Hub settings:', error)
      }
      setIsLoading(false)
    }
    loadData()
  }, [])

  const handleActivate = async (providerId: AiProvider): Promise<void> => {
    setIsSaving(true)
    try {
      await window.api.setSelectedAiProvider(providerId)
      setActiveProvider(providerId)
    } catch (error) {
      console.error('Failed to set active provider:', error)
    }
    setIsSaving(false)
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
        <h2>AI Hub</h2>
        <p>Select which AI provider to use for all AI operations</p>
      </div>

      <div className="provider-grid">
        {providers.map((provider) => {
          const isActive = activeProvider === provider.id
          const isConfigured = apiKeyStatus[provider.id]

          return (
            <div
              key={provider.id}
              className={`provider-card ${isActive ? 'active' : ''} ${!isConfigured ? 'not-configured' : ''}`}
            >
              <div className="provider-card-icon">{provider.icon}</div>

              <div className="provider-card-content">
                <h3>{provider.displayName}</h3>
                <p>{provider.description}</p>
              </div>

              <div className="provider-card-status">
                {isConfigured ? (
                  <span className="status-badge configured">✓ Configured</span>
                ) : (
                  <span className="status-badge not-configured">⚠ Not Configured</span>
                )}
              </div>

              <div className="provider-card-action">
                {isActive ? (
                  <button className="provider-btn active" disabled>
                    <FaCheck />
                    Active
                  </button>
                ) : isConfigured ? (
                  <button
                    className="provider-btn activate"
                    onClick={() => handleActivate(provider.id)}
                    disabled={isSaving}
                  >
                    Activate
                  </button>
                ) : (
                  <button className="provider-btn setup" disabled>
                    Set Up Keys First
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="settings-info-box" style={{ marginTop: '1.5rem' }}>
        <h4>About AI Provider Selection</h4>
        <p style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>
          The active AI provider will be used for all AI operations including:
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
          <li>Lead analysis and qualification</li>
          <li>Content generation and email drafting</li>
          <li>Data extraction from websites</li>
          <li>Any other AI-powered features</li>
        </ul>
        <p
          className="info-note"
          style={{ marginTop: '1rem', marginBottom: 0, background: 'rgba(99, 102, 241, 0.1)' }}
        >
          <strong>Tip:</strong> Configure your API keys in the individual provider tabs (Groq,
          Gemini, Mistral) before activating them here.
        </p>
      </div>
    </div>
  )
}

export default AIHubSettings
