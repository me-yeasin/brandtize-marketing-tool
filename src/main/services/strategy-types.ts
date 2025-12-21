export interface NicheStrategy {
  niche: string
  targetAudience: string

  // 1. Service Analysis (The "Expertise")
  serviceAnalysis: {
    painPoints: string[]
    valuePropositions: string[]
    industryJargon: string[]
  }

  // 2. Persona Analysis (The "Psychology")
  personaAnalysis: {
    dailyFears: string[]
    secretDesires: string[]
    commonObjections: string[]
  }

  // 3. The Grand Slam Offer (The "Hook")
  offerStrategy: {
    grandSlamHooks: string[] // Specific "No-Brainer" offer distinct from generic angles
    riskReversals: string[]
    bonuses: string[]
  }

  // 4. Outreach Tactics (The "delivery")
  outreachTactics: {
    winningSubjectLines: string[]
    bestOpeners: string[]
    valueDropMethods: string[] /* e.g. "Send a loom video", "Send a PDF case study" */
    structureRules: string[] /* e.g. "Max 50 words", "Use bullet points" */
  }

  // Legacy/General
  marketingAngles: string[]
  winningFrameworks: string[]
}

export interface NicheResearchResult {
  strategy: NicheStrategy
  lastUpdated: number
}
