import { JSX, useEffect, useState } from 'react'
import { FaEdit, FaFolder, FaPlus, FaSave, FaTimes, FaTrash, FaWhatsapp } from 'react-icons/fa'
// Campaign is defined locally to avoid import issues
type TabType = 'mail' | 'whatsapp' | 'telegram'

interface CampaignGroup {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

interface Campaign {
  id: string
  name: string
  instruction: string
  buyerPersona?: string
  examples?: string[]
  productLinks?: string[]
  language: 'en' | 'bn' // Language for pitch generation (English or Bangla)
  platform: 'whatsapp'
  groupId?: string
  createdAt: number
  updatedAt: number
}

interface AiCopywriterPageProps {
  initialTab?: TabType
}

// ============================================
// WHATSAPP CAMPAIGN S COMPONENTS
// ============================================

// Helper to insert/toggle markdown syntax at cursor
// Helper to insert/toggle markdown syntax at cursor
// Helper to insert/toggle markdown syntax at cursor
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

  // Case 3: Apply the NEW Wrapper (since we didn't return early)
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

// Minimal WhatsApp Markdown Parser for Preview
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

function WhatsAppCampaigns(): JSX.Element {
  const [view, setView] = useState<'list' | 'editor' | 'group-editor'>('list')
  const [activeTab, setActiveTab] = useState<'campaigns' | 'groups'>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([])
  const [currentCampaign, setCurrentCampaign] = useState<Partial<Campaign>>({})
  const [currentGroup, setCurrentGroup] = useState<Partial<CampaignGroup>>({})
  const [loading, setLoading] = useState(false)

  // Load campaigns on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    try {
      const [campaignsData, groupsData] = await Promise.all([
        window.api.getWhatsappCampaigns(),
        window.api.getWhatsappCampaignGroups()
      ])
      setCampaigns(campaignsData.filter((c) => c.platform === 'whatsapp'))
      setCampaignGroups(groupsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = (): void => {
    setCurrentCampaign({
      name: '',
      instruction: '',
      buyerPersona: '',
      examples: [],
      productLinks: [],
      language: 'en', // Default to English
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
      loadData()
    }
  }

  // Group management functions
  const handleCreateGroup = (): void => {
    setCurrentGroup({
      name: '',
      description: ''
    })
    setView('group-editor')
  }

  const handleEditGroup = (group: CampaignGroup): void => {
    setCurrentGroup({ ...group })
    setView('group-editor')
  }

  const handleDeleteGroup = async (id: string): Promise<void> => {
    if (
      confirm(
        'Are you sure you want to delete this group? Campaigns in this group will become ungrouped.'
      )
    ) {
      await window.api.deleteWhatsappCampaignGroup(id)
      loadData()
    }
  }

  const handleSaveGroup = async (): Promise<void> => {
    if (!currentGroup.name) {
      alert('Please fill in the group name.')
      return
    }

    try {
      const id =
        currentGroup.id ||
        (window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

      const groupToSave: CampaignGroup = {
        id,
        name: currentGroup.name,
        description: currentGroup.description,
        createdAt: currentGroup.createdAt || Date.now(),
        updatedAt: Date.now()
      }

      await window.api.saveWhatsappCampaignGroup(groupToSave)
      setView('list')
      loadData()
    } catch (err) {
      console.error('Error saving group:', err)
      alert('Failed to save group. Check console for details.')
    }
  }

  const handleSave = async (): Promise<void> => {
    console.log('Saving campaign...', currentCampaign)
    if (!currentCampaign.name) {
      alert('Please fill in the Campaign Name.')
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
        instruction: currentCampaign.instruction || '',
        buyerPersona: currentCampaign.buyerPersona || undefined,
        examples: currentCampaign.examples || [],
        productLinks: currentCampaign.productLinks || [],
        language: currentCampaign.language || 'en',
        platform: 'whatsapp',
        groupId: currentCampaign.groupId,
        createdAt: currentCampaign.createdAt || Date.now(),
        updatedAt: Date.now()
      }

      console.log('Sending to API:', campaignToSave)
      await window.api.saveWhatsappCampaign(campaignToSave)
      console.log('Saved successfully')

      setView('list')
      loadData()
    } catch (err) {
      console.error('Error saving campaign:', err)
      alert('Failed to save campaign. Check console for details.')
    }
  }

  const handleCancel = (): void => {
    setView('list')
    setCurrentCampaign({})
    setCurrentGroup({})
  }

  // --- RENDER EDITOR ---
  if (view === 'editor') {
    return (
      <div
        className="editor-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden'
        }}
      >
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

        <div className="editor-form" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
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

          {/* Group Selection */}
          <div className="form-group">
            <label className="form-label">Campaign Group (Optional)</label>
            <p className="form-hint">Assign this campaign to a group for better organization.</p>
            <select
              value={currentCampaign.groupId || ''}
              onChange={(e) =>
                setCurrentCampaign((prev) => ({ ...prev, groupId: e.target.value || undefined }))
              }
              className="form-input"
            >
              <option value="">No Group</option>
              {campaignGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selection */}
          <div className="form-group">
            <label className="form-label">Pitch Language</label>
            <p className="form-hint">
              Select the language for AI-generated pitches. The AI will write the entire message in
              this language.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '0.5rem'
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentCampaign((prev) => ({ ...prev, language: 'en' }))}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border:
                    currentCampaign.language === 'en'
                      ? '2px solid #6366f1'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  background:
                    currentCampaign.language === 'en'
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                  color: currentCampaign.language === 'en' ? '#a5b4fc' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: currentCampaign.language === 'en' ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>🇺🇸</span>
                English
              </button>
              <button
                type="button"
                onClick={() => setCurrentCampaign((prev) => ({ ...prev, language: 'bn' }))}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border:
                    currentCampaign.language === 'bn'
                      ? '2px solid #10b981'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  background:
                    currentCampaign.language === 'bn'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                  color: currentCampaign.language === 'bn' ? '#6ee7b7' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: currentCampaign.language === 'bn' ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>🇧🇩</span>
                বাংলা
              </button>
            </div>
          </div>

          {/* Buyer Persona */}
          <div className="form-group">
            <label className="form-label">Buyer Persona (Optional)</label>
            <p className="form-hint">
              Describe your ideal customer (e.g., pain points, goals, values). The AI will tailor
              the pitch to resonate with them.
            </p>
            <textarea
              value={currentCampaign.buyerPersona || ''}
              onChange={(e) =>
                setCurrentCampaign((prev) => ({ ...prev, buyerPersona: e.target.value }))
              }
              placeholder="Example: Small business owners who are skeptical of marketing agencies, value ROI transparency, and want more local customers..."
              className="form-textarea"
              rows={3}
            />
          </div>

          {/* Instruction */}
          <div className="form-group">
            <label className="form-label">Pitch Instructions (Optional)</label>
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

          {/* Example Pitches */}
          <div className="form-group">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Example Pitches (Few-Shot Learning)
              </label>
              <button
                type="button"
                onClick={() => {
                  const currentExamples = currentCampaign.examples || []
                  setCurrentCampaign((prev) => ({ ...prev, examples: [...currentExamples, ''] }))
                }}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  height: 'auto',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                <FaPlus size={10} style={{ marginRight: '4px' }} /> Add Example
              </button>
            </div>
            <p className="form-hint" style={{ marginBottom: '1rem' }}>
              Add specific examples of good pitches. The AI will mimic the style, tone, and
              structure of these examples.
            </p>

            <div
              className="examples-list"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {(currentCampaign.examples || []).map((example, index) => (
                <div key={index} className="example-item" style={{ position: 'relative' }}>
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '*',
                          '*',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '_',
                          '_',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '~',
                          '~',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '```',
                          '```',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '- ',
                          '',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '1. ',
                          '',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                        const newExamples = [...(currentCampaign.examples || [])]
                        insertMarkdown(
                          textarea,
                          '> ',
                          '',
                          (val) => {
                            newExamples[index] = val
                            setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                          },
                          newExamples[index]
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
                      ❝ Quote
                    </button>
                  </div>
                  <textarea
                    value={example}
                    onChange={(e) => {
                      const newExamples = [...(currentCampaign.examples || [])]
                      newExamples[index] = e.target.value
                      setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                    }}
                    placeholder={`Example Pitch #${index + 1}...`}
                    className="form-textarea"
                    rows={4}
                    style={{ fontSize: '0.9rem', marginBottom: 0, fontFamily: 'inherit' }}
                  />
                  {/* LIVE PREVIEW BOX */}
                  {example && (
                    <div
                      className="preview-box"
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: '#0f172a' /* Very dark bg like WhatsApp Dark mode */,
                        borderLeft: '3px solid #6366f1',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '0.9rem',
                        color: '#e2e8f0',
                        opacity: 0.9
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          color: '#64748b',
                          marginBottom: '4px',
                          fontWeight: 'bold'
                        }}
                      >
                        WhatsApp Preview
                      </div>
                      {renderWhatsAppMarkdown(example)}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const newExamples = (currentCampaign.examples || []).filter(
                        (_, i) => i !== index
                      )
                      setCurrentCampaign((prev) => ({ ...prev, examples: newExamples }))
                    }}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Remove example"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
              {(currentCampaign.examples || []).length === 0 && (
                <div
                  style={{
                    padding: '1.5rem',
                    border: '1px dashed rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.9rem',
                    background: 'rgba(15, 23, 42, 0.3)'
                  }}
                >
                  No examples added yet. Adding examples significantly improves AI quality!
                </div>
              )}
            </div>
          </div>

          {/* Product/Portfolio Links */}
          <div className="form-group">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Product / Portfolio Links
              </label>
              <button
                type="button"
                onClick={() => {
                  const currentLinks = currentCampaign.productLinks || []
                  setCurrentCampaign((prev) => ({ ...prev, productLinks: [...currentLinks, ''] }))
                }}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  height: 'auto',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                <FaPlus size={10} style={{ marginRight: '4px' }} /> Add Link
              </button>
            </div>
            <p className="form-hint" style={{ marginBottom: '1rem' }}>
              Add links to your products or portfolio. The AI will ONLY include these if the Pitch
              Instructions or Examples specifically mention adding a link.
            </p>

            <div
              className="examples-list"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              {(currentCampaign.productLinks || []).map((link, index) => (
                <div key={index} className="example-item" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => {
                      const newLinks = [...(currentCampaign.productLinks || [])]
                      newLinks[index] = e.target.value
                      setCurrentCampaign((prev) => ({ ...prev, productLinks: newLinks }))
                    }}
                    placeholder={`https://...`}
                    className="form-input"
                    style={{ fontSize: '0.9rem', marginBottom: 0, paddingRight: '2rem' }}
                    autoFocus={!link}
                  />
                  <button
                    onClick={() => {
                      const newLinks = (currentCampaign.productLinks || []).filter(
                        (_, i) => i !== index
                      )
                      setCurrentCampaign((prev) => ({ ...prev, productLinks: newLinks }))
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      right: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Remove link"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
              {(currentCampaign.productLinks || []).length === 0 && (
                <div
                  style={{
                    padding: '1rem',
                    border: '1px dashed rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    background: 'rgba(15, 23, 42, 0.3)'
                  }}
                >
                  No product/portfolio links added.
                </div>
              )}
            </div>
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

  // --- RENDER GROUP EDITOR ---
  if (view === 'group-editor') {
    return (
      <div
        className="editor-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <div className="editor-header">
          <h2 className="editor-title">
            <span className="title-icon-box">
              <FaFolder className="icon" />
              Campaign Group
            </span>
          </h2>
        </div>

        <div className="editor-content" style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          {/* Group Name */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label
              className="form-label"
              style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                display: 'block'
              }}
            >
              Group Name
            </label>
            <p
              className="form-hint"
              style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}
            >
              A descriptive name for this campaign group (e.g., &quot;Restaurants&quot;,
              &quot;Retail&quot;, &quot;Healthcare&quot;).
            </p>
            <input
              type="text"
              value={currentGroup.name || ''}
              onChange={(e) => setCurrentGroup((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name..."
              className="form-input"
              style={{ padding: '0.875rem 1rem', fontSize: '0.95rem' }}
            />
          </div>

          {/* Group Description */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label
              className="form-label"
              style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                display: 'block'
              }}
            >
              Description (Optional)
            </label>
            <p
              className="form-hint"
              style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}
            >
              Brief description of what types of campaigns belong to this group.
            </p>
            <textarea
              value={currentGroup.description || ''}
              onChange={(e) =>
                setCurrentGroup((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Example: Campaigns for restaurant marketing and outreach..."
              className="form-textarea"
              rows={3}
              style={{ padding: '0.875rem 1rem', fontSize: '0.95rem', minHeight: '100px' }}
            />
          </div>

          {/* Actions */}
          <div
            className="editor-actions"
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            <button
              onClick={handleCancel}
              className="btn-cancel"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                e.currentTarget.style.color = '#f1f5f9'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGroup}
              className="btn-save"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid #6366f1',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #5558e3, #7c3aed)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <FaSave className="icon" size={14} />
              Save Group
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
        {activeTab === 'campaigns' ? (
          <button onClick={handleCreate} className="btn-primary">
            <FaPlus size={14} />
            New Campaign
          </button>
        ) : (
          <button
            onClick={handleCreateGroup}
            className="btn-secondary"
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#6366f1'
            }}
          >
            <FaFolder size={14} />
            New Group
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          marginBottom: '2rem'
        }}
      >
        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '1rem 1.5rem',
            background: activeTab === 'campaigns' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'campaigns' ? '#6366f1' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          <FaWhatsapp size={16} style={{ marginRight: '0.5rem' }} />
          Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          style={{
            padding: '1rem 1.5rem',
            background: activeTab === 'groups' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'groups' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'groups' ? '#6366f1' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          <FaFolder size={16} style={{ marginRight: '0.5rem' }} />
          Groups ({campaignGroups.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' ? (
        <>
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
            <>
              {/* Grouped Campaigns */}
              {campaignGroups.map((group) => {
                const groupCampaigns = campaigns.filter((c) => c.groupId === group.id)
                if (groupCampaigns.length === 0) return null
                return (
                  <div key={group.id} style={{ marginBottom: '2rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        color: '#6366f1',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      <FaFolder size={14} />
                      {group.name} ({groupCampaigns.length})
                    </div>
                    <div className="grid-container">
                      {groupCampaigns.map((campaign) => (
                        <div key={campaign.id} className="campaign-card group">
                          <div className="card-header">
                            <div className="card-icon">
                              <FaWhatsapp size={20} />
                            </div>
                            <div className="card-actions">
                              <button
                                onClick={() => handleEdit(campaign)}
                                className="action-btn"
                                title="Edit"
                              >
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
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background:
                                    campaign.language === 'bn'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(99, 102, 241, 0.15)',
                                  color: campaign.language === 'bn' ? '#6ee7b7' : '#a5b4fc'
                                }}
                              >
                                {campaign.language === 'bn' ? '🇧🇩 বাংলা' : '🇺🇸 EN'}
                              </span>
                              <span className="platform-badge">{campaign.platform}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Ungrouped Campaigns */}
              {campaigns.some((c) => !c.groupId) && (
                <div>
                  <div
                    style={{
                      marginBottom: '1rem',
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    Ungrouped Campaigns ({campaigns.filter((c) => !c.groupId).length})
                  </div>
                  <div className="grid-container">
                    {campaigns
                      .filter((c) => !c.groupId)
                      .map((campaign) => (
                        <div key={campaign.id} className="campaign-card group">
                          <div className="card-header">
                            <div className="card-icon">
                              <FaWhatsapp size={20} />
                            </div>
                            <div className="card-actions">
                              <button
                                onClick={() => handleEdit(campaign)}
                                className="action-btn"
                                title="Edit"
                              >
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
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background:
                                    campaign.language === 'bn'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(99, 102, 241, 0.15)',
                                  color: campaign.language === 'bn' ? '#6ee7b7' : '#a5b4fc'
                                }}
                              >
                                {campaign.language === 'bn' ? '🇧🇩 বাংলা' : '🇺🇸 EN'}
                              </span>
                              <span className="platform-badge">{campaign.platform}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        // Groups Tab
        <>
          {loading ? (
            <div className="loading-container">Loading groups...</div>
          ) : campaignGroups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaFolder size={32} />
              </div>
              <h3 className="empty-title">No Groups Yet</h3>
              <p className="empty-desc">Create groups to organize your campaigns better.</p>
              <button onClick={handleCreateGroup} className="btn-secondary">
                Create Group
              </button>
            </div>
          ) : (
            <div className="grid-container">
              {campaignGroups.map((group) => {
                const campaignCount = campaigns.filter((c) => c.groupId === group.id).length
                return (
                  <div
                    key={group.id}
                    className="campaign-card group"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(99, 102, 241, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)'
                    }}
                  >
                    {/* Background decoration */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        width: '80px',
                        height: '80px',
                        background:
                          'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                        borderRadius: '50%',
                        pointerEvents: 'none'
                      }}
                    />

                    <div className="card-header" style={{ marginBottom: '1rem' }}>
                      <div
                        className="card-icon"
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                        }}
                      >
                        <FaFolder size={22} style={{ color: 'white' }} />
                      </div>
                      <div className="card-actions">
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="action-btn"
                          title="Edit"
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                            e.currentTarget.style.color = '#6366f1'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'
                            e.currentTarget.style.color = '#94a3b8'
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="action-btn delete"
                          title="Delete"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                            e.currentTarget.style.color = '#ef4444'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                            e.currentTarget.style.color = '#94a3b8'
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    <h3
                      className="card-title"
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#f1f5f9'
                      }}
                    >
                      {group.name}
                    </h3>

                    {group.description && (
                      <div className="card-content-box" style={{ marginBottom: '1rem' }}>
                        <p
                          className="card-desc"
                          style={{
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
                            color: '#cbd5e1'
                          }}
                        >
                          {group.description}
                        </p>
                        <div className="fade-overlay" />
                      </div>
                    )}

                    <div
                      className="card-footer"
                      style={{
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(148, 163, 184, 0.1)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.85rem',
                          color: '#94a3b8'
                        }}
                      >
                        <FaWhatsapp size={14} />
                        <span>
                          {campaignCount} campaign{campaignCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span
                        className="platform-badge"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                          color: '#a5b4fc',
                          fontWeight: '500',
                          fontSize: '0.8rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px'
                        }}
                      >
                        Group
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
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
