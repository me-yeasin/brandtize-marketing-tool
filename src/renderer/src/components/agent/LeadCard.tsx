import { useState } from 'react'
import { Button } from '../ui'

interface ExtractedLead {
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
  // New fields from core modules
  score?: number
  tier?: 'fire' | 'hot' | 'warm' | 'cold'
  intentSignals?: string[]
  personalizationLevel?: number
  qualificationChecks?: Array<{ name: string; passed: boolean }>
}

interface LeadCardProps {
  lead: ExtractedLead
  index: number
}

function LeadCard({ lead, index }: LeadCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async (): Promise<void> => {
    setSending(true)
    try {
      await window.api.openMail(lead.email, lead.template.subject, lead.template.body)
    } catch (error) {
      console.error('Failed to open mail client:', error)
    }
    setSending(false)
  }

  // Get tier badge color and icon
  const getTierBadge = (): { color: string; icon: string; label: string } => {
    switch (lead.tier) {
      case 'fire':
        return { color: 'bg-red-500/20 text-red-400', icon: '🔥', label: 'Fire' }
      case 'hot':
        return { color: 'bg-orange-500/20 text-orange-400', icon: '🔶', label: 'Hot' }
      case 'warm':
        return { color: 'bg-yellow-500/20 text-yellow-400', icon: '🔸', label: 'Warm' }
      case 'cold':
        return { color: 'bg-blue-500/20 text-blue-400', icon: '❄️', label: 'Cold' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', icon: '○', label: 'Unknown' }
    }
  }

  const tierBadge = getTierBadge()

  return (
    <div className="rounded-lg border border-border bg-surface/30 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
            {index + 1}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-text-main">{lead.email}</p>
              {lead.tier && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge.color}`}>
                  {tierBadge.icon} {tierBadge.label}
                </span>
              )}
              {lead.score !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                  Score: {lead.score}
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted">
              {lead.context.businessName || 'Unknown Business'}
              {lead.context.location && ` • ${lead.context.location}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded px-3 py-1 text-sm text-text-muted hover:bg-surface hover:text-text-main"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
          <Button variant="primary" onClick={handleSend} disabled={sending}>
            {sending ? 'Opening...' : 'Send Email'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-background/30 p-4 space-y-4">
          {/* Lead Quality Metrics */}
          {(lead.qualificationChecks || lead.intentSignals || lead.personalizationLevel) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Qualification Checks */}
              {lead.qualificationChecks && lead.qualificationChecks.length > 0 && (
                <div className="rounded border border-border bg-surface/50 p-3">
                  <h4 className="text-xs font-medium uppercase text-text-muted mb-2">
                    Qualification
                  </h4>
                  <div className="space-y-1">
                    {lead.qualificationChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
                          {check.passed ? '✓' : '✗'}
                        </span>
                        <span className="text-text-muted">{check.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intent Signals */}
              {lead.intentSignals && lead.intentSignals.length > 0 && (
                <div className="rounded border border-border bg-surface/50 p-3">
                  <h4 className="text-xs font-medium uppercase text-text-muted mb-2">
                    Intent Signals
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {lead.intentSignals.map((signal, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalization Level */}
              {lead.personalizationLevel !== undefined && (
                <div className="rounded border border-border bg-surface/50 p-3">
                  <h4 className="text-xs font-medium uppercase text-text-muted mb-2">
                    Personalization
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(lead.personalizationLevel / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-main">
                      L{lead.personalizationLevel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium uppercase text-text-muted mb-2">Business Context</h4>
            <p className="text-sm text-text-main">{lead.context.summary}</p>
            {lead.context.businessType && (
              <p className="mt-1 text-xs text-text-muted">Type: {lead.context.businessType}</p>
            )}
            {lead.context.website && (
              <p className="mt-1 text-xs text-text-muted truncate">
                Source:{' '}
                <a
                  href={lead.context.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {lead.context.website}
                </a>
              </p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase text-text-muted mb-2">Email Template</h4>
            <div className="rounded border border-border bg-surface/50 p-3">
              <p className="text-sm font-medium text-text-main mb-2">
                Subject: {lead.template.subject}
              </p>
              <p className="text-sm text-text-muted whitespace-pre-wrap">{lead.template.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { LeadCard, type ExtractedLead }
