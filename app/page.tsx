'use client'

import { useLayoutEffect, useState } from 'react'
import { messages, type ShellCopy } from '@/i18n/messages'
import {
  defaultState,
  dispatch,
  readAppState,
  subscribe,
  type AppState,
} from '@/state/store'

type TabId = keyof ShellCopy['tabs']

const tabs: TabId[] = ['hoy', 'year', 'field']

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage'

export default function Page() {
  const [state, setState] = useState<AppState>(defaultState)
  const [tab, setTab] = useState<TabId>('hoy')

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

  const copy = messages[state.lang]

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
          <p className="m-0 min-w-0 text-right text-sm leading-5">{state.field.label}</p>
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
      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`} />
    </main>
  )
}

function LangButton({
  label,
  active,
  onChoose,
}: {
  label: string
  active: boolean
  onChoose: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={
        active
          ? `rounded-full bg-sage px-3 py-1 text-sm font-semibold text-cream ${focusRing}`
          : `rounded-full px-3 py-1 text-sm font-semibold text-ink ${focusRing}`
      }
      onClick={onChoose}
    >
      {label}
    </button>
  )
}

function tabClass(active: boolean): string {
  const base =
    `min-w-0 rounded-full px-2 py-2 text-sm font-semibold text-ink ${focusRing}`
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
