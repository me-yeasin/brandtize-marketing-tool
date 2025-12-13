/**
 * Company Extractor Tool - Extract structured company info from page content
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  CompanyInfo
} from './types'

export interface CompanyExtractorParams {
  url: string
  title: string
  content: string
}

export class CompanyExtractorTool implements AgentTool<CompanyExtractorParams, CompanyInfo> {
  name = 'extract_company_info'
  description = `Extract structured company information from a webpage. Returns business name, industry, location, services, and potential signals that they might need your services.`

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ToolContext
  ): Promise<ToolResult<CompanyInfo>> {
    const { url, title, content } = params
    const contentLower = content.toLowerCase()

    // Extract company name from title
    let name = title.split('|')[0].split('-')[0].split('–')[0].trim()
    if (name.length > 60) name = name.substring(0, 60)

    // Try to detect industry
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
      hospitality: ['hotel', 'resort', 'hospitality', 'accommodation']
    }

    let industry: string | undefined
    for (const [ind, patterns] of Object.entries(industryPatterns)) {
      if (patterns.some((p) => contentLower.includes(p))) {
        industry = ind
        break
      }
    }

    // Try to extract location
    const locationPatterns = [
      /located in ([A-Z][a-zA-Z\s]+)/,
      /serving ([A-Z][a-zA-Z\s]+)/,
      /based in ([A-Z][a-zA-Z\s]+)/,
      /([A-Z][a-zA-Z]+,\s*[A-Z]{2})/
    ]

    let location: string | undefined
    for (const pattern of locationPatterns) {
      const match = content.match(pattern)
      if (match) {
        location = match[1].trim()
        break
      }
    }

    // Detect signals they might need services
    const signals: string[] = []
    const signalPatterns: Record<string, string> = {
      outdated_website: 'copyright 2020|copyright 2019|copyright 2018',
      no_mobile: 'not mobile|desktop only',
      growing_business: 'expanding|growing|new location|hiring',
      digital_transformation: 'modernize|digital transformation|upgrade',
      local_business: 'family owned|locally owned|small business'
    }

    for (const [signal, pattern] of Object.entries(signalPatterns)) {
      if (new RegExp(pattern, 'i').test(content)) {
        signals.push(signal)
      }
    }

    // Create summary
    const summary = `${name} is a ${industry || 'business'}${location ? ` in ${location}` : ''}. ${signals.length > 0 ? `Signals: ${signals.join(', ')}` : ''}`

    return {
      success: true,
      data: {
        name,
        industry,
        location,
        website: url,
        signals,
        summary: summary.trim()
      }
    }
  }
}

export const companyExtractorTool = new CompanyExtractorTool()
