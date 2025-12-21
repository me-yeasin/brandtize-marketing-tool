import {
  getAgencyProfile,
  getVoiceProfile,
  type AgencyProfile,
  type FoundLead,
  type ScrapedContent,
  type VoiceProfile
} from '../store'
import { executeWithAiRotation } from './ai-rotation-manager'
import { getNicheStrategy } from './strategy-manager'
import type { NicheStrategy } from './strategy-types'

export interface EmailPitchResult {
  subject: string
  body: string
  strategy_explanation: string
  target_audience_analysis: string
  psychological_triggers_used: string
}

export interface EmailPitchInput {
  lead: FoundLead
  scrapedContent: ScrapedContent
  userInstructions?: string
}

/**
 * STRATEGIC 5-PILLAR EMAIL PITCH GENERATOR
 *
 * This system uses each pillar for a SPECIFIC STRATEGIC PURPOSE:
 *
 * PILLAR 4 - OUTREACH TACTICS (Training Manual)
 * → Teaches the AI HOW to write: structure, format, subject lines, CTAs
 *
 * PILLAR 2 - PERSONA PSYCHOLOGY (Most Important!)
 * → The psychological triggers: fears to relieve, desires to promise, objections to kill
 *
 * PILLAR 1 - SERVICE EXPERTISE (Credibility)
 * → Positions you as the expert: pain points, value props, industry jargon
 *
 * PILLAR 3 - GRAND SLAM OFFER (Conversion Trigger)
 * → Makes them reply: irresistible hooks, risk reversals, bonuses
 *
 * PILLAR 5 - MY VOICE (Your Unique Writing Style) ⭐ NEW
 * → Makes the AI write EXACTLY like you: tone, phrases, examples
 */

// Build the strategic prompt using all 5 pillars in their specific roles
function createStrategicPrompt(
  input: EmailPitchInput,
  agencyProfile: AgencyProfile,
  strategy: NicheStrategy | null,
  voiceProfile: VoiceProfile
): string {
  const { lead, scrapedContent, userInstructions } = input
  const websiteContext = scrapedContent.content.slice(0, 10000)

  // Extract pillar data with fallbacks
  const outreachTactics = strategy?.outreachTactics || {
    winningSubjectLines: ['Quick question', 'Saw your website...'],
    bestOpeners: ['I noticed something on your site...'],
    structureRules: ['Keep it under 100 words', 'Use short paragraphs'],
    valueDropMethods: ['Free audit', 'Loom video walkthrough']
  }

  const personaPsychology = strategy?.personaAnalysis || {
    dailyFears: ['Losing customers to competitors', 'Wasting money on bad marketing'],
    secretDesires: ['More leads', 'Predictable revenue'],
    commonObjections: ['Too expensive', 'Already have a provider', 'Not the right time']
  }

  const serviceExpertise = strategy?.serviceAnalysis || {
    painPoints: ['Poor online presence', 'Low conversion rates'],
    valuePropositions: ['Increase leads by 30%', 'Save 10+ hours per week'],
    industryJargon: ['ROI', 'conversion rate', 'lead gen']
  }

  const grandSlamOffer = strategy?.offerStrategy || {
    grandSlamHooks: ['Double your leads in 30 days or it is free'],
    riskReversals: ['100% money-back guarantee'],
    bonuses: ['Free website audit', 'Free strategy call']
  }

  const niche = strategy?.niche || agencyProfile.services[0] || 'Digital Services'
  const targetAudience = strategy?.targetAudience || 'Business Owners'

  return `
═══════════════════════════════════════════════════════════════════════════════
                    STRATEGIC COLD EMAIL COPYWRITING SYSTEM
                         "The 4-Pillar Conversion Machine"
═══════════════════════════════════════════════════════════════════════════════

You are an ELITE B2B Cold Email Copywriter. You don't write generic emails.
You write psychologically-targeted, conversion-optimized pitches that get replies.

Your secret weapon: The 4-Pillar Strategy Playbook trained specifically for this niche.

═══════════════════════════════════════════════════════════════════════════════
                    📘 PILLAR 4: YOUR TRAINING MANUAL
                       (Outreach Tactics - HOW to Write)
═══════════════════════════════════════════════════════════════════════════════

Before you write, STUDY these proven tactics for ${niche}:

### SUBJECT LINE TRAINING (Use these as inspiration):
${outreachTactics.winningSubjectLines.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Rules: Max 4 words. Create curiosity. No spam words. Lowercase often works.

### FIRST LINE/OPENER TRAINING (Use these as inspiration):
${outreachTactics.bestOpeners.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Rules: Reference something SPECIFIC from their website. Make it personal.

### EMAIL STRUCTURE RULES (Follow these strictly):
${outreachTactics.structureRules.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### VALUE DROP / CTA OPTIONS (Use one of these):
${outreachTactics.valueDropMethods.map((s, i) => `${i + 1}. ${s}`).join('\n')}

→ Rules: Always offer something valuable for FREE. Low friction CTA.

═══════════════════════════════════════════════════════════════════════════════
                ⭐ PILLAR 2: PSYCHOLOGICAL TARGETING (MOST IMPORTANT)
                      (Persona Psychology - The Trigger Points)
═══════════════════════════════════════════════════════════════════════════════

This is YOUR SECRET WEAPON. The ${targetAudience} you're targeting have these:

### 😨 DAILY FEARS (Write sentences that RELIEVE these):
${personaPsychology.dailyFears.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Your Mission: Address ONE of these fears in your email. Show you understand it.
  Make them feel: "Finally, someone who gets what I'm dealing with!"

### ✨ SECRET DESIRES (Write sentences that PROMISE these):
${personaPsychology.secretDesires.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Your Mission: Connect your solution to ONE of their deep desires.
  Make them think: "This could actually give me what I've been wanting!"

### 🛡️ COMMON OBJECTIONS (Write sentences that KILL these):
${personaPsychology.commonObjections.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Your Mission: Pre-emptively address the objection they're MOST likely to have.
  Make them think: "Hmm, they've already thought about my concern..."

**PSYCHOLOGY STRATEGY:**
- Subject Line → Trigger CURIOSITY using a fear or desire
- First Line → Create RELEVANCE by referencing their specific situation
- Body → Build TRUST by showing you understand their psychology
- CTA → Reduce FRICTION by making the next step risk-free

═══════════════════════════════════════════════════════════════════════════════
                    🎯 PILLAR 1: YOUR CREDIBILITY TOOLKIT
                      (Service Expertise - Position Yourself)
═══════════════════════════════════════════════════════════════════════════════

Use these to position yourself as THE expert in ${niche}:

### PAIN POINTS (Connect their problem to your solution):
${serviceExpertise.painPoints.map((s, i) => `${i + 1}. ${s}`).join('\n')}

→ Your Mission: Identify which pain point matches their website situation.

### VALUE PROPOSITIONS (What outcomes you deliver):
${serviceExpertise.valuePropositions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

→ Your Mission: Mention ONE specific result you can deliver for them.

### INDUSTRY JARGON (Speak their insider language):
${serviceExpertise.industryJargon.map((s, i) => `${i + 1}. ${s}`).join('\n')}

→ Your Mission: Use 1-2 insider terms to show you know their world.

═══════════════════════════════════════════════════════════════════════════════
                    🏆 PILLAR 3: THE CONVERSION TRIGGER
                   (Grand Slam Offer - Make Them Reply)
═══════════════════════════════════════════════════════════════════════════════

This is how you get the reply. Use these elements strategically:

### GRAND SLAM HOOKS (Headlines that make "NO" feel stupid):
${grandSlamOffer.grandSlamHooks.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Your Mission: Use one of these concepts in your value proposition.

### RISK REVERSALS (Eliminate their fear of saying yes):
${grandSlamOffer.riskReversals.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

→ Your Mission: Include a subtle guarantee or risk-free element.

### IRRESISTIBLE BONUSES (Sweeten the deal):
${grandSlamOffer.bonuses.map((s, i) => `${i + 1}. ${s}`).join('\n')}

→ Your Mission: Offer one of these as your CTA (the "value drop").

═══════════════════════════════════════════════════════════════════════════════
                         📊 THE PROSPECT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

**Prospect URL**: ${lead.url}
**Email Source**: ${lead.source}
**Decision Maker**: ${lead.decisionMaker || 'Unknown'}

### THEIR WEBSITE CONTENT (Analyze this carefully):
"""
${websiteContext}
"""

→ Find 1-2 SPECIFIC things to reference (shows you did research)
→ Identify which FEAR/DESIRE from Pillar 2 applies to their situation
→ Connect their current state to the SOLUTION from Pillar 1

═══════════════════════════════════════════════════════════════════════════════
                              👤 ABOUT ME (The Sender)
═══════════════════════════════════════════════════════════════════════════════

**My Agency**: ${agencyProfile.name}
**My Tagline**: ${agencyProfile.tagline}
**My Services**: ${agencyProfile.services.join(', ')}
**My Key Skills**: ${agencyProfile.skills.slice(0, 5).join(', ')}
**Portfolio Highlights**: ${agencyProfile.portfolio
    .slice(0, 3)
    .map((p) => p.title)
    .join(', ')}

═══════════════════════════════════════════════════════════════════════════════
                           🎯 YOUR MISSION: WRITE THE EMAIL
═══════════════════════════════════════════════════════════════════════════════

${userInstructions ? `**SPECIAL INSTRUCTIONS FROM USER**: ${userInstructions}\n` : ''}

### THE EMAIL FORMULA (Follow this structure):

**SUBJECT LINE** (Max 4 words)
- Use curiosity gap from Pillar 2 (fear or desire)
- Style from Pillar 4 training

**FIRST LINE** (The Hook)
- Personal observation from their website
- Style from Pillar 4 best openers

**LINE 2-3** (The Psychology Trigger)
- Address their FEAR or DESIRE from Pillar 2
- Make them feel understood

**LINE 4-5** (The Bridge)
- Connect their situation to your expertise from Pillar 1
- Use industry jargon subtly

**FINAL LINES** (The Conversion)
- Present the Grand Slam Offer from Pillar 3
- Include a Risk Reversal
- End with a Value Drop (free bonus) as CTA

═══════════════════════════════════════════════════════════════════════════════
                    🎤 PILLAR 5: MY VOICE (WRITE LIKE ME!)
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: THE EMAIL MUST SOUND LIKE THE SENDER WROTE IT PERSONALLY.
This is NOT an AI writing. This is ${agencyProfile.name} writing.

${
  voiceProfile.toneDescription
    ? `### MY TONE & PERSONALITY:
"${voiceProfile.toneDescription}"

→ INSTRUCTION: Match this tone EXACTLY. Read it carefully and mimic it.`
    : ''
}

${
  voiceProfile.wordsToUse.length > 0
    ? `### WORDS & PHRASES I USE (Incorporate these naturally):
${voiceProfile.wordsToUse.map((w) => `• "${w}"`).join('\n')}

→ INSTRUCTION: Use 1-2 of these in the email to sound like me.`
    : ''
}

${
  voiceProfile.wordsToAvoid.length > 0
    ? `### WORDS & PHRASES I ***NEVER*** USE (DO NOT USE THESE UNDER ANY CIRCUMSTANCES):
${voiceProfile.wordsToAvoid.map((w) => `❌ "${w}" - BANNED`).join('\n')}

→ INSTRUCTION: If you write any of these words, the email is REJECTED.`
    : ''
}

${
  voiceProfile.sampleEmails.length > 0
    ? `### SAMPLE EMAILS I'VE WRITTEN (Learn my style from these):
${voiceProfile.sampleEmails.map((email, i) => `--- EXAMPLE ${i + 1} ---\n${email}`).join('\n\n')}

→ INSTRUCTION: Study these examples. Notice my sentence length, word choice, 
   rhythm, and personality. Write the new email in this EXACT style.`
    : ''
}

### EMAIL PREFERENCES:
- Preferred length: ${voiceProfile.emailLength === 'short' ? '~50 words (very concise)' : voiceProfile.emailLength === 'long' ? '150+ words (detailed)' : '~100 words (balanced)'}
${voiceProfile.greetingStyle ? `- Greeting style: "${voiceProfile.greetingStyle}"` : '- Greeting: Skip or keep minimal'}
${voiceProfile.signOff ? `- Sign-off: "${voiceProfile.signOff}"` : '- Sign-off: Keep casual or skip'}
- CTA style: ${voiceProfile.ctaStyle === 'soft' ? 'Soft (e.g., "Worth a look?")' : voiceProfile.ctaStyle === 'direct' ? 'Direct (e.g., "Let\'s chat Tuesday")' : 'Question-based (e.g., "Open to a 15-min call?")'}

### RULES:
1. ${voiceProfile.greetingStyle ? `Start with "${voiceProfile.greetingStyle}" style greeting` : 'NEVER start with "I" or generic "Hi [Name]"'}
2. MAX ${voiceProfile.emailLength === 'short' ? '50' : voiceProfile.emailLength === 'long' ? '150' : '75'} words total (excluding subject)
3. Sound like a helpful peer, not a salesperson
4. Use short paragraphs (2-3 sentences max)
5. End with a ${voiceProfile.ctaStyle} CTA

═══════════════════════════════════════════════════════════════════════════════
                              📤 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON (no markdown, no code blocks):

{
  "subject": "Your subject line here",
  "body": "The full email body with \\n for line breaks",
  "strategy_explanation": "Explain which psychological trigger you used and why",
  "target_audience_analysis": "Brief analysis of this specific prospect",
  "psychological_triggers_used": "Which fear/desire/objection you targeted and how"
}
`
}

export async function generateEmailPitch(input: EmailPitchInput): Promise<EmailPitchResult> {
  const agencyProfile = getAgencyProfile()

  if (!agencyProfile.services || agencyProfile.services.length === 0) {
    throw new Error('Agency services not defined. Please complete your profile in Settings.')
  }

  // Load the niche strategy (contains all 4 pillars)
  const strategy = getNicheStrategy()

  if (!strategy) {
    console.log(
      '[Email Pitch] Warning: No Strategy Playbook found. Using default values. Generate a Strategy Playbook in Settings for better results.'
    )
  }

  // Load the voice profile (Pillar 5 - My Voice)
  const voiceProfile = getVoiceProfile()

  if (!voiceProfile.toneDescription && voiceProfile.sampleEmails.length === 0) {
    console.log(
      '[Email Pitch] Info: No Voice Profile found. Configure your voice in Settings > My Voice for more personalized emails.'
    )
  }

  const prompt = createStrategicPrompt(input, agencyProfile, strategy, voiceProfile)

  try {
    const result = await executeWithAiRotation(
      prompt,
      (response) => {
        let cleanJson = response.trim()

        // Remove markdown code blocks if present
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '')
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/```/g, '')
        }

        // Trim again after removing code blocks
        cleanJson = cleanJson.trim()

        try {
          const parsed = JSON.parse(cleanJson)

          // Helper to safely convert any value to string
          const safeString = (value: unknown, fallback: string): string => {
            if (typeof value === 'string') return value
            if (value === null || value === undefined) return fallback
            if (typeof value === 'object') {
              try {
                return JSON.stringify(value)
              } catch {
                return fallback
              }
            }
            return String(value)
          }

          // Ensure all required fields exist and are strings
          return {
            subject: safeString(parsed.subject, 'Quick question'),
            body: safeString(parsed.body, 'Unable to generate email body.'),
            strategy_explanation: safeString(
              parsed.strategy_explanation,
              'Strategic analysis not provided.'
            ),
            target_audience_analysis: safeString(
              parsed.target_audience_analysis,
              'Prospect analysis not provided.'
            ),
            psychological_triggers_used: safeString(
              parsed.psychological_triggers_used,
              'Trigger analysis not provided.'
            )
          }
        } catch (e) {
          console.error('Failed to parse AI response as JSON:', cleanJson, e)
          throw new Error('AI response was not in the expected JSON format.')
        }
      },
      {
        subject: 'Quick question',
        body: "Hi,\n\nI saw your website and thought we could help. Let's chat.\n\nThanks.",
        strategy_explanation: 'Fallback due to parsing error.',
        target_audience_analysis: 'Unknown',
        psychological_triggers_used: 'None - fallback response.'
      }
    )

    console.log('[Email Pitch] Successfully generated strategic pitch')
    console.log(`[Email Pitch] Triggers used: ${result.psychological_triggers_used}`)

    return result
  } catch (error) {
    console.error('Error generating email pitch:', error)
    throw error
  }
}
