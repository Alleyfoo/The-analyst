# Known quirks — preserved

The original findings below are from baseline source inspection. “Confirmed” in those sections means the branch/contradiction follows directly from code. A subsequent minimal runtime smoke check is recorded separately below; it was not a gameplay playthrough. The original inspection did not fix these findings; subsequent explicitly authorized corrections are marked below.

## Reproducibility validation — 2026-10-03

### Confirmed runtime bug

None newly observed within the minimal smoke scope. In an isolated headless Chromium context at 1440x1000, the initial game, Ops/Market/Ads/Terminal tabs, Clean Data, Analyze, Visit Break Room and initial upgrade controls rendered. No uncaught page errors or console errors were captured across initial navigation and reload. `useGameEngine` autosave created parseable `the_analyst_save_v1`; reload logged save loading, preserved `startTime`/capacity and continued the saved tick (9 to 18). This does not validate endgame, minigame lifecycle or all gameplay actions.

### Build/tooling issues and warnings

- `npm install` with npm 11.12.1 / Node 24.14.1 succeeded (112 packages added, audit reported zero vulnerabilities). No lockfile existed; npm was selected from README commands. Generated lockfile version 3 is retained. No package declarations or production source were changed. Subsequent installs should use `npm ci`.
- `npm run build` passed with Vite 6.4.3. It warned that `/index.css` does not exist and left that reference for runtime resolution. It also warned about a >500 kB minified chunk (reported JS bundle 910.09 kB, gzip 269.56 kB). No changes were made to suppress warnings.
- `npm run lint` (`tsc --noEmit`, TypeScript 5.8.3) passed. There is no separate lint/typecheck/test script or test suite.
- Browser console warned that `cdn.tailwindcss.com` should not be used in production. The CDN dependency was preserved. No failed network requests were observed in this development smoke; this does not prove missing `/index.css` or `/vite.svg` resolve correctly in production deployment.
- The first smoke script used an overly narrow accessible button name (`Clean Data` without its existing `Manual ETL` label) and failed its locator assertion. Correcting only the temporary test selector made the smoke pass; this was a test-harness issue, not an application defect.

### Source-only suspicion not reproduced

All original gameplay defects, description discrepancies and suspicions below retain their source-based evidence status. The smoke did not attempt to reproduce circular unlocks, sandbox ending re-entry, tick-zero coffee, delayed-task overwrites, StrictMode action side effects or minigame timing/lifecycle concerns.

## Confirmed logic defects and unreachable content

1. **Circular model unlock.** `constants.ts::checkUpgradeVisibility` requires `models>0` for `data_scientist`; that upgrade grants the first model. `components/Workstation.tsx::canModel` requires that purchase to launch `ModelTrainingGame`, the only other model-granting path (`useGameEngine::completeModelTraining`). Fresh-state models=0; ordinary player actions cannot bootstrap this branch.
2. **Circular dashboard unlock.** `kpi_board` requires dashboards >2, then grants +2. The only other dashboard writer is buy-once `bi_dashboards`, granting +1 (`constants.ts::UPGRADES`). Thus ordinary baseline progression stops at one dashboard; KPI Board and `color_mandate` (>=3 dashboards) cannot become available.
3. **Invisible segmentation.** `segmentation` has `visible:false`, `purchased:false`, and no branch enabling visibility in `checkUpgradeVisibility`. It cannot be bought through Workstation.
4. **Historical original-ending issue (screen replaced 2026-10-04): ending could not be reopened after returning to sandbox.** `purchaseUpgrade` marks `project_omniscience` bought before opening ending. `cancelAscension` clears only `isAscending`; future purchases return unchanged because it is already bought. Workstation can later show an ASCEND button that invokes the same rejected purchase. A save/reload preserves this condition. The new original ending has no Sandbox choice; legacy `cancelAscension` and purchase logic remain unchanged in source.
5. **Zero-tick coffee cooldown lost on load.** `hydrateState` uses `parsed.lastCoffeeTick || -9999`. A first coffee at tick zero is valid but is restored as no recent coffee, permitting another immediately.
6. **Delayed chat effects overwrite same-tick production.** The main interval evaluates `response.effect(current)` and spreads `stateDeltaFromTask` after computed changes. For example a task writing `pu:current.pu+50` replaces the tick's PU production/penalty; nested `worldStats` effects replace that tick's drift/entropy calculation too. This follows assignment order, not an inferred race.

## Confirmed description/code discrepancies

- `README.md` tells users to set a Gemini API key. `vite.config.ts` substitutes `process.env.API_KEY` and `process.env.GEMINI_API_KEY`, but no game source calls either or a model API. “AI Analyst” is local curve-fitting code in `ModelTrainingGame`, not a remote AI service. The README was preserved.
- `constants.ts::neural_interface` says manual actions are 5x effective. `manualClean` adds 20 to its batch; `manualAnalyze` gets no neural bonus. `segmentation` advertises increased PU but only lowers quality. Data Scientist's description suggests model generation; its effect adds exactly one model at purchase.
- Market copy says “Reach 500 PU” (`Workstation`), while the engine requires >500. Purchased upgrades may disappear when visibility thresholds drop because `checkUpgradeVisibility` checks the static object's `purchased:false`, rather than central purchase state.
- `WorldStats` tooltips claim trust affects quality and low trust crashes economy. No direct trust term exists in quality/economy formulas; a specific breach event can reduce economy. Entropy's actual gap test includes an additional threshold, effectively PU >2000+100*TU for nonnegative PU/TU, not simply >50*TU.
- **Historical prior ending UI:** `AscensionOverlay` bonus preview agreed with `ascend`, but both see TU after the 100-TU cost. It advertises a permanent boost even if `bonusLevel=0`; zero-level New Game+ is possible. Its comment says TU*10, while expression adds TU once.
- `Workstation::handleCleanClick` displays a reward if raw >=1; the engine rejects unless raw covers the full upgraded batch. Campaign yield counters count raw before storage loss and PU before prestige; they are not actual retained earnings.
- `index.html` references `/index.css` and `/vite.svg`; neither file exists in the snapshot. No runtime impact was measured.

## Suspicious behavior / validation needed

- **Mixed time bases:** central simulation is fixed-step interval timing, chat urgency uses wall time, and Data Flow motion/spawn rates use animation frames. Data Flow computes `dt` but does not use it. **Historical/fixed in P2:** Process Mining used animation frames and a 1000-point path advancing 2 horizontal pixels from 10% of viewport width; its target left ordinary screens while work continued, and only 999 positions could score against a denominator of 1000. The entire mechanic was replaced (`ProcessMiningGame::TraceAnalysisRound`).
- **Uncancelled work:** Pandas/SQL/Model success timeouts are not cleared on close. Their delayed `onClose` toggles a mode and can reopen a closed game. Pandas completion effect lacks an active guard, and a retained completed board may schedule a reward when a new board is opening. These unrelated lifecycle paths still need browser reproduction. **Historical/fixed in P2:** Process Mining animation depended on status rather than active, and its delayed completion timeout could fire after close. The replacement has neither scheduler nor completion timeout and unmounts the local round on close.
- **StrictMode and updater side effects:** `index.tsx` enables StrictMode. `addLog` schedules state updates from inside state updaters; Buzzword updates score within `setWords`, and ascension writes localStorage/reloads inside an updater. Development double invocation could duplicate side effects. Not validated at runtime.
- **No uniform bounds:** many quality/trust/relationship effects do not clamp; viral event can make TU negative until next simulation clamp. Economy can exceed 100. Action logs append while loop logs prepend; not all writes trim. Do not assume percentage or count invariants solely from `types.ts` comments.
- **Penalties/bonuses compound unevenly:** metricDelta already includes prestige/layoff factors, then PU/TU formulas multiply again. Dashboard/model terms are per tick rather than time-scaled; marketing raw bypasses both multipliers. Intent cannot be established from comments alone (`useGameEngine` main loop).
- **Tick snapshot boundary:** loop calculates from stateRef then merges into functional `prev`. Rapid action updates can be overwritten by absolute tick-derived assignments. Save hydration accepts malformed types/ranges and persisted UI flags; no migration/version check beyond key name.
- **Ambiguous words:** `BUZZWORDS_REAL` and `BUZZWORDS_FAKE` both include “Blockchain”; labeling can vary despite identical text. Shuffle via random sort is not uniform (`constants.ts`, Pandas/Buzzword).

## Scaffolding and randomness

`prestige.currency` has no spending action; stored `prestige.multiplier` is not the production authority; `worldStats.environment` and `startTime` have no normal gameplay update/use. Static `Upgrade.purchased`, `GameEvent.triggered`, optional `triggerText`, enum Models/Dashboards cost cases and unused imports/locals are partial scaffolding (`types.ts`, `constants.ts`, `useGameEngine`, components). Existing upgrades never price in Models/Dashboards; the generic resource fallback would charge metrics if such a definition were added.

Randomness has no seed or replay system: chats, rival mocks, market volatility/crashes, flavor logs, coffee characters, puzzle boards/data/paths/particles and cosmetic effects use `Math.random`. There is no general random event roll: `EVENTS` eligibility is deterministic and definition-ordered. CDN styling/fonts/import maps make the presentation externally dependent despite local game logic (`index.html`).

## P1 manual-playtest findings explicitly corrected (2026-10-04)

- **Confirmed UI layering bug — fixed.** WorldStats z10 and the later main grid z10 were sibling stacking contexts, so tooltip-local z50 could be hidden behind game panels. `components/WorldStats.tsx` now uses z20; App grid remains z10 and modal overlays z50. Chromium hover captures verify all five tooltips above the actual grid; modal hit testing verifies overlays still cover the bar. Existing tooltip factual discrepancies listed above were not changed.
- **Confirmed progression/design mismatch — corrected by explicit P1 authority.** S4/S5 previously left wave3 as indefinite human SQL review; there was no eventual automation threshold. `useGameEngine::acknowledgeAccelerationUpdate` now transfers routine work on the existing explicit S5 establishment. `arriveAIReview` supplies20-tick zero-reward automated throughput; historical reviews and manual Ad-Hoc SQL remain. `hydrateState` migrates coherent old later wave3 saves in place. This revises prior intended behavior rather than claiming the old code already automated.
- **Confirmed ending design trap — corrected by explicit P1 authority.** S16's intentional irreversible Govern route offered no New Game+ even after stabilization. `canRebootExpansion` now enables the dedicated confirmed reset after exact target/first-stabilization plus complete ending proof. `Workstation` replaces the dead deferred presentation with the available expansion exit, and solved `AccessMatrix` opens confirmation. Old Ascension remains deferred; unsolved governance has no exit. No recurring governance lifecycle was added.

These findings are distinct from the unchanged source-only suspicions and historical baseline discrepancies above. No additional runtime failure was reproduced during the scoped P1 smoke.


## Playtest correction P2 — Process Mining (2026-10-04)

### Confirmed playtest issues, now corrected

The user reproduced the old invisible/off-screen target, refresh-rate-dependent duration, unclear automatic completion and hidden work after closing. Those Process Mining observations above are historical. `components/ProcessMiningGame.tsx::TraceAnalysisRound` now uses six fixed cases per scenario, readable wait bars/route counts, two answers, immediate results and explicit once-only completion. The inactive wrapper unmounts the round; it contains no effects, timers, animation frames, canvas or viewport-derived game geometry. Unclaimed close pays nothing; fresh reopening has empty selections.

### Validation scope

`scripts/check-process-mining.cjs` checks all three datasets against their waits/routes, both required selections, 50/5–25/2–0/0 callback inputs, submit without payout, duplicate/stale claims, close/fresh round and absence of schedulers. It also compares the unchanged engine reward function with the original baseline and exercises prestige levels 0/3 with active/inactive meetings: scaled metrics/TU, TU×10×M meeting contribution, one log and no PU reward.

Isolated Chromium checks solve all three scenarios from displayed traces/waits through the real workstation/save path. Responsive checks at 1920×1080, 1280×800 and 1024×768 cover evidence, pinned map, questions, bottom submit, results, explicit completion, close/reopen and all reward outcomes. Temporary screenshots are visually inspected; user saves are untouched. These checks do not exhaustively play other minigames or expansion progression.

### Build/tooling and remaining suspicions

Build and TypeScript check pass. Existing missing `/index.css` and large-chunk warnings remain. No new runtime issue was observed within this scope. Other minigame lifecycle suspicions remain unmodified and unreproduced by P2.


## Playtest correction P3 — Spaghetti value normalization (2026-10-04)

### Confirmed clarity issue, corrected

User playtesting found the anonymous corrupt-stream curves and invisible midpoint hover did not communicate what data was dirty or what cleaning changed. `SpaghettiOverlay::CleanupSession` replaces that interaction with six visible values and explicit target rules. Tangled colourful record connections straighten to green only on correct normalization. Twelve fixed safe cases form two batches; values remain separate from the unchanged Pandas header-mapping activity. The original >=7 Raw UI margin is replaced with the exact >=5 contract and a synchronous local reservation against rapid clicks. Engine cost/reward/meeting/prestige logic is unchanged.

### Scoped validation

`scripts/check-spaghetti-cleaning.cjs` checks twelve unambiguous normalizations, two six-record batches, wrong/no-payout feedback, once-only5/5/25 callbacks, no bonus, exact-five/insufficient/refilled Raw and rapid-click protection, stale/closed handlers, fresh rounds and no gameplay scheduler. It verifies Pandas source unchanged and the original engine reward block unchanged, including level0/3 scaling, meeting contribution and insufficient-Raw rejection.

Isolated Chromium solves two batches from visible raw values/target hints at 1920×1080,1280×800,1024×768; validates the Spreadsheet Software gate, resource outcomes, visible straight-green clean state, all six rows and bottom actions, explicit loading, fresh close/reopen and exact-five rapid clicks. Screenshots are visually inspected. No new runtime/console error was observed; build/typecheck pass with existing missing `/index.css` and large-chunk warnings. Other minigame lifecycle suspicions remain unchanged. The central engine's previously documented tick snapshot boundary is not redesigned by this UI pass.


## Original Omniscience finale replacement (2026-10-04)

Explicit user authority replaces the original ascension screen, not the later AI rollout/governance ending. `AscensionOverlay::OmniscienceFinale` now has authored deployment status/zero-task copy, the book passage and a single READ action, then THE ANALYST COMPLETE. Workstation's original entry says DEPLOY and no longer promises a reset. The legacy ascension/reset actions are retained but disconnected from this original screen. Purchase cost, saved `isAscending` flag, end-screen pause, G1 and expansion role/NG+ paths are unchanged.

READ only changes local presentation state and is reset on reload; no completed-run history/flag is added. Authored ending statements do not certify resource thresholds or implement new automation/incident-monitoring rules. In particular the dashboard line is narrative while the original main-loop pause remains. Scoped Chromium verifies the real purchase/READ path, exact copy, one/no buttons, no central reward/reset/state mutation, saved-ending reload and all three desktop sizes; no runtime/console error observed. Existing build warnings remain.


## Confirmed Omniscience integration bug — corrected (2026-10-04)

The quiet finale's previous smoke validated only an authored pre-expansion100TU purchase. Actual expanded runs retained permanent `isAscensionDeferred` and replaced the primary entry with NG+ even after stabilization, leaving the new book finale unreachable through that path. Source and user playtesting confirmed the mismatch.

Explicit correction requires a prior NG+ and current-run stabilized governance. `canCompleteOmniscience` derives that proof; Workstation has separate DEPLOY OMNISCIENCE and NEW GAME+ controls, consistent upgrade-list guards and explicit prerequisite/cost copy.100TU cost/activity guard remain; no progression authority is falsified. First-run and early score-only entries are intentionally locked under the new user requirement.

Full S0–S16/P1 regression checks cover prerequisites/malformed or missing proof, no early shortcut, positive-link and exact matrix,100TU, all activity blockers, once-only purchase, retained evidence and legacy loaded ending/reset. Chromium performs an actual first-run NG+ reset, then uses authored second-run executive evidence and the game's own board initialization/15-click solve to reach DEPLOY→READ→COMPLETE at1920×1080,1280×800,1024×768. Solved reload retains eligibility;99TU disables only deployment. No runtime/console error observed; build/typecheck pass with existing bundle warning. This is scoped boundary validation, not two exhaustive campaign playthroughs. A wrong hand-authored browser scramble was replaced with actual board creation; no production workaround.
