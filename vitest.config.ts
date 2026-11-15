import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vitest/config"

const virtualCalendar = "\0flo-calendar"

function calendarResolver(): Plugin {
  return {
    name: "flo-calendar-resolver",
    resolveId(id) {
      const normalized = id.replaceAll("\\", "/")
      if (
        normalized === "@/domain/calendar" ||
        normalized.endsWith("/src/domain/calendar") ||
        normalized.endsWith("/src/domain/calendar.d.ts")
      ) {
        return virtualCalendar
      }
    },
    load(id) {
      if (id === virtualCalendar) {
        return "export const crops = {}\nexport function scoreMonth() { throw new Error(\"unmocked scoreMonth\") }\n"
      }
    },
  }
}

export default defineConfig({
  plugins: [calendarResolver()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
  },
})