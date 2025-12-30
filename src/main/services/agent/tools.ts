import { FacebookPageLead, searchFacebookPages } from '../facebook-scraper'
import { MapsPlace, searchMapsWithSerper } from '../lead-generation'
import { searchYellowPagesBusinesses, YellowPagesBusiness } from '../yellowpages-scraper'
import { searchYelpBusinesses, YelpBusiness } from '../yelp-scraper'
import { AgentLead, SearchTask } from './types'

// Pagination configuration
const MAPS_MAX_PAGES = 3 // Fetch up to 3 pages (60 results) per city
const MAPS_RESULTS_PER_PAGE = 20
const FACEBOOK_MAX_RESULTS = 50
const YELP_MAX_RESULTS = 50
const YELLOWPAGES_MAX_RESULTS = 50

export async function executeGoogleMapsSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    console.log(
      `[GoogleMaps] Searching "${task.query}" in "${fullLocation}" (${MAPS_MAX_PAGES} pages)`
    )

    const places = await searchMapsWithSerper({
      query: task.query,
      location: fullLocation,
      num: MAPS_RESULTS_PER_PAGE,
      autocomplete: true,
      maxPages: MAPS_MAX_PAGES
    })

    console.log(`[GoogleMaps] Retrieved ${places.length} total places`)
    return places.map(mapMapsPlaceToLead)
  } catch (error) {
    console.error(`Google Maps search failed for "${task.query}":`, error)
    return []
  }
}

export async function executeFacebookSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
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

export async function executeYelpSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    console.log(
      `[Yelp] Searching "${task.query}" in "${fullLocation}" (limit: ${YELP_MAX_RESULTS})`
    )

    const businesses = await searchYelpBusinesses({
      query: task.query,
      location: fullLocation,
      maxResults: YELP_MAX_RESULTS
    })

    console.log(`[Yelp] Retrieved ${businesses.length} businesses`)
    return businesses.map(mapYelpBusinessToLead)
  } catch (error) {
    console.error(`Yelp search failed for "${task.query}":`, error)
    return []
  }
}

export async function executeYellowPagesSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    const fullLocation = task.discoveredFromCountry
      ? `${task.location}, ${task.discoveredFromCountry}`
      : task.location

    console.log(
      `[YellowPages] Searching "${task.query}" in "${fullLocation}" (limit: ${YELLOWPAGES_MAX_RESULTS})`
    )

    const businesses = await searchYellowPagesBusinesses({
      query: task.query,
      location: fullLocation,
      maxResults: YELLOWPAGES_MAX_RESULTS
    })

    console.log(`[YellowPages] Retrieved ${businesses.length} businesses`)
    return businesses.map(mapYellowPagesBusinessToLead)
  } catch (error) {
    console.error(`Yellow Pages search failed for "${task.query}":`, error)
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

function mapYelpBusinessToLead(business: YelpBusiness): AgentLead {
  return {
    id: business.id || crypto.randomUUID(),
    name: business.name || 'Unknown Business',
    category: business.categories?.[0] || 'Yelp Business',
    address: business.address || business.city || '',
    phone: business.phone || undefined,
    website: business.website || undefined,
    rating: business.rating || undefined,
    reviewCount: business.reviewCount || undefined,
    source: 'Yelp',
    status: 'Pending',
    metadata: {
      yelpUrl: business.yelpUrl || ''
    }
  }
}

function mapYellowPagesBusinessToLead(business: YellowPagesBusiness): AgentLead {
  return {
    id: business.id || crypto.randomUUID(),
    name: business.name || 'Unknown Business',
    category: business.categories?.[0] || 'Yellow Pages Business',
    address: business.address || business.city || '',
    phone: business.phone || undefined,
    website: business.website || undefined,
    rating: business.rating || undefined,
    reviewCount: business.reviewCount || undefined,
    source: 'YellowPages',
    status: 'Pending',
    metadata: {
      yellowPagesUrl: business.yellowPagesUrl || ''
    }
  }
}
