import {
  addFoundLead,
  addProcessedDomain,
  getAgencyProfile,
  getApiKeys,
  getHunterApiKeys,
  getJinaApiKeys,
  getReoonApiKeys,
  getSerperApiKeys,
  getSnovApiKeys,
  isDomainProcessed,
  type ApiKeyEntry,
  type FoundLead,
  type ProcessedDomain,
  type ScrapedContent
} from '../store'
import { executeWithAiRotation, resetAiRotationState } from './ai-rotation-manager'
import {
  clearExhaustedState,
  getExhaustedKeyCount,
  getNextKey,
  markKeyExhausted,
  registerService,
  resetAllKeyRotation,
  SERVICE_NAMES,
  type KeyEntry
} from './key-rotation-manager'

// Initialize key rotation services on module load
function initializeKeyRotationServices(): void {
  const serperKeys = getSerperApiKeys()
  const singleSerperKey = getApiKeys().serperApiKey
  const serperKeyEntries: KeyEntry[] = serperKeys.map((k) => ({ key: k.key }))
  if (singleSerperKey && serperKeys.length === 0) {
    serperKeyEntries.push({ key: singleSerperKey })
  }
  registerService(SERVICE_NAMES.SERPER, serperKeyEntries)

  const jinaKeys = getJinaApiKeys()
  const singleJinaKey = getApiKeys().jinaApiKey
  const jinaKeyEntries: KeyEntry[] = jinaKeys.map((k) => ({ key: k.key }))
  if (singleJinaKey && jinaKeys.length === 0) {
    jinaKeyEntries.push({ key: singleJinaKey })
  }
  registerService(SERVICE_NAMES.JINA, jinaKeyEntries)

  const hunterKeys = getHunterApiKeys()
  const singleHunterKey = getApiKeys().hunterApiKey
  const hunterKeyEntries: KeyEntry[] = hunterKeys.map((k) => ({ key: k.key }))
  if (singleHunterKey && hunterKeys.length === 0) {
    hunterKeyEntries.push({ key: singleHunterKey })
  }
  registerService(SERVICE_NAMES.HUNTER, hunterKeyEntries)

  const snovKeys = getSnovApiKeys()
  const { snovClientId, snovClientSecret } = getApiKeys()
  const snovKeyEntries: KeyEntry[] = snovKeys.map((k) => ({
    key: k.key,
    userId: k.userId || ''
  }))
  if (snovClientId && snovClientSecret && snovKeys.length === 0) {
    snovKeyEntries.push({ key: snovClientId, userId: snovClientSecret })
  }
  registerService(SERVICE_NAMES.SNOV, snovKeyEntries)

  const reoonKeys = getReoonApiKeys()
  const singleReoonKey = getApiKeys().reoonApiKey
  const reoonKeyEntries: KeyEntry[] = reoonKeys.map((k) => ({ key: k.key }))
  if (singleReoonKey && reoonKeys.length === 0) {
    reoonKeyEntries.push({ key: singleReoonKey })
  }
  registerService(SERVICE_NAMES.REOON, reoonKeyEntries)
}

// Auto-initialize services when module loads
// This ensures key rotation works even if called from strategy-manager or other modules
initializeKeyRotationServices()

// Export for other modules that need to refresh keys (e.g., after settings change)
export { initializeKeyRotationServices }

// Legacy helper for backward compatibility - reinitializes services and resets rotation
export function resetKeyRotation(): void {
  initializeKeyRotationServices()
  resetAllKeyRotation()
}

// Helper to get next key in ApiKeyEntry format
function getNextKeyForService(
  service: string,
  totalKeys: number
): { key: ApiKeyEntry | null; index: number; allExhausted: boolean } {
  const result = getNextKey(service)
  if (!result.key) {
    return { key: null, index: -1, allExhausted: result.allExhausted }
  }
  // Check if all keys are exhausted based on count
  const allExhausted = result.allExhausted || getExhaustedKeyCount(service) >= totalKeys
  // Map KeyEntry to ApiKeyEntry format
  return {
    key: { key: result.key.key, userId: result.key.userId },
    index: result.index,
    allExhausted
  }
}

// Types
export interface LeadGenerationInput {
  searchQuery: string
  niche: string
  location: string
  page?: number
}

export interface SearchResult {
  title: string
  link: string
  snippet: string
}

export interface LeadResult {
  url: string
  email: string | null
  decisionMaker: string | null
  verified: boolean
  source: 'direct' | 'hunter_name' | 'hunter_domain' | 'snov_name' | 'snov_domain'
  needsServices: boolean
  serviceMatchReason: string | null
}

export interface LeadGenerationCallbacks {
  onSearchStart: (query: string) => void
  onSearchComplete: (results: SearchResult[]) => void
  onCleanupComplete: (urls: string[]) => void
  onScrapeStart: (url: string) => void
  onScrapeComplete: (url: string, content: ScrapedContent) => void
  onScrapeError: (url: string, error: string) => void
  onAiAnalysisStart: (url: string) => void
  onAiAnalysisResult: (url: string, email: string | null, decisionMaker: string | null) => void
  onServiceMatchStart: (url: string) => void
  onServiceMatchResult: (url: string, needsServices: boolean, reason: string | null) => void
  onHunterStart: (url: string, type: 'name' | 'domain') => void
  onHunterResult: (url: string, email: string | null) => void
  onVerificationStart: (email: string) => void
  onVerificationResult: (email: string, verified: boolean) => void
  onLeadFound: (lead: LeadResult) => void
  onComplete: (leads: LeadResult[]) => void
  onError: (error: string) => void
}

export async function searchWithSerper(query: string, page: number = 1): Promise<SearchResult[]> {
  const multiKeys = getSerperApiKeys()
  const singleKey = getApiKeys().serperApiKey

  // Build keys array: multi-keys first, then single key as fallback
  const allKeys: { key: string; index: number }[] = []
  multiKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && multiKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    throw new Error('Serper API key not configured')
  }

  // Helper to make Serper request
  const makeSerperRequest = async (apiKey: string): Promise<Response> => {
    return fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 10, page }),
      signal: undefined // serper search not yet used in agent loop directly, but good practice
    })
  }

  // Try each key with rotation
  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const { key: keyEntry, index, allExhausted } = getNextKeyForService('serper', allKeys.length)

    if (!keyEntry) break

    console.log(`Serper[${index + 1}/${allKeys.length}] searching...`)
    const response = await makeSerperRequest(keyEntry.key)

    if (response.ok) {
      const data = await response.json()
      console.log(`Serper[${index + 1}/${allKeys.length}] search successful`)
      return (data.organic || []).map((item: { title: string; link: string; snippet: string }) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || ''
      }))
    }

    // Rate limit (429) or unauthorized - mark exhausted and try next
    if (response.status === 429 || response.status === 401) {
      console.log(
        `Serper[${index + 1}/${allKeys.length}] rate limited/unauthorized, trying next...`
      )
      markKeyExhausted('serper', index, `HTTP ${response.status}`)

      // If all keys exhausted, try first key again to check if reset
      if (allExhausted || getExhaustedKeyCount('serper') >= allKeys.length) {
        console.log('[Serper] All keys exhausted, checking if first key has reset...')
        const firstKeyResponse = await makeSerperRequest(allKeys[0].key)

        if (firstKeyResponse.ok) {
          // First key reset! Clear exhausted state and use it
          console.log('[Serper] First key has reset! Continuing...')
          clearExhaustedState('serper')
          const data = await firstKeyResponse.json()
          return (data.organic || []).map(
            (item: { title: string; link: string; snippet: string }) => ({
              title: item.title,
              link: item.link,
              snippet: item.snippet || ''
            })
          )
        }

        // First key still rate limited - STOP
        throw new Error(
          'All Serper API keys have hit rate limits. Please wait until they reset or add new API keys in Settings.'
        )
      }
      continue
    }

    // Other error - throw immediately
    throw new Error(`Serper API error: ${response.status}`)
  }

  throw new Error('All Serper API keys exhausted')
}

// Serper Maps API - Google Maps Business Search with key rotation
export interface MapsPlace {
  title: string
  address: string
  phone: string | null
  website: string | null
  rating: number
  ratingCount: number
  category: string
  cid: string
  latitude: number
  longitude: number
}

export interface MapsSearchParams {
  query: string
  location: string
  countryCode?: string
  num?: number
  // Advanced options
  ll?: string // GPS coordinates: @latitude,longitude,zoomz (e.g., @40.7455096,-74.0083012,14z)
  latitude?: number
  longitude?: number
  zoom?: number // Zoom level: 3 (zoomed out) to 21 (zoomed in), default 14
  hl?: string // Language code: en, es, fr, etc.
  start?: number // Pagination offset: 0 (page 1), 20 (page 2), 40 (page 3), etc.
  autocomplete?: boolean // Whether to auto-fetch multiple pages
  maxPages?: number // Max pages to fetch when autocomplete is true (default 3)
  signal?: AbortSignal // Cancellation signal
}

export async function searchMapsWithSerper(params: MapsSearchParams): Promise<MapsPlace[]> {
  const multiKeys = getSerperApiKeys()
  const singleKey = getApiKeys().serperApiKey

  // Build keys array: multi-keys first, then single key as fallback
  const allKeys: { key: string; index: number }[] = []
  multiKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && multiKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    throw new Error('Serper API key not configured. Please add your API key in Settings.')
  }

  // Helper to make Serper Maps request
  const makeSerperMapsRequest = async (apiKey: string, start: number = 0): Promise<Response> => {
    const requestBody: Record<string, unknown> = {
      q: params.query,
      num: params.num || 20
    }

    // Location can be text-based OR GPS-based
    // If ll parameter provided directly, use it
    if (params.ll) {
      requestBody.ll = params.ll
    }
    // If latitude/longitude/zoom provided, construct ll parameter
    else if (params.latitude && params.longitude) {
      const zoom = params.zoom || 14
      requestBody.ll = `@${params.latitude},${params.longitude},${zoom}z`
    }
    // Otherwise use text location
    else if (params.location) {
      requestBody.location = params.location
    }

    // Add country code if provided
    if (params.countryCode) {
      requestBody.gl = params.countryCode.toLowerCase()
    }

    // Add language if provided
    if (params.hl) {
      requestBody.hl = params.hl
    }

    // Add pagination offset
    if (start > 0) {
      requestBody.start = start
    }

    console.log('[SerperMaps] Request body:', JSON.stringify(requestBody))

    return fetch('https://google.serper.dev/maps', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: params.signal
    })
  }

  // Helper to parse Maps response
  const parseMapsResponse = (data: unknown): MapsPlace[] => {
    const response = data as { places?: unknown[] }
    if (!response.places || !Array.isArray(response.places)) {
      return []
    }

    return response.places.map((place: unknown) => {
      const p = place as Record<string, unknown>
      return {
        title: (p.title as string) || 'Unknown Business',
        address: (p.address as string) || '',
        phone: (p.phoneNumber as string) || (p.phone as string) || null,
        website: (p.website as string) || null,
        rating: (p.rating as number) || 0,
        ratingCount: (p.ratingCount as number) || (p.reviewsCount as number) || 0,
        category: (p.category as string) || (p.type as string) || 'Business',
        cid: (p.cid as string) || (p.placeId as string) || '',
        latitude: (p.latitude as number) || 0,
        longitude: (p.longitude as number) || 0
      }
    })
  }

  // Helper to fetch a single page with key rotation
  const fetchSinglePage = async (start: number = 0): Promise<MapsPlace[]> => {
    for (let attempt = 0; attempt < allKeys.length; attempt++) {
      const { key: keyEntry, index, allExhausted } = getNextKeyForService('serper', allKeys.length)

      if (!keyEntry) break

      const locationDesc =
        params.ll || params.location || `GPS(${params.latitude},${params.longitude})`
      console.log(
        `SerperMaps[${index + 1}/${allKeys.length}] searching: "${params.query}" in ${locationDesc} (offset: ${start})`
      )
      const response = await makeSerperMapsRequest(keyEntry.key, start)

      if (response.ok) {
        const data = await response.json()
        const places = parseMapsResponse(data)
        console.log(`SerperMaps[${index + 1}/${allKeys.length}] found ${places.length} places`)
        return places
      }

      // Rate limit (429) or unauthorized - mark exhausted and try next
      if (response.status === 429 || response.status === 401) {
        console.log(
          `SerperMaps[${index + 1}/${allKeys.length}] rate limited/unauthorized, trying next...`
        )
        markKeyExhausted('serper', index, `HTTP ${response.status}`)

        // If all keys exhausted, try first key again to check if reset
        if (allExhausted || getExhaustedKeyCount('serper') >= allKeys.length) {
          console.log('[SerperMaps] All keys exhausted, checking if first key has reset...')
          const firstKeyResponse = await makeSerperMapsRequest(allKeys[0].key, start)

          if (firstKeyResponse.ok) {
            console.log('[SerperMaps] First key has reset! Continuing...')
            clearExhaustedState('serper')
            const data = await firstKeyResponse.json()
            return parseMapsResponse(data)
          }

          throw new Error(
            'All Serper API keys have hit rate limits. Please wait until they reset or add new API keys in Settings.'
          )
        }
        continue
      }

      // Other error - throw immediately
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Serper Maps API error (${response.status}): ${errorText}`)
    }

    throw new Error('All Serper API keys exhausted')
  }

  // If autocomplete/pagination is enabled, fetch multiple pages
  if (params.autocomplete) {
    const maxPages = params.maxPages || 3
    const resultsPerPage = params.num || 20
    const allPlaces: MapsPlace[] = []
    const seenCids = new Set<string>()

    for (let page = 0; page < maxPages; page++) {
      const start = page * resultsPerPage
      console.log(`[SerperMaps] Fetching page ${page + 1}/${maxPages} (offset: ${start})`)

      try {
        const places = await fetchSinglePage(start)

        // Deduplicate by cid
        for (const place of places) {
          const uniqueKey = place.cid || `${place.title}-${place.address}`
          if (!seenCids.has(uniqueKey)) {
            seenCids.add(uniqueKey)
            allPlaces.push(place)
          }
        }

        // If we got fewer results than requested, stop pagination
        if (places.length < resultsPerPage) {
          console.log(`[SerperMaps] Got ${places.length} < ${resultsPerPage}, stopping pagination`)
          break
        }

        // Recommended max offset is 100 (5 pages of 20)
        if (start >= 80) {
          console.log('[SerperMaps] Reached recommended max offset (100), stopping pagination')
          break
        }
      } catch (err) {
        // If pagination fails on later pages, return what we have
        if (page > 0 && allPlaces.length > 0) {
          console.log(`[SerperMaps] Page ${page + 1} failed, returning ${allPlaces.length} results`)
          break
        }
        throw err
      }
    }

    console.log(`[SerperMaps] Total unique places found: ${allPlaces.length}`)
    return allPlaces
  }

  // Single page fetch (default behavior)
  return fetchSinglePage(params.start || 0)
}

// Serper Reviews API - Fetch Google Maps reviews with key rotation
export interface Review {
  author: string
  rating: number
  date: string
  text: string
  source?: string
}

export interface ReviewsResult {
  businessName: string
  totalReviews: number
  averageRating: number
  reviews: Review[]
}

export async function fetchReviewsWithSerper(
  placeId: string,
  businessName: string,
  num: number = 10,
  signal?: AbortSignal
): Promise<ReviewsResult> {
  const multiKeys = getSerperApiKeys()
  const singleKey = getApiKeys().serperApiKey

  // Build keys array: multi-keys first, then single key as fallback
  const allKeys: { key: string; index: number }[] = []
  multiKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && multiKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    throw new Error('Serper API key not configured. Please add your API key in Settings.')
  }

  // Helper to make Serper Reviews request
  const makeSerperReviewsRequest = async (apiKey: string): Promise<Response> => {
    // Serper uses /reviews endpoint with place data_id
    return fetch('https://google.serper.dev/reviews', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cid: placeId,
        num: num
      }),
      signal: signal
    })
  }

  // Helper to parse Reviews response
  const parseReviewsResponse = (data: unknown): ReviewsResult => {
    // Log the raw response to debug
    console.log('[SerperReviews] Raw API Response:', JSON.stringify(data, null, 2))

    const response = data as {
      reviews?: unknown[]
      rating?: number
      reviewsCount?: number
      title?: string
      place_info?: { rating?: number; reviews?: number; title?: string }
    }

    // Get rating from place_info if available (Serper structure)
    const placeInfo = response.place_info
    const avgRating = placeInfo?.rating ?? response.rating ?? 0
    const totalReviews = placeInfo?.reviews ?? response.reviewsCount ?? 0
    const businessTitle = placeInfo?.title ?? response.title ?? businessName

    const reviews: Review[] = []
    if (response.reviews && Array.isArray(response.reviews)) {
      for (const r of response.reviews) {
        const review = r as Record<string, unknown>

        // user is an object with name property
        let authorName = 'Anonymous'
        if (review.user && typeof review.user === 'object') {
          const user = review.user as Record<string, unknown>
          authorName = (user.name as string) || 'Anonymous'
        } else if (typeof review.author === 'string') {
          authorName = review.author
        }

        // Get review text from snippet or extracted_snippet
        let reviewText = ''
        if (typeof review.snippet === 'string') {
          reviewText = review.snippet
        } else if (review.extracted_snippet && typeof review.extracted_snippet === 'object') {
          const extracted = review.extracted_snippet as Record<string, unknown>
          reviewText = (extracted.original as string) || (extracted.translated as string) || ''
        } else if (typeof review.text === 'string') {
          reviewText = review.text
        }

        reviews.push({
          author: authorName,
          rating: (review.rating as number) ?? 0,
          date: (review.date as string) || (review.iso_date as string) || '',
          text: reviewText,
          source: (review.source as string) || undefined
        })
      }
    }

    console.log(
      `[SerperReviews] Parsed: avgRating=${avgRating}, totalReviews=${totalReviews}, reviewsCount=${reviews.length}`
    )

    return {
      businessName: businessTitle,
      totalReviews: totalReviews || reviews.length,
      averageRating: avgRating,
      reviews
    }
  }

  // Try each key with rotation
  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const { key: keyEntry, index, allExhausted } = getNextKeyForService('serper', allKeys.length)

    if (!keyEntry) break

    console.log(
      `SerperReviews[${index + 1}/${allKeys.length}] fetching reviews for: ${businessName}`
    )
    const response = await makeSerperReviewsRequest(keyEntry.key)

    if (response.ok) {
      const data = await response.json()
      const result = parseReviewsResponse(data)
      console.log(
        `SerperReviews[${index + 1}/${allKeys.length}] found ${result.reviews.length} reviews`
      )
      return result
    }

    // Rate limit (429) or unauthorized - mark exhausted and try next
    if (response.status === 429 || response.status === 401) {
      console.log(
        `SerperReviews[${index + 1}/${allKeys.length}] rate limited/unauthorized, trying next...`
      )
      markKeyExhausted('serper', index, `HTTP ${response.status}`)

      // If all keys exhausted, try first key again to check if reset
      if (allExhausted || getExhaustedKeyCount('serper') >= allKeys.length) {
        console.log('[SerperReviews] All keys exhausted, checking if first key has reset...')
        const firstKeyResponse = await makeSerperReviewsRequest(allKeys[0].key)

        if (firstKeyResponse.ok) {
          console.log('[SerperReviews] First key has reset! Continuing...')
          clearExhaustedState('serper')
          const data = await firstKeyResponse.json()
          return parseReviewsResponse(data)
        }

        throw new Error(
          'All Serper API keys have hit rate limits. Please wait until they reset or add new API keys in Settings.'
        )
      }
      continue
    }

    // Other error - throw immediately
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Serper Reviews API error (${response.status}): ${errorText}`)
  }

  throw new Error('All Serper API keys exhausted')
}

// Jina Reader API - Content Scraping with key rotation on rate limit
export async function scrapeWithJina(url: string, signal?: AbortSignal): Promise<ScrapedContent> {
  const multiKeys = getJinaApiKeys()
  const singleKey = getApiKeys().jinaApiKey

  // Build keys array: multi-keys first, then single key as fallback
  const allKeys: { key: string; index: number }[] = []
  multiKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && multiKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    throw new Error('Jina API key not configured')
  }

  // Helper to make the actual Jina request
  const makeJinaRequest = async (apiKey: string): Promise<Response> => {
    return fetch(`https://r.jina.ai/${url}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/plain'
      },
      signal: signal
    })
  }

  // Helper to parse successful response
  const parseResponse = async (response: Response): Promise<ScrapedContent> => {
    const content = await response.text()
    return {
      url,
      content: content.slice(0, 15000),
      title: url
    }
  }

  // Try each key with rotation
  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const { key: keyEntry, index, allExhausted } = getNextKeyForService('jina', allKeys.length)

    if (!keyEntry) break

    console.log(`Jina[${index + 1}/${allKeys.length}] scraping ${url}`)
    const response = await makeJinaRequest(keyEntry.key)

    if (response.ok) {
      return parseResponse(response)
    }

    // Rate limit (429) - mark exhausted and try next
    if (response.status === 429) {
      console.log(`Jina[${index + 1}/${allKeys.length}] rate limited, trying next key...`)
      markKeyExhausted('jina', index, 'rate_limit')

      // If all keys exhausted, try first key again to check if reset
      if (allExhausted || getExhaustedKeyCount('jina') >= allKeys.length) {
        console.log('[Jina] All keys exhausted, checking if first key has reset...')
        const firstKeyResponse = await makeJinaRequest(allKeys[0].key)

        if (firstKeyResponse.ok) {
          // First key reset! Clear exhausted state and use it
          console.log('[Jina] First key has reset! Continuing...')
          clearExhaustedState('jina')
          return parseResponse(firstKeyResponse)
        }

        // First key still rate limited - STOP
        throw new Error(
          'All Jina API keys have hit rate limits. Please wait until they reset or add new API keys in Settings.'
        )
      }
      continue
    }

    // Other error - throw immediately
    throw new Error(
      `Jina API error (${response.status}): Unable to scrape content. Please check your API key or try again later.`
    )
  }

  throw new Error('All Jina API keys exhausted')
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Rate limit detection helper
function isRateLimitError(response: Response, data?: unknown): boolean {
  if (response.status === 429) return true
  if (response.status === 402) return true // Payment required / quota exceeded
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (d.error === 'rate_limit' || d.error === 'quota_exceeded') return true
    if (typeof d.message === 'string' && d.message.toLowerCase().includes('rate limit')) return true
  }
  return false
}

// Hunter.io API with multi-key rotation
export async function findEmailByDomainWithRotation(
  domain: string
): Promise<{ email: string | null; rateLimited: boolean; keyIndex: number }> {
  const hunterKeys = getHunterApiKeys()
  const singleKey = getApiKeys().hunterApiKey

  // Build keys array: multi-keys first, then single key as fallback
  const allKeys: { key: string; index: number }[] = []
  hunterKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && hunterKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    return { email: null, rateLimited: false, keyIndex: -1 }
  }

  const { key: keyEntry, index, allExhausted } = getNextKeyForService('hunter', allKeys.length)
  if (!keyEntry || allExhausted) {
    return { email: null, rateLimited: true, keyIndex: -1 }
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${keyEntry.key}`
    )

    const data = await response.json()

    if (isRateLimitError(response, data)) {
      console.log(`[Hunter.io] Key #${index + 1} rate limited, marking exhausted`)
      markKeyExhausted('hunter', index, 'rate_limit')
      return { email: null, rateLimited: true, keyIndex: index }
    }

    if (!response.ok) {
      return { email: null, rateLimited: false, keyIndex: index }
    }

    if (data.data?.emails?.length > 0) {
      return { email: data.data.emails[0].value, rateLimited: false, keyIndex: index }
    }
    return { email: null, rateLimited: false, keyIndex: index }
  } catch {
    return { email: null, rateLimited: false, keyIndex: index }
  }
}

export async function findEmailByNameWithRotation(
  firstName: string,
  lastName: string,
  domain: string
): Promise<{ email: string | null; rateLimited: boolean; keyIndex: number }> {
  const hunterKeys = getHunterApiKeys()
  const singleKey = getApiKeys().hunterApiKey

  const allKeys: { key: string; index: number }[] = []
  hunterKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && hunterKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    return { email: null, rateLimited: false, keyIndex: -1 }
  }

  const { key: keyEntry, index, allExhausted } = getNextKeyForService('hunter', allKeys.length)
  if (!keyEntry || allExhausted) {
    return { email: null, rateLimited: true, keyIndex: -1 }
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${keyEntry.key}`
    )

    const data = await response.json()

    if (isRateLimitError(response, data)) {
      console.log(`[Hunter.io] Key #${index + 1} rate limited, marking exhausted`)
      markKeyExhausted('hunter', index, 'rate_limit')
      return { email: null, rateLimited: true, keyIndex: index }
    }

    if (!response.ok) {
      return { email: null, rateLimited: false, keyIndex: index }
    }

    if (data.data?.email) {
      return { email: data.data.email, rateLimited: false, keyIndex: index }
    }
    return { email: null, rateLimited: false, keyIndex: index }
  } catch {
    return { email: null, rateLimited: false, keyIndex: index }
  }
}

// Snov.io with multi-key rotation
export async function getSnovAccessTokenWithKey(
  clientId: string,
  clientSecret: string
): Promise<{ token: string | null; rateLimited: boolean }> {
  try {
    const response = await fetch('https://api.snov.io/v1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    const data = await response.json()

    if (isRateLimitError(response, data)) {
      return { token: null, rateLimited: true }
    }

    if (data.access_token) {
      return { token: data.access_token, rateLimited: false }
    }
    return { token: null, rateLimited: false }
  } catch {
    return { token: null, rateLimited: false }
  }
}

export async function findEmailByDomainSnovWithRotation(
  domain: string
): Promise<{ email: string | null; rateLimited: boolean; keyIndex: number }> {
  const snovKeys = getSnovApiKeys()
  const { snovClientId, snovClientSecret } = getApiKeys()

  // Build keys array
  const allKeys: { clientId: string; clientSecret: string; index: number }[] = []
  snovKeys.forEach((k, i) =>
    allKeys.push({ clientId: k.key, clientSecret: k.userId || '', index: i })
  )
  if (snovClientId && snovClientSecret && snovKeys.length === 0) {
    allKeys.push({ clientId: snovClientId, clientSecret: snovClientSecret, index: 0 })
  }

  if (allKeys.length === 0) {
    return { email: null, rateLimited: false, keyIndex: -1 }
  }

  const { key: keyEntry, index, allExhausted } = getNextKeyForService('snov', allKeys.length)
  if (!keyEntry || allExhausted) {
    return { email: null, rateLimited: true, keyIndex: -1 }
  }

  const currentKey = allKeys[index]
  const { token, rateLimited: tokenRateLimited } = await getSnovAccessTokenWithKey(
    currentKey.clientId,
    currentKey.clientSecret
  )

  if (tokenRateLimited) {
    console.log(`[Snov.io] Key #${index + 1} rate limited during auth`)
    markKeyExhausted('snov', index, 'rate_limit')
    return { email: null, rateLimited: true, keyIndex: index }
  }

  if (!token) {
    return { email: null, rateLimited: false, keyIndex: index }
  }

  try {
    const startResponse = await fetch('https://api.snov.io/v2/domain-search/domain-emails/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ domain })
    })

    if (isRateLimitError(startResponse)) {
      markKeyExhausted('snov', index, 'rate_limit')
      return { email: null, rateLimited: true, keyIndex: index }
    }

    const startData = await startResponse.json()
    const taskHash = startData.meta?.task_hash || startData.data?.task_hash
    if (!taskHash) return { email: null, rateLimited: false, keyIndex: index }

    // Poll for results
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const resultResponse = await fetch(
        `https://api.snov.io/v2/domain-search/domain-emails/result/${taskHash}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (isRateLimitError(resultResponse)) {
        markKeyExhausted('snov', index, 'rate_limit')
        return { email: null, rateLimited: true, keyIndex: index }
      }

      const resultData = await resultResponse.json()
      if (resultData.status === 'completed' && resultData.data?.length > 0) {
        const validEmail = resultData.data.find(
          (e: { email: string; smtp_status?: string }) =>
            e.email && (e.smtp_status === 'valid' || !e.smtp_status)
        )
        return {
          email: validEmail?.email || resultData.data[0].email,
          rateLimited: false,
          keyIndex: index
        }
      }
      if (resultData.status === 'completed') break
    }
    return { email: null, rateLimited: false, keyIndex: index }
  } catch {
    return { email: null, rateLimited: false, keyIndex: index }
  }
}

// Snov.io API - Find email by name and domain (exactly like Hunter.io Email Finder)
export async function findEmailByNameSnovWithRotation(
  firstName: string,
  lastName: string,
  domain: string
): Promise<{ email: string | null; rateLimited: boolean; keyIndex: number }> {
  const snovKeys = getSnovApiKeys()
  const { snovClientId, snovClientSecret } = getApiKeys()

  // Build keys array
  const allKeys: { clientId: string; clientSecret: string; index: number }[] = []
  snovKeys.forEach((k, i) =>
    allKeys.push({ clientId: k.key, clientSecret: k.userId || '', index: i })
  )
  if (snovClientId && snovClientSecret && snovKeys.length === 0) {
    allKeys.push({ clientId: snovClientId, clientSecret: snovClientSecret, index: 0 })
  }

  if (allKeys.length === 0) {
    return { email: null, rateLimited: false, keyIndex: -1 }
  }

  const { key: keyEntry, index, allExhausted } = getNextKeyForService('snov', allKeys.length)
  if (!keyEntry || allExhausted) {
    return { email: null, rateLimited: true, keyIndex: -1 }
  }

  const currentKey = allKeys[index]
  const { token, rateLimited: tokenRateLimited } = await getSnovAccessTokenWithKey(
    currentKey.clientId,
    currentKey.clientSecret
  )

  if (tokenRateLimited) {
    console.log(`[Snov.io] Key #${index + 1} rate limited during auth`)
    markKeyExhausted('snov', index, 'rate_limit')
    return { email: null, rateLimited: true, keyIndex: index }
  }

  if (!token) {
    return { email: null, rateLimited: false, keyIndex: index }
  }

  try {
    // Step 1: Start email search by name + domain
    const startResponse = await fetch('https://api.snov.io/v2/emails-by-domain-by-name/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rows: [{ first_name: firstName, last_name: lastName, domain }]
      })
    })

    if (isRateLimitError(startResponse)) {
      markKeyExhausted('snov', index, 'rate_limit')
      return { email: null, rateLimited: true, keyIndex: index }
    }

    const startData = await startResponse.json()
    const taskHash = startData.data?.task_hash

    if (!taskHash) {
      return { email: null, rateLimited: false, keyIndex: index }
    }

    // Step 2: Poll for results (max 10 attempts, 1 second apart)
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000))

      const resultResponse = await fetch(
        `https://api.snov.io/v2/emails-by-domain-by-name/result?task_hash=${taskHash}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (isRateLimitError(resultResponse)) {
        markKeyExhausted('snov', index, 'rate_limit')
        return { email: null, rateLimited: true, keyIndex: index }
      }

      const resultData = await resultResponse.json()

      if (resultData.status === 'completed' && resultData.data?.length > 0) {
        const personResult = resultData.data[0]
        if (personResult.result?.length > 0) {
          // Find valid email (prefer smtp_status = valid)
          const validEmail = personResult.result.find(
            (e: { email: string; smtp_status?: string }) =>
              e.email && (e.smtp_status === 'valid' || e.smtp_status === 'unknown')
          )
          if (validEmail) {
            return { email: validEmail.email, rateLimited: false, keyIndex: index }
          }
          // Fallback to first email
          return { email: personResult.result[0].email, rateLimited: false, keyIndex: index }
        }
      }

      if (resultData.status === 'completed') break
    }

    return { email: null, rateLimited: false, keyIndex: index }
  } catch {
    return { email: null, rateLimited: false, keyIndex: index }
  }
}

// Combined email finder with multi-key rotation and service fallback
// Flow: Hunter.io (all keys) → Snov.io (all keys) → Check Hunter first key reset → STOP if not reset
export async function findEmailWithFallback(
  domain: string,
  firstName?: string,
  lastName?: string
): Promise<{ email: string | null; source: string; allKeysExhausted?: boolean }> {
  const hunterKeys = getHunterApiKeys()
  const snovKeys = getSnovApiKeys()
  const { hunterApiKey, snovClientId, snovClientSecret } = getApiKeys()

  const hasHunterKeys = hunterKeys.length > 0 || !!hunterApiKey
  const hasSnovKeys = snovKeys.length > 0 || (!!snovClientId && !!snovClientSecret)

  if (!hasHunterKeys && !hasSnovKeys) {
    return { email: null, source: 'none' }
  }

  // Helper to try Hunter.io with all available keys
  const tryHunterWithAllKeys = async (): Promise<{
    email: string | null
    source: string
    allExhausted: boolean
  }> => {
    const totalHunterKeys = hunterKeys.length || (hunterApiKey ? 1 : 0)
    for (let attempt = 0; attempt < totalHunterKeys + 1; attempt++) {
      if (firstName && lastName) {
        const result = await findEmailByNameWithRotation(firstName, lastName, domain)
        if (result.email) return { email: result.email, source: 'hunter_name', allExhausted: false }
        if (!result.rateLimited) return { email: null, source: 'none', allExhausted: false }
      }

      const domainResult = await findEmailByDomainWithRotation(domain)
      if (domainResult.email)
        return { email: domainResult.email, source: 'hunter_domain', allExhausted: false }
      if (!domainResult.rateLimited) return { email: null, source: 'none', allExhausted: false }

      console.log(`[Email Finder] Hunter.io key rate limited, trying next...`)
    }
    return { email: null, source: 'none', allExhausted: true }
  }

  // Helper to try Snov.io with all available keys
  const trySnovWithAllKeys = async (): Promise<{
    email: string | null
    source: string
    allExhausted: boolean
  }> => {
    const totalSnovKeys = snovKeys.length || (snovClientId && snovClientSecret ? 1 : 0)
    for (let attempt = 0; attempt < totalSnovKeys + 1; attempt++) {
      if (firstName && lastName) {
        const nameResult = await findEmailByNameSnovWithRotation(firstName, lastName, domain)
        if (nameResult.email)
          return { email: nameResult.email, source: 'snov_name', allExhausted: false }
        if (!nameResult.rateLimited) {
          // No rate limit, try domain search
        } else {
          console.log(`[Email Finder] Snov.io name search rate limited, trying next key...`)
          continue
        }
      }

      const domainResult = await findEmailByDomainSnovWithRotation(domain)
      if (domainResult.email)
        return { email: domainResult.email, source: 'snov_domain', allExhausted: false }
      if (!domainResult.rateLimited) return { email: null, source: 'none', allExhausted: false }

      console.log(`[Email Finder] Snov.io domain search rate limited, trying next key...`)
    }
    return { email: null, source: 'none', allExhausted: true }
  }

  // Helper to check if Hunter first key has reset
  const checkHunterFirstKeyReset = async (): Promise<{
    email: string | null
    source: string
    isReset: boolean
  }> => {
    // Clear Hunter exhausted state to test first key
    clearExhaustedState('hunter')

    if (firstName && lastName) {
      const result = await findEmailByNameWithRotation(firstName, lastName, domain)
      if (result.email) return { email: result.email, source: 'hunter_name', isReset: true }
      if (!result.rateLimited) return { email: null, source: 'none', isReset: true }
    }

    const domainResult = await findEmailByDomainWithRotation(domain)
    if (domainResult.email)
      return { email: domainResult.email, source: 'hunter_domain', isReset: true }
    if (!domainResult.rateLimited) return { email: null, source: 'none', isReset: true }

    return { email: null, source: 'none', isReset: false }
  }

  // STEP 1: Try Hunter.io with all keys
  if (hasHunterKeys) {
    console.log('[Email Finder] Starting with Hunter.io...')
    const hunterResult = await tryHunterWithAllKeys()
    if (hunterResult.email) return { email: hunterResult.email, source: hunterResult.source }
    if (!hunterResult.allExhausted) return { email: null, source: 'none' }
    console.log('[Email Finder] All Hunter.io keys exhausted')
  }

  // STEP 2: Switch to Snov.io
  if (hasSnovKeys) {
    console.log('[Email Finder] Switching to Snov.io fallback...')
    const snovResult = await trySnovWithAllKeys()
    if (snovResult.email) return { email: snovResult.email, source: snovResult.source }
    if (!snovResult.allExhausted) return { email: null, source: 'none' }
    console.log('[Email Finder] All Snov.io keys exhausted')
  }

  // STEP 3: Both services exhausted - check if Hunter first key has reset
  if (hasHunterKeys && hasSnovKeys) {
    console.log('[Email Finder] All keys exhausted, checking if Hunter.io first key has reset...')
    const resetCheck = await checkHunterFirstKeyReset()

    if (resetCheck.isReset) {
      console.log('[Email Finder] Hunter.io first key has reset! Restarting cycle...')
      if (resetCheck.email) return { email: resetCheck.email, source: resetCheck.source }

      // First key reset but no email found, continue with remaining Hunter keys
      const hunterResult = await tryHunterWithAllKeys()
      if (hunterResult.email) return { email: hunterResult.email, source: hunterResult.source }
      if (!hunterResult.allExhausted) return { email: null, source: 'none' }

      // Then try Snov again
      clearExhaustedState('snov')
      const snovResult = await trySnovWithAllKeys()
      if (snovResult.email) return { email: snovResult.email, source: snovResult.source }
    }

    // Hunter first key NOT reset - STOP
    console.log('[Email Finder] Hunter.io first key NOT reset - ALL SERVICES EXHAUSTED')
    return { email: null, source: 'none', allKeysExhausted: true }
  }

  // Only one service configured and it's exhausted
  if (hasHunterKeys || hasSnovKeys) {
    return { email: null, source: 'none', allKeysExhausted: true }
  }

  return { email: null, source: 'none' }
}

// Reoon API - Email Verification with multi-key rotation
// Flow: Always try first key first → rotate through keys → fallback to Rapid → check first key reset
export async function verifyEmailWithReoon(
  email: string
): Promise<{ verified: boolean; rateLimited: boolean; allKeysExhausted: boolean }> {
  const reoonKeys = getReoonApiKeys()
  const singleKey = getApiKeys().reoonApiKey

  // Build keys array: multi-keys first, then single key as fallback
  const allKeys: { key: string; index: number }[] = []
  reoonKeys.forEach((k, i) => allKeys.push({ key: k.key, index: i }))
  if (singleKey && reoonKeys.length === 0) {
    allKeys.push({ key: singleKey, index: 0 })
  }

  if (allKeys.length === 0) {
    return { verified: false, rateLimited: false, allKeysExhausted: false }
  }

  // Helper to make Reoon verification request
  const makeReoonRequest = async (
    apiKey: string
  ): Promise<{ verified: boolean; rateLimited: boolean; error: boolean }> => {
    try {
      const response = await fetch(
        `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${apiKey}&mode=power`
      )

      const data = await response.json()
      console.log(`[Reoon] Raw response for ${email}:`, JSON.stringify(data))

      if (isRateLimitError(response, data)) {
        console.log(`[Reoon] Rate limited for ${email}`)
        return { verified: false, rateLimited: true, error: false }
      }

      if (!response.ok) {
        console.log(`[Reoon] HTTP error ${response.status} for ${email}`)
        return { verified: false, rateLimited: false, error: true }
      }

      // Reoon status values:
      // - 'valid': Definitely valid, email exists
      // - 'safe': Personal email, deliverable
      // - 'catch_all': Domain accepts all emails (closer to valid per Reoon docs)
      // - 'unknown': Couldn't determine
      // - 'invalid': Email doesn't exist
      // - 'disposable': Temporary email
      // - 'spamtrap': Spam trap
      //
      // Consider valid: 'valid', 'safe', or 'catch_all' (per Reoon documentation)
      const validStatuses = ['valid', 'safe', 'catch_all']
      const verified = validStatuses.includes(data.status?.toLowerCase())
      console.log(
        `[Reoon] Result for ${email}: ${verified ? 'VALID' : 'INVALID'} (status: ${data.status})`
      )
      return { verified, rateLimited: false, error: false }
    } catch (err) {
      console.log(`[Reoon] Exception for ${email}:`, err)
      return { verified: false, rateLimited: false, error: true }
    }
  }

  // ALWAYS try first key first (to check if it has reset from previous calls)
  console.log(`[Reoon] Trying first key first (checking if reset)...`)
  const firstKeyResult = await makeReoonRequest(allKeys[0].key)

  if (!firstKeyResult.rateLimited && !firstKeyResult.error) {
    // First key works! Clear exhausted state and return result
    clearExhaustedState('reoon')
    return { verified: firstKeyResult.verified, rateLimited: false, allKeysExhausted: false }
  }

  if (firstKeyResult.rateLimited) {
    console.log(`[Reoon] First key still rate limited, trying other keys...`)
    markKeyExhausted('reoon', 0, 'rate_limit')
  }

  // Try remaining keys
  for (let i = 1; i < allKeys.length; i++) {
    const keyResult = await makeReoonRequest(allKeys[i].key)

    if (!keyResult.rateLimited && !keyResult.error) {
      return { verified: keyResult.verified, rateLimited: false, allKeysExhausted: false }
    }

    if (keyResult.rateLimited) {
      console.log(`[Reoon] Key #${i + 1} rate limited, trying next...`)
      markKeyExhausted('reoon', i, 'rate_limit')
    }
  }

  // All keys exhausted
  console.log('[Reoon] All keys exhausted')
  return { verified: false, rateLimited: true, allKeysExhausted: true }
}

// Rapid Email Verifier - Free Open Source fallback (no API key needed)
// https://rapid-email-verifier.fly.dev/ - unlimited, no auth required
// GitHub: https://github.com/umuterturk/email-verifier
export async function verifyEmailWithRapidVerifier(email: string): Promise<boolean> {
  try {
    console.log(`[Rapid Verifier] Verifying email (free fallback): ${email}`)
    const response = await fetch(
      `https://rapid-email-verifier.fly.dev/api/validate?email=${encodeURIComponent(email)}`
    )

    if (!response.ok) {
      console.log(`[Rapid Verifier] API error: HTTP ${response.status}`)
      return false
    }

    const data = await response.json()
    console.log(`[Rapid Verifier] Raw response:`, JSON.stringify(data))

    // Rapid Verifier status values (from official docs):
    // - 'VALID': Email is valid
    // - 'PROBABLY_VALID': Role-based email (admin@, info@) - still valid
    // - 'DISPOSABLE': Temporary email - invalid
    // - 'INVALID_FORMAT': Bad syntax - invalid
    // - 'INVALID_DOMAIN': Domain doesn't exist - invalid
    //
    // Consider valid: 'VALID' or 'PROBABLY_VALID'
    const status = data.status?.toUpperCase()
    const validStatuses = ['VALID', 'PROBABLY_VALID']
    const isValid = validStatuses.includes(status)

    // If no status field, check validations object as fallback
    if (!data.status && data.validations) {
      const allValid =
        data.validations.syntax === true &&
        data.validations.domain_exists === true &&
        data.validations.mx_records === true
      console.log(
        `[Rapid Verifier] Result for ${email}: ${allValid ? 'VALID' : 'INVALID'} (from validations)`
      )
      return allValid
    }

    console.log(
      `[Rapid Verifier] Result for ${email}: ${isValid ? 'VALID' : 'INVALID'} (status: ${data.status})`
    )
    return isValid
  } catch (error) {
    console.log('[Rapid Verifier] Error:', error)
    return false
  }
}

// AI-powered combined analysis: URL qualification + Service matching + Data extraction
export interface CombinedAiAnalysisResult {
  isValidLead: boolean
  qualificationReason: string
  needsServices: boolean
  serviceMatchReason: string
  email: string | null
  decisionMaker: string | null
}

export async function combinedAiAnalysis(
  content: string,
  url: string
): Promise<CombinedAiAnalysisResult> {
  const profile = getAgencyProfile()
  const services = profile.services.filter((s) => s.trim().length > 0)

  const prompt = `You are a B2B lead qualification expert. Analyze this website content and perform THREE tasks:

TASK 1 - URL QUALIFICATION:
Determine if this is a legitimate business website that could be a potential client.
REJECT if it's: a job board (Indeed, LinkedIn Jobs), social media platform, classified ads, dating site, or irrelevant content.
ACCEPT if it's: a real business website (even if it has a careers page).

TASK 2 - SERVICE MATCHING:
${services.length > 0 ? `Check if this business could benefit from these services:\n${services.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : 'No services defined - accept all leads.'}

Look for signs like:
- Outdated website (old copyright dates, old design)
- Missing features we could provide
- Poor quality in areas where we excel
- Explicit needs for our services

TASK 3 - DATA EXTRACTION:
Extract any email addresses and the name of the business owner/CEO/founder/decision maker.

Website URL: ${url}
Website Content:
${content.slice(0, 8000)}

Respond ONLY in this exact JSON format:
{
  "isValidLead": true/false,
  "qualificationReason": "Brief reason why this is/isn't a valid lead",
  "needsServices": true/false,
  "serviceMatchReason": "Brief reason why they need/don't need our services",
  "email": "found_email@example.com or null",
  "decisionMaker": "Person Name or null"
}`

  const defaultValue: CombinedAiAnalysisResult = {
    isValidLead: true,
    qualificationReason: 'AI not configured - accepting lead',
    needsServices: true,
    serviceMatchReason: 'AI not configured - accepting lead',
    email: null,
    decisionMaker: null
  }

  return executeWithAiRotation(
    prompt,
    (response: string) => {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          isValidLead: parsed.isValidLead !== false,
          qualificationReason: parsed.qualificationReason || 'AI analysis',
          needsServices: parsed.needsServices !== false,
          serviceMatchReason: parsed.serviceMatchReason || 'AI analysis',
          email: parsed.email === 'null' ? null : parsed.email || null,
          decisionMaker: parsed.decisionMaker === 'null' ? null : parsed.decisionMaker || null
        }
      }
      return defaultValue
    },
    defaultValue,
    {
      onModelSwitch: (from, to) => console.log(`[AI Analysis] Model switch: ${from} -> ${to}`),
      onKeySwitch: (idx, total) => console.log(`[AI Analysis] Key switch: ${idx}/${total}`)
    }
  )
}

// Export the main lead generation function
// NEW STREAMING FLOW: Search → Save ALL URLs → For each URL: Scrape → AI Analysis → Email Finding → Verification
export async function generateLeads(
  input: LeadGenerationInput,
  callbacks: LeadGenerationCallbacks
): Promise<void> {
  const leads: LeadResult[] = []

  // Reset key rotation state for new lead generation
  resetKeyRotation()

  // Reset AI rotation state for new lead generation
  resetAiRotationState()

  try {
    // Step 1: Web Search with Serper - get 10 organic results
    callbacks.onSearchStart(input.searchQuery)
    const searchResults = await searchWithSerper(input.searchQuery, input.page || 1)
    callbacks.onSearchComplete(searchResults)

    if (searchResults.length === 0) {
      callbacks.onError('No search results found')
      callbacks.onComplete(leads)
      return
    }

    // Get all URLs from search results
    const allUrls = searchResults.map((r) => r.link)

    // Notify UI that cleanup is complete (all URLs pass through now - AI will filter)
    callbacks.onCleanupComplete(allUrls)

    // Step 2-6: Process each URL one-by-one in STREAMING fashion
    // As soon as one URL completes scraping, it goes to AI analysis
    // As soon as AI passes, it goes to email finding, then verification
    for (const result of searchResults) {
      const url = result.link

      try {
        const domain = extractDomain(url)

        // Check if domain was already processed - SKIP to save credits
        const existingDomain = isDomainProcessed(domain)
        if (existingDomain) {
          console.log(`[Lead Gen] Skipping already processed domain: ${domain}`)
          // Domain already processed - skip to save credits
          continue
        }

        // Step 2: Scrape content with Jina
        callbacks.onScrapeStart(url)
        let scraped: ScrapedContent
        try {
          scraped = await scrapeWithJina(url)
          callbacks.onScrapeComplete(url, scraped)
        } catch (scrapeError) {
          const errorMsg = scrapeError instanceof Error ? scrapeError.message : 'Scrape failed'
          callbacks.onScrapeError(url, errorMsg)

          // Save as processed to avoid retrying
          const processedDomain: ProcessedDomain = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            domain,
            url,
            email: null,
            decisionMaker: null,
            verified: false,
            source: 'direct',
            processedAt: Date.now(),
            searchQuery: input.searchQuery
          }
          addProcessedDomain(processedDomain)
          continue
        }

        // Step 3: Combined AI Analysis - URL qualification + Service matching + Data extraction
        callbacks.onAiAnalysisStart(url)
        const aiResult = await combinedAiAnalysis(scraped.content, url)
        callbacks.onAiAnalysisResult(url, aiResult.email, aiResult.decisionMaker)

        // Send service match result to UI
        callbacks.onServiceMatchStart(url)
        callbacks.onServiceMatchResult(url, aiResult.needsServices, aiResult.serviceMatchReason)

        // Skip if URL is not a valid lead (job board, social media, etc.)
        if (!aiResult.isValidLead) {
          console.log(`[Lead Gen] Skipping invalid lead: ${url} - ${aiResult.qualificationReason}`)

          // Save as processed
          const processedDomain: ProcessedDomain = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            domain,
            url,
            email: null,
            decisionMaker: aiResult.decisionMaker,
            verified: false,
            source: 'direct',
            processedAt: Date.now(),
            searchQuery: input.searchQuery
          }
          addProcessedDomain(processedDomain)
          continue
        }

        // Skip if they don't need our services - SAVES Hunter.io and Reoon credits!
        if (!aiResult.needsServices) {
          console.log(`[Lead Gen] Skipping - doesn't need services: ${url}`)

          // Save as processed
          const processedDomain: ProcessedDomain = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            domain,
            url,
            email: null,
            decisionMaker: aiResult.decisionMaker,
            verified: false,
            source: 'direct',
            processedAt: Date.now(),
            searchQuery: input.searchQuery
          }
          addProcessedDomain(processedDomain)
          continue
        }

        let finalEmail: string | null = aiResult.email
        let emailSource: 'direct' | 'hunter_name' | 'hunter_domain' | 'snov_name' | 'snov_domain' =
          'direct'

        // Step 4: Email Finding - If no direct email found, try Hunter.io with Snov.io fallback
        if (!finalEmail) {
          let firstName: string | undefined
          let lastName: string | undefined

          if (aiResult.decisionMaker) {
            const nameParts = aiResult.decisionMaker.split(' ')
            if (nameParts.length >= 2) {
              firstName = nameParts[0]
              lastName = nameParts.slice(1).join(' ')
            }
          }

          // Use combined finder with fallback and key rotation
          callbacks.onHunterStart(url, firstName && lastName ? 'name' : 'domain')
          const result = await findEmailWithFallback(domain, firstName, lastName)
          finalEmail = result.email
          emailSource = result.source as typeof emailSource
          callbacks.onHunterResult(url, finalEmail)

          // Check if all API keys are exhausted (rate limited)
          if (result.allKeysExhausted) {
            callbacks.onError(
              'All email finder API keys have hit rate limits. Please wait until they reset or add new API keys in Settings → Email.'
            )
            callbacks.onComplete(leads)
            return
          }
        }

        // Step 5: Email Verification with Reoon (with key rotation) + Rapid Verifier fallback
        let verified = false
        if (finalEmail) {
          callbacks.onVerificationStart(finalEmail)
          const verifyResult = await verifyEmailWithReoon(finalEmail)
          verified = verifyResult.verified

          // If Reoon keys exhausted, fallback to free Rapid Email Verifier
          if (verifyResult.allKeysExhausted) {
            console.log(
              '[Email Verifier] All Reoon keys exhausted, falling back to Rapid Verifier...'
            )
            verified = await verifyEmailWithRapidVerifier(finalEmail)
          }

          callbacks.onVerificationResult(finalEmail, verified)
        }

        // Step 6: Add to leads if we have a verified email
        if (finalEmail && verified) {
          const lead: LeadResult = {
            url,
            email: finalEmail,
            decisionMaker: aiResult.decisionMaker,
            verified: true,
            source: emailSource,
            needsServices: aiResult.needsServices,
            serviceMatchReason: aiResult.serviceMatchReason
          }
          leads.push(lead)
          callbacks.onLeadFound(lead)

          // Save to persistent storage for future deduplication
          const foundLead: FoundLead = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            email: finalEmail,
            domain,
            url,
            decisionMaker: aiResult.decisionMaker,
            verified: true,
            source: emailSource,
            foundAt: Date.now(),
            searchQuery: input.searchQuery,
            niche: input.niche,
            location: input.location
          }
          addFoundLead(foundLead)
        }

        // Save processed domain to avoid re-processing (even if no email found)
        const processedDomain: ProcessedDomain = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          domain,
          url,
          email: finalEmail,
          decisionMaker: aiResult.decisionMaker,
          verified: finalEmail ? verified : false,
          source: emailSource,
          processedAt: Date.now(),
          searchQuery: input.searchQuery
        }
        addProcessedDomain(processedDomain)
      } catch (urlError) {
        const errorMsg = urlError instanceof Error ? urlError.message : 'Unknown error'
        callbacks.onScrapeError(url, errorMsg)
      }
    }

    callbacks.onComplete(leads)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    callbacks.onError(errorMsg)
    callbacks.onComplete(leads)
  }
}
