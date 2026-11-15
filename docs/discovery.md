# Discovery for Flo para la finca

This note is the grounding for the architecture sketches. It does not add product scope. The source of truth for behavior remains [artemus-spec.md](artemus-spec.md). Where this note picks a number the spec left open, it labels that pick as a choice.

## Who it is for

A Salvadoran smallholder should open one calm column, in Spanish, and see where today sits in primera, postrera, or the dry season. The same person can move a pin, log a planting, and move two climate sliders without a new account. An English reader of the Space Apps submission must be able to switch the whole interface to English.

The next engineer inherits an empty tree. [README.md](../README.md) is a title. This file and the spec are the only product documents. There is no git history, no `package.json`, and no `src` directory. This pass keeps it that way.

## The clock

The spec says not to start new features after Sun Nov 15, 2026, 12:00 PM El Salvador time, and to submit for judging before 11:59 PM the same night. Planning began at 12:12 PM. The freeze sentence assumes a finished P0 that only needs polish. The tree has no application, so that assumption is false. This pass writes design documents only. It does not build the calendar, call NASA, or submit the form. Any later build is already past noon. The build checklist records that fact and does not pretend the freeze produced an app.

## What the spec already fixed

The app is Next.js App Router, TypeScript, and Tailwind. The map is Leaflet through `react-leaflet`, with no Mapbox token. The browser never calls NASA POWER or SoilGrids. Route handlers do, and they cache. Field, language, what-if sliders, and crop logs live in `localStorage` only. There is no auth and no database. Deploy, when a later pass is allowed to deploy, is a public Vercel URL that opens in an incognito window.

P0 uses only the POWER daily point API, the POWER monthly climatology point API, and SoilGrids REST v2.0, with the parameter lists and URLs in the spec. SMAP, ECOSTRESS, HLS, IMERG, a forecast API, accounts, SMS, push, multi-field farms, and slope or erosion are cuts. P1 polish waits until P0 is on Vercel, and this pass does not schedule it.

The default field is latitude 13.640, longitude -89.380, label `La Libertad (rural)`. A downtown San Salvador point and a San Miguel city-area point returned SoilGrids means that were all null. Those urban pixels are fallback cases, not default pins.

Crop ids are `maiz`, `frijol`, `sorgo`, `cafe`, and `canavalia`. Season ids are `primera` (May 1 through Jul 31), `postrera` (Aug 1 through Oct 31), and `seca` (Nov 1 through Apr 30). The calendar year is the year on the wall, not a water year. What-if is `dT` of 0, 1, or 2 and `rainFactor` of 1, 0.9, or 0.8. The default what-if is no change.

Screens are one scrolling home, a map sheet, and a method page. Mobile width is 360 px. The desktop column is about 480 to 640 px wide. Copy for the bubble, the onset headline, the dry-spell line, the soil disclaimer, and the 30 second demo is in the spec. Trait numbers are compiled defaults. The UI and the references must say that the ECOCROP site returned HTTP 500 on 2026-11-14. Rows marked there as needing verification stay marked. This pass does not invent replacement agronomy.

## The data the design has to encode

Persisted client state is the spec's `AppState` and nothing else. Scores are not saved. Bands are not saved. Onset, dry-spell risk, the rotation suggestion, and the soil-health score are derived when the column renders.

One crop-trait registry is the only copy of the spec's trait table. Score functions read that registry. A second table in a component, a comment, or a method-page string is a bug.

NASA JSON stops at the route handler. After the parse, the rest of the app sees domain units. Temperature is degrees Celsius. Rain is millimetres. Root-zone wetness is the POWER fraction from 0 to 1. Soil pH is the SoilGrids mean divided by 10. Clay and sand percents are the means divided by 10. Soil organic carbon is grams per kilogram after dividing by 10. Nitrogen is grams per kilogram after dividing by 100. A POWER fill value of -999 is removed before a score function runs. The parsed climate bundle carries `validThrough`, the last date that survived that trim, so a later "datos hasta" line does not need a new shape. This pass does not render that line. It is P1.

Soil is either a measured profile or missing. A measured profile records whether the point came from the pin, a nearby offset, or the regional fallback. Missing soil omits the pH term. It does not crash, and it does not pretend the pH is neutral.

The client store is the only writer of `AppState`. Server caches hold NASA responses. They do not hold logs or slider positions. Slider math copies climatology inside the pure function. The cached bundle stays as the server sent it.

Elevation and slope are absent on purpose. The spec says to skip them unless they are already built by freeze. They are not built.

## Formula choices

These choices close holes the spec left open. They are not new field data.

Temperature score is 100 when `T` is inside `[opt - 3, opt + 3]`, falls in a straight line to 0 at `min` and at `max`, and is 0 outside `[min, max]`. Café uses that same function. "Tighter band" means the café row, 15 to 20 to 24, not a second plus-or-minus constant.

For an annual crop, the cycle rain target is the midpoint of the table's millimetre range, and the cycle length is the midpoint of the day range. Maize is 650 mm and 105 days. The monthly slice for a month with `D` days is `650 * D / 105`. Café does not use cycle days. Its target for each month is the midpoint of 1200 to 2000 mm, divided by 12, which is `1600 / 12` mm.

Climatology `PRECTOTCORR` is millimetres per day. The month total used in the score is that value times `D`. The score compares millimetres in the month with the monthly slice. It does not compare millimetres per day with millimetres per cycle. The rain score is 100 when the month total is inside 80 to 120 percent of the slice, and it falls in a straight line to 0 at 40 percent and at 200 percent.

pH score is 100 inside the crop band, 60 when the value is outside the band by at most 0.3, and 30 otherwise. If soil is missing, the suitability weight is `(0.45 * tempScore + 0.40 * rainScore) / 0.85`. If soil is present, suitability is `0.45 * tempScore + 0.40 * rainScore + 0.15 * pHScore`.

Drought lift runs before that weighted sum. It applies only when the crop's drought class is high and `rainScore` is under 70. It adds 15 and caps the rain score at 100. Maize is medium, so maize never receives the lift. Sorghum and canavalia are high, so they can.

Green is 70 or above. Yellow is 40 through 69. Red is below 40.

A worked maize month, so a later probe has an oracle. `D` is 31. The slice is `650 * 31 / 105`, which is `4030/21` mm, about 191.90 mm. The 80 percent edge is `3224/21` mm, about 153.52 mm. The 40 percent edge is `1612/21` mm, about 76.76 mm. A month total of 100 mm sits between the 40 percent edge and the 80 percent edge, so

`rainScore = 100 * (100 - 1612/21) / (3224/21 - 1612/21) = 100 * (489/21) / (1612/21) = 48900/1612`,

about 30.33. With `T` at the maize optimum of 24, `tempScore` is 100. With pH 6.5, inside 5.5 to 7.5, `pHScore` is 100. Maize gets no drought lift. Suitability is `0.45 * 100 + 0.40 * (48900/1612) + 0.15 * 100`, about 72.13, which is green.

The same maize month at `T` of 18 is below the comfort floor of 21 and above the minimum of 12, so `tempScore` is `100 * (18 - 12) / (21 - 12)`, about 66.67. Outside 12 to 32 the temperature score is 0. At 12 and at 32 it is 0. At 30 it is `100 * (32 - 30) / (32 - 27)`, which is 40.

Season phase for 15 Nov 2026 is `seca`. The day index is the number of calendar days since the phase start, plus one. Nov 1 is day 1, so Nov 15 is day 15. Days until the phase ends is the number of calendar days from today to the end date, not counting today. From 15 Nov 2026 to 30 Apr 2027 that count is 166. The bubble's `{d}` is the smaller of that count and the days until the next month that is not green for the chosen crop. The demo may show the current phase. It must not pretend 15 Nov is postrera.

Onset uses the last 15 complete years in the fetched daily series, or fewer if that is all the fetch contains. For each year, onset is the first date from Apr 1 through Jun 30 whose trailing five-day rain sum is at least 25 mm and whose `GWETROOT` is at least 0.5. The report is the median day of year, the 25th and 75th percentiles, and a confidence word. Confidence is `alta` when the year count is at least 10 and the interquartile range is at most 21 days. Otherwise it is `media` when the year count is at least 6 or the interquartile range is at most 35 days. Otherwise it is `baja`. The 25 mm and 0.5 thresholds stay the spec's tunable defaults. The copy must not promise a date.

Dry-spell level uses the last 21 valid daily rain values and the current month's climatology. A dry day has rain under 1 mm. `run` is the current trailing dry-day count. `week` is the sum of the last 7 valid days. `climWeek` is that month's climatology millimetres per day, times 7. The level is `alto` when `run` is at least 7 or `week` is at most `0.4 * climWeek`. Else it is `medio` when `run` is at least 4 or `week` is at most `0.7 * climWeek`. Else it is `bajo`. The sentence says it is not a forecast.

Rotation reads the latest log. After maize, sorghum, or café, the candidates are frijol and canavalia. After frijol or canavalia, the candidates are maize and sorghum. The suggestion is the candidate with the higher suitability in the upcoming month. A tie uses the spec's list order, frijol before canavalia, and maize before sorghum. If that pick is the same species as the last log, and the other candidate is yellow or better, the other candidate wins. The soil score over the last three logged seasons, padded with empty slots when the log is short, is `0.40 * fixPct + 0.40 * socPts + 0.20 * diversity`. `fixPct` is `100 * (nitrogen-fixing seasons / 3)`. Soil organic carbon under 10 g/kg scores 30, from 10 up to but not including 20 scores 60, from 20 up to but not including 40 scores 80, and above 40 scores 100. The spec's Comasagua check, about 48.6 g/kg, scores 100. Diversity is 100 when the three slots hold at least two distinct crop ids, 50 when they hold one, and 0 when they hold none. The disclaimer that this supports a decision and does not replace the farmer or a technician is always shown.

The daily bubble picks the annual crop with the highest suitability this month. Café is out of that pick unless it is the only log. The sentence follows the spec's Spanish pattern. The method page, not the sentence, is what has to mention POWER rain and `GWETROOT`.

## Boundaries the sketches have to show

A pin change waits 400 ms, then refetches POWER daily, POWER climatology, and soil, then recomputes every score. The pin may move inside about 13.0 to 14.5 N and 87.7 to 90.2 W. Outside that box the interface clamps or warns. Soil that is null at every property retries a few offsets of about 3 to 5 km. If those are still null, the La Libertad pin supplies soil and `soilFallback` is true, with the spec's Spanish sentence.

What-if redraws the heatmap from climatology already on the client. It does not call the network again. That constraint is why the two sketches differ. One calls pure functions on the client when the slider moves. The other has the server return all nine slider corners, and the slider only chooses a corner. Both must generate those numbers from the one registry and the one set of functions. A second weight table is rejected.

The method page cites POWER, SoilGrids, and the compiled trait table, and it shows the formulas. English mode translates every interface string. Crop names may stay in Spanish with an English gloss in parentheses.

`cursor-team-kit` control skills for the browser and the terminal are not installed on this machine. The build checklist still names how each live lane drives the product, and it records the missing skills as a risk.

## The screens that already exist

The farmer-facing design is the Stitch export in [.stitch/16035705938589219304](../.stitch/16035705938589219304). The README there lists every screen. This pass does not draw a new layout. The sketches call those screens. The spec still owns the NASA sources, the formulas, and the acceptance checks.

Two families share that folder. The phone shell the farmer taps is the three-tab set. The tabs are Hoy, Este año, and Mi parcela. Cream background `#FAF6EE`, wordmark `Flo para la finca`, large type, and an Escuchar button that speaks the same sentence the card shows. The person glyph in the header is chrome. It is not an account. Sample names such as Don Carlos are fixture copy, not a user record.

Hoy has two card states already drawn. `Hoy: sembrá frijol` with `Si tenés riego. La tierra todavía tiene humedad.` And `Esperá unos días` with a dry-season or canícula reason. Those are two readings of the same advice. They are not two products.

Este año has two drawings of one year. The four-row screen names Primera (May through June, maize), Postrera (August through September, beans and sorghum), Apante (November through December, beans with irrigation), and Verano (January through April, rest and cover). The ultra-simple screen keeps three rows and marks November through April as época seca, descanso y abono, and AHORA. Score seasons stay the spec's three ids. Apante and verano are labels on top of `seca`. They are not new score ids. A fourth season inside the score function would split the spec's formula. The four-row screen may show Apante only when the today card is the plant-with-irrigation state.

The denser Stitch screens are where the spec's proof surfaces already live. Inicio ciclo has the "estás aquí" marker, the onset line, and the dry-spell line. Calendario agrícola has the five-crop by twelve-month grid and the sliders at +0, +1, +2 °C and 0, -10, -20 percent rain, plus the datos y método link. Siembra y fases has registrar siembra. Mapa de parcela confirms the pin. Those screens are reached from the tabs. They are not a second app.

Mi parcela shows Comasagua, La Libertad, `Usar mi ubicación`, and `Cambiar lugar`. GPS is another way to set the same field the map sets. The map screen and the parcela screen print different altitudes, 1,220 m and 1,270 m. The spec has no elevation source, so the type does not carry altitude. A later screen must not invent one of those numbers.

Language chips SV, US, ES, and EN appear on inicio ciclo. The spec requires Spanish and English. Extra language chips are not a P0 dictionary.

## What this pass will not do

No Next.js scaffold. No route. No call to POWER or SoilGrids. No git init. No Space Apps submission. No edit to the spec. A proved contradiction is written down in the interrogate report. It is not silently "fixed" in the spec.
