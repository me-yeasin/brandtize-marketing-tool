/**
 * Reflexion Pattern Implementation
 *
 * Enables agents to self-critique and improve their outputs
 * before finalizing decisions.
 */

import { ChatGroq } from '@langchain/groq'
import {
  ReflexionState,
  SelfCritique,
  ReflexionResult,
  DeliberateReasoning,
  Hypothesis
} from './types'

export class ReflexionEngine {
  private model: ChatGroq
  private maxIterations: number

  constructor(model: ChatGroq, maxIterations: number = 3) {
    this.model = model
    this.maxIterations = maxIterations
  }

  async reflect(
    originalOutput: string,
    context: string,
    criteria: string[]
  ): Promise<ReflexionResult> {
    const state: ReflexionState = {
      iteration: 0,
      maxIterations: this.maxIterations,
      originalOutput,
      critiques: [],
      refinedOutput: originalOutput,
      isComplete: false,
      improvementScore: 0
    }

    while (state.iteration < state.maxIterations && !state.isComplete) {
      state.iteration++

      const critiques = await this.selfCritique(state.refinedOutput, context, criteria)
      state.critiques.push(...critiques)

      const criticalIssues = critiques.filter((c) => c.severity === 'critical' && !c.fixed)
      const majorIssues = critiques.filter((c) => c.severity === 'major' && !c.fixed)

      if (criticalIssues.length === 0 && majorIssues.length === 0) {
        state.isComplete = true
        state.improvementScore = 100
      } else {
        state.refinedOutput = await this.refineOutput(state.refinedOutput, critiques, context)

        critiques.forEach((c) => {
          c.fixed = true
        })

        state.improvementScore = Math.min(
          100,
          state.improvementScore + (100 - state.improvementScore) * 0.5
        )
      }
    }

    return {
      originalThought: originalOutput,
      critique: state.critiques,
      refinedThought: state.refinedOutput,
      confidenceScore: state.improvementScore,
      iterations: state.iteration
    }
  }

  private async selfCritique(
    output: string,
    context: string,
    criteria: string[]
  ): Promise<SelfCritique[]> {
    const prompt = `You are a quality assurance agent. Analyze the following output and identify any issues.

CONTEXT:
${context}

OUTPUT TO ANALYZE:
${output}

CRITERIA TO CHECK:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each issue found, provide:
1. Aspect: Which area has the issue (accuracy, completeness, relevance, quality, personalization)
2. Issue: What is wrong
3. Severity: critical, major, or minor
4. Suggestion: How to fix it

Respond in JSON format:
{
  "issues": [
    {
      "aspect": "accuracy|completeness|relevance|quality|personalization",
      "issue": "description of the issue",
      "severity": "critical|major|minor",
      "suggestion": "how to fix it"
    }
  ]
}

If no issues found, return: {"issues": []}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      return (parsed.issues || []).map(
        (issue: { aspect: string; issue: string; severity: string; suggestion: string }) => ({
          aspect: issue.aspect as SelfCritique['aspect'],
          issue: issue.issue,
          severity: issue.severity as SelfCritique['severity'],
          suggestion: issue.suggestion,
          fixed: false
        })
      )
    } catch (error) {
      console.error('Self-critique error:', error)
      return []
    }
  }

  private async refineOutput(
    output: string,
    critiques: SelfCritique[],
    context: string
  ): Promise<string> {
    const unfixedCritiques = critiques.filter((c) => !c.fixed)

    if (unfixedCritiques.length === 0) return output

    const prompt = `You are refining an output based on feedback.

ORIGINAL OUTPUT:
${output}

CONTEXT:
${context}

ISSUES TO FIX:
${unfixedCritiques
  .map(
    (c, i) => `${i + 1}. [${c.severity.toUpperCase()}] ${c.aspect}: ${c.issue}
   Suggestion: ${c.suggestion}`
  )
  .join('\n\n')}

Provide an improved version that addresses all the issues while maintaining the original intent and format.
Only output the refined content, nothing else.`

    try {
      const response = await this.model.invoke(prompt)
      return response.content as string
    } catch (error) {
      console.error('Refine output error:', error)
      return output
    }
  }

  async deliberateReasoning(
    problem: string,
    context: string,
    options: string[]
  ): Promise<DeliberateReasoning> {
    const reasoning: DeliberateReasoning = {
      internalThoughts: [],
      scratchpad: [],
      hypotheses: [],
      publicSummary: '',
      publicDecision: '',
      publicConfidence: 0
    }

    let stepNum = 0
    reasoning.scratchpad.push(`Problem: ${problem}`)
    reasoning.scratchpad.push(`Context: ${context}`)
    reasoning.scratchpad.push(`Options: ${options.join(', ')}`)

    for (const option of options) {
      stepNum++
      const hypothesis: Hypothesis = {
        id: `hyp_${stepNum}`,
        statement: option,
        evidence: [],
        confidence: 0,
        status: 'active'
      }

      const evaluationPrompt = `Evaluate this option for the given problem.

PROBLEM: ${problem}
CONTEXT: ${context}
OPTION TO EVALUATE: ${option}

Provide:
1. Pros (list)
2. Cons (list)
3. Confidence score (0-100)
4. Recommendation (proceed/reconsider/reject)

Respond in JSON:
{
  "pros": ["..."],
  "cons": ["..."],
  "confidence": 75,
  "recommendation": "proceed|reconsider|reject"
}`

      try {
        const response = await this.model.invoke(evaluationPrompt)
        const content = response.content as string
        const jsonMatch = content.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          hypothesis.evidence = [...(parsed.pros || []), ...(parsed.cons || [])]
          hypothesis.confidence = parsed.confidence || 50

          if (parsed.recommendation === 'proceed') {
            hypothesis.status = 'confirmed'
          } else if (parsed.recommendation === 'reject') {
            hypothesis.status = 'rejected'
          }
        }
      } catch (error) {
        console.error('Hypothesis evaluation error:', error)
      }

      reasoning.hypotheses.push(hypothesis)

      reasoning.internalThoughts.push({
        step: stepNum,
        thought: `Evaluated option: ${option}`,
        action: 'evaluate_hypothesis',
        observation: `Confidence: ${hypothesis.confidence}%, Status: ${hypothesis.status}`,
        evaluation: hypothesis.evidence.join('; '),
        timestamp: Date.now()
      })
    }

    const confirmedHypotheses = reasoning.hypotheses.filter((h) => h.status === 'confirmed')
    const bestHypothesis =
      confirmedHypotheses.length > 0
        ? confirmedHypotheses.reduce((a, b) => (a.confidence > b.confidence ? a : b))
        : reasoning.hypotheses.reduce((a, b) => (a.confidence > b.confidence ? a : b))

    reasoning.publicDecision = bestHypothesis.statement
    reasoning.publicConfidence = bestHypothesis.confidence
    reasoning.publicSummary = `After evaluating ${options.length} options, selected: "${bestHypothesis.statement}" with ${bestHypothesis.confidence}% confidence.`

    return reasoning
  }
}

export class LeadQualificationChecker {
  private model: ChatGroq

  constructor(model: ChatGroq) {
    this.model = model
  }

  async checkNotCompetitor(
    companyInfo: string,
    ourServices: string[]
  ): Promise<{ passed: boolean; confidence: number; evidence: string }> {
    const prompt = `Determine if this company is a COMPETITOR (offers similar services) or a POTENTIAL CLIENT.

COMPANY INFO:
${companyInfo}

OUR SERVICES:
${ourServices.join(', ')}

A competitor is a company that OFFERS the same services we do (web development, app development, etc.).
A potential client is a company that NEEDS these services (any business that might need a website/app).

Respond in JSON:
{
  "isCompetitor": true/false,
  "confidence": 0-100,
  "reasoning": "why you think this"
}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          passed: !parsed.isCompetitor,
          confidence: parsed.confidence || 50,
          evidence: parsed.reasoning || ''
        }
      }
    } catch (error) {
      console.error('Competitor check error:', error)
    }

    return { passed: true, confidence: 50, evidence: 'Unable to determine' }
  }

  async checkInTargetNiche(
    companyInfo: string,
    targetNiche: string
  ): Promise<{ passed: boolean; confidence: number; evidence: string }> {
    const prompt = `Determine if this company is in the target niche.

COMPANY INFO:
${companyInfo}

TARGET NICHE:
${targetNiche}

Respond in JSON:
{
  "inNiche": true/false,
  "confidence": 0-100,
  "reasoning": "why you think this"
}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          passed: parsed.inNiche,
          confidence: parsed.confidence || 50,
          evidence: parsed.reasoning || ''
        }
      }
    } catch (error) {
      console.error('Niche check error:', error)
    }

    return { passed: true, confidence: 50, evidence: 'Unable to determine' }
  }

  async checkDecisionMaker(
    email: string,
    context: string
  ): Promise<{ passed: boolean; confidence: number; evidence: string }> {
    const emailLower = email.toLowerCase()

    // Check context for additional decision maker signals
    const hasContextSignal =
      context.toLowerCase().includes('decision') ||
      context.toLowerCase().includes('owner') ||
      context.toLowerCase().includes('founder')

    const decisionMakerPatterns = [
      'ceo',
      'cto',
      'cfo',
      'coo',
      'founder',
      'owner',
      'director',
      'president',
      'vp',
      'head',
      'chief',
      'manager',
      'lead'
    ]

    const genericPatterns = [
      'info@',
      'contact@',
      'hello@',
      'support@',
      'sales@',
      'admin@',
      'help@',
      'service@',
      'team@',
      'office@'
    ]

    const isGeneric = genericPatterns.some((p) => emailLower.includes(p))
    const isDecisionMaker = decisionMakerPatterns.some((p) => emailLower.includes(p))

    if (isDecisionMaker || hasContextSignal) {
      return {
        passed: true,
        confidence: hasContextSignal ? 90 : 85,
        evidence: hasContextSignal
          ? 'Context indicates decision maker'
          : 'Email pattern suggests decision maker role'
      }
    }

    if (isGeneric) {
      return {
        passed: false,
        confidence: 70,
        evidence: 'Generic email address, may not reach decision maker'
      }
    }

    return {
      passed: true,
      confidence: 60,
      evidence: 'Personal email, likely reaches someone important'
    }
  }

  async checkBudgetSignals(
    companyInfo: string
  ): Promise<{ passed: boolean; confidence: number; evidence: string }> {
    const budgetSignals = [
      'funding',
      'investment',
      'raised',
      'series',
      'growth',
      'expanding',
      'hiring',
      'new office',
      'acquisition'
    ]

    const infoLower = companyInfo.toLowerCase()
    const foundSignals = budgetSignals.filter((s) => infoLower.includes(s))

    if (foundSignals.length > 0) {
      return {
        passed: true,
        confidence: 70 + foundSignals.length * 5,
        evidence: `Budget signals found: ${foundSignals.join(', ')}`
      }
    }

    return {
      passed: true,
      confidence: 50,
      evidence: 'No explicit budget signals, but company may still have budget'
    }
  }

  async checkNeedSignals(
    companyInfo: string,
    ourServices: string[]
  ): Promise<{ passed: boolean; confidence: number; evidence: string }> {
    const prompt = `Analyze if this company likely NEEDS these services.

COMPANY INFO:
${companyInfo}

SERVICES TO CHECK NEED FOR:
${ourServices.join(', ')}

Look for signals like:
- Outdated website/technology
- No online presence
- Growing business
- Mentioned pain points
- Job postings for related roles

Respond in JSON:
{
  "hasNeed": true/false,
  "confidence": 0-100,
  "signals": ["list of need signals found"],
  "reasoning": "explanation"
}`

    try {
      const response = await this.model.invoke(prompt)
      const content = response.content as string
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          passed: parsed.hasNeed,
          confidence: parsed.confidence || 50,
          evidence: parsed.reasoning || ''
        }
      }
    } catch (error) {
      console.error('Need signals check error:', error)
    }

    return { passed: true, confidence: 50, evidence: 'Unable to fully determine need' }
  }
}

export function createReflexionEngine(model: ChatGroq, maxIterations?: number): ReflexionEngine {
  return new ReflexionEngine(model, maxIterations)
}

export function createLeadQualificationChecker(model: ChatGroq): LeadQualificationChecker {
  return new LeadQualificationChecker(model)
}
