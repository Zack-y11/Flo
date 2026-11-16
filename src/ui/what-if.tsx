import { useId, type CSSProperties, type KeyboardEvent } from "react"
import type { WhatIf as Slider } from "@/domain/calendar"

export type Lang = "es" | "en"

export const DEFAULT_WHAT_IF: Slider = { dT: 0, rainFactor: 1 }

const COPY = {
  es: {
    title: "¿Y si el clima cambia?",
    hint: "Probá con más calor o menos lluvia y mirá cómo cambian los colores del calendario.",
    temperature: "Temperatura",
    rain: "Lluvia",
  },
  en: {
    title: "What if the climate changes?",
    hint: "Try warmer weather or less rain and see how the calendar colors change.",
    temperature: "Temperature",
    rain: "Rain",
  },
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
  const id = useId()
  return (
    <div style={{ display: "grid", gap: 10, padding: 16, borderRadius: 16, background: "#FFFFFF" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{copy.title}</h3>
        <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, color: "var(--color-muted)" }}>{copy.hint}</p>
      </div>
      <span id={`${id}-t`} style={groupLabelStyle}>{copy.temperature}</span>
      <div role="radiogroup" aria-labelledby={`${id}-t`} style={groupStyle}>
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
      <span id={`${id}-r`} style={groupLabelStyle}>{copy.rain}</span>
      <div role="radiogroup" aria-labelledby={`${id}-r`} style={groupStyle}>
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

const groupLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: -4,
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
    minHeight: 44,
    fontWeight: checked ? 700 : 400,
    background: checked ? "var(--color-sage)" : "#e7f0ea",
    color: checked ? "#ffffff" : "var(--color-ink)",
  }
}
