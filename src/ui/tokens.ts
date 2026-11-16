import type { Lang, SeasonId, Suit } from '@/domain/calendar'

// Base colors come from the Tailwind @theme in app/globals.css, so inline
// styles and utility classes stay in sync.
export const INK = 'var(--color-ink)'
export const MUTED = 'var(--color-muted)'
export const PAPER = 'var(--color-cream)'
export const CARD = '#FFFFFF'

// Green / yellow / red only ever mean "how good is it to plant".
export const BAND_COLOR: Record<Suit, string> = {
  green: '#2F7A45',
  yellow: '#E0B13A',
  red: '#B23A2F',
}

// A shape per band so the meaning survives red–green color blindness.
export const BAND_GLYPH: Record<Suit, string> = {
  green: '✓',
  yellow: '~',
  red: '✕',
}

export const BAND_LABEL = {
  es: { green: 'Buen momento', yellow: 'Regular', red: 'Mal momento' },
  en: { green: 'Good time', yellow: 'Fair', red: 'Poor time' },
} satisfies Record<Lang, Record<Suit, string>>

// Seasons use weather colors (rain blues, dry sand) so they never read as a
// planting verdict.
export const SEASON_COLOR: Record<SeasonId, string> = {
  primera: '#3D6E8F',
  postrera: '#7FA7C2',
  seca: '#C4A574',
}
