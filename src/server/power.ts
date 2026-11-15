export type MonthClimate = {
  t2mC: number
  prectotcorrMmDay: number
  solarMj: number
  rhPct: number
  gwetroot: number
  gwettop: number
}

export type Climatology = {
  months: [
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
  ]
}

export type DailyRow = {
  date: string
  t2mC: number
  prectotcorrMmDay: number
  solarMj: number
  rhPct: number
  gwetroot: number
  gwettop: number
}

export type DailySeries = {
  days: DailyRow[]
  validThrough: string
}

export type NasaResult<T> =
  | { ok: true; body: T }
  | { ok: false; status: 502; error: string }

const FILL = -999
const DAILY_TTL_MS = 6 * 60 * 60 * 1000
const CLIMATOLOGY_TTL_MS = 7 * 24 * 60 * 60 * 1000

const MONTH_KEYS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

const PARAMETERS = [
  ['T2M', 't2mC'],
  ['PRECTOTCORR', 'prectotcorrMmDay'],
  ['ALLSKY_SFC_SW_DWN', 'solarMj'],
  ['RH2M', 'rhPct'],
  ['GWETROOT', 'gwetroot'],
  ['GWETTOP', 'gwettop'],
] as const

type CacheEntry<T> = {
  body: T
  expiresAt: number
}

const dailyCache = new Map<string, CacheEntry<DailySeries>>()
const climatologyCache = new Map<string, CacheEntry<Climatology>>()

export function parseDaily(raw: unknown): { ok: true; body: DailySeries } | { ok: false; error: string } {
  const columns = columnsFrom(raw)
  if (!columns) return { ok: false, error: 'power daily is not a point payload' }
  const days: DailyRow[] = []
  for (const day of dateKeys(columns)) {
    const row = rowFrom(columns, day)
    if (row) days.push(row)
  }
  const last = days[days.length - 1]
  if (!last) return { ok: false, error: 'power daily has no valid days' }
  return { ok: true, body: { days, validThrough: last.date } }
}

export function parseClimatology(
  raw: unknown,
): { ok: true; body: Climatology } | { ok: false; error: string } {
  const columns = columnsFrom(raw)
  if (!columns) return { ok: false, error: 'power climatology is not a point payload' }
  const months: MonthClimate[] = []
  for (const month of MONTH_KEYS) {
    const row = monthFrom(columns, month)
    if (!row) return { ok: false, error: 'power climatology is missing a month' }
    months.push(row)
  }
  return {
    ok: true,
    body: {
      months: [
        months[0],
        months[1],
        months[2],
        months[3],
        months[4],
        months[5],
        months[6],
        months[7],
        months[8],
        months[9],
        months[10],
        months[11],
      ],
    },
  }
}

export function loadDaily(
  input: { lat: number; lon: number; start: string; end: string },
  fetchRaw: () => Promise<unknown>,
  now = Date.now(),
): Promise<NasaResult<DailySeries>> {
  const key = `${pointKey(input.lat, input.lon)}|${input.start}|${input.end}`
  return loadCached(dailyCache, key, DAILY_TTL_MS, now, fetchRaw, parseDaily, 'power daily unavailable')
}

export function loadClimatology(
  lat: number,
  lon: number,
  fetchRaw: () => Promise<unknown>,
  now = Date.now(),
): Promise<NasaResult<Climatology>> {
  return loadCached(
    climatologyCache,
    pointKey(lat, lon),
    CLIMATOLOGY_TTL_MS,
    now,
    fetchRaw,
    parseClimatology,
    'power climatology unavailable',
  )
}

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`
}

function columnsFrom(raw: unknown): Array<Record<string, unknown>> | null {
  if (typeof raw !== 'object' || raw === null) return null
  const properties = (raw as { properties?: unknown }).properties
  if (typeof properties !== 'object' || properties === null) return null
  const parameter = (properties as { parameter?: unknown }).parameter
  if (typeof parameter !== 'object' || parameter === null || Array.isArray(parameter)) return null
  const record = parameter as Record<string, unknown>
  const columns: Array<Record<string, unknown>> = []
  for (const [wire] of PARAMETERS) {
    const series = record[wire]
    if (typeof series !== 'object' || series === null || Array.isArray(series)) return null
    columns.push(series as Record<string, unknown>)
  }
  return columns
}

function dateKeys(columns: Array<Record<string, unknown>>): string[] {
  const dates = new Set<string>()
  for (const column of columns) {
    for (const key of Object.keys(column)) {
      if (/^\d{8}$/.test(key)) dates.add(key)
    }
  }
  return [...dates].sort()
}

function rowFrom(columns: Array<Record<string, unknown>>, day: string): DailyRow | null {
  const values = readings(columns, day)
  if (!values) return null
  return {
    date: `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`,
    t2mC: values[0],
    prectotcorrMmDay: values[1],
    solarMj: values[2],
    rhPct: values[3],
    gwetroot: values[4],
    gwettop: values[5],
  }
}

function monthFrom(columns: Array<Record<string, unknown>>, month: string): MonthClimate | null {
  const values = readings(columns, month)
  if (!values) return null
  return {
    t2mC: values[0],
    prectotcorrMmDay: values[1],
    solarMj: values[2],
    rhPct: values[3],
    gwetroot: values[4],
    gwettop: values[5],
  }
}

function readings(columns: Array<Record<string, unknown>>, key: string): number[] | null {
  const values: number[] = []
  for (let index = 0; index < PARAMETERS.length; index += 1) {
    const value = columns[index]?.[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value === FILL) return null
    values.push(value)
  }
  return values
}

async function loadCached<T>(
  store: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  now: number,
  fetchRaw: () => Promise<unknown>,
  parse: (raw: unknown) => { ok: true; body: T } | { ok: false; error: string },
  unavailable: string,
): Promise<NasaResult<T>> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) return { ok: true, body: structuredClone(hit.body) }
  let raw: unknown
  try {
    raw = await fetchRaw()
  } catch {
    return { ok: false, status: 502, error: unavailable }
  }
  const parsed = parse(raw)
  if (!parsed.ok) return { ok: false, status: 502, error: parsed.error }
  store.set(key, { body: structuredClone(parsed.body), expiresAt: now + ttlMs })
  return { ok: true, body: structuredClone(parsed.body) }
}
