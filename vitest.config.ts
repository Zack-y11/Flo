import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const calendarDouble = fileURLToPath(new URL('./src/ui/calendar.double.ts', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@/domain/calendar': calendarDouble,
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
