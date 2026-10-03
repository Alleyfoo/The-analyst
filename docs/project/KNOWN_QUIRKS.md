# Known quirks — preserved

The original findings below are from baseline source inspection. “Confirmed” in those sections means the branch/contradiction follows directly from code. A subsequent minimal runtime smoke check is recorded separately below; it was not a gameplay playthrough. Nothing here was fixed.

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
4. **Ending cannot be reopened after returning to sandbox.** `purchaseUpgrade` marks `project_omniscience` bought before opening ending. `cancelAscension` clears only `isAscending`; future purchases return unchanged because it is already bought. Workstation can later show an ASCEND button that invokes the same rejected purchase. A save/reload preserves this condition.
5. **Zero-tick coffee cooldown lost on load.** `hydrateState` uses `parsed.lastCoffeeTick || -9999`. A first coffee at tick zero is valid but is restored as no recent coffee, permitting another immediately.
6. **Delayed chat effects overwrite same-tick production.** The main interval evaluates `response.effect(current)` and spreads `stateDeltaFromTask` after computed changes. For example a task writing `pu:current.pu+50` replaces the tick's PU production/penalty; nested `worldStats` effects replace that tick's drift/entropy calculation too. This follows assignment order, not an inferred race.

## Confirmed description/code discrepancies

- `README.md` tells users to set a Gemini API key. `vite.config.ts` substitutes `process.env.API_KEY` and `process.env.GEMINI_API_KEY`, but no game source calls either or a model API. “AI Analyst” is local curve-fitting code in `ModelTrainingGame`, not a remote AI service. The README was preserved.
- `constants.ts::neural_interface` says manual actions are 5x effective. `manualClean` adds 20 to its batch; `manualAnalyze` gets no neural bonus. `segmentation` advertises increased PU but only lowers quality. Data Scientist's description suggests model generation; its effect adds exactly one model at purchase.
- Market copy says “Reach 500 PU” (`Workstation`), while the engine requires >500. Purchased upgrades may disappear when visibility thresholds drop because `checkUpgradeVisibility` checks the static object's `purchased:false`, rather than central purchase state.
- `WorldStats` tooltips claim trust affects quality and low trust crashes economy. No direct trust term exists in quality/economy formulas; a specific breach event can reduce economy. Entropy's actual gap test includes an additional threshold, effectively PU >2000+100*TU for nonnegative PU/TU, not simply >50*TU.
- `AscensionOverlay` bonus preview agrees with `ascend`, but both see TU after the 100-TU cost. It advertises a permanent boost even if `bonusLevel=0`; zero-level New Game+ is possible. Its comment says TU*10, while expression adds TU once.
- `Workstation::handleCleanClick` displays a reward if raw >=1; the engine rejects unless raw covers the full upgraded batch. Campaign yield counters count raw before storage loss and PU before prestige; they are not actual retained earnings.
- `index.html` references `/index.css` and `/vite.svg`; neither file exists in the snapshot. No runtime impact was measured.

## Suspicious behavior / validation needed

- **Mixed time bases:** central simulation is fixed-step interval timing, chat urgency uses wall time, Process Mining and Data Flow motion/spawn rates use animation frames. Data Flow computes `dt` but does not use it. Process path advances 2 horizontal pixels for 1000 points starting at 10% of viewport width, so its end leaves ordinary-width screens; only 999 positions can score while denominator is 1000. Check actual viewport/playability before changing this (`ProcessMiningGame` generation/animation effects).
- **Uncancelled work:** Pandas/SQL/Model/Process success timeouts are not cleared on close. Their delayed `onClose` toggles a mode and can reopen a closed game. Process animation effect depends on status, not active, so closing while running does not directly cancel its animation. Pandas completion effect lacks an active guard, and a retained completed board may schedule a reward when a new board is opening. These lifecycle paths need browser reproduction.
- **StrictMode and updater side effects:** `index.tsx` enables StrictMode. `addLog` schedules state updates from inside state updaters; Buzzword updates score within `setWords`, and ascension writes localStorage/reloads inside an updater. Development double invocation could duplicate side effects. Not validated at runtime.
- **No uniform bounds:** many quality/trust/relationship effects do not clamp; viral event can make TU negative until next simulation clamp. Economy can exceed 100. Action logs append while loop logs prepend; not all writes trim. Do not assume percentage or count invariants solely from `types.ts` comments.
- **Penalties/bonuses compound unevenly:** metricDelta already includes prestige/layoff factors, then PU/TU formulas multiply again. Dashboard/model terms are per tick rather than time-scaled; marketing raw bypasses both multipliers. Intent cannot be established from comments alone (`useGameEngine` main loop).
- **Tick snapshot boundary:** loop calculates from stateRef then merges into functional `prev`. Rapid action updates can be overwritten by absolute tick-derived assignments. Save hydration accepts malformed types/ranges and persisted UI flags; no migration/version check beyond key name.
- **Ambiguous words:** `BUZZWORDS_REAL` and `BUZZWORDS_FAKE` both include “Blockchain”; labeling can vary despite identical text. Shuffle via random sort is not uniform (`constants.ts`, Pandas/Buzzword).

## Scaffolding and randomness

`prestige.currency` has no spending action; stored `prestige.multiplier` is not the production authority; `worldStats.environment` and `startTime` have no normal gameplay update/use. Static `Upgrade.purchased`, `GameEvent.triggered`, optional `triggerText`, enum Models/Dashboards cost cases and unused imports/locals are partial scaffolding (`types.ts`, `constants.ts`, `useGameEngine`, components). Existing upgrades never price in Models/Dashboards; the generic resource fallback would charge metrics if such a definition were added.

Randomness has no seed or replay system: chats, rival mocks, market volatility/crashes, flavor logs, coffee characters, puzzle boards/data/paths/particles and cosmetic effects use `Math.random`. There is no general random event roll: `EVENTS` eligibility is deterministic and definition-ordered. CDN styling/fonts/import maps make the presentation externally dependent despite local game logic (`index.html`).
