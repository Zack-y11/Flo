'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useRef, useState } from 'react'
import type { LatLngTuple } from 'leaflet'
import { isFieldPoint } from '@/domain/field'
import type { Field, Lang } from '@/state/store'
import 'leaflet/dist/leaflet.css'

export type MapPoint = Pick<Field, 'lat' | 'lon'>

export type MapPointAttempt =
  | { kind: 'valid'; point: MapPoint }
  | { kind: 'invalid'; point: MapPoint }

type MapSheetProps = {
  field: Field
  lang: Lang
  status?: 'idle' | 'loading' | 'error'
  onPointAttempt: (attempt: MapPointAttempt) => void
  onConfirm: () => void
  methodHref?: string
}

const es = {
  title: 'Mapa de parcela',
  country: 'El Salvador',
  confirmTitle: 'Confirmar parcela',
  pick: 'Elegí el punto en el mapa.',
  mapLoading: 'Cargando mapa…',
  keyboard: 'Usá las flechas para mover el mapa y Enter para elegir el centro.',
  selected: 'Ubicación seleccionada',
  zoomIn: 'Acercar mapa',
  zoomOut: 'Alejar mapa',
  gps: 'Usar mi ubicación',
  locating: 'Buscando tu ubicación…',
  gpsError: 'No pudimos obtener tu ubicación. Podés elegir un punto en el mapa.',
  outside: 'Elegí un punto dentro de El Salvador.',
  copy: 'Copiar',
  copied: 'Coordenadas copiadas.',
  copyError: 'No pudimos copiar. Seleccioná las coordenadas para copiarlas.',
  loading: 'Actualizando los datos de la parcela…',
  loadError: 'No pudimos actualizar los datos. Volvé a elegir el punto para reintentar.',
  soilFallback: 'No hay dato de suelo en este punto (pasa en zonas urbanas). Usamos un punto rural cercano / el valor regional.',
  confirm: 'Usar esta parcela',
  method: 'Datos y método',
}

const messages = {
  es,
  en: {
    title: 'Plot map',
    country: 'El Salvador',
    confirmTitle: 'Confirm plot',
    pick: 'Choose the point on the map.',
    mapLoading: 'Loading map…',
    keyboard: 'Use the arrow keys to pan the map and Enter to choose its center.',
    selected: 'Selected location',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    gps: 'Use my location',
    locating: 'Finding your location…',
    gpsError: 'We couldn’t find your location. You can choose a point on the map.',
    outside: 'Choose a point within El Salvador.',
    copy: 'Copy',
    copied: 'Coordinates copied.',
    copyError: 'We couldn’t copy the coordinates. Select them to copy them manually.',
    loading: 'Updating plot data…',
    loadError: 'We couldn’t update the plot data. Choose the point again to retry.',
    soilFallback: 'Soil data are missing at this point (which can happen in urban areas). We use a nearby rural point or the regional value.',
    confirm: 'Use this plot',
    method: 'Data and method',
  },
} satisfies Record<Lang, typeof es>

const buttonFocus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45664e]'

export const plotMapView = {
  zoom: 13,
  minZoom: 8,
  maxZoom: 18,
  scrollWheelZoom: true,
  tileUrl: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(process.env.NEXT_PUBLIC_CARTO_API_KEY ?? '')}`,
  attribution: '&copy; OpenStreetMap &copy; CARTO',
}

// Simplified Natural Earth 1:50m Admin 0 v5.1.2 country boundary (public domain).
const countryOutline: LatLngTuple[] = [
  [14.416, -89.363], [14.370, -89.121], [14.032, -88.708], [13.979, -88.513],
  [13.854, -88.483], [13.987, -88.151], [13.880, -87.991], [13.890, -87.802],
  [13.841, -87.731], [13.813, -87.715], [13.521, -87.782], [13.483, -87.732],
  [13.386, -87.838], [13.285, -87.821], [13.181, -87.931], [13.164, -88.181],
  [13.281, -88.592], [13.281, -88.686], [13.197, -88.484], [13.184, -88.512],
  [13.283, -88.867], [13.478, -89.278], [13.560, -89.804], [13.737, -90.095],
  [13.835, -90.105], [13.904, -90.048], [14.046, -89.873], [14.077, -89.749],
  [14.183, -89.671], [14.241, -89.547], [14.390, -89.574], [14.431, -89.419],
]

type PlotMapProps = {
  point: MapPoint
  copy: typeof es
  instructionsId: string
  onPick: (point: MapPoint) => void
  onReady: () => void
}

const PlotMap = dynamic<PlotMapProps>(async () => {
  const [{ control }, { MapContainer, CircleMarker, Polygon, TileLayer, useMapEvents }] = await Promise.all([
    import('leaflet'),
    import('react-leaflet'),
  ])

  function MapInteraction({ point, copy, instructionsId, onPick }: PlotMapProps) {
    const map = useMapEvents({
      click({ latlng }) {
        onPick({ lat: latlng.lat, lon: latlng.lng })
      },
    })

    useEffect(() => {
      const container = map.getContainer()
      container.setAttribute('role', 'region')
      container.setAttribute('aria-label', copy.title)
      container.setAttribute('aria-describedby', instructionsId)

      function pickCenter(event: KeyboardEvent) {
        if (event.key !== 'Enter' || event.target !== container) return
        const center = map.getCenter()
        onPick({ lat: center.lat, lon: center.lng })
      }

      container.addEventListener('keydown', pickCenter)
      return () => container.removeEventListener('keydown', pickCenter)
    }, [copy.title, instructionsId, map, onPick])

    useEffect(() => {
      const zoom = control.zoom({ zoomInTitle: copy.zoomIn, zoomOutTitle: copy.zoomOut }).addTo(map)
      const scale = control.scale({ position: 'bottomright', imperial: false }).addTo(map)
      return () => {
        zoom.remove()
        scale.remove()
      }
    }, [copy.zoomIn, copy.zoomOut, map])

    useEffect(() => {
      map.panInside([point.lat, point.lon], { padding: [20, 20], animate: false })
    }, [map, point.lat, point.lon])

    return null
  }

  return function LeafletPlotMap(props: PlotMapProps) {
    const center: LatLngTuple = [props.point.lat, props.point.lon]

    return (
      <MapContainer
        center={center}
        zoom={plotMapView.zoom}
        whenReady={props.onReady}
        minZoom={plotMapView.minZoom}
        maxZoom={plotMapView.maxZoom}
        zoomControl={false}
        doubleClickZoom={false}
        scrollWheelZoom={plotMapView.scrollWheelZoom}
        className="relative h-full"
        style={{ backgroundColor: '#d2e1da' }}
      >
        <TileLayer attribution={plotMapView.attribution} url={plotMapView.tileUrl} />
        <Polygon
          positions={countryOutline}
          pathOptions={{ color: '#45664e', weight: 2, fillColor: '#9ac5a2', fillOpacity: 0.12 }}
          interactive={false}
        />
        <CircleMarker
          center={center}
          radius={13}
          pathOptions={{ stroke: false, fillColor: '#94452c', fillOpacity: 0.25 }}
          interactive={false}
        />
        <CircleMarker
          center={center}
          radius={6}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#94452c', fillOpacity: 1 }}
          interactive={false}
        />
        <MapInteraction {...props} />
      </MapContainer>
    )
  }
}, { ssr: false })

type LocationState = 'idle' | 'locating' | 'gpsError' | 'outside'
type CopyState = 'idle' | 'copied' | 'copyError'

export function MapSheet({ field, lang, status = 'idle', onPointAttempt, onConfirm, methodHref }: MapSheetProps) {
  const copy = messages[lang]
  const headingId = useId()
  const instructionsId = useId()
  const [draft, setDraft] = useState<MapPoint | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const locationRequest = useRef(0)
  const copyRequest = useRef(0)
  const point = draft ?? field
  const hasCommitted = point.lat === field.lat && point.lon === field.lon
  const label = hasCommitted ? field.label : copy.selected
  const rawCoordinates = point.lat.toFixed(3) + ', ' + point.lon.toFixed(3)
  const west = lang === 'es' ? 'O' : 'W'
  const coordinates = point.lat.toFixed(3) + '° N, ' + Math.abs(point.lon).toFixed(3) + '° ' + west

  useEffect(() => () => {
    locationRequest.current += 1
    copyRequest.current += 1
  }, [])

  function pickPoint(next: MapPoint) {
    locationRequest.current += 1
    copyRequest.current += 1
    const { lat, lon } = next
    const isInBounds = isFieldPoint(next)
    setLocationState(isInBounds ? 'idle' : 'outside')
    setCopyState('idle')
    setDraft(isInBounds ? next : null)

    onPointAttempt({ kind: isInBounds ? 'valid' : 'invalid', point: next })
  }

  function locatePlot() {
    if (!navigator.geolocation) {
      setLocationState('gpsError')
      return
    }

    const request = ++locationRequest.current
    setLocationState('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request === locationRequest.current) {
          pickPoint({ lat: coords.latitude, lon: coords.longitude })
        }
      },
      () => {
        if (request === locationRequest.current) setLocationState('gpsError')
      },
      { timeout: 10_000 },
    )
  }

  async function copyCoordinates() {
    const request = ++copyRequest.current
    try {
      await navigator.clipboard.writeText(rawCoordinates)
      if (request === copyRequest.current) setCopyState('copied')
    } catch {
      if (request === copyRequest.current) setCopyState('copyError')
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      lang={lang}
      className="mx-auto w-full max-w-[40rem] rounded-[28px] bg-[#f1fcf4] p-3 text-[#141e19] sm:p-5"
    >
      <header className="mb-3 grid gap-2">
        <h2 id={headingId} className="text-2xl font-semibold leading-tight">{copy.title}</h2>
        <div className="min-h-11 rounded-full bg-white px-4 py-3 text-sm font-semibold shadow-sm">
          {copy.country}
        </div>
        <p id={instructionsId} className="px-1 text-sm leading-5 text-[#45664e]">
          {copy.pick} <span className="sr-only">{copy.keyboard}</span>
        </p>
      </header>

      <div className="relative isolate h-64 overflow-hidden rounded-2xl bg-[#d2e1da] shadow-sm sm:h-80 lg:h-[32rem]">
        {!mapReady && (
          <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-[#45664e]">
            {copy.mapLoading}
          </div>
        )}
        <PlotMap
          point={point}
          copy={copy}
          instructionsId={instructionsId}
          onPick={pickPoint}
          onReady={() => setMapReady(true)}
        />
        <button
          type="button"
          onClick={locatePlot}
          disabled={locationState === 'locating'}
          className={'absolute bottom-3 left-3 z-[1000] min-h-11 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#45664e] shadow-md disabled:opacity-75 ' + buttonFocus}
        >
          {copy.gps}
        </button>
      </div>

      <div className="relative mx-0 -mt-2 grid gap-3 rounded-[28px] bg-white p-4 shadow-[0_-8px_30px_rgba(20,30,25,0.08)] sm:p-5">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-[#dae5de]" />
        <div>
          <h3 className="text-xl font-semibold">{copy.confirmTitle}</h3>
          <p className="text-sm leading-6 text-[#55433e]">{label}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-1 rounded-xl bg-[#ebf6ef] px-3 py-1">
          <span className="text-sm font-semibold tabular-nums">{coordinates}</span>
          <button
            type="button"
            onClick={copyCoordinates}
            className={'min-h-11 rounded-lg px-2 text-sm font-semibold text-[#793019] ' + buttonFocus}
          >
            {copy.copy}
          </button>
        </div>

        <div role="status" className="grid gap-2 empty:hidden">
          {locationState !== 'idle' && <p className="text-sm leading-5 text-[#55433e]">{copy[locationState]}</p>}
          {copyState !== 'idle' && <p className="text-sm leading-5 text-[#55433e]">{copy[copyState]}</p>}
          {status === 'loading' && <p className="text-sm leading-5 text-[#55433e]">{copy.loading}</p>}
          {status === 'error' && <p className="text-sm leading-5 text-[#55433e]">{copy.loadError}</p>}
          {hasCommitted && field.soilFallback && (
            <p className="rounded-xl bg-[#c4e9cb]/40 p-3 text-sm leading-5 text-[#55433e]">{copy.soilFallback}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!hasCommitted || status === 'loading'}
          className={'min-h-[52px] rounded-full bg-[#94452c] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-4px_rgba(148,69,44,0.35)] enabled:hover:bg-[#793019] disabled:cursor-not-allowed disabled:opacity-50 ' + buttonFocus}
        >
          {copy.confirm}
        </button>
        {methodHref && (
          <a href={methodHref} className={'rounded-lg py-2 text-center text-sm font-semibold text-[#45664e] underline underline-offset-4 ' + buttonFocus}>
            {copy.method}
          </a>
        )}
      </div>
    </section>
  )
}
