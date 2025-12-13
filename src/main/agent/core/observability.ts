/**
 * Observability & Tracing System
 *
 * Provides full tracing and metrics for agent operations:
 * - Distributed tracing with spans
 * - Performance metrics
 * - Event logging
 * - Debug capabilities
 */

import { AgentTrace, TraceSpan, SpanType, PerformanceMetrics, AgentRole } from './types'

export class ObservabilitySystem {
  private traces: Map<string, AgentTrace> = new Map()
  private currentTraceId: string | null = null
  private spanStack: TraceSpan[] = []
  private eventListeners: Map<string, ((event: TraceEvent) => void)[]> = new Map()

  generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  startTrace(sessionId: string, agentId: string, agentRole: AgentRole): string {
    const traceId = this.generateId()
    const trace: AgentTrace = {
      traceId,
      sessionId,
      agentId,
      agentRole,
      spans: [],
      startTime: Date.now(),
      status: 'running',
      metadata: {}
    }

    this.traces.set(traceId, trace)
    this.currentTraceId = traceId
    this.emitEvent('trace_start', { traceId, sessionId, agentId, agentRole })

    return traceId
  }

  endTrace(traceId: string, status: 'completed' | 'error' = 'completed'): void {
    const trace = this.traces.get(traceId)
    if (trace) {
      trace.endTime = Date.now()
      trace.status = status
      this.emitEvent('trace_end', { traceId, status, duration: trace.endTime - trace.startTime })
    }

    if (this.currentTraceId === traceId) {
      this.currentTraceId = null
    }
  }

  startSpan(name: string, type: SpanType, input?: unknown, parentSpanId?: string): string {
    if (!this.currentTraceId) {
      console.warn('No active trace. Starting span without trace.')
    }

    const spanId = this.generateId()
    const span: TraceSpan = {
      spanId,
      parentSpanId: parentSpanId || this.spanStack[this.spanStack.length - 1]?.spanId,
      name,
      type,
      startTime: Date.now(),
      status: 'running',
      input,
      attributes: {},
      events: []
    }

    this.spanStack.push(span)

    if (this.currentTraceId) {
      const trace = this.traces.get(this.currentTraceId)
      if (trace) {
        trace.spans.push(span)
      }
    }

    this.emitEvent('span_start', { spanId, name, type })
    return spanId
  }

  endSpan(spanId: string, output?: unknown, error?: string): void {
    const spanIndex = this.spanStack.findIndex((s) => s.spanId === spanId)
    if (spanIndex === -1) return

    const span = this.spanStack[spanIndex]
    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime
    span.output = output
    span.error = error
    span.status = error ? 'error' : 'success'

    this.spanStack.splice(spanIndex, 1)
    this.emitEvent('span_end', {
      spanId,
      name: span.name,
      duration: span.duration,
      status: span.status
    })
  }

  addSpanEvent(spanId: string, eventName: string, attributes?: Record<string, unknown>): void {
    const span = this.findSpan(spanId)
    if (span) {
      span.events.push({
        name: eventName,
        timestamp: Date.now(),
        attributes
      })
    }
  }

  setSpanAttribute(spanId: string, key: string, value: unknown): void {
    const span = this.findSpan(spanId)
    if (span) {
      span.attributes[key] = value
    }
  }

  private findSpan(spanId: string): TraceSpan | undefined {
    // Check current span stack first
    const stackSpan = this.spanStack.find((s) => s.spanId === spanId)
    if (stackSpan) return stackSpan

    // Check all traces
    for (const trace of this.traces.values()) {
      const traceSpan = trace.spans.find((s) => s.spanId === spanId)
      if (traceSpan) return traceSpan
    }

    return undefined
  }

  getCurrentSpan(): TraceSpan | undefined {
    return this.spanStack[this.spanStack.length - 1]
  }

  getCurrentTraceId(): string | null {
    return this.currentTraceId
  }

  getTrace(traceId: string): AgentTrace | undefined {
    return this.traces.get(traceId)
  }

  getAllTraces(): AgentTrace[] {
    return Array.from(this.traces.values())
  }

  getPerformanceMetrics(sessionId: string): PerformanceMetrics {
    const sessionTraces = Array.from(this.traces.values()).filter((t) => t.sessionId === sessionId)

    let totalDuration = 0
    let llmCalls = 0
    let toolCalls = 0
    let tokensUsed = 0
    let leadsProcessed = 0
    let totalLeadTime = 0
    let errorCount = 0

    for (const trace of sessionTraces) {
      if (trace.endTime) {
        totalDuration += trace.endTime - trace.startTime
      }

      for (const span of trace.spans) {
        if (span.type === 'llm_call') llmCalls++
        if (span.type === 'tool_call') toolCalls++
        if (span.status === 'error') errorCount++

        if (span.attributes['tokens']) {
          tokensUsed += span.attributes['tokens'] as number
        }

        if (span.name.includes('lead') || span.name.includes('emit')) {
          leadsProcessed++
          if (span.duration) totalLeadTime += span.duration
        }
      }
    }

    return {
      sessionId,
      totalDuration,
      llmCalls,
      toolCalls,
      tokensUsed,
      leadsProcessed,
      averageLeadTime: leadsProcessed > 0 ? totalLeadTime / leadsProcessed : 0,
      errorRate: sessionTraces.length > 0 ? errorCount / sessionTraces.length : 0,
      qualityScore: this.calculateQualityScore(sessionTraces)
    }
  }

  private calculateQualityScore(traces: AgentTrace[]): number {
    if (traces.length === 0) return 0

    let score = 100
    let errorPenalty = 0
    let timeoutPenalty = 0

    for (const trace of traces) {
      if (trace.status === 'error') errorPenalty += 10
      for (const span of trace.spans) {
        if (span.status === 'error') errorPenalty += 2
        if (span.duration && span.duration > 30000) timeoutPenalty += 5
      }
    }

    score = Math.max(0, score - errorPenalty - timeoutPenalty)
    return score
  }

  exportTraces(): string {
    const data = {
      traces: Array.from(this.traces.values()),
      exportedAt: Date.now()
    }
    return JSON.stringify(data, null, 2)
  }

  clearTraces(): void {
    this.traces.clear()
    this.spanStack = []
    this.currentTraceId = null
  }

  addEventListener(event: string, callback: (event: TraceEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  removeEventListener(event: string, callback: (event: TraceEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emitEvent(type: string, data: Record<string, unknown>): void {
    const event: TraceEvent = {
      type,
      data,
      timestamp: Date.now()
    }

    const listeners = this.eventListeners.get(type) || []
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error(`Error in trace event listener: ${error}`)
      }
    }

    const allListeners = this.eventListeners.get('*') || []
    for (const listener of allListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error(`Error in trace event listener: ${error}`)
      }
    }
  }
}

export interface TraceEvent {
  type: string
  data: Record<string, unknown>
  timestamp: number
}

export class SpanContext {
  constructor(
    private observability: ObservabilitySystem,
    private spanId: string
  ) {}

  addEvent(name: string, attributes?: Record<string, unknown>): void {
    this.observability.addSpanEvent(this.spanId, name, attributes)
  }

  setAttribute(key: string, value: unknown): void {
    this.observability.setSpanAttribute(this.spanId, key, value)
  }

  end(output?: unknown, error?: string): void {
    this.observability.endSpan(this.spanId, output, error)
  }
}

export function withSpan<T>(
  observability: ObservabilitySystem,
  name: string,
  type: SpanType,
  fn: (ctx: SpanContext) => Promise<T>
): Promise<T> {
  const spanId = observability.startSpan(name, type)
  const ctx = new SpanContext(observability, spanId)

  return fn(ctx)
    .then((result) => {
      ctx.end(result)
      return result
    })
    .catch((error) => {
      ctx.end(undefined, error.message || String(error))
      throw error
    })
}

let observabilityInstance: ObservabilitySystem | null = null

export function getObservabilitySystem(): ObservabilitySystem {
  if (!observabilityInstance) {
    observabilityInstance = new ObservabilitySystem()
  }
  return observabilityInstance
}

export function resetObservabilitySystem(): void {
  observabilityInstance = new ObservabilitySystem()
}
