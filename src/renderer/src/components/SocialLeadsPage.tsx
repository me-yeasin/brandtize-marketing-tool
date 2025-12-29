import { JSX, useCallback, useEffect, useRef, useState } from 'react'
import {
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaDownload,
  FaExternalLinkAlt,
  FaFacebook,
  FaFilter,
  FaGlobe,
  FaLink,
  FaSave,
  FaSearch,
  FaStar,
  FaTimes,
  FaWhatsapp
} from 'react-icons/fa'
import { MdOutlineEmail, MdOutlineLocationOn, MdOutlinePhone } from 'react-icons/md'
import type { SavedFacebookLead } from '../../../preload/index.d'

type TaskStatus = 'idle' | 'running' | 'completed'

// Facebook Page Lead interface
interface FacebookPageLead {
  id: string
  facebookUrl: string
  title: string
  categories: string[]
  email: string | null
  emailVerified?: boolean
  emailLookupAttempted?: boolean
  phone: string | null
  website: string | null
  address: string | null
  messenger: string | null
  likes: number
  followers: number
  rating: number | null
  ratingCount: number | null
  intro: string | null
  adStatus: string | null
  createdAt: string | null
  isBusinessPageActive: boolean
  score: 'gold' | 'silver' | 'bronze'
  savedAt?: number
  hasWhatsApp?: boolean | null
  isLoadingWhatsApp?: boolean
}

interface SocialLeadsPageProps {
  onTaskStatusChange?: (status: TaskStatus) => void
}

function SocialLeadsPage({ onTaskStatusChange }: SocialLeadsPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'facebook-page'>('facebook-page')

  // Search form state
  const [searchMode, setSearchMode] = useState<'keyword' | 'urls'>('keyword')
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkUrls, setBulkUrls] = useState('')
  const [maxResults, setMaxResults] = useState(50)
  const [keywordRequestedMaxResults, setKeywordRequestedMaxResults] = useState(0)
  const [lastKeywordQuery, setLastKeywordQuery] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreResults, setNoMoreResults] = useState(false)

  // Advanced options state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [minRating, setMinRating] = useState<number>(0)
  const [minFollowers, setMinFollowers] = useState<number>(0)
  const [activePagesOnly, setActivePagesOnly] = useState(false)

  // Filter state (post-search filters)
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false)
  const [hasEmailOnly, setHasEmailOnly] = useState(false)
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false)

  // Results state
  const [leads, setLeads] = useState<FacebookPageLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<FacebookPageLead[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // API key state
  const [isApifyConfigured, setIsApifyConfigured] = useState(false)
  const [isCheckingConfig, setIsCheckingConfig] = useState(true)

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'info' | 'error' | 'success'
  } | null>(null)

  const [whatsAppReady, setWhatsAppReady] = useState(false)
  const [whatsAppBulkVerifying, setWhatsAppBulkVerifying] = useState(false)
  const [whatsAppBulkStopRequested, setWhatsAppBulkStopRequested] = useState(false)
  const [whatsAppBulkProgress, setWhatsAppBulkProgress] = useState<{
    current: number
    total: number
    errors: number
  } | null>(null)
  const whatsAppBulkCancelRef = useRef(false)
  const [emailBulkVerifying, setEmailBulkVerifying] = useState(false)
  const [emailBulkStopRequested, setEmailBulkStopRequested] = useState(false)
  const [emailBulkProgress, setEmailBulkProgress] = useState<{
    current: number
    total: number
    errors: number
  } | null>(null)
  const emailBulkCancelRef = useRef(false)
  const savedFacebookLeadByIdRef = useRef<Map<string, SavedFacebookLead>>(new Map())

  // Show toast helper
  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const refreshSavedFacebookLeadCache = async (): Promise<void> => {
    try {
      const saved = await window.api.getSavedFacebookLeads()
      savedFacebookLeadByIdRef.current = new Map(saved.map((l) => [l.id, l]))
    } catch {
      savedFacebookLeadByIdRef.current = new Map()
    }
  }

  const persistSavedLeadEmail = async (
    leadId: string,
    updates: Pick<SavedFacebookLead, 'email' | 'emailVerified' | 'emailLookupAttempted'>
  ): Promise<void> => {
    const saved = savedFacebookLeadByIdRef.current.get(leadId)
    if (!saved) return
    const updated: SavedFacebookLead = { ...saved, ...updates }
    const result = await window.api.updateSavedFacebookLead(updated)
    if (result.success) {
      savedFacebookLeadByIdRef.current.set(leadId, updated)
    }
  }

  const persistSavedLeadWhatsApp = async (leadId: string, hasWhatsApp: boolean): Promise<void> => {
    const saved = savedFacebookLeadByIdRef.current.get(leadId)
    if (!saved) return
    const updated: SavedFacebookLead = { ...saved, hasWhatsApp }
    const result = await window.api.updateSavedFacebookLead(updated)
    if (result.success) {
      savedFacebookLeadByIdRef.current.set(leadId, updated)
    }
  }

  const refreshWhatsAppStatus = useCallback(async (): Promise<boolean> => {
    try {
      const status = await window.api.whatsappGetStatus()
      setWhatsAppReady(status.isReady)
      return status.isReady
    } catch {
      setWhatsAppReady(false)
      return false
    }
  }, [])

  useEffect(() => {
    refreshWhatsAppStatus()
  }, [refreshWhatsAppStatus])

  const waitWithCancel = async (ms: number): Promise<boolean> => {
    const step = 250
    let remaining = ms
    while (remaining > 0) {
      if (whatsAppBulkCancelRef.current) return true
      const duration = Math.min(step, remaining)
      await new Promise<void>((resolve) => window.setTimeout(resolve, duration))
      remaining -= duration
    }
    return whatsAppBulkCancelRef.current
  }

  const waitWithEmailCancel = async (ms: number): Promise<boolean> => {
    const step = 250
    let remaining = ms
    while (remaining > 0) {
      if (emailBulkCancelRef.current) return true
      const duration = Math.min(step, remaining)
      await new Promise<void>((resolve) => window.setTimeout(resolve, duration))
      remaining -= duration
    }
    return emailBulkCancelRef.current
  }

  // Check if Apify is configured on mount
  useEffect(() => {
    const checkConfig = async (): Promise<void> => {
      try {
        const configured = await window.api.isApifyConfigured()
        setIsApifyConfigured(configured)
      } catch (err) {
        console.error('Failed to check Apify config:', err)
      }
      setIsCheckingConfig(false)
    }
    checkConfig()
  }, [])

  // Apply filters when leads or filter options change
  useEffect(() => {
    let filtered = [...leads]

    // Advanced filters (rating, followers, active pages)
    if (minRating > 0) {
      filtered = filtered.filter((lead) => (lead.rating || 0) >= minRating)
    }
    if (minFollowers > 0) {
      filtered = filtered.filter((lead) => lead.followers >= minFollowers)
    }
    if (activePagesOnly) {
      filtered = filtered.filter((lead) => lead.isBusinessPageActive)
    }

    // Post-search filters
    if (noWebsiteOnly) {
      filtered = filtered.filter((lead) => !lead.website)
    }
    if (hasEmailOnly) {
      filtered = filtered.filter((lead) => lead.email)
    }
    if (hasPhoneOnly) {
      filtered = filtered.filter((lead) => lead.phone)
    }

    setFilteredLeads(filtered)
  }, [leads, noWebsiteOnly, hasEmailOnly, hasPhoneOnly, minRating, minFollowers, activePagesOnly])

  // Handle search
  const handleSearch = async (): Promise<void> => {
    if (!isApifyConfigured) {
      showToast('Please configure your Apify API key in Settings > API Keys > Apify', 'error')
      return
    }

    const trimmedQuery = searchQuery.trim()

    if (searchMode === 'keyword' && !trimmedQuery) {
      setError('Please enter a search query (e.g., "restaurants Dhaka")')
      return
    }

    if (searchMode === 'urls' && !bulkUrls.trim()) {
      setError('Please enter at least one Facebook page URL')
      return
    }

    setError(null)
    setIsSearching(true)
    setHasSearched(false)
    onTaskStatusChange?.('running')

    if (searchMode === 'keyword') {
      setKeywordRequestedMaxResults(maxResults)
      setLastKeywordQuery(trimmedQuery)
      setNoMoreResults(false)
    } else {
      setKeywordRequestedMaxResults(0)
      setLastKeywordQuery('')
      setNoMoreResults(false)
    }

    try {
      let results: FacebookPageLead[]

      if (searchMode === 'keyword') {
        results = await window.api.searchFacebookPages({
          searchQuery: trimmedQuery,
          maxResults
        })
      } else {
        const urls = bulkUrls
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url.length > 0 && url.includes('facebook.com'))

        if (urls.length === 0) {
          setError('Please enter valid Facebook page URLs (one per line)')
          setIsSearching(false)
          return
        }

        results = await window.api.scrapeFacebookPageUrls(urls)
      }

      setLeads(results)
      setHasSearched(true)
      showToast(`Found ${results.length} Facebook pages`, 'success')
      onTaskStatusChange?.('completed')

      if (searchMode === 'keyword' && results.length < maxResults) {
        setNoMoreResults(true)
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
      showToast('Search failed. Check your Apify API key and try again.', 'error')
      onTaskStatusChange?.('idle')
    } finally {
      setIsSearching(false)
    }
  }

  const mergeUniqueFacebookLeads = (
    existing: FacebookPageLead[],
    incoming: FacebookPageLead[]
  ): FacebookPageLead[] => {
    const seen = new Set<string>()
    for (const lead of existing) {
      seen.add(lead.facebookUrl || lead.id)
    }

    const appended: FacebookPageLead[] = []
    for (const lead of incoming) {
      const key = lead.facebookUrl || lead.id
      if (!seen.has(key)) {
        seen.add(key)
        appended.push(lead)
      }
    }

    return [...existing, ...appended]
  }

  const handleLoadMore = async (): Promise<void> => {
    if (searchMode !== 'keyword') return
    if (!isApifyConfigured) {
      showToast('Please configure your Apify API key in Settings > API Keys > Apify', 'error')
      return
    }
    if (!lastKeywordQuery) return
    if (isSearching || isLoadingMore || noMoreResults) return

    const nextRequested = (keywordRequestedMaxResults || maxResults) + maxResults

    setIsLoadingMore(true)
    onTaskStatusChange?.('running')

    try {
      const results = await window.api.searchFacebookPages({
        searchQuery: lastKeywordQuery,
        maxResults: nextRequested
      })

      let addedCount = 0
      setLeads((prev) => {
        const merged = mergeUniqueFacebookLeads(prev, results)
        addedCount = merged.length - prev.length
        return merged
      })

      setKeywordRequestedMaxResults(nextRequested)
      setHasSearched(true)

      if (addedCount > 0) {
        showToast(`Added ${addedCount} more Facebook pages`, 'success')
      } else {
        showToast('No more new leads found', 'info')
      }

      if (results.length < nextRequested || addedCount === 0) {
        setNoMoreResults(true)
      }

      onTaskStatusChange?.('completed')
    } catch (err) {
      console.error('Load more error:', err)
      showToast('Failed to load more results. Please try again.', 'error')
      onTaskStatusChange?.('idle')
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Export leads to CSV
  const handleExport = (): void => {
    if (filteredLeads.length === 0) return

    const headers = [
      'Name',
      'Categories',
      'Email',
      'Email Verified',
      'Phone',
      'WhatsApp Verified',
      'Website',
      'Address',
      'Likes',
      'Followers',
      'Rating',
      'Active Page',
      'Score',
      'Facebook URL'
    ]
    const rows = filteredLeads.map((lead) => [
      lead.title,
      lead.categories.join('; '),
      lead.email || '',
      lead.email ? (lead.emailVerified === true ? 'verified' : 'unverified') : '',
      lead.phone || '',
      lead.phone ? (lead.hasWhatsApp === true ? 'verified' : 'unverified') : '',
      lead.website || '',
      lead.address || '',
      lead.likes.toString(),
      lead.followers.toString(),
      lead.rating?.toString() || '',
      lead.isBusinessPageActive ? 'Yes' : 'No',
      lead.score,
      lead.facebookUrl
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facebook-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${filteredLeads.length} leads to CSV`, 'success')
  }

  // Save leads to database
  const handleSaveLeads = async (): Promise<void> => {
    if (filteredLeads.length === 0) return

    try {
      // Convert to SavedFacebookLead format (add savedAt timestamp)
      const leadsToSave = filteredLeads.map((lead) => ({
        ...lead,
        savedAt: Date.now()
      }))

      const result = await window.api.saveFacebookLeads(leadsToSave)

      if (result.success) {
        if (result.count > 0) {
          showToast(`Saved ${result.count} new leads`, 'success')
        } else {
          showToast('All leads already saved', 'info')
        }
      }
    } catch (err) {
      console.error('Failed to save leads:', err)
      showToast('Failed to save leads', 'error')
    }
  }

  const extractDomain = (url: string): string => {
    try {
      let domain = url.toLowerCase()
      if (!domain.startsWith('http')) {
        domain = 'http://' + domain
      }
      const hostname = new URL(domain).hostname
      return hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  const handleCheckWhatsApp = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !lead.phone) return

    if (!whatsAppReady) {
      showToast('Please connect WhatsApp first!', 'error')
      return
    }

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, isLoadingWhatsApp: true } : l)))

    try {
      const result = await window.api.whatsappCheckNumber(lead.phone)

      if (result.error) {
        showToast(result.error, 'error')
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, isLoadingWhatsApp: false } : l))
        )
        return
      }

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, hasWhatsApp: result.hasWhatsApp, isLoadingWhatsApp: false } : l
        )
      )

      if (savedFacebookLeadByIdRef.current.size === 0) {
        await refreshSavedFacebookLeadCache()
      }
      await persistSavedLeadWhatsApp(leadId, result.hasWhatsApp)

      showToast(
        result.hasWhatsApp ? `${lead.title} has WhatsApp!` : `${lead.title} does NOT have WhatsApp`,
        'info'
      )
    } catch (err) {
      console.error('WhatsApp check error:', err)
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, isLoadingWhatsApp: false } : l))
      )
      showToast('Failed to check WhatsApp status', 'error')
    }
  }

  const handleVerifyAllWhatsApp = async (): Promise<void> => {
    const ready = await refreshWhatsAppStatus()
    if (!ready) {
      showToast('Please connect WhatsApp first!', 'error')
      return
    }

    const targets = filteredLeads.filter((l) => l.phone && l.hasWhatsApp == null)
    if (targets.length === 0) {
      showToast('No unverified phone numbers to check.', 'info')
      return
    }

    const delayMs = 5000

    whatsAppBulkCancelRef.current = false
    setWhatsAppBulkStopRequested(false)
    setWhatsAppBulkVerifying(true)
    setWhatsAppBulkProgress({ current: 0, total: targets.length, errors: 0 })
    onTaskStatusChange?.('running')

    let errors = 0
    let stopped = false

    try {
      for (let i = 0; i < targets.length; i++) {
        if (whatsAppBulkCancelRef.current) break

        const lead = targets[i]
        if (!lead.phone) continue

        setWhatsAppBulkProgress({ current: i + 1, total: targets.length, errors })

        try {
          const result = await window.api.whatsappCheckNumber(lead.phone)
          if (result.error) {
            errors += 1
          } else {
            setLeads((prev) =>
              prev.map((l) => (l.id === lead.id ? { ...l, hasWhatsApp: result.hasWhatsApp } : l))
            )
          }
        } catch {
          errors += 1
        }

        if (i < targets.length - 1) {
          const canceled = await waitWithCancel(delayMs)
          if (canceled) break
        }
      }
    } finally {
      stopped = whatsAppBulkCancelRef.current
      setWhatsAppBulkVerifying(false)
      setWhatsAppBulkStopRequested(false)
      setWhatsAppBulkProgress(null)
      whatsAppBulkCancelRef.current = false
    }

    if (stopped) {
      showToast('WhatsApp verification stopped.', 'info')
      onTaskStatusChange?.('idle')
    } else if (errors > 0) {
      showToast(`WhatsApp verification finished with ${errors} errors.`, 'info')
      onTaskStatusChange?.('completed')
    } else {
      showToast('WhatsApp verification finished.', 'success')
      onTaskStatusChange?.('completed')
    }
  }

  const handleStopVerifyAllWhatsApp = (): void => {
    whatsAppBulkCancelRef.current = true
    setWhatsAppBulkStopRequested(true)
  }

  const handleVerifyAllMail = async (): Promise<void> => {
    if (emailBulkVerifying) return

    const targets = filteredLeads.filter(
      (l) =>
        (l.email && l.emailVerified == null) ||
        (!l.email && l.website && l.emailLookupAttempted !== true)
    )
    if (targets.length === 0) {
      showToast('No emails to verify.', 'info')
      return
    }

    const delayMs = 5000

    emailBulkCancelRef.current = false
    setEmailBulkStopRequested(false)
    setEmailBulkVerifying(true)
    setEmailBulkProgress({ current: 0, total: targets.length, errors: 0 })
    await refreshSavedFacebookLeadCache()
    onTaskStatusChange?.('running')

    let errors = 0
    let stopped = false

    try {
      for (let i = 0; i < targets.length; i++) {
        if (emailBulkCancelRef.current) break

        const lead = targets[i]
        setEmailBulkProgress({ current: i + 1, total: targets.length, errors })

        try {
          let updatedLead: FacebookPageLead | null = null

          if (lead.email) {
            const verifyResult = await window.api.verifyEmail(lead.email)
            if (verifyResult.switched) {
              showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
            }
            updatedLead = { ...lead, emailVerified: verifyResult.verified }
          } else if (lead.website) {
            const domain = extractDomain(lead.website)
            const result = await window.api.findEmailForDomain(domain)

            if (result.allKeysExhausted) {
              showToast(
                'All email finder API keys have hit rate limits. Please wait until they reset or add new API keys in Settings → Email.',
                'error'
              )
              errors += 1
              break
            }

            if (result.email) {
              try {
                const verifyResult = await window.api.verifyEmail(result.email)
                if (verifyResult.switched) {
                  showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
                }
                updatedLead = {
                  ...lead,
                  email: result.email,
                  emailVerified: verifyResult.verified,
                  emailLookupAttempted: true
                }
              } catch {
                updatedLead = {
                  ...lead,
                  email: result.email,
                  emailVerified: false,
                  emailLookupAttempted: true
                }
              }
            } else {
              updatedLead = {
                ...lead,
                email: null,
                emailVerified: undefined,
                emailLookupAttempted: true
              }
            }
          }

          if (updatedLead) {
            setLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead! : l)))
            await persistSavedLeadEmail(updatedLead.id, {
              email: updatedLead.email,
              emailVerified: updatedLead.emailVerified,
              emailLookupAttempted: updatedLead.emailLookupAttempted
            })
          }
        } catch {
          errors += 1
        }

        if (i < targets.length - 1) {
          const canceled = await waitWithEmailCancel(delayMs)
          if (canceled) break
        }
      }
    } finally {
      stopped = emailBulkCancelRef.current
      setEmailBulkVerifying(false)
      setEmailBulkStopRequested(false)
      setEmailBulkProgress(null)
      emailBulkCancelRef.current = false
    }

    if (stopped) {
      showToast('Email verification stopped.', 'info')
      onTaskStatusChange?.('idle')
    } else if (errors > 0) {
      showToast(`Email verification finished with ${errors} errors.`, 'info')
      onTaskStatusChange?.('completed')
    } else {
      showToast('Email verification finished.', 'success')
      onTaskStatusChange?.('completed')
    }
  }

  const handleStopVerifyAllMail = (): void => {
    emailBulkCancelRef.current = true
    setEmailBulkStopRequested(true)
  }

  // Open Facebook page
  const openFacebookPage = (url: string): void => {
    window.api.openExternalUrl(url)
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string): void => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard`, 'info')
  }

  // Format number with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Stats counts
  const goldCount = filteredLeads.filter((l) => l.score === 'gold').length
  const silverCount = filteredLeads.filter((l) => l.score === 'silver').length
  const bronzeCount = filteredLeads.filter((l) => l.score === 'bronze').length
  const unverifiedWhatsAppCount = filteredLeads.filter(
    (l) => l.phone && l.hasWhatsApp == null
  ).length
  const unverifiedEmailCount = filteredLeads.filter(
    (l) =>
      (l.email && l.emailVerified == null) ||
      (!l.email && l.website && l.emailLookupAttempted !== true)
  ).length

  return (
    <div className="scout-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'facebook-page' ? 'active' : ''}`}
          onClick={() => setActiveTab('facebook-page')}
        >
          <FaFacebook />
          Facebook Page
        </button>
      </div>

      {/* Check Config */}
      {isCheckingConfig ? (
        <div className="scout-loading">
          <div className="scout-loading-spinner"></div>
          <p>Checking configuration...</p>
        </div>
      ) : !isApifyConfigured ? (
        <div className="scout-empty">
          <FaFacebook className="scout-empty-icon" style={{ color: '#ef4444' }} />
          <h3>Apify API Key Required</h3>
          <p>To scrape Facebook pages, please configure your Apify API key in Settings.</p>
        </div>
      ) : (
        <>
          {/* Search Section */}
          <section className="scout-search">
            {/* Search Mode Toggle */}
            <div className="mode-toggle">
              <button
                className={searchMode === 'keyword' ? 'active' : ''}
                onClick={() => setSearchMode('keyword')}
              >
                <FaSearch /> Search by Keyword
              </button>
              <button
                className={searchMode === 'urls' ? 'active' : ''}
                onClick={() => setSearchMode('urls')}
              >
                <FaLink /> Scrape URLs
              </button>
            </div>

            {searchMode === 'keyword' ? (
              <div className="scout-search-grid">
                <div className="scout-field">
                  <label>Search Query</label>
                  <input
                    type="text"
                    placeholder="e.g., restaurants in dhaka, beauty salons new york"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="scout-field" style={{ maxWidth: '200px' }}>
                  <label>Max Results</label>
                  <div className="custom-select-wrapper">
                    <select
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value))}
                      className="custom-select"
                    >
                      <option value={25}>25 pages (~$0.25)</option>
                      <option value={50}>50 pages (~$0.50)</option>
                      <option value={100}>100 pages (~$1.00)</option>
                      <option value={200}>200 pages (~$2.00)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="scout-field">
                <label>Facebook Page URLs (one per line)</label>
                <textarea
                  placeholder="https://www.facebook.com/businesspage1
https://www.facebook.com/businesspage2"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  className="bulk-textarea"
                />
              </div>
            )}

            {/* Advanced Options Toggle */}
            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
              type="button"
            >
              <FaChevronDown
                style={{
                  transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
              {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            </button>

            {/* Advanced Options Panel */}
            {showAdvanced && (
              <div className="advanced-options">
                <div className="advanced-options-row">
                  {/* Minimum Rating */}
                  <div className="scout-filter">
                    <span>
                      <FaStar style={{ color: '#fbbf24', marginRight: '4px' }} />
                      Min rating
                    </span>
                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    >
                      <option value={0}>Any</option>
                      <option value={3}>3.0+</option>
                      <option value={3.5}>3.5+</option>
                      <option value={4}>4.0+</option>
                      <option value={4.5}>4.5+</option>
                    </select>
                  </div>

                  {/* Minimum Followers */}
                  <div className="scout-filter">
                    <span>Min followers</span>
                    <select
                      value={minFollowers}
                      onChange={(e) => setMinFollowers(parseInt(e.target.value))}
                    >
                      <option value={0}>Any</option>
                      <option value={100}>100+</option>
                      <option value={500}>500+</option>
                      <option value={1000}>1K+</option>
                      <option value={5000}>5K+</option>
                      <option value={10000}>10K+</option>
                    </select>
                  </div>
                </div>

                {/* Active Pages Toggle */}
                <label className="scout-toggle">
                  <input
                    type="checkbox"
                    checked={activePagesOnly}
                    onChange={(e) => setActivePagesOnly(e.target.checked)}
                  />
                  <span className="toggle-track"></span>
                  <span>
                    Active pages only{' '}
                    <span className="option-hint">(pages currently running Facebook ads)</span>
                  </span>
                </label>

                {/* Info Box */}
                <div className="option-info">
                  <FaFilter style={{ flexShrink: 0, marginTop: '2px', color: '#6366f1' }} />
                  <span>
                    Advanced filters help you find high-quality leads. Active pages are businesses
                    actively investing in Facebook advertising.
                  </span>
                </div>
              </div>
            )}

            {/* Post-Search Filters */}
            <div className="scout-filters">
              <label className="scout-toggle">
                <input
                  type="checkbox"
                  checked={noWebsiteOnly}
                  onChange={(e) => setNoWebsiteOnly(e.target.checked)}
                />
                <span className="toggle-track"></span>
                <span>No website only</span>
              </label>
              <label className="scout-toggle">
                <input
                  type="checkbox"
                  checked={hasEmailOnly}
                  onChange={(e) => setHasEmailOnly(e.target.checked)}
                />
                <span className="toggle-track"></span>
                <span>Has email</span>
              </label>
              <label className="scout-toggle">
                <input
                  type="checkbox"
                  checked={hasPhoneOnly}
                  onChange={(e) => setHasPhoneOnly(e.target.checked)}
                />
                <span className="toggle-track"></span>
                <span>Has phone</span>
              </label>
              <button className="scout-search-btn" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search Facebook'}
              </button>
            </div>

            {error && <div className="scout-error">{error}</div>}
          </section>

          {/* Results */}
          {isSearching && (
            <div className="scout-empty">
              <div
                className="scout-loading-spinner"
                style={{ width: '60px', height: '60px' }}
              ></div>
              <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', color: '#f1f5f9' }}>
                Scraping Facebook Data...
              </h3>
              <p style={{ color: '#94a3b8', maxWidth: '400px' }}>
                Please wait while we gather business information. This may take a moment depending
                on the number of results.
              </p>
            </div>
          )}

          {hasSearched && !isSearching && (
            <>
              {/* Stats Bar */}
              <div className="scout-summary">
                <div className="scout-summary-left">
                  <span className="scout-count">{filteredLeads.length} leads</span>
                  <div className="scout-badges">
                    <span className="badge gold">{goldCount} gold</span>
                    <span className="badge silver">{silverCount} silver</span>
                    <span className="badge bronze">{bronzeCount} bronze</span>
                  </div>
                </div>
                <div className="scout-actions">
                  {whatsAppBulkVerifying ? (
                    <button
                      className="scout-btn outline"
                      onClick={handleStopVerifyAllWhatsApp}
                      disabled={whatsAppBulkStopRequested}
                    >
                      <FaTimes />{' '}
                      {whatsAppBulkStopRequested
                        ? 'Stopping...'
                        : whatsAppBulkProgress
                          ? `Stop (${whatsAppBulkProgress.current}/${whatsAppBulkProgress.total})`
                          : 'Stop'}
                    </button>
                  ) : (
                    <button
                      className="scout-btn outline"
                      onClick={handleVerifyAllWhatsApp}
                      disabled={!whatsAppReady || unverifiedWhatsAppCount === 0}
                      title={
                        whatsAppReady
                          ? 'Verify WhatsApp for all unverified numbers'
                          : 'Connect WhatsApp first'
                      }
                    >
                      <FaWhatsapp />{' '}
                      {unverifiedWhatsAppCount > 0
                        ? `Verify All WhatsApp (${unverifiedWhatsAppCount})`
                        : 'Verify All WhatsApp'}
                    </button>
                  )}
                  {emailBulkVerifying ? (
                    <button
                      className="scout-btn outline"
                      onClick={handleStopVerifyAllMail}
                      disabled={emailBulkStopRequested}
                    >
                      <FaTimes />{' '}
                      {emailBulkStopRequested
                        ? 'Stopping...'
                        : emailBulkProgress
                          ? `Stop (${emailBulkProgress.current}/${emailBulkProgress.total})`
                          : 'Stop'}
                    </button>
                  ) : (
                    <button
                      className="scout-btn outline"
                      onClick={handleVerifyAllMail}
                      disabled={unverifiedEmailCount === 0}
                    >
                      <MdOutlineEmail style={{ marginRight: '6px' }} />
                      {unverifiedEmailCount > 0
                        ? `Verify All Mail (${unverifiedEmailCount})`
                        : 'Verify All Mail'}
                    </button>
                  )}
                  <button
                    className="scout-btn outline"
                    onClick={handleExport}
                    disabled={filteredLeads.length === 0}
                  >
                    <FaDownload /> Export CSV
                  </button>
                  <button
                    className="scout-btn primary"
                    onClick={handleSaveLeads}
                    disabled={filteredLeads.length === 0}
                  >
                    <FaSave /> Save Leads
                  </button>
                  {searchMode === 'keyword' && (
                    <button
                      className="scout-btn outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore || noMoreResults}
                      title={
                        noMoreResults
                          ? 'No more results available'
                          : `Load next ${maxResults} results`
                      }
                    >
                      <FaChevronDown /> {isLoadingMore ? 'Loading...' : `Load Next ${maxResults}`}
                    </button>
                  )}
                </div>
              </div>

              {/* Results List */}
              {filteredLeads.length === 0 ? (
                <div className="scout-empty">
                  <div className="scout-empty-icon">
                    <FaSearch />
                  </div>
                  <h3>No Leads Found</h3>
                  <p>Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div className="scout-leads">
                  {filteredLeads.map((lead, index) => (
                    <div key={`${lead.id}-${index}`} className={`scout-lead ${lead.score}`}>
                      {/* Left: Score indicator */}
                      <div className={`lead-indicator ${lead.score}`}></div>

                      {/* Main Content */}
                      <div className="lead-main">
                        <div className="lead-top">
                          <h3 className="lead-name" title={lead.title}>
                            {lead.title}
                          </h3>
                          <span className="lead-category" title={lead.categories.join(', ')}>
                            {lead.categories[0] || 'Page'}
                          </span>
                          {lead.isBusinessPageActive && (
                            <span className="active-badge" title="Currently running Facebook ads">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="lead-address">
                          {lead.address ? (
                            <>
                              <MdOutlineLocationOn
                                style={{
                                  display: 'inline',
                                  verticalAlign: 'text-bottom',
                                  marginRight: '4px'
                                }}
                              />
                              {lead.address}
                            </>
                          ) : (
                            'No address available'
                          )}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="lead-stats">
                        <div className="lead-stat">
                          <span className="stat-value">
                            <FaStar className="star full" style={{ marginRight: '4px' }} />
                            {lead.rating || 'N/A'}
                          </span>
                          <span className="stat-label">
                            ({lead.ratingCount || 0} reviews) • {formatNumber(lead.followers)}{' '}
                            followers
                          </span>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="lead-contact">
                        {lead.phone ? (
                          <span className="contact-phone-wrapper">
                            <span className="contact-phone">
                              <MdOutlinePhone style={{ marginRight: '4px' }} />
                              {lead.phone}
                            </span>
                            <button
                              className="copy-btn"
                              onClick={() => copyToClipboard(lead.phone!, 'Phone')}
                              title="Copy Phone"
                            >
                              <FaCopy />
                            </button>
                            <button
                              className="whatsapp-btn"
                              onClick={() => handleCheckWhatsApp(lead.id)}
                              title={whatsAppReady ? 'Check WhatsApp' : 'Connect WhatsApp first'}
                              disabled={!whatsAppReady || lead.isLoadingWhatsApp}
                            >
                              {lead.isLoadingWhatsApp ? (
                                <div className="action-spinner" />
                              ) : (
                                <FaWhatsapp />
                              )}
                            </button>
                            {lead.hasWhatsApp === true && (
                              <span className="verified-badge" title="Has WhatsApp">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  stroke="none"
                                >
                                  <circle cx="12" cy="12" r="12" fill="#22c55e" />
                                  <path
                                    d="M9 12l2 2 4-4"
                                    stroke="white"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            )}
                            {lead.hasWhatsApp === false && (
                              <span className="unverified-badge" title="No WhatsApp">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  stroke="none"
                                >
                                  <circle cx="12" cy="12" r="12" fill="#ef4444" />
                                  <path
                                    d="M8 8l8 8M16 8l-8 8"
                                    stroke="white"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="contact-no-phone">
                            <FaTimes style={{ marginRight: '4px' }} /> No phone
                          </span>
                        )}

                        {lead.email ? (
                          <span className="contact-email-wrapper">
                            <span className="contact-email" title={lead.email}>
                              <MdOutlineEmail style={{ marginRight: '4px' }} />
                              {lead.email}
                            </span>
                            {lead.emailVerified === true && (
                              <span className="verified-badge" title="Email verified">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  stroke="none"
                                >
                                  <circle cx="12" cy="12" r="12" fill="#22c55e" />
                                  <path
                                    d="M9 12l2 2 4-4"
                                    stroke="white"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            )}
                            {lead.emailVerified === false && (
                              <span className="unverified-badge" title="Email not verified">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  stroke="none"
                                >
                                  <circle cx="12" cy="12" r="12" fill="#ef4444" />
                                  <path
                                    d="M8 8l8 8M16 8l-8 8"
                                    stroke="white"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                            )}
                            <button
                              className="copy-btn"
                              onClick={() => copyToClipboard(lead.email!, 'Email')}
                              title="Copy Email"
                            >
                              <FaCopy />
                            </button>
                          </span>
                        ) : lead.website && lead.emailLookupAttempted === true ? (
                          <span className="contact-no-email">
                            <FaTimes style={{ marginRight: '4px' }} /> No email found
                          </span>
                        ) : null}

                        {!lead.website ? (
                          <span className="contact-no-web">
                            <FaGlobe style={{ marginRight: '4px' }} /> No website
                          </span>
                        ) : (
                          <span className="contact-has-web">
                            <FaCheck style={{ marginRight: '4px' }} /> Has website
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="lead-actions">
                        <button
                          className="lead-action"
                          title="Open Facebook Page"
                          onClick={() => openFacebookPage(lead.facebookUrl)}
                        >
                          <FaExternalLinkAlt />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default SocialLeadsPage
