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
        description: 'Business website URL'
      },
      summary: {
        type: 'string',
        description: 'Brief summary of the business and why they are a good lead'
      },
      emailSubject: {
        type: 'string',
        description: 'Suggested email subject line for outreach'
      },
      emailBody: {
        type: 'string',
        description: 'Suggested email body for outreach'
      }
    },
    required: ['email', 'source', 'businessName', 'summary', 'emailSubject', 'emailBody']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(params: EmitLeadParams, context: ToolContext): Promise<ToolResult<LeadData>> {
    const { email, source, businessName, website, summary, emailSubject, emailBody } = params

    const lead: LeadData = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      source,
      company: {
        name: businessName,
        website: website || source,
        summary
      },
      contactQuality: {
        role: 'unknown',
        quality: 'medium',
        reasoning: 'Lead registered via tool'
      },
      template: {
        subject: emailSubject,
        body: emailBody
      },
      foundAt: Date.now()
    }

    context.emitEvent({
      type: 'response',
      content: `Found qualified lead: ${email} from ${businessName}`,
      timestamp: Date.now(),
      metadata: { lead }
    })

    return {
      success: true,
      data: lead,
      metadata: { registered: true }
    }
  }
}

export const emitLeadTool = new EmitLeadTool()
