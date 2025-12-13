/**
 * Level 5 Hyper-Personalization System
 *
 * Generates highly personalized email content based on:
 * - Company research
 * - Pain points
 * - Tech stack
 * - Recent news/events
 * - Decision maker context
 */

import { ChatGroq } from '@langchain/groq'
import { PersonalizationLevel, SimplePersonalizationInput, IntentSignalType } from './types'

interface GeneratedTemplate {
  level: PersonalizationLevel
  template: {
    subject: string
    body: string
    variables: string[]
  }
  hooks: string[]
  confidenceScore: number
  generatedAt: number
}

interface SimpleIntentScore {
  totalScore: number
  signals: { type: IntentSignalType; weight: number; description: string }[]
  recommendation: string
  priority: 'hot' | 'warm' | 'cold'
  calculatedAt: number
}

export class PersonalizationEngine {
  private model: ChatGroq

  constructor(model: ChatGroq) {
    this.model = model
  }

  async analyzePersonalizationLevel(
    data: SimplePersonalizationInput
  ): Promise<PersonalizationLevel> {
    let level: PersonalizationLevel = 1

    if (data.companyName && data.industry) level = 2
    if (data.painPoints && data.painPoints.length > 0) level = 3
    if (data.recentNews || data.techStack) level = 4
    if (data.decisionMakerName && data.recentActivity) level = 5

    return level
  }

  async generateHyperPersonalizedEmail(
    data: SimplePersonalizationInput,
    ourServices: string[],
    agencyName: string,
    senderName: string
  ): Promise<GeneratedTemplate> {
    const level = await this.analyzePersonalizationLevel(data)

    const prompt = `Generate a highly personalized cold email for B2B outreach.

TARGET COMPANY:
- Name: ${data.companyName || 'Unknown'}
- Industry: ${data.industry || 'Unknown'}
- Size: ${data.companySize || 'Unknown'}
- Location: ${data.location || 'Unknown'}

DECISION MAKER:
- Name: ${data.decisionMakerName || 'Unknown'}
- Role: ${data.decisionMakerRole || 'Unknown'}

RESEARCH INSIGHTS:
- Pain Points: ${data.painPoints?.join(', ') || 'None identified'}
- Tech Stack: ${data.techStack?.join(', ') || 'Unknown'}
- Recent News: ${data.recentNews || 'None found'}
- Recent Activity: ${data.recentActivity || 'None found'}
- Competitors: ${data.competitors?.join(', ') || 'Unknown'}

OUR SERVICES: ${ourServices.join(', ')}
OUR AGENCY: ${agencyName}
SENDER: ${senderName}

PERSONALIZATION LEVEL: ${level}/5

Generate an email that:
1. Opens with a specific, personalized hook based on their recent news/activity
2. Identifies a specific pain point relevant to their business
3. Connects our services to solving that pain point
4. Includes social proof or case study reference if applicable
5. Has a clear, low-friction CTA
6. Feels like a 1-to-1 message, not a template

The email should be:
- Under 150 words
- Professional but conversational
- Focused on THEIR problems, not our services
- Include a compelling subject line

Respond in JSON:
{
  "subject": "compelling subject line",
  "opening": "personalized opening line",
  "body": "main email body",
  "cta": "call to action",
  "fullEmail": "complete email text",
  "personalizationHooks": ["list of personalization elements used"],
  "confidenceScore": 0-100
}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          level,
          template: {
            subject: parsed.subject || 'Quick question',
            body: parsed.fullEmail || parsed.body || '',
            variables: this.extractVariables(parsed.fullEmail || parsed.body || '')
          },
          hooks: parsed.personalizationHooks || [],
          confidenceScore: parsed.confidenceScore || 50,
          generatedAt: Date.now()
        }
      }
    } catch (error) {
      console.error('Personalization error:', error)
    }

    return this.generateFallbackTemplate(data, ourServices, agencyName, senderName, level)
  }

  private extractVariables(text: string): string[] {
    const matches = text.match(/\{([^}]+)\}/g) || []
    return matches.map((m) => m.replace(/[{}]/g, ''))
  }

  private generateFallbackTemplate(
    data: SimplePersonalizationInput,
    ourServices: string[],
    agencyName: string,
    senderName: string,
    level: PersonalizationLevel
  ): GeneratedTemplate {
    const subject = data.companyName
      ? `Quick question about ${data.companyName}'s digital presence`
      : 'Quick question about your business'

    const greeting = data.decisionMakerName ? `Hi ${data.decisionMakerName},` : 'Hi there,'

    const body = `${greeting}

I came across ${data.companyName || 'your company'} and noticed ${
      data.painPoints?.[0] || 'you might benefit from improved digital solutions'
    }.

At ${agencyName}, we help ${data.industry || 'businesses'} companies like yours with ${ourServices.slice(0, 2).join(' and ')}.

Would you be open to a quick 15-minute call to explore if we could help?

Best,
${senderName}`

    return {
      level,
      template: {
        subject,
        body,
        variables: ['companyName', 'decisionMakerName', 'industry']
      },
      hooks: ['company name', 'industry'],
      confidenceScore: 40,
      generatedAt: Date.now()
    }
  }

  async enrichPersonalizationData(
    basicData: Partial<SimplePersonalizationInput>,
    websiteContent: string
  ): Promise<SimplePersonalizationInput> {
    const prompt = `Analyze this website content and extract personalization data.

WEBSITE CONTENT:
${websiteContent.substring(0, 3000)}

KNOWN DATA:
${JSON.stringify(basicData, null, 2)}

Extract and return:
{
  "companyName": "company name",
  "industry": "industry/niche",
  "companySize": "small/medium/large/enterprise",
  "painPoints": ["potential pain points based on their business"],
  "techStack": ["technologies they might use"],
  "uniqueSellingPoints": ["what makes them unique"],
  "potentialNeeds": ["services they might need"]
}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          ...basicData,
          companyName: parsed.companyName || basicData.companyName,
          industry: parsed.industry || basicData.industry,
          companySize: parsed.companySize || basicData.companySize,
          painPoints: parsed.painPoints || basicData.painPoints,
          techStack: parsed.techStack || basicData.techStack
        } as SimplePersonalizationInput
      }
    } catch (error) {
      console.error('Enrichment error:', error)
    }

    return basicData as SimplePersonalizationInput
  }
}

export class IntentSignalScorer {
  private weights: Record<IntentSignalType, number> = {
    hiring_signal: 25,
    funding_signal: 30,
    tech_adoption: 20,
    growth_signal: 25,
    pain_point: 35,
    competitor_mention: 15,
    review_activity: 10,
    social_engagement: 10,
    website_change: 20,
    job_posting: 25
  }

  scoreSignals(signals: IntentSignalType[]): SimpleIntentScore {
    const detectedSignals: { type: IntentSignalType; weight: number; description: string }[] = []
    let totalScore = 0

    for (const signal of signals) {
      const weight = this.weights[signal] || 10
      totalScore += weight
      detectedSignals.push({
        type: signal,
        weight,
        description: this.getSignalDescription(signal)
      })
    }

    const normalizedScore = Math.min(100, totalScore)

    return {
      totalScore: normalizedScore,
      signals: detectedSignals,
      recommendation: this.getRecommendation(normalizedScore),
      priority: this.getPriority(normalizedScore),
      calculatedAt: Date.now()
    }
  }

  private getSignalDescription(signal: IntentSignalType): string {
    const descriptions: Record<IntentSignalType, string> = {
      hiring_signal: 'Company is actively hiring, indicating growth',
      funding_signal: 'Recent funding suggests budget availability',
      tech_adoption: 'Adopting new technology shows openness to change',
      growth_signal: 'Business growth indicators present',
      pain_point: 'Clear pain point identified that we can solve',
      competitor_mention: 'Mentions competitors, may be evaluating options',
      review_activity: 'Active in reviews, engaged with market',
      social_engagement: 'Active social presence indicates engagement',
      website_change: 'Recent website changes show digital focus',
      job_posting: 'Job postings reveal organizational needs'
    }
    return descriptions[signal] || 'Unknown signal'
  }

  private getRecommendation(score: number): string {
    if (score >= 80) return 'High priority - reach out immediately with personalized approach'
    if (score >= 60) return 'Good prospect - prioritize for outreach this week'
    if (score >= 40) return 'Moderate interest - include in regular outreach'
    if (score >= 20) return 'Low priority - add to nurture sequence'
    return 'Very low priority - monitor for future signals'
  }

  private getPriority(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 60) return 'hot'
    if (score >= 30) return 'warm'
    return 'cold'
  }

  async detectSignalsFromContent(model: ChatGroq, content: string): Promise<IntentSignalType[]> {
    const prompt = `Analyze this content and identify intent signals for B2B sales outreach.

CONTENT:
${content.substring(0, 2000)}

Identify which of these signals are present:
- hiring_signal: Company is hiring/expanding team
- funding_signal: Recent funding, investment, or financial growth
- tech_adoption: Adopting new technologies or platforms
- growth_signal: Business expansion, new locations, market entry
- pain_point: Mentioned challenges or problems
- competitor_mention: Mentions of competitors or alternatives
- review_activity: Active in reviews or feedback
- social_engagement: Active social media presence
- website_change: Recent website updates or redesign
- job_posting: Relevant job postings

Return ONLY a JSON array of detected signals:
["signal1", "signal2"]`

    try {
      const response = await model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as IntentSignalType[]
      }
    } catch (error) {
      console.error('Signal detection error:', error)
    }

    return []
  }
}

export function createPersonalizationEngine(model: ChatGroq): PersonalizationEngine {
  return new PersonalizationEngine(model)
}

export function createIntentSignalScorer(): IntentSignalScorer {
  return new IntentSignalScorer()
}
