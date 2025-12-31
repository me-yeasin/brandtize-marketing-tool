import { FacebookPageLead, searchFacebookPages } from '../facebook-scraper'
import { MapsPlace, searchMapsWithSerper } from '../lead-generation'
import { AgentLead, SearchTask } from './types'

// Pagination configuration
const MAPS_MAX_PAGES = 3 // Fetch up to 3 pages (60 results) per city
const MAPS_RESULTS_PER_PAGE = 20
const FACEBOOK_MAX_RESULTS = 50

export async function executeGoogleMapsSearch(
  task: SearchTask,
  signal?: AbortSignal
): Promise<AgentLead[]> {
  try {
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    // Calculate max pages based on limit (20 results per page)
    const limit = task.limit || 60 // Default to ~60 (3 pages) if no limit
    // If limit is small (e.g. 10), we need 1 page. If 21, we need 2 pages.
    const maxPages = Math.min(Math.ceil(limit / MAPS_RESULTS_PER_PAGE), MAPS_MAX_PAGES)

    console.log(
      `[GoogleMaps] Searching "${task.query}" in "${fullLocation}" (target: ${limit}, pages: ${maxPages})`
    )

    const places = await searchMapsWithSerper({
      query: task.query,
      location: fullLocation,
      num: MAPS_RESULTS_PER_PAGE,
      autocomplete: true,
      maxPages: maxPages,
      signal
    })

    console.log(`[GoogleMaps] Retrieved ${places.length} total places`)
    return places.map(mapMapsPlaceToLead)
  } catch (error) {
    console.error(`Google Maps search failed for "${task.query}":`, error)
    return []
  }
}

export async function executeFacebookSearch(
  task: SearchTask,
  signal?: AbortSignal
): Promise<AgentLead[]> {
  try {
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    const limit = task.limit || FACEBOOK_MAX_RESULTS
    const effectiveLimit = Math.min(limit, FACEBOOK_MAX_RESULTS)

    const searchQuery = `${task.query} in ${fullLocation}`
    console.log(`[Facebook] Searching "${searchQuery}" (limit: ${effectiveLimit})`)

    const leads = await searchFacebookPages({
      searchQuery: searchQuery,
      maxResults: effectiveLimit,
      signal
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
  return {
    id: lead.id || crypto.randomUUID(),
    name: lead.title || 'Unknown Business',
    category: lead.categories?.[0] || 'Facebook Page',
    address: lead.address || lead.facebookUrl || '',
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
      facebookUrl: lead.facebookUrl || ''
    }
  }
}
