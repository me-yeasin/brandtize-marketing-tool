import type React from 'react'
import { FiChevronDown, FiCpu, FiZap } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'

import { Button, Input } from '../../../components/ui'
import type { AiProvider, GoogleMode } from '../types'
import { GROQ_MODELS, MISTRAL_MODELS } from '../constants'
import { GoogleProviderCard } from './GoogleProviderCard'

interface AiProviderTabProps {
  selectedProvider: AiProvider
  hasGroqKey: boolean
  hasMistralKey: boolean
  hasGoogleKey: boolean
  groqKey: string
  mistralKey: string
  googleKey: string
  selectedModel: string
  selectedMistralModel: string
  selectedGoogleModel: string
  selectedGoogleMode: GoogleMode
  googleProjectId: string
  googleLocation: string
  saving: boolean
  onGroqKeyChange: (value: string) => void
  onMistralKeyChange: (value: string) => void
  onGoogleKeyChange: (value: string) => void
  onSaveGroqKey: () => Promise<void>
  onSaveMistralKey: () => Promise<void>
  onSaveGoogleKey: () => Promise<void>
  onSwitchProvider: (provider: AiProvider) => Promise<void>
  onSelectModel: (model: string) => Promise<void>
  onSelectMistralModel: (model: string) => Promise<void>
  onSelectGoogleModel: (model: string) => Promise<void>
  onSelectGoogleMode: (mode: GoogleMode) => Promise<void>
  onGoogleProjectIdChange: (value: string) => void
  onGoogleLocationChange: (value: string) => void
  onSaveVertexConfig: () => Promise<void>
}

function AiProviderTab({
  selectedProvider,
  hasGroqKey,
  hasMistralKey,
  hasGoogleKey,
  groqKey,
  mistralKey,
  googleKey,
  selectedModel,
  selectedMistralModel,
  selectedGoogleModel,
  selectedGoogleMode,
  googleProjectId,
  googleLocation,
  saving,
  onGroqKeyChange,
  onMistralKeyChange,
  onGoogleKeyChange,
  onSaveGroqKey,
  onSaveMistralKey,
  onSaveGoogleKey,
  onSwitchProvider,
  onSelectModel,
  onSelectMistralModel,
  onSelectGoogleModel,
  onSelectGoogleMode,
  onGoogleProjectIdChange,
  onGoogleLocationChange,
  onSaveVertexConfig
}: AiProviderTabProps): React.JSX.Element {
  return (
    <div className="max-w-full space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-main">AI Provider Configuration</h2>
        <p className="mt-1 text-sm text-text-muted">
          Configure your AI provider and select the model for email research
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface/30 p-4 max-w-xl">
        <label className="block text-sm text-text-muted mb-3">Active Provider</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onSwitchProvider('groq')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
              selectedProvider === 'groq'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FiZap size={16} />
              <span>Groq</span>
              {hasGroqKey && <span className="h-2 w-2 rounded-full bg-green-400" />}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSwitchProvider('mistral')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
              selectedProvider === 'mistral'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FiCpu size={16} />
              <span>Mistral</span>
              {hasMistralKey && <span className="h-2 w-2 rounded-full bg-green-400" />}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSwitchProvider('google')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
              selectedProvider === 'google'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <SiGoogle size={16} />
              <span>Google</span>
              {hasGoogleKey && <span className="h-2 w-2 rounded-full bg-green-400" />}
            </div>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div
          className={`rounded-lg border bg-surface/30 p-6 flex-1 ${
            selectedProvider === 'groq' ? 'border-primary' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                <FiZap className="text-xl text-orange-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-text-main">Groq API</h3>
                <p className="text-xs text-text-muted">Ultra-fast LLM inference</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedProvider === 'groq' && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  Active
                </span>
              )}
              {hasGroqKey && (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  Connected
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-text-muted">API Key</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="password"
                  placeholder={hasGroqKey ? '••••••••••••••••' : 'gsk_...'}
                  value={groqKey}
                  onChange={(e) => onGroqKeyChange(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={onSaveGroqKey}
                disabled={saving || !groqKey.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Get your free API key from{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.groq.com
              </a>
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <label className="block text-sm text-text-muted">Model Selection</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-surface/30 px-4 py-3 pr-10 text-sm text-text-main transition-colors hover:bg-surface/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {GROQ_MODELS.map((model) => (
                  <option key={model.id} value={model.id} className="bg-background">
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <FiChevronDown className="text-text-muted" size={16} />
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Selected model will be used for all agent operations
            </p>
          </div>
        </div>

        <div
          className={`rounded-lg border bg-surface/30 p-6 space-y-4 flex-1 ${
            selectedProvider === 'mistral' ? 'border-primary' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <FiCpu className="text-xl text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-text-main">Mistral API</h3>
                <p className="text-xs text-text-muted">Powerful European AI models</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedProvider === 'mistral' && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  Active
                </span>
              )}
              {hasMistralKey && (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  Connected
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-text-muted">API Key</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="password"
                  placeholder={hasMistralKey ? '••••••••••••••••' : 'Enter your Mistral API key'}
                  value={mistralKey}
                  onChange={(e) => onMistralKeyChange(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={onSaveMistralKey}
                disabled={saving || !mistralKey.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Get your API key from{' '}
              <a
                href="https://console.mistral.ai/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.mistral.ai
              </a>
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <label className="block text-sm text-text-muted">Model Selection</label>
            <div className="relative">
              <select
                value={selectedMistralModel}
                onChange={(e) => onSelectMistralModel(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-surface/30 px-4 py-3 pr-10 text-sm text-text-main transition-colors hover:bg-surface/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MISTRAL_MODELS.map((model) => (
                  <option key={model.id} value={model.id} className="bg-background">
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <FiChevronDown className="text-text-muted" size={16} />
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Selected model will be used for all agent operations
            </p>
          </div>
        </div>

        <GoogleProviderCard
          isActive={selectedProvider === 'google'}
          hasGoogleKey={hasGoogleKey}
          googleKey={googleKey}
          selectedGoogleModel={selectedGoogleModel}
          selectedGoogleMode={selectedGoogleMode}
          googleProjectId={googleProjectId}
          googleLocation={googleLocation}
          saving={saving}
          onGoogleKeyChange={onGoogleKeyChange}
          onSaveGoogleKey={onSaveGoogleKey}
          onSelectGoogleModel={onSelectGoogleModel}
          onSelectGoogleMode={onSelectGoogleMode}
          onGoogleProjectIdChange={onGoogleProjectIdChange}
          onGoogleLocationChange={onGoogleLocationChange}
          onSaveVertexConfig={onSaveVertexConfig}
        />
      </div>
    </div>
  )
}

export { AiProviderTab }
