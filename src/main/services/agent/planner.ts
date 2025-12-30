import { ChatMessage, streamChatResponse } from '../ai-service'
import { researchBestCities } from './city-research'
import { classifyLocations } from './location-detector'
import { AgentPreferences, SearchTask } from './types'

// Callback type for progress updates
export interface PlannerCallbacks {
  onLocationClassified?: (location: string, type: 'city' | 'country') => void
  onResearchingCountry?: (country: string) => void
  onCitiesDiscovered?: (country: string, cities: string[]) => void
}

const PLANNER_SYSTEM_PROMPT = `
You are an expert Lead Generation Strategist.
Your goal is to create search tasks for the given locations and business niche.

Output your plan strictly as a JSON array of objects.
Each object must represent a search task and follow this structure:
{
  "query": "string (the exact search term to use)",
  "location": "string (the specific city for this search)",
  "source": "google_maps" | "facebook"
}

Guidance:
1. Create one Google Maps task and one Facebook task per location.
2. Keep queries simple: just the niche name works best.
3. Do not include any explanation or markdown formatting. Just the raw JSON array.
`

async function generateText(messages: ChatMessage[]): Promise<string> {
  return new Promise((resolve, reject) => {
    streamChatResponse(messages, {
      onToken: () => {},
      onComplete: (text) => {
        resolve(text)
      },
      onError: (error) => {
        reject(new Error(error))
      }
    })
  })
}

/**
 * Main planning function with smart location handling
 * - Cities: Creates direct search tasks
 * - Countries: Researches best cities first, then creates tasks
 */
export async function planSearchStrategy(
  preferences: AgentPreferences,
  callbacks?: PlannerCallbacks
): Promise<SearchTask[]> {
  const { niche, locations } = preferences

  if (!niche || locations.length === 0) {
    return []
  }

  // 1. Classify all locations as city or country
  console.log('[Planner] Classifying locations...')
  const classifiedLocations = await classifyLocations(locations)

  // Report classifications
  for (const loc of classifiedLocations) {
    callbacks?.onLocationClassified?.(loc.original, loc.type)
  }

  // 2. Process locations and expand countries into cities
  const expandedCities: { city: string; fromCountry?: string }[] = []

  for (const loc of classifiedLocations) {
    if (loc.type === 'city') {
      // Direct city - add as-is
      expandedCities.push({ city: loc.original })
    } else {
      // Country - research best cities
      callbacks?.onResearchingCountry?.(loc.original)
      console.log(`[Planner] Researching cities in ${loc.original}...`)

      const discoveredCities = await researchBestCities(loc.original, preferences)
      callbacks?.onCitiesDiscovered?.(loc.original, discoveredCities)

      for (const city of discoveredCities) {
        expandedCities.push({ city, fromCountry: loc.original })
      }
    }
  }

  console.log(`[Planner] Expanded to ${expandedCities.length} cities`)

  // 3. Create search tasks for all cities
  const allCityNames = expandedCities.map((c) => c.city)

  const userMessage = `
    Niche: ${niche}
    Target Cities: ${allCityNames.join(', ')}
    
    Create search tasks for each city (Google Maps + Facebook).
  `

  const messages: ChatMessage[] = [
    { id: 'user-1', role: 'user', text: `${PLANNER_SYSTEM_PROMPT}\n\n${userMessage}` }
  ]

  try {
    const responseText = await generateText(messages)

    // Clean up potential markdown code blocks
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const rawTasks = JSON.parse(cleanJson) as Omit<SearchTask, 'id' | 'status'>[]

    // Hydrate with IDs, status, and metadata
    return rawTasks.map((t) => {
      const cityInfo = expandedCities.find((c) => c.city.toLowerCase() === t.location.toLowerCase())

      return {
        ...t,
        id: crypto.randomUUID(),
        status: 'pending' as const,
        discoveredFromCountry: cityInfo?.fromCountry
      }
    })
  } catch (error) {
    console.error('Error generating search plan:', error)
    // Fallback: simple 1-to-1 mapping if AI fails
    const fallbackTasks: SearchTask[] = []

    for (const cityInfo of expandedCities) {
      // Google Maps task
      fallbackTasks.push({
        id: crypto.randomUUID(),
        query: niche,
        location: cityInfo.city,
        source: 'google_maps',
        status: 'pending',
        discoveredFromCountry: cityInfo.fromCountry
      })

      // Facebook task
      fallbackTasks.push({
        id: crypto.randomUUID(),
        query: niche,
        location: cityInfo.city,
        source: 'facebook',
        status: 'pending',
        discoveredFromCountry: cityInfo.fromCountry
      })
    }

    return fallbackTasks
  }
}

/**
 * Research additional cities from a country to expand search
 * Used when goal is not met and we need more leads
 */
export async function expandSearchForCountry(
  country: string,
  preferences: AgentPreferences,
  alreadySearchedCities: string[]
): Promise<SearchTask[]> {
  console.log(`[Planner] Expanding search for ${country}...`)

  const allCities = await researchBestCities(country, preferences)
  const newCities = allCities.filter(
    (city) =>
      !alreadySearchedCities.some((searched) => searched.toLowerCase() === city.toLowerCase())
  )

  if (newCities.length === 0) {
    console.log(`[Planner] No new cities found in ${country}`)
    return []
  }

  console.log(`[Planner] Found ${newCities.length} new cities: ${newCities.join(', ')}`)

  const tasks: SearchTask[] = []
  for (const city of newCities.slice(0, 3)) {
    // Limit expansion to 3 new cities
    tasks.push({
      id: crypto.randomUUID(),
      query: preferences.niche,
      location: city,
      source: 'google_maps',
      status: 'pending',
      discoveredFromCountry: country
    })
  }

  return tasks
}
