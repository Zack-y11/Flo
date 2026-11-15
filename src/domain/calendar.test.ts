import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  crops,
  cycleStatus,
  nextRotation,
  SCORE_RULES,
  scoreMonth,
  soilHealth,
  todayCard,
  TRAIT_SOURCE,
  yearRows,
  type CalendarDay,
  type Climatology,
  type CropId,
  type CropLog,
  type DailyObservation,
  type DailySeries,
  type MonthClimate,
  type MonthNo,
  type Soil,
  type WhatIf,
} from './calendar.ts'

const steady: WhatIf = { dT: 0, rainFactor: 1 }

function near(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} vs ${expected}`)
}

function measured(ph: number, socGkg = 0): Soil {
  return { status: 'measured', origin: 'pin', ph, socGkg, clayPct: 0, sandPct: 0, nitrogenGkg: 0 }
}

function climate(month: MonthNo, t2mC: number, prectotcorrMmDay: number, extra: Partial<MonthClimate> = {}): MonthClimate {
  return {
    t2mC,
    prectotcorrMmDay,
    solarMj: 0,
    rhPct: 0,
    gwetroot: 0,
    gwettop: 0,
    ...extra,
    month,
  }
}

function yearClimate(t2mC: number, prectotcorrMmDay: number): Climatology {
  const months = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((month) =>
    climate(month, t2mC, prectotcorrMmDay),
  )
  return { months: months as unknown as Climatology['months'] }
}

function withMonth(base: Climatology, month: MonthClimate): Climatology {
  const months = base.months.map((row) => (row.month === month.month ? month : row))
  return { months: months as unknown as Climatology['months'] }
}

function log(cropId: CropId, plantedOn = '2026-05-01'): CropLog {
  return { id: `${cropId}-${plantedOn}`, cropId, plantedOn, createdAt: `${plantedOn}T12:00:00.000Z` }
}

function emptyDaily(today: CalendarDay): DailySeries {
  return { days: [], validThrough: today }
}

function observe(date: CalendarDay, rainMm: number, gwetroot = 0): DailyObservation {
  return { date, t2mC: 24, rainMm, solarMj: 0, rhPct: 0, gwetroot, gwettop: 0 }
}

test('the registry order and the compiled trait source are the only crop table', () => {
  assert.deepEqual(Object.keys(crops), ['maiz', 'frijol', 'sorgo', 'canavalia', 'cafe'])
  assert.equal(TRAIT_SOURCE.table, 'compiled')
  assert.equal(TRAIT_SOURCE.ecocrop, 'HTTP 500')
  assert.equal(TRAIT_SOURCE.checked, '2026-11-14')
  assert.equal(crops.cafe.kind, 'perennial')
  assert.equal(crops.maiz.kind, 'annual')
  assert.throws(() => {
    ;(SCORE_RULES.suitWeights as { temp: number }).temp = 1
  })
})

test('january maize scores the month in millimetres and stays green', () => {
  const month = climate(1, 24, 100 / 31, { solarMj: 18, rhPct: 80, gwetroot: 0.9, gwettop: 0.4 })
  const before = { ...month }
  Object.freeze(month)
  const soil = measured(6.5)
  const oracle = scoreMonth('maiz', month, soil, steady)
  const noisy = scoreMonth('maiz', climate(1, 24, 100 / 31, { solarMj: 0, rhPct: 0, gwetroot: 0, gwettop: 0 }), soil, steady)
  console.log(`maize suit ${oracle.suit}`)
  assert.deepEqual(month, before)
  near(oracle.rainMm, 100, 1e-6, 'month rain is millimetres in the month')
  near(oracle.sliceMm, (650 * 31) / 105, 1e-9, 'maize slice')
  near(oracle.rainScore, 30.27, 0.01, 'faithful rain score')
  near(oracle.suit, 72.11, 0.01, 'faithful suit')
  near(oracle.suit, 72.13, 0.05, 'suit is still about 72.13')
  assert.equal(oracle.band, 'green')
  assert.equal(oracle.tempScore, 100)
  assert.equal(oracle.phScore, 100)
  assert.equal(oracle.droughtLift, false)
  assert.equal(oracle.suit, noisy.suit)
  assert.equal(scoreMonth('maiz', month, measured(4), steady).phScore, 30)

  const scaled = scoreMonth('maiz', month, soil, { dT: 0, rainFactor: 0.8 })
  near(scaled.rainMm, 80, 1e-6, 'rain factor')
  assert.equal(month.prectotcorrMmDay, 100 / 31)

  const hotter = scoreMonth('maiz', climate(1, 28, 100 / 31), soil, { dT: 2, rainFactor: 1 })
  assert.equal(hotter.tC, 30)
  near(hotter.tempScore, 40, 1e-9, 'slider temperature')

  const february = scoreMonth('maiz', climate(2, 24, 2.5), soil, steady)
  assert.equal(february.rainMm, 70)
})

test('maize temperature hits the comfort edges', () => {
  const soil = measured(6.5)
  const at = (t2mC: number) => scoreMonth('maiz', climate(1, t2mC, 100 / 31), soil, steady).tempScore
  assert.equal(at(12), 0)
  assert.equal(at(32), 0)
  near(at(30), 40, 1e-9, 'T 30')
  near(at(18), 66.67, 0.01, 'T 18')
})

test('cafe month target is the annual rain divided by 12', () => {
  const soil = measured(6)
  const january = scoreMonth('cafe', climate(1, 20, 4), soil, steady)
  const february = scoreMonth('cafe', climate(2, 20, 4), soil, steady)
  assert.equal(january.sliceMm, 1600 / 12)
  assert.equal(february.sliceMm, 1600 / 12)
  assert.equal(february.rainMm, 4 * 28)
})

test('missing soil omits pH and divides by 0.85', () => {
  const month = climate(1, 24, 100 / 31)
  const cell = scoreMonth('maiz', month, { status: 'missing' }, steady)
  const rain = (100 * 488) / 1612
  const expected = (0.45 * 100 + 0.4 * rain) / 0.85
  assert.equal(cell.phScore, null)
  assert.equal(cell.tempScore, 100)
  near(cell.rainScore, rain, 1e-6, 'missing-soil rain')
  near(cell.suit, expected, 1e-6, 'renormalized suit')
  assert.equal(cell.band, 'yellow')
  const health = soilHealth([log('maiz')], { status: 'missing' })
  assert.equal(health.score, null)
  assert.equal(health.socPts, null)
})

test('drought lift adds 15 only for a high drought crop below 70', () => {
  const soil = measured(6.5)
  const sorghumDaily = (0.64 * 475) / 105
  const maizeDaily = (0.64 * 650) / 105
  const sorghum = scoreMonth('sorgo', climate(1, 28, sorghumDaily), soil, steady)
  const maize = scoreMonth('maiz', climate(1, 24, maizeDaily), soil, steady)
  near(sorghum.rainScore, 75, 1e-6, 'sorghum rain score')
  assert.equal(sorghum.droughtLift, true)
  near(maize.rainScore, 60, 1e-6, 'maize rain score')
  assert.equal(maize.droughtLift, false)
})

test('15 Nov 2026 is the dry-season wait, day 15, with 166 days left', () => {
  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  const input = {
    today,
    logs: [],
    climatology: yearClimate(10, 0),
    daily: emptyDaily(today),
    soil: measured(6.5),
    whatIf: steady,
    lang: 'es' as const,
  }
  const card = todayCard(input)
  const cycle = cycleStatus(input)
  const rows = yearRows(input, 'three')
  assert.equal(card.kind, 'wait')
  if (card.kind === 'wait') assert.equal(card.reason, 'seca')
  assert.equal(card.sentence, 'Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.')
  assert.equal(card.sentence.includes('postrera'), false)
  assert.equal(cycle.mark.phase, 'seca')
  assert.equal(cycle.mark.label, 'seca')
  assert.equal(cycle.mark.dayOfPhase, 15)
  assert.equal(cycle.mark.daysUntilEnd, 166)
  assert.deepEqual(
    rows.map((row) => [row.seasonId, row.label, row.from, row.through, row.now]),
    [
      ['primera', 'primera', 5, 7, false],
      ['postrera', 'postrera', 8, 10, false],
      ['seca', 'seca', 11, 4, true],
    ],
  )
  const english = todayCard({ ...input, lang: 'en' })
  assert.equal(english.sentence, 'Wait a few days. This is the dry season. The next planting is Primera, in May.')
})

test('irrigation is true only for a green frijol card in November or December', () => {
  const soil = measured(6.5)
  const frijolClimate = yearClimate(24, 130 / 30)
  const november: CalendarDay = { year: 2026, month: 11, day: 15 }
  const december: CalendarDay = { year: 2026, month: 12, day: 10 }
  const may: CalendarDay = { year: 2026, month: 5, day: 15 }
  const base = {
    logs: [],
    climatology: frijolClimate,
    soil,
    whatIf: steady,
    lang: 'es' as const,
  }
  const planted = todayCard({ ...base, today: november, daily: emptyDaily(november) })
  assert.equal(planted.kind, 'plant')
  if (planted.kind === 'plant') {
    assert.equal(planted.cropId, 'frijol')
    assert.equal(planted.irrigation, true)
  }
  assert.equal(planted.sentence, 'Hoy: sembrá frijol. Si tenés riego. La tierra todavía tiene humedad.')
  const late = todayCard({ ...base, today: december, daily: emptyDaily(december) })
  if (late.kind === 'plant') assert.equal(late.irrigation, true)
  const primera = todayCard({ ...base, today: may, daily: emptyDaily(may) })
  assert.equal(primera.kind, 'plant')
  if (primera.kind === 'plant') assert.equal(primera.irrigation, false)
  assert.equal(primera.sentence, 'Día 15 de Primera. Buena ventana para frijol, cierra en 77 días.')
  const rows = yearRows({ ...base, today: november, daily: emptyDaily(november) }, 'four')
  assert.equal(rows[0]?.through, 7)
  assert.equal(rows[2]?.label, 'apante')
  assert.equal(rows[2]?.seasonId, 'seca')
  const cold = yearRows(
    {
      ...base,
      today: november,
      daily: emptyDaily(november),
      climatology: yearClimate(10, 0),
    },
    'four',
  )
  assert.equal(cold[2]?.label, 'seca')
  assert.equal(cold[3]?.label, 'verano')
})

test('a dry run in primera waits for the canícula', () => {
  const today: CalendarDay = { year: 2026, month: 5, day: 15 }
  const end = Date.UTC(2026, 4, 15)
  const days = [0, 0, 0, 0, 0, 0, 0].map((rainMm, index) => {
    const date = new Date(end - (6 - index) * 86_400_000)
    return observe(
      { year: date.getUTCFullYear(), month: (date.getUTCMonth() + 1) as MonthNo, day: date.getUTCDate() },
      rainMm,
    )
  })
  const card = todayCard({
    today,
    logs: [],
    climatology: yearClimate(10, 1),
    daily: { days, validThrough: today },
    soil: measured(6.5),
    whatIf: steady,
    lang: 'es',
  })
  assert.equal(card.kind, 'wait')
  if (card.kind === 'wait') assert.equal(card.reason, 'canicula')
  assert.equal(card.sentence, 'Esperá unos días. Viene un tiempo seco (canícula). No sembrés todavía.')
})

test('cafe joins the day card only when it is the only log', () => {
  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  const input = {
    today,
    climatology: yearClimate(20, 1600 / 12 / 30),
    daily: emptyDaily(today),
    soil: measured(5.5),
    whatIf: steady,
    lang: 'es' as const,
  }
  const open = todayCard({ ...input, logs: [] })
  assert.notEqual(open.cropId, 'cafe')
  const cafe = todayCard({ ...input, logs: [log('cafe')] })
  assert.equal(cafe.kind, 'plant')
  assert.equal(cafe.cropId, 'cafe')
  if (cafe.kind === 'plant') assert.equal(cafe.irrigation, false)
})

function onsetSeries(points: { year: number; month: MonthNo; day: number; rainMm: number; gwetroot: number }[]): DailySeries {
  const days = points.map((point) =>
    observe({ year: point.year, month: point.month, day: point.day }, point.rainMm, point.gwetroot),
  )
  const latest = Math.max(...points.map((point) => point.year))
  return { days, validThrough: { year: latest, month: 12, day: 31 } }
}

function onsetStatus(series: DailySeries) {
  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  return cycleStatus({
    today,
    logs: [],
    climatology: yearClimate(24, 5),
    daily: series,
    soil: measured(6.5),
    whatIf: steady,
    lang: 'es',
  }).onset
}

test('onset confidence uses only the years that have an onset', () => {
  const alta = onsetStatus(
    onsetSeries([
      ...[2001, 2002, 2003, 2005].map((year) => ({ year, month: 4 as const, day: 10, rainMm: 25, gwetroot: 0.5 })),
      ...[2006, 2007].map((year) => ({ year, month: 4 as const, day: 20, rainMm: 25, gwetroot: 0.5 })),
      ...[2009, 2010, 2011, 2013].map((year) => ({ year, month: 5 as const, day: 1, rainMm: 25, gwetroot: 0.5 })),
    ]),
  )
  assert.equal(alta.years, 10)
  assert.equal(alta.iqrDays, 21)
  assert.equal(alta.confidence, 'alta')

  const media = onsetStatus(
    onsetSeries([
      { year: 2001, month: 4, day: 10, rainMm: 25, gwetroot: 0.5 },
      { year: 2002, month: 4, day: 10, rainMm: 25, gwetroot: 0.5 },
      { year: 2003, month: 5, day: 15, rainMm: 25, gwetroot: 0.5 },
      { year: 2005, month: 5, day: 15, rainMm: 25, gwetroot: 0.5 },
    ]),
  )
  assert.equal(media.years, 4)
  assert.equal(media.iqrDays, 35)
  assert.equal(media.confidence, 'media')

  const baja = onsetStatus(
    onsetSeries([
      { year: 2001, month: 4, day: 10, rainMm: 25, gwetroot: 0.5 },
      { year: 2002, month: 4, day: 10, rainMm: 25, gwetroot: 0.5 },
      { year: 2003, month: 4, day: 30, rainMm: 25, gwetroot: 0.5 },
      { year: 2005, month: 5, day: 20, rainMm: 25, gwetroot: 0.5 },
      { year: 2006, month: 5, day: 20, rainMm: 25, gwetroot: 0.5 },
    ]),
  )
  assert.equal(baja.years, 5)
  assert.equal(baja.iqrDays, 40)
  assert.equal(baja.confidence, 'baja')

  const partial = onsetStatus(
    onsetSeries([
      ...[2001, 2003, 2005, 2007, 2009, 2011, 2013, 2015, 2017].map((year) => ({
        year,
        month: 5 as const,
        day: 1,
        rainMm: 25,
        gwetroot: 0.5,
      })),
      ...[2019, 2021, 2023].map((year) => ({ year, month: 1 as const, day: 10, rainMm: 0, gwetroot: 0 })),
    ]),
  )
  assert.equal(partial.years, 9)
  assert.equal(partial.confidence, 'media')
})

function dryStatus(rains: number[]) {
  const end = Date.UTC(2026, 10, 15)
  const days = rains.map((rainMm, index) => {
    const date = new Date(end - (rains.length - 1 - index) * 86_400_000)
    return observe(
      { year: date.getUTCFullYear(), month: (date.getUTCMonth() + 1) as MonthNo, day: date.getUTCDate() },
      rainMm,
    )
  })
  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  const result = cycleStatus({
    today,
    logs: [],
    climatology: yearClimate(24, 1),
    daily: { days, validThrough: today },
    soil: measured(6.5),
    whatIf: steady,
    lang: 'es',
  }).drySpell
  if (!result) throw new Error('expected a full recent week')
  return result
}

test('dry spell level follows the trailing run when the week is wet', () => {
  const alto = dryStatus([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9])
  assert.equal(alto.run, 7)
  assert.equal(alto.climWeekMm, 7)
  assert.ok(alto.weekMm > 0.7 * alto.climWeekMm)
  assert.equal(alto.level, 'alto')

  const medio = dryStatus([10, 10, 10, 0, 0, 0, 0])
  assert.equal(medio.run, 4)
  assert.ok(medio.weekMm > 0.7 * medio.climWeekMm)
  assert.equal(medio.level, 'medio')

  const bajo = dryStatus([3, 3, 3, 3, 3, 3, 3])
  assert.equal(bajo.run, 0)
  assert.ok(bajo.weekMm > 0.7 * bajo.climWeekMm)
  assert.equal(bajo.level, 'bajo')
})

test('dry spell is missing when the recent week is short, gapped, or stale', () => {
  assert.equal(dryStatusOrMissing([0, 0, 0, 0, 0, 0]), null)

  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  const gappedDays = [0, 1, 2, 4, 5, 6, 7].map((offset) =>
    observe({ year: 2026, month: 11, day: 8 + offset }, 0),
  )
  assert.equal(dryStatusFor(gappedDays, today, today), null)

  const staleThrough: CalendarDay = { year: 2026, month: 11, day: 10 }
  const staleDays = Array.from({ length: 7 }, (_, index) =>
    observe({ year: 2026, month: 11, day: 4 + index }, 0),
  )
  assert.equal(dryStatusFor(staleDays, staleThrough, today), null)
})

test('missing rainfall does not invent a dry spell or a canicula warning', () => {
  const today: CalendarDay = { year: 2026, month: 5, day: 15 }
  const input = {
    today,
    logs: [],
    climatology: yearClimate(10, 1),
    daily: null,
    soil: measured(6.5),
    whatIf: steady,
    lang: 'es' as const,
  }
  const card = todayCard(input)
  const cycle = cycleStatus(input)
  assert.equal(cycle.drySpell, null)
  assert.equal(cycle.onset.years, 0)
  assert.equal(card.kind, 'wait')
  if (card.kind === 'wait') assert.equal(card.reason, 'window')
})

function dryStatusFor(days: DailyObservation[], validThrough: CalendarDay, today: CalendarDay) {
  return cycleStatus({
    today,
    logs: [],
    climatology: yearClimate(24, 1),
    daily: { days, validThrough },
    soil: measured(6.5),
    whatIf: steady,
    lang: 'es',
  }).drySpell
}

function dryStatusOrMissing(rains: number[]) {
  const end = Date.UTC(2026, 10, 15)
  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  const days = rains.map((rainMm, index) => {
    const date = new Date(end - (rains.length - 1 - index) * 86_400_000)
    return observe(
      { year: date.getUTCFullYear(), month: (date.getUTCMonth() + 1) as MonthNo, day: date.getUTCDate() },
      rainMm,
    )
  })
  return dryStatusFor(days, today, today)
}

test('a maize log suggests frijol or canavalia and does not repeat maize', () => {
  const soil = measured(6.5)
  const today: CalendarDay = { year: 2026, month: 11, day: 15 }
  const decemberTie = yearClimate(24, 5)
  const tie = nextRotation({ logs: [log('maiz')], today, climatology: decemberTie, soil, whatIf: steady })
  assert.equal(tie?.cropId, 'frijol')

  const decemberHot = yearClimate(30, 5)
  const hot = nextRotation({ logs: [log('maiz')], today, climatology: decemberHot, soil, whatIf: steady })
  assert.equal(hot?.cropId, 'canavalia')
  assert.notEqual(hot?.band, 'red')

  const blockedClimate = yearClimate(24, 650 / 105)
  const blocked = nextRotation({ logs: [log('maiz')], today, climatology: blockedClimate, soil, whatIf: steady })
  const december = blockedClimate.months[11]
  assert.ok(december)
  const maize = scoreMonth('maiz', december, soil, steady)
  assert.equal(blocked?.cropId === 'frijol' || blocked?.cropId === 'canavalia', true)
  assert.notEqual(blocked?.band, 'red')
  assert.ok(blocked && maize.suit > blocked.suit)

  const novemberHot = withMonth(yearClimate(24, 5), climate(11, 30, 5))
  const upcoming = nextRotation({ logs: [log('maiz')], today, climatology: novemberHot, soil, whatIf: steady })
  assert.equal(upcoming?.cropId, 'frijol')

  const afterBean = nextRotation({ logs: [log('frijol')], today, climatology: blockedClimate, soil, whatIf: steady })
  assert.equal(afterBean?.cropId, 'maiz')
  assert.equal(nextRotation({ logs: [], today, climatology: blockedClimate, soil, whatIf: steady }), null)
})

test('soil organic carbon of 48.6 g/kg scores 100', () => {
  const health = soilHealth([log('frijol', '2026-08-01'), log('maiz', '2026-05-01')], measured(6.5, 48.6))
  assert.deepEqual(health.slots, ['vacio', 'maiz', 'frijol'])
  assert.equal(health.socPts, 100)
  const fixPct = 100 / 3
  near(health.score ?? 0, 0.4 * fixPct + 0.4 * 100 + 0.2 * 100, 1e-9, 'soil score')
  const one = soilHealth([log('maiz')], measured(6.5, 48.6))
  assert.equal(one.socPts, 100)
  assert.equal(one.score, 50)
})

test('five crops across twelve months finish inside one frame', () => {
  const soil = measured(6.5)
  const climatology = yearClimate(24, 100 / 31)
  const ids = Object.keys(crops) as CropId[]
  for (const cropId of ids) {
    for (const month of climatology.months) scoreMonth(cropId, month, soil, steady)
  }
  let scores = 0
  let guard = 0
  const started = performance.now()
  for (const cropId of ids) {
    for (const month of climatology.months) {
      guard += scoreMonth(cropId, month, soil, steady).suit
      scores += 1
    }
  }
  const elapsed = performance.now() - started
  console.log(`60 scores ${elapsed} ms`)
  assert.equal(scores, 60)
  assert.equal(ids.length, 5)
  assert.ok(guard > 0)
  assert.ok(elapsed < 16, `60 scores took ${elapsed} ms`)
})
