/**
 * Facebook Page Scraper Service
 * Uses Apify to scrape business contact information from Facebook pages
 */

import { ApifyClient } from 'apify-client'
import { getApifyApiKey, getApifyApiKeys } from '../store'

let apifyMultiKeyIndex = 0

// Facebook Page Lead interface
export interface FacebookPageLead {
  id: string // Facebook Page ID
  facebookUrl: string // Full Facebook page URL
  title: string // Business/Page name
  categories: string[] // Business categories

  // Contact Information (PRIMARY GOAL)
  email: string | null // Public email
  phone: string | null // Phone number
  website: string | null // Website URL
  address: string | null // Physical address
  messenger: string | null // Messenger link

  // Engagement Metrics
  likes: number // Page likes
  followers: number // Followers count
  rating: number | null // Numeric rating (0-100)
  ratingCount: number | null // Number of reviews

  // Additional Info
  intro: string | null // Page description
  adStatus: string | null // Ad running status
  createdAt: string | null // Page creation date
  isBusinessPageActive: boolean // Whether page is actively running ads

  // App-specific fields
  score: 'gold' | 'silver' | 'bronze' // Lead quality score
  savedAt?: number // When saved to local storage
  hasWhatsApp?: boolean | null // WhatsApp verification result
}

// Search parameters for Facebook pages
export interface FacebookSearchParams {
  searchQuery?: string // Keyword search (e.g., "restaurants dhaka")
  pageUrls?: string[] // Direct page URLs to scrape
  maxResults?: number // Limit results (default 100)
  signal?: AbortSignal
}

// Calculate lead score based on engagement and contact info
function calculateLeadScore(lead: Partial<FacebookPageLead>): 'gold' | 'silver' | 'bronze' {
  let score = 0

  // No website = +3 (they NEED digital marketing services!)
  if (!lead.website) score += 3

  // Has email = +2 (easy to contact)
  if (lead.email) score += 2

  // Has phone = +1 (can WhatsApp/call)
  if (lead.phone) score += 1

  // High engagement
  const followers = lead.followers || 0
  if (followers >= 10000) score += 2
  else if (followers >= 1000) score += 1

  // High rating
  const rating = lead.rating || 0
  if (rating >= 90) score += 2
  else if (rating >= 70) score += 1

  // Score thresholds
  if (score >= 6) return 'gold'
  if (score >= 3) return 'silver'
  return 'bronze'
}

function parseCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim()
    const asNumber = Number(normalized)
    if (Number.isFinite(asNumber)) return asNumber
  }
  return 0
}

// Parse Apify response to our FacebookPageLead format
function parseApifyResponse(item: Record<string, unknown>): FacebookPageLead {
  // Debug: log raw Apify data to see what fields are available
  console.log('[FacebookParser] RAW Apify item keys:', Object.keys(item))
  console.log('[FacebookParser] RAW Apify item:', JSON.stringify(item, null, 2).slice(0, 1000))

  // Extract rating info
  let ratingValue: number | null = null
  let ratingCountValue: number | null = null

  if (typeof item.ratingOverall === 'number') {
    ratingValue = item.ratingOverall
  } else if (typeof item.rating === 'string') {
    // Parse from "94% recommend (839 Reviews)"
    const match = (item.rating as string).match(/(\d+)%/)
    if (match) ratingValue = parseInt(match[1])
  }

  if (typeof item.ratingCount === 'number') {
    ratingCountValue = item.ratingCount
  }

  const websites = Array.isArray(item.websites) ? (item.websites as unknown[]) : []
  const firstWebsite = websites.find((w) => typeof w === 'string') as string | undefined

  const phones = Array.isArray(item.phones) ? (item.phones as unknown[]) : []
  const firstPhone = phones.find((p) => typeof p === 'string') as string | undefined

  const lead: Partial<FacebookPageLead> = {
    id:
      (item.facebookId as string) ||
      (item.pageId as string) ||
      `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    facebookUrl: (item.facebookUrl as string) || (item.pageUrl as string) || '',
    title: (item.title as string) || '',
    categories: Array.isArray(item.categories) ? (item.categories as string[]) : [],

    // Contact info
    email: (item.email as string) || null,
    phone: (item.phone as string) || firstPhone || null,
    website: (item.website as string) || firstWebsite || null,
    address: (item.address as string) || null,
    messenger: (item.messenger as string) || null,

    // Engagement
    likes: parseCount(item.likes),
    followers: parseCount(item.followers),
    rating: ratingValue,
    ratingCount: ratingCountValue,

    // Additional info
    intro: (item.intro as string) || null,
    adStatus: (item.ad_status as string) || null,
    createdAt: (item.creation_date as string) || null,
    isBusinessPageActive:
      (item.pageAdLibrary as Record<string, unknown>)?.is_business_page_active === true,

    savedAt: undefined,
    hasWhatsApp: undefined
  }

  // Calculate score
  lead.score = calculateLeadScore(lead)

  return lead as FacebookPageLead
}

/**
 * Get the Apify client with the configured API key
 */
function getApifyClient(): ApifyClient {
  // Try multi-key first, fall back to single key
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
    throw new Error(
      'Apify API key not configured. Please add your API key in Settings > API Keys > Apify.'
    )
  }

  return new ApifyClient({ token: apiKey })
}

async function fetchDatasetItems(
  client: ApifyClient,
  datasetId: string,
  desiredLimit?: number
): Promise<Record<string, unknown>[]> {
  const batchSize = 1000
  let offset = 0
  const items: Record<string, unknown>[] = []

  while (true) {
    const limit = desiredLimit
      ? Math.min(batchSize, Math.max(0, desiredLimit - items.length))
      : batchSize
    if (desiredLimit !== undefined && limit <= 0) break

    const response = await client.dataset(datasetId).listItems({ offset, limit })
    const batch = (response.items as Record<string, unknown>[]) || []
    items.push(...batch)

    if (batch.length < limit) break
    offset += batch.length
  }

  return items
}

async function runActorWithProxyFallback(
  client: ApifyClient,
  actorId: string,
  actorInput: Record<string, unknown>,
  timeoutSeconds: number,
  signal?: AbortSignal
): Promise<{ defaultDatasetId: string }> {
  const attempts: Record<string, unknown>[] = [
    {
      ...actorInput,
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
    },
    { ...actorInput, proxyConfiguration: { useApifyProxy: true } },
    { ...actorInput }
  ]

  let lastError: unknown = null

  for (const input of attempts) {
    try {
      // 1. Start the actor (Non-blocking)
      const run = await client.actor(actorId).start(input, { timeout: timeoutSeconds })
      console.log(`[Apify] Started run ${run.id} for actor ${actorId}`)

      // 2. Define the Abort Logic for this specific run
      const abortPromise = new Promise<{ defaultDatasetId: string }>((_, reject) => {
        if (signal?.aborted) {
          // If already aborted, reject immediately
          reject(new Error('Aborted'))
          return
        }

        if (signal) {
          signal.addEventListener('abort', async () => {
            console.log(`[Apify] Signal aborted! Sending ABORT command for run ${run.id}...`)
            try {
              await client.run(run.id).abort()
              console.log(`[Apify] Run ${run.id} aborted successfully.`)
            } catch (err) {
              console.error(`[Apify] Failed to abort run ${run.id}:`, err)
            }
            reject(new Error('Aborted'))
          })
        }
      })

      // 3. Define the Wait Logic
      const waitPromise = (async () => {
        await client.run(run.id).waitForFinish()
        // Fetch the run again to get latest status/dataset info if needed,
        // though `run` object from start() usually has the defaultDatasetId.
        // But to be safe on status checks:
        const updatedRun = await client.run(run.id).get()
        if (!updatedRun) throw new Error('Run not found')

        if (updatedRun.status === 'FAILED') {
          throw new Error(`Run ${run.id} failed`)
        }

        return { defaultDatasetId: updatedRun.defaultDatasetId }
      })()

      // 4. Race them
      if (signal) {
        return await Promise.race([waitPromise, abortPromise])
      } else {
        return await waitPromise
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && error.message === 'Aborted')) {
        throw error // Propagate abort immediately, do not retry
      }
      console.warn(`[Apify] Attempt failed:`, error)
      lastError = error
    }
  }

  throw lastError
}

/**
 * Search Facebook pages using Apify Facebook Search Scraper
 * This searches for pages matching a keyword/category
 */
export async function searchFacebookPages(
  params: FacebookSearchParams
): Promise<FacebookPageLead[]> {
  console.log('[FacebookScraper] Starting search with params:', params)

  const client = getApifyClient()
  const maxResults = params.maxResults || 100

  // If we have direct URLs, use the Pages Scraper
  if (params.pageUrls && params.pageUrls.length > 0) {
    return scrapeFacebookPageUrls(params.pageUrls)
  }

  // Otherwise, use the Search Scraper
  if (!params.searchQuery) {
    throw new Error('Please provide a search query or Facebook page URLs')
  }

  try {
    // Parse search query to extract potential location
    // Format: "restaurants dhaka" or "restaurants in dhaka" -> category: "restaurants", location: "dhaka"
    const query = params.searchQuery.trim()
    let categories: string[] = []
    let locations: string[] = []

    // Check if query contains "in" to split category and location
    const inMatch = query.match(/^(.+?)\s+in\s+(.+)$/i)
    if (inMatch) {
      categories = [inMatch[1].trim()]
      locations = [inMatch[2].trim()]
    } else {
      // Check if last word(s) could be a location (common city names)
      // For now, just use the whole query as category
      categories = [query]
    }

    console.log('[FacebookScraper] Parsed - Categories:', categories, 'Locations:', locations)

    // Build input for the Facebook Search Scraper actor
    // Actor ID: apify/facebook-search-scraper
    // Correct parameters: categories (array), locations (array), resultsLimit (number)
    const actorInput: Record<string, unknown> = {
      categories: categories,
      resultsLimit: maxResults
    }

    // Add locations if we have any
    if (locations.length > 0) {
      actorInput.locations = locations
    }

    console.log('[FacebookScraper] Running Facebook Search Scraper with input:', actorInput)

    const timeoutSeconds = Math.max(300, Math.min(900, 300 + Math.ceil(maxResults / 100) * 120))
    const run = await runActorWithProxyFallback(
      client,
      'apify/facebook-search-scraper',
      actorInput,
      timeoutSeconds,
      params.signal
    )

    console.log('[FacebookScraper] Run completed, fetching results...')

    // Get results from the dataset
    const items = await fetchDatasetItems(client, run.defaultDatasetId, maxResults)

    console.log(`[FacebookScraper] Retrieved ${items.length} raw results`)

    // Parse results
    const leads = items.map((item) => parseApifyResponse(item as Record<string, unknown>))

    // Sort by score (gold first)
    const scoreOrder = { gold: 0, silver: 1, bronze: 2 }
    leads.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score])

    console.log(`[FacebookScraper] Processed ${leads.length} leads`)

    return leads
  } catch (error) {
    console.error('[FacebookScraper] Search error:', error)
    throw error
  }
}

/**
 * Scrape specific Facebook page URLs using Apify Facebook Pages Scraper
 */
export async function scrapeFacebookPageUrls(
  urls: string[],
  signal?: AbortSignal
): Promise<FacebookPageLead[]> {
  console.log('[FacebookScraper] Scraping', urls.length, 'Facebook page URLs')

  if (!urls || urls.length === 0) {
    throw new Error('Please provide at least one Facebook page URL')
  }

  const client = getApifyClient()

  try {
    // Run the Facebook Pages Scraper actor
    // Actor ID: apify/facebook-pages-scraper
    console.log('[FacebookScraper] Running Facebook Pages Scraper...')

    const timeoutSeconds = Math.max(300, Math.min(900, 300 + Math.ceil(urls.length / 100) * 120))
    const run = await runActorWithProxyFallback(
      client,
      'apify/facebook-pages-scraper',
      { startUrls: urls.map((url) => ({ url })) },
      timeoutSeconds,
      signal
    )

    console.log('[FacebookScraper] Run completed, fetching results...')

    // Get results from the dataset
    const items = await fetchDatasetItems(client, run.defaultDatasetId, urls.length)

    console.log(`[FacebookScraper] Retrieved ${items.length} raw results`)

    // Parse results
    const leads = items.map((item) => parseApifyResponse(item as Record<string, unknown>))

    // Sort by score (gold first)
    const scoreOrder = { gold: 0, silver: 1, bronze: 2 }
    leads.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score])

    console.log(`[FacebookScraper] Processed ${leads.length} leads`)

    return leads
  } catch (error) {
    console.error('[FacebookScraper] Scrape error:', error)
    throw error
  }
}

/**
 * Check if Apify is properly configured
 */
export function isApifyConfigured(): boolean {
  const multiKeys = getApifyApiKeys()
  const singleKey = getApifyApiKey()
  return multiKeys.length > 0 || singleKey.length > 0
}
