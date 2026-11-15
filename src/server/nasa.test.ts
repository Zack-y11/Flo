import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { GET as getClimatology } from '../../app/api/power/climatology/route'
import { GET as getDaily } from '../../app/api/power/daily/route'
import { GET as getSoil } from '../../app/api/soil/route'
import { loadClimatology, loadDaily, parseClimatology, parseDaily } from './power'
import { loadSoil, parseSoil } from './soil'

const root = fileURLToPath(new URL('../..', import.meta.url))
const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const LA_LIBERTAD = { lat: 13.64, lon: -89.38 }
const PARAMETERS = ['T2M', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'RH2M', 'GWETROOT', 'GWETTOP'] as const
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const
const SURFACE = { phh2o: 59, clay: 383, sand: 303, soc: 486, nitrogen: 337 }
const DEEPER = { phh2o: 59, clay: 415, sand: 283, soc: 294, nitrogen: 242 }

let gate = Promise.resolve()

function serial(name: string, fn: () => Promise<void> | void) {
  const ready = gate
  let release: () => void = () => {}
  gate = new Promise<void>((resolve) => {
    release = resolve
  })
  test(name, async () => {
    await ready
    try {
      await fn()
    } finally {
      release()
    }
  })
}

function powerBody(columns: Record<string, Record<string, number>>): unknown {
  return { properties: { parameter: columns } }
}

function uniformColumns(values: Record<string, number>): Record<string, Record<string, number>> {
  const columns: Record<string, Record<string, number>> = {}
  for (const name of PARAMETERS) columns[name] = { ...values }
  return columns
}

function soilBody(
  surface: Record<string, number | null>,
  deeper: Record<string, number | null> = surface,
): unknown {
  return {
    properties: {
      layers: Object.keys(surface).map((name) => ({
        name,
        unit_measure: { d_factor: 1 },
        depths: [
          { label: '0-5cm', values: { mean: surface[name] } },
          { label: '5-15cm', values: { mean: deeper[name] } },
        ],
      })),
    },
  }
}

function emptySoil(): unknown {
  return soilBody({ phh2o: null, clay: null, sand: null, soc: null, nitrogen: null })
}

function measuredSoil(): unknown {
  return soilBody(SURFACE, DEEPER)
}

async function withFetch(handler: (url: string) => unknown, run: () => Promise<void>): Promise<string[]> {
  const previous = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = async (input) => {
    const url = String(input)
    calls.push(url)
    const body = handler(url)
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    await run()
    return calls
  } finally {
    globalThis.fetch = previous
  }
}

function soilPoint(url: string): { lat: number; lon: number } {
  const parsed = new URL(url)
  return {
    lat: Number(parsed.searchParams.get('lat')),
    lon: Number(parsed.searchParams.get('lon')),
  }
}

function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLat = lat2 - lat1
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

function isPin(lat: number, lon: number): boolean {
  return Math.abs(lat - LA_LIBERTAD.lat) < 1e-4 && Math.abs(lon - LA_LIBERTAD.lon) < 1e-4
}

serial('parse climatology into twelve domain months', () => {
  const columns = uniformColumns(Object.fromEntries(MONTHS.map((month) => [month, 1])))
  columns.T2M = { ...columns.T2M, JAN: 26.1, DEC: 25.87, ANN: 99 }
  columns.PRECTOTCORR = { ...columns.PRECTOTCORR, JAN: 4.5, ANN: 99 }
  columns.ALLSKY_SFC_SW_DWN = { ...columns.ALLSKY_SFC_SW_DWN, JAN: 18.2 }
  columns.RH2M = { ...columns.RH2M, JAN: 72 }
  columns.GWETROOT = { ...columns.GWETROOT, JAN: 0.41 }
  columns.GWETTOP = { ...columns.GWETTOP, JAN: 0.28 }
  const parsed = parseClimatology(powerBody(columns))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.body.months.length, 12)
  assert.deepEqual(parsed.body.months[0], {
    t2mC: 26.1,
    prectotcorrMmDay: 4.5,
    solarMj: 18.2,
    rhPct: 72,
    gwetroot: 0.41,
    gwettop: 0.28,
  })
  assert.equal(parsed.body.months[11].t2mC, 25.87)
  const json = JSON.stringify(parsed.body)
  assert.equal(json.includes('T2M'), false)
  assert.equal(json.includes('ANN'), false)
  assert.equal(json.includes('PRECTOTCORR'), false)
  assert.deepEqual(Object.keys(parsed.body), ['months'])
})

serial('trim POWER fill values and keep the last valid date', () => {
  const columns = uniformColumns({
    '20241101': 20,
    '20241102': 21,
    '20241103': 22,
    '20241104': -999,
    '20241105': -999,
  })
  columns.T2M['20241102'] = -999
  const parsed = parseDaily(powerBody(columns))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.deepEqual(
    parsed.body.days.map((day) => day.date),
    ['2024-11-01', '2024-11-03'],
  )
  assert.equal(parsed.body.validThrough, '2024-11-03')
  assert.equal(parsed.body.days[1].t2mC, 22)
  assert.equal(JSON.stringify(parsed.body).includes('T2M'), false)
  assert.equal(JSON.stringify(parsed.body).includes('-999'), false)
})

serial('divide SoilGrids 0-5cm means by the spec factors', () => {
  const parsed = parseSoil(measuredSoil())
  assert.equal(parsed.kind, 'profile')
  if (parsed.kind !== 'profile') return
  assert.equal(parsed.ph, 59 / 10)
  assert.equal(parsed.clay, 383 / 10)
  assert.equal(parsed.sand, 303 / 10)
  assert.equal(parsed.soc, 486 / 10)
  assert.equal(parsed.nitrogen, 337 / 100)
  assert.notEqual(parsed.soc, 294 / 10)
  const json = JSON.stringify(parsed)
  assert.equal(json.includes('d_factor'), false)
  assert.equal(json.includes('phh2o'), false)
  console.log(
    `nasa-soil-fixture ${JSON.stringify({
      ph: parsed.ph,
      clay: parsed.clay,
      sand: parsed.sand,
      soc: parsed.soc,
      nitrogen: parsed.nitrogen,
      fallback: false,
    })}`,
  )
})

serial('all-null soil retries a 3 to 5 km ring and then La Libertad', async () => {
  const origin = { lat: 13.6929, lon: -89.1872 }
  const calls: Array<{ lat: number; lon: number }> = []
  const result = await loadSoil(origin.lat, origin.lon, async (lat, lon) => {
    calls.push({ lat, lon })
    if (isPin(lat, lon)) return measuredSoil()
    return emptySoil()
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.body.fallback, true)
  assert.equal(result.body.ph, 59 / 10)
  assert.equal(result.body.soc, 486 / 10)
  assert.equal(calls[0].lat, origin.lat)
  assert.equal(calls[0].lon, origin.lon)
  assert.equal(isPin(calls[calls.length - 1].lat, calls[calls.length - 1].lon), true)
  const offsets = calls.slice(1, -1)
  assert.ok(offsets.length > 0)
  for (const offset of offsets) {
    const distance = kmBetween(origin, offset)
    assert.ok(distance >= 3 && distance <= 5, `offset ${distance} km`)
    assert.equal(isPin(offset.lat, offset.lon), false)
  }
  assert.equal(JSON.stringify(result.body).includes('d_factor'), false)
})

serial('a nearby soil hit sets fallback and does not call La Libertad', async () => {
  const origin = { lat: 13.5, lon: -89.2 }
  const calls: Array<{ lat: number; lon: number }> = []
  const result = await loadSoil(origin.lat, origin.lon, async (lat, lon) => {
    calls.push({ lat, lon })
    if (calls.length === 1) return emptySoil()
    return measuredSoil()
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.body.fallback, true)
  assert.equal(calls.length, 2)
  assert.equal(isPin(calls[1].lat, calls[1].lon), false)
  assert.ok(kmBetween(origin, calls[1]) >= 3 && kmBetween(origin, calls[1]) <= 5)
})

serial('a broken soil payload does not call upstream again', async () => {
  let calls = 0
  const result = await loadSoil(13.51, -89.21, async () => {
    calls += 1
    return { error: 'nope' }
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 502)
  assert.equal(calls, 1)
})

serial('an incomplete soil profile does not fall back', async () => {
  let calls = 0
  const result = await loadSoil(13.52, -89.22, async () => {
    calls += 1
    return soilBody({ ...SURFACE, phh2o: null })
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 502)
  assert.equal(calls, 1)
})

serial('two soil calls inside 7 days use one upstream request', async () => {
  const started = 1_700_000_000_000
  let calls = 0
  const fetchPoint = async () => {
    calls += 1
    return measuredSoil()
  }
  const first = await loadSoil(13.11, -89.11, fetchPoint, started)
  const second = await loadSoil(13.11, -89.11, fetchPoint, started + SEVEN_DAYS_MS - 1)
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(calls, 1)
  const third = await loadSoil(13.11, -89.11, fetchPoint, started + SEVEN_DAYS_MS)
  assert.equal(third.ok, true)
  assert.equal(calls, 2)
  if (!second.ok) return
  assert.equal(second.body.fallback, false)
  assert.equal(JSON.stringify(second.body).includes('logs'), false)
  assert.equal(JSON.stringify(second.body).includes('whatIf'), false)
})

serial('two daily calls inside 6 hours use one upstream request', async () => {
  const started = 1_700_000_000_000
  let calls = 0
  const fetchRaw = async () => {
    calls += 1
    return powerBody(uniformColumns({ '20241101': 24, '20241102': -999 }))
  }
  const input = { lat: 13.12, lon: -89.12, start: '20241101', end: '20241102' }
  const first = await loadDaily(input, fetchRaw, started)
  const second = await loadDaily(input, fetchRaw, started + SIX_HOURS_MS - 1)
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(calls, 1)
  const third = await loadDaily(input, fetchRaw, started + SIX_HOURS_MS)
  assert.equal(third.ok, true)
  assert.equal(calls, 2)
  if (!first.ok) return
  assert.equal(first.body.validThrough, '2024-11-01')
})

serial('two climatology calls inside 7 days use one upstream request', async () => {
  const started = 1_700_000_000_000
  let calls = 0
  const fetchRaw = async () => {
    calls += 1
    const columns = uniformColumns(Object.fromEntries(MONTHS.map((month) => [month, 3])))
    for (const name of PARAMETERS) columns[name].ANN = 9
    return powerBody(columns)
  }
  const first = await loadClimatology(13.13, -89.13, fetchRaw, started)
  const second = await loadClimatology(13.13, -89.13, fetchRaw, started + SEVEN_DAYS_MS - 1)
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(calls, 1)
  const third = await loadClimatology(13.13, -89.13, fetchRaw, started + SEVEN_DAYS_MS)
  assert.equal(third.ok, true)
  assert.equal(calls, 2)
  if (!second.ok) return
  assert.equal(second.body.months.length, 12)
  assert.equal(second.body.months[0].t2mC, 3)
})

serial('soil route divides, caches, and stays inside the call budgets', async () => {
  const timing: { firstMs: number; cachedMs: number[] } = { firstMs: 0, cachedMs: [] }
  const calls = await withFetch(
    () => measuredSoil(),
    async () => {
      const url = 'http://127.0.0.1/api/soil?lat=13.14&lon=-89.14'
      const firstStarted = performance.now()
      const first = await getSoil(new Request(url))
      timing.firstMs = performance.now() - firstStarted
      assert.equal(first.status, 200)
      const body: unknown = await first.json()
      const profile = body as {
        ph: number
        clay: number
        sand: number
        soc: number
        nitrogen: number
        fallback: boolean
      }
      assert.equal(profile.ph, 59 / 10)
      assert.equal(profile.clay, 383 / 10)
      assert.equal(profile.sand, 303 / 10)
      assert.equal(profile.soc, 486 / 10)
      assert.equal(profile.nitrogen, 337 / 100)
      assert.equal(profile.fallback, false)
      assert.equal(JSON.stringify(profile).includes('T2M'), false)
      assert.equal(JSON.stringify(profile).includes('d_factor'), false)
      for (let index = 0; index < 5; index += 1) {
        const started = performance.now()
        const response = await getSoil(new Request(url))
        timing.cachedMs.push(performance.now() - started)
        assert.equal(response.status, 200)
      }
    },
  )
  const sorted = [...timing.cachedMs].sort((left, right) => left - right)
  const medianMs = sorted[2]
  console.log(
    `nasa-mock-timing ${JSON.stringify({
      firstMs: timing.firstMs,
      cachedMs: timing.cachedMs,
      medianMs,
      upstream: calls.length,
    })}`,
  )
  assert.equal(calls.length, 1)
  assert.match(calls[0], /lat=13\.14/)
  assert.match(calls[0], /lon=-89\.14/)
  assert.ok(timing.firstMs < 9000, `first uncached call ${timing.firstMs} ms`)
  for (const sample of timing.cachedMs) assert.ok(sample < 100, `cached call ${sample} ms`)
})

serial('daily and climatology routes cache inside the window', async () => {
  const dailyCalls = await withFetch(
    () => powerBody(uniformColumns({ '20241101': 24, '20241102': 25, '20241103': -999 })),
    async () => {
      const url = 'http://127.0.0.1/api/power/daily?lat=13.15&lon=-89.15&start=20241101&end=20241103'
      const first = await getDaily(new Request(url))
      const second = await getDaily(new Request(url))
      assert.equal(first.status, 200)
      assert.equal(second.status, 200)
      const body = (await second.json()) as { validThrough: string; days: Array<{ date: string }> }
      assert.equal(body.validThrough, '2024-11-02')
      assert.deepEqual(
        body.days.map((day) => day.date),
        ['2024-11-01', '2024-11-02'],
      )
      assert.equal(JSON.stringify(body).includes('T2M'), false)
    },
  )
  assert.equal(dailyCalls.length, 1)

  const climateCalls = await withFetch(
    () => {
      const columns = uniformColumns(Object.fromEntries(MONTHS.map((month) => [month, 2])))
      columns.T2M.JAN = 26.1
      columns.T2M.ANN = 99
      return powerBody(columns)
    },
    async () => {
      const url = 'http://127.0.0.1/api/power/climatology?lat=13.16&lon=-89.16'
      const first = await getClimatology(new Request(url))
      const second = await getClimatology(new Request(url))
      assert.equal(first.status, 200)
      assert.equal(second.status, 200)
      const body = (await second.json()) as { months: Array<{ t2mC: number }> }
      assert.equal(body.months.length, 12)
      assert.equal(body.months[0].t2mC, 26.1)
      assert.equal(JSON.stringify(body).includes('T2M'), false)
    },
  )
  assert.equal(climateCalls.length, 1)
})

serial('the soil route walks offsets and then the La Libertad pin', async () => {
  const origin = { lat: 13.7, lon: -89.19 }
  const calls = await withFetch(
    (url) => {
      const point = soilPoint(url)
      if (isPin(point.lat, point.lon)) return measuredSoil()
      return emptySoil()
    },
    async () => {
      const response = await getSoil(
        new Request(`http://127.0.0.1/api/soil?lat=${origin.lat}&lon=${origin.lon}`),
      )
      assert.equal(response.status, 200)
      const body = (await response.json()) as { fallback: boolean; soc: number }
      assert.equal(body.fallback, true)
      assert.equal(body.soc, 486 / 10)
    },
  )
  assert.equal(isPin(soilPoint(calls[0]).lat, soilPoint(calls[0]).lon), false)
  assert.equal(isPin(soilPoint(calls[calls.length - 1]).lat, soilPoint(calls[calls.length - 1]).lon), true)
  for (const url of calls.slice(1, -1)) {
    const distance = kmBetween(origin, soilPoint(url))
    assert.ok(distance >= 3 && distance <= 5, `offset ${distance} km`)
  }
})

serial('missing lat or lon returns an error and does not call upstream', async () => {
  const calls = await withFetch(
    () => {
      throw new Error('upstream')
    },
    async () => {
      const cases = [
        getSoil(new Request('http://127.0.0.1/api/soil?lon=-89.38')),
        getSoil(new Request('http://127.0.0.1/api/soil?lat=13.64')),
        getSoil(new Request('http://127.0.0.1/api/soil?lat=&lon=-89.38')),
        getSoil(new Request('http://127.0.0.1/api/soil?lat=abc&lon=-89.38')),
        getDaily(new Request('http://127.0.0.1/api/power/daily?lon=-89.38&start=20241101&end=20241102')),
        getClimatology(new Request('http://127.0.0.1/api/power/climatology?lat=13.64')),
        getDaily(new Request('http://127.0.0.1/api/power/daily?lat=13.64&lon=-89.38')),
      ]
      const responses = await Promise.all(cases)
      const bodies: Array<{ error: string }> = []
      for (const response of responses) {
        assert.equal(response.status, 400)
        const body = (await response.json()) as { error: string }
        bodies.push(body)
        assert.equal(typeof body.error, 'string')
        assert.ok(body.error.length > 0)
      }
      assert.equal(bodies[0].error, 'missing lat or lon')
      assert.equal(bodies[6].error, 'missing start or end')
    },
  )
  assert.equal(calls.length, 0)
})

serial('NASA hosts stay in the route files', () => {
  const hosts = ['power.larc.nasa.gov', 'rest.isric.org']
  for (const relative of ['src/server/power.ts', 'src/server/soil.ts']) {
    const source = readFileSync(join(root, relative), 'utf8')
    for (const host of hosts) assert.equal(source.includes(host), false, relative)
  }
  const daily = readFileSync(join(root, 'app/api/power/daily/route.ts'), 'utf8')
  const climatology = readFileSync(join(root, 'app/api/power/climatology/route.ts'), 'utf8')
  const soil = readFileSync(join(root, 'app/api/soil/route.ts'), 'utf8')
  assert.equal(daily.includes(hosts[0]), true)
  assert.equal(climatology.includes(hosts[0]), true)
  assert.equal(soil.includes(hosts[1]), true)
  assert.equal(daily.includes(hosts[1]), false)
  assert.equal(soil.includes(hosts[0]), false)
})
