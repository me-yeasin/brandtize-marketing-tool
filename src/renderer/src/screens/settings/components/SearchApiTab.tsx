import type React from 'react'
import { FiSearch, FiMail, FiCheckCircle, FiFileText } from 'react-icons/fi'

import { Button, Input } from '../../../components/ui'

interface SearchApiTabProps {
  serperKey: string
  hunterKey: string
  reoonKey: string
  jinaKey: string
  hasSerperKey: boolean
  hasHunterKey: boolean
  hasReoonKey: boolean
  hasJinaKey: boolean
  saving: boolean
  onSerperKeyChange: (value: string) => void
  onHunterKeyChange: (value: string) => void
  onReoonKeyChange: (value: string) => void
  onJinaKeyChange: (value: string) => void
  onSaveSerperKey: () => Promise<void>
  onSaveHunterKey: () => Promise<void>
  onSaveReoonKey: () => Promise<void>
  onSaveJinaKey: () => Promise<void>
}

function SearchApiTab({
  serperKey,
  hunterKey,
  reoonKey,
  jinaKey,
  hasSerperKey,
  hasHunterKey,
  hasReoonKey,
  hasJinaKey,
  saving,
  onSerperKeyChange,
  onHunterKeyChange,
  onReoonKeyChange,
  onJinaKeyChange,
  onSaveSerperKey,
  onSaveHunterKey,
  onSaveReoonKey,
  onSaveJinaKey
}: SearchApiTabProps): React.JSX.Element {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-main">Lead Generation APIs</h2>
        <p className="mt-1 text-sm text-text-muted">
          Configure APIs for web search, content scraping, email discovery and verification
        </p>
      </div>

      {/* Serper API */}
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

      {/* Jina Reader API */}
      <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
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
            <Button variant="primary" onClick={onSaveJinaKey} disabled={saving || !jinaKey.trim()}>
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

      {/* Hunter.io API */}
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

      {/* Reoon API */}
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
    </div>
  )
}

export { SearchApiTab }
