import type { ParsedReasoning } from './types'

/**
 * Extract reasoning content using XML-like opening and closing tags.
 */
function extractByTags(
  text: string,
  openTag: string,
  closeTag: string
): Omit<ParsedReasoning, 'format'> {
  const openLower = openTag.toLowerCase()
  const closeLower = closeTag.toLowerCase()
  const textLower = text.toLowerCase()

  const openIndex = textLower.indexOf(openLower)
  if (openIndex === -1) {
    return { thinking: '', content: text, hasThinking: false }
  }

  const closeIndex = textLower.indexOf(closeLower, openIndex + openTag.length)
  if (closeIndex === -1) {
    // Tag opened but not closed - might be streaming, extract what we have
    const thinking = text.slice(openIndex + openTag.length).trim()
    const content = text.slice(0, openIndex).trim()
    return { thinking, content, hasThinking: thinking.length > 0 }
  }

  // Extract thinking content between tags
  const thinking = text.slice(openIndex + openTag.length, closeIndex).trim()
  // Content is everything before the open tag + everything after close tag
  const beforeThinking = text.slice(0, openIndex).trim()
  const afterThinking = text.slice(closeIndex + closeTag.length).trim()
  const content = [beforeThinking, afterThinking].filter(Boolean).join('\n\n').trim()

  return { thinking, content, hasThinking: thinking.length > 0 }
}

/**
 * Extract reasoning content using a regex pattern.
 */
function extractByRegex(text: string, pattern: RegExp): Omit<ParsedReasoning, 'format'> {
  // Reset regex state
  pattern.lastIndex = 0

  const allThinking: string[] = []
  let content = text

  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match[1]) {
      allThinking.push(match[1].trim())
      content = content.replace(match[0], '')
    }
  }

  const thinking = allThinking.join('\n\n').trim()
  content = content.trim()

  return { thinking, content, hasThinking: thinking.length > 0 }
}

export { extractByRegex, extractByTags }
