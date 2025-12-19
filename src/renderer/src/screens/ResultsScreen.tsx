import { useState, useEffect } from 'react'
import {
  FiTrash2,
  FiMail,
  FiGlobe,
  FiUser,
  FiCalendar,
  FiSearch,
  FiRefreshCw
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

function ResultsScreen(): React.JSX.Element {
  const [activeView, setActiveView] = useState<'leads' | 'domains'>('leads')
  const [leads, setLeads] = useState<FoundLead[]>([])
  const [domains, setDomains] = useState<ProcessedDomain[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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
    <div className="h-full w-full flex flex-col bg-background">
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
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete lead"
                    >
                      <FiTrash2 size={18} />
                    </button>
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
    </div>
  )
}

export { ResultsScreen }
