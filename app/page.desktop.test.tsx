import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import Page from './page'

beforeEach(() => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('a wide window keeps Hoy open and shows the parcel map beside it', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('1024'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))

  await act(async () => { render(<Page />) })

  expect(screen.getByRole('tab', { name: 'Hoy', selected: true })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Mapa de parcela' })).toBeTruthy()
  expect(document.getElementById('desk')?.className).toContain('lg:grid-cols-[minmax(0,36rem)_minmax(22rem,1fr)]')
})

test('a narrow window leaves the map inside Mi parcela', async () => {
  await act(async () => { render(<Page />) })

  expect(screen.queryByRole('heading', { name: 'Mapa de parcela' })).toBeNull()
  expect(document.getElementById('desk')?.className).toContain('max-w-[560px]')
})
