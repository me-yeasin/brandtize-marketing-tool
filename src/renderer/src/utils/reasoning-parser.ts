/**
 * Reasoning Parser
 *
 * A comprehensive parser for extracting "thinking" / "reasoning" content from LLM responses.
 * Supports multiple formats used by various AI providers:
 *
 * SUPPORTED FORMATS:
 *
 * 1. XML-LIKE TAGS (Most common for open models)
 *    - <think>...</think>         → DeepSeek R1, Qwen3, QwQ, Llama reasoning variants
 *    - <thinking>...</thinking>   → Alternative format used by some models
 *    - <reasoning>...</reasoning> → Some fine-tuned models
 *    - <analysis>...</analysis>   → Analysis-focused models
 *    - <reflection>...</reflection> → Reflection/self-critique models
 *    - <thought>...</thought>     → Alternative thought format
 *    - <scratchpad>...</scratchpad> → Scratchpad-style reasoning
 *    - <inner_thoughts>...</inner_thoughts> → Inner monologue style
 *
 * 2. DELIMITED SECTIONS (Text-based patterns)
 *    - ```thinking ... ```        → Markdown code block style
 *    - [Thinking] ... [/Thinking] → Bracket delimited
 *    - --- THINKING --- ... --- END THINKING --- → Horizontal rule delimited
 *
 * 3. HEADER-BASED PATTERNS (Less reliable, used as fallback)
 *    - "Thinking:" / "Thought:" / "Reasoning:" at start of line
 *    - "### Thinking" / "## Reasoning" markdown headers
 *    - "Let me think..." / "I need to reason..." patterns
 *
 * PROVIDER NOTES:
 * - OpenAI o1/o3: Reasoning tokens are NOT exposed in API (hidden by design)
 * - Anthropic Claude: Uses structured `thinking_blocks` in API response
 * - Google Gemini: Uses thought summaries in separate field
 * - xAI Grok: Reasoning in response with `reasoning_effort` param
 * - DeepSeek R1: <think>...</think> tags
 * - Qwen3/QwQ: <think>...</think> tags
 * - Mistral Magistral: Structured `content[].type: "thinking"`
 * - Meta Llama: No native reasoning, but fine-tunes may use tags
 * - Alibaba Qwen: <think>...</think> tags
 * - Microsoft Phi: No native reasoning format
 * - Nvidia Nemotron: No standard reasoning format
 * - Databricks DBRX: No standard reasoning format
 * - TII Falcon: No standard reasoning format
 * - AI2 OLMo: No standard reasoning format
 * - Stability AI: No standard reasoning format
 * - 01.AI Yi: May use <think> tags in reasoning variants
 */

export interface ParsedReasoning {
  thinking: string
  content: string
  hasThinking: boolean
  format: ReasoningFormat | null
}

export type ReasoningFormat =
  | 'think-tags'
  | 'thinking-tags'
  | 'reasoning-tags'
  | 'analysis-tags'
  | 'reflection-tags'
  | 'thought-tags'
  | 'scratchpad-tags'
  | 'inner-thoughts-tags'
  | 'markdown-block'
  | 'bracket-delimited'
  | 'hr-delimited'
  | 'header-based'

/**
 * All supported XML-like tag patterns for reasoning extraction
 * Order matters: more specific/common patterns first
 */
const TAG_PATTERNS: Array<{ name: ReasoningFormat; open: string; close: string }> = [
  { name: 'think-tags', open: '<think>', close: '</think>' },
  { name: 'thinking-tags', open: '<thinking>', close: '</thinking>' },
  { name: 'reasoning-tags', open: '<reasoning>', close: '</reasoning>' },
  { name: 'analysis-tags', open: '<analysis>', close: '</analysis>' },
  { name: 'reflection-tags', open: '<reflection>', close: '</reflection>' },
  { name: 'thought-tags', open: '<thought>', close: '</thought>' },
  { name: 'scratchpad-tags', open: '<scratchpad>', close: '</scratchpad>' },
  { name: 'inner-thoughts-tags', open: '<inner_thoughts>', close: '</inner_thoughts>' }
]

/**
 * Regex patterns for various reasoning formats
 */
const PATTERNS = {
  // Markdown code block: ```thinking ... ```
  markdownBlock: /```thinking\s*\n([\s\S]*?)```/gi,

  // Bracket delimited: [Thinking] ... [/Thinking]
  bracketDelimited: /\[Thinking\]\s*([\s\S]*?)\[\/Thinking\]/gi,

  // Horizontal rule delimited: --- THINKING --- ... --- END THINKING ---
  hrDelimited: /---\s*THINKING\s*---\s*([\s\S]*?)---\s*END\s*THINKING\s*---/gi,

  // Header-based patterns (markdown headers)
  headerThinking:
    /^#{1,3}\s*(?:Thinking|Reasoning|Thought|Analysis)[:.]?\s*\n([\s\S]*?)(?=^#{1,3}\s|\n\n---|\n\n\*\*|$)/gim,

  // Colon-prefixed sections
  colonPrefixed:
    /^(?:Thinking|Reasoning|Thought|Analysis|Internal Reasoning):\s*\n?([\s\S]*?)(?=\n\n(?:Answer|Response|Output|Final|Result|Conclusion):|$)/gim
}

/**
 * Parse reasoning content from a complete text response.
 * This is the main function to use for non-streaming scenarios.
 */
export function parseReasoning(text: string): ParsedReasoning {
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

/**
 * Streaming-safe reasoning parser state machine.
 * Use this for real-time token-by-token parsing during streaming.
 */
export class StreamingReasoningParser {
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

/**
 * Check if a model ID is likely a reasoning model that outputs thinking.
 * This is a heuristic based on known model naming patterns.
 */
export function isLikelyReasoningModel(modelId: string): boolean {
  const id = modelId.toLowerCase()

  const reasoningPatterns = [
    // DeepSeek reasoning models
    'deepseek-r1',
    'deepseek-reasoner',
    // Qwen reasoning models
    'qwen3',
    'qwq',
    'qwen-reasoning',
    // OpenAI reasoning (though tokens are hidden)
    'o1',
    'o3',
    'o1-preview',
    'o1-mini',
    'o3-mini',
    // Anthropic with extended thinking
    'claude-3-7',
    'claude-4',
    // xAI Grok with reasoning
    'grok-3',
    'grok-4',
    // Mistral reasoning
    'magistral',
    // Google reasoning
    'gemini-2',
    'gemini-thinking',
    // Generic patterns
    'reasoning',
    'thinking',
    '-r1',
    '-cot'
  ]

  return reasoningPatterns.some((pattern) => id.includes(pattern))
}

/**
 * Get a human-readable description of the detected reasoning format.
 */
export function getFormatDescription(format: ReasoningFormat | null): string {
  const descriptions: Record<ReasoningFormat, string> = {
    'think-tags': '<think> tags (DeepSeek, Qwen)',
    'thinking-tags': '<thinking> tags',
    'reasoning-tags': '<reasoning> tags',
    'analysis-tags': '<analysis> tags',
    'reflection-tags': '<reflection> tags',
    'thought-tags': '<thought> tags',
    'scratchpad-tags': '<scratchpad> tags',
    'inner-thoughts-tags': '<inner_thoughts> tags',
    'markdown-block': 'Markdown code block',
    'bracket-delimited': '[Thinking] brackets',
    'hr-delimited': 'Horizontal rule delimited',
    'header-based': 'Header-based sections'
  }

  return format ? descriptions[format] : 'No reasoning detected'
}
