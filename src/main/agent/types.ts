export interface AgentEvent {
  type: 'response' | 'thinking' | 'search' | 'status'
  content: string
  timestamp: number
  metadata?: {
    urls?: Array<{ title: string; url: string }>
    thinkingComplete?: boolean
    [key: string]: unknown
  }
}

export interface ExtractedLead {
  id: string
  email: string
  source: string
  context: {
    businessName?: string
    businessType?: string
    location?: string
    website?: string
    needs?: string[]
    summary: string
  }
  template: {
    subject: string
    body: string
  }
  foundAt: number
}

export interface SearchResult {
  title: string
  link: string
  snippet: string
}

export interface ScrapedPage {
  url: string
  title: string
  content: string
  emails: string[]
}
