import { useEffect, useState } from 'react'
import { FiCpu, FiSearch, FiZap, FiChevronDown } from 'react-icons/fi'
import { Button, Input } from '../components/ui'

type SettingsTab = 'ai-provider' | 'search-api'

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B' },
  { id: 'openai/gpt-oss-safeguard-20b', name: 'GPT OSS Safeguard 20B' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct 0905' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct' },
  { id: 'meta-llama/llama-prompt-guard-2-86m', name: 'Llama Prompt Guard 2 86M' },
  { id: 'meta-llama/llama-prompt-guard-2-22m', name: 'Llama Prompt Guard 2 22M' },
  { id: 'meta-llama/llama-guard-4-12b', name: 'Llama Guard 4 12B' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' }
]

function SettingsScreen(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai-provider')
  const [groqKey, setGroqKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')
  const [hasGroqKey, setHasGroqKey] = useState(false)
  const [hasSerperKey, setHasSerperKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    window.api.getApiKeys().then((keys) => {
      setHasGroqKey(keys.hasGroqKey)
      setHasSerperKey(keys.hasSerperKey)
    })
    window.api.getSelectedModel().then((model: string) => {
      setSelectedModel(model)
    })
  }, [])

  const saveGroqKey = async (): Promise<void> => {
    if (!groqKey.trim()) return
    setSaving(true)
    try {
      await window.api.setGroqApiKey(groqKey.trim())
      setHasGroqKey(true)
      setGroqKey('')
      setMessage({ type: 'success', text: 'Groq API key saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save Groq API key' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const saveSerperKey = async (): Promise<void> => {
    if (!serperKey.trim()) return
    setSaving(true)
    try {
      await window.api.setSerperApiKey(serperKey.trim())
      setHasSerperKey(true)
      setSerperKey('')
      setMessage({ type: 'success', text: 'Serper API key saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save Serper API key' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const tabs = [
    { id: 'ai-provider' as const, label: 'AI Provider', icon: <FiCpu size={16} /> },
    { id: 'search-api' as const, label: 'Web Search', icon: <FiSearch size={16} /> }
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface/20 px-6 py-4">
        <h1 className="text-xl font-semibold text-text-main">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Configure API keys and model preferences</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border bg-surface/10 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-muted hover:bg-surface hover:text-text-main'
                ].join(' ')}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'ai-provider' && hasGroqKey && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
                )}
                {tab.id === 'search-api' && hasSerperKey && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
                )}
              </button>
            ))}
          </nav>

          {/* <div className="mt-6 rounded-lg border border-border bg-surface/20 p-3">
            <h3 className="text-xs font-medium text-text-main mb-2">Status</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={hasGroqKey ? 'text-green-400' : 'text-red-400'}>
                  {hasGroqKey ? <FiCheck size={12} /> : <FiX size={12} />}
                </span>
                <span className="text-text-muted">AI Provider</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasSerperKey ? 'text-green-400' : 'text-red-400'}>
                  {hasSerperKey ? <FiCheck size={12} /> : <FiX size={12} />}
                </span>
                <span className="text-text-muted">Web Search</span>
              </div>
            </div>
          </div> */}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {message && (
            <div
              className={[
                'mb-6 rounded-md px-4 py-3 text-sm',
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              ].join(' ')}
            >
              {message.text}
            </div>
          )}

          {activeTab === 'ai-provider' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-medium text-text-main">AI Provider Configuration</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Configure your Groq API key and select the model for email research
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
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
                  {hasGroqKey && (
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
                        placeholder={hasGroqKey ? '••••••••••••••••' : 'gsk_...'}
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={saveGroqKey}
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
                      onChange={async (e) => {
                        const model = e.target.value
                        setSelectedModel(model)
                        await window.api.setSelectedModel(model)
                        setMessage({ type: 'success', text: 'Model updated successfully!' })
                        setTimeout(() => setMessage(null), 3000)
                      }}
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
            </div>
          )}

          {activeTab === 'search-api' && (
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
                        placeholder={
                          hasSerperKey ? '••••••••••••••••' : 'Enter your Serper API key'
                        }
                        value={serperKey}
                        onChange={(e) => setSerperKey(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={saveSerperKey}
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
          )}
        </div>
      </div>
    </div>
  )
}

export { SettingsScreen }
