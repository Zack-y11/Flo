'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useState, type KeyboardEvent } from 'react'
import {
  cycleStatus,
  nextRotation,
  soilHealth,
  todayCard,
  yearRows,
  type AdviceInput,
  type CalendarDay,
  type CropId,
  type Field,
  type Soil,
} from '@/domain/calendar'
import { useFieldSession } from '@/client/use-field-session'
import { messages, type ShellCopy } from '@/i18n/messages'
import { Heatmap } from '@/ui/heatmap'
import { Logs } from '@/ui/logs'
import { MapSheet } from '@/ui/map-sheet'
import { Outlook } from '@/ui/outlook'
import { Hoy } from '@/ui/siembra-ahora'
import {
  defaultState,
  dispatch,
  readAppState,
  subscribe,
  type AppState,
  type CropLog,
} from '@/state/store'

type TabId = keyof ShellCopy['tabs']

const tabs: readonly TabId[] = ['hoy', 'year', 'field']

function useWideDesk() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return wide
}

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage'

const cropLabels: Record<'es' | 'en', Record<CropId, string>> = {
  es: { maiz: 'Maíz', frijol: 'Frijol', sorgo: 'Maicillo', canavalia: 'Canavalia', cafe: 'Café' },
  en: { maiz: 'Maize', frijol: 'Beans', sorgo: 'Sorghum', canavalia: 'Canavalia', cafe: 'Coffee' },
}

const unavailableSoil: Soil = { status: 'missing' }

export default function Page() {
  const [state, setState] = useState<AppState>(defaultState)
  const [tab, setTab] = useState<TabId>('hoy')
  const [today, setToday] = useState(localToday)
  const wide = useWideDesk()

  useEffect(() => {
    let midnightTimer: number | undefined

    function refreshToday() {
      window.clearTimeout(midnightTimer)
      const now = new Date()
      const next = localToday(now)
      setToday((previous) => (
        previous.year === next.year && previous.month === next.month && previous.day === next.day ? previous : next
      ))

      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      midnightTimer = window.setTimeout(refreshToday, nextMidnight.getTime() - now.getTime())
    }

    refreshToday()
    window.addEventListener('focus', refreshToday)
    document.addEventListener('visibilitychange', refreshToday)
    return () => {
      window.clearTimeout(midnightTimer)
      window.removeEventListener('focus', refreshToday)
      document.removeEventListener('visibilitychange', refreshToday)
    }
  }, [])

  useLayoutEffect(() => {
    const stored = readAppState()
    document.documentElement.lang = stored.lang
    setState(stored)
    return subscribe(() => {
      const next = readAppState()
      document.documentElement.lang = next.lang
      setState(next)
    })
  }, [])

  const getCommittedField = useCallback(() => readAppState().field, [])
  const commitField = useCallback((next: Field, expected: Field) => {
    if (!sameField(readAppState().field, expected)) return false
    dispatch({ type: 'setField', field: next })
    return true
  }, [])
  const fieldSession = useFieldSession({
    field: state.field,
    today,
    getCommittedField,
    onCommit: commitField,
  })

  const copy = messages[state.lang]
  const labels = cropLabels[state.lang]
  const session = fieldSession.session
  const advice: AdviceInput | null = session?.climatology
    ? {
        today,
        logs: state.logs,
        climatology: session.climatology,
        daily: session.daily,
        soil: session.soil,
        whatIf: state.whatIf,
        lang: state.lang,
      }
    : null
  const status = advice ? cycleStatus(advice) : null
  const card = advice ? todayCard(advice) : null
  const seasons = advice ? yearRows(advice, 'four') : null
  const rotation = advice ? nextRotation(advice) : null
  const health = soilHealth(state.logs, session?.soil ?? unavailableSoil)

  const savePlanting = useCallback((planting: Pick<CropLog, 'cropId' | 'plantedOn'>) => {
    if (!isCalendarDate(planting.plantedOn) || planting.plantedOn > formatDate(today)) return 'invalid-date' as const
    if (readAppState().logs.some((log) => log.cropId === planting.cropId && log.plantedOn === planting.plantedOn)) {
      return 'duplicate' as const
    }
    dispatch({
      type: 'saveLog',
      log: {
        id: crypto.randomUUID(),
        cropId: planting.cropId,
        plantedOn: planting.plantedOn,
        createdAt: new Date().toISOString(),
      },
    })
    return 'saved' as const
  }, [today])

  const openLogs = useCallback(() => {
    document.getElementById('plantings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    let nextIndex: number
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (index + tabs.length - 1) % tabs.length
        break
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const next = tabs[nextIndex]
    setTab(next)
    event.currentTarget.ownerDocument.getElementById(`tab-${next}`)?.focus()
  }

  const parcelMap = (
    <MapSheet
      field={state.field}
      lang={state.lang}
      status={fieldSession.mapStatus}
      onPointAttempt={fieldSession.onPointAttempt}
      onConfirm={() => setTab('hoy')}
      methodHref="/datos"
    />
  )

  return (
    <div
      id="desk"
      data-wide={wide ? 'yes' : 'no'}
      className="mx-auto min-h-screen w-full max-w-[560px] bg-cream lg:max-w-[1120px] lg:grid lg:grid-cols-[minmax(0,36rem)_minmax(22rem,1fr)] lg:items-start lg:gap-8 lg:px-8"
    >
    <main
      id="column"
      className="w-full px-5 pb-16 pt-8 text-ink"
    >
      <header>
        <h1 className="m-0 min-w-0 text-[1.75rem] font-semibold leading-8">{copy.wordmark}</h1>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div role="group" aria-label={copy.language} className="flex shrink-0 gap-1">
            <LangButton
              label={copy.spanish}
              active={state.lang === 'es'}
              onChoose={() => dispatch({ type: 'setLang', lang: 'es' })}
            />
            <LangButton
              label={copy.english}
              active={state.lang === 'en'}
              onChoose={() => dispatch({ type: 'setLang', lang: 'en' })}
            />
          </div>
          <button
            type="button"
            onClick={() => setTab('field')}
            aria-label={`${state.field.label}. ${state.lang === 'es' ? 'Cambiar parcela' : 'Change plot'}`}
            className={`flex min-w-0 items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1.5 text-sm leading-5 ${focusRing}`}
          >
            <PinMark />
            <span className="min-w-0 truncate">{state.field.label}</span>
            <span aria-hidden="true" className="shrink-0 font-semibold text-sage">
              · {state.lang === 'es' ? 'Cambiar' : 'Change'}
            </span>
          </button>
        </div>
      </header>
      <div role="tablist" aria-label={copy.sections} className="mt-8 grid grid-cols-3 gap-1 rounded-full bg-sand p-1">
        {tabs.map((id, index) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="tab-panel"
            tabIndex={tab === id ? 0 : -1}
            className={tabClass(tab === id)}
            onClick={() => setTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {copy.tabs[id]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`} tabIndex={0} className={`mt-5 grid gap-6 ${focusRing}`}>
        {tab === 'hoy' && (
          <>
            {card && status ? (
              <Hoy
                card={card}
                mark={status.mark}
                statusSentence={status.sentence}
                cropLabels={labels}
                lang={state.lang}
                onRegister={openLogs}
              />
            ) : (
              <DataStatus loading={fieldSession.initialLoading} lang={state.lang} />
            )}
            <Outlook
              lang={state.lang}
              data={fieldSession.initialLoading
                ? { kind: 'loading' }
                : { kind: 'ready', onset: status?.onset ?? null, drySpell: status?.drySpell ?? null }}
            />
            <div id="plantings">
              <Logs
                cropLabels={labels}
                logs={state.logs}
                rotation={rotation}
                health={health}
                today={formatDate(today)}
                lang={state.lang}
                onSave={savePlanting}
              />
            </div>
          </>
        )}
        {tab === 'year' && (
          <>
            {seasons ? <SeasonRows seasons={seasons} lang={state.lang} /> : <DataStatus loading={fieldSession.initialLoading} lang={state.lang} />}
            {session?.climatology ? (
              <Heatmap
                climatology={session.climatology}
                soil={session.soil}
                whatIf={state.whatIf}
                cropLabels={labels}
                lang={state.lang}
                currentMonth={today.month}
                onWhatIf={(whatIf) => dispatch({ type: 'setWhatIf', whatIf })}
              />
            ) : null}
          </>
        )}
        {tab === 'field' && (
          <>
            {wide ? null : parcelMap}
            {health.score !== null && state.logs.length > 0 ? (
              <p className="text-sm text-ink/70">
                {state.lang === 'es' ? 'Salud del suelo' : 'Soil health'}: {Math.round(health.score)} / 100
              </p>
            ) : null}
          </>
        )}
      </div>
      <footer className="mt-8 border-t border-sand pt-4 text-center">
        <Link href="/datos" className={`text-sm font-semibold text-sage underline underline-offset-4 ${focusRing}`}>
          {state.lang === 'es' ? 'Datos y método' : 'Data and method'}
        </Link>
      </footer>
    </main>
    {wide ? <aside className="px-5 pb-16 pt-8 lg:sticky lg:top-0 lg:px-0">{parcelMap}</aside> : null}
    </div>
  )
}

function DataStatus({ loading, lang }: { loading: boolean; lang: 'es' | 'en' }) {
  const text = loading
    ? lang === 'es' ? 'Cargando los datos de la parcela…' : 'Loading plot data…'
    : lang === 'es' ? 'Los datos de clima no están disponibles para esta parcela.' : 'Climate data are not available for this plot.'
  return <p role="status" className="rounded-2xl bg-white p-5 text-sm leading-6">{text}</p>
}

function SeasonRows({ seasons, lang }: { seasons: NonNullable<ReturnType<typeof yearRows>>; lang: 'es' | 'en' }) {
  return (
    <section aria-label={lang === 'es' ? 'Épocas del año' : 'Seasons of the year'} className="grid gap-3">
      <h2 className="text-2xl font-semibold">{lang === 'es' ? 'Este año' : 'This year'}</h2>
      <ol className="grid gap-2">
        {seasons.map((season, index) => (
          <li
            key={`${season.seasonId}-${season.label}-${index}`}
            aria-current={season.now ? 'step' : undefined}
            className={`rounded-2xl p-4 ${season.now ? 'bg-sage text-cream' : 'bg-white text-ink'}`}
          >
            {season.caption}
          </li>
        ))}
      </ol>
    </section>
  )
}

function localToday(now = new Date()): CalendarDay {
  return { year: now.getFullYear(), month: (now.getMonth() + 1) as CalendarDay['month'], day: now.getDate() }
}

function formatDate(day: CalendarDay): string {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function sameField(left: Field, right: Field): boolean {
  return left.lat === right.lat && left.lon === right.lon && left.label === right.label && left.soilFallback === right.soilFallback
}

function LangButton({ label, active, onChoose }: { label: string; active: boolean; onChoose: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={active
        ? `rounded-full bg-sage px-3 py-1 text-sm font-semibold text-cream ${focusRing}`
        : `rounded-full px-3 py-1 text-sm font-semibold text-ink ${focusRing}`}
      onClick={onChoose}
    >
      {label}
    </button>
  )
}

function tabClass(active: boolean): string {
  const base = `min-w-0 rounded-full px-2 py-2 text-sm font-semibold text-ink ${focusRing}`
  return active ? `${base} bg-cream` : base
}

function PinMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-sage" fill="none">
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" fill="currentColor" />
    </svg>
  )
}
