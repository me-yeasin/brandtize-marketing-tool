import { JSX, useCallback, useEffect, useState } from 'react'
import {
  FaCheck,
  FaClipboardList,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileExport,
  FaGlobe,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaStar,
  FaTelegramPlane,
  FaTimes,
  FaTrashAlt,
  FaWhatsapp
} from 'react-icons/fa'
import type { SavedMapsLead } from '../../../preload/index.d'

type TabFilter = 'all' | 'has-website' | 'no-website'

function SavedLeadsPage(): JSX.Element {
  const [leads, setLeads] = useState<SavedMapsLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingWhatsAppIds, setLoadingWhatsAppIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [toast, setToast] = useState<{
    message: string
    type: 'info' | 'error' | 'success'
  } | null>(null)

  // WhatsApp state
  const [whatsAppReady, setWhatsAppReady] = useState(false)
  const [whatsAppInitializing, setWhatsAppInitializing] = useState(false)
  const [whatsAppQrCode, setWhatsAppQrCode] = useState<string | null>(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadLeads = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const savedLeads = await window.api.getSavedMapsLeads()
      setLeads(savedLeads)
    } catch (err) {
      console.error('Failed to load saved leads:', err)
      showToast('Failed to load saved leads', 'error')
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
        await window.api.saveMapsLeads([updatedLead])
        // showToast('Status saved', 'success') // Optional: too noisy?
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

  const openWhatsApp = (lead: SavedMapsLead): void => {
    if (!lead.phone) return
    let cleanNumber = lead.phone.replace(/[^\d+]/g, '')
    if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1)
    const message = `Hi! I found ${lead.name} on Google Maps and wanted to reach out.`
    window.api.openExternalUrl(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`)
  }

  const openTelegram = (lead: SavedMapsLead): void => {
    if (!lead.phone) return
    let cleanNumber = lead.phone.replace(/[^\d+]/g, '')
    if (!cleanNumber.startsWith('+')) cleanNumber = '+' + cleanNumber
    window.api.openExternalUrl(`https://t.me/${cleanNumber}`)
  }

  const openInGoogleMaps = (lead: SavedMapsLead): void => {
    const searchQuery = `${lead.name} ${lead.address}`
    window.api.openExternalUrl(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`
    )
  }

  const filteredLeads = leads.filter((lead) => {
    if (activeTab === 'has-website') return lead.website !== null
    if (activeTab === 'no-website') return lead.website === null
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
          justifyContent: 'flex-end'
        }}
      >
        <button
          onClick={handleInitWhatsApp}
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
                alignItems: 'center',
                gap: '1rem',
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
                e.currentTarget.style.transform = 'translateX(0)'
              }}
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
                    <h3 style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
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
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        color: '#6366f1'
                      }}
                    >
                      <FaEnvelope /> {lead.email}
                      {lead.emailVerified && (
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>
                          <FaCheck />
                        </span>
                      )}
                    </span>
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
                        fontWeight: 500
                      }}
                    >
                      <FaExclamationTriangle /> No website
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {/* Rating */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginRight: '0.5rem',
                    paddingRight: '0.75rem',
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
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({lead.reviewCount})</span>
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
                  <button
                    onClick={() => openWhatsApp(lead)}
                    title="Send WhatsApp Message"
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
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(whatsAppQrCode)}`}
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
    </div>
  )
}

export default SavedLeadsPage
