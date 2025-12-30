export interface AgentPreferences {
  niche: string
  locations: string[]
  leadLimit: number
  filters: {
    hasWebsite: boolean
    hasEmail: boolean
    hasPhone: boolean
    autoVerifyWA: boolean
    autoVerifyEmail: boolean
    autoFindEmail: boolean
  }
}

export interface SearchTask {
  id: string
  query: string
  location: string
  source: 'google_maps' | 'facebook' | 'yelp' | 'yellow_pages'
  status: 'pending' | 'completed' | 'failed'
  discoveredFromCountry?: string // If this city was discovered via country research
}

export interface AgentLead {
  id: string
  name: string
  category: string
  address: string
  phone?: string
  email?: string
  website?: string
  rating?: number
  reviewCount?: number
  hasWhatsApp?: boolean
  emailVerified?: boolean
  source: 'Maps' | 'Facebook' | 'Yelp' | 'YellowPages'
  status: 'Qualified' | 'Pending'
  metadata?: Record<string, unknown>
}

export interface LogEntry {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export interface AgentState {
  preferences: AgentPreferences
  plan: SearchTask[]
  results: AgentLead[]
  logs: LogEntry[]
  isRunning: boolean
  currentTaskIndex: number
  // Goal tracking
  targetLeadCount: number
  currentLeadCount: number
  // For expanding search when goal not met
  processedCountries: string[]
  searchedCities: string[]
}
