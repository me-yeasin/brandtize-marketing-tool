import React, { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiCheck } from 'react-icons/fi'
import { Button, Input } from '../../../components/ui'

interface ApiKeyEntry {
  key: string
  label?: string
}

interface AiMultiKeyInputProps {
  provider: 'groq' | 'mistral' | 'google'
  existingKeys: ApiKeyEntry[]
  onSave: (keys: ApiKeyEntry[]) => Promise<void>
  getKeyUrl: string
  saving?: boolean
}

function AiMultiKeyInput({
  provider,
  existingKeys,
  onSave,
  getKeyUrl,
  saving = false
}: AiMultiKeyInputProps): React.JSX.Element {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([{ key: '', label: '' }])
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (existingKeys.length > 0) {
      setKeys(existingKeys)
    } else {
      setKeys([{ key: '', label: '' }])
    }
  }, [existingKeys])

  const handleAddKey = (): void => {
    setKeys([...keys, { key: '', label: '' }])
  }

  const handleRemoveKey = (index: number): void => {
    if (keys.length > 1) {
      const newKeys = [...keys]
      newKeys.splice(index, 1)
      setKeys(newKeys)
    }
  }

  const handleKeyChange = (index: number, field: keyof ApiKeyEntry, value: string): void => {
    const newKeys = [...keys]
    newKeys[index] = { ...newKeys[index], [field]: value }
    setKeys(newKeys)
  }

  const handleSave = async (): Promise<void> => {
    const validKeys = keys.filter((k) => k.key.trim() !== '')
    if (validKeys.length === 0) return

    setIsSaving(true)
    try {
      await onSave(validKeys)
    } finally {
      setIsSaving(false)
    }
  }

  const hasValidKeys = keys.some((k) => k.key.trim() !== '')
  const totalKeys = existingKeys.filter((k) => k.key && !k.key.startsWith('••')).length

  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-main transition-colors"
        >
          <span>Multi-Key Rotation</span>
          {totalKeys > 0 && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              {totalKeys} key{totalKeys > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 bg-surface/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Add multiple API keys for automatic rotation when rate limits are hit
            </p>
            <button
              onClick={handleAddKey}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <FiPlus size={14} />
              Add Key
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {keys.map((entry, index) => (
              <div key={index} className="flex gap-2 items-start p-2 bg-background/50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    type="password"
                    placeholder={`${providerName} API Key #${index + 1}`}
                    value={entry.key}
                    onChange={(e) => handleKeyChange(index, 'key', e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="text"
                    placeholder={`Label (optional) - e.g., "Account ${index + 1}"`}
                    value={entry.label || ''}
                    onChange={(e) => handleKeyChange(index, 'label', e.target.value)}
                    className="text-xs"
                  />
                </div>
                {keys.length > 1 && (
                  <button
                    onClick={() => handleRemoveKey(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Remove this key"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-text-muted">
              Get keys from{' '}
              <a
                href={getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {new URL(getKeyUrl).hostname}
              </a>
            </p>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || saving || !hasValidKeys}
              className="flex items-center gap-1 text-sm px-3 py-1"
            >
              {isSaving || saving ? (
                'Saving...'
              ) : (
                <>
                  <FiCheck size={14} />
                  Save Keys
                </>
              )}
            </Button>
          </div>

          {totalKeys > 0 && (
            <div className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded">
              ✓ {totalKeys} API key{totalKeys > 1 ? 's' : ''} configured for rotation
            </div>
          )}

          <div className="text-xs text-text-muted bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20">
            <strong>How it works:</strong> When a model hits rate limit, it tries next model. After
            all models fail, it switches to the next API key and repeats.
          </div>
        </div>
      )}
    </div>
  )
}

export default AiMultiKeyInput
