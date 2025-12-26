import { JSX, useCallback, useEffect, useState } from 'react'
import {
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaCopy,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileExport,
  FaFilter,
  FaGlobe,
  FaMagic,
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
  PitchGenerationStatus,
  ReviewsResult,
  SavedMapsLead
} from '../../../preload/index.d'

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

function SavedLeadsPage(): JSX.Element {
  const [leads, setLeads] = useState<SavedMapsLead[]>([])
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

  // Pitch generation state
  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(new Set())
  const [generatingPitchIds, setGeneratingPitchIds] = useState<Set<string>>(new Set())
  const [pitchStatus, setPitchStatus] = useState<Record<string, PitchGenerationStatus>>({})

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadLeads = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const savedLeads = await window.api.getSavedMapsLeads()
      setLeads(savedLeads)

      // Load campaigns and groups
      const campaignsData = await window.api.getWhatsappCampaigns()
      const groupsData = await window.api.getWhatsappCampaignGroups()
      const whatsappCampaigns = campaignsData.filter((c) => c.platform === 'whatsapp')

      setCampaigns(whatsappCampaigns)
      setCampaignGroups(groupsData)

      // Auto-select first group if available
      if (groupsData.length > 0) {
        setSelectedGroupId(groupsData[0].id)

        // Auto-select first campaign in that group
        const groupCampaigns = whatsappCampaigns.filter((c) => c.groupId === groupsData[0].id)
        if (groupCampaigns.length > 0) {
          setSelectedCampaignId(groupCampaigns[0].id)
        }
      } else if (whatsappCampaigns.length > 0) {
        // No groups, select first ungrouped campaign
        const ungroupedCampaigns = whatsappCampaigns.filter((c) => !c.groupId)
        if (ungroupedCampaigns.length > 0) {
          setSelectedCampaignId(ungroupedCampaigns[0].id)
        }
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
    window.api.onWhatsAppQr((qr) => {
      console.log('[SavedLeads] WhatsApp QR received')
      setWhatsAppQrCode(qr)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(true)
    })

    // Listen for ready event
    window.api.onWhatsAppReady(() => {
      console.log('[SavedLeads] WhatsApp is ready!')
      setWhatsAppReady(true)
      setWhatsAppQrCode(null)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(false)
      showToast('WhatsApp connected successfully!', 'success')
    })

    // Listen for disconnection
    window.api.onWhatsAppDisconnected((reason) => {
      console.log('[SavedLeads] WhatsApp disconnected:', reason)
      setWhatsAppReady(false)
      setWhatsAppQrCode(null)
      showToast(`WhatsApp disconnected: ${reason}`, 'error')
    })

    // Listen for auth failure
    window.api.onWhatsAppAuthFailure((msg) => {
      console.error('[SavedLeads] WhatsApp auth failure:', msg)
      setWhatsAppReady(false)
      setWhatsAppInitializing(false)
      showToast(`WhatsApp authentication failed: ${msg}`, 'error')
    })

    // Check initial status
    window.api.whatsappGetStatus().then((status) => {
      setWhatsAppReady(status.isReady)
      setWhatsAppInitializing(status.isInitializing)
      if (status.qrCode) {
        setWhatsAppQrCode(status.qrCode)
        setShowWhatsAppModal(true)
      }
    })

    // Listen for pitch generation status updates
    window.api.onPitchGenerationStatus((status) => {
      console.log('[SavedLeads] Pitch status update:', status)
      // Status updates are handled per-lead via pitchStatus state
      // We need the leadId to update the right entry, but it comes from the invoke
    })
  }, [])

  // Initialize WhatsApp client
  const handleInitWhatsApp = async (): Promise<void> => {
    setWhatsAppInitializing(true)
    try {
      const result = await window.api.whatsappInitialize()
      if (!result.success) {
        showToast(result.error || 'Failed to initialize WhatsApp', 'error')
        setWhatsAppInitializing(false)
      }
      // If successful, the event listeners will handle the rest
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

  const handleFindEmail = async (leadId: string): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !lead.website) return

    setLoadingEmailIds((prev) => new Set(prev).add(leadId))

    try {
      const domain = extractDomain(lead.website)
      const result = await window.api.findEmailForDomain(domain)

      let updatedLead = { ...lead }

      if (result.email) {
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
            emailVerified: verifyResult.verified
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
            emailVerified: false
          }
          showToast(`Found email (verification failed): ${result.email}`, 'info')
        }
      } else {
        // No email found
        showToast(`No email found for "${lead.name}"`, 'info')
        updatedLead = {
          ...updatedLead,
          email: undefined,
          emailSource: result.source
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
      const result = await window.api.generateWhatsAppPitch({
        leadId: lead.id,
        name: lead.name,
        category: lead.category,
        address: lead.address,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        website: lead.website,
        reviews: lead.reviews,
        instruction: campaigns.find((c) => c.id === selectedCampaignId)?.instruction
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
    const message =
      lead.generatedPitch || `Hi! I found ${lead.name} on Google Maps and wanted to reach out.`
    window.api.openExternalUrl(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`)
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
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}
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
                activeTab === 'all' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
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
                  activeTab === 'no-website' ? 'rgba(255,255,255,0.2)' : 'rgba(245, 158, 11, 0.15)',
                color: activeTab === 'no-website' ? 'white' : '#f59e0b'
              }}
            >
              {noWebsiteCount}
            </span>
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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

      {/* WhatsApp Connection Status Bar (if not connected or if wanting to show status) */}
      <div
        style={{
          padding: '0 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem' // Added gap for spacing between dropdown and button
        }}
      >
        {/* Campaign Group Selector */}
        {campaignGroups.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value)
                // Auto-select first campaign in the new group
                const groupCampaigns = campaigns.filter((c) => c.groupId === e.target.value)
                if (groupCampaigns.length > 0) {
                  setSelectedCampaignId(groupCampaigns[0].id)
                } else {
                  setSelectedCampaignId('')
                }
              }}
              style={{
                appearance: 'none',
                padding: '0.75rem 2.5rem 0.75rem 1rem',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '150px'
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
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
                fontSize: '0.75rem'
              }}
            />
          </div>
        )}

        {/* Campaign Selector */}
        {campaigns.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={{
                appearance: 'none',
                padding: '0.75rem 2.5rem 0.75rem 1rem',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '200px',
                minWidth: '150px'
              }}
            >
              {(campaignGroups.length > 0
                ? campaigns.filter((c) => c.groupId === selectedGroupId)
                : campaigns.filter((c) => !c.groupId)
              ).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <FaChevronDown
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
                fontSize: '0.75rem'
              }}
            />
          </div>
        )}

        {/* WhatsApp Connect Button */}
        <button
          onClick={whatsAppReady ? window.api.whatsappDisconnect : handleInitWhatsApp}
          disabled={whatsAppInitializing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: whatsAppReady
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid rgba(148, 163, 184, 0.3)',
            background: whatsAppReady ? 'rgba(34, 197, 94, 0.1)' : 'rgba(15, 23, 42, 0.6)',
            color: whatsAppReady ? '#22c55e' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <FaWhatsapp />
          {whatsAppInitializing
            ? 'Connecting...'
            : whatsAppReady
              ? 'WhatsApp Connected'
              : 'Connect WhatsApp'}
        </button>
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
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3, color: '#f1f5f9' }}>
            <FaClipboardList />
          </div>
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No Saved Leads</h3>
          <p style={{ color: '#64748b' }}>Save leads from Maps Scout to see them here.</p>
        </div>
      )}

      {/* Leads List */}
      {!isLoading && filteredLeads.length > 0 && (
        <div className="scout-leads" style={{ padding: '0 2rem' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
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
                        style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, margin: 0 }}
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
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
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
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
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
                            color: '#d97706',
                            fontWeight: 500
                          }}
                        >
                          <FaEnvelope /> {lead.email}
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
                          title="Generate Pitch with AI"
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
                              'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                            color: '#8b5cf6',
                            fontSize: '1rem'
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
                  {lead.generatedPitch && !generatingPitchIds.has(lead.id) && (
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

              {/* Expandable Pitch Section */}
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
                      <FaMagic /> Generated Pitch
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => copyToClipboard(lead.generatedPitch || '')}
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
                        title="Regenerate Pitch"
                        disabled={generatingPitchIds.has(lead.id)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#8b5cf6',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        <FaRedo /> Regenerate
                      </button>
                    </div>
                  </div>
                  <p
                    style={{
                      color: '#e2e8f0',
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      margin: 0
                    }}
                  >
                    {lead.generatedPitch}
                  </p>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
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
                      <FaWhatsapp /> Send on WhatsApp
                    </button>
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
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No leads in this category</h3>
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
        <div className="whatsapp-modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
          <div className="whatsapp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="whatsapp-modal-header">
              <h3>Scan QR Code with WhatsApp</h3>
              <button className="whatsapp-modal-close" onClick={() => setShowWhatsAppModal(false)}>
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
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}
            >
              <span>Min Rating</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>{filters.minRating}+ Stars</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
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
          style={{ zIndex: 998 }} // Ensure it's below the panel (zIndex usually 999 or 1000)
        ></div>
      )}
    </div>
  )
}

export default SavedLeadsPage
