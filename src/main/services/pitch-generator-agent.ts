/**
 * WhatsApp Pitch Generator Agent
 *
 * A LangGraph-based ReAct agent that analyzes business leads and generates
 * personalized WhatsApp pitches with self-reflection and refinement capabilities.
 *
 * Architecture:
 * 1. Analyze Business Node - Understands the lead's business
 * 2. Generate Pitch Node - Creates initial personalized pitch
 * 3. Observe Node - Evaluates pitch quality
 * 4. Refine Node - Improves pitch if needed (max 3 iterations)
 */

import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { BrowserWindow } from 'electron'
import { executeWithAiRotation } from './ai-rotation-manager'
import { type StoredEmailPitch } from '../store'

// ============================================
// TYPES
// ============================================

export interface PitchGenerationInput {
  leadId: string
  name: string
  category: string
  address: string
  rating: number
  reviewCount: number
  website?: string | null
  reviews?: Array<{ text: string; rating: number; author: string }>
  instruction?: string
  buyerPersona?: string
  examples?: string[]
  productLinks?: string[]
  language?: 'en' | 'bn' // Language for pitch generation (English or Bangla)
}

export interface PitchGenerationStatus {
  status: 'analyzing' | 'generating' | 'observing' | 'refining' | 'done' | 'error'
  message: string
  currentPitch?: string
  refinementCount?: number
}

export interface PitchGenerationResult {
  success: boolean
  pitch?: string
  error?: string
}

export interface EmailPitchGenerationInput {
  leadId: string
  name: string
  category: string
  address: string
  rating: number
  reviewCount: number
  website?: string | null
  reviews?: Array<{ text: string; rating: number; author: string }>
  instruction?: string
  buyerPersona?: string
  examples?: string[]
  productLinks?: string[]
  language?: 'en' | 'bn'
}

export interface EmailPitchGenerationResult {
  success: boolean
  pitch?: StoredEmailPitch
  error?: string
}

// ============================================
// AGENT STATE
// ============================================

const PitchAgentState = Annotation.Root({
  // Input
  lead: Annotation<PitchGenerationInput>,

  // Processing state
  analysis: Annotation<string>({
    reducer: (_, y) => y,
    default: () => ''
  }),
  currentPitch: Annotation<string>({
    reducer: (_, y) => y,
    default: () => ''
  }),
  observation: Annotation<string>({
    reducer: (_, y) => y,
    default: () => ''
  }),
  needsRefinement: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false
  }),
  refinementCount: Annotation<number>({
    reducer: (_, y) => y,
    default: () => 0
  }),

  // Output
  finalPitch: Annotation<string>({
    reducer: (_, y) => y,
    default: () => ''
  }),
  status: Annotation<PitchGenerationStatus['status']>({
    reducer: (_, y) => y,
    default: () => 'analyzing'
  }),
  error: Annotation<string>({
    reducer: (_, y) => y,
    default: () => ''
  })
})

type PitchAgentStateType = typeof PitchAgentState.State

// ============================================
// HELPERS
// ============================================

function sendStatusUpdate(status: PitchGenerationStatus): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('pitch-generation-status', status)
  })
}

// Wrapper to parse simple string response from AI
function parseStringResponse(response: string): string {
  return response.trim()
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

function parseEmailPitchResponse(response: string): Omit<StoredEmailPitch, 'leadId'> {
  const trimmed = response.trim()
  const jsonText = extractFirstJsonObject(trimmed) ?? trimmed

  const parsed = JSON.parse(jsonText) as Partial<StoredEmailPitch>

  const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : ''
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
  const strategy_explanation =
    typeof parsed.strategy_explanation === 'string' ? parsed.strategy_explanation.trim() : ''
  const target_audience_analysis =
    typeof parsed.target_audience_analysis === 'string'
      ? parsed.target_audience_analysis.trim()
      : ''
  const psychological_triggers_used =
    typeof parsed.psychological_triggers_used === 'string'
      ? parsed.psychological_triggers_used.trim()
      : ''

  if (!subject || !body) {
    throw new Error('Invalid email pitch response: missing subject or body')
  }

  return {
    subject,
    body,
    strategy_explanation,
    target_audience_analysis,
    psychological_triggers_used,
    generatedAt: Date.now()
  }
}

function formatEmailPitchForStatus(pitch: Omit<StoredEmailPitch, 'leadId'>): string {
  const subject = pitch.subject.trim()
  const body = pitch.body.trim()
  return `Subject: ${subject}\n\n${body}`
}

// ============================================
// AGENT NODES
// ============================================

/**
 * Analyze Business Node
 * Analyzes the lead's business based on available data
 */
async function analyzeBusinessNode(
  state: PitchAgentStateType
): Promise<Partial<PitchAgentStateType>> {
  console.log('[PitchAgent] Analyzing business...')

  sendStatusUpdate({
    status: 'analyzing',
    message: '🧠 Analyzing business details...'
  })

  const lead = state.lead

  // Build context from reviews if available
  let reviewContext = ''
  if (lead.reviews && lead.reviews.length > 0) {
    const topReviews = lead.reviews.slice(0, 3)
    reviewContext = `\nCustomer Reviews:\n${topReviews.map((r) => `- ${r.author} (${r.rating}★): "${r.text}"`).join('\n')}`
  }

  const prompt = `Analyze this business for a WhatsApp outreach pitch:

Business Name: ${lead.name}
Category: ${lead.category}
Location: ${lead.address}
Rating: ${lead.rating}/5 (${lead.reviewCount} reviews)
Website: ${lead.website || 'None'}
${reviewContext}

Provide a brief analysis (2-3 sentences) covering:
1. What type of business this is and its likely target audience
2. Key strengths or unique aspects based on the data
3. Potential areas where they might need marketing/digital services

Keep the analysis concise and actionable.

System Role: You are a business analyst specializing in local businesses and marketing needs.`

  try {
    const analysis = await executeWithAiRotation(
      prompt,
      parseStringResponse,
      'Analysis unavailable', // Default value
      {
        onRetry: (model, attempt) =>
          console.log(`[PitchAgent] Retrying analysis with ${model} (attempt ${attempt})`),
        onModelSwitch: (from, to) =>
          console.log(`[PitchAgent] Switched model for analysis: ${from} -> ${to}`)
      }
    )

    console.log('[PitchAgent] Analysis complete')

    return {
      analysis,
      status: 'generating'
    }
  } catch (error) {
    console.error('[PitchAgent] Analysis error:', error)
    return {
      error: error instanceof Error ? error.message : 'Analysis failed',
      status: 'error'
    }
  }
}

/**
 * Generate Pitch Node
 * Creates an initial personalized WhatsApp pitch
 */
async function generatePitchNode(
  state: PitchAgentStateType
): Promise<Partial<PitchAgentStateType>> {
  console.log('[PitchAgent] Generating pitch...')

  sendStatusUpdate({
    status: 'generating',
    message: '✍️ Crafting personalized pitch...'
  })

  const lead = state.lead

  // Shared Contexts
  let exampleContext = ''
  if (lead.examples && lead.examples.length > 0) {
    exampleContext = `\n\nRefer to these EXAMPLE PITCHES for style, tone, length, and MARKDOWN FORMATTING (Mimic them):\n${lead.examples.map((ex, i) => `Example ${i + 1}:\n"${ex}"`).join('\n\n')}\n`
    exampleContext += `\nSTYLE & FORMATTING INSTRUCTION: Carefully analyze how the examples use Markdown (Bold *, Italic _, Lists, Quotes). You MUST replicate this specific formatting style. e.g. If specific words or Links are bolded in the examples, bold them in your output.`
  }

  let personaContext = ''
  if (lead.buyerPersona && lead.buyerPersona.trim().length > 0) {
    personaContext = `\nBUYER PERSONA (Target Audience):\n"${lead.buyerPersona}"\n`
  }

  let productLinksContext = ''
  if (lead.productLinks && lead.productLinks.length > 0) {
    productLinksContext = `\nAVAILABLE PRODUCT/PORTFOLIO LINKS (Use these to replace placeholders):\n${lead.productLinks.map((link, i) => `Link ${i + 1}: ${link}`).join('\n')}\n`
    productLinksContext += `CRITICAL LINK RULES (STRICT):
1. DETECT STRUCTURE (Priority 1): Check if the Instruction/Example defines specific spots for links (e.g. "Link 1", "Link 2", "First link", "Second link").
   - IF YES: Place each link in its specific designated spot.
2. DEFAULT LISTING (Priority 2): If only a GENERIC placeholder is found (e.g. "[Link]", "[Insert Link]") and no specific structure is defined:
   - REPLACE that single placeholder with ALL available links.
   - Format: Vertical list (New line for each URL).
3. INTELLIGENT REPLACEMENT: Replace placeholders with raw HTTP URLs (e.g., https://site.com).
4. NO BRACKETS: Do not wrap the final URLs in brackets.
5. MARKDOWN FORMATTING: If the "Reference Examples" (or user instruction) wrap links in bold (*) or other markdown, you MUST apply the same markdown wrapper to these inserted links.`
  }

  // Language-specific instruction for Bengali/Bangla
  let languageContext = ''
  if (lead.language === 'bn') {
    languageContext = `
🇧🇩 CRITICAL LANGUAGE INSTRUCTION - BANGLA (বাংলা):
Write the ENTIRE message in BANGLA (বাংলা) language using proper Bengali script.
- Use natural, fluent Bengali - not translated English
- Keep the tone warm and professional (আন্তরিক ও পেশাদার)
- Use common Bengali greetings like "আসসালামু আলাইকুম", "নমস্কার", or friendly "হ্যালো"
- Include Bengali emojis contextually (🙏, 🇧🇩, ✨, etc.)
- DO NOT mix English words unless absolutely necessary (like brand names or technical terms)
- The entire pitch MUST be readable by a native Bengali speaker
`
  }

  let prompt = ''

  if (lead.instruction && lead.instruction.trim().length > 0) {
    // USE CUSTOM INSTRUCTION
    prompt = `Create a short, personalized WhatsApp message for this business based on the user's specific instruction.

Business: ${lead.name}
Category: ${lead.category}
Location: ${lead.address}
Analysis: ${state.analysis}

USER INSTRUCTION:
"${lead.instruction}"
${personaContext}
${productLinksContext}
${exampleContext}
${languageContext}
Requirements:
1. STRICTLY follow the User Instruction above.
2. LENGTH: If the instruction specifies a length (e.g. "long", "short", "under 300 words"), FOLLOW IT. If not specified, keep it concise (under 200 words).
3. Include 1-2 relevant emojis naturally.
4. Output ONLY the message text.
5. If a Buyer Persona is provided, ensure the language resonates with them.
${languageContext ? '6. FOLLOW THE LANGUAGE INSTRUCTION ABOVE - This is CRITICAL.' : ''}

System Role: You are an expert at writing engaging, personalized outreach messages that feel genuine and helpful, not pushy or spammy.`
  } else {
    // DEFAULT PROMPT
    prompt = `Create a short, personalized WhatsApp message for this business:

Business: ${lead.name}
Category: ${lead.category}
Location: ${lead.address}
Analysis: ${state.analysis}
${personaContext}
${productLinksContext}
${exampleContext}
${languageContext}
Requirements:
1. Start with a friendly, personalized greeting mentioning their business name
2. Show you understand their business (reference something specific)
3. Briefly mention how you could help them grow (marketing, web presence, etc.)
4. End with a soft call-to-action (offer to chat, share ideas)
5. Keep it under 150 words - WhatsApp messages should be concise
6. Use a warm, professional tone - not salesy
7. Include 1-2 relevant emojis naturally
${exampleContext ? '8. MIMIC THE STYLE OF THE EXAMPLES ABOVE' : ''}
${personaContext ? '9. Tailor the message to appeal to the defined BUYER PERSONA' : ''}
${languageContext ? '10. FOLLOW THE LANGUAGE INSTRUCTION ABOVE - This is CRITICAL.' : ''}

Write ONLY the message text, no explanations.

System Role: You are an expert at writing engaging, personalized outreach messages that feel genuine and helpful, not pushy or spammy.`
  }

  try {
    const pitch = await executeWithAiRotation(
      prompt,
      parseStringResponse,
      '', // Default
      {
        onRetry: (model, attempt) =>
          console.log(`[PitchAgent] Retrying generation with ${model} (attempt ${attempt})`),
        onModelSwitch: (from, to) =>
          console.log(`[PitchAgent] Switched model for generation: ${from} -> ${to}`)
      }
    )

    if (!pitch) throw new Error('Failed to generate pitch content')

    console.log('[PitchAgent] Pitch generated')

    return {
      currentPitch: pitch,
      status: 'observing'
    }
  } catch (error) {
    console.error('[PitchAgent] Generation error:', error)
    return {
      error: error instanceof Error ? error.message : 'Pitch generation failed',
      status: 'error'
    }
  }
}

/**
 * Observe Node
 * Evaluates the pitch quality and decides if refinement is needed
 */
async function observeNode(state: PitchAgentStateType): Promise<Partial<PitchAgentStateType>> {
  console.log('[PitchAgent] Observing pitch quality...')

  sendStatusUpdate({
    status: 'observing',
    message: '🔍 Evaluating pitch quality...',
    currentPitch: state.currentPitch,
    refinementCount: state.refinementCount
  })

  // Skip further refinement if we've already refined 3 times
  if (state.refinementCount >= 3) {
    console.log('[PitchAgent] Max refinements reached, accepting pitch')
    return {
      needsRefinement: false,
      finalPitch: state.currentPitch,
      status: 'done'
    }
  }

  const lead = state.lead

  let instructionContext = ''
  let instructionCheck = ''

  if (lead.instruction && lead.instruction.trim().length > 0) {
    instructionContext = `\nUSER INSTRUCTION (CRITICAL):\n"${lead.instruction}"\n`
    instructionCheck = `1. **DOES IT FOLLOW THE USER INSTRUCTION?** (Highest Priority)\n`
  }

  // Length check criteria - Dynamic based on instruction
  let lengthCriteria = '3. Is it concise (under 150 words)?'
  if (instructionCheck) {
    lengthCriteria =
      '3. Does it follow the length/style requested in the instruction? (If not specified, is it concise?)'
  }

  let personaContext = ''
  if (lead.buyerPersona && lead.buyerPersona.trim().length > 0) {
    personaContext = `\nBUYER PERSONA:\n"${lead.buyerPersona}"\n`
    instructionCheck += `\n*. Does it resonate with the defined Buyer Persona?`
  }

  let exampleContext = ''
  if (lead.examples && lead.examples.length > 0) {
    exampleContext = `\n\nReference Examples (The pitch should match this style):\n${lead.examples.map((e) => `"${e}"`).join('\n')}`
    instructionCheck += `\n*. Does it match the style/tone of the provided examples?`
  }

  // Check if real links were used instead of placeholders
  if (lead.productLinks && lead.productLinks.length > 0) {
    instructionCheck += `\n*. CRITICAL: Are specific placeholders like "[Insert Link]" replaced with ACTUAL URLs? (Reject if placeholders remain)`
    if (lead.productLinks.length > 1) {
      instructionCheck += `\n*. MULTI-LINK CHECK: Did the message include ALL ${lead.productLinks.length} available links? (It MUST include clear references or the links themselves for all distinct items if context suggests sharing them)`
    }
  }

  // Language check for Bengali
  let languageCheck = ''
  if (lead.language === 'bn') {
    languageCheck = `\n*. LANGUAGE CHECK (CRITICAL): Is the ENTIRE message written in BANGLA (বাংলা) using Bengali script? (This is a FAIL if English is used except for brand names/URLs)`
  }

  const prompt = `Evaluate this WhatsApp outreach message and decide if it needs improvement:

Message:
"${state.currentPitch}"

Target Business: ${state.lead.name} (${state.lead.category})
${instructionContext}${personaContext}${exampleContext}
Criteria:
${instructionCheck || '1. Is it personalized to this specific business?'}
${instructionCheck ? '2' : '1'}. Is it personalized to this specific business?
${lengthCriteria}
${instructionCheck ? '4' : '3'}. Does it feel genuine and not salesy?
${instructionCheck ? '5' : '4'}. Is there a clear but soft call-to-action?
${instructionCheck ? '6' : '5'}. Are any "[Insert Link]" or similar placeholders remaining? (This is a FAIL)
${languageCheck}

Respond with ONLY one of these formats:
- If the message is good: "APPROVED: [brief reason]"
- If it needs improvement: "REFINE: [specific improvements needed]"

System Role: You are a quality assurance expert for marketing messages. Be concise and decisive.`

  try {
    const observation = await executeWithAiRotation(
      prompt,
      parseStringResponse,
      'APPROVED: Default approval due to error', // Safe fallback
      {
        onRetry: (model, attempt) =>
          console.log(`[PitchAgent] Retrying observation with ${model} (attempt ${attempt})`),
        onModelSwitch: (from, to) =>
          console.log(`[PitchAgent] Switched model for observation: ${from} -> ${to}`)
      }
    )

    console.log('[PitchAgent] Observation:', observation)

    const needsRefinement = observation.toUpperCase().startsWith('REFINE')

    if (needsRefinement) {
      return {
        observation,
        needsRefinement: true,
        status: 'refining'
      }
    } else {
      return {
        observation,
        needsRefinement: false,
        finalPitch: state.currentPitch,
        status: 'done'
      }
    }
  } catch (error) {
    console.error('[PitchAgent] Observation error:', error)
    // On error, accept the current pitch
    return {
      needsRefinement: false,
      finalPitch: state.currentPitch,
      status: 'done'
    }
  }
}

/**
 * Refine Node
 * Improves the pitch based on observation feedback
 */
async function refineNode(state: PitchAgentStateType): Promise<Partial<PitchAgentStateType>> {
  const newCount = state.refinementCount + 1
  console.log(`[PitchAgent] Refining pitch (iteration ${newCount})...`)

  sendStatusUpdate({
    status: 'refining',
    message: `✨ Refining pitch (${newCount}/3)...`,
    currentPitch: state.currentPitch,
    refinementCount: newCount
  })

  const lead = state.lead

  let instructionContext = ''

  if (lead.instruction && lead.instruction.trim().length > 0) {
    instructionContext = `\nCRITICAL CONTEXT:\nThe user specifically asked for: "${lead.instruction}".\nEnsure the refinement STRICTLY follows this instruction.`
  }

  let personaContext = ''
  if (lead.buyerPersona && lead.buyerPersona.trim().length > 0) {
    personaContext = `\nBUYER PERSONA:\n"${lead.buyerPersona}"\n`
  }

  let exampleContext = ''
  if (lead.examples && lead.examples.length > 0) {
    exampleContext = `\n\nReference Examples (Mimic this style AND MARKDOWN FORMATTING):\n${lead.examples.map((e) => `"${e}"`).join('\n')}`
    exampleContext += `\nSTYLE & FORMATTING INSTRUCTION: Carefully analyze how the examples use Markdown (Bold *, Italic _, Lists, Quotes). You MUST replicate this specific formatting style. e.g. If specific words or Links are bolded in the examples, bold them in your output.`
  }

  let productLinksContext = ''
  if (lead.productLinks && lead.productLinks.length > 0) {
    productLinksContext = `\nAVAILABLE PRODUCT/PORTFOLIO LINKS (Use these to replace placeholders):\n${lead.productLinks.map((link, i) => `Link ${i + 1}: ${link}`).join('\n')}\n`
    productLinksContext += `CRITICAL LINK RULES (STRICT):
1. STRUCTURED vs DEFAULT:
   - If user defines specific spots ("Link 1", "Link 2"): Fill those specific spots.
   - If user uses GENERIC placeholder ("[Link]"): Replace it with ALL available links (one per line).
2. QUANTITY: If using generic mode, you MUST include ALL ${lead.productLinks.length} available links.
3. FORMATTING: Put EACH URL on its own line. No brackets.
4. MARKDOWN MATCHING: If the Reference Examples wrap links in markdown (like *http...* or _http..._), you MUST wrap your inserted links in the same way.`
  }

  // Language instruction for Bengali
  let languageContext = ''
  if (lead.language === 'bn') {
    languageContext = `
🇧🇩 CRITICAL LANGUAGE INSTRUCTION - BANGLA (বাংলা):
The refined message MUST be written ENTIRELY in BANGLA (বাংলা) using Bengali script.
- Use natural, fluent Bengali - not translated English
- DO NOT mix English words unless absolutely necessary (like brand names/URLs)
`
  }

  const prompt = `Improve this WhatsApp message based on the feedback:

Current Message:
"${state.currentPitch}"

Feedback: ${state.observation}

Business: ${state.lead.name} (${state.lead.category})
${instructionContext}${personaContext}${productLinksContext}${exampleContext}
${languageContext}

Write an improved version that addresses the feedback while keeping:
- Strict adherence to the USER INSTRUCTION
- Matching the style of the EXAMPLES (if provided)
- Personalization to this specific business
- Length: FOLLOW USER INSTRUCTION (if specified), otherwise keep it concise
- Genuine, helpful tone
${languageContext ? '- MUST be written in BANGLA (বাংলা) language' : ''}

Write ONLY the improved message text.

System Role: You are an expert at refining outreach messages to be more effective and genuine.`

  try {
    const refinedPitch = await executeWithAiRotation(
      prompt,
      parseStringResponse,
      state.currentPitch, // Default to current pitch if fail
      {
        onRetry: (model, attempt) =>
          console.log(`[PitchAgent] Retrying refinement with ${model} (attempt ${attempt})`),
        onModelSwitch: (from, to) =>
          console.log(`[PitchAgent] Switched model for refinement: ${from} -> ${to}`)
      }
    )

    console.log('[PitchAgent] Pitch refined')

    return {
      currentPitch: refinedPitch,
      refinementCount: newCount,
      status: 'observing'
    }
  } catch (error) {
    console.error('[PitchAgent] Refinement error:', error)
    // On error, accept the current pitch
    return {
      finalPitch: state.currentPitch,
      status: 'done'
    }
  }
}

// ============================================
// CONDITIONAL EDGE
// ============================================

function shouldRefine(state: PitchAgentStateType): 'refine' | 'end' {
  if (state.status === 'error') {
    return 'end'
  }
  if (state.needsRefinement && state.refinementCount < 3) {
    return 'refine'
  }
  return 'end'
}

// ============================================
// GRAPH BUILDER
// ============================================

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildPitchGraph() {
  const workflow = new StateGraph(PitchAgentState)
    .addNode('analyze', analyzeBusinessNode)
    .addNode('generate', generatePitchNode)
    .addNode('observe', observeNode)
    .addNode('refine', refineNode)
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'generate')
    .addEdge('generate', 'observe')
    .addConditionalEdges('observe', shouldRefine, {
      refine: 'refine',
      end: END
    })
    .addEdge('refine', 'observe')

  return workflow.compile()
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Generate a personalized WhatsApp pitch for a lead
 */
export async function generatePitch(input: PitchGenerationInput): Promise<PitchGenerationResult> {
  console.log(`[PitchAgent] Starting pitch generation for: ${input.name}`)

  try {
    const graph = buildPitchGraph()

    const result = await graph.invoke({
      lead: input
    })

    if (result.status === 'error') {
      sendStatusUpdate({
        status: 'error',
        message: `❌ ${result.error || 'Failed to generate pitch'}`
      })
      return {
        success: false,
        error: result.error || 'Failed to generate pitch'
      }
    }

    const finalPitch = result.finalPitch || result.currentPitch

    sendStatusUpdate({
      status: 'done',
      message: '✅ Pitch ready!',
      currentPitch: finalPitch
    })

    console.log('[PitchAgent] Pitch generation complete')

    return {
      success: true,
      pitch: finalPitch
    }
  } catch (error) {
    console.error('[PitchAgent] Fatal error:', error)

    sendStatusUpdate({
      status: 'error',
      message: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

type EmailPitchAgentStateType = {
  lead: EmailPitchGenerationInput
  analysis: string
  currentPitch: Omit<StoredEmailPitch, 'leadId'> | null
  observation: string
  needsRefinement: boolean
  refinementCount: number
  finalPitch: Omit<StoredEmailPitch, 'leadId'> | null
  status: 'analyzing' | 'generating' | 'observing' | 'refining' | 'done' | 'error'
  error: string
}

const EmailPitchAgentState = Annotation.Root({
  lead: Annotation<EmailPitchGenerationInput>(),
  analysis: Annotation<string>({
    reducer: (_prev, next) => next ?? ''
  }),
  currentPitch: Annotation<Omit<StoredEmailPitch, 'leadId'> | null>({
    reducer: (_prev, next) => next ?? null
  }),
  observation: Annotation<string>({
    reducer: (_prev, next) => next ?? ''
  }),
  needsRefinement: Annotation<boolean>({
    reducer: (_prev, next) => next ?? false
  }),
  refinementCount: Annotation<number>({
    reducer: (prev, next) => (typeof next === 'number' ? next : (prev ?? 0)),
    default: () => 0
  }),
  finalPitch: Annotation<Omit<StoredEmailPitch, 'leadId'> | null>({
    reducer: (_prev, next) => next ?? null
  }),
  status: Annotation<'analyzing' | 'generating' | 'observing' | 'refining' | 'done' | 'error'>({
    reducer: (_prev, next) => next ?? 'analyzing',
    default: () => 'analyzing'
  }),
  error: Annotation<string>({
    reducer: (_prev, next) => next ?? ''
  })
})

async function analyzeBusinessForEmailNode(
  state: EmailPitchAgentStateType
): Promise<Partial<EmailPitchAgentStateType>> {
  sendStatusUpdate({
    status: 'analyzing',
    message: '🧠 Analyzing business details...'
  })

  const lead = state.lead

  let reviewContext = ''
  if (lead.reviews && lead.reviews.length > 0) {
    const topReviews = lead.reviews.slice(0, 3)
    reviewContext = `\nCustomer Reviews:\n${topReviews.map((r) => `- ${r.author} (${r.rating}★): "${r.text}"`).join('\n')}`
  }

  const prompt = `Analyze this business for a cold email outreach pitch:

Business Name: ${lead.name}
Category: ${lead.category}
Location: ${lead.address}
Rating: ${lead.rating}/5 (${lead.reviewCount} reviews)
Website: ${lead.website || 'None'}
${reviewContext}

Provide a brief analysis (2-3 sentences) covering:
1. What type of business this is and its likely target audience
2. Key strengths or unique aspects based on the data
3. Potential areas where they might need marketing/digital services

Keep the analysis concise and actionable.

System Role: You are a business analyst specializing in local businesses and marketing needs.`

  try {
    const analysis = await executeWithAiRotation(
      prompt,
      parseStringResponse,
      'Analysis unavailable'
    )
    return { analysis, status: 'generating' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Analysis failed',
      status: 'error'
    }
  }
}

async function generateEmailPitchNode(
  state: EmailPitchAgentStateType
): Promise<Partial<EmailPitchAgentStateType>> {
  sendStatusUpdate({
    status: 'generating',
    message: '✍️ Crafting personalized email...'
  })

  const lead = state.lead

  let exampleContext = ''
  if (lead.examples && lead.examples.length > 0) {
    exampleContext = `\n\nRefer to these EXAMPLE EMAILS for style, tone, length, and MARKDOWN FORMATTING (Mimic them):\n${lead.examples.map((ex, i) => `Example ${i + 1}:\n"${ex}"`).join('\n\n')}\n`
    exampleContext += `\nSTYLE & FORMATTING INSTRUCTION: Carefully analyze how the examples use Markdown (Bold *, Italic _, Lists, Quotes). You MUST replicate this specific formatting style.`
  }

  let personaContext = ''
  if (lead.buyerPersona && lead.buyerPersona.trim().length > 0) {
    personaContext = `\nBUYER PERSONA (Target Audience):\n"${lead.buyerPersona}"\n`
  }

  let productLinksContext = ''
  if (lead.productLinks && lead.productLinks.length > 0) {
    productLinksContext = `\nAVAILABLE PRODUCT/PORTFOLIO LINKS (Use these to replace placeholders):\n${lead.productLinks.map((link, i) => `Link ${i + 1}: ${link}`).join('\n')}\n`
    productLinksContext += `CRITICAL LINK RULES (STRICT):
1. Replace placeholders like "[Link]" or "[Insert Link]" with the real HTTP URLs.
2. If only one placeholder exists and multiple links are available, list all links on new lines.
3. If examples use Markdown around links, replicate the same formatting wrapper.`
  }

  let languageContext = ''
  if (lead.language === 'bn') {
    languageContext = `
🇧🇩 CRITICAL LANGUAGE INSTRUCTION - BANGLA (বাংলা):
Write the ENTIRE email in BANGLA (বাংলা) language using proper Bengali script.
- Use natural, fluent Bengali
- Do not mix English words unless absolutely necessary
`
  }

  const prompt = `Create a short, personalized cold email for this business.

Business: ${lead.name}
Category: ${lead.category}
Location: ${lead.address}
Website: ${lead.website || 'None'}
Analysis: ${state.analysis}
${personaContext}
${productLinksContext}
${exampleContext}
${languageContext}

Requirements:
1. Write a compelling subject line (max ~60 characters).
2. Body should be concise (under ~180 words unless instruction implies otherwise).
3. Personalize to the business (mention something specific).
4. Include a soft CTA (a question is best).
5. Do not use spammy phrases or excessive exclamation marks.
6. Output MUST be valid JSON ONLY (no markdown fences, no explanation).

Return JSON with exactly these keys:
{
  "subject": "string",
  "body": "string (markdown allowed)",
  "strategy_explanation": "string",
  "target_audience_analysis": "string",
  "psychological_triggers_used": "string"
}

${lead.instruction && lead.instruction.trim().length > 0 ? `USER INSTRUCTION (FOLLOW STRICTLY):\n"${lead.instruction}"\n` : ''}

System Role: You are an expert at writing effective, personalized cold outreach emails that feel genuine and helpful.`

  try {
    const pitch = await executeWithAiRotation(prompt, parseEmailPitchResponse, null as never)
    sendStatusUpdate({
      status: 'observing',
      message: '🔍 Evaluating email quality...',
      currentPitch: formatEmailPitchForStatus(pitch)
    })
    return { currentPitch: pitch, status: 'observing' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Email pitch generation failed',
      status: 'error'
    }
  }
}

async function observeEmailPitchNode(
  state: EmailPitchAgentStateType
): Promise<Partial<EmailPitchAgentStateType>> {
  sendStatusUpdate({
    status: 'observing',
    message: '🔍 Evaluating email quality...',
    currentPitch: state.currentPitch ? formatEmailPitchForStatus(state.currentPitch) : undefined,
    refinementCount: state.refinementCount
  })

  if (state.refinementCount >= 3) {
    return {
      needsRefinement: false,
      finalPitch: state.currentPitch,
      status: 'done'
    }
  }

  const lead = state.lead
  const current = state.currentPitch

  if (!current) {
    return {
      error: 'No email pitch to evaluate',
      status: 'error'
    }
  }

  const instructionContext =
    lead.instruction && lead.instruction.trim().length > 0
      ? `\nUSER INSTRUCTION (CRITICAL):\n"${lead.instruction}"\n`
      : ''

  const languageContext =
    lead.language === 'bn'
      ? `\nLANGUAGE REQUIREMENT: Output must be entirely in BANGLA (বাংলা).\n`
      : ''

  const prompt = `You are QA for cold outreach emails. Evaluate the draft and decide whether it needs refinement.

Business: ${lead.name} (${lead.category})
Draft Subject: ${current.subject}
Draft Body:
${current.body}
${instructionContext}
${languageContext}

Check:
1. Is it personalized to this business?
2. Is the subject compelling and not spammy?
3. Is the body concise and clear?
4. Does it include a soft CTA question?
5. Are any placeholders like "[Link]" still present? (Fail)
6. Does it follow the user instruction (if provided)?

Respond with ONLY one of these formats:
- APPROVED: [brief reason]
- REFINE: [specific improvements needed]
`

  try {
    const observation = await executeWithAiRotation(
      prompt,
      parseStringResponse,
      'REFINE: Improve clarity'
    )
    const needsRefinement = observation.startsWith('REFINE')
    return {
      observation,
      needsRefinement,
      status: needsRefinement ? 'refining' : 'done',
      finalPitch: needsRefinement ? null : current
    }
  } catch {
    return {
      needsRefinement: false,
      finalPitch: current,
      status: 'done'
    }
  }
}

async function refineEmailPitchNode(
  state: EmailPitchAgentStateType
): Promise<Partial<EmailPitchAgentStateType>> {
  const lead = state.lead
  const current = state.currentPitch
  if (!current) {
    return { error: 'No email pitch to refine', status: 'error' }
  }

  const newCount = state.refinementCount + 1

  sendStatusUpdate({
    status: 'refining',
    message: `✨ Refining email... (${newCount}/3)`,
    currentPitch: formatEmailPitchForStatus(current),
    refinementCount: newCount
  })

  const personaContext =
    lead.buyerPersona && lead.buyerPersona.trim().length > 0
      ? `\nBUYER PERSONA:\n"${lead.buyerPersona}"\n`
      : ''

  const exampleContext =
    lead.examples && lead.examples.length > 0
      ? `\nEXAMPLES (Mimic style/formatting):\n${lead.examples.map((ex, i) => `Example ${i + 1}:\n"${ex}"`).join('\n\n')}\n`
      : ''

  const productLinksContext =
    lead.productLinks && lead.productLinks.length > 0
      ? `\nPRODUCT LINKS:\n${lead.productLinks.map((link, i) => `Link ${i + 1}: ${link}`).join('\n')}\n`
      : ''

  const languageContext =
    lead.language === 'bn'
      ? `\nLANGUAGE REQUIREMENT: Output must be entirely in BANGLA (বাংলা).\n`
      : ''

  const instructionContext =
    lead.instruction && lead.instruction.trim().length > 0
      ? `\nUSER INSTRUCTION (FOLLOW STRICTLY):\n"${lead.instruction}"\n`
      : ''

  const prompt = `Refine this cold email draft based on the feedback. Keep it personalized and concise.

Business: ${lead.name}
Category: ${lead.category}
Location: ${lead.address}
Website: ${lead.website || 'None'}
Analysis: ${state.analysis}

CURRENT JSON:
${JSON.stringify(current)}

FEEDBACK:
${state.observation}
${instructionContext}${personaContext}${productLinksContext}${exampleContext}${languageContext}

Output MUST be valid JSON ONLY with exactly these keys:
{
  "subject": "string",
  "body": "string (markdown allowed)",
  "strategy_explanation": "string",
  "target_audience_analysis": "string",
  "psychological_triggers_used": "string"
}
`

  try {
    const refined = await executeWithAiRotation(prompt, parseEmailPitchResponse, current)
    return {
      currentPitch: refined,
      refinementCount: newCount,
      status: 'observing'
    }
  } catch {
    return {
      finalPitch: current,
      refinementCount: newCount,
      status: 'done'
    }
  }
}

function shouldRefineEmail(state: EmailPitchAgentStateType): 'refine' | 'end' {
  if (state.status === 'error') return 'end'
  if (state.needsRefinement && state.refinementCount < 3) return 'refine'
  return 'end'
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildEmailPitchGraph() {
  const workflow = new StateGraph(EmailPitchAgentState)
    .addNode('analyze', analyzeBusinessForEmailNode)
    .addNode('generate', generateEmailPitchNode)
    .addNode('observe', observeEmailPitchNode)
    .addNode('refine', refineEmailPitchNode)
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'generate')
    .addEdge('generate', 'observe')
    .addConditionalEdges('observe', shouldRefineEmail, {
      refine: 'refine',
      end: END
    })
    .addEdge('refine', 'observe')

  return workflow.compile()
}

export async function generateEmailPitch(
  input: EmailPitchGenerationInput
): Promise<EmailPitchGenerationResult> {
  console.log(`[PitchAgent] Starting email pitch generation for: ${input.name}`)

  try {
    const graph = buildEmailPitchGraph()

    const result = await graph.invoke({
      lead: input
    })

    if (result.status === 'error') {
      sendStatusUpdate({
        status: 'error',
        message: `❌ ${result.error || 'Failed to generate email pitch'}`
      })
      return {
        success: false,
        error: result.error || 'Failed to generate email pitch'
      }
    }

    const finalPitch = result.finalPitch || result.currentPitch
    if (!finalPitch) {
      sendStatusUpdate({
        status: 'error',
        message: '❌ Failed to generate email pitch'
      })
      return {
        success: false,
        error: 'Failed to generate email pitch'
      }
    }

    sendStatusUpdate({
      status: 'done',
      message: '✅ Email pitch ready!',
      currentPitch: formatEmailPitchForStatus(finalPitch)
    })

    return {
      success: true,
      pitch: {
        leadId: input.leadId,
        ...finalPitch
      }
    }
  } catch (error) {
    sendStatusUpdate({
      status: 'error',
      message: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
