import { App as NativeApp } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'

export function watchAndroid(onBack: () => void, onActive: (active: boolean) => void) {
  if (!Capacitor.isNativePlatform()) return
  let disposed = false
  let receivedState = false
  const handles: PluginListenerHandle[] = []

  async function retain(listener: Promise<PluginListenerHandle>) {
    const handle = await listener
    if (disposed) await handle.remove()
    else handles.push(handle)
  }

  void retain(NativeApp.addListener('backButton', () => {
    if (!disposed) onBack()
  })).catch(console.error)
  void retain(NativeApp.addListener('appStateChange', ({ isActive }) => {
    receivedState = true
    if (!disposed) onActive(isActive)
  })).then(async () => {
    const { isActive } = await NativeApp.getState()
    if (!disposed && !receivedState) onActive(isActive)
  }).catch(console.error)

  return () => {
    disposed = true
    for (const handle of handles) void handle.remove().catch(console.error)
  }
}

export function minimizeAndroid() {
  void NativeApp.minimizeApp().catch(console.error)
}
