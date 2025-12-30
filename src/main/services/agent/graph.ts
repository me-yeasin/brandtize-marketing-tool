import { WebContents } from 'electron'
import { planSearchStrategy } from './planner'
import { executeFacebookSearch, executeGoogleMapsSearch } from './tools'
import { AgentLead, AgentPreferences, AgentState, LogEntry } from './types'

// Global state tracking (simplified for single-window app)
let currentState: AgentState | null = null
let stopRequested = false

export function stopAgent(): void {
  stopRequested = true
}

function emitLog(sender: WebContents, message: string, type: LogEntry['type'] = 'info'): void {
  const log: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  }
  sender.send('agent-log', log)
}

function emitLead(sender: WebContents, lead: AgentLead): void {
  sender.send('agent-lead-found', lead)
}

export async function startAgent(
  preferences: AgentPreferences,
  sender: WebContents
): Promise<void> {
  stopRequested = false

  currentState = {
    preferences,
    plan: [],
    results: [],
    logs: [],
    isRunning: true,
    currentTaskIndex: 0
  }

  emitLog(sender, 'Agent started. Initializing...', 'info')

  try {
    // 1. Planner Node
    emitLog(sender, `Analyzing niche "${preferences.niche}" and locations...`, 'info')

    // In a real implementation, we would call the actual LLM Planner here.
    // For now, we will use the planner logic we implemented which uses the AiService.
    const plan = await planSearchStrategy(preferences)

    if (stopRequested) return

    currentState.plan = plan
    emitLog(sender, `Devised plan with ${plan.length} search tasks.`, 'success')

    sender.send('agent-plan-updated', plan)

    // 2. Executor Loop
    for (const task of plan) {
      if (stopRequested) {
        emitLog(sender, 'Agent stopped by user.', 'warning')
        break
      }

      currentState.currentTaskIndex++
      emitLog(
        sender,
        `Executing Task ${currentState.currentTaskIndex}/${plan.length}: ${task.query} (${task.source})`,
        'info'
      )

      let leads: AgentLead[] = []

      if (task.source === 'google_maps') {
        leads = await executeGoogleMapsSearch(task)
      } else if (task.source === 'facebook') {
        leads = await executeFacebookSearch(task)
      }

      // Process Leads
      for (const lead of leads) {
        // Here we could add the "Enricher Node" logic (Verify Email/WA)
        // For now, we just emit them
        currentState.results.push(lead)
        emitLead(sender, lead)

        // Basic rate limit / simulation delay
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      emitLog(sender, `Task complete. Found ${leads.length} leads.`, 'success')

      // Delay between tasks
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (!stopRequested) {
      emitLog(sender, 'All tasks completed successfully.', 'success')
    }
  } catch (error) {
    console.error('Agent Loop Error:', error)
    emitLog(
      sender,
      `Critical Agent Error: ${error instanceof Error ? error.message : String(error)}`,
      'error'
    )
  } finally {
    currentState.isRunning = false
    sender.send('agent-stopped')
  }
}
