import { useEffect, useState } from 'react'
import {
  FiCalendar,
  FiCheck,
  FiCopy,
  FiCpu,
  FiGlobe,
  FiMail,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX
} from 'react-icons/fi'

interface ProcessedDomain {
  id: string
  domain: string
  url: string
  email: string | null
  decisionMaker: string | null
  verified: boolean
  source: string
  processedAt: number
  searchQuery?: string
}

interface FoundLead {
  id: string
  email: string
  domain: string
  url: string
  decisionMaker: string | null
  verified: boolean
  source: string
  foundAt: number
  searchQuery?: string
  niche?: string
  location?: string
}

interface EmailPitchResult {
  subject: string
  body: string
  strategy_explanation: string
  target_audience_analysis: string
  psychological_triggers_used: string
}

function ResultsScreen(): React.JSX.Element {
  const [activeView, setActiveView] = useState<'leads' | 'domains'>('leads')
  const [leads, setLeads] = useState<FoundLead[]>([])
  const [domains, setDomains] = useState<ProcessedDomain[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Pitch Generation State
  const [generatingForId, setGeneratingForId] = useState<string | null>(null)
  const [pitchResult, setPitchResult] = useState<EmailPitchResult | null>(null)
  const [showPitchModal, setShowPitchModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchData = async (): Promise<void> => {
      try {
        const [leadsData, domainsData] = await Promise.all([
          window.electron.ipcRenderer.invoke('results:getFoundLeads'),
          window.electron.ipcRenderer.invoke('results:getProcessedDomains')
        ])
        if (isMounted) {
          setLeads(leadsData || [])
          setDomains(domainsData || [])
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to load results:', error)
        if (isMounted) setIsLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  const refreshData = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const [leadsData, domainsData] = await Promise.all([
        window.electron.ipcRenderer.invoke('results:getFoundLeads'),
        window.electron.ipcRenderer.invoke('results:getProcessedDomains')
      ])
      setLeads(leadsData || [])
      setDomains(domainsData || [])
    } catch (error) {
      console.error('Failed to load results:', error)
    }
    setIsLoading(false)
  }

  const handleDeleteLead = async (id: string): Promise<void> => {
    await window.electron.ipcRenderer.invoke('results:removeFoundLead', id)
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  const handleDeleteDomain = async (id: string): Promise<void> => {
    await window.electron.ipcRenderer.invoke('results:removeProcessedDomain', id)
    setDomains((prev) => prev.filter((d) => d.id !== id))
  }

  const handleClearAllLeads = async (): Promise<void> => {
    if (confirm('Are you sure you want to clear all leads? This cannot be undone.')) {
      await window.electron.ipcRenderer.invoke('results:clearFoundLeads')
      setLeads([])
    }
  }

  const handleClearAllDomains = async (): Promise<void> => {
    if (
      confirm(
        'Are you sure you want to clear all used domains? This will allow re-processing of these domains.'
      )
    ) {
      await window.electron.ipcRenderer.invoke('results:clearProcessedDomains')
      setDomains([])
    }
  }

  const handleGeneratePitch = async (lead: FoundLead): Promise<void> => {
    setGeneratingForId(lead.id)
    try {
      const result = await window.api.generateEmailPitchForLead(lead)
      if (result.success && result.data) {
        setPitchResult(result.data)
        setShowPitchModal(true)
      } else {
        alert('Failed to generate pitch: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error generating pitch:', error)
      alert('Error generating pitch. Check console for details.')
    } finally {
      setGeneratingForId(null)
    }
  }

  const copyToClipboard = (text: string, field: string): void => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredLeads = leads.filter(
    (lead) =>
      lead.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      lead.domain.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (lead.decisionMaker?.toLowerCase().includes(searchFilter.toLowerCase()) ?? false)
  )

  const filteredDomains = domains.filter(
    (domain) =>
      domain.domain.toLowerCase().includes(searchFilter.toLowerCase()) ||
      domain.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (domain.email?.toLowerCase().includes(searchFilter.toLowerCase()) ?? false)
  )

  return (
    <div className="h-full w-full flex flex-col bg-background relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-semibold text-white mb-4">Results</h1>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView('leads')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'leads'
                ? 'bg-primary text-white'
                : 'bg-slate-700 text-white/60 hover:bg-slate-600'
            }`}
          >
            <FiMail className="inline mr-2" />
            Verified Leads ({leads.length})
          </button>
          <button
            onClick={() => setActiveView('domains')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'domains'
                ? 'bg-primary text-white'
                : 'bg-slate-700 text-white/60 hover:bg-slate-600'
            }`}
          >
            <FiGlobe className="inline mr-2" />
            Used Domains ({domains.length})
          </button>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={activeView === 'leads' ? 'Search leads...' : 'Search domains...'}
              className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={activeView === 'leads' ? handleClearAllLeads : handleClearAllDomains}
            className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
          >
            <FiTrash2 className="inline mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/60">Loading...</div>
          </div>
        ) : activeView === 'leads' ? (
          /* Leads Table */
          filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <FiMail size={48} className="mb-4" />
              <p className="text-lg">No verified leads yet</p>
              <p className="text-sm">Start generating leads from the Email tab</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-slate-800 rounded-xl p-4 hover:bg-slate-700/80 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-primary font-medium text-lg">{lead.email}</span>
                        {lead.verified && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            Verified
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-600 text-white/60 text-xs rounded-full">
                          {lead.source}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-white/60">
                        {lead.decisionMaker && (
                          <div className="flex items-center gap-1">
                            <FiUser size={14} />
                            <span>{lead.decisionMaker}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <FiGlobe size={14} />
                          <span>{lead.domain}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FiCalendar size={14} />
                          <span>{formatDate(lead.foundAt)}</span>
                        </div>
                      </div>
                      {(lead.niche || lead.location) && (
                        <div className="mt-2 text-xs text-white/40">
                          {lead.niche && <span className="mr-3">Niche: {lead.niche}</span>}
                          {lead.location && <span>Location: {lead.location}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGeneratePitch(lead)}
                        disabled={generatingForId === lead.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          generatingForId === lead.id
                            ? 'bg-primary/50 text-white/50 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                        title="Generate personalized email pitch using AI"
                      >
                        {generatingForId === lead.id ? (
                          <>
                            <FiRefreshCw className="animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FiCpu />
                            Generate Pitch
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete lead"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : /* Domains Table */
        filteredDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <FiGlobe size={48} className="mb-4" />
            <p className="text-lg">No processed domains yet</p>
            <p className="text-sm">Domains will appear here after lead generation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDomains.map((domain) => (
              <div
                key={domain.id}
                className="bg-slate-800 rounded-xl p-4 hover:bg-slate-700/80 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-medium">{domain.domain}</span>
                      {domain.email ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Email Found
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                          No Email
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-600 text-white/60 text-xs rounded-full">
                        {domain.source}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-white/60">
                      {domain.email && (
                        <div className="flex items-center gap-1">
                          <FiMail size={14} />
                          <span>{domain.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FiCalendar size={14} />
                        <span>{formatDate(domain.processedAt)}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-white/40 truncate">{domain.url}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteDomain(domain.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete domain (allows re-processing)"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/10 text-center text-white/40 text-sm">
        {activeView === 'leads' ? (
          <p>Leads are stored locally. Delete a lead to remove it from the list.</p>
        ) : (
          <p>
            Domains in this list will be <strong>skipped</strong> during lead generation to save API
            credits. Delete a domain to allow re-processing.
          </p>
        )}
      </div>

      {/* Pitch Result Modal */}
      {showPitchModal && pitchResult && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800">
              <div className="flex items-center gap-2">
                <FiCpu className="text-primary" size={20} />
                <h2 className="text-lg font-semibold text-white">AI Generated Pitch</h2>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Analysis Section */}
              <div className="space-y-4">
                {/* Psychological Triggers - NEW */}
                <div className="bg-linear-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
                  <h3 className="text-xs font-semibold text-purple-400 uppercase mb-2 flex items-center gap-2">
                    ⭐ Psychological Triggers Used
                  </h3>
                  <p className="text-sm text-white/90">{pitchResult.psychological_triggers_used}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                    <h3 className="text-xs font-semibold text-white/40 uppercase mb-2">
                      Strategy Explanation
                    </h3>
                    <p className="text-sm text-white/80">{pitchResult.strategy_explanation}</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                    <h3 className="text-xs font-semibold text-white/40 uppercase mb-2">
                      Audience Analysis
                    </h3>
                    <p className="text-sm text-white/80">{pitchResult.target_audience_analysis}</p>
                  </div>
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase block mb-2">
                  Subject Line
                </label>
                <div className="relative">
                  <div className="bg-slate-950 p-3 rounded-lg border border-white/10 text-white font-medium pr-10">
                    {pitchResult.subject}
                  </div>
                  <button
                    onClick={() => copyToClipboard(pitchResult.subject, 'subject')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white transition-colors"
                  >
                    {copiedField === 'subject' ? (
                      <FiCheck className="text-green-400" />
                    ) : (
                      <FiCopy />
                    )}
                  </button>
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 min-h-[200px]">
                <label className="text-xs font-semibold text-white/40 uppercase block mb-2">
                  Email Body
                </label>
                <div className="relative h-full">
                  <textarea
                    readOnly
                    className="w-full h-full min-h-[300px] bg-slate-950 p-4 rounded-lg border border-white/10 text-white font-mono text-sm resize-none focus:outline-none focus:border-primary/50"
                    value={pitchResult.body}
                  />
                  <button
                    onClick={() => copyToClipboard(pitchResult.body, 'body')}
                    className="absolute right-4 top-4 p-2 bg-slate-800/80 rounded-lg text-white/40 hover:text-white transition-colors border border-white/10"
                  >
                    {copiedField === 'body' ? <FiCheck className="text-green-400" /> : <FiCopy />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setShowPitchModal(false)}
                className="px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  copyToClipboard(`Subject: ${pitchResult.subject}\n\n${pitchResult.body}`, 'full')
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {copiedField === 'full' ? <FiCheck /> : <FiCopy />}
                Copy Full Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { ResultsScreen }
