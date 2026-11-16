import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  cycleStatus,
  scoreMonth,
  todayCard,
  type AdviceInput,
  type CropId,
  type MonthNo,
  type TodayCard,
} from '@/domain/calendar'
import { Hoy } from './siembra-ahora'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const cropLabels: Record<CropId, string> = {
  maiz: 'Maíz',
  frijol: 'Frijol',
  sorgo: 'Maicillo',
  cafe: 'Café',
  canavalia: 'Canavalia',
}

test('Hoy renders dry-season advice for 15 Nov 2026 with the maize oracle climatology', () => {
  const dryMonth = (month: MonthNo) => ({
    month,
    t2mC: 21,
    prectotcorrMmDay: 0,
    solarMj: 0,
    rhPct: 0,
    gwetroot: 0,
    gwettop: 0,
  })
  const january = { ...dryMonth(1), t2mC: 24, prectotcorrMmDay: 100 / 31 }
  const input: AdviceInput = {
    today: { year: 2026, month: 11, day: 15 },
    climatology: {
      months: [
        january, dryMonth(2), dryMonth(3), dryMonth(4), dryMonth(5), dryMonth(6),
        dryMonth(7), dryMonth(8), dryMonth(9), dryMonth(10), dryMonth(11), dryMonth(12),
      ],
    },
    soil: { status: 'measured', origin: 'pin', ph: 6.5, socGkg: 0, clayPct: 0, sandPct: 0, nitrogenGkg: 0 },
    whatIf: { dT: 0, rainFactor: 1 },
    daily: null,
    logs: [],
    lang: 'es',
  }
  expect(scoreMonth('maiz', january, input.soil, input.whatIf).band).toBe('green')
  const card = todayCard(input)
  const status = cycleStatus(input)

  const speak = vi.fn()
  const cancel = vi.fn()
  class Utterance {
    lang = ''
    rate = 1
    constructor(readonly text: string) {}
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  vi.stubGlobal('speechSynthesis', { cancel, speak })
  const onRegister = vi.fn()

  render(
    <Hoy
      card={card}
      mark={status.mark}
      statusSentence={status.sentence}
      cropLabels={cropLabels}
      lang="es"
      onRegister={onRegister}
    />,
  )

  expect(screen.getByRole('region', { name: 'Hoy' })).toBeTruthy()
  const ring = within(screen.getByRole('img', { name: 'Época seca. Día 15.' }))
  expect(ring.getByText('Día 15')).toBeTruthy()
  expect(screen.getByText('Día 15 de época seca. Ventana regular para maíz.')).toBeTruthy()
  const article = within(screen.getByRole('article'))
  const waitSentence = 'Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.'
  expect(article.getByText('Maíz')).toBeTruthy()
  expect(article.getByText('Regular')).toBeTruthy()
  expect(article.getByText(waitSentence)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Escuchar consejo en voz alta' }))
  expect(cancel).toHaveBeenCalledOnce()
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: waitSentence, lang: 'es-SV', rate: 0.9 }))
  fireEvent.click(screen.getByRole('button', { name: 'Registrar siembra' }))
  expect(onRegister).toHaveBeenCalledOnce()
})

test('Hoy labels a planting card with the shared crop name and selected band', () => {
  const card: TodayCard = {
    kind: 'plant',
    cropId: 'maiz',
    suit: 'green',
    irrigation: false,
    sentence: 'Today: plant maize.',
  }

  render(
    <Hoy
      card={card}
      mark={{ phase: 'primera', label: 'primera', dayOfPhase: 1, daysUntilEnd: 91 }}
      statusSentence="Day 1 of Primera. Good window for maize."
      cropLabels={{ ...cropLabels, maiz: 'Maize' }}
      lang="en"
    />,
  )

  expect(screen.getByRole('region', { name: 'Today' })).toBeTruthy()
  expect(screen.getByText('Maize')).toBeTruthy()
  expect(screen.getByText('Good time')).toBeTruthy()
  expect(screen.getByText('Today: plant maize.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Record a planting' })).toBeTruthy()
})

test('Hoy announces when plot data are not ready', () => {
  render(<Hoy card={null} mark={null} statusSentence={null} cropLabels={cropLabels} lang="en" />)
  expect(screen.getByRole('status').textContent).toBe('Loading plot data…')
})
