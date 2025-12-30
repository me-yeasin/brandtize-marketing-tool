import { JSX, useEffect, useRef, useState } from 'react'
import {
    FaEnvelope,
    FaFilter,
    FaLaptop,
    FaLayerGroup,
    FaMapMarkerAlt,
    FaPhone,
    FaPlay,
    FaStop,
    FaTerminal,
    FaTrash
} from 'react-icons/fa'
import './AutomationPage.css'

interface LogEntry {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
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
    hasPhone: false
  })

  // Agent State
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Mock simulation effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      const actions: { msg: string; type: LogEntry['type'] }[] = [
        { msg: 'Initializing AI Agent...', type: 'info' },
        { msg: `Targeting Niche: ${niche || 'General'}`, type: 'info' },
        { msg: 'Connecting to Serper Google Maps API...', type: 'info' },
        { msg: 'Scraping Page 1 for "New York"...', type: 'info' },
        { msg: 'Found 12 leads on Page 1', type: 'success' },
        { msg: 'Filtering leads (Website check)...', type: 'warning' },
        { msg: 'Switching to Facebook Page Scraper...', type: 'info' },
        { msg: 'Analyzing social signals...', type: 'info' },
        { msg: 'Saved 8 qualified leads to database', type: 'success' },
        { msg: 'Moving to Page 2...', type: 'info' }
      ]
      let step = 0

      interval = setInterval(() => {
        if (step < actions.length) {
          const action = actions[step]
          addLog(action.msg, action.type)
          step++
        } else {
          // Loop random logs
          const randomAction = actions[Math.floor(Math.random() * actions.length)]
          addLog(randomAction.msg, randomAction.type)
        }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [isRunning, niche])

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
    addLog('Agent process started', 'success')
  }

  const handleStop = (): void => {
    setIsRunning(false)
    addLog('Agent process stopped by user', 'warning')
  }

  const clearLogs = (): void => setLogs([])

  return (
    <div className="automation-container">
      <div className="automation-header">
        <h1>AI Lead Generation Agent</h1>
        <div className={`automation-status`}>
          <span className={`status-dot ${isRunning ? 'active' : ''}`}></span>
          {isRunning ? 'Agent is Running' : 'Agent is Idle'}
        </div>
      </div>

      <div className="config-grid">
        {/* Targeting Column */}
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
                  <FaLaptop size={14} color="#a8a29e" /> <span>Website Available</span>
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
        </div>
      </div>

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
            <div style={{ opacity: 0.5, fontStyle: 'italic' }}>Waiting for agent to start...</div>
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
  )
}

export default AutomationPage
