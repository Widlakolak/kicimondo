export const avatars = ['boy', 'girl'] as const
export type Avatar = (typeof avatars)[number]
export type Profile = { nickname: string; avatar: Avatar }

export function validateNickname(value: string): { nickname: string } | { error: 'empty' | 'tooLong' } {
  const nickname = value.trim()
  if (!nickname) return { error: 'empty' }
  if ([...nickname].length > 20) return { error: 'tooLong' }
  return { nickname }
}

export function parseProfile(data: unknown): Profile | null {
  if (!data || typeof data !== 'object' || !('avatar' in data) ||
      !('nickname' in data) || typeof data.nickname !== 'string') return null
  const avatar = avatars.find((option) => option === data.avatar)
  const name = validateNickname(data.nickname)
  return avatar && 'nickname' in name ? { avatar, nickname: name.nickname } : null
}
