import type React from 'react'

import { Input } from '../../../../components/ui'
import type { AgencyProfile } from '../../types'

interface ContactSectionProps {
  profile: AgencyProfile
  onProfileChange: (profile: AgencyProfile) => void
}

function ContactSection({ profile, onProfileChange }: ContactSectionProps): React.JSX.Element {
  return (
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
  )
}

export { ContactSection }
