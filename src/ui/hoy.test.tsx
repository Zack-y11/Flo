import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { CropId, PhaseMark, TodayCard } from '@/domain/calendar'
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

const mark: PhaseMark = {
  phase: 'seca',
  label: 'seca',
  dayOfPhase: 15,
  daysUntilEnd: 166,
}

const waitCard: TodayCard = {
  kind: 'wait',
  cropId: 'frijol',
  suit: 'yellow',
  reason: 'seca',
  sentence: 'Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.',
}

test('Hoy shows the domain status and sends its advice to speech and registration', () => {
  const speak = vi.fn()
  const cancel = vi.fn()
  class Utterance {
    lang = ''
    rate = 1
    constructor(readonly text: string) {}
  }
  Object.assign(globalThis, {
    SpeechSynthesisUtterance: Utterance,
    speechSynthesis: { cancel, speak },
  })
  const onRegister = vi.fn()

  render(
    <Hoy
      card={waitCard}
      mark={mark}
      statusSentence="Día 15 de época seca. Ahora no es ideal para frijol."
      cropLabels={cropLabels}
      lang="es"
      onRegister={onRegister}
    />,
  )

  expect(screen.getByRole('region', { name: 'Hoy' })).toBeTruthy()
  expect(screen.getByRole('img', { name: /Época seca\. Día 15/ })).toBeTruthy()
  expect(screen.getByText('Día 15 de época seca. Ahora no es ideal para frijol.')).toBeTruthy()
  expect(screen.getByText('Frijol')).toBeTruthy()
  expect(screen.getByText('Amarillo')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Escuchar consejo en voz alta' }))
  expect(cancel).toHaveBeenCalledOnce()
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: waitCard.sentence, lang: 'es-SV', rate: 0.9 }))
  fireEvent.click(screen.getByRole('button', { name: 'Registré siembra' }))
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
      mark={{ ...mark, phase: 'primera', label: 'primera', dayOfPhase: 1 }}
      statusSentence="Day 1 of Primera. Good window for maize."
      cropLabels={{ ...cropLabels, maiz: 'Maize' }}
      lang="en"
    />,
  )

  expect(screen.getByRole('region', { name: 'Today' })).toBeTruthy()
  expect(screen.getByText('Maize')).toBeTruthy()
  expect(screen.getByText('Green')).toBeTruthy()
  expect(screen.getByText('Today: plant maize.')).toBeTruthy()
})

test('Hoy announces when plot data are not ready', () => {
  render(<Hoy card={null} mark={null} statusSentence={null} cropLabels={cropLabels} lang="en" />)
  expect(screen.getByRole('status').textContent).toBe('Loading plot data…')
})
