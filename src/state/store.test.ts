import assert from 'node:assert/strict'
import test from 'node:test'
import { messages } from '@/i18n/messages'
import { createAppStore, type CropLog } from '@/state/store'

const KEY = 'flo.appState'

function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear() {
      items.clear()
    },
    getItem(key) {
      return items.get(key) ?? null
    },
    key(index) {
      return [...items.keys()][index] ?? null
    },
    removeItem(key) {
      items.delete(key)
    },
    setItem(key, value) {
      items.set(key, value)
    },
  }
}

function countingStorage() {
  const storage = memoryStorage()
  let writes = 0
  const write = storage.setItem.bind(storage)
  storage.setItem = (key, value) => {
    writes += 1
    write(key, value)
  }
  return { storage, writes: () => writes }
}

const maize: CropLog = {
  id: 'log-1',
  cropId: 'maiz',
  plantedOn: '2026-05-01',
  createdAt: '2026-05-01T15:00:00.000Z',
}

test('a new store starts in Spanish at the La Libertad field', () => {
  const store = createAppStore(memoryStorage())
  const state = store.read()
  assert.equal(state.lang, 'es')
  assert.equal(state.field.lat.toFixed(3), '13.640')
  assert.equal(state.field.lon.toFixed(3), '-89.380')
  assert.equal(state.field.label, 'La Libertad (rural)')
  assert.deepEqual(state.logs, [])
  assert.deepEqual(state.whatIf, { dT: 0, rainFactor: 1 })
  assert.deepEqual(Object.keys(state).sort(), ['field', 'lang', 'logs', 'whatIf'])
})

test('language, field, empty logs, and what-if survive a second reader', () => {
  const storage = memoryStorage()
  const first = createAppStore(storage)
  first.dispatch({ type: 'setLang', lang: 'en' })
  first.dispatch({
    type: 'setField',
    field: { lat: 13.7, lon: -88.9, label: 'San Vicente', soilFallback: true },
  })
  first.dispatch({ type: 'setWhatIf', whatIf: { dT: 2, rainFactor: 0.8 } })

  const restored = createAppStore(storage).read()
  assert.equal(restored.lang, 'en')
  assert.equal(restored.field.lat, 13.7)
  assert.equal(restored.field.lon, -88.9)
  assert.equal(restored.field.label, 'San Vicente')
  assert.equal(restored.field.soilFallback, true)
  assert.deepEqual(restored.logs, [])
  assert.deepEqual(restored.whatIf, { dT: 2, rainFactor: 0.8 })

  const again = createAppStore(storage)
  again.dispatch({ type: 'setLang', lang: 'es' })
  again.dispatch({ type: 'setWhatIf', whatIf: { dT: 0, rainFactor: 1 } })
  const defaults = createAppStore(storage).read()
  assert.equal(defaults.lang, 'es')
  assert.equal(defaults.field.label, 'San Vicente')
  assert.deepEqual(defaults.logs, [])
  assert.deepEqual(defaults.whatIf, { dT: 0, rainFactor: 1 })
})

test('the first dispatch stores the default field, empty logs, and what-if', () => {
  const { storage } = countingStorage()
  const store = createAppStore(storage)
  store.dispatch({ type: 'setLang', lang: 'es' })
  const raw = JSON.parse(storage.getItem(KEY) ?? 'null') as {
    field: { lat: number; lon: number; label: string }
    logs: unknown[]
    whatIf: { dT: number; rainFactor: number }
  }
  assert.equal(raw.field.lat.toFixed(3), '13.640')
  assert.equal(raw.field.lon.toFixed(3), '-89.380')
  assert.equal(raw.field.label, 'La Libertad (rural)')
  assert.deepEqual(raw.logs, [])
  assert.deepEqual(raw.whatIf, { dT: 0, rainFactor: 1 })
})

test('a repeated sowing on the same day keeps the first log', () => {
  const storage = memoryStorage()
  const store = createAppStore(storage)
  store.dispatch({ type: 'saveLog', log: maize })
  store.dispatch({
    type: 'saveLog',
    log: { ...maize, id: 'log-2', createdAt: '2026-05-02T15:00:00.000Z' },
  })
  store.dispatch({
    type: 'saveLog',
    log: { ...maize, id: 'log-3', plantedOn: '2026-08-01', createdAt: '2026-08-01T15:00:00.000Z' },
  })
  const logs = createAppStore(storage).read().logs
  assert.equal(logs.length, 2)
  assert.equal(logs[0]?.id, 'log-1')
  assert.equal(logs[1]?.cropId, 'maiz')
  assert.equal(logs[1]?.plantedOn, '2026-08-01')
})

test('a saved planting survives a simulated reload', () => {
  const storage = memoryStorage()
  const first = createAppStore(storage)
  first.dispatch({ type: 'saveLog', log: maize })

  const restored = createAppStore(storage).read()
  assert.deepEqual(restored.logs, [maize])
})

test('a stored score, altitude, or rejected language does not come back', () => {
  const storage = memoryStorage()
  storage.setItem(
    KEY,
    JSON.stringify({
      field: {
        lat: 13.64,
        lon: -89.38,
        label: 'La Libertad (rural)',
        altitude: 1220,
      },
      lang: 'sv',
      logs: [{ id: 'x', cropId: 'trigo', plantedOn: '2026-01-01', createdAt: '2026-01-01' }],
      whatIf: { dT: 9, rainFactor: 0.5 },
      scores: { maiz: 72 },
      user: { name: 'Don Carlos' },
    }),
  )
  const store = createAppStore(storage)
  const state = store.read()
  assert.equal(state.lang, 'es')
  assert.equal('altitude' in state.field, false)
  assert.deepEqual(state.logs, [])
  assert.deepEqual(state.whatIf, { dT: 0, rainFactor: 1 })
  assert.equal('scores' in state, false)
  assert.equal('user' in state, false)

  store.dispatch({ type: 'setLang', lang: 'en' })
  const raw = JSON.parse(storage.getItem(KEY) ?? 'null') as Record<string, unknown>
  assert.equal(raw.scores, undefined)
  assert.equal(raw.user, undefined)
  assert.equal('altitude' in (raw.field as object), false)
})

test('reading does not write, and a foreign document does not write', () => {
  const counted = countingStorage()
  const store = createAppStore(counted.storage)
  store.read()
  assert.equal(counted.writes(), 0)

  store.replaceDocument(
    JSON.stringify({
      field: { lat: 13.64, lon: -89.38, label: 'La Libertad (rural)' },
      lang: 'en',
      logs: [],
      whatIf: { dT: 1, rainFactor: 0.9 },
    }),
  )
  assert.equal(counted.writes(), 0)
  assert.equal(store.read().lang, 'en')
  assert.deepEqual(store.read().whatIf, { dT: 1, rainFactor: 0.9 })

  store.replaceDocument('{')
  assert.equal(store.read().lang, 'en')
  assert.equal(counted.writes(), 0)

  store.replaceDocument(null)
  assert.equal(store.read().lang, 'es')
  assert.deepEqual(store.read().logs, [])
  assert.equal(counted.writes(), 0)
})

test('corrupt storage returns the Spanish defaults', () => {
  const storage = memoryStorage()
  storage.setItem(KEY, '{')
  const state = createAppStore(storage).read()
  assert.equal(state.lang, 'es')
  assert.equal(state.field.label, 'La Libertad (rural)')
  assert.deepEqual(state.logs, [])
  assert.deepEqual(state.whatIf, { dT: 0, rainFactor: 1 })
})

test('shell copy has Spanish and English and does not name postrera', () => {
  assert.equal(messages.es.wordmark, 'Flo para la finca')
  assert.equal(messages.en.wordmark, 'Flo for the farm')
  assert.equal(messages.es.tabs.hoy, 'Hoy')
  assert.equal(messages.es.tabs.year, 'Este año')
  assert.equal(messages.es.tabs.field, 'Mi parcela')
  assert.deepEqual(Object.keys(messages).sort(), ['en', 'es'])
  const text = JSON.stringify(messages)
  assert.equal(text.toLowerCase().includes('postrera'), false)
  assert.equal(text.includes('SV'), false)
  assert.equal(text.includes('US'), false)
})
