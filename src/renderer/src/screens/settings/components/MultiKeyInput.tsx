import React, { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiCheck } from 'react-icons/fi'
import { Button, Input } from '../../../components/ui'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

interface MultiKeyInputProps {
  needsUserId?: boolean // For services like Neutrino that need userId
  existingKeys: ApiKeyEntry[]
  onSave: (keys: ApiKeyEntry[]) => Promise<void>
  getKeyUrl: string
  saving?: boolean
}

function MultiKeyInput({
  needsUserId = false,
  existingKeys,
  onSave,
  getKeyUrl,
  saving = false
}: MultiKeyInputProps): React.JSX.Element {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([{ key: '', userId: '', label: '' }])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (existingKeys.length > 0) {
      setKeys(existingKeys)
    } else {
      setKeys([{ key: '', userId: '', label: '' }])
    }
  }, [existingKeys])

  const handleAddKey = (): void => {
    setKeys([...keys, { key: '', userId: '', label: '' }])
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
    // Filter out empty entries
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-text-muted">
          API Keys ({totalKeys > 0 ? `${totalKeys} saved` : 'none saved'})
        </label>
        <button
          onClick={handleAddKey}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <FiPlus size={14} />
          Add Key
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {keys.map((entry, index) => (
          <div key={index} className="flex gap-2 items-start p-2 bg-surface/50 rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={`API Key #${index + 1}`}
                  value={entry.key}
                  onChange={(e) => handleKeyChange(index, 'key', e.target.value)}
                  className="flex-1 text-sm"
                />
                {needsUserId && (
                  <Input
                    type="text"
                    placeholder="User ID"
                    value={entry.userId || ''}
                    onChange={(e) => handleKeyChange(index, 'userId', e.target.value)}
                    className="w-32 text-sm"
                  />
                )}
              </div>
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
              Save All Keys
            </>
          )}
        </Button>
      </div>

      {totalKeys > 0 && (
        <div className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded">
          ✓ {totalKeys} API key{totalKeys > 1 ? 's' : ''} configured for rotation
        </div>
      )}
    </div>
  )
}

export default MultiKeyInput
