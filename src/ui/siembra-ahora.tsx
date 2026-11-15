import { useId } from 'react'
import type { CropId, Lang, PhaseMark, Suit, TodayCard } from '@/domain/calendar'
import { SeasonRing } from './season-ring'
import { StatusBubble } from './status-bubble'

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
  cropLabels,
  onRegister,
}: {
  card: TodayCard
  lang: Lang
  cropLabels: Readonly<Record<CropId, string>>
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
          <p style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 700 }}>{cropLabels[card.cropId]}</p>
        ) : null}
        <p id={sentenceId} style={{ margin: '12px 0 0', fontSize: 32, fontWeight: 800, lineHeight: 1.25 }}>
          {card.sentence}
        </p>
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
  card,
  mark,
  statusSentence,
  cropLabels,
  lang,
  onRegister,
}: {
  card: TodayCard | null
  mark: PhaseMark | null
  statusSentence: string | null
  cropLabels: Readonly<Record<CropId, string>>
  lang: Lang
  onRegister?: () => void
}) {
  const ready = card !== null && mark !== null && statusSentence !== null
  const sectionLabel = lang === 'es' ? 'Hoy' : 'Today'
  return (
    <section
      aria-label={sectionLabel}
      lang={lang}
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
      {ready ? (
        <>
          <SeasonRing seasonId={mark.phase} dayIndex={mark.dayOfPhase} lang={lang} />
          <StatusBubble sentence={statusSentence} lang={lang} />
          <SiembraAhora card={card} lang={lang} cropLabels={cropLabels} onRegister={onRegister} />
        </>
      ) : (
        <p role="status">{lang === 'es' ? 'Cargando los datos de la parcela…' : 'Loading plot data…'}</p>
      )}
    </section>
  )
}
