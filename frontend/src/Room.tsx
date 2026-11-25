import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { TraceChallenge } from './challenges/TraceChallenge'
import { challenges, quests, transitions, type Quest, type Transition } from './content/pack'
import { meetsGate, pointsOf, type Save, type SaveCommand } from './core/progress'
import type { Direction, InteractionId } from './core/room'
import { createRoom, type WorldState } from './game/createRoom'
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

type Overlay =
  | { type: 'quest'; quest: Quest }
  | { type: 'locked'; edge: Transition }
  | { type: 'success'; quest: Quest }

const interactionText = (id: string): { prompt: string; unlocked?: string } => pl.interactions[id as keyof typeof pl.interactions]

function worldState(save: Save): WorldState {
  const { location } = save.checkpoint
  const edges = transitions.filter((edge) => edge.location === location)
  const hidden = save.hidden.filter((effect) => effect.location === location).map(({ object }) => object)
  return {
    hidden,
    openDoors: edges.filter((edge) => meetsGate(pointsOf(save), edge.minimumPoints)).map(({ interaction }) => interaction),
    active: [
      ...edges.map(({ interaction }) => interaction),
      ...quests.filter((quest) => quest.location === location && !save.completed.includes(quest.id))
        .map(({ interaction }) => interaction),
    ],
  }
}

export default function Room({ save, commit, busy, notice, onEdit }: {
  save: Save
  commit: (command: SaveCommand) => Promise<Save | null>
  busy: boolean
  notice: string | null
  onEdit: () => void
}) {
  const { profile, checkpoint } = save
  const { location, spawn } = checkpoint
  const text = pl.locations[location]
  const points = pointsOf(save)
  const host = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const successHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const dismissTap = useRef<{ id: number; x: number; y: number } | null>(null)
  const engine = useRef<ReturnType<typeof createRoom> | null>(null)
  const [input] = useState(() => new RoomInput())
  const [nearby, setNearby] = useState<InteractionId | null>(null)
  const [open, setOpen] = useState<Overlay | null>(null)

  const initialWorld = useEffectEvent(() => worldState(save))
  const onInteraction = useEffectEvent(async (id: InteractionId) => {
    const quest = quests.find((entry) => entry.location === location && entry.interaction === id &&
      !save.completed.includes(entry.id))
    const edge = transitions.find((entry) => entry.location === location && entry.interaction === id)
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (quest) {
      setOpen({ type: 'quest', quest })
    } else if (edge && !meetsGate(points, edge.minimumPoints)) {
      setOpen({ type: 'locked', edge })
    } else {
      if (edge) await commit({ type: 'transition', location, interaction: id })
      input.setPaused(false)
    }
  })

  useEffect(() => {
    const stage = document.createElement('div')
    stage.className = 'stage'
    host.current?.append(stage)
    heading.current?.focus()
    const created = createRoom(stage, profile.avatar, input, { location, spawn }, initialWorld(), setNearby,
      (id) => { void onInteraction(id) })
    engine.current = created

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
      created.destroy()
      engine.current = null
      stage.remove()
    }
  }, [input, location, profile.avatar, spawn])

  useEffect(() => {
    engine.current?.setWorld(worldState(save))
  }, [save])

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
    if (open?.type === 'success') successHeading.current?.focus()
  }, [open])

  async function complete(quest: Quest) {
    if (busy) return
    const next = await commit({ type: 'complete', quest: quest.id })
    if (next?.completed.includes(quest.id)) setOpen({ type: 'success', quest })
  }

  const world = worldState(save)
  const active = nearby && world.active.includes(nearby) ? nearby : null
  const interaction = active ? interactionText(active) : null
  const unlocked = active && world.openDoors.includes(active)
  const prompt = (unlocked ? interaction?.unlocked : null) ?? interaction?.prompt

  return (
    <section className="room" aria-labelledby="room-title">
      <header className="room-header">
        <div>
          <p className="room-profile">{profile.nickname}</p>
          <h1 id="room-title" ref={heading} tabIndex={-1}>{text.title}</h1>
        </div>
        <div className="room-actions">
          <span className="points" title={pl.pointsLabel}>{pl.points(points)}</span>
          <button type="button" className="secondary" disabled={busy} onClick={onEdit}>{pl.edit}</button>
        </div>
      </header>
      <div className="world" ref={host} role="img" aria-label={text.map} />
      <p className="interaction-status" role="status">
        <span className={prompt ? 'status-dot active' : 'status-dot'} aria-hidden="true" />
        {prompt ?? pl.explore}
      </p>
      <div className="controls" aria-label={pl.controls} role="group">
        <div className="dpad">
          {(['up', 'left', 'down', 'right'] as const).map((direction) => (
            <DirectionButton key={direction} direction={direction} input={input} />
          ))}
        </div>
        <button type="button" className="primary interact" disabled={!active || busy}
          onClick={() => input.requestInteraction()}>{pl.interact}</button>
      </div>
      <p className="room-help">{pl.help}</p>
      <dialog
        className={open?.type === 'quest' ? 'quest-dialog' : undefined}
        ref={dialog}
        aria-labelledby="interaction-title"
        aria-describedby="interaction-body"
        onCancel={(event) => { if (busy) event.preventDefault() }}
        onClose={() => {
          input.setPaused(false)
          dismissTap.current = null
          setOpen(null)
          const focus = previousFocus.current
          if (focus && focus !== document.body && focus.isConnected && !focus.matches(':disabled')) focus.focus()
          else heading.current?.focus()
        }}
      >
        {open?.type === 'quest' && <>
          <h2 id="interaction-title">{pl.challenges[challenges[open.quest.challenge].text].title}</h2>
          <TraceChallenge challenge={challenges[open.quest.challenge]} busy={busy} onComplete={() => {
            void complete(open.quest)
          }} />
        </>}
        {open?.type === 'locked' && <>
          <h2 id="interaction-title">{pl.lockedDoor.title}</h2>
          <p id="interaction-body">{pl.lockedDoor.requirement(open.edge.minimumPoints)}</p>
        </>}
        {open?.type === 'success' && <>
          <h2 id="interaction-title" ref={successHeading} tabIndex={-1}>{pl.questComplete}</h2>
          <p id="interaction-body">{pl.challenges[challenges[open.quest.challenge].text].success}</p>
          <p className="quest-reward">{pl.earned(open.quest.reward.points)}</p>
          {notice && <p className="notice" role="status">{notice}</p>}
        </>}
        <button type="button" className="primary" disabled={busy}
          onClick={() => dialog.current?.close()}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch' && event.isPrimary) {
              dismissTap.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
            }
          }}
          onPointerCancel={(event) => {
            if (dismissTap.current?.id === event.pointerId) dismissTap.current = null
          }}
          onPointerUp={(event) => {
            const tap = dismissTap.current
            if (tap?.id !== event.pointerId) return
            dismissTap.current = null
            // A drawing gesture can suppress the next synthesized click on touch browsers.
            if (Math.hypot(tap.x - event.clientX, tap.y - event.clientY) <= 10 &&
                event.currentTarget.contains(document.elementFromPoint(event.clientX, event.clientY))) {
              dialog.current?.close()
            }
          }}>
          {busy ? pl.saving : open?.type === 'quest' ? pl.cancel : pl.close}
        </button>
      </dialog>
    </section>
  )
}
