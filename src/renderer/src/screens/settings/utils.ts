import type { AgencyProfile } from './types'

export function isProfileComplete(profile: AgencyProfile): boolean {
  const typeOk = profile.type === 'agency' || profile.type === 'freelancer'
  const nameOk = profile.name.trim().length > 0
  const servicesOk = profile.services.some((service) => service.trim().length > 0)
  return typeOk && nameOk && servicesOk
}
