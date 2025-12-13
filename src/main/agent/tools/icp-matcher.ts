/**
 * ICP Matcher Tool - Match leads against Ideal Customer Profile
 *
 * 2025 Best Practice: Score leads against your defined services and ICP
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  ICPMatchResult,
  EnhancedCompanyInfo
} from './types'

export interface ICPMatcherParams {
  companyInfo: EnhancedCompanyInfo
  services?: string[]
}

const INDUSTRY_SERVICE_MAP: Record<string, string[]> = {
  restaurant: ['website', 'web', 'online ordering', 'mobile app', 'digital menu'],
  retail: ['ecommerce', 'web', 'mobile app', 'inventory', 'pos'],
  healthcare: ['web', 'patient portal', 'telemedicine', 'mobile app', 'booking'],
  real_estate: ['web', 'property listing', 'mobile app', 'crm'],
  legal: ['web', 'client portal', 'document management'],
  finance: ['web', 'mobile app', 'dashboard', 'reporting', 'security'],
  construction: ['web', 'project management', 'mobile app', 'scheduling'],
  automotive: ['web', 'inventory', 'booking', 'mobile app'],
  education: ['web', 'learning management', 'mobile app', 'student portal'],
  hospitality: ['web', 'booking', 'mobile app', 'guest management']
}

const SIZE_PREFERENCES = {
  micro: 0.6,
  small: 1.0,
  medium: 0.9,
  large: 0.7,
  enterprise: 0.5
}

export class ICPMatcherTool implements AgentTool<ICPMatcherParams, ICPMatchResult> {
  name = 'match_icp'
  description = `Match a company against your Ideal Customer Profile. Scores how well the company fits your services and target market. Returns match score and recommendations.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      companyInfo: {
        type: 'object',
        description: 'Company information from extract_company_info tool'
      },
      services: {
        type: 'array',
        description: 'Optional: Override profile services for matching',
        items: { type: 'string', description: 'Service name' }
      }
    },
    required: ['companyInfo']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    params: ICPMatcherParams,
    context: ToolContext
  ): Promise<ToolResult<ICPMatchResult>> {
    const { companyInfo, services } = params
    const profileServices = services || context.profile?.services || []

    let matchScore = 0
    const matchedServices: string[] = []
    const gapAnalysis: string[] = []
    const reasoningParts: string[] = []

    const companyContent = [
      companyInfo.name,
      companyInfo.industry,
      companyInfo.summary,
      ...(companyInfo.keyProducts || []),
      ...(companyInfo.keyServices || []),
      ...(companyInfo.signals || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    for (const service of profileServices) {
      const serviceLower = service.toLowerCase()
      const serviceKeywords = serviceLower.split(/\s+/).filter((w) => w.length > 3)

      const directMatch = companyContent.includes(serviceLower)
      const keywordMatch = serviceKeywords.some((kw) => companyContent.includes(kw))

      if (directMatch) {
        matchScore += 15
        matchedServices.push(service)
        reasoningParts.push(`Direct match: ${service}`)
      } else if (keywordMatch) {
        matchScore += 8
        matchedServices.push(service)
        reasoningParts.push(`Keyword match: ${service}`)
      }
    }

    let matchedIndustry = false
    if (companyInfo.industry) {
      const industryNeeds = INDUSTRY_SERVICE_MAP[companyInfo.industry] || []

      for (const need of industryNeeds) {
        const needLower = need.toLowerCase()
        for (const service of profileServices) {
          if (
            service.toLowerCase().includes(needLower) ||
            needLower.includes(service.toLowerCase().split(' ')[0])
          ) {
            matchedIndustry = true
            matchScore += 10
            if (!matchedServices.includes(service)) {
              matchedServices.push(service)
            }
            reasoningParts.push(`Industry need match: ${companyInfo.industry} needs ${need}`)
            break
          }
        }
        if (matchedIndustry) break
      }

      if (!matchedIndustry) {
        gapAnalysis.push(`Industry ${companyInfo.industry} may not be ideal target`)
      }
    }

    let matchedSize = false
    if (companyInfo.companySize) {
      const sizeMultiplier = SIZE_PREFERENCES[companyInfo.companySize] || 0.7
      matchScore = Math.round(matchScore * sizeMultiplier)
      matchedSize = sizeMultiplier >= 0.8

      if (matchedSize) {
        matchScore += 10
        reasoningParts.push(`Company size (${companyInfo.companySize}) is ideal`)
      } else {
        gapAnalysis.push(`Company size (${companyInfo.companySize}) may not be ideal`)
      }
    }

    if (companyInfo.signals && companyInfo.signals.length > 0) {
      const signalBonus = Math.min(companyInfo.signals.length * 5, 15)
      matchScore += signalBonus
      reasoningParts.push(`${companyInfo.signals.length} positive signals detected`)
    }

    if (companyInfo.painIndicators && companyInfo.painIndicators.length > 0) {
      matchScore += 10
      reasoningParts.push('Pain indicators suggest need for services')
    }

    matchScore = Math.min(matchScore, 100)

    let recommendation: ICPMatchResult['recommendation']
    if (matchScore >= 70) {
      recommendation = 'ideal'
    } else if (matchScore >= 50) {
      recommendation = 'good'
    } else if (matchScore >= 30) {
      recommendation = 'moderate'
    } else {
      recommendation = 'poor'
    }

    if (matchedServices.length === 0) {
      gapAnalysis.push('No direct service matches found - may need custom pitch')
    }

    const reasoning =
      reasoningParts.length > 0 ? reasoningParts.join('; ') : 'Limited matching data available'

    context.emitEvent({
      type: 'status',
      content: `ICP match: ${matchScore}/100 (${recommendation}) - ${matchedServices.length} services matched`,
      timestamp: Date.now(),
      metadata: { matchScore, recommendation, matchedServices }
    })

    return {
      success: true,
      data: {
        matchScore,
        matchedServices,
        matchedIndustry,
        matchedSize,
        recommendation,
        reasoning,
        gapAnalysis
      }
    }
  }
}

export const icpMatcherTool = new ICPMatcherTool()
