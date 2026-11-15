import type { Lang } from '@/state/store'

export type ShellCopy = {
  wordmark: string
  sections: string
  language: string
  spanish: string
  english: string
  tabs: {
    hoy: string
    year: string
    field: string
  }
}

export const messages: Record<Lang, ShellCopy> = {
  es: {
    wordmark: 'Flo para la finca',
    sections: 'Secciones',
    language: 'Idioma',
    spanish: 'ES',
    english: 'EN',
    tabs: {
      hoy: 'Hoy',
      year: 'Este año',
      field: 'Mi parcela',
    },
  },
  en: {
    wordmark: 'Flo for the farm',
    sections: 'Sections',
    language: 'Language',
    spanish: 'ES',
    english: 'EN',
    tabs: {
      hoy: 'Today',
      year: 'This year',
      field: 'My plot',
    },
  },
}
