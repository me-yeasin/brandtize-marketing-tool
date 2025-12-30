import { SearchResult, searchWithSerper } from '../lead-generation'

/**
 * Web Search Tool - Uses Serper API to search the web for market research queries
 * Used by the agent to research best cities in a country for a given niche
 */
export async function webSearchTool(query: string): Promise<SearchResult[]> {
  try {
    console.log(`[WebSearchTool] Searching: "${query}"`)
    const results = await searchWithSerper(query)
    console.log(`[WebSearchTool] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error('[WebSearchTool] Search failed:', error)
    return []
  }
}

/**
 * Search for best cities in a country for a given business niche
 * Takes into account filters like "businesses without websites"
 */
export async function searchBestCitiesForNiche(
  country: string,
  niche: string,
  services?: string,
  filterNoWebsite?: boolean
): Promise<SearchResult[]> {
  let query = `best cities in ${country} for ${niche} businesses`

  if (services) {
    query += ` that need ${services}`
  }

  if (filterNoWebsite) {
    query += ` with low online presence no website`
  }

  return webSearchTool(query)
}

/**
 * Search for market competition analysis in a specific area
 */
export async function searchCompetitionAnalysis(
  country: string,
  niche: string
): Promise<SearchResult[]> {
  const query = `${niche} market competition ${country} underserved areas low competition cities`
  return webSearchTool(query)
}
