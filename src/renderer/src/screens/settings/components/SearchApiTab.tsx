import React from 'react'
import { FiSearch, FiFileText, FiFilter } from 'react-icons/fi'

import { Button, Input } from '../../../components/ui'

interface SearchApiTabProps {
  serperKey: string
  jinaKey: string
  neutrinoKey: string
  neutrinoUserId: string
  hasSerperKey: boolean
  hasJinaKey: boolean
  hasNeutrinoKey: boolean
  saving: boolean
  onSerperKeyChange: (value: string) => void
  onJinaKeyChange: (value: string) => void
  onNeutrinoKeyChange: (value: string) => void
  onNeutrinoUserIdChange: (value: string) => void
  onSaveSerperKey: () => Promise<void>
  onSaveJinaKey: () => Promise<void>
  onSaveNeutrinoKey: () => Promise<void>
}

function SearchApiTab({
  serperKey,
  jinaKey,
  neutrinoKey,
  neutrinoUserId,
  hasSerperKey,
  hasJinaKey,
  hasNeutrinoKey,
  saving,
  onSerperKeyChange,
  onJinaKeyChange,
  onNeutrinoKeyChange,
  onNeutrinoUserIdChange,
  onSaveSerperKey,
  onSaveJinaKey,
  onSaveNeutrinoKey
}: SearchApiTabProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = React.useState<'board' | 'scoping' | 'cleanup'>('board')
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-main">Web Search APIs</h2>
        <p className="mt-1 text-sm text-text-muted">
          Configure APIs for web search and content scraping
        </p>
      </div>

      {/* Subtabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSubTab('board')}
            className={[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeSubTab === 'board'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            ].join(' ')}
          >
            Board Services
          </button>
          <button
            onClick={() => setActiveSubTab('scoping')}
            className={[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeSubTab === 'scoping'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            ].join(' ')}
          >
            Scoping Services
          </button>
          <button
            onClick={() => setActiveSubTab('cleanup')}
            className={[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeSubTab === 'cleanup'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            ].join(' ')}
          >
            URL Cleanup
          </button>
        </nav>
      </div>

      {/* Board Services Subtab */}
      {activeSubTab === 'board' && (
        <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <FiSearch className="text-xl text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-text-main">Serper API</h3>
                <p className="text-xs text-text-muted">Google Search API for web research</p>
              </div>
            </div>
            {hasSerperKey && (
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
                  placeholder={hasSerperKey ? '••••••••••••••••' : 'Enter your Serper API key'}
                  value={serperKey}
                  onChange={(e) => onSerperKeyChange(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={onSaveSerperKey}
                disabled={saving || !serperKey.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Get your API key from{' '}
              <a
                href="https://serper.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                serper.dev
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Scoping Services Subtab */}
      {activeSubTab === 'scoping' && (
        <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
          {/* Jina Reader API */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <FiFileText className="text-xl text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-text-main">Jina Reader API</h3>
                <p className="text-xs text-text-muted">Web content scraping and extraction</p>
              </div>
            </div>
            {hasJinaKey && (
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
                  placeholder={hasJinaKey ? '••••••••••••••••' : 'Enter your Jina API key'}
                  value={jinaKey}
                  onChange={(e) => onJinaKeyChange(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={onSaveJinaKey}
                disabled={saving || !jinaKey.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Get your API key from{' '}
              <a
                href="https://jina.ai/reader"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                jina.ai/reader
              </a>
            </p>
          </div>
        </div>
      )}

      {/* URL Cleanup Subtab */}
      {activeSubTab === 'cleanup' && (
        <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <FiFilter className="text-xl text-red-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-text-main">Neutrino API</h3>
                <p className="text-xs text-text-muted">Smart URL categorization and filtering</p>
              </div>
            </div>
            {hasNeutrinoKey && (
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                Connected
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-text-muted">User ID</label>
              <Input
                type="text"
                placeholder="Enter your Neutrino User ID"
                value={neutrinoUserId}
                onChange={(e) => onNeutrinoUserIdChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-text-muted">API Key</label>
              <Input
                type="password"
                placeholder={hasNeutrinoKey ? '••••••••••••••••' : 'Enter your Neutrino API key'}
                value={neutrinoKey}
                onChange={(e) => onNeutrinoKeyChange(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              onClick={onSaveNeutrinoKey}
              disabled={saving || !neutrinoKey.trim() || !neutrinoUserId.trim()}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Neutrino Credentials'}
            </Button>
            <p className="text-xs text-text-muted">
              Get your User ID and API key from{' '}
              <a
                href="https://www.neutrinoapi.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                neutrinoapi.com
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { SearchApiTab }
