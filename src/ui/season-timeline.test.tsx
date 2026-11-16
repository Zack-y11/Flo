import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { SeasonTimeline } from './season-timeline'

afterEach(cleanup)

function markerLeft(container: HTMLElement) {
  const marker = container.querySelector<HTMLElement>('[data-marker]')
  return { segment: marker?.closest<HTMLElement>('[data-season]')?.dataset.season, left: marker?.style.left }
}

test('says which season you are in, which day, and what comes next', () => {
  const { getByRole, getByText } = render(<SeasonTimeline seasonId="seca" dayIndex={15} lang="es" />)
  expect(getByRole('img', { name: 'Época seca. Día 15.' })).toBeTruthy()
  expect(getByText('Estás en')).toBeTruthy()
  expect(getByText('Día 15')).toBeTruthy()
  expect(getByText('de 181')).toBeTruthy()
  expect(getByText('Sigue:', { exact: false }).textContent).toBe('Sigue: Primera siembra, desde mayo')
})

test('the farming year reads Primera, Postrera, dry season from left to right', () => {
  const { container } = render(<SeasonTimeline seasonId="postrera" dayIndex={10} lang="en" />)
  const bar = [...container.querySelectorAll<HTMLElement>('[data-season]')]
  expect(bar.map((s) => s.dataset.season)).toEqual(['primera', 'postrera', 'seca'])
  expect(bar.filter((s) => s.dataset.current).map((s) => s.dataset.season)).toEqual(['postrera'])
  expect(bar.map((s) => s.style.flex)).toEqual(['92 1 0px', '92 1 0px', '181 1 0px'])
})

test('the today marker sits at the day within the current season', () => {
  const { container } = render(<SeasonTimeline seasonId="seca" dayIndex={15} lang="es" />)
  const { segment, left } = markerLeft(container)
  expect(segment).toBe('seca')
  expect(Number.parseFloat(left ?? '')).toBeCloseTo((14.5 / 181) * 100, 5)
})

test('a day past the drawn length keeps the marker on the segment and the count honest', () => {
  const { container, getByText } = render(<SeasonTimeline seasonId="seca" dayIndex={182} lang="en" />)
  expect(Number.parseFloat(markerLeft(container).left ?? '')).toBeLessThan(100)
  expect(getByText('Day 182')).toBeTruthy()
  expect(getByText('of 182')).toBeTruthy()
  expect(getByText('Next:', { exact: false }).textContent).toBe('Next: First planting, from May')
})
