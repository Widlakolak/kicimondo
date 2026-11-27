import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { avatars, validateNickname, type Avatar, type Profile } from './core/profile'
import { paintAvatar } from './game/avatarArt'
import { pl } from './i18n/pl'
import { applyCommand, pointsOf, type Save, type SaveCommand } from './core/progress'
import { createSaveRepository, StaleSaveError, type SaveReceipt } from './storage/saveRepository'
import { minimizeAndroid, watchAndroid } from './platform/android'
import { InstallOptions, useInstallOptions } from './platform/InstallOptions'
import { lockLandscape } from './platform/landscape'
import { OfflineStatus } from './platform/OfflineStatus'
import { configuredContentEndpoint, downloadPack } from './content/remote/download'
import type { VerifiedPack } from './content/remote/pack'
import { createPackStore } from './storage/educationalPacks'

const Room = lazy(() => import('./Room'))

function AvatarPortrait({ avatar }: { avatar: Avatar }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, 16, 24)
    paintAvatar((color, x, y, w, h) => {
      context.fillStyle = '#' + color.toString(16).padStart(6, '0')
      context.fillRect(x, y, w, h)
    }, avatar, 'down', 0)
  }, [avatar])
  return <canvas ref={canvas} width="16" height="24" aria-hidden="true" />
}

function ProfileForm({ initial, busy, onSave, onCancel }: {
  initial: Profile | null
  busy: boolean
  onSave: (profile: Profile) => void
  onCancel?: () => void
}) {
  const [avatar, setAvatar] = useState<Avatar>(initial?.avatar ?? 'boy')
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [error, setError] = useState<keyof typeof pl.nicknameError | null>(null)
  const field = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const result = validateNickname(nickname)
    if ('error' in result) {
      setError(result.error)
      field.current?.focus()
    } else {
      onSave({ avatar, nickname: result.nickname })
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <fieldset>
        <legend>{pl.choose}</legend>
        <div className="avatar-options">
          {avatars.map((option) => (
            <label key={option} className={`avatar-option ${option}${avatar === option ? ' selected' : ''}`}>
              <input type="radio" name="avatar" value={option} checked={avatar === option}
                onChange={() => setAvatar(option)} />
              <span className="avatar-portrait"><AvatarPortrait avatar={option} /></span>
              <span>{pl.avatar[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <div className="field">
          <label htmlFor="nickname">{pl.nickname}</label>
          <input id="nickname" ref={field} value={nickname} autoComplete="off" spellCheck={false}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'nickname-feedback nickname-hint' : 'nickname-hint'}
            onChange={(event) => {
              setNickname(event.target.value)
              setError(null)
            }} />
          <p id="nickname-hint" className="hint">{pl.nicknameHint}</p>
          {error && <p id="nickname-feedback" className="error" role="alert">{pl.nicknameError[error]}</p>}
        </div>
        <div className="profile-actions">
          <button className="primary" type="submit" disabled={busy}>{busy ? pl.saving : pl.start} <span aria-hidden="true">→</span></button>
          {onCancel && <button className="secondary" type="button" disabled={busy} onClick={onCancel}>{pl.cancel}</button>}
        </div>
      </div>
    </form>
  )
}

const repository = createSaveRepository()
const packs = createPackStore()
type Screen = 'loading' | 'welcome' | 'edit' | 'room'
type Notice = keyof typeof pl.save | null
export type Guidance = 'floor' | 'star' | 'task' | 'explore' | null

export function App() {
  const [record, setRecord] = useState<{ save: Save | null; status: Notice; generation: number }>({ save: null, status: null, generation: 0 })
  const current = useRef(record)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const { save, status } = record
  const [selectedPack, setSelectedPack] = useState<VerifiedPack | null>(null)
  const [contentNotice, setContentNotice] = useState<'checking' | 'failed' | null>(null)
  const [screen, setScreen] = useState<Screen>('loading')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [nativeActive, setNativeActive] = useState(true)
  const [guidance, setGuidance] = useState<Guidance>(null)
  const installOptions = useInstallOptions()
  const [controls, setControls] = useState(true)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [adultNotice, setAdultNotice] = useState('')
  const confirmation = useRef<HTMLDialogElement>(null)
  const roomBack = useRef<(() => void) | null>(null)

  const goBack = useEffectEvent(() => {
    if (busyRef.current || screen === 'loading') return
    if (resetStep) setResetStep(0)
    else if (screen === 'room') roomBack.current?.()
    else if (screen === 'edit' && save) setScreen('welcome')
    else minimizeAndroid()
  })

  useEffect(() => watchAndroid(() => goBack(), setNativeActive), [])

  useEffect(() => {
    let active = true
    void Promise.all([repository.load(), packs.load()]).then(([{ save, status, generation }, cachedPack]) => {
      if (!active) return
      current.current = { save, generation, status: status === 'ready' ? null : status }
      setRecord(current.current)
      setSelectedPack(cachedPack)
      setScreen(save ? 'welcome' : 'edit')
    })
    return () => { active = false }
  }, [])

  async function refreshStaleSave() {
    const { save, generation, status } = await repository.load()
    current.current = { save, generation, status: status === 'ready' ? null : status }
    setRecord(current.current)
    setResetStep(0)
    setGuidance(null)
    setAdultNotice(pl.adult.stale)
    setScreen(save ? 'welcome' : 'edit')
  }

  function persist(command: SaveCommand): Promise<SaveReceipt | null> {
    const expected = current.current.generation
    const operation = saveQueue.current.then(async () => {
      const before = current.current
      if (before.generation !== expected) return null
      const temporary = () => {
        const next = applyCommand(before.save, command)
        return { save: next, applied: next !== before.save,
          previousPoints: before.save ? pointsOf(before.save) : 0, durable: false }
      }
      let receipt: SaveReceipt
      let status: Notice = before.status
      if (status === 'invalid' || status === 'unavailable') {
        receipt = temporary()
      } else {
        try {
          receipt = await repository.commit(command, expected)
          status = null
        } catch (error) {
          if (error instanceof StaleSaveError) {
            await refreshStaleSave()
            return null
          }
          receipt = temporary()
          status = 'unavailable'
        }
      }
      current.current = { save: receipt.save, generation: expected, status }
      setRecord(current.current)
      return receipt
    })
    saveQueue.current = operation.catch(() => undefined)
    return operation
  }

  useEffect(() => {
    const dialog = confirmation.current
    if (!dialog) return
    if (resetStep) {
      if (!dialog.open) dialog.showModal()
      dialog.querySelector('button')?.focus()
    } else if (dialog.open) dialog.close()
  }, [resetStep])

  async function resetGame() {
    if (busyRef.current || resetStep !== 2) return
    const expected = current.current.generation
    busyRef.current = true
    setBusy(true)
    setAdultNotice('')
    try {
      await saveQueue.current
      const result = await repository.reset(expected)
      current.current = { save: result.save, generation: result.generation, status: null }
      setRecord(current.current)
      setResetStep(0)
      setGuidance('floor')
      lockLandscape()
      setScreen('room')
    } catch (error) {
      if (error instanceof StaleSaveError) await refreshStaleSave()
      else {
        setResetStep(0)
        setAdultNotice(pl.adult.resetError)
      }
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function commit(command: SaveCommand) {
    // Encounters queue alongside actions without temporarily disabling the controls.
    if (command.type === 'discover') return persist(command)
    if (busyRef.current) return null
    busyRef.current = true
    setBusy(true)
    try {
      return await persist(command)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const api = configuredContentEndpoint()
  async function updatePack(endpoint: string | null) {
    if (screen !== 'welcome' || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setContentNotice('checking')
    try {
      const verified = endpoint ? await downloadPack(endpoint) : null
      await packs.save(verified)
      setSelectedPack(verified)
      setContentNotice(null)
    } catch {
      setContentNotice('failed')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const profile = save?.profile ?? null
  const notice = status ? pl.save[status] : null

  return (
    <main className={screen === 'room' ? 'shell gameplay' : 'shell'}>
      <div className="brand"><span className="brand-mark" aria-hidden="true">✿</span>{pl.title}</div>
      {adultNotice && screen !== 'room' && <p className="notice" role="status">{adultNotice}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {screen === 'loading' ? <p role="status">{pl.loadingSave}</p> :
        screen === 'room' && save ? (
          <Suspense fallback={<p role="status">{pl.loadingRoom}</p>}>
            <Room save={save}
              commit={commit} busy={busy} notice={notice} educationalPack={selectedPack?.pack ?? null} guidance={guidance} setGuidance={setGuidance}
              controls={controls} setControls={setControls} nativeActive={nativeActive} backHandlerRef={roomBack}
              onEdit={() => setScreen('edit')} onMenu={() => setScreen('welcome')} />
          </Suspense>
        ) : (
          <section className="welcome" aria-labelledby="welcome-title">
            <h1 id="welcome-title">{pl.welcome}</h1>
            {screen === 'welcome' && profile ? (
              <div className="return-profile">
                <div className={`avatar-portrait ${profile.avatar}`}><AvatarPortrait avatar={profile.avatar} /></div>
                <p className="saved-name">{profile.nickname}</p>
                <div className="profile-actions">
                  <button className="primary" disabled={busy} onClick={() => { lockLandscape(); setScreen('room') }}>{pl.continue} <span aria-hidden="true">→</span></button>
                  <button className="secondary" disabled={busy} onClick={() => setScreen('edit')}>{pl.edit}</button>
                </div>
                {(api || selectedPack) && <details className="educational-updates">
                  <summary>{pl.contentPacks.title}</summary>
                  <p role="status">{selectedPack ? pl.contentPacks.active(selectedPack.pack.version) : pl.contentPacks.bundled}</p>
                  <div className="profile-actions">
                    {api && <button className="secondary" type="button" disabled={busy}
                      onClick={() => { void updatePack(api) }}>{pl.contentPacks.download}</button>}
                    {selectedPack && <button className="secondary" type="button" disabled={busy}
                      onClick={() => { void updatePack(null) }}>{pl.contentPacks.reset}</button>}
                  </div>
                  {contentNotice && <p role="status">{pl.contentPacks[contentNotice]}</p>}
                </details>}
              </div>
            ) : (
              <ProfileForm initial={profile} busy={busy} onSave={async (profile) => {
                lockLandscape()
                const first = !current.current.save
                if ((await commit({ type: 'profile', profile }))?.save) {
                  if (first) setGuidance('floor')
                  setScreen('room')
                }
              }} onCancel={profile ? () => setScreen('welcome') : undefined} />
            )}
            {(screen !== 'edit' || !profile) && (profile || import.meta.env.MODE !== 'android') && <details className="adult-options">
              <summary>{pl.adult.title}</summary>
              {profile && <button type="button" className="secondary" disabled={busy || status === 'unavailable' || status === 'invalid'}
                onClick={() => { setAdultNotice(''); setResetStep(1) }}>{pl.adult.reset}</button>}
              <InstallOptions {...installOptions} />
            </details>}
            <dialog ref={confirmation} aria-labelledby="new-game-title" aria-describedby={resetStep === 2 ? 'new-game-loss' : undefined}
              onCancel={(event) => { event.preventDefault(); if (!busyRef.current) setResetStep(0) }}>
              <h2 id="new-game-title">{resetStep === 2 ? pl.adult.reset : pl.adult.first}</h2>
              {resetStep === 2 && <p id="new-game-loss">{pl.adult.loss}</p>}
              <div className="profile-actions">
                <button type="button" className="secondary" disabled={busy} onClick={() => setResetStep(0)}>{pl.cancel}</button>
                <button type="button" className="primary" disabled={busy}
                  onClick={() => resetStep === 1 ? setResetStep(2) : void resetGame()}>
                  {resetStep === 1 ? pl.adult.next : pl.adult.confirm}
                </button>
              </div>
            </dialog>
          </section>
        )}
      {import.meta.env.PROD && import.meta.env.MODE !== 'android' && <OfflineStatus showUpdate={screen === 'welcome'} />}
    </main>
  )
}
