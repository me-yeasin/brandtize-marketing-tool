/**
 * Lead Enrichment Service
 * Auto-verify WhatsApp, verify email, and find email for leads
 */

import { getHunterApiKeys, getReoonApiKeys, getSnovApiKeys } from '../../store'
import { verifyEmailWithRapidVerifier, verifyEmailWithReoon } from '../lead-generation'
import { checkWhatsAppNumber, getWhatsAppStatus } from '../whatsapp-service'
import { AgentLead } from './types'

export interface EnrichmentResult {
  hasWhatsApp?: boolean
  emailVerified?: boolean
  email?: string
  enrichmentLog?: string
}

/**
 * Enrich lead with WhatsApp verification
 * Returns true if phone has WhatsApp, false otherwise
 */
export async function enrichLeadWithWhatsApp(lead: AgentLead): Promise<EnrichmentResult> {
  if (!lead.phone) {
    return { enrichmentLog: 'No phone number to verify' }
  }

  const status = getWhatsAppStatus()
  if (!status.isReady) {
    return { enrichmentLog: 'WhatsApp not connected' }
  }

  try {
    console.log(`[Enrichment] Verifying WhatsApp for: ${lead.phone}`)
    const result = await checkWhatsAppNumber(lead.phone)

    return {
      hasWhatsApp: result.hasWhatsApp,
      enrichmentLog: result.hasWhatsApp
        ? `✅ WhatsApp verified: ${lead.phone}`
        : `❌ No WhatsApp: ${lead.phone}`
    }
  } catch (error) {
    console.error('[Enrichment] WhatsApp check failed:', error)
    return { enrichmentLog: `WhatsApp check failed: ${error}` }
  }
}

/**
 * Enrich lead with email verification
 * Verifies if email is valid using Reoon/Rapid verifier
 */
export async function enrichLeadWithEmailVerification(lead: AgentLead): Promise<EnrichmentResult> {
  if (!lead.email) {
    return { enrichmentLog: 'No email to verify' }
  }

  try {
    console.log(`[Enrichment] Verifying email: ${lead.email}`)

    // Try Reoon first
    const reoonResult = await verifyEmailWithReoon(lead.email)

    if (reoonResult.verified !== undefined) {
      return {
        emailVerified: reoonResult.verified,
        enrichmentLog: reoonResult.verified
          ? `✅ Email verified (Reoon): ${lead.email}`
          : `❌ Email invalid (Reoon): ${lead.email}`
      }
    }

    // Fallback to Rapid Verifier
    const rapidResult = await verifyEmailWithRapidVerifier(lead.email)

    return {
      emailVerified: rapidResult,
      enrichmentLog: rapidResult
        ? `✅ Email verified (Rapid): ${lead.email}`
        : `❌ Email invalid (Rapid): ${lead.email}`
    }
  } catch (error) {
    console.error('[Enrichment] Email verification failed:', error)
    return { enrichmentLog: `Email verification failed: ${error}` }
  }
}

/**
 * Extract domain from website URL
 */
function extractDomain(website: string): string | null {
  try {
    let url = website
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    return null
  }
}

/**
 * Enrich lead by finding and verifying email from website
 * Uses Hunter.io/Snov.io to find email, then verifies it
 */
export async function enrichLeadWithEmailFinder(lead: AgentLead): Promise<EnrichmentResult> {
  // Skip if already has email
  if (lead.email) {
    return { enrichmentLog: 'Lead already has email' }
  }

  // Need website to find email
  if (!lead.website) {
    return { enrichmentLog: 'No website to find email from' }
  }

  const domain = extractDomain(lead.website)
  if (!domain) {
    return { enrichmentLog: 'Invalid website URL' }
  }

  try {
    console.log(`[Enrichment] Finding email for domain: ${domain}`)

    // Import dynamically to avoid circular deps
    const { findEmailWithFallback } = await import('../lead-generation')

    // Try to find email
    const result = await findEmailWithFallback(domain, undefined, undefined)

    if (!result.email) {
      return { enrichmentLog: `No email found for ${domain}` }
    }

    console.log(`[Enrichment] Found email: ${result.email}, now verifying...`)

    // Verify the found email
    const verifyResult = await verifyEmailWithReoon(result.email)
    const verified = verifyResult.verified ?? false

    return {
      email: result.email,
      emailVerified: verified,
      enrichmentLog: verified
        ? `✅ Found and verified: ${result.email}`
        : `⚠️ Found but unverified: ${result.email}`
    }
  } catch (error) {
    console.error('[Enrichment] Email finder failed:', error)
    return { enrichmentLog: `Email finder failed: ${error}` }
  }
}

/**
 * Check if WhatsApp service is available
 */
export function isWhatsAppAvailable(): boolean {
  const status = getWhatsAppStatus()
  return status.isReady
}

/**
 * Check if email verification API keys are configured
 */
export function isEmailVerificationAvailable(): boolean {
  const reoonKeys = getReoonApiKeys()
  return reoonKeys.length > 0
}

/**
 * Check if email finder API keys are configured
 */
export function isEmailFinderAvailable(): boolean {
  const hunterKeys = getHunterApiKeys()
  const snovKeys = getSnovApiKeys()
  return hunterKeys.length > 0 || snovKeys.length > 0
}
