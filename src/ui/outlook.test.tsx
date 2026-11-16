import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Outlook } from './outlook'

afterEach(cleanup)

test('shows the onset window, confidence, dry-spell level, and disclaimer', () => {
  render(
    <Outlook
      lang="es"
      data={{
        kind: 'ready',
        onset: { p25Doy: 101, p75Doy: 115, medianDoy: 108, confidence: 'alta' },
        drySpell: { level: 'medio' },
      }}
    />,
  )

  expect(screen.getByRole('heading', { name: 'Inicio de las lluvias' })).toBeTruthy()
  expect(screen.getByText(/las lluvias suelen empezar entre/)).toBeTruthy()
  expect(screen.getByText(/La fecha más común es el/)).toBeTruthy()
  expect(screen.getByText(/Confianza alta/)).toBeTruthy()
  expect(screen.getByText('Medio')).toBeTruthy()
  expect(screen.getByText(/No es un pronóstico/)).toBeTruthy()
})

test('shows explicit missing states for short or unavailable series', () => {
  render(
    <Outlook
      lang="en"
      data={{
        kind: 'ready',
        onset: { p25Doy: null, p75Doy: null, medianDoy: null, confidence: 'baja' },
        drySpell: null,
      }}
    />,
  )

  expect(screen.getByText('There are too few years of data to estimate when the rains usually begin.')).toBeTruthy()
  expect(screen.getByText('There is too little recent rainfall data to estimate the risk.')).toBeTruthy()
})

test.each([
  ['bajo', 'Bajo'],
  ['medio', 'Medio'],
  ['alto', 'Alto'],
] as const)('translates the %s dry-spell level in Spanish', (level, label) => {
  render(
    <Outlook
      lang="es"
      data={{
        kind: 'ready',
        onset: { p25Doy: 101, p75Doy: 115, medianDoy: 108, confidence: 'alta' },
        drySpell: { level },
      }}
    />,
  )

  expect(screen.getByText(label)).toBeTruthy()
  expect(document.body.textContent).not.toContain(level)
})

test('translates both outlooks in English', () => {
  render(
    <Outlook
      lang="en"
      data={{
        kind: 'ready',
        onset: { p25Doy: 101, p75Doy: 115, medianDoy: 108, confidence: 'media' },
        drySpell: { level: 'alto' },
      }}
    />,
  )

  expect(screen.getByRole('heading', { name: 'Start of the rainy season' })).toBeTruthy()
  expect(screen.getByText(/the rains usually start between/)).toBeTruthy()
  expect(screen.getByText(/Medium confidence/)).toBeTruthy()
  expect(screen.getByText('High')).toBeTruthy()
  expect(screen.getByText(/This is not a forecast/)).toBeTruthy()
})

test('shows loading instead of missing-data messages before the request finishes', () => {
  render(<Outlook lang="es" data={{ kind: 'loading' }} />)

  expect(screen.getByRole('status').textContent).toContain('Cargando')
  expect(screen.queryByText(/No hay años suficientes/)).toBeNull()
  expect(screen.queryByText(/No hay datos recientes/)).toBeNull()
})
