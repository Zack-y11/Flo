import { loadSoil } from '../../../src/server/soil'

const SOILGRIDS = 'https://rest.isric.org/soilgrids/v2.0/properties/query'
const PROPERTIES = ['phh2o', 'soc', 'clay', 'sand', 'nitrogen'] as const

export async function GET(request: Request): Promise<Response> {
  const point = readPoint(new URL(request.url))
  if ('error' in point) return Response.json({ error: point.error }, { status: 400 })
  const result = await loadSoil(point.lat, point.lon, fetchSoil)
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

async function fetchSoil(lat: number, lon: number): Promise<unknown> {
  const upstream = new URL(SOILGRIDS)
  upstream.searchParams.set('lon', String(lon))
  upstream.searchParams.set('lat', String(lat))
  for (const property of PROPERTIES) upstream.searchParams.append('property', property)
  upstream.searchParams.append('depth', '0-5cm')
  upstream.searchParams.append('depth', '5-15cm')
  upstream.searchParams.set('value', 'mean')
  const response = await fetch(upstream, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}
