import { useState, type JSX } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'

import { Button, Input } from '../../../../components/ui'
import type { AgencyProfile } from '../../types'

interface SkillsSectionProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
}

function SkillsSection({ profile, onProfileChange }: SkillsSectionProps): JSX.Element {
  const [newSkill, setNewSkill] = useState('')

  const addSkill = (): void => {
    if (!newSkill.trim()) return
    onProfileChange({ ...profile, skills: [...profile.skills, newSkill.trim()] })
    setNewSkill('')
  }

  const removeSkill = (index: number): void => {
    onProfileChange({ ...profile, skills: profile.skills.filter((_, i) => i !== index) })
  }

  return (
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
  )
}

export { SkillsSection }
