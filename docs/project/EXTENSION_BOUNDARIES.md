# Existing extension boundaries

This is a seam inventory for later second-act work, **not** an expansion design. Preserve baseline commit `1263845279e9afd65ac05a6a1ac809e9bc70ee3c` as the comparison point. S0 implements persisted progression; S1 adds only an organisational introduction using that authority. No AI task behavior or outer wrapper exists.

| Existing seam | What it permits examining later | Boundary to preserve |
| --- | --- | --- |
| `App.tsx::App` composition | An outer campaign/era controller could select which experience is displayed | Today App owns one hook and always mounts the original UI. Unmounting it stops its timers; hiding it does not. No wrapper/controller currently exists. |
| `types.ts::GameState`, `INITIAL_STATE`; `useGameEngine::hydrateState` | S0 stores `expansionProgress` centrally, defaulting to analyst/null for fresh/legacy saves | No scores infer era. Existing `Campaign` still means marketing ads. Reset/ascend rebuild INITIAL_STATE, so future expansion preservation/reset rules still need decisions. |
| `constants.ts::UPGRADES`, `EVENTS`, `CHAT_SCENARIOS` | New definitions using existing effect/callback shapes | IDs determine save hydration and event history; preserve old IDs/effects. Event priority is array order and only one is offered. These are not an existing campaign graph. |
| `checkUpgradeVisibility`, `Workstation` purchase/minigame gates | A later additional visibility layer around unchanged baseline rules | Visibility is not enforced in purchase/toggle actions themselves. Avoid treating UI gates as a complete rules boundary or silently fixing circular unlocks during extension. |
| `useGameEngine` returned action facade; `App` minigame callback wiring | Central progression boundary now offers S1 and exposes only `advancePilotIntroduction(expectedStep)` to its presentation | Generic start/establish actions are not passed to UI. Local puzzle state remains outside the central save. Existing rewards, multipliers and meeting progress are preserved. |
| `project_omniscience` effect; `AscensionOverlay` callbacks; `ascend`/`cancelAscension` | A concrete ending checkpoint where a later transition could be considered | Current purchase spends 100 TU, sets a one-shot purchase flag and freezes the loop; actual NG+ destroys ordinary run state. There is no completed-act record or second-act launch action. |
| `SAVE_KEY`, autosave, hydration and immediate ascension save | Central persistence boundary for any future campaign state | Full state serialization, function reattachment by IDs, and reboot/reload behavior must remain compatible. No schema validation or migration framework exists. |

## Can an explicit campaign/era state wrap this game?

Technically plausible, based on App's single composition root and the hook's action/state interface. This is an inference about a later change, not implemented functionality. A wrapper would need to define lifecycle/persistence ownership, what triggers transition, whether baseline simulation continues, and whether prestige is inside or outside the era. None of these questions has an existing answer in code.

S0 selects a nested central persistence location for the small authority object, not an outer store or second engine. S1 adds purchase-based eligibility and two guarded narrative acknowledgements. `beginExpansionTransition` refuses replacement; `establishExpansionEra` requires its target to match and currently refuses `ai_pilot`. No arbitrary state/era setter is exposed to UI. Actual pilot completion evidence and subsequent sequence rules require later work.

Hydration preserves unknown save fields and restores missing defaults. Whole-state autosave remains the only mechanism. INITIAL_STATE naturally supplies analyst/null on existing reset reconstruction; no reset/ascension function was edited. S1 adds visible management updates, but no production formula, upgrade gate, minigame reward, meeting, chat, baseline event or market behavior changed.

S1 eligibility: `constants.ts::isAIPilotEligible` requires purchased Python ETL Scripts, SQL Indexing and Local Server Rack. Their existing gates/costs are reachable without the known circular branches. The engine starts `analyst -> ai_pilot / automation_recognized`; acknowledgement sets the short bridge era `automation` and `pilot_announced`; pilot approval sets `pilot_ready`, still targeting `ai_pilot`. See [STATE_MODEL](STATE_MODEL.md) for exact state/steps and persistence. This does not create a replacement automation chapter.

`components/AIPilotIntroduction.tsx` is a narrow presentation seam, separate from baseline `EVENTS`/history/effect-on-dismiss. `App` handles local open/close; `Workstation` supplies an opt-in review button and eventual pilot-ready notice. Engine-derived availability suppresses it around original overlays/minigames; deferral does not lose the saved step. Later work can connect an existing task at `pilot_ready`, but S1 supplies no task acceleration or result callback change.

**Unresolved ending collision (source-confirmed, preserved):** OMNISCIENCE remains buyable during a pending introduction or pilot-ready state. Its unchanged effect opens ascension and freezes production; S1 then suppresses its dialog. Return to Sandbox can resume the saved introduction, while New Game+ reconstructs INITIAL_STATE and discards it. Factory reset also discards it. S1 imposes no ascension gate and does not fix the baseline ending re-entry quirk. A dedicated work order must reconcile this before later expansion consequences matter.

The main interval assumes one global economy, one rival, one meeting schedule and one upgrade set. Inserting era-specific calculations throughout it would cross more baseline boundaries than an outer lifecycle seam. `isAscending` is an existing pause/ending gate, not a general campaign state. `prestige.level` measures accumulated production power, not chronological era.

Before later work, retain source-based baseline documentation and explicitly decide whether quirks in [KNOWN_QUIRKS.md](KNOWN_QUIRKS.md) remain part of compatibility. No AI-provider, agent-service or second-act gameplay design is proposed here.
