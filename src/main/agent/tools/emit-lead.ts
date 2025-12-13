/**
 * Emit Lead Tool - Register a qualified lead
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  LeadData
} from './types'

export interface EmitLeadParams {
  email: string
  source: string
  businessName: string
  website: string
  summary: string
  emailSubject: string
  emailBody: string
  verifiedOnSite: boolean
  companyProducts?: string
  personalizationNote?: string
  leadScore?: number
  leadTier?: 'hot' | 'warm' | 'cold'
  emailVerified?: boolean
  emailRiskScore?: number
  intentSignals?: string[]
  icpMatchScore?: number
  matchedServices?: string[]
  companySize?: string
  industry?: string
  hiringIntent?: boolean
  outdatedTech?: boolean
}

export class EmitLeadTool implements AgentTool<EmitLeadParams, LeadData> {
  name = 'emit_lead'
  description = `Register a qualified lead that you've found. Use this when you've verified an email contact is a good potential client. This will add them to the leads list.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address of the lead'
      },
      source: {
        type: 'string',
        description: 'The URL where this lead was found'
      },
      businessName: {
        type: 'string',
        description: 'Name of the business'
      },
      website: {
        type: 'string',
        description: 'Business official website URL'
      },
      summary: {
        type: 'string',
        description: 'Brief summary of what the business does and why they need our services'
      },
      emailSubject: {
        type: 'string',
        description: 'Personalized email subject line (under 50 chars, specific to this company)'
      },
      emailBody: {
        type: 'string',
        description:
          'Personalized email body referencing their specific products/services (under 150 words)'
      },
      verifiedOnSite: {
        type: 'boolean',
        description: 'Whether this email was verified on the official website'
      },
      companyProducts: {
        type: 'string',
        description: 'Key products/services the company offers (for personalization)'
      },
      personalizationNote: {
        type: 'string',
        description:
          'Specific detail used to personalize the outreach (e.g., recent news, unique feature)'
      },
      leadScore: {
        type: 'number',
        description: 'Lead quality score from 0-100 (from score_lead tool)'
      },
      leadTier: {
        type: 'string',
        description: 'Lead tier: hot (70+), warm (50-69), cold (<50)'
      },
      emailVerified: {
        type: 'boolean',
        description: 'Whether email passed MX/deliverability verification'
      },
      emailRiskScore: {
        type: 'number',
        description: 'Email risk score 0-100, lower is better'
      },
      intentSignals: {
        type: 'array',
        description: 'Intent signals detected (hiring, tech_upgrade, growth)',
        items: { type: 'string', description: 'Signal type' }
      },
      icpMatchScore: {
        type: 'number',
        description: 'ICP match score 0-100'
      },
      matchedServices: {
        type: 'array',
        description: 'Our services that match their needs',
        items: { type: 'string', description: 'Service name' }
      },
      companySize: {
        type: 'string',
        description: 'Company size: micro, small, medium, large, enterprise'
      },
      industry: {
        type: 'string',
        description: 'Industry/niche of the company'
      },
      hiringIntent: {
        type: 'boolean',
        description: 'Whether hiring signals were detected'
      },
      outdatedTech: {
        type: 'boolean',
        description: 'Whether outdated tech stack was detected'
      }
    },
    required: [
      'email',
      'source',
      'businessName',
      'summary',
      'emailSubject',
      'emailBody',
      'verifiedOnSite'
    ]
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(params: EmitLeadParams, context: ToolContext): Promise<ToolResult<LeadData>> {
    const {
      email,
      source,
      businessName,
      website,
      summary,
      emailSubject,
      emailBody,
      verifiedOnSite,
      companyProducts,
      personalizationNote,
      leadScore,
      leadTier,
      emailVerified,
      emailRiskScore,
      intentSignals,
      icpMatchScore,
      matchedServices,
      companySize,
      industry,
      hiringIntent,
      outdatedTech
    } = params

    let quality: 'high' | 'medium' | 'low' = 'medium'
    if (leadScore && leadScore >= 70) {
      quality = 'high'
    } else if (leadScore && leadScore >= 50) {
      quality = 'medium'
    } else if (leadScore && leadScore < 50) {
      quality = 'low'
    } else if (verifiedOnSite) {
      quality = 'high'
    }

    const reasoningParts: string[] = []
    if (verifiedOnSite) reasoningParts.push('Email verified on official website')
    if (emailVerified) reasoningParts.push('Email deliverable (MX valid)')
    if (leadScore) reasoningParts.push(`Lead score: ${leadScore}/100 (${leadTier || 'unscored'})`)
    if (icpMatchScore) reasoningParts.push(`ICP match: ${icpMatchScore}%`)
    if (matchedServices && matchedServices.length > 0) {
      reasoningParts.push(`Matched services: ${matchedServices.join(', ')}`)
    }
    if (hiringIntent) reasoningParts.push('Hiring intent detected')
    if (outdatedTech) reasoningParts.push('Outdated tech (upgrade opportunity)')
    if (personalizationNote) reasoningParts.push(personalizationNote)

    const reasoning = reasoningParts.length > 0 ? reasoningParts.join('. ') : 'Lead registered'

    const enhancedPersonalizationNote = [
      personalizationNote,
      leadScore ? `Score: ${leadScore}/100 (${leadTier})` : null,
      intentSignals && intentSignals.length > 0 ? `Intent: ${intentSignals.join(', ')}` : null,
      matchedServices && matchedServices.length > 0
        ? `Matches: ${matchedServices.join(', ')}`
        : null
    ]
      .filter(Boolean)
      .join(' | ')

    const lead: LeadData = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      source,
      company: {
        name: businessName,
        website: website || source,
        summary,
        products: companyProducts,
        industry,
        companySize: companySize as
          | 'micro'
          | 'small'
          | 'medium'
          | 'large'
          | 'enterprise'
          | undefined,
        signals: intentSignals
      },
      contactQuality: {
        role: 'unknown',
        quality,
        reasoning
      },
      template: {
        subject: emailSubject,
        body: emailBody
      },
      verified: verifiedOnSite,
      personalizationNote: enhancedPersonalizationNote || personalizationNote,
      foundAt: Date.now(),
      leadScore: leadScore
        ? {
            totalScore: leadScore,
            tier: leadTier || (leadScore >= 70 ? 'hot' : leadScore >= 50 ? 'warm' : 'cold'),
            breakdown: {
              emailQuality: emailVerified ? 20 : 10,
              businessFit: icpMatchScore ? Math.round(icpMatchScore * 0.25) : 10,
              intentSignals: (hiringIntent ? 10 : 0) + (outdatedTech ? 10 : 0),
              personalizationDepth: personalizationNote ? 15 : 5
            },
            reasoning
          }
        : undefined,
      emailVerification:
        emailVerified !== undefined
          ? {
              isValid: true,
              isDeliverable: emailVerified,
              isMxValid: emailVerified,
              isDisposable: false,
              isRoleBased: false,
              isFreeProvider: false,
              riskScore: emailRiskScore || 0,
              verificationStatus: emailVerified ? 'verified' : 'unverified',
              reasoning: emailVerified ? 'Email verified' : 'Email not verified'
            }
          : undefined,
      icpMatch: icpMatchScore
        ? {
            matchScore: icpMatchScore,
            matchedServices: matchedServices || [],
            matchedIndustry: !!industry,
            matchedSize: !!companySize,
            recommendation:
              icpMatchScore >= 70 ? 'ideal' : icpMatchScore >= 50 ? 'good' : 'moderate',
            reasoning: `ICP match score: ${icpMatchScore}%`,
            gapAnalysis: []
          }
        : undefined
    }

    const tierEmoji = leadTier === 'hot' ? '🔥' : leadTier === 'warm' ? '✓' : '○'
    const scoreDisplay = leadScore ? ` [${leadScore}/100]` : ''
    const verifiedBadge =
      verifiedOnSite && emailVerified
        ? '✓ Verified'
        : verifiedOnSite
          ? '~ Site Verified'
          : '⚠ Unverified'

    context.emitEvent({
      type: 'response',
      content: `${tierEmoji} ${verifiedBadge} lead${scoreDisplay}: ${email} from ${businessName}`,
      timestamp: Date.now(),
      metadata: { lead }
    })

    return {
      success: true,
      data: lead,
      metadata: {
        registered: true,
        verified: verifiedOnSite,
        emailVerified,
        leadScore,
        leadTier,
        icpMatchScore
      }
    }
  }
}

export const emitLeadTool = new EmitLeadTool()
