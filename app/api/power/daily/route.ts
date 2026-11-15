import { loadDaily } from '../../../../src/server/power'

const POWER_DAILY = 'https://power.larc.nasa.gov/api/temporal/daily/point'
const PARAMETERS = 'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETROOT,GWETTOP'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const point = readPoint(url)
  if ('error' in point) return Response.json({ error: point.error }, { status: 400 })
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  if (start == null || end == null || !/^\d{8}$/.test(start) || !/^\d{8}$/.test(end)) {
    return Response.json({ error: 'missing start or end' }, { status: 400 })
  }
  const result = await loadDaily(
    { lat: point.lat, lon: point.lon, start, end },
    () => fetchDaily(point.lat, point.lon, start, end),
  )
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  return Response.json(result.body)
}

function readPoint(url: URL): { lat: number; lon: number } | { error: string } {
  const latText = url.searchParams.get('lat')
  const lonText = url.searchParams.get('lon')
  if (latText == null || lonText == null || latText.trim() === '' || lonText.trim() === '') {
    return { error: 'missing lat or lon' }
  }
  const lat = Number(latText)
  const lon = Number(lonText)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: 'missing lat or lon' }
  return { lat, lon }
}

async function fetchDaily(lat: number, lon: number, start: string, end: string): Promise<unknown> {
  const upstream = new URL(POWER_DAILY)
  upstream.searchParams.set('parameters', PARAMETERS)
  upstream.searchParams.set('community', 'AG')
  upstream.searchParams.set('longitude', String(lon))
  upstream.searchParams.set('latitude', String(lat))
  upstream.searchParams.set('start', start)
  upstream.searchParams.set('end', end)
  upstream.searchParams.set('format', 'JSON')
  const response = await fetch(upstream, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}
