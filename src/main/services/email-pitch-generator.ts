import { getAgencyProfile, type AgencyProfile, type FoundLead, type ScrapedContent } from '../store'
import { executeWithAiRotation } from './ai-rotation-manager'

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
const SYSTEM_PROMPT = `You are a world-class Direct Response Copywriter and B2B Sales Expert.
You rely on psychology-based frameworks (like AIDA, PAS) to write cold emails that convert.
You HATE fluff, generic intros ("I hope this finds you well"), and robotic language.
You write like a human talking to another human: punchy, concise, and value-driven.

Your goal is to write a highly personalized cold email pitch.`

// Helper to construct the analysis prompt
function createAnalysisAndDraftPrompt(
  input: EmailPitchInput,
  agencyProfile: AgencyProfile
): string {
  const { lead, scrapedContent, userInstructions } = input

  // Safely extract relevant parts of scraped content (limit length to avoid token limits)
  const websiteContext = scrapedContent.content.slice(0, 8000)

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
**My Agency Name**: ${agencyProfile.name}
**My Services**: ${agencyProfile.services.join(', ')}
**My Portfolio Highlights**: ${agencyProfile.portfolio.map((p) => p.title).join(', ')}
**My Skills**: ${agencyProfile.skills.join(', ')}
**My Bio/Tone**: ${agencyProfile.bio}

### STEP 3: THE TASK
Write a high-conversion cold email pitch from ME to the PROSPECT.

${userInstructions ? `**USER SPECIAL INSTRUCTIONS**: ${userInstructions}` : ''}

### GUIDELINES:
1. **Analyze First**: Identify a specific problem or opportunity based on their website content. DO NOT guess. Use actual info (e.g., "I noticed you're using X tech," "I saw your recent case study on Y").
2. **Select the Angle**: Choose ONE of my services that best solves their specific problem.
3. **Draft the Email**:
   - **Subject Line**: Max 6 words. Curiosity-inducing. Lowercase (optional but looks natural). NO "Salesy" caps.
   - **Salutation**: "Hi ${lead.decisionMaker ? lead.decisionMaker.split(' ')[0] : 'there'},"
   - **The Hook**: Mention the specific thing you found on their site immediately.
   - **The Value**: Connect their problem to my solution. Mention a relevant portfolio item if it fits.
   - **The CTA**: Low friction (e.g., "Worth a quick chat?", "Mind if I send a video audit?").
   - **Formatting**: Short paragraphs. Plain text style.

### STEP 4: OUTPUT FORMAT
Return valid JSON only. No markdown formatting. Structure:
{
  "subject": "The subject line",
  "body": "The full email body (use \\n for line breaks)",
  "strategy_explanation": "One sentence explaining why you chose this angle.",
  "target_audience_analysis": "One sentence description of who they are and their vibe."
}
`
}

export async function generateEmailPitch(input: EmailPitchInput): Promise<EmailPitchResult> {
  const agencyProfile = getAgencyProfile()

  // Validation: Ensure we have enough info to pitch
  if (!agencyProfile.services || agencyProfile.services.length === 0) {
    throw new Error('Agency services not defined. Please complete your profile in Settings.')
  }

  const prompt = createAnalysisAndDraftPrompt(input, agencyProfile)

  try {
    const result = await executeWithAiRotation(
      prompt,
      (response) => {
        // Cleaning the response to ensure it is valid JSON
        let cleanJson = response.trim()
        // Remove markdown code blocks if present
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
