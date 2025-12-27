/**
 * Facebook Page Scraper Service
 * Uses Apify to scrape business contact information from Facebook pages
 */

import { ApifyClient } from 'apify-client'
import { getApifyApiKey, getApifyApiKeys } from '../store'

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

// Parse Apify response to our FacebookPageLead format
function parseApifyResponse(item: Record<string, unknown>): FacebookPageLead {
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
    phone: (item.phone as string) || null,
    website: (item.website as string) || null,
    address: (item.address as string) || null,
    messenger: (item.messenger as string) || null,

    // Engagement
    likes: typeof item.likes === 'number' ? item.likes : 0,
    followers: typeof item.followers === 'number' ? item.followers : 0,
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
    apiKey = multiKeys[0].key
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

    const run = await client.actor('apify/facebook-search-scraper').call(actorInput, {
      timeout: 300 // 5 minutes timeout
    })

    console.log('[FacebookScraper] Run completed, fetching results...')

    // Get results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

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
export async function scrapeFacebookPageUrls(urls: string[]): Promise<FacebookPageLead[]> {
  console.log('[FacebookScraper] Scraping', urls.length, 'Facebook page URLs')

  if (!urls || urls.length === 0) {
    throw new Error('Please provide at least one Facebook page URL')
  }

  const client = getApifyClient()

  try {
    // Run the Facebook Pages Scraper actor
    // Actor ID: apify/facebook-pages-scraper
    console.log('[FacebookScraper] Running Facebook Pages Scraper...')

    const run = await client.actor('apify/facebook-pages-scraper').call(
      {
        startUrls: urls.map((url) => ({ url }))
      },
      {
        timeout: 300 // 5 minutes timeout
      }
    )

    console.log('[FacebookScraper] Run completed, fetching results...')

    // Get results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

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
