import { JSX, useEffect, useState } from 'react'
import { FaFacebook } from 'react-icons/fa'

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

  // Get score badge color
  const getScoreBadgeStyle = (
    score: 'gold' | 'silver' | 'bronze'
  ): { background: string; color: string } => {
    switch (score) {
      case 'gold':
        return { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }
      case 'silver':
        return { background: 'linear-gradient(135deg, #9ca3af, #6b7280)', color: '#fff' }
      case 'bronze':
        return { background: 'linear-gradient(135deg, #b45309, #92400e)', color: '#fff' }
    }
  }

  // Stats counts
  const statsWithEmail = filteredLeads.filter((l) => l.email).length
  const statsWithPhone = filteredLeads.filter((l) => l.phone).length
  const statsNoWebsite = filteredLeads.filter((l) => !l.website).length
  const goldCount = filteredLeads.filter((l) => l.score === 'gold').length
  const silverCount = filteredLeads.filter((l) => l.score === 'silver').length
  const bronzeCount = filteredLeads.filter((l) => l.score === 'bronze').length

  return (
    <div className="scout-page">
      {/* Toast Notification */}
      {toast && (
        <div
          className="toast"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            zIndex: 1000,
            background:
              toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : '#6366f1',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div
        className="tabs-container"
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          marginBottom: '1.5rem',
          paddingBottom: '0'
        }}
      >
        <button
          className={`tab-btn ${activeTab === 'facebook-page' ? 'active' : ''}`}
          onClick={() => setActiveTab('facebook-page')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'facebook-page' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'facebook-page' ? '#f1f5f9' : '#94a3b8',
            fontWeight: activeTab === 'facebook-page' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <FaFacebook />
          Facebook Page
        </button>
      </div>

      {/* Check Config */}
      {isCheckingConfig ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
          <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Checking configuration...</p>
        </div>
      ) : !isApifyConfigured ? (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center'
          }}
        >
          <FaFacebook size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Apify API Key Required</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            To scrape Facebook pages, please configure your Apify API key in Settings → API Keys →
            Apify.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Get your free API key at{' '}
            <a
              href="https://console.apify.com/sign-up"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#6366f1' }}
            >
              console.apify.com
            </a>
          </p>
        </div>
      ) : (
        <>
          {/* Search Section */}
          <section className="scout-search">
            {/* Search Mode Toggle */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}
            >
              <button
                onClick={() => setSearchMode('keyword')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background:
                    searchMode === 'keyword' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: searchMode === 'keyword' ? '#818cf8' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                🔍 Search by Keyword
              </button>
              <button
                onClick={() => setSearchMode('urls')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background:
                    searchMode === 'urls' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: searchMode === 'urls' ? '#818cf8' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                📋 Scrape URLs
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
                <div className="scout-field">
                  <label>Max Results</label>
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value))}
                  >
                    <option value={25}>25 pages (~$0.25)</option>
                    <option value={50}>50 pages (~$0.50)</option>
                    <option value={100}>100 pages (~$1.00)</option>
                    <option value={200}>200 pages (~$2.00)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="scout-field">
                <label>Facebook Page URLs (one per line)</label>
                <textarea
                  placeholder="https://www.facebook.com/businesspage1
https://www.facebook.com/businesspage2
https://www.facebook.com/businesspage3"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    resize: 'vertical',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
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

            {error && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171'
                }}
              >
                {error}
              </div>
            )}
          </section>

          {/* Results */}
          {isSearching && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#94a3b8', marginTop: '1rem' }}>
                Scraping Facebook pages... This may take a few minutes.
              </p>
            </div>
          )}

          {hasSearched && !isSearching && (
            <>
              {/* Stats Bar */}
              <div
                className="stats-bar"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: '1.5rem'
                }}
              >
                <div className="stat-item">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{filteredLeads.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">With Email</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>
                    {statsWithEmail}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">With Phone</span>
                  <span className="stat-value" style={{ color: '#6366f1' }}>
                    {statsWithPhone}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">No Website</span>
                  <span className="stat-value" style={{ color: '#f59e0b' }}>
                    {statsNoWebsite}
                  </span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-label">🥇 Gold</span>
                  <span className="stat-value">{goldCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">🥈 Silver</span>
                  <span className="stat-value">{silverCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">🥉 Bronze</span>
                  <span className="stat-value">{bronzeCount}</span>
                </div>

                <button
                  onClick={handleExport}
                  disabled={filteredLeads.length === 0}
                  style={{
                    marginLeft: 'auto',
                    padding: '0.5rem 1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    color: '#10b981',
                    cursor: filteredLeads.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    opacity: filteredLeads.length === 0 ? 0.5 : 1
                  }}
                >
                  📥 Export CSV
                </button>
              </div>

              {/* Results List */}
              {filteredLeads.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '12px'
                  }}
                >
                  <p style={{ color: '#94a3b8' }}>
                    No results match your filters. Try adjusting the filter options.
                  </p>
                </div>
              ) : (
                <div
                  className="leads-grid"
                  style={{
                    display: 'grid',
                    gap: '1rem',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
                  }}
                >
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="lead-card"
                      style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 600,
                              color: '#f1f5f9',
                              marginBottom: '0.25rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {lead.title}
                          </h3>
                          <p
                            style={{
                              fontSize: '0.85rem',
                              color: '#94a3b8'
                            }}
                          >
                            {lead.categories.slice(0, 2).join(' • ')}
                          </p>
                        </div>
                        <span
                          style={{
                            ...getScoreBadgeStyle(lead.score),
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}
                        >
                          {lead.score}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          marginBottom: '1rem'
                        }}
                      >
                        {lead.email && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: '6px'
                            }}
                          >
                            <span style={{ color: '#10b981' }}>✉️</span>
                            <span
                              style={{
                                color: '#10b981',
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {lead.email}
                            </span>
                            <button
                              onClick={() => copyToClipboard(lead.email!, 'Email')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#10b981',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                        {lead.phone && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: 'rgba(99, 102, 241, 0.1)',
                              borderRadius: '6px'
                            }}
                          >
                            <span style={{ color: '#818cf8' }}>📞</span>
                            <span style={{ color: '#818cf8', flex: 1 }}>{lead.phone}</span>
                            <button
                              onClick={() => copyToClipboard(lead.phone!, 'Phone')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#818cf8',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                        {!lead.website && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: 'rgba(245, 158, 11, 0.1)',
                              borderRadius: '6px'
                            }}
                          >
                            <span style={{ color: '#f59e0b' }}>🌐</span>
                            <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                              No website - needs your services!
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Engagement Stats */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          marginBottom: '1rem',
                          fontSize: '0.85rem',
                          color: '#94a3b8'
                        }}
                      >
                        <span>👍 {formatNumber(lead.likes)}</span>
                        <span>👥 {formatNumber(lead.followers)}</span>
                        {lead.rating && <span>⭐ {lead.rating}%</span>}
                      </div>

                      {/* Actions */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <button
                          onClick={() => openFacebookPage(lead.facebookUrl)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #1877f2, #3b82f6)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <FaFacebook /> Open Page
                        </button>
                        {lead.phone && (
                          <button
                            onClick={() =>
                              window.api.openExternalUrl(
                                `https://wa.me/${lead.phone!.replace(/[^0-9]/g, '')}`
                              )
                            }
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #25d366, #128c7e)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 500,
                              fontSize: '0.85rem'
                            }}
                          >
                            WhatsApp
                          </button>
                        )}
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
