import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import Page from './page'

beforeEach(() => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('horizontal arrow keys move focus and selection between tabs and wrap at both ends', async () => {
  render(<Page />)
  await screen.findByText('Los datos de clima no están disponibles para esta parcela.')

  const today = screen.getByRole('tab', { name: 'Hoy' })
  const year = screen.getByRole('tab', { name: 'Este año' })
  const plot = screen.getByRole('tab', { name: 'Mi parcela' })

  today.focus()
  fireEvent.keyDown(today, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(year)
  expect(screen.getByRole('tab', { selected: true })).toBe(year)
  expect(year.tabIndex).toBe(0)
  expect(today.tabIndex).toBe(-1)
  expect(screen.getByRole('tabpanel', { name: 'Este año' })).toBeTruthy()

  fireEvent.keyDown(year, { key: 'ArrowLeft' })
  expect(document.activeElement).toBe(today)

  fireEvent.keyDown(today, { key: 'ArrowLeft' })
  expect(document.activeElement).toBe(plot)
  expect(screen.getByRole('tabpanel', { name: 'Mi parcela' })).toBeTruthy()

  fireEvent.keyDown(plot, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(today)
  expect(screen.getByRole('tab', { selected: true })).toBe(today)
})

test('Home and End activate the first and last tabs while vertical arrows retain their default behavior', async () => {
  render(<Page />)
  await screen.findByText('Los datos de clima no están disponibles para esta parcela.')

  const today = screen.getByRole('tab', { name: 'Hoy' })
  const plot = screen.getByRole('tab', { name: 'Mi parcela' })

  today.focus()
  const endWasNotPrevented = fireEvent.keyDown(today, { key: 'End' })
  expect(document.activeElement).toBe(plot)
  expect(screen.getByRole('tab', { selected: true })).toBe(plot)
  expect(endWasNotPrevented).toBe(false)

  expect(fireEvent.keyDown(plot, { key: 'ArrowDown' })).toBe(true)
  expect(document.activeElement).toBe(plot)

  const homeWasNotPrevented = fireEvent.keyDown(plot, { key: 'Home' })
  expect(document.activeElement).toBe(today)
  expect(screen.getByRole('tab', { selected: true })).toBe(today)
  expect(homeWasNotPrevented).toBe(false)
  expect(screen.getByRole('tabpanel', { name: 'Hoy' }).tabIndex).toBe(0)
})
