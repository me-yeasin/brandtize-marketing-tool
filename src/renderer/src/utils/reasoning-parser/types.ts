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
