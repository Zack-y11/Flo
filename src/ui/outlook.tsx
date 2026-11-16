import type { DrySpell as DomainDrySpell, Lang, OnsetReport } from '@/domain/calendar'

type Onset = Pick<OnsetReport, 'p25Doy' | 'p75Doy' | 'medianDoy' | 'confidence'>
type DrySpell = Pick<DomainDrySpell, 'level'>

type OutlookProps = {
  lang: Lang
  data: { kind: 'loading' } | { kind: 'ready'; onset: Onset | null; drySpell: DrySpell | null }
}

const copy = {
  es: {
    heading: 'Ritmos de tu parcela',
    onsetTitle: 'Inicio de las lluvias',
    window: 'En tu zona, las lluvias suelen empezar entre',
    median: 'La fecha más común es el',
    confidence: { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' },
    onsetMissing: 'No hay años suficientes para estimar cuándo suelen empezar las lluvias.',
    loading: 'Cargando datos de lluvia…',
    dryTitle: 'Riesgo de sequía corta',
    dryLevel: { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' },
    dryDetails: 'Indicador para los próximos 7 a 14 días, basado en la lluvia reciente de NASA POWER. No es un pronóstico.',
    dryMissing: 'No hay datos recientes de lluvia suficientes para estimar el riesgo.',
  },
  en: {
    heading: 'Your plot’s rainfall patterns',
    onsetTitle: 'Start of the rainy season',
    window: 'Around your plot, the rains usually start between',
    median: 'The most common date is',
    confidence: { alta: 'High confidence', media: 'Medium confidence', baja: 'Low confidence' },
    onsetMissing: 'There are too few years of data to estimate when the rains usually begin.',
    loading: 'Loading rainfall data…',
    dryTitle: 'Short dry spell risk',
    dryLevel: { bajo: 'Low', medio: 'Medium', alto: 'High' },
    dryDetails: 'A 7 to 14 day risk indicator based on recent NASA POWER rainfall. This is not a forecast.',
    dryMissing: 'There is too little recent rainfall data to estimate the risk.',
  },
} satisfies Record<Lang, {
  heading: string
  onsetTitle: string
  window: string
  median: string
  confidence: Record<Onset['confidence'], string>
  onsetMissing: string
  loading: string
  dryTitle: string
  dryLevel: Record<DrySpell['level'], string>
  dryDetails: string
  dryMissing: string
}>

const dryTone: Record<DrySpell['level'], string> = {
  bajo: 'bg-[#bee7c9] text-[#234731]',
  medio: 'bg-[#fee0aa] text-[#57330a]',
  alto: 'bg-[#fad6c9] text-[#712b19]',
}

const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
const dateFormat = {
  es: new Intl.DateTimeFormat('es-SV', dateOptions),
  en: new Intl.DateTimeFormat('en-US', dateOptions),
}

function dateForDoy(doy: number) {
  return new Date(Date.UTC(2021, 0, doy))
}

export function Outlook({ lang, data }: OutlookProps) {
  const text = copy[lang]
  const dates = dateFormat[lang]
  const card = 'grid min-w-0 gap-1.5 rounded-2xl bg-[#e8f3ec] px-4 py-3 text-ink'

  if (data.kind === 'loading') {
    return (
      <section lang={lang} aria-label={text.heading} className="mx-auto grid w-full max-w-[40rem] gap-2.5">
        <h2 className="px-1 text-sm font-semibold">{text.heading}</h2>
        <p role="status" className="rounded-2xl bg-[#e8f3ec] px-4 py-3 text-sm leading-relaxed">{text.loading}</p>
      </section>
    )
  }

  const { onset, drySpell } = data
  return (
    <section lang={lang} aria-label={text.heading} className="mx-auto grid w-full max-w-[40rem] gap-2.5">
      <h2 className="px-1 text-sm font-semibold">{text.heading}</h2>
      <div className={card}>
        <h3 className="text-base font-semibold leading-tight">{text.onsetTitle}</h3>
        {onset && onset.p25Doy !== null && onset.p75Doy !== null ? (
          <>
            <p className="text-sm leading-relaxed">
              {text.window} {dates.formatRange(dateForDoy(onset.p25Doy), dateForDoy(onset.p75Doy))}.
              <span className="font-semibold text-[#34543f]"> · {text.confidence[onset.confidence]}</span>
            </p>
            {onset.medianDoy !== null && (
              <p className="text-sm leading-relaxed">{text.median} {dates.format(dateForDoy(onset.medianDoy))}.</p>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed">{text.onsetMissing}</p>
        )}
      </div>
      <div className={card}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold leading-tight">{text.dryTitle}</h3>
          {drySpell && (
            <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${dryTone[drySpell.level]}`}>
              {text.dryLevel[drySpell.level]}
            </span>
          )}
        </div>
        {drySpell ? (
          <p className="text-sm leading-relaxed">{text.dryDetails}</p>
        ) : (
          <p className="text-sm leading-relaxed">{text.dryMissing}</p>
        )}
      </div>
    </section>
  )
}
