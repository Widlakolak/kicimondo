import { parseProfile, type Profile } from '../core/profile'

export const profileKey = 'kicimondo.profile'
type LoadResult =
  | { status: 'ready'; profile: Profile | null }
  | { status: 'invalid' | 'unavailable'; profile: null }

export function readProfile(storage: () => Pick<Storage, 'getItem'>): LoadResult {
  let raw: string | null
  try {
    raw = storage().getItem(profileKey)
  } catch {
    return { status: 'unavailable', profile: null }
  }
  if (raw === null) return { status: 'ready', profile: null }

  try {
    const data: unknown = JSON.parse(raw)
    if (data && typeof data === 'object' && 'schemaVersion' in data && data.schemaVersion === 1) {
      const profile = parseProfile(data)
      if (profile) return { status: 'ready', profile }
    }
  } catch {
    // A broken save can be replaced by saving a new profile.
  }
  return { status: 'invalid', profile: null }
}
