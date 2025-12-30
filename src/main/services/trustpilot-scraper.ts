/**
 * Trustpilot Scraper Service
 * Uses Apify actors to extract business data from Trustpilot by category search
 */

import { ApifyClient } from 'apify-client'
import { getApifyApiKey, getApifyApiKeys } from '../store'

let apifyMultiKeyIndex = 0

export interface TrustpilotBusiness {
  id: string
  name: string
  website: string | null
  trustpilotUrl: string
  rating: number | null
  reviewCount: number | null
  category: string
  isVerified: boolean
  location: string | null
}

export interface TrustpilotSearchParams {
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

function parseTrustpilotResponse(item: Record<string, unknown>): TrustpilotBusiness {
  // Handle different response formats from various Trustpilot actors
  const name =
    (item.company as string) ||
    (item.companyName as string) ||
    (item.name as string) ||
    (item.displayName as string) ||
    ''

  const website =
    (item.website as string) ||
    (item.websiteUrl as string) ||
    (item.companyWebsite as string) ||
    null

  const trustpilotUrl =
    (item.url as string) || (item.companyPageUrl as string) || (item.trustpilotUrl as string) || ''

  const rating =
    typeof item.rating === 'number'
      ? item.rating
      : typeof item.trustScore === 'number'
        ? item.trustScore
        : typeof item.score === 'number'
          ? item.score
          : null

  const reviewCount =
    typeof item.reviewCount === 'number'
      ? item.reviewCount
      : typeof item.OfficialTotalReviewCount === 'number'
        ? item.OfficialTotalReviewCount
        : typeof item.numberOfReviews === 'number'
          ? item.numberOfReviews
          : null

  const category = (item.category as string) || (item.categories as string) || 'Trustpilot Business'

  const isVerified =
    item.isCompanyVerified === 'yes' || item.isVerified === true || item.verified === true || false

  const location =
    (item.location as string) || (item.country as string) || (item.address as string) || null

  return {
    id:
      (item.businessUnitId as string) ||
      (item.id as string) ||
      `trustpilot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    website,
    trustpilotUrl,
    rating,
    reviewCount,
    category,
    isVerified,
    location
  }
}

/**
 * Search businesses on Trustpilot using Apify actor
 * Note: Trustpilot is primarily for reviews, so we search by category/keyword
 */
export async function searchTrustpilotBusinesses(
  params: TrustpilotSearchParams
): Promise<TrustpilotBusiness[]> {
  console.log('[Trustpilot] Starting search with params:', params)

  const client = getApifyClient()
  const maxResults = params.maxResults || 50

  try {
    // Use a search query combining niche and location
    const searchQuery = `${params.query} ${params.location}`

    // Actor: Try multiple actors as fallback
    // Primary: Search for companies by category/keyword
    const actorInput = {
      searchType: 'search',
      searchQuery: searchQuery,
      maxItems: maxResults,
      countryCode: 'ALL',
      includeReviews: false
    }

    console.log('[Trustpilot] Running Trustpilot search with input:', actorInput)

    // Try nyoylab/trustpilot-scraper first, fallback to epctex
    let run
    try {
      run = await client.actor('nyoylab/trustpilot-scraper').call(actorInput, {
        timeout: 300
      })
    } catch {
      console.log('[Trustpilot] Fallback to alternate actor...')
      // Fallback: Use different input format for epctex actor
      const fallbackInput = {
        companyWebsite: params.query,
        contentToExtract: 'bulkCompanyInformation'
      }
      run = await client.actor('epctex/trustpilot-scraper').call(fallbackInput, {
        timeout: 300
      })
    }

    console.log('[Trustpilot] Run completed, fetching results...')

    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: maxResults })

    console.log(`[Trustpilot] Retrieved ${items.length} raw results`)

    // Parse results
    const businesses = items
      .filter((item) => {
        const record = item as Record<string, unknown>
        // Filter out reviews, keep only company info
        return record.company || record.companyName || record.name || record.displayName
      })
      .map((item) => parseTrustpilotResponse(item as Record<string, unknown>))

    console.log(`[Trustpilot] Processed ${businesses.length} businesses`)

    return businesses
  } catch (error) {
    console.error('[Trustpilot] Search error:', error)
    // Return empty array instead of throwing - Trustpilot is supplementary
    return []
  }
}

export function isTrustpilotConfigured(): boolean {
  const multiKeys = getApifyApiKeys()
  const singleKey = getApifyApiKey()
  return multiKeys.length > 0 || singleKey.length > 0
}
