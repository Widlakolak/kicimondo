import { useEffect, useRef } from 'react'
import { cats, type CatDefinition, type CatId } from './content/catCatalog'
import { trustOf, type Save } from './core/progress'
import { paintCat } from './game/catArt'
import { pl } from './i18n/pl'

const collection = pl.kicipedia

function CatPortrait({ cat, known }: { cat: CatDefinition; known: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, 36, 26)
    paintCat((colour, x, y, width, height) => {
      context.fillStyle = known ? '#' + colour.toString(16).padStart(6, '0') : '#827782'
      context.fillRect(x + 18, y + 22, width, height)
    }, { activity: 'idle', facing: 1 }, 0, cat.appearance)
  }, [cat, known])
  return <canvas className="cat-portrait" width={36} height={26} aria-hidden="true" ref={canvas} />
}

function placesFor(cat: CatDefinition) {
  const profile = collection.profiles[cat.id]
  return 'favourite' in profile ? profile.favourite : cat.attractions.map(({ tag }) => pl.attractions[tag]).join(' i ')
}

function habitatHint(cat: CatDefinition) {
  const profile = collection.profiles[cat.id]
  return 'habitat' in profile ? profile.habitat : placesFor(cat)
}

export function Kicipedia({ save, selected, select }: {
  save: Save
  selected: CatId | null
  select: (id: CatId) => void
}) {
  const detail = selected && save.discovered.includes(selected) ? cats.find(({ id }) => id === selected) : null
  if (detail) {
    const profile = collection.profiles[detail.id]
    const activities = [...new Set(detail.attractions.map(({ activity }) => collection.activities[activity]))]
    return <div id="interaction-body" className="cat-details">
      <CatPortrait cat={detail} known />
      <h3>{pl.cat.names[detail.id]}</h3>
      <p><strong>{profile.personality}</strong></p>
      <p>{profile.description}</p>
      <p>{collection.favourite(placesFor(detail))}</p>
      <p>{collection.favouriteActivities(activities.join(', '))}</p>
      <p>{collection.trust(trustOf(save, detail.id))}</p>
    </div>
  }
  return <div id="interaction-body">
    <p>{collection.intro}</p>
    <ul className="cat-collection">
      {cats.map((cat) => {
        const known = save.discovered.includes(cat.id)
        return <li key={cat.id}>
          <CatPortrait cat={cat} known={known} />
          {known ? <button type="button" className="secondary" onClick={() => select(cat.id)}>{pl.cat.names[cat.id]}</button>
            : <><strong>{collection.unknown}</strong><p>{collection.hint(habitatHint(cat))}</p></>}
        </li>
      })}
    </ul>
  </div>
}
