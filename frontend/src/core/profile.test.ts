import { describe, expect, it } from 'vitest'
import { validateNickname } from './profile'

describe('nickname validation', () => {
  it('trims the name and preserves Polish characters', () => {
    expect(validateNickname('  Żółwik ')).toEqual({ nickname: 'Żółwik' })
  })

  it('rejects whitespace-only names', () => {
    expect(validateNickname(' \t\n')).toEqual({ error: 'empty' })
  })

  it('counts Unicode code points and accepts up to twenty', () => {
    const name = '🌻'.repeat(20)
    expect(validateNickname(name)).toEqual({ nickname: name })
    expect(validateNickname(name + 'ą')).toEqual({ error: 'tooLong' })
  })
})
