import { ChatMessage, streamChatResponse } from '../ai-service'

/**
 * Discover nearby or similar cities using AI
 * Used when current searches are exhausted but goal not met
 */
export async function discoverNearbyCities(
  currentCity: string,
  country: string,
  excludeCities: string[]
): Promise<string[]> {
  console.log(`[NearbyCities] Discovering cities near ${currentCity}, ${country}...`)

  const excludeList = excludeCities.join(', ')

  const prompt = `I need to find businesses in cities near "${currentCity}" in ${country}.

Please list 5-7 nearby cities or towns that:
1. Are within reasonable proximity to ${currentCity}
2. Have significant business activity
3. Are NOT in this list: ${excludeList}

Output ONLY city names, one per line. No explanations or numbering.`

  return new Promise((resolve) => {
    let response = ''

    streamChatResponse([{ id: 'user', role: 'user', text: prompt }] as ChatMessage[], {
      onToken: (token) => {
        response += token
      },
      onComplete: () => {
        const cities = response
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && line.length < 50)
          .filter((line) => !line.match(/^\d+\.?\s*/))
          .map((line) => line.replace(/^[-•*]\s*/, ''))
          .filter((city) => !excludeCities.some((exc) => exc.toLowerCase() === city.toLowerCase()))
          .slice(0, 7)

        console.log(`[NearbyCities] Discovered: ${cities.join(', ')}`)
        resolve(cities)
      },
      onError: () => {
        console.log('[NearbyCities] AI failed, returning empty list')
        resolve([])
      }
    })
  })
}

/**
 * Generate query variations for a niche
 * Used when standard queries are exhausted
 */
export async function generateQueryVariations(
  niche: string,
  usedQueries: string[]
): Promise<string[]> {
  console.log(`[QueryVariation] Generating alternatives for "${niche}"...`)

  const usedList = usedQueries.join(', ')

  const prompt = `For the business category "${niche}", generate 5 alternative search terms that could find similar businesses.

Include:
- Synonyms
- Related niches
- More specific terms
- Industry variations

Already used: ${usedList}

Output ONLY search terms, one per line. No explanations.`

  return new Promise((resolve) => {
    let response = ''

    streamChatResponse([{ id: 'user', role: 'user', text: prompt }] as ChatMessage[], {
      onToken: (token) => {
        response += token
      },
      onComplete: () => {
        const queries = response
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && line.length < 50)
          .filter((line) => !line.match(/^\d+\.?\s*/))
          .map((line) => line.replace(/^[-•*]\s*/, ''))
          .filter(
            (query) => !usedQueries.some((used) => used.toLowerCase() === query.toLowerCase())
          )
          .slice(0, 5)

        console.log(`[QueryVariation] Generated: ${queries.join(', ')}`)
        resolve(queries)
      },
      onError: () => {
        resolve([])
      }
    })
  })
}

/**
 * Get fallback major cities for a country when other methods fail
 */
export function getFallbackCities(country: string): string[] {
  const majorCities: Record<string, string[]> = {
    'united states': ['Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle', 'Denver', 'Boston'],
    usa: ['Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle', 'Denver', 'Boston'],
    'united kingdom': ['Birmingham', 'Liverpool', 'Bristol', 'Newcastle', 'Sheffield', 'Edinburgh'],
    uk: ['Birmingham', 'Liverpool', 'Bristol', 'Newcastle', 'Sheffield', 'Edinburgh'],
    germany: ['Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Dresden'],
    france: ['Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Strasbourg'],
    canada: ['Calgary', 'Edmonton', 'Winnipeg', 'Halifax', 'Victoria', 'Hamilton'],
    australia: ['Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Hobart'],
    india: ['Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kochi', 'Chandigarh'],
    bangladesh: ['Comilla', 'Gazipur', 'Narayanganj', 'Bogra', 'Mymensingh', "Cox's Bazar"]
  }

  const normalized = country.toLowerCase().trim()
  return majorCities[normalized] || []
}
