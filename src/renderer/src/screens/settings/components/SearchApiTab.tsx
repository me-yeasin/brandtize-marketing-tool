import type React from 'react'
import { FiSearch } from 'react-icons/fi'

import { Button, Input } from '../../../components/ui'

interface SearchApiTabProps {
  serperKey: string
  hasSerperKey: boolean
  saving: boolean
  onSerperKeyChange: (value: string) => void
  onSaveSerperKey: () => Promise<void>
}

function SearchApiTab({
  serperKey,
  hasSerperKey,
  saving,
  onSerperKeyChange,
  onSaveSerperKey
}: SearchApiTabProps): React.JSX.Element {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-main">Web Search Configuration</h2>
        <p className="mt-1 text-sm text-text-muted">
          Configure Serper API for web search functionality
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <FiSearch className="text-xl text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="font-medium text-text-main">Serper API</h3>
              <p className="text-xs text-text-muted">Google Search API for research</p>
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
            </a>{' '}
            — 2,500 free searches per month
          </p>
        </div>
      </div>
    </div>
  )
}

export { SearchApiTab }
