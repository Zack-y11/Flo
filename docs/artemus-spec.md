# Flo for the Farm — Team Artemus build spec

NASA Space Apps 2026 · Field Shift: Adapting Farms with NASA Data  
https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/

**Product:** A calm, Flo-like season calendar for Salvadoran smallholders. Spanish UI first, English toggle (submission materials must be English).  
**Do not start new features after Sun Nov 15, 12:00 PM El Salvador time (UTC−6).**  
**Hard deadline:** click **Submit for Judging** before **Sun Nov 15, 11:59 PM El Salvador time**. Polish copy/demo after freeze; no new features.

This spec is implementation-ready. Do **not** add SMAP, ECOSTRESS, HLS, IMERG, or a paid forecast API in P0.

---

## 1. Stack and repo

- **App:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Map:** Leaflet + `react-leaflet` (click-to-set field; no Mapbox token).
- **Data:** Next.js Route Handlers on the server call NASA POWER and SoilGrids. Cache responses (in-memory or Cache-Control / unstable_cache). Never call those APIs from the browser (CORS + rate limits).
- **State:** Field location, language, what-if sliders, and crop logs in `localStorage` only (no auth, no DB).
- **Deploy:** Vercel, public GitHub repo. Production URL must open with no login (incognito test).
- **i18n:** All UI strings in a `es` / `en` dictionary. Default `es`. Persist language.

---

## 2. Verified APIs (use these exact shapes)

No API key for either service. Server-side only. If SoilGrids returns `mean: null` for every property, treat the point as urban/unmapped and fall back (see §6).

**NASA POWER daily** (live-tested 2026-11-14, API v2.10.3, ~0.5 s, no auth). Times are **LST**. Grid ~0.5°. Parameters and units: `T2M` (°C), `PRECTOTCORR` (mm/day), `ALLSKY_SFC_SW_DWN` (MJ/m²/day), `RH2M` (%), `GWETROOT` (0–1), `GWETTOP` (0–1).

```
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETROOT,GWETTOP&community=AG&longitude={lon}&latitude={lat}&start={YYYYMMDD}&end={YYYYMMDD}&format=JSON
```

P0 fetch window: last **24 months** through today (POWER daily usually lags a few days; if the tail is `-999` / fill value, trim to last valid date and show “datos hasta {date}”).

**NASA POWER climatology** (live-tested, API v2.10.1, 25-year monthly climatology Jan 2001–Dec 2025). Same parameters. Monthly `PRECTOTCORR` is **mm/day**; monthly total ≈ value × days-in-month.

```
https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETROOT,GWETTOP&community=AG&longitude={lon}&latitude={lat}&format=JSON
```

**SoilGrids REST v2.0** (live-tested; ~5–9 s). Divide raw `mean` by `d_factor` (`phh2o` ÷ 10 → pH; `clay`/`sand` ÷ 10 → %; `soc` ÷ 10 → g/kg; `nitrogen` ÷ 100 → g/kg).

```
https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=phh2o&property=soc&property=clay&property=sand&property=nitrogen&depth=0-5cm&depth=5-15cm&value=mean
```

**Default field (verified working SoilGrids):** rural La Libertad / Comasagua **13.640, −89.380**. Downtown San Salvador (13.6929, −89.1872) and a San Miguel city-area point returned HTTP 200 with all `mean: null` — never use an urban pixel without fallback.

**Route handlers to implement**

| Route | Upstream | Cache |
|---|---|---|
| `GET /api/power/daily?lat&lon&start&end` | POWER daily | 6 h |
| `GET /api/power/climatology?lat&lon` | POWER climatology | 7 d |
| `GET /api/soil?lat&lon` | SoilGrids; on all-null, retry fallback point and set `fallback: true` | 7 d |

Docs: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

---

## 3. Data model (TypeScript shapes)

```ts
type Lang = 'es' | 'en'
type CropId = 'maiz' | 'frijol' | 'sorgo' | 'cafe' | 'canavalia'
type SeasonId = 'primera' | 'postrera' | 'seca' // Primera May–Jul, Postrera Aug–Oct, Época seca Nov–Apr

type Field = { lat: number; lon: number; label: string; soilFallback?: boolean }
type CropLog = { id: string; cropId: CropId; plantedOn: string /* ISO date */; createdAt: string }
type WhatIf = { dT: 0 | 1 | 2; rainFactor: 1 | 0.9 | 0.8 } // +°C, −0/−10/−20% rain
type AppState = { field: Field; lang: Lang; logs: CropLog[]; whatIf: WhatIf }

type Suit = 'green' | 'yellow' | 'red'
```

Default `field`: `{ lat: 13.640, lon: -89.380, label: 'La Libertad (rural)' }`.  
Default `whatIf`: `{ dT: 0, rainFactor: 1 }`.

---

## 4. Crop-trait table

Use these **P0 defaults**. Ranges are typical of FAO ECOCROP / GAEZ-style cards and CENTA guidance for El Salvador staples. **Flag in the UI and in the project References:** official ECOCROP site was down (HTTP 500 on 2026-11-14); values are compiled defaults, not a live FAO pull. Prefer a teammate or agronomist pass before submission if time allows. Items marked **⚠** need verification first.

Rain is **mm per growing cycle** (for café, mm/year). Temp is monthly mean `T2M` comfort band. pH from SoilGrids 0–5 cm.

| Crop | id | Temp °C (min–opt–max) | Rain mm | pH | Drought | N-fix | Cycle d | Notes |
|---|---|---|---|---|---|---|---|---|
| Maíz | `maiz` | 12–24–32 ⚠ | 500–800 ⚠ | 5.5–7.5 | medium | no | 90–120 | Primera staple |
| Frijol (Phaseolus) | `frijol` | 15–24–28 ⚠ | 300–500 ⚠ | 6.0–7.5 | medium | **yes** | 70–90 | Often postrera |
| Maicillo / sorgo | `sorgo` | 18–28–35 ⚠ | 350–600 ⚠ | 5.5–8.0 | **high** | no | 90–120 | Dry-tolerant grain |
| Café (arábica) | `cafe` | 15–20–24 ⚠ | 1200–2000 / yr ⚠ | 5.0–6.5 | low–med | no | perennial | Highland; not a 3-month cycle |
| Canavalia / frijol abono | `canavalia` | 18–26–32 ⚠ | 400–800 ⚠ | 5.0–7.0 | high | **yes** | 90–150 ⚠ | Cover; soil card, not market crop |

**What-if:** score months with `T = T2M_clim + dT` and `rain = PRECTOTCORR_clim × rainFactor` (do not mutate raw API cache).

---

## 5. Scoring formulas (keep visible in a “Cómo se calcula” sheet)

All scores are 0–100 unless noted. Show the inputs, not a black box.

**A. Monthly calendar suitability** (per crop, per month) → green ≥ 70, yellow 40–69, red < 40.

1. `tempScore`: 100 if `T` in [opt−3, opt+3]; linear fall to 0 at min / max; 0 outside [min, max]. Café uses the tighter band.  
2. `rainScore`: For annual crops, monthly rain vs **cycle need × (days in month / cycle days)** — i.e., a monthly slice of cycle rainfall. For café, vs annual need / 12. 100 inside 80–120% of that target; linear to 0 at 40% or 200%.  
3. `pHScore`: 100 if soil pH in crop band; 60 if within 0.3; else 30. If soil missing, omit and note “sin dato de suelo”.  
4. `droughtAdj`: if crop drought = high and `rainScore` < 70, lift `rainScore` by +15 (cap 100).  
5. `suit = 0.45*tempScore + 0.40*rainScore + 0.15*pHScore` (renormalize weights if pH omitted).

**B. Season phase + “you are here”**  
Calendar year, not water year. Primera = May 1–Jul 31, Postrera = Aug 1–Oct 31, Época seca = Nov 1–Apr 30. Marker = today (or last POWER valid date).

**C. Daily status bubble**  
Pick the crop with the highest `suit` this month among annual crops (exclude café unless it is the only log). Copy pattern (es):  
`Día {n} de {fase}. {ventana}.`  
where `n` is 1-based day of the current phase, and `ventana` is e.g. `Buena ventana para frijol, cierra en {d} días` if `suit ≥ 70`, `Ventana regular para {crop}` if yellow, `Ahora no es ideal para {crop}` if red. `{d}` = days until phase end or until the next month that is not green, whichever is sooner.

**D. Rainy-season onset prediction** (climatology + daily history, with confidence).  
For each of the last 15 years in the daily series (or as many complete years as fetched), onset = first date in **Apr 1–Jun 30** when the 5-day rain sum ≥ **25 mm** and `GWETROOT` ≥ **0.5**. ⚠ 25 mm / 0.5 are tunable defaults.  
Report **median onset day-of-year**, the **25th–75th percentile window**, and confidence: **alta** if ≥ 10 years and IQR ≤ 21 days; **media** if ≥ 6 years or IQR ≤ 35; else **baja**. Headline (es): `La temporada lluviosa suele empezar entre {p25} y {p75} (confianza {nivel})`.

**E. Dry-spell risk, next 7–14 days (no forecast API).**  
Use last 21 valid daily `PRECTOTCORR` + month climatology. `dryDay` = rain < 1 mm. Let `run` = current trailing dry days, `week` = 7-day rain, `climWeek` = climatology daily rain for this month × 7.  
- **Alto** if `run ≥ 7` or `week ≤ 0.4 * climWeek`.  
- **Medio** if `run ≥ 4` or `week ≤ 0.7 * climWeek`.  
- Else **bajo**.  
Copy: `Riesgo de sequía corta {nivel} en los próximos 7–14 días, según la tendencia reciente de NASA POWER (no es un pronóstico).`

**F. Rotation suggestion + 3-season soil-health score**  
Next crop, in order: if last log is a non-fixer (maíz/sorgo/café), suggest `frijol` or `canavalia`; if last is a fixer, suggest `maiz` or `sorgo` depending on which has higher upcoming-month `suit`; never suggest the same species twice in a row if an alternative is yellow+.  
Soil score 0–100 over the last 3 logged seasons (pad with “vacío” if fewer):  
`soil = 0.40*fixPct + 0.40*socPts + 0.20*diversity`  
- `fixPct` = 100 × (seasons with N-fix crop / 3).  
- `socPts`: SoilGrids SOC 0–5 cm (g/kg): < 10 → 30, 10–20 → 60, 20–40 → 80, > 40 → 100. (Comasagua test point was ~48.6 g/kg → 100; volcanic soils can read high.)  
- `diversity` = 100 if ≥ 2 distinct crop ids in the 3 slots, else 50 if 1, else 0.  
Optional P1: if you already have elevation, a crude slope flag can shave up to 10 points for “high erosion risk”. **Skip if it is not already built by freeze.**  
Always show: “Esto apoya la decisión; no reemplaza el criterio de la persona agricultora ni de un técnico.”

---

## 6. Map and location fallback

- Default pin: 13.640, −89.380, label “La Libertad (rural)”.
- Click anywhere in El Salvador (~13.0–14.5 N, 87.7–90.2 W) to move the pin; clamp or warn if far outside the country.
- On SoilGrids all-null: (1) retry a small ring of offsets (~3–5 km) until a non-null point; (2) if still null, use the La Libertad default and set `soilFallback: true` with copy: `No hay dato de suelo en este punto (pasa en zonas urbanas). Usamos un punto rural cercano / el valor regional.`
- Re-fetch POWER + soil when the pin moves (debounce 400 ms). Recompute all scores.

---

## 7. Screens and Flo-like design

One scrolling home, not a dense dashboard. Soft cream/sand background, warm sage greens, clay accents, large rounded cards, one primary action per card, generous type, no stock “AI farm” imagery, no NASA logo marks in generated art.

1. **Header:** wordmark “Flo para la finca” / “Flo for the farm”; language toggle `ES | EN`; tiny field label that opens the map sheet.
2. **Season ring:** circular year, three colored arcs (Primera, Postrera, Época seca), month ticks, a “estás aquí” dot. Center: phase name + day n.
3. **Status bubble:** one sentence from §5C. Feels like a Flo daily insight, not a chart caption.
4. **Siembra ahora:** today card. Crop name, suit color, one reason (“lluvia de la climatología + humedad de raíz POWER”), and a **Registré siembra** CTA.
5. **Onset + dry-spell:** two compact prediction chips with confidence / risk level.
6. **12-month heatmap:** rows = 5 crops, columns = Ene–Dic, green/yellow/red cells. What-if sliders (`+1/+2 °C`, `−10/−20% lluvia`) sit above and redraw immediately from cached climatology (no new network call).
7. **Mi siembra:** list of logs (crop + date). Empty state: “Toca un cultivo para anotar lo que sembraste.” After a log, show **próxima rotación** + **salud del suelo (3 temporadas)** bar and one sentence why.
8. **Mapa (sheet or /mapa):** Leaflet, ES outline context, click to set, confirm. Footer link “Datos y método” (POWER, SoilGrids, GAEZ/ECOCROP disclaimer, formulas in one screen).
9. **English mode:** every string translated; crop names may stay as maíz / frijol / maicillo / café / canavalia with English in parentheses.

Mobile-first (360 px). Desktop is a centered column ~480–640 px, not a wide admin grid.

---

## 8. Build order

**P0 — must be demoable by Sun Nov 15, 12:00 PM El Salvador time**

1. Scaffold, Tailwind theme, i18n shell, `localStorage` state.
2. `/api/power/*` + `/api/soil` with cache + null fallback.
3. Season ring + daily bubble + Siembra ahora (climatology + last 60 daily days is enough to start).
4. Heatmap + what-if sliders (climatology only).
5. Crop log + rotation suggestion + soil score (SoilGrids).
6. Click map + default pin + urban fallback.
7. Onset window + dry-spell chip (needs the 24-month daily pull).
8. Datos y método page. Deploy to Vercel. Incognito check.

**P1 — only if P0 is on Vercel before freeze**

- Smoother ring animation; English copy pass; log edit/delete; show POWER “datos hasta”; very light 7-day sparkline under the bubble.

**Cut (do not build)**

- Auth, accounts, forecasts (Open-Meteo etc. unless already free *and* leftover time — not required), SMAP/ECOSTRESS/HLS/IMERG, ML models, push notifications, SMS, multi-field farms, slope/erosion unless free leftover, Spanish-only video without subtitles.

---

## 9. Acceptance criteria

| Feature | Passes when |
|---|---|
| Season ring | Three named phases, correct date ranges, today marker in the right arc, ES + EN labels. |
| Status bubble | One sentence; updates with location and phase; uses POWER rain + `GWETROOT` (mentioned in method, not necessarily in the sentence). |
| Onset | Median + p25–p75 window + confidence; copy does not claim a guaranteed date. |
| Heatmap | 5 crops × 12 months, three colors, values move when what-if sliders change, no extra API call. |
| Siembra ahora | Shows a crop for today + reason + log CTA. |
| Logging | Tap crop + date persists after refresh; rotation line appears; soil score 0–100 with the three terms explained. |
| Dry-spell | Bajo/medio/alto from recent POWER trend; disclaimer “no es un pronóstico”. |
| What-if | +1/+2 °C and −10/−20% rain redraw the heatmap in-place. |
| Map | Default 13.640, −89.380; click updates data; urban/null soil shows fallback message, never a blank soil score crash. |
| i18n | Full UI in ES and EN; no mixed leftover keys on P0 screens. |
| Deploy | Public HTTPS URL and public GitHub; incognito, no login; `/datos` cites POWER + SoilGrids + trait sources. |

---

## 10. 30-second demo script

Film the **Spanish** UI; add **English subtitles**. Keep ≤ 30 s or the project is ineligible for Global Judging.

| t | Spoken (ES) / subtitle (EN) | Picture |
|---|---|---|
| 0:00–0:02 | “Somos Artemus. Esto es Flo para la finca.” / *We’re Artemus. This is Flo for the farm.* | Wordmark + season ring |
| 0:02–0:05 | “Field Shift: un calendario de temporada para personas agricultoras en El Salvador.” / *Field Shift: a season calendar for Salvadoran smallholders.* | Ring with “estás aquí” in postrera (or current phase) |
| 0:05–0:10 | “Flo combina NASA POWER — lluvia, temperatura y humedad del suelo — con suelo local y lo que a la familia le importa.” / *Flo combines NASA POWER — rain, temperature, and soil moisture — with local soil and farmer priorities.* | Bubble + map pin on La Libertad |
| 0:10–0:20 | “Hoy: buena ventana para frijol. El calendario muestra maíz, frijol, maicillo, café y un abono verde. Si llueve menos o hace más calor, los colores cambian.” / *Today: a good window for beans. The calendar covers maize, beans, sorghum, coffee, and a cover crop. If rain drops or heat rises, the colors change.* | Siembra ahora → heatmap → slider to −20% rain |
| 0:20–0:30 | “Anota lo que sembraste; Flo sugiere la rotación siguiente y una nota de salud del suelo. Es una guía, no un reemplazo del saber local.” / *Log what you planted; Flo suggests the next rotation and a soil-health note. A guide, not a replacement for local knowledge.* | Log + soil score + end card: Flo para la finca · NASA POWER |

---

## 11. Submission checklist (fill on spaceappschallenge.org, in English)

Submit via the team Project tab; resubmit until 11:59 PM. Host demo and repo with “anyone with the link”. Incognito-test every URL. English on the page, slides, and linked writeup. Video may stay in Spanish **with English subtitles**. Demo: ≤ 30 s **or** ≤ 7 slides including title. Team size 1–6, all on San Salvador.

**Project Name:** Flo for the Farm (Flo para la finca)  
**High-Level Summary (draft):** Flo for the Farm is a calm season-calendar tool for Salvadoran smallholders. It combines NASA POWER rainfall, temperature, and soil wetness with SoilGrids local soil and crop traits so families can see where they are in primera, postrera, or the dry season, compare planting windows for maize, beans, sorghum, coffee, and a cover crop, log what they planted, and explore a simple next rotation and climate “what if.” It is a decision-support guide, not a replacement for farmer or technician judgment.  
**Link to Project Demo:** unlisted YouTube (or Drive) of the 30 s video **or** a 7-slide English deck.  
**Link to Final Project:** public GitHub + live Vercel URL.  
**NASA Data field (use this):** NASA POWER agroclimatology — daily and 25-year monthly climatology via the open point API (no key). Parameters: T2M, PRECTOTCORR, ALLSKY_SFC_SW_DWN, RH2M, GWETROOT, GWETTOP. Community AG. Used for the season status bubble, rainy-season onset window, dry-spell trend, 12-month planting calendar, and climate what-if. Docs: https://power.larc.nasa.gov/docs/services/api/temporal/daily/  
**References:** ISRIC SoilGrids v2.0 REST (soil pH, SOC, texture at the field point; https://rest.isric.org/soilgrids/v2.0/docs); FAO GAEZ / ECOCROP-style crop requirements (compiled table; ECOCROP portal was unavailable on 2026-11-14 — verify before citing as a live source); NASA Space Apps Field Shift challenge statement; optional CENTA crop guidance if a teammate confirms numbers. List libraries (Next.js, Leaflet, Tailwind) and any SI tools.  
**Use of Super Intelligence (SI):** disclose every SI tool and what it was used for (code, copy, image). Do not use SI to invent the core idea. Watermark SI images/video; note SI in code/copy metadata. If none: “No SI used.”  
**Also:** original-work checkbox; no photos of anyone under 18; no NASA logo in SI art.

Judges score Impact, Creativity, Validity, Relevance (NASA data must be core), and Presentation (1–5). A clear 30 s story matters as much as the heatmap.
