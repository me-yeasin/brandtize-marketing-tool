import { JSX, useState } from 'react'
import { FaFacebook } from 'react-icons/fa'

function SocialLeadsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'facebook-page'>('facebook-page')

  return (
    <div
      className="page-container"
      style={{
        padding: '2rem',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Tabs */}
      <div
        className="tabs-container"
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          marginBottom: '2rem'
        }}
      >
        <button
          className={`tab-btn ${activeTab === 'facebook-page' ? 'active' : ''}`}
          onClick={() => setActiveTab('facebook-page')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'facebook-page' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'facebook-page' ? '#f1f5f9' : '#94a3b8',
            fontWeight: activeTab === 'facebook-page' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <FaFacebook />
          Facebook Page
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'facebook-page' && (
          <div
            className="facebook-page-content"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                color: '#6366f1'
              }}
            >
              <FaFacebook size={32} />
            </div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#f1f5f9'
              }}
            >
              Facebook Page Scraper
            </h2>
            <p
              style={{
                color: '#94a3b8',
                maxWidth: '500px',
                textAlign: 'center',
                lineHeight: '1.6'
              }}
            >
              Search for businesses by category and location to extract public contact information
              directly from their Facebook Pages.
            </p>
            <div
              style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <p style={{ color: '#818cf8', fontSize: '0.9rem' }}>
                🚀 Integration with Apify in progress
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SocialLeadsPage
