export type Band = "green" | "yellow" | "red"

export type WhatIf = {
  readonly dT: 0 | 1 | 2
  readonly rainFactor: 1 | 0.9 | 0.8
}

export type MonthClimate = {
  readonly t2mC: number
  readonly prectotcorrMmDay: number
  readonly solarMj: number
  readonly rhPct: number
  readonly gwetroot: number
  readonly gwettop: number
}

export type Climatology = {
  readonly validThrough: string
  readonly months: readonly [
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
    MonthClimate,
  ]
}

export type Soil = {
  readonly ph: number
  readonly socGkg: number
  readonly clayPct: number
  readonly sandPct: number
  readonly nitrogenGkg: number
}

export type CropId = "maiz" | "frijol" | "sorgo" | "cafe" | "canavalia"

export type CropTrait = {
  readonly name: { readonly es: string; readonly en: string }
}

export const crops: { readonly [K in CropId]: CropTrait }

export function scoreMonth(
  cropId: CropId,
  month: MonthClimate,
  soil: Soil | null,
  whatIf: WhatIf,
): { readonly suit: number; readonly band: Band }