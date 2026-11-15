export type Lang = 'es' | 'en'

export type SeasonId = 'primera' | 'postrera' | 'seca'

export type CropId = 'maiz' | 'frijol' | 'sorgo' | 'cafe' | 'canavalia'

export type Suit = 'green' | 'yellow' | 'red'

export type CropLog = {
  id: string
  cropId: CropId
  plantedOn: string
  createdAt: string
}

export type PhaseMarker = {
  seasonId: SeasonId
  dayIndex: number
}

export type TodayInput = {
  now: Date
  logs: readonly CropLog[]
  lang: Lang
}

type CardCopy = {
  sentence: string
  reason: string
}

export type TodayCard = CardCopy &
  (
    | {
        kind: 'plant'
        suit: 'green'
        cropId: 'frijol'
        irrigation: boolean
      }
    | {
        kind: 'plant'
        suit: 'green'
        cropId: Exclude<CropId, 'frijol'>
        irrigation: false
      }
    | {
        kind: 'wait'
        suit: 'yellow' | 'red'
        cropId: CropId | null
        irrigation: false
      }
  )

export function todayCard(input: TodayInput): TodayCard

export function cycleStatus(input: { now: Date }): { phase: PhaseMarker }
