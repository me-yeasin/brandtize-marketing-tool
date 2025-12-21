import { useEffect, useMemo, useState, type JSX } from 'react'
import { FiCpu, FiMail, FiMic, FiSearch, FiTarget, FiUser } from 'react-icons/fi'
import { SettingsTabs } from './settings/components/SettingsTabs'
import { StrategyTab } from './settings/components/StrategyTab'

import { AiProviderTab } from './settings/components/AiProviderTab'
import { EmailTab } from './settings/components/EmailTab'
import { ProfileTab } from './settings/components/ProfileTab'
import { SearchApiTab } from './settings/components/SearchApiTab'
import { VoiceTab } from './settings/components/VoiceTab'
import { DEFAULT_PROFILE, GOOGLE_MODELS, GROQ_MODELS, MISTRAL_MODELS } from './settings/constants'
import type {
  AgencyProfile,
  AiProvider,
  GoogleMode,
  MessageState,
  SettingsTab
} from './settings/types'
import { isProfileComplete } from './settings/utils'

const MESSAGE_TIMEOUT = 3000

function SettingsScreen(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [groqKey, setGroqKey] = useState('')
  const [mistralKey, setMistralKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [jinaKey, setJinaKey] = useState('')
  const [selectedModel, setSelectedModel] = useState(GROQ_MODELS[0]?.id ?? '')
  const [selectedMistralModel, setSelectedMistralModel] = useState(MISTRAL_MODELS[0]?.id ?? '')
  const [selectedGoogleModel, setSelectedGoogleModel] = useState(GOOGLE_MODELS[0]?.id ?? '')
  const [selectedGoogleMode, setSelectedGoogleMode] = useState<GoogleMode>('aiStudio')
  const [googleProjectId, setGoogleProjectId] = useState('')
  const [googleLocation, setGoogleLocation] = useState('us-central1')
  const [hasGroqKey, setHasGroqKey] = useState(false)
  const [hasMistralKey, setHasMistralKey] = useState(false)
  const [hasGoogleKey, setHasGoogleKey] = useState(false)
  const [hasSerperKey, setHasSerperKey] = useState(false)
  const [hasHunterKey, setHasHunterKey] = useState(false)
  const [hasJinaKey, setHasJinaKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('groq')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const [profile, setProfile] = useState<AgencyProfile>(DEFAULT_PROFILE)
  const [hasProfile, setHasProfile] = useState(false)
  const [multiKeys, setMultiKeys] = useState<{
    serper: { key: string; userId?: string; label?: string }[]
    jina: { key: string; userId?: string; label?: string }[]
    hunter: { key: string; userId?: string; label?: string }[]
    reoon: { key: string; userId?: string; label?: string }[]
    snov: { key: string; userId?: string; label?: string }[]
  }>({
    serper: [],
    jina: [],
    hunter: [],
    reoon: [],
    snov: []
  })
  const [aiProviderMultiKeys, setAiProviderMultiKeys] = useState<{
    groq: { key: string; label?: string }[]
    mistral: { key: string; label?: string }[]
    google: { key: string; label?: string }[]
  }>({
    groq: [],
    mistral: [],
    google: []
  })

  useEffect(() => {
    window.api.getApiKeys().then((keys) => {
      setGroqKey(keys.groqApiKey)
      setMistralKey(keys.mistralApiKey)
      setGoogleKey(keys.googleApiKey)
      setSerperKey(keys.serperApiKey)
      setJinaKey(keys.jinaApiKey)
      setHasGroqKey(keys.hasGroqKey)
      setHasMistralKey(keys.hasMistralKey)
      setHasGoogleKey(keys.hasGoogleKey)
      setHasSerperKey(keys.hasSerperKey)
      setHasHunterKey(keys.hasHunterKey)
      setHasJinaKey(keys.hasJinaKey)
    })

    // Fetch multi-keys
    window.api.getMultiKeys().then((keys) => {
      setMultiKeys(keys)
    })

    // Fetch AI provider multi-keys
    window.api.getAiProviderMultiKeys().then((keys) => {
      setAiProviderMultiKeys(keys)
    })

    window.api.getSelectedAiProvider().then((provider: AiProvider) => {
      setSelectedProvider(provider)
      window.api.getSelectedModel().then((model: string) => {
        if (provider === 'mistral') {
          setSelectedMistralModel(model)
        } else if (provider === 'google') {
          setSelectedGoogleModel(model)
        } else {
          setSelectedModel(model)
        }
      })
    })

    window.api.getSelectedGoogleMode().then((mode: GoogleMode) => {
      setSelectedGoogleMode(mode)
    })

    window.api.getGoogleProjectId().then((projectId: string) => {
      setGoogleProjectId(projectId)
    })

    window.api.getGoogleLocation().then((location: string) => {
      setGoogleLocation(location)
    })

    window.api.getProfile().then((p) => {
      setProfile(p)
      setHasProfile(isProfileComplete(p))
    })
  }, [])

  const scheduleMessage = (value: MessageState): void => {
    setMessage(value)
    if (value) {
      setTimeout(() => setMessage(null), MESSAGE_TIMEOUT)
    }
  }

  const saveGroqKey = async (): Promise<void> => {
    if (!groqKey.trim()) return
    setSaving(true)
    try {
      await window.api.setGroqApiKey(groqKey.trim())
      setHasGroqKey(true)
      setGroqKey('')
      scheduleMessage({ type: 'success', text: 'Groq API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Groq API key' })
    }
    setSaving(false)
  }

  const saveMistralKey = async (): Promise<void> => {
    if (!mistralKey.trim()) return
    setSaving(true)
    try {
      await window.api.setMistralApiKey(mistralKey.trim())
      setHasMistralKey(true)
      setMistralKey('')
      scheduleMessage({ type: 'success', text: 'Mistral API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Mistral API key' })
    }
    setSaving(false)
  }

  const saveGoogleKey = async (): Promise<void> => {
    if (!googleKey.trim()) return
    setSaving(true)
    try {
      await window.api.setGoogleApiKey(googleKey.trim())
      setHasGoogleKey(true)
      setGoogleKey('')
      scheduleMessage({ type: 'success', text: 'Google API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Google API key' })
    }
    setSaving(false)
  }

  const saveSerperKey = async (): Promise<void> => {
    if (!serperKey.trim()) return
    setSaving(true)
    try {
      await window.api.setSerperApiKey(serperKey.trim())
      setHasSerperKey(true)
      setSerperKey('')
      scheduleMessage({ type: 'success', text: 'Serper API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Serper API key' })
    }
    setSaving(false)
  }

  const saveJinaKey = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setJinaApiKey(jinaKey)
      const keys = await window.api.getApiKeys()
      setJinaKey(keys.jinaApiKey)
      setHasJinaKey(keys.hasJinaKey)
    } catch (error) {
      console.error('Failed to save Jina API key:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveMultiKeys = async (
    service: string,
    keys: { key: string; userId?: string; label?: string }[]
  ): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setMultiKeys(service, keys)
      const updatedKeys = await window.api.getMultiKeys()
      setMultiKeys(updatedKeys)
    } catch (error) {
      console.error(`Failed to save ${service} multi-keys:`, error)
    } finally {
      setSaving(false)
    }
  }

  const saveAiProviderMultiKeys = async (
    provider: string,
    keys: { key: string; label?: string }[]
  ): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setAiProviderMultiKeys(provider, keys)
      const updatedKeys = await window.api.getAiProviderMultiKeys()
      setAiProviderMultiKeys(updatedKeys)
      scheduleMessage({
        type: 'success',
        text: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API keys saved!`
      })
    } catch (error) {
      console.error(`Failed to save ${provider} multi-keys:`, error)
      scheduleMessage({ type: 'error', text: `Failed to save ${provider} API keys` })
    } finally {
      setSaving(false)
    }
  }

  const switchProvider = async (provider: AiProvider): Promise<void> => {
    setSelectedProvider(provider)
    await window.api.setSelectedAiProvider(provider)
    const providerNames: Record<AiProvider, string> = {
      groq: 'Groq',
      mistral: 'Mistral',
      google: 'Google'
    }
    scheduleMessage({
      type: 'success',
      text: `Switched to ${providerNames[provider]} AI provider!`
    })
  }

  const saveProfile = async (): Promise<void> => {
    if (!isProfileComplete(profile)) {
      scheduleMessage({
        type: 'error',
        text: 'Please select profile type, enter your name, and add at least one service before saving.'
      })
      return
    }

    setSaving(true)
    try {
      await window.api.setProfile(profile)
      setHasProfile(isProfileComplete(profile))
      scheduleMessage({ type: 'success', text: 'Profile saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save profile' })
    }
    setSaving(false)
  }

  const handleSelectGroqModel = async (model: string): Promise<void> => {
    setSelectedModel(model)
    if (selectedProvider === 'groq') {
      await window.api.setSelectedModel(model)
      scheduleMessage({ type: 'success', text: 'Model updated successfully!' })
    }
  }

  const handleSelectMistralModel = async (model: string): Promise<void> => {
    setSelectedMistralModel(model)
    if (selectedProvider === 'mistral') {
      await window.api.setSelectedModel(model)
      scheduleMessage({ type: 'success', text: 'Model updated successfully!' })
    }
  }

  const handleSelectGoogleModel = async (model: string): Promise<void> => {
    setSelectedGoogleModel(model)
    if (selectedProvider === 'google') {
      await window.api.setSelectedModel(model)
      scheduleMessage({ type: 'success', text: 'Model updated successfully!' })
    }
  }

  const handleSelectGoogleMode = async (mode: GoogleMode): Promise<void> => {
    setSelectedGoogleMode(mode)
    await window.api.setSelectedGoogleMode(mode)
    scheduleMessage({
      type: 'success',
      text: `Switched to ${mode === 'aiStudio' ? 'AI Studio' : 'Vertex AI'} mode!`
    })
  }

  const saveVertexConfig = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setGoogleProjectId(googleProjectId)
      await window.api.setGoogleLocation(googleLocation)
      scheduleMessage({ type: 'success', text: 'Vertex AI configuration saved!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Vertex AI configuration' })
    }
    setSaving(false)
  }

  const tabs = useMemo(
    () => [
      { id: 'profile' as const, label: 'Agency Profile', icon: <FiUser size={16} /> },
      { id: 'strategy' as const, label: 'Strategy Playbook', icon: <FiTarget size={16} /> },
      { id: 'voice' as const, label: 'My Voice', icon: <FiMic size={16} /> },
      { id: 'ai-provider' as const, label: 'AI Provider', icon: <FiCpu size={16} /> },
      { id: 'search-api' as const, label: 'Web Search', icon: <FiSearch size={16} /> },
      { id: 'email' as const, label: 'Email', icon: <FiMail size={16} /> }
    ],
    []
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface/20 px-6 py-4">
        <h1 className="text-xl font-semibold text-text-main">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Configure API keys and model preferences</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border bg-surface/10 p-4">
          <SettingsTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            items={tabs}
            statuses={{
              profile: hasProfile,
              aiProvider: hasGroqKey || hasMistralKey || hasGoogleKey,
              searchApi: hasSerperKey || hasJinaKey,
              email: hasHunterKey || multiKeys.reoon.length > 0
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {message && (
            <div
              className={[
                'mb-6 rounded-md px-4 py-3 text-sm',
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              ].join(' ')}
            >
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              onProfileChange={setProfile}
              onSaveProfile={saveProfile}
              saving={saving}
              hasProfile={hasProfile}
            />
          )}

          {activeTab === 'ai-provider' && (
            <AiProviderTab
              selectedProvider={selectedProvider}
              hasGroqKey={hasGroqKey}
              hasMistralKey={hasMistralKey}
              hasGoogleKey={hasGoogleKey}
              groqKey={groqKey}
              mistralKey={mistralKey}
              googleKey={googleKey}
              selectedModel={selectedModel}
              selectedMistralModel={selectedMistralModel}
              selectedGoogleModel={selectedGoogleModel}
              selectedGoogleMode={selectedGoogleMode}
              googleProjectId={googleProjectId}
              googleLocation={googleLocation}
              saving={saving}
              onGroqKeyChange={setGroqKey}
              onMistralKeyChange={setMistralKey}
              onGoogleKeyChange={setGoogleKey}
              onSaveGroqKey={saveGroqKey}
              onSaveMistralKey={saveMistralKey}
              onSaveGoogleKey={saveGoogleKey}
              onSwitchProvider={switchProvider}
              onSelectModel={handleSelectGroqModel}
              onSelectMistralModel={handleSelectMistralModel}
              onSelectGoogleModel={handleSelectGoogleModel}
              onSelectGoogleMode={handleSelectGoogleMode}
              onGoogleProjectIdChange={setGoogleProjectId}
              onGoogleLocationChange={setGoogleLocation}
              onSaveVertexConfig={saveVertexConfig}
              aiProviderMultiKeys={aiProviderMultiKeys}
              onSaveAiProviderMultiKeys={saveAiProviderMultiKeys}
            />
          )}

          {activeTab === 'search-api' && (
            <SearchApiTab
              serperKey={serperKey}
              jinaKey={jinaKey}
              hasSerperKey={hasSerperKey}
              hasJinaKey={hasJinaKey}
              saving={saving}
              onSerperKeyChange={setSerperKey}
              onJinaKeyChange={setJinaKey}
              onSaveSerperKey={saveSerperKey}
              onSaveJinaKey={saveJinaKey}
              multiKeys={multiKeys}
              onSaveMultiKeys={saveMultiKeys}
            />
          )}
          {activeTab === 'email' && (
            <EmailTab
              saving={saving}
              hunterKeys={multiKeys.hunter}
              snovKeys={multiKeys.snov}
              reoonKeys={multiKeys.reoon}
              onSaveHunterKeys={(keys) => saveMultiKeys('hunter', keys)}
              onSaveSnovKeys={(keys) => saveMultiKeys('snov', keys)}
              onSaveReoonKeys={(keys) => saveMultiKeys('reoon', keys)}
            />
          )}
          {activeTab === 'strategy' && <StrategyTab />}
          {activeTab === 'voice' && <VoiceTab />}
        </div>
      </div>
    </div>
  )
}

export { SettingsScreen }
