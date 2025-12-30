import { FacebookPageLead, searchFacebookPages } from '../facebook-scraper'
import { MapsPlace, searchMapsWithSerper } from '../lead-generation'
import { AgentLead, SearchTask } from './types'

export async function executeGoogleMapsSearch(task: SearchTask): Promise<AgentLead[]> {
  try {
    const places = await searchMapsWithSerper({
      query: task.query,
      location: task.location,
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
    const leads = await searchFacebookPages({
      searchQuery: task.query,
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
  return {
    id: lead.id,
    name: lead.title,
    category: lead.categories[0] || 'Business',
    address: lead.address || '',
    phone: lead.phone || undefined,
    email: lead.email || undefined,
    website: lead.website || undefined,
    rating: lead.rating || undefined,
    reviewCount: lead.ratingCount || undefined,
    hasWhatsApp: lead.hasWhatsApp || false,
    source: 'Facebook',
    status: 'Pending',
    metadata: {
      likes: lead.likes,
      followers: lead.followers,
      facebookUrl: lead.facebookUrl
    }
  }
}
