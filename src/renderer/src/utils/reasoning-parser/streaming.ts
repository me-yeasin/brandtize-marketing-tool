import type { ParsedReasoning, ReasoningFormat } from './types'
import { TAG_PATTERNS } from './patterns'

/**
 * Streaming-safe reasoning parser state machine.
 * Use this for real-time token-by-token parsing during streaming.
 */
class StreamingReasoningParser {
  private buffer: string = ''
  private thinkingBuffer: string = ''
  private contentBuffer: string = ''
  private state: 'scanning' | 'in-thinking' | 'after-thinking' = 'scanning'
  private detectedFormat: ReasoningFormat | null = null
  private currentOpenTag: string = ''
  private currentCloseTag: string = ''

  /**
   * Process a new token and return the current parsed state.
   */
  processToken(token: string): {
    thinking: string
    content: string
    isInThinking: boolean
    format: ReasoningFormat | null
  } {
    this.buffer += token

    // If we haven't detected a format yet, try to detect one
    if (this.state === 'scanning') {
      this.tryDetectFormat()
    }

    // Process based on current state
    if (this.state === 'in-thinking') {
      this.processInThinking()
    } else if (this.state === 'after-thinking') {
      // Everything after thinking goes to content
      this.contentBuffer = this.buffer.slice(
        this.buffer.toLowerCase().indexOf(this.currentCloseTag.toLowerCase()) +
          this.currentCloseTag.length
      )
    } else {
      // Still scanning or no thinking detected
      this.contentBuffer = this.buffer
    }

    return {
      thinking: this.thinkingBuffer.trim(),
      content: this.contentBuffer.trim(),
      isInThinking: this.state === 'in-thinking',
      format: this.detectedFormat
    }
  }

  /**
   * Try to detect which reasoning format is being used.
   */
  private tryDetectFormat(): void {
    const bufferLower = this.buffer.toLowerCase()

    // Check for XML-like tags
    for (const pattern of TAG_PATTERNS) {
      if (bufferLower.includes(pattern.open.toLowerCase())) {
        this.detectedFormat = pattern.name
        this.currentOpenTag = pattern.open
        this.currentCloseTag = pattern.close
        this.state = 'in-thinking'

        // Extract content before the tag
        const openIndex = bufferLower.indexOf(pattern.open.toLowerCase())
        this.contentBuffer = this.buffer.slice(0, openIndex).trim()

        return
      }
    }

    // Check for markdown block
    if (bufferLower.includes('```thinking')) {
      this.detectedFormat = 'markdown-block'
      this.currentOpenTag = '```thinking'
      this.currentCloseTag = '```'
      this.state = 'in-thinking'
      return
    }

    // Check for bracket delimited
    if (bufferLower.includes('[thinking]')) {
      this.detectedFormat = 'bracket-delimited'
      this.currentOpenTag = '[Thinking]'
      this.currentCloseTag = '[/Thinking]'
      this.state = 'in-thinking'
      return
    }
  }

  /**
   * Process buffer when we're inside a thinking block.
   */
  private processInThinking(): void {
    const bufferLower = this.buffer.toLowerCase()
    const openIndex = bufferLower.indexOf(this.currentOpenTag.toLowerCase())

    if (openIndex === -1) return

    const closeIndex = bufferLower.indexOf(
      this.currentCloseTag.toLowerCase(),
      openIndex + this.currentOpenTag.length
    )

    if (closeIndex !== -1) {
      // Found closing tag - extract complete thinking
      this.thinkingBuffer = this.buffer
        .slice(openIndex + this.currentOpenTag.length, closeIndex)
        .trim()
      this.contentBuffer = this.buffer.slice(closeIndex + this.currentCloseTag.length).trim()
      this.state = 'after-thinking'
    } else {
      // Still in thinking - extract partial thinking
      this.thinkingBuffer = this.buffer.slice(openIndex + this.currentOpenTag.length).trim()
    }
  }

  /**
   * Get the final parsed result.
   */
  getResult(): ParsedReasoning {
    return {
      thinking: this.thinkingBuffer.trim(),
      content: this.contentBuffer.trim(),
      hasThinking: this.thinkingBuffer.trim().length > 0,
      format: this.detectedFormat
    }
  }

  /**
   * Reset the parser state for a new response.
   */
  reset(): void {
    this.buffer = ''
    this.thinkingBuffer = ''
    this.contentBuffer = ''
    this.state = 'scanning'
    this.detectedFormat = null
    this.currentOpenTag = ''
    this.currentCloseTag = ''
  }
}

export { StreamingReasoningParser }
