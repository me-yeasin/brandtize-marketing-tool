/**
 * URL Policy Tool - Validate URLs before fetching
 */

import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult
} from './types'

export interface UrlPolicyParams {
  url: string
}

export interface UrlPolicyData {
  allowed: boolean
  reason?: string
  normalizedUrl: string
}

const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '192.168.',
  '10.',
  '172.16.',
  'sentry.io',
  'analytics.',
  'tracking.',
  'ads.',
  'doubleclick.',
  'facebook.com/tr',
  'google-analytics.com'
]

const BLOCKED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.rar',
  '.exe',
  '.dmg',
  '.pkg',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.wav'
]

export class UrlPolicyTool implements AgentTool<UrlPolicyParams, UrlPolicyData> {
  name = 'url_policy_check'
  description = `Check if a URL is safe and allowed to be fetched. Use this before fetching any URL to ensure it's not blocked or potentially harmful.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to validate'
      }
    },
    required: ['url']
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }

  async execute(
    params: UrlPolicyParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ToolContext
  ): Promise<ToolResult<UrlPolicyData>> {
    const { url } = params

    if (!url || !url.trim()) {
      return {
        success: true,
        data: {
          allowed: false,
          reason: 'URL is empty',
          normalizedUrl: ''
        }
      }
    }

    const normalizedUrl = url.trim().toLowerCase()

    // Check protocol
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      return {
        success: true,
        data: {
          allowed: false,
          reason: 'URL must use http:// or https:// protocol',
          normalizedUrl
        }
      }
    }

    // Check blocked domains
    for (const blocked of BLOCKED_DOMAINS) {
      if (normalizedUrl.includes(blocked)) {
        return {
          success: true,
          data: {
            allowed: false,
            reason: `Domain is blocked: ${blocked}`,
            normalizedUrl
          }
        }
      }
    }

    // Check blocked extensions
    try {
      const urlObj = new URL(normalizedUrl)
      const pathname = urlObj.pathname.toLowerCase()

      for (const ext of BLOCKED_EXTENSIONS) {
        if (pathname.endsWith(ext)) {
          return {
            success: true,
            data: {
              allowed: false,
              reason: `File type not allowed: ${ext}`,
              normalizedUrl
            }
          }
        }
      }
    } catch {
      return {
        success: true,
        data: {
          allowed: false,
          reason: 'Invalid URL format',
          normalizedUrl
        }
      }
    }

    return {
      success: true,
      data: {
        allowed: true,
        normalizedUrl
      }
    }
  }
}

export const urlPolicyTool = new UrlPolicyTool()
