import { JSX, useCallback, useEffect, useRef, useState } from 'react'
import {
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaCopy,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaFacebook,
  FaFileExport,
  FaFilter,
  FaGlobe,
  FaMagic,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRedo,
  FaStar,
  FaTelegramPlane,
  FaTimes,
  FaTrashAlt,
  FaWhatsapp
} from 'react-icons/fa'
import type {
  Campaign,
  CampaignGroup,
  MailCampaign,
  PitchGenerationStatus,
  ReviewsResult,
  SavedFacebookLead,
  SavedMapsLead,
  StoredEmailPitch
} from '../../../preload/index.d'

// Source tab for saved leads
type SourceTab = 'maps' | 'facebook'

type TabFilter = 'all' | 'has-website' | 'no-website'

interface AdvancedFilters {
  location: string
  category: string
  minRating: number
  minReviews: number
  hasWhatsApp: 'all' | 'yes' | 'no' | 'unknown'
  hasEmail: 'all' | 'yes' | 'verified'
  scores: {
    gold: boolean
    silver: boolean
    bronze: boolean
  }
}

const DEFAULT_FILTERS: AdvancedFilters = {
  location: '',
  category: '',
  minRating: 0,
  minReviews: 0,
  hasWhatsApp: 'all',
  hasEmail: 'all',
  scores: {
    gold: true,
    silver: true,
    bronze: true
  }
}

// Minimal WhatsApp Markdown Parser for Preview (Duplicated from AiCopywriterPage for isolated portability)
// This ensures the preview looks exactly as expected.
const renderWhatsAppMarkdown = (text: string): JSX.Element[] => {
  if (!text) return []

  // Split by newlines to handle paragraphs
  const lines = text.split('\n')
  const result: JSX.Element[] = []

  lines.forEach((line, i) => {
    // 1. Process Inline Formats First (Bold, Italic, Code, Strike)
    let content: (string | JSX.Element)[] = [line]

    // Monospace ` ```text``` `
    content = content.flatMap((seg) => {
      if (typeof seg !== 'string') return seg
      const parts = seg.split(/(```.*?```)/g)
      return parts.map((part) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          return (
            <code
              key={Math.random()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '2px 4px',
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}
            >
              {part.slice(3, -3)}
            </code>
          )
        }
        return part
      })
    })

    // Bold ` *text* `
    content = content.flatMap((seg) => {
      if (typeof seg !== 'string') return seg
      const parts = seg.split(/(\*[^*\n]+\*)/g)
      return parts.map((part) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return <strong key={Math.random()}>{part.slice(1, -1)}</strong>
        }
        return part
      })
    })

    // Italic ` _text_ `
    content = content.flatMap((seg) => {
      if (typeof seg !== 'string') return seg
      const parts = seg.split(/(_[^_\n]+_)/g)
      return parts.map((part) => {
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          return <em key={Math.random()}>{part.slice(1, -1)}</em>
        }
        return part
      })
    })

    // Strikethrough ` ~text~ `
    content = content.flatMap((seg) => {
      if (typeof seg !== 'string') return seg
      const parts = seg.split(/(~[^~\n]+~)/g)
      return parts.map((part) => {
        if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
          return (
            <span key={Math.random()} style={{ textDecoration: 'line-through' }}>
              {part.slice(1, -1)}
            </span>
          )
        }
        return part
      })
    })

    // 2. Wrap content based on Line Type
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('- ')) {
      // Bullet List
      // Remove the leading "- " for display from the FIRST text string found
      let removedPrefix = false
      const cleanContent = content.map((p) => {
        if (!removedPrefix && typeof p === 'string' && p.trimStart().startsWith('- ')) {
          removedPrefix = true
          return p.replace('- ', '')
        }
        return p
      })

      result.push(
        <div
          key={i}
          style={{ display: 'flex', gap: '8px', paddingLeft: '8px', marginBottom: '4px' }}
        >
          <span style={{ color: '#6366f1' }}>•</span>
          <div style={{ flex: 1 }}>{cleanContent}</div>
        </div>
      )
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      // Numbered List
      const match = trimmedLine.match(/^(\d+)\.\s/)
      const number = match ? match[1] : '1'

      let removedPrefix = false
      const cleanContent = content.map((p) => {
        if (!removedPrefix && typeof p === 'string' && /^\s*\d+\.\s/.test(p)) {
          removedPrefix = true
          return p.replace(/^\s*\d+\.\s/, '')
        }
        return p
      })

      result.push(
        <div
          key={i}
          style={{ display: 'flex', gap: '8px', paddingLeft: '8px', marginBottom: '4px' }}
        >
          <span style={{ color: '#6366f1', fontWeight: 'bold' }}>{number}.</span>
          <div style={{ flex: 1 }}>{cleanContent}</div>
        </div>
      )
    } else if (trimmedLine.startsWith('> ')) {
      // Block Quote
      let removedPrefix = false
      const cleanContent = content.map((p) => {
        if (!removedPrefix && typeof p === 'string' && p.trimStart().startsWith('> ')) {
          removedPrefix = true
          return p.replace('> ', '')
        }
        return p
      })

      result.push(
        <div
          key={i}
          style={{
            borderLeft: '3px solid #64748b',
            paddingLeft: '12px',
            fontStyle: 'italic',
            color: '#94a3b8',
            margin: '4px 0',
            background: 'rgba(255,255,255,0.02)',
            padding: '4px 12px',
            borderRadius: '0 4px 4px 0'
          }}
        >
          {cleanContent}
        </div>
      )
    } else {
      // Standard Line
      result.push(
        <div key={i} style={{ minHeight: '1.2em' }}>
          {content}
        </div>
      )
    }
  })

  return result
}

// Helper to insert/toggle markdown syntax at cursor
// (Duplicated and slightly adapted from AiCopywriterPage)
const insertMarkdown = (
  textarea: HTMLTextAreaElement | null,
  startChar: string,
  endChar: string, // If empty, it treats it as a line-prefix (like "- " or "> ")
  setFunction: (val: string) => void,
  currentValue: string
): void => {
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  let selectedText = currentValue.substring(start, end)
  let before = currentValue.substring(0, start)
  let after = currentValue.substring(end)

  // --- LINE PREFIX MODE (For Lists, Quotes) ---
  if (!endChar) {
    // Check if the current line already has the prefix
    const lastNewLine = before.lastIndexOf('\n')
    const currentLineStart = lastNewLine === -1 ? 0 : lastNewLine + 1
    const currentLineContent = currentValue.substring(currentLineStart, end) + after.split('\n')[0]

    // Simple toggle check on the current line
    if (currentLineContent.trim().startsWith(startChar.trim())) {
      // REMOVE Prefix
      const prefixLength = startChar.length
      // We need to find exactly where the prefix is relative to 'before'
      const lineBeforeCursor = before.substring(currentLineStart)
      if (lineBeforeCursor.startsWith(startChar)) {
        // Prefix is before cursor
        const newBefore =
          before.substring(0, currentLineStart) + lineBeforeCursor.substring(prefixLength)
        setFunction(`${newBefore}${selectedText}${after}`)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(
            Math.max(currentLineStart, start - prefixLength),
            Math.max(currentLineStart, end - prefixLength)
          )
        }, 0)
      } else {
        // Cursor likely at start of line
        const lineContent = currentValue.substring(currentLineStart)
        if (lineContent.startsWith(startChar)) {
          const newValue =
            currentValue.substring(0, currentLineStart) + lineContent.substring(prefixLength)
          setFunction(newValue)
          setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start, end)
          }, 0)
        }
      }
    } else {
      // ADD Prefix
      const newBefore =
        before.substring(0, currentLineStart) + startChar + before.substring(currentLineStart)
      setFunction(`${newBefore}${selectedText}${after}`)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + startChar.length, end + startChar.length)
      }, 0)
    }
    return
  }

  // --- WRAPPER MODE (Bold, Italic, etc) ---
  // Exclusive Logic: Check if ALREADY wrapped by ANY known wrapper.
  const wrappers = ['```', '*', '_', '~']

  for (const wrapper of wrappers) {
    // Case 1: Selection IS the wrapper (e.g. user selected "*text*")
    if (
      selectedText.startsWith(wrapper) &&
      selectedText.endsWith(wrapper) &&
      selectedText.length >= wrapper.length * 2
    ) {
      // Strip the existing wrapper
      const unwrapped = selectedText.substring(wrapper.length, selectedText.length - wrapper.length)

      // If we are applying the SAME wrapper -> We are effectively toggling OFF. return.
      if (wrapper === startChar && wrapper === endChar) {
        const newValue = `${before}${unwrapped}${after}`
        setFunction(newValue)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start, start + unwrapped.length)
        }, 0)
        return
      }

      // If different wrapper, we stripped it, continue to apply the new one.
      selectedText = unwrapped
      // We found a match, break to stop checking others (assuming 1 layer)
      break
    }

    // Case 2: Wrapper is surrounding the selection (e.g. user selected "text" inside "*text*")
    if (before.endsWith(wrapper) && after.startsWith(wrapper)) {
      // Strip the existing wrapper
      before = before.substring(0, before.length - wrapper.length)
      after = after.substring(wrapper.length)

      // If SAME wrapper -> Toggling OFF.
      if (wrapper === startChar && wrapper === endChar) {
        const newValue = `${before}${selectedText}${after}`
        setFunction(newValue)
        setTimeout(() => {
          textarea.focus()
          // Shift selection back
          textarea.setSelectionRange(start - wrapper.length, end - wrapper.length)
        }, 0)
        return
      }

      // If different, we removed the old one. Just proceed to wrap with new one.
      break
    }
  }

  // Case 3: Apply the NEW Wrapper
  if (selectedText) {
    const newValue = `${before}${startChar}${selectedText}${endChar}${after}`
    setFunction(newValue)
    setTimeout(() => {
      textarea.focus()
      // Select the text NOT including the new wrappers (so clicking again toggles case 2)
      // Because 'before' might have changed length (if we stripped outer wrapper), calculate new offset
      const newStart = before.length + startChar.length
      textarea.setSelectionRange(newStart, newStart + selectedText.length)
    }, 0)
  } else {
    // Insert placeholder
    const newValue = `${before}${startChar}item${endChar}${after}`
    setFunction(newValue)
    setTimeout(() => {
      textarea.focus()
      // Select the placeholder "text"
      const newStart = before.length + startChar.length
      textarea.setSelectionRange(newStart, newStart + 4)
    }, 0)
  }
}

function SavedLeadsPage(): JSX.Element {
  // Source tab state
  const [sourceTab, setSourceTab] = useState<SourceTab>('maps')

  // Maps leads state
  const [leads, setLeads] = useState<SavedMapsLead[]>([])

  // Facebook leads state
  const [facebookLeads, setFacebookLeads] = useState<SavedFacebookLead[]>([])
  const [fbSearchQuery, setFbSearchQuery] = useState('')
  const [fbActiveTab, setFbActiveTab] = useState<TabFilter>('all')
  const [fbFilterPanelOpen, setFbFilterPanelOpen] = useState(false)
  const [fbLoadingWhatsAppIds, setFbLoadingWhatsAppIds] = useState<Set<string>>(new Set())
  const [fbVerifyingEmailIds, setFbVerifyingEmailIds] = useState<Set<string>>(new Set())
  const [fbLoadingEmailIds, setFbLoadingEmailIds] = useState<Set<string>>(new Set())
  const [fbNoEmailFoundIds, setFbNoEmailFoundIds] = useState<Set<string>>(new Set())

  const [isLoading, setIsLoading] = useState(true)
  const [loadingWhatsAppIds, setLoadingWhatsAppIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [filters, setFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS)
  const [searchQuery, setSearchQuery] = useState('')
  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')

  // Mail Campaigns State
  const [mailCampaigns, setMailCampaigns] = useState<MailCampaign[]>([])
  const [mailCampaignGroups, setMailCampaignGroups] = useState<CampaignGroup[]>([])
  const [selectedMailGroupId, setSelectedMailGroupId] = useState<string>('')
  const [selectedMailCampaignId, setSelectedMailCampaignId] = useState<string>('')

  const [toast, setToast] = useState<{
    message: string
    type: 'info' | 'error' | 'success'
  } | null>(null)

  // Reviews panel state
  const [reviewsPanelOpen, setReviewsPanelOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<SavedMapsLead | null>(null)
  const [reviewsData, setReviewsData] = useState<ReviewsResult | null>(null)
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  // WhatsApp state
  const [whatsAppReady, setWhatsAppReady] = useState(false)
  const [whatsAppInitializing, setWhatsAppInitializing] = useState(false)
  const [whatsAppQrCode, setWhatsAppQrCode] = useState<string | null>(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const whatsAppQrDismissedRef = useRef(false)
  const whatsAppCancelRef = useRef(false)
  const [whatsAppBulkVerifying, setWhatsAppBulkVerifying] = useState(false)
  const [whatsAppBulkStopRequested, setWhatsAppBulkStopRequested] = useState(false)
  const [whatsAppBulkProgress, setWhatsAppBulkProgress] = useState<{
    current: number
    total: number
    errors: number
  } | null>(null)
  const whatsAppBulkCancelRef = useRef(false)
  const [fbWhatsAppBulkVerifying, setFbWhatsAppBulkVerifying] = useState(false)
  const [fbWhatsAppBulkStopRequested, setFbWhatsAppBulkStopRequested] = useState(false)
  const [fbWhatsAppBulkProgress, setFbWhatsAppBulkProgress] = useState<{
    current: number
    total: number
    errors: number
  } | null>(null)
  const fbWhatsAppBulkCancelRef = useRef(false)
  const [emailBulkVerifying, setEmailBulkVerifying] = useState(false)
  const [emailBulkStopRequested, setEmailBulkStopRequested] = useState(false)
  const [emailBulkProgress, setEmailBulkProgress] = useState<{
    current: number
    total: number
    errors: number
  } | null>(null)
  const emailBulkCancelRef = useRef(false)
  const [fbEmailBulkVerifying, setFbEmailBulkVerifying] = useState(false)
  const [fbEmailBulkStopRequested, setFbEmailBulkStopRequested] = useState(false)
  const [fbEmailBulkProgress, setFbEmailBulkProgress] = useState<{
    current: number
    total: number
    errors: number
  } | null>(null)
  const fbEmailBulkCancelRef = useRef(false)

  // Pitch generation state
  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(new Set())
  const [generatingPitchIds, setGeneratingPitchIds] = useState<Set<string>>(new Set())
  const [pitchStatus, setPitchStatus] = useState<Record<string, PitchGenerationStatus>>({})
  const [emailPitches, setEmailPitches] = useState<Record<string, StoredEmailPitch>>({})
  const [generatingEmailPitchIds, setGeneratingEmailPitchIds] = useState<Set<string>>(new Set())

  // Local editing state: leadId -> edited string
  const [editedPitches, setEditedPitches] = useState<Record<string, string>>({})
  const [editedEmailPitches, setEditedEmailPitches] = useState<
    Record<string, { subject: string; body: string }>
  >({})
  const [showWhatsAppPreviews, setShowWhatsAppPreviews] = useState<Record<string, boolean>>({})
  const [showEmailPreviews, setShowEmailPreviews] = useState<Record<string, boolean>>({})

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const waitWithCancel = async (ms: number): Promise<boolean> => {
    const step = 250
    let remaining = ms
    while (remaining > 0) {
      if (whatsAppBulkCancelRef.current) return true
      const duration = Math.min(step, remaining)
      await new Promise<void>((resolve) => window.setTimeout(resolve, duration))
      remaining -= duration
    }
    return whatsAppBulkCancelRef.current
  }

  const waitWithFbCancel = async (ms: number): Promise<boolean> => {
    const step = 250
    let remaining = ms
    while (remaining > 0) {
      if (fbWhatsAppBulkCancelRef.current) return true
      const duration = Math.min(step, remaining)
      await new Promise<void>((resolve) => window.setTimeout(resolve, duration))
      remaining -= duration
    }
    return fbWhatsAppBulkCancelRef.current
  }

  const waitWithEmailCancel = async (ms: number): Promise<boolean> => {
    const step = 250
    let remaining = ms
    while (remaining > 0) {
      if (emailBulkCancelRef.current) return true
      const duration = Math.min(step, remaining)
      await new Promise<void>((resolve) => window.setTimeout(resolve, duration))
      remaining -= duration
    }
    return emailBulkCancelRef.current
  }

  const waitWithFbEmailCancel = async (ms: number): Promise<boolean> => {
    const step = 250
    let remaining = ms
    while (remaining > 0) {
      if (fbEmailBulkCancelRef.current) return true
      const duration = Math.min(step, remaining)
      await new Promise<void>((resolve) => window.setTimeout(resolve, duration))
      remaining -= duration
    }
    return fbEmailBulkCancelRef.current
  }

  const handleCloseWhatsAppModal = async (): Promise<void> => {
    setShowWhatsAppModal(false)
    setWhatsAppInitializing(false)
    setWhatsAppReady(false)
    setWhatsAppQrCode(null)

    whatsAppQrDismissedRef.current = true
    whatsAppCancelRef.current = true

    try {
      await window.api.whatsappDisconnect()
      showToast('WhatsApp connect canceled.', 'info')
    } catch {
      // ignore
    } finally {
      window.setTimeout(() => {
        whatsAppCancelRef.current = false
      }, 1500)
    }
  }

  const loadLeads = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      // Load Maps leads
      const savedLeads = await window.api.getSavedMapsLeads()
      setLeads(savedLeads)
      setNoEmailFoundIds(
        new Set(
          savedLeads
            .filter((l) => !l.email && l.website && l.emailLookupAttempted === true)
            .map((l) => l.id)
        )
      )

      // Load Facebook leads
      const savedFacebookLeads = await window.api.getSavedFacebookLeads()
      setFacebookLeads(savedFacebookLeads)
      setFbNoEmailFoundIds(
        new Set(
          savedFacebookLeads
            .filter((l) => !l.email && l.website && l.emailLookupAttempted === true)
            .map((l) => l.id)
        )
      )

      // Load campaigns and groups
      const campaignsData = await window.api.getWhatsappCampaigns()
      const groupsData = await window.api.getWhatsappCampaignGroups()
      const whatsappCampaigns = campaignsData.filter((c) => c.platform === 'whatsapp')

      setCampaigns(whatsappCampaigns)
      setCampaignGroups(groupsData)

      // Load Mail campaigns and groups
      const mailCampaignsData = await window.api.getMailCampaigns()
      const mailGroupsData = await window.api.getMailCampaignGroups()
      setMailCampaigns(mailCampaignsData)
      setMailCampaignGroups(mailGroupsData)

      const pitchesData = await window.api.getEmailPitches()
      setEmailPitches(pitchesData)

      // Auto-select group and campaign with persistence
      if (groupsData.length > 0) {
        const savedGroupId = localStorage.getItem('savedLeads_selectedGroupId')
        const targetGroupId =
          savedGroupId && groupsData.find((g) => g.id === savedGroupId)
            ? savedGroupId
            : groupsData[0].id

        setSelectedGroupId(targetGroupId)

        // Select campaign
        const savedCampaignId = localStorage.getItem('savedLeads_selectedCampaignId')
        const groupCampaigns = whatsappCampaigns.filter((c) => c.groupId === targetGroupId)

        const targetCampaignId =
          savedCampaignId && groupCampaigns.find((c) => c.id === savedCampaignId)
            ? savedCampaignId
            : groupCampaigns.length > 0
              ? groupCampaigns[0].id
              : ''

        setSelectedCampaignId(targetCampaignId)

        // Ensure persistence
        if (!savedGroupId) localStorage.setItem('savedLeads_selectedGroupId', targetGroupId)
        if (targetCampaignId)
          localStorage.setItem('savedLeads_selectedCampaignId', targetCampaignId)
      } else if (whatsappCampaigns.length > 0) {
        // No groups
        const ungroupedCampaigns = whatsappCampaigns.filter((c) => !c.groupId)
        const savedCampaignId = localStorage.getItem('savedLeads_selectedCampaignId')

        const targetCampaignId =
          savedCampaignId && ungroupedCampaigns.find((c) => c.id === savedCampaignId)
            ? savedCampaignId
            : ungroupedCampaigns.length > 0
              ? ungroupedCampaigns[0].id
              : ''

        setSelectedCampaignId(targetCampaignId)
        if (targetCampaignId)
          localStorage.setItem('savedLeads_selectedCampaignId', targetCampaignId)
      }

      // Auto-select Mail group and campaign with persistence
      if (mailGroupsData.length > 0) {
        const savedMailGroupId = localStorage.getItem('savedLeads_selectedMailGroupId')
        const targetMailGroupId =
          savedMailGroupId && mailGroupsData.find((g) => g.id === savedMailGroupId)
            ? savedMailGroupId
            : mailGroupsData[0].id

        setSelectedMailGroupId(targetMailGroupId)

        // Select mail campaign
        const savedMailCampaignId = localStorage.getItem('savedLeads_selectedMailCampaignId')
        const groupMailCampaigns = mailCampaignsData.filter((c) => c.groupId === targetMailGroupId)

        const targetMailCampaignId =
          savedMailCampaignId && groupMailCampaigns.find((c) => c.id === savedMailCampaignId)
            ? savedMailCampaignId
            : groupMailCampaigns.length > 0
              ? groupMailCampaigns[0].id
              : ''

        setSelectedMailCampaignId(targetMailCampaignId)

        if (!savedMailGroupId)
          localStorage.setItem('savedLeads_selectedMailGroupId', targetMailGroupId)
        if (targetMailCampaignId)
          localStorage.setItem('savedLeads_selectedMailCampaignId', targetMailCampaignId)
      } else if (mailCampaignsData.length > 0) {
        // No mail groups
        const ungroupedMailCampaigns = mailCampaignsData.filter((c) => !c.groupId)
        const savedMailCampaignId = localStorage.getItem('savedLeads_selectedMailCampaignId')

        const targetMailCampaignId =
          savedMailCampaignId && ungroupedMailCampaigns.find((c) => c.id === savedMailCampaignId)
            ? savedMailCampaignId
            : ungroupedMailCampaigns.length > 0
              ? ungroupedMailCampaigns[0].id
              : ''

        setSelectedMailCampaignId(targetMailCampaignId)
        if (targetMailCampaignId)
          localStorage.setItem('savedLeads_selectedMailCampaignId', targetMailCampaignId)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      showToast('Failed to load data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Setup WhatsApp event listeners
  useEffect(() => {
    // Listen for QR code
    const offQr = window.api.onWhatsAppQr((qr) => {
      console.log('[SavedLeads] WhatsApp QR received')
      if (whatsAppQrDismissedRef.current) return
      setWhatsAppQrCode(qr)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(true)
    })

    // Listen for ready event
    const offReady = window.api.onWhatsAppReady(() => {
      console.log('[SavedLeads] WhatsApp is ready!')
      setWhatsAppReady(true)
      setWhatsAppQrCode(null)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(false)
      showToast('WhatsApp connected successfully!', 'success')
    })

    // Listen for disconnection
    const offDisconnected = window.api.onWhatsAppDisconnected((reason) => {
      console.log('[SavedLeads] WhatsApp disconnected:', reason)
      setWhatsAppReady(false)
      setWhatsAppQrCode(null)
      setShowWhatsAppModal(false)
      setWhatsAppInitializing(false)
      if (whatsAppCancelRef.current) {
        return
      }
      showToast(`WhatsApp disconnected: ${reason}`, 'error')
    })

    // Listen for auth failure
    const offAuthFailure = window.api.onWhatsAppAuthFailure((msg) => {
      console.error('[SavedLeads] WhatsApp auth failure:', msg)
      setWhatsAppReady(false)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(false)
      if (whatsAppCancelRef.current) {
        return
      }
      showToast(`WhatsApp authentication failed: ${msg}`, 'error')
    })

    // Check initial status
    window.api.whatsappGetStatus().then((status) => {
      setWhatsAppReady(status.isReady)
      setWhatsAppInitializing(status.isInitializing)
      if (status.qrCode) {
        if (!whatsAppQrDismissedRef.current) {
          setWhatsAppQrCode(status.qrCode)
          setShowWhatsAppModal(true)
        }
      }
    })

    // Listen for pitch generation status updates
    window.api.onPitchGenerationStatus((status) => {
      console.log('[SavedLeads] Pitch status update:', status)
      // Status updates are handled per-lead via pitchStatus state
      // We need the leadId to update the right entry, but it comes from the invoke
    })

    return () => {
      offQr()
      offReady()
      offDisconnected()
      offAuthFailure()
    }
  }, [])

  // Initialize WhatsApp client
  const handleInitWhatsApp = async (): Promise<void> => {
    if (whatsAppReady) {
      showToast('WhatsApp is already connected.', 'info')
      return
    }

    whatsAppQrDismissedRef.current = false
    whatsAppCancelRef.current = false

    setWhatsAppInitializing(true)
    try {
      const result = await window.api.whatsappInitialize()
      if (!result.success) {
        showToast(result.error || 'Failed to initialize WhatsApp', 'error')
        setWhatsAppInitializing(false)
        return
      }
      const status = await window.api.whatsappGetStatus()
      setWhatsAppReady(status.isReady)
      if (status.qrCode) {
        setWhatsAppQrCode(status.qrCode)
        setShowWhatsAppModal(true)
        setWhatsAppInitializing(false)
        return
      }

      if (status.isReady) {
        setWhatsAppQrCode(null)
        setShowWhatsAppModal(false)
        setWhatsAppInitializing(false)
        showToast('WhatsApp connected successfully!', 'success')
        return
      }

      setWhatsAppInitializing(false)
    } catch (err) {
      console.error('WhatsApp init error:', err)
      showToast('Failed to initialize WhatsApp', 'error')
      setWhatsAppInitializing(false)
    }
  }

  // Check if a lead's phone number has WhatsApp
  const handleCheckWhatsApp = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !lead.phone) return

    if (!whatsAppReady) {
      showToast('Please connect WhatsApp first!', 'error')
      return
    }

    // Update lead to show loading locally (we don't persist loading state)
    // We'll trust that re-render will show loading state if we had a loading field,
    // but SavedMapsLead doesn't strictly have a 'loading' field in its type definition,
    // so we might need to handle this locally or cast.
    // However, looking at MapsScoutPage, it adds `isLoadingWhatsApp` to the interface.
    // SavedMapsLead interface might NOT have it.
    // Let's check preload/index.d.ts again.
    // It has `hasWhatsApp`, but no `isLoadingWhatsApp`.
    // We can use a local state Set for loading IDs.

    // Actually, checking the file again, I'll use a local state for loading IDs to avoid polluting the data type.
    setLoadingWhatsAppIds((prev) => new Set(prev).add(leadId))

    try {
      const result = await window.api.whatsappCheckNumber(lead.phone)

      if (result.error) {
        showToast(result.error, 'error')
        setLoadingWhatsAppIds((prev) => {
          const next = new Set(prev)
          next.delete(leadId)
          return next
        })
        return
      }

      // Update lead with WhatsApp status
      const updatedLead = {
        ...lead,
        hasWhatsApp: result.hasWhatsApp
        // formattedNumber: result.formattedNumber // If we wanted to save the formatted number
      }

      // Update local state
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))

      // SAVE VALIDATION TO STORAGE
      try {
        await window.api.updateSavedMapsLead(updatedLead)
      } catch (saveErr) {
        console.error('Failed to save WhatsApp status:', saveErr)
      }

      // Show feedback
      if (result.hasWhatsApp) {
        showToast(`${lead.name} has WhatsApp!`, 'success')
      } else {
        showToast(`${lead.name} does NOT have WhatsApp`, 'info')
      }
    } catch (err) {
      console.error('WhatsApp check error:', err)
      showToast('Failed to check WhatsApp status', 'error')
    } finally {
      setLoadingWhatsAppIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const handleRemoveLead = async (id: string): Promise<void> => {
    try {
      await window.api.removeSavedMapsLead(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      showToast('Lead removed', 'info')
    } catch (err) {
      console.error('Failed to remove lead:', err)
      showToast('Failed to remove lead', 'error')
    }
  }

  // --- Email Finding Logic ---
  const [loadingEmailIds, setLoadingEmailIds] = useState<Set<string>>(new Set())
  const [verifyingEmailIds, setVerifyingEmailIds] = useState<Set<string>>(new Set())
  const [noEmailFoundIds, setNoEmailFoundIds] = useState<Set<string>>(new Set())

  const extractDomain = (url: string): string => {
    try {
      let domain = url.toLowerCase()
      if (!domain.startsWith('http')) {
        domain = 'http://' + domain
      }
      const hostname = new URL(domain).hostname
      return hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  const normalizeWebsiteUrl = (website: string): string | null => {
    const trimmed = website.trim()
    if (!trimmed) return null

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

    try {
      const url = new URL(withProtocol)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
      return url.toString()
    } catch {
      return null
    }
  }

  const openWebsite = async (website: string): Promise<void> => {
    const url = normalizeWebsiteUrl(website)
    if (!url) {
      showToast('Invalid website URL', 'error')
      return
    }

    try {
      const result = await window.api.openExternalUrl(url)
      if (!result.success) {
        showToast(result.error || 'Failed to open website', 'error')
      }
    } catch {
      showToast('Failed to open website', 'error')
    }
  }

  const handleVerifyEmail = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead?.email) return

    setVerifyingEmailIds((prev) => new Set(prev).add(leadId))

    try {
      const verifyResult = await window.api.verifyEmail(lead.email)

      if (verifyResult.switched) {
        showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
      }

      const updatedLead: SavedMapsLead = { ...lead, emailVerified: verifyResult.verified }

      setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))
      await window.api.updateSavedMapsLead(updatedLead)

      showToast(
        verifyResult.verified ? `Email verified: ${lead.email}` : `Invalid email: ${lead.email}`,
        verifyResult.verified ? 'success' : 'error'
      )
    } catch (err) {
      console.error('Email verification error:', err)
      showToast('Failed to verify email', 'error')
    } finally {
      setVerifyingEmailIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const handleFindEmail = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !lead.website) return

    setLoadingEmailIds((prev) => new Set(prev).add(leadId))
    setNoEmailFoundIds((prev) => {
      const next = new Set(prev)
      next.delete(leadId)
      return next
    })

    try {
      const domain = extractDomain(lead.website)
      const result = await window.api.findEmailForDomain(domain)

      let updatedLead = { ...lead }

      if (result.email) {
        setNoEmailFoundIds((prev) => {
          const next = new Set(prev)
          next.delete(leadId)
          return next
        })
        // Email found! Now verify it
        console.log(`[SavedLeads] Found email: ${result.email}, verifying...`)

        try {
          const verifyResult = await window.api.verifyEmail(result.email)

          if (verifyResult.switched) {
            showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
          }

          updatedLead = {
            ...updatedLead,
            email: result.email || undefined,
            emailSource: result.source,
            emailVerified: verifyResult.verified,
            emailLookupAttempted: true
          }

          if (verifyResult.verified) {
            showToast(`Found verified email: ${result.email}`, 'success')
          } else {
            showToast(`Found email (unverified): ${result.email}`, 'info')
          }
        } catch (verifyErr) {
          console.error('Email verification error:', verifyErr)
          // Still save the email, just mark as unverified
          updatedLead = {
            ...updatedLead,
            email: result.email || undefined,
            emailSource: result.source,
            emailVerified: false,
            emailLookupAttempted: true
          }
          showToast(`Found email (verification failed): ${result.email}`, 'info')
        }
      } else {
        // No email found
        setNoEmailFoundIds((prev) => new Set(prev).add(leadId))
        showToast(`No email found for "${lead.name}" (${domain})`, 'info')
        updatedLead = {
          ...updatedLead,
          email: undefined,
          emailSource: result.source,
          emailLookupAttempted: true
        }
      }

      // Update local state
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))

      // Persist to DB
      await window.api.updateSavedMapsLead(updatedLead)
    } catch (err) {
      console.error('Email finder error:', err)
      showToast('Failed to find email', 'error')
    } finally {
      setLoadingEmailIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const handleClearAll = async (): Promise<void> => {
    if (!confirm('Are you sure you want to clear all saved leads?')) return
    try {
      await window.api.clearSavedMapsLeads()
      setLeads([])
      showToast('All leads cleared', 'success')
    } catch (err) {
      console.error('Failed to clear leads:', err)
      showToast('Failed to clear leads', 'error')
    }
  }

  // --- Pitch Generation ---
  const handleGeneratePitch = async (lead: SavedMapsLead): Promise<void> => {
    console.log('[SavedLeads] Generating pitch for:', lead.name)

    setGeneratingPitchIds((prev) => new Set(prev).add(lead.id))
    setPitchStatus((prev) => ({
      ...prev,
      [lead.id]: { status: 'analyzing', message: '🧠 Analyzing business...' }
    }))

    // Expand the card to show progress
    setExpandedLeadIds((prev) => new Set(prev).add(lead.id))

    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

      const result = await window.api.generateWhatsAppPitch({
        leadId: lead.id,
        name: lead.name,
        category: lead.category,
        address: lead.address,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        website: lead.website,
        reviews: lead.reviews,
        instruction: selectedCampaign?.instruction,
        buyerPersona: selectedCampaign?.buyerPersona,
        examples: selectedCampaign?.examples,
        productLinks: selectedCampaign?.productLinks,
        language: selectedCampaign?.language || 'en'
      })

      if (result.success && result.pitch) {
        // Update lead with generated pitch
        const updatedLead = {
          ...lead,
          generatedPitch: result.pitch,
          pitchGeneratedAt: Date.now()
        }

        setLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead : l)))
        await window.api.updateSavedMapsLead(updatedLead)

        setPitchStatus((prev) => ({
          ...prev,
          [lead.id]: { status: 'done', message: '✅ Pitch ready!', currentPitch: result.pitch }
        }))

        // Reset local edit state so the new pitch is shown
        setEditedPitches((prev) => {
          const next = { ...prev }
          delete next[lead.id]
          return next
        })

        showToast('Pitch generated successfully!', 'success')
      } else {
        setPitchStatus((prev) => ({
          ...prev,
          [lead.id]: { status: 'error', message: result.error || 'Failed to generate pitch' }
        }))
        showToast(result.error || 'Failed to generate pitch', 'error')
      }
    } catch (err) {
      console.error('Pitch generation error:', err)
      setPitchStatus((prev) => ({
        ...prev,
        [lead.id]: { status: 'error', message: 'Failed to generate pitch' }
      }))
      showToast('Failed to generate pitch', 'error')
    } finally {
      setGeneratingPitchIds((prev) => {
        const next = new Set(prev)
        next.delete(lead.id)
        return next
      })
    }
  }

  const handleGenerateEmailPitch = async (lead: SavedMapsLead): Promise<void> => {
    if (!selectedMailCampaignId) {
      showToast('Select a mail campaign first', 'error')
      return
    }

    const selectedCampaign = mailCampaigns.find((c) => c.id === selectedMailCampaignId)
    if (!selectedCampaign) {
      showToast('Select a mail campaign first', 'error')
      return
    }

    setGeneratingEmailPitchIds((prev) => new Set(prev).add(lead.id))
    setExpandedLeadIds((prev) => new Set(prev).add(lead.id))

    try {
      const result = await window.api.generateEmailPitch({
        leadId: lead.id,
        name: lead.name,
        category: lead.category,
        address: lead.address,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        website: lead.website,
        reviews: lead.reviews,
        instruction: selectedCampaign.instruction,
        buyerPersona: selectedCampaign.buyerPersona,
        examples: selectedCampaign.examples,
        productLinks: selectedCampaign.productLinks,
        language: selectedCampaign.language || 'en'
      })

      if (result.success && result.pitch) {
        setEmailPitches((prev) => ({
          ...prev,
          [lead.id]: result.pitch as StoredEmailPitch
        }))
        setEditedEmailPitches((prev) => {
          const next = { ...prev }
          delete next[lead.id]
          return next
        })
        showToast('Email pitch generated successfully!', 'success')
      } else {
        showToast(result.error || 'Failed to generate email pitch', 'error')
      }
    } catch (err) {
      console.error('Email pitch generation error:', err)
      showToast('Failed to generate email pitch', 'error')
    } finally {
      setGeneratingEmailPitchIds((prev) => {
        const next = new Set(prev)
        next.delete(lead.id)
        return next
      })
    }
  }

  const toggleExpanded = (leadId: string): void => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }

  const openWhatsAppWithPitch = (lead: SavedMapsLead): void => {
    if (!lead.phone) return
    let cleanNumber = lead.phone.replace(/[^\d+]/g, '')
    if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1)

    // USE EDITED PITCH IF AVAILABLE
    const finalPitch = editedPitches[lead.id] ?? lead.generatedPitch
    const message = finalPitch || `Hi! I found ${lead.name} on Google Maps and wanted to reach out.`
    window.api.openExternalUrl(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`)
  }

  const openEmailWithPitch = async (lead: { id: string; email?: string | null }): Promise<void> => {
    const pitch = emailPitches[lead.id]
    if (!pitch) return

    const subject = editedEmailPitches[lead.id]?.subject ?? pitch.subject
    const body = editedEmailPitches[lead.id]?.body ?? pitch.body
    const to = (lead.email ?? '').trim()

    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    const result = await window.api.openExternalUrl(mailtoUrl)
    if (!result.success) {
      showToast(result.error || 'Failed to open email client', 'error')
    }
  }

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard!', 'success')
  }

  const openTelegram = (lead: SavedMapsLead): void => {
    if (!lead.phone) return
    let cleanNumber = lead.phone.replace(/[^\d+]/g, '')
    if (!cleanNumber.startsWith('+')) cleanNumber = '+' + cleanNumber
    window.api.openExternalUrl(`https://t.me/${cleanNumber}`)
  }

  const openInGoogleMaps = (lead: SavedMapsLead): void => {
    // If we have coordinates, use them for precise location
    if (lead.latitude && lead.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        lead.name
      )}&query_place_id=${lead.id}`
      window.open(url, '_blank')
      return
    }

    const searchQuery = `${lead.name} ${lead.address}`
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`,
      '_blank'
    )
  }

  // =====================================================
  // FACEBOOK LEADS HANDLERS
  // =====================================================

  // Check if a Facebook lead's phone number has WhatsApp
  const handleFbCheckWhatsApp = async (leadId: string): Promise<void> => {
    const lead = facebookLeads.find((l) => l.id === leadId)
    if (!lead || !lead.phone) return

    if (!whatsAppReady) {
      showToast('Please connect WhatsApp first!', 'error')
      return
    }

    setFbLoadingWhatsAppIds((prev) => new Set(prev).add(leadId))

    try {
      const result = await window.api.whatsappCheckNumber(lead.phone)

      if (result.error) {
        showToast(result.error, 'error')
        setFbLoadingWhatsAppIds((prev) => {
          const next = new Set(prev)
          next.delete(leadId)
          return next
        })
        return
      }

      // Update lead with WhatsApp status
      const updatedLead = {
        ...lead,
        hasWhatsApp: result.hasWhatsApp
      }

      // Update local state
      setFacebookLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))

      // SAVE VALIDATION TO STORAGE
      try {
        await window.api.updateSavedFacebookLead(updatedLead)
      } catch (saveErr) {
        console.error('Failed to save WhatsApp status:', saveErr)
      }

      // Show feedback
      if (result.hasWhatsApp) {
        showToast(`${lead.title} has WhatsApp!`, 'success')
      } else {
        showToast(`${lead.title} does NOT have WhatsApp`, 'info')
      }
    } catch (err) {
      console.error('WhatsApp check error:', err)
      showToast('Failed to check WhatsApp status', 'error')
    } finally {
      setFbLoadingWhatsAppIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const handleFbVerifyEmail = async (leadId: string): Promise<void> => {
    const lead = facebookLeads.find((l) => l.id === leadId)
    if (!lead?.email) return

    setFbVerifyingEmailIds((prev) => new Set(prev).add(leadId))

    try {
      const verifyResult = await window.api.verifyEmail(lead.email)

      if (verifyResult.switched) {
        showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
      }

      const updatedLead: SavedFacebookLead = { ...lead, emailVerified: verifyResult.verified }

      setFacebookLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))
      await window.api.updateSavedFacebookLead(updatedLead)

      showToast(
        verifyResult.verified ? `Email verified: ${lead.email}` : `Invalid email: ${lead.email}`,
        verifyResult.verified ? 'success' : 'error'
      )
    } catch (err) {
      console.error('Email verification error:', err)
      showToast('Failed to verify email', 'error')
    } finally {
      setFbVerifyingEmailIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const handleFbFindEmail = async (leadId: string): Promise<void> => {
    const lead = facebookLeads.find((l) => l.id === leadId)
    if (!lead || !lead.website) return

    setFbLoadingEmailIds((prev) => new Set(prev).add(leadId))
    setFbNoEmailFoundIds((prev) => {
      const next = new Set(prev)
      next.delete(leadId)
      return next
    })

    try {
      const domain = extractDomain(lead.website)
      const result = await window.api.findEmailForDomain(domain)

      if (result.allKeysExhausted) {
        showToast(
          'All email finder API keys have hit rate limits. Please wait until they reset or add new API keys in Settings → Email.',
          'error'
        )
        return
      }

      let updatedLead: SavedFacebookLead = { ...lead }

      if (result.email) {
        setFbNoEmailFoundIds((prev) => {
          const next = new Set(prev)
          next.delete(leadId)
          return next
        })
        try {
          const verifyResult = await window.api.verifyEmail(result.email)

          if (verifyResult.switched) {
            showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
          }

          updatedLead = {
            ...updatedLead,
            email: result.email,
            emailVerified: verifyResult.verified,
            emailLookupAttempted: true
          }

          showToast(
            verifyResult.verified
              ? `Found verified email: ${result.email}`
              : `Found email (unverified): ${result.email}`,
            verifyResult.verified ? 'success' : 'info'
          )
        } catch (verifyErr) {
          console.error('Email verification error:', verifyErr)
          updatedLead = {
            ...updatedLead,
            email: result.email,
            emailVerified: false,
            emailLookupAttempted: true
          }
          showToast(`Found email (verification failed): ${result.email}`, 'info')
        }
      } else {
        setFbNoEmailFoundIds((prev) => new Set(prev).add(leadId))
        showToast(`No email found for "${lead.title}" (${domain})`, 'info')
        updatedLead = {
          ...updatedLead,
          email: null,
          emailLookupAttempted: true
        }
      }

      setFacebookLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))
      await window.api.updateSavedFacebookLead(updatedLead)
    } catch (err) {
      console.error('Email finder error:', err)
      showToast('Failed to find email', 'error')
    } finally {
      setFbLoadingEmailIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  // Generate pitch for Facebook lead
  const handleFbGeneratePitch = async (lead: SavedFacebookLead): Promise<void> => {
    console.log('[SavedLeads] Generating pitch for FB:', lead.title)

    setGeneratingPitchIds((prev) => new Set(prev).add(lead.id))
    setPitchStatus((prev) => ({
      ...prev,
      [lead.id]: { status: 'analyzing', message: '🧠 Analyzing business...' }
    }))

    // Expand the card to show progress
    setExpandedLeadIds((prev) => new Set(prev).add(lead.id))

    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

      const result = await window.api.generateWhatsAppPitch({
        leadId: lead.id,
        name: lead.title,
        category: lead.categories[0] || 'Business',
        address: lead.address || '',
        rating: lead.rating || 0,
        reviewCount: lead.ratingCount || 0,
        website: lead.website,
        instruction: selectedCampaign?.instruction,
        buyerPersona: selectedCampaign?.buyerPersona,
        examples: selectedCampaign?.examples,
        productLinks: selectedCampaign?.productLinks,
        language: selectedCampaign?.language || 'en'
      })

      if (result.success && result.pitch) {
        // Update lead with generated pitch
        const updatedLead = {
          ...lead,
          generatedPitch: result.pitch,
          pitchGeneratedAt: Date.now()
        }

        setFacebookLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead : l)))
        await window.api.updateSavedFacebookLead(updatedLead)

        setPitchStatus((prev) => ({
          ...prev,
          [lead.id]: { status: 'done', message: '✅ Pitch ready!', currentPitch: result.pitch }
        }))

        // Reset local edit state so the new pitch is shown
        setEditedPitches((prev) => {
          const next = { ...prev }
          delete next[lead.id]
          return next
        })

        showToast('Pitch generated successfully!', 'success')
      } else {
        setPitchStatus((prev) => ({
          ...prev,
          [lead.id]: { status: 'error', message: result.error || 'Failed to generate pitch' }
        }))
        showToast(result.error || 'Failed to generate pitch', 'error')
      }
    } catch (err) {
      console.error('Pitch generation error:', err)
      setPitchStatus((prev) => ({
        ...prev,
        [lead.id]: { status: 'error', message: 'Failed to generate pitch' }
      }))
      showToast('Failed to generate pitch', 'error')
    } finally {
      setGeneratingPitchIds((prev) => {
        const next = new Set(prev)
        next.delete(lead.id)
        return next
      })
    }
  }

  const handleFbGenerateEmailPitch = async (lead: SavedFacebookLead): Promise<void> => {
    if (!selectedMailCampaignId) {
      showToast('Select a mail campaign first', 'error')
      return
    }

    const selectedCampaign = mailCampaigns.find((c) => c.id === selectedMailCampaignId)
    if (!selectedCampaign) {
      showToast('Select a mail campaign first', 'error')
      return
    }

    setGeneratingEmailPitchIds((prev) => new Set(prev).add(lead.id))
    setExpandedLeadIds((prev) => new Set(prev).add(lead.id))

    try {
      const result = await window.api.generateEmailPitch({
        leadId: lead.id,
        name: lead.title,
        category: lead.categories[0] || 'Business',
        address: lead.address || '',
        rating: lead.rating || 0,
        reviewCount: lead.ratingCount || 0,
        website: lead.website,
        instruction: selectedCampaign.instruction,
        buyerPersona: selectedCampaign.buyerPersona,
        examples: selectedCampaign.examples,
        productLinks: selectedCampaign.productLinks,
        language: selectedCampaign.language || 'en'
      })

      if (result.success && result.pitch) {
        setEmailPitches((prev) => ({
          ...prev,
          [lead.id]: result.pitch as StoredEmailPitch
        }))
        setEditedEmailPitches((prev) => {
          const next = { ...prev }
          delete next[lead.id]
          return next
        })
        showToast('Email pitch generated successfully!', 'success')
      } else {
        showToast(result.error || 'Failed to generate email pitch', 'error')
      }
    } catch (err) {
      console.error('Email pitch generation error:', err)
      showToast('Failed to generate email pitch', 'error')
    } finally {
      setGeneratingEmailPitchIds((prev) => {
        const next = new Set(prev)
        next.delete(lead.id)
        return next
      })
    }
  }

  // Open WhatsApp with pitch for Facebook lead
  const openFbWhatsAppWithPitch = (lead: SavedFacebookLead): void => {
    if (!lead.phone) return
    let cleanNumber = lead.phone.replace(/[^\d+]/g, '')
    if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1)

    // USE EDITED PITCH IF AVAILABLE
    const finalPitch = editedPitches[lead.id] ?? lead.generatedPitch
    const message = finalPitch || `Hi! I found ${lead.title} on Facebook and wanted to reach out.`
    window.api.openExternalUrl(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`)
  }

  // Open Telegram for Facebook lead
  const openFbTelegram = (lead: SavedFacebookLead): void => {
    if (!lead.phone) return
    let cleanNumber = lead.phone.replace(/[^\d+]/g, '')
    if (!cleanNumber.startsWith('+')) cleanNumber = '+' + cleanNumber
    window.api.openExternalUrl(`https://t.me/${cleanNumber}`)
  }

  // Remove Facebook lead
  const handleFbRemoveLead = async (id: string): Promise<void> => {
    try {
      await window.api.removeSavedFacebookLead(id)
      setFacebookLeads((prev) => prev.filter((l) => l.id !== id))
      showToast('Lead removed', 'info')
    } catch (err) {
      console.error('Failed to remove lead:', err)
      showToast('Failed to remove lead', 'error')
    }
  }

  // Filter Facebook leads
  const filteredFacebookLeads = facebookLeads.filter((lead) => {
    // 1. Tab Filter
    if (fbActiveTab === 'has-website' && lead.website === null) return false
    if (fbActiveTab === 'no-website' && lead.website !== null) return false

    // 2. Search Query (Title)
    if (fbSearchQuery) {
      if (!lead.title.toLowerCase().includes(fbSearchQuery.toLowerCase())) return false
    }

    return true
  })
  const fbHasWebsiteCount = facebookLeads.filter((l) => l.website !== null).length
  const fbNoWebsiteCount = facebookLeads.filter((l) => l.website === null).length
  const fbUnverifiedWhatsAppCount = filteredFacebookLeads.filter(
    (l) => l.phone && l.hasWhatsApp == null
  ).length
  const fbUnverifiedEmailCount = filteredFacebookLeads.filter(
    (l) =>
      (l.email && l.emailVerified == null) ||
      (!l.email && l.website && l.emailLookupAttempted !== true)
  ).length

  const filteredLeads = leads.filter((lead) => {
    // 1. Tab Filter
    if (activeTab === 'has-website' && lead.website === null) return false
    if (activeTab === 'no-website' && lead.website !== null) return false

    // 2. Search Query (Name)
    if (searchQuery) {
      if (!lead.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    }

    // 3. Advanced Filters
    // Location
    if (filters.location && !lead.address.toLowerCase().includes(filters.location.toLowerCase())) {
      return false
    }
    // Category
    if (filters.category && !lead.category.toLowerCase().includes(filters.category.toLowerCase())) {
      return false
    }
    // Rating
    if (lead.rating < filters.minRating) return false
    // Reviews
    if (lead.reviewCount < filters.minReviews) return false
    // Score
    if (!filters.scores[lead.score]) return false
    // WhatsApp
    if (filters.hasWhatsApp !== 'all') {
      if (filters.hasWhatsApp === 'yes' && lead.hasWhatsApp !== true) return false
      if (filters.hasWhatsApp === 'no' && lead.hasWhatsApp !== false) return false
      if (
        filters.hasWhatsApp === 'unknown' &&
        lead.hasWhatsApp !== undefined &&
        lead.hasWhatsApp !== null
      )
        return false
    }
    // Email
    if (filters.hasEmail !== 'all') {
      if (filters.hasEmail === 'yes' && !lead.email) return false
      if (filters.hasEmail === 'verified' && (!lead.email || !lead.emailVerified)) return false
    }

    return true
  })
  const hasWebsiteCount = leads.filter((l) => l.website !== null).length
  const noWebsiteCount = leads.filter((l) => l.website === null).length
  const unverifiedWhatsAppCount = filteredLeads.filter(
    (l) => l.phone && l.hasWhatsApp == null
  ).length
  const unverifiedEmailCount = filteredLeads.filter(
    (l) =>
      (l.email && l.emailVerified == null) ||
      (!l.email && l.website && l.emailLookupAttempted !== true)
  ).length

  const handleVerifyAllWhatsApp = async (): Promise<void> => {
    if (!whatsAppReady) {
      showToast('Please connect WhatsApp first!', 'error')
      return
    }

    const targets = filteredLeads.filter((l) => l.phone && l.hasWhatsApp == null)
    if (targets.length === 0) {
      showToast('No unverified phone numbers to check.', 'info')
      return
    }

    const delayMs = 5000

    whatsAppBulkCancelRef.current = false
    setWhatsAppBulkStopRequested(false)
    setWhatsAppBulkVerifying(true)
    setWhatsAppBulkProgress({ current: 0, total: targets.length, errors: 0 })

    let errors = 0
    let stopped = false

    try {
      for (let i = 0; i < targets.length; i++) {
        if (whatsAppBulkCancelRef.current) break

        const lead = targets[i]
        if (!lead.phone) continue

        setWhatsAppBulkProgress({ current: i + 1, total: targets.length, errors })

        setLoadingWhatsAppIds((prev) => new Set(prev).add(lead.id))

        try {
          const result = await window.api.whatsappCheckNumber(lead.phone)
          if (result.error) {
            errors += 1
          } else {
            const updatedLead: SavedMapsLead = { ...lead, hasWhatsApp: result.hasWhatsApp }
            setLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead : l)))
            await window.api.updateSavedMapsLead(updatedLead)
          }
        } catch {
          errors += 1
        } finally {
          setLoadingWhatsAppIds((prev) => {
            const next = new Set(prev)
            next.delete(lead.id)
            return next
          })
        }

        if (i < targets.length - 1) {
          const canceled = await waitWithCancel(delayMs)
          if (canceled) break
        }
      }
    } finally {
      stopped = whatsAppBulkCancelRef.current
      setWhatsAppBulkVerifying(false)
      setWhatsAppBulkStopRequested(false)
      setWhatsAppBulkProgress(null)
      whatsAppBulkCancelRef.current = false
    }

    if (stopped) {
      showToast('WhatsApp verification stopped.', 'info')
    } else if (errors > 0) {
      showToast(`WhatsApp verification finished with ${errors} errors.`, 'info')
    } else {
      showToast('WhatsApp verification finished.', 'success')
    }
  }

  const handleStopVerifyAllWhatsApp = (): void => {
    whatsAppBulkCancelRef.current = true
    setWhatsAppBulkStopRequested(true)
  }

  const handleVerifyAllMail = async (): Promise<void> => {
    if (emailBulkVerifying) return

    const targets = filteredLeads.filter(
      (l) =>
        (l.email && l.emailVerified == null) ||
        (!l.email && l.website && l.emailLookupAttempted !== true)
    )
    if (targets.length === 0) {
      showToast('No emails to verify.', 'info')
      return
    }

    const delayMs = 5000

    emailBulkCancelRef.current = false
    setEmailBulkStopRequested(false)
    setEmailBulkVerifying(true)
    setEmailBulkProgress({ current: 0, total: targets.length, errors: 0 })

    let errors = 0
    let stopped = false

    try {
      for (let i = 0; i < targets.length; i++) {
        if (emailBulkCancelRef.current) break

        const lead = targets[i]
        setEmailBulkProgress({ current: i + 1, total: targets.length, errors })

        try {
          let updatedLead: SavedMapsLead | null = null

          if (lead.email) {
            setVerifyingEmailIds((prev) => new Set(prev).add(lead.id))
            try {
              const verifyResult = await window.api.verifyEmail(lead.email)
              if (verifyResult.switched) {
                showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
              }
              updatedLead = { ...lead, emailVerified: verifyResult.verified }
            } finally {
              setVerifyingEmailIds((prev) => {
                const next = new Set(prev)
                next.delete(lead.id)
                return next
              })
            }
          } else if (lead.website) {
            setLoadingEmailIds((prev) => new Set(prev).add(lead.id))
            setNoEmailFoundIds((prev) => {
              const next = new Set(prev)
              next.delete(lead.id)
              return next
            })
            try {
              const domain = extractDomain(lead.website)
              const result = await window.api.findEmailForDomain(domain)

              if (result.allKeysExhausted) {
                showToast(
                  'All email finder API keys have hit rate limits. Please wait until they reset or add new API keys in Settings → Email.',
                  'error'
                )
                errors += 1
                break
              }

              if (result.email) {
                try {
                  const verifyResult = await window.api.verifyEmail(result.email)
                  if (verifyResult.switched) {
                    showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
                  }
                  updatedLead = {
                    ...lead,
                    email: result.email || undefined,
                    emailSource: result.source,
                    emailVerified: verifyResult.verified,
                    emailLookupAttempted: true
                  }
                } catch {
                  updatedLead = {
                    ...lead,
                    email: result.email || undefined,
                    emailSource: result.source,
                    emailVerified: false,
                    emailLookupAttempted: true
                  }
                }
              } else {
                setNoEmailFoundIds((prev) => new Set(prev).add(lead.id))
                updatedLead = {
                  ...lead,
                  email: undefined,
                  emailSource: result.source,
                  emailVerified: undefined,
                  emailLookupAttempted: true
                }
              }
            } finally {
              setLoadingEmailIds((prev) => {
                const next = new Set(prev)
                next.delete(lead.id)
                return next
              })
            }
          }

          if (updatedLead) {
            setLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead! : l)))
            await window.api.updateSavedMapsLead(updatedLead)
          }
        } catch {
          errors += 1
        }

        if (i < targets.length - 1) {
          const canceled = await waitWithEmailCancel(delayMs)
          if (canceled) break
        }
      }
    } finally {
      stopped = emailBulkCancelRef.current
      setEmailBulkVerifying(false)
      setEmailBulkStopRequested(false)
      setEmailBulkProgress(null)
      emailBulkCancelRef.current = false
    }

    if (stopped) {
      showToast('Email verification stopped.', 'info')
    } else if (errors > 0) {
      showToast(`Email verification finished with ${errors} errors.`, 'info')
    } else {
      showToast('Email verification finished.', 'success')
    }
  }

  const handleStopVerifyAllMail = (): void => {
    emailBulkCancelRef.current = true
    setEmailBulkStopRequested(true)
  }

  const handleFbVerifyAllWhatsApp = async (): Promise<void> => {
    if (!whatsAppReady) {
      showToast('Please connect WhatsApp first!', 'error')
      return
    }

    const targets = filteredFacebookLeads.filter((l) => l.phone && l.hasWhatsApp == null)
    if (targets.length === 0) {
      showToast('No unverified phone numbers to check.', 'info')
      return
    }

    const delayMs = 5000

    fbWhatsAppBulkCancelRef.current = false
    setFbWhatsAppBulkStopRequested(false)
    setFbWhatsAppBulkVerifying(true)
    setFbWhatsAppBulkProgress({ current: 0, total: targets.length, errors: 0 })

    let errors = 0
    let stopped = false

    try {
      for (let i = 0; i < targets.length; i++) {
        if (fbWhatsAppBulkCancelRef.current) break

        const lead = targets[i]
        if (!lead.phone) continue

        setFbWhatsAppBulkProgress({ current: i + 1, total: targets.length, errors })

        setFbLoadingWhatsAppIds((prev) => new Set(prev).add(lead.id))

        try {
          const result = await window.api.whatsappCheckNumber(lead.phone)
          if (result.error) {
            errors += 1
          } else {
            const updatedLead: SavedFacebookLead = { ...lead, hasWhatsApp: result.hasWhatsApp }
            setFacebookLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead : l)))
            await window.api.updateSavedFacebookLead(updatedLead)
          }
        } catch {
          errors += 1
        } finally {
          setFbLoadingWhatsAppIds((prev) => {
            const next = new Set(prev)
            next.delete(lead.id)
            return next
          })
        }

        if (i < targets.length - 1) {
          const canceled = await waitWithFbCancel(delayMs)
          if (canceled) break
        }
      }
    } finally {
      stopped = fbWhatsAppBulkCancelRef.current
      setFbWhatsAppBulkVerifying(false)
      setFbWhatsAppBulkStopRequested(false)
      setFbWhatsAppBulkProgress(null)
      fbWhatsAppBulkCancelRef.current = false
    }

    if (stopped) {
      showToast('WhatsApp verification stopped.', 'info')
    } else if (errors > 0) {
      showToast(`WhatsApp verification finished with ${errors} errors.`, 'info')
    } else {
      showToast('WhatsApp verification finished.', 'success')
    }
  }

  const handleFbStopVerifyAllWhatsApp = (): void => {
    fbWhatsAppBulkCancelRef.current = true
    setFbWhatsAppBulkStopRequested(true)
  }

  const handleFbVerifyAllMail = async (): Promise<void> => {
    if (fbEmailBulkVerifying) return

    const targets = filteredFacebookLeads.filter(
      (l) =>
        (l.email && l.emailVerified == null) ||
        (!l.email && l.website && l.emailLookupAttempted !== true)
    )
    if (targets.length === 0) {
      showToast('No emails to verify.', 'info')
      return
    }

    const delayMs = 5000

    fbEmailBulkCancelRef.current = false
    setFbEmailBulkStopRequested(false)
    setFbEmailBulkVerifying(true)
    setFbEmailBulkProgress({ current: 0, total: targets.length, errors: 0 })

    let errors = 0
    let stopped = false

    try {
      for (let i = 0; i < targets.length; i++) {
        if (fbEmailBulkCancelRef.current) break

        const lead = targets[i]
        setFbEmailBulkProgress({ current: i + 1, total: targets.length, errors })

        try {
          let updatedLead: SavedFacebookLead | null = null

          if (lead.email) {
            setFbVerifyingEmailIds((prev) => new Set(prev).add(lead.id))
            try {
              const verifyResult = await window.api.verifyEmail(lead.email)
              if (verifyResult.switched) {
                showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
              }
              updatedLead = { ...lead, emailVerified: verifyResult.verified }
            } finally {
              setFbVerifyingEmailIds((prev) => {
                const next = new Set(prev)
                next.delete(lead.id)
                return next
              })
            }
          } else if (lead.website) {
            setFbLoadingEmailIds((prev) => new Set(prev).add(lead.id))
            setFbNoEmailFoundIds((prev) => {
              const next = new Set(prev)
              next.delete(lead.id)
              return next
            })
            try {
              const domain = extractDomain(lead.website)
              const result = await window.api.findEmailForDomain(domain)

              if (result.allKeysExhausted) {
                showToast(
                  'All email finder API keys have hit rate limits. Please wait until they reset or add new API keys in Settings → Email.',
                  'error'
                )
                errors += 1
                break
              }

              if (result.email) {
                try {
                  const verifyResult = await window.api.verifyEmail(result.email)
                  if (verifyResult.switched) {
                    showToast('Switched to Rapid Verifier (Reoon rate limited)', 'info')
                  }
                  updatedLead = {
                    ...lead,
                    email: result.email,
                    emailVerified: verifyResult.verified,
                    emailLookupAttempted: true
                  }
                } catch {
                  updatedLead = {
                    ...lead,
                    email: result.email,
                    emailVerified: false,
                    emailLookupAttempted: true
                  }
                }
              } else {
                setFbNoEmailFoundIds((prev) => new Set(prev).add(lead.id))
                updatedLead = {
                  ...lead,
                  email: null,
                  emailVerified: undefined,
                  emailLookupAttempted: true
                }
              }
            } finally {
              setFbLoadingEmailIds((prev) => {
                const next = new Set(prev)
                next.delete(lead.id)
                return next
              })
            }
          }

          if (updatedLead) {
            setFacebookLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead! : l)))
            await window.api.updateSavedFacebookLead(updatedLead)
          }
        } catch {
          errors += 1
        }

        if (i < targets.length - 1) {
          const canceled = await waitWithFbEmailCancel(delayMs)
          if (canceled) break
        }
      }
    } finally {
      stopped = fbEmailBulkCancelRef.current
      setFbEmailBulkVerifying(false)
      setFbEmailBulkStopRequested(false)
      setFbEmailBulkProgress(null)
      fbEmailBulkCancelRef.current = false
    }

    if (stopped) {
      showToast('Email verification stopped.', 'info')
    } else if (errors > 0) {
      showToast(`Email verification finished with ${errors} errors.`, 'info')
    } else {
      showToast('Email verification finished.', 'success')
    }
  }

  const handleFbStopVerifyAllMail = (): void => {
    fbEmailBulkCancelRef.current = true
    setFbEmailBulkStopRequested(true)
  }

  const handleExport = (): void => {
    if (filteredLeads.length === 0) return
    const headers = [
      'Name',
      'Address',
      'Phone',
      'Website',
      'Rating',
      'Reviews',
      'Category',
      'Score',
      'Email'
    ]
    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.address,
      lead.phone || '',
      lead.website || '',
      lead.rating.toString(),
      lead.reviewCount.toString(),
      lead.category,
      lead.score,
      lead.email || ''
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saved-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getScoreColor = (score: string): string => {
    switch (score) {
      case 'gold':
        return '#f59e0b'
      case 'silver':
        return '#94a3b8'
      case 'bronze':
        return '#cd7c32'
      default:
        return '#64748b'
    }
  }

  // Render star rating
  const renderStars = (rating: number | null | undefined): JSX.Element => {
    const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0
    const fullStars = Math.floor(safeRating)
    const hasHalf = safeRating % 1 >= 0.5
    const stars: JSX.Element[] = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={`full-${i}`} className="star full">
          ★
        </span>
      )
    }
    if (hasHalf) {
      stars.push(
        <span key="half" className="star half">
          ★
        </span>
      )
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(
        <span key={`empty-${i}`} className="star empty">
          ☆
        </span>
      )
    }

    return <div className="stars-display">{stars}</div>
  }

  // Fetch reviews for a lead
  const handleFetchReviews = async (lead: SavedMapsLead, force = false): Promise<void> => {
    setSelectedLead(lead)
    setReviewsPanelOpen(true)
    setReviewsData(null)
    setReviewsError(null)

    // Check if we already have reviews cached (unless forced)
    if (!force && lead.reviews && lead.reviews.length > 0) {
      console.log('[SavedLeads] Using cached reviews')
      setReviewsData({
        businessName: lead.name,
        totalReviews: lead.reviewCount,
        averageRating: lead.rating,
        reviews: lead.reviews
      })
      return
    }

    setIsLoadingReviews(true)

    try {
      console.log('[SavedLeads] Fetching reviews for:', lead.id, lead.name)
      const result = await window.api.fetchReviews(lead.id, lead.name, 10)
      console.log('[SavedLeads] Raw reviews result:', result)

      // Validate and sanitize
      const sanitizedResult = {
        businessName: result?.businessName || lead.name || 'Unknown Business',
        totalReviews: typeof result?.totalReviews === 'number' ? result.totalReviews : 0,
        averageRating: typeof result?.averageRating === 'number' ? result.averageRating : 0,
        reviews: Array.isArray(result?.reviews)
          ? result.reviews.map((r) => ({
              author: r?.author || 'Anonymous',
              rating: typeof r?.rating === 'number' ? r.rating : 0,
              date: r?.date || '',
              text: r?.text || '',
              source: r?.source || undefined
            }))
          : []
      }

      setReviewsData(sanitizedResult)

      // SAVE REVIEWS TO PERSISTENT STORAGE
      if (sanitizedResult.reviews.length > 0) {
        const updatedLead = { ...lead, reviews: sanitizedResult.reviews }

        // Update local state
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? updatedLead : l)))
        if (selectedLead?.id === lead.id) {
          setSelectedLead(updatedLead)
        }

        // Save to DB (Update specifically)
        await window.api.updateSavedMapsLead(updatedLead)
        console.log('[SavedLeads] Saved reviews to cache')
      }
    } catch (err) {
      console.error('[SavedLeads] Reviews fetch error:', err)
      setReviewsError(err instanceof Error ? err.message : 'Failed to fetch reviews')
    } finally {
      setIsLoadingReviews(false)
    }
  }

  // Clear cached reviews for a lead
  const handleClearReviews = async (): Promise<void> => {
    if (!selectedLead) return

    // Create lead without reviews
    const updatedLead = { ...selectedLead, reviews: undefined }

    // Update local state
    setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)))
    setSelectedLead(updatedLead)
    setReviewsData(null) // Clear currently shown data

    // Update DB
    await window.api.updateSavedMapsLead(updatedLead)
    showToast('Reviews cleared from cache', 'info')
  }

  const closeReviewsPanel = (): void => {
    setReviewsPanelOpen(false)
    setSelectedLead(null)
    setReviewsData(null)
    setReviewsError(null)
  }

  return (
    <div className="scout-page saved-leads-page">
      {/* Source Tabs - Maps Scout vs Facebook */}
      <div className="tabs-container" style={{ marginBottom: '1rem' }}>
        <button
          className={`tab-btn ${sourceTab === 'maps' ? 'active' : ''}`}
          onClick={() => setSourceTab('maps')}
        >
          <FaMapMarkedAlt />
          Maps Scout ({leads.length})
        </button>
        <button
          className={`tab-btn ${sourceTab === 'facebook' ? 'active' : ''}`}
          onClick={() => setSourceTab('facebook')}
        >
          <FaFacebook />
          Facebook Page ({facebookLeads.length})
        </button>
      </div>

      {/* Maps Scout Content */}
      {sourceTab === 'maps' && (
        <>
          {/* Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 2rem',
              marginBottom: '1.5rem',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            {/* Search & Filter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flex: 1,
                minWidth: '300px'
              }}
            >
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Search leads by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.6)"
                  strokeWidth="2"
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              {/* Filter Toggle Button */}
              {(() => {
                let activeFilterCount = 0
                if (filters.location) activeFilterCount++
                if (filters.category) activeFilterCount++
                if (filters.minRating > 0) activeFilterCount++
                if (filters.minReviews > 0) activeFilterCount++
                if (filters.hasWhatsApp !== 'all') activeFilterCount++
                if (filters.hasEmail !== 'all') activeFilterCount++
                if (!filters.scores.gold || !filters.scores.silver || !filters.scores.bronze)
                  activeFilterCount++

                const hasActiveFilters = activeFilterCount > 0

                return (
                  <button
                    onClick={() => setFilterPanelOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background:
                        filterPanelOpen || hasActiveFilters
                          ? 'rgba(99, 102, 241, 0.2)'
                          : 'rgba(15, 23, 42, 0.6)',
                      border:
                        filterPanelOpen || hasActiveFilters
                          ? '1px solid #6366f1'
                          : '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '12px',
                      color: filterPanelOpen || hasActiveFilters ? '#6366f1' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <FaFilter />
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <span
                        style={{
                          background: '#6366f1',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '0.25rem'
                        }}
                      >
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                )
              })()}
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}
            >
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background:
                    activeTab === 'all'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'transparent',
                  color: activeTab === 'all' ? 'white' : '#94a3b8'
                }}
              >
                All
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background:
                      activeTab === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.15)',
                    color: activeTab === 'all' ? 'white' : '#6366f1'
                  }}
                >
                  {leads.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('has-website')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background:
                    activeTab === 'has-website'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'transparent',
                  color: activeTab === 'has-website' ? 'white' : '#94a3b8'
                }}
              >
                Has Website
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background:
                      activeTab === 'has-website'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(99, 102, 241, 0.15)',
                    color: activeTab === 'has-website' ? 'white' : '#6366f1'
                  }}
                >
                  {hasWebsiteCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('no-website')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background:
                    activeTab === 'no-website'
                      ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                      : 'transparent',
                  color: activeTab === 'no-website' ? 'white' : '#94a3b8'
                }}
              >
                No Website
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background:
                      activeTab === 'no-website'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color: activeTab === 'no-website' ? 'white' : '#f59e0b'
                  }}
                >
                  {noWebsiteCount}
                </span>
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {whatsAppBulkVerifying ? (
                <button
                  onClick={handleStopVerifyAllWhatsApp}
                  disabled={whatsAppBulkStopRequested}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: whatsAppBulkStopRequested ? 'not-allowed' : 'pointer',
                    opacity: whatsAppBulkStopRequested ? 0.5 : 1
                  }}
                >
                  <FaTimes />
                  {whatsAppBulkStopRequested
                    ? 'Stopping...'
                    : whatsAppBulkProgress
                      ? `Stop (${whatsAppBulkProgress.current}/${whatsAppBulkProgress.total})`
                      : 'Stop'}
                </button>
              ) : (
                <button
                  onClick={handleVerifyAllWhatsApp}
                  disabled={!whatsAppReady || unverifiedWhatsAppCount === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: whatsAppReady
                      ? '1px solid rgba(37, 211, 102, 0.3)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                    background: whatsAppReady
                      ? 'rgba(37, 211, 102, 0.12)'
                      : 'rgba(15, 23, 42, 0.6)',
                    color: whatsAppReady ? '#25d366' : '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor:
                      !whatsAppReady || unverifiedWhatsAppCount === 0 ? 'not-allowed' : 'pointer',
                    opacity: !whatsAppReady || unverifiedWhatsAppCount === 0 ? 0.5 : 1
                  }}
                >
                  <FaWhatsapp />{' '}
                  {unverifiedWhatsAppCount > 0
                    ? `Verify All WhatsApp (${unverifiedWhatsAppCount})`
                    : 'Verify All WhatsApp'}
                </button>
              )}
              {emailBulkVerifying ? (
                <button
                  onClick={handleStopVerifyAllMail}
                  disabled={emailBulkStopRequested}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: emailBulkStopRequested ? 'not-allowed' : 'pointer',
                    opacity: emailBulkStopRequested ? 0.5 : 1
                  }}
                >
                  <FaTimes />
                  {emailBulkStopRequested
                    ? 'Stopping...'
                    : emailBulkProgress
                      ? `Stop (${emailBulkProgress.current}/${emailBulkProgress.total})`
                      : 'Stop'}
                </button>
              ) : (
                <button
                  onClick={handleVerifyAllMail}
                  disabled={unverifiedEmailCount === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: unverifiedEmailCount === 0 ? 'not-allowed' : 'pointer',
                    opacity: unverifiedEmailCount === 0 ? 0.5 : 1
                  }}
                >
                  <FaEnvelope />{' '}
                  {unverifiedEmailCount > 0
                    ? `Verify All Mail (${unverifiedEmailCount})`
                    : 'Verify All Mail'}
                </button>
              )}
              <button
                onClick={handleExport}
                disabled={filteredLeads.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: filteredLeads.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: filteredLeads.length === 0 ? 0.5 : 1
                }}
              >
                <FaFileExport /> Export
              </button>
              <button
                onClick={handleClearAll}
                disabled={leads.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: leads.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: leads.length === 0 ? 0.5 : 1
                }}
              >
                <FaTrashAlt /> Clear All
              </button>
            </div>
          </div>
          {/* WhatsApp Pitch Section */}
          <div
            style={{
              padding: '0 2rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}
          >
            {/* Mail Pitch Container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '14px'
              }}
            >
              {/* Mail Section Label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  paddingRight: '0.75rem',
                  borderRight: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                <FaEnvelope style={{ color: '#6366f1', fontSize: '1rem' }} />
                <span
                  style={{
                    color: '#6366f1',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Mail Pitch
                </span>
              </div>

              {/* Mail Group Selector */}
              {mailCampaignGroups.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedMailGroupId}
                    onChange={(e) => {
                      const newGroupId = e.target.value
                      setSelectedMailGroupId(newGroupId)
                      localStorage.setItem('savedLeads_selectedMailGroupId', newGroupId)

                      // Auto-select first campaign in the new group
                      const groupCampaigns = mailCampaigns.filter((c) => c.groupId === newGroupId)
                      if (groupCampaigns.length > 0) {
                        const newCampaignId = groupCampaigns[0].id
                        setSelectedMailCampaignId(newCampaignId)
                        localStorage.setItem('savedLeads_selectedMailCampaignId', newCampaignId)
                      } else {
                        setSelectedMailCampaignId('')
                        localStorage.removeItem('savedLeads_selectedMailCampaignId')
                      }
                    }}
                    style={{
                      appearance: 'none',
                      padding: '0.5rem 2rem 0.5rem 0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      maxWidth: '130px'
                    }}
                  >
                    {mailCampaignGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6366f1',
                      pointerEvents: 'none',
                      fontSize: '0.65rem'
                    }}
                  />
                </div>
              )}

              {/* Mail Campaign Selector */}
              {mailCampaigns.length > 0 &&
                (() => {
                  const relevantCampaigns =
                    mailCampaignGroups.length > 0
                      ? mailCampaigns.filter((c) => c.groupId === selectedMailGroupId)
                      : mailCampaigns.filter((c) => !c.groupId)

                  if (relevantCampaigns.length === 0) {
                    return (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#64748b',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '8px',
                          border: '1px dashed rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        No campaigns
                      </div>
                    )
                  }

                  return (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedMailCampaignId}
                        onChange={(e) => {
                          const newId = e.target.value
                          setSelectedMailCampaignId(newId)
                          localStorage.setItem('savedLeads_selectedMailCampaignId', newId)
                        }}
                        style={{
                          appearance: 'none',
                          padding: '0.5rem 2rem 0.5rem 0.75rem',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '180px',
                          minWidth: '120px'
                        }}
                      >
                        {relevantCampaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.language === 'bn' ? '🇧🇩 ' : '🇺🇸 '}
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown
                        style={{
                          position: 'absolute',
                          right: '0.6rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6366f1',
                          pointerEvents: 'none',
                          fontSize: '0.65rem'
                        }}
                      />
                    </div>
                  )
                })()}
            </div>

            {/* WhatsApp Pitch Container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid rgba(37, 211, 102, 0.2)',
                borderRadius: '14px'
              }}
            >
              {/* WhatsApp Section Label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  paddingRight: '0.75rem',
                  borderRight: '1px solid rgba(37, 211, 102, 0.3)'
                }}
              >
                <FaWhatsapp style={{ color: '#25d366', fontSize: '1rem' }} />
                <span
                  style={{
                    color: '#25d366',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  WhatsApp Pitch
                </span>
              </div>

              {/* Campaign Group Selector */}
              {campaignGroups.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => {
                      const newGroupId = e.target.value
                      setSelectedGroupId(newGroupId)
                      localStorage.setItem('savedLeads_selectedGroupId', newGroupId)

                      // Auto-select first campaign in the new group
                      const groupCampaigns = campaigns.filter((c) => c.groupId === newGroupId)
                      if (groupCampaigns.length > 0) {
                        const newCampaignId = groupCampaigns[0].id
                        setSelectedCampaignId(newCampaignId)
                        localStorage.setItem('savedLeads_selectedCampaignId', newCampaignId)
                      } else {
                        setSelectedCampaignId('')
                        localStorage.removeItem('savedLeads_selectedCampaignId')
                      }
                    }}
                    style={{
                      appearance: 'none',
                      padding: '0.5rem 2rem 0.5rem 0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      maxWidth: '130px'
                    }}
                  >
                    {campaignGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#25d366',
                      pointerEvents: 'none',
                      fontSize: '0.65rem'
                    }}
                  />
                </div>
              )}

              {/* Campaign Selector */}
              {campaigns.length > 0 &&
                (() => {
                  const relevantCampaigns =
                    campaignGroups.length > 0
                      ? campaigns.filter((c) => c.groupId === selectedGroupId)
                      : campaigns.filter((c) => !c.groupId)

                  if (relevantCampaigns.length === 0) {
                    return (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#64748b',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '8px',
                          border: '1px dashed rgba(37, 211, 102, 0.3)'
                        }}
                      >
                        No campaigns
                      </div>
                    )
                  }

                  return (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => {
                          const newId = e.target.value
                          setSelectedCampaignId(newId)
                          localStorage.setItem('savedLeads_selectedCampaignId', newId)
                        }}
                        style={{
                          appearance: 'none',
                          padding: '0.5rem 2rem 0.5rem 0.75rem',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(37, 211, 102, 0.3)',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '180px',
                          minWidth: '120px'
                        }}
                      >
                        {relevantCampaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.language === 'bn' ? '🇧🇩 ' : '🇺🇸 '}
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown
                        style={{
                          position: 'absolute',
                          right: '0.6rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#25d366',
                          pointerEvents: 'none',
                          fontSize: '0.65rem'
                        }}
                      />
                    </div>
                  )
                })()}

              {/* WhatsApp Connect Button */}
              <button
                onClick={whatsAppReady ? window.api.whatsappDisconnect : handleInitWhatsApp}
                disabled={whatsAppInitializing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: whatsAppReady
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : '1px solid rgba(148, 163, 184, 0.3)',
                  background: whatsAppReady ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  color: whatsAppReady ? '#22c55e' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <FaWhatsapp />
                {whatsAppInitializing ? 'Connecting...' : whatsAppReady ? 'Connected' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4rem',
                gap: '1rem'
              }}
            >
              <div className="action-spinner" style={{ width: 32, height: 32 }} />
              <p style={{ color: '#94a3b8' }}>Loading saved leads...</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && leads.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3, color: '#f1f5f9' }}
              >
                <FaClipboardList />
              </div>
              <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No Saved Leads</h3>
              <p style={{ color: '#64748b' }}>Save leads from Maps Scout to see them here.</p>
            </div>
          )}

          {/* Leads List - SCROLLABLE */}
          {!isLoading && filteredLeads.length > 0 && (
            <div
              className="scout-leads"
              style={{
                padding: '0 2rem',
                maxHeight: 'calc(100vh - 320px)',
                overflowY: 'auto'
              }}
            >
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0',
                    padding: '1rem 1.25rem',
                    background:
                      'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    borderRadius: '14px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}
                  >
                    {/* Score Indicator */}
                    <div
                      style={{
                        width: '4px',
                        height: '48px',
                        borderRadius: '4px',
                        flexShrink: 0,
                        background: `linear-gradient(180deg, ${getScoreColor(lead.score)}, ${getScoreColor(lead.score)}dd)`
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <h3
                            style={{
                              color: '#f1f5f9',
                              fontSize: '1rem',
                              fontWeight: 600,
                              margin: 0
                            }}
                          >
                            {lead.name}
                          </h3>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#6366f1'
                            }}
                          >
                            {lead.category}
                          </span>
                        </div>
                      </div>

                      {/* Address */}
                      <p
                        style={{
                          color: '#64748b',
                          fontSize: '0.8rem',
                          margin: '0 0 0.5rem 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {lead.address}
                      </p>

                      {/* Contact Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        {lead.phone ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#f1f5f9'
                            }}
                          >
                            <FaPhoneAlt style={{ color: '#64748b' }} /> {lead.phone}
                            {lead.hasWhatsApp === true && (
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  background: 'rgba(37, 211, 102, 0.2)',
                                  color: '#25d366'
                                }}
                              >
                                WA
                              </span>
                            )}
                            {lead.hasWhatsApp === false && (
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444'
                                }}
                              >
                                No WA
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}
                          >
                            No phone
                          </span>
                        )}

                        {lead.email && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.8rem',
                                color:
                                  lead.emailVerified === true
                                    ? '#22c55e'
                                    : lead.emailVerified === false
                                      ? '#ef4444'
                                      : '#d97706',
                                fontWeight: 500
                              }}
                            >
                              <FaEnvelope
                                style={{
                                  color:
                                    lead.emailVerified === true
                                      ? '#22c55e'
                                      : lead.emailVerified === false
                                        ? '#ef4444'
                                        : '#d97706'
                                }}
                              />{' '}
                              {lead.email}
                              {lead.emailVerified === true && (
                                <span
                                  style={{ color: '#22c55e', fontWeight: 700, marginLeft: '4px' }}
                                  title="Verified Email"
                                >
                                  <FaCheck />
                                </span>
                              )}
                              {lead.emailVerified === false && (
                                <span
                                  style={{
                                    color: '#ef4444',
                                    fontWeight: 700,
                                    marginLeft: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Invalid/Unverified Email"
                                >
                                  <FaTimes />
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {!lead.email &&
                        lead.website &&
                        (lead.emailLookupAttempted === true || noEmailFoundIds.has(lead.id)) ? (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: '#64748b',
                              fontStyle: 'italic'
                            }}
                          >
                            No email found
                          </span>
                        ) : null}

                        {lead.website ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#22c55e',
                              fontWeight: 500
                            }}
                          >
                            <FaGlobe /> Has website
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#f59e0b',
                              fontStyle: 'italic'
                            }}
                          >
                            <FaExclamationTriangle /> No website
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          paddingRight: '1rem',
                          borderRight: '1px solid rgba(148, 163, 184, 0.2)',
                          height: '24px'
                        }}
                      >
                        <span style={{ color: '#fbbf24' }}>
                          <FaStar />
                        </span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>
                          {lead.rating}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          ({lead.reviewCount})
                        </span>
                      </div>

                      <button
                        onClick={() => openInGoogleMaps(lead)}
                        title="View on Maps"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#6366f1',
                          fontSize: '1rem'
                        }}
                      >
                        <FaMapMarkerAlt />
                      </button>

                      {/* Reviews Button with Cache Indicator */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => handleFetchReviews(lead)}
                          title={
                            lead.reviews?.length
                              ? `View ${lead.reviews.length} Cached Reviews`
                              : 'Fetch Reviews'
                          }
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                              lead.reviews && lead.reviews.length > 0
                                ? 'rgba(251, 191, 36, 0.15)'
                                : 'rgba(148, 163, 184, 0.15)',
                            color: lead.reviews && lead.reviews.length > 0 ? '#fbbf24' : '#94a3b8',
                            fontSize: '1rem'
                          }}
                        >
                          <FaStar />
                        </button>
                        {lead.reviews && lead.reviews.length > 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -5,
                              right: -5,
                              background: '#fbbf24',
                              color: '#0f172a',
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid #1e293b'
                            }}
                          >
                            {lead.reviews.length}
                          </span>
                        )}
                      </div>

                      {lead.website && (
                        <button
                          onClick={() => openWebsite(lead.website!)}
                          title="View the website"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                            fontSize: '1rem'
                          }}
                        >
                          <FaGlobe />
                        </button>
                      )}

                      {/* WhatsApp Actions */}
                      {lead.phone && lead.hasWhatsApp == null && (
                        <button
                          onClick={() => handleCheckWhatsApp(lead.id)}
                          disabled={loadingWhatsAppIds.has(lead.id) || !whatsAppReady}
                          title={whatsAppReady ? 'Check WhatsApp' : 'Connect WhatsApp first'}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(148, 163, 184, 0.15)', // Grayish for "Check"
                            color: '#94a3b8',
                            fontSize: '1rem',
                            opacity: !whatsAppReady && !loadingWhatsAppIds.has(lead.id) ? 0.5 : 1
                          }}
                        >
                          {loadingWhatsAppIds.has(lead.id) ? (
                            <div className="action-spinner" style={{ width: 14, height: 14 }}></div>
                          ) : (
                            <FaWhatsapp />
                          )}
                        </button>
                      )}

                      {lead.hasWhatsApp === true && (
                        <>
                          {/* Generate Pitch Button (if no pitch yet) */}
                          {!lead.generatedPitch && !generatingPitchIds.has(lead.id) && (
                            <button
                              onClick={() => handleGeneratePitch(lead)}
                              disabled={!selectedCampaignId}
                              title={
                                !selectedCampaignId
                                  ? 'Select a campaign first'
                                  : 'Generate Pitch with AI'
                              }
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: !selectedCampaignId ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: !selectedCampaignId
                                  ? 'rgba(148, 163, 184, 0.1)'
                                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                                color: !selectedCampaignId ? '#94a3b8' : '#8b5cf6',
                                fontSize: '1rem',
                                opacity: !selectedCampaignId ? 0.5 : 1
                              }}
                            >
                              <FaMagic />
                            </button>
                          )}

                          {/* Loading state while generating */}
                          {generatingPitchIds.has(lead.id) && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: '#8b5cf6',
                                fontSize: '0.75rem'
                              }}
                            >
                              <div className="action-spinner" style={{ width: 12, height: 12 }} />
                              <span>{pitchStatus[lead.id]?.message || 'Processing...'}</span>
                            </div>
                          )}

                          {/* Send WhatsApp Button (if pitch exists) */}
                          {lead.generatedPitch && !generatingPitchIds.has(lead.id) && (
                            <button
                              onClick={() => openWhatsAppWithPitch(lead)}
                              title="Send WhatsApp with Generated Pitch"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(37, 211, 102, 0.15)',
                                color: '#25d366',
                                fontSize: '1rem'
                              }}
                            >
                              <FaWhatsapp />
                            </button>
                          )}
                        </>
                      )}

                      {lead.phone && (
                        <button
                          onClick={() => openTelegram(lead)}
                          title="Telegram"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 136, 204, 0.15)',
                            color: '#0088cc',
                            fontSize: '1rem'
                          }}
                        >
                          <FaTelegramPlane />
                        </button>
                      )}

                      {lead.email && (
                        <button
                          onClick={() => {
                            if (lead.emailVerified === true || lead.emailVerified === false) {
                              handleGenerateEmailPitch(lead)
                            } else {
                              handleVerifyEmail(lead.id)
                            }
                          }}
                          disabled={
                            verifyingEmailIds.has(lead.id) || generatingEmailPitchIds.has(lead.id)
                          }
                          title={
                            lead.emailVerified === true || lead.emailVerified === false
                              ? emailPitches[lead.id]
                                ? 'Regenerate Email Pitch'
                                : 'Generate Email Pitch'
                              : 'Verify Email'
                          }
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor:
                              verifyingEmailIds.has(lead.id) || generatingEmailPitchIds.has(lead.id)
                                ? 'wait'
                                : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                              lead.emailVerified === true
                                ? 'rgba(34, 197, 94, 0.15)'
                                : lead.emailVerified === false
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(99, 102, 241, 0.15)',
                            color:
                              lead.emailVerified === true
                                ? '#22c55e'
                                : lead.emailVerified === false
                                  ? '#ef4444'
                                  : '#6366f1',
                            fontSize: '1rem',
                            opacity:
                              verifyingEmailIds.has(lead.id) || generatingEmailPitchIds.has(lead.id)
                                ? 0.7
                                : 1
                          }}
                        >
                          {verifyingEmailIds.has(lead.id) ||
                          generatingEmailPitchIds.has(lead.id) ? (
                            <div
                              className="action-spinner"
                              style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(148, 163, 184, 0.3)',
                                borderTop: '2px solid currentColor'
                              }}
                            ></div>
                          ) : lead.emailVerified === true || lead.emailVerified === false ? (
                            <FaEdit />
                          ) : (
                            <FaEnvelope />
                          )}
                        </button>
                      )}

                      {/* Find Email Button (only if website exists and no email) */}
                      {lead.website && !lead.email && (
                        <button
                          onClick={() => handleFindEmail(lead.id)}
                          disabled={loadingEmailIds.has(lead.id)}
                          title="Find Email"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: loadingEmailIds.has(lead.id) ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: loadingEmailIds.has(lead.id)
                              ? 'rgba(99, 102, 241, 0.1)'
                              : 'rgba(99, 102, 241, 0.15)',
                            color: '#6366f1',
                            fontSize: '1rem',
                            opacity: loadingEmailIds.has(lead.id) ? 0.7 : 1
                          }}
                        >
                          {loadingEmailIds.has(lead.id) ? (
                            <div
                              className="action-spinner"
                              style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(99, 102, 241, 0.3)',
                                borderTop: '2px solid #6366f1'
                              }}
                            ></div>
                          ) : (
                            <FaEnvelope />
                          )}
                        </button>
                      )}
                      {/* Expand/Collapse Button (moved to end) */}
                      {(lead.generatedPitch || emailPitches[lead.id]) &&
                        !generatingPitchIds.has(lead.id) &&
                        !generatingEmailPitchIds.has(lead.id) && (
                          <button
                            onClick={() => toggleExpanded(lead.id)}
                            title={expandedLeadIds.has(lead.id) ? 'Collapse' : 'Expand Pitch'}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontSize: '1rem'
                            }}
                          >
                            {expandedLeadIds.has(lead.id) ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        )}

                      <button
                        onClick={() => handleRemoveLead(lead.id)}
                        title="Remove"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          fontSize: '1rem'
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  {expandedLeadIds.has(lead.id) && lead.generatedPitch && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#8b5cf6',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          <FaMagic /> Generated Pitch (Editable)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() =>
                              copyToClipboard(editedPitches[lead.id] ?? lead.generatedPitch ?? '')
                            }
                            title="Copy to Clipboard"
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#6366f1',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          >
                            <FaCopy /> Copy
                          </button>
                          <button
                            onClick={() => handleGeneratePitch(lead)}
                            title={
                              !selectedCampaignId
                                ? 'Select a campaign to regenerate'
                                : 'Regenerate Pitch'
                            }
                            disabled={generatingPitchIds.has(lead.id) || !selectedCampaignId}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor:
                                generatingPitchIds.has(lead.id) || !selectedCampaignId
                                  ? 'not-allowed'
                                  : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background:
                                !selectedCampaignId || generatingPitchIds.has(lead.id)
                                  ? 'rgba(148, 163, 184, 0.1)'
                                  : 'rgba(139, 92, 246, 0.15)',
                              color:
                                !selectedCampaignId || generatingPitchIds.has(lead.id)
                                  ? '#94a3b8'
                                  : '#8b5cf6',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              opacity: !selectedCampaignId ? 0.7 : 1
                            }}
                          >
                            <FaRedo /> Regenerate
                          </button>
                        </div>
                      </div>

                      {/* TOOLBAR */}
                      <div
                        className="markdown-toolbar"
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          width: 'fit-content'
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '*',
                              '*',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Bold (*text*)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            padding: '0 0.25rem'
                          }}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '_',
                              '_',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Italic (_text_)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontStyle: 'italic',
                            padding: '0 0.25rem'
                          }}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '~',
                              '~',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Strikethrough (~text~)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            textDecoration: 'line-through',
                            padding: '0 0.25rem'
                          }}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '```',
                              '```',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Monospace (```text```)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            padding: '0 0.25rem'
                          }}
                        >
                          {'<>'}
                        </button>

                        {/* DIVIDER */}
                        <div
                          style={{
                            width: '1px',
                            height: '16px',
                            background: '#475569',
                            margin: '0 4px'
                          }}
                        ></div>

                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '- ',
                              '',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Bullet List (- item)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '0 0.25rem'
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>●</span> List
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '1. ',
                              '',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Numbered List (1. item)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '0 0.25rem'
                          }}
                        >
                          1. List
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '> ',
                              '',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Quote (> item)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '0 0.25rem'
                          }}
                        >
                          &gt; Quote
                        </button>
                      </div>

                      {/* EDITABLE TEXTAREA */}
                      <textarea
                        value={editedPitches[lead.id] ?? lead.generatedPitch ?? ''}
                        onChange={(e) =>
                          setEditedPitches((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          color: '#f1f5f9',
                          fontSize: '0.9rem',
                          lineHeight: '1.6',
                          marginBottom: '0.75rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                        placeholder="Type your custom pitch here..."
                      />

                      {/* PREVIEW TOGGLE */}
                      <div style={{ marginBottom: '1rem' }}>
                        <button
                          onClick={() =>
                            setShowWhatsAppPreviews((prev) => ({
                              ...prev,
                              [lead.id]: !prev[lead.id]
                            }))
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                          }}
                        >
                          {showWhatsAppPreviews[lead.id] ? (
                            <FaChevronUp size={10} />
                          ) : (
                            <FaChevronDown size={10} />
                          )}
                          {showWhatsAppPreviews[lead.id]
                            ? 'Hide WhatsApp Preview'
                            : 'Show WhatsApp Preview'}
                        </button>

                        {/* VISUAL PREVIEW BOX */}
                        {showWhatsAppPreviews[lead.id] && (
                          <div
                            style={{
                              marginTop: '1.3rem',
                              padding: '0.75rem',
                              background: '#0f172a', // Dark WhatsApp-ish bg
                              borderRadius: '8px',
                              borderLeft: '4px solid #25d366',
                              fontSize: '0.9rem',
                              color: '#e2e8f0',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: -10,
                                left: 10,
                                fontSize: '0.65rem',
                                background: '#25d366',
                                color: '#000',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}
                            >
                              PREVIEW
                            </div>
                            {renderWhatsAppMarkdown(
                              editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openWhatsAppWithPitch(lead)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'linear-gradient(135deg, #25d366, #128c7e)',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <FaWhatsapp /> Send via WhatsApp
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedLeadIds.has(lead.id) && emailPitches[lead.id] && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.22)',
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#3b82f6',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          <FaEnvelope /> Generated Email Pitch (Editable)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              const subject =
                                editedEmailPitches[lead.id]?.subject ??
                                emailPitches[lead.id].subject
                              const body =
                                editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body
                              copyToClipboard(`Subject: ${subject}\n\n${body}`)
                            }}
                            title="Copy to Clipboard"
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(59, 130, 246, 0.18)',
                              color: '#60a5fa',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          >
                            <FaCopy /> Copy
                          </button>
                          <button
                            onClick={() => handleGenerateEmailPitch(lead)}
                            title={
                              !selectedMailCampaignId
                                ? 'Select a mail campaign to regenerate'
                                : 'Regenerate Email Pitch'
                            }
                            disabled={
                              generatingEmailPitchIds.has(lead.id) || !selectedMailCampaignId
                            }
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor:
                                generatingEmailPitchIds.has(lead.id) || !selectedMailCampaignId
                                  ? 'not-allowed'
                                  : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background:
                                !selectedMailCampaignId || generatingEmailPitchIds.has(lead.id)
                                  ? 'rgba(148, 163, 184, 0.1)'
                                  : 'rgba(59, 130, 246, 0.18)',
                              color:
                                !selectedMailCampaignId || generatingEmailPitchIds.has(lead.id)
                                  ? '#94a3b8'
                                  : '#60a5fa',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              opacity: !selectedMailCampaignId ? 0.7 : 1
                            }}
                          >
                            <FaRedo /> Regenerate
                          </button>
                          <button
                            onClick={() => openEmailWithPitch(lead)}
                            title="Send Email"
                            disabled={generatingEmailPitchIds.has(lead.id)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: generatingEmailPitchIds.has(lead.id)
                                ? 'not-allowed'
                                : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              opacity: generatingEmailPitchIds.has(lead.id) ? 0.7 : 1
                            }}
                          >
                            <FaEnvelope /> Send
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          value={
                            editedEmailPitches[lead.id]?.subject ?? emailPitches[lead.id].subject
                          }
                          onChange={(e) => {
                            const nextSubject = e.target.value
                            const currentBody =
                              editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body
                            setEditedEmailPitches((prev) => ({
                              ...prev,
                              [lead.id]: { subject: nextSubject, body: currentBody }
                            }))
                          }}
                          style={{
                            width: '100%',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.75rem',
                            color: '#f1f5f9',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit'
                          }}
                          placeholder="Subject..."
                        />

                        <textarea
                          value={editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body}
                          onChange={(e) => {
                            const nextBody = e.target.value
                            const currentSubject =
                              editedEmailPitches[lead.id]?.subject ?? emailPitches[lead.id].subject
                            setEditedEmailPitches((prev) => ({
                              ...prev,
                              [lead.id]: { subject: currentSubject, body: nextBody }
                            }))
                          }}
                          style={{
                            width: '100%',
                            minHeight: '160px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: '#f1f5f9',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                          placeholder="Email body..."
                        />
                      </div>

                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          onClick={() =>
                            setShowEmailPreviews((prev) => ({ ...prev, [lead.id]: !prev[lead.id] }))
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                          }}
                        >
                          {showEmailPreviews[lead.id] ? (
                            <FaChevronUp size={10} />
                          ) : (
                            <FaChevronDown size={10} />
                          )}
                          {showEmailPreviews[lead.id] ? 'Hide Email Preview' : 'Show Email Preview'}
                        </button>

                        {showEmailPreviews[lead.id] && (
                          <div
                            style={{
                              marginTop: '1.3rem',
                              padding: '0.75rem',
                              background: '#0f172a',
                              borderRadius: '8px',
                              borderLeft: '4px solid #3b82f6',
                              fontSize: '0.9rem',
                              color: '#e2e8f0',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: -10,
                                left: 10,
                                fontSize: '0.65rem',
                                background: '#3b82f6',
                                color: '#000',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}
                            >
                              PREVIEW
                            </div>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                              {editedEmailPitches[lead.id]?.subject ??
                                emailPitches[lead.id].subject}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No results for filter */}
          {!isLoading && leads.length > 0 && filteredLeads.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4rem',
                textAlign: 'center'
              }}
            >
              <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>
                No leads in this category
              </h3>
              <p style={{ color: '#64748b' }}>Try switching to a different filter.</p>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div
              style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 20px',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 500,
                zIndex: 1000,
                background:
                  toast.type === 'error'
                    ? 'rgba(239, 68, 68, 0.95)'
                    : toast.type === 'success'
                      ? 'rgba(34, 197, 94, 0.95)'
                      : 'rgba(99, 102, 241, 0.95)'
              }}
            >
              {toast.message}
            </div>
          )}
          {/* Reviews Panel - Slide-in from right */}
          <div className={`reviews-panel ${reviewsPanelOpen ? 'open' : ''}`}>
            <div className="reviews-panel-header">
              <div className="reviews-panel-title">
                <h2>{selectedLead?.name || 'Reviews'}</h2>
                {selectedLead && (
                  <span className="reviews-panel-subtitle">{selectedLead.category}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Clear Button */}
                {selectedLead?.reviews && selectedLead.reviews.length > 0 && (
                  <button
                    className="reviews-panel-action"
                    onClick={handleClearReviews}
                    title="Clear cached reviews"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FaTrashAlt />
                  </button>
                )}

                {/* Refresh Button */}
                <button
                  className="reviews-panel-action"
                  onClick={() => selectedLead && handleFetchReviews(selectedLead, true)}
                  title="Refresh reviews"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#22c55e',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1rem'
                  }}
                >
                  <FaRedo />
                </button>

                <button className="reviews-panel-close" onClick={closeReviewsPanel}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="reviews-panel-content">
              {isLoadingReviews && (
                <div className="reviews-loading">
                  <div className="action-spinner"></div>
                  <p>Loading reviews...</p>
                </div>
              )}

              {reviewsError && (
                <div className="reviews-error">
                  <p>{reviewsError}</p>
                </div>
              )}

              {reviewsData && !isLoadingReviews && (
                <>
                  {/* Reviews Summary */}
                  <div className="reviews-summary">
                    <div className="reviews-rating-big">
                      <span className="rating-number">
                        {typeof reviewsData.averageRating === 'number'
                          ? reviewsData.averageRating.toFixed(1)
                          : '0.0'}
                      </span>
                      {renderStars(reviewsData.averageRating)}
                    </div>
                    <span className="reviews-total">{reviewsData.totalReviews ?? 0} reviews</span>
                  </div>

                  {/* Reviews List */}
                  <div className="reviews-list">
                    {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
                      reviewsData.reviews.map((review, index) => (
                        <div key={index} className="review-card">
                          <div className="review-header">
                            <span className="review-author">{review.author || 'Anonymous'}</span>
                            <div className="review-meta">
                              {renderStars(review.rating)}
                              {review.date && <span className="review-date">{review.date}</span>}
                            </div>
                          </div>
                          {review.text && <p className="review-text">{review.text}</p>}
                        </div>
                      ))
                    ) : (
                      <div className="reviews-empty">
                        <p>No reviews available</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Overlay when panel is open */}
          {reviewsPanelOpen && <div className="reviews-overlay" onClick={closeReviewsPanel}></div>}

          {/* WhatsApp QR Code Modal */}
          {showWhatsAppModal && whatsAppQrCode && (
            <div className="whatsapp-modal-overlay" onClick={handleCloseWhatsAppModal}>
              <div className="whatsapp-modal" onClick={(e) => e.stopPropagation()}>
                <div className="whatsapp-modal-header">
                  <h3>Scan QR Code with WhatsApp</h3>
                  <button className="whatsapp-modal-close" onClick={handleCloseWhatsAppModal}>
                    ×
                  </button>
                </div>
                <div className="whatsapp-modal-body">
                  <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
                  <div className="whatsapp-qr-container">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
                        whatsAppQrCode
                      )}`}
                      alt="WhatsApp QR Code"
                      className="whatsapp-qr-image"
                    />
                  </div>
                  <p className="whatsapp-warning">
                    ⚠️ Use a secondary/burner WhatsApp account for checking numbers, not your main
                    business account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Panel */}
          <div className={`reviews-panel ${filterPanelOpen ? 'open' : ''}`}>
            <div className="reviews-panel-header">
              <div className="reviews-panel-title">
                <h2>Filter Leads</h2>
                <span className="reviews-panel-subtitle">Advanced filtering options</span>
              </div>
              <button className="reviews-panel-close" onClick={() => setFilterPanelOpen(false)}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="reviews-panel-content" style={{ padding: '1.5rem' }}>
              {/* Location Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <span>Location / City / Country</span>
                <input
                  type="text"
                  placeholder="e.g. New York, USA"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    marginTop: '0.5rem'
                  }}
                />
              </div>

              {/* Category Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <span>Category</span>
                <input
                  type="text"
                  placeholder="e.g. Restaurant, Agency"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    marginTop: '0.5rem'
                  }}
                />
              </div>

              {/* Rating Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}
                >
                  <span>Min Rating</span>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                    {filters.minRating}+ Stars
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(e) =>
                    setFilters({ ...filters, minRating: parseFloat(e.target.value) })
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Reviews Count Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <span>Min Reviews Count</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.minReviews}
                  onChange={(e) =>
                    setFilters({ ...filters, minReviews: parseInt(e.target.value) || 0 })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    marginTop: '0.5rem'
                  }}
                />
              </div>

              {/* Score Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <span style={{ display: 'block', marginBottom: '0.5rem' }}>Quality Score</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      color: '#f1f5f9'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.scores.gold}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          scores: { ...filters.scores, gold: e.target.checked }
                        })
                      }
                    />
                    Gold
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      color: '#f1f5f9'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.scores.silver}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          scores: { ...filters.scores, silver: e.target.checked }
                        })
                      }
                    />
                    Silver
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      color: '#f1f5f9'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.scores.bronze}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          scores: { ...filters.scores, bronze: e.target.checked }
                        })
                      }
                    />
                    Bronze
                  </label>
                </div>
              </div>

              {/* WhatsApp Status Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <span>WhatsApp Status</span>
                <select
                  value={filters.hasWhatsApp}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      hasWhatsApp: e.target.value as AdvancedFilters['hasWhatsApp']
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    marginTop: '0.5rem',
                    outline: 'none'
                  }}
                >
                  <option value="all">All</option>
                  <option value="yes">Has WhatsApp</option>
                  <option value="no">No WhatsApp</option>
                  <option value="unknown">Unknown (Not Checked)</option>
                </select>
              </div>

              {/* Email Status Filter */}
              <div className="scout-filter" style={{ marginBottom: '1.5rem' }}>
                <span>Email Status</span>
                <select
                  value={filters.hasEmail}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      hasEmail: e.target.value as AdvancedFilters['hasEmail']
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    marginTop: '0.5rem',
                    outline: 'none'
                  }}
                >
                  <option value="all">All</option>
                  <option value="yes">Has Email</option>
                  <option value="verified">Verified Email Only</option>
                </select>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Overlay when filter panel is open */}
          {filterPanelOpen && (
            <div
              className="reviews-overlay"
              onClick={() => setFilterPanelOpen(false)}
              style={{ zIndex: 998 }}
            ></div>
          )}
        </>
      )}

      {/* Facebook Leads Content */}
      {sourceTab === 'facebook' && (
        <>
          {/* Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 2rem',
              marginBottom: '1.5rem',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            {/* Search & Filter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flex: 1,
                minWidth: '300px'
              }}
            >
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Search leads by name..."
                  value={fbSearchQuery}
                  onChange={(e) => setFbSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.6)"
                  strokeWidth="2"
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setFbFilterPanelOpen(!fbFilterPanelOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: fbFilterPanelOpen
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'rgba(15, 23, 42, 0.6)',
                  border: fbFilterPanelOpen
                    ? '1px solid #6366f1'
                    : '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  color: fbFilterPanelOpen ? '#6366f1' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                <FaFilter />
                <span>Filters</span>
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}
            >
              <button
                onClick={() => setFbActiveTab('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background:
                    fbActiveTab === 'all'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'transparent',
                  color: fbActiveTab === 'all' ? 'white' : '#94a3b8'
                }}
              >
                All
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background:
                      fbActiveTab === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.15)',
                    color: fbActiveTab === 'all' ? 'white' : '#6366f1'
                  }}
                >
                  {facebookLeads.length}
                </span>
              </button>

              <button
                onClick={() => setFbActiveTab('has-website')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background:
                    fbActiveTab === 'has-website'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'transparent',
                  color: fbActiveTab === 'has-website' ? 'white' : '#94a3b8'
                }}
              >
                Has Website
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background:
                      fbActiveTab === 'has-website'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(99, 102, 241, 0.15)',
                    color: fbActiveTab === 'has-website' ? 'white' : '#6366f1'
                  }}
                >
                  {fbHasWebsiteCount}
                </span>
              </button>

              <button
                onClick={() => setFbActiveTab('no-website')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background:
                    fbActiveTab === 'no-website'
                      ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                      : 'transparent',
                  color: fbActiveTab === 'no-website' ? 'white' : '#94a3b8'
                }}
              >
                No Website
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background:
                      fbActiveTab === 'no-website'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color: fbActiveTab === 'no-website' ? 'white' : '#f59e0b'
                  }}
                >
                  {fbNoWebsiteCount}
                </span>
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {fbWhatsAppBulkVerifying ? (
                <button
                  onClick={handleFbStopVerifyAllWhatsApp}
                  disabled={fbWhatsAppBulkStopRequested}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: fbWhatsAppBulkStopRequested ? 'not-allowed' : 'pointer',
                    opacity: fbWhatsAppBulkStopRequested ? 0.5 : 1
                  }}
                >
                  <FaTimes />
                  {fbWhatsAppBulkStopRequested
                    ? 'Stopping...'
                    : fbWhatsAppBulkProgress
                      ? `Stop (${fbWhatsAppBulkProgress.current}/${fbWhatsAppBulkProgress.total})`
                      : 'Stop'}
                </button>
              ) : (
                <button
                  onClick={handleFbVerifyAllWhatsApp}
                  disabled={!whatsAppReady || fbUnverifiedWhatsAppCount === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: whatsAppReady
                      ? '1px solid rgba(37, 211, 102, 0.3)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                    background: whatsAppReady
                      ? 'rgba(37, 211, 102, 0.12)'
                      : 'rgba(15, 23, 42, 0.6)',
                    color: whatsAppReady ? '#25d366' : '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor:
                      !whatsAppReady || fbUnverifiedWhatsAppCount === 0 ? 'not-allowed' : 'pointer',
                    opacity: !whatsAppReady || fbUnverifiedWhatsAppCount === 0 ? 0.5 : 1
                  }}
                >
                  <FaWhatsapp />{' '}
                  {fbUnverifiedWhatsAppCount > 0
                    ? `Verify All WhatsApp (${fbUnverifiedWhatsAppCount})`
                    : 'Verify All WhatsApp'}
                </button>
              )}
              {fbEmailBulkVerifying ? (
                <button
                  onClick={handleFbStopVerifyAllMail}
                  disabled={fbEmailBulkStopRequested}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: fbEmailBulkStopRequested ? 'not-allowed' : 'pointer',
                    opacity: fbEmailBulkStopRequested ? 0.5 : 1
                  }}
                >
                  <FaTimes />
                  {fbEmailBulkStopRequested
                    ? 'Stopping...'
                    : fbEmailBulkProgress
                      ? `Stop (${fbEmailBulkProgress.current}/${fbEmailBulkProgress.total})`
                      : 'Stop'}
                </button>
              ) : (
                <button
                  onClick={handleFbVerifyAllMail}
                  disabled={fbUnverifiedEmailCount === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: fbUnverifiedEmailCount === 0 ? 'not-allowed' : 'pointer',
                    opacity: fbUnverifiedEmailCount === 0 ? 0.5 : 1
                  }}
                >
                  <FaEnvelope />{' '}
                  {fbUnverifiedEmailCount > 0
                    ? `Verify All Mail (${fbUnverifiedEmailCount})`
                    : 'Verify All Mail'}
                </button>
              )}
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to clear all Facebook leads?')) return
                  await window.api.clearSavedFacebookLeads()
                  setFacebookLeads([])
                  showToast('All Facebook leads cleared', 'success')
                }}
                disabled={facebookLeads.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: facebookLeads.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: facebookLeads.length === 0 ? 0.5 : 1
                }}
              >
                <FaTrashAlt /> Clear All
              </button>
            </div>
          </div>
          {/* WhatsApp Pitch Section */}
          <div
            style={{
              padding: '0 2rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}
          >
            {/* Mail Pitch Container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '14px'
              }}
            >
              {/* Mail Section Label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  paddingRight: '0.75rem',
                  borderRight: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                <FaEnvelope style={{ color: '#6366f1', fontSize: '1rem' }} />
                <span
                  style={{
                    color: '#6366f1',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Mail Pitch
                </span>
              </div>

              {/* Mail Group Selector */}
              {mailCampaignGroups.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedMailGroupId}
                    onChange={(e) => {
                      const newGroupId = e.target.value
                      setSelectedMailGroupId(newGroupId)
                      localStorage.setItem('savedLeads_selectedMailGroupId', newGroupId)

                      const groupCampaigns = mailCampaigns.filter((c) => c.groupId === newGroupId)
                      if (groupCampaigns.length > 0) {
                        const newCampaignId = groupCampaigns[0].id
                        setSelectedMailCampaignId(newCampaignId)
                        localStorage.setItem('savedLeads_selectedMailCampaignId', newCampaignId)
                      } else {
                        setSelectedMailCampaignId('')
                        localStorage.removeItem('savedLeads_selectedMailCampaignId')
                      }
                    }}
                    style={{
                      appearance: 'none',
                      padding: '0.5rem 2rem 0.5rem 0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      maxWidth: '130px'
                    }}
                  >
                    {mailCampaignGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6366f1',
                      pointerEvents: 'none',
                      fontSize: '0.65rem'
                    }}
                  />
                </div>
              )}

              {/* Mail Campaign Selector */}
              {mailCampaigns.length > 0 &&
                (() => {
                  const relevantCampaigns =
                    mailCampaignGroups.length > 0
                      ? mailCampaigns.filter((c) => c.groupId === selectedMailGroupId)
                      : mailCampaigns.filter((c) => !c.groupId)

                  if (relevantCampaigns.length === 0) {
                    return (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#64748b',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '8px',
                          border: '1px dashed rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        No campaigns
                      </div>
                    )
                  }

                  return (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedMailCampaignId}
                        onChange={(e) => {
                          const newId = e.target.value
                          setSelectedMailCampaignId(newId)
                          localStorage.setItem('savedLeads_selectedMailCampaignId', newId)
                        }}
                        style={{
                          appearance: 'none',
                          padding: '0.5rem 2rem 0.5rem 0.75rem',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '180px',
                          minWidth: '120px'
                        }}
                      >
                        {relevantCampaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.language === 'bn' ? '🇧🇩 ' : '🇺🇸 '}
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown
                        style={{
                          position: 'absolute',
                          right: '0.6rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6366f1',
                          pointerEvents: 'none',
                          fontSize: '0.65rem'
                        }}
                      />
                    </div>
                  )
                })()}
            </div>

            {/* WhatsApp Pitch Container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid rgba(37, 211, 102, 0.2)',
                borderRadius: '14px'
              }}
            >
              {/* WhatsApp Section Label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  paddingRight: '0.75rem',
                  borderRight: '1px solid rgba(37, 211, 102, 0.3)'
                }}
              >
                <FaWhatsapp style={{ color: '#25d366', fontSize: '1rem' }} />
                <span
                  style={{
                    color: '#25d366',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  WhatsApp Pitch
                </span>
              </div>

              {/* Campaign Group Selector */}
              {campaignGroups.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => {
                      const newGroupId = e.target.value
                      setSelectedGroupId(newGroupId)
                      localStorage.setItem('savedLeads_selectedGroupId', newGroupId)

                      // Auto-select first campaign in the new group
                      const groupCampaigns = campaigns.filter((c) => c.groupId === newGroupId)
                      if (groupCampaigns.length > 0) {
                        const newCampaignId = groupCampaigns[0].id
                        setSelectedCampaignId(newCampaignId)
                        localStorage.setItem('savedLeads_selectedCampaignId', newCampaignId)
                      } else {
                        setSelectedCampaignId('')
                        localStorage.removeItem('savedLeads_selectedCampaignId')
                      }
                    }}
                    style={{
                      appearance: 'none',
                      padding: '0.5rem 2rem 0.5rem 0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      maxWidth: '130px'
                    }}
                  >
                    {campaignGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#25d366',
                      pointerEvents: 'none',
                      fontSize: '0.65rem'
                    }}
                  />
                </div>
              )}

              {/* Campaign Selector */}
              {campaigns.length > 0 &&
                (() => {
                  const relevantCampaigns =
                    campaignGroups.length > 0
                      ? campaigns.filter((c) => c.groupId === selectedGroupId)
                      : campaigns.filter((c) => !c.groupId)

                  if (relevantCampaigns.length === 0) {
                    return (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#64748b',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '8px',
                          border: '1px dashed rgba(37, 211, 102, 0.3)'
                        }}
                      >
                        No campaigns
                      </div>
                    )
                  }

                  return (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => {
                          const newId = e.target.value
                          setSelectedCampaignId(newId)
                          localStorage.setItem('savedLeads_selectedCampaignId', newId)
                        }}
                        style={{
                          appearance: 'none',
                          padding: '0.5rem 2rem 0.5rem 0.75rem',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(37, 211, 102, 0.3)',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '180px',
                          minWidth: '120px'
                        }}
                      >
                        {relevantCampaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.language === 'bn' ? '🇧🇩 ' : '🇺🇸 '}
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown
                        style={{
                          position: 'absolute',
                          right: '0.6rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#25d366',
                          pointerEvents: 'none',
                          fontSize: '0.65rem'
                        }}
                      />
                    </div>
                  )
                })()}

              {/* WhatsApp Connect Button */}
              <button
                onClick={whatsAppReady ? window.api.whatsappDisconnect : handleInitWhatsApp}
                disabled={whatsAppInitializing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: whatsAppReady
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : '1px solid rgba(148, 163, 184, 0.3)',
                  background: whatsAppReady ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  color: whatsAppReady ? '#22c55e' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <FaWhatsapp />
                {whatsAppInitializing ? 'Connecting...' : whatsAppReady ? 'Connected' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4rem',
                gap: '1rem'
              }}
            >
              <div className="action-spinner" style={{ width: 32, height: 32 }} />
              <p style={{ color: '#94a3b8' }}>Loading saved leads...</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && facebookLeads.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3, color: '#f1f5f9' }}
              >
                <FaFacebook />
              </div>
              <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No Facebook Leads Saved</h3>
              <p style={{ color: '#64748b' }}>
                Save leads from Facebook Page Scraper to see them here.
              </p>
            </div>
          )}

          {/* Leads List - SCROLLABLE */}
          {!isLoading && filteredFacebookLeads.length > 0 && (
            <div
              className="scout-leads"
              style={{
                padding: '0 2rem',
                maxHeight: 'calc(100vh - 320px)',
                overflowY: 'auto'
              }}
            >
              {filteredFacebookLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0',
                    padding: '1rem 1.25rem',
                    background:
                      'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    borderRadius: '14px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}
                  >
                    {/* Score Indicator */}
                    <div
                      style={{
                        width: '4px',
                        height: '48px',
                        borderRadius: '4px',
                        flexShrink: 0,
                        background: `linear-gradient(180deg, ${getScoreColor(lead.score)}, ${getScoreColor(lead.score)}dd)`
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <h3
                            style={{
                              color: '#f1f5f9',
                              fontSize: '1rem',
                              fontWeight: 600,
                              margin: 0
                            }}
                          >
                            {lead.title}
                          </h3>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#6366f1'
                            }}
                          >
                            {lead.categories[0] || 'Page'}
                          </span>
                          {lead.isBusinessPageActive && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#22c55e'
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <p
                        style={{
                          color: '#64748b',
                          fontSize: '0.8rem',
                          margin: '0 0 0.5rem 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {lead.address || 'No address available'}
                      </p>

                      {/* Contact Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        {lead.phone ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#f1f5f9'
                            }}
                          >
                            <FaPhoneAlt style={{ color: '#64748b' }} /> {lead.phone}
                            {lead.hasWhatsApp === true && (
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  background: 'rgba(37, 211, 102, 0.2)',
                                  color: '#25d366'
                                }}
                              >
                                WA
                              </span>
                            )}
                            {lead.hasWhatsApp === false && (
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444'
                                }}
                              >
                                No WA
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}
                          >
                            No phone
                          </span>
                        )}

                        {lead.email && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color:
                                lead.emailVerified === true
                                  ? '#22c55e'
                                  : lead.emailVerified === false
                                    ? '#ef4444'
                                    : '#d97706',
                              fontWeight: 500
                            }}
                          >
                            <FaEnvelope
                              style={{
                                color:
                                  lead.emailVerified === true
                                    ? '#22c55e'
                                    : lead.emailVerified === false
                                      ? '#ef4444'
                                      : '#d97706'
                              }}
                            />{' '}
                            {lead.email}
                          </span>
                        )}

                        {!lead.email &&
                        lead.website &&
                        (lead.emailLookupAttempted === true || fbNoEmailFoundIds.has(lead.id)) ? (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: '#64748b',
                              fontStyle: 'italic'
                            }}
                          >
                            No email found
                          </span>
                        ) : null}

                        {lead.website ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#22c55e',
                              fontWeight: 500
                            }}
                          >
                            <FaGlobe /> Has website
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#f59e0b',
                              fontStyle: 'italic'
                            }}
                          >
                            <FaExclamationTriangle /> No website
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          paddingRight: '1rem',
                          borderRight: '1px solid rgba(148, 163, 184, 0.2)',
                          height: '24px'
                        }}
                      >
                        <span style={{ color: '#fbbf24' }}>
                          <FaStar />
                        </span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>
                          {lead.rating || 'N/A'}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          ({lead.followers?.toLocaleString() || 0})
                        </span>
                      </div>

                      {/* Facebook Page Button */}
                      <button
                        onClick={() => window.api.openExternalUrl(lead.facebookUrl)}
                        title="Open Facebook Page"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(59, 89, 152, 0.15)',
                          color: '#3b5998',
                          fontSize: '1rem'
                        }}
                      >
                        <FaFacebook />
                      </button>

                      {lead.website && (
                        <button
                          onClick={() => openWebsite(lead.website!)}
                          title="View the website"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                            fontSize: '1rem'
                          }}
                        >
                          <FaGlobe />
                        </button>
                      )}

                      {/* WhatsApp Actions */}
                      {lead.phone && lead.hasWhatsApp == null && (
                        <button
                          onClick={() => handleFbCheckWhatsApp(lead.id)}
                          disabled={fbLoadingWhatsAppIds.has(lead.id) || !whatsAppReady}
                          title={whatsAppReady ? 'Check WhatsApp' : 'Connect WhatsApp first'}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(148, 163, 184, 0.15)',
                            color: '#94a3b8',
                            fontSize: '1rem',
                            opacity: !whatsAppReady && !fbLoadingWhatsAppIds.has(lead.id) ? 0.5 : 1
                          }}
                        >
                          {fbLoadingWhatsAppIds.has(lead.id) ? (
                            <div className="action-spinner" style={{ width: 14, height: 14 }}></div>
                          ) : (
                            <FaWhatsapp />
                          )}
                        </button>
                      )}

                      {lead.hasWhatsApp === true && (
                        <>
                          {/* Generate Pitch Button (if no pitch yet) */}
                          {!lead.generatedPitch && !generatingPitchIds.has(lead.id) && (
                            <button
                              onClick={() => handleFbGeneratePitch(lead)}
                              disabled={!selectedCampaignId}
                              title={
                                !selectedCampaignId
                                  ? 'Select a campaign first'
                                  : 'Generate Pitch with AI'
                              }
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: !selectedCampaignId ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: !selectedCampaignId
                                  ? 'rgba(148, 163, 184, 0.1)'
                                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                                color: !selectedCampaignId ? '#94a3b8' : '#8b5cf6',
                                fontSize: '1rem',
                                opacity: !selectedCampaignId ? 0.5 : 1
                              }}
                            >
                              <FaMagic />
                            </button>
                          )}

                          {/* Loading state while generating */}
                          {generatingPitchIds.has(lead.id) && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: '#8b5cf6',
                                fontSize: '0.75rem'
                              }}
                            >
                              <div className="action-spinner" style={{ width: 12, height: 12 }} />
                              <span>{pitchStatus[lead.id]?.message || 'Processing...'}</span>
                            </div>
                          )}

                          {/* Send WhatsApp Button (if pitch exists) */}
                          {lead.generatedPitch && !generatingPitchIds.has(lead.id) && (
                            <button
                              onClick={() => openFbWhatsAppWithPitch(lead)}
                              title="Send WhatsApp with Generated Pitch"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(37, 211, 102, 0.15)',
                                color: '#25d366',
                                fontSize: '1rem'
                              }}
                            >
                              <FaWhatsapp />
                            </button>
                          )}
                        </>
                      )}

                      {/* Telegram Button */}
                      {lead.phone && (
                        <button
                          onClick={() => openFbTelegram(lead)}
                          title="Telegram"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 136, 204, 0.15)',
                            color: '#0088cc',
                            fontSize: '1rem'
                          }}
                        >
                          <FaTelegramPlane />
                        </button>
                      )}

                      {lead.email && (
                        <button
                          onClick={() => {
                            if (lead.emailVerified === true || lead.emailVerified === false) {
                              handleFbGenerateEmailPitch(lead)
                            } else {
                              handleFbVerifyEmail(lead.id)
                            }
                          }}
                          disabled={
                            fbVerifyingEmailIds.has(lead.id) || generatingEmailPitchIds.has(lead.id)
                          }
                          title={
                            lead.emailVerified === true || lead.emailVerified === false
                              ? emailPitches[lead.id]
                                ? 'Regenerate Email Pitch'
                                : 'Generate Email Pitch'
                              : 'Verify Email'
                          }
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor:
                              fbVerifyingEmailIds.has(lead.id) ||
                              generatingEmailPitchIds.has(lead.id)
                                ? 'wait'
                                : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                              lead.emailVerified === true
                                ? 'rgba(34, 197, 94, 0.15)'
                                : lead.emailVerified === false
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(99, 102, 241, 0.15)',
                            color:
                              lead.emailVerified === true
                                ? '#22c55e'
                                : lead.emailVerified === false
                                  ? '#ef4444'
                                  : '#6366f1',
                            fontSize: '1rem',
                            opacity:
                              fbVerifyingEmailIds.has(lead.id) ||
                              generatingEmailPitchIds.has(lead.id)
                                ? 0.7
                                : 1
                          }}
                        >
                          {fbVerifyingEmailIds.has(lead.id) ||
                          generatingEmailPitchIds.has(lead.id) ? (
                            <div
                              className="action-spinner"
                              style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(148, 163, 184, 0.3)',
                                borderTop: '2px solid currentColor'
                              }}
                            ></div>
                          ) : lead.emailVerified === true || lead.emailVerified === false ? (
                            <FaEdit />
                          ) : (
                            <FaEnvelope />
                          )}
                        </button>
                      )}

                      {/* Find Email Button (only if website exists and no email) */}
                      {lead.website && !lead.email && (
                        <button
                          onClick={() => handleFbFindEmail(lead.id)}
                          disabled={fbLoadingEmailIds.has(lead.id)}
                          title="Find Email"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: fbLoadingEmailIds.has(lead.id) ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: fbLoadingEmailIds.has(lead.id)
                              ? 'rgba(99, 102, 241, 0.1)'
                              : 'rgba(99, 102, 241, 0.15)',
                            color: '#6366f1',
                            fontSize: '1rem',
                            opacity: fbLoadingEmailIds.has(lead.id) ? 0.7 : 1
                          }}
                        >
                          {fbLoadingEmailIds.has(lead.id) ? (
                            <div
                              className="action-spinner"
                              style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(99, 102, 241, 0.3)',
                                borderTop: '2px solid #6366f1'
                              }}
                            ></div>
                          ) : (
                            <FaEnvelope />
                          )}
                        </button>
                      )}

                      {/* Expand/Collapse Button (moved to end) */}
                      {(lead.generatedPitch || emailPitches[lead.id]) &&
                        !generatingPitchIds.has(lead.id) &&
                        !generatingEmailPitchIds.has(lead.id) && (
                          <button
                            onClick={() => toggleExpanded(lead.id)}
                            title={expandedLeadIds.has(lead.id) ? 'Collapse' : 'Expand Pitch'}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontSize: '1rem'
                            }}
                          >
                            {expandedLeadIds.has(lead.id) ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        )}

                      <button
                        onClick={() => handleFbRemoveLead(lead.id)}
                        title="Remove"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          fontSize: '1rem'
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Pitch Section */}
                  {expandedLeadIds.has(lead.id) && lead.generatedPitch && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#8b5cf6',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          <FaMagic /> Generated Pitch (Editable)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() =>
                              copyToClipboard(editedPitches[lead.id] ?? lead.generatedPitch ?? '')
                            }
                            title="Copy to Clipboard"
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#6366f1',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          >
                            <FaCopy /> Copy
                          </button>
                          <button
                            onClick={() => handleFbGeneratePitch(lead)}
                            title={
                              !selectedCampaignId
                                ? 'Select a campaign to regenerate'
                                : 'Regenerate Pitch'
                            }
                            disabled={generatingPitchIds.has(lead.id) || !selectedCampaignId}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor:
                                generatingPitchIds.has(lead.id) || !selectedCampaignId
                                  ? 'not-allowed'
                                  : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background:
                                !selectedCampaignId || generatingPitchIds.has(lead.id)
                                  ? 'rgba(148, 163, 184, 0.1)'
                                  : 'rgba(139, 92, 246, 0.15)',
                              color:
                                !selectedCampaignId || generatingPitchIds.has(lead.id)
                                  ? '#94a3b8'
                                  : '#8b5cf6',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              opacity: !selectedCampaignId ? 0.7 : 1
                            }}
                          >
                            <FaRedo /> Regenerate
                          </button>
                        </div>
                      </div>

                      {/* TOOLBAR */}
                      <div
                        className="markdown-toolbar"
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          width: 'fit-content'
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '*',
                              '*',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Bold (*text*)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            padding: '0 0.25rem'
                          }}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '_',
                              '_',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Italic (_text_)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontStyle: 'italic',
                            padding: '0 0.25rem'
                          }}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '~',
                              '~',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Strikethrough (~text~)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            textDecoration: 'line-through',
                            padding: '0 0.25rem'
                          }}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '```',
                              '```',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Monospace (```text```)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            padding: '0 0.25rem'
                          }}
                        >
                          {'<>'}
                        </button>

                        {/* DIVIDER */}
                        <div
                          style={{
                            width: '1px',
                            height: '16px',
                            background: '#475569',
                            margin: '0 4px'
                          }}
                        ></div>

                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '- ',
                              '',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Bullet List (- item)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '0 0.25rem'
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>●</span> List
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '1. ',
                              '',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Numbered List (1. item)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '0 0.25rem'
                          }}
                        >
                          1. List
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.nextElementSibling as HTMLTextAreaElement
                            const currentVal = editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            insertMarkdown(
                              textarea,
                              '> ',
                              '',
                              (val) => setEditedPitches((prev) => ({ ...prev, [lead.id]: val })),
                              currentVal
                            )
                          }}
                          title="Quote (> item)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '0 0.25rem'
                          }}
                        >
                          &gt; Quote
                        </button>
                      </div>

                      {/* EDITABLE TEXTAREA */}
                      <textarea
                        value={editedPitches[lead.id] ?? lead.generatedPitch ?? ''}
                        onChange={(e) =>
                          setEditedPitches((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          color: '#f1f5f9',
                          fontSize: '0.9rem',
                          lineHeight: '1.6',
                          marginBottom: '0.75rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                        placeholder="Type your custom pitch here..."
                      />

                      {/* PREVIEW TOGGLE */}
                      <div style={{ marginBottom: '1rem' }}>
                        <button
                          onClick={() =>
                            setShowWhatsAppPreviews((prev) => ({
                              ...prev,
                              [lead.id]: !prev[lead.id]
                            }))
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                          }}
                        >
                          {showWhatsAppPreviews[lead.id] ? (
                            <FaChevronUp size={10} />
                          ) : (
                            <FaChevronDown size={10} />
                          )}
                          {showWhatsAppPreviews[lead.id]
                            ? 'Hide WhatsApp Preview'
                            : 'Show WhatsApp Preview'}
                        </button>

                        {/* VISUAL PREVIEW BOX */}
                        {showWhatsAppPreviews[lead.id] && (
                          <div
                            style={{
                              marginTop: '1.3rem',
                              padding: '0.75rem',
                              background: '#0f172a',
                              borderRadius: '8px',
                              borderLeft: '4px solid #25d366',
                              fontSize: '0.9rem',
                              color: '#e2e8f0',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: -10,
                                left: 10,
                                fontSize: '0.65rem',
                                background: '#25d366',
                                color: '#000',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}
                            >
                              PREVIEW
                            </div>
                            {renderWhatsAppMarkdown(
                              editedPitches[lead.id] ?? lead.generatedPitch ?? ''
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openFbWhatsAppWithPitch(lead)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'linear-gradient(135deg, #25d366, #128c7e)',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <FaWhatsapp /> Send via WhatsApp
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedLeadIds.has(lead.id) && emailPitches[lead.id] && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.22)',
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#3b82f6',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          <FaEnvelope /> Generated Email Pitch (Editable)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              const subject =
                                editedEmailPitches[lead.id]?.subject ??
                                emailPitches[lead.id].subject
                              const body =
                                editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body
                              copyToClipboard(`Subject: ${subject}\n\n${body}`)
                            }}
                            title="Copy to Clipboard"
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(59, 130, 246, 0.18)',
                              color: '#60a5fa',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          >
                            <FaCopy /> Copy
                          </button>
                          <button
                            onClick={() => handleFbGenerateEmailPitch(lead)}
                            title={
                              !selectedMailCampaignId
                                ? 'Select a mail campaign to regenerate'
                                : 'Regenerate Email Pitch'
                            }
                            disabled={
                              generatingEmailPitchIds.has(lead.id) || !selectedMailCampaignId
                            }
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor:
                                generatingEmailPitchIds.has(lead.id) || !selectedMailCampaignId
                                  ? 'not-allowed'
                                  : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background:
                                !selectedMailCampaignId || generatingEmailPitchIds.has(lead.id)
                                  ? 'rgba(148, 163, 184, 0.1)'
                                  : 'rgba(59, 130, 246, 0.18)',
                              color:
                                !selectedMailCampaignId || generatingEmailPitchIds.has(lead.id)
                                  ? '#94a3b8'
                                  : '#60a5fa',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              opacity: !selectedMailCampaignId ? 0.7 : 1
                            }}
                          >
                            <FaRedo /> Regenerate
                          </button>
                          <button
                            onClick={() => openEmailWithPitch(lead)}
                            title="Send Email"
                            disabled={generatingEmailPitchIds.has(lead.id)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: generatingEmailPitchIds.has(lead.id)
                                ? 'not-allowed'
                                : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              opacity: generatingEmailPitchIds.has(lead.id) ? 0.7 : 1
                            }}
                          >
                            <FaEnvelope /> Send
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          value={
                            editedEmailPitches[lead.id]?.subject ?? emailPitches[lead.id].subject
                          }
                          onChange={(e) => {
                            const nextSubject = e.target.value
                            const currentBody =
                              editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body
                            setEditedEmailPitches((prev) => ({
                              ...prev,
                              [lead.id]: { subject: nextSubject, body: currentBody }
                            }))
                          }}
                          style={{
                            width: '100%',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.75rem',
                            color: '#f1f5f9',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit'
                          }}
                          placeholder="Subject..."
                        />

                        <textarea
                          value={editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body}
                          onChange={(e) => {
                            const nextBody = e.target.value
                            const currentSubject =
                              editedEmailPitches[lead.id]?.subject ?? emailPitches[lead.id].subject
                            setEditedEmailPitches((prev) => ({
                              ...prev,
                              [lead.id]: { subject: currentSubject, body: nextBody }
                            }))
                          }}
                          style={{
                            width: '100%',
                            minHeight: '160px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: '#f1f5f9',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                          placeholder="Email body..."
                        />
                      </div>

                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          onClick={() =>
                            setShowEmailPreviews((prev) => ({ ...prev, [lead.id]: !prev[lead.id] }))
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                          }}
                        >
                          {showEmailPreviews[lead.id] ? (
                            <FaChevronUp size={10} />
                          ) : (
                            <FaChevronDown size={10} />
                          )}
                          {showEmailPreviews[lead.id] ? 'Hide Email Preview' : 'Show Email Preview'}
                        </button>

                        {showEmailPreviews[lead.id] && (
                          <div
                            style={{
                              marginTop: '1.3rem',
                              padding: '0.75rem',
                              background: '#0f172a',
                              borderRadius: '8px',
                              borderLeft: '4px solid #3b82f6',
                              fontSize: '0.9rem',
                              color: '#e2e8f0',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: -10,
                                left: 10,
                                fontSize: '0.65rem',
                                background: '#3b82f6',
                                color: '#000',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}
                            >
                              PREVIEW
                            </div>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                              {editedEmailPitches[lead.id]?.subject ??
                                emailPitches[lead.id].subject}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {editedEmailPitches[lead.id]?.body ?? emailPitches[lead.id].body}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No results for filter */}
          {!isLoading && facebookLeads.length > 0 && filteredFacebookLeads.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4rem',
                textAlign: 'center'
              }}
            >
              <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>
                No leads in this category
              </h3>
              <p style={{ color: '#64748b' }}>Try switching to a different filter.</p>
            </div>
          )}

          {/* Overlay when filter panel is open */}
          {fbFilterPanelOpen && (
            <div
              className="reviews-overlay"
              onClick={() => setFbFilterPanelOpen(false)}
              style={{ zIndex: 998 }}
            ></div>
          )}
        </>
      )}
    </div>
  )
}

export default SavedLeadsPage
