'use client'

import Link from 'next/link'
import { useEffect, useSyncExternalStore } from 'react'
import { crops, SCORE_RULES, scoreMonth, TRAIT_SOURCE, type CropId } from '@/domain/calendar'
import { messages } from '@/i18n/messages'
import { defaultState, dispatch, readAppState, subscribe, type Lang } from '@/state/store'

const weights = SCORE_RULES.suitWeights
const soil = SCORE_RULES.soil
const onset = SCORE_RULES.onset
const dry = SCORE_RULES.drySpell
const bands = SCORE_RULES.bands

const spanish = {
  title: 'Datos y método',
  back: 'Volver al calendario',
  sources: 'Fuentes de datos',
  power: 'La lluvia, la temperatura y la humedad de las raíces vienen de los datos diarios y la climatología mensual de NASA POWER.',
  soilgrids: 'ISRIC SoilGrids estima el pH, el carbono orgánico y la textura en los primeros 5 cm de suelo.',
  compiled: 'Los rangos de cultivo son valores de referencia compilados a partir de guías como las de FAO y CENTA. No provienen de una consulta en vivo a ECOCROP.',
  unavailable: 'El portal ECOCROP no estaba disponible el',
  method: 'Cómo se calcula',
  suitability: 'Aptitud para sembrar (0–100)',
  temperature: 'puntaje de temperatura',
  rain: 'puntaje de lluvia',
  ph: 'pH',
  phScore: 'puntaje de pH',
  suitabilityDetail: 'Comparamos la temperatura con el rango del cultivo. Para los cultivos anuales, comparamos la lluvia del mes con la necesidad del ciclo ajustada a la duración del mes. Para el café, usamos la necesidad anual dividida entre 12. Si falta el pH, los pesos de temperatura y lluvia se ajustan para sumar 1.',
  colors: `Verde desde ${bands.green}, amarillo desde ${bands.yellow} hasta menos de ${bands.green}, rojo por debajo de ${bands.yellow}.`,
  exampleTitle: 'Ejemplo de maíz en enero',
  exampleInputs: '100 mm de lluvia, 24 °C y pH 6.5, sin cambiar los ajustes de clima.',
  exampleResult: 'Aptitud',
  band: { green: 'verde', yellow: 'amarillo', red: 'rojo' },
  onset: 'Inicio de las lluvias',
  onsetDetail: `Tomamos hasta ${onset.sampleYears} de los años completos más recientes con cobertura diaria suficiente para evaluar toda la ventana. En cada uno buscamos la primera fecha entre abril y junio con al menos ${onset.rainMm} mm de lluvia en ${onset.trailingDays} días y una humedad de raíces de al menos ${onset.gwetroot}. Solo los años con inicio detectado entran en la mediana y el intervalo entre los percentiles 25 y 75.`,
  dry: 'Sequía corta',
  dryDetail: `Usamos hasta ${dry.lookbackDays} días de lluvia. Solo estimamos el riesgo cuando hay una semana completa de días consecutivos y el dato más reciente tiene como máximo ${dry.maxObservationAgeDays} días. El riesgo es alto tras ${dry.altoRun} días secos seguidos o cuando la última semana recibe como máximo el ${dry.altoWeek * 100}% de su lluvia habitual. Es medio a partir de ${dry.medioRun} días secos o con un máximo del ${dry.medioWeek * 100}%, y bajo en los demás casos. Un día seco recibe menos de ${dry.dryBelowMm} mm. No es un pronóstico.`,
  health: 'Salud del suelo (0–100)',
  fixation: 'porcentaje de fijación',
  carbon: 'puntaje de carbono orgánico',
  diversity: 'puntaje de diversidad',
  healthDetail: 'El porcentaje de fijación cuenta cuántas de las últimas tres siembras fijan nitrógeno. Las siembras sin registrar cuentan como vacías. La diversidad aumenta cuando se registran cultivos distintos. Sin datos de carbono orgánico, no hay puntaje de salud del suelo.',
  traits: 'Rangos de cultivo',
  crop: 'Cultivo',
  temperatureRange: 'Temp. (°C)',
  rainRange: 'Lluvia (mm)',
  perYear: 'por año',
  perCycle: 'por ciclo',
  rangeHelp: 'La temperatura se muestra como mínima, óptima y máxima.',
}

const copy = {
  es: spanish,
  en: {
    title: 'Data and method',
    back: 'Back to the calendar',
    sources: 'Data sources',
    power: 'Rainfall, temperature, and root-zone moisture come from NASA POWER daily data and monthly climatology.',
    soilgrids: 'ISRIC SoilGrids estimates pH, organic carbon, and texture in the top 5 cm of soil.',
    compiled: 'The crop ranges are compiled defaults based on guidance such as FAO and CENTA. Flo uses the compiled values without a live ECOCROP lookup.',
    unavailable: 'The ECOCROP portal was unavailable on',
    method: 'How it is calculated',
    suitability: 'Planting suitability (0–100)',
    temperature: 'temperature score',
    rain: 'rainfall score',
    ph: 'pH',
    phScore: 'pH score',
    suitabilityDetail: 'We compare the temperature with the crop’s range. For annual crops, we compare monthly rainfall with the crop’s cycle needs scaled to the length of the month. For coffee, we divide the annual rainfall need by 12. If pH is missing, we rescale the temperature and rainfall weights to add up to 1.',
    colors: `Green at ${bands.green} or above, yellow from ${bands.yellow} to below ${bands.green}, and red below ${bands.yellow}.`,
    exampleTitle: 'January maize example',
    exampleInputs: '100 mm of rain, 24 °C, and pH 6.5, with the default climate settings.',
    exampleResult: 'Suitability',
    band: { green: 'green', yellow: 'yellow', red: 'red' },
    onset: 'Start of the rains',
    onsetDetail: `We use up to ${onset.sampleYears} of the most recent complete years with enough daily coverage to evaluate the full window. In each year, we look for the first date from April through June with at least ${onset.rainMm} mm of rain over ${onset.trailingDays} days and root-zone moisture of at least ${onset.gwetroot}. Only years with a detected onset contribute to the median and the window between the 25th and 75th percentiles.`,
    dry: 'Dry spells',
    dryDetail: `We use up to ${dry.lookbackDays} days of rainfall. We estimate risk only when a full consecutive week is available and the latest observation is no more than ${dry.maxObservationAgeDays} days old. Risk is high after ${dry.altoRun} consecutive dry days or if the past week had at most ${dry.altoWeek * 100}% of its usual rainfall. Risk is medium from ${dry.medioRun} dry days or at most ${dry.medioWeek * 100}%, and low otherwise. A dry day gets less than ${dry.dryBelowMm} mm of rain. This is not a forecast.`,
    health: 'Soil health (0–100)',
    fixation: 'nitrogen fixation percentage',
    carbon: 'organic carbon score',
    diversity: 'crop diversity score',
    healthDetail: 'The fixation percentage counts how many of the last three plantings fix nitrogen. Unrecorded plantings count as empty slots. Planting different crops raises the diversity score. A soil health score requires organic carbon data.',
    traits: 'Crop ranges',
    crop: 'Crop',
    temperatureRange: 'Temp. (°C)',
    rainRange: 'Rain (mm)',
    perYear: 'per year',
    perCycle: 'per cycle',
    rangeHelp: 'The temperatures are the minimum, optimum, and maximum.',
  },
} satisfies Record<Lang, typeof spanish>

const cropNames = {
  es: { maiz: 'Maíz', frijol: 'Frijol', sorgo: 'Maicillo', cafe: 'Café', canavalia: 'Canavalia' },
  en: { maiz: 'Maize', frijol: 'Beans', sorgo: 'Sorghum', cafe: 'Coffee', canavalia: 'Canavalia' },
} satisfies Record<Lang, Record<CropId, string>>

function isCropId(key: string): key is CropId {
  return Object.hasOwn(crops, key)
}
const cropIds = Object.keys(crops).filter(isCropId)

const example = scoreMonth(
  'maiz',
  { month: 1, t2mC: 24, prectotcorrMmDay: 100 / 31, solarMj: 0, rhPct: 0, gwetroot: 0, gwettop: 0 },
  { status: 'measured', origin: 'pin', ph: 6.5, socGkg: 0, clayPct: 0, sandPct: 0, nitrogenGkg: 0 },
  { dT: 0, rainFactor: 1 },
)

const cardClass = 'grid gap-3 rounded-3xl bg-white p-5 shadow-sm'
const linkClass = 'font-semibold text-sage underline underline-offset-4'
const titleClass = 'text-lg font-semibold'
const languages: readonly Lang[] = ['es', 'en']

export default function DatosPage() {
  const lang = useSyncExternalStore(subscribe, () => readAppState().lang, () => defaultState.lang)
  const text = copy[lang]
  const shell = messages[lang]

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <main lang={lang} className="mx-auto grid w-full max-w-[560px] gap-7 bg-cream px-5 py-8 text-ink">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className={linkClass}>{text.back}</Link>
          <div role="group" aria-label={shell.language} className="flex gap-1 rounded-full bg-sand p-1">
            {languages.map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={lang === language}
                className="min-h-10 rounded-full px-3 text-sm font-semibold aria-pressed:bg-sage aria-pressed:text-cream"
                onClick={() => dispatch({ type: 'setLang', lang: language })}
              >
                {language === 'es' ? shell.spanish : shell.english}
              </button>
            ))}
          </div>
        </div>
        <h1 className="text-3xl font-semibold">{text.title}</h1>
      </header>

      <section aria-labelledby="sources" className={cardClass}>
        <h2 id="sources" className={titleClass}>{text.sources}</h2>
        <dl className="grid gap-3 text-sm leading-relaxed">
          <div>
            <dt><a className={linkClass} href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/">NASA POWER</a></dt>
            <dd>{text.power}</dd>
          </div>
          <div>
            <dt><a className={linkClass} href="https://rest.isric.org/soilgrids/v2.0/docs">ISRIC SoilGrids</a></dt>
            <dd>{text.soilgrids}</dd>
          </div>
          <div>
            <dt className="flex flex-wrap gap-x-3">
              <a className={linkClass} href="https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en">FAO ECOCROP</a>
              <a className={linkClass} href="https://www.fao.org/gaez/en">FAO GAEZ</a>
              <a className={linkClass} href="https://www.centa.gob.sv/servicios/programa-granos-basicos/">CENTA</a>
            </dt>
            <dd>{text.compiled} {text.unavailable} <time dateTime={TRAIT_SOURCE.checked}>{TRAIT_SOURCE.checked}</time> ({TRAIT_SOURCE.ecocrop}).</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="method" className={cardClass}>
        <h2 id="method" className={titleClass}>{text.method}</h2>
        <div className="grid gap-2 text-sm leading-relaxed">
          <h3 className="font-semibold">{text.suitability}</h3>
          <p className="rounded-lg bg-cream p-3">
            {weights.temp.toFixed(2)} × {text.temperature} + {weights.rain.toFixed(2)} × {text.rain} + {weights.ph.toFixed(2)} × {text.phScore}
          </p>
          <p>{text.suitabilityDetail}</p>
          <p>{text.colors}</p>
          <p><strong>{text.exampleTitle}.</strong> {text.exampleInputs} {text.exampleResult} {example.suit.toFixed(2)}/100 ({text.band[example.band]}).</p>
        </div>
        <div className="grid gap-1 border-t border-sand pt-3 text-sm leading-relaxed">
          <h3 className="font-semibold">{text.onset}</h3>
          <p>{text.onsetDetail}</p>
          <h3 className="mt-2 font-semibold">{text.dry}</h3>
          <p>{text.dryDetail}</p>
        </div>
        <div className="grid gap-2 border-t border-sand pt-3 text-sm leading-relaxed">
          <h3 className="font-semibold">{text.health}</h3>
          <p className="rounded-lg bg-cream p-3">
            {soil.fix.toFixed(2)} × {text.fixation} + {soil.soc.toFixed(2)} × {text.carbon} + {soil.diversity.toFixed(2)} × {text.diversity}
          </p>
          <p>{text.healthDetail}</p>
        </div>
      </section>

      <section aria-labelledby="traits" className={cardClass}>
        <h2 id="traits" className={titleClass}>{text.traits}</h2>
        <p id="range-help" className="text-sm">{text.rangeHelp}</p>
        <table aria-labelledby="traits" aria-describedby="range-help" className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand align-top [&_th]:pb-2">
              <th scope="col">{text.crop}</th>
              <th scope="col">{text.temperatureRange}</th>
              <th scope="col">{text.rainRange}</th>
              <th scope="col">{text.ph}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {cropIds.map((id) => {
              const crop = crops[id]
              const rain = crop.kind === 'annual' ? crop.rainCycleMm : crop.rainYearMm
              const period = crop.kind === 'annual' ? text.perCycle : text.perYear
              return (
                <tr key={id} className="align-top [&_td]:py-2 [&_th]:py-2">
                  <th scope="row">{cropNames[lang][id]}</th>
                  <td>{crop.temp.min}–{crop.temp.opt}–{crop.temp.max}</td>
                  <td>{rain.min}–{rain.max} <span className="block text-xs">{period}</span></td>
                  <td>{crop.ph.min}–{crop.ph.max}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </main>
  )
}
