import type React from 'react'

import { Input } from '../../../../components/ui'
import type { AgencyProfile } from '../../types'

interface SocialLinksSectionProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
}

function SocialLinksSection({
  profile,
  onProfileChange
}: SocialLinksSectionProps): React.JSX.Element {
  return (
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
  )
}

export { SocialLinksSection }
