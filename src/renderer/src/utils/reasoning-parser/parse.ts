import type { ParsedReasoning } from './types'
import { PATTERNS, TAG_PATTERNS } from './patterns'
import { extractByRegex, extractByTags } from './extractors'

/**
 * Parse reasoning content from a complete text response.
 * This is the main function to use for non-streaming scenarios.
 */
function parseReasoning(text: string): ParsedReasoning {
  if (!text || typeof text !== 'string') {
    return { thinking: '', content: text || '', hasThinking: false, format: null }
  }

  // Try XML-like tags first (most reliable)
  for (const pattern of TAG_PATTERNS) {
    const result = extractByTags(text, pattern.open, pattern.close)
    if (result.hasThinking) {
      return { ...result, format: pattern.name }
    }
  }

  // Try markdown code block
  const markdownResult = extractByRegex(text, PATTERNS.markdownBlock)
  if (markdownResult.hasThinking) {
    return { ...markdownResult, format: 'markdown-block' }
  }

  // Try bracket delimited
  const bracketResult = extractByRegex(text, PATTERNS.bracketDelimited)
  if (bracketResult.hasThinking) {
    return { ...bracketResult, format: 'bracket-delimited' }
  }

  // Try HR delimited
  const hrResult = extractByRegex(text, PATTERNS.hrDelimited)
  if (hrResult.hasThinking) {
    return { ...hrResult, format: 'hr-delimited' }
  }

  // Try header-based (less reliable, only if substantial thinking found)
  const headerResult = extractByRegex(text, PATTERNS.headerThinking)
  if (headerResult.hasThinking && headerResult.thinking.length > 50) {
    return { ...headerResult, format: 'header-based' }
  }

  // Try colon-prefixed
  const colonResult = extractByRegex(text, PATTERNS.colonPrefixed)
  if (colonResult.hasThinking && colonResult.thinking.length > 50) {
    return { ...colonResult, format: 'header-based' }
  }

  // No reasoning found
  return { thinking: '', content: text, hasThinking: false, format: null }
}

export { parseReasoning }
