import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { SeasonRing } from './season-ring'

afterEach(cleanup)

function span(text: SVGTextElement, minX: number, maxX: number) {
  const content = text.textContent ?? ''
  const fontSize = Number(text.getAttribute('fontSize') ?? '12')
  const width = content.length * fontSize * 0.56
  const x = Number(text.getAttribute('x'))
  const anchor = text.getAttribute('textAnchor')
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2
  const right = left + width
  expect(left, content).toBeGreaterThanOrEqual(minX)
  expect(right, content).toBeLessThanOrEqual(maxX)
}

test.each(['en', 'es'] as const)('season names stay inside the ring canvas in %s', (lang) => {
  const { container } = render(<SeasonRing seasonId="seca" dayIndex={15} lang={lang} />)
  const svg = container.querySelector('svg')
  const box = svg?.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  expect(box).toHaveLength(4)
  const [minX, , width] = box ?? []
  const maxX = minX + width
  for (const text of svg?.querySelectorAll('text') ?? []) span(text, minX, maxX)
})
