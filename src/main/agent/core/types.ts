/**
 * Production-Level Agent System Types
 *
 * Comprehensive type definitions for:
 * - Reflexion Pattern (self-critique)
 * - Constraint Checklist system
 * - Level 5 Hyper-personalization
 * - Intent Signal Scoring
 * - Supervisor-Worker architecture
 * - Judge/Critic Agent
 * - Guardrails Layer
 * - Episodic Memory system
 * - Feedback Loop
 * - Full Observability
 */

// ============================================
// Agent Architecture Types
// ============================================

export type AgentRole =
  | 'supervisor' // Orchestrates all workers
  | 'finder' // Finds potential leads
  | 'analyzer' // Analyzes websites/companies
  | 'personalizer' // Creates hyper-personalized content
  | 'judge' // Quality gate / critic
  | 'memory_manager' // Manages long-term memory

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting_handoff'
  | 'self_critiquing'
  | 'completed'
  | 'error'

export interface AgentIdentity {
  id: string
  role: AgentRole
  name: string
  state: AgentState
  createdAt: number
  parentId?: string // For sub-agents
}

// ============================================
// Reflexion Pattern Types
// ============================================

export interface ReflexionState {
  iteration: number
  maxIterations: number
  originalOutput: string
  critiques: SelfCritique[]
  refinedOutput: string
  isComplete: boolean
  improvementScore: number // 0-100
}

export interface SelfCritique {
  aspect: 'accuracy' | 'completeness' | 'relevance' | 'quality' | 'personalization'
  issue: string
  severity: 'critical' | 'major' | 'minor'
  suggestion: string
  fixed: boolean
}

export interface ReflexionResult {
  originalThought: string
  critique: SelfCritique[]
  refinedThought: string
  confidenceScore: number // 0-100
  iterations: number
}

// ============================================
// Deliberate Reasoning (Hidden CoT)
// ============================================

export interface DeliberateReasoning {
  // Hidden from UI - Internal processing
  internalThoughts: ReasoningStep[]
  scratchpad: string[]
  hypotheses: Hypothesis[]

  // Shown to user - Clean output
  publicSummary: string
  publicDecision: string
  publicConfidence: number
}

export interface ReasoningStep {
  step: number
  thought: string
  action?: string
  observation?: string
  evaluation?: string
  timestamp: number
}

export interface Hypothesis {
  id: string
  statement: string
  evidence: string[]
  confidence: number
  status: 'active' | 'confirmed' | 'rejected'
}

// ============================================
// Constraint Checklist Types
// ============================================

export interface LeadQualificationChecklist {
  notCompetitor: ChecklistItem
  inTargetNiche: ChecklistItem
  hasValidEmail: ChecklistItem
  isDecisionMaker: ChecklistItem
  hasBudgetSignals: ChecklistItem
  hasNeedSignals: ChecklistItem
  passesMinScore: ChecklistItem
}

export interface ChecklistItem {
  passed: boolean
  confidence: number // 0-100
  evidence: string
  checkedAt: number
  checkedBy: AgentRole
}

export interface QualificationResult {
  checklist: LeadQualificationChecklist
  overallPassed: boolean
  passedCount: number
  totalChecks: number
  failedReasons: string[]
  qualificationScore: number // 0-100
}

// ============================================
// Level 5 Hyper-Personalization Types
// ============================================

export type PersonalizationLevel = 1 | 2 | 3 | 4 | 5

export interface PersonalizationData {
  level: PersonalizationLevel

  // Level 1: Basic
  basic: {
    firstName?: string
    lastName?: string
    companyName: string
    jobTitle?: string
  }

  // Level 2: Contextual
  contextual: {
    recentNews: string[]
    industryTrends: string[]
    companyEvents: string[]
    marketPosition: string
  }

  // Level 3: Behavioral
  behavioral: {
    websiteActivity: string[]
    contentEngagement: string[]
    searchBehavior: string[]
    previousInteractions: string[]
  }

  // Level 4: Predictive
  predictive: {
    predictedPainPoints: PredictedPainPoint[]
    predictedNeeds: string[]
    predictedObjections: string[]
    buyingStage: 'awareness' | 'consideration' | 'decision'
    propensityScore: number // 0-100
  }

  // Level 5: Hyper (Real-time + Dynamic)
  hyper: {
    realTimeSignals: RealTimeSignal[]
    dynamicContent: DynamicContentBlock[]
    triggerEvents: TriggerEvent[]
    personalizedTiming: OptimalTiming
  }
}

export interface PredictedPainPoint {
  pain: string
  confidence: number
  source: string
  relevantService: string
}

export interface RealTimeSignal {
  type: 'hiring' | 'funding' | 'expansion' | 'tech_change' | 'leadership_change' | 'social_activity'
  signal: string
  timestamp: number
  source: string
  actionability: 'high' | 'medium' | 'low'
}

export interface DynamicContentBlock {
  id: string
  type: 'opener' | 'pain_point' | 'solution' | 'social_proof' | 'cta'
  content: string
  personalizationElements: string[]
  variantId?: string
}

export interface TriggerEvent {
  event: string
  detectedAt: number
  relevance: number
  suggestedAction: string
}

export interface OptimalTiming {
  bestDay: string
  bestTime: string
  timezone: string
  reasoning: string
}

// ============================================
// Intent Signal Scoring Types
// ============================================

export interface IntentSignalScore {
  signals: WeightedIntentSignal[]
  totalScore: number // 0-100
  tier: 'fire' | 'hot' | 'warm' | 'cold'
  recommendedApproach: 'direct_offer' | 'soft_pitch' | 'nurture' | 'qualify_first'
  urgency: 'immediate' | 'this_week' | 'this_month' | 'long_term'
}

export interface WeightedIntentSignal {
  signal: string
  category: IntentCategory
  weight: number // Points added to score
  detected: boolean
  evidence: string
  source: string
  confidence: number
}

export type IntentCategory =
  | 'hiring_tech' // +25 - Hiring for tech roles
  | 'outdated_tech' // +20 - Using outdated technology
  | 'recent_funding' // +30 - Recent funding round
  | 'no_web_presence' // +15 - No modern website
  | 'active_growth' // +10 - Active job postings, expansion
  | 'competitor_switch' // +20 - Recently switched from competitor
  | 'explicit_need' // +35 - Published "looking for X"
  | 'budget_available' // +25 - Signs of available budget
  | 'timeline_urgent' // +20 - Urgent timeline indicators

export type IntentSignalType =
  | 'hiring_signal'
  | 'funding_signal'
  | 'tech_adoption'
  | 'growth_signal'
  | 'pain_point'
  | 'competitor_mention'
  | 'review_activity'
  | 'social_engagement'
  | 'website_change'
  | 'job_posting'

// Simple input for personalization engine
export interface SimplePersonalizationInput {
  companyName?: string
  industry?: string
  companySize?: string
  location?: string
  decisionMakerName?: string
  decisionMakerRole?: string
  painPoints?: string[]
  techStack?: string[]
  recentNews?: string
  recentActivity?: string
  competitors?: string[]
}

export const INTENT_WEIGHTS: Record<IntentCategory, number> = {
  hiring_tech: 25,
  outdated_tech: 20,
  recent_funding: 30,
  no_web_presence: 15,
  active_growth: 10,
  competitor_switch: 20,
  explicit_need: 35,
  budget_available: 25,
  timeline_urgent: 20
}

// ============================================
// Supervisor-Worker Architecture Types
// ============================================

export interface SupervisorState {
  id: string
  goal: AgentGoal
  workers: Map<string, WorkerState>
  taskQueue: Task[]
  completedTasks: Task[]
  currentPhase: WorkflowPhase
  resourceAllocation: ResourceAllocation
  qualityMetrics: QualityMetrics
}

export interface WorkerState {
  id: string
  role: AgentRole
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'error'
  currentTask?: Task
  completedTasks: string[]
  performance: WorkerPerformance
}

export interface AgentGoal {
  objective: string
  niche: string
  targetServices: string[]
  successCriteria: SuccessCriterion[]
  constraints: GoalConstraint[]
  priority: 'high' | 'normal' | 'low'
}

export interface SuccessCriterion {
  metric: string
  target: number
  current: number
  achieved: boolean
}

export interface GoalConstraint {
  type: 'time' | 'quality' | 'quantity' | 'resource'
  description: string
  value: number
  unit: string
}

export type WorkflowPhase =
  | 'initialization'
  | 'niche_analysis'
  | 'lead_discovery'
  | 'lead_qualification'
  | 'personalization'
  | 'quality_review'
  | 'completion'

export interface ResourceAllocation {
  maxConcurrentWorkers: number
  activeWorkers: number
  apiCallsRemaining: number
  tokenBudget: number
  tokensUsed: number
}

export interface QualityMetrics {
  leadsFound: number
  leadsQualified: number
  leadsRejected: number
  averageScore: number
  hotLeadsCount: number
  qualificationRate: number
}

export interface WorkerPerformance {
  tasksCompleted: number
  averageTaskTime: number
  successRate: number
  errorCount: number
}

// ============================================
// Handoff Protocol Types
// ============================================

export interface AgentHandoff {
  id: string
  fromAgent: AgentIdentity
  toAgent: AgentIdentity
  context: HandoffContext
  priority: 'high' | 'normal' | 'low'
  timestamp: number
  acknowledged: boolean
}

export interface HandoffContext {
  completedTasks: string[]
  findings: unknown
  nextExpectedAction: string
  sharedMemory: SharedMemoryItem[]
  urgentFlags: string[]
}

export interface SharedMemoryItem {
  key: string
  value: unknown
  addedBy: string
  timestamp: number
  ttl?: number // Time to live in ms
}

// ============================================
// Task Types
// ============================================

export interface Task {
  id: string
  type: TaskType
  description: string
  input: unknown
  output?: unknown
  status: TaskStatus
  assignedTo?: string
  priority: number // 1-10
  createdAt: number
  startedAt?: number
  completedAt?: number
  dependencies: string[]
  retryCount: number
  maxRetries: number
  error?: string
}

export type TaskType =
  | 'analyze_niche'
  | 'search_leads'
  | 'fetch_page'
  | 'extract_company_info'
  | 'verify_email'
  | 'score_lead'
  | 'check_intent'
  | 'personalize_template'
  | 'quality_review'
  | 'emit_lead'

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked'

// ============================================
// Judge/Critic Agent Types
// ============================================

export interface JudgeVerdict {
  id: string
  targetType: 'lead' | 'template' | 'search_query' | 'analysis'
  targetId: string
  verdict: 'approved' | 'rejected' | 'needs_revision'
  scores: JudgeScores
  issues: JudgeIssue[]
  suggestions: string[]
  confidence: number
  timestamp: number
}

export interface JudgeScores {
  accuracy: number // 0-100
  completeness: number
  relevance: number
  quality: number
  personalization: number
  overall: number
}

export interface JudgeIssue {
  category: 'critical' | 'major' | 'minor' | 'suggestion'
  description: string
  location?: string
  fix?: string
}

export interface MakerCheckerResult {
  makerId: string
  checkerId: string
  originalOutput: unknown
  checkerVerdict: JudgeVerdict
  finalOutput: unknown
  iterations: number
  approved: boolean
}

// ============================================
// Guardrails Types
// ============================================

export interface GuardrailsConfig {
  // Content safety
  maxTokensPerCall: number
  blockedKeywords: string[]
  requiredKeywords: string[]

  // Rate limiting
  maxSearchesPerMinute: number
  maxFetchesPerMinute: number
  maxLeadsPerSession: number
  maxApiCallsTotal: number

  // Quality gates
  minLeadScore: number
  requiredChecklistItems: (keyof LeadQualificationChecklist)[]
  minPersonalizationLevel: PersonalizationLevel

  // Safety
  maxConcurrentAgents: number
  timeoutPerTask: number
  maxTotalRuntime: number

  // Fallback
  onError: 'retry' | 'skip' | 'ask_human' | 'abort'
  maxRetries: number
  retryDelay: number
}

export interface GuardrailViolation {
  type: 'rate_limit' | 'content' | 'quality' | 'timeout' | 'resource'
  description: string
  severity: 'warning' | 'error' | 'critical'
  action: 'logged' | 'blocked' | 'aborted'
  timestamp: number
}

export const DEFAULT_GUARDRAILS: GuardrailsConfig = {
  maxTokensPerCall: 4000,
  blockedKeywords: ['unsubscribe', 'spam', 'bulk', 'mass email'],
  requiredKeywords: [],
  maxSearchesPerMinute: 10,
  maxFetchesPerMinute: 20,
  maxLeadsPerSession: 100,
  maxApiCallsTotal: 500,
  minLeadScore: 40,
  requiredChecklistItems: ['notCompetitor', 'inTargetNiche', 'hasValidEmail'],
  minPersonalizationLevel: 3,
  maxConcurrentAgents: 5,
  timeoutPerTask: 30000, // 30 seconds
  maxTotalRuntime: 600000, // 10 minutes
  onError: 'retry',
  maxRetries: 3,
  retryDelay: 1000
}

// ============================================
// Episodic Memory Types
// ============================================

export interface EpisodicMemory {
  sessionMemory: SessionMemory
  longTermMemory: LongTermMemory
  workingMemory: WorkingMemory
}

export interface SessionMemory {
  sessionId: string
  startedAt: number
  niche: string
  goal: string
  leadsFound: string[]
  leadsRejected: Array<{ email: string; reason: string }>
  queriesUsed: string[]
  urlsVisited: string[]
  decisions: Decision[]
  errors: string[]
}

export interface LongTermMemory {
  // Learned patterns
  successfulNiches: NichePerformance[]
  failedQueries: FailedQuery[]
  competitorPatterns: string[]
  highConversionPatterns: ConversionPattern[]

  // Historical data
  totalLeadsFound: number
  totalSessionsRun: number
  averageLeadsPerSession: number
  bestPerformingServices: string[]

  // Learning
  qualityImprovements: QualityImprovement[]
}

export interface WorkingMemory {
  currentContext: string
  recentActions: Action[]
  pendingDecisions: string[]
  hypotheses: Hypothesis[]
  tempData: Map<string, unknown>
}

export interface NichePerformance {
  niche: string
  sessionsCount: number
  totalLeads: number
  averageQuality: number
  bestQueries: string[]
  lastUsed: number
}

export interface FailedQuery {
  query: string
  reason: string
  niche: string
  timestamp: number
}

export interface ConversionPattern {
  pattern: string
  successRate: number
  sampleSize: number
  services: string[]
}

export interface QualityImprovement {
  area: string
  oldValue: number
  newValue: number
  timestamp: number
  cause: string
}

export interface Decision {
  id: string
  type: string
  input: string
  output: string
  reasoning: string
  confidence: number
  timestamp: number
  outcome?: 'success' | 'failure' | 'unknown'
}

export interface Action {
  id: string
  type: string
  input: unknown
  output: unknown
  timestamp: number
  duration: number
  success: boolean
}

// ============================================
// Feedback Loop Types
// ============================================

export interface FeedbackLoop {
  leadId: string
  emailSent: boolean
  sentAt?: number
  response?: EmailResponse
  outcome?: LeadOutcome
  learnings: string[]
}

export interface EmailResponse {
  received: boolean
  type: 'positive' | 'negative' | 'neutral' | 'bounce' | 'no_response'
  content?: string
  receivedAt?: number
  sentiment?: number // -1 to 1
}

export interface LeadOutcome {
  converted: boolean
  stage: 'sent' | 'opened' | 'replied' | 'meeting' | 'proposal' | 'won' | 'lost'
  value?: number
  feedback?: string
  closedAt?: number
}

export interface FeedbackAnalysis {
  totalSent: number
  responseRate: number
  positiveRate: number
  conversionRate: number
  commonObjections: string[]
  successPatterns: string[]
  improvementAreas: string[]
}

// ============================================
// Observability & Tracing Types
// ============================================

export interface AgentTrace {
  traceId: string
  sessionId: string
  agentId: string
  agentRole: AgentRole
  spans: TraceSpan[]
  startTime: number
  endTime?: number
  status: 'running' | 'completed' | 'error'
  metadata: Record<string, unknown>
}

export interface TraceSpan {
  spanId: string
  parentSpanId?: string
  name: string
  type: SpanType
  startTime: number
  endTime?: number
  duration?: number
  status: 'running' | 'success' | 'error'
  input?: unknown
  output?: unknown
  error?: string
  attributes: Record<string, unknown>
  events: SpanEvent[]
}

export type SpanType =
  | 'agent_action'
  | 'tool_call'
  | 'llm_call'
  | 'decision'
  | 'handoff'
  | 'quality_check'
  | 'memory_operation'

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, unknown>
}

export interface PerformanceMetrics {
  sessionId: string
  totalDuration: number
  llmCalls: number
  toolCalls: number
  tokensUsed: number
  leadsProcessed: number
  averageLeadTime: number
  errorRate: number
  qualityScore: number
}

// ============================================
// Production Lead Type (Enhanced)
// ============================================

export interface ProductionLead {
  // Core identification
  id: string
  email: string
  source: string

  // Company information (Level 5 enriched)
  company: EnhancedCompanyData

  // Contact information
  contact: ContactData

  // Qualification data
  qualification: QualificationResult

  // Personalization data
  personalization: PersonalizationData

  // Intent signals
  intent: IntentSignalScore

  // Generated template
  template: HyperPersonalizedTemplate

  // Quality metrics
  scores: ProductionLeadScores

  // Metadata
  metadata: LeadMetadata

  // Audit trail
  audit: LeadAudit
}

export interface EnhancedCompanyData {
  name: string
  website: string
  industry: string
  size: 'micro' | 'small' | 'medium' | 'large' | 'enterprise'
  location: string
  foundedYear?: number
  description: string
  products: string[]
  services: string[]
  techStack: string[]
  socialProfiles: {
    linkedin?: string
    twitter?: string
    facebook?: string
  }
  recentNews: string[]
  keyPeople: string[]
  competitors: string[]
  painIndicators: string[]
}

export interface ContactData {
  email: string
  firstName?: string
  lastName?: string
  jobTitle?: string
  role: 'decision_maker' | 'influencer' | 'user' | 'unknown'
  confidence: number
  verificationStatus: 'verified' | 'unverified' | 'risky' | 'invalid'
}

export interface ProductionLeadScores {
  overall: number // 0-100
  emailQuality: number
  companyFit: number
  intentStrength: number
  personalizationDepth: number
  tier: 'fire' | 'hot' | 'warm' | 'cold'
}

export interface LeadMetadata {
  foundAt: number
  processedAt: number
  version: number
  source: 'search' | 'referral' | 'enrichment'
  sessionId: string
  agentId: string
}

export interface LeadAudit {
  createdBy: string
  qualifiedBy: string
  personalizedBy: string
  reviewedBy: string
  events: AuditEvent[]
}

export interface AuditEvent {
  action: string
  agent: string
  timestamp: number
  details: string
}

// ============================================
// Hyper-Personalized Template Types
// ============================================

export interface HyperPersonalizedTemplate {
  // Core template parts
  subject: string
  opener: string
  painPointSection: string
  solutionSection: string
  socialProofSection: string
  ctaSection: string
  signature: string

  // Full assembled body
  fullBody: string

  // Personalization metadata
  personalizationLevel: PersonalizationLevel
  personalizationElements: PersonalizationElement[]

  // A/B testing variants
  variants?: TemplateVariant[]

  // Follow-up sequence
  followUpSequence: FollowUpEmail[]

  // Quality score
  qualityScore: number
}

export interface PersonalizationElement {
  type:
    | 'name'
    | 'company'
    | 'industry'
    | 'pain_point'
    | 'achievement'
    | 'news'
    | 'mutual_connection'
    | 'custom'
  value: string
  location: 'subject' | 'opener' | 'body' | 'cta'
  source: string
}

export interface TemplateVariant {
  id: string
  type: 'subject' | 'opener' | 'cta'
  content: string
  hypothesis: string
}

export interface FollowUpEmail {
  dayAfter: number
  subject: string
  body: string
  condition: 'no_response' | 'opened' | 'clicked'
}

// ============================================
// Event Types for UI
// ============================================

export interface ProductionAgentEvent {
  type: ProductionEventType
  agentId: string
  agentRole: AgentRole
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
  // For UI rendering
  displayLevel: 'public' | 'detailed' | 'debug'
}

export type ProductionEventType =
  | 'status'
  | 'thinking'
  | 'decision'
  | 'action'
  | 'tool_call'
  | 'handoff'
  | 'quality_check'
  | 'lead_found'
  | 'lead_qualified'
  | 'lead_rejected'
  | 'template_generated'
  | 'error'
  | 'warning'
  | 'complete'
