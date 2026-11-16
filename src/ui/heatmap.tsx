import type { CSSProperties } from "react"
import {
  CROP_IDS,
  scoreMonth,
  type Climatology,
  type CropId,
  type Soil,
  type WhatIf as Slider,
} from "@/domain/calendar"
import { BAND_COLOR, BAND_GLYPH, BAND_LABEL, INK, MUTED } from "./tokens"
import { DEFAULT_WHAT_IF, WhatIf, type Lang } from "./what-if"

const MONTHS = {
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
} as const

const SPANS = [
  { id: "primera", months: [5, 6, 7], es: "Mayo a julio", en: "May through July" },
  { id: "postrera", months: [8, 9, 10], es: "Agosto a octubre", en: "August through October" },
  { id: "seca", months: [11, 12, 1, 2, 3, 4], es: "Noviembre a abril", en: "November through April" },
] as const

const COPY = {
  es: {
    title: "Calendario agrícola",
    crop: "Cultivo",
    legend: "Qué significan los colores",
    hint: "Cada cuadro dice qué tan bueno es sembrar ese cultivo en ese mes, según el clima de tu parcela.",
    thisMonth: "este mes",
  },
  en: {
    title: "Crop calendar",
    crop: "Crop",
    legend: "What the colors mean",
    hint: "Each square shows how good it is to plant that crop in that month, based on your plot's climate.",
    thisMonth: "this month",
  },
} as const

type Props = {
  climatology: Climatology
  soil: Soil
  whatIf?: Slider
  onWhatIf: (whatIf: Slider) => void
  cropLabels: Readonly<Record<CropId, string>>
  lang?: Lang
  /** 1–12; highlights today's month column. */
  currentMonth?: number
}

export function Heatmap({
  climatology,
  soil,
  whatIf = DEFAULT_WHAT_IF,
  onWhatIf,
  cropLabels,
  lang = "es",
  currentMonth,
}: Props) {
  const copy = COPY[lang]
  const monthLabels = MONTHS[lang]
  return (
    <section aria-label={copy.title} style={columnStyle}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{copy.title}</h2>
      <p style={{ margin: "6px 0 12px", fontSize: 14, lineHeight: 1.45, color: MUTED }}>{copy.hint}</p>
      <ul aria-label={copy.legend} style={legendStyle}>
        {(["green", "yellow", "red"] as const).map((band) => (
          <li key={band} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true" style={{ ...cellStyle(band), display: "inline-grid", placeItems: "center" }}>
              {BAND_GLYPH[band]}
            </span>
            {BAND_LABEL[lang][band]}
          </li>
        ))}
      </ul>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 4, minWidth: 430 }}>
          <thead>
            <tr>
              <th scope="col" style={labelStyle}>
                {copy.crop}
              </th>
              {monthLabels.map((label, index) => {
                const now = index + 1 === currentMonth
                return (
                  <th
                    key={label}
                    scope="col"
                    aria-current={now ? "date" : undefined}
                    title={now ? copy.thisMonth : undefined}
                    style={now ? { ...monthStyle, background: INK, color: "#FFFFFF", borderRadius: 6 } : monthStyle}
                  >
                    {label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {CROP_IDS.map((cropId) => (
              <tr key={cropId}>
                <th scope="row" style={labelStyle}>
                  {cropLabels[cropId]}
                </th>
                {climatology.months.map((month, index) => {
                  const monthNumber = index + 1
                  const cell = scoreMonth(cropId, month, soil, whatIf)
                  const monthLabel = monthLabels[index] ?? ""
                  return (
                    <td
                      key={monthNumber}
                      data-crop={cropId}
                      data-month={monthNumber}
                      data-band={cell.band}
                      data-season={seasonId(monthNumber)}
                      aria-label={`${cropLabels[cropId]}, ${monthLabel}, ${BAND_LABEL[lang][cell.band]}`}
                      style={{
                        ...cellStyle(cell.band),
                        outline: monthNumber === currentMonth ? `2px solid ${INK}` : undefined,
                        outlineOffset: 1,
                      }}
                    >
                      <span aria-hidden="true">{BAND_GLYPH[cell.band]}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <WhatIf whatIf={whatIf} onWhatIf={onWhatIf} lang={lang} />
      </div>
    </section>
  )
}

function seasonId(month: number): (typeof SPANS)[number]["id"] {
  const span = SPANS.find((item) => item.months.some((value) => value === month))
  if (!span) {
    throw new Error(`month ${month} has no season`)
  }
  return span.id
}

const columnStyle: CSSProperties = {
  width: "100%",
  maxWidth: 640,
  margin: "0 auto",
  boxSizing: "border-box",
  color: INK,
}

const legendStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px 16px",
  margin: "0 0 16px",
  padding: 0,
  listStyle: "none",
  fontSize: 14,
}

const labelStyle: CSSProperties = {
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: "nowrap",
  paddingRight: 8,
}

const monthStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textAlign: "center",
  padding: "2px 0",
}

function cellStyle(band: keyof typeof BAND_COLOR): CSSProperties {
  return {
    width: 22,
    height: 22,
    minWidth: 22,
    borderRadius: 4,
    backgroundColor: BAND_COLOR[band],
    color: band === "yellow" ? "#151E15" : "#FFFFFF",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    textAlign: "center",
    padding: 0,
  }
}
