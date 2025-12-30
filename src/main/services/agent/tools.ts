import { FacebookPageLead, searchFacebookPages } from '../facebook-scraper'
import { MapsPlace, searchMapsWithSerper } from '../lead-generation'
import { AgentLead, SearchTask } from './types'

// Pagination configuration
const MAPS_MAX_PAGES = 3 // Fetch up to 3 pages (60 results) per city
const MAPS_RESULTS_PER_PAGE = 20
const FACEBOOK_MAX_RESULTS = 50 // Increased from 20 to 50

export async function executeGoogleMapsSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    // Build location string with country for more accurate results
    // e.g., "Dhaka, Bangladesh" instead of just "Dhaka"
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    console.log(
      `[GoogleMaps] Searching "${task.query}" in "${fullLocation}" (${MAPS_MAX_PAGES} pages)`
    )

    // Enable autocomplete for multi-page fetching
    const places = await searchMapsWithSerper({
      query: task.query,
      location: fullLocation,
      num: MAPS_RESULTS_PER_PAGE,
      autocomplete: true,
      maxPages: MAPS_MAX_PAGES
    })

    console.log(`[GoogleMaps] Retrieved ${places.length} total places from ${MAPS_MAX_PAGES} pages`)

    return places.map(mapMapsPlaceToLead)
  } catch (error) {
    console.error(`Google Maps search failed for "${task.query}":`, error)
    return []
  }
}

export async function executeFacebookSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    // Include location in search query for Facebook
    // e.g., "Restaurants in Dhaka, Bangladesh"
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    const searchQuery = `${task.query} in ${fullLocation}`
    console.log(`[Facebook] Searching "${searchQuery}" (limit: ${FACEBOOK_MAX_RESULTS})`)

    const leads = await searchFacebookPages({
      searchQuery: searchQuery,
      maxResults: FACEBOOK_MAX_RESULTS
    })

    console.log(`[Facebook] Retrieved ${leads.length} leads`)

    return leads.map(mapFacebookLeadToLead)
  } catch (error) {
    console.error(`Facebook search failed for "${task.query}":`, error)
    return []
  }
}

function mapMapsPlaceToLead(place: MapsPlace): AgentLead {
  return {
    id: place.cid || crypto.randomUUID(),
    name: place.title,
    category: place.category,
    address: place.address,
    phone: place.phone || undefined,
    website: place.website || undefined,
    rating: place.rating,
    reviewCount: place.ratingCount,
    source: 'Maps',
    status: 'Pending',
    metadata: {
      latitude: place.latitude,
      longitude: place.longitude
    }
  }
}

function mapFacebookLeadToLead(lead: FacebookPageLead): AgentLead {
  // Debug: log what we're receiving from Facebook
  console.log('[FacebookMapping] Raw lead data:', {
    title: lead.title,
    phone: lead.phone,
    email: lead.email,
    website: lead.website,
    address: lead.address,
    categories: lead.categories,
    rating: lead.rating,
    likes: lead.likes,
    followers: lead.followers
  })

  return {
    id: lead.id || crypto.randomUUID(),
    name: lead.title || 'Unknown Business',
    category: lead.categories?.[0] || 'Facebook Page',
    address: lead.address || lead.facebookUrl || '', // Use Facebook URL as fallback for address
    phone: lead.phone || undefined,
    email: lead.email || undefined,
    website: lead.website || undefined,
    rating: lead.rating || undefined,
    reviewCount: lead.ratingCount || undefined,
    hasWhatsApp: lead.hasWhatsApp || false,
    source: 'Facebook',
    status: 'Pending',
    metadata: {
      likes: lead.likes || 0,
      followers: lead.followers || 0,
      facebookUrl: lead.facebookUrl || '',
      score: lead.score || 'bronze',
      intro: lead.intro || ''
    }
  }
}
