/**
 * Email Verifier Tool - Verify email deliverability and quality
 *
 * Uses free methods: MX record validation, disposable email detection,
 * syntax validation, and domain verification.
 *
 * 2025 Best Practice: Multi-layer verification without paid APIs
 */

import { promises as dns } from 'dns'
import type {
  AgentTool,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
  EmailVerificationResult
} from './types'

export interface EmailVerifierParams {
  email: string
  checkDeep?: boolean
}

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  '10minutemail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'trashmail.com',
  'mailnesia.com',
  'tempail.com',
  'throwawaymail.com',
  'yopmail.com',
  'getairmail.com',
  'mohmal.com',
  'emailondeck.com',
  'getnada.com',
  'tempr.email',
  'discard.email',
  'maildrop.cc',
  'mintemail.com',
  'mt2009.com',
  'tempsky.com',
  'spamgourmet.com',
  'mytrashmail.com',
  'mailcatch.com',
  'spamobox.com',
  'incognitomail.org',
  'anonymbox.com',
  'spambog.com',
  'mailexpire.com',
  'spamfree24.org',
  'jetable.org',
  'kasmail.com',
  'spambox.us',
  'trashymail.com',
  'mailnull.com',
  'e4ward.com',
  'spamex.com',
  'lroid.com',
  'inboxalias.com',
  'spamherelots.com',
  'mailfence.com',
  'sofimail.com',
  'boun.cr',
  'tempmailaddress.com',
  'tmpmail.org',
  'tmpmail.net',
  'tempomail.fr',
  'dispostable.com',
  'fakemailgenerator.com',
  'mailforspam.com',
  'tempemail.net',
  'tempmailo.com',
  'burnermail.io',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'spam4.me'
])

const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'fastmail.com',
  'tutanota.com',
  'hushmail.com',
  'inbox.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
  'googlemail.com'
])

const ROLE_BASED_PREFIXES = [
  'info',
  'contact',
  'support',
  'help',
  'sales',
  'admin',
  'office',
  'hello',
  'team',
  'enquiries',
  'inquiries',
  'general',
  'mail',
  'noreply',
  'no-reply',
  'webmaster',
  'postmaster',
  'abuse',
  'billing',
  'marketing',
  'hr',
  'jobs',
  'careers',
  'press',
  'media',
  'legal',
  'compliance',
  'privacy',
  'security',
  'feedback',
  'newsletter',
  'subscribe',
  'orders'
]

export class EmailVerifierTool implements AgentTool<EmailVerifierParams, EmailVerificationResult> {
  name = 'verify_email'
  description = `Verify an email address for deliverability and quality. Checks MX records, disposable domains, syntax, and role-based detection. Returns verification status and risk score.`

  parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address to verify'
      },
      checkDeep: {
        type: 'boolean',
        description: 'Whether to perform deep MX record verification (default: true)'
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
    params: EmailVerifierParams,
    context: ToolContext
  ): Promise<ToolResult<EmailVerificationResult>> {
    const { email, checkDeep = true } = params

    if (!email || !email.includes('@')) {
      return {
        success: true,
        data: {
          isValid: false,
          isDeliverable: false,
          isMxValid: false,
          isDisposable: false,
          isRoleBased: false,
          isFreeProvider: false,
          riskScore: 100,
          verificationStatus: 'invalid',
          reasoning: 'Invalid email format - missing @ symbol'
        }
      }
    }

    const emailLower = email.toLowerCase().trim()
    const [localPart, domain] = emailLower.split('@')

    if (!localPart || !domain || !domain.includes('.')) {
      return {
        success: true,
        data: {
          isValid: false,
          isDeliverable: false,
          isMxValid: false,
          isDisposable: false,
          isRoleBased: false,
          isFreeProvider: false,
          riskScore: 100,
          verificationStatus: 'invalid',
          reasoning: 'Invalid email format - malformed domain'
        }
      }
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const isValidSyntax = emailRegex.test(emailLower)

    if (!isValidSyntax) {
      return {
        success: true,
        data: {
          isValid: false,
          isDeliverable: false,
          isMxValid: false,
          isDisposable: false,
          isRoleBased: false,
          isFreeProvider: false,
          riskScore: 100,
          verificationStatus: 'invalid',
          reasoning: 'Invalid email syntax'
        }
      }
    }

    const isDisposable = DISPOSABLE_DOMAINS.has(domain) || this.looksDisposable(domain)
    const isFreeProvider = FREE_EMAIL_PROVIDERS.has(domain)
    const isRoleBased = ROLE_BASED_PREFIXES.some(
      (prefix) =>
        localPart === prefix ||
        localPart.startsWith(prefix + '.') ||
        localPart.startsWith(prefix + '-')
    )

    let isMxValid = false
    let mxRecords: string[] = []
    let provider: string | undefined

    if (checkDeep) {
      try {
        const mxResult = await dns.resolveMx(domain)
        if (mxResult && mxResult.length > 0) {
          isMxValid = true
          mxRecords = mxResult.sort((a, b) => a.priority - b.priority).map((mx) => mx.exchange)

          const primaryMx = mxRecords[0]?.toLowerCase() || ''
          if (primaryMx.includes('google') || primaryMx.includes('gmail')) {
            provider = 'Google Workspace'
          } else if (primaryMx.includes('outlook') || primaryMx.includes('microsoft')) {
            provider = 'Microsoft 365'
          } else if (primaryMx.includes('zoho')) {
            provider = 'Zoho'
          } else if (primaryMx.includes('proton')) {
            provider = 'ProtonMail'
          }
        }
      } catch {
        isMxValid = false
      }
    } else {
      isMxValid = true
    }

    let riskScore = 0
    const riskFactors: string[] = []

    if (!isMxValid) {
      riskScore += 50
      riskFactors.push('No valid MX records')
    }

    if (isDisposable) {
      riskScore += 40
      riskFactors.push('Disposable email domain')
    }

    if (isFreeProvider) {
      riskScore += 10
      riskFactors.push('Free email provider (less likely to be decision-maker)')
    }

    if (isRoleBased) {
      riskScore += 5
      riskFactors.push('Role-based email (may not reach decision-maker)')
    }

    if (localPart.length < 3) {
      riskScore += 10
      riskFactors.push('Very short local part')
    }

    if (/\d{4,}/.test(localPart)) {
      riskScore += 5
      riskFactors.push('Contains long number sequence')
    }

    riskScore = Math.min(riskScore, 100)

    let verificationStatus: EmailVerificationResult['verificationStatus']
    if (!isMxValid || isDisposable) {
      verificationStatus = 'invalid'
    } else if (riskScore >= 50) {
      verificationStatus = 'risky'
    } else if (riskScore < 25 && isMxValid) {
      verificationStatus = 'verified'
    } else {
      verificationStatus = 'unverified'
    }

    const isDeliverable = isMxValid && !isDisposable

    context.emitEvent({
      type: 'status',
      content: `Email ${email}: ${verificationStatus} (risk: ${riskScore}/100)`,
      timestamp: Date.now(),
      metadata: { email, verificationStatus, riskScore }
    })

    return {
      success: true,
      data: {
        isValid: isValidSyntax,
        isDeliverable,
        isMxValid,
        isDisposable,
        isRoleBased,
        isFreeProvider,
        riskScore,
        provider,
        mxRecords: mxRecords.slice(0, 3),
        verificationStatus,
        reasoning:
          riskFactors.length > 0
            ? `Risk factors: ${riskFactors.join(', ')}`
            : 'Email passed all verification checks'
      }
    }
  }

  private looksDisposable(domain: string): boolean {
    const disposableKeywords = [
      'temp',
      'trash',
      'throw',
      'fake',
      'spam',
      'junk',
      'disposable',
      'burner',
      'guerrilla',
      'mailinator',
      '10minute',
      'minute'
    ]
    const domainLower = domain.toLowerCase()
    return disposableKeywords.some((kw) => domainLower.includes(kw))
  }
}

export const emailVerifierTool = new EmailVerifierTool()
