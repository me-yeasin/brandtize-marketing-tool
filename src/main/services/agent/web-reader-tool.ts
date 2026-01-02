import { scrapeWithJina } from '../lead-generation'
import { sleep } from '../retry-utils'

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message === 'Aborted'
  }
  return false
}

/**
 * Web Reader Tool - Uses Jina Reader API to extract content from web pages
 * Used by the agent to read detailed information from search results
 */
export async function webReaderTool(url: string, signal?: AbortSignal): Promise<string> {
  try {
    console.log(`[WebReaderTool] Reading: ${url}`)
    const scraped = await scrapeWithJina(url, signal)
    console.log(`[WebReaderTool] Extracted ${scraped.content.length} characters`)
    return scraped.content
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error
    }
    console.error('[WebReaderTool] Read failed:', error)
    return ''
  }
}

/**
 * Read and summarize content from multiple URLs
 */
export async function readMultipleUrls(
  urls: string[],
  signal?: AbortSignal
): Promise<{ url: string; content: string }[]> {
  const results: { url: string; content: string }[] = []

  for (const url of urls.slice(0, 3)) {
    // Limit to 3 URLs to avoid rate limits
    const content = await webReaderTool(url, signal)
    if (content) {
      results.push({ url, content })
    }
    // Small delay between requests
    await sleep(500, signal)
  }

  return results
}
