import type { Lang, SeasonId } from '@/domain/calendar'
import { INK, MUTED, PAPER, SEASON_COLOR } from './tokens'

// The farming year starts with Primera in May, so the three seasons read
// left to right without wrapping around New Year. Primera and Postrera are
// shown as "first/second planting" so readers who don't know the local
// terms still follow; the SeasonId values keep the domain names.
const ORDER: readonly SeasonId[] = ['primera', 'postrera', 'seca']

const SEASON = {
  primera: {
    days: 92,
    color: SEASON_COLOR.primera,
    es: { name: 'Primera siembra', months: 'may – jul', starts: 'mayo' },
    en: { name: 'First planting', months: 'May – Jul', starts: 'May' },
  },
  postrera: {
    days: 92,
    color: SEASON_COLOR.postrera,
    es: { name: 'Segunda siembra', months: 'ago – oct', starts: 'agosto' },
    en: { name: 'Second planting', months: 'Aug – Oct', starts: 'August' },
  },
  seca: {
    days: 181,
    color: SEASON_COLOR.seca,
    es: { name: 'Época seca', months: 'nov – abr', starts: 'noviembre' },
    en: { name: 'Dry season', months: 'Nov – Apr', starts: 'November' },
  },
} as const

const COPY = {
  es: { youAreIn: 'Estás en', day: 'Día', of: 'de', today: 'hoy', next: 'Sigue', from: 'desde' },
  en: { youAreIn: 'You are in', day: 'Day', of: 'of', today: 'today', next: 'Next', from: 'from' },
} satisfies Record<Lang, Record<string, string>>

const GAP = 3

export function SeasonTimeline({
  seasonId,
  dayIndex,
  lang,
}: {
  seasonId: SeasonId
  dayIndex: number
  lang: Lang
}) {
  const copy = COPY[lang]
  const current = SEASON[seasonId]
  const name = current[lang].name
  const next = SEASON[ORDER[(ORDER.indexOf(seasonId) + 1) % ORDER.length]][lang]
  const dayLine = `${copy.day} ${dayIndex}`
  // The marker stays on the drawn segment; the text shows the real day count.
  const clamped = Math.min(Math.max(dayIndex, 1), current.days)
  const markerPct = ((clamped - 0.5) / current.days) * 100
  const totalDays = Math.max(current.days, dayIndex)

  return (
    <figure
      role="img"
      aria-label={`${name}. ${dayLine}.`}
      style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 16, color: INK }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, color: MUTED }}>{copy.youAreIn}</span>
        <span data-phase={seasonId} style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
          {name}
        </span>
        <span style={{ fontSize: 16 }}>
          <strong>{dayLine}</strong> <span style={{ color: MUTED }}>{`${copy.of} ${totalDays}`}</span>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 30 }}>
        <div style={{ display: 'flex', gap: GAP }}>
          {ORDER.map((id) => {
            const season = SEASON[id]
            const isCurrent = id === seasonId
            return (
              <div
                key={id}
                data-season={id}
                data-current={isCurrent || undefined}
                style={{
                  flex: `${season.days} 1 0`,
                  position: 'relative',
                  height: isCurrent ? 18 : 12,
                  alignSelf: 'center',
                  borderRadius: 4,
                  background: season.color,
                  opacity: isCurrent ? 1 : 0.35,
                }}
              >
                {isCurrent && (
                  <div
                    data-marker
                    style={{
                      position: 'absolute',
                      left: `${markerPct}%`,
                      bottom: -4,
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: INK,
                        color: PAPER,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copy.today}
                    </span>
                    <span style={{ width: 3, height: 30, background: INK, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: GAP }}>
          {ORDER.map((id) => {
            const season = SEASON[id]
            const isCurrent = id === seasonId
            return (
              <div
                key={id}
                style={{
                  flex: `${season.days} 1 0`,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  fontSize: 13,
                  lineHeight: 1.3,
                  color: isCurrent ? INK : MUTED,
                }}
              >
                <span style={{ fontWeight: isCurrent ? 800 : 500 }}>{season[lang].name}</span>
                <span style={{ fontSize: 12, color: MUTED }}>{season[lang].months}</span>
              </div>
            )
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 15, color: MUTED }}>
        {copy.next}: <strong style={{ color: INK }}>{next.name}</strong>, {copy.from} {next.starts}
      </p>
    </figure>
  )
}
