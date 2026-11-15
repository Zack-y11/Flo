import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'
import type { CropLog, TodayCard } from '@/domain/calendar'
import { Hoy, SiembraAhora } from './siembra-ahora'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const DRY_SEASON =
  'Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.'

const FRIJOL_PLANT =
  'Hoy: sembrá frijol. Si tenés riego. La tierra todavía tiene humedad.'

const NOON_IN_EL_SALVADOR = new Date('2026-11-15T18:00:00.000Z')
const STILL_THE_FIFTEENTH = new Date('2026-11-16T02:00:00.000Z')
const STILL_THE_FOURTEENTH = new Date('2026-11-15T04:00:00.000Z')

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups) cleanup()
  cleanups.length = 0
  document.body.replaceChildren()
})

function render(node: ReactNode) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => {
    root.render(node)
  })
  cleanups.push(() => {
    act(() => {
      root.unmount()
    })
  })
  return host
}

function chipColor(host: ParentNode) {
  const chip = host.querySelector('[data-suit-chip]')
  if (!(chip instanceof HTMLElement)) {
    throw new Error('missing suit chip')
  }
  return chip.style.backgroundColor
}

function buttonNamed(host: ParentNode, name: string) {
  const found = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes(name))
  if (!found) {
    throw new Error(`Missing button ${name}`)
  }
  return found
}

function listen() {
  const spoken: SpeechSynthesisUtterance[] = []
  class Utterance {
    text: string
    lang = ''
    rate = 1
    constructor(text: string) {
      this.text = text
    }
  }
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: Utterance,
  })
  Object.defineProperty(globalThis, 'speechSynthesis', {
    configurable: true,
    writable: true,
    value: {
      cancel() {},
      speak(utterance: SpeechSynthesisUtterance) {
        spoken.push(utterance)
      },
    },
  })
  return spoken
}

function log(id: string, cropId: CropLog['cropId']): CropLog {
  return {
    id,
    cropId,
    plantedOn: '2026-11-01',
    createdAt: '2026-11-01T12:00:00.000Z',
  }
}

function waitCard(suit: 'yellow' | 'red'): TodayCard {
  return {
    kind: 'wait',
    suit,
    cropId: null,
    irrigation: false,
    sentence: DRY_SEASON,
    reason: DRY_SEASON,
  }
}

test('15 Nov 2026 in El Salvador shows the seca wait card', () => {
  const spoken = listen()
  let logged = 0
  const host = render(
    createElement(Hoy, {
      now: NOON_IN_EL_SALVADOR,
      logs: [],
      onRegister: () => {
        logged += 1
      },
    }),
  )

  expect(host.textContent).toContain(DRY_SEASON)
  expect(host.textContent).toContain('Día 15 de época seca.')
  const phase = host.querySelector('[data-phase]')
  expect(phase?.getAttribute('data-phase')).toBe('seca')
  expect(phase?.textContent).toContain('15')
  expect(phase?.textContent?.toLowerCase().includes('postrera')).toBe(false)
  const card = host.querySelector('[data-kind]')
  expect(card?.getAttribute('data-kind')).toBe('wait')
  expect(card?.getAttribute('data-suit')).toBe('yellow')
  expect(host.querySelector('section')?.style.maxWidth).toBe('640px')

  buttonNamed(host, 'Escuchar').click()
  expect(spoken.map((utterance) => utterance.text)).toEqual([DRY_SEASON])
  expect(spoken[0]?.lang).toBe('es-SV')

  buttonNamed(host, 'Registré siembra').click()
  expect(logged).toBe(1)
})

test('a UTC clock that is still 15 Nov in El Salvador shows the same card', () => {
  const host = render(createElement(Hoy, { now: STILL_THE_FIFTEENTH, logs: [] }))
  expect(host.textContent).toContain(DRY_SEASON)
  expect(host.querySelector('[data-phase]')?.getAttribute('data-phase')).toBe('seca')
  expect(host.textContent).toContain('Día 15 de época seca.')
})

test('the previous Salvadoran evening does not render the 15 Nov card', () => {
  expect(() => render(createElement(Hoy, { now: STILL_THE_FOURTEENTH, logs: [] }))).toThrow(
    /15 Nov 2026/,
  )
})

test('empty logs still render the card, and café appears only as the only log', () => {
  const empty = render(createElement(Hoy, { now: NOON_IN_EL_SALVADOR, logs: [] }))
  expect(empty.querySelector('[data-kind]')).not.toBeNull()
  expect(empty.textContent).toContain(DRY_SEASON)
  expect(empty.textContent?.toLowerCase().includes('café')).toBe(false)

  const mixed = render(
    createElement(Hoy, {
      now: NOON_IN_EL_SALVADOR,
      logs: [log('cafe-1', 'cafe'), log('maiz-1', 'maiz')],
    }),
  )
  expect(mixed.textContent?.toLowerCase().includes('café')).toBe(false)
  expect(mixed.textContent).toContain(DRY_SEASON)

  const onlyCafe = render(
    createElement(Hoy, { now: NOON_IN_EL_SALVADOR, logs: [log('cafe-only', 'cafe')] }),
  )
  expect(onlyCafe.textContent).toContain('café')
  expect(onlyCafe.textContent).toContain(DRY_SEASON)
  expect(onlyCafe.querySelector('[data-kind]')?.getAttribute('data-kind')).toBe('wait')
})

test('green is the plant card, and yellow and red share the wait card', () => {
  const spoken = listen()
  const plantCard = {
    kind: 'plant',
    suit: 'green',
    cropId: 'frijol',
    irrigation: true,
    sentence: FRIJOL_PLANT,
    reason: FRIJOL_PLANT,
  } satisfies TodayCard
  const plant = render(createElement(SiembraAhora, { card: plantCard, lang: 'es' }))
  const yellow = render(createElement(SiembraAhora, { card: waitCard('yellow'), lang: 'es' }))
  const red = render(createElement(SiembraAhora, { card: waitCard('red'), lang: 'es' }))
  const plantArticle = plant.querySelector('article')
  const yellowArticle = yellow.querySelector('article')
  const redArticle = red.querySelector('article')

  expect(plantArticle?.getAttribute('data-kind')).toBe('plant')
  expect(plantArticle?.getAttribute('data-suit')).toBe('green')
  expect(plant.textContent).toContain(FRIJOL_PLANT)
  expect(plant.textContent).toContain('frijol')
  expect(plant.textContent).toContain('Verde')
  buttonNamed(plant, 'Escuchar').click()
  expect(spoken.at(-1)?.text).toBe(FRIJOL_PLANT)

  expect(yellowArticle?.getAttribute('data-kind')).toBe('wait')
  expect(redArticle?.getAttribute('data-kind')).toBe('wait')
  expect(yellowArticle?.style.backgroundColor).toBe(redArticle?.style.backgroundColor)
  expect(yellowArticle?.style.backgroundColor).not.toBe(plantArticle?.style.backgroundColor)
  expect(chipColor(yellow)).not.toBe(chipColor(red))
  expect(yellow.textContent).toContain('Amarillo')
  expect(red.textContent).toContain('Rojo')
  expect(yellow.textContent).toContain(DRY_SEASON)
  expect(red.textContent).toContain(DRY_SEASON)
})

test('English replaces the bubble and the chrome, and the card sentence stays the domain sentence', () => {
  const spoken = listen()
  const host = render(createElement(Hoy, { now: NOON_IN_EL_SALVADOR, logs: [], lang: 'en' }))
  expect(host.textContent).toContain('Day 15 of the dry season.')
  expect(host.textContent).toContain(DRY_SEASON)
  expect(host.textContent).toContain('Listen')
  expect(host.textContent?.includes('Escuchar')).toBe(false)
  buttonNamed(host, 'Listen').click()
  expect(spoken.at(-1)?.text).toBe(DRY_SEASON)
  expect(spoken.at(-1)?.lang).toBe('en-US')
})
