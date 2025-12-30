/**
 * TripAdvisor Scraper Service
 * Uses Apify maxcopell/tripadvisor to extract business data from TripAdvisor
 */

import { ApifyClient } from 'apify-client'
import { getApifyApiKey, getApifyApiKeys } from '../store'

let apifyMultiKeyIndex = 0

export interface TripAdvisorBusiness {
  id: string
  name: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  rating: number | null
  reviewCount: number | null
  category: string
  subcategories: string[]
  tripAdvisorUrl: string
  priceLevel: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
}

export interface TripAdvisorSearchParams {
  query: string
  location: string
  maxResults?: number
}

function getApifyClient(): ApifyClient {
  const multiKeys = getApifyApiKeys()
  let apiKey = ''

  if (multiKeys.length > 0) {
    const index = apifyMultiKeyIndex % multiKeys.length
    apiKey = multiKeys[index]?.key || ''
    apifyMultiKeyIndex = (apifyMultiKeyIndex + 1) % multiKeys.length
  } else {
    apiKey = getApifyApiKey()
  }

  if (!apiKey) {
    throw new Error('Apify API key not configured. Please add your API key in Settings.')
  }

  return new ApifyClient({ token: apiKey })
}

function parseTripAdvisorResponse(item: Record<string, unknown>): TripAdvisorBusiness {
  const addressObj = item.addressObj as Record<string, unknown> | undefined

  // Build address string from parts
  let address = ''
  if (addressObj) {
    const parts = [
      addressObj.street1 as string,
      addressObj.street2 as string,
      addressObj.city as string,
      addressObj.state as string,
      addressObj.postalcode as string
    ].filter(Boolean)
    address = parts.join(', ')
  } else if (item.address) {
    address = item.address as string
  }

  return {
    id:
      (item.id as string) || `tripadvisor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: (item.name as string) || '',
    phone: (item.phone as string) || null,
    email: (item.email as string) || null,
    website: (item.website as string) || null,
    address: address || null,
    city: (addressObj?.city as string) || null,
    rating: typeof item.rating === 'number' ? item.rating : null,
    reviewCount: typeof item.numberOfReviews === 'number' ? item.numberOfReviews : null,
    category: (item.category as string) || (item.type as string) || 'business',
    subcategories: Array.isArray(item.subcategories) ? (item.subcategories as string[]) : [],
    tripAdvisorUrl: (item.webUrl as string) || '',
    priceLevel: (item.priceLevel as string) || null,
    description: (item.description as string) || null,
    latitude: typeof item.latitude === 'number' ? item.latitude : null,
    longitude: typeof item.longitude === 'number' ? item.longitude : null
  }
}

/**
 * Search businesses on TripAdvisor using Apify actor
 */
export async function searchTripAdvisorBusinesses(
  params: TripAdvisorSearchParams
): Promise<TripAdvisorBusiness[]> {
  console.log('[TripAdvisor] Starting search with params:', params)

  const client = getApifyClient()
  const maxResults = params.maxResults || 50

  try {
    // Actor: maxcopell/tripadvisor
    // Uses locationFullName for location-based search
    const actorInput = {
      locationFullName: params.location,
      search: params.query,
      maxItems: maxResults,
      includeReviews: false, // Skip reviews for speed
      includeVacationRentals: false,
      includeTrips: false,
      language: 'en',
      currency: 'USD'
    }

    console.log('[TripAdvisor] Running actor maxcopell/tripadvisor with input:', actorInput)

    const run = await client.actor('maxcopell/tripadvisor').call(actorInput, {
      timeout: 300 // 5 minute timeout
    })

    console.log('[TripAdvisor] Run completed, fetching results...')

    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: maxResults })

    console.log(`[TripAdvisor] Retrieved ${items.length} raw results`)

    // Parse results - filter for businesses (hotels, restaurants, attractions)
    const validTypes = ['HOTEL', 'RESTAURANT', 'ATTRACTION', 'hotel', 'restaurant', 'attraction']
    const businesses = items
      .filter((item) => {
        const itemType = (item as Record<string, unknown>).type as string
        return validTypes.includes(itemType?.toUpperCase?.() || itemType)
      })
      .map((item) => parseTripAdvisorResponse(item as Record<string, unknown>))

    console.log(`[TripAdvisor] Processed ${businesses.length} businesses`)

    return businesses
  } catch (error) {
    console.error('[TripAdvisor] Search error:', error)
    throw error
  }
}

export function isTripAdvisorConfigured(): boolean {
  const multiKeys = getApifyApiKeys()
  const singleKey = getApifyApiKey()
  return multiKeys.length > 0 || singleKey.length > 0
}
