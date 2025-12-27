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
    exampleContext = `\n\nRefer to these EXAMPLE PITCHES for style, tone, and length (Mimic them):\n${lead.examples.map((ex, i) => `Example ${i + 1}:\n"${ex}"`).join('\n\n')}\n`
  }

  let personaContext = ''
  if (lead.buyerPersona && lead.buyerPersona.trim().length > 0) {
    personaContext = `\nBUYER PERSONA (Target Audience):\n"${lead.buyerPersona}"\n`
  }

  let productLinksContext = ''
  if (lead.productLinks && lead.productLinks.length > 0) {
    productLinksContext = `\nAVAILABLE PRODUCT/PORTFOLIO LINKS (Use these to replace placeholders):\n${lead.productLinks.map((link, i) => `Link ${i + 1}: ${link}`).join('\n')}\n`
    productLinksContext += `CRITICAL LINK RULES:
1. INTELLIGENT REPLACEMENT: If the Instruction or Examples contain placeholders like "[Insert Link]", "[Link Here]", "[Portfolio]", "link here", or similar, YOU MUST REPLACE THEM with the actual URLs above.
2. FORMATTING: When inserting links, do not wrap them in brackets.
3. MULTIPLE LINKS: If inserting multiple links, verify if they should be listed line-by-line.`
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
Requirements:
1. STRICTLY follow the User Instruction above.
2. Keep it under 150 words (WhatsApp style).
3. Include 1-2 relevant emojis naturally.
4. Output ONLY the message text.
5. If a Buyer Persona is provided, ensure the language resonates with them.

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
  }

  const prompt = `Evaluate this WhatsApp outreach message and decide if it needs improvement:

Message:
"${state.currentPitch}"

Target Business: ${state.lead.name} (${state.lead.category})
${instructionContext}${personaContext}${exampleContext}
Criteria:
${instructionCheck || '1. Is it personalized to this specific business?'}
${instructionCheck ? '2' : '1'}. Is it personalized to this specific business?
${instructionCheck ? '3' : '2'}. Is it concise (under 150 words)?
${instructionCheck ? '4' : '3'}. Does it feel genuine and not salesy?
${instructionCheck ? '5' : '4'}. Is there a clear but soft call-to-action?
${instructionCheck ? '6' : '5'}. Are any "[Insert Link]" or similar placeholders remaining? (This is a FAIL)

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
    exampleContext = `\n\nReference Examples (Mimic this style):\n${lead.examples.map((e) => `"${e}"`).join('\n')}`
  }

  let productLinksContext = ''
  if (lead.productLinks && lead.productLinks.length > 0) {
    productLinksContext = `\nAVAILABLE PRODUCT/PORTFOLIO LINKS (Use these to replace placeholders):\n${lead.productLinks.map((link, i) => `Link ${i + 1}: ${link}`).join('\n')}\n`
    productLinksContext += `CRITICAL LINK RULES:
1. IF the Feedback mentions missing links or placeholders: REPLACE text like "[Insert Link]" with actual URLs from above.
2. DO NOT output the placeholder. Output the HTTP link.`
  }

  const prompt = `Improve this WhatsApp message based on the feedback:

Current Message:
"${state.currentPitch}"

Feedback: ${state.observation}

Business: ${state.lead.name} (${state.lead.category})
${instructionContext}${personaContext}${productLinksContext}${exampleContext}

Write an improved version that addresses the feedback while keeping:
- Strict adherence to the USER INSTRUCTION
- Matching the style of the EXAMPLES (if provided)
- Personalization to this specific business
- Concise length
- Genuine, helpful tone

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
