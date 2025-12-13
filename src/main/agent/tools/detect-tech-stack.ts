/**
 * Detect Tech Stack Tool - Analyze website technology stack
 *
 * 2025 Best Practice: Free technology detection from HTML analysis
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  TechStackResult,
  TechnologyDetail
} from './types'

export interface DetectTechStackParams {
  url: string
  content: string
  html?: string
}

interface TechPattern {
  name: string
  category: TechnologyDetail['category']
  patterns: RegExp[]
  isOutdated?: boolean
  version?: RegExp
}

const TECH_PATTERNS: TechPattern[] = [
  { name: 'WordPress', category: 'cms', patterns: [/wp-content/i, /wp-includes/i, /wordpress/i] },
  { name: 'Shopify', category: 'ecommerce', patterns: [/shopify/i, /cdn\.shopify/i] },
  { name: 'Wix', category: 'cms', patterns: [/wix\.com/i, /wixstatic/i] },
  { name: 'Squarespace', category: 'cms', patterns: [/squarespace/i, /sqsp/i] },
  { name: 'Webflow', category: 'cms', patterns: [/webflow/i] },
  { name: 'Drupal', category: 'cms', patterns: [/drupal/i, /sites\/all\/themes/i] },
  { name: 'Joomla', category: 'cms', patterns: [/joomla/i, /\/components\/com_/i] },
  {
    name: 'React',
    category: 'framework',
    patterns: [/react/i, /_reactRootContainer/i, /data-reactroot/i]
  },
  { name: 'Vue.js', category: 'framework', patterns: [/vue\.js/i, /vue\.min\.js/i, /data-v-/i] },
  { name: 'Angular', category: 'framework', patterns: [/angular/i, /ng-version/i, /ng-app/i] },
  { name: 'Next.js', category: 'framework', patterns: [/__next/i, /_next\/static/i, /next\.js/i] },
  { name: 'Gatsby', category: 'framework', patterns: [/gatsby/i, /___gatsby/i] },
  { name: 'jQuery', category: 'framework', patterns: [/jquery/i], isOutdated: true },
  { name: 'Bootstrap', category: 'framework', patterns: [/bootstrap/i] },
  { name: 'Tailwind CSS', category: 'framework', patterns: [/tailwind/i] },
  {
    name: 'Google Analytics',
    category: 'analytics',
    patterns: [/google-analytics/i, /gtag/i, /ga\.js/i, /analytics\.js/i]
  },
  {
    name: 'Google Tag Manager',
    category: 'analytics',
    patterns: [/googletagmanager/i, /gtm\.js/i]
  },
  {
    name: 'Facebook Pixel',
    category: 'analytics',
    patterns: [/facebook\.net\/.*\/fbevents/i, /connect\.facebook/i]
  },
  { name: 'Hotjar', category: 'analytics', patterns: [/hotjar/i] },
  { name: 'Mixpanel', category: 'analytics', patterns: [/mixpanel/i] },
  { name: 'WooCommerce', category: 'ecommerce', patterns: [/woocommerce/i, /wc-/i] },
  { name: 'Magento', category: 'ecommerce', patterns: [/magento/i, /mage\//i] },
  { name: 'BigCommerce', category: 'ecommerce', patterns: [/bigcommerce/i] },
  { name: 'PHP', category: 'language', patterns: [/\.php/i] },
  { name: 'ASP.NET', category: 'language', patterns: [/\.aspx/i, /asp\.net/i, /__VIEWSTATE/i] },
  { name: 'Ruby on Rails', category: 'language', patterns: [/rails/i, /csrf-token/i] },
  { name: 'Node.js', category: 'language', patterns: [/express/i, /node/i] },
  { name: 'Cloudflare', category: 'hosting', patterns: [/cloudflare/i, /cf-ray/i] },
  { name: 'AWS', category: 'hosting', patterns: [/amazonaws/i, /aws/i] },
  { name: 'Vercel', category: 'hosting', patterns: [/vercel/i, /\.vercel\.app/i] },
  { name: 'Netlify', category: 'hosting', patterns: [/netlify/i] },
  { name: 'GoDaddy', category: 'hosting', patterns: [/godaddy/i] },
  { name: 'Bluehost', category: 'hosting', patterns: [/bluehost/i] },
  { name: 'Flash', category: 'other', patterns: [/\.swf/i, /shockwave-flash/i], isOutdated: true },
  {
    name: 'Table Layout',
    category: 'other',
    patterns: [/<table[^>]*width=/i, /<td[^>]*bgcolor=/i],
    isOutdated: true
  }
]

const OUTDATED_INDICATORS = [
  {
    pattern: /copyright\s*(?:©|\(c\))?\s*20(?:1[0-8]|0\d)/i,
    reason: 'Copyright date from 2018 or earlier'
  },
  { pattern: /jquery[-.]?1\./i, reason: 'jQuery 1.x (outdated)' },
  { pattern: /bootstrap[-.]?[23]\./i, reason: 'Bootstrap 2.x or 3.x (outdated)' },
  { pattern: /<table[^>]*cellpadding/i, reason: 'Table-based layout (outdated)' },
  { pattern: /<font\s/i, reason: 'Font tags (outdated HTML)' },
  { pattern: /<center>/i, reason: 'Center tags (outdated HTML)' },
  { pattern: /IE\s*[678]/i, reason: 'IE6/7/8 compatibility code' }
]

export class DetectTechStackTool implements AgentTool<DetectTechStackParams, TechStackResult> {
  name = 'detect_tech_stack'
  description = `Analyze a webpage to detect its technology stack. Identifies CMS, frameworks, analytics, and hosting. Also detects outdated technologies that may indicate a need for modernization.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The website URL'
      },
      content: {
        type: 'string',
        description: 'The page content (text or HTML)'
      },
      html: {
        type: 'string',
        description: 'Optional: raw HTML for deeper analysis'
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
    params: DetectTechStackParams,
    context: ToolContext
  ): Promise<ToolResult<TechStackResult>> {
    const { url, content, html } = params
    const searchContent = `${url} ${content} ${html || ''}`

    const technologies: TechnologyDetail[] = []
    const detectedNames = new Set<string>()

    for (const tech of TECH_PATTERNS) {
      if (detectedNames.has(tech.name)) continue

      for (const pattern of tech.patterns) {
        if (pattern.test(searchContent)) {
          detectedNames.add(tech.name)
          technologies.push({
            name: tech.name,
            category: tech.category,
            isOutdated: tech.isOutdated || false,
            confidence: 0.8
          })
          break
        }
      }
    }

    let hasOutdatedTech = technologies.some((t) => t.isOutdated)
    const outdatedReasons: string[] = []

    for (const indicator of OUTDATED_INDICATORS) {
      if (indicator.pattern.test(searchContent)) {
        hasOutdatedTech = true
        outdatedReasons.push(indicator.reason)
      }
    }

    const hasModernStack = technologies.some((t) =>
      ['React', 'Vue.js', 'Angular', 'Next.js', 'Gatsby', 'Tailwind CSS'].includes(t.name)
    )

    const needsUpgrade = hasOutdatedTech && !hasModernStack

    let techFitScore = 50

    if (hasOutdatedTech) {
      techFitScore += 20
    }

    if (!hasModernStack) {
      techFitScore += 15
    }

    if (technologies.some((t) => t.name === 'jQuery' && t.isOutdated)) {
      techFitScore += 10
    }

    if (outdatedReasons.length > 0) {
      techFitScore += Math.min(outdatedReasons.length * 5, 15)
    }

    techFitScore = Math.min(techFitScore, 100)

    const recommendations: string[] = []

    if (hasOutdatedTech) {
      recommendations.push('Website uses outdated technologies - good candidate for modernization')
    }

    if (!hasModernStack && technologies.length > 0) {
      recommendations.push(
        'No modern JavaScript framework detected - potential for React/Next.js upgrade'
      )
    }

    if (
      technologies.some(
        (t) => t.category === 'cms' && ['WordPress', 'Drupal', 'Joomla'].includes(t.name)
      )
    ) {
      recommendations.push(
        'Uses traditional CMS - may benefit from headless CMS or JAMstack migration'
      )
    }

    if (!technologies.some((t) => t.category === 'analytics')) {
      recommendations.push('No analytics detected - opportunity to implement tracking')
    }

    context.emitEvent({
      type: 'status',
      content: `Tech stack analysis: ${technologies.length} technologies detected${needsUpgrade ? ' (upgrade recommended)' : ''}`,
      timestamp: Date.now(),
      metadata: { technologies: technologies.map((t) => t.name), needsUpgrade }
    })

    return {
      success: true,
      data: {
        technologies,
        hasOutdatedTech,
        hasModernStack,
        needsUpgrade,
        techFitScore,
        recommendations
      }
    }
  }
}

export const detectTechStackTool = new DetectTechStackTool()
