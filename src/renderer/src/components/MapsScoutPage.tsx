import { JSX, useState } from 'react'

// Sample lead data for UI demo
interface Lead {
  id: string
  name: string
  address: string
  phone: string
  rating: number
  reviewCount: number
  hasWebsite: boolean
  websiteUrl: string | null
  category: string
  score: 'gold' | 'silver' | 'bronze'
}

// Sample data for UI demonstration
const sampleLeads: Lead[] = [
  {
    id: '1',
    name: "Joe's Pizza Palace",
    address: '123 Main St, New York, NY',
    phone: '(555) 123-4567',
    rating: 4.8,
    reviewCount: 127,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Restaurant',
    score: 'gold'
  },
  {
    id: '2',
    name: "Maria's Hair Salon",
    address: '456 Oak Ave, New York, NY',
    phone: '(555) 234-5678',
    rating: 4.5,
    reviewCount: 89,
    hasWebsite: false,
    websiteUrl: 'facebook.com/mariassalon',
    category: 'Salon',
    score: 'gold'
  },
  {
    id: '3',
    name: 'Quick Fix Plumbing',
    address: '789 Elm St, New York, NY',
    phone: '(555) 345-6789',
    rating: 4.2,
    reviewCount: 45,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Plumber',
    score: 'silver'
  },
  {
    id: '4',
    name: 'Sunrise Fitness Studio',
    address: '321 Pine Rd, New York, NY',
    phone: '(555) 456-7890',
    rating: 4.6,
    reviewCount: 234,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Gym',
    score: 'gold'
  },
  {
    id: '5',
    name: 'Downtown Auto Repair',
    address: '654 Cedar Ln, New York, NY',
    phone: '(555) 567-8901',
    rating: 4.0,
    reviewCount: 32,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Auto Repair',
    score: 'silver'
  },
  {
    id: '5',
    name: 'Downtown Auto Repair',
    address: '654 Cedar Ln, New York, NY',
    phone: '(555) 567-8901',
    rating: 4.0,
    reviewCount: 32,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Auto Repair',
    score: 'silver'
  },
  {
    id: '5',
    name: 'Downtown Auto Repair',
    address: '654 Cedar Ln, New York, NY',
    phone: '(555) 567-8901',
    rating: 4.0,
    reviewCount: 32,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Auto Repair',
    score: 'silver'
  },
  {
    id: '5',
    name: 'Downtown Auto Repair',
    address: '654 Cedar Ln, New York, NY',
    phone: '(555) 567-8901',
    rating: 4.0,
    reviewCount: 32,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Auto Repair',
    score: 'silver'
  },
  {
    id: '5',
    name: 'Downtown Auto Repair',
    address: '654 Cedar Ln, New York, NY',
    phone: '(555) 567-8901',
    rating: 4.0,
    reviewCount: 32,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Auto Repair',
    score: 'silver'
  },
  {
    id: '5',
    name: 'Downtown Auto Repair',
    address: '654 Cedar Ln, New York, NY',
    phone: '(555) 567-8901',
    rating: 4.0,
    reviewCount: 32,
    hasWebsite: false,
    websiteUrl: null,
    category: 'Auto Repair',
    score: 'silver'
  }
]

function MapsScoutPage(): JSX.Element {
  // Search form state
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true)
  const [minRating, setMinRating] = useState(4.0)
  const [minReviews, setMinReviews] = useState(20)

  // Results state (using sample data for UI demo)
  const leads = sampleLeads
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(true) // true for demo

  // Count leads by score
  const goldCount = leads.filter((l) => l.score === 'gold').length
  const silverCount = leads.filter((l) => l.score === 'silver').length
  const bronzeCount = leads.filter((l) => l.score === 'bronze').length

  // Handle search (placeholder for now)
  const handleSearch = (): void => {
    if (!location.trim()) return
    setIsSearching(true)
    setTimeout(() => {
      setIsSearching(false)
      setHasSearched(true)
    }, 1500)
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
            />
          </div>

          {/* Category - Now a text input */}
          <div className="scout-field">
            <label>Business Category</label>
            <input
              type="text"
              placeholder="e.g., Restaurants, Plumbers, Salons"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
      </section>

      {/* Results */}
      {hasSearched && (
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
              <button className="scout-btn outline">Export</button>
              <button className="scout-btn primary">Find Emails</button>
            </div>
          </div>

          {/* Lead List */}
          <div className="scout-leads">
            {leads.map((lead) => (
              <div key={lead.id} className={`scout-lead ${lead.score}`}>
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
                  <span className="contact-phone">{lead.phone}</span>
                  {!lead.hasWebsite && <span className="contact-no-web">No website</span>}
                </div>

                {/* Actions */}
                <div className="lead-actions">
                  <button className="lead-action" title="Find Email">
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
                  </button>
                  <button className="lead-action" title="AI Pitch">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasSearched && !isSearching && (
        <div className="scout-empty">
          <div className="scout-empty-icon">🗺️</div>
          <h3>Start Your Search</h3>
          <p>Enter a location and category to find leads</p>
        </div>
      )}
    </div>
  )
}

export default MapsScoutPage
