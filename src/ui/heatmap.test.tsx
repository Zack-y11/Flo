import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Climatology, MonthClimate, MonthNo, Soil, WhatIf } from '@/domain/calendar'
import { Heatmap } from './heatmap'
import { DEFAULT_WHAT_IF } from './what-if'

type ScoreCall = {
  cropId: string
  month: MonthClimate
  soil: Soil
  whatIf: WhatIf
}

const calls = vi.hoisted((): ScoreCall[] => [])

vi.mock('@/domain/calendar', () => ({
  CROP_IDS: ['maiz', 'frijol', 'sorgo', 'canavalia', 'cafe'],
  scoreMonth(cropId: string, month: MonthClimate, soil: Soil, whatIf: WhatIf) {
    calls.push({ cropId, month, soil, whatIf })
    if (cropId === 'maiz' && month.t2mC === 24 && (whatIf.dT === 2 || whatIf.rainFactor === 0.8)) {
      return { suit: 30, band: 'red' }
    }
    if (cropId === 'maiz' && month.t2mC === 24) return { suit: 72.13, band: 'green' }
    return { suit: 55, band: 'yellow' }
  },
}))

const fetchMock = vi.fn()
const spanishLabels = {
  maiz: 'Maíz',
  frijol: 'Frijol',
  sorgo: 'Maicillo',
  canavalia: 'Canavalia',
  cafe: 'Café',
}

beforeEach(() => {
  calls.length = 0
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('crop calendar', () => {
  it('shows five labeled crops across twelve months with three bands', () => {
    const climatology = climate()
    const soil = profile()
    render(<Heatmap climatology={climatology} soil={soil} cropLabels={spanishLabels} onWhatIf={() => undefined} />)

    expect(screen.getByRole('radio', { name: '+0 °C' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: '0%' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('columnheader', { name: 'Ene' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Jan' })).toBeNull()
    expect(screen.getByText('Mayo a julio')).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: spanishLabels.maiz })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: spanishLabels.frijol })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: spanishLabels.sorgo })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: spanishLabels.cafe })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: spanishLabels.canavalia })).toBeTruthy()

    const cells = [...document.querySelectorAll<HTMLElement>('[data-band]')]
    expect(cells).toHaveLength(60)
    for (const cell of cells) {
      expect(['green', 'yellow', 'red']).toContain(cell.dataset.band)
      expect(cell.style.backgroundColor).not.toBe('')
    }
    expect(cells.filter((cell) => cell.dataset.month === '7')).toHaveLength(5)
    expect(screen.getByRole('region').style.maxWidth).toBe('640px')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('changes a cell after a what-if choice without changing the stored climate', () => {
    const climatology = climate()
    const before = temperatures(climatology)
    const seen: WhatIf[] = []
    render(
      <Harness
        climatology={climatology}
        soil={profile()}
        onWhatIf={(next) => seen.push(next)}
      />,
    )

    const first = bands()
    fireEvent.click(screen.getByRole('radio', { name: '−20%' }))

    expect(bands().some((band, index) => band !== first[index])).toBe(true)
    expect(temperatures(climatology)).toEqual(before)
    expect(seen).toEqual([{ dT: 0, rainFactor: 0.8 }])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('translates the controls and crop labels in English', () => {
    const englishLabels = { maiz: 'Maize', frijol: 'Beans', sorgo: 'Sorghum', canavalia: 'Canavalia', cafe: 'Coffee' }
    render(
      <Heatmap
        climatology={climate()}
        soil={profile()}
        cropLabels={englishLabels}
        lang="en"
        onWhatIf={() => undefined}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Temperature' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Rain' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Jan' })).toBeTruthy()
    expect(screen.getByText('May through July')).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: 'Maize' })).toBeTruthy()
  })
})

function Harness({
  climatology,
  soil,
  onWhatIf,
}: {
  climatology: Climatology
  soil: Soil
  onWhatIf?: (whatIf: WhatIf) => void
}) {
  const [whatIf, setWhatIf] = useState(DEFAULT_WHAT_IF)
  return (
    <Heatmap
      climatology={climatology}
      soil={soil}
      cropLabels={spanishLabels}
      whatIf={whatIf}
      onWhatIf={(next) => {
        onWhatIf?.(next)
        setWhatIf(next)
      }}
    />
  )
}

function bands(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-band]')].map((cell) => cell.dataset.band ?? '')
}

function temperatures(climatology: Climatology): number[] {
  return climatology.months.map((month) => month.t2mC)
}

function profile(): Soil {
  return Object.freeze({
    status: 'measured',
    origin: 'pin',
    ph: 6.5,
    socGkg: 48.6,
    clayPct: 20,
    sandPct: 30,
    nitrogenGkg: 2,
  })
}

function row(month: MonthNo, t2mC: number, prectotcorrMmDay: number): MonthClimate {
  return Object.freeze({ month, t2mC, prectotcorrMmDay, solarMj: 0, rhPct: 0, gwetroot: 0, gwettop: 0 })
}

function climate(): Climatology {
  const months: Climatology['months'] = [
    row(1, 24, 100 / 31),
    row(2, 23, 0.2),
    row(3, 25, 0.3),
    row(4, 26, 0.4),
    row(5, 27, 1),
    row(6, 22, 4),
    row(7, 21, 6),
    row(8, 20, 8),
    row(9, 19, 7),
    row(10, 18, 5),
    row(11, 17, 2),
    row(12, 16, 0.5),
  ]
  return { months }
}
