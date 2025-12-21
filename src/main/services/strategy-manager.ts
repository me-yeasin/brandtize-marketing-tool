import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { executeWithAiRotation } from './ai-rotation-manager'
import type { NicheResearchResult, NicheStrategy } from './strategy-types'

const STRATEGY_FILE = 'niche-strategy.json'

// Get the path to the strategy file
function getStrategyPath(): string {
  const userDataPath = app.getPath('userData')
  const strategiesDir = join(userDataPath, 'strategies')
  if (!existsSync(strategiesDir)) {
    mkdirSync(strategiesDir, { recursive: true })
  }
  return join(strategiesDir, STRATEGY_FILE)
}

// Save the strategy to disk
export function saveNicheStrategy(strategy: NicheStrategy): void {
  const data: NicheResearchResult = {
    strategy,
    lastUpdated: Date.now()
  }
  writeFileSync(getStrategyPath(), JSON.stringify(data, null, 2), 'utf-8')
}

// Load the strategy from disk
export function getNicheStrategy(): NicheStrategy | null {
  const path = getStrategyPath()
  if (!existsSync(path)) return null

  try {
    const content = readFileSync(path, 'utf-8')
    const data = JSON.parse(content) as NicheResearchResult
    return data.strategy
  } catch (error) {
    console.error('Failed to load niche strategy:', error)
    return null
  }
}

// The prompt to generate the strategy
function createStrategyResearchPrompt(niche: string, targetAudience: string): string {
  return `
You are a World-Class B2B Marketing Strategist and Sales Psychologist (Alex Hormozi style).
Your task is to build a "Grand Slam" Cold Email Strategy by analyzing the Service "${niche}" and the Target Audience "${targetAudience}".

We need 3 Pillars of Deep Analysis to ensure 100% response potential.

### 1. SERVICE ANALYSIS (The "Expertise")
Analyze "${niche}" to identify:
- **Pain Points**: What specific technical problems do users of this service face?
- **Value Props**: deeply financial or strategic benefits.
- **Jargon**: Insider terms that prove we are experts.

### 2. PERSONA ANALYSIS (The "Psychology")
Analyze the "Target Audience: ${targetAudience}":
- **Daily Fears**: What keeps them up at night? (e.g., getting sued, losing status, bankruptcy).
- **Secret Desires**: What do they want but won't say aloud? (e.g., "work 4 hours a week").
- **Objections**: Why do they say "No"? (e.g., "Vendor lock-in", "Too expensive").

### 3. THE GRAND SLAM OFFER (The "Hook")
Construct an irresistible offer structure:
- **Grand Slam Hook**: A one-liner that solves a big pain with low effort/risk (e.g., "I'll double your leads or pay you $1k").
- **Risk Reversal**: A guarantee that removes fear.
- **Bonuses**: High-value, low-cost add-ons (e.g., "Free Audit").

### OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "niche": "${niche}",
  "targetAudience": "${targetAudience}",
  "serviceAnalysis": {
    "painPoints": ["5 specific technical pains..."],
    "valuePropositions": ["5 high-value outcomes..."],
    "industryJargon": ["10 insider terms..."]
  },
  "personaAnalysis": {
    "dailyFears": ["5 deep fears..."],
    "secretDesires": ["5 hidden desires..."],
    "commonObjections": ["3 major objections..."]
  },
  "offerStrategy": {
    "grandSlamHooks": ["3 specific irresistible hooks..."],
    "riskReversals": ["3 confident guarantees..."],
    "bonuses": ["3 high-perceived-value bonuses..."]
  },
  "marketingAngles": ["3 creative angles..."],
  "winningFrameworks": ["PAS", "AIDA"]
}
`
}

// Main function to perform the research (simulate research via AI knowledge)
// In a full "Agentic" version, this would actually browse the web.
// For now, we rely on the LLM's vast training data which acts as a search engine.
export async function researchNicheStrategy(
  niche: string,
  targetAudience: string = 'Potential Clients'
): Promise<NicheStrategy> {
  const prompt = createStrategyResearchPrompt(niche, targetAudience)

  try {
    // We use the AI Service to "Research" based on its internal knowledge base
    const result = await executeWithAiRotation(
      prompt,
      (response) => {
        let cleanJson = response.trim()
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '')
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/```/g, '')
        }
        return JSON.parse(cleanJson) as NicheStrategy
      },
      // Fallback if AI fails completely
      {
        niche,
        targetAudience,
        serviceAnalysis: {
          painPoints: ['Inefficiency', 'High Costs', 'Low Conversions'],
          valuePropositions: ['Save Time', 'Reduce Cost', 'Increase Revenue'],
          industryJargon: ['ROI', 'Scalability']
        },
        personaAnalysis: {
          dailyFears: ['Losing Money', 'Wasted Time'],
          secretDesires: ['Market Dominance', 'Less Work'],
          commonObjections: ['Too Expensive']
        },
        offerStrategy: {
          grandSlamHooks: ['I will double your ROI in 30 days'],
          riskReversals: ['Money-back guarantee'],
          bonuses: ['Free Audit']
        },
        marketingAngles: ['Direct Offer', 'Free Audit'],
        winningFrameworks: ['PAS', 'AIDA']
      }
    )

    // Save the result for future use
    saveNicheStrategy(result)
    return result
  } catch (error) {
    console.error('Error researching niche strategy:', error)
    throw error
  }
}
