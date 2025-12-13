/**
 * Detect Hiring Intent Tool - Analyze hiring signals from website
 *
 * 2025 Best Practice: Detect hiring intent as a strong buying signal
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  HiringIntentResult,
  JobPosting
} from './types'

export interface DetectHiringIntentParams {
  url: string
  content: string
  services?: string[]
}

const TECH_JOB_KEYWORDS = [
  'developer',
  'engineer',
  'programmer',
  'software',
  'web',
  'frontend',
  'backend',
  'full-stack',
  'fullstack',
  'mobile',
  'ios',
  'android',
  'react',
  'angular',
  'vue',
  'node',
  'python',
  'java',
  'php',
  'designer',
  'ui',
  'ux',
  'product',
  'devops',
  'cloud',
  'aws',
  'data',
  'analyst',
  'scientist',
  'machine learning',
  'ai',
  'it',
  'technical',
  'technology',
  'digital',
  'ecommerce'
]

const HIRING_INDICATORS = [
  /we are hiring/i,
  /join our team/i,
  /careers/i,
  /job openings/i,
  /open positions/i,
  /work with us/i,
  /looking for/i,
  /seeking/i,
  /hiring now/i,
  /apply now/i,
  /job opportunities/i,
  /employment/i,
  /vacancies/i
]

export class DetectHiringIntentTool implements AgentTool<
  DetectHiringIntentParams,
  HiringIntentResult
> {
  name = 'detect_hiring_intent'
  description = `Analyze a webpage for hiring signals. Detects job postings, career pages, and hiring language that indicates the company is growing and may need development services.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The website URL'
      },
      content: {
        type: 'string',
        description: 'The page content'
      },
      services: {
        type: 'array',
        description: 'Optional: Your services to match against job postings',
        items: { type: 'string', description: 'Service name' }
      }
    },
    required: ['url', 'content']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    params: DetectHiringIntentParams,
    context: ToolContext
  ): Promise<ToolResult<HiringIntentResult>> {
    const { url, content, services = [] } = params
    const contentLower = content.toLowerCase()
    const urlLower = url.toLowerCase()

    const jobs: JobPosting[] = []
    const relevanceToServices: string[] = []

    const hasCareerPage =
      urlLower.includes('career') ||
      urlLower.includes('job') ||
      urlLower.includes('hiring') ||
      HIRING_INDICATORS.some((pattern) => pattern.test(content))

    const jobTitlePatterns = [
      /(?:hiring|looking for|seeking|need)\s+(?:a\s+)?([a-zA-Z\s]+(?:developer|engineer|designer|manager|specialist|analyst))/gi,
      /(?:job|position|role|opening):\s*([a-zA-Z\s]+)/gi,
      /([a-zA-Z\s]+(?:developer|engineer|designer))\s+(?:wanted|needed|position)/gi
    ]

    for (const pattern of jobTitlePatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const title = match[1].trim()
        if (title.length > 3 && title.length < 50) {
          const isRelevant = TECH_JOB_KEYWORDS.some((kw) => title.toLowerCase().includes(kw))
          let relevanceReason: string | undefined

          if (isRelevant) {
            const matchedKeyword = TECH_JOB_KEYWORDS.find((kw) => title.toLowerCase().includes(kw))
            relevanceReason = `Job involves ${matchedKeyword} - potential need for your services`

            const profileServices = context.profile?.services || services
            for (const service of profileServices) {
              const serviceLower = service.toLowerCase()
              if (
                title.toLowerCase().includes(serviceLower) ||
                serviceLower.includes(matchedKeyword || '')
              ) {
                relevanceToServices.push(service)
              }
            }
          }

          const existingJob = jobs.find((j) => j.title.toLowerCase() === title.toLowerCase())
          if (!existingJob) {
            jobs.push({
              title,
              isRelevant,
              relevanceReason,
              source: url
            })
          }
        }
      }
    }

    for (const keyword of TECH_JOB_KEYWORDS) {
      if (contentLower.includes(keyword) && hasCareerPage) {
        const existingRelevance = jobs.some((j) => j.isRelevant)
        if (!existingRelevance && jobs.length === 0) {
          jobs.push({
            title: `Tech-related position (${keyword})`,
            isRelevant: true,
            relevanceReason: `Career page mentions ${keyword}`,
            source: url
          })
        }
        break
      }
    }

    const hasRelevantJobs = jobs.some((j) => j.isRelevant)

    let hiringIntentScore = 0

    if (hasCareerPage) {
      hiringIntentScore += 30
    }

    if (jobs.length > 0) {
      hiringIntentScore += Math.min(jobs.length * 10, 30)
    }

    if (hasRelevantJobs) {
      hiringIntentScore += 25
    }

    if (relevanceToServices.length > 0) {
      hiringIntentScore += 15
    }

    hiringIntentScore = Math.min(hiringIntentScore, 100)

    context.emitEvent({
      type: 'status',
      content: `Hiring intent: ${hiringIntentScore}/100${hasRelevantJobs ? ' (relevant jobs found)' : ''}`,
      timestamp: Date.now(),
      metadata: { jobs: jobs.length, hasRelevantJobs, hiringIntentScore }
    })

    return {
      success: true,
      data: {
        hasRelevantJobs,
        jobs,
        hiringIntentScore,
        relevanceToServices: [...new Set(relevanceToServices)]
      }
    }
  }
}

export const detectHiringIntentTool = new DetectHiringIntentTool()
