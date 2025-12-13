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
  // Verification fields
  verifiedOnSite: boolean
  companyProducts?: string
  personalizationNote?: string
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
      personalizationNote
    } = params

    // Determine quality based on verification
    const quality = verifiedOnSite ? 'high' : 'medium'
    const reasoning = verifiedOnSite
      ? `Email verified on official website. ${personalizationNote || ''}`
      : 'Email not verified on official site - proceed with caution'

    const lead: LeadData = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      source,
      company: {
        name: businessName,
        website: website || source,
        summary,
        products: companyProducts
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
      personalizationNote,
      foundAt: Date.now()
    }

    const verifiedBadge = verifiedOnSite ? '✓ Verified' : '⚠ Unverified'
    context.emitEvent({
      type: 'response',
      content: `${verifiedBadge} lead: ${email} from ${businessName}`,
      timestamp: Date.now(),
      metadata: { lead }
    })

    return {
      success: true,
      data: lead,
      metadata: { registered: true, verified: verifiedOnSite }
    }
  }
}

export const emitLeadTool = new EmitLeadTool()
