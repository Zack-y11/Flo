export type Lang = 'es' | 'en'

export type SeasonId = 'primera' | 'postrera' | 'seca'

export type Suit = 'green' | 'yellow' | 'red'

export type MonthNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type CalendarDay = { year: number; month: MonthNo; day: number }

export type Field = {
  lat: number
  lon: number
  label: string
  soilFallback?: boolean
}

export type CropLog = {
  id: string
  cropId: CropId
  plantedOn: string
  createdAt: string
}

export type WhatIf = { dT: 0 | 1 | 2; rainFactor: 1 | 0.9 | 0.8 }

export type AppState = {
  field: Field
  lang: Lang
  logs: CropLog[]
  whatIf: WhatIf
}

export type MonthClimate = {
  month: MonthNo
  t2mC: number
  prectotcorrMmDay: number
  solarMj: number
  rhPct: number
  gwetroot: number
  gwettop: number
}

export type Climatology = {
  months: readonly [
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

export type DailyObservation = {
  date: CalendarDay
  t2mC: number
  rainMm: number
  solarMj: number
  rhPct: number
  gwetroot: number
  gwettop: number
}

export type DailySeries = {
  days: readonly DailyObservation[]
  validThrough: CalendarDay
}

export type Soil =
  | {
      status: 'measured'
      origin: 'pin' | 'offset' | 'regional'
      ph: number
      socGkg: number
      clayPct: number
      sandPct: number
      nitrogenGkg: number
    }
  | { status: 'missing' }

type AnnualTrait = {
  kind: 'annual'
  temp: { min: number; opt: number; max: number }
  ph: { min: number; max: number }
  drought: 'low' | 'low-med' | 'medium' | 'high'
  nFix: boolean
  cycleDays: { min: number; max: number }
  rainCycleMm: { min: number; max: number }
}

type PerennialTrait = {
  kind: 'perennial'
  temp: { min: number; opt: number; max: number }
  ph: { min: number; max: number }
  drought: 'low' | 'low-med' | 'medium' | 'high'
  nFix: boolean
  rainYearMm: { min: number; max: number }
}

export const crops = deepFreeze({
  maiz: {
    kind: 'annual',
    temp: { min: 12, opt: 24, max: 32 },
    rainCycleMm: { min: 500, max: 800 },
    ph: { min: 5.5, max: 7.5 },
    drought: 'medium',
    nFix: false,
    cycleDays: { min: 90, max: 120 },
  },
  frijol: {
    kind: 'annual',
    temp: { min: 15, opt: 24, max: 28 },
    rainCycleMm: { min: 300, max: 500 },
    ph: { min: 6, max: 7.5 },
    drought: 'medium',
    nFix: true,
    cycleDays: { min: 70, max: 90 },
  },
  sorgo: {
    kind: 'annual',
    temp: { min: 18, opt: 28, max: 35 },
    rainCycleMm: { min: 350, max: 600 },
    ph: { min: 5.5, max: 8 },
    drought: 'high',
    nFix: false,
    cycleDays: { min: 90, max: 120 },
  },
  canavalia: {
    kind: 'annual',
    temp: { min: 18, opt: 26, max: 32 },
    rainCycleMm: { min: 400, max: 800 },
    ph: { min: 5, max: 7 },
    drought: 'high',
    nFix: true,
    cycleDays: { min: 90, max: 150 },
  },
  cafe: {
    kind: 'perennial',
    temp: { min: 15, opt: 20, max: 24 },
    rainYearMm: { min: 1200, max: 2000 },
    ph: { min: 5, max: 6.5 },
    drought: 'low-med',
    nFix: false,
  },
} as const)

export type CropId = keyof typeof crops

export const CROP_IDS = Object.freeze(Object.keys(crops) as CropId[])

export type CropTrait = AnnualTrait | PerennialTrait

export const TRAIT_SOURCE = deepFreeze({
  table: 'compiled',
  ecocrop: 'HTTP 500',
  checked: '2026-11-14',
} as const)

export const SCORE_RULES = deepFreeze({
  suitWeights: { temp: 0.45, rain: 0.40, ph: 0.15 },
  tempComfortDelta: 3,
  rainEdges: { innerLow: 0.8, innerHigh: 1.2, outerLow: 0.4, outerHigh: 2 },
  ph: { near: 0.3, nearScore: 60, farScore: 30 },
  drought: { lift: 15, below: 70 },
  bands: { green: 70, yellow: 40 },
  onset: {
    rainMm: 25,
    gwetroot: 0.5,
    trailingDays: 5,
    sampleYears: 15,
    windowStart: { month: 4 as MonthNo, day: 1 },
    windowEnd: { month: 6 as MonthNo, day: 30 },
    alta: { minYears: 10, maxIqr: 21 },
    media: { minYears: 6, maxIqr: 35 },
  },
  drySpell: {
    dryBelowMm: 1,
    lookbackDays: 21,
    weekDays: 7,
    maxObservationAgeDays: 3,
    altoRun: 7,
    medioRun: 4,
    altoWeek: 0.4,
    medioWeek: 0.7,
  },
  soil: {
    fix: 0.40,
    soc: 0.40,
    diversity: 0.20,
    socLow: 10,
    socMid: 20,
    socHigh: 40,
    socPoints: { under: 30, low: 60, mid: 80, high: 100 },
  },
} as const)

export type MonthScore = {
  cropId: CropId
  month: MonthNo
  tC: number
  rainMm: number
  sliceMm: number
  tempScore: number
  rainScore: number
  phScore: number | null
  droughtLift: boolean
  suit: number
  band: Suit
}

export type AdviceInput = {
  today: CalendarDay
  logs: readonly CropLog[]
  climatology: Climatology
  daily: DailySeries | null
  soil: Soil
  whatIf: WhatIf
  lang: Lang
}

export type TodayCard =
  | {
      kind: 'plant'
      cropId: CropId
      suit: Suit
      irrigation: boolean
      sentence: string
    }
  | {
      kind: 'wait'
      cropId: CropId
      suit: Exclude<Suit, 'green'>
      reason: 'seca' | 'canicula' | 'window'
      sentence: string
    }

export type YearDrawing = 'four' | 'three'

export type YearRow =
  | { seasonId: 'primera'; label: 'primera'; from: 5; through: 7; caption: string; now: boolean }
  | { seasonId: 'postrera'; label: 'postrera'; from: 8; through: 10; caption: string; now: boolean }
  | { seasonId: 'seca'; label: 'apante'; from: 11; through: 12; caption: string; now: boolean }
  | { seasonId: 'seca'; label: 'verano'; from: 1; through: 4; caption: string; now: boolean }
  | { seasonId: 'seca'; label: 'seca'; from: 11; through: 12; caption: string; now: boolean }
  | { seasonId: 'seca'; label: 'seca'; from: 11; through: 4; caption: string; now: boolean }

export type Confidence = 'alta' | 'media' | 'baja'

export type OnsetReport = {
  years: number
  medianDoy: number | null
  p25Doy: number | null
  p75Doy: number | null
  iqrDays: number | null
  confidence: Confidence
  sentence: string
}

export type DryLevel = 'bajo' | 'medio' | 'alto'

export type DrySpell = {
  level: DryLevel
  run: number
  weekMm: number
  climWeekMm: number
  sentence: string
}

export type PhaseMark = {
  phase: SeasonId
  label: 'primera' | 'postrera' | 'apante' | 'verano' | 'seca'
  dayOfPhase: number
  daysUntilEnd: number
}

export type CycleStatus = {
  mark: PhaseMark
  sentence: string
  onset: OnsetReport
  drySpell: DrySpell | null
}

export type RotationInput = {
  logs: readonly CropLog[]
  today: CalendarDay
  climatology: Climatology
  soil: Soil
  whatIf: WhatIf
}

export type Rotation = { cropId: CropId; previousCropId: CropId; suit: number; band: Suit }

export type SoilHealth = {
  score: number | null
  fixPct: number
  socPts: number | null
  diversity: number
  slots: readonly (CropId | 'vacio')[]
}

const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

const dayMs = 86_400_000

function deepFreeze<T extends object>(value: T): T {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) deepFreeze(nested)
  }
  return Object.freeze(value)
}

function monthLength(month: MonthNo): number {
  return daysInMonth[month - 1]
}

function utcMs(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day)
}

function daysFrom(start: CalendarDay, end: CalendarDay): number {
  return Math.round((utcMs(end) - utcMs(start)) / dayMs)
}

function compareDay(a: CalendarDay, b: CalendarDay): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

function addDays(day: CalendarDay, count: number): CalendarDay {
  const date = new Date(utcMs(day) + count * dayMs)
  return {
    year: date.getUTCFullYear(),
    month: (date.getUTCMonth() + 1) as MonthNo,
    day: date.getUTCDate(),
  }
}

function dayOfYear(day: CalendarDay): number {
  return daysFrom({ year: day.year, month: 1, day: 1 }, day) + 1
}

function monthSlice(crop: (typeof crops)[CropId], days: number): number {
  if (crop.kind === 'perennial') {
    return (crop.rainYearMm.min + crop.rainYearMm.max) / 2 / 12
  }
  const rain = (crop.rainCycleMm.min + crop.rainCycleMm.max) / 2
  const cycle = (crop.cycleDays.min + crop.cycleDays.max) / 2
  return (rain * days) / cycle
}

function temperatureScore(t: number, temp: { min: number; opt: number; max: number }): number {
  const low = temp.opt - SCORE_RULES.tempComfortDelta
  const high = temp.opt + SCORE_RULES.tempComfortDelta
  if (t >= low && t <= high) return 100
  if (t <= temp.min || t >= temp.max) return 0
  if (t < low) return (100 * (t - temp.min)) / (low - temp.min)
  return (100 * (temp.max - t)) / (temp.max - high)
}

function rainPoints(total: number, slice: number): number {
  const edges = SCORE_RULES.rainEdges
  const innerLow = edges.innerLow * slice
  const innerHigh = edges.innerHigh * slice
  const outerLow = edges.outerLow * slice
  const outerHigh = edges.outerHigh * slice
  if (total >= innerLow && total <= innerHigh) return 100
  if (total <= outerLow || total >= outerHigh) return 0
  if (total < innerLow) return (100 * (total - outerLow)) / (innerLow - outerLow)
  return (100 * (outerHigh - total)) / (outerHigh - innerHigh)
}

function phPoints(ph: number, band: { min: number; max: number }): number {
  if (ph >= band.min && ph <= band.max) return 100
  const distance = ph < band.min ? band.min - ph : ph - band.max
  if (distance <= SCORE_RULES.ph.near) return SCORE_RULES.ph.nearScore
  return SCORE_RULES.ph.farScore
}

function suitOf(temp: number, rain: number, ph: number | null): number {
  const weights = SCORE_RULES.suitWeights
  if (ph === null) return (weights.temp * temp + weights.rain * rain) / (weights.temp + weights.rain)
  return weights.temp * temp + weights.rain * rain + weights.ph * ph
}

function bandOf(suit: number): Suit {
  if (suit >= SCORE_RULES.bands.green) return 'green'
  if (suit >= SCORE_RULES.bands.yellow) return 'yellow'
  return 'red'
}

export function scoreMonth(cropId: CropId, month: MonthClimate, soil: Soil, whatIf: WhatIf): MonthScore {
  const days = monthLength(month.month)
  const tC = month.t2mC + whatIf.dT
  const rainMm = month.prectotcorrMmDay * days * whatIf.rainFactor
  const crop = crops[cropId]
  const sliceMm = monthSlice(crop, days)
  const tempScore = temperatureScore(tC, crop.temp)
  let rainScore = rainPoints(rainMm, sliceMm)
  let droughtLift = false
  if (crop.drought === 'high' && rainScore < SCORE_RULES.drought.below) {
    rainScore = Math.min(100, rainScore + SCORE_RULES.drought.lift)
    droughtLift = true
  }
  const phScore = soil.status === 'measured' ? phPoints(soil.ph, crop.ph) : null
  const suit = suitOf(tempScore, rainScore, phScore)
  return {
    cropId,
    month: month.month,
    tC,
    rainMm,
    sliceMm,
    tempScore,
    rainScore,
    phScore,
    droughtLift,
    suit,
    band: bandOf(suit),
  }
}

type PhaseSpan = { phase: SeasonId; start: CalendarDay; end: CalendarDay }

function phaseSpan(today: CalendarDay): PhaseSpan {
  const { year, month } = today
  if (month >= 5 && month <= 7) {
    return {
      phase: 'primera',
      start: { year, month: 5, day: 1 },
      end: { year, month: 7, day: 31 },
    }
  }
  if (month >= 8 && month <= 10) {
    return {
      phase: 'postrera',
      start: { year, month: 8, day: 1 },
      end: { year, month: 10, day: 31 },
    }
  }
  if (month >= 11) {
    return {
      phase: 'seca',
      start: { year, month: 11, day: 1 },
      end: { year: year + 1, month: 4, day: 30 },
    }
  }
  return {
    phase: 'seca',
    start: { year: year - 1, month: 11, day: 1 },
    end: { year, month: 4, day: 30 },
  }
}

function dateKey(day: CalendarDay): string {
  return `${day.year}-${day.month}-${day.day}`
}

function observationMap(days: readonly DailyObservation[]): Map<string, DailyObservation> {
  const map = new Map<string, DailyObservation>()
  for (const day of days) map.set(dateKey(day.date), day)
  return map
}

function yearComplete(year: number, through: CalendarDay): boolean {
  if (through.year > year) return true
  if (through.year < year) return false
  return through.month > 6 || (through.month === 6 && through.day >= 30)
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0] ?? 0
  const pos = (sorted.length - 1) * p
  const low = Math.floor(pos)
  const high = Math.ceil(pos)
  const weight = pos - low
  const left = sorted[low] ?? 0
  const right = sorted[high] ?? left
  return left * (1 - weight) + right * weight
}

function confidenceOf(years: number, iqr: number | null): Confidence {
  const rules = SCORE_RULES.onset
  if (years >= rules.alta.minYears && iqr !== null && iqr <= rules.alta.maxIqr) return 'alta'
  if (years >= rules.media.minYears || (iqr !== null && iqr <= rules.media.maxIqr)) return 'media'
  return 'baja'
}

function onsetDoy(year: number, map: Map<string, DailyObservation>): number | null {
  const rules = SCORE_RULES.onset
  let cursor: CalendarDay = { year, month: rules.windowStart.month, day: rules.windowStart.day }
  const end: CalendarDay = { year, month: rules.windowEnd.month, day: rules.windowEnd.day }
  while (compareDay(cursor, end) <= 0) {
    let sum = 0
    for (let offset = 0; offset < rules.trailingDays; offset += 1) {
      const earlier = addDays(cursor, -offset)
      sum += map.get(dateKey(earlier))?.rainMm ?? 0
    }
    const observed = map.get(dateKey(cursor))
    if (sum >= rules.rainMm && observed !== undefined && observed.gwetroot >= rules.gwetroot) {
      return dayOfYear(cursor)
    }
    cursor = addDays(cursor, 1)
  }
  return null
}

function onsetReport(series: DailySeries | null, lang: Lang): OnsetReport {
  const yearsInSeries = [...new Set((series?.days ?? []).map((day) => day.date.year))]
    .filter((year) => series !== null && yearComplete(year, series.validThrough))
    .sort((a, b) => a - b)
    .slice(-SCORE_RULES.onset.sampleYears)
  const map = observationMap(series?.days ?? [])
  const onsets: number[] = []
  for (const year of yearsInSeries) {
    const doy = onsetDoy(year, map)
    if (doy !== null) onsets.push(doy)
  }
  onsets.sort((a, b) => a - b)
  if (onsets.length === 0) {
    const empty = {
      years: 0,
      medianDoy: null,
      p25Doy: null,
      p75Doy: null,
      iqrDays: null,
      confidence: 'baja' as const,
    }
    return { ...empty, sentence: onsetSentence(lang, empty) }
  }
  const p25 = percentile(onsets, 0.25)
  const p75 = percentile(onsets, 0.75)
  const report = {
    years: onsets.length,
    medianDoy: percentile(onsets, 0.5),
    p25Doy: p25,
    p75Doy: p75,
    iqrDays: p75 - p25,
    confidence: confidenceOf(onsets.length, p75 - p25),
  }
  return { ...report, sentence: onsetSentence(lang, report) }
}

function drySpell(today: CalendarDay, series: DailySeries, climatology: Climatology, lang: Lang): DrySpell | null {
  const rules = SCORE_RULES.drySpell
  const recent = [...series.days].sort((a, b) => compareDay(a.date, b.date))
  const latest = recent.at(-1)
  if (!latest || compareDay(latest.date, series.validThrough) !== 0) return null
  const age = daysFrom(latest.date, today)
  if (age < 0 || age > rules.maxObservationAgeDays) return null

  const consecutive: DailyObservation[] = [latest]
  for (let index = recent.length - 2; index >= 0 && consecutive.length < rules.lookbackDays; index -= 1) {
    const earlier = recent[index]
    const later = consecutive[consecutive.length - 1]
    if (!earlier || !later || daysFrom(earlier.date, later.date) !== 1) break
    consecutive.push(earlier)
  }
  if (consecutive.length < rules.weekDays) return null

  let run = 0
  for (const day of consecutive) {
    const rain = day.rainMm
    if (rain < rules.dryBelowMm) run += 1
    else break
  }
  const weekMm = consecutive.slice(0, rules.weekDays).reduce((sum, day) => sum + day.rainMm, 0)
  const climWeekMm = climatology.months[latest.date.month - 1].prectotcorrMmDay * rules.weekDays
  let level: DryLevel = 'bajo'
  if (run >= rules.altoRun || weekMm <= rules.altoWeek * climWeekMm) level = 'alto'
  else if (run >= rules.medioRun || weekMm <= rules.medioWeek * climWeekMm) level = 'medio'
  return { level, run, weekMm, climWeekMm, sentence: drySentence(lang, level) }
}

function bubbleCrops(logs: readonly CropLog[]): CropId[] {
  const annuals = (Object.keys(crops) as CropId[]).filter((id) => crops[id].kind === 'annual')
  const onlyCafe = logs.length > 0 && logs.every((log) => log.cropId === 'cafe')
  return onlyCafe ? [...annuals, 'cafe'] : annuals
}

function pickCrop(input: AdviceInput): MonthScore {
  const month = input.climatology.months[input.today.month - 1]
  let best: MonthScore | null = null
  for (const cropId of bubbleCrops(input.logs)) {
    const score = scoreMonth(cropId, month, input.soil, input.whatIf)
    if (!best || score.suit > best.suit) best = score
  }
  return best ?? scoreMonth('maiz', month, input.soil, input.whatIf)
}

function daysUntilWindowCloses(input: AdviceInput, cropId: CropId, span: PhaseSpan): number {
  let cursor = firstOfNextMonth(input.today)
  while (compareDay(cursor, span.end) <= 0 && phaseSpan(cursor).phase === span.phase) {
    const score = scoreMonth(cropId, input.climatology.months[cursor.month - 1], input.soil, input.whatIf)
    if (score.band !== 'green') return daysFrom(input.today, cursor)
    cursor = firstOfNextMonth(cursor)
  }
  return daysFrom(input.today, span.end)
}

function firstOfNextMonth(today: CalendarDay): CalendarDay {
  if (today.month === 12) return { year: today.year + 1, month: 1, day: 1 }
  return { year: today.year, month: (today.month + 1) as MonthNo, day: 1 }
}

type Reading = {
  score: MonthScore
  span: PhaseSpan
  dayOfPhase: number
  daysUntilEnd: number
  label: PhaseMark['label']
  irrigation: boolean
  closesIn: number
  dry: DrySpell | null
}

function reading(input: AdviceInput): Reading {
  const span = phaseSpan(input.today)
  const score = pickCrop(input)
  const irrigation = score.band === 'green' && score.cropId === 'frijol' && (input.today.month === 11 || input.today.month === 12)
  return {
    score,
    span,
    dayOfPhase: daysFrom(span.start, input.today) + 1,
    daysUntilEnd: daysFrom(input.today, span.end),
    label: seasonLabel(span.phase, input.today.month, irrigation),
    irrigation,
    closesIn: daysUntilWindowCloses(input, score.cropId, span),
    dry: input.daily ? drySpell(input.today, input.daily, input.climatology, input.lang) : null,
  }
}

function seasonLabel(phase: SeasonId, month: MonthNo, irrigation: boolean): PhaseMark['label'] {
  if (phase === 'primera') return 'primera'
  if (phase === 'postrera') return 'postrera'
  if (month >= 11) return irrigation ? 'apante' : 'seca'
  return 'verano'
}

function cropWord(lang: Lang, cropId: CropId): string {
  const names = {
    es: { maiz: 'maíz', frijol: 'frijol', sorgo: 'maicillo', canavalia: 'canavalia', cafe: 'café' },
    en: { maiz: 'maize', frijol: 'beans', sorgo: 'sorghum', canavalia: 'canavalia', cafe: 'coffee' },
  } as const
  return names[lang][cropId]
}

function phaseWord(lang: Lang, label: PhaseMark['label']): string {
  const names = {
    es: { primera: 'Primera', postrera: 'Postrera', seca: 'época seca', apante: 'Apante', verano: 'Verano' },
    en: { primera: 'Primera', postrera: 'Postrera', seca: 'the dry season', apante: 'Apante', verano: 'Verano' },
  } as const
  return names[lang][label]
}

function windowClause(lang: Lang, cropId: CropId, band: Suit, days: number): string {
  const crop = cropWord(lang, cropId)
  if (lang === 'en') {
    if (band === 'green') return `Good window for ${crop}, closes in ${days} days`
    if (band === 'yellow') return `Fair window for ${crop}`
    return `Not a good time for ${crop}`
  }
  if (band === 'green') return `Buena ventana para ${crop}, cierra en ${days} días`
  if (band === 'yellow') return `Ventana regular para ${crop}`
  return `Ahora no es ideal para ${crop}`
}

function bubble(lang: Lang, day: number, label: PhaseMark['label'], clause: string): string {
  const phase = phaseWord(lang, label)
  if (lang === 'en') return `Day ${day} of ${phase}. ${clause}.`
  return `Día ${day} de ${phase}. ${clause}.`
}

function cardSentence(lang: Lang, state: Reading): string {
  if (state.irrigation) {
    return lang === 'en'
      ? 'Today: plant beans. If you have irrigation. The soil still holds moisture.'
      : 'Hoy: sembrá frijol. Si tenés riego. La tierra todavía tiene humedad.'
  }
  if (state.span.phase === 'seca' && state.score.band !== 'green') {
    return lang === 'en'
      ? 'Wait a few days. This is the dry season. The next planting is Primera, in May.'
      : 'Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.'
  }
  if (state.span.phase !== 'seca' && state.score.band !== 'green' && state.dry?.level === 'alto') {
    return lang === 'en'
      ? 'Wait a few days. A short dry spell (canícula) is coming. Do not plant yet.'
      : 'Esperá unos días. Viene un tiempo seco (canícula). No sembrés todavía.'
  }
  return bubble(
    lang,
    state.dayOfPhase,
    state.label,
    windowClause(lang, state.score.cropId, state.score.band, state.closesIn),
  )
}

export function todayCard(input: AdviceInput): TodayCard {
  const state = reading(input)
  const sentence = cardSentence(input.lang, state)
  if (state.score.band === 'green') {
    return { kind: 'plant', cropId: state.score.cropId, suit: state.score.band, irrigation: state.irrigation, sentence }
  }
  const reason = state.span.phase === 'seca' ? 'seca' : state.dry?.level === 'alto' ? 'canicula' : 'window'
  return { kind: 'wait', cropId: state.score.cropId, suit: state.score.band, reason, sentence }
}

function rowNow(month: MonthNo, from: MonthNo, through: MonthNo): boolean {
  if (from <= through) return month >= from && month <= through
  return month >= from || month <= through
}

function yearCopy(lang: Lang): {
  primera: string
  postrera: string
  seca: string
  secaShort: string
  apante: string
  verano: string
} {
  if (lang === 'en') {
    return {
      primera: 'Primera. May through July.',
      postrera: 'Postrera. August through October.',
      seca: 'Dry season. November through April. Rest and cover.',
      secaShort: 'Dry season. November through December.',
      apante: 'Apante. November through December. Beans with irrigation.',
      verano: 'Verano. January through April. Rest and cover.',
    }
  }
  return {
    primera: 'Primera. Mayo a julio.',
    postrera: 'Postrera. Agosto a octubre.',
    seca: 'Época seca. Noviembre a abril. Descanso y abono.',
    secaShort: 'Época seca. Noviembre a diciembre.',
    apante: 'Apante. Noviembre a diciembre. Frijol con riego.',
    verano: 'Verano. Enero a abril. Descanso y abono.',
  }
}

export function yearRows(input: AdviceInput, drawing: YearDrawing): readonly YearRow[] {
  const state = reading(input)
  const copy = yearCopy(input.lang)
  const month = input.today.month
  const primera: YearRow = {
    seasonId: 'primera',
    label: 'primera',
    from: 5,
    through: 7,
    caption: copy.primera,
    now: rowNow(month, 5, 7),
  }
  const postrera: YearRow = {
    seasonId: 'postrera',
    label: 'postrera',
    from: 8,
    through: 10,
    caption: copy.postrera,
    now: rowNow(month, 8, 10),
  }
  if (drawing === 'three') {
    const seca: YearRow = {
      seasonId: 'seca',
      label: 'seca',
      from: 11,
      through: 4,
      caption: copy.seca,
      now: rowNow(month, 11, 4),
    }
    return [primera, postrera, seca]
  }
  const late: YearRow = state.irrigation
    ? {
        seasonId: 'seca',
        label: 'apante',
        from: 11,
        through: 12,
        caption: copy.apante,
        now: rowNow(month, 11, 12),
      }
    : {
        seasonId: 'seca',
        label: 'seca',
        from: 11,
        through: 12,
        caption: copy.secaShort,
        now: rowNow(month, 11, 12),
      }
  const verano: YearRow = {
    seasonId: 'seca',
    label: 'verano',
    from: 1,
    through: 4,
    caption: copy.verano,
    now: rowNow(month, 1, 4),
  }
  return [primera, postrera, late, verano]
}

export function cycleStatus(input: AdviceInput): CycleStatus {
  const state = reading(input)
  const clause = windowClause(input.lang, state.score.cropId, state.score.band, state.closesIn)
  return {
    mark: {
      phase: state.span.phase,
      label: state.label,
      dayOfPhase: state.dayOfPhase,
      daysUntilEnd: state.daysUntilEnd,
    },
    sentence: bubble(input.lang, state.dayOfPhase, state.label, clause),
    onset: onsetReport(input.daily, input.lang),
    drySpell: state.dry,
  }
}

function byPlanting(a: CropLog, b: CropLog): number {
  if (a.plantedOn < b.plantedOn) return -1
  if (a.plantedOn > b.plantedOn) return 1
  if (a.createdAt < b.createdAt) return -1
  if (a.createdAt > b.createdAt) return 1
  return 0
}

function latestLog(logs: readonly CropLog[]): CropLog | null {
  if (logs.length === 0) return null
  return [...logs].sort(byPlanting).at(-1) ?? null
}

export function nextRotation(input: RotationInput): Rotation | null {
  const last = latestLog(input.logs)
  if (!last) return null
  const monthNo: MonthNo = input.today.month === 12 ? 1 : ((input.today.month + 1) as MonthNo)
  const month = input.climatology.months[monthNo - 1]
  const candidates = crops[last.cropId].nFix
    ? (['maiz', 'sorgo'] as const)
    : (['frijol', 'canavalia'] as const)
  const order = new Map<CropId, number>(candidates.map((cropId, index) => [cropId, index]))
  const ranked = candidates
    .map((cropId) => scoreMonth(cropId, month, input.soil, input.whatIf))
    .sort((a, b) => b.suit - a.suit || (order.get(a.cropId) ?? 0) - (order.get(b.cropId) ?? 0))
  let pick = ranked[0]
  const other = ranked[1]
  if (pick && other && pick.cropId === last.cropId && other.band !== 'red') pick = other
  if (!pick) return null
  return { cropId: pick.cropId, previousCropId: last.cropId, suit: pick.suit, band: pick.band }
}

function socPoints(socGkg: number): number {
  const rules = SCORE_RULES.soil
  if (socGkg < rules.socLow) return rules.socPoints.under
  if (socGkg < rules.socMid) return rules.socPoints.low
  if (socGkg <= rules.socHigh) return rules.socPoints.mid
  return rules.socPoints.high
}

export function soilHealth(logs: readonly CropLog[], soil: Soil): SoilHealth {
  const recent = [...logs].sort(byPlanting).slice(-3)
  const slots: (CropId | 'vacio')[] = []
  for (let pad = recent.length; pad < 3; pad += 1) slots.push('vacio')
  for (const log of recent) slots.push(log.cropId)
  const distinct = new Set<CropId>()
  let fixers = 0
  for (const slot of slots) {
    if (slot === 'vacio') continue
    distinct.add(slot)
    if (crops[slot].nFix) fixers += 1
  }
  const fixPct = (100 * fixers) / 3
  const diversity = distinct.size >= 2 ? 100 : distinct.size === 1 ? 50 : 0
  if (soil.status === 'missing') {
    return { score: null, fixPct, socPts: null, diversity, slots }
  }
  const socPts = socPoints(soil.socGkg)
  const weights = SCORE_RULES.soil
  return {
    score: weights.fix * fixPct + weights.soc * socPts + weights.diversity * diversity,
    fixPct,
    socPts,
    diversity,
    slots,
  }
}

const doyMonths = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const

function formatDoy(doy: number, lang: Lang): string {
  const date = new Date(Date.UTC(2021, 0, doy))
  const day = date.getUTCDate()
  const month = doyMonths[lang][date.getUTCMonth()] ?? ''
  if (lang === 'en') return `${month} ${day}`
  return `${day} de ${month}`
}

function onsetSentence(lang: Lang, report: Omit<OnsetReport, 'sentence'>): string {
  if (report.p25Doy === null || report.p75Doy === null) {
    return lang === 'en'
      ? 'There are not enough years to estimate the start of the rains.'
      : 'No hay años suficientes para estimar el inicio de las lluvias.'
  }
  const from = formatDoy(report.p25Doy, lang)
  const to = formatDoy(report.p75Doy, lang)
  if (lang === 'en') return `The rainy season usually starts between ${from} and ${to} (confidence ${report.confidence}).`
  return `La temporada lluviosa suele empezar entre ${from} y ${to} (confianza ${report.confidence}).`
}

function drySentence(lang: Lang, level: DryLevel): string {
  if (lang === 'en') {
    return `Short dry-spell risk ${level} over the next 7-14 days, from the recent NASA POWER trend. This is not a forecast.`
  }
  return `Riesgo de sequía corta ${level} en los próximos 7-14 días, según la tendencia reciente de NASA POWER (no es un pronóstico).`
}
