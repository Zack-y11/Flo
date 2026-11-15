import type { CSSProperties, KeyboardEvent } from "react"
import type { WhatIf as Slider } from "@/domain/calendar"

export type Lang = "es" | "en"

export const DEFAULT_WHAT_IF: Slider = { dT: 0, rainFactor: 1 }

const COPY = {
  es: { temperature: "Temperatura", rain: "Lluvia" },
  en: { temperature: "Temperature", rain: "Rain" },
} as const

const TEMPERATURES = [
  { dT: 0, label: "+0 \u00B0C" },
  { dT: 1, label: "+1 \u00B0C" },
  { dT: 2, label: "+2 \u00B0C" },
] as const

const RAINS = [
  { rainFactor: 1, label: "0%" },
  { rainFactor: 0.9, label: "\u221210%" },
  { rainFactor: 0.8, label: "\u221220%" },
] as const

type Props = {
  whatIf: Slider
  onWhatIf: (whatIf: Slider) => void
  lang?: Lang
}

export function WhatIf({ whatIf, onWhatIf, lang = "es" }: Props) {
  const copy = COPY[lang]
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div role="radiogroup" aria-label={copy.temperature} style={groupStyle}>
        {TEMPERATURES.map((choice) => {
          const checked = whatIf.dT === choice.dT
          return (
            <button
              key={choice.dT}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onKeyDown={moveRadioSelection}
              onClick={() => onWhatIf({ dT: choice.dT, rainFactor: whatIf.rainFactor })}
              style={choiceStyle(checked)}
            >
              {choice.label}
            </button>
          )
        })}
      </div>
      <div role="radiogroup" aria-label={copy.rain} style={groupStyle}>
        {RAINS.map((choice) => {
          const checked = whatIf.rainFactor === choice.rainFactor
          return (
            <button
              key={choice.rainFactor}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onKeyDown={moveRadioSelection}
              onClick={() => onWhatIf({ dT: whatIf.dT, rainFactor: choice.rainFactor })}
              style={choiceStyle(checked)}
            >
              {choice.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function moveRadioSelection(event: KeyboardEvent<HTMLButtonElement>) {
  const forward = event.key === "ArrowRight" || event.key === "ArrowDown"
  const backward = event.key === "ArrowLeft" || event.key === "ArrowUp"
  if (!forward && !backward) return

  event.preventDefault()
  const button = event.currentTarget
  const next = forward
    ? button.nextElementSibling ?? button.parentElement?.firstElementChild
    : button.previousElementSibling ?? button.parentElement?.lastElementChild
  if (next instanceof HTMLButtonElement) {
    next.focus()
    next.click()
  }
}

const groupStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
}

function choiceStyle(checked: boolean): CSSProperties {
  return {
    border: 0,
    borderRadius: 8,
    padding: "10px 8px",
    font: "inherit",
    cursor: "pointer",
    background: checked ? "#45664e" : "#e7f0ea",
    color: checked ? "#ffffff" : "#1c1915",
  }
}

