import type React from 'react'
import { FiUser } from 'react-icons/fi'

import { Input } from '../../../../components/ui'
import type { AgencyProfile } from '../../types'

interface BasicInfoSectionProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
}

function BasicInfoSection({ profile, onProfileChange }: BasicInfoSectionProps): React.JSX.Element {
  return (
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
              onProfileChange({ ...profile, yearsOfExperience: parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
      </div>
    </div>
  )
}

export { BasicInfoSection }
