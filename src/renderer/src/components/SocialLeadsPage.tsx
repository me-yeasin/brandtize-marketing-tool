import { JSX, useEffect, useState } from 'react'
import {
  FaCheck,
  FaCopy, // Changed from FaXmark
  FaDownload,
  FaExternalLinkAlt,
  FaFacebook,
  FaGlobe,
  FaLink,
  FaSearch,
  FaStar,
  FaTimes,
  FaWhatsapp
} from 'react-icons/fa'
import { MdOutlineEmail, MdOutlineLocationOn, MdOutlinePhone } from 'react-icons/md'

// Facebook Page Lead interface
interface FacebookPageLead {
  id: string
  facebookUrl: string
  title: string
  categories: string[]
  email: string | null
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
  score: 'gold' | 'silver' | 'bronze'
  savedAt?: number
  hasWhatsApp?: boolean | null
}

function SocialLeadsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'facebook-page'>('facebook-page')

  // Search form state
  const [searchMode, setSearchMode] = useState<'keyword' | 'urls'>('keyword')
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkUrls, setBulkUrls] = useState('')
  const [maxResults, setMaxResults] = useState(50)

  // Filter state
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

  // Show toast helper
  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
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
  }, [leads, noWebsiteOnly, hasEmailOnly, hasPhoneOnly])

  // Handle search
  const handleSearch = async (): Promise<void> => {
    if (!isApifyConfigured) {
      showToast('Please configure your Apify API key in Settings > API Keys > Apify', 'error')
      return
    }

    if (searchMode === 'keyword' && !searchQuery.trim()) {
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

    try {
      let results: FacebookPageLead[]

      if (searchMode === 'keyword') {
        results = await window.api.searchFacebookPages({
          searchQuery: searchQuery.trim(),
          maxResults
        })
      } else {
        // Parse URLs from bulk input
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
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
      showToast('Search failed. Check your Apify API key and try again.', 'error')
    } finally {
      setIsSearching(false)
    }
  }

  // Export leads to CSV
  const handleExport = (): void => {
    if (filteredLeads.length === 0) return

    const headers = [
      'Name',
      'Categories',
      'Email',
      'Phone',
      'Website',
      'Address',
      'Likes',
      'Followers',
      'Rating',
      'Score',
      'Facebook URL'
    ]
    const rows = filteredLeads.map((lead) => [
      lead.title,
      lead.categories.join('; '),
      lead.email || '',
      lead.phone || '',
      lead.website || '',
      lead.address || '',
      lead.likes.toString(),
      lead.followers.toString(),
      lead.rating?.toString() || '',
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
                    placeholder="e.g., restaurants dhaka, beauty salons new york"
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

            {/* Filters */}
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
                  <button
                    className="scout-btn outline"
                    onClick={handleExport}
                    disabled={filteredLeads.length === 0}
                  >
                    <FaDownload /> Export CSV
                  </button>
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
                            {lead.categories[0]}
                          </span>
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
                              onClick={() =>
                                window.api.openExternalUrl(
                                  `https://wa.me/${lead.phone!.replace(/[^0-9]/g, '')}`
                                )
                              }
                              title="Message on WhatsApp"
                            >
                              <FaWhatsapp />
                            </button>
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
                            <button
                              className="copy-btn"
                              onClick={() => copyToClipboard(lead.email!, 'Email')}
                              title="Copy Email"
                            >
                              <FaCopy />
                            </button>
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
