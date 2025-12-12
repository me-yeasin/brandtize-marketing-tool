import { useEffect, useState } from 'react'
import {
  FiCpu,
  FiSearch,
  FiZap,
  FiChevronDown,
  FiUser,
  FiPlus,
  FiTrash2,
  FiX
} from 'react-icons/fi'
import { Button, Input } from '../components/ui'

type SettingsTab = 'profile' | 'ai-provider' | 'search-api'

interface PortfolioProject {
  id: string
  title: string
  description: string
  clientName?: string
  projectUrl?: string
  technologies: string[]
  completedAt?: string
}

interface AgencyProfile {
  type: 'agency' | 'freelancer'
  name: string
  tagline: string
  bio: string
  services: string[]
  skills: string[]
  yearsOfExperience: number
  portfolio: PortfolioProject[]
  contact: {
    email: string
    phone: string
    website: string
    address: string
    city: string
    country: string
  }
  social: {
    linkedin?: string
    twitter?: string
    github?: string
    dribbble?: string
    behance?: string
  }
}

const DEFAULT_PROFILE: AgencyProfile = {
  type: 'freelancer',
  name: '',
  tagline: '',
  bio: '',
  services: [],
  skills: [],
  yearsOfExperience: 0,
  portfolio: [],
  contact: {
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    country: ''
  },
  social: {}
}

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B' },
  { id: 'openai/gpt-oss-safeguard-20b', name: 'GPT OSS Safeguard 20B' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct 0905' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct' },
  { id: 'meta-llama/llama-prompt-guard-2-86m', name: 'Llama Prompt Guard 2 86M' },
  { id: 'meta-llama/llama-prompt-guard-2-22m', name: 'Llama Prompt Guard 2 22M' },
  { id: 'meta-llama/llama-guard-4-12b', name: 'Llama Guard 4 12B' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' }
]

function SettingsScreen(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [groqKey, setGroqKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')
  const [hasGroqKey, setHasGroqKey] = useState(false)
  const [hasSerperKey, setHasSerperKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [profile, setProfile] = useState<AgencyProfile>(DEFAULT_PROFILE)
  const [hasProfile, setHasProfile] = useState(false)
  const [newService, setNewService] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [newTech, setNewTech] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  useEffect(() => {
    window.api.getApiKeys().then((keys) => {
      setHasGroqKey(keys.hasGroqKey)
      setHasSerperKey(keys.hasSerperKey)
    })
    window.api.getSelectedModel().then((model: string) => {
      setSelectedModel(model)
    })
    window.api.getProfile().then((p) => {
      setProfile(p)
      setHasProfile(p.name.trim().length > 0)
    })
  }, [])

  const saveGroqKey = async (): Promise<void> => {
    if (!groqKey.trim()) return
    setSaving(true)
    try {
      await window.api.setGroqApiKey(groqKey.trim())
      setHasGroqKey(true)
      setGroqKey('')
      setMessage({ type: 'success', text: 'Groq API key saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save Groq API key' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const saveSerperKey = async (): Promise<void> => {
    if (!serperKey.trim()) return
    setSaving(true)
    try {
      await window.api.setSerperApiKey(serperKey.trim())
      setHasSerperKey(true)
      setSerperKey('')
      setMessage({ type: 'success', text: 'Serper API key saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save Serper API key' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const saveProfile = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setProfile(profile)
      setHasProfile(profile.name.trim().length > 0)
      setMessage({ type: 'success', text: 'Profile saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save profile' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const addService = (): void => {
    if (newService.trim()) {
      setProfile({ ...profile, services: [...profile.services, newService.trim()] })
      setNewService('')
    }
  }

  const removeService = (index: number): void => {
    setProfile({ ...profile, services: profile.services.filter((_, i) => i !== index) })
  }

  const addSkill = (): void => {
    if (newSkill.trim()) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number): void => {
    setProfile({ ...profile, skills: profile.skills.filter((_, i) => i !== index) })
  }

  const addProject = (): void => {
    const newProject: PortfolioProject = {
      id: `project-${Date.now()}`,
      title: '',
      description: '',
      technologies: []
    }
    setProfile({ ...profile, portfolio: [...profile.portfolio, newProject] })
    setEditingProjectId(newProject.id)
  }

  const updateProject = (id: string, updates: Partial<PortfolioProject>): void => {
    setProfile({
      ...profile,
      portfolio: profile.portfolio.map((p) => (p.id === id ? { ...p, ...updates } : p))
    })
  }

  const removeProject = (id: string): void => {
    setProfile({ ...profile, portfolio: profile.portfolio.filter((p) => p.id !== id) })
    if (editingProjectId === id) setEditingProjectId(null)
  }

  const addTechToProject = (projectId: string): void => {
    if (newTech.trim()) {
      const project = profile.portfolio.find((p) => p.id === projectId)
      if (project) {
        updateProject(projectId, { technologies: [...project.technologies, newTech.trim()] })
        setNewTech('')
      }
    }
  }

  const removeTechFromProject = (projectId: string, techIndex: number): void => {
    const project = profile.portfolio.find((p) => p.id === projectId)
    if (project) {
      updateProject(projectId, {
        technologies: project.technologies.filter((_, i) => i !== techIndex)
      })
    }
  }

  const tabs = [
    { id: 'profile' as const, label: 'Agency Profile', icon: <FiUser size={16} /> },
    { id: 'ai-provider' as const, label: 'AI Provider', icon: <FiCpu size={16} /> },
    { id: 'search-api' as const, label: 'Web Search', icon: <FiSearch size={16} /> }
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface/20 px-6 py-4">
        <h1 className="text-xl font-semibold text-text-main">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Configure API keys and model preferences</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border bg-surface/10 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-muted hover:bg-surface hover:text-text-main'
                ].join(' ')}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'profile' && hasProfile && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
                )}
                {tab.id === 'ai-provider' && hasGroqKey && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
                )}
                {tab.id === 'search-api' && hasSerperKey && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
                )}
              </button>
            ))}
          </nav>

          {/* <div className="mt-6 rounded-lg border border-border bg-surface/20 p-3">
            <h3 className="text-xs font-medium text-text-main mb-2">Status</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={hasGroqKey ? 'text-green-400' : 'text-red-400'}>
                  {hasGroqKey ? <FiCheck size={12} /> : <FiX size={12} />}
                </span>
                <span className="text-text-muted">AI Provider</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasSerperKey ? 'text-green-400' : 'text-red-400'}>
                  {hasSerperKey ? <FiCheck size={12} /> : <FiX size={12} />}
                </span>
                <span className="text-text-muted">Web Search</span>
              </div>
            </div>
          </div> */}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {message && (
            <div
              className={[
                'mb-6 rounded-md px-4 py-3 text-sm',
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              ].join(' ')}
            >
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-4xl space-y-6 mx-auto">
              <div>
                <h2 className="text-lg font-medium text-text-main">Agency / Freelancer Profile</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Set up your profile to help the email agent find relevant clients
                </p>
              </div>

              {/* Profile Type */}
              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <h3 className="font-medium text-text-main flex items-center gap-2">
                  <FiUser size={16} className="text-primary" />
                  Basic Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Profile Type</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, type: 'freelancer' })}
                        className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
                          profile.type === 'freelancer'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-muted hover:border-text-muted'
                        }`}
                      >
                        Freelancer
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, type: 'agency' })}
                        className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
                          profile.type === 'agency'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-muted hover:border-text-muted'
                        }`}
                      >
                        Agency
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      {profile.type === 'agency' ? 'Agency Name' : 'Your Name'}
                    </label>
                    <Input
                      placeholder={profile.type === 'agency' ? 'Acme Digital Agency' : 'John Doe'}
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-muted mb-2">Tagline</label>
                    <Input
                      placeholder="We build amazing digital experiences"
                      value={profile.tagline}
                      onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-muted mb-2">Bio / Description</label>
                    <textarea
                      placeholder="Tell potential clients about yourself or your agency..."
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-surface/30 px-4 py-3 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      Years of Experience
                    </label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="5"
                      value={profile.yearsOfExperience || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <h3 className="font-medium text-text-main">Services Offered</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Web Development, UI/UX Design"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addService()}
                  />
                  <Button variant="outline" onClick={addService}>
                    <FiPlus size={16} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.services.map((service, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                    >
                      {service}
                      <button type="button" onClick={() => removeService(index)}>
                        <FiX size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <h3 className="font-medium text-text-main">Skills & Expertise</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., React, Node.js, Figma"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button variant="outline" onClick={addSkill}>
                    <FiPlus size={16} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-400"
                    >
                      {skill}
                      <button type="button" onClick={() => removeSkill(index)}>
                        <FiX size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Portfolio */}
              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-text-main">Portfolio Projects</h3>
                  <Button variant="outline" onClick={addProject}>
                    <FiPlus size={14} className="mr-1" /> Add Project
                  </Button>
                </div>

                <div className="space-y-4">
                  {profile.portfolio.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-lg border border-border bg-background/50 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <Input
                          placeholder="Project Title"
                          value={project.title}
                          onChange={(e) => updateProject(project.id, { title: e.target.value })}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeProject(project.id)}
                          className="ml-2 p-2 text-red-400 hover:text-red-300"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>

                      <textarea
                        placeholder="Project description..."
                        value={project.description}
                        onChange={(e) => updateProject(project.id, { description: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-surface/30 px-4 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Client Name"
                          value={project.clientName || ''}
                          onChange={(e) =>
                            updateProject(project.id, { clientName: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Project URL"
                          value={project.projectUrl || ''}
                          onChange={(e) =>
                            updateProject(project.id, { projectUrl: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="Add technology..."
                            value={editingProjectId === project.id ? newTech : ''}
                            onChange={(e) => {
                              setEditingProjectId(project.id)
                              setNewTech(e.target.value)
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && addTechToProject(project.id)}
                          />
                          <Button variant="ghost" onClick={() => addTechToProject(project.id)}>
                            <FiPlus size={14} />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.map((tech, techIndex) => (
                            <span
                              key={techIndex}
                              className="flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-xs text-text-muted"
                            >
                              {tech}
                              <button
                                type="button"
                                onClick={() => removeTechFromProject(project.id, techIndex)}
                              >
                                <FiX size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {profile.portfolio.length === 0 && (
                    <p className="text-center text-sm text-text-muted py-4">
                      No projects added yet. Click &quot;Add Project&quot; to showcase your work.
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <h3 className="font-medium text-text-main">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Email</label>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      value={profile.contact.email}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contact: { ...profile.contact, email: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Phone</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={profile.contact.phone}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contact: { ...profile.contact, phone: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Website</label>
                    <Input
                      placeholder="https://yourwebsite.com"
                      value={profile.contact.website}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contact: { ...profile.contact, website: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Address</label>
                    <Input
                      placeholder="123 Main Street"
                      value={profile.contact.address}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contact: { ...profile.contact, address: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">City</label>
                    <Input
                      placeholder="New York"
                      value={profile.contact.city}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contact: { ...profile.contact, city: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Country</label>
                    <Input
                      placeholder="United States"
                      value={profile.contact.country}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contact: { ...profile.contact, country: e.target.value }
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <h3 className="font-medium text-text-main">Social Links</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">LinkedIn</label>
                    <Input
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={profile.social.linkedin || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          social: { ...profile.social, linkedin: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Twitter / X</label>
                    <Input
                      placeholder="https://twitter.com/yourhandle"
                      value={profile.social.twitter || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          social: { ...profile.social, twitter: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">GitHub</label>
                    <Input
                      placeholder="https://github.com/yourusername"
                      value={profile.social.github || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          social: { ...profile.social, github: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Dribbble</label>
                    <Input
                      placeholder="https://dribbble.com/yourusername"
                      value={profile.social.dribbble || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          social: { ...profile.social, dribbble: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Behance</label>
                    <Input
                      placeholder="https://behance.net/yourusername"
                      value={profile.social.behance || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          social: { ...profile.social, behance: e.target.value }
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button variant="primary" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'ai-provider' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-medium text-text-main">AI Provider Configuration</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Configure your Groq API key and select the model for email research
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                      <FiZap className="text-xl text-orange-400" size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-main">Groq API</h3>
                      <p className="text-xs text-text-muted">Ultra-fast LLM inference</p>
                    </div>
                  </div>
                  {hasGroqKey && (
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                      Connected
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm text-text-muted">API Key</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="password"
                        placeholder={hasGroqKey ? '••••••••••••••••' : 'gsk_...'}
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={saveGroqKey}
                      disabled={saving || !groqKey.trim()}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted">
                    Get your free API key from{' '}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      console.groq.com
                    </a>
                  </p>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <label className="block text-sm text-text-muted">Model Selection</label>
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={async (e) => {
                        const model = e.target.value
                        setSelectedModel(model)
                        await window.api.setSelectedModel(model)
                        setMessage({ type: 'success', text: 'Model updated successfully!' })
                        setTimeout(() => setMessage(null), 3000)
                      }}
                      className="w-full appearance-none rounded-lg border border-border bg-surface/30 px-4 py-3 pr-10 text-sm text-text-main transition-colors hover:bg-surface/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {GROQ_MODELS.map((model) => (
                        <option key={model.id} value={model.id} className="bg-background">
                          {model.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FiChevronDown className="text-text-muted" size={16} />
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    Selected model will be used for all agent operations
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search-api' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-lg font-medium text-text-main">Web Search Configuration</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Configure Serper API for web search functionality
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                      <FiSearch className="text-xl text-blue-400" size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-main">Serper API</h3>
                      <p className="text-xs text-text-muted">Google Search API for research</p>
                    </div>
                  </div>
                  {hasSerperKey && (
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                      Connected
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm text-text-muted">API Key</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="password"
                        placeholder={
                          hasSerperKey ? '••••••••••••••••' : 'Enter your Serper API key'
                        }
                        value={serperKey}
                        onChange={(e) => setSerperKey(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={saveSerperKey}
                      disabled={saving || !serperKey.trim()}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted">
                    Get your API key from{' '}
                    <a
                      href="https://serper.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      serper.dev
                    </a>{' '}
                    — 2,500 free searches per month
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { SettingsScreen }
