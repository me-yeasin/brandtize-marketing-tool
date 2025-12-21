import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { executeWithAiRotation } from './ai-rotation-manager'
import { scrapeWithJina, searchWithSerper } from './lead-generation'
import type { NicheResearchResult, NicheStrategy } from './strategy-types'

const STRATEGY_FILE = 'niche-strategy.json'

// Get the path to the strategy file
function getStrategyPath(): string {
  const userDataPath = app.getPath('userData')
  const strategiesDir = join(userDataPath, 'strategies')
  if (!existsSync(strategiesDir)) {
    mkdirSync(strategiesDir, { recursive: true })
  }
  return join(strategiesDir, STRATEGY_FILE)
}

// Save the strategy to disk
export function saveNicheStrategy(strategy: NicheStrategy): void {
  const data: NicheResearchResult = {
    strategy,
    lastUpdated: Date.now()
  }
  writeFileSync(getStrategyPath(), JSON.stringify(data, null, 2), 'utf-8')
}

// Load the strategy from disk
export function getNicheStrategy(): NicheStrategy | null {
  const path = getStrategyPath()
  if (!existsSync(path)) return null

  try {
    const content = readFileSync(path, 'utf-8')
    const data = JSON.parse(content) as NicheResearchResult
    return data.strategy
  } catch (error) {
    console.error('Failed to load niche strategy:', error)
    return null
  }
}

/**
 * DEEP DIVE SCOUT
 * 1. Searches multiple queries in parallel (with Key Rotation)
 * 2. Scrapes top URLs in parallel (with Key Rotation)
 * 3. Uses AI to synthesize a specific JSON fragment for the pillar
 */
async function scoutPillar<T>(
  pillarName: string,
  queries: string[],
  aiPromptInstruction: string,
  jsonStructure: string
): Promise<T | null> {
  console.log(`[Deep Dive] Scouting Pillar: ${pillarName}...`)

  // Step 1: Parallel Search
  const searchPromises = queries.map((q) => searchWithSerper(q).catch(() => []))
  const searchResults = await Promise.all(searchPromises)
  const allLinks = searchResults.flat()

  // Deduplicate and take Top 5
  const uniqueLinks = Array.from(new Set(allLinks.map((l) => l.link))).slice(0, 5)
  console.log(`[Deep Dive] Found ${uniqueLinks.length} unique sources for ${pillarName}`)

  // Step 2: Parallel Scrape
  const scrapePromises = uniqueLinks.map((url) => scrapeWithJina(url).catch(() => null))
  const scrapedContents = await Promise.all(scrapePromises)
  const validContent = scrapedContents
    .filter((c) => c !== null)
    .map((c) => `Source: ${c!.title}\n${c!.content}\n---\n`)
    .join('\n')
    .slice(0, 25000) // Context limit safety

  // Step 3: AI Synthesis
  const prompt = `
  You are a World-Class B2B Strategist.
  I have scraped REAL data from the web regarding: "${pillarName}".

  ### RAW RESEARCH DATA:
  ${validContent}

  ### INSTRUCTION:
  Analyze the data above and extract the specific details requested below.
  ${aiPromptInstruction}

  ### OUTPUT FORMAT:
  Return ONLY valid JSON matching this structure exactly (no markdown):
  ${jsonStructure}
  `

  return executeWithAiRotation(
    prompt,
    (response) => {
      let cleanJson = response.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '')
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```/g, '')
      }
      return JSON.parse(cleanJson) as T
    },
    null as T // Default to null if fails
  )
}

// Main function to perform Deep Dive Research
export async function researchNicheStrategy(
  niche: string,
  targetAudience: string = 'Potential Clients'
): Promise<NicheStrategy> {
  console.log(`[Strategy] Starting Deep Dive for: ${niche} -> ${targetAudience}`)

  // Define Parallel Scouts
  const servicePromise = scoutPillar<NicheStrategy['serviceAnalysis']>(
    'Service Analysis',
    [
      `"${niche}" technical pain points and challenges`,
      `"${niche}" benefits and value proposition ROI`,
      `"${niche}" industry jargon glossary terms`
    ],
    `Identify technical pain points, financial value props, and insider jargon for ${niche}.`,
    `{
      "painPoints": ["5 specific technical pains..."],
      "valuePropositions": ["5 high-value outcomes..."],
      "industryJargon": ["10 insider terms..."]
    }`
  )

  const personaPromise = scoutPillar<NicheStrategy['personaAnalysis']>(
    'Persona Analysis',
    [
      `"${targetAudience}" biggest business fears and nightmares`,
      `"${targetAudience}" deep desires and business goals`,
      `common objections to buying "${niche}" services`
    ],
    `Analyze the psychology of ${targetAudience}. Find their daily fears, secret desires, and why they say 'No' to ${niche}.`,
    `{
      "dailyFears": ["5 deep fears..."],
      "secretDesires": ["5 hidden desires..."],
      "commonObjections": ["3 major objections..."]
    }`
  )

  const offerPromise = scoutPillar<NicheStrategy['offerStrategy']>(
    'Offer Strategy',
    [
      `best risk reversal guarantee for ${niche} services`,
      `grand slam offer examples for ${niche} agency`,
      `high value bonuses to add to ${niche} offer`
    ],
    `Construct a Grand Slam Offer for ${niche}. Find the best guarantees/risk reversals, and creative bonuses found in the research.`,
    `{
      "grandSlamHooks": ["3 specific irresistible hooks..."],
      "riskReversals": ["3 confident guarantees..."],
      "bonuses": ["3 high-perceived-value bonuses..."]
    }`
  )

  const tacticsPromise = scoutPillar<NicheStrategy['outreachTactics']>(
    'Outreach Tactics',
    [
      `best cold email subject lines for ${niche} 2024 2025`,
      `cold email opening lines for ${targetAudience}`,
      `cold email copy structure best practices 2025`
    ],
    `Identify the highest converting outreach tactics for ${niche} in 2025. Subject lines, openers, and rules.`,
    `{
      "winningSubjectLines": ["5 high-converting subject lines..."],
      "bestOpeners": ["3 killer opening lines..."],
      "structureRules": ["3 formatting rules..."],
      "valueDropMethods": ["3 best value-add ideas..."]
    }`
  )

  // Execute All in Parallel
  const [service, persona, offer, tactics] = await Promise.all([
    servicePromise,
    personaPromise,
    offerPromise,
    tacticsPromise
  ])

  // Construct Final Strategy
  const finalStrategy: NicheStrategy = {
    niche,
    targetAudience,
    serviceAnalysis: service || {
      painPoints: ['Inefficiency', 'High Costs'],
      valuePropositions: ['Save Time', 'Increase Revenue'],
      industryJargon: ['ROI', 'Scalability']
    },
    personaAnalysis: persona || {
      dailyFears: ['Losing Money'],
      secretDesires: ['Market Dominance'],
      commonObjections: ['Too Expensive']
    },
    offerStrategy: offer || {
      grandSlamHooks: ['Double your ROI guarantee'],
      riskReversals: ['Money-back guarantee'],
      bonuses: ['Free Audit']
    },
    outreachTactics: tactics || {
      winningSubjectLines: ['Quick question'],
      bestOpeners: ['I saw your website...'],
      structureRules: ['Keep it short'],
      valueDropMethods: ['Loom Video']
    },
    // We can infer these or run a mini-synthesis if needed, but hardcoding reasonable defaults/simple logic is fine for now
    marketingAngles: ['Direct Offer', 'Free Audit', 'Case Study'],
    winningFrameworks: ['PAS', 'AIDA', 'Spear']
  }

  saveNicheStrategy(finalStrategy)
  console.log('[Strategy] Deep Dive Complete!')
  return finalStrategy
}
