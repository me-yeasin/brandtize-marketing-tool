import { ChatMessage, streamChatResponse } from '../ai-service'
import { AgentPreferences, SearchTask } from './types'

const PLANNER_SYSTEM_PROMPT = `
You are an expert Lead Generation Strategist.
Your goal is to break down a high-level user request (Niche + Locations) into a specific, step-by-step search plan for Google Maps and Facebook.

Output your plan strictly as a JSON array of objects.
Each object must represent a search task and follow this structure:
{
  "query": "string (the exact search term to use)",
  "location": "string (the specific city/region for this search)",
  "source": "google_maps" | "facebook"
}

Guidance:
1.  If multiple locations are provided, create separate tasks for each.
2.  Start with "google_maps" for broad discovery.
3.  If the niche is very broad (e.g., "Restaurants"), consider breaking it down into sub-niches if helpful, or keep it broad if the location is specific.
4.  Do not include any explanation or markdown formatting (like \`\`\`json). Just the raw JSON array.
`

async function generateText(messages: ChatMessage[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // fullText removed as it was unused
    streamChatResponse(messages, {
      onToken: () => {},
      onComplete: (text) => {
        resolve(text)
      },
      onError: (error) => {
        reject(new Error(error))
      }
    })
  })
}

export async function planSearchStrategy(preferences: AgentPreferences): Promise<SearchTask[]> {
  const { niche, locations } = preferences

  if (!niche || locations.length === 0) {
    return []
  }

  const userMessage = `
    Niche: ${niche}
    Target Locations: ${locations.join(', ')}
    
    Create a search plan.
  `

  const messages: ChatMessage[] = [
    { id: 'system', role: 'assistant', text: PLANNER_SYSTEM_PROMPT }, // using 'assistant' as role since 'system' might not be strictly supported by all adapters in ChatMessage interface, but looking at ai-service it maps 'user' to Human and others to AI. We should check if we can pass a system prompt properly.
    // Actually ai-service.ts lines 116-123 only maps 'user' -> HumanMessage and others to AIMessage.
    // To properly support SystemMessage, I might need to update ai-service or just put it in the first user message?
    // Let's try putting it as the first message. Ideally we should update ai-service to support system messages.
    // For now, I'll Prepend it to the user message or send it as the first 'user' message with a clear instruction context.
    // However, LLMs often behave better with a proper System prompt.
    // Let's look at ai-service again. It exports convertToLangChainMessages but it's not exported.
    // Wait, createContinuationMessages uses SystemMessage.
    // But convertToLangChainMessages only does Human/AI.
    // I will cheat and prepend the system instruction to the prompt for now to avoid refactoring ai-service in this step.
    { id: 'user-1', role: 'user', text: `${PLANNER_SYSTEM_PROMPT}\n\n${userMessage}` }
  ]

  try {
    const responseText = await generateText(messages)

    // Clean up potential markdown code blocks
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const tasks = JSON.parse(cleanJson) as Omit<SearchTask, 'id' | 'status'>[]

    // Hydrate with IDs and status
    return tasks.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      status: 'pending'
    }))
  } catch (error) {
    console.error('Error generating search plan:', error)
    // Fallback: simple 1-to-1 mapping if AI fails
    const fallbackTasks: SearchTask[] = []
    for (const loc of locations) {
      fallbackTasks.push({
        id: crypto.randomUUID(),
        query: `${niche} in ${loc}`,
        location: loc,
        source: 'google_maps',
        status: 'pending'
      })
    }
    return fallbackTasks
  }
}
