/**
 * Yelp Scraper Service
 * Uses Apify epctex/yelp-scraper to extract business data from Yelp
 */

import { ApifyClient } from 'apify-client'
import { getApifyApiKey, getApifyApiKeys } from '../store'

let apifyMultiKeyIndex = 0

export interface YelpBusiness {
  id: string
  name: string
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  rating: number | null
  reviewCount: number | null
  categories: string[]
  yelpUrl: string
}

export interface YelpSearchParams {
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

function parseYelpResponse(item: Record<string, unknown>): YelpBusiness {
  const address = item.address as Record<string, unknown> | undefined

  return {
    id:
      (item.businessId as string) ||
      `yelp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: (item.title as string) || '',
    phone: (item.phoneNumber as string) || null,
    website: (item.website as string) || null,
    address: (address?.formatted as string) || null,
    city: (address?.city as string) || null,
    rating: typeof item.rating === 'number' ? item.rating : null,
    reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : null,
    categories: Array.isArray(item.categories) ? (item.categories as string[]) : [],
    yelpUrl: (item.url as string) || ''
  }
}

/**
 * Search businesses on Yelp using Apify actor
 */
export async function searchYelpBusinesses(params: YelpSearchParams): Promise<YelpBusiness[]> {
  console.log('[YelpScraper] Starting search with params:', params)

  const client = getApifyClient()
  const maxResults = params.maxResults || 50

  try {
    // Actor: epctex/yelp-scraper
    const actorInput = {
      search: params.query,
      searchLocation: params.location,
      maxItems: maxResults,
      endPage: 3, // Limit pages for speed
      includeReviews: false, // Skip reviews for speed
      includePhotos: false,
      proxy: {
        useApifyProxy: true
      }
    }

    console.log('[YelpScraper] Running actor epctex/yelp-scraper with input:', actorInput)

    const run = await client.actor('epctex/yelp-scraper').call(actorInput, {
      timeout: 300 // 5 minute timeout
    })

    console.log('[YelpScraper] Run completed, fetching results...')

    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: maxResults })

    console.log(`[YelpScraper] Retrieved ${items.length} raw results`)

    // Parse results
    const businesses = items
      .filter((item) => (item as Record<string, unknown>).type === 'business')
      .map((item) => parseYelpResponse(item as Record<string, unknown>))

    console.log(`[YelpScraper] Processed ${businesses.length} businesses`)

    return businesses
  } catch (error) {
    console.error('[YelpScraper] Search error:', error)
    throw error
  }
}

export function isYelpConfigured(): boolean {
  const multiKeys = getApifyApiKeys()
  const singleKey = getApifyApiKey()
  return multiKeys.length > 0 || singleKey.length > 0
}
