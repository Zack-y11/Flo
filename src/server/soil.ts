export type SoilProfile = {
  ph: number
  clay: number
  sand: number
  soc: number
  nitrogen: number
  origin: 'pin' | 'offset' | 'regional'
  fallback: boolean
}

export type SoilReading =
  | {
      kind: 'profile'
      ph: number
      clay: number
      sand: number
      soc: number
      nitrogen: number
    }
  | { kind: 'empty' }
  | { kind: 'invalid'; error: string }

const FACTORS = [
  { wire: 'phh2o', field: 'ph', divisor: 10 },
  { wire: 'clay', field: 'clay', divisor: 10 },
  { wire: 'sand', field: 'sand', divisor: 10 },
  { wire: 'soc', field: 'soc', divisor: 10 },
  { wire: 'nitrogen', field: 'nitrogen', divisor: 100 },
] as const

const SURFACE = '0-5cm'
const SOIL_TTL_MS = 7 * 24 * 60 * 60 * 1000
const KM_PER_DEGREE = 111.32
const LA_LIBERTAD = { lat: 13.64, lon: -89.38 }
const RING_KM = [
  { northKm: 4, eastKm: 0 },
  { northKm: -4, eastKm: 0 },
  { northKm: 0, eastKm: 4 },
  { northKm: 0, eastKm: -4 },
] as const

type CacheEntry = {
  body: SoilProfile
  expiresAt: number
}

type SoilResult =
  | { ok: true; body: SoilProfile }
  | { ok: false; status: 502; error: string }

const soilCache = new Map<string, CacheEntry>()

export function parseSoil(raw: unknown): SoilReading {
  const layers = layersFrom(raw)
  if (!layers) return { kind: 'invalid', error: 'soilgrids is not a point payload' }
  const means = new Map<string, number | null>()
  for (const layer of layers) {
    if (typeof layer !== 'object' || layer === null) {
      return { kind: 'invalid', error: 'soilgrids layer is unreadable' }
    }
    if (!('name' in layer) || typeof layer.name !== 'string' || means.has(layer.name)) continue
    const mean = surfaceMean(layer)
    if (mean === 'bad') return { kind: 'invalid', error: 'soilgrids mean is unreadable' }
    means.set(layer.name, mean)
  }
  const profile = { ph: 0, clay: 0, sand: 0, soc: 0, nitrogen: 0 }
  let nullMeans = 0
  for (const factor of FACTORS) {
    const mean = means.get(factor.wire)
    if (mean === undefined) return { kind: 'invalid', error: 'soilgrids profile is incomplete' }
    if (mean === null) {
      nullMeans += 1
      continue
    }
    profile[factor.field] = mean / factor.divisor
  }
  if (nullMeans === FACTORS.length) return { kind: 'empty' }
  if (nullMeans > 0) return { kind: 'invalid', error: 'soilgrids profile is incomplete' }
  return { kind: 'profile', ...profile }
}

export async function loadSoil(
  lat: number,
  lon: number,
  fetchPoint: (lat: number, lon: number) => Promise<unknown>,
  now = Date.now(),
): Promise<SoilResult> {
  const key = pointKey(lat, lon)
  const hit = soilCache.get(key)
  if (hit && hit.expiresAt > now) return { ok: true, body: structuredClone(hit.body) }

  const first = await readPoint(fetchPoint, lat, lon)
  if (first.kind === 'unavailable') return { ok: false, status: 502, error: 'soil unavailable' }
  if (first.kind === 'invalid') return { ok: false, status: 502, error: first.error }
  if (first.kind === 'profile') return remember(key, measured(first, 'pin'), now)

  for (const step of RING_KM) {
    const shifted = shift(lat, lon, step.northKm, step.eastKm)
    const next = await readPoint(fetchPoint, shifted.lat, shifted.lon)
    if (next.kind === 'unavailable') return { ok: false, status: 502, error: 'soil unavailable' }
    if (next.kind === 'invalid') return { ok: false, status: 502, error: next.error }
    if (next.kind === 'profile') return remember(key, measured(next, 'offset'), now)
  }

  if (!samePoint(lat, lon, LA_LIBERTAD.lat, LA_LIBERTAD.lon)) {
    const regional = await readPoint(fetchPoint, LA_LIBERTAD.lat, LA_LIBERTAD.lon)
    if (regional.kind === 'unavailable') return { ok: false, status: 502, error: 'soil unavailable' }
    if (regional.kind === 'invalid') return { ok: false, status: 502, error: regional.error }
    if (regional.kind === 'profile') return remember(key, measured(regional, 'regional'), now)
  }

  return { ok: false, status: 502, error: 'soil unavailable' }
}

function measured(
  reading: Extract<SoilReading, { kind: 'profile' }>,
  origin: SoilProfile['origin'],
): SoilProfile {
  return {
    ph: reading.ph,
    clay: reading.clay,
    sand: reading.sand,
    soc: reading.soc,
    nitrogen: reading.nitrogen,
    origin,
    fallback: origin !== 'pin',
  }
}

function remember(key: string, body: SoilProfile, now: number): SoilResult {
  soilCache.set(key, { body: structuredClone(body), expiresAt: now + SOIL_TTL_MS })
  return { ok: true, body: structuredClone(body) }
}

async function readPoint(
  fetchPoint: (lat: number, lon: number) => Promise<unknown>,
  lat: number,
  lon: number,
): Promise<SoilReading | { kind: 'unavailable' }> {
  try {
    return parseSoil(await fetchPoint(lat, lon))
  } catch {
    return { kind: 'unavailable' }
  }
}

function layersFrom(raw: unknown): unknown[] | null {
  if (typeof raw !== 'object' || raw === null) return null
  const properties = (raw as { properties?: unknown }).properties
  if (typeof properties !== 'object' || properties === null) return null
  const layers = (properties as { layers?: unknown }).layers
  if (!Array.isArray(layers)) return null
  return layers
}

function surfaceMean(layer: object): number | null | 'bad' {
  if (!('depths' in layer) || !Array.isArray(layer.depths)) return 'bad'
  const depths: unknown[] = layer.depths
  for (const depth of depths) {
    if (typeof depth !== 'object' || depth === null) continue
    if (!('label' in depth) || depth.label !== SURFACE) continue
    if (!('values' in depth)) return 'bad'
    const { values } = depth
    if (typeof values !== 'object' || values === null || !('mean' in values)) return 'bad'
    const { mean } = values
    if (mean === null) return null
    if (typeof mean !== 'number' || !Number.isFinite(mean)) return 'bad'
    return mean
  }
  return 'bad'
}

function shift(lat: number, lon: number, northKm: number, eastKm: number): { lat: number; lon: number } {
  return {
    lat: lat + northKm / KM_PER_DEGREE,
    lon: lon + eastKm / (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180)),
  }
}

function samePoint(lat: number, lon: number, otherLat: number, otherLon: number): boolean {
  return pointKey(lat, lon) === pointKey(otherLat, otherLon)
}

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`
}
