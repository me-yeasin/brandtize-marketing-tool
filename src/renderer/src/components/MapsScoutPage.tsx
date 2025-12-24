import { JSX, useState } from 'react'
import type { MapsPlace, ReviewsResult } from '../../../preload/index.d'

// Extended Lead type with email search capability
interface Lead {
  id: string
  name: string
  address: string
  phone: string | null
  website: string | null
  rating: number
  reviewCount: number
  category: string
  score: 'gold' | 'silver' | 'bronze'
  latitude: number
  longitude: number
  email?: string
  emailSource?: string
  emailVerified?: boolean
  isLoadingEmail?: boolean
}

// Calculate lead score based on rating and reviews
function calculateScore(
  rating: number,
  reviewCount: number,
  hasWebsite: boolean
): 'gold' | 'silver' | 'bronze' {
  let score = 0

  // No website = +3 (they NEED us!)
  if (!hasWebsite) score += 3

  // High rating = good business
  if (rating >= 4.5) score += 2
  else if (rating >= 4.0) score += 1

  // Many reviews = active business
  if (reviewCount >= 100) score += 2
  else if (reviewCount >= 50) score += 1

  // Score thresholds
  if (score >= 5) return 'gold'
  if (score >= 3) return 'silver'
  return 'bronze'
}

// Convert API response to Lead format
function mapPlaceToLead(place: MapsPlace, index: number): Lead {
  return {
    id: place.cid || `lead-${index}`,
    name: place.title,
    address: place.address,
    phone: place.phone,
    website: place.website,
    rating: place.rating,
    reviewCount: place.ratingCount,
    category: place.category,
    score: calculateScore(place.rating, place.ratingCount, !place.website),
    latitude: place.latitude,
    longitude: place.longitude
  }
}

// Open Google Maps in browser for a business
function openInGoogleMaps(lead: Lead): void {
  // If we have coordinates, use them for precise location
  if (lead.latitude && lead.longitude) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}&query_place_id=${lead.id}`
    window.open(url, '_blank')
    return
  }

  // Fallback to address search
  const searchQuery = `${lead.name} ${lead.address}`
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`
  window.open(url, '_blank')
}

// Extract domain from website URL
function extractDomain(website: string): string {
  try {
    let url = website
    if (!url.startsWith('http')) {
      url = `https://${url}`
    }
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

function MapsScoutPage(): JSX.Element {
  // Search form state
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true)
  const [minRating, setMinRating] = useState(4.0)
  const [minReviews, setMinReviews] = useState(20)

  // Advanced options state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [enablePagination, setEnablePagination] = useState(true)
  const [maxPages, setMaxPages] = useState(3)
  const [language, setLanguage] = useState('en')
  const [useGps, setUseGps] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [zoomLevel, setZoomLevel] = useState(14)

  // Results state
  const [leads, setLeads] = useState<Lead[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reviews panel state
  const [reviewsPanelOpen, setReviewsPanelOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [reviewsData, setReviewsData] = useState<ReviewsResult | null>(null)
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  // Count leads by score
  const goldCount = leads.filter((l) => l.score === 'gold').length
  const silverCount = leads.filter((l) => l.score === 'silver').length
  const bronzeCount = leads.filter((l) => l.score === 'bronze').length

  // Handle search
  const handleSearch = async (): Promise<void> => {
    // Validate: need either location text OR GPS coordinates
    const hasTextLocation = location.trim().length > 0
    const hasGpsLocation = useGps && latitude.trim() && longitude.trim()

    if (!category.trim()) {
      setError('Please enter a business category')
      return
    }

    if (!hasTextLocation && !hasGpsLocation) {
      setError('Please enter a location OR enable GPS coordinates with valid lat/long')
      return
    }

    setError(null)
    setIsSearching(true)
    setHasSearched(false)

    try {
      // Build search params with advanced options
      const searchParams: Parameters<typeof window.api.searchGoogleMaps>[0] = {
        query: category.trim(),
        location: location.trim(),
        num: 20, // Results per page
        hl: language,
        autocomplete: enablePagination,
        maxPages: enablePagination ? maxPages : 1
      }

      // Add GPS coordinates if enabled and valid
      if (useGps && latitude && longitude) {
        const lat = parseFloat(latitude)
        const lng = parseFloat(longitude)
        if (!isNaN(lat) && !isNaN(lng)) {
          searchParams.latitude = lat
          searchParams.longitude = lng
          searchParams.zoom = zoomLevel
        }
      }

      console.log('[MapsScout] Searching with params:', searchParams)

      // Call the API
      const places = await window.api.searchGoogleMaps(searchParams)

      console.log(`[MapsScout] Received ${places.length} places`)

      // Convert to leads
      let allLeads = places.map(mapPlaceToLead)

      // Apply filters
      allLeads = allLeads.filter((lead) => {
        // Rating filter
        if (lead.rating < minRating) return false

        // Reviews filter
        if (lead.reviewCount < minReviews) return false

        // No website filter
        if (noWebsiteOnly && lead.website) return false

        return true
      })

      // Sort by score (gold first, then silver, then bronze)
      const scoreOrder = { gold: 0, silver: 1, bronze: 2 }
      allLeads.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score])

      setLeads(allLeads)
      setHasSearched(true)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // Find email for a lead (only if they have a website)
  const handleFindEmail = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !lead.website) return

    // Update lead to show loading
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, isLoadingEmail: true } : l)))

    try {
      const domain = extractDomain(lead.website)
      const result = await window.api.findEmailForDomain(domain)

      // Update lead with email
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                email: result.email || undefined,
                emailSource: result.source,
                isLoadingEmail: false
              }
            : l
        )
      )
    } catch (err) {
      console.error('Email finder error:', err)
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, isLoadingEmail: false } : l)))
    }
  }

  // Export leads to CSV
  const handleExport = (): void => {
    if (leads.length === 0) return

    const headers = [
      'Name',
      'Category',
      'Address',
      'Phone',
      'Rating',
      'Reviews',
      'Website',
      'Score'
    ]
    const rows = leads.map((lead) => [
      lead.name,
      lead.category,
      lead.address,
      lead.phone || '',
      lead.rating.toString(),
      lead.reviewCount.toString(),
      lead.website || '',
      lead.score
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${location.replace(/\s+/g, '-')}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Fetch reviews for a lead
  const handleFetchReviews = async (lead: Lead): Promise<void> => {
    setSelectedLead(lead)
    setReviewsPanelOpen(true)
    setReviewsData(null)
    setReviewsError(null)
    setIsLoadingReviews(true)

    try {
      console.log('[MapsScout] Fetching reviews for:', lead.id, lead.name)
      const result = await window.api.fetchReviews(lead.id, lead.name, 15)
      console.log('[MapsScout] Raw reviews result:', result)

      // Validate and sanitize the result to prevent render crashes
      const sanitizedResult = {
        businessName: result?.businessName || lead.name || 'Unknown Business',
        totalReviews: typeof result?.totalReviews === 'number' ? result.totalReviews : 0,
        averageRating: typeof result?.averageRating === 'number' ? result.averageRating : 0,
        reviews: Array.isArray(result?.reviews)
          ? result.reviews.map((r) => ({
              author: r?.author || 'Anonymous',
              rating: typeof r?.rating === 'number' ? r.rating : 0,
              date: r?.date || '',
              text: r?.text || '',
              source: r?.source || undefined
            }))
          : []
      }

      console.log('[MapsScout] Sanitized reviews result:', sanitizedResult)
      setReviewsData(sanitizedResult)
    } catch (err) {
      console.error('[MapsScout] Reviews fetch error:', err)
      setReviewsError(err instanceof Error ? err.message : 'Failed to fetch reviews')
    } finally {
      setIsLoadingReviews(false)
    }
  }

  // Close reviews panel
  const closeReviewsPanel = (): void => {
    setReviewsPanelOpen(false)
    setSelectedLead(null)
    setReviewsData(null)
    setReviewsError(null)
  }

  // Render star rating
  const renderStars = (rating: number | null | undefined): JSX.Element => {
    const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0
    const fullStars = Math.floor(safeRating)
    const hasHalf = safeRating % 1 >= 0.5
    const stars: JSX.Element[] = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={`full-${i}`} className="star full">
          ★
        </span>
      )
    }
    if (hasHalf) {
      stars.push(
        <span key="half" className="star half">
          ★
        </span>
      )
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(
        <span key={`empty-${i}`} className="star empty">
          ☆
        </span>
      )
    }

    return <div className="stars-display">{stars}</div>
  }

  return (
    <div className="scout-page">
      {/* Search Section */}
      <section className="scout-search">
        <div className="scout-search-grid">
          {/* Location */}
          <div className="scout-field">
            <label>Location</label>
            <input
              type="text"
              placeholder="e.g., New York, USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Category - Text input */}
          <div className="scout-field">
            <label>Business Category</label>
            <input
              type="text"
              placeholder="e.g., Restaurants, Plumbers, Salons"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

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

          <div className="scout-filter">
            <span>Min rating</span>
            <select value={minRating} onChange={(e) => setMinRating(parseFloat(e.target.value))}>
              <option value={3.0}>3.0+</option>
              <option value={3.5}>3.5+</option>
              <option value={4.0}>4.0+</option>
              <option value={4.5}>4.5+</option>
            </select>
          </div>

          <div className="scout-filter">
            <span>Min reviews</span>
            <select value={minReviews} onChange={(e) => setMinReviews(parseInt(e.target.value))}>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
              <option value={20}>20+</option>
              <option value={50}>50+</option>
              <option value={100}>100+</option>
            </select>
          </div>

          <button className="scout-search-btn" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Advanced Options Toggle */}
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
          type="button"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={showAdvanced ? 'rotate' : ''}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {/* Advanced Options Panel */}
        {showAdvanced && (
          <div className="advanced-options">
            {/* Pagination Toggle */}
            <label className="scout-toggle">
              <input
                type="checkbox"
                checked={enablePagination}
                onChange={(e) => setEnablePagination(e.target.checked)}
              />
              <span className="toggle-track"></span>
              <span>
                Fetch multiple pages{' '}
                <span className="option-hint">(more results, uses more API credits)</span>
              </span>
            </label>

            {/* Max Pages */}
            {enablePagination && (
              <div className="scout-filter">
                <span>Max pages</span>
                <select value={maxPages} onChange={(e) => setMaxPages(parseInt(e.target.value))}>
                  <option value={2}>2 pages (~40 results)</option>
                  <option value={3}>3 pages (~60 results)</option>
                  <option value={4}>4 pages (~80 results)</option>
                  <option value={5}>5 pages (~100 results)</option>
                </select>
              </div>
            )}

            {/* Language */}
            <div className="scout-filter">
              <span>Results language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="nl">Dutch</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
              </select>
            </div>

            {/* GPS Toggle */}
            <label className="scout-toggle">
              <input
                type="checkbox"
                checked={useGps}
                onChange={(e) => setUseGps(e.target.checked)}
              />
              <span className="toggle-track"></span>
              <span>
                Use GPS coordinates <span className="option-hint">(more precise targeting)</span>
              </span>
            </label>

            {/* GPS Inputs */}
            {useGps && (
              <div className="gps-inputs">
                <div className="gps-field">
                  <label>Latitude</label>
                  <input
                    type="text"
                    placeholder="e.g., 40.7128"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div className="gps-field">
                  <label>Longitude</label>
                  <input
                    type="text"
                    placeholder="e.g., -74.0060"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
                <div className="gps-field">
                  <label>Zoom Level</label>
                  <div className="zoom-control">
                    <input
                      type="range"
                      min="8"
                      max="18"
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    />
                    <span className="zoom-value">{zoomLevel}</span>
                  </div>
                  <span className="zoom-hint">
                    {zoomLevel <= 10
                      ? 'Wide area'
                      : zoomLevel <= 14
                        ? 'City level'
                        : 'Neighborhood'}
                  </span>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="option-info">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>
                {useGps
                  ? `Search will focus on GPS coordinates at zoom level ${zoomLevel}.`
                  : `With pagination enabled, the API will fetch up to ${maxPages * 20} results automatically.`}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="scout-error">{error}</div>}
      </section>

      {/* Results */}
      {hasSearched && leads.length > 0 && (
        <section className="scout-results">
          {/* Results Summary */}
          <div className="scout-summary">
            <div className="scout-summary-left">
              <span className="scout-count">{leads.length} leads</span>
              <div className="scout-badges">
                <span className="badge gold">{goldCount} gold</span>
                <span className="badge silver">{silverCount} silver</span>
                <span className="badge bronze">{bronzeCount} bronze</span>
              </div>
            </div>
            <div className="scout-actions">
              <button className="scout-btn outline" onClick={handleExport}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Lead List */}
          <div className="scout-leads">
            {leads.map((lead, index) => (
              <div key={`${lead.id}-${index}`} className={`scout-lead ${lead.score}`}>
                {/* Left: Score indicator */}
                <div className={`lead-indicator ${lead.score}`}></div>

                {/* Main Content */}
                <div className="lead-main">
                  <div className="lead-top">
                    <h3 className="lead-name">{lead.name}</h3>
                    <span className="lead-category">{lead.category}</span>
                  </div>
                  <p className="lead-address">{lead.address}</p>
                </div>

                {/* Stats */}
                <div className="lead-stats">
                  <div className="lead-stat">
                    <span className="stat-value">⭐ {lead.rating}</span>
                    <span className="stat-label">{lead.reviewCount} reviews</span>
                  </div>
                </div>

                {/* Contact */}
                <div className="lead-contact">
                  {lead.phone && <span className="contact-phone">{lead.phone}</span>}
                  {!lead.website && <span className="contact-no-web">No website</span>}
                  {lead.website && <span className="contact-has-web">Has website</span>}
                  {lead.email && (
                    <span className="contact-email" title={lead.emailSource}>
                      {lead.email}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="lead-actions">
                  {/* View on Google Maps button */}
                  <button
                    className="lead-action"
                    title="View on Map"
                    onClick={() => openInGoogleMaps(lead)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>

                  {/* Reviews button */}
                  <button
                    className="lead-action"
                    title="View Reviews"
                    onClick={() => handleFetchReviews(lead)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>

                  {/* Only show Find Email button if business has website AND toggle is OFF */}
                  {lead.website && !noWebsiteOnly && !lead.email && (
                    <button
                      className="lead-action"
                      title="Find Email"
                      onClick={() => handleFindEmail(lead.id)}
                      disabled={lead.isLoadingEmail}
                    >
                      {lead.isLoadingEmail ? (
                        <div className="action-spinner"></div>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No Results State */}
      {hasSearched && leads.length === 0 && (
        <div className="scout-empty">
          <div className="scout-empty-icon">🔍</div>
          <h3>No Leads Found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Empty State (before search) */}
      {!hasSearched && !isSearching && (
        <div className="scout-empty">
          <div className="scout-empty-icon">🗺️</div>
          <h3>Start Your Search</h3>
          <p>Enter a location and category to find leads</p>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="scout-empty">
          <div className="scout-loading-spinner"></div>
          <h3>Searching...</h3>
          <p>Finding businesses in {location}</p>
        </div>
      )}

      {/* Reviews Panel - Slide-in from right */}
      <div className={`reviews-panel ${reviewsPanelOpen ? 'open' : ''}`}>
        <div className="reviews-panel-header">
          <div className="reviews-panel-title">
            <h2>{selectedLead?.name || 'Reviews'}</h2>
            {selectedLead && (
              <span className="reviews-panel-subtitle">{selectedLead.category}</span>
            )}
          </div>
          <button className="reviews-panel-close" onClick={closeReviewsPanel}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="reviews-panel-content">
          {isLoadingReviews && (
            <div className="reviews-loading">
              <div className="scout-loading-spinner"></div>
              <p>Loading reviews...</p>
            </div>
          )}

          {reviewsError && (
            <div className="reviews-error">
              <p>{reviewsError}</p>
            </div>
          )}

          {reviewsData && !isLoadingReviews && (
            <>
              {/* Reviews Summary */}
              <div className="reviews-summary">
                <div className="reviews-rating-big">
                  <span className="rating-number">
                    {typeof reviewsData.averageRating === 'number'
                      ? reviewsData.averageRating.toFixed(1)
                      : '0.0'}
                  </span>
                  {renderStars(reviewsData.averageRating)}
                </div>
                <span className="reviews-total">{reviewsData.totalReviews ?? 0} reviews</span>
              </div>

              {/* Reviews List */}
              <div className="reviews-list">
                {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
                  reviewsData.reviews.map((review, index) => (
                    <div key={index} className="review-card">
                      <div className="review-header">
                        <span className="review-author">{review.author || 'Anonymous'}</span>
                        <div className="review-meta">
                          {renderStars(review.rating)}
                          {review.date && <span className="review-date">{review.date}</span>}
                        </div>
                      </div>
                      {review.text && <p className="review-text">{review.text}</p>}
                    </div>
                  ))
                ) : (
                  <div className="reviews-empty">
                    <p>No reviews available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overlay when panel is open */}
      {reviewsPanelOpen && <div className="reviews-overlay" onClick={closeReviewsPanel}></div>}
    </div>
  )
}

export default MapsScoutPage
