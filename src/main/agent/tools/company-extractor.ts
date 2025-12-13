/**
 * Company Extractor Tool - Extract structured company info from page content
 *
 * 2025 Best Practice: Deep extraction for hyper-personalization
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  EnhancedCompanyInfo
} from './types'

export interface CompanyExtractorParams {
  url: string
  title: string
  content: string
  html?: string
}

export class CompanyExtractorTool implements AgentTool<
  CompanyExtractorParams,
  EnhancedCompanyInfo
> {
  name = 'extract_company_info'
  description = `Extract structured company information from a webpage. Returns business name, industry, location, services, size, products, recent news, and signals for hyper-personalized outreach.`

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
        description: 'The page content (text)'
      },
      html: {
        type: 'string',
        description: 'Optional: raw HTML for deeper extraction'
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
    params: CompanyExtractorParams,
    context: ToolContext
  ): Promise<ToolResult<EnhancedCompanyInfo>> {
    const { url, title, content } = params
    const contentLower = content.toLowerCase()

    let name = title.split('|')[0].split('-')[0].split('–')[0].trim()
    if (name.length > 60) name = name.substring(0, 60)

    const industryPatterns: Record<string, string[]> = {
      restaurant: ['restaurant', 'dining', 'food', 'cuisine', 'menu', 'chef'],
      retail: ['shop', 'store', 'retail', 'buy', 'products', 'ecommerce'],
      healthcare: ['health', 'medical', 'clinic', 'doctor', 'patient', 'care'],
      real_estate: ['real estate', 'property', 'homes', 'realty', 'broker'],
      legal: ['law firm', 'attorney', 'lawyer', 'legal'],
      finance: ['financial', 'accounting', 'tax', 'investment', 'wealth'],
      construction: ['construction', 'building', 'contractor', 'renovation'],
      automotive: ['auto', 'car', 'vehicle', 'dealership', 'mechanic'],
      education: ['school', 'education', 'learning', 'academy', 'training'],
      hospitality: ['hotel', 'resort', 'hospitality', 'accommodation'],
      technology: ['software', 'tech', 'saas', 'startup', 'app', 'digital'],
      marketing: ['marketing', 'advertising', 'agency', 'creative', 'branding'],
      manufacturing: ['manufacturing', 'factory', 'production', 'industrial']
    }

    let industry: string | undefined
    for (const [ind, patterns] of Object.entries(industryPatterns)) {
      if (patterns.some((p) => contentLower.includes(p))) {
        industry = ind
        break
      }
    }

    const locationPatterns = [
      /located in ([A-Z][a-zA-Z\s]+)/,
      /serving ([A-Z][a-zA-Z\s]+)/,
      /based in ([A-Z][a-zA-Z\s]+)/,
      /([A-Z][a-zA-Z]+,\s*[A-Z]{2})/,
      /headquarters in ([A-Z][a-zA-Z\s]+)/
    ]

    let location: string | undefined
    for (const pattern of locationPatterns) {
      const match = content.match(pattern)
      if (match) {
        location = match[1].trim()
        break
      }
    }

    const signals: string[] = []
    const signalPatterns: Record<string, string> = {
      outdated_website: 'copyright 2020|copyright 2019|copyright 2018|copyright 2017',
      no_mobile: 'not mobile|desktop only',
      growing_business: 'expanding|growing|new location|hiring|recently opened',
      digital_transformation: 'modernize|digital transformation|upgrade|redesign',
      local_business: 'family owned|locally owned|small business|established',
      needs_web_presence: 'call us|visit us|contact us for|find us at',
      active_hiring: 'careers|we are hiring|join our team|job openings'
    }

    for (const [signal, pattern] of Object.entries(signalPatterns)) {
      if (new RegExp(pattern, 'i').test(content)) {
        signals.push(signal)
      }
    }

    let companySize: EnhancedCompanyInfo['companySize']
    let employeeCount: string | undefined
    const sizePatterns = [
      { pattern: /(\d+)\+?\s*employees/i, multiplier: 1 },
      { pattern: /team of (\d+)/i, multiplier: 1 },
      { pattern: /staff of (\d+)/i, multiplier: 1 }
    ]

    for (const { pattern } of sizePatterns) {
      const match = content.match(pattern)
      if (match) {
        const count = parseInt(match[1])
        employeeCount = match[1]
        if (count <= 10) companySize = 'micro'
        else if (count <= 50) companySize = 'small'
        else if (count <= 250) companySize = 'medium'
        else if (count <= 1000) companySize = 'large'
        else companySize = 'enterprise'
        break
      }
    }

    if (!companySize) {
      if (contentLower.includes('small business') || contentLower.includes('family owned')) {
        companySize = 'small'
      } else if (contentLower.includes('enterprise') || contentLower.includes('global')) {
        companySize = 'enterprise'
      }
    }

    let foundedYear: number | undefined
    let yearsInBusiness: number | undefined
    const yearPatterns = [
      /founded in (\d{4})/i,
      /established (\d{4})/i,
      /since (\d{4})/i,
      /est\.?\s*(\d{4})/i
    ]

    for (const pattern of yearPatterns) {
      const match = content.match(pattern)
      if (match) {
        foundedYear = parseInt(match[1])
        yearsInBusiness = new Date().getFullYear() - foundedYear
        break
      }
    }

    const keyProducts: string[] = []
    const productPatterns = [
      /our (?:products?|services?) include[:\s]+([^.]+)/i,
      /we offer[:\s]+([^.]+)/i,
      /specializ(?:e|ing) in[:\s]+([^.]+)/i
    ]

    for (const pattern of productPatterns) {
      const match = content.match(pattern)
      if (match) {
        const items = match[1]
          .split(/,|and/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2 && s.length < 50)
        keyProducts.push(...items.slice(0, 5))
        break
      }
    }

    let differentiator: string | undefined
    const diffPatterns = [
      /what sets us apart[:\s]+([^.]+)/i,
      /why choose us[:\s]+([^.]+)/i,
      /our difference[:\s]+([^.]+)/i,
      /we are the only[:\s]+([^.]+)/i
    ]

    for (const pattern of diffPatterns) {
      const match = content.match(pattern)
      if (match) {
        differentiator = match[1].trim().substring(0, 150)
        break
      }
    }

    const painIndicators: string[] = []
    const painPatterns: Record<string, string> = {
      slow_website: 'page load|slow|optimize',
      poor_mobile: 'mobile friendly|responsive|mobile version',
      outdated_design: 'modern|refresh|update|new look',
      no_online_booking: 'call to book|phone to schedule|contact for appointment',
      no_ecommerce: 'visit our store|in-store only|come see us'
    }

    for (const [pain, pattern] of Object.entries(painPatterns)) {
      if (new RegExp(pattern, 'i').test(content)) {
        painIndicators.push(pain)
      }
    }

    const socialProfiles: EnhancedCompanyInfo['socialProfiles'] = {}
    if (contentLower.includes('linkedin.com') || contentLower.includes('linkedin')) {
      socialProfiles.linkedin = 'detected'
    }
    if (
      contentLower.includes('twitter.com') ||
      contentLower.includes('twitter') ||
      contentLower.includes('x.com')
    ) {
      socialProfiles.twitter = 'detected'
    }
    if (contentLower.includes('facebook.com') || contentLower.includes('facebook')) {
      socialProfiles.facebook = 'detected'
    }

    const summary = `${name} is a ${companySize || ''} ${industry || 'business'}${location ? ` in ${location}` : ''}${yearsInBusiness ? ` (${yearsInBusiness} years)` : ''}. ${signals.length > 0 ? `Signals: ${signals.join(', ')}.` : ''} ${keyProducts.length > 0 ? `Offers: ${keyProducts.slice(0, 3).join(', ')}.` : ''}`

    context.emitEvent({
      type: 'status',
      content: `Extracted company info: ${name}${industry ? ` (${industry})` : ''}`,
      timestamp: Date.now(),
      metadata: { companyName: name, industry, signals: signals.length }
    })

    return {
      success: true,
      data: {
        name,
        industry,
        location,
        website: url,
        signals,
        summary: summary.trim(),
        companySize,
        employeeCount,
        yearsInBusiness,
        foundedYear,
        keyProducts,
        differentiator,
        painIndicators,
        socialProfiles: Object.keys(socialProfiles).length > 0 ? socialProfiles : undefined
      }
    }
  }
}

export const companyExtractorTool = new CompanyExtractorTool()
