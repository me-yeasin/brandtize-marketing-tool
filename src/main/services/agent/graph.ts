import { WebContents } from 'electron'
import { calculateLeadScore, deduplicateLeads } from './lead-quality'
import { discoverNearbyCities, generateQueryVariations, getFallbackCities } from './nearby-cities'
import { expandSearchForCountry, planSearchStrategy } from './planner'
import {
  executeFacebookSearch,
  executeGoogleMapsSearch,
  executeTripAdvisorSearch,
  executeTrustpilotSearch,
  executeYellowPagesSearch,
  executeYelpSearch
} from './tools'
import { AgentLead, AgentPreferences, AgentState, LogEntry, SearchTask } from './types'

// Global state tracking
let currentState: AgentState | null = null
let stopRequested = false
let seenLeadKeys: Set<string> = new Set() // For deduplication

// Configuration for never-stop behavior
const MAX_EXPANSION_ROUNDS = 10 // Maximum rounds of expansion before giving up
const MIN_LEADS_PER_CITY = 3 // If city yields less, try alternatives

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

function applyFilters(leads: AgentLead[], filters: AgentPreferences['filters']): AgentLead[] {
  return leads.filter((lead) => {
    if (filters.hasWebsite && lead.website) return false
    if (filters.hasEmail && !lead.email) return false
    if (filters.hasPhone && !lead.phone) return false
    return true
  })
}

function isGoalReached(state: AgentState): boolean {
  return state.currentLeadCount >= state.targetLeadCount
}

export async function startAgent(
  preferences: AgentPreferences,
  sender: WebContents
): Promise<void> {
  stopRequested = false
  seenLeadKeys = new Set() // Reset deduplication tracking

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

  emitLog(sender, '🚀 Agent started with NEVER-STOP mode enabled!', 'info')
  emitLog(
    sender,
    `🎯 Target: ${preferences.leadLimit} leads. Will keep searching until goal met.`,
    'info'
  )

  try {
    // 1. Initial Planning
    emitLog(sender, `📋 Analyzing niche "${preferences.niche}" and locations...`, 'info')

    const initialPlan = await planSearchStrategy(preferences, {
      onLocationClassified: (location, type) => {
        emitLog(sender, `📍 ${location} → ${type}`, 'info')
      },
      onResearchingCountry: (country) => {
        emitLog(sender, `🔍 Researching best cities in ${country}...`, 'info')
        currentState!.processedCountries.push(country)
      },
      onCitiesDiscovered: (country, cities) => {
        emitLog(sender, `✅ Found ${cities.length} cities in ${country}`, 'success')
      }
    })

    if (stopRequested) return

    currentState.plan = initialPlan
    sender.send('agent-plan-updated', initialPlan)

    // 2. MAIN NEVER-STOP LOOP
    await neverStopLoop(sender, initialPlan)

    // Final status
    if (!stopRequested) {
      if (isGoalReached(currentState)) {
        emitLog(
          sender,
          `🎉 Mission Complete! Found ${currentState.currentLeadCount} leads.`,
          'success'
        )
      } else {
        emitLog(
          sender,
          `⚠️ Search exhausted. Found ${currentState.currentLeadCount}/${currentState.targetLeadCount} leads.`,
          'warning'
        )
      }
    }
  } catch (error) {
    console.error('Agent Loop Error:', error)
    emitLog(
      sender,
      `Critical Error: ${error instanceof Error ? error.message : String(error)}`,
      'error'
    )
  } finally {
    currentState.isRunning = false
    sender.send('agent-stopped')
  }
}

/**
 * NEVER-STOP LOOP: Keeps searching until goal is reached
 */
async function neverStopLoop(sender: WebContents, initialTasks: SearchTask[]): Promise<void> {
  let pendingTasks = [...initialTasks]
  let expansionRound = 0
  const usedQueries: string[] = [currentState!.preferences.niche]

  // MAIN WHILE LOOP - Never stops until goal reached or max rounds
  while (!stopRequested && !isGoalReached(currentState!) && expansionRound < MAX_EXPANSION_ROUNDS) {
    // Execute pending tasks
    if (pendingTasks.length > 0) {
      emitLog(
        sender,
        `📊 Round ${expansionRound + 1}: ${pendingTasks.length} tasks pending`,
        'info'
      )
      await executeTasks(sender, pendingTasks)
      pendingTasks = [] // Clear after execution
    }

    // Check if we need to continue
    if (stopRequested || isGoalReached(currentState!)) break

    // EXPANSION STRATEGIES
    expansionRound++
    emitLog(
      sender,
      `🔄 Goal not met (${currentState!.currentLeadCount}/${currentState!.targetLeadCount}). Expanding search - Round ${expansionRound}...`,
      'warning'
    )

    const newTasks = await generateMoreTasks(sender, usedQueries)

    if (newTasks.length > 0) {
      pendingTasks = newTasks
      emitLog(sender, `📋 Generated ${newTasks.length} new search tasks`, 'success')
    } else {
      emitLog(sender, `⚠️ No more expansion options available`, 'warning')
      break
    }
  }

  if (expansionRound >= MAX_EXPANSION_ROUNDS && !isGoalReached(currentState!)) {
    emitLog(sender, `⛔ Maximum expansion rounds (${MAX_EXPANSION_ROUNDS}) reached`, 'warning')
  }
}

/**
 * Generate more tasks when current ones are exhausted
 */
async function generateMoreTasks(
  sender: WebContents,
  usedQueries: string[]
): Promise<SearchTask[]> {
  const newTasks: SearchTask[] = []
  const niche = currentState!.preferences.niche

  // Strategy 1: Expand from processed countries
  if (currentState!.processedCountries.length > 0) {
    emitLog(sender, `🌍 Strategy 1: Researching more cities from countries...`, 'info')

    for (const country of currentState!.processedCountries) {
      if (stopRequested || isGoalReached(currentState!)) break

      const countryTasks = await expandSearchForCountry(
        country,
        currentState!.preferences,
        currentState!.searchedCities
      )

      if (countryTasks.length > 0) {
        newTasks.push(...countryTasks)
        emitLog(sender, `📍 Found ${countryTasks.length} new cities in ${country}`, 'info')
      }
    }

    if (newTasks.length > 0) return newTasks
  }

  // Strategy 2: Discover nearby cities using AI
  const lastCity = currentState!.searchedCities[currentState!.searchedCities.length - 1]
  const lastCountry = currentState!.processedCountries[0] || ''

  if (lastCity && lastCountry) {
    emitLog(sender, `🗺️ Strategy 2: Discovering cities near ${lastCity}...`, 'info')

    const nearbyCities = await discoverNearbyCities(
      lastCity,
      lastCountry,
      currentState!.searchedCities
    )

    for (const city of nearbyCities) {
      newTasks.push({
        id: crypto.randomUUID(),
        query: niche,
        location: city,
        source: 'google_maps',
        status: 'pending',
        discoveredFromCountry: lastCountry
      })
    }

    if (newTasks.length > 0) return newTasks
  }

  // Strategy 3: Try query variations
  emitLog(sender, `💡 Strategy 3: Trying query variations for "${niche}"...`, 'info')

  const queryVariations = await generateQueryVariations(niche, usedQueries)

  if (queryVariations.length > 0) {
    const cityToRetry = currentState!.searchedCities.slice(0, 3) // Retry first 3 cities with new query

    for (const query of queryVariations) {
      usedQueries.push(query)

      for (const city of cityToRetry) {
        newTasks.push({
          id: crypto.randomUUID(),
          query: query,
          location: city,
          source: 'google_maps',
          status: 'pending'
        })
      }
    }
  }

  if (newTasks.length > 0) return newTasks

  // Strategy 4: Fallback to major cities
  if (currentState!.processedCountries.length > 0) {
    emitLog(sender, `🏙️ Strategy 4: Trying fallback major cities...`, 'info')

    for (const country of currentState!.processedCountries) {
      const fallbackCities = getFallbackCities(country).filter(
        (c) => !currentState!.searchedCities.includes(c)
      )

      for (const city of fallbackCities.slice(0, 5)) {
        newTasks.push({
          id: crypto.randomUUID(),
          query: niche,
          location: city,
          source: 'google_maps',
          status: 'pending',
          discoveredFromCountry: country
        })
      }
    }
  }

  return newTasks
}

/**
 * Execute a batch of search tasks - PARALLEL MODE
 * Groups tasks by location and runs all sources simultaneously for each location
 */
async function executeTasks(sender: WebContents, tasks: SearchTask[]): Promise<void> {
  // Group tasks by location for parallel execution
  const tasksByLocation = new Map<string, SearchTask[]>()
  for (const task of tasks) {
    const key = task.discoveredFromCountry
      ? `${task.location}|${task.discoveredFromCountry}`
      : task.location
    if (!tasksByLocation.has(key)) {
      tasksByLocation.set(key, [])
    }
    tasksByLocation.get(key)!.push(task)
  }

  // Process each location with parallel source searches
  for (const [locationKey, locationTasks] of tasksByLocation) {
    if (stopRequested || isGoalReached(currentState!)) break

    const [location, country] = locationKey.split('|')
    const taskLabel = country ? `${location} (${country})` : location

    if (!currentState!.searchedCities.includes(location)) {
      currentState!.searchedCities.push(location)
    }

    // Log start of parallel search for this location
    const sourceCount = locationTasks.length
    emitLog(
      sender,
      `⚡ Parallel search: "${locationTasks[0].query}" in ${taskLabel} (${sourceCount} sources)`,
      'info'
    )

    // Execute all sources for this location IN PARALLEL
    const executeSource = async (
      task: SearchTask
    ): Promise<{ source: string; leads: AgentLead[] }> => {
      try {
        let leads: AgentLead[] = []
        if (task.source === 'google_maps') {
          leads = await executeGoogleMapsSearch(task)
        } else if (task.source === 'facebook') {
          leads = await executeFacebookSearch(task)
        } else if (task.source === 'yelp') {
          leads = await executeYelpSearch(task)
        } else if (task.source === 'yellow_pages') {
          leads = await executeYellowPagesSearch(task)
        } else if (task.source === 'tripadvisor') {
          leads = await executeTripAdvisorSearch(task)
        } else if (task.source === 'trustpilot') {
          leads = await executeTrustpilotSearch(task)
        }
        return { source: task.source, leads }
      } catch (error) {
        console.error(`[${task.source}] Search failed:`, error)
        return { source: task.source, leads: [] }
      }
    }

    // Run all sources in parallel
    const results = await Promise.allSettled(locationTasks.map(executeSource))
    currentState!.currentTaskIndex += locationTasks.length

    // Collect all leads from parallel results
    let allLeads: AgentLead[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { source, leads } = result.value
        if (leads.length > 0) {
          emitLog(sender, `✅ ${source}: ${leads.length} leads`, 'success')
          allLeads = allLeads.concat(leads)
        }
      } else {
        emitLog(sender, `⚠️ Source failed: ${result.reason}`, 'warning')
      }
    }

    // Apply filters
    const filteredLeads = applyFilters(allLeads, currentState!.preferences.filters)
    const filteredCount = allLeads.length - filteredLeads.length

    if (filteredCount > 0) {
      emitLog(sender, `🔧 Filtered ${filteredCount} leads (criteria)`, 'info')
    }

    // Apply deduplication
    const { uniqueLeads, duplicateCount } = deduplicateLeads(filteredLeads, seenLeadKeys)

    if (duplicateCount > 0) {
      emitLog(sender, `🔄 Removed ${duplicateCount} duplicate leads`, 'info')
    }

    if (allLeads.length < MIN_LEADS_PER_CITY) {
      emitLog(sender, `⚠️ Low results in ${location} (${allLeads.length})`, 'warning')
    }

    // Calculate score and process leads
    for (const lead of uniqueLeads) {
      if (isGoalReached(currentState!)) break

      // Calculate and add score to lead metadata
      const score = calculateLeadScore(lead)
      lead.metadata = { ...lead.metadata, score }

      // Auto-enrichment based on filter settings
      const filters = currentState!.preferences.filters
      let skipLead = false

      // Auto-verify WhatsApp - skip leads without verified WhatsApp
      if (filters.autoVerifyWA && lead.phone) {
        const { enrichLeadWithWhatsApp } = await import('./lead-enrichment')
        const waResult = await enrichLeadWithWhatsApp(lead)
        if (waResult.hasWhatsApp !== undefined) {
          lead.hasWhatsApp = waResult.hasWhatsApp
          if (!waResult.hasWhatsApp) {
            emitLog(sender, `⏭️ Skipped (no WhatsApp): ${lead.name}`, 'info')
            skipLead = true
          } else {
            emitLog(sender, `✅ WhatsApp verified: ${lead.name}`, 'success')
          }
        }
      } else if (filters.autoVerifyWA && !lead.phone) {
        // No phone = skip if WhatsApp verification required
        emitLog(sender, `⏭️ Skipped (no phone): ${lead.name}`, 'info')
        skipLead = true
      }

      // Auto-verify Email - skip leads with invalid email
      if (!skipLead && filters.autoVerifyEmail && lead.email) {
        const { enrichLeadWithEmailVerification } = await import('./lead-enrichment')
        const emailResult = await enrichLeadWithEmailVerification(lead)
        if (emailResult.emailVerified !== undefined) {
          lead.emailVerified = emailResult.emailVerified
          if (!emailResult.emailVerified) {
            emitLog(sender, `⏭️ Skipped (invalid email): ${lead.name}`, 'info')
            skipLead = true
          } else {
            emitLog(sender, `✅ Email verified: ${lead.name}`, 'success')
          }
        }
      } else if (!skipLead && filters.autoVerifyEmail && !lead.email) {
        // No email = skip if email verification required
        emitLog(sender, `⏭️ Skipped (no email): ${lead.name}`, 'info')
        skipLead = true
      }

      // Auto-find and verify Email - skip leads where email not found or invalid
      if (!skipLead && filters.autoFindEmail && !lead.email && lead.website) {
        const { enrichLeadWithEmailFinder } = await import('./lead-enrichment')
        const findResult = await enrichLeadWithEmailFinder(lead)
        if (findResult.email) {
          lead.email = findResult.email
          lead.emailVerified = findResult.emailVerified
          if (!findResult.emailVerified) {
            emitLog(sender, `⏭️ Skipped (found but invalid): ${lead.name}`, 'info')
            skipLead = true
          } else {
            emitLog(sender, `✅ Found & verified: ${lead.email}`, 'success')
          }
        } else {
          emitLog(sender, `⏭️ Skipped (no email found): ${lead.name}`, 'info')
          skipLead = true
        }
      } else if (!skipLead && filters.autoFindEmail && !lead.email && !lead.website) {
        // No email and no website = skip if find email required
        emitLog(sender, `⏭️ Skipped (no email/website): ${lead.name}`, 'info')
        skipLead = true
      }

      // Only add lead if it passed all verification checks
      if (!skipLead) {
        currentState!.results.push(lead)
        currentState!.currentLeadCount++
        emitLead(sender, lead)
      }

      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    const progressPercent = Math.round(
      (currentState!.currentLeadCount / currentState!.targetLeadCount) * 100
    )
    emitLog(
      sender,
      `✅ +${uniqueLeads.length} leads from ${location}. Progress: ${currentState!.currentLeadCount}/${currentState!.targetLeadCount} (${progressPercent}%)`,
      'success'
    )

    // Brief delay between tasks
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}
