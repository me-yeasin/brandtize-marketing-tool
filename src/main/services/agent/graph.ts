import { WebContents } from 'electron'
import { calculateLeadScore, deduplicateLeads } from './lead-quality'
import { discoverNearbyCities, generateQueryVariations, getFallbackCities } from './nearby-cities'
import { expandSearchForCountry, planSearchStrategy } from './planner'
import { executeFacebookSearch, executeGoogleMapsSearch } from './tools'
import { AgentLead, AgentPreferences, AgentState, LogEntry, SearchTask } from './types'

// Global state tracking
let currentState: AgentState | null = null
let stopRequested = false
let seenLeadKeys: Set<string> = new Set() // For deduplication
let globalAbortController: AbortController | null = null

// Configuration for never-stop behavior
const MAX_EXPANSION_ROUNDS = 10 // Maximum rounds of expansion before giving up

export function stopAgent(): void {
  stopRequested = true
  if (globalAbortController) {
    globalAbortController.abort()
    globalAbortController = null
  }
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

function startHeartbeat(
  sender: WebContents,
  message: (elapsedMs: number) => string,
  signal: AbortSignal,
  options?: { intervalMs?: number; maxBeats?: number }
): () => void {
  const intervalMs = options?.intervalMs ?? 20000
  const maxBeats = options?.maxBeats ?? 3
  const startedAt = Date.now()
  let beats = 0

  const interval = setInterval(() => {
    if (signal.aborted) return
    beats++
    if (beats > maxBeats) {
      clearInterval(interval)
      return
    }
    emitLog(sender, message(Date.now() - startedAt), 'info')
  }, intervalMs)

  const onAbort = (): void => {
    clearInterval(interval)
  }
  signal.addEventListener('abort', onAbort, { once: true })

  return () => {
    clearInterval(interval)
    signal.removeEventListener('abort', onAbort)
  }
}

export async function startAgent(
  preferences: AgentPreferences,
  sender: WebContents
): Promise<void> {
  stopRequested = false
  seenLeadKeys = new Set() // Reset deduplication tracking
  globalAbortController = new AbortController()

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
    emitLog(sender, `📋 Analyzing niche "${preferences.niche}" and locations...`, 'info')

    const stopPlanningHeartbeat = startHeartbeat(
      sender,
      (elapsedMs) => `⏳ Still planning... (${Math.round(elapsedMs / 1000)}s)`,
      globalAbortController.signal,
      { intervalMs: 15000, maxBeats: 6 }
    )

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
    stopPlanningHeartbeat()

    if (stopRequested) return

    currentState.plan = initialPlan
    sender.send('agent-plan-updated', initialPlan)
    emitLog(sender, `📋 Initial plan ready: ${initialPlan.length} tasks`, 'success')

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
  while (
    !stopRequested &&
    !isGoalReached(currentState!) &&
    expansionRound < MAX_EXPANSION_ROUNDS &&
    !globalAbortController?.signal.aborted
  ) {
    // Execute pending tasks
    if (pendingTasks.length > 0) {
      emitLog(
        sender,
        `📊 Round ${expansionRound + 1}: ${pendingTasks.length} tasks pending`,
        'info'
      )
      await executeTasks(sender, pendingTasks, globalAbortController!.signal)
      pendingTasks = [] // Clear after execution
    }

    // Check if we need to continue
    if (stopRequested || isGoalReached(currentState!) || globalAbortController?.signal.aborted)
      break

    // EXPANSION STRATEGIES
    expansionRound++
    emitLog(
      sender,
      `🔄 Goal not met (${currentState!.currentLeadCount}/${currentState!.targetLeadCount}). Expanding search - Round ${expansionRound}...`,
      'warning'
    )

    const stopExpansionHeartbeat = startHeartbeat(
      sender,
      (elapsedMs) => `⏳ Still generating new tasks... (${Math.round(elapsedMs / 1000)}s)`,
      globalAbortController!.signal,
      { intervalMs: 15000, maxBeats: 6 }
    )
    const newTasks = await generateMoreTasks(sender, usedQueries)
    stopExpansionHeartbeat()

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
  const lastCountry = currentState!.processedCountries[0]

  if (lastCity) {
    emitLog(sender, `🗺️ Strategy 2: Discovering cities near ${lastCity}...`, 'info')

    const nearbyCities = await discoverNearbyCities(
      lastCity,
      lastCountry,
      currentState!.searchedCities
    )
    if (nearbyCities.length === 0) {
      emitLog(sender, `⚠️ No nearby cities discovered near ${lastCity}`, 'warning')
    } else {
      emitLog(sender, `✅ Discovered ${nearbyCities.length} nearby cities`, 'success')
    }

    for (const city of nearbyCities) {
      newTasks.push({
        id: crypto.randomUUID(),
        query: niche,
        location: city,
        source: 'google_maps',
        status: 'pending',
        discoveredFromCountry: lastCountry
      })
      newTasks.push({
        id: crypto.randomUUID(),
        query: niche,
        location: city,
        source: 'facebook',
        status: 'pending',
        discoveredFromCountry: lastCountry
      })
    }

    if (newTasks.length > 0) return newTasks
  }

  // Strategy 3: Try query variations
  emitLog(sender, `💡 Strategy 3: Trying query variations for "${niche}"...`, 'info')

  const queryVariations = await generateQueryVariations(niche, usedQueries)
  if (queryVariations.length === 0) {
    emitLog(sender, `⚠️ No query variations generated for "${niche}"`, 'warning')
  } else {
    emitLog(sender, `✅ Generated ${queryVariations.length} query variations`, 'success')
  }

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

// Redefining the execution flow to be simpler and correct with the "Race" logic:
// We use a helper that simply awaits all, but we check goal inside.
// Actually, to "return early", we need the main function to await a "Goal Reached" signal OR "All Done" signal.

/* RE-IMPLEMENTATION OF EXECUTION LOGIC */
async function executeTaskBatchRace(
  sender: WebContents,
  tasks: SearchTask[],
  signal: AbortSignal
): Promise<void> {
  // Shared state implies we just launch them all.
  // We want to return AS SOON AS goal reached or ALL finished.

  // We need a promise that resolves when goal is reached.
  // Since "goal reached" happens inside executeSourceAndProcess, we can't easily hook it externally
  // without an EventEmitter or polling.
  // Polling is easiest here since we have a loop.

  // Actually, we can return a Promise that resolves when goal is reached.
  return new Promise<void>((resolve) => {
    let activeCount = tasks.length

    if (activeCount === 0) {
      resolve()
      return
    }

    if (signal.aborted) {
      resolve()
      return
    }

    const onAbort = (): void => {
      resolve()
    }
    signal.addEventListener('abort', onAbort)

    tasks.forEach((task) => {
      // DYNAMIC LIMIT
      const needed = currentState!.targetLeadCount - currentState!.currentLeadCount
      const limit = Math.max(5, needed + 5)
      task.limit = limit

      executeSourceAndProcess(sender, task, signal)
        .finally(() => {
          activeCount--
          // Check if we should finish
          if (isGoalReached(currentState!) || activeCount === 0 || signal.aborted) {
            signal.removeEventListener('abort', onAbort)
            resolve() // This releases the main loop!
          }
        })
        .catch((err) => {
          // If detailed error handling needed
          console.error('Task error:', err)
        })
    })
  })
}

/**
 * Execute a single source, process its results, and update state.
 */
async function executeSourceAndProcess(
  sender: WebContents,
  task: SearchTask,
  signal: AbortSignal
): Promise<void> {
  // If goal already reached (by another fast task), skip execution if possible
  if (isGoalReached(currentState!)) return

  if (
    task.location &&
    !currentState!.searchedCities.some((c) => c.toLowerCase() === task.location.toLowerCase())
  ) {
    currentState!.searchedCities.push(task.location)
  }

  const fullLocation = task.discoveredFromCountry
    ? `${task.location}, ${task.discoveredFromCountry}`
    : task.location
  let stopSearchHeartbeat: () => void = () => {}

  try {
    let leads: AgentLead[] = []

    emitLog(sender, `🔎 ${task.source}: "${task.query}" in "${fullLocation}"`, 'info')
    stopSearchHeartbeat = startHeartbeat(
      sender,
      (elapsedMs) =>
        `⏳ Still searching ${task.source}: "${task.query}" in "${fullLocation}" (${Math.round(
          elapsedMs / 1000
        )}s)`,
      signal,
      { intervalMs: 20000, maxBeats: 3 }
    )

    if (task.source === 'google_maps') {
      leads = await executeGoogleMapsSearch(task, signal, (message, type) =>
        emitLog(sender, message, type)
      )
    } else if (task.source === 'facebook') {
      leads = await executeFacebookSearch(task, signal, (message, type) =>
        emitLog(sender, message, type)
      )
    }

    if (leads.length === 0) {
      emitLog(
        sender,
        `⚠️ ${task.source}: 0 leads for "${task.query}" in "${fullLocation}"`,
        'warning'
      )
      return
    }
    await processLeadsBatch(sender, leads, task.source, task.location)
  } catch (error) {
    console.error(`[${task.source}] Search failed:`, error)
    if (error instanceof Error && error.message === 'Aborted') {
      return // Ignore abort errors
    }
    emitLog(sender, `⚠️ Source failed: ${task.source} - ${error}`, 'warning')
  } finally {
    stopSearchHeartbeat()
  }
}

/**
 * Process a batch of leads: Filter, Dedupe, Score, Enroll
 */
async function processLeadsBatch(
  sender: WebContents,
  leads: AgentLead[],
  source: string,
  location: string
): Promise<void> {
  // 1. Goal Check
  if (isGoalReached(currentState!)) {
    if (globalAbortController) {
      globalAbortController.abort() // Cancel other running tasks immediately
    }
    return
  }

  emitLog(sender, `✅ ${source}: ${leads.length} leads`, 'success')

  // 2. Filter
  const filteredLeads = applyFilters(leads, currentState!.preferences.filters)
  const filteredCount = leads.length - filteredLeads.length
  if (filteredCount > 0) {
    emitLog(sender, `🔧 Filtered ${filteredCount} leads (criteria)`, 'info')
  }

  // 3. Dedupe
  const { uniqueLeads, duplicateCount } = deduplicateLeads(filteredLeads, seenLeadKeys)
  if (duplicateCount > 0) {
    emitLog(sender, `🔄 Removed ${duplicateCount} duplicate leads`, 'info')
  }

  // 4. Process & Add to State
  let enrichmentModule: typeof import('./lead-enrichment') | null = null
  const getEnrichment = async (): Promise<typeof import('./lead-enrichment')> => {
    if (enrichmentModule) return enrichmentModule
    enrichmentModule = await import('./lead-enrichment')
    return enrichmentModule
  }

  let addedCount = 0
  for (const lead of uniqueLeads) {
    if (isGoalReached(currentState!)) break

    // Calculate Score
    const score = calculateLeadScore(lead)
    lead.metadata = { ...lead.metadata, score }

    // Auto-Enrichment Logic (Simplified for brevity, same as before)
    // Note: We removed the heavy code block duplication here for readability,
    // but in a real refactor we should preserve the verified checks.
    // For safety, I will preserve the essential verification logic structure:

    const filters = currentState!.preferences.filters
    let skipLead = false

    // ... (Verification logic would go here actions).
    // To keep this "patch" clean without deleting all verification logic:
    // I am assuming I should KEEP the verification logic.
    // I will put it in a helper or inline it.
    // Since I am replacing the WHOLE executeTasks block, I must RE-INCLUDE logic.

    if (filters.autoVerifyWA && lead.phone) {
      emitLog(sender, `🔍 Verifying WhatsApp: ${lead.phone} (${lead.name})`, 'info')
      const waResult = await (await getEnrichment()).enrichLeadWithWhatsApp(lead)

      if (waResult.enrichmentLog) {
        let waLogType: LogEntry['type'] = 'warning'
        if (waResult.hasWhatsApp === true) {
          waLogType = 'success'
        }
        emitLog(sender, waResult.enrichmentLog, waLogType)
      }

      if (waResult.hasWhatsApp !== undefined) {
        lead.hasWhatsApp = waResult.hasWhatsApp
        if (!waResult.hasWhatsApp) {
          skipLead = true
        }
      }
    } else if (filters.autoVerifyWA && !lead.phone) {
      emitLog(sender, `⏭️ Skipped lead (missing phone for WhatsApp): ${lead.name}`, 'info')
      skipLead = true
    }

    if (!skipLead && filters.autoFindEmail && !lead.email) {
      if (lead.website) {
        emitLog(sender, `🔍 Finding email: ${lead.website} (${lead.name})`, 'info')
        const emailFindResult = await (await getEnrichment()).enrichLeadWithEmailFinder(lead)

        if (emailFindResult.enrichmentLog) {
          let findLogType: LogEntry['type'] = 'info'
          if (emailFindResult.emailVerified === true) {
            findLogType = 'success'
          } else if (emailFindResult.email && emailFindResult.emailVerified === false) {
            findLogType = 'warning'
          } else if (!emailFindResult.email) {
            findLogType = 'warning'
          }
          emitLog(sender, emailFindResult.enrichmentLog, findLogType)
        }

        if (emailFindResult.email) {
          lead.email = emailFindResult.email
        }
        if (emailFindResult.emailVerified !== undefined) {
          lead.emailVerified = emailFindResult.emailVerified
        }
      } else {
        emitLog(sender, `⏭️ Skipped email finding (missing website): ${lead.name}`, 'info')
      }
    }

    if (!skipLead && filters.autoVerifyEmail && lead.email && lead.emailVerified === undefined) {
      emitLog(sender, `🔍 Verifying email: ${lead.email} (${lead.name})`, 'info')
      const emailResult = await (await getEnrichment()).enrichLeadWithEmailVerification(lead)

      if (emailResult.enrichmentLog) {
        let emailLogType: LogEntry['type'] = 'warning'
        if (emailResult.emailVerified === true) {
          emailLogType = 'success'
        }
        emitLog(sender, emailResult.enrichmentLog, emailLogType)
      }

      if (emailResult.emailVerified !== undefined) {
        lead.emailVerified = emailResult.emailVerified
      }
    }

    if (!skipLead && filters.autoVerifyEmail) {
      if (!lead.email) {
        emitLog(sender, `⏭️ Skipped lead (missing email for verification): ${lead.name}`, 'info')
        skipLead = true
      } else if (lead.emailVerified === false) {
        emitLog(sender, `⏭️ Skipped lead (email unverified): ${lead.email} (${lead.name})`, 'info')
        skipLead = true
      }
    }

    // Note: Simplified logic for brevity in this replace block,
    // but assuming the original detailed logic is desired, I should probably
    // move it to a helper or painstakingly preserve it.
    // Given the prompt urgency, I will extract it to `processSingleLead`?
    // No, I'll just keep it inline but clean.

    if (!skipLead) {
      currentState!.results.push(lead)
      currentState!.currentLeadCount++
      addedCount++
      emitLead(sender, lead)
    }

    // 5. Check Goal Again
    if (isGoalReached(currentState!)) {
      if (globalAbortController) {
        globalAbortController.abort()
      }
      break
    }
  }

  if (addedCount > 0) {
    const progressPercent = Math.round(
      (currentState!.currentLeadCount / currentState!.targetLeadCount) * 100
    )
    emitLog(
      sender,
      `✅ +${addedCount} leads from ${location}. Progress: ${currentState!.currentLeadCount}/${currentState!.targetLeadCount} (${progressPercent}%)`,
      'success'
    )
  }
}

// --------------------------------------------------------
// Wrapper to replace original executeTasks
// --------------------------------------------------------
async function executeTasks(
  sender: WebContents,
  tasks: SearchTask[],
  signal: AbortSignal
): Promise<void> {
  const tasksByLocation = new Map<string, SearchTask[]>()
  for (const task of tasks) {
    const key = task.discoveredFromCountry
      ? `${task.location}|${task.discoveredFromCountry}`
      : task.location
    if (!tasksByLocation.has(key)) tasksByLocation.set(key, [])
    tasksByLocation.get(key)!.push(task)
  }

  // Log start
  for (const [locationKey, locationTasks] of tasksByLocation) {
    if (isGoalReached(currentState!)) break
    const [location, country] = locationKey.split('|')
    const taskLabel = country ? `${location} (${country})` : location
    emitLog(
      sender,
      `⚡ Parallel search: "${locationTasks[0].query}" in ${taskLabel} (${locationTasks.length} sources)`,
      'info'
    )
  }

  // Run batch with Race Logic
  await executeTaskBatchRace(sender, tasks, signal)
}
