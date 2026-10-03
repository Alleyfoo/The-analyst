# Gameplay map

## Player loop and ending

`types.ts::INITIAL_STATE` starts with 100 raw, capacity 500, 10 TU, no PU/output/automation, and raw inflow 2/sec. Loading an existing browser save bypasses this fresh start (`useGameEngine` initializer). There is no new-game menu or chapter sequence.

The initial Ops loop is buy Spreadsheet Software for 10 raw, manually clean raw into clean data, manually analyze clean into metrics, then buy automation, storage, input and quality upgrades. Spaghetti provides an early faster manual route. Ads, chat choices and later market trading supplement PU; truth chat responses and automatic high-quality metric production can grow TU independently of model training. The UI also exposes terminal/reset and coffee from the start (`components/Workstation.tsx::Workstation`).

Progression is **threshold-driven**, not explicitly chapter-driven: `constants.ts::checkUpgradeVisibility` tests current totals/flags, while the engine unlocks the market and rival. Visible upgrades can disappear if thresholds fall; purchase records do not generally force visibility because the visibility helper checks static `upgrade.purchased`, not `state.upgrades`. Each upgrade is buy-once per run (`useGameEngine::purchaseUpgrade`). Not every displayed feature is reachable; see [KNOWN_QUIRKS.md](KNOWN_QUIRKS.md).

Project OMNISCIENCE is visible at TU >30 and costs **100 TU**. Purchase marks it bought, subtracts TU and sets `isAscending=true`, freezing the main interval and opening `AscensionOverlay`. An additional Ops ASCEND button appears at TU >=100 and invokes that same purchase. The ending offers New Game+ or Return to Sandbox. Returning clears only `isAscending`; the purchased upgrade prevents reopening through the normal purchase path.

`useGameEngine::ascend` and `components/AscensionOverlay.tsx::AscensionOverlay` use `bonusLevel=floor((log10(max(1,pu))+tu)/10)` on the **post-purchase** state. New level and Insight currency each accumulate that bonus. After a three-second reboot, all ordinary state/purchases reset, level persists, entropy starts at 30 if new level >0, and the page reloads. Production uses `M=1+0.1*level`; manual clean adds `2*level` to batch size. Neural upgrades must be purchased again. Insight currency is accumulated but never spent.

## Resources, rates and world effects

Evidence: `hooks/useGameEngine.ts` main interval, `manualClean`, `manualAnalyze`, result actions; `constants.ts::UPGRADES`/`CHAT_SCENARIOS`/`EVENTS`.

- Raw enters through base inflow, ads and PDF rewards; cleaning, purchases and selected chat/events consume it. Only raw is capped. Clean data enters through cleaning/minigames/coffee, is consumed into metrics, and pays for upgrades/ad boosts. Metrics accumulate through analysis/process mining and pay for segmentation (currently invisible).
- Manual clean batch is `1 + (macros?4:0) + 2*level + (neural_interface?20:0)`: spends that much raw, grants equal clean and `0.5*batch*M` PU. Insufficient raw for the whole batch rejects the action. Manual analysis consumes one clean, grants one metric and `2*M` PU, **no direct TU**.
- Each 200ms tick: base raw adds `rawDataRate*0.2*P*M`, where `P=0.5` during restructuring, otherwise 1. Clean and metric conversions similarly use `rate*0.2*P*M`, capped by the **previous** raw/clean buffers; newly produced data is not consumed in the same tick. Raw overflow is discarded; clean, metrics, dashboards and models have no capacity.
- Passive PU is `(5*metricDelta + 0.5*dashboards + 2*models)`, halved during restructuring, plus ad PU, then multiplied by M; urgent chat penalties subtract afterward. This is per tick, including dashboard/model terms. TU delta is `(metricDelta*(metricQuality-0.15)*0.4 + models*0.05 - entropy/100*0.01)*M`, clamped at zero after adding to TU.
- Complexity is `10 + 5*dashboards + 15*models + 0.1*rawDataRate + 0.2*cleanDataRate + metricRate`; observability is `max(1,10000/(100+complexity))`. Entropy per tick changes by `0.2*(gapTerm+blindSpotTerm+overflowTerm)`: gap term is +0.01 when `max(0,pu-50*tu)>2000+50*tu`, else -0.2; blind spots add `max(0,50-observability)*0.002`; any overflow adds 0.005. The loop clamps entropy to 0..100.
- Economy drifts 1% of the distance to `50+3*(tu-10)` each tick; it is not bounded to 100. Trust changes via effects, not a direct quality multiplier. Environment stays at 50 in ordinary play. Revenue charts show `economy*1000`; no revenue account exists (`DashboardPanel`, history sampling).

## Upgrade visibility, costs and effects

Every definition in `constants.ts::UPGRADES` is listed below. Conditions are literal visibility rules in `checkUpgradeVisibility`; affordability is separate in Workstation/purchaseUpgrade. `raw`, `clean`, `metric` refer to resources. Effects apply once, to the state **after** paying the cost.

| Upgrade ID | Visible when | Cost | Actual effect |
| --- | --- | --- | --- |
| `manual_excel` | Always | 10 raw | UI manual-clean/Spaghetti gates |
| `macros` | manual_excel bought | 25 clean | Manual clean batch +4 |
| `pandas_scripts` | raw >200 | 50 PU | clean rate +2; Pandas gate |
| `sql_optimization` | clean >500 | 200 PU | clean rate x2; SQL gate |
| `bi_dashboards` | PU >800 | 500 PU | metric rate +1, dashboards +1 |
| `ocr_scanner` | PU >200 | 300 PU | raw rate +8, quality -0.02 (floor 0.1) |
| `pdf_parser` | PU >600 | 1000 PU | raw rate +25; PDF gate |
| `extra_drive` | Always | 20 PU | capacity +500 |
| `local_server` | raw >450 | 150 PU | capacity +5000 |
| `cloud_bucket` | capacity >=2000 OR packet loss >10 | 800 PU | capacity +25000; Flow gate |
| `cloud_warehouse` | clean rate >10 OR capacity >=15000 | 1500 PU | clean rate +20, capacity +100000 |
| `distributed_fs` | capacity >=50000 | 5000 PU | capacity +500000 |
| `data_lake` | capacity >=250000 | 15000 PU | capacity +2500000 |
| `data_center_5mw` | capacity >=1000000 | 60000 PU | capacity +10000000 |
| `planetary_storage` | capacity >=5000000 | 500000 PU | capacity +100000000 |
| `intern` | PU >150 | 100 PU | clean rate +1, quality -0.05 |
| `junior_analyst` | PU >1000 | 350 PU | metric rate +2 |
| `data_scientist` | models >0 | 2000 PU | quality +0.1, models +1; Model gate (circular) |
| `public_datasets` | PU >20 | 50 PU | raw rate +3 |
| `cookie_tracking` | PU >50 | 100 PU | raw rate +5, trust -5 |
| `segmentation` | No enabling condition | 50 metrics | quality -0.05 (floor 0.1); no advertised PU boost |
| `event_tracking` | PU >1500 | 800 PU | raw rate x2, entropy +10; Process gate |
| `data_dictionary` | metrics >200 | 200 clean | quality +0.05 |
| `kpi_board` | dashboards >2 | 500 clean | dashboards +2 (circular) |
| `gdpr_compliance` | trust <40 | 1000 PU | raw rate x0.8, trust +15 |
| `randomized_experimentation` | TU >20 | 1200 PU | TU +15, quality +0.1 |
| `peer_review` | TU >50 | 3000 PU | metric rate x0.8, quality +0.2 |
| `project_omniscience` | TU >30 | 100 TU | Opens ending, freezes main loop |
| `neural_interface` | prestige level >0 | 0 raw | Manual clean batch +20; no analysis boost |
| `synaptic_caching` | prestige level >0 | 5000 PU | metric rate +5 (still consumes clean) |

## Meetings, communication, events and economy

`useGameEngine` meeting logic starts at tick 300 (~60 simulated seconds), then every 1500 ticks (~five minutes) when not active. Target is `max(100,floor(current puGain*5*30*1.5))`; duration is nominally 30 seconds, decremented on ticks divisible by five, including the start tick. Positive passive PU plus specific manual/minigame contributions count. Success grants `2*target` PU; failure halves base production for 300 ticks (~60 seconds). PU purchases/sales, chat rewards and event rewards do not directly count; Flow/Process can add progress without matching PU earnings.

`TeamComms` displays static scenarios chosen randomly by the engine. Regular spawn chance per tick is `0.005+0.002*dashboards` with fewer than five active chats; duplicates are possible. Chats become urgent after >15 wall-clock seconds, costing five PU per urgent chat **per tick**. Corporate responses start blocking tasks of 3–12 simulated seconds, then apply effects; truth responses apply immediately. Most actions are blocked while busy; automatic simulation continues. Relationships change immediately: corporate +10/truth -10 for normal senders, Eric truth +10/other -5.

| Scenario (`constants.ts::CHAT_SCENARIOS`) | Corporate / neutral effect | Truth effect |
| --- | --- | --- |
| `logo_size` / Mike | 5s: PU +50, entropy +2 | TU +1, PU -10 floor 0 |
| `q3_numbers` / CEO | 10s: PU +200, TU -5 floor 0, quality -0.1 floor 0.1 | TU +10, PU -100 floor 0, trust +5 |
| `red_metric` / Karen | 3s: PU +30, entropy +5 | TU +2, PU -15 floor 0 |
| `pdf_issue` / Steve | 8s: PU +40, raw -10 floor 0 | TU +1, PU -50 floor 0 |
| `ai_hype` / Ian | 12s: PU +500, entropy +10, trust -5 | TU +5, quality +0.05 |
| `eric_mock_1/2/3` | Neutral: PU -5 floor 0 | Opens Buzzword Battle |

Eric activates at clean >50 with 1.5x player clean/metrics. Each tick he gains `max(2,cleanDataRate*1.1)*0.2` clean and 40% of that in metrics. If ahead, a 0.002/tick chance and >500-tick cooldown may create a nonduplicated Eric scenario; this branch does not enforce the regular chat-count cap. Coffee (`startCoffeeBreak`) is available initially and every 600 ticks; chooses a normal sender or active Eric. Relationship >=20 grants 100 clean, <=-20 removes 50 clean (floor zero), otherwise no effect; encounters themselves do not change relationships.

Events (`constants.ts::EVENTS`, `useGameEngine::dismissEvent`) are selected in definition order every five ticks, at most one open, once per ID per run. History records the ID on offer; **acknowledgement** applies the effect. Simulation continues with an event open.

| Event ID | Trigger | Effect on acknowledgement |
| --- | --- | --- |
| `storage_full_warning` | packet loss >90, entropy <90 | entropy +5 |
| `first_dashboard` | dashboards >=1 | PU +100, economy +2 |
| `color_mandate` | dashboards >=3, PU >500 | PU +2000, quality -0.15 floor 0.1; unreachable ordinarily |
| `excel_crash` | raw >500, clean rate <2 | raw becomes floor(raw*0.5) |
| `viral_insight` | metrics >1000, quality <0.4 | PU +5000, TU -10 (not clamped here) |
| `data_breach` | entropy >80, trust <40 | trust -30, economy -10 |
| `paradigm_shift` | TU >100 | economy=100, trust=80 |

Market (`useGameEngine` market block, `buyStock`/`sellStock`) unlocks at **PU >500**, not >=500. Price updates every five ticks toward `max(1,tu*5)+5*log10(max(1,pu))+volatility`, moving 10% of the gap, floor one. Volatility is `entropy/100*(random-0.5)*10`. Price >3x true value and entropy >80 gives a 5% chance of a 70% crash each price update. Shares exchange for PU at actual floating price; UI trades 1/10/100. No dividends or separate cash currency.

Ads (`launchCampaign`, `boostCampaign`) are available without an unlock: email/social/influencer/tv cost 100/500/2000/10000 PU, last 300 ticks and yield raw/PU per tick of 2/1, 5/8, 15/40, 50/200 respectively. Boost costs 50 clean and adds 0.5 effectiveness; repeat launches/boosts have no explicit cap. Raw yields bypass restructuring/prestige; ad PU joins PU gain before prestige. Storage overflow discards excess raw. Campaign totals vanish on expiry.

## Every minigame

All reward actions below live in `hooks/useGameEngine.ts`; wiring is in `App.tsx`. Except Buzzword, clean/metric/PU/TU rewards listed here are multiplied by M; costs, quality and entropy changes are not. Games do not pause the main loop. Closing before reward/claim generally yields nothing, except already-paid Spaghetti batches; uncancelled completion timers are a caveat.

| Component / gate | Real play and result | Engine consequence / meeting progress |
| --- | --- | --- |
| `SpaghettiOverlay::handleInput`; manual_excel | Hover near curve midpoints; local budget requires >=7 raw per next strand | `cleanSpaghettiStrand`: spends 5 raw/strand, +5 clean, +25 PU; PU reward counts for meeting |
| `PandasMappingGame` completion effect; pandas_scripts | Match five random header pairs; after 1.5s, cost 20 raw, reward 50 clean, quality `max(0.01,0.05-0.01*mistakes)` | `completePandasLevel` rejects whole reward if raw <20 at completion, clamps quality to 1; no meeting contribution |
| `SQLMiningGame::handleExecute`; sql_optimization | Build one exact token sequence; errors have no resource penalty; success after 1.5s | `completeSQLQuery`: free +100 clean/+250 PU; PU counts for meeting |
| `ModelTrainingGame::handleDeploy`; data_scientist (unreachable ordinarily) | Slider fits generated training/validation data. PU `floor(trainingAccuracy*25)`; accuracy/generalization gap >30: TU -20/entropy +10; >15: TU 0/entropy +5; else accuracy <50: TU 0/entropy 0; otherwise TU `floor(generalization)`/entropy -5 | `completeModelTraining`: always models +1, grants PU/TU with TU floor zero and entropy clamp 0..100; PU counts for meeting; no input cost |
| `ProcessMiningGame` animation effect; event_tracking | Follow 1000-point signal; accuracy=tracked frames/1000. Rewards `floor(accuracy*50)` metrics, `floor(accuracy*5)` TU after 1.5s | `completeMiningLevel`: free metrics/TU; meeting progress +10*TU reward*M; no PU reward |
| `DataFlowGame` timer effect; cloud_bucket | 20s gate routing; valid-in-DB increases valid score, noise-in-trash increases noise score; wrong bucket decrements corresponding score floor zero | `completeFlowBatch`: +5*valid clean, entropy -floor(noise/2) floor zero; meeting progress +0.5*cleanReward*M; no raw cost/PU reward |
| `BuzzwordBattle::handleClaim`; Eric chat challenge | 15s real/fake word selection; real +1 score, fake -1 floor zero, new batch after all real found; claim also available on zero-score defeat | `completeBuzzwordBattle`: +100*score PU, steals min(Eric clean,50*score) clean, Eric relationship +15 even on defeat; no prestige boost or meeting progress |
| `PDFScanningGame::handleClaim`; pdf_parser | Drag to overlap all tables; images count as noise, text does not. Claim raw `max(100,500-50*noise)`, clean `max(0,50-10*noise)` | `completePDFBatch`: awards scaled raw up to storage cap and scaled clean, logs overflow; no meeting progress or entropy penalty |
