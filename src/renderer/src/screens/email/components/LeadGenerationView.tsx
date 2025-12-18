import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  FiSearch,
  FiFilter,
  FiFileText,
  FiCpu,
  FiMail,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiTarget,
  FiXCircle
} from 'react-icons/fi'

interface SearchResult {
  title: string
  link: string
  snippet: string
}

interface ScrapedContent {
  url: string
  content: string
  title: string
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

interface ServiceMatchResult {
  url: string
  needsServices: boolean
  reason: string | null
}

interface LeadGenerationViewProps {
  searchQuery: string
  niche: string
  location: string
}

function LeadGenerationView({
  searchQuery,
  niche,
  location
}: LeadGenerationViewProps): React.JSX.Element {
  const [stage, setStage] = useState<string>('searching')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [cleanedUrls, setCleanedUrls] = useState<string[]>([])
  const [scrapedContents, setScrapedContents] = useState<Map<string, ScrapedContent>>(new Map())
  const [currentScraping, setCurrentScraping] = useState<string>('')
  const [currentAiUrl, setCurrentAiUrl] = useState<string>('')
  const [aiResults, setAiResults] = useState<
    Map<string, { email: string | null; decisionMaker: string | null }>
  >(new Map())
  const [serviceMatches, setServiceMatches] = useState<Map<string, ServiceMatchResult>>(new Map())
  const [currentServiceMatch, setCurrentServiceMatch] = useState<string>('')
  const [verifiedLeads, setVerifiedLeads] = useState<Lead[]>([])
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(
    new Set(['search', 'cleanup', 'scrape', 'serviceMatch'])
  )
  const [error, setError] = useState<string>('')
  const [skippedCount, setSkippedCount] = useState(0)
  const [cleanupProgress, setCleanupProgress] = useState<{
    current: number
    total: number
    url: string
    status: string
    service?: string
  } | null>(null)

  const togglePanel = (panel: string): void => {
    setExpandedPanels((prev) => {
      const next = new Set(prev)
      if (next.has(panel)) {
        next.delete(panel)
      } else {
        next.add(panel)
      }
      return next
    })
  }

  useEffect(() => {
    // Start lead generation
    window.api.generateLeads({ searchQuery, niche, location })

    // Set up event listeners
    const unsubSearchStart = window.api.onLeadsSearchStart(() => {
      setStage('searching')
    })

    const unsubSearchComplete = window.api.onLeadsSearchComplete((results) => {
      setSearchResults(results as SearchResult[])
      setStage('cleanup')
    })

    const unsubCleanupProgress = window.api.onLeadsCleanupProgress((data) => {
      setCleanupProgress(data)
    })

    const unsubServiceSwitched = window.api.onLeadsServiceSwitched((data) => {
      toast.warning(`Service switched: ${data.from} → ${data.to}`, {
        description: data.reason,
        duration: 3000
      })
    })

    const unsubProtectedUrl = window.api.onLeadsProtectedUrl((data) => {
      toast.info('Protected website detected', {
        description: `${new URL(data.url).hostname} - treating as secure business`,
        duration: 2000
      })
    })

    const unsubCleanupComplete = window.api.onLeadsCleanupComplete((urls) => {
      setCleanupProgress(null)
      setCleanedUrls(urls)
      setStage('scraping')
    })

    const unsubScrapeStart = window.api.onLeadsScrapeStart((url) => {
      setCurrentScraping(url)
    })

    const unsubScrapeComplete = window.api.onLeadsScrapeComplete((data) => {
      const { url, content } = data as { url: string; content: ScrapedContent }
      setScrapedContents((prev) => new Map(prev).set(url, content))
      setCurrentScraping('')
    })

    const unsubScrapeError = window.api.onLeadsScrapeError((data) => {
      const { url } = data as { url: string; error: string }
      setScrapedContents((prev) =>
        new Map(prev).set(url, { url, content: 'Error scraping', title: 'Error' })
      )
      setCurrentScraping('')
    })

    const unsubAiStart = window.api.onLeadsAiStart((url) => {
      setCurrentAiUrl(url)
      setStage('analyzing')
    })

    const unsubAiResult = window.api.onLeadsAiResult((data) => {
      const { url, email, decisionMaker } = data as {
        url: string
        email: string | null
        decisionMaker: string | null
      }
      setAiResults((prev) => new Map(prev).set(url, { email, decisionMaker }))
      setCurrentAiUrl('')
    })

    const unsubServiceMatchStart = window.api.onLeadsServiceMatchStart((url) => {
      setCurrentServiceMatch(url)
      setStage('serviceMatch')
    })

    const unsubServiceMatchResult = window.api.onLeadsServiceMatchResult((data) => {
      const { url, needsServices, reason } = data as {
        url: string
        needsServices: boolean
        reason: string | null
      }
      setServiceMatches((prev) => new Map(prev).set(url, { url, needsServices, reason }))
      setCurrentServiceMatch('')
      if (!needsServices) {
        setSkippedCount((prev) => prev + 1)
      }
    })

    const unsubLeadFound = window.api.onLeadFound((lead) => {
      setVerifiedLeads((prev) => [...prev, lead as Lead])
    })

    const unsubComplete = window.api.onLeadsComplete(() => {
      setStage('complete')
    })

    const unsubError = window.api.onLeadsError((err) => {
      setError(err)
      setStage('error')
    })

    return () => {
      unsubSearchStart()
      unsubSearchComplete()
      unsubCleanupProgress()
      unsubServiceSwitched()
      unsubProtectedUrl()
      unsubCleanupComplete()
      unsubScrapeStart()
      unsubScrapeComplete()
      unsubScrapeError()
      unsubAiStart()
      unsubAiResult()
      unsubServiceMatchStart()
      unsubServiceMatchResult()
      unsubLeadFound()
      unsubComplete()
      unsubError()
    }
  }, [searchQuery, niche, location])

  return (
    <div className="h-full flex gap-10">
      {/* Main Content - Progress Panels */}
      <div className="flex-1 overflow-y-auto max-w-[60%] p-4 space-y-4">
        {/* Search Query Panel */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => togglePanel('search')}
            className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/50"
          >
            <FiSearch className="text-blue-400" size={20} />
            <span className="font-medium text-white flex-1">Web Search</span>
            {stage === 'searching' && (
              <span className="text-xs text-yellow-400 animate-pulse">Searching...</span>
            )}
            {searchResults.length > 0 && (
              <span className="text-xs text-green-400">{searchResults.length} results</span>
            )}
            {expandedPanels.has('search') ? <FiChevronDown /> : <FiChevronRight />}
          </button>
          {expandedPanels.has('search') && (
            <div className="px-4 pb-4 space-y-2">
              <div className="text-xs text-white/60 bg-slate-700/50 p-2 rounded break-all">
                {searchQuery}
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      className="text-xs text-white/80 p-2 bg-slate-700/30 rounded truncate"
                    >
                      {r.link}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cleanup Panel - Show during cleanup or after completion */}
        {(cleanupProgress || cleanedUrls.length > 0) && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => togglePanel('cleanup')}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/50"
            >
              <FiFilter className="text-purple-400" size={20} />
              <span className="font-medium text-white flex-1">URL Cleanup</span>
              {cleanupProgress && (
                <span className="text-xs text-yellow-400 animate-pulse">
                  {cleanupProgress.current}/{cleanupProgress.total} -{' '}
                  {cleanupProgress.service || 'Processing'}
                </span>
              )}
              {!cleanupProgress && cleanedUrls.length > 0 && (
                <span className="text-xs text-green-400">{cleanedUrls.length} URLs passed</span>
              )}
              {expandedPanels.has('cleanup') ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {expandedPanels.has('cleanup') && (
              <div className="px-4 pb-4 space-y-2">
                {/* Current URL being processed */}
                {cleanupProgress && (
                  <div className="text-xs p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                    <div className="text-yellow-400 font-medium mb-1">
                      Processing ({cleanupProgress.current}/{cleanupProgress.total})
                    </div>
                    <div className="text-white/70 truncate">{cleanupProgress.url}</div>
                    {cleanupProgress.service && (
                      <div className="text-white/50 mt-1">Using: {cleanupProgress.service}</div>
                    )}
                  </div>
                )}
                {/* Cleaned URLs list */}
                {cleanedUrls.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {cleanedUrls.map((url, i) => (
                      <div
                        key={i}
                        className="text-xs text-white/80 p-2 bg-slate-700/30 rounded truncate"
                      >
                        {url}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scraping Panel */}
        {(currentScraping || scrapedContents.size > 0) && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => togglePanel('scrape')}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/50"
            >
              <FiFileText className="text-orange-400" size={20} />
              <span className="font-medium text-white flex-1">Content Scraping (Jina)</span>
              {currentScraping && (
                <span className="text-xs text-yellow-400 animate-pulse">Scraping...</span>
              )}
              <span className="text-xs text-green-400">{scrapedContents.size} scraped</span>
              {expandedPanels.has('scrape') ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {expandedPanels.has('scrape') && (
              <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
                {currentScraping && (
                  <div className="text-xs text-yellow-400 p-2 bg-yellow-500/10 rounded">
                    Scraping: {currentScraping}
                  </div>
                )}
                {Array.from(scrapedContents.entries()).map(([url, content]) => (
                  <details key={url} className="bg-slate-700/30 rounded">
                    <summary className="text-xs text-white/80 p-2 cursor-pointer truncate">
                      {url}
                    </summary>
                    <div className="text-xs text-white/60 p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {content.content.slice(0, 500)}...
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Panel */}
        {(currentAiUrl || aiResults.size > 0) && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => togglePanel('ai')}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/50"
            >
              <FiCpu className="text-cyan-400" size={20} />
              <span className="font-medium text-white flex-1">AI Analysis</span>
              {currentAiUrl && (
                <span className="text-xs text-yellow-400 animate-pulse">Analyzing...</span>
              )}
              <span className="text-xs text-green-400">{aiResults.size} analyzed</span>
              {expandedPanels.has('ai') ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {expandedPanels.has('ai') && (
              <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
                {currentAiUrl && (
                  <div className="text-xs text-yellow-400 p-2 bg-yellow-500/10 rounded">
                    Analyzing: {currentAiUrl}
                  </div>
                )}
                {Array.from(aiResults.entries()).map(([url, result]) => (
                  <div key={url} className="text-xs p-2 bg-slate-700/30 rounded">
                    <div className="text-white/80 truncate">{url}</div>
                    <div className="text-white/60 mt-1">
                      Email: {result.email || 'Not found'} | DM:{' '}
                      {result.decisionMaker || 'Not found'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Service Match Panel - Shows qualification based on your profile services */}
        {(currentServiceMatch || serviceMatches.size > 0) && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => togglePanel('serviceMatch')}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/50"
            >
              <FiTarget className="text-pink-400" size={20} />
              <span className="font-medium text-white flex-1">Service Matching</span>
              {currentServiceMatch && (
                <span className="text-xs text-yellow-400 animate-pulse">Checking...</span>
              )}
              <span className="text-xs text-green-400">
                {Array.from(serviceMatches.values()).filter((m) => m.needsServices).length}{' '}
                qualified
              </span>
              <span className="text-xs text-red-400">{skippedCount} skipped</span>
              {expandedPanels.has('serviceMatch') ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {expandedPanels.has('serviceMatch') && (
              <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
                {currentServiceMatch && (
                  <div className="text-xs text-yellow-400 p-2 bg-yellow-500/10 rounded">
                    Checking: {currentServiceMatch}
                  </div>
                )}
                {Array.from(serviceMatches.entries()).map(([url, match]) => (
                  <div
                    key={url}
                    className={`text-xs p-2 rounded ${
                      match.needsServices ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {match.needsServices ? (
                        <FiCheckCircle className="text-green-400 shrink-0" size={12} />
                      ) : (
                        <FiXCircle className="text-red-400 shrink-0" size={12} />
                      )}
                      <span
                        className={`truncate ${match.needsServices ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {match.needsServices ? 'QUALIFIED' : 'SKIPPED'}
                      </span>
                    </div>
                    <div className="text-white/60 truncate mt-1">{url}</div>
                    {match.reason && (
                      <div className="text-white/50 mt-1 text-[10px]">{match.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {stage === 'complete' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <FiCheckCircle className="text-green-400 mx-auto mb-2" size={24} />
            <div className="text-green-400 font-medium">Process Complete!</div>
            <div className="text-white/60 text-sm">Found {verifiedLeads.length} verified leads</div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <div className="text-red-400">{error}</div>
          </div>
        )}
      </div>

      {/* Sidebar - Verified Leads */}
      <div className="w-full max-w-[30%] border-l border-slate-700 bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FiMail className="text-green-400" size={18} />
            <span className="font-medium text-white">Verified Leads</span>
            <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
              {verifiedLeads.length}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {verifiedLeads.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-8">
              Verified leads will appear here
            </div>
          ) : (
            verifiedLeads.map((lead, i) => (
              <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-400" size={14} />
                  <span className="text-white text-sm font-medium">{lead.email}</span>
                </div>
                {lead.decisionMaker && (
                  <div className="text-white/60 text-xs">Contact: {lead.decisionMaker}</div>
                )}
                <div className="text-white/40 text-xs truncate">{lead.url}</div>
                <div className="text-xs text-primary/80">Source: {lead.source}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export { LeadGenerationView }
