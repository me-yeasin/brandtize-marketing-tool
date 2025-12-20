import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  FiFileText,
  FiCpu,
  FiCheckCircle,
  FiTarget,
  FiUserCheck,
  FiArrowRight,
  FiGlobe
} from 'react-icons/fi'

// --- Interfaces ---

interface SearchResult {
  title: string
  link: string
  snippet: string
}

interface Lead {
  url: string
  email: string | null
  decisionMaker: string | null
  verified: boolean
  source: string
  needsServices?: boolean
  serviceMatchReason?: string | null
}

interface LeadGenerationViewProps {
  searchQuery: string
  niche: string
  location: string
}

// --- Components ---


const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: number, icon: any, colorClass: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
    <div className={`p-3 rounded-full bg-white/5 ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <div className="text-2xl font-light text-white">{value}</div>
      <div className="text-xs text-white/40 uppercase tracking-wider">{label}</div>
    </div>
  </div>
)

// --- Main View ---

function LeadGenerationView({
  searchQuery,
  niche,
  location
}: LeadGenerationViewProps): React.JSX.Element {
  // State
  const [logs, setLogs] = useState<{ id: string, type: string, message: string, detail?: string }[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Data Stores
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [scrapedCount, setScrapedCount] = useState(0)
  const [verifiedLeads, setVerifiedLeads] = useState<Lead[]>([])

  // Current Activity Indicators
  const [currentActivity, setCurrentActivity] = useState<string>('Initializing...')

  const addLog = (type: string, message: string, detail?: string) => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), type, message, detail }])
  }

  // Scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    // Start lead generation
    window.api.generateLeads({ searchQuery, niche, location })
    addLog('system', `Started search for: ${searchQuery}`)
    setCurrentActivity('Searching the web...')

    // --- Event Listeners ---

    const unsubSearchStart = window.api.onLeadsSearchStart(() => {
      setCurrentActivity('Querying Search Engines...')
    })

    const unsubSearchComplete = window.api.onLeadsSearchComplete((results) => {
      const res = results as SearchResult[]
      setSearchResults(res)
      addLog('search', `Found ${res.length} potential websites`)
      setCurrentActivity(`Queueing ${res.length} sites for analysis...`)
    })

    const unsubScrapeStart = window.api.onLeadsScrapeStart((url) => {
      setCurrentActivity(`Scraping: ${new URL(url).hostname}`)
    })

    const unsubScrapeComplete = window.api.onLeadsScrapeComplete((data) => {
      const { url } = data as { url: string }
      setScrapedCount(prev => prev + 1)
      addLog('scrape', `Scraped content from ${new URL(url).hostname}`)
    })

    const unsubScrapeError = window.api.onLeadsScrapeError((data) => {
       const { url } = data as { url: string }
       addLog('error', `Failed to scrape ${new URL(url).hostname}`)
    })

    const unsubAiStart = window.api.onLeadsAiStart((url) => {
       setCurrentActivity(`Analyzing: ${new URL(url).hostname}`)
    })

    const unsubAiResult = window.api.onLeadsAiResult(() => {
      // Optional: Log granular AI results if needed
    })

    const unsubServiceMatchResult = window.api.onLeadsServiceMatchResult((data) => {
       const { url, needsServices } = data as { url: string, needsServices: boolean }
       if (needsServices) {
         addLog('match', `Qualified lead detected: ${new URL(url).hostname}`)
       }
    })

    const unsubLeadFound = window.api.onLeadFound((lead) => {
      const l = lead as Lead
      setVerifiedLeads(prev => [...prev, l])
      addLog('success', `Verified Contact: ${l.email}`, l.decisionMaker ? `Decision Maker: ${l.decisionMaker}` : undefined)
      toast.success('New Verified Lead Found!')
    })

    const unsubComplete = window.api.onLeadsComplete(() => {
      setCurrentActivity('Process Complete')
      addLog('system', 'Lead generation finished successfully')
    })

    const unsubError = window.api.onLeadsError((err) => {
      setCurrentActivity('Error encountered')
      addLog('error', err)
    })

    // Other handlers (keeping minimal for now)
    const noop = () => {}
    const unsub1 = window.api.onLeadsServiceSwitched(noop)
    const unsub2 = window.api.onLeadsProtectedUrl(noop)
    const unsub3 = window.api.onLeadsKeyRotation(noop)
    const unsub4 = window.api.onLeadsCleanupComplete(noop)
    const unsub5 = window.api.onLeadsServiceMatchStart(noop)
    const unsub6 = window.api.onLeadsHunterStart(noop)
    const unsub7 = window.api.onLeadsHunterResult(noop)
    const unsub8 = window.api.onLeadsVerifyStart(noop)
    const unsub9 = window.api.onLeadsVerifyResult(noop)


    return () => {
      unsubSearchStart()
      unsubSearchComplete()
      unsubScrapeStart()
      unsubScrapeComplete()
      unsubScrapeError()
      unsubAiStart()
      unsubAiResult()
      unsubLeadFound()
      unsubComplete()
      unsubError()
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsubServiceMatchResult()
    }
  }, [searchQuery, niche, location])

  return (
    <div className="h-full w-full p-6 overflow-hidden flex flex-col">

      {/* Top Header & Stats */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-4">
        <div>
           <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"/>
              Processing
           </div>
           <h1 className="text-2xl font-medium text-white tracking-tight">
             {currentActivity}
           </h1>
        </div>

        <div className="flex gap-4">
           <StatCard
             label="Found"
             value={searchResults.length}
             icon={FiGlobe}
             colorClass="text-blue-400 bg-blue-400/10"
           />
           <StatCard
             label="Scraped"
             value={scrapedCount}
             icon={FiFileText}
             colorClass="text-orange-400 bg-orange-400/10"
           />
           <StatCard
             label="Verified"
             value={verifiedLeads.length}
             icon={FiCheckCircle}
             colorClass="text-green-400 bg-green-400/10"
           />
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">

        {/* Left Col: Activity Stream (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-4 min-h-0">

          {/* Active Search Results (Shown only when available) */}
          {searchResults.length > 0 && (
             <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-[200px] overflow-y-auto shrink-0">
               <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 sticky top-0 bg-[#161b22] py-1">
                 Search Results
               </h3>
               <div className="grid grid-cols-1 gap-2">
                 {searchResults.map((r, i) => (
                   <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-white/5 transition-colors group">
                     <div className="mt-1 text-white/20 group-hover:text-primary transition-colors">
                        <FiGlobe size={14} />
                     </div>
                     <div className="min-w-0">
                        <div className="text-sm text-white/90 truncate font-medium">{r.title}</div>
                        <div className="text-xs text-white/40 truncate">{r.link}</div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {/* Live Terminal / Logs */}
          <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 overflow-hidden flex flex-col">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FiCpu /> System Activity
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm">
               {logs.length === 0 && (
                 <div className="text-white/20 italic text-center mt-10">Waiting for process to start...</div>
               )}
               {logs.map((log) => (
                 <div key={log.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-start gap-3">
                      <span className="text-white/20 text-xs mt-0.5">
                        {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                      <div className="flex-1">
                        <span className={`
                          ${log.type === 'error' ? 'text-red-400' : ''}
                          ${log.type === 'success' ? 'text-green-400' : ''}
                          ${log.type === 'match' ? 'text-pink-400' : ''}
                          ${log.type === 'search' ? 'text-blue-400' : ''}
                          ${['scrape', 'system'].includes(log.type) ? 'text-white/70' : ''}
                        `}>
                          {log.type === 'success' && '✓ '}
                          {log.message}
                        </span>
                        {log.detail && (
                          <div className="text-white/30 text-xs mt-1 pl-2 border-l-2 border-white/10">
                            {log.detail}
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               ))}
               <div ref={logsEndRef} />
            </div>
          </div>

        </div>

        {/* Right Col: Success Stream (5 cols) */}
        <div className="md:col-span-5 flex flex-col min-h-0 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
           <div className="p-4 border-b border-white/5 bg-white/5">
              <h2 className="font-medium text-white flex items-center gap-2">
                 <FiTarget className="text-primary" />
                 Verified Leads
              </h2>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {verifiedLeads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <FiUserCheck size={32} />
                   </div>
                   <p className="text-sm">Verified leads will appear here as they are discovered.</p>
                </div>
              ) : (
                verifiedLeads.map((lead, i) => (
                  <div key={i} className="bg-slate-800/50 hover:bg-slate-800 border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] group animate-in zoom-in-95 duration-300">
                     <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 rounded bg-green-500/10 text-green-400">
                             <FiCheckCircle size={14} />
                           </div>
                           <span className="text-xs font-medium text-green-400 tracking-wide uppercase">Verified</span>
                        </div>
                        <a href={lead.url} target="_blank" rel="noreferrer" className="text-white/20 hover:text-white transition-colors">
                           <FiArrowRight size={14} />
                        </a>
                     </div>

                     <div className="font-mono text-white text-sm mb-1 break-all select-all">
                        {lead.email}
                     </div>

                     {lead.decisionMaker && (
                       <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
                         <FiUserCheck size={12} />
                         {lead.decisionMaker}
                       </div>
                     )}

                     <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                        <span className="truncate max-w-[150px]">{new URL(lead.url).hostname}</span>
                        <span>Source: {lead.source}</span>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

      </div>
    </div>
  )
}

export { LeadGenerationView }
