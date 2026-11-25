import { useEffect, useRef, useState } from 'react'
import type { Profile } from './core/profile'
import type { Direction, InteractionId } from './core/room'
import { createRoom } from './game/createRoom'
import { RoomInput } from './game/RoomInput'
import { pl } from './i18n/pl'

const keyboardDirections = new Map<string, Direction>([
  ['ArrowUp', 'up'], ['KeyW', 'up'], ['ArrowDown', 'down'], ['KeyS', 'down'],
  ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
])
const arrows = { up: '↑', left: '←', down: '↓', right: '→' } as const

function DirectionButton({ direction, input }: { direction: Direction; input: RoomInput }) {
  const release = (pointerId: number) => input.release(`pointer:${pointerId}`)
  const buttonKey = `button:${direction}`
  return (
    <button
      type="button"
      className={`direction ${direction}`}
      aria-label={pl.directions[direction]}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        input.hold(`pointer:${event.pointerId}`, direction)
      }}
      onPointerUp={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
      onLostPointerCapture={(event) => release(event.pointerId)}
      onKeyDown={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        if (!event.repeat) input.hold(buttonKey, direction)
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') input.release(buttonKey)
      }}
      onBlur={() => input.release(buttonKey)}
    >{arrows[direction]}</button>
  )
}

export default function Room({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [input] = useState(() => new RoomInput())
  const [nearby, setNearby] = useState<InteractionId | null>(null)
  const [open, setOpen] = useState<InteractionId | null>(null)

  useEffect(() => {
    const stage = document.createElement('div')
    stage.className = 'stage'
    host.current?.append(stage)
    heading.current?.focus()
    const destroy = createRoom(stage, profile.avatar, input, setNearby, (id) => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setOpen(id)
    })

    const clear = () => input.clear()
    const keydown = (event: KeyboardEvent) => {
      const direction = keyboardDirections.get(event.code)
      if ((!direction && event.code !== 'KeyE') || event.altKey || event.ctrlKey || event.metaKey ||
          dialog.current?.open || event.defaultPrevented) return
      event.preventDefault()
      if (event.repeat) return
      if (direction) input.hold(event.code, direction)
      else input.requestInteraction()
    }
    const keyup = (event: KeyboardEvent) => input.release(event.code)
    const listeners = new AbortController()
    const options = { signal: listeners.signal }
    window.addEventListener('keydown', keydown, options)
    window.addEventListener('keyup', keyup, options)
    window.addEventListener('blur', clear, options)
    window.addEventListener('resize', clear, options)
    window.addEventListener('pagehide', clear, options)
    document.addEventListener('visibilitychange', clear, options)
    return () => {
      listeners.abort()
      input.setPaused(false)
      destroy()
      stage.remove()
    }
  }, [input, profile.avatar])

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [open])

  return (
    <section className="room" aria-labelledby="room-title">
      <header className="room-header">
        <div>
          <p className="room-profile">{profile.nickname}</p>
          <h1 id="room-title" ref={heading} tabIndex={-1}>{pl.room}</h1>
        </div>
        <button type="button" className="secondary" onClick={onEdit}>{pl.edit}</button>
      </header>
      <div className="world" ref={host} role="img" aria-label={pl.map} />
      <p className="interaction-status" role="status">
        <span className={nearby ? 'status-dot active' : 'status-dot'} aria-hidden="true" />
        {nearby ? pl.interactions[nearby].prompt : pl.explore}
      </p>
      <div className="controls" aria-label={pl.controls} role="group">
        <div className="dpad">
          {(['up', 'left', 'down', 'right'] as const).map((direction) => (
            <DirectionButton key={direction} direction={direction} input={input} />
          ))}
        </div>
        <button type="button" className="primary interact" disabled={!nearby}
          onClick={() => input.requestInteraction()}>{pl.interact}</button>
      </div>
      <p className="room-help">{pl.help}</p>
      <dialog
        ref={dialog}
        aria-labelledby="interaction-title"
        aria-describedby="interaction-body"
        onClose={() => {
          input.setPaused(false)
          setOpen(null)
          const focus = previousFocus.current
          if (focus && focus !== document.body && focus.isConnected) focus.focus()
          else heading.current?.focus()
        }}
      >
        {open && <>
          <h2 id="interaction-title">{pl.interactions[open].title}</h2>
          <p id="interaction-body">{pl.interactions[open].body}</p>
          <form method="dialog"><button className="primary">{pl.close}</button></form>
        </>}
      </dialog>
    </section>
  )
}
