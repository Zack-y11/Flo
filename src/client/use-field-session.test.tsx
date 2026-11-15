import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { CalendarDay, Field } from '@/domain/calendar'
import type { MapPointAttempt } from '@/ui/map-sheet'
import { parseClimatology, parseDailySeries, parseSoil, useFieldSession } from './use-field-session'

const today: CalendarDay = { year: 2026, month: 11, day: 15 }
const initialField: Field = { lat: 13.64, lon: -89.38, label: 'La Libertad (rural)' }

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('maps API values into domain data and rejects incomplete payloads', () => {
  const month = { t2mC: 24, prectotcorrMmDay: 2, solarMj: 3, rhPct: 70, gwetroot: 0.5, gwettop: 0.4 }
  const climatology = parseClimatology({ months: Array.from({ length: 12 }, () => month) })
  expect(climatology?.months[10]).toMatchObject({ month: 11, ...month })
  expect(parseClimatology({ months: [month] })).toBeNull()

  const daily = parseDailySeries({
    validThrough: '2026-11-15',
    days: [{ date: '2026-11-15', ...month }],
  })
  expect(daily?.days[0]).toMatchObject({ date: today, rainMm: 2 })
  expect(parseDailySeries({ validThrough: '2026-02-30', days: [] })).toBeNull()

  expect(parseSoil({ ph: 6.1, soc: 30, clay: 20, sand: 40, nitrogen: 1.2, origin: 'offset', fallback: true }))
    .toMatchObject({ status: 'measured', origin: 'offset', ph: 6.1, socGkg: 30 })
  expect(parseSoil({ ph: 6.1, soc: 30, clay: 20, sand: 40, nitrogen: 1.2, origin: 'pin', fallback: true })).toBeNull()
})

test('requests fifteen years of daily observations for onset calculations', async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => responseFor(String(input)))
  vi.stubGlobal('fetch', fetcher)
  renderHook(() => useFieldSession({
    field: initialField,
    today,
    getCommittedField: () => initialField,
    onCommit: () => true,
  }))

  await settleInitialLoad()

  const dailyRequest = fetcher.mock.calls.map(([input]) => String(input)).find((url) => url.includes('/daily'))
  expect(dailyRequest).toContain('start=20111115')
  expect(dailyRequest).toContain('end=20261115')
})

test('debounces two map picks into one request bundle and commits only the latest point', async () => {
  vi.useFakeTimers()
  const committedRef = { current: initialField }
  const fetcher = vi.fn(async (input: RequestInfo | URL) => responseFor(String(input)))
  vi.stubGlobal('fetch', fetcher)
  const onCommit = vi.fn((next: Field, expected: Field) => {
    if (!sameField(committedRef.current, expected)) return false
    committedRef.current = next
    return true
  })
  const { result, rerender } = renderHook(
    ({ field }: { field: Field }) => useFieldSession({
      field,
      today,
      getCommittedField: () => committedRef.current,
      onCommit,
    }),
    { initialProps: { field: initialField } },
  )

  await settleInitialLoad()
  expect(fetcher).toHaveBeenCalledTimes(3)

  act(() => result.current.onPointAttempt(validPick(13.7, -88.9)))
  await act(async () => { vi.advanceTimersByTime(100) })
  act(() => result.current.onPointAttempt(validPick(13.8, -88.8)))
  await act(async () => { vi.advanceTimersByTime(399) })
  expect(fetcher).toHaveBeenCalledTimes(3)
  await act(async () => {
    vi.advanceTimersByTime(1)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })

  expect(fetcher).toHaveBeenCalledTimes(6)
  expect(onCommit).toHaveBeenCalledOnce()
  expect(onCommit.mock.calls[0]?.[0]).toMatchObject({ lat: 13.8, lon: -88.8 })
  expect(committedRef.current.label).toBe('13.800, -88.800')
  rerender({ field: committedRef.current })
  expect(result.current.session?.point).toEqual({ lat: 13.8, lon: -88.8 })
})

test('an invalid map pick cancels the pending fetch before it can commit', async () => {
  vi.useFakeTimers()
  const committedRef = { current: initialField }
  const fetcher = vi.fn(async (input: RequestInfo | URL) => responseFor(String(input)))
  vi.stubGlobal('fetch', fetcher)
  const onCommit = vi.fn(() => true)
  const { result } = renderHook(() => useFieldSession({
    field: initialField,
    today,
    getCommittedField: () => committedRef.current,
    onCommit,
  }))

  await settleInitialLoad()
  act(() => result.current.onPointAttempt(validPick(13.7, -88.9)))
  await act(async () => { vi.advanceTimersByTime(100) })
  act(() => result.current.onPointAttempt({ kind: 'invalid', point: { lat: 15, lon: -88.9 } }))
  await act(async () => { vi.advanceTimersByTime(500) })

  expect(fetcher).toHaveBeenCalledTimes(3)
  expect(onCommit).not.toHaveBeenCalled()
})

function validPick(lat: number, lon: number): MapPointAttempt {
  return { kind: 'valid', point: { lat, lon } }
}

function sameField(left: Field, right: Field): boolean {
  return left.lat === right.lat && left.lon === right.lon && left.label === right.label
}

async function settleInitialLoad() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function responseFor(url: string) {
  const body = url.includes('/climatology')
    ? { months: Array.from({ length: 12 }, () => ({ t2mC: 24, prectotcorrMmDay: 2, solarMj: 3, rhPct: 70, gwetroot: 0.5, gwettop: 0.4 })) }
    : url.includes('/daily')
      ? { validThrough: '2026-11-15', days: [{ date: '2026-11-15', t2mC: 24, prectotcorrMmDay: 2, solarMj: 3, rhPct: 70, gwetroot: 0.5, gwettop: 0.4 }] }
      : { ph: 6.1, soc: 30, clay: 20, sand: 40, nitrogen: 1.2, origin: 'pin', fallback: false }
  return Promise.resolve({ ok: true, json: async () => body } as Response)
}
