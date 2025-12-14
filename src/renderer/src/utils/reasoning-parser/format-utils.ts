import type { ReasoningFormat } from './types'

/**
 * Get a human-readable description of the detected reasoning format.
 */
function getFormatDescription(format: ReasoningFormat | null): string {
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

export { getFormatDescription }
