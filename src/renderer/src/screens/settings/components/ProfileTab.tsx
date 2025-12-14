import type React from 'react'
import { Button } from '../../../components/ui'
import { isProfileComplete } from '../utils'
import type { AgencyProfile } from '../types'
import { BasicInfoSection } from './profile/BasicInfoSection'
import { ServicesSection } from './profile/ServicesSection'
import { SkillsSection } from './profile/SkillsSection'
import { PortfolioSection } from './profile/PortfolioSection'
import { ContactSection } from './profile/ContactSection'
import { SocialLinksSection } from './profile/SocialLinksSection'

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
  return (
    <div className="max-w-4xl space-y-6 mx-auto">
      <div>
        <h2 className="text-lg font-medium text-text-main">Agency / Freelancer Profile</h2>
        <p className="mt-1 text-sm text-text-muted">
          Set up your profile to help the email agent find relevant clients
        </p>
      </div>

      <BasicInfoSection profile={profile} onProfileChange={onProfileChange} />
      <ServicesSection profile={profile} onProfileChange={onProfileChange} />
      <SkillsSection profile={profile} onProfileChange={onProfileChange} />
      <PortfolioSection profile={profile} onProfileChange={onProfileChange} />
      <ContactSection profile={profile} onProfileChange={onProfileChange} />
      <SocialLinksSection profile={profile} onProfileChange={onProfileChange} />

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
