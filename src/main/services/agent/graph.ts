import { WebContents } from 'electron'
import { expandSearchForCountry, planSearchStrategy } from './planner'
import { executeFacebookSearch, executeGoogleMapsSearch } from './tools'
import { AgentLead, AgentPreferences, AgentState, LogEntry, SearchTask } from './types'

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

/**
 * Apply filters to leads based on user preferences
 * When filter is TRUE, we only keep leads that LACK that feature
 * (e.g., hasWebsite: true → keep leads WITHOUT website)
 */
function applyFilters(leads: AgentLead[], filters: AgentPreferences['filters']): AgentLead[] {
  return leads.filter((lead) => {
    // If hasWebsite filter is on, only keep leads WITHOUT a website
    if (filters.hasWebsite && lead.website) {
      return false
    }
    // If hasEmail filter is on, only keep leads WITH an email
    if (filters.hasEmail && !lead.email) {
      return false
    }
    // If hasPhone filter is on, only keep leads WITH a phone
    if (filters.hasPhone && !lead.phone) {
      return false
    }
    return true
  })
}

/**
 * Check if we've reached our goal
 */
function isGoalReached(state: AgentState): boolean {
  return state.currentLeadCount >= state.targetLeadCount
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
    currentTaskIndex: 0,
    targetLeadCount: preferences.leadLimit,
    currentLeadCount: 0,
    processedCountries: [],
    searchedCities: []
  }

  emitLog(sender, 'Agent started. Initializing...', 'info')

  try {
    // 1. Planner Node with callbacks for progress updates
    emitLog(sender, `Analyzing niche "${preferences.niche}" and locations...`, 'info')

    const plan = await planSearchStrategy(preferences, {
      onLocationClassified: (location, type) => {
        emitLog(sender, `📍 ${location} → ${type}`, 'info')
      },
      onResearchingCountry: (country) => {
        emitLog(sender, `🔍 Researching best cities in ${country}...`, 'info')
        currentState!.processedCountries.push(country)
      },
      onCitiesDiscovered: (country, cities) => {
        emitLog(
          sender,
          `✅ Found ${cities.length} cities in ${country}: ${cities.join(', ')}`,
          'success'
        )
      }
    })

    if (stopRequested) return

    currentState.plan = plan
    emitLog(sender, `📋 Created plan with ${plan.length} search tasks.`, 'success')
    emitLog(sender, `🎯 Target: ${preferences.leadLimit} leads`, 'info')

    sender.send('agent-plan-updated', plan)

    // 2. Goal-Driven Executor Loop
    await executeTasksUntilGoal(sender, plan)

    // 3. If goal not reached, try to expand search
    if (!stopRequested && !isGoalReached(currentState)) {
      await expandSearchIfNeeded(sender)
    }

    if (!stopRequested) {
      if (isGoalReached(currentState)) {
        emitLog(sender, `🎉 Goal reached! Found ${currentState.currentLeadCount} leads.`, 'success')
      } else {
        emitLog(
          sender,
          `✅ Search complete. Found ${currentState.currentLeadCount}/${currentState.targetLeadCount} leads.`,
          'success'
        )
      }
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

/**
 * Execute tasks until goal is reached or all tasks are done
 */
async function executeTasksUntilGoal(sender: WebContents, tasks: SearchTask[]): Promise<void> {
  for (const task of tasks) {
    if (stopRequested) {
      emitLog(sender, 'Agent stopped by user.', 'warning')
      break
    }

    if (isGoalReached(currentState!)) {
      emitLog(sender, `🎯 Goal reached! Stopping search.`, 'success')
      break
    }

    currentState!.currentTaskIndex++
    currentState!.searchedCities.push(task.location)

    const taskLabel = task.discoveredFromCountry
      ? `${task.location} (from ${task.discoveredFromCountry})`
      : task.location

    emitLog(
      sender,
      `🔎 Task ${currentState!.currentTaskIndex}/${tasks.length}: Searching "${task.query}" in ${taskLabel} (${task.source})`,
      'info'
    )

    let leads: AgentLead[] = []

    if (task.source === 'google_maps') {
      leads = await executeGoogleMapsSearch(task)
    } else if (task.source === 'facebook') {
      leads = await executeFacebookSearch(task)
    }

    // Apply filters
    const filteredLeads = applyFilters(leads, currentState!.preferences.filters)
    const filteredCount = leads.length - filteredLeads.length

    if (filteredCount > 0) {
      emitLog(sender, `🔧 Filtered out ${filteredCount} leads (didn't match criteria)`, 'info')
    }

    // Process and emit leads
    for (const lead of filteredLeads) {
      if (isGoalReached(currentState!)) break

      currentState!.results.push(lead)
      currentState!.currentLeadCount++
      emitLead(sender, lead)

      // Small delay between leads
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    emitLog(
      sender,
      `✅ Task complete. Found ${filteredLeads.length} leads. Total: ${currentState!.currentLeadCount}/${currentState!.targetLeadCount}`,
      'success'
    )

    // Delay between tasks
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}

/**
 * Expand search by researching more cities from processed countries
 */
async function expandSearchIfNeeded(sender: WebContents): Promise<void> {
  if (currentState!.processedCountries.length === 0) {
    return // No countries to expand from
  }

  emitLog(sender, `🔄 Goal not reached. Expanding search...`, 'warning')

  for (const country of currentState!.processedCountries) {
    if (stopRequested || isGoalReached(currentState!)) break

    const newTasks = await expandSearchForCountry(
      country,
      currentState!.preferences,
      currentState!.searchedCities
    )

    if (newTasks.length > 0) {
      emitLog(sender, `📍 Found ${newTasks.length} new cities in ${country}`, 'info')
      await executeTasksUntilGoal(sender, newTasks)
    }
  }
}
