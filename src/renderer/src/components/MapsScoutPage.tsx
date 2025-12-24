import { JSX, useEffect, useState } from 'react'
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
  hasWhatsApp?: boolean | null // null = not checked, true = has WhatsApp, false = no WhatsApp
  isLoadingWhatsApp?: boolean
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

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' } | null>(null)

  // WhatsApp state
  const [whatsAppReady, setWhatsAppReady] = useState(false)
  const [whatsAppInitializing, setWhatsAppInitializing] = useState(false)
  const [whatsAppQrCode, setWhatsAppQrCode] = useState<string | null>(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  // Show toast helper
  const showToast = (message: string, type: 'info' | 'error' = 'info'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Setup WhatsApp event listeners
  useEffect(() => {
    // Listen for QR code
    window.api.onWhatsAppQr((qr) => {
      console.log('[MapsScout] WhatsApp QR received')
      setWhatsAppQrCode(qr)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(true)
    })

    // Listen for ready event
    window.api.onWhatsAppReady(() => {
      console.log('[MapsScout] WhatsApp is ready!')
      setWhatsAppReady(true)
      setWhatsAppQrCode(null)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(false)
      showToast('WhatsApp connected successfully!', 'info')
    })

    // Listen for disconnection
    window.api.onWhatsAppDisconnected((reason) => {
      console.log('[MapsScout] WhatsApp disconnected:', reason)
      setWhatsAppReady(false)
      setWhatsAppQrCode(null)
      showToast(`WhatsApp disconnected: ${reason}`, 'error')
    })

    // Listen for auth failure
    window.api.onWhatsAppAuthFailure((msg) => {
      console.error('[MapsScout] WhatsApp auth failure:', msg)
      setWhatsAppReady(false)
      setWhatsAppInitializing(false)
      showToast(`WhatsApp authentication failed: ${msg}`, 'error')
    })

    // Check initial status
    window.api.whatsappGetStatus().then((status) => {
      setWhatsAppReady(status.isReady)
      setWhatsAppInitializing(status.isInitializing)
      if (status.qrCode) {
        setWhatsAppQrCode(status.qrCode)
        setShowWhatsAppModal(true)
      }
    })
  }, [])

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

      if (result.email) {
        // Email found! Now verify it
        console.log(`[MapsScout] Found email: ${result.email}, verifying...`)

        try {
          const verifyResult = await window.api.verifyEmail(result.email)
          console.log(
            `[MapsScout] Verification result: ${verifyResult.verified} (source: ${verifyResult.source})`
          )

          // Show toast if service switched
          if (verifyResult.switched) {
            showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
          }

          // Update lead with email and verification status
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    email: result.email || undefined,
                    emailSource: result.source,
                    emailVerified: verifyResult.verified,
                    isLoadingEmail: false
                  }
                : l
            )
          )
        } catch (verifyErr) {
          console.error('Email verification error:', verifyErr)
          // Still show the email, just mark as unverified
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    email: result.email || undefined,
                    emailSource: result.source,
                    emailVerified: false,
                    isLoadingEmail: false
                  }
                : l
            )
          )
        }
      } else {
        // No email found - show toast
        showToast(`No email found for "${lead.name}"`, 'info')
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  email: undefined,
                  emailSource: result.source,
                  isLoadingEmail: false
                }
              : l
          )
        )
      }
    } catch (err) {
      console.error('Email finder error:', err)
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, isLoadingEmail: false } : l)))
    }
  }

  // Initialize WhatsApp client
  const handleInitWhatsApp = async (): Promise<void> => {
    setWhatsAppInitializing(true)
    try {
      const result = await window.api.whatsappInitialize()
      if (!result.success) {
        showToast(result.error || 'Failed to initialize WhatsApp', 'error')
        setWhatsAppInitializing(false)
      }
      // If successful, the event listeners will handle the rest
    } catch (err) {
      console.error('WhatsApp init error:', err)
      showToast('Failed to initialize WhatsApp', 'error')
      setWhatsAppInitializing(false)
    }
  }

  // Check if a lead's phone number has WhatsApp
  const handleCheckWhatsApp = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !lead.phone) return

    if (!whatsAppReady) {
      showToast('Please connect WhatsApp first! Click the WhatsApp connect button.', 'error')
      return
    }

    // Update lead to show loading
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

      // Update lead with WhatsApp status
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                hasWhatsApp: result.hasWhatsApp,
                isLoadingWhatsApp: false
              }
            : l
        )
      )

      // Show feedback
      if (result.hasWhatsApp) {
        showToast(`${lead.name} has WhatsApp!`, 'info')
      } else {
        showToast(`${lead.name} does NOT have WhatsApp`, 'info')
      }
    } catch (err) {
      console.error('WhatsApp check error:', err)
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, isLoadingWhatsApp: false } : l))
      )
      showToast('Failed to check WhatsApp status', 'error')
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
              {/* WhatsApp Connect Button */}
              <button
                className={`scout-btn ${whatsAppReady ? 'whatsapp-connected' : 'whatsapp-connect'}`}
                onClick={handleInitWhatsApp}
                disabled={whatsAppInitializing}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {whatsAppInitializing
                  ? 'Connecting...'
                  : whatsAppReady
                    ? 'WhatsApp Connected'
                    : 'Connect WhatsApp'}
              </button>
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
                  {lead.phone && (
                    <span className="contact-phone-wrapper">
                      <span className="contact-phone">{lead.phone}</span>
                      {/* WhatsApp indicator */}
                      {lead.hasWhatsApp === true && (
                        <span className="whatsapp-badge has-whatsapp" title="Has WhatsApp">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </span>
                      )}
                      {lead.hasWhatsApp === false && (
                        <span className="whatsapp-badge no-whatsapp" title="No WhatsApp">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </span>
                      )}
                    </span>
                  )}
                  {!lead.phone && <span className="contact-no-phone">No phone</span>}
                  {!lead.website && <span className="contact-no-web">No website</span>}
                  {lead.website && <span className="contact-has-web">Has website</span>}
                  {lead.email && (
                    <span className="contact-email-wrapper">
                      <span className="contact-email" title={lead.emailSource}>
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
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
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

                  {/* WhatsApp check button - show only if lead has a phone number and hasn't been checked */}
                  {lead.phone && lead.hasWhatsApp == null && (
                    <button
                      className="lead-action whatsapp-action"
                      title={whatsAppReady ? 'Check WhatsApp' : 'Connect WhatsApp first'}
                      onClick={() => handleCheckWhatsApp(lead.id)}
                      disabled={lead.isLoadingWhatsApp || !whatsAppReady}
                    >
                      {lead.isLoadingWhatsApp ? (
                        <div className="action-spinner"></div>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      )}
                    </button>
                  )}

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

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* WhatsApp QR Code Modal */}
      {showWhatsAppModal && whatsAppQrCode && (
        <div className="whatsapp-modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
          <div className="whatsapp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="whatsapp-modal-header">
              <h3>Scan QR Code with WhatsApp</h3>
              <button className="whatsapp-modal-close" onClick={() => setShowWhatsAppModal(false)}>
                ×
              </button>
            </div>
            <div className="whatsapp-modal-body">
              <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
              <div className="whatsapp-qr-container">
                {/* Generate QR code as data URL using canvas - requires qrcode library */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(whatsAppQrCode)}`}
                  alt="WhatsApp QR Code"
                  className="whatsapp-qr-image"
                />
              </div>
              <p className="whatsapp-warning">
                ⚠️ Use a secondary/burner WhatsApp account for checking numbers, not your main
                business account.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapsScoutPage
