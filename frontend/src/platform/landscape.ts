import { useEffect, useState } from 'react'

export function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches)
  useEffect(() => {
    const query = window.matchMedia('(orientation: portrait)')
    const update = () => setPortrait(query.matches)
    if (query.addEventListener) query.addEventListener('change', update)
    else query.addListener(update)
    update()
    return () => {
      if (query.removeEventListener) query.removeEventListener('change', update)
      else query.removeListener(update)
    }
  }, [])
  return portrait
}

export function lockLandscape() {
  const orientation = screen.orientation as (ScreenOrientation & { lock?(mode: 'landscape'): Promise<void> }) | undefined
  try {
    if (orientation?.lock) void orientation.lock('landscape').catch(() => undefined)
  } catch { /* The browser can still show the portrait rotation cue. */ }
}
