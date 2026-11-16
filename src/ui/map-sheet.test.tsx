import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { MapSheet, plotMapView } from './map-sheet'

afterEach(cleanup)

const field = { lat: 13.64, lon: -89.38, label: 'La Libertad (rural)' }

test('the parcel map opens close enough to read a plot and names its basemap', () => {
  expect(plotMapView.zoom).toBeGreaterThanOrEqual(12)
  expect(plotMapView.maxZoom).toBeGreaterThanOrEqual(17)
  expect(plotMapView.scrollWheelZoom).toBe(true)
  expect(plotMapView.tileUrl).toContain('basemaps.cartocdn.com')
  expect(plotMapView.attribution).toContain('OpenStreetMap')
})

test('a wide window gives the map a tall frame', () => {
  render(
    <MapSheet
      field={field}
      lang="es"
      onPointAttempt={() => {}}
      onConfirm={() => {}}
    />,
  )

  const frame = screen.getByRole('heading', { name: 'Mapa de parcela' }).closest('section')?.querySelector('.isolate')
  expect(frame?.className).toContain('lg:h-[32rem]')
})
