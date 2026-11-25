import { avatars, validateNickname, type Profile } from '../core/profile'

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
    if (data && typeof data === 'object' && 'schemaVersion' in data && data.schemaVersion === 1 &&
        'avatar' in data && 'nickname' in data && typeof data.nickname === 'string') {
      const avatar = avatars.find((option) => option === data.avatar)
      const name = validateNickname(data.nickname)
      if (avatar && 'nickname' in name) {
        return { status: 'ready', profile: { avatar, nickname: name.nickname } }
      }
    }
  } catch {
    // A broken save can be replaced by saving a new profile.
  }
  return { status: 'invalid', profile: null }
}

export function writeProfile(storage: () => Pick<Storage, 'setItem'>, profile: Profile): boolean {
  try {
    storage().setItem(profileKey, JSON.stringify({ schemaVersion: 1, ...profile }))
    return true
  } catch {
    return false
  }
}
