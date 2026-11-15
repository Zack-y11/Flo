import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { crops, type Climatology, type MonthClimate, type Soil, type WhatIf } from "@/domain/calendar"
import { Heatmap } from "./heatmap"
import { DEFAULT_WHAT_IF } from "./what-if"

type ScoreCall = {
  cropId: string
  month: MonthClimate
  soil: Soil | null
  whatIf: WhatIf
}

const calls = vi.hoisted(() => {
  const found: ScoreCall[] = []
  return found
})

vi.mock("@/domain/calendar", () => ({
  crops: {
    maiz: { name: { es: "Ma\u00edz", en: "Ma\u00edz (maize)" } },
    frijol: { name: { es: "Frijol", en: "Frijol (beans)" } },
    sorgo: { name: { es: "Maicillo", en: "Maicillo (sorghum)" } },
    cafe: { name: { es: "Caf\u00e9", en: "Caf\u00e9 (coffee)" } },
    canavalia: { name: { es: "Canavalia", en: "Canavalia (cover crop)" } },
  },
  scoreMonth(cropId: string, month: MonthClimate, soil: Soil | null, whatIf: WhatIf) {
    calls.push({ cropId, month, soil, whatIf })
    if (cropId === "maiz" && month.t2mC === 24 && (whatIf.dT === 2 || whatIf.rainFactor === 0.8)) {
      return { suit: 30, band: "red" }
    }
    if (cropId === "maiz" && month.t2mC === 24) {
      return { suit: 72.13, band: "green" }
    }
    return { suit: 55, band: "yellow" }
  },
}))

const fetchMock = vi.fn()

beforeEach(() => {
  calls.length = 0
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("crop calendar", () => {
  it("paints five Spanish crops across twelve months from the held climatology", () => {
    const climatology = climate()
    const soil = profile()
    render(<Heatmap climatology={climatology} soil={soil} onWhatIf={() => undefined} />)

    expect(screen.getByRole("radio", { name: "+0 \u00B0C" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: "0%" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: "+1 \u00B0C" })).toBeTruthy()
    expect(screen.getByRole("radio", { name: "\u221210%" })).toBeTruthy()
    expect(screen.getByRole("columnheader", { name: "Ene" })).toBeTruthy()
    expect(screen.queryByRole("columnheader", { name: "Jan" })).toBeNull()
    expect(screen.getByText("Mayo a julio")).toBeTruthy()
    expect(screen.getByText("Agosto a octubre")).toBeTruthy()
    expect(screen.getByText("Noviembre a abril")).toBeTruthy()
    expect(document.body.textContent?.toLowerCase().includes("verano")).toBe(false)
    expect(screen.getByRole("rowheader", { name: crops.maiz.name.es })).toBeTruthy()
    expect(screen.getByRole("rowheader", { name: crops.frijol.name.es })).toBeTruthy()
    expect(screen.getByRole("rowheader", { name: crops.sorgo.name.es })).toBeTruthy()
    expect(screen.getByRole("rowheader", { name: crops.cafe.name.es })).toBeTruthy()
    expect(screen.getByRole("rowheader", { name: crops.canavalia.name.es })).toBeTruthy()

    const cells = [...document.querySelectorAll<HTMLElement>("[data-band]")]
    expect(cells).toHaveLength(60)
    for (const cell of cells) {
      expect(["green", "yellow", "red"]).toContain(cell.dataset.band)
      expect(cell.style.backgroundColor).not.toBe("")
    }
    const july = cells.filter((cell) => cell.dataset.month === "7")
    expect(july).toHaveLength(5)
    for (const cell of july) {
      expect(cell.dataset.season).toBe("primera")
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(calls.every((call) => call.soil === soil)).toBe(true)
    expect(calls.some((call) => call.month === climatology.months[0])).toBe(true)
    expect(screen.getByRole("region").style.maxWidth).toBe("640px")
  })

  it("changes a cell band when rain falls to 0.8 and leaves stored temperatures alone", () => {
    const climatology = climate()
    const before = temperatures(climatology)
    const seen: WhatIf[] = []
    render(
      <Harness
        climatology={climatology}
        soil={profile()}
        onWhatIf={(next) => {
          seen.push(next)
        }}
      />,
    )

    const first = bands()
    fireEvent.click(screen.getByRole("radio", { name: "\u221220%" }))

    expect(bands().some((band, index) => band !== first[index])).toBe(true)
    expect(temperatures(climatology)).toEqual(before)
    expect(seen).toEqual([{ dT: 0, rainFactor: 0.8 }])
    expect(calls.some((call) => call.whatIf.rainFactor === 0.8 && call.month === climatology.months[0])).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("changes a cell band at +2 C and keeps stored temperatures after the return to +0 C", () => {
    const climatology = climate()
    const before = temperatures(climatology)
    const seen: WhatIf[] = []
    render(
      <Harness
        climatology={climatology}
        soil={profile()}
        onWhatIf={(next) => {
          seen.push(next)
        }}
      />,
    )

    const first = bands()
    fireEvent.click(screen.getByRole("radio", { name: "+2 \u00B0C" }))
    expect(bands().some((band, index) => band !== first[index])).toBe(true)
    expect(temperatures(climatology)).toEqual(before)
    expect(calls.some((call) => call.whatIf.dT === 2 && call.month === climatology.months[0])).toBe(true)

    fireEvent.click(screen.getByRole("radio", { name: "+0 \u00B0C" }))
    expect(temperatures(climatology)).toEqual(before)
    expect(seen).toEqual([
      { dT: 2, rainFactor: 1 },
      { dT: 0, rainFactor: 1 },
    ])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("translates the slider labels in English", () => {
    render(<Heatmap climatology={climate()} soil={profile()} lang="en" onWhatIf={() => undefined} />)
    expect(screen.getByRole("radiogroup", { name: "Temperature" })).toBeTruthy()
    expect(screen.getByRole("radiogroup", { name: "Rain" })).toBeTruthy()
    expect(screen.getByRole("columnheader", { name: "Jan" })).toBeTruthy()
    expect(screen.getByText("May through July")).toBeTruthy()
    expect(screen.getByText("August through October")).toBeTruthy()
    expect(screen.getByText("November through April")).toBeTruthy()
    expect(screen.getByRole("rowheader", { name: crops.maiz.name.en })).toBeTruthy()
  })
})

function Harness({
  climatology,
  soil,
  onWhatIf,
}: {
  climatology: Climatology
  soil: Soil | null
  onWhatIf?: (whatIf: WhatIf) => void
}) {
  const [whatIf, setWhatIf] = useState(DEFAULT_WHAT_IF)
  return (
    <Heatmap
      climatology={climatology}
      soil={soil}
      whatIf={whatIf}
      onWhatIf={(next) => {
        onWhatIf?.(next)
        setWhatIf(next)
      }}
    />
  )
}

function bands(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-band]")].map((cell) => cell.dataset.band ?? "")
}

function temperatures(climatology: Climatology): number[] {
  return climatology.months.map((month) => month.t2mC)
}

function profile(): Soil {
  return Object.freeze({
    ph: 6.5,
    socGkg: 48.6,
    clayPct: 20,
    sandPct: 30,
    nitrogenGkg: 2,
  })
}

function row(t2mC: number, prectotcorrMmDay: number): MonthClimate {
  return Object.freeze({
    t2mC,
    prectotcorrMmDay,
    solarMj: 0,
    rhPct: 0,
    gwetroot: 0,
    gwettop: 0,
  })
}

function climate(): Climatology {
  const months: Climatology["months"] = [
    row(24, 100 / 31),
    row(23, 0.2),
    row(25, 0.3),
    row(26, 0.4),
    row(27, 1),
    row(22, 4),
    row(21, 6),
    row(20, 8),
    row(19, 7),
    row(18, 5),
    row(17, 2),
    row(16, 0.5),
  ]
  return { validThrough: "2026-11-14", months }
}