import { scrapeWithJina } from '../lead-generation'

/**
 * Web Reader Tool - Uses Jina Reader API to extract content from web pages
 * Used by the agent to read detailed information from search results
 */
export async function webReaderTool(url: string): Promise<string> {
  try {
    console.log(`[WebReaderTool] Reading: ${url}`)
    const scraped = await scrapeWithJina(url)
    console.log(`[WebReaderTool] Extracted ${scraped.content.length} characters`)
    return scraped.content
  } catch (error) {
    console.error('[WebReaderTool] Read failed:', error)
    return ''
  }
}

/**
 * Read and summarize content from multiple URLs
 */
export async function readMultipleUrls(
  urls: string[]
): Promise<{ url: string; content: string }[]> {
  const results: { url: string; content: string }[] = []

  for (const url of urls.slice(0, 3)) {
    // Limit to 3 URLs to avoid rate limits
    const content = await webReaderTool(url)
    if (content) {
      results.push({ url, content })
    }
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return results
}
