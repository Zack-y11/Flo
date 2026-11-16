import type { Lang } from '@/domain/calendar'
import { CARD, INK } from './tokens'

export function StatusBubble({
  sentence,
  lang,
}: {
  sentence: string
  lang: Lang
}) {
  return (
    <p
      lang={lang}
      style={{
        margin: 0,
        padding: '14px 18px',
        borderRadius: 20,
        background: CARD,
        color: INK,
        fontSize: 16,
        lineHeight: 1.5,
      }}
    >
      {sentence}
    </p>
  )
}
