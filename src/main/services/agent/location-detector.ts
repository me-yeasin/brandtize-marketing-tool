import { ChatMessage, streamChatResponse } from '../ai-service'

// Common countries list for quick detection
const KNOWN_COUNTRIES = new Set([
  'united states',
  'usa',
  'united kingdom',
  'uk',
  'canada',
  'australia',
  'germany',
  'france',
  'italy',
  'spain',
  'netherlands',
  'belgium',
  'sweden',
  'norway',
  'denmark',
  'finland',
  'poland',
  'austria',
  'switzerland',
  'portugal',
  'ireland',
  'japan',
  'china',
  'india',
  'brazil',
  'mexico',
  'argentina',
  'south africa',
  'nigeria',
  'egypt',
  'saudi arabia',
  'uae',
  'united arab emirates',
  'singapore',
  'malaysia',
  'indonesia',
  'philippines',
  'thailand',
  'vietnam',
  'south korea',
  'korea',
  'new zealand',
  'russia',
  'ukraine',
  'turkey',
  'greece',
  'czech republic',
  'hungary',
  'romania',
  'bangladesh',
  'pakistan',
  'sri lanka'
])

// Common city patterns that indicate it's likely a city
const CITY_INDICATORS = ['city', 'town', 'ville', 'burg', 'borough']

/**
 * Quick heuristic check if location is likely a country
 */
function quickCountryCheck(location: string): boolean {
  const normalized = location.toLowerCase().trim()
  return KNOWN_COUNTRIES.has(normalized)
}

/**
 * Quick heuristic check if location is likely a city
 */
function quickCityCheck(location: string): boolean {
  const normalized = location.toLowerCase()
  return CITY_INDICATORS.some((indicator) => normalized.includes(indicator))
}

/**
 * Use AI to classify ambiguous locations
 */
async function aiClassifyLocation(location: string): Promise<'city' | 'country'> {
  const prompt = `Classify this location as either "city" or "country". Only respond with one word: city or country.

Location: "${location}"

Answer:`

  return new Promise((resolve) => {
    let response = ''

    streamChatResponse([{ id: 'user', role: 'user', text: prompt }] as ChatMessage[], {
      onToken: (token) => {
        response += token
      },
      onComplete: () => {
        const normalized = response.toLowerCase().trim()
        if (normalized.includes('country')) {
          resolve('country')
        } else {
          resolve('city')
        }
      },
      onError: () => {
        // Default to city on error (safer - doesn't trigger extra research)
        resolve('city')
      }
    })
  })
}

export type LocationType = 'city' | 'country'

export interface ClassifiedLocation {
  original: string
  type: LocationType
}

/**
 * Detect if a location is a city or country
 * Uses heuristics first, then AI for ambiguous cases
 */
export async function detectLocationType(location: string): Promise<LocationType> {
  // 1. Quick country check
  if (quickCountryCheck(location)) {
    console.log(`[LocationDetector] "${location}" → country (known list)`)
    return 'country'
  }

  // 2. Quick city indicator check
  if (quickCityCheck(location)) {
    console.log(`[LocationDetector] "${location}" → city (indicator match)`)
    return 'city'
  }

  // 3. Use AI for ambiguous cases
  console.log(`[LocationDetector] "${location}" → using AI classification...`)
  const result = await aiClassifyLocation(location)
  console.log(`[LocationDetector] "${location}" → ${result} (AI)`)
  return result
}

/**
 * Classify multiple locations
 */
export async function classifyLocations(locations: string[]): Promise<ClassifiedLocation[]> {
  const results: ClassifiedLocation[] = []

  for (const location of locations) {
    const type = await detectLocationType(location)
    results.push({ original: location, type })
  }

  return results
}
