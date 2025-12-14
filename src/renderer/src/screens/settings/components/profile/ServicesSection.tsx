import { useState, type JSX } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'

import { Button, Input } from '../../../../components/ui'
import type { AgencyProfile } from '../../types'

interface ServicesSectionProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
}

function ServicesSection({ profile, onProfileChange }: ServicesSectionProps): JSX.Element {
  const [newService, setNewService] = useState('')

  const addService = (): void => {
    if (!newService.trim()) return
    onProfileChange({ ...profile, services: [...profile.services, newService.trim()] })
    setNewService('')
  }

  const removeService = (index: number): void => {
    onProfileChange({ ...profile, services: profile.services.filter((_, i) => i !== index) })
  }

  return (
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
  )
}

export { ServicesSection }
