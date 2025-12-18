import React from 'react'
import { FiMail, FiCheckCircle } from 'react-icons/fi'

import { Button, Input } from '../../../components/ui'

interface EmailTabProps {
  hunterKey: string
  reoonKey: string
  snovClientId: string
  snovClientSecret: string
  hasHunterKey: boolean
  hasReoonKey: boolean
  hasSnovKey: boolean
  saving: boolean
  onHunterKeyChange: (value: string) => void
  onReoonKeyChange: (value: string) => void
  onSnovClientIdChange: (value: string) => void
  onSnovClientSecretChange: (value: string) => void
  onSaveHunterKey: () => Promise<void>
  onSaveReoonKey: () => Promise<void>
  onSaveSnovKey: () => Promise<void>
}

function EmailTab({
  hunterKey,
  reoonKey,
  snovClientId,
  snovClientSecret,
  hasHunterKey,
  hasReoonKey,
  hasSnovKey,
  saving,
  onHunterKeyChange,
  onReoonKeyChange,
  onSnovClientIdChange,
  onSnovClientSecretChange,
  onSaveHunterKey,
  onSaveReoonKey,
  onSaveSnovKey
}: EmailTabProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = React.useState<'finder' | 'verifier'>('finder')

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
          <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                  <FiMail className="text-xl text-orange-400" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-text-main">Hunter.io API</h3>
                  <p className="text-xs text-text-muted">Email finder by domain or name</p>
                </div>
              </div>
              {hasHunterKey && (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  Connected
                </span>
              )}
            </div>
            <div className="space-y-3">
              <label className="block text-sm text-text-muted">API Key</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="password"
                    placeholder={hasHunterKey ? '••••••••••••••••' : 'Enter your Hunter.io API key'}
                    value={hunterKey}
                    onChange={(e) => onHunterKeyChange(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={onSaveHunterKey}
                  disabled={saving || !hunterKey.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Get your API key from{' '}
                <a
                  href="https://hunter.io/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  hunter.io
                </a>
              </p>
            </div>
          </div>

          {/* Snov.io - Fallback Email Finder */}
          <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <FiMail className="text-xl text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-text-main">Snov.io API</h3>
                  <p className="text-xs text-text-muted">Fallback email finder (domain or name)</p>
                </div>
              </div>
              {hasSnovKey && (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  Connected
                </span>
              )}
            </div>
            <div className="space-y-3">
              <label className="block text-sm text-text-muted">Client ID</label>
              <Input
                type="password"
                placeholder={hasSnovKey ? '••••••••••••••••' : 'Enter your Snov.io Client ID'}
                value={snovClientId}
                onChange={(e) => onSnovClientIdChange(e.target.value)}
              />
              <label className="block text-sm text-text-muted">Client Secret</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="password"
                    placeholder={
                      hasSnovKey ? '••••••••••••••••' : 'Enter your Snov.io Client Secret'
                    }
                    value={snovClientSecret}
                    onChange={(e) => onSnovClientSecretChange(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={onSaveSnovKey}
                  disabled={saving || !snovClientId.trim() || !snovClientSecret.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Get your API credentials from{' '}
                <a
                  href="https://app.snov.io/account/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  snov.io
                </a>{' '}
                • Used as fallback when Hunter.io fails
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
                <p className="text-xs text-text-muted">Email verification (Power Mode)</p>
              </div>
            </div>
            {hasReoonKey && (
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                Connected
              </span>
            )}
          </div>
          <div className="space-y-3">
            <label className="block text-sm text-text-muted">API Key</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="password"
                  placeholder={hasReoonKey ? '••••••••••••••••' : 'Enter your Reoon API key'}
                  value={reoonKey}
                  onChange={(e) => onReoonKeyChange(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={onSaveReoonKey}
                disabled={saving || !reoonKey.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
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
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { EmailTab }
