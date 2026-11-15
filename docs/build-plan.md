# Flo build plan

Salvadoran smallholders get a calm season calendar. This checklist is how a later go builds it. This founding pass does not run the checklist.

The program enforces one crop registry, derived scores, and no NASA calls from the browser. PR order is pr-domain, pr-nasa, pr-shell, pr-today, pr-heatmap, pr-logs, pr-map, pr-outlook, pr-datos.

The noon feature freeze has already passed and the tree has no app. Building starts only when the operator says to run this checklist.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `pstack/skills/poteto-mode/playbooks/autopilot-stack.md`. The operator lands every PR. No owner merges. pr-domain and pr-nasa are not review-gated. The other PRs change the column, so they wait for the operator's review in chat before they are merge-ready.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] Create the git repository if `.git` is missing. Do not push. Do not deploy. Record that origin/main does not exist yet.
- [ ] Read these from trunk at program start, once origin/main exists. Re-read them at every tick.
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `git show origin/main:pstack/skills/swarm/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:docs/artemus-spec.md`
  - [ ] `git show origin/main:docs/architecture.md`
  - [ ] `git show origin/main:docs/discovery.md`
- [ ] Until origin/main exists, read the same playbooks from the local pstack plugin cache and record the missing remote. `cursor-team-kit` control skills are not installed. Appendix C is the record. Lanes still name the driver they use.
- [ ] On the operator's go, arm the audit tick as `/loop 1h` with the tick prompt below. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle in `playbooks/autopilot-full.md`, and apply the no-merge rule in `playbooks/autopilot-stack.md`.
- [ ] Follow this dependency graph. Each PR branches from its parent. Do not run two owners that edit `app/page.tsx` at the same time.
  - [ ] pr-domain is first and branches from `main`.
  - [ ] pr-nasa after pr-domain.
  - [ ] pr-shell after pr-nasa.
  - [ ] pr-today after pr-shell.
  - [ ] pr-heatmap after pr-today.
  - [ ] pr-logs after pr-heatmap.
  - [ ] pr-map after pr-logs.
  - [ ] pr-outlook after pr-map.
  - [ ] pr-datos after pr-outlook.
- [ ] Hold the file boundaries. pr-domain touches `package.json`, `tsconfig.json`, and `src/domain/**`. pr-nasa touches `src/server/**` and `app/api/**`. pr-shell touches `app/layout.tsx`, `app/globals.css`, `src/i18n/**`, and `src/state/**`. Later UI PRs touch `app/page.tsx` and their own files under `src/ui/**`. pr-datos touches `app/datos/**`.
- [ ] Hold the review gate. pr-shell, pr-today, pr-heatmap, pr-logs, pr-map, pr-outlook, and pr-datos change an interaction. They wait for the operator's review in chat with screenshots and a video before merge-ready. pr-domain and pr-nasa do not.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`. If `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Never require `gt`.
- [ ] Open the PR ready, never draft, per Opening a PR. Use the run's built-in PR tool when it has one, else `origin pr create --status open --base <base-branch>` or `gh pr create --base <base-branch>` according to the resolved forge. A stack child targets its parent branch.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review. If those skills are missing, record the gap in Appendix C and do not invent a silent skip.
- [ ] Triage every Bugbot and security-reviewer comment per `pstack/skills/poteto-mode/references/bugbot-triage.md`.
- [ ] Rebase onto the parent branch before the code-ready report and babysit. Keep that merge base in fix rounds. Rebase again only at merge prep, on a `git merge-tree` conflict with the parent, on a CI failure that comes from a change on the parent, or when a known concurrent change to the same files lands.

### Verdict and merge, for every PR

- [ ] A full swarm runs once, at the code-ready head. Another full swarm runs only for new behavior, a redesign, or a large new diff. A rebase, a merge-conflict resolution, or a minor fix gets a single verifier at the new head, and a wording-only change gets none. Run each full swarm per `pstack/skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's Verify, live block. The perf lane from its Verify, perf block. Two or more audit lanes, each with its own focus, that read the diff and the receipts and distrust the PR body. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Judge every finding by the blocking rule in `playbooks/autopilot-full.md`. The verdict is clean when none blocks. A failure on trunk behavior in a lane marked `Regression lane against trunk.` is recorded against trunk and does not block the PR. A new head gets a fresh verdict, except for results that stay valid under the patch-id rule in `playbooks/shipping.md`.
- [ ] Nobody merges. After the root's clean verdict, the root appends the PR to the base-branch stack and the operator lands the contiguous verified run bottom-up. A restack that leaves `git patch-id` unchanged keeps its verdict.

### Boot recipe, for every live lane

Each live lane runs on its own cloud VM at the PR head. `cursor-team-kit` is not installed, so the driver is named here instead of a missing control skill.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`. Until origin exists, check out the PR head SHA locally and record that.
- [ ] For pr-domain, run `npm test` and screenshot the terminal. For pr-nasa, start `npm run dev`, wait until it prints the ready line, and drive the routes with curl. For every later PR, start `npm run dev`, wait until it prints the ready line, and drive the page in a browser at the viewport the lane names.
- [ ] Deliver input only through that driver. Read-only diagnostics are the terminal log, the browser network log, and `curl -D -`.
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## Score the crops (pr-domain)

**Depends on.** None.

**Files.**

- [ ] Create `package.json` with `npm test`.
- [ ] Create `tsconfig.json`.
- [ ] Create `src/domain/calendar.ts`.
- [ ] Create `src/domain/calendar.test.ts`.

**Build.**

- [ ] Put the keyed crop registry, `TRAIT_SOURCE`, and `SCORE_RULES` only in `src/domain/calendar.ts`.
- [ ] Export `scoreMonth`, `todayCard`, `yearRows`, `cycleStatus`, `nextRotation`, and `soilHealth` from that same file.
- [ ] Keep `AppState` free of saved scores. `validThrough` lives on the parsed climate bundle, not in `localStorage`.

**You see.**

- [ ] `npm test` prints the maize oracle, suit about 72.13, band green, for a 31-day month with 100 mm, T 24, and pH 6.5.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/domain/calendar.test.ts` gains the maize oracle, café's annual divisor, pH omission, drought lift, 15 Nov 2026 as seca day 15, onset confidence, dry-spell levels, rotation, and the soil score. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run `npm test` at trunk and at head. Trunk has no app. Record that and gate the maize oracle at head. Save `pr-domain-regression.png`. Pass when head prints suit about 72.13 and band green, and the lane record says trunk had no domain module.
- [ ] Lane 2. Temperature edges for maize. Save `pr-domain-temp.png`. Pass when T 12 and T 32 score 0, T 30 scores 40, and T 18 scores about 66.67.
- [ ] Lane 3. Rain unit trap. Save `pr-domain-rain.png`. Pass when the 100 mm month scores about 30.33, which is the millimetre-per-month comparison, and a raw millimetre-per-day comparison is not what the test asserts.
- [ ] Lane 4. Café divisor. Save `pr-domain-cafe.png`. Pass when the café month target is 1600 divided by 12 and the test does not multiply by cycle days.
- [ ] Lane 5. Missing soil. Save `pr-domain-soil-missing.png`. Pass when pH is omitted and the printed suit equals the renormalized weight over 0.85.
- [ ] Lane 6. Drought lift. Save `pr-domain-drought.png`. Pass when sorghum rain score 60 becomes 75 and maize rain score 60 stays 60.
- [ ] Lane 7. Season clock. Save `pr-domain-season.png`. Pass when 15 Nov 2026 is seca, day index 15, and days until 30 Apr 2027 are 166.
- [ ] Lane 8. Onset confidence. Save `pr-domain-onset.png`. Pass when 10 years with IQR 21 days is alta, 4 years with IQR 35 days is media, and 5 years with IQR 40 days is baja.
- [ ] Lane 9. Dry spell. Save `pr-domain-dryspell.png`. Pass when run 7 is alto, run 4 with a wet week is medio, and run 0 with a wet week is bajo.
- [ ] Lane 10. Rotation and soil carbon. Save `pr-domain-rotation.png`. Pass when a maize log suggests frijol or canavalia, the same species is blocked when the alternative is yellow or better, and SOC 48.6 g/kg scores 100.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time to score 5 crops across 12 months. Trunk has no score function, so the trunk metric is absent. The user-visible end state this diff adds is the in-memory recompute the slider will wait on.
- [ ] Probe. Run the domain perf probe at trunk and at head, interleaved. Trunk fails because `npm test` is absent. Head runs the same probe.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head must finish those 60 scores in under 16 ms. The 16 ms figure is one display frame, not a measured baseline. A head time of 16 ms or more fails.

**Review gate.** None. pr-domain is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this root PR when the verified stack is handed over.

## Fetch NASA data (pr-nasa)

**Depends on.** pr-domain.

**Files.**

- [ ] Create `src/server/power.ts`.
- [ ] Create `src/server/soil.ts`.
- [ ] Create `src/server/nasa.test.ts`.
- [ ] Create `app/api/power/daily/route.ts`.
- [ ] Create `app/api/power/climatology/route.ts`.
- [ ] Create `app/api/soil/route.ts`.

**Build.**

- [ ] Parse POWER and SoilGrids inside `src/server/power.ts` and `src/server/soil.ts`. Divide SoilGrids means by the spec factors. Trim POWER -999 before returning `validThrough`.
- [ ] Cache daily responses for 6 hours. Cache climatology and soil for 7 days.
- [ ] On all-null soil, retry offsets of about 3 to 5 km, then the La Libertad pin, and set the fallback flag. If `docs/architecture.md` selects the lattice, return the nine scored corners from the domain functions. Do not add a second weight table.

**You see.**

- [ ] `curl` against `/api/soil?lat=13.640&lon=-89.380` returns pH in soil units, not the raw SoilGrids mean, and a second call does not hit the upstream mock again.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/server/nasa.test.ts` gains parse, trim, divide, fallback, and cache cases. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Curl `/api/soil` at trunk and at head. Trunk has no route. Record that and gate the parsed body at head. Save `pr-nasa-regression.png`. Pass when head returns a measured profile for 13.640, -89.380 and the lane record says trunk had no route.
- [ ] Lane 2. Daily trim. Save `pr-nasa-trim.png`. Pass when a fixture ending in -999 drops those days and `validThrough` is the last kept date.
- [ ] Lane 3. Daily cache. Save `pr-nasa-daily-cache.png`. Pass when two calls inside 6 hours produce one upstream request.
- [ ] Lane 4. Climatology cache. Save `pr-nasa-clim-cache.png`. Pass when two calls inside 7 days produce one upstream request.
- [ ] Lane 5. Soil factors. Save `pr-nasa-factors.png`. Pass when pH is the raw mean divided by 10, clay and sand by 10, soc by 10, and nitrogen by 100.
- [ ] Lane 6. Urban fallback. Save `pr-nasa-fallback.png`. Pass when an all-null point retries offsets and then returns fallback true with the La Libertad profile.
- [ ] Lane 7. Boundary rejection. Save `pr-nasa-bounds.png`. Pass when a missing lat or lon returns an error body and does not call upstream.
- [ ] Lane 8. No browser NASA host. Save `pr-nasa-hosts.png`. Pass when the route source, not a client bundle, is the file that contains the POWER and SoilGrids hosts.
- [ ] Lane 9. Domain units only. Save `pr-nasa-units.png`. Pass when the JSON body has no raw `T2M` key and no raw SoilGrids `d_factor` key.
- [ ] Lane 10. Lattice gate. Save `pr-nasa-lattice.png`. Pass when the body matches `docs/architecture.md`. A lattice body has nine corners from the domain module. A live-recompute body has parsed climatology and no second weight table.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Latency of the second `/api/soil` call against a mock. Trunk has no route, so the trunk metric is absent. Also time the first uncached call. The user waits on a soil profile, not on a ratio against an empty trunk.
- [ ] Probe. Curl `/api/soil` twice at head, interleaved with the same curl at trunk. Trunk fails to connect. Head records both timings and the upstream mock count.
- [ ] Baseline. Record the trunk connection failure first.
- [ ] Rule. The second head call is under 100 ms and the mock count stays 1. The first uncached call is under 9 seconds. Those are budgets, not measured baselines. A cache miss on the second call fails. A first call over 9 seconds fails.

**Review gate.** None. pr-nasa is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-domain after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Shell the column (pr-shell)

**Depends on.** pr-nasa.

**Files.**

- [ ] Create `app/layout.tsx`.
- [ ] Create `app/page.tsx`.
- [ ] Create `app/globals.css`.
- [ ] Create `src/i18n/messages.ts`.
- [ ] Create `src/state/store.ts`.

**Build.**

- [ ] `src/state/store.ts` is the only writer of `AppState` in `localStorage`.
- [ ] `src/i18n/messages.ts` is a typed `es` and `en` dictionary. Default language is `es`.
- [ ] The first paint is the Stitch three-tab shell. Tabs are Hoy, Este año, and Mi parcela. Background is `#FAF6EE`. The wordmark is `Flo para la finca`. The person glyph is not an account.

**You see.**

- [ ] A 360 px viewport shows the wordmark, the three Stitch tabs, and the default pin label, with language `es`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/state/store.test.ts` gains a round trip for field, lang, empty logs, and default what-if. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the page at trunk and at head. Trunk has no page. Record that and gate the wordmark at head. Save `pr-shell-regression.png`. Pass when head shows `Flo para la finca` and the lane record says trunk had no page.
- [ ] Lane 2. Spanish at 360 px. Save `pr-shell-spanish.png`. Pass when the wordmark and the pin label `La Libertad (rural)` are both visible without horizontal page scroll.
- [ ] Lane 3. English toggle. Save `pr-shell-english.png`. Pass when EN switches the wordmark to `Flo for the farm` and a reload keeps EN.
- [ ] Lane 4. No fake phase. Save `pr-shell-nofake.png`. Pass when the shell does not render the word postrera.
- [ ] Lane 5. No NASA from the browser. Save `pr-shell-network.png`. Pass when the network log on load has no request to POWER or SoilGrids.
- [ ] Lane 6. Default field persists. Save `pr-shell-field.png`. Pass when reload keeps latitude 13.640 and longitude -89.380.
- [ ] Lane 7. Empty logs persist. Save `pr-shell-logs.png`. Pass when reload keeps an empty log list.
- [ ] Lane 8. No raw keys. Save `pr-shell-keys.png`. Pass when the visible text contains no untranslated dictionary key.
- [ ] Lane 9. Default what-if. Save `pr-shell-whatif.png`. Pass when the stored sliders are dT 0 and rainFactor 1.
- [ ] Lane 10. Desktop column. Save `pr-shell-desktop.png`. Pass when the column width is between 480 and 640 px on a wide viewport.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time until the wordmark is visible. Trunk has no page, so the trunk metric is absent. The end state the user waits for is the wordmark.
- [ ] Probe. Load `/` at trunk and at head, interleaved. Trunk has nothing to paint. Head records DOMContentLoaded and the wordmark time.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head shows the wordmark within 2 seconds on the lane VM. That 2 second figure is a budget, not a measured baseline. A missing wordmark fails. A time over 2 seconds fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 into `docs/review/pr-shell-review-spanish.png`.
- [ ] Record a 30 to 60 second video of the language toggle and reload. Save it as `docs/review/pr-shell-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-nasa after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Show today (pr-today)

**Depends on.** pr-shell.

**Files.**

- [ ] Create `src/ui/season-ring.tsx`.
- [ ] Create `src/ui/status-bubble.tsx`.
- [ ] Create `src/ui/siembra-ahora.tsx`.
- [ ] Edit `app/page.tsx`.

**Build.**

- [ ] Hoy renders one Stitch card from `src/domain/calendar.ts` and a clock argument. The card is the plant sentence or the wait sentence. Escuchar speaks that same sentence.
- [ ] Café is excluded unless it is the only log. The default clock is the real today.

**You see.**

- [ ] With the clock fixed at 15 Nov 2026, Hoy shows the seca card from the Stitch hoy screens, and Escuchar speaks that sentence.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] A render test feeds 15 Nov 2026 and the maize oracle month. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the page at trunk and at head with the clock on 15 Nov 2026. Trunk has no ring. Record that and gate the phase label at head. Save `pr-today-regression.png`. Pass when head shows seca and day 15, and the lane record says trunk had no ring.
- [ ] Lane 2. Spanish sentence. Save `pr-today-spanish.png`. Pass when the bubble is one Spanish sentence that includes the phase day.
- [ ] Lane 3. English sentence. Save `pr-today-english.png`. Pass when EN replaces the bubble and the today card, and a reload keeps EN.
- [ ] Lane 4. Not postrera. Save `pr-today-phase.png`. Pass when 15 Nov 2026 does not render as postrera.
- [ ] Lane 5. Data loaded once. Save `pr-today-network.png`. Pass when painting the bubble does not send a second POWER request after the first bundle load.
- [ ] Lane 6. Today card. Save `pr-today-card.png`. Pass when the card shows a crop name, a green or yellow or red suit, one reason, and the register-planting action.
- [ ] Lane 7. Café excluded. Save `pr-today-cafe.png`. Pass when café is not the bubble crop while an annual crop is available.
- [ ] Lane 8. No raw keys. Save `pr-today-keys.png`. Pass when the new cards show no untranslated key.
- [ ] Lane 9. Empty logs still render today. Save `pr-today-empty.png`. Pass when the today card renders before any log exists.
- [ ] Lane 10. Desktop column. Save `pr-today-desktop.png`. Pass when the ring and the card stay inside a column 480 to 640 px wide.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time from a cached bundle to the bubble text. Trunk has no bubble, so the trunk metric is absent.
- [ ] Probe. Render the today column from a fixture bundle at head. At trunk, record that the page has no bubble.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head paints the bubble within 100 ms of receiving the fixture. That 100 ms figure is a budget, not a measured baseline. A missing sentence fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 4 into `docs/review/pr-today-review-phase.png`.
- [ ] Record a 30 to 60 second video of the ring, the bubble, and the today card. Save it as `docs/review/pr-today-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-shell after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Draw the heatmap (pr-heatmap)

**Depends on.** pr-today.

**Files.**

- [ ] Create `src/ui/heatmap.tsx`.
- [ ] Create `src/ui/what-if.tsx`.
- [ ] Edit `app/page.tsx`.

**Build.**

- [ ] The Stitch calendario screen holds the grid and the sliders. The sliders write only `whatIf` in the store. They call domain scores on the climatology already held. They do not fetch.

**You see.**

- [ ] Five crop rows and twelve month columns change color when the rain slider moves to -20 percent, and the network log gains no new `/api` request.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] A test moves `rainFactor` from 1 to 0.8 on a fixture and expects a different cell band for at least one crop-month. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the heatmap at trunk and at head. Trunk has no heatmap. Record that and gate the five by twelve grid at head. Save `pr-heatmap-regression.png`. Pass when head shows 60 cells and the lane record says trunk had no heatmap.
- [ ] Lane 2. Spanish labels. Save `pr-heatmap-spanish.png`. Pass when month labels are in Spanish and the five crop names are visible at 360 px.
- [ ] Lane 3. English labels. Save `pr-heatmap-english.png`. Pass when EN translates the slider labels and a reload keeps EN.
- [ ] Lane 4. Slider plus 2 C. Save `pr-heatmap-heat.png`. Pass when at least one cell band differs from dT 0 and the network log is unchanged.
- [ ] Lane 5. Slider minus 20 percent rain. Save `pr-heatmap-rain.png`. Pass when at least one cell band differs from rainFactor 1 and no new `/api` request fires.
- [ ] Lane 6. Cached bundle untouched. Save `pr-heatmap-cache.png`. Pass when the stored climatology temperatures are unchanged after the slider returns to dT 0.
- [ ] Lane 7. Three colors only. Save `pr-heatmap-colors.png`. Pass when every cell is green, yellow, or red and no cell is blank.
- [ ] Lane 8. No raw keys. Save `pr-heatmap-keys.png`. Pass when slider copy has no untranslated key.
- [ ] Lane 9. Default sliders. Save `pr-heatmap-default.png`. Pass when a fresh load starts at dT 0 and rainFactor 1.
- [ ] Lane 10. Desktop column. Save `pr-heatmap-desktop.png`. Pass when the grid stays inside a column 480 to 640 px wide.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time from the rain slider release to the repainted grid, plus the count of new `/api` requests. Trunk has no slider, so the trunk metric is absent.
- [ ] Probe. Move the slider at head with the network log open. At trunk, record that no slider exists.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head repaints within 16 ms and the new `/api` count is 0. The 16 ms figure is one display frame, not a measured baseline. A new `/api` request fails. A repaint at 16 ms or slower fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 5 into `docs/review/pr-heatmap-review-slider.png`.
- [ ] Record a 30 to 60 second video of the slider moving to -20 percent rain. Save it as `docs/review/pr-heatmap-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-today after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Log a planting (pr-logs)

**Depends on.** pr-heatmap.

**Files.**

- [ ] Create `src/ui/logs.tsx`.
- [ ] Edit `app/page.tsx`.

**Build.**

- [ ] The Stitch siembra screen saves one `CropLog` through the store. Rotation and the soil score are derived, not stored.

**You see.**

- [ ] After a frijol log, reload still shows that log, a next-crop line, and a soil score from 0 to 100 with the three terms.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/domain/calendar.test.ts` already covers rotation. Add a store test that a saved log survives a simulated reload. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the log list at trunk and at head. Trunk has no log list. Record that and gate the empty copy at head. Save `pr-logs-regression.png`. Pass when head shows the empty-state sentence and the lane record says trunk had no log list.
- [ ] Lane 2. Spanish empty copy. Save `pr-logs-empty-es.png`. Pass when the empty state is the spec's Spanish sentence at 360 px.
- [ ] Lane 3. English empty copy. Save `pr-logs-empty-en.png`. Pass when EN translates the empty state and a reload keeps EN.
- [ ] Lane 4. Save and reload. Save `pr-logs-reload.png`. Pass when a maize log on a chosen date is still there after reload.
- [ ] Lane 5. Rotation line. Save `pr-logs-rotation.png`. Pass when the line suggests frijol or canavalia after maize, and does not suggest maize again.
- [ ] Lane 6. Soil score. Save `pr-logs-soil.png`. Pass when the bar shows a number from 0 to 100 and the fix, SOC, and diversity terms are visible.
- [ ] Lane 7. Disclaimer. Save `pr-logs-disclaimer.png`. Pass when the farmer-and-technician sentence is visible.
- [ ] Lane 8. No raw keys. Save `pr-logs-keys.png`. Pass when the log card shows no untranslated key.
- [ ] Lane 9. Empty before the first save. Save `pr-logs-before.png`. Pass when the rotation line is absent before the first log.
- [ ] Lane 10. Desktop column. Save `pr-logs-desktop.png`. Pass when the list stays inside a column 480 to 640 px wide.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time from the save action to the rotation line. Trunk has no save action, so the trunk metric is absent.
- [ ] Probe. Save one log at head. At trunk, record that no log control exists.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head shows the rotation line within 100 ms of the save, with no new `/api` request. That 100 ms figure is a budget, not a measured baseline. A missing line fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 4 into `docs/review/pr-logs-review-reload.png`.
- [ ] Record a 30 to 60 second video of logging a crop and reloading. Save it as `docs/review/pr-logs-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-heatmap after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Move the pin (pr-map)

**Depends on.** pr-logs.

**Files.**

- [ ] Create `src/ui/map-sheet.tsx`.
- [ ] Edit `app/page.tsx`.

**Build.**

- [ ] The Stitch mapa screen is the Leaflet pin. Mi parcela can set the same field by GPS or by choosing a place. A click inside the country box moves the field after a 400 ms debounce and refetches. A click far outside clamps or warns. Altitude stays off the type.

**You see.**

- [ ] The sheet opens on 13.640, -89.380. An all-null soil response shows the fallback sentence and the page still shows a soil score.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] A test debounces two clicks 100 ms apart into one fetch. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the map at trunk and at head. Trunk has no map. Record that and gate the default pin at head. Save `pr-map-regression.png`. Pass when head centers on 13.640, -89.380 and the lane record says trunk had no map.
- [ ] Lane 2. Spanish fallback copy. Save `pr-map-fallback-es.png`. Pass when the all-null fixture shows the spec's Spanish soil sentence at 360 px.
- [ ] Lane 3. English fallback copy. Save `pr-map-fallback-en.png`. Pass when EN translates that sentence and a reload keeps EN.
- [ ] Lane 4. Click inside the country. Save `pr-map-click.png`. Pass when the pin and the field label change after the debounce, and scores rerender.
- [ ] Lane 5. Debounce. Save `pr-map-debounce.png`. Pass when two clicks inside 400 ms produce one refetch.
- [ ] Lane 6. Outside the box. Save `pr-map-outside.png`. Pass when a far click clamps or warns and does not leave a blank page.
- [ ] Lane 7. Urban score survives. Save `pr-map-urban.png`. Pass when fallback true still shows a soil score from 0 to 100.
- [ ] Lane 8. No raw keys. Save `pr-map-keys.png`. Pass when the sheet shows no untranslated key.
- [ ] Lane 9. Default pin on first open. Save `pr-map-default.png`. Pass when the first open has not moved the pin off La Libertad.
- [ ] Lane 10. Desktop column. Save `pr-map-desktop.png`. Pass when the sheet is usable and the page column stays 480 to 640 px wide.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time from the confirmed pin to the next paint after a cached soil response. Trunk has no map, so the trunk metric is absent. The first uncached SoilGrids wait stays under the 9 second budget from pr-nasa and is not compared with trunk.
- [ ] Probe. Move the pin at head against a cached fixture, and record the same action as absent at trunk.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head repaints within 100 ms after the cached response arrives. That 100 ms figure is a budget, not a measured baseline. A crash on null soil fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 into `docs/review/pr-map-review-fallback.png`.
- [ ] Record a 30 to 60 second video of moving the pin. Save it as `docs/review/pr-map-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-logs after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Show onset and dry spell (pr-outlook)

**Depends on.** pr-map.

**Files.**

- [ ] Create `src/ui/outlook.tsx`.
- [ ] Edit `app/page.tsx`.

**Build.**

- [ ] The Stitch inicio ciclo screen shows the onset line and the dry-spell line from the domain functions. Copy does not promise a forecast. Language chips on that screen are `es` and `en` only.

**You see.**

- [ ] The page shows a percentile window, a confidence word, and the dry-spell level with the not-a-forecast sentence.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] A render test supplies a fixed onset result and a fixed dry-spell level. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the chips at trunk and at head. Trunk has no chips. Record that and gate both chips at head. Save `pr-outlook-regression.png`. Pass when head shows both chips and the lane record says trunk had none.
- [ ] Lane 2. Spanish onset. Save `pr-outlook-onset-es.png`. Pass when the Spanish headline names a window and a confidence word at 360 px.
- [ ] Lane 3. English onset. Save `pr-outlook-onset-en.png`. Pass when EN translates both chips and a reload keeps EN.
- [ ] Lane 4. No guaranteed date. Save `pr-outlook-naguarantee.png`. Pass when the onset copy does not say the rains will start on one exact date.
- [ ] Lane 5. Dry-spell disclaimer. Save `pr-outlook-disclaimer.png`. Pass when the visible sentence says it is not a forecast.
- [ ] Lane 6. Levels. Save `pr-outlook-levels.png`. Pass when the chip can show bajo, medio, and alto from fixtures without a layout break.
- [ ] Lane 7. Uses the daily series. Save `pr-outlook-series.png`. Pass when the chip values change when the fixture series changes, with no extra slider request.
- [ ] Lane 8. No raw keys. Save `pr-outlook-keys.png`. Pass when the chips show no untranslated key.
- [ ] Lane 9. Empty series. Save `pr-outlook-empty.png`. Pass when a short series renders baja or an explicit missing state and does not crash.
- [ ] Lane 10. Desktop column. Save `pr-outlook-desktop.png`. Pass when both chips stay inside a column 480 to 640 px wide.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time to compute onset over 15 years of daily points on the head. Trunk has no onset function in the page, so the trunk page metric is absent. The domain function already exists from pr-domain.
- [ ] Probe. Run the onset render at head from a 15-year fixture. At trunk, record that the page has no onset chip.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head paints both chips within 100 ms of the fixture. That 100 ms figure is a budget, not a measured baseline. A crash on a short series fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 5 into `docs/review/pr-outlook-review-disclaimer.png`.
- [ ] Record a 30 to 60 second video of the two chips. Save it as `docs/review/pr-outlook-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-map after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack.

## Cite the method (pr-datos)

**Depends on.** pr-outlook.

**Files.**

- [ ] Create `app/datos/page.tsx`.
- [ ] Edit `app/page.tsx` to link to `/datos`.

**Build.**

- [ ] The page names NASA POWER, SoilGrids, and the compiled trait table, and it shows the formulas from the domain module's documented weights. It does not copy a second weight table.

**You see.**

- [ ] `/datos` in Spanish cites POWER, SoilGrids, and the ECOCROP-down disclaimer. EN translates the page.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] A render test expects the POWER name, the SoilGrids name, and the compiled-trait disclaimer. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `claude-haiku-5-5-thinking-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open `/datos` at trunk and at head. Trunk has no method page. Record that and gate the citations at head. Save `pr-datos-regression.png`. Pass when head cites POWER and SoilGrids, and the lane record says trunk had no method page.
- [ ] Lane 2. Spanish citations at 360 px. Save `pr-datos-es.png`. Pass when POWER, SoilGrids, and the trait disclaimer are visible without a raw key.
- [ ] Lane 3. English citations. Save `pr-datos-en.png`. Pass when EN translates the page and a reload keeps EN.
- [ ] Lane 4. Formulas visible. Save `pr-datos-formulas.png`. Pass when the weights 0.45, 0.40, and 0.15 are on the page.
- [ ] Lane 5. No second table. Save `pr-datos-onetable.png`. Pass when the crop numbers on the page match `src/domain/calendar.ts` for maize rain 500 to 800.
- [ ] Lane 6. Home link. Save `pr-datos-link.png`. Pass when the home column links to `/datos` and the method page links back.
- [ ] Lane 7. Incognito shape. Save `pr-datos-incognito.png`. Pass when `/datos` renders with an empty `localStorage` and no login wall.
- [ ] Lane 8. No NASA logo requirement. Save `pr-datos-marks.png`. Pass when the page does not use a NASA logo image.
- [ ] Lane 9. Disclaimer stays. Save `pr-datos-disclaimer.png`. Pass when the page says the traits are compiled defaults and that ECOCROP was unavailable on 2026-11-14.
- [ ] Lane 10. Desktop column. Save `pr-datos-desktop.png`. Pass when the method page stays inside a column 480 to 640 px wide.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time until the POWER citation is visible on `/datos`. Trunk has no method page, so the trunk metric is absent.
- [ ] Probe. Load `/datos` at trunk and at head, interleaved.
- [ ] Baseline. Record the trunk absence first.
- [ ] Rule. Head shows the POWER citation within 2 seconds. That 2 second figure is a budget, not a measured baseline. A missing citation fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 into `docs/review/pr-datos-review-citations.png`.
- [ ] Record a 30 to 60 second video of the home link and `/datos`. Save it as `docs/review/pr-datos-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto pr-outlook after the verdict, patch-id unchanged.
- [ ] The owner does not merge. The operator lands this PR with the stack. Deploy to Vercel only if the operator asks. A deploy is not part of this checklist's merge boxes.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the autopilot-stack report. List each PR with its verdict. Do not claim a merge.

## Appendix A. Prototype evidence

The module-shape prototypes are the two architect sketches under the agent store `arena/candidate-live` and `arena/candidate-lattice`. This tree has no git commits, so there is no SHA to cite. `docs/architecture.md` names the base shape and the grafts. `docs/discovery.md` holds the formula oracles. Those oracles stay unproven on a running app until pr-domain's `npm test` prints them. `docs/interrogate.md` lists findings that were reproduced, or says that none were.

Questions that stay unproven until a later go. Live NASA latency at the real La Libertad pin. The visual calm of the column. Whether a teammate replaces the compiled trait numbers.

## Appendix B. Alternatives rejected

Auth, a database, SMAP, ECOSTRESS, HLS, IMERG, and a forecast API lost because the spec cuts them.

A scoring service lost because the spec's Next.js app is the whole system, and a second process would duplicate the registry.

A second copy of the trait weights, in the method page or in a lattice payload that does not call the domain module, lost because the two lists would drift.

The architecture arena compared live recompute with a nine-corner lattice. Live recompute is the base in `docs/architecture.md`. The lattice lost. Two grafts remain, `SCORE_RULES` and a crop registry keyed by id. This checklist does not build both shapes.

P1 polish, including the visible "datos hasta" line, stays out until P0 is on Vercel. The type still carries `validThrough` so that later line does not reshape the bundle.

## Appendix C. Risks

The noon freeze on Sun Nov 15, 2026 has passed. The submit deadline is 11:59 PM El Salvador time the same night. This checklist is longer than that window. The operator decides whether to start it. Starting it does not undo the missed noon line.

The farmer UI is the Stitch export under `.stitch`. Hoy, Este año, and Mi parcela are the tabs. The calendario, inicio ciclo, siembra, and mapa screens are the spec's grid, onset, log, and pin. Apante and verano on the four-row year screen are labels on `seca`, not new score ids. The two altitudes on the map screens are not a data source. pr-shell through pr-datos watch those screens. A new layout is a miss.

`cursor-team-kit` control skills are not installed. UI lanes drive a browser by hand as the boot recipe says. API lanes use curl. Domain lanes screenshot `npm test`. That gap sits on every PR.

`/deslop` and `/no-comments` may be missing with the same plugin. Owners record the gap instead of pretending the pass ran.

pr-nasa's first SoilGrids call can take 5 to 9 seconds. The perf rule caps it at 9 seconds. A slower upstream is an upstream failure, not a license to blank the soil score.

Trait rows marked for verification in the spec can move a cell from green to yellow if an agronomist changes a midpoint. pr-domain is the PR that watches that table. The UI must keep the compiled-default disclaimer.

The lattice and live recompute must not both ship. pr-nasa watches `docs/architecture.md` and implements one of them.

Urban null soil is the crash risk. pr-map watches the fallback sentence and a surviving score.

No origin remote exists at the start of the founding pass. The first execution of this checklist creates git history and does not deploy until the operator asks.

## Appendix D. Links and reading list

Read `docs/artemus-spec.md`, `docs/discovery.md`, `docs/architecture.md`, `docs/interrogate.md`, and `.stitch/16035705938589219304/README.md` before editing.

pr-domain and pr-nasa are the PRs that get a fresh read of `pstack/skills/interrogate/SKILL.md` if a formula or a parser changes after this founding pass.

The decision trail for a later execution follows `pstack/skills/show-me-your-work/SKILL.md` in the root agent store. This founding pass does not start that execution.
