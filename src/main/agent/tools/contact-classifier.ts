/**
 * Contact Classifier Tool - Evaluate email quality
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  ContactClassification
} from './types'

export interface ContactClassifierParams {
  email: string
  context?: string
}

export class ContactClassifierTool implements AgentTool<
  ContactClassifierParams,
  ContactClassification
> {
  name = 'classify_contact'
  description = `Evaluate an email address to determine its quality and role. Helps prioritize which contacts are worth reaching out to.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address to classify'
      },
      context: {
        type: 'string',
        description: 'Optional surrounding text where the email was found'
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
    params: ContactClassifierParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ToolContext
  ): Promise<ToolResult<ContactClassification>> {
    const { email, context = '' } = params
    const emailLower = email.toLowerCase()
    const contextLower = context.toLowerCase()

    // Generic email patterns (low quality)
    const genericPatterns = [
      'info@',
      'contact@',
      'hello@',
      'support@',
      'help@',
      'sales@',
      'admin@',
      'office@',
      'enquiries@',
      'inquiries@',
      'general@',
      'mail@',
      'team@'
    ]

    // Decision maker patterns (high quality)
    const decisionMakerPatterns = [
      'ceo@',
      'cto@',
      'cfo@',
      'founder@',
      'owner@',
      'director@',
      'manager@',
      'head@',
      'chief@',
      'president@',
      'vp@'
    ]

    // Support patterns
    const supportPatterns = ['support@', 'help@', 'service@', 'customer@', 'care@', 'ticket@']

    // Sales patterns
    const salesPatterns = ['sales@', 'business@', 'partnerships@', 'deals@', 'commercial@']

    // Check for decision maker
    if (decisionMakerPatterns.some((p) => emailLower.startsWith(p))) {
      return {
        success: true,
        data: {
          role: 'decision_maker',
          quality: 'high',
          reasoning: 'Email prefix indicates a decision maker role'
        }
      }
    }

    // Check context for decision maker hints
    const contextHints = ['ceo', 'founder', 'owner', 'director', 'manager', 'head of', 'chief']
    if (contextHints.some((h) => contextLower.includes(h))) {
      return {
        success: true,
        data: {
          role: 'decision_maker',
          quality: 'high',
          reasoning: 'Context suggests this is a decision maker contact'
        }
      }
    }

    // Check for support
    if (supportPatterns.some((p) => emailLower.startsWith(p))) {
      return {
        success: true,
        data: {
          role: 'support',
          quality: 'low',
          reasoning: 'This appears to be a support/help desk email'
        }
      }
    }

    // Check for sales
    if (salesPatterns.some((p) => emailLower.startsWith(p))) {
      return {
        success: true,
        data: {
          role: 'sales',
          quality: 'medium',
          reasoning: 'This appears to be a sales/business development contact'
        }
      }
    }

    // Check for generic
    if (genericPatterns.some((p) => emailLower.startsWith(p))) {
      return {
        success: true,
        data: {
          role: 'generic',
          quality: 'medium',
          reasoning: 'Generic company email, may still reach decision makers'
        }
      }
    }

    // Personal email (name-based)
    const hasName = /^[a-z]+(\.[a-z]+)?@/.test(emailLower)
    if (hasName) {
      return {
        success: true,
        data: {
          role: 'personal',
          quality: 'high',
          reasoning: 'Personal/named email address, likely reaches specific person'
        }
      }
    }

    return {
      success: true,
      data: {
        role: 'unknown',
        quality: 'medium',
        reasoning: 'Unable to determine email role with confidence'
      }
    }
  }
}

export const contactClassifierTool = new ContactClassifierTool()
