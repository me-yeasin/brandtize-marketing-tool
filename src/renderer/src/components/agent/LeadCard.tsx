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

  return (
    <div className="rounded-lg border border-border bg-surface/30 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
            {index + 1}
          </span>
          <div>
            <p className="font-medium text-text-main">{lead.email}</p>
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
