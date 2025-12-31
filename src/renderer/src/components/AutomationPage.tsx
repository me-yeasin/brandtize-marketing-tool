import { JSX, useEffect, useRef, useState } from 'react'
import {
  FaCheck,
  FaEnvelope,
  FaFileCsv,
  FaFilter,
  FaGlobe,
  FaLaptop,
  FaLayerGroup,
  FaList,
  FaMapMarkerAlt,
  FaPhone,
  FaPhoneAlt,
  FaPlay,
  FaSave,
  FaSearch,
  FaStar,
  FaStop,
  FaTerminal,
  FaTimes,
  FaTrash,
  FaWhatsapp
} from 'react-icons/fa'
import './AutomationPage.css'

interface LogEntry {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface FoundLead {
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
  source: 'Maps' | 'Facebook'
  status: 'Qualified' | 'Pending'
  metadata?: {
    facebookUrl?: string
    likes?: number
    followers?: number
    latitude?: number
    longitude?: number
    score?: 'gold' | 'silver' | 'bronze'
  }
}

function AutomationPage(): JSX.Element {
  // State for inputs
  const [niche, setNiche] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [leadLimit, setLeadLimit] = useState(100)
  const [filters, setFilters] = useState({
    hasWebsite: false,
    hasEmail: false,
    hasPhone: false,
    autoVerifyWA: false,
    autoVerifyEmail: false,
    autoFindEmail: false
  })

  // Service availability state
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [hasReoonKey, setHasReoonKey] = useState(false)
  const [hasEmailFinderKey, setHasEmailFinderKey] = useState(false)

  // WhatsApp connection state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppQrCode, setWhatsAppQrCode] = useState<string | null>(null)
  const [whatsAppInitializing, setWhatsAppInitializing] = useState(false)

  // Agent State
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [foundLeads, setFoundLeads] = useState<FoundLead[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const foundLeadsRef = useRef<FoundLead[]>([]) // Ref to access latest leads in closures

  // Check service availability on mount
  useEffect(() => {
    const checkServices = async (): Promise<void> => {
      try {
        // Check WhatsApp status
        const waStatus = await window.api.whatsappGetStatus()
        setWhatsappConnected(waStatus?.isReady ?? false)

        // Check API keys via getApiKeys
        const apiKeys = await window.api.getApiKeys?.()
        if (apiKeys) {
          setHasReoonKey((apiKeys.reoonApiKey?.length ?? 0) > 0)
          setHasEmailFinderKey(
            (apiKeys.hunterApiKey?.length ?? 0) > 0 || (apiKeys.snovClientId?.length ?? 0) > 0
          )
        }
      } catch (error) {
        console.error('Error checking services:', error)
      }
    }
    checkServices()
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): void => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }
    setLogs((prev) => [...prev, newLog])
  }

  // WhatsApp event listeners
  useEffect(() => {
    const offQr = window.api.onWhatsAppQr((qr) => {
      setWhatsAppQrCode(qr)
      setShowWhatsAppModal(true)
      setWhatsAppInitializing(false)
    })

    const offReady = window.api.onWhatsAppReady(() => {
      setWhatsappConnected(true)
      setWhatsAppQrCode(null)
      setShowWhatsAppModal(false)
      setWhatsAppInitializing(false)
    })

    const offDisconnected = window.api.onWhatsAppDisconnected(() => {
      setWhatsappConnected(false)
      setWhatsAppInitializing(false)
    })

    const offAuthFailure = window.api.onWhatsAppAuthFailure(() => {
      setWhatsappConnected(false)
      setWhatsAppInitializing(false)
      setShowWhatsAppModal(false)
    })

    return () => {
      offQr()
      offReady()
      offDisconnected()
      offAuthFailure()
    }
  }, [])

  // WhatsApp connect handler
  const handleConnectWhatsApp = async (): Promise<void> => {
    if (whatsappConnected) {
      addLog('WhatsApp is already connected.', 'info')
      return
    }

    setWhatsAppInitializing(true)
    addLog('Initializing WhatsApp...', 'info')
    try {
      const result = await window.api.whatsappInitialize()
      if (!result.success) {
        addLog(result.error || 'Failed to initialize WhatsApp', 'error')
        setWhatsAppInitializing(false)
        return
      }

      const status = await window.api.whatsappGetStatus()
      setWhatsappConnected(status.isReady)
      if (status.qrCode) {
        setWhatsAppQrCode(status.qrCode)
        setShowWhatsAppModal(true)
        setWhatsAppInitializing(false)
      } else if (status.isReady) {
        setWhatsAppQrCode(null)
        setShowWhatsAppModal(false)
        setWhatsAppInitializing(false)
        addLog('WhatsApp connected successfully!', 'success')
      }
    } catch (err) {
      console.error('WhatsApp init error:', err)
      addLog('Failed to initialize WhatsApp', 'error')
      setWhatsAppInitializing(false)
    }
  }

  // IPC Event Listeners
  useEffect(() => {
    // Listen for logs
    const removeLogListener = window.api.onAgentLog((log) => {
      setLogs((prev) => [...prev, log as LogEntry])
    })

    // Listen for found leads
    const removeLeadListener = window.api.onAgentLeadFound((lead) => {
      setFoundLeads((prev) => [...prev, lead as FoundLead])
    })

    // Listen for stop event
    const removeStopListener = window.api.onAgentStopped(() => {
      setIsRunning(false)
      // Ensure panel opens when finished if we have leads (check Ref for latest value)
      if (foundLeadsRef.current.length > 0) {
        setIsPanelOpen(true)
      }
      addLog('Agent process finished.', 'info')
    })

    return () => {
      removeLogListener()
      removeLeadListener()
      removeStopListener()
    }
  }, [])

  // Track previous lead count to trigger auto-open only on 0 -> 1 transition
  const prevLeadCountRef = useRef(0)

  // Sync ref and auto-open logic
  useEffect(() => {
    foundLeadsRef.current = foundLeads // Keep ref in sync

    if (foundLeads.length > 0 && prevLeadCountRef.current === 0) {
      setTimeout(() => setIsPanelOpen(true), 0)
    }
    prevLeadCountRef.current = foundLeads.length
  }, [foundLeads])

  const handleAddLocation = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && locationInput.trim()) {
      if (!locations.includes(locationInput.trim())) {
        setLocations([...locations, locationInput.trim()])
      }
      setLocationInput('')
    }
  }

  const removeLocation = (locToRemove: string): void => {
    setLocations(locations.filter((loc) => loc !== locToRemove))
  }

  const toggleFilter = (key: keyof typeof filters): void => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStart = (): void => {
    if (!niche) {
      addLog('Error: Please specify a niche', 'error')
      return
    }
    setIsRunning(true)
    clearLogs()

    // Send start command to main process
    try {
      window.api.startAgent({
        niche,
        locations: locations.length > 0 ? locations : [locationInput].filter(Boolean),
        leadLimit,
        filters
      })
    } catch (error) {
      console.error('Failed to start agent:', error)
      setIsRunning(false)
      addLog('Failed to start agent process', 'error')
    }
  }

  const handleStop = (): void => {
    window.api.stopAgent()
    addLog('Stopping agent...', 'warning')
  }

  const clearLogs = (): void => setLogs([])
  const clearLeads = (): void => {
    setFoundLeads([])
    setIsPanelOpen(false)
  }

  const removeLead = (id: string): void => {
    setFoundLeads((prev) => prev.filter((l) => l.id !== id))
  }

  const handleSaveLeads = async (): Promise<void> => {
    if (foundLeads.length === 0) {
      addLog('No leads to save', 'warning')
      return
    }

    try {
      const existing = await window.api.getSavedMapsLeads()
      const existingById = new Map(existing.map((l) => [l.id, l]))

      // Convert agent leads to SavedMapsLead format
      const leadsToPersist = foundLeads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        address: lead.address,
        phone: lead.phone ?? null,
        website: lead.website ?? null,
        rating: lead.rating ?? 0,
        reviewCount: lead.reviewCount ?? 0,
        category: lead.category,
        score: (lead.metadata?.score as 'gold' | 'silver' | 'bronze') ?? 'bronze',
        latitude: 0,
        longitude: 0,
        email: lead.email,
        emailVerified: lead.emailVerified,
        hasWhatsApp: lead.hasWhatsApp,
        savedAt: Date.now()
      }))

      const newLeads = leadsToPersist.filter((l) => !existingById.has(l.id))
      const leadsToUpdate = leadsToPersist
        .filter((l) => existingById.has(l.id))
        .map((l) => {
          const prev = existingById.get(l.id)!
          return { ...prev, ...l, savedAt: prev.savedAt }
        })

      let createdCount = 0
      if (newLeads.length > 0) {
        const result = await window.api.saveMapsLeads(newLeads)
        if (result.success) createdCount = result.count
      }

      let updatedCount = 0
      if (leadsToUpdate.length > 0) {
        const results = await Promise.all(
          leadsToUpdate.map(async (lead) => window.api.updateSavedMapsLead(lead))
        )
        updatedCount = results.filter((r) => r.success).length
      }

      if (createdCount > 0 || updatedCount > 0) {
        addLog(`✅ Saved ${createdCount} new, updated ${updatedCount} leads`, 'success')
      } else {
        addLog('All leads already saved', 'info')
      }
    } catch (err) {
      console.error('Save leads error:', err)
      addLog('Failed to save leads', 'error')
    }
  }

  const handleExportLeads = (): void => {
    if (foundLeads.length === 0) {
      addLog('No leads to export', 'warning')
      return
    }

    const headers = [
      'Name',
      'Category',
      'Address',
      'Phone',
      'WhatsApp',
      'Email',
      'Email Verified',
      'Website',
      'Rating',
      'Reviews',
      'Source',
      'Score'
    ]

    const rows = foundLeads.map((lead) => [
      lead.name,
      lead.category,
      lead.address,
      lead.phone || '',
      lead.hasWhatsApp === true ? 'Yes' : lead.hasWhatsApp === false ? 'No' : '',
      lead.email || '',
      lead.emailVerified === true ? 'Verified' : lead.emailVerified === false ? 'Invalid' : '',
      lead.website || '',
      lead.rating?.toString() || '',
      lead.reviewCount?.toString() || '',
      lead.source,
      (lead.metadata?.score as string) || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)

    addLog(`📥 Exported ${foundLeads.length} leads to CSV`, 'success')
  }

  return (
    <div className="automation-container">
      <div className="automation-content">
        <div className="automation-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>AI Lead Generation Agent</h1>
            {foundLeads.length > 0 && !isPanelOpen && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setIsPanelOpen(true)}
              >
                <FaList /> View Found Leads ({foundLeads.length})
              </button>
            )}
          </div>
          <div className={`automation-status`}>
            <span className={`status-dot ${isRunning ? 'active' : ''}`}></span>
            {isRunning ? 'Agent is Running' : 'Agent is Idle'}
          </div>
        </div>

        <div className="layout-split-screen">
          {/* Left Column: Configuration */}
          <div className="layout-left-col">
            <div className="config-card">
              <h3 className="card-title">
                <FaLayerGroup /> Target Configuration
              </h3>

              <div className="form-group">
                <label>Business Niche / Category</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Dental Clinics, Italian Restaurants"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Target Locations (City or Country)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type and press Enter to add..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={handleAddLocation}
                />
                <div className="location-tags">
                  {locations.map((loc) => (
                    <span key={loc} className="location-tag">
                      <FaMapMarkerAlt size={10} /> {loc}
                      <button onClick={() => removeLocation(loc)} className="remove-tag">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters/Constraints Column */}
            <div className="config-card">
              <h3 className="card-title">
                <FaFilter /> Filters & Limits
              </h3>

              <div className="form-group">
                <label>
                  Target Lead Count: <span className="slider-value">{leadLimit}</span>
                </label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={leadLimit}
                    onChange={(e) => setLeadLimit(parseInt(e.target.value))}
                    className="range-slider"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Must Have Requirements</label>
                <div className="toggle-group">
                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaLaptop size={14} color="#a8a29e" /> <span>No Website</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={filters.hasWebsite}
                        onChange={() => toggleFilter('hasWebsite')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaEnvelope size={14} color="#a8a29e" /> <span>Email Available</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={filters.hasEmail}
                        onChange={() => toggleFilter('hasEmail')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaPhone size={14} color="#a8a29e" /> <span>Phone Number Available</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={filters.hasPhone}
                        onChange={() => toggleFilter('hasPhone')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Advanced Actions</label>
                <div className="toggle-group">
                  {/* Auto-Verify WhatsApp */}
                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaWhatsapp size={14} color="#a8a29e" /> <span>Auto-Verify WhatsApp</span>
                    </div>
                    {whatsappConnected ? (
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={filters.autoVerifyWA}
                          onChange={() => toggleFilter('autoVerifyWA')}
                        />
                        <span className="slider"></span>
                      </label>
                    ) : (
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                        onClick={handleConnectWhatsApp}
                        disabled={whatsAppInitializing}
                      >
                        {whatsAppInitializing ? 'Connecting...' : 'Connect WhatsApp'}
                      </button>
                    )}
                  </div>

                  {/* Auto-Verify Email */}
                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaCheck size={14} color="#a8a29e" /> <span>Auto-Verify Email</span>
                    </div>
                    {hasReoonKey ? (
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={filters.autoVerifyEmail}
                          onChange={() => toggleFilter('autoVerifyEmail')}
                        />
                        <span className="slider"></span>
                      </label>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                        Add Reoon API key
                      </span>
                    )}
                  </div>

                  {/* Auto-Find Email */}
                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaSearch size={14} color="#a8a29e" /> <span>Auto-Find & Verify Email</span>
                    </div>
                    {hasEmailFinderKey ? (
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={filters.autoFindEmail}
                          onChange={() => toggleFilter('autoFindEmail')}
                        />
                        <span className="slider"></span>
                      </label>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                        Add Hunter/Snov key
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* End Left Column */}

          {/* Right Column: Console & Controls */}
          <div className="layout-right-col">
            {/* Console Section */}
            <div className="console-section">
              <div className="console-header">
                <div className="console-title">
                  <FaTerminal /> Agent Activity Log
                </div>
                <div className="console-actions">
                  <button className="console-btn" onClick={clearLogs} title="Clear Logs">
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
              <div className="console-content">
                {logs.length === 0 && (
                  <div style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    Waiting for agent to start...
                  </div>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">[{log.timestamp}]</span>
                    <span className={`log-message log-${log.type}`}>
                      {log.type === 'info' && '> '}
                      {log.type === 'success' && '✓ '}
                      {log.type === 'warning' && '⚠ '}
                      {log.type === 'error' && '✗ '}
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Action Bar */}
            <div className="action-bar">
              {isRunning ? (
                <button className="btn btn-danger" onClick={handleStop}>
                  <FaStop /> Stop Agent
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleStart}>
                  <FaPlay /> Start Agent Process
                </button>
              )}
            </div>
          </div>
          {/* End Right Column */}
        </div>
      </div>

      {/* Side Panel */}
      <div className={`automation-panel ${foundLeads.length > 0 && isPanelOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>Found Leads ({foundLeads.length})</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="remove-tag" onClick={handleSaveLeads} title="Save Leads">
              <FaSave size={14} />
            </button>
            <button className="remove-tag" onClick={handleExportLeads} title="Export as CSV">
              <FaFileCsv size={14} />
            </button>
            <button className="remove-tag" onClick={clearLeads} title="Clear All Leads">
              <FaTrash size={14} />
            </button>
            <button
              className="remove-tag"
              onClick={() => setIsPanelOpen(false)}
              title="Close Panel"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>
        <div className="panel-content">
          {foundLeads.map((lead, idx) => (
            <div key={`${lead.id}-${idx}`} className="found-lead-card">
              {/* Card Header */}
              <div className="card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lead-name" title={lead.name}>
                    {lead.name}
                  </div>
                  <span className="lead-category" title={lead.category}>
                    {lead.category}
                  </span>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => removeLead(lead.id)}
                  title="Remove Lead"
                >
                  <FaTrash size={12} />
                </button>
              </div>

              {/* Card Body */}
              <div className="card-body">
                <div className="lead-address">
                  <FaMapMarkerAlt size={12} />
                  <span className="text-truncate">{lead.address || 'No location info'}</span>
                </div>

                <div className="contact-actions">
                  <div
                    className={`contact-badge ${lead.phone ? 'active' : ''}`}
                    title={lead.phone || 'No Phone'}
                  >
                    <FaPhoneAlt size={12} />
                  </div>
                  <div
                    className={`contact-badge ${lead.email ? 'active' : ''}`}
                    title={lead.email || 'No Email'}
                  >
                    <FaEnvelope size={12} />
                  </div>
                  <div
                    className={`contact-badge ${lead.website ? 'active' : ''}`}
                    title={lead.website || 'No Website'}
                    onClick={() =>
                      lead.website &&
                      window.api.openExternalUrl &&
                      window.api.openExternalUrl(lead.website)
                    }
                    style={{ cursor: lead.website ? 'pointer' : 'default' }}
                  >
                    <FaGlobe size={12} />
                  </div>
                  <div
                    className={`contact-badge whatsapp ${lead.hasWhatsApp ? 'active' : ''}`}
                    title={lead.hasWhatsApp ? 'WhatsApp Available' : 'No WhatsApp'}
                  >
                    <FaWhatsapp size={14} />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="card-footer">
                <div className="badge-group">
                  <span className="badge-source">{lead.source}</span>
                  {lead.rating && (
                    <span className="badge-rating">
                      <FaStar size={10} /> {lead.rating} ({lead.reviewCount || 0})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {lead.metadata?.score === 'silver' && (
                    <span
                      className="badge"
                      style={{ background: '#64748b', color: '#e2e8f0', fontSize: '0.7rem' }}
                    >
                      🥈 Silver
                    </span>
                  )}
                  {lead.metadata?.score === 'bronze' && (
                    <span
                      className="badge"
                      style={{ background: '#78350f', color: '#fef3c7', fontSize: '0.7rem' }}
                    >
                      🥉 Bronze
                    </span>
                  )}
                  {lead.metadata?.score === 'gold' && (
                    <span
                      className="badge"
                      style={{ background: '#eab308', color: '#fff', fontSize: '0.7rem' }}
                    >
                      🥇 Gold
                    </span>
                  )}
                  <span className={`lead-status ${lead.status}`}>{lead.status}</span>
                </div>
              </div>
            </div>
          ))}
          {foundLeads.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', marginTop: '2rem' }}>
              No leads found yet.
              <br />
              Start the agent to begin.
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp QR Modal */}
      {showWhatsAppModal && whatsAppQrCode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              maxWidth: '350px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '1rem', color: '#25D366' }}>
              <FaWhatsapp style={{ marginRight: '0.5rem' }} />
              Scan QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
            </p>
            <div
              style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '8px',
                display: 'inline-block'
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsAppQrCode)}`}
                alt="WhatsApp QR Code"
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem' }}>
              Waiting for scan...
            </p>
            <button
              style={{
                marginTop: '1rem',
                padding: '8px 16px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer'
              }}
              onClick={() => {
                setShowWhatsAppModal(false)
                window.api.whatsappDisconnect()
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutomationPage
