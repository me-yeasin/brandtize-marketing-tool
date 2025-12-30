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
  signal?: AbortSignal
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

    const signal = params.signal
    const timeoutSeconds = 300

    // Helper for running actor with abort
    const runWithAbort = async (
      actorId: string,
      input: Record<string, unknown>
    ): Promise<{ defaultDatasetId: string }> => {
      if (signal?.aborted) throw new Error('Aborted')

      const run = await client.actor(actorId).start(input, { timeout: timeoutSeconds })
      console.log(`[Trustpilot] Started run ${run.id} (${actorId})`)

      const abortPromise = new Promise<void>((_, reject) => {
        if (signal?.aborted) {
          reject(new Error('Aborted'))
          return
        }
        if (signal) {
          signal.addEventListener('abort', async () => {
            console.log(`[Trustpilot] Signal aborted! Aborting run ${run.id}...`)
            try {
              await client.run(run.id).abort()
            } catch (e) {
              console.error('Abort failed', e)
            }
            reject(new Error('Aborted'))
          })
        }
      })

      const waitPromise = async (): Promise<{ defaultDatasetId: string }> => {
        await client.run(run.id).waitForFinish()
        const finishedRun = await client.run(run.id).get()
        if (!finishedRun || finishedRun.status === 'FAILED') throw new Error(`Run ${run.id} failed`)
        return finishedRun
      }

      if (signal) {
        return await Promise.race([waitPromise(), abortPromise.then(() => run)])
      }
      return await waitPromise()
    }

    let run: { defaultDatasetId: string }
    try {
      run = await runWithAbort('nyoylab/trustpilot-scraper', actorInput)
    } catch (err) {
      const error = err as Error
      // If aborted, rethrow immediately - do not fallback
      if (signal?.aborted || error.message === 'Aborted') throw error

      console.log('[Trustpilot] Fallback to alternate actor...')
      const fallbackInput = {
        companyWebsite: params.query,
        contentToExtract: 'bulkCompanyInformation'
      }
      run = await runWithAbort('epctex/trustpilot-scraper', fallbackInput)
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
