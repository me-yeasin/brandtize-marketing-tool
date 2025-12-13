/**
 * Lead Scorer Tool - Score leads based on multiple quality factors
 *
 * 2025 Best Practice: Multi-dimensional lead scoring with transparent breakdown
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  LeadScoreResult,
  ContactClassification,
  EmailVerificationResult,
  IntentSignals,
  ICPMatchResult,
  EnhancedCompanyInfo
} from './types'

export interface LeadScorerParams {
  email: string
  emailVerification?: EmailVerificationResult
  contactClassification?: ContactClassification
  companyInfo?: EnhancedCompanyInfo
  intentSignals?: IntentSignals
  icpMatch?: ICPMatchResult
  personalizationData?: {
    hasSpecificProducts: boolean
    hasRecentNews: boolean
    hasDifferentiator: boolean
    hasContactPage: boolean
  }
}

export class LeadScorerTool implements AgentTool<LeadScorerParams, LeadScoreResult> {
  name = 'score_lead'
  description = `Calculate a comprehensive lead score (0-100) based on email quality, business fit, intent signals, and personalization depth. Returns tier classification (hot/warm/cold) and detailed breakdown.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address being scored'
      },
      emailVerification: {
        type: 'object',
        description: 'Email verification result from verify_email tool'
      },
      contactClassification: {
        type: 'object',
        description: 'Contact classification result from classify_contact tool'
      },
      companyInfo: {
        type: 'object',
        description: 'Company information from extract_company_info tool'
      },
      intentSignals: {
        type: 'object',
        description: 'Intent signals detected for this lead'
      },
      icpMatch: {
        type: 'object',
        description: 'ICP match result from match_icp tool'
      },
      personalizationData: {
        type: 'object',
        description: 'Data about personalization opportunities'
      }
    },
    required: ['email']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    params: LeadScorerParams,
    context: ToolContext
  ): Promise<ToolResult<LeadScoreResult>> {
    const {
      email,
      emailVerification,
      contactClassification,
      companyInfo,
      intentSignals,
      icpMatch,
      personalizationData
    } = params

    const breakdown = {
      emailQuality: 0,
      businessFit: 0,
      intentSignals: 0,
      personalizationDepth: 0
    }

    const reasoningParts: string[] = []

    // Email Quality Score (0-25)
    if (emailVerification) {
      if (emailVerification.verificationStatus === 'verified') {
        breakdown.emailQuality += 15
        reasoningParts.push('Verified email (+15)')
      } else if (emailVerification.verificationStatus === 'unverified') {
        breakdown.emailQuality += 8
        reasoningParts.push('Unverified but valid format (+8)')
      } else if (emailVerification.verificationStatus === 'risky') {
        breakdown.emailQuality += 3
        reasoningParts.push('Risky email (+3)')
      }

      if (!emailVerification.isDisposable) {
        breakdown.emailQuality += 5
      } else {
        reasoningParts.push('Disposable email detected (-5)')
      }

      if (!emailVerification.isFreeProvider) {
        breakdown.emailQuality += 5
        reasoningParts.push('Business email domain (+5)')
      }
    } else {
      breakdown.emailQuality += 10
    }

    if (contactClassification) {
      if (contactClassification.role === 'decision_maker') {
        breakdown.emailQuality = Math.min(breakdown.emailQuality + 10, 25)
        reasoningParts.push('Decision-maker contact (+10)')
      } else if (contactClassification.role === 'personal') {
        breakdown.emailQuality = Math.min(breakdown.emailQuality + 7, 25)
        reasoningParts.push('Personal/named email (+7)')
      } else if (contactClassification.quality === 'high') {
        breakdown.emailQuality = Math.min(breakdown.emailQuality + 5, 25)
      }
    }

    breakdown.emailQuality = Math.min(breakdown.emailQuality, 25)

    // Business Fit Score (0-25)
    if (icpMatch) {
      const icpScore = Math.round((icpMatch.matchScore / 100) * 20)
      breakdown.businessFit += icpScore

      if (icpMatch.matchedServices.length > 0) {
        breakdown.businessFit += Math.min(icpMatch.matchedServices.length * 2, 5)
        reasoningParts.push(
          `Matches ${icpMatch.matchedServices.length} services (+${Math.min(icpMatch.matchedServices.length * 2, 5)})`
        )
      }
    } else if (companyInfo) {
      if (companyInfo.industry) {
        breakdown.businessFit += 5
      }
      if (companyInfo.signals && companyInfo.signals.length > 0) {
        breakdown.businessFit += Math.min(companyInfo.signals.length * 3, 10)
        reasoningParts.push(`${companyInfo.signals.length} business signals detected`)
      }
      if (companyInfo.companySize === 'small' || companyInfo.companySize === 'medium') {
        breakdown.businessFit += 5
        reasoningParts.push('Ideal company size (+5)')
      }
    } else {
      breakdown.businessFit += 5
    }

    breakdown.businessFit = Math.min(breakdown.businessFit, 25)

    // Intent Signals Score (0-25)
    if (intentSignals) {
      const intentScore = Math.round((intentSignals.overallIntentScore / 100) * 15)
      breakdown.intentSignals += intentScore

      if (intentSignals.hasHiringIntent) {
        breakdown.intentSignals += 5
        reasoningParts.push('Hiring intent detected (+5)')
      }
      if (intentSignals.hasTechUpgradeIntent) {
        breakdown.intentSignals += 5
        reasoningParts.push('Tech upgrade signals (+5)')
      }
      if (intentSignals.hasGrowthIntent) {
        breakdown.intentSignals += 3
        reasoningParts.push('Growth signals (+3)')
      }
      if (intentSignals.hasPainSignals) {
        breakdown.intentSignals += 4
        reasoningParts.push('Pain points identified (+4)')
      }
    } else if (companyInfo?.signals) {
      const signalCount = companyInfo.signals.length
      breakdown.intentSignals += Math.min(signalCount * 4, 15)
    }

    breakdown.intentSignals = Math.min(breakdown.intentSignals, 25)

    // Personalization Depth Score (0-25)
    if (personalizationData) {
      if (personalizationData.hasSpecificProducts) {
        breakdown.personalizationDepth += 8
        reasoningParts.push('Specific products/services known (+8)')
      }
      if (personalizationData.hasRecentNews) {
        breakdown.personalizationDepth += 7
        reasoningParts.push('Recent news/blog available (+7)')
      }
      if (personalizationData.hasDifferentiator) {
        breakdown.personalizationDepth += 6
        reasoningParts.push('Unique differentiator found (+6)')
      }
      if (personalizationData.hasContactPage) {
        breakdown.personalizationDepth += 4
      }
    } else if (companyInfo) {
      if (companyInfo.keyProducts && companyInfo.keyProducts.length > 0) {
        breakdown.personalizationDepth += 8
      }
      if (companyInfo.recentBlogPost || companyInfo.recentNews) {
        breakdown.personalizationDepth += 7
      }
      if (companyInfo.differentiator) {
        breakdown.personalizationDepth += 6
      }
      if (companyInfo.name && companyInfo.industry) {
        breakdown.personalizationDepth += 4
      }
    } else {
      breakdown.personalizationDepth += 5
    }

    breakdown.personalizationDepth = Math.min(breakdown.personalizationDepth, 25)

    const totalScore =
      breakdown.emailQuality +
      breakdown.businessFit +
      breakdown.intentSignals +
      breakdown.personalizationDepth

    let tier: LeadScoreResult['tier']
    if (totalScore >= 70) {
      tier = 'hot'
    } else if (totalScore >= 45) {
      tier = 'warm'
    } else {
      tier = 'cold'
    }

    const reasoning =
      reasoningParts.length > 0
        ? reasoningParts.join('; ')
        : `Score breakdown: Email(${breakdown.emailQuality}), Fit(${breakdown.businessFit}), Intent(${breakdown.intentSignals}), Personal(${breakdown.personalizationDepth})`

    context.emitEvent({
      type: 'status',
      content: `Lead score for ${email}: ${totalScore}/100 (${tier.toUpperCase()})`,
      timestamp: Date.now(),
      metadata: { email, totalScore, tier, breakdown }
    })

    return {
      success: true,
      data: {
        totalScore,
        tier,
        breakdown,
        reasoning
      }
    }
  }
}

export const leadScorerTool = new LeadScorerTool()
