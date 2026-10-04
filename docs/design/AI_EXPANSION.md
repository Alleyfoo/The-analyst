# AI expansion design authority

Status: **design authority for future expansion; not implemented functionality**. This document records the supplied work order. It authorizes no source changes, dependency additions or baseline fixes.

Source baseline: `1263845279e9afd65ac05a6a1ac809e9bc70ee3c`. Reproducible development baseline: `ac754884bb7a99eaa18cc5a34f33556b4f6b6cd8`. The current README rewrite is `43f705bb2f636e8eadb44233aa8bd37587365556`.

Authority labels used throughout:

- **LOCKED DESIGN:** concepts established by the work order. Implementation must preserve these unless a later explicit decision supersedes them.
- **ILLUSTRATIVE EXAMPLES:** working names, dialogue, counts, durations, metrics and thresholds. They communicate intent, not numerical requirements.
- **OPEN QUESTIONS:** unresolved choices. Neither an example nor a technical recommendation closes them.

For statements about what exists today, source and [baseline documentation](../project/INDEX.md) remain authoritative. This document governs intended expansion behavior, not a retrospective redefinition of the original game. All expansion concepts below are future design unless explicitly marked as baseline evidence.

## 1. Design thesis

**LOCKED DESIGN.** Preserve The Analyst and add a second major progression arc. The human-scale game supplies the reference point for later acceleration: the player remembers when one PDF, one SQL query or one bad record was personally understandable.

> **A visual representation of corporate software. The actual version is somehow worse.**

The abstraction should be mechanically recognizable, emotionally accurate, technically simplified and satirical. It is not professional training software. AI genuinely increases capability and initially feels excellent. The tension comes from what the organisation does with the capacity: higher demand, shorter deadlines, broader authority and verification that cannot automatically keep up.

Management should sound plausible. Pressure comes from cost, latency, competition, board expectations and efficiency, rather than every manager being an idiot villain. The recurring dangerous idea is “that's good enough” under reasonable-looking constraints. Neither eventual ending is morally correct, canonical or a punishment for choosing badly.

**ILLUSTRATIVE EXAMPLES.** “Enterprise AI Pilot,” “Good Enough,” “Lightspeed” and “Root Cause Protocol” are working names. Use the house joke and minigame variants sparingly; humour should arise from the systems, not repeated disclaimer wallpaper. Original visual language may suggest a two-path revelation/escape choice without external movie imagery, quotations or IP dependence.

## 2. Existing Act I boundary

**BASELINE EVIDENCE.** Today there is no act, tier, era or narrative campaign field. `types.ts::GameState` and `INITIAL_STATE`, `constants.ts::checkUpgradeVisibility`, and the `useGameEngine` interval define threshold-driven progression. Existing `Campaign` objects are marketing advertisements. See [GAMEPLAY_MAP](../project/GAMEPLAY_MAP.md) and [STATE_MODEL](../project/STATE_MODEL.md).

The current loop buys spreadsheet software, cleans raw data into clean data, analyzes it into metrics, and purchases automation, input, quality and storage upgrades. It includes dashboards, chat requests, board meetings, marketing, stock trading, PU/TU, entropy, a rival and eight implemented minigames. Only raw data has a storage cap. All eight implementations exist; that does not mean every unlock is reachable.

The current ending is `project_omniscience`: visible above 30 TU, purchased for 100 TU, setting `isAscending` and freezing the interval. `AscensionOverlay` offers New Game+ or Return to Sandbox. `useGameEngine::ascend` resets ordinary state and preserves accumulated prestige; bonus calculation uses the post-purchase TU balance. These are existing rules, not new design defaults.

**LOCKED DESIGN.** The existing game is Act I and must remain substantially recognizable: spreadsheets, manual cleaning, SQL, PDF extraction, schema mapping, dashboards, storage pressure, corporate chat, meetings, marketing, market hype, PU versus TU, entropy, minigames and current ascension progression. Do not redesign these merely because later systems exist. Human-scale waits and visible mistakes are part of the contrast.

Known baseline quirks require separate decisions, not silent repairs: circular model unlock, circular dashboard unlock, invisible segmentation, sandbox/ending re-entry, tick-zero coffee hydration and delayed chat overwrite behavior. Further timing and lifecycle concerns remain source-only suspicions. See [KNOWN_QUIRKS](../project/KNOWN_QUIRKS.md).

**EXPLICIT G1 DECISION (2026-10-04).** The original Ascension remains available only before expansion progression begins (`analyst` with no transition). Entering expansion defers gameplay Ascension until the expansion ending later supplies its own end-state choice. An already-open original ending retains its choices and postpones handoff; Return to Sandbox can then begin eligible expansion. Factory reset remains exempt. G1 does not implement that later choice or fix the original ending re-entry quirk.

**OPEN QUESTIONS.** “Tier” describes organisational progression; it must not silently reinterpret existing prestige as an era or turn the inaccessible model branch into a mandatory baseline prerequisite. A separate baseline-mode selector is not established by this boundary decision.

## 3. PU / TU / Velocity model

**LOCKED DESIGN.** Preserve the meanings of PU and TU and introduce Velocity as a third major force.

| Concept | Design meaning | Gameplay distinction |
| --- | --- | --- |
| PU — Perceived Understanding | What the organisation believes it knows: dashboards, management confidence, apparent progress and narrative success | Convincing output can raise confidence without establishing correctness |
| TU — True Understanding | Contact with reality: quality, verification, honest interpretation, correct explanations and refusal to manufacture certainty | Understanding requires evidence; it is not interchangeable with throughput |
| Capacity | How much work the system can process | Automation and AI can deliver real capability gains |
| Demand | Work expected because that capacity exists | Management routes more work and expects faster turnaround |
| Verification capacity | Output that can actually be checked, understood and governed | Better processing does not automatically create equal review capacity |
| Velocity | How quickly work and decisions are expected to move | Emerges from capacity, demand and compressed turnaround; not merely a speed upgrade |

The intended causal loop is: capacity improves → organisation notices → demand rises and turnaround falls → more work passes through the system → verification coverage may fall → errors have greater reach. Independent verification can improve outcomes, and AI can help with verification too, but neither confidence nor automated self-approval guarantees TU.

**ILLUSTRATIVE EXAMPLE.** At the same percentage error, greater throughput produces more affected records and connected writes. This is a consequence relationship, not a fixed error rate or required equation. Blast Radius communicates the scope of an action's possible consequences; it need not become a permanent top-level currency.

**OPEN QUESTIONS.** Whether Velocity is a visible meter, a derived summary or several indicators; its units and pacing; how demand and verification capacity interact with baseline PU/TU/entropy formulas. No new formula, resource exchange or score threshold is locked here.

## 4. Era / tier progression

**LOCKED DESIGN.** Add explicit progression authority around the threshold-driven game. The following ordered organisational beats are required; tier titles are working labels. A numerical eligibility threshold does not itself establish a tier.

| Working tier | Required experience | Organisational change |
| --- | --- | --- |
| 0 — Analyst | Understandable units of human work | Individual records, requests, mistakes and waits matter |
| 1 — Automation | Existing scripts, ETL, storage and productivity gains become important | Manual effort falls; the organisation begins increasing workload |
| 2 — AI Pilot | AI completes an existing task dramatically faster; genuine relief comes first | Successful pilot receives positive management recognition |
| 3 — Acceleration | Demand rises, deadlines compress and minigames begin working at batch scale | Reviewing each item ceases to be practical |
| 4 — Connected Enterprise | Useful read-only connections precede pressure for direct writes | AI moves from proposing output to causing effects |
| 5 — Good Enough | Review queues expose human approval as a throughput bottleneck | Player defines safe automation and where authority stops |
| 6 — Lightspeed | Work is largely abstract; thousands of actions can fit into an old short wait | Rates, drift, failures, unverified writes and rollback queues replace item-by-item comprehension |
| 7 — Governance / Crisis | Top-line metrics cannot explain accumulated effects; customer feedback becomes essential | Player traces symptoms to rules and authority decisions, then reaches executive review and the ending choice |

**ILLUSTRATIVE EXAMPLES.** The exact workload, number of systems, timing of AI arrival and intermediate unlock thresholds remain adjustable. The CEO's existing ten-second “Massage Data” task (`constants.ts::CHAT_SCENARIOS`, `useGameEngine::resolveChat`) supplies a remembered scale contrast; it is not a mandate to alter that baseline task.

## 5. Transition-event rules

**LOCKED DESIGN.** Thresholds make a narrative transition available. Establishment requires a short mandatory sequence of witnessed events and player participation, not a “level reached, feature unlocked” banner. The organisation must feel as if it changed around the player.

The AI transition must contain these beats in order:

1. Eligibility is reached.
2. The enterprise pilot is introduced without ominous framing.
3. The player uses it on a real task represented by an existing activity.
4. Completion is dramatically faster and useful.
5. Management responds positively.
6. Incoming demand increases.
7. An exception or consequence becomes visible.
8. The tier is officially established.

Transition progress must survive saving/loading. Availability, in-progress sequence and established era are different facts. A dismissed introduction is not proof of task completion, a positive response or an experienced consequence. Later tier transitions follow the same principle with appropriate beats; no exact sequence for each is decided here.

**BASELINE LIMIT.** `EVENTS` currently offers one eligible definition at a time and records its ID on offer; `dismissEvent` applies its effect. `eventHistory` therefore cannot stand in for completed mandatory sequences. Its behavior and existing IDs remain unchanged absent later authorization.

**OPEN QUESTIONS.** Entry acceptance/deferral, sequencing around meetings and blocking tasks, whether transition screens pause expansion simulation, and how retries avoid repeated rewards or skipped beats. Mandatory content needs a recoverable path rather than a prestige lock with no way forward; the recovery rules are undecided.

## 6. How existing minigames evolve

**LOCKED DESIGN.** Transform scale and context, rather than replacing activities when AI appears. Preserve baseline mechanics/rewards in Act I. The expansion changes the player's job from performing each task to understanding patterns, validating evidence and handling exceptions. Initially the acceleration must feel useful.

All current components below are wired through `App.tsx` into result actions in `hooks/useGameEngine.ts`; exact original costs, rewards and meeting contributions remain authoritative in [GAMEPLAY_MAP](../project/GAMEPLAY_MAP.md).

| Activity / source | Existing representation | Expansion direction |
| --- | --- | --- |
| Spaghetti Protocol / `SpaghettiOverlay.tsx` | Hover near tangled stream midpoints to clean batches | Move from individual strands toward cleaning rules, flows and exceptions |
| SQL / `SQLMiningGame.tsx` | Assemble an exact sequence of query tokens | Copilot proposes a query almost instantly; later inspect batched intent, confidence and exceptions |
| PDF extraction / `PDFScanningGame.tsx` | Box tables and avoid image noise in one generated document | Bulk extraction with failed layouts, anomalous supplier formats, sampling and exceptions |
| Schema mapping / `PandasMappingGame.tsx` | Match ugly headers to canonical names | Proposed mappings with confidence; pressure to lower review thresholds |
| Data flow / `DataFlowGame.tsx` | Imperfect gate routing of valid/noise particles | Show how similar error proportions at greater flow fill downstream systems with bad records faster |
| Model training / `ModelTrainingGame.tsx` | Local generated curve fitting with training/validation tradeoffs; circular unlock blocks normal access | Deployment thresholds, validation, drift, confidence and model-selection pressure; no magical intelligence button |
| Process mining / `ProcessMiningGame.tsx` | Follow one moving signal and collect samples | Inspect high-volume traces and identify bottlenecks |
| Buzzword battle / `BuzzwordBattle.tsx` | Identify real/fake terms and challenge Eric | Preserve the rival/satirical activity; its later-scale role is open, not a replacement mechanic specified here |

**ILLUSTRATIVE EXAMPLES.** A subtle AND/OR mistake at “97% confidence” can affect a large batch; one strange supplier format can generate thousands of bad records. Those numbers are not targets, and displayed confidence is not a guarantee. Verification should expose the intent or rule behind the result, not demand mastery of real SQL/OCR/ML tools.

**OPEN QUESTIONS.** Which activity hosts the first pilot, how batch variants retain understandable controls, and how model-training evolution becomes reachable without an unapproved baseline unlock repair. No exact new minigame rewards or costs are set.

## 7. Interface abstraction over time

**LOCKED DESIGN.** The interface changes because scale makes its original units less useful. Early work shows individual records/PDFs, visible messages, concrete buttons, understandable waits and one task at a time. Later it exposes batches, counts, confidence distributions, summaries, traces, policy, exception queues, rates and flows.

The early interface need not disappear at one transition. Preserve recognizable connections: an exception can lead back to a record, a PDF or an old-style query. At Lightspeed the player should feel the distance from the cosy early workstation while still being able to investigate consequences.

**ILLUSTRATIVE EXAMPLES.** Operations per minute, confidence histograms, drift, failed calls, unverified writes, rollback queue size and complaint volume can express scale. A high success percentage beside many affected customers is a purposeful contradiction, not proof of healthy governance.

**OPEN QUESTIONS.** Panel placement, which indicators are always visible, granularity controls and how pauses/sampling keep the game readable. Existing `Workstation`, `DashboardPanel` and `DataStream` are composition seams, not already-implemented batch views.

## 8. MCP / tool-authority chapter

**LOCKED DESIGN.** Represent MCP-style connectivity as the moment AI gains tool authority. Start with harmless, useful read-only access, then introduce plausible pressure to update systems directly. The abstraction concerns access, permissions, scope, authority, approval, independent logging and blast radius; it does not simulate the protocol.

Fictional systems may represent Product DB, PIM, ERP, CRM/support, email, documents and a SQL/data warehouse. Their links create consequential propagation rather than merely extra throughput multipliers. Read access helps the player understand; write authority changes the world represented by the game.

**ILLUSTRATIVE EXAMPLES.** “PRODUCT DB — READ ONLY” precedes “Can it write the correction automatically?” A supplier file → mapping → Product DB → ERP → PIM → webshop → customer chain illustrates how one mistaken inference spreads. NONE/READ/WRITE/DELETE/EXECUTE/ADMIN are possible vocabulary, not six mandatory permission levels.

**OPEN QUESTIONS.** Which systems are necessary, how much scope is visible, how rollback/containment is represented and how connected actions differ from proposals. Connections and calls are simulated locally; this is not authorization to access real accounts or connect external services.

## 9. Human approval and governance model

**LOCKED DESIGN.** Blanket human approval is not perfect governance. A person approving thousands of actions becomes a queue and can lose meaningful oversight. The central question is **where authority stops**, not how many approval clicks the player tolerates.

| Action class | Required governance principle |
| --- | --- |
| Established, low-risk transform | May run automatically within its established scope |
| Unknown value or unclassified case | Quarantine for exceptions rather than silently force a match |
| Schema change | Review required |
| Destructive action | Signoff required |
| Authority change | Signoff required; automation cannot approve its own expansion of access |
| High-impact decision | Human review required |
| Activity record | Independent logging outside the acting agent's authority |

Pre-approved classes, confidence thresholds, automated approval and exception-only review are available design concepts. Confidence alone must not erase scope or impact. Independent logging is a game-level separation of authority, not a promise of tamper-proof infrastructure or a new server requirement. Pressure continues to automate remaining exceptions even after a sensible policy is established.

**ILLUSTRATIVE EXAMPLES.** A queue grows from 1 to 37 to 418 actions. Management asks: “This approval takes 45 seconds. We perform 30,000 of these per day. Do we really need manual approval for all of them?” These values and dialogue can change. The player should see both legitimate efficiency benefits and the limits of delegation.

**OPEN QUESTIONS.** Exact risk classes, how review depth relates to verification capacity, what happens to rejected batches, and the cost/reward of retaining a boundary. Crisis must remain reachable for cautious play without silently requiring the player to grant blanket unsafe authority; possible causes include bounded delegation, unknown input or a legacy rule, but none is chosen yet.

**LOCKED DESIGN — S15 organisational authority (2026-10-04).** The analyst's late-game agency concerns evidence, containment, policy boundaries, source/schema rules, exception handling, write authority and governance controls. The analyst has no organisation-wide veto over adoption of the automated operating model. Executive review can accept the analyst's evidence and controls while separately deciding that automation rollout proceeds. “Full automation” means an automation-first operating model with governed exceptions, not every action being ungated. The endings determine the analyst's relationship to that system, not whether automation exists; both routes follow the organisation's commitment to the new operating model. Acknowledging management's decision records witnessing it, not strategic consent. Existing system-specific policies and authority remain binding.

## 10. Customer feedback / root-cause loop

**LOCKED DESIGN.** Customer feedback reconnects internal confidence and throughput to reality. A complaint is evidence worth investigating, not merely a score penalty. Internal dashboards can look successful while customers cannot find products.

The investigation loop follows an affected customer experience back through its causes:

customer complaint → storefront → product record → mapping → AI batch → source file → policy / authority decision.

The player distinguishes symptom repair from rule repair: correcting affected products may restore some service, but one bad rule can keep producing the same symptoms. Understanding and containment matter alongside clearing a queue. Executive review must receive evidence of the causal decision, not just a cleaner top-line metric.

**ILLUSTRATIVE EXAMPLES.** “We can't find these products.” A dashboard might show 99.2% automation success and 97.8% mapping confidence. “Root Cause Protocol” is a possible investigation name. Neither a specific customer incident nor a fixed number of trace hops is required.

**OPEN QUESTIONS.** Trace puzzle interactions, imperfect evidence, complaint delay, the value of temporary containment and how to prove a rule is repaired. The baseline has no product provenance chain or customer complaint system; ordinary logs do not supply it already.

## 11. Restore / Ascension gating

**LOCKED DESIGN.** During major expansion transitions, Restore/Ascension is not always immediately available. The player must experience the era's consequences before prestige can reset them away. Availability must be explained to the player, not silently hidden.

**ILLUSTRATIVE EXAMPLE.** “RESTORE UNAVAILABLE — ORGANISATIONAL TRANSFORMATION IN PROGRESS.” Late-game release conditions may include AI deployed, a velocity threshold exceeded, connected authority introduced, some human approval removed or delegated, a customer-impact incident experienced, root cause identified and executive review completed. This is a possible milestone set, not a finalized all-of checklist or an endorsement of unsafe choices. Exact thresholds are undecided.

**BASELINE LIMIT.** No Restore action currently exists. `hardReset` is a factory reset that deletes the save; it is not prestige. Workstation's ASCEND button invokes the buy-once OMNISCIENCE upgrade, while `ascend` handles the actual reboot. UI-only gating would not govern all relevant actions. Locking or rerouting these paths changes behavior and needs an explicitly scoped implementation order.

**G1 RESOLUTION.** Gating starts at any non-null transition or non-analyst era. Already-open ending screens remain intact, including legacy mixed saves; no migration framework is introduced. Factory reset is explicitly exempt. The later expansion ending's release mechanism is not implemented here.

**OPEN QUESTIONS.** Recoverable progression if an incident is contained early; a separate baseline-only mode; and exact expansion ending conditions remain undecided.

## 12. Access Matrix ending — Govern the Machine

**LOCKED DESIGN.** At the expansion ending, the player can refuse immediate New Game+ and create an Access Matrix. This establishes the governance role; lifecycle maintenance beyond first stabilization remains optional and unimplemented. More control and lower blast radius bring ongoing responsibility and exceptions; this is not the “good” ending.

The puzzle is inspired by Lights Out, not real IAM. Rows represent people, roles, agents or service accounts; columns represent connected systems. Cells contain simplified access levels. Changing one permission causes at least one linked side effect elsewhere. Those changes are deterministic consequences of hidden or partially visible relationships that can be learned, not unrelated random noise.

Players should be able to discover patterns and stabilize the matrix at **100% health**. A repair should not be impossible solely because the puzzle needs to remain endless. Once solved, later lifecycle events introduce new maintenance; 100% is achievable but not permanent.

**ILLUSTRATIVE EXAMPLES.** Cells may use NONE/READ/WRITE/ADMIN. Giving an agent PIM WRITE may also grant Product DB READ because of a service-account dependency. Links may represent inheritance, group membership, system dependency, temporary access, tool scope, legacy configuration or a management override. “Expected Access: 142 / Actual Access: 143 / Drift: 1” suggests a hidden discrepancy; equal counts alone do not prove correct placement.

New events may include onboarding, departure, contractor extension, temporary-access expiry, team changes, a new tool server, service-account changes or emergency override. Events can choose a new scenario; within a scenario, permission propagation remains deterministic. A possible stabilization joke is “ACCESS REVIEW DUE IN 30 DAYS.” This is flavour, not a real-time scheduling requirement.

**OPEN QUESTIONS.** Matrix size, permission cycle/click behavior, which dependencies start visible, hints, solvability guarantees, health calculation, event cadence and the form of maintenance after first stabilization. P1 locks the later New Game+ exit below.

**LOCKED IMPLEMENTATION SCOPE — S16 (2026-10-04).** The role decision follows derived completed S15/S14 proof; automation already exists for both routes. Govern requires explicit role confirmation and starts one fixed4x4 Access Matrix with NONE/READ/WRITE/ADMIN cycling. Each click cycles itself and exactly one deterministic linked cell. A fixed target plus five scramble operations guarantees solvability by modulo-four inverse clicks; health is exact target placement. First100% stabilization is persistent and remains solved, with company simulation continuing. Recurring lifecycle events are deliberately unimplemented; consider S17 only after evaluating whether the first puzzle is fun. S16 originally had no exit from committed Govern; P1 explicitly supersedes that restriction with a solved-only expansion New Game+ exit below. Exact target/dependencies/scramble are implementation evidence in [STATE_MODEL](../project/STATE_MODEL.md), not professional IAM guidance.

## 13. New Game+ ending

**LOCKED DESIGN.** The other ending resets the run and grants another Neural Link/prestige benefit. Escape and greater power come with greater acceleration: later runs reach automation and AI sooner, gradually eroding the peaceful early phase. The same organisational problem returns earlier. This is not the “bad” ending.

**ILLUSTRATIVE EXAMPLES.** “NEURAL LINK +1,” improved processing/automation, more hidden information visible, “WELCOME TO YOUR FIRST DAY AS A DATA ANALYST,” and one unread message. A late prestige run may hear management discussing agentic workflows while the player still buys spreadsheet software. The work order does not lock +1, a bonus formula, a starting chat or a specific new capability.

**BASELINE LIMIT.** Existing prestige accumulates `floor((log10(max(1,pu))+tu)/10)` and production recomputes `1+0.1*level`. `ascend` reconstructs `INITIAL_STATE`, preserves prestige and sets initial entropy to 30 for positive level. It does not carry era memories, hidden knowledge, faster narrative transitions or an initial unread chat. Existing currency has no spending action.

**OPEN QUESTIONS.** Expansion bonus calculation, retained knowledge/policies, save/reset ownership and which transitional beats can be compressed on later runs. Acceleration is required, but mandatory era consequences cannot simply disappear; decide how repeated transitions remain experiential without forcing identical tutorial pacing.

**LOCKED IMPLEMENTATION SCOPE — S16 (2026-10-04).** Expansion New Game+ requires an explicit confirmation at the uncommitted role choice or after the P1 first-stabilization governance exit and rebuilds INITIAL_STATE, saving immediately and reloading after the existing reboot presentation. Its prestige/Insight bonus is `max(1, floor((log10(max(1,PU))+TU)/10))`, accumulated into the existing level/currency and multiplier; positive prestige retains initial entropy30. Ordinary Act I Ascension/formula remain separate and unchanged under G1. No prior policy or story completion survives; next run is analyst/null. Existing prestige capability supplies earlier eligibility without skipping mandatory narrative beats. Both choices have equivalent visual weight and no moral ranking.

## 14. Non-goals

**LOCKED DESIGN.** This is not an anti-AI morality play, IAM training software, an MCP protocol simulator, realistic ERP, full cybersecurity simulation, replacement of Act I or excuse to rewrite the codebase. It is not a reason to add a backend or real LLM/API dependency.

AI and connected-enterprise gameplay remain simulated locally unless a later explicit design decision changes that boundary. The current game must remain playable without accounts, server infrastructure, API keys or external AI services. This does not claim that current presentation is offline-independent: `index.html` still loads CDN styling/fonts and contains an import map. No removal of those resources is authorized here.

No changes to production source, package declarations, lockfile or current baseline documentation belong to this work order. No known quirk is repaired by writing this design.

## 15. Technical extension boundary and reconciliation

These are **recommended boundary constraints**, reconciled with [EXTENSION_BOUNDARIES](../project/EXTENSION_BOUNDARIES.md) and inspected source. They do not select a framework, state schema, module layout or implementation architecture.

| Evidence / existing seam | Recommended boundary | Limit requiring later explicit work |
| --- | --- | --- |
| `App.tsx::App` owns one `useGameEngine` and composes the original UI | Keep baseline experience identifiable; an outer era/campaign authority is plausible | No wrapper exists. Hiding the original UI keeps its interval running; unmounting stops it. Lifecycle ownership is undecided |
| `types.ts::GameState`, `INITIAL_STATE`; `hydrateState` | Use a small explicit progression authority rather than scattered tier inference; missing era data defaults safely to the existing game | Choose nested central versus outer persisted state later. An old save must not auto-advance into expansion based on its score or prestige |
| `constants.ts` definitions and `checkUpgradeVisibility` | Keep IDs and original effects stable; use additive expansion definitions and controlled entry points | Existing events/history do not track multi-step completion; visibility is a UI rule, not an action-level permission check |
| `App` callback wiring and `complete*` actions | Preserve original Act I reward contracts; batch variants need explicit expansion result boundaries | Callbacks report totals, not record identity, source provenance, tool proposals or approvals. New contracts are required for traces and connected writes |
| `useGameEngine` interval and local `stateRef` | Keep new demand, verification and propagation behavior scoped to expansion | Baseline loop assumes one economy/rival/meeting schedule; it has no authority graph, queues or record-level simulation. A wrapper alone cannot supply every new mechanic |
| `project_omniscience`, Workstation, `AscensionOverlay`, `ascend`/`cancelAscension` | Reconcile ending availability in one progression authority and enforce at consequential action boundaries | Existing purchase cost, one-shot flag, freeze and full-state reset conflict with casually attaching a second arc. Rerouting them is a behavioral change, not documentation work |
| `SAVE_KEY`, hydration, autosave and forced ascension save | Persist transition/ending decisions; preserve old IDs and safe baseline defaults | No explicit schema migration exists; new nested fields need deliberate hydration. Define what reset preserves and what it clears before implementation |
| `logs`, component-local minigame state | Treat independent expansion audit/provenance as a distinct authority boundary | Baseline logs are mixed-order, often bounded and not immutable; puzzle boards are not saved. They cannot be advertised as a durable independent action ledger |

**Reconciliation result.** No expansion mechanic is claimed to exist in baseline docs. Calling the original game Act I is a design designation, not a source field. Tiers, Velocity, tool permissions, approval queues, complaint traces, Restore gates and Access Matrix are additions, not rediscovered architecture.

Two apparent documentation contradictions need context: the original source already contains an “AI Analyst” curve-fitting minigame, so the enterprise pilot means organisational adoption/acceleration, not the first occurrence of AI language; and KNOWN_QUIRKS' statement about the old README's key setup is historical snapshot evidence, superseded by the README rewrite. Neither requires changing baseline files in this task.

The primary design/baseline tension is preserving current ascension while adding compulsory consequences before expansion reset. This cannot be resolved by an untouched composition wrapper alone. Likewise, reachable expansion model training cannot be assumed from a circular baseline gate, and independent provenance cannot be manufactured from aggregate rewards. These tensions remain explicit decisions, not implied permission to fix them.

## 16. Open design questions requiring decisions

| Priority | Decision needed | Why it cannot be assumed |
| --- | --- | --- |
| Before a separate mode selector | Is a distinct baseline-only mode needed? | G1 preserves the original ending before expansion and defers it afterward; it does not add a separate mode selector |
| Before model evolution | Preserve each known quirk, add a separately scoped expansion route, or authorize a fix in another order? | Model/dashboard circularity and ending re-entry affect prerequisites; fixes are not authorized here |
| Before save design | Where is era authority stored; how do legacy saves, mid-transition saves and reset histories behave? | No era schema exists; loaded scores must not skip required experience |
| Before balancing | What measures Capacity, Demand, Verification and Velocity; what thresholds and pacing apply? | The causal distinction is locked but numbers/formulas are not |
| Before transition scripting | Which real activity hosts the pilot; how are deferral, failure, replay and recovery handled? | The mandatory AI sequence needs completion evidence and cannot strand cautious play |
| Before connected tools | Which fictional systems, scopes, permission levels and containment options are sufficient? | Breadth should support the joke and causality, not simulate enterprise software |
| Before crisis scripting | How does a governed/cautious route experience an incident and satisfy reset gates? | Required consequences should not force one unsafe authority decision or invalidate meaningful governance |
| Before Access Matrix | What is the learnable linkage/health/solvability model, event cadence and eventual exit policy? | Deterministic side effects and temporary 100% health are locked; the puzzle rules are not |
| Before expanded New Game+ | What benefits/knowledge persist and which mandatory beats accelerate? | More power/earlier pressure are locked; baseline formula changes and skipped beats are not |

Until these decisions receive explicit direction, later work should not present a detailed state schema, new numeric balance, quirk fix or implementation plan as approved by this document. This work order ends with design authority and repository handoff only.

## P1 playtest corrections — locked scope (2026-10-04)

**LOCKED DESIGN — routine SQL.** Wave 3 proves that human-per-query review cannot scale. The existing S4/S5 proof remains mandatory. Explicitly acknowledging `review_bottleneck_visible` establishes Acceleration and transfers pending routine SQL into automation, without a reward or any additional review threshold. Routine incoming requests then count at the existing accelerated cadence, without Clean Data, PU, TU or meeting progress. Historical human reviews remain evidence; ordinary manual Ad-Hoc SQL remains available with its original reward. Later gameplay must not require endless SQL review clicks. Coherent old wave-3 saves already in Acceleration or later migrate in place; later progression/evidence is retained. See `useGameEngine::acknowledgeAccelerationUpdate`, `arriveAIReview` and `hydrateState`.

**LOCKED DESIGN — governance exit.** Govern the Machine is not permanently irreversible. It commits the analyst to the first Access Matrix stabilization. With complete derived S14/S15 ending proof, `govern_machine`, `stabilizedOnce` and the exact target board, the analyst may leave through the existing confirmed expansion New Game+ action. Cancel changes no run state; REBOOT uses the same expansion bonus and reset, with no extra governance bonus. Ordinary Act I Ascension remains deferred under G1; this does not reopen OMNISCIENCE or change its formula. Governance lifecycle beyond first stabilization remains optional/unimplemented. See `useGameEngine::canRebootExpansion`, `rebootExpansionNewGame`, `ExpansionEnding`, `AccessMatrix` and `Workstation`.

**LOCKED IMPLEMENTATION SCOPE.** P1 also raises only the `WorldStats` stacking context to z20 above the main z10 grid and below z50 modal overlays. No new topology, lifecycle events, incidents, SQL exception mechanics, policy changes, backend/API or dependency is authorized by these corrections. Earlier S4–S16 notes about indefinite human SQL service and an irreversible Govern route describe the superseded implementation.


## Omniscience finale entry — explicit user resolution (2026-10-04)

**LOCKED DESIGN.** The quiet PROJECT: OMNISCIENCE book finale requires at least one New Game+ first, then completed governance/first exact Access Matrix stabilization in the current run, with existing repaired-source/executive-rollout evidence. First-run governance completion offers the existing confirmed NG+; in a later run the analyst may deploy Omniscience for the unchanged100TU cost or choose NG+ again. The finale must have its own reachable control, rather than being replaced by the NG+ button.

This supersedes the prior P1 statement that ordinary OMNISCIENCE never reopens after governance, and the old pre-expansion score-only shortcut. Early expansion/unsolved governance remain gated; no mandatory beat is skipped. Existing positive Neural Link proves prior current NG+; no new run-history schema is required. Preserve policy/repair/history/matrix authority, activity guards, dedicated NG+ formula/reset and the quiet READ→THE ANALYST COMPLETE presentation. No recurring governance lifecycle, new incident or S17 is authorized.
