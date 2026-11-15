import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import DatosPage from '../../app/datos/page'
import { dispatch } from '@/state/store'

beforeEach(() => {
  dispatch({ type: 'setLang', lang: 'es' })
})

afterEach(() => {
  cleanup()
  dispatch({ type: 'setLang', lang: 'es' })
})

test('cites the data sources, compiled crop ranges, and method in Spanish', () => {
  render(<DatosPage />)

  expect(screen.getByRole('heading', { level: 1, name: 'Datos y método' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'NASA POWER' }).getAttribute('href')).toContain('power.larc.nasa.gov')
  expect(screen.getByRole('link', { name: 'ISRIC SoilGrids' }).getAttribute('href')).toContain('rest.isric.org/soilgrids')
  expect(screen.getByText(/valores de referencia compilados/)).toBeTruthy()
  expect(screen.getByText(/portal ECOCROP no estaba disponible el/)).toBeTruthy()
  expect(screen.getByText('2026-11-14')).toBeTruthy()
  expect(screen.getByText(/0\.45 × puntaje de temperatura \+ 0\.40 × puntaje de lluvia \+ 0\.15 × puntaje de pH/)).toBeTruthy()
  expect(screen.getByText(/semana completa de días consecutivos/)).toBeTruthy()
  expect(screen.getByRole('rowheader', { name: 'Maíz' })).toBeTruthy()
  expect(screen.getByText('500–800')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Volver al calendario' }).getAttribute('href')).toBe('/')
})

test('translates citations and explains that recent rainfall may be unavailable in English', () => {
  dispatch({ type: 'setLang', lang: 'en' })
  render(<DatosPage />)

  expect(screen.getByRole('heading', { level: 1, name: 'Data and method' })).toBeTruthy()
  expect(screen.getByText(/compiled defaults/)).toBeTruthy()
  expect(screen.getByText(/ECOCROP portal was unavailable on/)).toBeTruthy()
  expect(screen.getByText(/full consecutive week is available/)).toBeTruthy()
  expect(screen.getByText(/latest observation is no more than 3 days old/)).toBeTruthy()
  expect(screen.getByRole('rowheader', { name: 'Maize' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'ES' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Datos y método' })).toBeTruthy()
})
