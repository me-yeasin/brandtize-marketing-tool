import type React from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'

import { Button, Input } from '../../../components/ui'
import type { GoogleMode } from '../types'
import { GOOGLE_MODELS } from '../constants'
import AiMultiKeyInput from './AiMultiKeyInput'

interface ApiKeyEntry {
  key: string
  label?: string
}

interface GoogleProviderCardProps {
  isActive: boolean
  hasGoogleKey: boolean
  googleKey: string
  selectedGoogleModel: string
  selectedGoogleMode: GoogleMode
  googleProjectId: string
  googleLocation: string
  saving: boolean
  onGoogleKeyChange: (value: string) => void
  onSaveGoogleKey: () => Promise<void>
  onSelectGoogleModel: (model: string) => Promise<void>
  onSelectGoogleMode: (mode: GoogleMode) => Promise<void>
  onGoogleProjectIdChange: (value: string) => void
  onGoogleLocationChange: (value: string) => void
  onSaveVertexConfig: () => Promise<void>
  googleMultiKeys: ApiKeyEntry[]
  onSaveGoogleMultiKeys: (keys: ApiKeyEntry[]) => Promise<void>
}

function GoogleProviderCard({
  isActive,
  hasGoogleKey,
  googleKey,
  selectedGoogleModel,
  selectedGoogleMode,
  googleProjectId,
  googleLocation,
  saving,
  onGoogleKeyChange,
  onSaveGoogleKey,
  onSelectGoogleModel,
  onSelectGoogleMode,
  onGoogleProjectIdChange,
  onGoogleLocationChange,
  onSaveVertexConfig,
  googleMultiKeys,
  onSaveGoogleMultiKeys
}: GoogleProviderCardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-lg border bg-surface/30 p-6 space-y-4 flex-1 ${
        isActive ? 'border-primary' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
            <SiGoogle className="text-xl text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="font-medium text-text-main">Google AI</h3>
            <p className="text-xs text-text-muted">Gemini models (AI Studio & Vertex AI)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              Active
            </span>
          )}
          {hasGoogleKey && (
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
              Connected
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm text-text-muted">Mode</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelectGoogleMode('aiStudio')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
              selectedGoogleMode === 'aiStudio'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            AI Studio (API Key)
          </button>
          <button
            type="button"
            onClick={() => onSelectGoogleMode('vertexApiKey')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
              selectedGoogleMode === 'vertexApiKey'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            Vertex AI (API Key)
          </button>
        </div>
        <p className="text-xs text-text-muted">
          {selectedGoogleMode === 'aiStudio'
            ? 'Use Google AI Studio with a Gemini API key'
            : 'Use Vertex AI with Express Mode API key'}
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm text-text-muted">
          {selectedGoogleMode === 'aiStudio' ? 'Gemini API Key' : 'Vertex AI API Key'}
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="password"
              placeholder={hasGoogleKey ? '••••••••••••••••' : 'Enter your API key'}
              value={googleKey}
              onChange={(e) => onGoogleKeyChange(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            onClick={onSaveGoogleKey}
            disabled={saving || !googleKey.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="text-xs text-text-muted">
          {selectedGoogleMode === 'aiStudio' ? (
            <>
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                aistudio.google.com
              </a>
            </>
          ) : (
            <>
              Get your API key from{' '}
              <a
                href="https://console.cloud.google.com/vertex-ai/studio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Vertex AI Studio
              </a>
            </>
          )}
        </p>
      </div>

      {selectedGoogleMode === 'vertexApiKey' && (
        <div className="space-y-3 border-t border-border pt-4">
          <label className="block text-sm text-text-muted">
            Vertex AI Configuration (Optional)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Project ID</label>
              <Input
                type="text"
                placeholder="your-project-id"
                value={googleProjectId}
                onChange={(e) => onGoogleProjectIdChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Location</label>
              <Input
                type="text"
                placeholder="us-central1"
                value={googleLocation}
                onChange={(e) => onGoogleLocationChange(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onSaveVertexConfig}
            disabled={saving}
            className="text-xs"
          >
            Save Vertex Config
          </Button>
        </div>
      )}

      <div className="border-t border-border pt-4 space-y-3">
        <label className="block text-sm text-text-muted">Model Selection</label>
        <div className="relative">
          <select
            value={selectedGoogleModel}
            onChange={(e) => onSelectGoogleModel(e.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-surface/30 px-4 py-3 pr-10 text-sm text-text-main transition-colors hover:bg-surface/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {GOOGLE_MODELS.map((model) => (
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

      <AiMultiKeyInput
        provider="google"
        existingKeys={googleMultiKeys}
        onSave={onSaveGoogleMultiKeys}
        getKeyUrl="https://aistudio.google.com/app/apikey"
        saving={saving}
      />
    </div>
  )
}

export { GoogleProviderCard }
