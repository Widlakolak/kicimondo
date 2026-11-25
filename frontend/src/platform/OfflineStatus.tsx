import { useEffect, useState } from 'react'
import { pl } from '../i18n/pl'

export function OfflineStatus({ showUpdate }: { showUpdate: boolean }) {
  const [ready, setReady] = useState(false)
  const [update, setUpdate] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const workers = navigator.serviceWorker
    const watches = new Set<ServiceWorker>()
    let registration: ServiceWorkerRegistration | undefined
    let stopped = false

    function sync() {
      setReady(workers.controller?.state === 'activated')
      setUpdate(Boolean(registration?.waiting && workers.controller))
    }

    function watch(worker: ServiceWorker | null | undefined) {
      if (!worker || watches.has(worker)) return
      watches.add(worker)
      worker.addEventListener('statechange', sync)
    }

    function inspect() {
      watch(workers.controller)
      watch(registration?.installing)
      watch(registration?.waiting)
      sync()
    }

    workers.addEventListener('controllerchange', inspect)
    void workers.register('./sw.js', { updateViaCache: 'none' }).then((result) => {
      if (stopped) return
      registration = result
      result.addEventListener('updatefound', inspect)
      inspect()
    }).catch(() => {
      // An unavailable worker must not block an online game.
    })
    return () => {
      stopped = true
      workers.removeEventListener('controllerchange', inspect)
      registration?.removeEventListener('updatefound', inspect)
      for (const worker of watches) worker.removeEventListener('statechange', sync)
    }
  }, [])

  if (!ready && !(update && showUpdate)) return null
  return <div className="offline-status" role="status">
    {update && showUpdate ? pl.offline.update : ready ? pl.offline.ready : null}
  </div>
}
