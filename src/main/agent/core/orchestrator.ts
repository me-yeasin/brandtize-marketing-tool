/**
 * Supervisor-Worker Architecture with Handoff Protocol
 *
 * Implements multi-agent orchestration:
 * - Supervisor manages workflow and delegates tasks
 * - Workers execute specialized tasks
 * - Handoff protocol for agent-to-agent communication
 * - Task queue management
 */

import { ChatGroq } from '@langchain/groq'
import {
  AgentRole,
  AgentIdentity,
  SupervisorState,
  AgentGoal,
  Task,
  TaskType,
  WorkflowPhase,
  AgentHandoff,
  HandoffContext,
  QualityMetrics,
  JudgeVerdict,
  JudgeScores,
  ProductionAgentEvent
} from './types'
import { getObservabilitySystem } from './observability'
import { getGuardrailsSystem } from './guardrails'

type EventEmitter = (event: ProductionAgentEvent) => void

export class SupervisorAgent {
  private state: SupervisorState
  private model: ChatGroq
  private workers: Map<string, WorkerAgent> = new Map()
  private emitEvent: EventEmitter
  private observability = getObservabilitySystem()
  private guardrails = getGuardrailsSystem()

  constructor(model: ChatGroq, goal: AgentGoal, emitEvent: EventEmitter) {
    this.model = model
    this.emitEvent = emitEvent
    this.state = this.initializeState(goal)
  }

  private initializeState(goal: AgentGoal): SupervisorState {
    return {
      id: `supervisor_${Date.now()}`,
      goal,
      workers: new Map(),
      taskQueue: [],
      completedTasks: [],
      currentPhase: 'initialization',
      resourceAllocation: {
        maxConcurrentWorkers: 3,
        activeWorkers: 0,
        apiCallsRemaining: 500,
        tokenBudget: 100000,
        tokensUsed: 0
      },
      qualityMetrics: {
        leadsFound: 0,
        leadsQualified: 0,
        leadsRejected: 0,
        averageScore: 0,
        hotLeadsCount: 0,
        qualificationRate: 0
      }
    }
  }

  async initialize(): Promise<void> {
    this.observability.startTrace(this.state.id, this.state.id, 'supervisor')

    this.emitEvent({
      type: 'status',
      agentId: this.state.id,
      agentRole: 'supervisor',
      content: 'Initializing supervisor agent...',
      timestamp: Date.now(),
      displayLevel: 'public'
    })

    // Create specialized workers
    await this.createWorker('finder', 'Lead Finder')
    await this.createWorker('analyzer', 'Company Analyzer')
    await this.createWorker('personalizer', 'Content Personalizer')
    await this.createWorker('judge', 'Quality Judge')

    this.state.currentPhase = 'niche_analysis'
  }

  private async createWorker(role: AgentRole, name: string): Promise<void> {
    const worker = new WorkerAgent(this.model, role, name, this.emitEvent)
    this.workers.set(role, worker)
    this.state.workers.set(role, {
      id: worker.getId(),
      role,
      status: 'idle',
      completedTasks: [],
      performance: {
        tasksCompleted: 0,
        averageTaskTime: 0,
        successRate: 1.0,
        errorCount: 0
      }
    })
  }

  async run(): Promise<void> {
    const phases: WorkflowPhase[] = [
      'niche_analysis',
      'lead_discovery',
      'lead_qualification',
      'personalization',
      'quality_review',
      'completion'
    ]

    for (const phase of phases) {
      if (this.state.currentPhase === 'completion') break

      await this.executePhase(phase)

      // Check guardrails
      if (!this.guardrails.checkResourceAvailable()) {
        this.emitEvent({
          type: 'warning',
          agentId: this.state.id,
          agentRole: 'supervisor',
          content: 'Resource limits reached, completing early',
          timestamp: Date.now(),
          displayLevel: 'public'
        })
        break
      }
    }

    this.complete()
  }

  private async executePhase(phase: WorkflowPhase): Promise<void> {
    this.state.currentPhase = phase
    const spanId = this.observability.startSpan(`phase_${phase}`, 'agent_action')

    this.emitEvent({
      type: 'status',
      agentId: this.state.id,
      agentRole: 'supervisor',
      content: `Starting phase: ${phase.replace('_', ' ')}`,
      timestamp: Date.now(),
      displayLevel: 'public'
    })

    switch (phase) {
      case 'niche_analysis':
        await this.executeNicheAnalysis()
        break
      case 'lead_discovery':
        await this.executeLeadDiscovery()
        break
      case 'lead_qualification':
        await this.executeLeadQualification()
        break
      case 'personalization':
        await this.executePersonalization()
        break
      case 'quality_review':
        await this.executeQualityReview()
        break
    }

    this.observability.endSpan(spanId)
  }

  private async executeNicheAnalysis(): Promise<void> {
    const task = this.createTask('analyze_niche', {
      niche: this.state.goal.niche,
      services: this.state.goal.targetServices
    })

    await this.delegateTask(task, 'analyzer')
  }

  private async executeLeadDiscovery(): Promise<void> {
    const task = this.createTask('search_leads', {
      niche: this.state.goal.niche,
      targetCount: 10
    })

    await this.delegateTask(task, 'finder')
  }

  private async executeLeadQualification(): Promise<void> {
    const pendingLeads = this.state.taskQueue.filter(
      (t) => t.type === 'score_lead' && t.status === 'pending'
    )

    for (const task of pendingLeads) {
      await this.delegateTask(task, 'analyzer')
    }
  }

  private async executePersonalization(): Promise<void> {
    const qualifiedLeads = this.state.completedTasks.filter(
      (t) => t.type === 'score_lead' && t.status === 'completed'
    )

    for (const lead of qualifiedLeads) {
      const task = this.createTask('personalize_template', {
        leadData: lead.output
      })
      await this.delegateTask(task, 'personalizer')
    }
  }

  private async executeQualityReview(): Promise<void> {
    const personalizedLeads = this.state.completedTasks.filter(
      (t) => t.type === 'personalize_template' && t.status === 'completed'
    )

    for (const lead of personalizedLeads) {
      const task = this.createTask('quality_review', {
        leadData: lead.output
      })
      await this.delegateTask(task, 'judge')
    }
  }

  private createTask(type: TaskType, input: unknown): Task {
    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      description: `Execute ${type}`,
      input,
      status: 'pending',
      priority: 5,
      createdAt: Date.now(),
      dependencies: [],
      retryCount: 0,
      maxRetries: 3
    }
  }

  private async delegateTask(task: Task, workerRole: AgentRole): Promise<void> {
    const worker = this.workers.get(workerRole)
    if (!worker) {
      task.status = 'failed'
      task.error = `Worker ${workerRole} not found`
      return
    }

    const workerState = this.state.workers.get(workerRole)
    if (workerState) {
      workerState.status = 'working'
      workerState.currentTask = task
    }

    task.status = 'in_progress'
    task.startedAt = Date.now()
    task.assignedTo = workerRole

    // Create handoff context
    const handoff: AgentHandoff = {
      id: `handoff_${Date.now()}`,
      fromAgent: {
        id: this.state.id,
        role: 'supervisor',
        name: 'Supervisor',
        state: 'executing',
        createdAt: Date.now()
      },
      toAgent: {
        id: worker.getId(),
        role: workerRole,
        name: worker.getName(),
        state: 'idle',
        createdAt: Date.now()
      },
      context: {
        completedTasks: this.state.completedTasks.map((t) => t.id),
        findings: task.input,
        nextExpectedAction: task.type,
        sharedMemory: [],
        urgentFlags: []
      },
      priority: 'normal',
      timestamp: Date.now(),
      acknowledged: false
    }

    this.emitEvent({
      type: 'handoff',
      agentId: this.state.id,
      agentRole: 'supervisor',
      content: `Delegating ${task.type} to ${workerRole}`,
      timestamp: Date.now(),
      metadata: { handoff },
      displayLevel: 'detailed'
    })

    try {
      const result = await worker.executeTask(task, handoff.context)
      task.output = result
      task.status = 'completed'
      task.completedAt = Date.now()
      this.state.completedTasks.push(task)

      if (workerState) {
        workerState.status = 'idle'
        workerState.currentTask = undefined
        workerState.completedTasks.push(task.id)
        workerState.performance.tasksCompleted++
      }
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : String(error)

      if (workerState) {
        workerState.status = 'error'
        workerState.performance.errorCount++
      }
    }
  }

  private complete(): void {
    this.state.currentPhase = 'completion'

    // Calculate final metrics
    this.state.qualityMetrics.qualificationRate =
      this.state.qualityMetrics.leadsFound > 0
        ? this.state.qualityMetrics.leadsQualified / this.state.qualityMetrics.leadsFound
        : 0

    this.observability.endTrace(this.state.id, 'completed')

    this.emitEvent({
      type: 'complete',
      agentId: this.state.id,
      agentRole: 'supervisor',
      content: `Completed. Found ${this.state.qualityMetrics.leadsQualified} qualified leads.`,
      timestamp: Date.now(),
      metadata: { metrics: this.state.qualityMetrics },
      displayLevel: 'public'
    })
  }

  getMetrics(): QualityMetrics {
    return this.state.qualityMetrics
  }

  getState(): SupervisorState {
    return this.state
  }
}

export class WorkerAgent {
  private identity: AgentIdentity
  private model: ChatGroq
  private emitEvent: EventEmitter
  private observability = getObservabilitySystem()

  constructor(model: ChatGroq, role: AgentRole, name: string, emitEvent: EventEmitter) {
    this.model = model
    this.emitEvent = emitEvent
    this.identity = {
      id: `${role}_${Date.now()}`,
      role,
      name,
      state: 'idle',
      createdAt: Date.now()
    }
  }

  getId(): string {
    return this.identity.id
  }

  getName(): string {
    return this.identity.name
  }

  async executeTask(task: Task, context: HandoffContext): Promise<unknown> {
    this.identity.state = 'executing'
    const spanId = this.observability.startSpan(
      `${this.identity.role}_${task.type}`,
      'agent_action',
      { input: task.input, contextTasks: context.completedTasks.length }
    )

    this.emitEvent({
      type: 'action',
      agentId: this.identity.id,
      agentRole: this.identity.role,
      content: `Executing ${task.type}... (${context.completedTasks.length} prior tasks)`,
      timestamp: Date.now(),
      displayLevel: 'detailed'
    })

    try {
      let result: unknown

      switch (task.type) {
        case 'analyze_niche':
          result = await this.analyzeNiche(task.input)
          break
        case 'search_leads':
          result = await this.searchLeads(task.input)
          break
        case 'score_lead':
          result = await this.scoreLead(task.input)
          break
        case 'personalize_template':
          result = await this.personalizeTemplate(task.input)
          break
        case 'quality_review':
          result = await this.qualityReview(task.input)
          break
        default:
          result = { success: false, error: `Unknown task type: ${task.type}` }
      }

      this.identity.state = 'completed'
      this.observability.endSpan(spanId, result)
      return result
    } catch (error) {
      this.identity.state = 'error'
      this.observability.endSpan(
        spanId,
        undefined,
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }

  private async analyzeNiche(input: unknown): Promise<unknown> {
    const { niche, services } = input as { niche: string; services: string[] }

    const prompt = `Analyze this niche for B2B lead generation:

NICHE: ${niche}
OUR SERVICES: ${services.join(', ')}

Provide:
1. Key characteristics of businesses in this niche
2. Common pain points they might have
3. How our services can help them
4. Best search queries to find them
5. Red flags to avoid (competitors, wrong fit)

Respond in JSON:
{
  "characteristics": ["..."],
  "painPoints": ["..."],
  "serviceAlignment": ["..."],
  "searchQueries": ["..."],
  "redFlags": ["..."]
}`

    const response = await this.model.invoke(prompt)
    const content = response.content as string
    const jsonMatch = content.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { error: 'Failed to parse niche analysis' }
  }

  private async searchLeads(input: unknown): Promise<unknown> {
    // This would integrate with actual search tools
    return { message: 'Search leads executed', input }
  }

  private async scoreLead(input: unknown): Promise<unknown> {
    // This would integrate with scoring tools
    return { message: 'Lead scored', input }
  }

  private async personalizeTemplate(input: unknown): Promise<unknown> {
    // This would integrate with personalization engine
    return { message: 'Template personalized', input }
  }

  private async qualityReview(input: unknown): Promise<JudgeVerdict> {
    const spanId = this.observability.startSpan('quality_review', 'quality_check', input)

    const prompt = `As a quality reviewer, evaluate this lead and email template:

${JSON.stringify(input, null, 2)}

Evaluate:
1. Lead quality (0-100)
2. Email personalization quality (0-100)
3. Relevance to our services (0-100)
4. Any issues or red flags

Respond in JSON:
{
  "scores": {
    "accuracy": 0-100,
    "completeness": 0-100,
    "relevance": 0-100,
    "quality": 0-100,
    "personalization": 0-100,
    "overall": 0-100
  },
  "verdict": "approved|rejected|needs_revision",
  "issues": [{"category": "critical|major|minor|suggestion", "description": "..."}],
  "suggestions": ["..."]
}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const verdict: JudgeVerdict = {
          id: `verdict_${Date.now()}`,
          targetType: 'lead',
          targetId: 'unknown',
          verdict: parsed.verdict || 'needs_revision',
          scores: parsed.scores as JudgeScores,
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
          confidence: parsed.scores?.overall || 50,
          timestamp: Date.now()
        }

        this.observability.endSpan(spanId, verdict)
        return verdict
      }
    } catch (error) {
      this.observability.endSpan(spanId, undefined, String(error))
    }

    return {
      id: `verdict_${Date.now()}`,
      targetType: 'lead',
      targetId: 'unknown',
      verdict: 'needs_revision',
      scores: {
        accuracy: 50,
        completeness: 50,
        relevance: 50,
        quality: 50,
        personalization: 50,
        overall: 50
      },
      issues: [{ category: 'major', description: 'Unable to fully evaluate' }],
      suggestions: ['Manual review recommended'],
      confidence: 30,
      timestamp: Date.now()
    }
  }
}

export function createSupervisorAgent(
  model: ChatGroq,
  goal: AgentGoal,
  emitEvent: EventEmitter
): SupervisorAgent {
  return new SupervisorAgent(model, goal, emitEvent)
}
