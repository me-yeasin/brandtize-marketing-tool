import { useEffect, useMemo, useState, type JSX } from 'react'
import { FiCpu, FiSearch, FiUser } from 'react-icons/fi'

import { SettingsTabs } from './settings/components/SettingsTabs'
import { AiProviderTab } from './settings/components/AiProviderTab'
import { ProfileTab } from './settings/components/ProfileTab'
import { SearchApiTab } from './settings/components/SearchApiTab'
import { DEFAULT_PROFILE, GROQ_MODELS, MISTRAL_MODELS, GOOGLE_MODELS } from './settings/constants'
import { isProfileComplete } from './settings/utils'
import type {
  AiProvider,
  GoogleMode,
  AgencyProfile,
  MessageState,
  SettingsTab
} from './settings/types'

const MESSAGE_TIMEOUT = 3000

function SettingsScreen(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [groqKey, setGroqKey] = useState('')
  const [mistralKey, setMistralKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [hunterKey, setHunterKey] = useState('')
  const [reoonKey, setReoonKey] = useState('')
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
  const [hasReoonKey, setHasReoonKey] = useState(false)
  const [hasJinaKey, setHasJinaKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('groq')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const [profile, setProfile] = useState<AgencyProfile>(DEFAULT_PROFILE)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    window.api.getApiKeys().then((keys) => {
      setHasGroqKey(keys.hasGroqKey)
      setHasMistralKey(keys.hasMistralKey)
      setHasGoogleKey(keys.hasGoogleKey)
      setHasSerperKey(keys.hasSerperKey)
      setHasHunterKey(keys.hasHunterKey)
      setHasReoonKey(keys.hasReoonKey)
      setHasJinaKey(keys.hasJinaKey)
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

  const saveHunterKey = async (): Promise<void> => {
    if (!hunterKey.trim()) return
    setSaving(true)
    try {
      await window.api.setHunterApiKey(hunterKey.trim())
      setHasHunterKey(true)
      setHunterKey('')
      scheduleMessage({ type: 'success', text: 'Hunter.io API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Hunter.io API key' })
    }
    setSaving(false)
  }

  const saveReoonKey = async (): Promise<void> => {
    if (!reoonKey.trim()) return
    setSaving(true)
    try {
      await window.api.setReoonApiKey(reoonKey.trim())
      setHasReoonKey(true)
      setReoonKey('')
      scheduleMessage({ type: 'success', text: 'Reoon API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Reoon API key' })
    }
    setSaving(false)
  }

  const saveJinaKey = async (): Promise<void> => {
    if (!jinaKey.trim()) return
    setSaving(true)
    try {
      await window.api.setJinaApiKey(jinaKey.trim())
      setHasJinaKey(true)
      setJinaKey('')
      scheduleMessage({ type: 'success', text: 'Jina API key saved successfully!' })
    } catch {
      scheduleMessage({ type: 'error', text: 'Failed to save Jina API key' })
    }
    setSaving(false)
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
      { id: 'ai-provider' as const, label: 'AI Provider', icon: <FiCpu size={16} /> },
      { id: 'search-api' as const, label: 'Web Search', icon: <FiSearch size={16} /> }
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
              searchApi: hasSerperKey
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
            />
          )}

          {activeTab === 'search-api' && (
            <SearchApiTab
              serperKey={serperKey}
              hunterKey={hunterKey}
              reoonKey={reoonKey}
              jinaKey={jinaKey}
              hasSerperKey={hasSerperKey}
              hasHunterKey={hasHunterKey}
              hasReoonKey={hasReoonKey}
              hasJinaKey={hasJinaKey}
              saving={saving}
              onSerperKeyChange={setSerperKey}
              onHunterKeyChange={setHunterKey}
              onReoonKeyChange={setReoonKey}
              onJinaKeyChange={setJinaKey}
              onSaveSerperKey={saveSerperKey}
              onSaveHunterKey={saveHunterKey}
              onSaveReoonKey={saveReoonKey}
              onSaveJinaKey={saveJinaKey}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export { SettingsScreen }
