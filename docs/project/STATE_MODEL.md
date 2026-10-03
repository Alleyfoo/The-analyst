# Central state model

This inventory covers every `types.ts::GameState` field. Initial values come from `types.ts::INITIAL_STATE`; writes come from `hooks/useGameEngine.ts::useGameEngine` actions/update loop and `constants.ts` effects. All fields below are serialized to `the_analyst_save_v1`, even derived values. Persistence does not imply validation or an invariant enforced on every write.

S0 added persisted expansion progression infrastructure, S1 introduced the organisational handoff, and S2 adds one assistive SQL trial and positive feedback. Original resource/update rules remain unchanged; increased demand is not implemented. The design authority remains [AI_EXPANSION.md](../design/AI_EXPANSION.md), whose baseline evidence describes the pre-S0 snapshot.

| Purpose | Fields and initial values | Meaning / writers |
| --- | --- | --- |
| Expansion progression (S0/S1/S2) | `expansionProgress={era:'analyst',transition:null}` | Persisted `ExpansionProgress`: `era: ExpansionEra`; `transition: null \| {targetEra: ExpansionEra, step: string}`. Engine owns introductions, assisted SQL completion and positive feedback. Scores never establish an era. |
| Resources | `rawData=100`, `maxStorage=500`, `cleanData=0`, `metrics=0`, `dashboards=0`, `models=0` | Raw buffer/capacity, processed buffer, accumulated metrics and installed output counts. Production, manual/minigame actions, upgrades, chat/events and coffee alter them. Only raw has a real capacity. |
| Scores and quality | `pu=0`, `tu=10`, `metricQuality=0.5` | Perceived/true understanding and TU production quality factor. PU/TU are both progression inputs and spendable resources. Quality is mutable, not recomputed; not universally clamped to 0..1. |
| Base rates | `rawDataRate=2`, `cleanDataRate=0`, `metricRate=0` | Stored per-second base throughput, changed by upgrades. They exclude marketing, prestige and temporary meeting penalties; not derived from purchase records on load. |
| Derived health | `complexity=10`, `observability=100`, `packetLoss=0` | Recomputed each simulation tick. Complexity from installed output/rates; observability from complexity; packet loss from discarded inflow. Initial observability differs from the first computed value. |
| Minigame gates | `spaghettiMode`, `pandasMode`, `sqlMode`, `modelMode`, `miningMode`, `flowMode`, `buzzwordMode`, `pdfMode`, all `false` | Overlay activation flags, toggles and Eric challenge effects. These are not puzzle progress or unlock flags. |
| World | `worldStats={economy:50,socialTrust:50,environment:50,entropy:0}` | Economy drifts toward a TU-dependent target; trust changes through selected effects; entropy changes through simulation/effects. Environment has no gameplay writer beyond initialization/hydration/reset. |
| Market | `market={unlocked:false,stockPrice:10,ownedShares:0,history:[],lastPriceDelta:0}` | Permanent-in-run unlock flag, mutable price and owned quantity. History entries `{tick,price,trueValue}` keep 30 samples; price delta and true-value samples are derived/stored. Buy/sell change PU/shares. |
| Clock | `tick=0`, `startTime=Date.now()` | Tick drives meetings, tasks, campaigns and coffee cooldown. `startTime` is saved but not used for offline progression; initial timestamp is evaluated when the module loads. |
| Logging | `logs=[initial system message]` | Entries `{id,text,type,timestamp}`. Loop/addLog usually trim to 100; several actions append without trimming. Mixed ordering. |
| Chats | `activeChats=[]` | Entries `{id,scenarioId,sender,message,responses,timestamp,isUrgent}`. Responses carry label/description/type/effect/optional task duration. Functions restored from static scenario definitions on hydration. |
| Meeting | `boardMeeting={active:false,target:0,progress:0,timeRemaining:0,penaltyEndTime:0}` | Progress/seconds count; penalty expiration is a tick. Loop and specific manual/minigame actions update progress. |
| Blocking task | `blockingTask=null` | When active: `{name,startTick,durationTicks,chatId,responseIndex}`. Stores a pending response reference, not a captured effect or task function. Effect evaluates current state when completed. |
| Purchases | `upgrades={}` | ID-to-boolean record used by purchase guards and feature gates. Static `Upgrade.visible/purchased` are definition scaffolding, not updated purchase state. |
| Events | `activeEvents=[]`, `eventHistory=[]` | Active definition objects with condition/effect functions; IDs recorded when offered, not when acknowledged. `dismissEvent` applies effect. Static `triggered` flag is not used to enforce once-only behavior. |
| Marketing | `activeCampaigns=[]` | Each `{id,name,type,duration,timeLeft,cost,effectiveness,generatedRaw,generatedPU}`. `type` is email/social/influencer/tv, not a narrative campaign. Lifetimes in ticks; counters record pre-prestige yields, not storage-accepted raw. Expired campaigns are discarded. |
| Prestige / ending | `prestige={level:0,currency:0,multiplier:1,timestamp:0}`, `isAscending=false` | Ascension accumulates level and Insight currency; stores multiplier and date. Runtime production recomputes multiplier from level. Currency has no spender. `isAscending` freezes main simulation and opens ending UI. |
| Rival | `rival={active:false,name:'10x Engineer Eric',cleanData:0,metrics:0,lastMockTick:0}` | Automated competitor totals and mock cooldown; Buzzword claims transfer clean data. |
| Relationships | `relationships={}`, `lastCoffeeTick=-9999` | Sender scores change on chat choices/Buzzword claims; no enforced -100..100 clamp despite type comment. Coffee uses tick cooldown. |
| Coffee | `coffeeBreak={active:false,character:'',mood:'neutral',dialogue:'',effectDescription:''}` | Chosen encounter presentation; reward/penalty already applied on start. Closing changes only active flag. |
| Chart history | `history=[]` | Entries `{tick,pu,tu,revenue}`; 50 samples. Revenue is `economy*1000`, a display projection, not spendable income. |

## Derived versus persistent

The source does not separate a save schema from runtime state. Complexity, observability, packet loss, price deltas and chart snapshots are derived **and** persisted. World economy and entropy are evolved accumulators. Rates and resource totals persist directly rather than being rebuilt from `upgrades`. `prestige.multiplier` duplicates a derived expression but the engine uses `1 + level*0.1` instead (`useGameEngine` main interval and reward actions).

Transient unsaved values include `stateRef`, hook-local `isRebooting`, App's `pilotOpen`, Workstation tab/floating messages, TeamComms open state, DataStream boot state and all minigame local scores/boards/canvas data. S2's engine attempt ID/sequence refs and SQL draft/preparation/timer refs are unsaved. Engine-returned `pilotIntroduction` and `sqlPilotAvailable` are derived, not saved fields. `DashboardPanel` computes funnel impressions as `rawData*10` and campaign totals from active campaigns; these are UI derivations, not central fields.

## localStorage boundary

The sole localStorage key and all read/write/remove sites are in `hooks/useGameEngine.ts`: initializer read, two-second autosave write, `ascend` immediate write and `hardReset` removal. No source writes API configuration or independent component settings to localStorage. Hydration preserves unknown top-level JSON fields by spreading `parsed`; it restores selected nested defaults/functions and does not validate existing numeric ranges. S1 uses the era/transition object below; there is no save version field or completed-run history.

## Expansion progression authority (S0/S1/S2)

`types.ts::EXPANSION_ERAS` defines `analyst`, `automation`, `ai_pilot`, `acceleration`, `connected_enterprise`, `good_enough`, `lightspeed`, and `governance_crisis`; `ExpansionEra` derives its union from that list. `ExpansionProgress` contains only `era` and `transition`. No counters, thresholds, Velocity, demand, verification, permissions or provenance fields were introduced.

`hydrateState` merges default progression with saved fields. A missing or unsupported era defaults to `analyst`, regardless of PU/TU, prestige, upgrades or tick. Missing/null transition defaults to null; incomplete/invalid transitions are discarded unless they contain a known `targetEra` and string `step`. Valid transition objects and unknown saved progression fields are preserved. This validation is confined to the new object; it is not a general migration framework and does not repair existing hydration quirks.

`useGameEngine::beginExpansionTransition(targetEra, step)` refuses a same-era target, blank step or replacement of a pending transition. S1 restricts `ai_pilot` starts to eligible analysts at `automation_recognized`. `establishExpansionEra(targetEra)` requires a matching pending target, then commits that era and clears the transition; it still refuses `ai_pilot` because increased demand and consequence have not occurred. Neither generic action is passed to UI. `advancePilotIntroduction(expectedStep)` guards against stale/double acknowledgements and active baseline overlays; S2 adds the narrow SQL attempt/completion actions described below.

The existing whole-state autosave serializes progression without changing the save key. Existing ascension/factory-reset functions were untouched; reconstruction from INITIAL_STATE naturally returns progression to analyst/null. There is no new reset gate or prestige preservation rule for expansion.

S0 validation: npm ci/build/lint passed. Isolated browser smoke passed fresh autosave/reload, ordinary and high-score legacy saves, partial objects, valid future transitions, invalid-era fallback and unknown-field preservation. A temporary deterministic hook/timer harness compared original baseline fresh state plus 20 ticks and found exact equality excluding only progression; it also checked guarded actions. This is limited validation, not an exhaustive gameplay regression suite.

## AI pilot introduction (S1)

Eligibility is exactly three true purchase flags: `pandas_scripts`, `sql_optimization`, `local_server` (`constants.ts::isAIPilotEligible`). These establish existing pipeline/query/storage investment, without new usage counters or claims that minigames were completed. Python ETL costs 50 PU and appears at raw >200; SQL costs 200 PU at clean >500; server costs 150 PU at raw >450 (`UPGRADES`, `checkUpgradeVisibility`). All are reachable through ordinary Act I cleaning/inflow/storage and scripts/mapping. No model, KPI, segmentation, ending or score threshold is required; no upgrade was rebalanced.

`useGameEngine` offers the transition when eligible with `era='analyst'` and no pending transition. `types.ts::AI_PILOT_STEPS` supplies stable identifiers:

| Step | Era | Explicit player acknowledgement |
| --- | --- | --- |
| `automation_recognized` | `analyst` | Recognize existing automation, advance to `automation` / `pilot_announced` |
| `pilot_announced` | `automation` | Acknowledge approved enterprise trial, advance to `pilot_ready` |
| `pilot_ready` | `automation` | S1 end state; S2 now offers the SQL trial, no era establishment |
| `pilot_success` | `automation` | Successful assisted SQL execution; review positive feedback to advance |
| `demand_pending` | `automation` | S2 end state; target remains `ai_pilot`, no increased demand/establishment |

Steps use the existing two-second whole-state autosave. Reload restores the saved step and leaves its dialog closed; unsaved acknowledgements within the ordinary autosave window may be repeated. Unknown valid future step strings remain preserved by hydration but are not presented as S1 content. High-score legacy saves default to analyst; an eligible legacy purchase combination offers recognition, never skips the narrative.

UI entry: `Workstation` shows a management-update button across tabs, using engine-derived `pilotIntroduction`; `App` opens `AIPilotIntroduction` only on request. “Later” closes presentation without clearing progression. The engine disables presentation/advancement during any minigame, coffee, meeting, baseline event, blocking task, ascension or reboot. A new blocker closes the dialog; the same step can be reopened afterward. Baseline `EVENTS`, `eventHistory`, effects and simulation continue unchanged. Pilot-ready now points to SQL; pilot-success offers “Review pilot result”; demand-pending states Operations is preparing more work, with current workload unchanged. No AI reward bonus, Velocity or increased demand exists.

Focused validation: `node scripts/check-ai-pilot.cjs` uses installed TypeScript and Node with stubbed hooks/timers; browser smoke covers actual UI, saves and reloads. It is not an exhaustive baseline gameplay suite.

## First assistive SQL trial (S2)

`useGameEngine::isSQLPilotReady` derives availability only at `automation / ai_pilot / pilot_ready`. Open the unchanged Workstation SQL activity normally. `SQLMiningGame` captures availability at window opening and exposes USE AI PILOT only for that trial. Its 700 ms local timer copies the current existing `REQUESTS[].required` solution into the same query/editor; the original prefix-based preview updates naturally. No API, LLM or new task generator is involved. Manual clause controls remain usable; the ordinary exact-sequence success rule and human EXECUTE click remain required.

`beginSQLPilotAttempt` issues one transient numeric attempt ID only while SQL is open and progression is ready, outside blocking tasks/ascension/reboot. Preparing a draft changes no central resource or step. After a correct human execution, SQL's existing 1500 ms success presentation calls `completeSQLPilotQuery(attemptId)`. That action checks the current exact progression, open SQL mode and matching engine-issued ID. It atomically applies the shared `sqlQueryReward` and advances to `pilot_success`; changed progression prevents repeat rewards. `completeSQLQuery` remains the ordinary reward-only path and cannot advance the pilot.

Reward equivalence: both paths grant 100 clean data and 250 PU multiplied by `1+0.1*prestige.level`, log the original query-success message, and contribute the same multiplied PU to an active board meeting. No TU, rate, entropy, resource cost or bonus is added. Meeting activity does not prevent executing the SQL trial; it defers management feedback. Once EXECUTE has occurred, completion uses the same economic timing as ordinary SQL, including completion during a later blocking task; the existing close-toggle behavior remains unchanged.

New pilot timers are cancelled on close/inactivation. Closing before confirmation (including after draft preparation) grants nothing and leaves `pilot_ready`; this does not repair baseline manual SQL's uncancelled success timer. Reload discards unfinished local drafts/IDs and permits retry. `pilot_success` and `demand_pending` persist through the same two-second autosave; the original unsaved-window limitation still applies. Feedback is opt-in, positive, and acknowledgement-only: it changes `pilot_success -> demand_pending`, with era/target unchanged. No increased workload or later tier is implemented.
