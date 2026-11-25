import { describe, expect, it, vi } from 'vitest'
import { profileKey, readProfile } from './profileStore'

describe('local profile storage', () => {
  it('reports a missing record without an error', () => {
    expect(readProfile(() => ({ getItem: () => null }))).toEqual({ status: 'ready', profile: null })
  })

  it('reads a Stage 01 profile and normalizes its nickname', () => {
    const getItem = vi.fn(() => '{"schemaVersion":1,"avatar":"girl","nickname":" Żółwik "}')
    expect(readProfile(() => ({ getItem }))).toEqual({ status: 'ready', profile: { avatar: 'girl', nickname: 'Żółwik' } })
    expect(getItem).toHaveBeenCalledWith(profileKey)
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

  it('handles errors accessing legacy storage', () => {
    const denied = () => { throw new Error('Storage blocked') }
    expect(readProfile(denied)).toEqual({ status: 'unavailable', profile: null })
  })
})
