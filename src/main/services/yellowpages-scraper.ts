/**
 * Yellow Pages Scraper Service
 * Uses Apify actor to extract business data from Yellow Pages USA
 */

import { ApifyClient } from 'apify-client'
import { getApifyApiKey, getApifyApiKeys } from '../store'

let apifyMultiKeyIndex = 0

export interface YellowPagesBusiness {
  id: string
  name: string
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  rating: number | null
  reviewCount: number | null
  categories: string[]
  yellowPagesUrl: string
}

export interface YellowPagesSearchParams {
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

function parseYellowPagesResponse(item: Record<string, unknown>): YellowPagesBusiness {
  return {
    id: (item.id as string) || `yp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: (item.name as string) || (item.title as string) || '',
    phone: (item.phone as string) || (item.phoneNumber as string) || null,
    website: (item.website as string) || (item.url as string) || null,
    address: (item.address as string) || (item.streetAddress as string) || null,
    city: (item.city as string) || (item.locality as string) || null,
    rating: typeof item.rating === 'number' ? item.rating : null,
    reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : null,
    categories: Array.isArray(item.categories)
      ? (item.categories as string[])
      : (item.category as string)
        ? [item.category as string]
        : [],
    yellowPagesUrl: (item.yellowPagesUrl as string) || (item.url as string) || ''
  }
}

/**
 * Search businesses on Yellow Pages USA using Apify actor
 */
export async function searchYellowPagesBusinesses(
  params: YellowPagesSearchParams
): Promise<YellowPagesBusiness[]> {
  console.log('[YellowPages] Starting search with params:', params)

  const client = getApifyClient()
  const maxResults = params.maxResults || 50

  try {
    // Actor: easyapi/yellowpages-scraper or similar
    const actorInput = {
      search: params.query,
      location: params.location,
      maxItems: maxResults,
      proxy: {
        useApifyProxy: true
      }
    }

    console.log('[YellowPages] Running actor easyapi/yellowpages-scraper with input:', actorInput)

    const run = await client.actor('easyapi/yellowpages-scraper').call(actorInput, {
      timeout: 300 // 5 minute timeout
    })

    console.log('[YellowPages] Run completed, fetching results...')

    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: maxResults })

    console.log(`[YellowPages] Retrieved ${items.length} raw results`)

    // Parse results
    const businesses = items.map((item) =>
      parseYellowPagesResponse(item as Record<string, unknown>)
    )

    console.log(`[YellowPages] Processed ${businesses.length} businesses`)

    return businesses
  } catch (error) {
    console.error('[YellowPages] Search error:', error)
    throw error
  }
}

export function isYellowPagesConfigured(): boolean {
  const multiKeys = getApifyApiKeys()
  const singleKey = getApifyApiKey()
  return multiKeys.length > 0 || singleKey.length > 0
}
