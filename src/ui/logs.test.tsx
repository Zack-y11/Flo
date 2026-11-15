import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { CropId, CropLog, Rotation, SoilHealth } from '@/domain/calendar'
import type { Lang } from '@/state/store'
import { Logs } from './logs'

afterEach(cleanup)

const cropLabels: Record<CropId, string> = {
  maiz: 'Maíz',
  frijol: 'Frijol',
  sorgo: 'Maicillo',
  canavalia: 'Canavalia',
  cafe: 'Café',
}

const healthySoil: SoilHealth = {
  score: 74,
  fixPct: 33,
  socPts: 80,
  diversity: 100,
  slots: ['vacio', 'maiz', 'frijol'],
}

const maizeLog: CropLog = {
  id: 'maize-1',
  cropId: 'maiz',
  plantedOn: '2026-05-01',
  createdAt: '2026-05-01T12:00:00Z',
}

function renderLogs({
  lang = 'es',
  logs = [],
  rotation = null,
  health = healthySoil,
  onSave = vi.fn((): 'saved' | 'invalid-date' | 'duplicate' => 'saved'),
}: {
  lang?: Lang
  logs?: CropLog[]
  rotation?: Rotation | null
  health?: SoilHealth
  onSave?: (planting: { cropId: CropId; plantedOn: string }) => 'saved' | 'invalid-date' | 'duplicate'
} = {}) {
  return render(
    <Logs cropLabels={cropLabels} logs={logs} rotation={rotation} health={health} today="2026-11-15" lang={lang} onSave={onSave} />,
  )
}

test('saves a planting through the callback and renders the committed history', () => {
  const onSave = vi.fn((): 'saved' | 'invalid-date' | 'duplicate' => 'saved')
  const view = renderLogs({ onSave })

  expect(screen.getByText('Toca un cultivo para anotar lo que sembraste.')).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Próxima rotación' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Cultivo'), { target: { value: 'frijol' } })
  fireEvent.change(screen.getByLabelText('Fecha de siembra'), { target: { value: '2026-11-14' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }))

  expect(onSave).toHaveBeenCalledWith({ cropId: 'frijol', plantedOn: '2026-11-14' })
  expect(screen.getByRole('status').textContent).toBe('¡Siembra registrada!')

  const savedLog: CropLog = {
    id: 'frijol-1',
    cropId: 'frijol',
    plantedOn: '2026-11-14',
    createdAt: '2026-11-14T12:00:00Z',
  }
  view.rerender(
    <Logs
      cropLabels={cropLabels}
      logs={[savedLog]}
      rotation={null}
      health={healthySoil}
      today="2026-11-15"
      lang="es"
      onSave={onSave}
    />,
  )
  const history = screen.getByRole('region', { name: 'Mi siembra' })
  const item = within(history).getByRole('listitem')
  expect(within(item).getByText('Frijol')).toBeTruthy()
  expect(item.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-14')
})

test('shows duplicate and invalid-date callback feedback', () => {
  const onSave = vi.fn((): 'saved' | 'invalid-date' | 'duplicate' => 'duplicate')
  renderLogs({ onSave })
  fireEvent.change(screen.getByLabelText('Cultivo'), { target: { value: 'maiz' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }))
  expect(screen.getByRole('status').textContent).toBe('Esa siembra ya está registrada.')

  onSave.mockReturnValue('invalid-date')
  fireEvent.change(screen.getByLabelText('Fecha de siembra'), { target: { value: '2099-01-01' } })
  expect(screen.getByRole('status').textContent).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }))
  expect(screen.getByRole('status').textContent).toBe('Revisá la fecha de siembra.')
})

test('explains the next crop rotation and shows the derived soil terms', () => {
  const rotation: Rotation = { cropId: 'frijol', previousCropId: 'maiz', suit: 72, band: 'green' }
  renderLogs({ logs: [maizeLog], rotation })

  const section = screen.getByRole('region', { name: 'Próxima rotación' })
  expect(within(section).getByText('Frijol')).toBeTruthy()
  expect(within(section).getByText('Buena aptitud para la siembra el próximo mes (72 / 100). Rotamos después de Maíz para evitar repetir el mismo cultivo.')).toBeTruthy()
  expect(screen.getByRole('meter', { name: 'Salud del suelo (3 temporadas)' })).toBeTruthy()
  expect(screen.getByText('Fijación de nitrógeno')).toBeTruthy()
  expect(screen.getByText('Carbono orgánico del suelo')).toBeTruthy()
  expect(screen.getByText('Diversidad de cultivos')).toBeTruthy()
})

test('renders English empty copy and makes missing soil score explicit after a planting', () => {
  const missingSoil: SoilHealth = { score: null, fixPct: 0, socPts: null, diversity: 0, slots: ['vacio', 'vacio', 'vacio'] }
  renderLogs({ lang: 'en', logs: [maizeLog], health: missingSoil })

  expect(screen.getByRole('heading', { name: 'Planting and seasons' })).toBeTruthy()
  expect(screen.getByText('There are no soil data for this plot, so a score is unavailable.')).toBeTruthy()
  expect(screen.queryByRole('meter')).toBeNull()
})
