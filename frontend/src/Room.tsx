import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import { Kicipedia } from './Kicipedia'
import type { CatId } from './content/catCatalog'
import { Challenge } from './challenges/Challenge'
import { cats, challenges, dialogues, quests, transitions, type Challenge as ChallengeDefinition, type Dialogue, type Quest, type Transition } from './content/pack'
import { meetsGate, pointsOf, trustOf, type Save, type SaveCommand } from './core/progress'
import type { Direction, InteractionId } from './core/room'
import { createRoom, type CatCue, type WorldState } from './game/createRoom'
import { RoomInput } from './game/RoomInput'
import { pl } from './i18n/pl'
import { challengeAttempt, type EducationalPack } from './content/remote/pack'

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
  | { type: 'quest'; quest: Quest; definition: ChallengeDefinition }
  | { type: 'locked'; edge: Transition }
  | { type: 'dialogue'; dialogue: Dialogue }
  | { type: 'pause' }
  | { type: 'kicipedia'; selected: CatId | null; fromPause: boolean }
  | { type: 'success'; quest: Quest }

const interactionText = (id: string): { prompt: string; unlocked?: string } => pl.interactions[id as keyof typeof pl.interactions]

function worldState(save: Save): WorldState {
  const { location } = save.checkpoint
  const edges = transitions.filter((edge) => edge.location === location)
  const hidden = save.hidden.filter((effect) => effect.location === location).map(({ object }) => object)
  return {
    hidden,
    discovered: save.discovered,
    restored: save.restored.filter((effect) => effect.location === location).map(({ object }) => object),
    openDoors: edges.filter((edge) => meetsGate(pointsOf(save), edge.minimumPoints)).map(({ interaction }) => interaction),
    active: [
      ...edges.map(({ interaction }) => interaction),
      ...dialogues.filter((dialogue) => dialogue.location === location).map(({ interaction }) => interaction),
      ...quests.filter((quest) => quest.location === location && !save.completed.includes(quest.id))
        .map(({ interaction }) => interaction),
    ],
  }
}

export default function Room({ save, commit, busy, notice, educationalPack, nativeActive, backHandlerRef, onEdit, onMenu }: {
  save: Save
  commit: (command: SaveCommand) => Promise<Save | null>
  busy: boolean
  notice: string | null
  educationalPack: EducationalPack | null
  nativeActive: boolean
  backHandlerRef: RefObject<(() => void) | null>
  onEdit: () => void
  onMenu: () => void
}) {
  const { profile, checkpoint } = save
  const { location, spawn } = checkpoint
  const text = pl.locations[location]
  const points = pointsOf(save)
  const resident = cats.find((cat) => cat.location === location && !cat.requires)
  const catName = resident ? pl.cat.names[resident.id] : null
  const host = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const modalHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const dismissTap = useRef<{ id: number; x: number; y: number } | null>(null)
  const engine = useRef<ReturnType<typeof createRoom> | null>(null)
  const [input] = useState(() => new RoomInput())
  const [target, setTarget] = useState<{ id: InteractionId | null; cue: CatCue | null }>({ id: null, cue: null })
  const [open, setOpen] = useState<Overlay | null>(null)

  const syncVisibility = useEffectEvent(() => {
    const backgrounded = document.hidden || !nativeActive
    input.setBackgrounded(backgrounded)
    engine.current?.setBackgrounded(backgrounded)
  })
  const openPause = (focus: Element | null) => {
    previousFocus.current = focus instanceof HTMLElement ? focus : null
    input.setPaused(true)
    setOpen({ type: 'pause' })
  }
  function openKicipedia(focus?: HTMLElement) {
    const fromPause = open?.type === 'pause'
    if (!fromPause && focus) previousFocus.current = focus
    input.setPaused(true)
    setOpen({ type: 'kicipedia', selected: null, fromPause })
  }

  function closeOverlay() {
    const overlay = dialog.current
    if (busy || !overlay?.open) return
    dismissTap.current = null
    if (open?.type === 'kicipedia') {
      if (open.selected) {
        setOpen({ ...open, selected: null })
        return
      }
      if (open.fromPause) {
        setOpen({ type: 'pause' })
        return
      }
    }
    overlay.close()
    setOpen(null)
    const focus = previousFocus.current
    if (focus && focus !== document.body && focus.isConnected && !focus.matches(':disabled')) focus.focus()
    else heading.current?.focus()
    // The browser dispatches "close" later. Restore input before another keydown can arrive.
    input.setPaused(false)
  }

  const goBack = useEffectEvent(() => {
    if (busy) return
    if (dialog.current?.open) closeOverlay()
    else openPause(document.activeElement)
  })

  useEffect(() => {
    backHandlerRef.current = () => goBack()
    return () => { backHandlerRef.current = null }
  }, [backHandlerRef])

  function dialogueBody(dialogue: Dialogue) {
    const gate = transitions.find((edge) => edge.location === dialogue.location && edge.interaction === dialogue.gate)!
    const unlocked = meetsGate(points, gate.minimumPoints)
    const hint = dialogue.hints.find((hint) =>
      quests.some((quest) => quest.location === hint.location && !save.completed.includes(quest.id)))
    return {
      hint: hint && pl.dialogue[hint.text],
      progression: unlocked ? pl.dialogue[dialogue.afterGate] : pl.stairs.progress(points, gate.minimumPoints),
    }
  }

  const initialWorld = useEffectEvent(() => worldState(save))
  const onInteraction = useEffectEvent(async (id: InteractionId) => {
    if (cats.some((cat) => cat.location === location && cat.id === id)) {
      if (!save.trust.some((event) => event.cat === id && event.id === 'first-pet')) {
        await commit({ type: 'pet', cat: id })
      }
      return
    }
    const quest = quests.find((entry) => entry.location === location && entry.interaction === id &&
      !save.completed.includes(entry.id))
    const edge = transitions.find((entry) => entry.location === location && entry.interaction === id)
    const dialogue = dialogues.find((entry) => entry.location === location && entry.interaction === id)
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (quest) {
      setOpen({ type: 'quest', quest, definition: challengeAttempt(quest.challenge, educationalPack) })
    } else if (dialogue) {
      setOpen({ type: 'dialogue', dialogue })
    } else if (edge && !meetsGate(points, edge.minimumPoints)) {
      setOpen({ type: 'locked', edge })
    } else {
      if (edge) await commit({ type: 'transition', location, interaction: id })
      input.setPaused(false)
    }
  })

  const onObserve = useEffectEvent((id: CatId) => {
    if (!save.discovered.includes(id)) void commit({ type: 'discover', cat: id })
  })

  useEffect(() => {
    const stage = document.createElement('div')
    stage.className = 'stage'
    host.current?.append(stage)
    heading.current?.focus()
    const created = createRoom(stage, profile.avatar, input, { location, spawn }, initialWorld(), (id, cue) => setTarget({ id, cue }),
      (id) => { void onInteraction(id) }, (id) => onObserve(id))
    engine.current = created

    const clear = () => input.clear()
    const visibility = () => syncVisibility()
    const hide = () => {
      input.setBackgrounded(true)
      created.setBackgrounded(true)
    }
    visibility()
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
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', clear)
    window.addEventListener('resize', clear)
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', visibility)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', clear)
      window.removeEventListener('resize', clear)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', visibility)
      document.removeEventListener('visibilitychange', visibility)
      input.setPaused(false)
      created.destroy()
      engine.current = null
      stage.remove()
    }
  }, [input, location, profile.avatar, spawn])

  useEffect(() => { syncVisibility() }, [nativeActive])

  useEffect(() => {
    engine.current?.setWorld(worldState(save))
  }, [save])

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
    if (open) modalHeading.current?.focus()
  }, [open])

  async function complete(quest: Quest) {
    if (busy) return
    const next = await commit({ type: 'complete', quest: quest.id })
    if (next?.completed.includes(quest.id)) setOpen({ type: 'success', quest })
  }

  const world = worldState(save)
  const active = target.id && world.active.includes(target.id) ? target.id : null
  const interaction = active ? interactionText(active) : null
  const unlocked = active && world.openDoors.includes(active)
  const nearbyCat = target.cue ? cats.find(({ id }) => id === target.id) : null
  const catPrompt = target.cue && nearbyCat ? pl.cat[target.cue](pl.cat.names[nearbyCat.id], nearbyCat.female) : null
  const lockedEdge = active && !unlocked
    ? transitions.find((edge) => edge.location === location && edge.interaction === active && edge.kind)
    : null
  const lockText = (edge: Transition) => edge.kind === 'gate' ? pl.gardenGate : pl.stairs
  const prompt = (lockedEdge && lockText(lockedEdge).progress(points, lockedEdge.minimumPoints)) ||
    (catPrompt ?? (unlocked ? interaction?.unlocked : null) ?? interaction?.prompt)
  const conversation = open?.type === 'dialogue' && dialogueBody(open.dialogue)

  return (
    <section className="room" aria-labelledby="room-title">
      <header className="room-header">
        <div>
          <p className="room-profile">{profile.nickname}</p>
          <h1 id="room-title" ref={heading} tabIndex={-1}>{text.title}</h1>
          {resident && catName && <p className="cat-trust">{pl.cat.trust(catName, trustOf(save, resident.id))}</p>}
        </div>
        <div className="room-actions">
          <span className="points" title={pl.pointsLabel}>{pl.points(points)}</span>
          <button type="button" className="secondary" disabled={busy}
            onClick={(event) => openKicipedia(event.currentTarget)}>{pl.kicipedia.title}</button>
          <button type="button" className="secondary" disabled={busy} onClick={onEdit}>{pl.edit}</button>
          <button type="button" className="secondary" disabled={busy} onClick={(event) => openPause(event.currentTarget)}>{pl.pause.title}</button>
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
        <button type="button" className="primary interact" disabled={(!active && target.cue !== 'ready') || busy}
          onClick={() => input.requestInteraction()}>{pl.interact}</button>
      </div>
      <p className="room-help">{pl.help}</p>
      <dialog
        className={open?.type === 'quest' || open?.type === 'kicipedia' ? 'quest-dialog' : undefined}
        ref={dialog}
        aria-labelledby="interaction-title"
        aria-describedby="interaction-body"
        onCancel={(event) => {
          event.preventDefault()
          closeOverlay()
        }}
      >
        {open?.type === 'quest' && <>
          <h2 id="interaction-title">{pl.challenges[challenges[open.quest.challenge].text].title}</h2>
          <Challenge definition={open.definition} busy={busy} onComplete={() => {
            void complete(open.quest)
          }} />
        </>}
        {open?.type === 'pause' && <>
          <h2 id="interaction-title" ref={modalHeading} tabIndex={-1}>{pl.pause.title}</h2>
          <p id="interaction-body">{pl.pause.body}</p>
          <button type="button" className="secondary pause-menu" disabled={busy} onClick={onMenu}>{pl.pause.menu}</button>
          <button type="button" className="secondary pause-menu" disabled={busy}
            onClick={() => openKicipedia()}>{pl.kicipedia.title}</button>
        </>}
        {open?.type === 'kicipedia' && <>
          <h2 id="interaction-title" ref={modalHeading} tabIndex={-1}>{pl.kicipedia.title}</h2>
          <Kicipedia save={save} selected={open.selected} select={(id) => setOpen({ ...open, selected: id })} />
        </>}
        {open?.type === 'dialogue' && conversation && <>
          <h2 id="interaction-title">{pl.dialogue[open.dialogue.speaker].title}</h2>
          <div id="interaction-body">
            <p>{pl.dialogue[open.dialogue.speaker].greeting}</p>
            {conversation.hint && <p>{conversation.hint}</p>}
            <p>{conversation.progression}</p>
          </div>
        </>}
        {open?.type === 'locked' && <>
          <h2 id="interaction-title">{open.edge.kind ? lockText(open.edge).title : pl.lockedDoor.title}</h2>
          <p id="interaction-body">{open.edge.kind ? lockText(open.edge).progress(points, open.edge.minimumPoints) :
            pl.lockedDoor.requirement(open.edge.minimumPoints)}</p>
        </>}
        {open?.type === 'success' && <>
          <h2 id="interaction-title" ref={modalHeading} tabIndex={-1}>{pl.questComplete}</h2>
          <p id="interaction-body">{pl.challenges[challenges[open.quest.challenge].text].success}</p>
          <p className="quest-reward">{pl.earned(open.quest.reward.points)}</p>
          {notice && <p className="notice" role="status">{notice}</p>}
        </>}
        <button type="button" className="primary" disabled={busy}
          onClick={closeOverlay}
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
              closeOverlay()
            }
          }}>
          {busy ? pl.saving : open?.type === 'quest' ? pl.cancel : open?.type === 'pause' ? pl.pause.resume :
            open?.type === 'kicipedia' && open.selected ? pl.kicipedia.back : pl.close}
        </button>
      </dialog>
    </section>
  )
}
