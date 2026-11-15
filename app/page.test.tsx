import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import Page from './page'

beforeEach(() => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test.each([
  ['at midnight', async () => { await vi.advanceTimersByTimeAsync(1_000) }],
  ['when the window regains focus', () => {
    vi.setSystemTime(new Date(2026, 10, 16, 8))
    window.dispatchEvent(new Event('focus'))
  }],
  ['when the tab becomes visible', () => {
    vi.setSystemTime(new Date(2026, 10, 16, 8))
    document.dispatchEvent(new Event('visibilitychange'))
  }],
])('refreshes today’s advice and daily request %s', async (_when, advanceDay) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 15, 23, 59, 59))
  const climate = { t2mC: 24, prectotcorrMmDay: 2, solarMj: 3, rhPct: 70, gwetroot: 0.5, gwettop: 0.4 }
  const fetcher = vi.fn(async (url: string) => url.startsWith('/api/power/climatology?')
    ? Response.json({ months: Array.from({ length: 12 }, () => climate) })
    : new Response(null, { status: 503 }))
  vi.stubGlobal('fetch', fetcher)

  await act(async () => { render(<Page />) })
  expect(screen.getByRole('img', { name: 'Época seca. Día 15.' })).toBeTruthy()

  await act(async () => { await advanceDay() })

  expect(screen.getByRole('img', { name: 'Época seca. Día 16.' })).toBeTruthy()
  const dailyRequests = fetcher.mock.calls
    .map(([url]) => new URL(url, 'http://localhost'))
    .filter((url) => url.pathname === '/api/power/daily')
  expect(dailyRequests.map((url) => url.searchParams.get('end'))).toEqual(['20261115', '20261116'])
  expect(screen.getByLabelText<HTMLInputElement>('Fecha de siembra').value).toBe('2026-11-16')
})

test('preserves a manually selected planting date when the day changes', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 15, 23, 59, 59))
  await act(async () => { render(<Page />) })
  const date = screen.getByLabelText<HTMLInputElement>('Fecha de siembra')
  fireEvent.change(date, { target: { value: '2026-11-12' } })

  await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

  expect(date.value).toBe('2026-11-12')
})
