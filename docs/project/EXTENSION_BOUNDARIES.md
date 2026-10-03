# Existing extension boundaries

This is a seam inventory for later second-act work, **not** an expansion design. Preserve baseline commit `1263845279e9afd65ac05a6a1ac809e9bc70ee3c` as the comparison point. S0 now implements only the small persisted progression object and unused engine actions described below; no expansion gameplay or wrapper exists.

| Existing seam | What it permits examining later | Boundary to preserve |
| --- | --- | --- |
| `App.tsx::App` composition | An outer campaign/era controller could select which experience is displayed | Today App owns one hook and always mounts the original UI. Unmounting it stops its timers; hiding it does not. No wrapper/controller currently exists. |
| `types.ts::GameState`, `INITIAL_STATE`; `useGameEngine::hydrateState` | S0 stores `expansionProgress` centrally, defaulting to analyst/null for fresh/legacy saves | No scores infer era. Existing `Campaign` still means marketing ads. Reset/ascend rebuild INITIAL_STATE, so future expansion preservation/reset rules still need decisions. |
| `constants.ts::UPGRADES`, `EVENTS`, `CHAT_SCENARIOS` | New definitions using existing effect/callback shapes | IDs determine save hydration and event history; preserve old IDs/effects. Event priority is array order and only one is offered. These are not an existing campaign graph. |
| `checkUpgradeVisibility`, `Workstation` purchase/minigame gates | A later additional visibility layer around unchanged baseline rules | Visibility is not enforced in purchase/toggle actions themselves. Avoid treating UI gates as a complete rules boundary or silently fixing circular unlocks during extension. |
| `useGameEngine` returned action facade; `App` minigame callback wiring | S0 provides unused `beginExpansionTransition` and `establishExpansionEra` actions as the sole explicit progression boundary | Neither is wired to UI/gameplay. Local puzzle state is outside the central save. Existing rewards, multipliers and meeting progress are preserved. |
| `project_omniscience` effect; `AscensionOverlay` callbacks; `ascend`/`cancelAscension` | A concrete ending checkpoint where a later transition could be considered | Current purchase spends 100 TU, sets a one-shot purchase flag and freezes the loop; actual NG+ destroys ordinary run state. There is no completed-act record or second-act launch action. |
| `SAVE_KEY`, autosave, hydration and immediate ascension save | Central persistence boundary for any future campaign state | Full state serialization, function reattachment by IDs, and reboot/reload behavior must remain compatible. No schema validation or migration framework exists. |

## Can an explicit campaign/era state wrap this game?

Technically plausible, based on App's single composition root and the hook's action/state interface. This is an inference about a later change, not implemented functionality. A wrapper would need to define lifecycle/persistence ownership, what triggers transition, whether baseline simulation continues, and whether prestige is inside or outside the era. None of these questions has an existing answer in code.

S0 selects a nested central persistence location for the small authority object, not an outer store or second engine. `beginExpansionTransition` refuses replacement of a pending transition; `establishExpansionEra` requires its target to match. Step strings are stored metadata only: there are no transition events, eligibility thresholds, sequence advancement, completion evidence or era ordering rules yet. Future work must implement those decisions at this boundary. No arbitrary state/era setter is exposed to UI components.

Hydration preserves unknown save fields, restores missing defaults and accepts valid era/transition data without deriving progression from other state. Whole-state autosave remains the only mechanism. INITIAL_STATE naturally supplies analyst/null on existing reset reconstruction; no reset/ascension function was edited. No visible era indicator, production formula, upgrade gate, minigame reward, meeting, chat, event or market behavior changed.

The main interval assumes one global economy, one rival, one meeting schedule and one upgrade set. Inserting era-specific calculations throughout it would cross more baseline boundaries than an outer lifecycle seam. `isAscending` is an existing pause/ending gate, not a general campaign state. `prestige.level` measures accumulated production power, not chronological era.

Before later work, retain source-based baseline documentation and explicitly decide whether quirks in [KNOWN_QUIRKS.md](KNOWN_QUIRKS.md) remain part of compatibility. No AI-provider, agent-service or second-act gameplay design is proposed here.
