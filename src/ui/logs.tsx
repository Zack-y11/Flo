'use client'

import { useState, type FormEvent } from 'react'
import type { CropId, Rotation, SoilHealth } from '@/domain/calendar'
import type { CropLog, Lang } from '@/state/store'

type Planting = Pick<CropLog, 'cropId' | 'plantedOn'>
type CropLabels = Readonly<Record<CropId, string>>

type SaveResult = 'saved' | 'invalid-date' | 'duplicate'
type Feedback = SaveResult | 'invalid-crop' | 'save-error'

type LogsProps = {
  cropLabels: CropLabels
  logs: readonly CropLog[]
  rotation: Rotation | null
  health: Readonly<Pick<SoilHealth, 'score' | 'fixPct' | 'socPts' | 'diversity'>>
  today: string
  lang: Lang
  onSave: (planting: Planting) => SaveResult
}

const es = {
  title: 'Siembra y fases',
  formTitle: 'Registrar siembra',
  crop: 'Cultivo',
  chooseCrop: 'Elegí un cultivo',
  date: 'Fecha de siembra',
  save: 'Guardar siembra',
  feedback: {
    saved: '¡Siembra registrada!',
    'invalid-date': 'Revisá la fecha de siembra.',
    duplicate: 'Esa siembra ya está registrada.',
    'invalid-crop': 'Elegí un cultivo de la lista.',
    'save-error': 'No se pudo guardar la siembra. Intentá de nuevo.',
  },
  history: 'Mi siembra',
  empty: 'Toca un cultivo para anotar lo que sembraste.',
  unknownDate: 'Fecha no disponible',
  rotation: 'Próxima rotación',
  rotationBand: {
    green: 'Buena aptitud para la siembra el próximo mes',
    yellow: 'Aptitud moderada para la siembra el próximo mes',
    red: 'Baja aptitud para la siembra el próximo mes',
  } satisfies Record<Rotation['band'], string>,
  rotationReason: (previous: string) =>
    `Rotamos después de ${previous} para evitar repetir el mismo cultivo.`,
  soil: 'Salud del suelo (3 temporadas)',
  soilMissing: 'No hay datos de suelo para esta parcela. No se puede calcular el puntaje.',
  unavailable: 'Sin dato',
  terms: {
    fix: { label: 'Fijación de nitrógeno', detail: 'Proporción de temporadas con cultivos que fijan nitrógeno.' },
    soc: { label: 'Carbono orgánico del suelo', detail: 'Puntos según la estimación de SoilGrids.' },
    diversity: { label: 'Diversidad de cultivos', detail: 'Puntos por sembrar distintos cultivos.' },
  },
  disclaimer: 'Esto apoya la decisión; no reemplaza el criterio de la persona agricultora ni de un técnico.',
}

const copy = {
  es,
  en: {
    title: 'Planting and seasons',
    formTitle: 'Record a planting',
    crop: 'Crop',
    chooseCrop: 'Choose a crop',
    date: 'Planting date',
    save: 'Save planting',
    feedback: {
      saved: 'Planting recorded!',
      'invalid-date': 'Check the planting date.',
      duplicate: 'That planting is already recorded.',
      'invalid-crop': 'Choose a crop from the list.',
      'save-error': 'Could not save the planting. Try again.',
    },
    history: 'My plantings',
    empty: 'Tap a crop to record what you planted.',
    unknownDate: 'Date unavailable',
    rotation: 'Next rotation',
    rotationBand: {
      green: 'Good planting suitability next month',
      yellow: 'Moderate planting suitability next month',
      red: 'Low planting suitability next month',
    },
    rotationReason: (previous: string) =>
      `We rotate after ${previous} to avoid repeating the same crop.`,
    soil: 'Soil health (3 seasons)',
    soilMissing: 'There are no soil data for this plot, so a score is unavailable.',
    unavailable: 'No data',
    terms: {
      fix: { label: 'Nitrogen fixation', detail: 'Share of seasons with nitrogen-fixing crops.' },
      soc: { label: 'Soil organic carbon', detail: 'Points based on the SoilGrids estimate.' },
      diversity: { label: 'Crop diversity', detail: 'Points for planting different crops.' },
    },
    disclaimer: 'This helps you make decisions; it does not replace the judgment of a farmer or technician.',
  },
} satisfies Record<Lang, typeof es>

const inputClass = 'mt-1 block min-h-12 w-full min-w-0 rounded-xl bg-[#f1fcf4] px-3 py-2 text-base text-[#141e19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45664e]'

function isCropId(value: unknown, cropLabels: CropLabels): value is CropId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(cropLabels, value)
}

export function Logs({ cropLabels, logs, rotation, health, today, lang, onSave }: LogsProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [plantingDate, setPlantingDate] = useState<string | null>(null)
  const text = copy[lang]
  const locale = lang === 'es' ? 'es-SV' : 'en-US'
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
  const terms = [
    { ...text.terms.fix, value: `${number.format(health.fixPct)}%` },
    { ...text.terms.soc, value: health.socPts === null ? text.unavailable : `${number.format(health.socPts)} / 100` },
    { ...text.terms.diversity, value: `${number.format(health.diversity)} / 100` },
  ]

  function savePlanting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const cropId = data.get('cropId')
    const plantedOn = data.get('plantedOn')

    if (!isCropId(cropId, cropLabels)) {
      setFeedback('invalid-crop')
      return
    }
    if (typeof plantedOn !== 'string' || !plantedOn) {
      setFeedback('invalid-date')
      return
    }

    try {
      setFeedback(onSave({ cropId, plantedOn }))
    } catch {
      setFeedback('save-error')
    }
  }

  return (
    <section aria-label={text.title} lang={lang} className="mx-auto grid w-full max-w-[40rem] gap-5 text-[#141e19]">
      <h2 className="text-[28px] leading-tight font-semibold">{text.title}</h2>

      <form onSubmit={savePlanting} onChange={() => setFeedback(null)} className="grid gap-4 rounded-[28px] bg-[#d1efda] p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[22px] leading-tight font-semibold">{text.formTitle}</h3>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#c4e9cb] text-[#45664e]">
            <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21v-8m0 1C6 14 3 10 3 5c5 0 9 3 9 9Zm0 2c0-6 4-9 9-9 0 5-3 9-9 9Z" />
            </svg>
          </span>
        </div>
        <label className="block min-w-0 text-sm font-semibold">
          {text.crop}
          <select name="cropId" className={inputClass} defaultValue="" required>
            <option value="" disabled>{text.chooseCrop}</option>
            {Object.entries(cropLabels).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-sm font-semibold">
          {text.date}
          <input
            type="date"
            name="plantedOn"
            className={inputClass}
            value={plantingDate ?? today}
            onChange={(event) => setPlantingDate(event.currentTarget.value)}
            required
          />
        </label>
        <button type="submit" className="min-h-12 rounded-full bg-[#94452c] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#793019] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#793019]">
          {text.save}
        </button>
        <div role="status" className={feedback === null ? 'sr-only' : 'rounded-xl bg-[#29332e] px-4 py-3 text-sm font-medium text-white'}>
          {feedback && text.feedback[feedback]}
        </div>
      </form>

      <section aria-label={text.history} className="grid gap-2">
        <h3 className="text-xl font-semibold">{text.history}</h3>
        {logs.length === 0 ? (
          <p className="rounded-[24px] bg-white p-4 text-sm leading-6 text-[#55433e] shadow-sm">{text.empty}</p>
        ) : (
          <ul className="grid gap-2">
            {logs.map((log) => {
              const plantedOn = new Date(`${log.plantedOn}T00:00:00Z`)
              const validDate = !Number.isNaN(plantedOn.getTime())
                && plantedOn.toISOString().slice(0, 10) === log.plantedOn

              return (
                <li key={log.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[24px] bg-white px-4 py-3 shadow-sm">
                  <span className="font-semibold">{cropLabels[log.cropId]}</span>
                  <span className="text-sm text-[#55433e]">
                    {validDate ? (
                      <time dateTime={log.plantedOn}>{date.format(plantedOn)}</time>
                    ) : text.unknownDate}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {logs.length > 0 && rotation && (
        <section aria-label={text.rotation} className="grid gap-1 rounded-[24px] bg-[#ebf6ef] p-4">
          <h3 className="font-semibold">{text.rotation}</h3>
          <p className="text-lg font-semibold text-[#2e4e37]">{cropLabels[rotation.cropId]}</p>
          <p className="text-sm leading-6 text-[#55433e]">
            {text.rotationBand[rotation.band]} ({number.format(rotation.suit)} / 100).{' '}
            {text.rotationReason(cropLabels[rotation.previousCropId])}
          </p>
        </section>
      )}

      {logs.length > 0 && (
        <section aria-label={text.soil} className="grid gap-3 rounded-[24px] bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">{text.soil}</h3>
          {health.score === null ? (
            <p className="text-sm leading-6 text-[#55433e]">{text.soilMissing}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-[#2e4e37]">{number.format(health.score)} <span className="text-sm font-medium">/ 100</span></p>
              <div role="meter" aria-label={text.soil} aria-valuemin={0} aria-valuemax={100} aria-valuenow={health.score} className="h-2 overflow-hidden rounded-full bg-[#e6f1e9]">
                <div className="h-full rounded-full bg-[#45664e]" style={{ width: `${health.score}%` }} />
              </div>
            </>
          )}
          <dl className="grid gap-2 sm:grid-cols-3">
            {terms.map((term) => (
              <div key={term.label} className="rounded-xl bg-[#ebf6ef] p-3">
                <dt className="text-sm text-[#55433e]">{term.label}</dt>
                <dd>
                  <p className="font-semibold">{term.value}</p>
                  <p className="text-sm leading-5 text-[#55433e]">{term.detail}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="px-2 text-center text-sm leading-6 text-[#55433e]">{text.disclaimer}</p>
    </section>
  )
}
