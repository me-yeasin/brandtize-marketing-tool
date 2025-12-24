import { JSX, useState } from 'react'
import type { MapsPlace } from '../../../preload/index.d'

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
    score: calculateScore(place.rating, place.ratingCount, !place.website)
  }
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

  // Results state
  const [leads, setLeads] = useState<Lead[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Count leads by score
  const goldCount = leads.filter((l) => l.score === 'gold').length
  const silverCount = leads.filter((l) => l.score === 'silver').length
  const bronzeCount = leads.filter((l) => l.score === 'bronze').length

  // Handle search
  const handleSearch = async (): Promise<void> => {
    if (!location.trim() || !category.trim()) {
      setError('Please enter both location and category')
      return
    }

    setError(null)
    setIsSearching(true)
    setHasSearched(false)

    try {
      // Call the API
      const places = await window.api.searchGoogleMaps({
        query: category.trim(),
        location: location.trim(),
        num: 50 // Get up to 50 results
      })

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
    </div>
  )
}

export default MapsScoutPage
