'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isFieldPoint, type FieldPoint } from '@/domain/field'
import type {
  CalendarDay,
  Climatology,
  DailySeries,
  MonthClimate,
  MonthNo,
  Soil,
} from '@/domain/calendar'
import type { Field } from '@/state/store'
import type { MapPointAttempt } from '@/ui/map-sheet'

type LoadResult = {
  climatology: Climatology | null
  daily: DailySeries | null
  soil: Soil
  successfulSources: number
}

export type FieldSession = LoadResult & {
  loadKey: string
  point: FieldPoint
}

export type FieldSessionStatus = 'idle' | 'loading' | 'error'

type Options = {
  field: Field
  today: CalendarDay
  getCommittedField: () => Field
  onCommit: (next: Field, expected: Field) => boolean
  debounceMs?: number
}

type Result = {
  session: FieldSession | null
  initialLoading: boolean
  mapStatus: FieldSessionStatus
  onPointAttempt: (attempt: MapPointAttempt) => void
}

type LoadKeyInput = { lat: number; lon: number; today: CalendarDay }

const DAILY_WINDOW_YEARS = 2
const DEFAULT_DEBOUNCE_MS = 400
const MONTHS: readonly MonthNo[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function useFieldSession({
  field,
  today,
  getCommittedField,
  onCommit,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: Options): Result {
  const [session, setSession] = useState<FieldSession | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [mapStatus, setMapStatus] = useState<FieldSessionStatus>('idle')
  const sessionRef = useRef<FieldSession | null>(null)
  const mapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapController = useRef<AbortController | null>(null)
  const mapGeneration = useRef(0)
  const committedLoadGeneration = useRef(0)
  const todayKey = formatDay(today)
  const committedLoadKey = makeLoadKey({ lat: field.lat, lon: field.lon, today })

  const cancelMapWork = useCallback(() => {
    mapGeneration.current += 1
    if (mapTimer.current !== null) clearTimeout(mapTimer.current)
    mapTimer.current = null
    mapController.current?.abort()
    mapController.current = null
  }, [])

  useEffect(() => {
    const cached = sessionRef.current
    if (cached?.loadKey === committedLoadKey) {
      setSession(cached)
      setInitialLoading(false)
      return
    }

    const generation = ++committedLoadGeneration.current
    const controller = new AbortController()
    setInitialLoading(true)
    void loadPoint(field, todayKey, controller.signal).then((loaded) => {
      if (generation !== committedLoadGeneration.current) return
      const next = makeSession(committedLoadKey, field, loaded)
      sessionRef.current = next
      setSession(next)
      setInitialLoading(false)
    })

    return () => {
      committedLoadGeneration.current += 1
      controller.abort()
    }
  }, [committedLoadKey, field, todayKey])

  useEffect(() => {
    cancelMapWork()
    setMapStatus('idle')
  }, [field.lat, field.lon, field.label, field.soilFallback, cancelMapWork])

  const onPointAttempt = useCallback((attempt: MapPointAttempt) => {
    cancelMapWork()
    setMapStatus('idle')
    if (attempt.kind !== 'valid' || !isFieldPoint(attempt.point)) return

    const expected = getCommittedField()
    const point = { lat: attempt.point.lat, lon: attempt.point.lon }
    const loadKey = makeLoadKey({ ...point, today })
    if (sessionRef.current?.loadKey === loadKey) return

    const generation = mapGeneration.current
    setMapStatus('loading')
    mapTimer.current = setTimeout(() => {
      mapTimer.current = null
      if (generation !== mapGeneration.current) return
      const controller = new AbortController()
      mapController.current = controller
      void loadPoint(point, todayKey, controller.signal).then((loaded) => {
        if (generation !== mapGeneration.current) return
        mapController.current = null
        if (loaded.successfulSources === 0) {
          setMapStatus('error')
          return
        }
        const current = getCommittedField()
        if (!sameField(current, expected)) {
          setMapStatus('idle')
          return
        }
        const nextField = fieldFromPoint(point, loaded.soil, current)
        if (!onCommit(nextField, expected)) {
          setMapStatus('idle')
          return
        }
        const nextSession = makeSession(loadKey, nextField, loaded)
        sessionRef.current = nextSession
        setSession(nextSession)
        setInitialLoading(false)
        setMapStatus('idle')
      })
    }, debounceMs)
  }, [cancelMapWork, debounceMs, field, getCommittedField, onCommit, today, todayKey])

  useEffect(() => () => cancelMapWork(), [cancelMapWork])

  return {
    session: session?.loadKey === committedLoadKey ? session : null,
    initialLoading,
    mapStatus,
    onPointAttempt,
  }
}

export function makeLoadKey({ lat, lon, today }: LoadKeyInput): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}|${formatDay(today)}`
}

export function parseClimatology(value: unknown): Climatology | null {
  if (!isRecord(value) || !Array.isArray(value.months) || value.months.length !== 12) return null
  const months: MonthClimate[] = []
  for (let index = 0; index < MONTHS.length; index += 1) {
    const raw = value.months[index]
    if (!isRecord(raw)) return null
    const values = [raw.t2mC, raw.prectotcorrMmDay, raw.solarMj, raw.rhPct, raw.gwetroot, raw.gwettop]
    if (!values.every(isFiniteNumber)) return null
    const [t2mC, prectotcorrMmDay, solarMj, rhPct, gwetroot, gwettop] = values as NumericValues
    const month = MONTHS[index]
    if (month === undefined) return null
    months.push({
      month,
      t2mC,
      prectotcorrMmDay,
      solarMj,
      rhPct,
      gwetroot,
      gwettop,
    })
  }
  return {
    months: [
      months[0]!, months[1]!, months[2]!, months[3]!, months[4]!, months[5]!,
      months[6]!, months[7]!, months[8]!, months[9]!, months[10]!, months[11]!,
    ],
  }
}

export function parseDailySeries(value: unknown): DailySeries | null {
  if (!isRecord(value) || !Array.isArray(value.days)) return null
  const validThrough = parseCalendarDay(value.validThrough)
  if (!validThrough) return null
  const days = value.days.flatMap((raw): DailySeries['days'][number][] => {
    if (!isRecord(raw)) return []
    const date = parseCalendarDay(raw.date)
    const values = [raw.t2mC, raw.prectotcorrMmDay, raw.solarMj, raw.rhPct, raw.gwetroot, raw.gwettop]
    if (!date || !values.every(isFiniteNumber)) return []
    const [t2mC, prectotcorrMmDay, solarMj, rhPct, gwetroot, gwettop] = values as NumericValues
    return [{
      date,
      t2mC,
      rainMm: prectotcorrMmDay,
      solarMj,
      rhPct,
      gwetroot,
      gwettop,
    }]
  }).sort((a, b) => compareDays(a.date, b.date))
  if (days.length === 0 || compareDays(days[days.length - 1]!.date, validThrough) !== 0) return null
  return { days, validThrough }
}

export function parseSoil(value: unknown): Soil | null {
  if (!isRecord(value)) return null
  const origin = value.origin
  if (origin !== 'pin' && origin !== 'offset' && origin !== 'regional') return null
  const values = [value.ph, value.soc, value.clay, value.sand, value.nitrogen]
  if (!values.every(isFiniteNumber) || value.fallback !== (origin !== 'pin')) return null
  const [ph, socGkg, clayPct, sandPct, nitrogenGkg] = values as [number, number, number, number, number]
  return {
    status: 'measured',
    origin,
    ph,
    socGkg,
    clayPct,
    sandPct,
    nitrogenGkg,
  }
}

function makeSession(loadKey: string, field: Field, loaded: LoadResult): FieldSession {
  return { loadKey, point: { lat: field.lat, lon: field.lon }, ...loaded }
}

async function loadPoint(point: FieldPoint, today: string, signal: AbortSignal): Promise<LoadResult> {
  const [climatologyResult, dailyResult, soilResult] = await Promise.allSettled([
    fetchJson(`/api/power/climatology?${pointQuery(point)}`, signal).then(parseClimatology),
    fetchJson(`/api/power/daily?${pointQuery(point)}&start=${dailyStart(today)}&end=${today.replaceAll('-', '')}`, signal).then(parseDailySeries),
    fetchJson(`/api/soil?${pointQuery(point)}`, signal).then(parseSoil),
  ])
  const climatology = settledValue(climatologyResult)
  const daily = settledValue(dailyResult)
  const measuredSoil = settledValue(soilResult)
  return {
    climatology,
    daily,
    soil: measuredSoil ?? { status: 'missing' },
    successfulSources: Number(climatology !== null) + Number(daily !== null) + Number(measuredSoil !== null),
  }
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<unknown>
}

function settledValue<T>(result: PromiseSettledResult<T | null>): T | null {
  return result.status === 'fulfilled' ? result.value : null
}

function pointQuery(point: FieldPoint): string {
  const query = new URLSearchParams({ lat: String(point.lat), lon: String(point.lon) })
  return query.toString()
}

function dailyStart(today: string): string {
  const [year, month, day] = today.split('-').map(Number)
  const start = new Date(Date.UTC(year! - DAILY_WINDOW_YEARS, month! - 1, day!))
  return `${start.getUTCFullYear()}${pad(start.getUTCMonth() + 1)}${pad(start.getUTCDate())}`
}

function fieldFromPoint(point: FieldPoint, soil: Soil, current: Field): Field {
  const next: Field = {
    lat: point.lat,
    lon: point.lon,
    label: `${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}`,
  }
  if (soil.status === 'measured') next.soilFallback = soil.origin !== 'pin'
  if (samePoint(point, current)) return { ...current, ...next }
  return next
}

function parseCalendarDay(value: unknown): CalendarDay | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null
  return { year, month: month as MonthNo, day } as CalendarDay
}

function formatDay(day: CalendarDay): string {
  return `${day.year}-${pad(day.month)}-${pad(day.day)}`
}

function compareDays(left: CalendarDay, right: CalendarDay): number {
  return formatDay(left).localeCompare(formatDay(right))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

type NumericValues = [number, number, number, number, number, number]

function samePoint(left: Pick<Field, 'lat' | 'lon'>, right: Pick<Field, 'lat' | 'lon'>): boolean {
  return left.lat === right.lat && left.lon === right.lon
}

function sameField(left: Field, right: Field): boolean {
  return left.lat === right.lat && left.lon === right.lon && left.label === right.label && left.soilFallback === right.soilFallback
}
