export const avatars = ['boy', 'girl'] as const
export type Avatar = (typeof avatars)[number]
export type Profile = { nickname: string; avatar: Avatar }

export function validateNickname(value: string): { nickname: string } | { error: 'empty' | 'tooLong' } {
  const nickname = value.trim()
  if (!nickname) return { error: 'empty' }
  if ([...nickname].length > 20) return { error: 'tooLong' }
  return { nickname }
}
