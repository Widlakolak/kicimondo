import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { avatars, validateNickname, type Avatar, type Profile } from './core/profile'
import { paintAvatar } from './game/avatarArt'
import { pl } from './i18n/pl'
import { applyCommand, type Save, type SaveCommand } from './core/progress'
import { createSaveRepository } from './storage/saveRepository'
import { minimizeAndroid, watchAndroid } from './platform/android'
import { OfflineStatus } from './platform/OfflineStatus'

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
    </form>
  )
}

const repository = createSaveRepository()
type Screen = 'loading' | 'welcome' | 'edit' | 'room'
type Notice = keyof typeof pl.save | null

export function App() {
  const [record, setRecord] = useState<{ save: Save | null; status: Notice }>({ save: null, status: null })
  const current = useRef(record)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const { save, status } = record
  const [screen, setScreen] = useState<Screen>('loading')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [nativeActive, setNativeActive] = useState(true)
  const roomBack = useRef<(() => void) | null>(null)

  const goBack = useEffectEvent(() => {
    if (busyRef.current || screen === 'loading') return
    if (screen === 'room') roomBack.current?.()
    else if (screen === 'edit' && save) setScreen('welcome')
    else minimizeAndroid()
  })

  useEffect(() => watchAndroid(() => goBack(), setNativeActive), [])

  useEffect(() => {
    let active = true
    void repository.load().then(({ save, status }) => {
      if (!active) return
      current.current = { save, status: status === 'ready' ? null : status }
      setRecord(current.current)
      setScreen(save ? 'welcome' : 'edit')
    })
    return () => { active = false }
  }, [])

  function persist(command: SaveCommand): Promise<Save | null> {
    const operation = saveQueue.current.then(async () => {
      const before = current.current
      let after: typeof before
      if (before.status === 'invalid' || before.status === 'unavailable') {
        after = { ...before, save: applyCommand(before.save, command) }
      } else {
        try {
          after = { save: await repository.commit(command), status: null }
        } catch {
          after = { save: applyCommand(before.save, command), status: 'unavailable' }
        }
      }
      current.current = after
      setRecord(after)
      return after.save
    })
    saveQueue.current = operation.catch(() => undefined)
    return operation
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

  const profile = save?.profile ?? null
  const notice = status ? pl.save[status] : null

  return (
    <main className={screen === 'room' ? 'shell gameplay' : 'shell'}>
      <div className="brand"><span className="brand-mark" aria-hidden="true">✿</span>{pl.title}</div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {screen === 'loading' ? <p role="status">{pl.loadingSave}</p> :
        screen === 'room' && save ? (
          <Suspense fallback={<p role="status">{pl.loadingRoom}</p>}>
            <Room key={save.checkpoint.location + '/' + save.checkpoint.spawn} save={save}
              commit={commit} busy={busy} notice={notice} nativeActive={nativeActive} backHandlerRef={roomBack}
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
                  <button className="primary" onClick={() => setScreen('room')}>{pl.continue} <span aria-hidden="true">→</span></button>
                  <button className="secondary" onClick={() => setScreen('edit')}>{pl.edit}</button>
                </div>
              </div>
            ) : (
              <ProfileForm initial={profile} busy={busy} onSave={async (profile) => {
                if (await commit({ type: 'profile', profile })) setScreen('room')
              }} onCancel={profile ? () => setScreen('welcome') : undefined} />
            )}
          </section>
        )}
      {import.meta.env.PROD && import.meta.env.MODE !== 'android' && <OfflineStatus showUpdate={screen === 'welcome'} />}
    </main>
  )
}
