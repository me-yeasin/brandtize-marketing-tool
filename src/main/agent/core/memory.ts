/**
 * Episodic Memory System
 *
 * Provides short-term, working, and long-term memory for agents.
 * Enables cross-session learning and pattern recognition.
 * Uses electron-store for persistence across sessions.
 */

import Store from 'electron-store'
import { EpisodicMemory, LongTermMemory, Decision, Action, Hypothesis } from './types'

// Create a dedicated store for agent memory
const memoryStore = new Store<{ agentMemory: LongTermMemory | null }>({
  name: 'agent-memory',
  defaults: {
    agentMemory: null
  }
})

export class AgentMemorySystem {
  private memory: EpisodicMemory
  private storageKey = 'agentMemory'

  constructor() {
    this.memory = this.initializeMemory()
    this.loadFromStorage()
  }

  private initializeMemory(): EpisodicMemory {
    return {
      sessionMemory: {
        sessionId: this.generateSessionId(),
        startedAt: Date.now(),
        niche: '',
        goal: '',
        leadsFound: [],
        leadsRejected: [],
        queriesUsed: [],
        urlsVisited: [],
        decisions: [],
        errors: []
      },
      longTermMemory: {
        successfulNiches: [],
        failedQueries: [],
        competitorPatterns: [],
        highConversionPatterns: [],
        totalLeadsFound: 0,
        totalSessionsRun: 0,
        averageLeadsPerSession: 0,
        bestPerformingServices: [],
        qualityImprovements: []
      },
      workingMemory: {
        currentContext: '',
        recentActions: [],
        pendingDecisions: [],
        hypotheses: [],
        tempData: new Map()
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ============================================
  // Session Memory Operations
  // ============================================

  startNewSession(niche: string, goal: string): void {
    // Save previous session stats to long-term memory
    if (this.memory.sessionMemory.leadsFound.length > 0) {
      this.updateLongTermFromSession()
    }

    this.memory.sessionMemory = {
      sessionId: this.generateSessionId(),
      startedAt: Date.now(),
      niche,
      goal,
      leadsFound: [],
      leadsRejected: [],
      queriesUsed: [],
      urlsVisited: [],
      decisions: [],
      errors: []
    }

    this.memory.workingMemory = {
      currentContext: `Niche: ${niche}, Goal: ${goal}`,
      recentActions: [],
      pendingDecisions: [],
      hypotheses: [],
      tempData: new Map()
    }
  }

  recordLeadFound(email: string): void {
    this.memory.sessionMemory.leadsFound.push(email)
    this.memory.longTermMemory.totalLeadsFound++
  }

  recordLeadRejected(email: string, reason: string): void {
    this.memory.sessionMemory.leadsRejected.push({ email, reason })

    // Learn from rejections - update competitor patterns if applicable
    if (reason.toLowerCase().includes('competitor')) {
      const domain = email.split('@')[1]
      if (domain && !this.memory.longTermMemory.competitorPatterns.includes(domain)) {
        this.memory.longTermMemory.competitorPatterns.push(domain)
      }
    }
  }

  recordQueryUsed(query: string): void {
    if (!this.memory.sessionMemory.queriesUsed.includes(query)) {
      this.memory.sessionMemory.queriesUsed.push(query)
    }
  }

  recordUrlVisited(url: string): void {
    if (!this.memory.sessionMemory.urlsVisited.includes(url)) {
      this.memory.sessionMemory.urlsVisited.push(url)
    }
  }

  recordError(error: string): void {
    this.memory.sessionMemory.errors.push(error)
  }

  // ============================================
  // Decision Recording
  // ============================================

  recordDecision(decision: Omit<Decision, 'id' | 'timestamp'>): string {
    const fullDecision: Decision = {
      ...decision,
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now()
    }
    this.memory.sessionMemory.decisions.push(fullDecision)
    return fullDecision.id
  }

  updateDecisionOutcome(decisionId: string, outcome: 'success' | 'failure' | 'unknown'): void {
    const decision = this.memory.sessionMemory.decisions.find((d) => d.id === decisionId)
    if (decision) {
      decision.outcome = outcome
    }
  }

  // ============================================
  // Working Memory Operations
  // ============================================

  updateContext(context: string): void {
    this.memory.workingMemory.currentContext = context
  }

  recordAction(action: Omit<Action, 'id'>): void {
    const fullAction: Action = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    }

    // Keep only last 50 actions in working memory
    this.memory.workingMemory.recentActions.push(fullAction)
    if (this.memory.workingMemory.recentActions.length > 50) {
      this.memory.workingMemory.recentActions.shift()
    }
  }

  addHypothesis(hypothesis: Omit<Hypothesis, 'id'>): string {
    const fullHypothesis: Hypothesis = {
      ...hypothesis,
      id: `hyp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    }
    this.memory.workingMemory.hypotheses.push(fullHypothesis)
    return fullHypothesis.id
  }

  updateHypothesis(
    id: string,
    status: 'active' | 'confirmed' | 'rejected',
    evidence?: string
  ): void {
    const hypothesis = this.memory.workingMemory.hypotheses.find((h) => h.id === id)
    if (hypothesis) {
      hypothesis.status = status
      if (evidence) {
        hypothesis.evidence.push(evidence)
      }
    }
  }

  setTempData(key: string, value: unknown): void {
    this.memory.workingMemory.tempData.set(key, value)
  }

  getTempData<T>(key: string): T | undefined {
    return this.memory.workingMemory.tempData.get(key) as T | undefined
  }

  // ============================================
  // Long-Term Memory Operations
  // ============================================

  private updateLongTermFromSession(): void {
    const session = this.memory.sessionMemory
    const longTerm = this.memory.longTermMemory

    // Update session count
    longTerm.totalSessionsRun++

    // Update average leads per session
    longTerm.averageLeadsPerSession = longTerm.totalLeadsFound / longTerm.totalSessionsRun

    // Update niche performance
    const existingNiche = longTerm.successfulNiches.find((n) => n.niche === session.niche)
    if (existingNiche) {
      existingNiche.sessionsCount++
      existingNiche.totalLeads += session.leadsFound.length
      existingNiche.averageQuality = existingNiche.totalLeads / existingNiche.sessionsCount
      existingNiche.lastUsed = Date.now()

      // Track best queries
      session.queriesUsed.forEach((query) => {
        if (!existingNiche.bestQueries.includes(query) && session.leadsFound.length > 0) {
          existingNiche.bestQueries.push(query)
        }
      })
    } else if (session.leadsFound.length > 0) {
      longTerm.successfulNiches.push({
        niche: session.niche,
        sessionsCount: 1,
        totalLeads: session.leadsFound.length,
        averageQuality: session.leadsFound.length,
        bestQueries: session.queriesUsed.slice(0, 5),
        lastUsed: Date.now()
      })
    }

    this.saveToStorage()
  }

  recordFailedQuery(query: string, reason: string): void {
    this.memory.longTermMemory.failedQueries.push({
      query,
      reason,
      niche: this.memory.sessionMemory.niche,
      timestamp: Date.now()
    })
  }

  recordConversionPattern(pattern: string, successRate: number, services: string[]): void {
    const existing = this.memory.longTermMemory.highConversionPatterns.find(
      (p) => p.pattern === pattern
    )

    if (existing) {
      existing.sampleSize++
      existing.successRate = (existing.successRate + successRate) / 2
    } else {
      this.memory.longTermMemory.highConversionPatterns.push({
        pattern,
        successRate,
        sampleSize: 1,
        services
      })
    }
  }

  recordQualityImprovement(area: string, oldValue: number, newValue: number, cause: string): void {
    this.memory.longTermMemory.qualityImprovements.push({
      area,
      oldValue,
      newValue,
      timestamp: Date.now(),
      cause
    })
  }

  // ============================================
  // Query Methods
  // ============================================

  getSessionSummary(): {
    leadsFound: number
    leadsRejected: number
    queriesUsed: number
    urlsVisited: number
    duration: number
  } {
    const session = this.memory.sessionMemory
    return {
      leadsFound: session.leadsFound.length,
      leadsRejected: session.leadsRejected.length,
      queriesUsed: session.queriesUsed.length,
      urlsVisited: session.urlsVisited.length,
      duration: Date.now() - session.startedAt
    }
  }

  getRecentActions(count: number = 10): Action[] {
    return this.memory.workingMemory.recentActions.slice(-count)
  }

  getRecentDecisions(count: number = 10): Decision[] {
    return this.memory.sessionMemory.decisions.slice(-count)
  }

  getPreviousActionsContext(): string {
    const actions = this.getRecentActions(5)
    if (actions.length === 0) return 'No previous actions.'

    return actions
      .map((a) => `- ${a.type}: ${a.success ? 'Success' : 'Failed'} (${Math.round(a.duration)}ms)`)
      .join('\n')
  }

  isCompetitorDomain(domain: string): boolean {
    return this.memory.longTermMemory.competitorPatterns.some((pattern) =>
      domain.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  wasQueryUsed(query: string): boolean {
    return this.memory.sessionMemory.queriesUsed.includes(query)
  }

  wasUrlVisited(url: string): boolean {
    return this.memory.sessionMemory.urlsVisited.includes(url)
  }

  getBestQueriesForNiche(niche: string): string[] {
    const nicheData = this.memory.longTermMemory.successfulNiches.find(
      (n) => n.niche.toLowerCase() === niche.toLowerCase()
    )
    return nicheData?.bestQueries || []
  }

  getActiveHypotheses(): Hypothesis[] {
    return this.memory.workingMemory.hypotheses.filter((h) => h.status === 'active')
  }

  // ============================================
  // Context Generation for LLM
  // ============================================

  generateMemoryContext(): string {
    const session = this.memory.sessionMemory
    const longTerm = this.memory.longTermMemory
    const working = this.memory.workingMemory

    return `
## Current Session Memory
- Session ID: ${session.sessionId}
- Niche: ${session.niche}
- Goal: ${session.goal}
- Leads Found: ${session.leadsFound.length}
- Leads Rejected: ${session.leadsRejected.length}
- Queries Used: ${session.queriesUsed.length}
- URLs Visited: ${session.urlsVisited.length}
- Errors: ${session.errors.length}

## Working Memory
- Current Context: ${working.currentContext}
- Recent Actions: ${working.recentActions.length}
- Active Hypotheses: ${working.hypotheses.filter((h) => h.status === 'active').length}

## Long-Term Learning
- Total Sessions: ${longTerm.totalSessionsRun}
- Total Leads Found: ${longTerm.totalLeadsFound}
- Average Leads/Session: ${longTerm.averageLeadsPerSession.toFixed(1)}
- Known Competitor Patterns: ${longTerm.competitorPatterns.length}
- High Conversion Patterns: ${longTerm.highConversionPatterns.length}

## Recent Decisions
${session.decisions
  .slice(-3)
  .map((d) => `- [${d.type}] ${d.output.substring(0, 50)}... (Confidence: ${d.confidence}%)`)
  .join('\n')}

## Recent Rejected Leads (to avoid)
${session.leadsRejected
  .slice(-5)
  .map((r) => `- ${r.email}: ${r.reason}`)
  .join('\n')}
`.trim()
  }

  // ============================================
  // Persistence
  // ============================================

  private saveToStorage(): void {
    try {
      // Save long-term memory to electron-store for persistence
      memoryStore.set(this.storageKey, this.memory.longTermMemory)
      console.log('[Memory] Saved to electron-store')
    } catch (error) {
      console.error('Failed to save memory:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      // Load long-term memory from electron-store
      const savedMemory = memoryStore.get(this.storageKey) as LongTermMemory | null
      if (savedMemory && typeof savedMemory === 'object' && 'successfulNiches' in savedMemory) {
        this.memory.longTermMemory = savedMemory
        console.log('[Memory] Loaded from electron-store')
      }
    } catch (error) {
      console.error('Failed to load memory:', error)
    }
  }

  exportMemory(): EpisodicMemory {
    return JSON.parse(JSON.stringify(this.memory))
  }

  importLongTermMemory(data: LongTermMemory): void {
    this.memory.longTermMemory = data
  }
}

// Singleton instance
let memoryInstance: AgentMemorySystem | null = null

export function getMemorySystem(): AgentMemorySystem {
  if (!memoryInstance) {
    memoryInstance = new AgentMemorySystem()
  }
  return memoryInstance
}

export function resetMemorySystem(): void {
  memoryInstance = new AgentMemorySystem()
}
