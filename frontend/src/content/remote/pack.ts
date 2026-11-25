import { mathQuestions } from '../../core/education'
import { challenges, contentVersion, type Challenge } from '../pack'

export const maxPackBytes = 16_384
export const packIdPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
export const checksumPattern = /^[a-f0-9]{64}$/

type Variant = { id: string; challengeId: string; seed: number }
export type EducationalPack = {
  schemaVersion: 1
  packId: string
  version: number
  gameContentVersion: number
  locale: 'pl'
  variants: Variant[]
}

export type VerifiedPack = { bytes: Uint8Array<ArrayBuffer>; sha256: string; pack: EducationalPack }

export function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && packIdPattern.test(value) && !/\s/.test(value)
}

export function integer(value: unknown, min: number, max = 2_147_483_647): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactFields(value: unknown, fields: string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === fields.length &&
    fields.every((field) => Object.prototype.hasOwnProperty.call(value, field))
}

export function decodePack(value: unknown): EducationalPack {
  if (!exactFields(value, ['schemaVersion', 'packId', 'version', 'gameContentVersion', 'locale', 'variants']) ||
      value.schemaVersion !== 1 || !identifier(value.packId) || !integer(value.version, 1) ||
      value.gameContentVersion !== contentVersion || value.locale !== 'pl' ||
      !Array.isArray(value.variants) || value.variants.length < 1 || value.variants.length > 32) {
    throw new Error('Invalid educational pack')
  }
  const ids = new Set<string>()
  const variants = value.variants.map((variant: unknown): Variant => {
    if (!exactFields(variant, ['id', 'challengeId', 'seed']) || !identifier(variant.id) ||
        !identifier(variant.challengeId) || !integer(variant.seed, 0, 0xffffffff) || ids.has(variant.id)) {
      throw new Error('Invalid educational variant')
    }
    const bundled: Challenge | undefined = (challenges as Record<string, Challenge>)[variant.challengeId]
    if (bundled?.type !== 'MATH_CHOICE') throw new Error('Unknown math challenge')
    const { maximum } = bundled
    if (mathQuestions({ ...bundled, seed: variant.seed }).some(({ left, right, answer, options }) =>
      !integer(left, 0, maximum) || !integer(right, 0, maximum) || !integer(answer, 0, maximum) ||
      options.length !== 3 || new Set(options).size !== 3 || !options.includes(answer) ||
      options.some((option) => !integer(option, 0, maximum)))) {
      throw new Error('Invalid generated question')
    }
    ids.add(variant.id)
    return { id: variant.id, challengeId: variant.challengeId, seed: variant.seed }
  })
  return { schemaVersion: 1, packId: value.packId, version: value.version, gameContentVersion: contentVersion, locale: 'pl', variants }
}

export async function verifyPack(bytes: Uint8Array<ArrayBuffer>, sha256: string): Promise<VerifiedPack> {
  if (bytes.length < 1 || bytes.length > maxPackBytes || !checksumPattern.test(sha256) || !globalThis.crypto?.subtle) {
    throw new Error('Invalid pack integrity metadata')
  }
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))
  const hex = Array.from(digest, (value) => value.toString(16).padStart(2, '0')).join('')
  if (hex !== sha256) throw new Error('Pack checksum mismatch')
  const pack = decodePack(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  return { bytes, sha256, pack }
}

export function challengeAttempt(challengeId: keyof typeof challenges, pack: EducationalPack | null,
  pick = Math.random): Challenge {
  const challenge = challenges[challengeId]
  if (challenge.type !== 'MATH_CHOICE' || !pack) return challenge
  const variants = pack.variants.filter((variant) => variant.challengeId === challengeId)
  if (!variants.length) return challenge
  return { ...challenge, seed: variants[Math.floor(pick() * variants.length)].seed }
}
