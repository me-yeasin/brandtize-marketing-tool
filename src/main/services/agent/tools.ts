import { FacebookPageLead, searchFacebookPages } from '../facebook-scraper'
import { MapsPlace, searchMapsWithSerper } from '../lead-generation'
import { AgentLead, SearchTask } from './types'

export async function executeGoogleMapsSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    // Build location string with country for more accurate results
    // e.g., "Dhaka, Bangladesh" instead of just "Dhaka"
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    console.log(`[GoogleMaps] Searching "${task.query}" in "${fullLocation}"`)

    const places = await searchMapsWithSerper({
      query: task.query,
      location: fullLocation,
      num: 20 // Fetch 20 results per task
    })

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
    console.log(`[Facebook] Searching "${searchQuery}"`)

    const leads = await searchFacebookPages({
      searchQuery: searchQuery,
      maxResults: 20
    })

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
