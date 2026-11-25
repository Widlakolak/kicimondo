import { describe, expect, it, vi } from 'vitest'
import { profileKey, readProfile, writeProfile } from './profileStore'

describe('local profile storage', () => {
  it('reports a missing record without an error', () => {
    expect(readProfile(() => ({ getItem: () => null }))).toEqual({ status: 'ready', profile: null })
  })

  it('round trips the current schema and updates the avatar explicitly', () => {
    const records = new Map<string, string>()
    const storage = () => ({
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => { records.set(key, value) },
    })
    expect(writeProfile(storage, { avatar: 'boy', nickname: 'Żółwik' })).toBe(true)
    expect(writeProfile(storage, { avatar: 'girl', nickname: 'Żółwik' })).toBe(true)
    expect(JSON.parse(records.get(profileKey)!)).toEqual({ schemaVersion: 1, avatar: 'girl', nickname: 'Żółwik' })
    expect(readProfile(storage)).toEqual({ status: 'ready', profile: { avatar: 'girl', nickname: 'Żółwik' } })
  })

  it.each([
    '{bad json', 'null', '{"schemaVersion":2,"avatar":"boy","nickname":"Żółwik"}',
    '{"schemaVersion":1,"avatar":"other","nickname":"Żółwik"}',
    '{"schemaVersion":1,"avatar":"girl","nickname":" "}',
  ])('rejects invalid stored data without changing it (%s)', (raw) => {
    const setItem = vi.fn()
    expect(readProfile(() => ({ getItem: () => raw, setItem }))).toEqual({ status: 'invalid', profile: null })
    expect(setItem).not.toHaveBeenCalled()
  })

  it('handles errors accessing storage and writing a profile', () => {
    const denied = () => { throw new Error('Storage blocked') }
    expect(readProfile(denied)).toEqual({ status: 'unavailable', profile: null })
    expect(writeProfile(() => ({ setItem: denied }), { avatar: 'boy', nickname: 'Żółwik' })).toBe(false)
  })
})
