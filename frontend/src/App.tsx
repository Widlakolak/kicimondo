import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { avatars, validateNickname, type Avatar, type Profile } from './core/profile'
import { paintAvatar } from './game/avatarArt'
import { pl } from './i18n/pl'
import { readProfile, writeProfile } from './storage/profileStore'

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

function ProfileForm({ initial, onSave, onCancel }: {
  initial: Profile | null
  onSave: (profile: Profile) => void
  onCancel?: () => void
}) {
  const [avatar, setAvatar] = useState<Avatar>(initial?.avatar ?? 'boy')
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [error, setError] = useState<keyof typeof pl.nicknameError | null>(null)
  const field = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
            <label key={option} className={`avatar-option ${option}`}>
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
        <button className="primary" type="submit">{pl.start} <span aria-hidden="true">→</span></button>
        {onCancel && <button className="secondary" type="button" onClick={onCancel}>{pl.cancel}</button>}
      </div>
    </form>
  )
}

const storage = () => window.localStorage

export function App() {
  const [loaded] = useState(() => readProfile(storage))
  const [status, setStatus] = useState(loaded.status)
  const [profile, setProfile] = useState(loaded.profile)
  const [screen, setScreen] = useState<'welcome' | 'edit' | 'room'>(loaded.profile ? 'welcome' : 'edit')

  function save(next: Profile) {
    setStatus(writeProfile(storage, next) ? 'ready' : 'unavailable')
    setProfile(next)
    setScreen('room')
  }

  return (
    <main className={screen === 'room' ? 'shell gameplay' : 'shell'}>
      <div className="brand"><span className="brand-mark" aria-hidden="true">✿</span>{pl.title}</div>
      {status !== 'ready' && <p className="notice" role="status">{pl[status]}</p>}
      {screen === 'room' && profile ? (
        <Suspense fallback={<p role="status">{pl.loadingRoom}</p>}>
          <Room profile={profile} onEdit={() => setScreen('edit')} />
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
            <ProfileForm initial={profile} onSave={save}
              onCancel={profile ? () => setScreen('welcome') : undefined} />
          )}
        </section>
      )}
    </main>
  )
}
