import { useEffect, useState } from 'react'
import { pl } from '../i18n/pl'

type InstallPrompt = Event & { prompt(): Promise<unknown> }
const actions = 'https://github.com/Widlakolak/kicimondo/actions/workflows/frontend.yml?query=branch%3Amain+is%3Asuccess'

export function useInstallOptions() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [manual, setManual] = useState(false)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

  useEffect(() => {
    if (import.meta.env.MODE === 'android') return
    const offered = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const done = () => { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', offered)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', offered)
      window.removeEventListener('appinstalled', done)
    }
  }, [])

  function requestInstall() {
    if (!prompt) { setManual((open) => !open); return }
    setPrompt(null)
    void prompt.prompt().catch(() => setManual(true))
  }

  return { installed, manual, requestInstall }
}

export function InstallOptions({ installed, manual, requestInstall }: ReturnType<typeof useInstallOptions>) {
  if (import.meta.env.MODE === 'android') return null
  return <div className="install-options">
    {!installed && <>
      <button type="button" className="secondary" onClick={requestInstall}>{pl.adult.install}</button>
      {manual && <p>{pl.adult.installManual}</p>}
    </>}
    <a className="secondary install-link" href={actions} target="_blank" rel="noopener noreferrer">{pl.adult.apk}</a>
    <p>{pl.adult.apkHelp}</p>
  </div>
}
