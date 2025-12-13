/**
 * Feedback Loop System
 *
 * Tracks email outcomes and learns from responses:
 * - Email response tracking
 * - Outcome analysis
 * - Pattern learning
 * - Continuous improvement
 */

import { FeedbackLoop, EmailResponse, LeadOutcome, FeedbackAnalysis } from './types'

interface FeedbackRecord {
  leadId: string
  email: string
  niche: string
  templateUsed: string
  personalizationLevel: number
  leadScore: number
  feedback: FeedbackLoop
  createdAt: number
}

interface LearningInsight {
  type: 'positive' | 'negative' | 'neutral'
  pattern: string
  confidence: number
  sampleSize: number
  recommendation: string
}

export class FeedbackLoopSystem {
  private records: Map<string, FeedbackRecord> = new Map()
  private insights: LearningInsight[] = []

  registerLead(
    leadId: string,
    email: string,
    niche: string,
    templateUsed: string,
    personalizationLevel: number,
    leadScore: number
  ): void {
    const record: FeedbackRecord = {
      leadId,
      email,
      niche,
      templateUsed,
      personalizationLevel,
      leadScore,
      feedback: {
        leadId,
        emailSent: false,
        learnings: []
      },
      createdAt: Date.now()
    }
    this.records.set(leadId, record)
  }

  markEmailSent(leadId: string): void {
    const record = this.records.get(leadId)
    if (record) {
      record.feedback.emailSent = true
      record.feedback.sentAt = Date.now()
    }
  }

  recordResponse(leadId: string, response: EmailResponse): void {
    const record = this.records.get(leadId)
    if (record) {
      record.feedback.response = response

      // Extract learnings from response
      const learnings = this.extractLearnings(record, response)
      record.feedback.learnings.push(...learnings)

      // Update insights
      this.updateInsights(record, response)
    }
  }

  recordOutcome(leadId: string, outcome: LeadOutcome): void {
    const record = this.records.get(leadId)
    if (record) {
      record.feedback.outcome = outcome

      // Extract outcome learnings
      const learnings = this.extractOutcomeLearnings(record, outcome)
      record.feedback.learnings.push(...learnings)

      // Update insights
      this.updateOutcomeInsights(record, outcome)
    }
  }

  private extractLearnings(record: FeedbackRecord, response: EmailResponse): string[] {
    const learnings: string[] = []

    if (response.type === 'positive') {
      learnings.push(`Positive response from ${record.niche} lead with score ${record.leadScore}`)
      learnings.push(`Personalization level ${record.personalizationLevel} worked well`)
    } else if (response.type === 'negative') {
      learnings.push(`Negative response - review template for ${record.niche}`)
      if (response.content) {
        // Analyze negative response content
        const objections = this.identifyObjections(response.content)
        learnings.push(...objections.map((o) => `Objection identified: ${o}`))
      }
    } else if (response.type === 'bounce') {
      learnings.push(`Email bounced for ${record.email} - mark as invalid`)
    }

    return learnings
  }

  private extractOutcomeLearnings(record: FeedbackRecord, outcome: LeadOutcome): string[] {
    const learnings: string[] = []

    if (outcome.converted) {
      learnings.push(`Conversion success: ${record.niche} with score ${record.leadScore}`)
      learnings.push(`Winning template pattern identified for ${record.niche}`)
    } else if (outcome.stage === 'lost') {
      learnings.push(`Lost deal: ${outcome.feedback || 'No feedback provided'}`)
    }

    return learnings
  }

  private identifyObjections(content: string): string[] {
    const objections: string[] = []
    const lowerContent = content.toLowerCase()

    const objectionPatterns = [
      { pattern: /not interested/i, objection: 'Not interested' },
      { pattern: /no budget/i, objection: 'Budget constraint' },
      { pattern: /not the right time/i, objection: 'Timing issue' },
      { pattern: /already have|using another/i, objection: 'Has existing solution' },
      { pattern: /remove|unsubscribe/i, objection: 'Requested removal' },
      { pattern: /too expensive|cost/i, objection: 'Price concern' },
      { pattern: /not relevant/i, objection: 'Relevance issue' }
    ]

    for (const { pattern, objection } of objectionPatterns) {
      if (pattern.test(lowerContent)) {
        objections.push(objection)
      }
    }

    return objections
  }

  private updateInsights(record: FeedbackRecord, response: EmailResponse): void {
    // Find or create insight for this niche
    let insight = this.insights.find((i) => i.pattern === `niche:${record.niche}`)

    if (!insight) {
      insight = {
        type: 'neutral',
        pattern: `niche:${record.niche}`,
        confidence: 50,
        sampleSize: 0,
        recommendation: 'Gathering data'
      }
      this.insights.push(insight)
    }

    insight.sampleSize++

    if (response.type === 'positive') {
      insight.confidence = Math.min(100, insight.confidence + 5)
      insight.type = insight.confidence > 60 ? 'positive' : 'neutral'
    } else if (response.type === 'negative' || response.type === 'bounce') {
      insight.confidence = Math.max(0, insight.confidence - 5)
      insight.type = insight.confidence < 40 ? 'negative' : 'neutral'
    }

    insight.recommendation = this.generateRecommendation(insight)
  }

  private updateOutcomeInsights(record: FeedbackRecord, outcome: LeadOutcome): void {
    // Update conversion pattern insights
    if (outcome.converted) {
      this.insights.push({
        type: 'positive',
        pattern: `conversion:score>${record.leadScore - 10}`,
        confidence: 70,
        sampleSize: 1,
        recommendation: `Leads with score above ${record.leadScore - 10} convert well`
      })
    }
  }

  private generateRecommendation(insight: LearningInsight): string {
    if (insight.sampleSize < 5) {
      return 'More data needed for reliable recommendation'
    }

    if (insight.type === 'positive') {
      return `Continue targeting ${insight.pattern.replace('niche:', '')} - good response rate`
    } else if (insight.type === 'negative') {
      return `Review approach for ${insight.pattern.replace('niche:', '')} - low response rate`
    }

    return 'Moderate results - consider A/B testing different approaches'
  }

  analyze(): FeedbackAnalysis {
    const records = Array.from(this.records.values())
    const sentRecords = records.filter((r) => r.feedback.emailSent)
    const respondedRecords = sentRecords.filter((r) => r.feedback.response)
    const positiveRecords = respondedRecords.filter((r) => r.feedback.response?.type === 'positive')
    const convertedRecords = records.filter((r) => r.feedback.outcome?.converted)

    // Identify common objections
    const allObjections: string[] = []
    for (const record of respondedRecords) {
      if (record.feedback.response?.type === 'negative' && record.feedback.response.content) {
        allObjections.push(...this.identifyObjections(record.feedback.response.content))
      }
    }
    const objectionCounts = this.countOccurrences(allObjections)
    const commonObjections = Object.entries(objectionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([objection]) => objection)

    // Identify success patterns
    const successPatterns: string[] = []
    for (const record of convertedRecords) {
      successPatterns.push(`High score (${record.leadScore}+) in ${record.niche}`)
      successPatterns.push(`Personalization level ${record.personalizationLevel}`)
    }

    // Identify improvement areas
    const improvementAreas: string[] = []
    const negativeInsights = this.insights.filter((i) => i.type === 'negative')
    for (const insight of negativeInsights) {
      improvementAreas.push(insight.recommendation)
    }

    return {
      totalSent: sentRecords.length,
      responseRate:
        sentRecords.length > 0 ? (respondedRecords.length / sentRecords.length) * 100 : 0,
      positiveRate:
        respondedRecords.length > 0 ? (positiveRecords.length / respondedRecords.length) * 100 : 0,
      conversionRate:
        sentRecords.length > 0 ? (convertedRecords.length / sentRecords.length) * 100 : 0,
      commonObjections,
      successPatterns: [...new Set(successPatterns)],
      improvementAreas: [...new Set(improvementAreas)]
    }
  }

  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }

  getInsights(): LearningInsight[] {
    return this.insights.filter((i) => i.sampleSize >= 3)
  }

  getLearningsForNiche(niche: string): string[] {
    const records = Array.from(this.records.values()).filter((r) => r.niche === niche)

    const learnings: string[] = []
    for (const record of records) {
      learnings.push(...record.feedback.learnings)
    }

    return [...new Set(learnings)]
  }

  getRecommendationsForNiche(niche: string): string[] {
    const insights = this.insights.filter((i) => i.pattern.includes(niche) && i.sampleSize >= 3)

    return insights.map((i) => i.recommendation)
  }

  exportData(): {
    records: FeedbackRecord[]
    insights: LearningInsight[]
    analysis: FeedbackAnalysis
  } {
    return {
      records: Array.from(this.records.values()),
      insights: this.insights,
      analysis: this.analyze()
    }
  }

  importData(data: { records?: FeedbackRecord[]; insights?: LearningInsight[] }): void {
    if (data.records) {
      for (const record of data.records) {
        this.records.set(record.leadId, record)
      }
    }
    if (data.insights) {
      this.insights = data.insights
    }
  }

  clear(): void {
    this.records.clear()
    this.insights = []
  }
}

// Singleton instance
let feedbackSystem: FeedbackLoopSystem | null = null

export function getFeedbackSystem(): FeedbackLoopSystem {
  if (!feedbackSystem) {
    feedbackSystem = new FeedbackLoopSystem()
  }
  return feedbackSystem
}

export function createFeedbackSystem(): FeedbackLoopSystem {
  return new FeedbackLoopSystem()
}
