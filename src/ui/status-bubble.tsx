import type { Lang } from '@/domain/calendar'

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
