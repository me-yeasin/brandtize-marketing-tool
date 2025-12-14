import type { ReasoningFormat } from './types'

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

export { PATTERNS, TAG_PATTERNS }
