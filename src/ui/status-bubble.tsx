import type { Lang, SeasonId } from '@/domain/calendar'

const PHASE = {
  es: {
    primera: 'primera',
    postrera: 'postrera',
    seca: 'época seca',
  },
  en: {
    primera: 'Primera',
    postrera: 'Postrera',
    seca: 'the dry season',
  },
} satisfies Record<Lang, Record<SeasonId, string>>

export function StatusBubble({
  seasonId,
  dayIndex,
  lang,
}: {
  seasonId: SeasonId
  dayIndex: number
  lang: Lang
}) {
  const phase = PHASE[lang][seasonId]
  const sentence = lang === 'es' ? `Día ${dayIndex} de ${phase}.` : `Day ${dayIndex} of ${phase}.`
  return (
    <p
      style={{
        margin: 0,
        padding: '20px 22px',
        borderRadius: 28,
        background: '#FFFFFF',
        color: '#151E15',
        fontSize: 24,
        lineHeight: 1.45,
        fontFamily: '"Lexend", "Segoe UI", sans-serif',
      }}
    >
      {sentence}
    </p>
  )
}
