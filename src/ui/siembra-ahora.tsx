import { useId } from 'react'
import { cycleStatus, todayCard } from '@/domain/calendar'
import type { CropId, CropLog, Lang, Suit, TodayCard } from '@/domain/calendar'
import { SeasonRing } from './season-ring'
import { StatusBubble } from './status-bubble'

const CROP_NAME = {
  es: {
    maiz: 'maíz',
    frijol: 'frijol',
    sorgo: 'maicillo',
    cafe: 'café',
    canavalia: 'canavalia',
  },
  en: {
    maiz: 'maíz (maize)',
    frijol: 'frijol (beans)',
    sorgo: 'maicillo (sorghum)',
    cafe: 'café (coffee)',
    canavalia: 'canavalia (cover crop)',
  },
} satisfies Record<Lang, Record<CropId, string>>

const SUIT_NAME = {
  es: { green: 'Verde', yellow: 'Amarillo', red: 'Rojo' },
  en: { green: 'Green', yellow: 'Yellow', red: 'Red' },
} satisfies Record<Lang, Record<Suit, string>>

const CHIP_COLOR: Record<Suit, string> = {
  green: '#AFF3B5',
  yellow: '#AC6304',
  red: '#B02422',
}

function tone(card: TodayCard) {
  switch (card.kind) {
    case 'plant':
      return { background: '#1E5E2F', color: '#FFFFFF' }
    case 'wait':
      return { background: '#FFDCC0', color: '#2D1600' }
    default: {
      const unreachable: never = card
      throw new Error(unreachable)
    }
  }
}

function speak(sentence: string, lang: Lang) {
  const Synth = globalThis.SpeechSynthesisUtterance
  const synth = globalThis.speechSynthesis
  if (!Synth || !synth) return
  synth.cancel()
  const utterance = new Synth(sentence)
  utterance.lang = lang === 'es' ? 'es-SV' : 'en-US'
  utterance.rate = 0.9
  synth.speak(utterance)
}

export function SiembraAhora({
  card,
  lang,
  onRegister,
}: {
  card: TodayCard
  lang: Lang
  onRegister?: () => void
}) {
  const sentenceId = useId()
  const colors = tone(card)
  const chip = CHIP_COLOR[card.suit]
  const listen = lang === 'es' ? 'Escuchar' : 'Listen'
  const listenLabel = lang === 'es' ? 'Escuchar consejo en voz alta' : 'Listen to this advice aloud'
  const register = lang === 'es' ? 'Registré siembra' : 'I logged a planting'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <article
        data-kind={card.kind}
        data-suit={card.suit}
        style={{
          background: colors.background,
          color: colors.color,
          borderRadius: 32,
          padding: 24,
        }}
      >
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
          <span
            data-suit-chip=""
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: chip,
              display: 'inline-block',
            }}
          />
          {SUIT_NAME[lang][card.suit]}
        </p>
        {card.cropId ? (
          <p style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 700 }}>{CROP_NAME[lang][card.cropId]}</p>
        ) : null}
        <p id={sentenceId} style={{ margin: '12px 0 0', fontSize: 32, fontWeight: 800, lineHeight: 1.25 }}>
          {card.sentence}
        </p>
        {card.reason === card.sentence ? null : (
          <p style={{ margin: '12px 0 0', fontSize: 22, lineHeight: 1.4 }}>{card.reason}</p>
        )}
      </article>
      <button
        type="button"
        aria-label={listenLabel}
        aria-describedby={sentenceId}
        onClick={() => speak(card.sentence, lang)}
        style={{
          minHeight: 72,
          border: 0,
          borderRadius: 999,
          background: '#894D00',
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'inherit',
        }}
      >
        {listen}
      </button>
      <button
        type="button"
        onClick={onRegister}
        style={{
          minHeight: 72,
          border: 0,
          borderRadius: 999,
          background: '#2C6B3A',
          color: '#FFFFFF',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'inherit',
        }}
      >
        {register}
      </button>
    </div>
  )
}

export function Hoy({
  now,
  logs,
  lang = 'es',
  onRegister,
}: {
  now: Date
  logs: readonly CropLog[]
  lang?: Lang
  onRegister?: () => void
}) {
  const phase = cycleStatus({ now }).phase
  const card = todayCard({ now, logs, lang })
  return (
    <section
      aria-label="Hoy"
      style={{
        width: '100%',
        maxWidth: 640,
        marginInline: 'auto',
        boxSizing: 'border-box',
        background: '#FAF6EE',
        color: '#151E15',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 20,
        fontFamily: '"Lexend", "Segoe UI", sans-serif',
      }}
    >
      <SeasonRing seasonId={phase.seasonId} dayIndex={phase.dayIndex} lang={lang} />
      <StatusBubble seasonId={phase.seasonId} dayIndex={phase.dayIndex} lang={lang} />
      <SiembraAhora card={card} lang={lang} onRegister={onRegister} />
    </section>
  )
}
