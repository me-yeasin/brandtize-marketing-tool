import { getAgencyProfile, type AgencyProfile, type FoundLead, type ScrapedContent } from '../store'
import { executeWithAiRotation } from './ai-rotation-manager'
import { getNicheStrategy } from './strategy-manager'
import type { NicheStrategy } from './strategy-types'

export interface EmailPitchResult {
  subject: string
  body: string
  strategy_explanation: string
  target_audience_analysis: string
}

export interface EmailPitchInput {
  lead: FoundLead
  scrapedContent: ScrapedContent
  userInstructions?: string // Optional specific instructions from user
}

// System prompt for the persona
// We upgrade the persona to be a "Data-Driven Strategist"
const SYSTEM_PROMPT = `You are a World-Class Direct Response Copywriter and B2B Sales Strategist.
You do NOT write generic emails. You write "sniper-like" pitches that are impossible to ignore.

Your secret weapon is your "Strategy Playbook" which gives you deep insider knowledge about the industry.
You combine this insider knowledge with psychological frameworks (PAS, AIDA, BAB) to write high-converting emails.

Your Tone:
- Professional but conversational.
- Confident, not arrogant.
- Concise. You respect the reader's time.
- No fluff. No "I hope this finds you well".
`

// Helper to construct the advanced prompt
function createSmartPrompt(
  input: EmailPitchInput,
  agencyProfile: AgencyProfile,
  strategy: NicheStrategy | null
): string {
  const { lead, scrapedContent, userInstructions } = input
  const websiteContext = scrapedContent.content.slice(0, 8000)

  // Inject Strategy Context if available
  let strategyContext = ''
  if (strategy) {
    // Handle potential legacy data structure gracefully by casting to any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy = strategy as any
    const service = strategy.serviceAnalysis || {
      painPoints: legacy.painPoints || [],
      valuePropositions: legacy.valuePropositions || [],
      industryJargon: legacy.industryJargon || []
    }
    const persona = strategy.personaAnalysis || {
      dailyFears: [],
      secretDesires: [],
      commonObjections: []
    }
    const offer = strategy.offerStrategy || {
      grandSlamHooks: strategy.marketingAngles || [],
      riskReversals: [],
      bonuses: []
    }

    strategyContext = `
### 🧠 STRATEGY PLAYBOOK ACTIVATED
**Target Audience**: ${strategy.targetAudience || 'General'}
**Service Niche**: ${strategy.niche}

#### 1. SERVICE INTEL (The "Expertise")
- **Technical Pain Points**: ${service.painPoints.join(', ')}
- **Value Propositions**: ${service.valuePropositions.join(', ')}
- **Insider Jargon**: ${service.industryJargon.join(', ')}

#### 2. PERSONA PSYCHOLOGY (The "Emotion")
- **Deepest Fears**: ${persona.dailyFears.join(', ')}
- **Secret Desires**: ${persona.secretDesires.join(', ')}
- **Likely Objections**: ${persona.commonObjections.join(', ')}

#### 3. GRAND SLAM OFFER (The "Irresistible Deal")
- **Hooks**: ${offer.grandSlamHooks.join(', ')}
- **Risk Reversals**: ${offer.riskReversals.join(', ')}
- **Bonuses**: ${offer.bonuses.join(', ')}
`
  } else {
    strategyContext = `
### STRATEGY:
(No specific niche strategy found. Rely on general B2B best practices and analysis of the website content.)
`
  }

  return `${SYSTEM_PROMPT}

### STEP 1: ANALYZE THE PROSPECT
**Prospect URL**: ${lead.url}
**Prospect Email Source**: ${lead.source}
**Decision Maker**: ${lead.decisionMaker || 'Unknown'}
**Website Content Snippet**:
"""
${websiteContext}
"""

### STEP 2: ANALYZE THE SENDER (ME)
**My Agency**: ${agencyProfile.name}
**My Offer**: ${agencyProfile.services.join(', ')}
**Portfolio**: ${agencyProfile.portfolio.map((p) => p.title).join(', ')}
**Key Skills**: ${agencyProfile.skills.join(', ')}
**Bio**: ${agencyProfile.bio}

${strategyContext}

### STEP 3: THE STRATEGIC SELECTION (Internal Thought Process)
Before writing, think:
1. **Analyze the Persona**: Based on the website, which "Deep Fear" or "Secret Desire" from the Playbook applies here?
2. **Select the Grand Slam Offer**: Which "Hook" + "Risk Reversal" makes saying 'No' feel stupid?
3. **Bridge the Gap**: Use "Insider Jargon" to connect their problem to your solution.

### STEP 4: THE TASK
Write a "Grand Slam" Cold Email.

${userInstructions ? `**USER SPECIAL INSTRUCTIONS**: ${userInstructions}` : ''}

### GUIDELINES:
- **Subject**: Use a "Grand Slam Hook" or a "Deep Fear" (curiosity gap). Max 4 words.
- **Opening**: Acknowledge a specific observation from their site (The Icebreaker) OR hit a "Daily Fear".
- **The "Meat"**: Present the **Grand Slam Offer** (Hook + Risk Reversal). Do NOT just list services.
- **The "Bone"**: Offer a specific high-value "Bonus" (e.g. "Free Audit") as the CTA.
- **CTA**: Soft ask ("Worth a generic 'no'?", "Open to seeing how?").
- **Tone**: Peer-to-peer. High status.

### STEP 5: OUTPUT FORMAT
Return valid JSON only.
{
  "subject": "The subject line",
  "body": "The full email body (use \\n for line breaks)",
  "strategy_explanation": "Explain: 'I targeted the [Fear] of [Audience]. I used the [Offer Hook] to eliminate risk.'",
  "target_audience_analysis": "Profile of this specific lead based on their site."
}
`
}

export async function generateEmailPitch(input: EmailPitchInput): Promise<EmailPitchResult> {
  const agencyProfile = getAgencyProfile()

  if (!agencyProfile.services || agencyProfile.services.length === 0) {
    throw new Error('Agency services not defined. Please complete your profile in Settings.')
  }

  // 1. Try to load the niche strategy
  // In the future, we could pass the 'niche' from the UI.
  // For now, we load the global strategy if it exists.
  const strategy = getNicheStrategy()

  const prompt = createSmartPrompt(input, agencyProfile, strategy)

  try {
    const result = await executeWithAiRotation(
      prompt,
      (response) => {
        let cleanJson = response.trim()
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '')
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/```/g, '')
        }

        try {
          return JSON.parse(cleanJson) as EmailPitchResult
        } catch (e) {
          console.error('Failed to parse AI response as JSON:', cleanJson, e)
          throw new Error('AI response was not in the expected JSON format.')
        }
      },
      {
        subject: 'Quick question',
        body: "Hi,\n\nI saw your website and thought we could help. Let's chat.\n\nThanks.",
        strategy_explanation: 'Fallback due to error.',
        target_audience_analysis: 'Unknown'
      }
    )

    return result
  } catch (error) {
    console.error('Error generating email pitch:', error)
    throw error
  }
}
