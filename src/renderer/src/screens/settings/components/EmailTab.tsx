import React from 'react'
import { FiMail, FiCheckCircle, FiPlus, FiTrash2 } from 'react-icons/fi'

import { Button, Input } from '../../../components/ui'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

interface EmailTabProps {
  saving: boolean
  // Multi-key props
  hunterKeys: ApiKeyEntry[]
  snovKeys: ApiKeyEntry[]
  reoonKeys: ApiKeyEntry[]
  onSaveHunterKeys: (keys: ApiKeyEntry[]) => Promise<void>
  onSaveSnovKeys: (keys: ApiKeyEntry[]) => Promise<void>
  onSaveReoonKeys: (keys: ApiKeyEntry[]) => Promise<void>
}

function EmailTab({
  saving,
  hunterKeys,
  snovKeys,
  reoonKeys,
  onSaveHunterKeys,
  onSaveSnovKeys,
  onSaveReoonKeys
}: EmailTabProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = React.useState<'finder' | 'verifier'>('finder')

  // Local state for adding new keys
  const [localHunterKeys, setLocalHunterKeys] = React.useState<ApiKeyEntry[]>([])
  const [localSnovKeys, setLocalSnovKeys] = React.useState<
    { clientId: string; clientSecret: string }[]
  >([])
  const [localReoonKey, setLocalReoonKey] = React.useState('')

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-main">Email Services</h2>
        <p className="mt-1 text-sm text-text-muted">
          Configure APIs for email discovery and verification
        </p>
      </div>

      {/* Subtabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSubTab('finder')}
            className={[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeSubTab === 'finder'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            ].join(' ')}
          >
            Email Finder
          </button>
          <button
            onClick={() => setActiveSubTab('verifier')}
            className={[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeSubTab === 'verifier'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            ].join(' ')}
          >
            Email Verifier
          </button>
        </nav>
      </div>

      {/* Email Finder Subtab */}
      {activeSubTab === 'finder' && (
        <>
          {/* Hunter.io Multi-Key Section */}
          <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                  <FiMail className="text-xl text-orange-400" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-text-main">Hunter.io API</h3>
                  <p className="text-xs text-text-muted">
                    Primary email finder • {hunterKeys.length} key
                    {hunterKeys.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
              </div>
              {hunterKeys.length > 0 && (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  {hunterKeys.length} Key{hunterKeys.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Existing Keys */}
            {hunterKeys.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm text-text-muted">Saved Keys (for rotation)</label>
                {hunterKeys.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-surface/50 rounded border border-border/50"
                  >
                    <span className="text-xs text-text-muted w-6">#{idx + 1}</span>
                    <span className="flex-1 text-sm text-text-main font-mono">{entry.key}</span>
                    <button
                      onClick={() => {
                        const newKeys = hunterKeys.filter((_, i) => i !== idx)
                        onSaveHunterKeys(newKeys)
                      }}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove key"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Key */}
            <div className="space-y-3">
              <label className="block text-sm text-text-muted">Add New API Key</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="password"
                    placeholder="Enter Hunter.io API key"
                    value={localHunterKeys[0]?.key || ''}
                    onChange={(e) => setLocalHunterKeys([{ key: e.target.value }])}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (localHunterKeys[0]?.key?.trim()) {
                      onSaveHunterKeys([...hunterKeys, { key: localHunterKeys[0].key.trim() }])
                      setLocalHunterKeys([])
                    }
                  }}
                  disabled={saving || !localHunterKeys[0]?.key?.trim()}
                >
                  <FiPlus size={16} className="mr-1" /> Add
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Get API keys from{' '}
                <a
                  href="https://hunter.io/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  hunter.io
                </a>{' '}
                • Add multiple keys for rotation when rate limited
              </p>
            </div>
          </div>

          {/* Snov.io Multi-Key Section */}
          <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <FiMail className="text-xl text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-text-main">Snov.io API</h3>
                  <p className="text-xs text-text-muted">
                    Fallback email finder • {snovKeys.length} credential
                    {snovKeys.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
              </div>
              {snovKeys.length > 0 && (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  {snovKeys.length} Credential{snovKeys.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Existing Keys */}
            {snovKeys.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm text-text-muted">
                  Saved Credentials (for rotation)
                </label>
                {snovKeys.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-surface/50 rounded border border-border/50"
                  >
                    <span className="text-xs text-text-muted w-6">#{idx + 1}</span>
                    <span className="flex-1 text-sm text-text-main font-mono">
                      ID: {entry.key} / Secret: {entry.userId || '••••'}
                    </span>
                    <button
                      onClick={() => {
                        const newKeys = snovKeys.filter((_, i) => i !== idx)
                        onSaveSnovKeys(newKeys)
                      }}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove credential"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Credential */}
            <div className="space-y-3">
              <label className="block text-sm text-text-muted">Add New Credentials</label>
              <Input
                type="password"
                placeholder="Client ID"
                value={localSnovKeys[0]?.clientId || ''}
                onChange={(e) =>
                  setLocalSnovKeys([
                    { clientId: e.target.value, clientSecret: localSnovKeys[0]?.clientSecret || '' }
                  ])
                }
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="password"
                    placeholder="Client Secret"
                    value={localSnovKeys[0]?.clientSecret || ''}
                    onChange={(e) =>
                      setLocalSnovKeys([
                        { clientId: localSnovKeys[0]?.clientId || '', clientSecret: e.target.value }
                      ])
                    }
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    const entry = localSnovKeys[0]
                    if (entry?.clientId?.trim() && entry?.clientSecret?.trim()) {
                      onSaveSnovKeys([
                        ...snovKeys,
                        { key: entry.clientId.trim(), userId: entry.clientSecret.trim() }
                      ])
                      setLocalSnovKeys([])
                    }
                  }}
                  disabled={
                    saving ||
                    !localSnovKeys[0]?.clientId?.trim() ||
                    !localSnovKeys[0]?.clientSecret?.trim()
                  }
                >
                  <FiPlus size={16} className="mr-1" /> Add
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Get credentials from{' '}
                <a
                  href="https://app.snov.io/account/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  snov.io
                </a>{' '}
                • Fallback when all Hunter.io keys are rate limited
              </p>
            </div>
          </div>
        </>
      )}

      {/* Email Verifier Subtab */}
      {activeSubTab === 'verifier' && (
        <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <FiCheckCircle className="text-xl text-green-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-text-main">Reoon API</h3>
                <p className="text-xs text-text-muted">
                  Email verification (Power Mode) • {reoonKeys.length} key
                  {reoonKeys.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            </div>
            {reoonKeys.length > 0 && (
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                Connected
              </span>
            )}
          </div>

          {/* Existing Keys */}
          {reoonKeys.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm text-text-muted">Saved Keys (for rotation)</label>
              {reoonKeys.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-surface/50 rounded border border-border/50"
                >
                  <span className="text-xs text-text-muted w-6">#{idx + 1}</span>
                  <span className="flex-1 text-sm text-text-main font-mono">{entry.key}</span>
                  <button
                    onClick={() => {
                      const newKeys = reoonKeys.filter((_, i) => i !== idx)
                      onSaveReoonKeys(newKeys)
                    }}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Key */}
          <div className="space-y-3">
            <label className="block text-sm text-text-muted">Add New API Key</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="password"
                  placeholder="Enter Reoon API key"
                  value={localReoonKey}
                  onChange={(e) => setLocalReoonKey(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (localReoonKey.trim()) {
                    onSaveReoonKeys([...reoonKeys, { key: localReoonKey.trim() }])
                    setLocalReoonKey('')
                  }
                }}
                disabled={saving || !localReoonKey.trim()}
              >
                <FiPlus size={16} className="mr-1" /> Add
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Get your API key from{' '}
              <a
                href="https://reoon.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                reoon.com
              </a>{' '}
              • Add multiple keys for rotation when rate limited
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { EmailTab }
