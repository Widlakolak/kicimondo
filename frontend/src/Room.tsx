import { useEffect, useEffectEvent, useRef, useState, type ComponentPropsWithoutRef, type RefObject } from 'react'
import type { Guidance } from './App'
import type { SaveReceipt } from './storage/saveRepository'
import { Kicipedia } from './Kicipedia'
import type { CatId } from './content/catCatalog'
import { Challenge } from './challenges/Challenge'
import { cats, challenges, dialogues, quests, transitions, type Challenge as ChallengeDefinition, type Dialogue, type Quest, type Transition } from './content/pack'
import { meetsGate, pointsOf, trustOf, type Save, type SaveCommand } from './core/progress'
import type { Direction, InteractionId } from './core/room'
import { createRoom, type CatCue, type WorldState } from './game/createRoom'
import { RoomInput } from './game/RoomInput'
import { pl } from './i18n/pl'
import { lockLandscape, usePortrait } from './platform/landscape'
import './gameplay.css'
import { nextQuestExit } from './content/routes'
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

function GameButton({ onActivate, ...props }: ComponentPropsWithoutRef<'button'> & {
  onActivate: (button: HTMLButtonElement) => void
}) {
  const press = useRef<{ id: number; x: number; y: number } | null>(null)
  const handledTouch = useRef(false)

  return <button {...props} type="button"
    onPointerDown={(event) => {
      if (!event.isPrimary) return
      handledTouch.current = false
      press.current = event.pointerType === 'touch' && event.button === 0
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null
    }}
    onPointerCancel={(event) => {
      if (press.current?.id === event.pointerId) press.current = null
    }}
    onPointerUp={(event) => {
      const tap = press.current
      if (tap?.id !== event.pointerId) return
      press.current = null
      const button = event.currentTarget
      if (button.disabled || Math.hypot(tap.x - event.clientX, tap.y - event.clientY) > 10 ||
          !button.contains(document.elementFromPoint(event.clientX, event.clientY))) return
      // Chromium can omit the synthesized click after a captured drawing gesture.
      handledTouch.current = true
      onActivate(button)
    }}
    onClick={(event) => {
      const alreadyActivated = handledTouch.current && event.detail > 0
      handledTouch.current = false
      if (!alreadyActivated) onActivate(event.currentTarget)
    }}
  />
}

function RotateDevice() {
  return <>
    <svg viewBox="0 0 96 82" width="96" height="82" aria-hidden="true">
      <rect x="34" y="16" width="32" height="52" rx="6" fill="none" stroke="currentColor" strokeWidth="5" transform="rotate(20 50 42)" />
      <path d="M15 48a32 32 0 0 1 18-34M16 35l-1 14 13-4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <strong>{pl.play.rotate}</strong>
  </>
}

function ViewIcon({ controls = false, expanded = false }: { controls?: boolean; expanded?: boolean }) {
  const path = controls ? 'M3 9h6V3h6v6h6v6h-6v6H9v-6H3z' :
    expanded ? 'M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6' : 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6'
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

type Overlay =
  | { type: 'quest'; quest: Quest; definition: ChallengeDefinition }
  | { type: 'locked'; edge: Transition }
  | { type: 'dialogue'; dialogue: Dialogue }
  | { type: 'pause' }
  | { type: 'kicipedia'; selected: CatId | null; fromPause: boolean }
  | { type: 'success'; quest: Quest; durable: boolean; unlocked: string[] }

const interactionText = (id: string): { prompt: string; unlocked?: string } => pl.interactions[id as keyof typeof pl.interactions]

function worldState(save: Save): WorldState {
  const { location, spawn } = save.checkpoint
  const edges = transitions.filter((edge) => edge.location === location)
  const unfinished = quests.filter(({ id }) => !save.completed.includes(id))
  const tasks = unfinished.filter((quest) => quest.location === location).map(({ interaction }) => interaction)
  const hidden = save.hidden.filter((effect) => effect.location === location).map(({ object }) => object)
  const arrivedFrom = transitions.find(({ target }) => target.location === location && target.spawn === spawn)?.location
  return {
    hidden,
    discovered: save.discovered,
    restored: save.restored.filter((effect) => effect.location === location).map(({ object }) => object),
    openDoors: edges.filter((edge) => meetsGate(pointsOf(save), edge.minimumPoints)).map(({ interaction }) => interaction),
    quests: tasks,
    doors: edges.map(({ interaction }) => interaction),
    exit: tasks.length ? null :
      nextQuestExit(location, new Set(unfinished.map((quest) => quest.location)), pointsOf(save), arrivedFrom),
    active: [
      ...edges.map(({ interaction }) => interaction),
      ...dialogues.filter((dialogue) => dialogue.location === location).map(({ interaction }) => interaction),
      ...tasks,
    ],
  }
}

export default function Room({ save, commit, busy, notice, educationalPack, guidance, setGuidance, controls, setControls, nativeActive, backHandlerRef, onEdit, onMenu }: {
  save: Save
  commit: (command: SaveCommand) => Promise<SaveReceipt | null>
  busy: boolean
  notice: string | null
  educationalPack: EducationalPack | null
  guidance: Guidance
  setGuidance: (guidance: Guidance) => void
  controls: boolean
  setControls: (visible: boolean) => void
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
  const root = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const portrait = usePortrait()
  const worldPress = useRef<{ id: number; x: number; y: number; revision: number } | null>(null)
  const host = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const modalHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const engine = useRef<ReturnType<typeof createRoom> | null>(null)
  const [input] = useState(() => new RoomInput())
  const [target, setTarget] = useState<{ id: InteractionId | null; cue: CatCue | null }>({ id: null, cue: null })
  const [open, setOpen] = useState<Overlay | null>(null)

  const syncVisibility = useEffectEvent(() => {
    const backgrounded = document.hidden || !nativeActive
    input.setBackgrounded(backgrounded || portrait)
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
    if (open?.type === 'quest' && guidance === 'task') setGuidance('star')
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

  useEffect(() => {
    const changed = () => {
      input.clear()
      const active = document.fullscreenElement === root.current
      setFullscreen(active)
      if (!active) setExpanded(false)
    }
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [input])

  async function toggleFullscreen() {
    input.clear()
    if (expanded) {
      if (fullscreen && document.exitFullscreen) await document.exitFullscreen().catch(() => undefined)
      else setExpanded(false)
      return
    }
    setExpanded(true)
    if (document.fullscreenEnabled && root.current?.requestFullscreen) {
      try {
        await root.current.requestFullscreen()
        lockLandscape()
      } catch { /* The expanded layout still fills the browser viewport. */ }
    }
  }

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
      if (guidance && guidance !== 'explore') setGuidance('task')
      setOpen({ type: 'quest', quest, definition: challengeAttempt(quest.challenge, educationalPack) })
    } else if (dialogue) {
      setOpen({ type: 'dialogue', dialogue })
    } else if (edge && !meetsGate(points, edge.minimumPoints)) {
      setOpen({ type: 'locked', edge })
    } else {
      if (edge) {
        const receipt = await commit({ type: 'transition', location, interaction: id })
        if (receipt?.applied && guidance === 'explore') setGuidance(null)
      }
      input.setPaused(false)
    }
  })

  const onFirstMove = useEffectEvent(() => {
    if (guidance === 'floor') setGuidance('star')
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
      (id) => { void onInteraction(id) }, (id) => onObserve(id), () => onFirstMove())
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

  useEffect(() => { syncVisibility() }, [nativeActive, portrait])

  useEffect(() => {
    engine.current?.setWorld(worldState(save))
  }, [save])

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
    if (open) modalHeading.current?.focus()
  }, [open])

  async function complete(quest: Quest) {
    if (busy) return
    const result = await commit({ type: 'complete', quest: quest.id })
    if (!result?.save?.completed.includes(quest.id)) return
    if (!result.applied) { closeOverlay(); return }
    if (guidance) setGuidance('explore')
    const total = pointsOf(result.save)
    const areas = pl.play.unlocked
    const unlocked = transitions
      .filter(({ minimumPoints }) => minimumPoints > result.previousPoints && minimumPoints <= total)
      .map(({ target }) => areas[target.location as keyof typeof areas])
      .filter((message): message is NonNullable<typeof message> => Boolean(message))
    setOpen({ type: 'success', quest, durable: result.durable, unlocked: [...new Set(unlocked)] })
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
  const shownGuidance = guidance !== 'task' && !prompt && !open ? guidance : null
  const conversation = open?.type === 'dialogue' && dialogueBody(open.dialogue)

  return (
    <section ref={root} className={`room${expanded ? ' expanded' : ''}${portrait ? ' portrait' : ''}`}
      aria-labelledby="room-title">
      <div className="world" ref={host} role="img" aria-label={text.map}
        onPointerDown={(event) => {
          if (input.isPaused() || !event.isPrimary || event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) return
          worldPress.current = { id: event.pointerId, x: event.clientX, y: event.clientY, revision: input.revision }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={(event) => {
          const press = worldPress.current
          if (press?.id !== event.pointerId) return
          worldPress.current = null
          if (press.revision === input.revision && Math.hypot(press.x - event.clientX, press.y - event.clientY) <= 12) {
            engine.current?.tap({ x: event.clientX, y: event.clientY })
          }
        }}
        onPointerCancel={(event) => {
          if (worldPress.current?.id === event.pointerId) worldPress.current = null
          input.clear()
        }}
        onLostPointerCapture={() => { worldPress.current = null }}
      />
      <aside className="game-dock">
        <header className="room-header">
          <div className="room-heading">
            <div>
              <h1 id="room-title" ref={heading} tabIndex={-1}>{text.title}</h1>
              {resident && catName && <p className="cat-trust">{pl.cat.trust(catName, trustOf(save, resident.id))}</p>}
            </div>
            <span className="points" role="group" aria-label={pl.pointsLabel} title={pl.pointsLabel}>
              <span aria-hidden="true">★</span> <strong>{points}</strong>
            </span>
          </div>
          <div className="room-actions">
            <GameButton className="secondary" disabled={busy}
              onActivate={openKicipedia}>{pl.kicipedia.title}</GameButton>
            <GameButton className="secondary" disabled={busy} onActivate={openPause}>{pl.pause.title}</GameButton>
            <GameButton className="secondary game-icon"
              aria-label={expanded ? (fullscreen ? pl.play.exitFullscreen : pl.play.collapse) :
                document.fullscreenEnabled ? pl.play.fullscreen : pl.play.expand}
              onActivate={() => { void toggleFullscreen() }}><ViewIcon expanded={expanded} /></GameButton>
            {expanded && <GameButton className="secondary game-icon" aria-pressed={controls}
              aria-label={controls ? pl.play.hideControls : pl.play.showControls}
              onActivate={() => { input.clear(); setControls(!controls) }}><ViewIcon controls /></GameButton>}
          </div>
          <p className="task-count">{pl.play.tasks} <b>{world.quests.length}</b></p>
        </header>
        {(prompt || !guidance) && <p className="interaction-status" role="status">
          <span className={prompt ? 'status-dot active' : 'status-dot'} aria-hidden="true" />
          {prompt ?? (points === quests.length ? pl.play.finished : world.exit ? pl.play.next : pl.explore)}
        </p>}
        {shownGuidance && <div className="onboarding" role="status">
          <span aria-hidden="true">{shownGuidance === 'floor' ? '◇' : shownGuidance === 'star' ? '★' : '→'}</span>
          <strong>{pl.play[shownGuidance]}</strong>
          <button className="secondary" aria-label={pl.play.skip} onClick={() => setGuidance(null)}>×</button>
        </div>}
        {(!expanded || controls) && <div className="controls" aria-label={pl.controls} role="group">
          <div className="dpad">
            {(['up', 'left', 'down', 'right'] as const).map((direction) => (
              <DirectionButton key={direction} direction={direction} input={input} />
            ))}
          </div>
          <button type="button" className="primary interact" disabled={(!active && target.cue !== 'ready') || busy}
            onClick={() => input.requestInteraction()}>{pl.interact}</button>
        </div>}
      </aside>
      {portrait && !open && <div className="rotate" role="status">
        <RotateDevice />
        <button type="button" className="secondary" onClick={onMenu}>{pl.pause.menu}</button>
      </div>}
      <dialog
        className={open?.type === 'kicipedia' ? 'quest-dialog collection-dialog' : open?.type === 'quest' ? 'quest-dialog' : undefined}
        ref={dialog}
        aria-labelledby="interaction-title"
        aria-describedby="interaction-body"
        onCancel={(event) => {
          event.preventDefault()
          closeOverlay()
        }}
      >
        {portrait && open && <div className="rotate-dialog"><RotateDevice /></div>}
        {open?.type === 'quest' && <>
          <h2 id="interaction-title">{pl.challenges[challenges[open.quest.challenge].text].title}</h2>
          {guidance === 'task' && <p className="tutorial-task"><span aria-hidden="true">★ </span>{pl.play.task}</p>}
          <Challenge definition={open.definition} busy={busy} onComplete={() => {
            void complete(open.quest)
          }} />
        </>}
        {open?.type === 'pause' && <>
          <h2 id="interaction-title" ref={modalHeading} tabIndex={-1}>{pl.pause.title}</h2>
          <p id="interaction-body">{pl.pause.body}</p>
          <button type="button" className="secondary pause-menu" disabled={busy} onClick={onMenu}>{pl.pause.menu}</button>
          <button type="button" className="secondary pause-menu" disabled={busy} onClick={onEdit}>{pl.edit}</button>
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
          <p id="interaction-body">{pl.play.missing(open.edge.minimumPoints - points)}</p>
        </>}
        {open?.type === 'success' && <>
          <h2 id="interaction-title" ref={modalHeading} tabIndex={-1}>{pl.questComplete}</h2>
          <p id="interaction-body">{pl.challenges[challenges[open.quest.challenge].text].success}</p>
          {open.durable && <p className="quest-reward"><span aria-hidden="true">★</span> +{open.quest.reward.points}</p>}
          {open.durable && open.unlocked.map((message) => <p key={message} className="unlocked">→ {message}</p>)}
          {guidance === 'explore' && <p>{pl.play.explain}</p>}
          {notice && <p className="notice" role="status">{notice}</p>}
        </>}
        <div className="dialog-footer">
          <GameButton className="primary" disabled={busy} onActivate={closeOverlay}>
            {busy ? pl.saving : open?.type === 'quest' ? pl.cancel : open?.type === 'pause' ? pl.pause.resume :
              open?.type === 'kicipedia' && open.selected ? pl.kicipedia.back : pl.close}
          </GameButton>
        </div>
      </dialog>
    </section>
  )
}
