/**
 * Guardrails System
 *
 * Provides safety and quality controls for agents:
 * - Rate limiting
 * - Content safety
 * - Quality gates
 * - Resource management
 */

import {
  GuardrailsConfig,
  GuardrailViolation,
  DEFAULT_GUARDRAILS,
  LeadQualificationChecklist,
  PersonalizationLevel
} from './types'

export class GuardrailsSystem {
  private config: GuardrailsConfig
  private violations: GuardrailViolation[] = []
  private counters = {
    searchCalls: 0,
    fetchCalls: 0,
    leadsEmitted: 0,
    apiCalls: 0,
    tokensUsed: 0
  }
  private startTime: number = Date.now()

  constructor(config?: Partial<GuardrailsConfig>) {
    this.config = { ...DEFAULT_GUARDRAILS, ...config }
  }

  reset(): void {
    this.violations = []
    this.counters = {
      searchCalls: 0,
      fetchCalls: 0,
      leadsEmitted: 0,
      apiCalls: 0,
      tokensUsed: 0
    }
    this.startTime = Date.now()
  }

  // ============================================
  // Rate Limiting
  // ============================================

  canSearch(): { allowed: boolean; reason?: string } {
    const searchesThisMinute = this.counters.searchCalls

    if (searchesThisMinute >= this.config.maxSearchesPerMinute) {
      this.recordViolation('rate_limit', 'Search rate limit exceeded', 'warning')
      return { allowed: false, reason: 'Search rate limit exceeded' }
    }

    if (this.counters.apiCalls >= this.config.maxApiCallsTotal) {
      this.recordViolation('rate_limit', 'Total API calls limit exceeded', 'error')
      return { allowed: false, reason: 'Total API calls limit exceeded' }
    }

    return { allowed: true }
  }

  canFetch(): { allowed: boolean; reason?: string } {
    const fetchesThisMinute = this.counters.fetchCalls

    if (fetchesThisMinute >= this.config.maxFetchesPerMinute) {
      this.recordViolation('rate_limit', 'Fetch rate limit exceeded', 'warning')
      return { allowed: false, reason: 'Fetch rate limit exceeded' }
    }

    return { allowed: true }
  }

  canEmitLead(): { allowed: boolean; reason?: string } {
    if (this.counters.leadsEmitted >= this.config.maxLeadsPerSession) {
      this.recordViolation('rate_limit', 'Max leads per session reached', 'warning')
      return { allowed: false, reason: 'Max leads per session reached' }
    }

    return { allowed: true }
  }

  recordSearch(): void {
    this.counters.searchCalls++
    this.counters.apiCalls++
  }

  recordFetch(): void {
    this.counters.fetchCalls++
    this.counters.apiCalls++
  }

  recordLead(): void {
    this.counters.leadsEmitted++
  }

  recordTokens(count: number): void {
    this.counters.tokensUsed += count
  }

  // ============================================
  // Content Safety
  // ============================================

  checkContent(content: string): { safe: boolean; issues: string[] } {
    const issues: string[] = []

    for (const keyword of this.config.blockedKeywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        issues.push(`Blocked keyword found: ${keyword}`)
      }
    }

    if (issues.length > 0) {
      this.recordViolation('content', issues.join(', '), 'warning')
      return { safe: false, issues }
    }

    return { safe: true, issues: [] }
  }

  sanitizeOutput(content: string): string {
    let sanitized = content

    for (const keyword of this.config.blockedKeywords) {
      const regex = new RegExp(keyword, 'gi')
      sanitized = sanitized.replace(regex, '[REMOVED]')
    }

    return sanitized
  }

  // ============================================
  // Quality Gates
  // ============================================

  checkLeadQuality(
    score: number,
    checklist: LeadQualificationChecklist,
    personalizationLevel: PersonalizationLevel
  ): { passed: boolean; reasons: string[] } {
    const reasons: string[] = []

    // Check minimum score
    if (score < this.config.minLeadScore) {
      reasons.push(`Lead score ${score} below minimum ${this.config.minLeadScore}`)
    }

    // Check required checklist items
    for (const item of this.config.requiredChecklistItems) {
      if (!checklist[item]?.passed) {
        reasons.push(`Required checklist item failed: ${item}`)
      }
    }

    // Check personalization level
    if (personalizationLevel < this.config.minPersonalizationLevel) {
      reasons.push(
        `Personalization level ${personalizationLevel} below minimum ${this.config.minPersonalizationLevel}`
      )
    }

    if (reasons.length > 0) {
      this.recordViolation('quality', reasons.join(', '), 'warning')
      return { passed: false, reasons }
    }

    return { passed: true, reasons: [] }
  }

  // ============================================
  // Resource Management
  // ============================================

  checkTimeout(): { timedOut: boolean; elapsed: number; remaining: number } {
    const elapsed = Date.now() - this.startTime
    const remaining = this.config.maxTotalRuntime - elapsed

    if (elapsed >= this.config.maxTotalRuntime) {
      this.recordViolation('timeout', 'Max runtime exceeded', 'error')
      return { timedOut: true, elapsed, remaining: 0 }
    }

    return { timedOut: false, elapsed, remaining }
  }

  checkResourceAvailable(): boolean {
    const timeout = this.checkTimeout()
    if (timeout.timedOut) return false

    if (this.counters.apiCalls >= this.config.maxApiCallsTotal) return false
    if (this.counters.leadsEmitted >= this.config.maxLeadsPerSession) return false

    return true
  }

  checkAgentCount(currentCount: number): { allowed: boolean; max: number } {
    if (currentCount >= this.config.maxConcurrentAgents) {
      this.recordViolation('resource', 'Max concurrent agents reached', 'warning')
      return { allowed: false, max: this.config.maxConcurrentAgents }
    }

    return { allowed: true, max: this.config.maxConcurrentAgents }
  }

  // ============================================
  // Error Handling
  // ============================================

  getErrorAction(): 'retry' | 'skip' | 'ask_human' | 'abort' {
    return this.config.onError
  }

  getMaxRetries(): number {
    return this.config.maxRetries
  }

  getRetryDelay(): number {
    return this.config.retryDelay
  }

  // ============================================
  // Violation Management
  // ============================================

  private recordViolation(
    type: GuardrailViolation['type'],
    description: string,
    severity: GuardrailViolation['severity']
  ): void {
    const violation: GuardrailViolation = {
      type,
      description,
      severity,
      action: severity === 'critical' ? 'aborted' : severity === 'error' ? 'blocked' : 'logged',
      timestamp: Date.now()
    }
    this.violations.push(violation)
  }

  getViolations(): GuardrailViolation[] {
    return [...this.violations]
  }

  getRecentViolations(count: number = 10): GuardrailViolation[] {
    return this.violations.slice(-count)
  }

  hasBlockingViolations(): boolean {
    return this.violations.some((v) => v.action === 'blocked' || v.action === 'aborted')
  }

  // ============================================
  // Stats
  // ============================================

  getStats(): {
    counters: {
      searchCalls: number
      fetchCalls: number
      leadsEmitted: number
      apiCalls: number
      tokensUsed: number
    }
    runtime: number
    violations: number
    blockedViolations: number
  } {
    return {
      counters: { ...this.counters },
      runtime: Date.now() - this.startTime,
      violations: this.violations.length,
      blockedViolations: this.violations.filter(
        (v) => v.action === 'blocked' || v.action === 'aborted'
      ).length
    }
  }

  // ============================================
  // Configuration
  // ============================================

  updateConfig(updates: Partial<GuardrailsConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  getConfig(): GuardrailsConfig {
    return { ...this.config }
  }
}

// Singleton instance
let guardrailsInstance: GuardrailsSystem | null = null

export function getGuardrailsSystem(config?: Partial<GuardrailsConfig>): GuardrailsSystem {
  if (!guardrailsInstance) {
    guardrailsInstance = new GuardrailsSystem(config)
  }
  return guardrailsInstance
}

export function resetGuardrailsSystem(config?: Partial<GuardrailsConfig>): void {
  guardrailsInstance = new GuardrailsSystem(config)
}
