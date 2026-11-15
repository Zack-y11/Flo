import type { PhaseMarker, TodayCard, TodayInput } from '../domain/calendar'

const DRY_SEASON =
  'Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.'

function civil(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

function isFifteenNovember2026(now: Date) {
  const day = civil(now)
  return day.year === 2026 && day.month === 11 && day.day === 15
}

export function cycleStatus(input: { now: Date }): { phase: PhaseMarker } {
  if (!isFifteenNovember2026(input.now)) {
    throw new Error('This stand-in only answers 15 Nov 2026.')
  }
  return { phase: { seasonId: 'seca', dayIndex: 15 } }
}

export function todayCard(input: TodayInput): TodayCard {
  if (!isFifteenNovember2026(input.now)) {
    throw new Error('This stand-in only answers 15 Nov 2026.')
  }
  const onlyCafe = input.logs.length === 1 && input.logs[0]?.cropId === 'cafe'
  return {
    kind: 'wait',
    suit: 'yellow',
    cropId: onlyCafe ? 'cafe' : null,
    irrigation: false,
    sentence: DRY_SEASON,
    reason: DRY_SEASON,
  }
}
