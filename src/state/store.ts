export type Lang = 'es' | 'en'

export type CropId = 'maiz' | 'frijol' | 'sorgo' | 'cafe' | 'canavalia'

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

export type WhatIf = {
  dT: 0 | 1 | 2
  rainFactor: 1 | 0.9 | 0.8
}

export type AppState = {
  field: Field
  lang: Lang
  logs: CropLog[]
  whatIf: WhatIf
}

export type Action =
  | { type: 'setLang'; lang: Lang }
  | { type: 'setField'; field: Field }
  | { type: 'setWhatIf'; whatIf: WhatIf }
  | { type: 'saveLog'; log: CropLog }

const STORAGE_KEY = 'flo.appState'

const CROP_IDS: readonly CropId[] = ['maiz', 'frijol', 'sorgo', 'cafe', 'canavalia']

export const defaultState: AppState = {
  field: { lat: 13.64, lon: -89.38, label: 'La Libertad (rural)' },
  lang: 'es',
  logs: [],
  whatIf: { dT: 0, rainFactor: 1 },
}

export type AppStore = {
  read(): AppState
  dispatch(action: Action): AppState
  replaceDocument(raw: string | null): void
  subscribe(listener: () => void): () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && CROP_IDS.some((id) => id === value)
}

function copyField(field: Field): Field {
  const copy: Field = { lat: field.lat, lon: field.lon, label: field.label }
  if (typeof field.soilFallback === 'boolean') copy.soilFallback = field.soilFallback
  return copy
}

function parseField(value: unknown): Field | null {
  if (!isRecord(value)) return null
  const { lat, lon, label, soilFallback } = value
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null
  if (typeof label !== 'string' || label.length === 0) return null
  const field: Field = { lat, lon, label }
  if (typeof soilFallback === 'boolean') field.soilFallback = soilFallback
  return field
}

function parseWhatIf(value: unknown): WhatIf | null {
  if (!isRecord(value)) return null
  const { dT, rainFactor } = value
  if (dT !== 0 && dT !== 1 && dT !== 2) return null
  if (rainFactor !== 1 && rainFactor !== 0.9 && rainFactor !== 0.8) return null
  return { dT, rainFactor }
}

function parseLog(value: unknown): CropLog | null {
  if (!isRecord(value)) return null
  const { id, cropId, plantedOn, createdAt } = value
  if (typeof id !== 'string' || id.length === 0) return null
  if (!isCropId(cropId)) return null
  if (typeof plantedOn !== 'string' || plantedOn.length === 0) return null
  if (typeof createdAt !== 'string' || createdAt.length === 0) return null
  return { id, cropId, plantedOn, createdAt }
}

function parseLogs(value: unknown): CropLog[] {
  if (!Array.isArray(value)) return []
  const logs: CropLog[] = []
  for (const entry of value) {
    const log = parseLog(entry)
    if (log) logs.push(log)
  }
  return logs
}

function parseLang(value: unknown): Lang {
  return value === 'en' || value === 'es' ? value : defaultState.lang
}

function parseDocument(raw: string): AppState | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value)) return null
  return {
    field: parseField(value.field) ?? defaultState.field,
    lang: parseLang(value.lang),
    logs: parseLogs(value.logs),
    whatIf: parseWhatIf(value.whatIf) ?? defaultState.whatIf,
  }
}

function readStored(storage: Storage): AppState {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw == null) return defaultState
  return parseDocument(raw) ?? defaultState
}

function sameField(a: Field, b: Field): boolean {
  return (
    a.lat === b.lat &&
    a.lon === b.lon &&
    a.label === b.label &&
    a.soilFallback === b.soilFallback
  )
}

function sameLog(a: CropLog, b: CropLog): boolean {
  return (
    a.id === b.id &&
    a.cropId === b.cropId &&
    a.plantedOn === b.plantedOn &&
    a.createdAt === b.createdAt
  )
}

function sameDocument(a: AppState, b: AppState): boolean {
  return (
    a.lang === b.lang &&
    sameField(a.field, b.field) &&
    a.whatIf.dT === b.whatIf.dT &&
    a.whatIf.rainFactor === b.whatIf.rainFactor &&
    a.logs.length === b.logs.length &&
    a.logs.every((log, index) => {
      const other = b.logs[index]
      return other !== undefined && sameLog(log, other)
    })
  )
}

function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setLang':
      return action.lang === state.lang ? state : { ...state, lang: action.lang }
    case 'setField': {
      const field = copyField(action.field)
      return sameField(state.field, field) ? state : { ...state, field }
    }
    case 'setWhatIf': {
      const whatIf: WhatIf = { dT: action.whatIf.dT, rainFactor: action.whatIf.rainFactor }
      if (whatIf.dT === state.whatIf.dT && whatIf.rainFactor === state.whatIf.rainFactor) {
        return state
      }
      return { ...state, whatIf }
    }
    case 'saveLog': {
      const already = state.logs.some(
        (log) => log.cropId === action.log.cropId && log.plantedOn === action.log.plantedOn,
      )
      if (already) return state
      const log: CropLog = {
        id: action.log.id,
        cropId: action.log.cropId,
        plantedOn: action.log.plantedOn,
        createdAt: action.log.createdAt,
      }
      return { ...state, logs: [...state.logs, log] }
    }
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}

export function createAppStore(storage: Storage): AppStore {
  let state = readStored(storage)
  const listeners = new Set<() => void>()

  function emit() {
    for (const listener of listeners) listener()
  }

  return {
    read() {
      return state
    },
    dispatch(action) {
      const next = reduce(state, action)
      const missing = storage.getItem(STORAGE_KEY) == null
      if (next === state && !missing) return state
      state = next
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
      emit()
      return state
    },
    replaceDocument(raw) {
      const next = raw == null ? defaultState : (parseDocument(raw) ?? state)
      if (sameDocument(state, next)) return
      state = next
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

let browserStore: AppStore | null = null

function getBrowserStore(): AppStore {
  if (browserStore) return browserStore
  const store = createAppStore(window.localStorage)
  browserStore = store
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    store.replaceDocument(event.newValue)
  })
  persistDefaultsIfMissing(store)
  return store
}

function persistDefaultsIfMissing(store: AppStore) {
  if (window.localStorage.getItem(STORAGE_KEY) != null) return
  store.dispatch({ type: 'setLang', lang: store.read().lang })
}

export function readAppState(): AppState {
  if (typeof window === 'undefined') return defaultState
  return getBrowserStore().read()
}

export function dispatch(action: Action): AppState {
  return getBrowserStore().dispatch(action)
}

export function subscribe(listener: () => void): () => void {
  return getBrowserStore().subscribe(listener)
}
