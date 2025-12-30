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

  // Agent State
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [foundLeads, setFoundLeads] = useState<FoundLead[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

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

  // Auto-open panel when leads are found
  useEffect(() => {
    if (foundLeads.length === 1 && prevLeadCountRef.current === 0) {
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

  const handleSaveLeads = (): void => {
    // Placeholder for saving leads
    console.log('Saving leads...', foundLeads)
    alert('Save functionality coming soon!')
  }

  const handleExportLeads = (): void => {
    // Placeholder for exporting leads
    console.log('Exporting leads...', foundLeads)
    alert('Export functionality coming soon!')
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
                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaWhatsapp size={14} color="#a8a29e" /> <span>Auto-Verify WhatsApp</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={filters.autoVerifyWA}
                        onChange={() => toggleFilter('autoVerifyWA')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaCheck size={14} color="#a8a29e" /> <span>Auto-Verify Email</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={filters.autoVerifyEmail}
                        onChange={() => toggleFilter('autoVerifyEmail')}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="toggle-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaSearch size={14} color="#a8a29e" /> <span>Auto-Find & Verify Email</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={filters.autoFindEmail}
                        onChange={() => toggleFilter('autoFindEmail')}
                      />
                      <span className="slider"></span>
                    </label>
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <span className="lead-name">{lead.name}</span>
                    <span className="lead-category">{lead.category}</span>
                  </div>
                  <div className="lead-detail">
                    <FaMapMarkerAlt size={10} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '200px'
                      }}
                    >
                      {lead.address}
                    </span>
                  </div>
                </div>
                <button
                  className="icon-btn delete-btn"
                  onClick={() => removeLead(lead.id)}
                  title="Remove Lead"
                >
                  <FaTrash size={12} />
                </button>
                {lead.source === 'Facebook' && lead.metadata?.facebookUrl && (
                  <button
                    className="icon-btn"
                    onClick={() => window.open(lead.metadata?.facebookUrl, '_blank')}
                    title="View Facebook Page"
                    style={{ background: '#1877f2', marginLeft: '0.25rem' }}
                  >
                    <FaGlobe size={12} />
                  </button>
                )}
              </div>

              <div
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                {lead.phone && (
                  <div className="lead-detail">
                    <FaPhoneAlt size={10} /> {lead.phone}
                    {lead.hasWhatsApp && <span className="badge badge-success">WA</span>}
                  </div>
                )}

                {lead.email && (
                  <div className="lead-detail">
                    <FaEnvelope size={10} /> {lead.email}
                    {lead.emailVerified ? (
                      <FaCheck size={10} color="#34d399" title="Verified" />
                    ) : (
                      <FaTimes size={10} color="#f87171" title="Not Verified" />
                    )}
                  </div>
                )}

                {lead.website && (
                  <div className="lead-detail">
                    <FaGlobe size={10} />
                    <a
                      href={`https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {lead.website}
                    </a>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Score Badge */}
                    {lead.metadata?.score === 'gold' && (
                      <span className="badge" style={{ background: '#ca8a04', color: '#fef9c3' }}>
                        🥇 Gold
                      </span>
                    )}
                    {lead.metadata?.score === 'silver' && (
                      <span className="badge" style={{ background: '#64748b', color: '#e2e8f0' }}>
                        🥈 Silver
                      </span>
                    )}
                    {lead.metadata?.score === 'bronze' && (
                      <span className="badge" style={{ background: '#78350f', color: '#fef3c7' }}>
                        🥉 Bronze
                      </span>
                    )}
                    <span className="badge badge-source">{lead.source}</span>
                    {lead.website ? (
                      <span className="badge" style={{ background: '#166534', color: '#bbf7d0' }}>
                        Has Website
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#7c2d12', color: '#fed7aa' }}>
                        No Website
                      </span>
                    )}
                    {lead.rating && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: '#fbbf24'
                        }}
                      >
                        <FaStar size={10} /> {lead.rating} ({lead.reviewCount})
                      </span>
                    )}
                  </div>
                  <span className="lead-status">{lead.status}</span>
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
    </div>
  )
}

export default AutomationPage
