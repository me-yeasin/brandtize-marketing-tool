import { ChatMessage, streamChatResponse } from '../ai-service'
import { AgentPreferences } from './types'
import { webReaderTool } from './web-reader-tool'
import { searchBestCitiesForNiche, searchCompetitionAnalysis } from './web-search-tool'

/**
 * Research and extract best cities from a country for the given niche
 * Uses web search + AI to analyze and return city names
 */
export async function researchBestCities(
  country: string,
  preferences: AgentPreferences
): Promise<string[]> {
  const { niche, services, filters } = preferences
  const filterNoWebsite = filters.hasWebsite // When true, we want businesses WITHOUT websites

  console.log(`[CityResearch] Researching best cities in ${country} for "${niche}"...`)

  // 1. Search for best cities
  const searchResults = await searchBestCitiesForNiche(country, niche, services, filterNoWebsite)

  if (searchResults.length === 0) {
    console.log(`[CityResearch] No search results, falling back to competition analysis`)
    const competitionResults = await searchCompetitionAnalysis(country, niche)
    if (competitionResults.length === 0) {
      console.log(`[CityResearch] No results found, using default major cities`)
      return getDefaultCitiesForCountry(country)
    }
  }

  // 2. Read top 2 results for more context
  const topUrls = searchResults.slice(0, 2).map((r) => r.link)
  let additionalContext = ''

  for (const url of topUrls) {
    try {
      const content = await webReaderTool(url)
      if (content) {
        additionalContext += content.slice(0, 3000) + '\n\n'
      }
    } catch {
      // Ignore read errors
    }
  }

  // 3. Use AI to extract city names
  const cities = await extractCitiesWithAI(
    country,
    niche,
    services || '',
    filterNoWebsite,
    searchResults.map((r) => r.snippet).join('\n'),
    additionalContext
  )

  console.log(`[CityResearch] Discovered ${cities.length} cities: ${cities.join(', ')}`)
  return cities
}

/**
 * Use AI to extract city names from research data
 */
async function extractCitiesWithAI(
  country: string,
  niche: string,
  services: string,
  filterNoWebsite: boolean,
  snippets: string,
  detailedContent: string
): Promise<string[]> {
  const filterContext = filterNoWebsite
    ? 'Focus on cities where many businesses lack online presence or websites.'
    : ''

  const prompt = `Based on the following research about ${niche} businesses in ${country}, extract 5-7 specific city names that would be the best targets for lead generation.

${services ? `Our services: ${services}` : ''}
${filterContext}

Search snippets:
${snippets}

${detailedContent ? `Additional research:\n${detailedContent.slice(0, 2000)}` : ''}

Instructions:
- Return ONLY city names, one per line
- No explanations or numbering
- Focus on cities with good business opportunities
- Prioritize underserved markets if possible

Cities:`

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
          .filter((line) => line.length > 0 && line.length < 50) // Filter out non-city lines
          .filter((line) => !line.match(/^\d+\.?\s*/)) // Remove numbered lines
          .map((line) => line.replace(/^[-•*]\s*/, '')) // Remove bullet points
          .slice(0, 7) // Max 7 cities

        if (cities.length === 0) {
          resolve(getDefaultCitiesForCountry(country))
        } else {
          resolve(cities)
        }
      },
      onError: () => {
        resolve(getDefaultCitiesForCountry(country))
      }
    })
  })
}

/**
 * Fallback: return default major cities for common countries
 */
function getDefaultCitiesForCountry(country: string): string[] {
  const defaults: Record<string, string[]> = {
    'united kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
    uk: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
    'united states': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    usa: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    germany: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
    france: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
    canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
    australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
    india: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'],
    bangladesh: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet']
  }

  const normalized = country.toLowerCase().trim()
  return defaults[normalized] || [`Capital of ${country}`, `Major city in ${country}`]
}
