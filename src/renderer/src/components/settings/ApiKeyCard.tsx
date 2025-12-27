import { JSX, useEffect, useState } from 'react'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

interface ApiKeyCardProps {
  title: string
  description: string
  icon: JSX.Element
  // Single key props
  apiKey: string
  onSaveKey: (key: string) => Promise<boolean>
  // Multi-key props (optional)
  multiKeys?: ApiKeyEntry[]
  onSaveMultiKeys?: (keys: ApiKeyEntry[]) => Promise<boolean>
  // For Snov-style credentials
  hasSecondField?: boolean
  secondFieldLabel?: string
  secondFieldValue?: string
  onSaveSecondField?: (value: string) => Promise<boolean>
}

function ApiKeyCard({
  title,
  description,
  icon,
  apiKey,
  onSaveKey,
  multiKeys = [],
  onSaveMultiKeys,
  hasSecondField = false,
  secondFieldLabel = '',
  secondFieldValue = '',
  onSaveSecondField
}: ApiKeyCardProps): JSX.Element {
  const [inputValue, setInputValue] = useState(apiKey)
  const [secondInputValue, setSecondInputValue] = useState(secondFieldValue)
  const [newKeyInput, setNewKeyInput] = useState('')
  const [localMultiKeys, setLocalMultiKeys] = useState<ApiKeyEntry[]>(multiKeys)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState(false)

  // Sync state with props when they change
  useEffect(() => {
    setInputValue(apiKey)
  }, [apiKey])

  useEffect(() => {
    setSecondInputValue(secondFieldValue)
  }, [secondFieldValue])

  useEffect(() => {
    setLocalMultiKeys(multiKeys)
  }, [multiKeys])

  // Mask API key for display
  const maskKey = (key: string): string => {
    if (!key || key.length < 8) return '••••••••'
    return '••••••••' + key.slice(-4)
  }

  // Save primary key
  const handleSaveKey = async (): Promise<void> => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await onSaveKey(inputValue)
      if (hasSecondField && onSaveSecondField) {
        await onSaveSecondField(secondInputValue)
      }
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save key:', error)
      setSaveError('Failed to save')
    }
    setIsSaving(false)
  }

  const [newSecondKeyInput, setNewSecondKeyInput] = useState('')

  // Add new key to multi-key list
  const handleAddKey = async (): Promise<void> => {
    if (!newKeyInput.trim() || !onSaveMultiKeys) return
    if (hasSecondField && !newSecondKeyInput.trim()) return

    const newEntry: ApiKeyEntry = {
      key: newKeyInput.trim(),
      userId: hasSecondField ? newSecondKeyInput.trim() : undefined
    }

    const newKeys = [...localMultiKeys, newEntry]
    setLocalMultiKeys(newKeys)
    setNewKeyInput('')
    setNewSecondKeyInput('')

    try {
      await onSaveMultiKeys(newKeys)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to add key:', error)
    }
  }

  // Remove key from multi-key list
  const handleRemoveKey = async (index: number): Promise<void> => {
    if (!onSaveMultiKeys) return

    const newKeys = localMultiKeys.filter((_, i) => i !== index)
    setLocalMultiKeys(newKeys)

    try {
      await onSaveMultiKeys(newKeys)
    } catch (error) {
      console.error('Failed to remove key:', error)
    }
  }

  return (
    <div className="api-key-card">
      {/* Card Header */}
      <div className="api-key-card-header">
        <div className="api-key-card-icon">{icon}</div>
        <div className="api-key-card-info">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {showSuccess && <span className="success-badge">✓ Saved</span>}
        {saveError && (
          <span className="error-badge" style={{ color: '#ff4d4f', marginLeft: '10px' }}>
            {saveError}
          </span>
        )}
      </div>

      {/* Primary Key Input */}
      <div className="api-key-input-group">
        <label>API Key</label>
        <div className="api-key-input-row">
          <input
            type={showKeys ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your API key..."
            className="api-key-input"
          />
          <button
            className="toggle-visibility-btn"
            onClick={() => setShowKeys(!showKeys)}
            title={showKeys ? 'Hide keys' : 'Show keys'}
          >
            {showKeys ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Second Field (for Snov.io) */}
      {hasSecondField && (
        <div className="api-key-input-group">
          <label>{secondFieldLabel}</label>
          <input
            type={showKeys ? 'text' : 'password'}
            value={secondInputValue}
            onChange={(e) => setSecondInputValue(e.target.value)}
            placeholder={`Enter ${secondFieldLabel.toLowerCase()}...`}
            className="api-key-input"
          />
        </div>
      )}

      {/* Save Button */}
      <button className="api-key-save-btn" onClick={handleSaveKey} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Key'}
      </button>

      {/* Multi-Key Section */}
      {onSaveMultiKeys && (
        <div className="multi-key-section">
          <div className="multi-key-header">
            <h4>Additional Keys (for rotation)</h4>
            <span className="key-count">{localMultiKeys.length} keys</span>
          </div>

          {/* Existing Keys List */}
          {localMultiKeys.length > 0 && (
            <div className="multi-key-list">
              {localMultiKeys.map((keyEntry, index) => (
                <div key={index} className="multi-key-item" style={{ alignItems: 'flex-start' }}>
                  <div
                    className="multi-key-values"
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <span className="multi-key-value">
                      {hasSecondField ? (
                        <span style={{ opacity: 0.7, fontSize: '0.9em' }}>ID: </span>
                      ) : (
                        ''
                      )}
                      {maskKey(keyEntry.key)}
                    </span>
                    {hasSecondField && keyEntry.userId && (
                      <span className="multi-key-value-secondary" style={{ fontSize: '0.9em' }}>
                        <span style={{ opacity: 0.7 }}>Secret: </span>
                        {maskKey(keyEntry.userId)}
                      </span>
                    )}
                  </div>
                  <button
                    className="multi-key-remove-btn"
                    onClick={() => handleRemoveKey(index)}
                    style={{ marginTop: '4px' }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Key */}
          <div className="add-key-row" style={{ alignItems: 'flex-start' }}>
            <div
              className="add-key-inputs"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <input
                type="text"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                placeholder={hasSecondField ? 'API Key (Client ID)' : 'Add another API key...'}
                className="api-key-input"
              />
              {hasSecondField && (
                <input
                  type="text"
                  value={newSecondKeyInput}
                  onChange={(e) => setNewSecondKeyInput(e.target.value)}
                  placeholder={secondFieldLabel || 'Client Secret'}
                  className="api-key-input"
                />
              )}
            </div>
            <button
              className="add-key-btn"
              onClick={handleAddKey}
              disabled={!newKeyInput.trim() || (hasSecondField && !newSecondKeyInput.trim())}
              style={{ height: '40px', marginTop: '0' }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiKeyCard
