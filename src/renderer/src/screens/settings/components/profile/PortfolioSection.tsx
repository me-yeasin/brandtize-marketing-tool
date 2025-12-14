import { useState, type JSX } from 'react'
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi'

import { Button, Input } from '../../../../components/ui'
import type { AgencyProfile } from '../../types'

interface PortfolioSectionProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
}

function PortfolioSection({ profile, onProfileChange }: PortfolioSectionProps): JSX.Element {
  const [newTechByProject, setNewTechByProject] = useState<Record<string, string>>({})

  const addProject = (): void => {
    const newProjectId = `project-${Date.now()}`
    const newProject = {
      id: newProjectId,
      title: '',
      description: '',
      technologies: []
    }
    onProfileChange({ ...profile, portfolio: [...profile.portfolio, newProject] })
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
    setNewTechByProject((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const addTechToProject = (projectId: string): void => {
    const techToAdd = newTechByProject[projectId]?.trim()
    if (!techToAdd) return
    const project = profile.portfolio.find((p) => p.id === projectId)
    if (!project) return
    updateProject(projectId, { technologies: [...project.technologies, techToAdd] })
    setNewTechByProject((prev) => ({ ...prev, [projectId]: '' }))
  }

  const removeTechFromProject = (projectId: string, techIndex: number): void => {
    const project = profile.portfolio.find((p) => p.id === projectId)
    if (!project) return
    updateProject(projectId, {
      technologies: project.technologies.filter((_, index) => index !== techIndex)
    })
  }

  return (
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
                  value={newTechByProject[project.id] ?? ''}
                  onChange={(e) =>
                    setNewTechByProject((prev) => ({ ...prev, [project.id]: e.target.value }))
                  }
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
  )
}

export { PortfolioSection }
