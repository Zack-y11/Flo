import type { CSSProperties } from "react"
import {
  CROP_IDS,
  scoreMonth,
  type Climatology,
  type CropId,
  type Soil,
  type WhatIf as Slider,
} from "@/domain/calendar"
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
    seasons: "Épocas",
    band: { green: "verde", yellow: "amarillo", red: "rojo" },
  },
  en: {
    title: "Crop calendar",
    crop: "Crop",
    seasons: "Seasons",
    band: { green: "green", yellow: "yellow", red: "red" },
  },
} as const

const BAND_COLOR = {
  green: "#2f6b45",
  yellow: "#e0b13a",
  red: "#b23a2f",
} as const

type Props = {
  climatology: Climatology
  soil: Soil
  whatIf?: Slider
  onWhatIf: (whatIf: Slider) => void
  cropLabels: Readonly<Record<CropId, string>>
  lang?: Lang
}

export function Heatmap({
  climatology,
  soil,
  whatIf = DEFAULT_WHAT_IF,
  onWhatIf,
  cropLabels,
  lang = "es",
}: Props) {
  const copy = COPY[lang]
  const monthLabels = MONTHS[lang]
  return (
    <section aria-label={copy.title} style={columnStyle}>
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 600 }}>{copy.title}</h2>
      <WhatIf whatIf={whatIf} onWhatIf={onWhatIf} lang={lang} />
      <ul aria-label={copy.seasons} style={spanStyle}>
        {SPANS.map((span) => (
          <li key={span.id}>{span[lang]}</li>
        ))}
      </ul>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 4, minWidth: 430 }}>
          <thead>
            <tr>
              <th scope="col" style={labelStyle}>
                {copy.crop}
              </th>
              {monthLabels.map((label) => (
                <th key={label} scope="col" style={monthStyle}>
                  {label}
                </th>
              ))}
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
                      aria-label={`${cropLabels[cropId]}, ${monthLabel}, ${copy.band[cell.band]}`}
                      style={cellStyle(cell.band)}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
  padding: 16,
  background: "#FAF6EE",
  color: "#1c1915",
  fontFamily: "Segoe UI, sans-serif",
}

const spanStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: "16px 0 8px",
  padding: 0,
  listStyle: "none",
  fontSize: 13,
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
}

function cellStyle(band: keyof typeof BAND_COLOR): CSSProperties {
  return {
    width: 22,
    height: 22,
    minWidth: 22,
    borderRadius: 4,
    backgroundColor: BAND_COLOR[band],
    padding: 0,
  }
}
