# Current system

## Runtime and entry points

The Analyst is a client-side incremental game implemented in TypeScript and React 19, served/bundled by Vite. There is no backend, Python runtime, real database, real OCR or model service in this snapshot. `package.json` declares React DOM, Framer Motion, Recharts, Lucide and clsx; `tsconfig.json` configures JSX and type checking without output.

`index.html` supplies `#root`, inline styling, Tailwind's CDN script, Google Fonts, an AI Studio CDN import map and the module entry `/index.tsx`. `index.tsx` mounts `App` inside `React.StrictMode`. `vite.config.ts` sets port 3000, host `0.0.0.0`, the React plugin, `@` alias and Gemini environment substitutions. Those substitutions have no application consumer; see [KNOWN_QUIRKS.md](KNOWN_QUIRKS.md). `metadata.json` contains descriptive AI Studio metadata, not game rules.

## Components and ownership

`App.tsx::App` calls `hooks/useGameEngine.ts::useGameEngine` once and wires `state` and `actions` into the UI. No router, context store or external state library is present.

| Source | Role |
| --- | --- |
| `types.ts::GameState`, `INITIAL_STATE` | Central shape and initial values |
| `constants.ts::UPGRADES`, `EVENTS`, `CHAT_SCENARIOS`, `checkUpgradeVisibility` | Static definitions, effects and visibility rules |
| `components/Workstation.tsx::Workstation` | Ops, upgrades, market, ads, terminal and reset controls; owns selected tab and floating text |
| `components/DataStream.tsx::DataStream` | Raw buffer, base inflow and overflow display; local boot animation |
| `components/DashboardPanel.tsx::DashboardPanel` | Resources, rival, campaign and history charts; derived display values |
| `components/WorldStats.tsx::WorldStats`, `EntropyLayer.tsx::EntropyLayer` | Scores/world indicators and visual effects |
| `components/TeamComms.tsx::TeamComms`, `EventModal.tsx::EventModal` | Response selection and event acknowledgement |
| `components/BoardMeetingOverlay.tsx`, `TaskBusyOverlay.tsx`, `CoffeeBreakOverlay.tsx`, `AscensionOverlay.tsx` | Present central meeting/task/social/ending state and relevant callbacks |
| Eight minigame components named in [GAMEPLAY_MAP.md](GAMEPLAY_MAP.md) | Local puzzle/animation state; result callbacks into the engine |

The hook's React `state` is the game. `stateRef` mirrors it for timer callbacks. `isRebooting` is separate hook-local UI state. Minigame boards, canvas refs, timers and scores are component-local; they are not part of the central save.

## Main update loop

`useGameEngine` has a `setInterval` effect using `constants.ts::TICK_RATE_MS = 200` (nominally five ticks/second). It skips updates during reboot or `isAscending`. Other overlays, meetings and blocking tasks do **not** pause simulation. It advances one fixed tick per callback, without elapsed-time catch-up or offline earnings.

In source order it:

1. Calculates restructuring and prestige multipliers; produces campaign raw/PU yields and decrements campaign lifetimes.
2. Adds base raw inflow, consumes existing raw into clean data and existing clean into metrics, caps raw storage and calculates packet loss.
3. Recalculates complexity/observability, PU/TU, entropy and economy drift.
4. Marks wall-clock-aged chats urgent, subtracts their PU penalties, grows/spawns Eric and randomly spawns regular chats.
5. Unlocks and updates stock pricing; starts/advances/resolves meetings.
6. Selects at most one eligible untriggered event when none is open, samples chart history, completes blocking tasks and generates logs.
7. Applies a `setState` update, with delayed task effect fields spread **last**.

Rates and formulas are documented in [GAMEPLAY_MAP.md](GAMEPLAY_MAP.md). Scheduling uses simulated ticks except chat urgency (`Date.now`), minigame wall-clock timers, animation frames and reboot delays. Browser timer throttling therefore changes real-time pacing.

## Saving and loading

`useGameEngine` reads JSON from localStorage key `the_analyst_save_v1` in its initial state initializer; parse/load exceptions fall back to `INITIAL_STATE`. `hydrateState` overlays saved fields on defaults and selectively merges nested objects. It restores active event functions by ID from `EVENTS` and chat responses by `scenarioId` from `CHAT_SCENARIOS`; unknown definitions are dropped.

A second interval writes `JSON.stringify(stateRef.current)` every two seconds unless rebooting. It saves the entire central state, including overlays and histories. Function properties disappear in JSON. There is no manual save/export, unload flush, schema validation, numbered migration or server/cloud persistence. Errors are logged to the console.

`hardReset` waits two seconds, removes this one key and reloads the page. `ascend` waits three seconds, constructs a fresh `INITIAL_STATE` with accumulated prestige and initial entropy adjustment, writes it immediately and reloads. See `useGameEngine::ascend` and [STATE_MODEL.md](STATE_MODEL.md).

## Minigame integration

`App` keeps the eight minigame components mounted with `active` flags. Each generates its own board and calls `onComplete` (Spaghetti uses incremental `onClean`). App connects these to `complete*`/`cleanSpaghettiStrand` actions in the hook. The hook applies the real rewards, resource checks, clamps and meeting contributions; component copy alone is not authoritative. Mode toggles generally reject while a blocking task exists. Results are not automatically a chapter transition. Active mode flags survive saves but local puzzle progress does not.

## Desktop layout correction — current presentation (2026-10-04)

`App.tsx` retains the 3/5/4 grid but now composes compact `DataStream`, `WorkstationNavigation` and selected `Workstation` content in the left column. `OperationsStatus` presents the existing expansion/status JSX in the center, independently scrollable; `DashboardPanel` remains on the right unchanged. App owns the single local `activeWorkstationTab`; navigation and content share it. Tab scrolls use bounded flex/absolute containers with min-h-0, and narrow-column controls stack responsively. No engine, guard, reward, timer or persistence change accompanies this extraction. Topbar z20/main grid z10/modal z50 ordering is retained.


## Original Omniscience finale — current presentation (2026-10-04)

`App` now passes only `active={state.isAscending}` to `AscensionOverlay`. Its inner `OmniscienceFinale` presents authored deployment status/book copy and one READ button, then THE ANALYST COMPLETE. It has no timer, automatic close, reward, reset or engine callback. READ is local/unsaved; inactive unmounts the finale and reload of a saved `isAscending` ending shows READ again. The main-loop pause and original purchase/G1 authority remain unchanged. Legacy engine `ascend`/`cancelAscension` are retained but no longer presented here. `ExpansionEnding`/`AccessMatrix` and their dedicated confirmed NG+ are separate and unchanged. Earlier descriptions of original-screen NG+/Sandbox choices are historical.
