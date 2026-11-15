import type { Lang, SeasonId } from '@/domain/calendar'

const ARC = {
  primera: { days: 92, es: 'Primera', en: 'Primera', color: '#2C6B3A' },
  postrera: { days: 92, es: 'Postrera', en: 'Postrera', color: '#AC6304' },
  seca: { days: 181, es: 'Época seca', en: 'Dry season', color: '#C4A574' },
} satisfies Record<SeasonId, { days: number; es: string; en: string; color: string }>

const ORDER: readonly SeasonId[] = ['primera', 'postrera', 'seca']

const YEAR_DAYS = 365

function ringPoint(cx: number, cy: number, r: number, clockwiseFromTop: number) {
  const rad = ((clockwiseFromTop - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const from = ringPoint(cx, cy, r, start)
  const to = ringPoint(cx, cy, r, end)
  const large = end - start > 180 ? 1 : 0
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`
}

export function SeasonRing({
  seasonId,
  dayIndex,
  lang,
}: {
  seasonId: SeasonId
  dayIndex: number
  lang: Lang
}) {
  const cx = 140
  const cy = 140
  const radius = 96
  let cursor = 0
  const arcs = ORDER.map((id) => {
    const arc = ARC[id]
    const sweep = (arc.days / YEAR_DAYS) * 360
    const start = cursor
    const end = cursor + sweep
    cursor = end
    return { id, ...arc, start, end }
  })
  const current = arcs.find((arc) => arc.id === seasonId)
  if (current === undefined) {
    throw new Error('missing season')
  }
  const span = current.end - current.start
  const clamped = Math.min(Math.max(dayIndex, 1), current.days)
  const markerAt = current.start + ((clamped - 0.5) / current.days) * span
  const dot = ringPoint(cx, cy, radius, markerAt)
  const name = lang === 'es' ? current.es : current.en
  const dayLine = lang === 'es' ? `Día ${dayIndex}` : `Day ${dayIndex}`
  const hereLabel = lang === 'es' ? 'estás aquí' : 'you are here'

  return (
    <figure style={{ margin: 0, display: 'flex', justifyContent: 'center' }}>
      <svg role="img" aria-label={`${name}. ${dayLine}.`} viewBox="0 0 280 280" width="280" height="280">
        {arcs.map((arc) => (
          <path
            key={arc.id}
            d={arcPath(cx, cy, radius, arc.start, arc.end)}
            fill="none"
            stroke={arc.color}
            strokeWidth={arc.id === seasonId ? 22 : 14}
            strokeLinecap="butt"
          />
        ))}
        {arcs.map((arc) => {
          const mid = ringPoint(cx, cy, 122, (arc.start + arc.end) / 2)
          return (
            <text
              key={`${arc.id}-label`}
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#151E15"
            >
              {lang === 'es' ? arc.es : arc.en}
            </text>
          )
        })}
        <circle cx={dot.x} cy={dot.y} r="8" fill="#151E15" />
        <g data-phase={seasonId}>
          <text x={cx} y={cy - 28} textAnchor="middle" fontSize="20" fontWeight="700" fill="#151E15">
            {name}
          </text>
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="28" fontWeight="800" fill="#151E15">
            {dayLine}
          </text>
          <text x={cx} y={cy + 32} textAnchor="middle" fontSize="16" fill="#534437">
            {hereLabel}
          </text>
        </g>
      </svg>
    </figure>
  )
}
