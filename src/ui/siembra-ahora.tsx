import { useId } from 'react'
import type { CropId, Lang, PhaseMark, TodayCard } from '@/domain/calendar'
import { SeasonTimeline } from './season-timeline'
import { StatusBubble } from './status-bubble'
import { BAND_COLOR, BAND_GLYPH, BAND_LABEL, CARD, INK, PAPER } from './tokens'

function tone(card: TodayCard) {
  switch (card.kind) {
    case 'plant':
      return { background: '#1E5E2F', color: '#FFFFFF' }
    case 'wait':
      return { background: '#FFE9D6', color: '#2D1600' }
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
  const listen = lang === 'es' ? 'Escuchar' : 'Listen'
  const listenLabel = lang === 'es' ? 'Escuchar consejo en voz alta' : 'Listen to this advice aloud'
  const register = lang === 'es' ? 'Registrar siembra' : 'Record a planting'
  const button = {
    minHeight: 56,
    borderRadius: 999,
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
  } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <article
        data-kind={card.kind}
        data-suit={card.suit}
        style={{
          background: colors.background,
          color: colors.color,
          borderRadius: 28,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {card.cropId ? <span style={{ fontSize: 20, fontWeight: 700 }}>{cropLabels[card.cropId]}</span> : <span />}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px 4px 6px',
              borderRadius: 999,
              background: CARD,
              color: INK,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            <span
              data-suit-chip=""
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: BAND_COLOR[card.suit],
                color: card.suit === 'yellow' ? INK : '#FFFFFF',
                display: 'inline-grid',
                placeItems: 'center',
                fontSize: 13,
              }}
            >
              {BAND_GLYPH[card.suit]}
            </span>
            {BAND_LABEL[lang][card.suit]}
          </span>
        </div>
        <p id={sentenceId} style={{ margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1.25 }}>
          {card.sentence}
        </p>
      </article>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          type="button"
          aria-label={listenLabel}
          aria-describedby={sentenceId}
          onClick={() => speak(card.sentence, lang)}
          style={{ ...button, border: `2px solid ${INK}`, background: 'transparent', color: INK }}
        >
          <span aria-hidden="true">🔊 </span>
          {listen}
        </button>
        <button
          type="button"
          onClick={onRegister}
          style={{ ...button, border: 0, background: '#2C6B3A', color: '#FFFFFF' }}
        >
          {register}
        </button>
      </div>
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
        background: PAPER,
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {ready ? (
        <>
          <SiembraAhora card={card} lang={lang} cropLabels={cropLabels} onRegister={onRegister} />
          <SeasonTimeline seasonId={mark.phase} dayIndex={mark.dayOfPhase} lang={lang} />
          <StatusBubble sentence={statusSentence} lang={lang} />
        </>
      ) : (
        <p role="status">{lang === 'es' ? 'Cargando los datos de la parcela…' : 'Loading plot data…'}</p>
      )}
    </section>
  )
}
