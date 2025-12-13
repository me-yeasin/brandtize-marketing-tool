/**
 * Domain Classifier Tool - Classify websites as potential leads
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  DomainClassification
} from './types'

export interface DomainClassifierParams {
  url: string
  title: string
  content: string
  emails: string[]
}

export class DomainClassifierTool implements AgentTool<
  DomainClassifierParams,
  DomainClassification
> {
  name = 'classify_domain'
  description = `Classify a website to determine if it's a potential lead. Analyzes the URL, title, and content to categorize as: real_business, directory, competitor, spam, email_seller, or unknown.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The website URL'
      },
      title: {
        type: 'string',
        description: 'The page title'
      },
      content: {
        type: 'string',
        description: 'The page content (text excerpt)'
      },
      emails: {
        type: 'array',
        description: 'Emails found on the page',
        items: { type: 'string', description: 'Email address' }
      }
    },
    required: ['url', 'title', 'content']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    params: DomainClassifierParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ToolContext
  ): Promise<ToolResult<DomainClassification>> {
    const { url, title, content, emails = [] } = params
    const combined = `${url} ${title} ${content}`.toLowerCase()

    // Directory patterns
    const directoryPatterns = [
      'directory',
      'listing',
      'yellow pages',
      'business list',
      'find businesses',
      'local businesses',
      'yelp',
      'yellowpages',
      'manta.com',
      'bbb.org',
      'chamberofcommerce'
    ]

    // Email seller patterns
    const emailSellerPatterns = [
      'email list',
      'buy email',
      'email database',
      'leads for sale',
      'contact list',
      'b2b leads',
      'sales leads',
      'marketing list',
      'bulk email',
      'email marketing list'
    ]

    // Competitor patterns (web dev / software agencies)
    const competitorPatterns = [
      'web development agency',
      'software development company',
      'digital agency',
      'we build websites',
      'we develop apps',
      'our services include web',
      'mobile app development company',
      'hire developers',
      'outsourcing',
      'offshore development'
    ]

    // Spam patterns
    const spamPatterns = [
      'casino',
      'gambling',
      'adult',
      'porn',
      'viagra',
      'cialis',
      'crypto scam',
      'get rich',
      'mlm',
      'pyramid'
    ]

    // Check patterns
    if (spamPatterns.some((p) => combined.includes(p))) {
      return {
        success: true,
        data: {
          category: 'spam',
          confidence: 0.9,
          reasoning: 'Content matches spam patterns',
          isGoodLead: false
        }
      }
    }

    if (emailSellerPatterns.some((p) => combined.includes(p))) {
      return {
        success: true,
        data: {
          category: 'email_seller',
          confidence: 0.85,
          reasoning: 'Site appears to sell email lists or leads',
          isGoodLead: false
        }
      }
    }

    if (directoryPatterns.some((p) => combined.includes(p))) {
      return {
        success: true,
        data: {
          category: 'directory',
          confidence: 0.8,
          reasoning: 'Site is a business directory, not an actual business',
          isGoodLead: false
        }
      }
    }

    if (competitorPatterns.some((p) => combined.includes(p))) {
      return {
        success: true,
        data: {
          category: 'competitor',
          confidence: 0.75,
          reasoning: 'Site appears to be a competitor (web/software agency)',
          isGoodLead: false
        }
      }
    }

    // Positive signals for real business
    const businessSignals = [
      'about us',
      'our team',
      'contact us',
      'our services',
      'our products',
      'established',
      'years of experience',
      'family owned',
      'locally owned',
      'serving'
    ]

    const hasBusinessSignals = businessSignals.some((p) => combined.includes(p))
    const hasEmails = emails.length > 0

    if (hasBusinessSignals || hasEmails) {
      return {
        success: true,
        data: {
          category: 'real_business',
          confidence: hasBusinessSignals && hasEmails ? 0.85 : 0.65,
          reasoning: `Site appears to be a real business${hasEmails ? ' with contact emails' : ''}`,
          isGoodLead: true
        }
      }
    }

    return {
      success: true,
      data: {
        category: 'unknown',
        confidence: 0.5,
        reasoning: 'Unable to determine category with confidence',
        isGoodLead: false
      }
    }
  }
}

export const domainClassifierTool = new DomainClassifierTool()
