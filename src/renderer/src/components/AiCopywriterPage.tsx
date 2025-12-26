import { JSX, useEffect, useState } from 'react'
import { FaEdit, FaPlus, FaSave, FaTimes, FaTrash, FaWhatsapp } from 'react-icons/fa'
// Campaign is defined locally to avoid import issues
type TabType = 'mail' | 'whatsapp' | 'telegram'

interface Campaign {
  id: string
  name: string
  instruction: string
  platform: 'whatsapp'
  createdAt: number
  updatedAt: number
}

interface AiCopywriterPageProps {
  initialTab?: TabType
}

// ============================================
// WHATSAPP CAMPAIGN S COMPONENTS
// ============================================

function WhatsAppCampaigns(): JSX.Element {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [currentCampaign, setCurrentCampaign] = useState<Partial<Campaign>>({})
  const [loading, setLoading] = useState(false)

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.getWhatsappCampaigns()
      // Filter only WhatsApp platform campaigns just in case, though store separates them
      setCampaigns(data.filter((c) => c.platform === 'whatsapp'))
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = (): void => {
    setCurrentCampaign({
      name: '',
      instruction: '',
      platform: 'whatsapp'
    })
    setView('editor')
  }

  const handleEdit = (campaign: Campaign): void => {
    setCurrentCampaign({ ...campaign })
    setView('editor')
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await window.api.deleteWhatsappCampaign(id)
      loadCampaigns()
    }
  }

  const handleSave = async (): Promise<void> => {
    console.log('Saving campaign...', currentCampaign)
    if (!currentCampaign.name || !currentCampaign.instruction) {
      alert('Please fill in both Name and Instruction.')
      return
    }

    try {
      // Use a simple ID generator if crypto is not available
      const id =
        currentCampaign.id ||
        (window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

      const campaignToSave: Campaign = {
        id,
        name: currentCampaign.name,
        instruction: currentCampaign.instruction,
        platform: 'whatsapp',
        createdAt: currentCampaign.createdAt || Date.now(),
        updatedAt: Date.now()
      }

      console.log('Sending to API:', campaignToSave)
      await window.api.saveWhatsappCampaign(campaignToSave)
      console.log('Saved successfully')

      setView('list')
      loadCampaigns()
    } catch (err) {
      console.error('Error saving campaign:', err)
      alert('Failed to save campaign. Check console for details.')
    }
  }

  const handleCancel = (): void => {
    setView('list')
    setCurrentCampaign({})
  }

  // --- RENDER EDITOR ---
  if (view === 'editor') {
    return (
      <div className="editor-container">
        <div className="editor-header">
          <h2 className="editor-title">
            <span className="title-icon-box">
              <FaWhatsapp className="icon" />
            </span>
            {currentCampaign.id ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          <button onClick={handleCancel} className="close-btn">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="editor-form">
          {/* Campaign Name */}
          <div className="form-group">
            <label className="form-label">Campaign Name</label>
            <input
              type="text"
              value={currentCampaign.name}
              onChange={(e) => setCurrentCampaign((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Restaurant Owners Outreach"
              className="form-input"
            />
          </div>

          {/* Instruction */}
          <div className="form-group">
            <label className="form-label">Pitch Instructions</label>
            <p className="form-hint">
              Explain how the AI should write the pitch. Include tone, key points to mention, and
              call-to-action style.
            </p>
            <textarea
              value={currentCampaign.instruction}
              onChange={(e) =>
                setCurrentCampaign((prev) => ({ ...prev, instruction: e.target.value }))
              }
              placeholder="Example: Act as a digital marketing expert. Analyze their reviews and mention specifically what they are doing well. Then suggest how our agency can help them get more 5-star reviews..."
              className="form-textarea"
            />
          </div>

          {/* Actions */}
          <div className="editor-actions">
            <button onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-save">
              <FaSave className="icon" />
              Save Campaign
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDER LIST ---
  return (
    <div className="wrapper-container p-6 relative">
      {/* Header */}
      <div className="campaign-nav">
        <div className="campaign-title-group">
          <h1>WhatsApp Campaigns</h1>
          <p className="campaign-subtitle">Manage your AI instructions for personalized outreach</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <FaPlus size={14} />
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="loading-container">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FaWhatsapp size={32} />
          </div>
          <h3 className="empty-title">No Campaigns Yet</h3>
          <p className="empty-desc">
            Create your first campaign to teach the AI how to write pitches for your leads.
          </p>
          <button onClick={handleCreate} className="btn-secondary">
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid-container">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="campaign-card group">
              <div className="card-header">
                <div className="card-icon">
                  <FaWhatsapp size={20} />
                </div>
                <div className="card-actions">
                  <button onClick={() => handleEdit(campaign)} className="action-btn" title="Edit">
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="action-btn delete"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <h3 className="card-title">{campaign.name}</h3>

              <div className="card-content-box">
                <p className="card-desc">{campaign.instruction}</p>
                <div className="fade-overlay" />
              </div>

              <div className="card-footer">
                <span>
                  {new Date(campaign.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className="platform-badge">{campaign.platform}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AiCopywriterPage({ initialTab = 'mail' }: AiCopywriterPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Update active tab when prop changes (from sidebar navigation)
  if (activeTab !== initialTab) {
    setActiveTab(initialTab)
  }

  return (
    <div className="wrapper-container">
      {activeTab === 'mail' && (
        <div className="campaign-header">
          <h1 className="text-2xl font-bold text-slate-500">Mail Copywriter - Coming Soon</h1>
        </div>
      )}
      {activeTab === 'whatsapp' && <WhatsAppCampaigns />}
      {activeTab === 'telegram' && (
        <div className="campaign-header">
          <h1 className="text-2xl font-bold text-slate-500">Telegram Copywriter - Coming Soon</h1>
        </div>
      )}
    </div>
  )
}

export default AiCopywriterPage
