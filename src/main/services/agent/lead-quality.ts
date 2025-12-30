import { AgentLead } from './types'

export type LeadScore = 'gold' | 'silver' | 'bronze'

/**
 * Calculate lead quality score based on business attributes
 * Higher scores indicate leads more likely to need marketing services
 */
export function calculateLeadScore(lead: AgentLead): LeadScore {
  let score = 0

  // No website = +3 (they NEED digital marketing services!)
  if (!lead.website) {
    score += 3
  }

  // Has email = +2 (easy to contact)
  if (lead.email) {
    score += 2
  }

  // Has phone = +1 (can call/WhatsApp)
  if (lead.phone) {
    score += 1
  }

  // High rating = +1 (established business)
  if (lead.rating && lead.rating >= 4.5) {
    score += 1
  }

  // Many reviews = +1 (active business)
  if (lead.reviewCount && lead.reviewCount >= 50) {
    score += 1
  }

  // Has WhatsApp = +1 (easy messaging)
  if (lead.hasWhatsApp) {
    score += 1
  }

  // Scoring thresholds
  if (score >= 5) return 'gold'
  if (score >= 3) return 'silver'
  return 'bronze'
}

/**
 * Normalize phone number for comparison
 * Removes all non-numeric characters
 */
export function normalizePhone(phone: string | undefined): string {
  if (!phone) return ''
  return phone.replace(/[^0-9]/g, '').slice(-10) // Last 10 digits
}

/**
 * Normalize email for comparison
 * Lowercase and trim
 */
export function normalizeEmail(email: string | undefined): string {
  if (!email) return ''
  return email.toLowerCase().trim()
}

/**
 * Create a unique key for a lead for deduplication
 * Uses phone > email > (name+address) priority
 */
export function getLeadKey(lead: AgentLead): string {
  const phone = normalizePhone(lead.phone)
  if (phone.length >= 7) {
    return `phone:${phone}`
  }

  const email = normalizeEmail(lead.email)
  if (email.length > 0) {
    return `email:${email}`
  }

  // Fallback to name + address
  const name = lead.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
  const address = (lead.address || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
  return `name:${name}:${address.slice(0, 20)}`
}

/**
 * Remove duplicate leads from a batch
 * Also filters against existing leads
 */
export function deduplicateLeads(
  newLeads: AgentLead[],
  existingKeys: Set<string>
): { uniqueLeads: AgentLead[]; duplicateCount: number } {
  const uniqueLeads: AgentLead[] = []
  let duplicateCount = 0

  for (const lead of newLeads) {
    const key = getLeadKey(lead)

    if (existingKeys.has(key)) {
      duplicateCount++
      console.log(`[Dedup] Duplicate found: ${lead.name} (${key})`)
    } else {
      existingKeys.add(key) // Add to set for future checks
      uniqueLeads.push(lead)
    }
  }

  return { uniqueLeads, duplicateCount }
}

/**
 * Sort leads by score (gold first, then silver, then bronze)
 */
export function sortLeadsByScore(leads: AgentLead[]): AgentLead[] {
  const scoreOrder = { gold: 0, silver: 1, bronze: 2 }

  return [...leads].sort((a, b) => {
    const aScore = (a.metadata?.score as LeadScore) || 'bronze'
    const bScore = (b.metadata?.score as LeadScore) || 'bronze'
    return scoreOrder[aScore] - scoreOrder[bScore]
  })
}
