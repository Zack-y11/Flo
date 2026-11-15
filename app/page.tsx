'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
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
  const today = useMemo(localToday, [])

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

  return (
    <main
      id="column"
      className="mx-auto min-h-screen w-full max-w-[560px] bg-cream px-5 pb-16 pt-8 text-ink"
    >
      <header>
        <div className="flex items-start justify-between gap-3">
          <h1 className="m-0 min-w-0 text-[1.75rem] font-semibold leading-8">{copy.wordmark}</h1>
          <PersonMark />
        </div>
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
            className={`min-w-0 truncate rounded-lg text-right text-sm leading-5 underline underline-offset-4 ${focusRing}`}
          >
            {state.field.label}
          </button>
        </div>
      </header>
      <div role="tablist" aria-label={copy.sections} className="mt-8 grid grid-cols-3 gap-1 rounded-full bg-sand p-1">
        {tabs.map((id) => (
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
          >
            {copy.tabs[id]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`} className="mt-5 grid gap-6">
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
              onset={status?.onset.p25Doy !== null && status?.onset.p25Doy !== undefined
                ? status.onset
                : null}
              drySpell={status?.drySpell ?? null}
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
                onWhatIf={(whatIf) => dispatch({ type: 'setWhatIf', whatIf })}
              />
            ) : null}
          </>
        )}
        {tab === 'field' && (
          <>
            <MapSheet
              field={state.field}
              lang={state.lang}
              status={fieldSession.mapStatus}
              onPointAttempt={fieldSession.onPointAttempt}
              onConfirm={() => setTab('hoy')}
              methodHref="/datos"
            />
            {health.score !== null && state.logs.length > 0 ? (
              <p className="text-sm text-ink/70">
                {state.lang === 'es' ? 'Salud del suelo' : 'Soil health'}: {Math.round(health.score)} / 100
              </p>
            ) : null}
            <Link href="/datos" className={`text-center text-sm font-semibold text-sage underline underline-offset-4 ${focusRing}`}>
              {state.lang === 'es' ? 'Datos y método' : 'Data and method'}
            </Link>
          </>
        )}
      </div>
      <footer className="mt-8 border-t border-sand pt-4 text-center">
        <Link href="/datos" className={`text-sm font-semibold text-sage underline underline-offset-4 ${focusRing}`}>
          {state.lang === 'es' ? 'Datos y método' : 'Data and method'}
        </Link>
      </footer>
    </main>
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

function localToday(): CalendarDay {
  const now = new Date()
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

function PersonMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-1 h-9 w-9 shrink-0 text-sage" fill="none">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.25c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
