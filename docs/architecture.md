# Architecture for Flo para la finca

Salvadoran smallholders get the Stitch screens. The next engineer gets one domain module, one store, and three NASA parsers. Scores are derived on each paint. This pass does not add the application.

## Problem

The spec already fixes the NASA sources, the three season ranges, the five crops, and the score formulas. The farmer-facing layout is already the Stitch export. The phone shell has three tabs, Hoy, Este año, and Mi parcela. Calendario agrícola, Inicio ciclo, Siembra y fases, and Mapa de parcela open from that shell. The repo has no application code. The open choice was whether a slider tick rescores cached climatology in the browser, or only picks one of nine calendars scored on the server.

## Usage (caller's view)

Screens import `@/domain/calendar` and `@/state/appState`. The tab shell holds a `FieldSession` in memory. That session is the parsed climatology, the parsed daily series, and the parsed soil. It is not `AppState`. A slider dispatch does not fetch.

Hoy asks for one card and speaks that card's sentence.

```tsx
import { todayCard } from '@/domain/calendar'

const card = todayCard(input)
speak(card.sentence)
```

`card.kind` is `plant` or `wait`. Green is plant. Yellow and red share the wait card, because those are the two drawings. `irrigation` is true only for a plant card whose crop is frijol in November or December. That reading's Spanish sentence is `Hoy: sembrá frijol. Si tenés riego. La tierra todavía tiene humedad.` A dry-season wait sentence is `Esperá unos días. Ahora es época seca. La próxima siembra es la Primera, en mayo.`

Este año asks for rows. The four-row drawing labels November and December as apante only when that irrigation reading is active. Otherwise that row is labeled seca. January through April is labeled verano. Both labels keep `seasonId` `seca`. The three-row drawing returns one seca row for November through April. Escuchar joins the captions on screen.

Calendario agrícola maps `crops` through `scoreMonth` and dispatches `setWhatIf`. The handler does not fetch, and it does not write back onto the cached month.

```tsx
import { crops, scoreMonth } from '@/domain/calendar'
import { dispatch } from '@/state/appState'

const cell = scoreMonth(cropId, month, soil, whatIf)
dispatch({ type: 'setWhatIf', whatIf: { dT, rainFactor: whatIf.rainFactor } })
```

Datos y método calls that same `scoreMonth` for the maize oracle and prints `crops` and `SCORE_RULES`. It does not retype either one. January is the 31-day month. Daily rain is `100 / 31`, so the month total inside `scoreMonth` is 100 mm. Temperature is 24. pH is 6.5. `dT` is 0 and `rainFactor` is 1. The suit is about 72.13 and the band is green.

Inicio ciclo calls `cycleStatus` once and reads the phase marker, the onset report, and the dry-spell level. For 15 Nov 2026 the phase is `seca` and the day index is 15. Language chips are `es` and `en`.

Siembra dispatches `saveLog`, then calls `nextRotation` and `soilHealth`. The disclaimer is always shown.

Mapa and Mi parcela hand a point to the shell. They do not dispatch `setField` themselves. The shell debounces 400 ms, fetches the three routes, parses soil, then dispatches the only `setField`. Escuchar on Mi parcela speaks `fieldSentence`, which names the label and has no altitude.

## Shape

`domain/calendar.ts` owns the registry, `SCORE_RULES`, `TRAIT_SOURCE`, and the pure functions. `state/appState.ts` is the only writer of `AppState`. The three route files are the only files that see NASA and SoilGrids wire names. There is no `domain/index.ts` and no score hook.

The core records are `CropTrait`, `MonthClimate`, `Climatology`, `DailySeries`, `Soil`, `WhatIf`, and `AppState`. `Climatology.months` is a twelve-row tuple. `scoreMonth` copies one row, adds `dT`, and multiplies daily rain by the private month length and `rainFactor`. It does not mutate the row. That is the slider path, per the laziness protocol.

`SeasonId` is `primera`, `postrera`, or `seca`. A seca row may be labeled `apante`, `verano`, or `seca`. Apante and verano are captions, per model the domain. Café is the perennial arm of `CropTrait`, so a yearly rain field cannot appear on maize. `CropId` is `keyof typeof crops`. The registry is a record keyed by that id, so dropping a crop fails the build. `TRAIT_SOURCE` sits next to it and records that the table is compiled, that ECOCROP returned HTTP 500, and that the check date was 2026-11-14. Grid row order is the key order of `crops`.

`SCORE_RULES` is the only threshold table, and it is `as const`. It replaces separate weight and band exports. It holds the suit weights 0.45, 0.40, and 0.15, the temperature comfort delta of 3, the rain band edges 0.8, 1.2, 0.4, and 2, the pH near band of 0.3 with scores 60 and 30, the drought lift of 15 below a rain score of 70, the cutoffs 70 and 40, the onset thresholds, the dry-spell thresholds, and the soil-health weights 0.40, 0.40, and 0.20. `scoreMonth`, `cycleStatus`, and `soilHealth` read it. `scoreMonth` takes no weight argument. Datos y método prints the object. That is one list, per encode lessons in structure.

Validation sits in the route parsers, in `calendarDay`, and in `fieldFromPoint`. Score functions trust `MonthClimate`, `Soil`, and `WhatIf`. Wire names never leave the route file, per boundary discipline. SoilGrids means are divided there. POWER fill values of -999 are dropped there. `validThrough` is the last kept daily date.

`dispatch` is the only `localStorage` write. The key is `flo.appState`. `saveLog` upserts on `cropId` plus `plantedOn` and keeps the first id. A repeated tap or a crash reloads one document. Two tabs meet on that key. A storage event replaces the whole document. The server cache stores NASA responses and does not store logs or slider positions, per separate before serializing shared state.

`onPinSettled` is the only path that dispatches `setField`. `setParcela` only hands the point to the shell. `soilFallback` is therefore computed from the soil just fetched, not from a stale profile. That repair is part of the base. It is not a graft from the other sketch.

The public functions are the screen jobs. `todayCard` hides the crop pick. `yearRows` hides which seca label is legal. `cycleStatus` hides onset and dry-spell thresholds. `scoreMonth` hides the slice, the drought lift, and the renormalized weights. Callers do not pass those thresholds. The trace from pin to pixel is the route parser, the domain function, and the screen, per minimize reader load.

Missing soil omits pH inside `scoreMonth` and renormalizes 0.45 and 0.40 over 0.85. `soilHealth` returns a null score and null `socPts` when soil is missing. The screen shows the fallback sentence. It does not invent a soil-health number.

The design leaves elevation off every type. It leaves SV and US off `Lang`. It leaves the person glyph without a user record. It does not precompute slider corners. February in the private month-length table is 28. The upcoming month for rotation is the next calendar month. A year that never meets the onset test is left out of the percentile sample. The last three logs, oldest first, are the three soil-health slots, padded with `vacio`.

## Synthesis decision

The base is live recompute. The cross-judge scored it 21 and the nine-corner lattice 13, on Stitch callers 5 to 3, on the registry and the oracle 4 to 4, on interface depth 4 to 2, on the weighted red flags 3 to 2, and on spec fit 5 to 2. The parent agreed before that verdict. The agreement is on the base. The lattice redraws from cached scores. The spec says the slider redraws from cached climatology, and the same `scoreMonth` paints the grid and the maize oracle.

Two grafts come from the lattice.

The first graft is `SCORE_RULES`. Live had exported only the suit weights and the band cutoffs. The other formula constants were private literals, so the method page would have retyped them. One frozen object replaces `suitWeights` and `suitBands`. The export count does not grow.

The second graft is the keyed registry. Live named the five crops in `CropId`, in the `id` arms, and again in an array, and a missing row still compiled. `CropId = keyof typeof crops` plus `TRAIT_SOURCE` removes that hand-synced list and gives the UI one ECOCROP flag.

Rejected from the lattice, and not grafted. The nine stored corners, `calendarAt`, and `buildLattice`. The single `GET /api/field` route. The brand constructors. A separate copy module that makes Hoy chain `hoySentence` and `spoken`. A `scoreMonth` that accepts a caller-supplied crop object or a caller-supplied day count. A four-row year that always shows apante. Irrigation for any crop in November or December. An invented `socPts` value for missing soil.

## Tradeoffs accepted

- The grid calls `scoreMonth` sixty times on a slider tick. In exchange, the method page and the cells share one function, and the cached climatology is what gets reread.
- Yellow and red share the wait card. In exchange, Hoy matches the two drawings and Escuchar has one sentence.
- A seca day count can sit on a row labeled verano or apante. In exchange, `SeasonId` stays the spec's three ids.
- `SCORE_RULES` is exported. In exchange, the method page cannot drift from the function. There is no setter, and `scoreMonth` still takes no weights.
- The visible month spans on Este año follow the spec ranges, May through July, August through October, and November through April. In exchange, the word AHORA cannot disagree with the caption. The shorter spans drawn on the four-row Stitch screen are not what the app prints.
- Last document wins between two tabs. In exchange, there is one `AppState` key.

## Alternatives considered

The nine-corner lattice hides the arithmetic from the slider by returning nine finished calendars. The slider's public surface is a lookup. The cost is a second way to reach a score, a wire format for finished cells, and a route shape the spec does not list. Live's unexported steps already stop a screen from passing its own weights. The lattice's extra surface does not buy a guarantee Live lacks.

A fourth `SeasonId` for apante would store the Stitch caption in the score type and split the spec phase function. The label union keeps the caption on the row.

Brand constructors for Celsius and millimetres would make a unit mix a type error. They would also wrap the oracle and every screen call. The month fields `t2mC` and `prectotcorrMmDay` already refuse a silent swap. The constructors stay out.

## Open questions and risks

The four-row Stitch drawing says Primera is May through June, and one July card says verano. This architecture prints the spec spans instead. If the operator wants the pixels kept, the captions change and `seasonOn` does not.

`saveLog` collapses two logs that share a crop and a planted day. The spec's log id can still distinguish them. The collapse is the base behavior. A later change can keep both ids if a farmer logs the same crop twice on one day.

Live's oracle call pads unused `MonthClimate` and `Soil` fields with zeros. A later `scoreMonth` must ignore `solarMj`, `rhPct`, `gwetroot`, and `gwettop` for the suit, and must read pH only from soil.

## Next implementation step

Implement `scoreMonth` in `src/domain/calendar.ts` until the January maize call returns a suit of about 72.13 and a green band, with `SCORE_RULES` and the keyed `crops` registry as the only tables it reads.
