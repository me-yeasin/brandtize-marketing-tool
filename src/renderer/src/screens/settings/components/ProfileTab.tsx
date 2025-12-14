import type React from 'react'
import { useState } from 'react'
import { FiPlus, FiTrash2, FiUser, FiX } from 'react-icons/fi'

import { Button, Input } from '../../../components/ui'
import { isProfileComplete } from '../utils'
import type { AgencyProfile } from '../types'

interface ProfileTabProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
  onSaveProfile: () => Promise<void>
  saving: boolean
  hasProfile: boolean
}

function ProfileTab({
  profile,
  onProfileChange,
  onSaveProfile,
  saving,
  hasProfile
}: ProfileTabProps): React.JSX.Element {
  const [newService, setNewService] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [newTech, setNewTech] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  const addService = (): void => {
    if (newService.trim()) {
      onProfileChange({ ...profile, services: [...profile.services, newService.trim()] })
      setNewService('')
    }
  }

  const removeService = (index: number): void => {
    onProfileChange({ ...profile, services: profile.services.filter((_, i) => i !== index) })
  }

  const addSkill = (): void => {
    if (newSkill.trim()) {
      onProfileChange({ ...profile, skills: [...profile.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number): void => {
    onProfileChange({ ...profile, skills: profile.skills.filter((_, i) => i !== index) })
  }

  const addProject = (): void => {
    const newProjectId = `project-${Date.now()}`
    const newProject = {
      id: newProjectId,
      title: '',
      description: '',
      technologies: []
    }
    onProfileChange({ ...profile, portfolio: [...profile.portfolio, newProject] })
    setEditingProjectId(newProjectId)
  }

  const updateProject = (
    id: string,
    updates: Partial<AgencyProfile['portfolio'][number]>
  ): void => {
    onProfileChange({
      ...profile,
      portfolio: profile.portfolio.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      )
    })
  }

  const removeProject = (id: string): void => {
    onProfileChange({
      ...profile,
      portfolio: profile.portfolio.filter((project) => project.id !== id)
    })
    if (editingProjectId === id) setEditingProjectId(null)
  }

  const addTechToProject = (projectId: string): void => {
    if (!newTech.trim()) return
    const project = profile.portfolio.find((p) => p.id === projectId)
    if (!project) return
    updateProject(projectId, { technologies: [...project.technologies, newTech.trim()] })
    setNewTech('')
  }

  const removeTechFromProject = (projectId: string, techIndex: number): void => {
    const project = profile.portfolio.find((p) => p.id === projectId)
    if (!project) return
    updateProject(projectId, {
      technologies: project.technologies.filter((_, index) => index !== techIndex)
    })
  }

  return (
    <div className="max-w-4xl space-y-6 mx-auto">
      <div>
        <h2 className="text-lg font-medium text-text-main">Agency / Freelancer Profile</h2>
        <p className="mt-1 text-sm text-text-muted">
          Set up your profile to help the email agent find relevant clients
        </p>
      </div>

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
                onClick={() => onProfileChange({ ...profile, type: 'freelancer' })}
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
                onClick={() => onProfileChange({ ...profile, type: 'agency' })}
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
              onChange={(e) => onProfileChange({ ...profile, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Tagline</label>
            <Input
              placeholder="We build amazing digital experiences"
              value={profile.tagline}
              onChange={(e) => onProfileChange({ ...profile, tagline: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Bio / Description</label>
            <textarea
              placeholder="Tell potential clients about yourself or your agency..."
              value={profile.bio}
              onChange={(e) => onProfileChange({ ...profile, bio: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface/30 px-4 py-3 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Years of Experience</label>
            <Input
              type="number"
              min={0}
              placeholder="5"
              value={profile.yearsOfExperience || ''}
              onChange={(e) =>
                onProfileChange({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </div>

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
                  onChange={(e) => updateProject(project.id, { clientName: e.target.value })}
                />
                <Input
                  placeholder="Project URL"
                  value={project.projectUrl || ''}
                  onChange={(e) => updateProject(project.id, { projectUrl: e.target.value })}
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
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
                  ...profile,
                  contact: { ...profile.contact, country: e.target.value }
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface/30 p-6 space-y-4">
        <h3 className="font-medium text-text-main">Social Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-2">LinkedIn</label>
            <Input
              placeholder="https://linkedin.com/in/yourprofile"
              value={profile.social.linkedin || ''}
              onChange={(e) =>
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
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
                onProfileChange({
                  ...profile,
                  social: { ...profile.social, behance: e.target.value }
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={onSaveProfile}
          disabled={saving || !isProfileComplete(profile)}
        >
          {saving ? 'Saving...' : hasProfile ? 'Update Profile' : 'Save Profile'}
        </Button>
      </div>
    </div>
  )
}

export { ProfileTab }
