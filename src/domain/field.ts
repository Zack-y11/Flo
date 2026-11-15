import type { Field } from './calendar'

export type FieldPoint = Readonly<Pick<Field, 'lat' | 'lon'>>

export function isFieldPoint(value: unknown): value is FieldPoint {
  if (typeof value !== 'object' || value === null) return false
  const point = value as { lat?: unknown; lon?: unknown }
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    point.lat >= 13 &&
    point.lat <= 14.5 &&
    typeof point.lon === 'number' &&
    Number.isFinite(point.lon) &&
    point.lon >= -90.2 &&
    point.lon <= -87.7
  )
}
