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

export type { ParsedReasoning, ReasoningFormat } from './reasoning-parser/index'

export {
  getFormatDescription,
  isLikelyReasoningModel,
  parseReasoning,
  StreamingReasoningParser
} from './reasoning-parser/index'
