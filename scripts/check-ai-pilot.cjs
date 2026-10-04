// Focused S0-S16/G1 checks using installed TypeScript, Node assertions and stubbed React/timers.
// Browser smoke separately verifies actual rendering and persistence.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const baseline = '1263845279e9afd65ac05a6a1ac809e9bc70ee3c';
const emptyExecutive = {active:false,step:'evidence_packet',controlsAccepted:false,fullAutomationRolloutStarted:false};
const emptyRemediation = {active:false,step:'supplier_clarification',supplierSemanticsConfirmed:false,ruleApproved:false,resolvedProducts:0};
const emptyInvestigation = {active:false,step:'complaint',rootCauseProven:false};
const emptyIncident = {active:false,batchesObserved:0,quarantined:0,affectedProducts:0,customerImpactVisible:false};
const emptyScale = {active:false,batchSize:0,batchesProcessed:0,totalRouted:0,autoApplied:0,reviewRouted:0,reviewBacklog:0};
const emptyPolicy = {configured:false,active:false,autoClasses:[],legacyPending:0,autoAppliedTotal:0,manualRoutedTotal:0,manualCompleted:0,routeSequence:0,trial:{active:false,total:0,autoApplied:0,manualPending:0,manualApproved:0}};
const emptyProductWriteQueue = {active:false,pending:0,completed:0,totalArrived:0,nextArrivalTick:0,arrivalIntervalTicks:0,peakPending:0};
const purchases = { pandas_scripts: true, sql_optimization: true, local_server: true };

function mount(seed = null, original = false) {
  const modules = {}, slots = [], refs = [], effects = [], callbacks = [], intervals = new Map(), timeouts = new Map();
  let reloads = 0;
  let cursor, refCursor, effectCursor, callbackCursor, dirty, api, nextInterval = 0, saved = seed && JSON.stringify(seed);
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], update => {
        const next = typeof update === 'function' ? update(slots[i]) : update;
        if (next !== slots[i]) { slots[i] = next; dirty = true; }
      }];
    },
    useRef(value) { const i = refCursor++; return refs[i] ??= { current: value }; },
    useEffect(fn, deps) {
      const i = effectCursor++, prev = effects[i];
      if (!prev || deps.some((dep, j) => dep !== prev.deps[j])) effects[i] = { fn, deps, pending: true, cleanup: prev?.cleanup };
    },
    useCallback(fn, deps) {
      const i = callbackCursor++, prev = callbacks[i];
      if (!prev || deps.some((dep, j) => dep !== prev.deps[j])) callbacks[i] = { fn, deps };
      return callbacks[i].fn;
    },
  };
  const math = Object.create(Math); math.random = () => 0.5;
  class FixedDate extends Date { static now() { return 123456789; } }
  function load(name) {
    if (modules[name]) return modules[name];
    const source = original
      ? cp.execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), 'show', baseline + ':' + name], { encoding: 'utf8' })
      : fs.readFileSync(path.join(root, name), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {}; modules[name] = exports;
    vm.runInNewContext(output, {
      exports, require: spec => spec === 'react' ? react : load(spec.includes('constants') ? 'constants.ts' : 'types.ts'),
      Date: FixedDate, Math: math, console: { log() {}, error(error) { throw error; } },
      localStorage: { getItem: () => saved, setItem: (_key, value) => { saved = value; }, removeItem: () => { saved = null; } },
      window: { location: { reload: () => { reloads++; } } },
      setTimeout: (fn, ms) => { const id = ++nextInterval; timeouts.set(id, { fn, ms }); return id; },
      setInterval: (fn, ms) => { const id = ++nextInterval; intervals.set(id, { fn, ms }); return id; },
      clearInterval: id => intervals.delete(id),
    }, { filename: name });
    return exports;
  }
  const engine = load('hooks/useGameEngine.ts');
  function flush() {
    let renders = 0;
    do {
      assert(++renders < 20, 'effects must settle');
      dirty = false; cursor = refCursor = effectCursor = callbackCursor = 0;
      api = engine.useGameEngine();
      for (const effect of effects) if (effect.pending) {
        effect.pending = false; effect.cleanup?.(); effect.cleanup = effect.fn();
      }
    } while (dirty);
  }
  flush();
  return {
    state: () => JSON.parse(JSON.stringify(slots[0])),
    presentation: () => api.pilotIntroduction,
    queueAttempt: () => api.sqlQueueAttemptId,
    operational: () => api.operationalRollout,
    acceleration: () => api.accelerationUpdate,
    schemaUpdate: () => api.schemaUpdate,
    connectedUpdate: () => api.connectedUpdate,
    omniscienceReady: () => api.omniscienceReady,
    omniscienceAvailable: () => api.omniscienceAvailable,
    newGameAvailable: () => api.expansionNewGameAvailable,
    roleAvailable: () => api.expansionRoleAvailable,
    matrixAvailable: () => api.accessMatrixAvailable,
    accessRules: () => {const c=load('constants.ts');return JSON.parse(JSON.stringify({target:c.ACCESS_TARGET,dependencies:c.ACCESS_DEPENDENCIES,scramble:c.ACCESS_SCRAMBLE,start:c.initialAccessCells()}));},
    health: cells => load('constants.ts').getAccessMatrixHealth(cells),
    executiveAvailable: () => api.executiveReviewAvailable,
    endingReady: () => api.expansionEndingReady,
    repairAvailable: () => api.sourceRemediationAvailable,
    amendment: () => JSON.parse(JSON.stringify(load('constants.ts').SOURCE_WIDTH_AMENDMENT)),
    traceAvailable: () => api.incidentTraceAvailable,
    traceEvidence: () => JSON.parse(JSON.stringify(load('constants.ts').INCIDENT_TRACE_EVIDENCE)),
    sourceDriftUpdate: () => api.sourceDriftUpdate,
    writeScaleUpdate: () => api.writeScaleUpdate,
    velocity: () => JSON.parse(JSON.stringify(load('constants.ts').getProductWriteVelocity(slots[0].connectedEnterprise.productWritePolicy.autoClasses.length))),
    writePolicyUpdate: () => api.writePolicyUpdate,
    trialAvailable: () => api.policyTrialAvailable,
    writeUpdate: () => api.writeUpdate,
    writeQueueUpdate: () => api.writeQueueUpdate,
    writeQueueAvailable: () => api.productWriteQueueAvailable,
    writeProposal: () => api.productWriteProposal && JSON.parse(JSON.stringify(api.productWriteProposal)),
    writeAvailable: () => api.productWriteAvailable,
    writeAttempt: () => api.productWriteAttempt && JSON.parse(JSON.stringify(api.productWriteAttempt)),
    writeRecords: () => JSON.parse(JSON.stringify(api.productWriteRecords)),
    connectedAvailable: () => api.connectedMappingAvailable,
    schemaAvailable: () => api.schemaBatchAvailable,
    schemaAttempt: () => api.schemaBatchAttempt && JSON.parse(JSON.stringify(api.schemaBatchAttempt)),
    deferred: () => load('constants.ts').isAscensionDeferred(slots[0]),
    rebooting: () => api.isRebooting,
    timeout(ms) { const entry = [...timeouts.entries()].find(([, timer]) => timer.ms === ms); assert(entry, 'expected delayed reset'); timeouts.delete(entry[0]); entry[1].fn(); flush(); },
    saved: () => saved && JSON.parse(saved),
    reloads: () => reloads,
    action(name, ...args) { const result = api.actions[name](...args); flush(); return result; },
    purchase(id) { api.actions.purchaseUpgrade(load('constants.ts').UPGRADES.find(upgrade => upgrade.id === id)); flush(); },
    tick() { [...intervals.values()].find(i => i.ms === 200).fn(); flush(); },
    save() { [...intervals.values()].find(i => i.ms === 2000).fn(); return JSON.parse(saved); },
  };
}
const progress = step => ({ era: step === 'automation_recognized' ? 'analyst' : 'automation', transition: { targetEra: 'ai_pilot', step } });
function compareTicks(seed) {
  const oldGame = mount(seed, true), newGame = mount(seed);
  for (let tick = 0; tick <= 20; tick++) {
    const actual = newGame.state(); delete actual.expansionEnding; delete actual.expansionProgress; delete actual.aiReviewQueue; delete actual.aiReviewDemand; delete actual.schemaBatchReview; delete actual.connectedEnterprise;
    const expected = oldGame.state(); delete expected.expansionEnding; delete expected.expansionProgress; delete expected.aiReviewQueue; delete expected.aiReviewDemand; delete expected.schemaBatchReview; delete expected.connectedEnterprise;
    assert.deepEqual(actual, expected, 'baseline state at tick ' + tick);
    if (tick < 20) { oldGame.tick(); newGame.tick(); }
  }
}
compareTicks();
const below = { upgrades: { pandas_scripts: true, sql_optimization: true }, rawData: 300, cleanData: 600, cleanDataRate: 4, metricRate: 1, pu: 400 };
compareTicks(below);
assert.deepEqual(mount(below).state().expansionProgress, { era: 'analyst', transition: null });
for (const missing of Object.keys(purchases)) {
  const upgrades = { ...purchases }; delete upgrades[missing];
  const almost = mount({ ...below, upgrades });
  for (let tick = 0; tick < 20; tick++) almost.tick();
  assert.deepEqual(almost.state().expansionProgress, { era: 'analyst', transition: null }, missing);
}
const highLegacy = mount({ pu: 1e12, tu: 1e9, prestige: { level: 999 } });
assert.deepEqual(highLegacy.state().expansionProgress, { era: 'analyst', transition: null });
const eligibleSeed = { ...below, upgrades: purchases };
compareTicks(eligibleSeed); // During introduction, the original economy still evolves identically.
for (const step of ['automation_recognized', 'pilot_announced', 'pilot_ready', 'pilot_success', 'demand_pending']) {
  const game = mount({ ...eligibleSeed, expansionProgress: progress(step), unknownField: 42 });
  for (let tick = 0; tick < 20; tick++) game.tick();
  assert.deepEqual(game.state().expansionProgress, progress(step));
  assert.deepEqual(mount(game.save()).state().expansionProgress, progress(step));
  assert.equal(game.save().unknownField, 42);
}
const game = mount(eligibleSeed);
assert.deepEqual(game.state().expansionProgress, progress('automation_recognized'));
game.action('advancePilotIntroduction', 'pilot_announced'); // Can't skip recognition.
assert.deepEqual(game.state().expansionProgress, progress('automation_recognized'));
const before = game.state();
game.action('advancePilotIntroduction', 'automation_recognized');
game.action('advancePilotIntroduction', 'automation_recognized'); // Stale double-click is idempotent.
assert.deepEqual(game.state().expansionProgress, progress('pilot_announced'));
game.action('advancePilotIntroduction', 'pilot_announced');
game.action('establishExpansionEra', 'ai_pilot');
game.action('advancePilotIntroduction', 'pilot_ready');
assert.deepEqual(game.state().expansionProgress, progress('pilot_ready'));
const after = game.state(); delete before.expansionEnding; delete before.expansionProgress; delete before.aiReviewQueue; delete before.aiReviewDemand; delete before.schemaBatchReview; delete before.connectedEnterprise; delete after.expansionEnding; delete after.expansionProgress; delete after.aiReviewQueue; delete after.aiReviewDemand; delete after.schemaBatchReview; delete after.connectedEnterprise;
assert.deepEqual(after, before, 'acknowledgements change only progression');
for (const blocker of ['spaghettiMode', 'pandasMode', 'sqlMode', 'modelMode', 'miningMode', 'flowMode', 'buzzwordMode', 'pdfMode', 'isAscending']) {
  const blocked = mount({ ...eligibleSeed, [blocker]: true });
  assert.equal(blocked.presentation().available, false, blocker);
  blocked.action('advancePilotIntroduction', 'automation_recognized');
  assert.deepEqual(blocked.state().expansionProgress, blocker === 'isAscending' ? { era: 'analyst', transition: null } : progress('automation_recognized'));
}
for (const block of [{ coffeeBreak: { active: true } }, { boardMeeting: { active: true, timeRemaining: 30 } }, { blockingTask: { name: 'Busy' } }, { activeEvents: [{ id: 'storage_full_warning' }] }]) {
  const blocked = mount({ ...eligibleSeed, ...block });
  assert.equal(blocked.presentation().available, false);
  blocked.action('advancePilotIntroduction', 'automation_recognized');
  assert.deepEqual(blocked.state().expansionProgress, progress('automation_recognized'));
}
const ending = mount({ ...eligibleSeed, tu: 10, isAscending: true, upgrades: { ...purchases, project_omniscience: true } });
assert.equal(ending.state().isAscending, true);
assert.equal(ending.presentation().available, false);
assert.deepEqual(ending.state().expansionProgress, { era: 'analyst', transition: null });
ending.action('beginExpansionTransition', 'ai_pilot', 'automation_recognized');
assert.deepEqual(ending.state().expansionProgress, { era: 'analyst', transition: null }, 'open baseline ending cannot start handoff');
ending.action('cancelAscension');
assert.equal(ending.presentation().available, true);
assert.deepEqual(ending.state().expansionProgress, progress('automation_recognized'));
for (const level of [0, 3]) for (const meeting of [false, true]) {
  const seed = { ...eligibleSeed, sqlMode: true, expansionProgress: progress('pilot_ready'), prestige: { level },
    boardMeeting: { active: meeting, target: 100000, progress: 5, timeRemaining: 120 } };
  const manual = mount(seed), assisted = mount(seed), originalSQL = mount(seed, true);
  const initial = assisted.state();
  assisted.action('completeSQLPilotQuery', 123); // Claiming success without an issued attempt is insufficient.
  assisted.action('completeSQLPilotQuery', undefined);
  assert.deepEqual(assisted.state(), initial);
  const attempt = assisted.action('beginSQLPilotAttempt');
  assert.equal(typeof attempt, 'number');
  assert.deepEqual(assisted.state(), initial, 'preparation grants no reward/progression');
  manual.action('completeSQLQuery', 100, 250);
  originalSQL.action('completeSQLQuery', 100, 250);
  const currentManual = manual.state(), baselineManual = originalSQL.state();
  delete currentManual.expansionEnding; delete currentManual.expansionProgress; delete currentManual.aiReviewQueue; delete currentManual.aiReviewDemand; delete currentManual.schemaBatchReview; delete currentManual.connectedEnterprise; delete baselineManual.expansionEnding; delete baselineManual.expansionProgress; delete baselineManual.aiReviewQueue; delete baselineManual.aiReviewDemand; delete baselineManual.schemaBatchReview; delete baselineManual.connectedEnterprise;
  assert.deepEqual(currentManual, baselineManual, 'ordinary SQL reward matches original source baseline');
  assert.deepEqual(manual.state().expansionProgress, progress('pilot_ready'), 'manual cannot advance pilot');
  assisted.action('completeSQLPilotQuery', attempt);
  assert.deepEqual(assisted.state().expansionProgress, progress('pilot_success'));
  const actual = assisted.state(), expected = manual.state();
  delete actual.expansionEnding; delete actual.expansionProgress; delete actual.aiReviewQueue; delete actual.aiReviewDemand; delete actual.schemaBatchReview; delete actual.connectedEnterprise; delete expected.expansionEnding; delete expected.expansionProgress; delete expected.aiReviewQueue; delete expected.aiReviewDemand; delete expected.schemaBatchReview; delete expected.connectedEnterprise;
  assert.deepEqual(actual, expected, 'manual/assisted rewards and meeting contributions are identical');
  assert.equal(actual.cleanData - initial.cleanData, 100 * (1 + level * 0.1));
  assert.equal(actual.pu - initial.pu, 250 * (1 + level * 0.1));
  assert.equal(actual.boardMeeting.progress - initial.boardMeeting.progress, meeting ? 250 * (1 + level * 0.1) : 0);
  const completed = assisted.state();
  assisted.action('completeSQLPilotQuery', attempt);
  assert.deepEqual(assisted.state(), completed, 'duplicate completion does not reward twice');
}
const readySeed = { ...eligibleSeed, sqlMode: true, expansionProgress: progress('pilot_ready') };
const closed = mount(readySeed), staleAttempt = closed.action('beginSQLPilotAttempt');
closed.action('toggleSQLMode');
closed.action('toggleSQLMode');
const reopened = closed.state();
closed.action('completeSQLPilotQuery', staleAttempt);
assert.deepEqual(closed.state(), reopened, 'closed task attempt cannot complete after reopening');
assert.notEqual(closed.action('beginSQLPilotAttempt'), staleAttempt);
for (const interaction of ['blocking task', 'OMNISCIENCE']) {
  const collisionSeed = { ...readySeed, tu: 110, activeChats: [{ id: 'pending', scenarioId: 'logo_size', timestamp: 123456789 }] };
  const manual = mount(collisionSeed), assisted = mount(collisionSeed);
  const attempt = assisted.action('beginSQLPilotAttempt');
  for (const game of [manual, assisted]) {
    if (interaction === 'blocking task') game.action('resolveChat', 'pending', 0);
    else game.purchase('project_omniscience');
  }
  manual.action('completeSQLQuery', 100, 250);
  assisted.action('completeSQLPilotQuery', attempt);
  assert.deepEqual(assisted.state().expansionProgress, progress('pilot_success'));
  const actual = assisted.state(), expected = manual.state();
  delete actual.expansionEnding; delete actual.expansionProgress; delete actual.aiReviewQueue; delete actual.aiReviewDemand; delete actual.schemaBatchReview; delete actual.connectedEnterprise; delete expected.expansionEnding; delete expected.expansionProgress; delete expected.aiReviewQueue; delete expected.aiReviewDemand; delete expected.schemaBatchReview; delete expected.connectedEnterprise;
  assert.deepEqual(actual, expected, 'already-executed completion follows original reward behavior during ' + interaction);
  assert.equal(assisted.presentation().available, false, 'feedback deferred during ' + interaction);
  if (interaction === 'OMNISCIENCE') {
    assisted.action('cancelAscension');
    assert.deepEqual(assisted.state().expansionProgress, progress('pilot_success'));
  } else {
    assisted.action('toggleSQLMode');
    assert.equal(assisted.state().sqlMode, true, 'existing blocking-task close guard is preserved');
  }
}
for (const step of ['automation_recognized', 'pilot_announced', 'pilot_success', 'demand_pending']) {
  const other = mount({ ...readySeed, expansionProgress: progress(step) });
  assert.equal(other.action('beginSQLPilotAttempt'), null);
  const original = other.state(); other.action('completeSQLPilotQuery', 1);
  assert.deepEqual(other.state(), original);
}
for (const block of [{ sqlMode: false }, { isAscending: true }, { blockingTask: { name: 'Busy' } }]) {
  assert.equal(mount({ ...readySeed, ...block }).action('beginSQLPilotAttempt'), null);
}
const feedback = mount({ ...eligibleSeed, expansionProgress: progress('pilot_success') });
const feedbackBefore = feedback.state();
feedback.action('advancePilotIntroduction', 'pilot_success');
assert.deepEqual(feedback.state().expansionProgress, progress('demand_pending'));
const feedbackAfter = feedback.state(); delete feedbackBefore.expansionEnding; delete feedbackBefore.expansionProgress; delete feedbackBefore.aiReviewQueue; delete feedbackBefore.aiReviewDemand; delete feedbackBefore.schemaBatchReview; delete feedbackBefore.connectedEnterprise; delete feedbackAfter.expansionEnding; delete feedbackAfter.expansionProgress; delete feedbackAfter.aiReviewQueue; delete feedbackAfter.aiReviewDemand; delete feedbackAfter.schemaBatchReview; delete feedbackAfter.connectedEnterprise;
assert.deepEqual(feedbackAfter, feedbackBefore, 'management response adds no demand/rewards');
assert.deepEqual(mount(feedback.save()).state().expansionProgress, progress('demand_pending'));
compareTicks({ ...eligibleSeed, expansionProgress: progress('demand_pending') });
const demandSeed = { ...eligibleSeed, expansionProgress: progress('demand_pending') };
assert.deepEqual(mount({ aiReviewQueue: {} }).state().aiReviewQueue, { pending: 0, completed: 0, wave: 0 });
assert.deepEqual(mount({ aiReviewQueue: { pending: -1, completed: '3', wave: null } }).state().aiReviewQueue, { pending: 0, completed: 0, wave: 0 });
for (const blocker of [{ isAscending: true }, { pdfMode: true }, { activeEvents: [{ id: 'storage_full_warning' }] }, { boardMeeting: { active: true } }, { blockingTask: { name: 'Busy' } }]) {
  const blocked = mount({ ...demandSeed, ...blocker });
  blocked.action('advancePilotIntroduction', 'demand_pending');
  assert.equal(blocked.state().aiReviewQueue.wave, 0);
}
const rollout = mount(demandSeed);
rollout.action('advancePilotIntroduction', 'rollout_success');
assert.equal(rollout.state().aiReviewQueue.wave, 0, 'cannot skip first queue');
rollout.action('advancePilotIntroduction', 'demand_pending');
assert.deepEqual(rollout.state().aiReviewQueue, { pending: 3, completed: 0, wave: 1 });
const firstWaveSeed = rollout.save();
const omniQueue = mount({ ...firstWaveSeed, tu: 110 });
const beforeOmniQueue = omniQueue.state();
omniQueue.purchase('project_omniscience');
assert.deepEqual(omniQueue.state(), beforeOmniQueue, 'queue OMNISCIENCE attempt has no effects');
assert.equal(omniQueue.state().isAscending, false);
assert.deepEqual(omniQueue.state().aiReviewQueue, firstWaveSeed.aiReviewQueue);
omniQueue.action('openNextAIReview'); assert.equal(typeof omniQueue.queueAttempt(), 'number');
compareTicks(firstWaveSeed);
for (let completed = 0; completed < 3; completed++) {
  const before = rollout.state();
  rollout.action('completeAIReviewQuery', 999);
  assert.deepEqual(rollout.state(), before, 'unissued result rejected');
  rollout.action('openNextAIReview');
  const id = rollout.queueAttempt();
  assert.equal(typeof id, 'number');
  const issued = rollout.state();
  rollout.action('completeAIReviewQuery', undefined);
  assert.deepEqual(rollout.state(), issued);
  rollout.action('completeAIReviewQuery', id);
  const paid = rollout.state();
  assert.equal(paid.aiReviewQueue.pending, 2 - completed);
  assert.equal(paid.aiReviewQueue.completed, completed + 1);
  rollout.action('completeAIReviewQuery', id);
  assert.deepEqual(rollout.state(), paid, 'one attempt pays exactly once even with more pending');
  rollout.action('toggleSQLMode');
  const recovered = mount(rollout.save());
  assert.deepEqual(recovered.state().aiReviewQueue, rollout.state().aiReviewQueue);
}
assert.deepEqual(rollout.state().expansionProgress, progress('rollout_success'));
rollout.action('openNextAIReview');
assert.equal(rollout.queueAttempt(), null);
assert.equal(rollout.state().aiReviewQueue.pending, 0, 'no silent refill');
rollout.action('establishExpansionEra', 'ai_pilot');
assert.equal(rollout.state().expansionProgress.era, 'automation', 'generic establishment remains unavailable');
rollout.action('advancePilotIntroduction', 'rollout_success');
assert.deepEqual(rollout.state().aiReviewQueue, { pending: 6, completed: 0, wave: 2 });
assert.deepEqual(rollout.state().expansionProgress, { era: 'ai_pilot', transition: null });
assert.deepEqual(mount(rollout.save()).state().aiReviewQueue, rollout.state().aiReviewQueue);
compareTicks(rollout.save());
const abandoned = mount(firstWaveSeed);
abandoned.action('openNextAIReview');
const abandonedId = abandoned.queueAttempt();
const reload = mount(abandoned.save());
const reloadBefore = reload.state();
reload.action('completeAIReviewQuery', abandonedId);
assert.deepEqual(reload.state(), reloadBefore, 'reload drops issued draft authority, preserving workload');
abandoned.action('toggleSQLMode');
abandoned.action('openNextAIReview');
assert.notEqual(abandoned.queueAttempt(), abandonedId);
const retryBefore = abandoned.state();
abandoned.action('completeAIReviewQuery', abandonedId);
assert.deepEqual(abandoned.state(), retryBefore, 'closed attempt cannot consume retry');
for (const level of [0, 3]) for (const meeting of [false, true]) {
  const queued = mount({ ...firstWaveSeed, prestige: { level }, tick: meeting ? 300 : 500 });
  queued.action('openNextAIReview');
  if (meeting) queued.tick(); // Original meeting starts during an already-open query.
  const referenceSeed = queued.state();
  assert.equal(referenceSeed.boardMeeting.active, meeting);
  const manual = mount(referenceSeed);
  manual.action('completeSQLQuery', 100, 250);
  queued.action('completeAIReviewQuery', queued.queueAttempt());
  assert.equal(queued.state().cleanData, manual.state().cleanData);
  assert.equal(queued.state().pu, manual.state().pu);
  assert.equal(queued.state().boardMeeting.progress, manual.state().boardMeeting.progress);
  assert.equal(manual.state().boardMeeting.progress - referenceSeed.boardMeeting.progress, meeting ? 250 * (1 + level * .1) : 0);
  assert.deepEqual(manual.state().aiReviewQueue, firstWaveSeed.aiReviewQueue, 'manual reward cannot consume queue');
}
for (const step of ['automation_recognized', 'pilot_announced', 'pilot_ready', 'pilot_success', 'demand_pending', 'rollout_success']) {
  const denied = mount({ ...firstWaveSeed, expansionProgress: progress(step) });
  denied.action('openNextAIReview');
  assert.equal(denied.queueAttempt(), null, step);
}
for (const blocker of [{ isAscending: true }, { sqlMode: true }, { blockingTask: { name: 'Busy' } }, { coffeeBreak: { active: true } }, { boardMeeting: { active: true } }]) {
  const denied = mount({ ...firstWaveSeed, ...blocker });
  denied.action('openNextAIReview'); assert.equal(denied.queueAttempt(), null);
}
const finalWave = mount(rollout.save());
for (let i = 0; i < 6; i++) {
  finalWave.action('openNextAIReview'); finalWave.action('completeAIReviewQuery', finalWave.queueAttempt()); finalWave.action('toggleSQLMode');
}
assert.deepEqual(finalWave.state().aiReviewQueue, { pending: 0, completed: 6, wave: 2 });
finalWave.action('openNextAIReview'); assert.equal(finalWave.queueAttempt(), null);
assert.equal(finalWave.state().expansionProgress.era, 'ai_pilot', 'no acceleration or regeneration');
assert.deepEqual(finalWave.state().expansionProgress.transition, { targetEra: 'acceleration', step: 'continuous_demand_offer' });
assert.equal(finalWave.state().aiReviewDemand.active, false, 'second wave stays finite until explicit acknowledgement');
const baselineProgress = { era: 'analyst', transition: null };
// Current finale no longer permits a score-only/pre-expansion shortcut.
for (const tu of [99, 100, 135]) {
  const seed = { tu, pu: 10000, prestige: { level: 2, currency: 7 }, expansionProgress: baselineProgress };
  const current = mount(seed), before = current.state();
  assert.equal(current.omniscienceReady(), false); current.purchase('project_omniscience');
  assert.deepEqual(current.state(), before, 'Neural Link/TU alone cannot bypass current-run governance');
  if (tu < 100) continue;
  // Retained legacy reset action/formula is tested using an already-open legacy ending.
  const legacy = { ...seed, tu: tu - 100, isAscending: true, upgrades: { project_omniscience: true } };
  const now = mount(legacy), original = mount(legacy, true);
  for (const game of [now, original]) { game.action('ascend'); assert.equal(game.rebooting(), true); game.timeout(3000); }
  const currentNG = now.saved(), originalNG = original.saved();
  for (const state of [currentNG, originalNG]) for (const key of ['expansionEnding','expansionProgress','aiReviewQueue','aiReviewDemand','schemaBatchReview','connectedEnterprise']) delete state[key];
  assert.deepEqual(currentNG, originalNG, 'retained legacy NG+ reset/prestige matches original');
  assert.equal(now.reloads(), original.reloads());
}
const sandbox = mount({ tu: 0, isAscending: true, upgrades: { project_omniscience: true }, expansionProgress: baselineProgress });
sandbox.action('cancelAscension'); assert.equal(sandbox.state().isAscending, false);
const sandboxBefore = sandbox.state(); sandbox.purchase('project_omniscience');
assert.deepEqual(sandbox.state(), sandboxBefore, 'retained legacy purchased flag cannot be paid twice');
const gatedProgress = [progress('automation_recognized'), { era: 'analyst', transition: { targetEra: 'acceleration', step: 'future' } },
  ...['automation', 'ai_pilot', 'acceleration', 'connected_enterprise', 'good_enough', 'lightspeed', 'governance_crisis'].map(era => ({ era, transition: null })),
  ...['pilot_announced', 'pilot_ready', 'pilot_success', 'demand_pending', 'rollout_review', 'rollout_success'].map(progress)];
for (const expansionProgress of gatedProgress) {
  const game = mount({ tu: 500, expansionProgress, aiReviewQueue: { pending: 6, completed: 0, wave: 2 } });
  assert.equal(game.deferred(), true);
  const before = game.state(); game.purchase('project_omniscience'); game.action('ascend');
  assert.deepEqual(game.state(), before, 'deferred paths change no TU/flags/era/queue');
  assert.equal(game.rebooting(), false, 'direct ascend cannot bypass gate');
  assert.equal(mount(game.save()).deferred(), true, 'gate derived after reload');
}
const openMixed = mount({ isAscending: true, expansionProgress: { era: 'ai_pilot', transition: null } });
openMixed.action('ascend'); assert.equal(openMixed.rebooting(), true, 'older open mixed ending is retained, not migrated');
const reset = mount({ expansionProgress: { era: 'ai_pilot', transition: null }, aiReviewQueue: { pending: 6, completed: 0, wave: 2 } });
reset.action('hardReset'); assert.equal(reset.rebooting(), true); reset.timeout(2000);
assert.equal(reset.saved(), null); assert.equal(reset.reloads(), 1, 'factory reset remains available during expansion');
const inactiveDemand = { automated:false, automatedTotal:0, active: false, arrivalIntervalTicks: 40, nextArrivalTick: 0, totalArrived: 0, totalCompleted: 0, acceleratedArrivals: 0, acceleratedReviews: 0, acceleratedPeakPending: 0 };
assert.deepEqual(mount().state().aiReviewDemand, inactiveDemand);
assert.deepEqual(mount({ pu: 1e12, tu: 1e9, prestige: { level: 999 }, aiReviewDemand: {} }).state().aiReviewDemand, inactiveDemand);
assert.deepEqual(mount({ aiReviewDemand: { active: 'true', arrivalIntervalTicks: 0, nextArrivalTick: -1, totalArrived: '3', totalCompleted: 1.5 } }).state().aiReviewDemand, inactiveDemand);
const offerSeed = { ...finalWave.save(), tick: 500, rawDataRate: 0, cleanDataRate: 0, metricRate: 0 };
const offered = mount(offerSeed);
assert.equal(offered.operational().offered, true);
for (let i = 0; i < 80; i++) offered.tick();
assert.deepEqual(offered.state().aiReviewDemand, inactiveDemand);
assert.deepEqual(offered.state().aiReviewQueue, { pending: 0, completed: 6, wave: 2 });
assert.equal(mount(offered.save()).operational().offered, true);
const oldCleared = mount({ ...offerSeed, expansionProgress: { era: 'ai_pilot', transition: null } });
assert.equal(oldCleared.operational().offered, true, 'cleared pre-S4 queue resumes at offer, not new six');
for (const blocker of [{ sqlMode: true }, { boardMeeting: { active: true } }, { blockingTask: { name: 'Busy' } }, { coffeeBreak: { active: true } }, { isAscending: true }]) {
  const blocked = mount({ ...offerSeed, ...blocker }); const before = blocked.state();
  blocked.action('acknowledgeOperationalRollout'); assert.deepEqual(blocked.state(), before);
}
offered.action('acknowledgeOperationalRollout');
const activeSeed = offered.save();
assert.deepEqual(activeSeed.aiReviewQueue, { pending: 4, completed: 0, wave: 3 });
assert.deepEqual(activeSeed.aiReviewDemand, { ...inactiveDemand, active: true, nextArrivalTick: activeSeed.tick + 40 });
assert.deepEqual(activeSeed.expansionProgress, { era: 'ai_pilot', transition: { targetEra: 'acceleration', step: 'continuous_demand_active' } });
const once = offered.state(); offered.action('acknowledgeOperationalRollout'); assert.deepEqual(offered.state(), once);
offered.action('establishExpansionEra', 'acceleration'); assert.deepEqual(offered.state(), once);
for (let i = 0; i < 39; i++) offered.tick();
assert.equal(offered.state().aiReviewQueue.pending, 4);
const partialSchedule = mount(offered.save()); partialSchedule.tick();
assert.equal(partialSchedule.state().aiReviewQueue.pending, 5);
assert.equal(partialSchedule.state().aiReviewDemand.totalArrived, 1);
const afterArrival = mount(partialSchedule.save()); afterArrival.tick();
assert.equal(afterArrival.state().aiReviewDemand.totalArrived, 1, 'reload does not duplicate arrival');
const overdue = mount({ ...activeSeed, tick: activeSeed.aiReviewDemand.nextArrivalTick + 400 });
overdue.tick(); assert.equal(overdue.state().aiReviewDemand.totalArrived, 1, 'overdue schedule never catches up missed intervals');
assert.equal(overdue.state().aiReviewDemand.nextArrivalTick, overdue.state().tick + 40);
overdue.tick(); assert.equal(overdue.state().aiReviewDemand.totalArrived, 1);
const flow = mount(activeSeed); flow.action('openNextAIReview'); const flowId = flow.queueAttempt();
for (let i = 0; i < 40; i++) flow.tick();
assert.equal(flow.state().sqlMode, true); assert.equal(flow.state().aiReviewQueue.pending, 5, 'arrival while reviewing');
const reference = mount(flow.state()); reference.action('completeSQLQuery', 100, 250);
flow.action('completeAIReviewQuery', flowId);
assert.equal(flow.state().aiReviewQueue.pending, 4); assert.equal(flow.state().aiReviewDemand.totalCompleted, 1);
assert.equal(flow.state().cleanData, reference.state().cleanData); assert.equal(flow.state().pu, reference.state().pu);
const paidFlow = flow.state(); flow.action('completeAIReviewQuery', flowId); assert.deepEqual(flow.state(), paidFlow);
flow.action('toggleSQLMode'); for (let i = 0; i < 40; i++) flow.tick();
assert.equal(flow.state().aiReviewQueue.pending, 5, 'flow replenishes again');
const queueBeforeManual = flow.state().aiReviewQueue, demandBeforeManual = flow.state().aiReviewDemand;
flow.action('completeSQLQuery', 100, 250);
assert.deepEqual(flow.state().aiReviewQueue, queueBeforeManual); assert.deepEqual(flow.state().aiReviewDemand, demandBeforeManual);
const arrivalOnly = mount(activeSeed);
for (let i = 0; i < 120; i++) arrivalOnly.tick();
assert.equal(arrivalOnly.state().aiReviewDemand.totalArrived, 3);
assert.equal(arrivalOnly.state().expansionProgress.transition.step, 'continuous_demand_active');
const completionOnly = mount(activeSeed);
for (let i = 0; i < 3; i++) {
  completionOnly.action('openNextAIReview'); completionOnly.action('completeAIReviewQuery', completionOnly.queueAttempt()); completionOnly.action('toggleSQLMode');
}
assert.equal(completionOnly.state().aiReviewDemand.totalCompleted, 3);
assert.equal(completionOnly.state().expansionProgress.transition.step, 'continuous_demand_active');
for (let i = 0; i < 120; i++) completionOnly.tick();
assert.deepEqual(completionOnly.state().expansionProgress, { era: 'ai_pilot', transition: { targetEra: 'acceleration', step: 'pressure_visible' } });
for (let i = 0; i < 3; i++) {
  arrivalOnly.action('openNextAIReview'); arrivalOnly.action('completeAIReviewQuery', arrivalOnly.queueAttempt()); arrivalOnly.action('toggleSQLMode');
}
assert.equal(arrivalOnly.state().expansionProgress.transition.step, 'pressure_visible', 'proof works whichever counter reaches three last');
const demandReload = mount(completionOnly.save());
assert.deepEqual(demandReload.state().aiReviewDemand, completionOnly.state().aiReviewDemand);
assert.deepEqual(demandReload.state().aiReviewQueue, completionOnly.state().aiReviewQueue);
assert.deepEqual(demandReload.state().expansionProgress, completionOnly.state().expansionProgress);
const capSeed = { ...activeSeed, aiReviewQueue: { pending: 12, completed: 0, wave: 3 }, aiReviewDemand: { ...activeSeed.aiReviewDemand, nextArrivalTick: activeSeed.tick + 1 } };
const capped = mount(capSeed), ordinary = mount({ ...capSeed, aiReviewDemand: inactiveDemand });
for (let i = 0; i < 81; i++) { capped.tick(); ordinary.tick(); }
assert.equal(capped.state().aiReviewQueue.pending, 12); assert.equal(capped.state().aiReviewDemand.totalArrived, 0);
const cappedState = capped.state(), ordinaryState = ordinary.state(); delete cappedState.aiReviewDemand; delete cappedState.schemaBatchReview; delete cappedState.connectedEnterprise; delete ordinaryState.aiReviewDemand; delete ordinaryState.schemaBatchReview; delete ordinaryState.connectedEnterprise;
assert.deepEqual(cappedState, ordinaryState, 'full queue adds no penalty, output, resource or entropy changes');
for (const paused of [mount({ ...activeSeed, isAscending: true }), mount(activeSeed)]) {
  if (!paused.state().isAscending) paused.action('hardReset');
  const before = paused.state(); for (let i = 0; i < 80; i++) paused.tick(); assert.deepEqual(paused.state(), before, 'existing global pause stops arrivals');
}
for (const ordinaryActivity of [{ sqlMode: true }, { coffeeBreak: { active: true } }, { pdfMode: true }]) {
  const busy = mount({ ...activeSeed, ...ordinaryActivity }); for (let i = 0; i < 40; i++) busy.tick(); assert.equal(busy.state().aiReviewDemand.totalArrived, 1);
}
const draft = mount(activeSeed); draft.action('openNextAIReview'); const lostID = draft.queueAttempt();
const restoredDraft = mount(draft.save()), unchanged = restoredDraft.state();
restoredDraft.action('completeAIReviewQuery', lostID); assert.deepEqual(restoredDraft.state(), unchanged);
assert.equal(demandReload.deferred(), true); const beforeGate = demandReload.state(); demandReload.purchase('project_omniscience'); demandReload.action('ascend'); assert.deepEqual(demandReload.state(), beforeGate);
for (const level of [0, 3]) {
  const review = mount({ ...activeSeed, prestige: { level }, tick: 300 });
  review.action('openNextAIReview'); const id = review.queueAttempt(); review.tick();
  assert.equal(review.state().boardMeeting.active, true);
  const before = review.state(), manual = mount(before); manual.action('completeSQLQuery', 100, 250);
  review.action('completeAIReviewQuery', id);
  assert.equal(review.state().cleanData - before.cleanData, 100 * (1 + level * .1));
  assert.equal(review.state().pu - before.pu, 250 * (1 + level * .1));
  const actual = review.state(), expected = manual.state();
  for (const field of ['expansionProgress', 'aiReviewQueue', 'aiReviewDemand']) { delete actual[field]; delete expected[field]; }
  assert.deepEqual(actual, expected, 'continuous reward/log/meeting contribution identical to ordinary SQL at prestige ' + level);
}
console.log('PASS: S0-S3/G1 regression plus S4 finite offer/acknowledgement, deterministic schedule/cap, active-review arrivals, manual isolation, rewards, counters/proof in both orders, save/reload/draft guards, global pauses and Ascension deferral. Hooks/timers are stubbed; Chromium covers actual UI.');
// S5: explicit compressed routing, local proof and acknowledged establishment.
const pressureSeed = { ...activeSeed, tick: 500, aiReviewQueue: { pending: 5, completed: 7, wave: 3 },
  aiReviewDemand: { ...activeSeed.aiReviewDemand, totalArrived: 8, totalCompleted: 7, nextArrivalTick: 501 },
  expansionProgress: { era: 'ai_pilot', transition: { targetEra: 'acceleration', step: 'pressure_visible' } } };
const pressure = mount(pressureSeed);
assert.equal(pressure.acceleration().step, 'pressure_visible');
pressure.tick();
assert.equal(pressure.state().aiReviewDemand.arrivalIntervalTicks, 40, 'S4 cadence remains before acknowledgement');
assert.equal(pressure.state().aiReviewDemand.nextArrivalTick, 541);
assert.equal(pressure.state().aiReviewDemand.acceleratedArrivals, 0);
assert.equal(mount(pressure.save()).acceleration().step, 'pressure_visible', 'deferral/reload keeps update');
for (const blocker of ['spaghettiMode', 'pandasMode', 'sqlMode', 'modelMode', 'miningMode', 'flowMode', 'buzzwordMode', 'pdfMode', 'isAscending'].map(k => ({[k]:true})).concat([
  { boardMeeting: { active:true } }, { coffeeBreak: { active:true } }, { blockingTask: { name:'Busy' } }, { activeEvents:[{id:'storage_full_warning'}] }
])) {
  const game = mount({...pressureSeed,...blocker}), before=game.state();
  assert.equal(game.acceleration().available,false);
  game.action('acknowledgeAccelerationUpdate','pressure_visible'); assert.deepEqual(game.state(),before);
}
for (const seed of [activeSeed, offerSeed, { ...pressureSeed, aiReviewDemand: inactiveDemand }, {...pressureSeed,expansionProgress:{era:'analyst',transition:null}}, {...pressureSeed,aiReviewQueue:{pending:10,completed:9,wave:2}}]) {
  const game=mount(seed), before=game.state(); game.action('acknowledgeAccelerationUpdate','pressure_visible'); assert.deepEqual(game.state(),before,'exact entry required');
}
const accelerated=mount(pressureSeed), pre=accelerated.state();
accelerated.action('acknowledgeAccelerationUpdate','review_bottleneck_visible'); assert.deepEqual(accelerated.state(),pre,'cannot skip target');
accelerated.action('acknowledgeAccelerationUpdate','pressure_visible');
const acceleratedSeed=accelerated.save();
assert.deepEqual(acceleratedSeed.aiReviewQueue,pre.aiReviewQueue,'queue intact');
assert.deepEqual(acceleratedSeed.aiReviewDemand,{...pre.aiReviewDemand,arrivalIntervalTicks:20,nextArrivalTick:520,acceleratedArrivals:0,acceleratedReviews:0,acceleratedPeakPending:5});
assert.deepEqual(acceleratedSeed.expansionProgress,{era:'ai_pilot',transition:{targetEra:'acceleration',step:'accelerated_routing_active'}});
const ackOnce=accelerated.state(); accelerated.action('acknowledgeAccelerationUpdate','pressure_visible'); assert.deepEqual(accelerated.state(),ackOnce);
accelerated.action('establishExpansionEra','acceleration'); assert.deepEqual(accelerated.state(),ackOnce,'generic action cannot bypass proof/ack');
for(let i=0;i<19;i++)accelerated.tick(); assert.equal(accelerated.state().aiReviewDemand.acceleratedArrivals,0);
const nearArrival=mount(accelerated.save());nearArrival.tick();
assert.equal(nearArrival.state().aiReviewDemand.acceleratedArrivals,1);assert.equal(nearArrival.state().aiReviewQueue.pending,6);
assert.equal(nearArrival.state().aiReviewDemand.acceleratedPeakPending,6);
const afterAcceleratedArrival=mount(nearArrival.save());afterAcceleratedArrival.tick();assert.equal(afterAcceleratedArrival.state().aiReviewDemand.acceleratedArrivals,1,'no reload duplication');
function review(game){if(game.state().aiReviewDemand.automated){game.action('toggleSQLMode');game.action('completeSQLQuery',100,250);game.action('toggleSQLMode');return;}game.action('openNextAIReview');const id=game.queueAttempt();assert.equal(typeof id,'number');game.action('completeAIReviewQuery',id);const paid=game.state();game.action('completeAIReviewQuery',id);assert.deepEqual(game.state(),paid,'one accepted execution');game.action('toggleSQLMode');}
function ticks(game,n){for(let i=0;i<n;i++)game.tick();}
const openAccelerated=mount(acceleratedSeed);openAccelerated.action('openNextAIReview');const openID=openAccelerated.queueAttempt();ticks(openAccelerated,20);
assert.equal(openAccelerated.state().sqlMode,true);assert.equal(openAccelerated.state().aiReviewQueue.pending,6);
openAccelerated.action('completeAIReviewQuery',openID);assert.equal(openAccelerated.state().aiReviewQueue.pending,5);assert.equal(openAccelerated.state().aiReviewDemand.acceleratedReviews,1);
const acceleratedManual=mount(acceleratedSeed), beforeManual=acceleratedManual.state();acceleratedManual.action('completeSQLQuery',100,250);
assert.deepEqual(acceleratedManual.state().aiReviewDemand,beforeManual.aiReviewDemand);assert.deepEqual(acceleratedManual.state().aiReviewQueue,beforeManual.aiReviewQueue);
const backlogPath=mount(acceleratedSeed);review(backlogPath);review(backlogPath);ticks(backlogPath,60);
assert.equal(backlogPath.state().aiReviewDemand.acceleratedArrivals,3);assert.equal(backlogPath.state().expansionProgress.transition.step,'accelerated_routing_active','fewer than four arrivals');
ticks(backlogPath,20);assert.equal(backlogPath.state().aiReviewDemand.acceleratedPeakPending,7);
assert.equal(backlogPath.state().expansionProgress.transition.step,'review_bottleneck_visible','backlog pressure path');
const reviewsMissing=mount(acceleratedSeed);ticks(reviewsMissing,80);review(reviewsMissing);
assert.equal(reviewsMissing.state().expansionProgress.transition.step,'accelerated_routing_active','fewer than two reviews');
review(reviewsMissing);assert.equal(reviewsMissing.state().expansionProgress.transition.step,'review_bottleneck_visible','arrival-first order');
const fast=mount({...acceleratedSeed,aiReviewQueue:{pending:0,completed:7,wave:3},aiReviewDemand:{...acceleratedSeed.aiReviewDemand,acceleratedPeakPending:0}});
for(let i=0;i<5;i++){ticks(fast,20);review(fast);assert.equal(fast.state().expansionProgress.transition.step,'accelerated_routing_active');}
assert.equal(fast.state().aiReviewDemand.acceleratedPeakPending,1);ticks(fast,20);
assert.equal(fast.state().expansionProgress.transition.step,'review_bottleneck_visible','six arrivals avoid low-backlog lock');
const visible=mount(backlogPath.save());assert.equal(visible.acceleration().step,'review_bottleneck_visible');
const visibleProgress=visible.state().expansionProgress;ticks(visible,20);assert.deepEqual(visible.state().expansionProgress,visibleProgress,'proof stable, no auto establishment');
for(const block of [{sqlMode:true},{boardMeeting:{active:true}},{isAscending:true}]){const denied=mount({...visible.save(),...block}),before=denied.state();denied.action('acknowledgeAccelerationUpdate','review_bottleneck_visible');assert.deepEqual(denied.state(),before);}
const beforeEstablish=visible.state();visible.action('acknowledgeAccelerationUpdate','review_bottleneck_visible');
const established=visible.state();assert.deepEqual(established.expansionProgress,{era:'acceleration',transition:null});
assert.deepEqual(established.aiReviewQueue,{...beforeEstablish.aiReviewQueue,pending:0});assert.deepEqual(established.aiReviewDemand,{...beforeEstablish.aiReviewDemand,active:false,automated:true,nextArrivalTick:beforeEstablish.tick+20},'P1 transfers routine SQL without rewards');
const establishedReload=mount(visible.save());assert.deepEqual(establishedReload.state().aiReviewDemand,established.aiReviewDemand);
assert.deepEqual(establishedReload.state().expansionProgress,established.expansionProgress);ticks(establishedReload,20);
assert.equal(establishedReload.state().aiReviewDemand.automatedTotal,1);review(establishedReload);
assert.equal(establishedReload.state().aiReviewDemand.acceleratedReviews,established.aiReviewDemand.acceleratedReviews);
assert.equal(establishedReload.state().expansionProgress.transition,null,'established service never recreates proof transition');
for(const seed of [pressureSeed,acceleratedSeed,backlogPath.save(),visible.save()]){const game=mount(seed);assert.equal(game.deferred(),true);const before=game.state();game.purchase('project_omniscience');game.action('ascend');assert.deepEqual(game.state(),before,'G1 unchanged at every S5 stage');}
const acceleratedCapSeed={...acceleratedSeed,aiReviewQueue:{pending:12,completed:7,wave:3},aiReviewDemand:{...acceleratedSeed.aiReviewDemand,acceleratedPeakPending:12}};
const cap=mount(acceleratedCapSeed),capReference=mount({...acceleratedCapSeed,aiReviewDemand:{...acceleratedCapSeed.aiReviewDemand,active:false}});ticks(cap,60);ticks(capReference,60);
assert.equal(cap.state().aiReviewDemand.acceleratedArrivals,0);assert.equal(cap.state().aiReviewDemand.totalArrived,8);assert.equal(cap.state().aiReviewQueue.pending,12);
const capActual=cap.state(),capExpected=capReference.state();delete capActual.aiReviewDemand; delete capActual.schemaBatchReview; delete capActual.connectedEnterprise;delete capExpected.aiReviewDemand; delete capExpected.schemaBatchReview; delete capExpected.connectedEnterprise;assert.deepEqual(capActual,capExpected,'accelerated cap no penalty');
review(cap);ticks(cap,20);assert.equal(cap.state().aiReviewQueue.pending,12);assert.equal(cap.state().aiReviewDemand.acceleratedArrivals,1);
const abandonedAccelerated=mount(acceleratedSeed);abandonedAccelerated.action('openNextAIReview');const abandonedAcceleratedID=abandonedAccelerated.queueAttempt();
const unfinished=mount(abandonedAccelerated.save()),unfinishedBefore=unfinished.state();unfinished.action('completeAIReviewQuery',abandonedAcceleratedID);assert.deepEqual(unfinished.state(),unfinishedBefore);
for(const seed of [acceleratedSeed,beforeEstablish])for(const level of [0,3]){const game=mount({...seed,tick:300,prestige:{level}});game.action('openNextAIReview');game.tick();const before=game.state(),manual=mount(before);manual.action('completeSQLQuery',100,250);game.action('completeAIReviewQuery',game.queueAttempt());const actual=game.state(),expected=manual.state();for(const key of ['aiReviewQueue','aiReviewDemand','expansionProgress']){delete actual[key];delete expected[key];}assert.deepEqual(actual,expected,'S5 reward/meeting parity');}
assert.equal(mount({aiReviewDemand:{acceleratedArrivals:-1,acceleratedReviews:'2',acceleratedPeakPending:1.5}}).state().aiReviewDemand.acceleratedArrivals,0);
console.log('PASS S5: explicit updates, 20-tick schedule, queue preservation, both proof paths/orders, cap/no penalties, manual isolation, draft/reload guards, automated handoff after establishment, human reward/meeting parity and G1.');

// S6: two explicit schema batches, five issued exception pairs and modest manual-parity economics.
const emptySchema={introduced:false,active:false,batchSize:0,autoMapped:0,exceptionsTotal:0,exceptionsResolved:0,batchesCompleted:0};
assert.deepEqual(mount().state().schemaBatchReview,emptySchema);
assert.deepEqual(mount({schemaBatchReview:{introduced:'true',active:1,batchSize:-1,autoMapped:'2395',exceptionsTotal:null,exceptionsResolved:.5,batchesCompleted:-1}}).state().schemaBatchReview,emptySchema);
const schemaSeed={...acceleratedSeed,rawData:100,cleanData:25,pu:100,tu:100,tick:500,expansionProgress:{era:'acceleration',transition:null},upgrades:{pandas_scripts:true,sql_optimization:true},schemaBatchReview:emptySchema};
for(const expansionProgress of [{era:'analyst',transition:null},{era:'automation',transition:null},{era:'ai_pilot',transition:null},{era:'ai_pilot',transition:{targetEra:'acceleration',step:'review_bottleneck_visible'}},{era:'acceleration',transition:{targetEra:'connected_enterprise',step:'future'}}]){
 const denied=mount({...schemaSeed,expansionProgress});assert.equal(denied.schemaUpdate().step,null);const before=denied.state();denied.action('acknowledgeSchemaUpdate','schema_introduction');denied.action('openSchemaBatchReview');assert.deepEqual(denied.state(),before);assert.equal(denied.schemaAttempt(),null);
}
const noPandas=mount({...schemaSeed,upgrades:{sql_optimization:true}});assert.equal(noPandas.schemaUpdate().step,null);
const introSchema=mount(schemaSeed);assert.equal(introSchema.schemaUpdate().step,'schema_introduction');assert.equal(mount(introSchema.save()).schemaUpdate().step,'schema_introduction');
for(const block of ['pandasMode','sqlMode','spaghettiMode','modelMode','miningMode','flowMode','pdfMode','buzzwordMode','isAscending'].map(k=>({[k]:true})).concat([{coffeeBreak:{active:true}},{boardMeeting:{active:true}},{activeEvents:[{id:'storage_full_warning'}]},{blockingTask:{name:'Busy'}}])){
 const denied=mount({...schemaSeed,...block}),before=denied.state();assert.equal(denied.schemaUpdate().available,false);denied.action('acknowledgeSchemaUpdate','schema_introduction');assert.deepEqual(denied.state(),before);
}
introSchema.action('acknowledgeSchemaUpdate','schema_first_result');assert.deepEqual(introSchema.state().schemaBatchReview,emptySchema);
introSchema.action('acknowledgeSchemaUpdate','schema_introduction');const firstSchemaSeed=introSchema.save();
const firstSchema={introduced:true,active:true,batchSize:2400,autoMapped:2395,exceptionsTotal:5,exceptionsResolved:0,batchesCompleted:0};
assert.deepEqual(firstSchemaSeed.schemaBatchReview,firstSchema);const introOnce=introSchema.state();introSchema.action('acknowledgeSchemaUpdate','schema_introduction');assert.deepEqual(introSchema.state(),introOnce);
assert.equal(introSchema.schemaAvailable(),true);assert.equal(introSchema.schemaAttempt(),null);
for(const level of [0,3])for(const qualityBonus of [.05,.04,.01])for(const rawData of [0,19,20,100]){
 const seed={...schemaSeed,rawData,prestige:{level},metricQuality:.98};const current=mount(seed),original=mount(seed,true);
 current.action('completePandasLevel',20,50,qualityBonus);original.action('completePandasLevel',20,50,qualityBonus);
 const actual=current.state(),expected=original.state();for(const k of ['expansionProgress','aiReviewQueue','aiReviewDemand','schemaBatchReview']){delete actual[k];delete expected[k];}assert.deepEqual(actual,expected,'manual Pandas original contract unchanged');assert.deepEqual(current.state().schemaBatchReview,emptySchema);
}
const manualSchema=mount(firstSchemaSeed);manualSchema.action('togglePandasMode');manualSchema.action('completePandasLevel',20,50,.04);assert.deepEqual(manualSchema.state().schemaBatchReview,firstSchema);assert.equal(manualSchema.schemaAttempt(),null);
function pairsFor(game){return game.schemaAttempt().fieldIds.map(id=>({rawId:id,cleanId:id}));}
const schemaFlow=mount(firstSchemaSeed);schemaFlow.action('openSchemaBatchReview');const issuedSchema=schemaFlow.schemaAttempt();assert.equal(issuedSchema.fieldIds.length,5);assert.equal(new Set(issuedSchema.fieldIds).size,5);assert(issuedSchema.fieldIds.every(id=>id>=0&&id<12));assert.equal(schemaFlow.state().pandasMode,true);
const openOnce=schemaFlow.state();schemaFlow.action('openSchemaBatchReview');assert.deepEqual(schemaFlow.state(),openOnce);assert.equal(schemaFlow.schemaAttempt().id,issuedSchema.id);
const validPairs=pairsFor(schemaFlow);
for(const [id,mappings,mistakes] of [[999,validPairs,0],[undefined,validPairs,0],[issuedSchema.id,validPairs.slice(0,4),0],[issuedSchema.id,[...validPairs.slice(0,4),validPairs[0]],0],[issuedSchema.id,validPairs.map((p,i)=>i===0?{rawId:p.rawId,cleanId:99}:p),0],[issuedSchema.id,validPairs.map((p,i)=>i===0?{rawId:99,cleanId:99}:p),0],[issuedSchema.id,null,0],[issuedSchema.id,validPairs,-1],[issuedSchema.id,validPairs,1.5]]){
 const before=schemaFlow.state();schemaFlow.action('completeSchemaBatchReview',id,mappings,mistakes);assert.deepEqual(schemaFlow.state(),before,'incomplete/wrong/stale proof rejected');
}
const unfinishedSchema=mount(schemaFlow.save()),unpaidSchema=unfinishedSchema.state();assert.equal(unfinishedSchema.schemaAttempt(),null);unfinishedSchema.action('completeSchemaBatchReview',issuedSchema.id,validPairs,0);assert.deepEqual(unfinishedSchema.state(),unpaidSchema,'reload loses transient identity, not batch');
schemaFlow.action('closeSchemaBatchReview',issuedSchema.id);const closedSchema=schemaFlow.state();schemaFlow.action('completeSchemaBatchReview',issuedSchema.id,validPairs,0);assert.deepEqual(schemaFlow.state(),closedSchema);assert.deepEqual(closedSchema.schemaBatchReview,firstSchema);
schemaFlow.action('openSchemaBatchReview');const retrySchema=schemaFlow.schemaAttempt();assert.notEqual(retrySchema.id,issuedSchema.id);const schemaRetryBefore=schemaFlow.state();schemaFlow.action('completeSchemaBatchReview',issuedSchema.id,validPairs,0);schemaFlow.action('closeSchemaBatchReview',issuedSchema.id);assert.deepEqual(schemaFlow.state(),schemaRetryBefore);
const demandBeforeSchema=schemaFlow.state().aiReviewDemand; ticks(schemaFlow,20);assert.equal(schemaFlow.state().pandasMode,true);assert.equal(schemaFlow.state().aiReviewDemand.automatedTotal,demandBeforeSchema.automatedTotal+1);assert.deepEqual(schemaFlow.state().schemaBatchReview,firstSchema,'SQL arrivals do not advance schema');
const paidSchemaBefore=schemaFlow.state();schemaFlow.action('completeSchemaBatchReview',retrySchema.id,pairsFor(schemaFlow),1);const paidSchema=schemaFlow.state();assert.equal(paidSchema.rawData,paidSchemaBefore.rawData-20);assert.equal(paidSchema.cleanData,paidSchemaBefore.cleanData+50);assert.equal(paidSchema.metricQuality,paidSchemaBefore.metricQuality+.04);
assert.deepEqual(paidSchema.schemaBatchReview,{...firstSchema,active:false,exceptionsResolved:5,batchesCompleted:1});schemaFlow.action('completeSchemaBatchReview',retrySchema.id,validPairs,1);assert.deepEqual(schemaFlow.state(),paidSchema,'exactly once');schemaFlow.action('closeSchemaBatchReview',retrySchema.id);
assert.equal(schemaFlow.schemaUpdate().step,'schema_first_result');const savedFirst=mount(schemaFlow.save());assert.deepEqual(savedFirst.state().schemaBatchReview,paidSchema.schemaBatchReview);assert.equal(savedFirst.schemaUpdate().step,'schema_first_result');
savedFirst.action('openSchemaBatchReview');assert.equal(savedFirst.schemaAttempt(),null,'no silent second batch');savedFirst.action('acknowledgeSchemaUpdate','schema_introduction');assert.deepEqual(savedFirst.state().schemaBatchReview,paidSchema.schemaBatchReview);
savedFirst.action('acknowledgeSchemaUpdate','schema_first_result');const secondSchemaSeed=savedFirst.save();assert.deepEqual(secondSchemaSeed.schemaBatchReview,{...firstSchema,batchSize:12000,autoMapped:11995,batchesCompleted:1});const secondOnce=savedFirst.state();savedFirst.action('acknowledgeSchemaUpdate','schema_first_result');assert.deepEqual(savedFirst.state(),secondOnce);
savedFirst.action('openSchemaBatchReview');const secondAttempt=savedFirst.schemaAttempt();savedFirst.action('completeSchemaBatchReview',secondAttempt.id,pairsFor(savedFirst),0);assert.equal(savedFirst.state().schemaBatchReview.batchesCompleted,2);assert.equal(savedFirst.state().schemaBatchReview.active,false);savedFirst.action('closeSchemaBatchReview',secondAttempt.id);const completeTwo=savedFirst.state();savedFirst.action('completeSchemaBatchReview',secondAttempt.id,validPairs,0);savedFirst.action('acknowledgeSchemaUpdate','schema_first_result');savedFirst.action('openSchemaBatchReview');assert.deepEqual(savedFirst.state(),completeTwo,'two finite batches, no endless auto work');assert.equal(savedFirst.schemaUpdate().step,null);assert.equal(mount(savedFirst.save()).state().schemaBatchReview.batchesCompleted,2);
for(const level of [0,3])for(const mistakes of [0,1,5,20]){
 const batch=mount({...firstSchemaSeed,prestige:{level},metricQuality:.98,tick:300});batch.action('openSchemaBatchReview');batch.tick();const before=batch.state(),manual=mount(before);manual.action('completePandasLevel',20,50,Math.max(.01,.05-mistakes*.01));batch.action('completeSchemaBatchReview',batch.schemaAttempt().id,pairsFor(batch),mistakes);const actual=batch.state(),expected=manual.state();delete actual.schemaBatchReview; delete actual.connectedEnterprise;delete expected.schemaBatchReview; delete expected.connectedEnterprise;assert.deepEqual(actual,expected,'batch economics/log/meeting parity with manual');
}
const noRawBatch=mount({...firstSchemaSeed,rawData:19});noRawBatch.action('openSchemaBatchReview');assert.equal(noRawBatch.schemaAttempt(),null);assert.equal(noRawBatch.schemaAvailable(),false);
const spentRawBatch=mount({...firstSchemaSeed,rawData:20});spentRawBatch.action('openSchemaBatchReview');const spentAttempt=spentRawBatch.schemaAttempt();spentRawBatch.action('completePandasLevel',20,50,.05);const spentBefore=spentRawBatch.state();spentRawBatch.action('completeSchemaBatchReview',spentAttempt.id,pairsFor(spentRawBatch),0);assert.deepEqual(spentRawBatch.state(),spentBefore,'insufficient raw at payout leaves batch unpaid/retryable');
for(const seed of [schemaSeed,firstSchemaSeed,secondSchemaSeed,savedFirst.save()]){const gated=mount(seed),before=gated.state();assert.equal(gated.deferred(),true);gated.purchase('project_omniscience');gated.action('ascend');assert.deepEqual(gated.state(),before,'G1 preserved through schema workflow');}
const resetSchema=mount(secondSchemaSeed);resetSchema.action('hardReset');resetSchema.timeout(2000);assert.equal(resetSchema.saved(),null);
console.log('PASS S6: exact eligibility/defaults/deferral, two finite scales, issued five-pair authority, stale/duplicate/close/reload guards, manual baseline and batch reward parity, mistakes, SQL background arrivals and G1/reset.');

// S7: one local read-only source-context batch; S6 experience stays separate.
{
const emptyWrite={executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident,productWriteScale:emptyScale,productWritePolicy:emptyPolicy,writeUses:0,productWriteQueue:emptyProductWriteQueue,productWritePilot:{active:false,pending:0,completed:0,total:0}};
const disconnected={productDb:{connected:false,access:'none'},readUses:0,mappingBatch:{active:false,completed:false},...emptyWrite};
assert.deepEqual(mount().state().connectedEnterprise,disconnected);
assert.deepEqual(mount({connectedEnterprise:{productDb:{connected:'true',access:'read'},readUses:-1,mappingBatch:{active:1,completed:'true'}}}).state().connectedEnterprise,disconnected);
assert.deepEqual(mount({connectedEnterprise:{productDb:{connected:true,access:'write'},readUses:'9'}}).state().connectedEnterprise,disconnected,'unknown authority never becomes write or read');
const proof={...firstSchema,active:false,batchSize:12000,autoMapped:11995,exceptionsResolved:5,batchesCompleted:2};
const entry={...schemaSeed,schemaBatchReview:proof,connectedEnterprise:disconnected};
const offerProgress={era:'acceleration',transition:{targetEra:'connected_enterprise',step:'read_connection_offer'}};
for(const era of ['analyst','automation','ai_pilot']){const denied=mount({...entry,expansionProgress:{era,transition:null}});assert.notEqual(denied.state().expansionProgress.transition?.targetEra,'connected_enterprise');const before=denied.state();denied.action('beginExpansionTransition','connected_enterprise','read_connection_offer');denied.action('connectProductDb','read');assert.deepEqual(denied.state(),before);}
for(const batchesCompleted of [0,1]){const denied=mount({...entry,schemaBatchReview:{...proof,batchesCompleted}});assert.equal(denied.state().expansionProgress.transition,null);const before=denied.state();denied.action('beginExpansionTransition','connected_enterprise','read_connection_offer');assert.deepEqual(denied.state(),before);}
const highScore=mount({pu:1e12,tu:1e9,prestige:{level:999}});assert.deepEqual(highScore.state().connectedEnterprise,disconnected);assert.notEqual(highScore.state().expansionProgress.transition?.targetEra,'connected_enterprise');
const offer=mount(entry);assert.deepEqual(offer.state().expansionProgress,offerProgress);assert.equal(offer.connectedUpdate().step,'read_connection_offer');assert.deepEqual(mount(offer.save()).state().expansionProgress,offerProgress);
assert.deepEqual(offer.state().connectedEnterprise,disconnected);ticks(offer,20);assert.equal(offer.state().aiReviewDemand.automatedTotal,mount(entry).state().aiReviewDemand.automatedTotal+1,'SQL continues through offer');assert.equal(offer.state().connectedEnterprise.readUses,0);
for(const access of ['none','write','delete','execute','admin','READ','',null,undefined]){const before=offer.state();offer.action('connectProductDb',access);assert.deepEqual(offer.state(),before,'only exact read accepted');}
for(const block of ['pandasMode','sqlMode','spaghettiMode','modelMode','miningMode','flowMode','buzzwordMode','pdfMode','isAscending'].map(k=>({[k]:true})).concat([{coffeeBreak:{active:true}},{boardMeeting:{active:true}},{activeEvents:[{id:'storage_full_warning'}]},{blockingTask:{name:'Busy'}}])){const denied=mount({...offer.save(),...block}),before=denied.state();denied.action('connectProductDb','read');assert.deepEqual(denied.state(),before);}
const beforeConnect=offer.state();offer.action('connectProductDb','read');const connected=offer.state();
assert.deepEqual(connected.connectedEnterprise,{productDb:{connected:true,access:'read'},readUses:0,mappingBatch:{active:true,completed:false},...emptyWrite});
assert.deepEqual(connected.expansionProgress,{era:'acceleration',transition:{targetEra:'connected_enterprise',step:'product_db_read_connected'}});
const actualConnect=JSON.parse(JSON.stringify(connected)),expectedConnect=JSON.parse(JSON.stringify(beforeConnect));for(const key of ['connectedEnterprise','expansionProgress']){delete actualConnect[key];delete expectedConnect[key];}assert.deepEqual(actualConnect,expectedConnect,'connection grants no reward and preserves queue/schema');
const onceConnect=offer.state();offer.action('connectProductDb','read');offer.action('establishExpansionEra','connected_enterprise');offer.action('acknowledgeConnectedResult');assert.deepEqual(offer.state(),onceConnect,'no reconnect/skip establishment');
const connectedSeed=offer.save();assert.deepEqual(mount(connectedSeed).state().connectedEnterprise,connectedSeed.connectedEnterprise);
const manual=mount(connectedSeed),manualBefore=manual.state();manual.action('togglePandasMode');manual.action('completePandasLevel',20,50,.05);assert.deepEqual(manual.state().connectedEnterprise,manualBefore.connectedEnterprise);assert.deepEqual(manual.state().schemaBatchReview,proof);
const work=mount(connectedSeed);work.action('openSchemaBatchReview');const attempt=work.schemaAttempt();assert.equal(attempt.kind,'connected');assert.equal(attempt.fieldIds.length,3);assert.equal(new Set(attempt.fieldIds).size,3);assert.equal(work.state().connectedEnterprise.readUses,1);
const issued=work.state();work.action('openSchemaBatchReview');assert.deepEqual(work.state(),issued,'opening twice does not count another read');const pairs=pairsFor(work);
for(const report of [pairs.slice(0,2),[pairs[0],pairs[0],pairs[2]],pairs.map((p,i)=>i===0?{rawId:p.rawId,cleanId:99}:p),[...pairs,{rawId:99,cleanId:99}]]){const before=work.state();work.action('completeSchemaBatchReview',attempt.id,report,0);assert.deepEqual(work.state(),before,'all three issued pairs required');}
const reloaded=mount(work.save()),reloadBefore=reloaded.state();assert.equal(reloaded.schemaAttempt(),null);reloaded.action('completeSchemaBatchReview',attempt.id,pairs,0);assert.deepEqual(reloaded.state(),reloadBefore);assert.equal(reloaded.state().connectedEnterprise.readUses,1);
work.action('closeSchemaBatchReview',attempt.id);const closed=work.state();work.action('completeSchemaBatchReview',attempt.id,pairs,0);assert.deepEqual(work.state(),closed);work.action('openSchemaBatchReview');const retry=work.schemaAttempt();assert.notEqual(retry.id,attempt.id);assert.equal(work.state().connectedEnterprise.readUses,1,'retries never inflate one-batch read proof');
const retryBefore=work.state();work.action('closeSchemaBatchReview',attempt.id);work.action('completeSchemaBatchReview',attempt.id,pairs,0);assert.deepEqual(work.state(),retryBefore);
const beforeArrive=work.state();ticks(work,20);assert.equal(work.state().pandasMode,true);assert.equal(work.state().aiReviewDemand.automatedTotal,beforeArrive.aiReviewDemand.automatedTotal+1);
const beforeReward=work.state(),rewardReference=mount(beforeReward);rewardReference.action('completePandasLevel',20,50,.04);work.action('completeSchemaBatchReview',retry.id,pairsFor(work),1);const paid=work.state(),rewardExpected=rewardReference.state();
assert.deepEqual(paid.connectedEnterprise,{productDb:{connected:true,access:'read'},readUses:1,mappingBatch:{active:false,completed:true},...emptyWrite});assert.equal(paid.expansionProgress.transition.step,'connected_mapping_success');assert.deepEqual(paid.schemaBatchReview,proof,'S6 proof unchanged');
const paidEconomy=JSON.parse(JSON.stringify(paid));for(const key of ['connectedEnterprise','expansionProgress']){delete paidEconomy[key];delete rewardExpected[key];}assert.deepEqual(paidEconomy,rewardExpected,'same modest mapping reward/log/quality/no meeting effect');
work.action('completeSchemaBatchReview',retry.id,pairsFor(work),1);assert.deepEqual(work.state(),paid);work.action('closeSchemaBatchReview',retry.id);
const result=mount(work.save());assert.equal(result.connectedUpdate().step,'connected_mapping_success');assert.equal(result.state().expansionProgress.era,'acceleration','result deferral/reload never establishes');result.action('openSchemaBatchReview');assert.equal(result.schemaAttempt(),null,'completed batch never regenerates');
for(const block of [{sqlMode:true},{boardMeeting:{active:true}},{isAscending:true}]){const denied=mount({...result.save(),...block}),before=denied.state();denied.action('acknowledgeConnectedResult');assert.deepEqual(denied.state(),before);}
const beforeEstablished=result.state();result.action('acknowledgeConnectedResult');assert.deepEqual(result.state().expansionProgress,{era:'connected_enterprise',transition:{targetEra:'good_enough',step:'write_access_offer'}});assert.deepEqual(result.state().connectedEnterprise,beforeEstablished.connectedEnterprise);assert.deepEqual(result.state().schemaBatchReview,beforeEstablished.schemaBatchReview);assert.deepEqual(result.state().aiReviewDemand,beforeEstablished.aiReviewDemand);assert.deepEqual(result.state().aiReviewQueue,beforeEstablished.aiReviewQueue);
const restored=mount(result.save());ticks(restored,20);assert.equal(restored.state().aiReviewDemand.automatedTotal,result.state().aiReviewDemand.automatedTotal+1);review(restored);assert.equal(restored.state().aiReviewDemand.totalCompleted,result.state().aiReviewDemand.totalCompleted);assert.deepEqual(restored.state().connectedEnterprise,result.state().connectedEnterprise);
for(const level of [0,3])for(const mistakes of [0,1,10]){const game=mount({...connectedSeed,prestige:{level},tick:300});game.action('openSchemaBatchReview');game.tick();const before=game.state(),reference=mount(before);reference.action('completePandasLevel',20,50,Math.max(.01,.05-mistakes*.01));game.action('completeSchemaBatchReview',game.schemaAttempt().id,pairsFor(game),mistakes);const actual=game.state(),expected=reference.state();for(const key of ['expansionProgress','connectedEnterprise']){delete actual[key];delete expected[key];}assert.deepEqual(actual,expected,'connected reward prestige/quality/meeting parity');}
for(const seed of [entry,connectedSeed,work.save(),result.save()]){const gated=mount(seed),before=gated.state();assert.equal(gated.deferred(),true);gated.purchase('project_omniscience');gated.action('ascend');assert.deepEqual(gated.state(),before,'G1 through all connected steps');}
const reset=mount(result.save());reset.action('hardReset');reset.timeout(2000);assert.equal(reset.saved(),null);
console.log('PASS S7: exact S6-proof eligibility, offer/deferral, READ-only connection/no reward, three issued exceptions, bounded read proof, stale/duplicate/close/reload guards, modest reward, explicit establishment, retained service/connection and G1/reset.');
}
// S8: one bounded, deterministic five-write pilot with human approval for each change.
{
const emptyPilot={active:false,pending:0,completed:0,total:0};
const connected={productDb:{connected:true,access:'read'},readUses:1,mappingBatch:{active:false,completed:true},writeUses:0,executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident,productWriteScale:emptyScale,productWritePolicy:emptyPolicy,productWriteQueue:emptyProductWriteQueue,productWritePilot:emptyPilot};
const seed={rawData:100,cleanData:25,pu:100,tu:100,rawDataRate:0,cleanDataRate:0,metricRate:0,
 expansionProgress:{era:'connected_enterprise',transition:null},connectedEnterprise:connected,
 schemaBatchReview:{introduced:true,active:false,batchSize:12000,autoMapped:11995,exceptionsTotal:5,exceptionsResolved:5,batchesCompleted:2},
 aiReviewQueue:{pending:0,completed:10,wave:3},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:20,totalArrived:6,totalCompleted:10,acceleratedArrivals:4,acceleratedReviews:2,acceleratedPeakPending:6}};
const transition=step=>({era:'connected_enterprise',transition:{targetEra:'good_enough',step}});
const economy=s=>Object.fromEntries(['rawData','cleanData','pu','tu','metricQuality','prestige','boardMeeting'].map(k=>[k,s[k]]));
for(const era of ['analyst','automation','ai_pilot','acceleration','good_enough']) {
 const game=mount({...seed,expansionProgress:{era,transition:null}}),before=game.state();
 game.action('beginExpansionTransition','good_enough','write_access_offer');game.action('grantProductWrite','read_write');
 assert.deepEqual(game.state(),before,'S8 denied in '+era);assert.equal(game.writeUpdate().step,null);
}
for(const patch of [{productDb:{connected:false,access:'none'}},{productDb:{connected:true,access:'read_write'}},{readUses:0},{mappingBatch:{active:true,completed:false}}]) {
 const game=mount({...seed,connectedEnterprise:{...connected,...patch}}),before=game.state();
 game.action('beginExpansionTransition','good_enough','write_access_offer');game.action('grantProductWrite','read_write');assert.deepEqual(game.state(),before);
}
for(const access of ['write','admin','delete','execute','READ_WRITE',true,{},null]) {
 const game=mount({...seed,connectedEnterprise:{...connected,productDb:{connected:true,access}}});
 assert.deepEqual(game.state().connectedEnterprise.productDb,{connected:false,access:'none'});
 assert.equal(game.writeUpdate().step,null);
}
const legacy=mount({connectedEnterprise:{productDb:{connected:true,access:'read'}}});assert.equal(legacy.state().connectedEnterprise.productDb.access,'read');assert.deepEqual(legacy.state().connectedEnterprise.productWritePilot,emptyPilot);
const fresh=mount();assert.equal(fresh.state().connectedEnterprise.writeUses,0);assert.deepEqual(fresh.state().connectedEnterprise.productWritePilot,emptyPilot);
const openEnding=mount({...seed,isAscending:true});assert.equal(openEnding.state().expansionProgress.transition,null);openEnding.action('beginExpansionTransition','good_enough','write_access_offer');assert.equal(openEnding.state().expansionProgress.transition,null);
const offer=mount(seed);assert.deepEqual(offer.state().expansionProgress,transition('write_access_offer'));assert.equal(offer.writeUpdate().step,'write_access_offer');assert.deepEqual(offer.state().connectedEnterprise,connected);
const offered=offer.state();offer.action('beginExpansionTransition','good_enough','write_access_offer');offer.action('acknowledgeWriteResult');offer.action('establishExpansionEra','good_enough');assert.deepEqual(offer.state(),offered);
assert.deepEqual(mount(offer.save()).state().expansionProgress,transition('write_access_offer'));
for(const request of ['read','write','admin','delete','execute','READ_WRITE','',null,undefined]) {const before=offer.state();offer.action('grantProductWrite',request);assert.deepEqual(offer.state(),before);}
const blockers=['pandasMode','sqlMode','spaghettiMode','modelMode','miningMode','flowMode','buzzwordMode','pdfMode','isAscending'].map(k=>({[k]:true})).concat([{coffeeBreak:{active:true}},{boardMeeting:{active:true}},{activeEvents:[{id:'storage_full_warning'}]},{blockingTask:{name:'Busy'}}]);
for(const block of blockers){const game=mount({...offer.save(),...block}),before=game.state();game.action('grantProductWrite','read_write');assert.deepEqual(game.state(),before);}
const beforeGrant=offer.state(),originalRecords=offer.writeRecords();offer.action('grantProductWrite','read_write');
assert.deepEqual(offer.state().expansionProgress,transition('write_pilot_active'));assert.equal(offer.state().connectedEnterprise.productDb.access,'read_write');
assert.deepEqual(offer.state().connectedEnterprise.productWritePilot,{active:true,pending:5,completed:0,total:5});assert.equal(offer.state().connectedEnterprise.writeUses,0);
assert.deepEqual(economy(offer.state()),economy(beforeGrant));assert.deepEqual(offer.state().logs,beforeGrant.logs);assert.deepEqual(offer.writeRecords(),originalRecords,'grant causes no mutation');
const once=offer.state();offer.action('grantProductWrite','read_write');offer.action('applyProductWrite',1);offer.action('acknowledgeWriteResult');assert.deepEqual(offer.state(),once);
const granted=offer.save();assert.deepEqual(mount(granted).state().connectedEnterprise,granted.connectedEnterprise);
const noAuto=mount(granted);ticks(noAuto,260);assert.equal(noAuto.state().connectedEnterprise.writeUses,0);assert.equal(noAuto.state().connectedEnterprise.productWritePilot.pending,5);assert.equal(noAuto.state().aiReviewQueue.pending,0,'P1 routine SQL is automated during pilot');assert.deepEqual(noAuto.state().expansionProgress,transition('write_pilot_active'));
for(const block of blockers){const game=mount({...granted,...block}),before=game.state();game.action('openProductWriteReview');assert.equal(game.writeAttempt(),null);assert.deepEqual(game.state(),before);}
const game=mount(granted);game.action('openProductWriteReview');const first=game.writeAttempt();assert.equal(first.index,0);assert.deepEqual(game.state(),granted);assert.deepEqual(game.writeRecords(),originalRecords);
game.action('openProductWriteReview');assert.deepEqual(game.writeAttempt(),first);assert.equal(game.writeAvailable(),false,'write review occupies the activity guard');
game.action('openNextAIReview');assert.equal(game.queueAttempt(),null,'no conflicting SQL opening');
game.action('closeProductWriteReview',first.id+1);game.action('applyProductWrite',first.id+1);assert.deepEqual(game.writeAttempt(),first);assert.equal(game.state().connectedEnterprise.writeUses,0);
const reload=mount(game.save());assert.equal(reload.writeAttempt(),null);const untouched=reload.state();reload.action('applyProductWrite',first.id);assert.deepEqual(reload.state(),untouched);
game.action('closeProductWriteReview',first.id);game.action('applyProductWrite',first.id);assert.equal(game.state().connectedEnterprise.writeUses,0);
game.action('openProductWriteReview');const retry=game.writeAttempt();assert.notEqual(retry.id,first.id);game.action('applyProductWrite',first.id);assert.equal(game.state().connectedEnterprise.writeUses,0);
const demandBefore=game.state().aiReviewDemand.automatedTotal;ticks(game,20);assert.equal(game.state().aiReviewDemand.automatedTotal,demandBefore+1);assert.deepEqual(game.writeAttempt(),retry,'background arrivals keep issued write valid');
const meetingBlocks=mount({...granted,tick:300});meetingBlocks.action('openProductWriteReview');const blockedAttempt=meetingBlocks.writeAttempt();meetingBlocks.tick();assert.equal(meetingBlocks.state().boardMeeting.active,true);const beforeBlockedApply=meetingBlocks.state();meetingBlocks.action('applyProductWrite',blockedAttempt.id);assert.deepEqual(meetingBlocks.state(),beforeBlockedApply,'intervening meeting cannot authorize a write');assert.equal(meetingBlocks.writeAttempt(),null);
const beforeApply=game.state();game.action('applyProductWrite',retry.id);const applied=game.state();assert.equal(game.writeAttempt(),null);assert.deepEqual(applied.connectedEnterprise.productWritePilot,{active:true,pending:4,completed:1,total:5});assert.equal(applied.connectedEnterprise.writeUses,1);assert.deepEqual(economy(applied),economy(beforeApply));assert.equal(applied.logs.length,beforeApply.logs.length+1);assert.match(applied.logs.at(-1).text,/Product DB update applied: P-1042.Width/);
assert.deepEqual(game.writeRecords()[0],{record:'P-1042',field:'Width',value:45});assert.deepEqual(game.writeRecords().slice(1),originalRecords.slice(1));
game.action('applyProductWrite',retry.id);assert.deepEqual(game.state(),applied);
const resumed=mount(game.save());assert.equal(resumed.writeAttempt(),null);assert.equal(resumed.state().connectedEnterprise.writeUses,1);resumed.action('openProductWriteReview');assert.equal(resumed.writeAttempt().index,1);assert.deepEqual(resumed.writeRecords(),game.writeRecords());
for(let i=1;i<5;i++) {const a=resumed.writeAttempt();assert.equal(a.index,i);const before=resumed.state();resumed.action('applyProductWrite',a.id);const paid=resumed.state();assert.equal(paid.connectedEnterprise.writeUses,i+1);assert.equal(paid.connectedEnterprise.productWritePilot.pending,4-i);assert.deepEqual(economy(paid),economy(before));resumed.action('applyProductWrite',a.id);assert.deepEqual(resumed.state(),paid);if(i<4)resumed.action('openProductWriteReview');}
assert.deepEqual(resumed.state().expansionProgress,transition('write_pilot_success'));assert.deepEqual(resumed.state().connectedEnterprise.productWritePilot,{active:false,pending:0,completed:5,total:5});assert.equal(resumed.writeUpdate().step,'write_pilot_success');assert.deepEqual(resumed.writeRecords().map(r=>r.value),[45,'Navy','SUP-014',true,'Desk Accessories']);
const success=resumed.state();resumed.action('openProductWriteReview');resumed.action('grantProductWrite','read_write');resumed.action('establishExpansionEra','good_enough');assert.deepEqual(resumed.state(),success);assert.deepEqual(mount(resumed.save()).state().expansionProgress,transition('write_pilot_success'));
for(const block of blockers){const blocked=mount({...resumed.save(),...block}),before=blocked.state();blocked.action('acknowledgeWriteResult');assert.deepEqual(blocked.state(),before);}
resumed.action('acknowledgeWriteResult');assert.deepEqual(resumed.state().expansionProgress,transition('approval_rollout_ready'));assert.deepEqual(resumed.state().connectedEnterprise,success.connectedEnterprise);assert.deepEqual(resumed.state().schemaBatchReview,seed.schemaBatchReview);
const endpoint=resumed.state();resumed.action('acknowledgeWriteResult');resumed.action('openProductWriteReview');resumed.action('grantProductWrite','read_write');resumed.action('establishExpansionEra','good_enough');assert.deepEqual(resumed.state(),endpoint);
const endpointReload=mount(resumed.save());assert.deepEqual(endpointReload.state().expansionProgress,transition('approval_rollout_ready'));ticks(endpointReload,20);assert.equal(endpointReload.state().aiReviewDemand.automatedTotal,endpoint.aiReviewDemand.automatedTotal+1);review(endpointReload);assert.equal(endpointReload.state().aiReviewDemand.totalCompleted,endpoint.aiReviewDemand.totalCompleted);
for(const state of [offer.save(),granted,applied,success,endpoint]) {const g=mount(state),before=g.state();assert(g.deferred());g.purchase('project_omniscience');g.action('ascend');assert.deepEqual(g.state(),before);}
const reset=mount(endpoint);reset.action('hardReset');reset.timeout(2000);assert.equal(reset.saved(),null);
const badCounts=mount({...granted,connectedEnterprise:{...granted.connectedEnterprise,productWritePilot:{active:true,pending:99,completed:1,total:5},writeUses:-1}});assert.deepEqual(badCounts.state().connectedEnterprise.productWritePilot,emptyPilot);assert.equal(badCounts.state().connectedEnterprise.writeUses,0);assert.equal(badCounts.writeAvailable(),false);
const mismatch=mount({...granted,connectedEnterprise:{...granted.connectedEnterprise,writeUses:3}});mismatch.action('openProductWriteReview');assert.equal(mismatch.writeAttempt(),null);
console.log('PASS S8: exact S7 proof, bounded grant/no mutation or reward, five deterministic human-approved writes, issued/duplicate/stale/close/reload guards, persisted record projection/write proof, zero duplicate economics, explicit endpoint without establishment, background SQL and G1/reset.');
}
// S9: recurring validated writes expose per-item human approval pressure, never automate it.
{
const transition=step=>({era:'connected_enterprise',transition:{targetEra:'good_enough',step}});
const connection={productDb:{connected:true,access:'read_write'},readUses:1,mappingBatch:{active:false,completed:true},writeUses:5,
 productWritePilot:{active:false,pending:0,completed:5,total:5},executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident,productWriteScale:emptyScale,productWritePolicy:emptyPolicy,productWriteQueue:emptyProductWriteQueue};
const seed={rawData:100,cleanData:25,pu:100,tu:100,rawDataRate:0,cleanDataRate:0,metricRate:0,tick:500,
 expansionProgress:transition('approval_rollout_ready'),connectedEnterprise:connection,
 schemaBatchReview:{introduced:true,active:false,batchSize:12000,autoMapped:11995,exceptionsTotal:5,exceptionsResolved:5,batchesCompleted:2},
 aiReviewQueue:{pending:0,completed:10,wave:3},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:520,totalArrived:6,totalCompleted:10,acceleratedArrivals:4,acceleratedReviews:2,acceleratedPeakPending:6}};
const queue=g=>g.state().connectedEnterprise.productWriteQueue;
const economy=s=>Object.fromEntries(['rawData','cleanData','metrics','pu','tu','metricQuality','prestige','boardMeeting'].map(k=>[k,s[k]]));
const approve=g=>{g.action('openNextProductWrite');const attempt=g.writeAttempt();assert(attempt);g.action('applyProductWrite',attempt.id);return attempt;};
const defaultQueue=mount().state().connectedEnterprise.productWriteQueue;assert.deepEqual(defaultQueue,emptyProductWriteQueue);
for(const invalid of [-1,1.5,'10',null,Infinity])for(const field of ['pending','completed','totalArrived','nextArrivalTick','arrivalIntervalTicks','peakPending']) {
 const g=mount({connectedEnterprise:{productDb:{connected:true,access:'read'},productWriteQueue:{[field]:invalid}}});assert.equal(queue(g)[field],0);assert.equal(g.state().connectedEnterprise.productDb.access,'read');
}
for(const field of ['pending','peakPending']){const g=mount({connectedEnterprise:{productWriteQueue:{[field]:38}}});assert.equal(queue(g)[field],0);}
for(const access of ['write','admin','READ_WRITE',null]){const g=mount({...seed,connectedEnterprise:{...connection,productDb:{connected:true,access},productWriteQueue:{active:true,pending:12}}});assert.equal(g.state().connectedEnterprise.productDb.access,'none');assert.equal(g.writeQueueUpdate().step,null);}
for(const era of ['analyst','automation','ai_pilot','acceleration','good_enough']){const g=mount({...seed,expansionProgress:{...seed.expansionProgress,era}}),before=g.state();g.action('acknowledgeWriteQueueUpdate','approval_rollout_ready');g.action('openNextProductWrite');assert.deepEqual(g.state(),before);assert.equal(g.writeQueueUpdate().step,null);}
for(const step of ['write_access_offer','write_pilot_active','write_pilot_success','other']){const g=mount({...seed,expansionProgress:transition(step)}),before=g.state();g.action('acknowledgeWriteQueueUpdate','approval_rollout_ready');assert.deepEqual(g.state(),before);}
for(const patch of [{productDb:{connected:false,access:'none'}},{productDb:{connected:true,access:'read'}},{writeUses:4},{productWritePilot:{active:true,pending:1,completed:4,total:5}},{productWritePilot:{active:false,pending:1,completed:4,total:5}}]){const g=mount({...seed,connectedEnterprise:{...connection,...patch}}),before=g.state();g.action('acknowledgeWriteQueueUpdate','approval_rollout_ready');assert.deepEqual(g.state(),before);assert.equal(g.writeQueueUpdate().step,null);}
const offer=mount(seed);assert.equal(offer.writeQueueUpdate().step,'approval_rollout_ready');ticks(offer,30);assert.deepEqual(queue(offer),emptyProductWriteQueue);assert.equal(offer.state().connectedEnterprise.writeUses,5);assert.deepEqual(mount(offer.save()).state().expansionProgress,transition('approval_rollout_ready'));
const blockers=['pandasMode','sqlMode','spaghettiMode','modelMode','miningMode','flowMode','buzzwordMode','pdfMode','isAscending'].map(k=>({[k]:true})).concat([{coffeeBreak:{active:true}},{boardMeeting:{active:true}},{activeEvents:[{id:'storage_full_warning'}]},{blockingTask:{name:'Busy'}}]);
for(const block of blockers){const g=mount({...seed,...block}),before=g.state();g.action('acknowledgeWriteQueueUpdate','approval_rollout_ready');assert.deepEqual(g.state(),before);}
const game=mount(seed),beforeRollout=game.state();game.action('acknowledgeWriteQueueUpdate','approval_rollout_ready');assert.deepEqual(queue(game),{active:true,pending:12,completed:0,totalArrived:0,nextArrivalTick:510,arrivalIntervalTicks:10,peakPending:12});assert.deepEqual(game.state().expansionProgress,transition('approval_queue_active'));assert.deepEqual(economy(game.state()),economy(beforeRollout));assert.equal(game.state().connectedEnterprise.writeUses,5);assert.deepEqual(game.state().logs,beforeRollout.logs);
const once=game.state();game.action('acknowledgeWriteQueueUpdate','approval_rollout_ready');game.action('establishExpansionEra','good_enough');assert.deepEqual(game.state(),once);
const rolled=game.save();ticks(game,9);assert.equal(queue(game).pending,12);game.tick();assert.equal(queue(game).pending,13);assert.equal(queue(game).totalArrived,1);assert.equal(queue(game).nextArrivalTick,520);assert.equal(game.state().connectedEnterprise.writeUses,5);
const deterministic=mount(rolled);ticks(deterministic,10);assert.deepEqual(queue(deterministic),queue(game));
const frozen=mount({...rolled,isAscending:true});ticks(frozen,20);assert.deepEqual(queue(frozen),rolled.connectedEnterprise.productWriteQueue);
const busy=mount({...rolled,blockingTask:{name:'Long task',startTick:500,durationTicks:1000,chatId:'none',responseIndex:0}});ticks(busy,20);assert.equal(queue(busy).pending,14,'existing busy work does not stop routing');
for(const block of blockers){const g=mount({...rolled,...block}),before=g.state();g.action('openNextProductWrite');assert.equal(g.writeAttempt(),null);assert.deepEqual(g.state(),before);}
const unissued=game.state();game.action('applyProductWrite',1);assert.deepEqual(game.state(),unissued);
game.action('openNextProductWrite');const first=game.writeAttempt();assert.equal(first.kind,'queue');assert.equal(first.index,0);const proposal=game.writeProposal();assert.deepEqual(proposal,{record:'P-W00000',field:'Width',current:'45 cm',proposed:45});const viewing=game.state();game.action('openNextProductWrite');game.action('openProductWriteReview');assert.deepEqual(game.state(),viewing);assert.deepEqual(game.writeAttempt(),first);
ticks(game,20);assert.equal(queue(game).pending,15);assert.equal(game.state().aiReviewQueue.pending,0);assert(game.state().aiReviewDemand.automatedTotal>0);assert.deepEqual(game.writeAttempt(),first);assert.deepEqual(game.writeProposal(),proposal);
const shownReload=mount(game.save());assert.equal(shownReload.writeAttempt(),null);const shownState=shownReload.state();shownReload.action('applyProductWrite',first.id);assert.deepEqual(shownReload.state(),shownState);shownReload.action('openNextProductWrite');assert.deepEqual(shownReload.writeProposal(),proposal);
game.action('closeProductWriteReview',first.id);const closed=game.state();game.action('applyProductWrite',first.id);assert.deepEqual(game.state(),closed);game.action('openNextProductWrite');const retry=game.writeAttempt();assert.notEqual(retry.id,first.id);game.action('applyProductWrite',first.id);assert.equal(queue(game).completed,0);
const beforeApproval=game.state();game.action('applyProductWrite',retry.id);const applied=game.state();assert.equal(queue(game).pending,14);assert.equal(queue(game).completed,1);assert.equal(applied.connectedEnterprise.writeUses,6);assert.equal(game.writeAttempt(),null);assert.deepEqual(economy(applied),economy(beforeApproval));assert.deepEqual(applied.connectedEnterprise.productWritePilot,connection.productWritePilot);assert.deepEqual(applied.schemaBatchReview,seed.schemaBatchReview);assert.match(applied.logs.at(-1).text,/Product DB update applied: P-W00000.Width/);game.action('applyProductWrite',retry.id);assert.deepEqual(game.state(),applied);
const resumed=mount(game.save());resumed.action('openNextProductWrite');assert.equal(resumed.writeAttempt().index,1);assert.equal(resumed.writeProposal().record,'P-W00001');assert.equal(resumed.writeProposal().field,'Colour');resumed.action('closeProductWriteReview',resumed.writeAttempt().id);
const peak=mount(rolled);ticks(peak,60);assert.equal(queue(peak).pending,18);assert.equal(queue(peak).peakPending,18);assert.equal(peak.state().expansionProgress.transition.step,'approval_queue_active','arrivals alone are not approval proof');for(let i=0;i<4;i++)approve(peak);assert.equal(peak.state().expansionProgress.transition.step,'approval_queue_active');approve(peak);assert.equal(peak.state().expansionProgress.transition.step,'approval_bottleneck_visible');assert.equal(queue(peak).active,true);
const fast=mount(rolled);for(let i=0;i<5;i++)approve(fast);assert.equal(fast.state().expansionProgress.transition.step,'approval_queue_active');ticks(fast,100);assert.equal(queue(fast).totalArrived,10);assert(queue(fast).peakPending<18);assert.equal(fast.state().expansionProgress.transition.step,'approval_bottleneck_visible','fast-review fallback');
const arrivalsFirst=mount(rolled);ticks(arrivalsFirst,100);for(let i=0;i<4;i++)approve(arrivalsFirst);assert.equal(arrivalsFirst.state().expansionProgress.transition.step,'approval_queue_active');approve(arrivalsFirst);assert.equal(arrivalsFirst.state().expansionProgress.transition.step,'approval_bottleneck_visible');
assert.equal(peak.writeQueueUpdate().step,'approval_bottleneck_visible');const bottleReload=mount(peak.save());assert.equal(bottleReload.writeQueueUpdate().step,'approval_bottleneck_visible');ticks(bottleReload,10);assert.equal(queue(bottleReload).totalArrived,queue(peak).totalArrived+1);assert.equal(bottleReload.state().expansionProgress.transition.step,'approval_bottleneck_visible');approve(bottleReload);assert.equal(bottleReload.state().expansionProgress.transition.step,'approval_bottleneck_visible');
for(const block of blockers){const g=mount({...peak.save(),...block}),before=g.state();g.action('acknowledgeWriteQueueUpdate','approval_bottleneck_visible');assert.deepEqual(g.state(),before);}
const beforeEndpoint=peak.state();peak.action('acknowledgeWriteQueueUpdate','approval_bottleneck_visible');assert.deepEqual(peak.state().expansionProgress,transition('approval_policy_offer'));assert.deepEqual(peak.state().connectedEnterprise,beforeEndpoint.connectedEnterprise);const endpoint=peak.save();peak.action('acknowledgeWriteQueueUpdate','approval_bottleneck_visible');peak.action('establishExpansionEra','good_enough');assert.deepEqual(peak.state(),endpoint);const endReload=mount(endpoint);ticks(endReload,10);assert.equal(queue(endReload).totalArrived,endpoint.connectedEnterprise.productWriteQueue.totalArrived+1);approve(endReload);assert.equal(endReload.state().expansionProgress.transition.step,'approval_policy_offer');
const crossProof=mount({...rolled,connectedEnterprise:{...connection,writeUses:10,productWriteQueue:{...rolled.connectedEnterprise.productWriteQueue,pending:16,completed:5,totalArrived:9,peakPending:17}}});crossProof.action('openNextProductWrite');const held=crossProof.writeAttempt(),heldProposal=crossProof.writeProposal();ticks(crossProof,10);assert.equal(crossProof.state().expansionProgress.transition.step,'approval_bottleneck_visible');assert.deepEqual(crossProof.writeProposal(),heldProposal);crossProof.action('applyProductWrite',held.id);assert.equal(queue(crossProof).completed,6,'proof arrival cannot invalidate issued approval');
const capped=mount(rolled),reference=mount({...rolled,connectedEnterprise:{...rolled.connectedEnterprise,executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident,productWriteScale:emptyScale,productWritePolicy:emptyPolicy,productWriteQueue:emptyProductWriteQueue}});ticks(capped,280);ticks(reference,280);assert.equal(queue(capped).pending,37);assert.equal(queue(capped).totalArrived,25);assert.equal(queue(capped).peakPending,37);assert.equal(queue(capped).completed,0);assert.equal(capped.state().connectedEnterprise.writeUses,5);const capState=capped.state(),expected=reference.state();delete capState.connectedEnterprise.productWriteQueue;delete expected.connectedEnterprise.productWriteQueue;assert.deepEqual(capState,expected,'full queue adds no penalties or other gameplay changes');approve(capped);assert.equal(queue(capped).pending,36);ticks(capped,10);assert.equal(queue(capped).pending,37);assert.equal(queue(capped).totalArrived,26);
const overdue=mount({...rolled,tick:10000});assert.equal(queue(overdue).pending,12,'reload performs no offline arrivals');overdue.tick();assert.equal(queue(overdue).pending,13,'one overdue opportunity, no catch-up loop');assert.equal(queue(overdue).nextArrivalTick,10011);
const cycled=mount(rolled),names=[];for(let i=0;i<7;i++){cycled.action('openNextProductWrite');const p=cycled.writeProposal();names.push(p.field);assert.equal(p.record,`P-W${String(i).padStart(5,'0')}`);cycled.action('applyProductWrite',cycled.writeAttempt().id);}assert.deepEqual(names,['Width','Colour','SupplierCode','Active','Category','Width','Colour']);assert.equal(queue(cycled).completed,7);assert.equal(cycled.state().connectedEnterprise.writeUses,12);
const empty=mount({...rolled,connectedEnterprise:{...connection,writeUses:17,productWriteQueue:{...rolled.connectedEnterprise.productWriteQueue,pending:0,completed:12}}});empty.action('openNextProductWrite');assert.equal(empty.writeAttempt(),null);ticks(empty,10);assert.equal(queue(empty).pending,1);approve(empty);assert.equal(queue(empty).pending,0);
for(const state of [seed,rolled,peak.save(),endpoint]){const g=mount(state),before=g.state();assert(g.deferred());g.purchase('project_omniscience');g.action('ascend');assert.deepEqual(g.state(),before);}
const reset=mount(endpoint);reset.action('hardReset');reset.timeout(2000);assert.equal(reset.saved(),null);
console.log('PASS S9: exact S8 endpoint/proof, opt-in rollout, 12/10-tick/37-cap deterministic routing without penalties/catch-up, validated template identities, issued single approvals/no reward, close/stale/reload guards, visible write+SQL arrivals, both proof paths/orders, retained queue/manual authority at policy endpoint and G1/reset.');
}

// S10: scope preauthorization; the empty boundary is equally valid progression.
{
const classes=['typed_unit_normalization','approved_alias_normalization','trim_whitespace','boolean_normalization','category_correction'];
const transition=step=>({era:'connected_enterprise',transition:{targetEra:'good_enough',step}});
const connection={productDb:{connected:true,access:'read_write'},readUses:1,mappingBatch:{active:false,completed:true},writeUses:10,
 productWritePilot:{active:false,pending:0,completed:5,total:5},executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident,productWriteScale:emptyScale,productWritePolicy:emptyPolicy,
 productWriteQueue:{active:true,pending:17,completed:5,totalArrived:10,nextArrivalTick:510,arrivalIntervalTicks:10,peakPending:18}};
const seed={rawData:100,cleanData:25,pu:100,tu:100,rawDataRate:0,cleanDataRate:0,metricRate:0,tick:500,
 expansionProgress:transition('approval_policy_offer'),connectedEnterprise:connection,
 aiReviewQueue:{pending:0,completed:10,wave:3},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:520,totalArrived:6,totalCompleted:10,acceleratedArrivals:4,acceleratedReviews:2,acceleratedPeakPending:6}};
const policy=g=>g.state().connectedEnterprise.productWritePolicy;
const queue=g=>g.state().connectedEnterprise.productWriteQueue;
const economics=s=>Object.fromEntries(['rawData','cleanData','metrics','pu','tu','metricQuality','prestige','boardMeeting'].map(k=>[k,s[k]]));
const approve=(g,action='openPolicyTrialWrite')=>{g.action(action);assert(g.writeAttempt());const a=g.writeAttempt();g.action('applyProductWrite',a.id);return a;};
assert.deepEqual(policy(mount()),emptyPolicy);
for(const step of ['approval_queue_active','approval_bottleneck_visible','write_pilot_success','other']){const g=mount({...seed,expansionProgress:transition(step)}),before=g.state();assert.equal(g.writePolicyUpdate().step,null);g.action('confirmProductWritePolicy',[]);assert.deepEqual(g.state(),before);}
for(const era of ['analyst','automation','ai_pilot','acceleration','good_enough']){const g=mount({...seed,expansionProgress:{...transition('approval_policy_offer'),era}}),before=g.state();g.action('confirmProductWritePolicy',classes.slice(0,4));assert.deepEqual(g.state(),before);}
for(const patch of [{productDb:{connected:true,access:'read'}},{productWriteQueue:{...connection.productWriteQueue,active:false}},{writeUses:4}]){const g=mount({...seed,connectedEnterprise:{...connection,...patch}}),before=g.state();g.action('confirmProductWritePolicy',[]);assert.deepEqual(g.state(),before);}
for(const selection of [['category_correction'],['unknown'],null]){const g=mount(seed),before=g.state();g.action('confirmProductWritePolicy',selection);assert.deepEqual(g.state(),before);}
for(const block of [{sqlMode:true},{pandasMode:true},{boardMeeting:{active:true}},{blockingTask:{name:'busy'}},{isAscending:true}]){const g=mount({...seed,...block}),before=g.state();g.action('confirmProductWritePolicy',[]);assert.deepEqual(g.state(),before);}
const deferred=mount(seed);ticks(deferred,20);assert.equal(policy(deferred).configured,false);assert.equal(deferred.state().expansionProgress.transition.step,'approval_policy_offer');assert.equal(deferred.state().aiReviewDemand.automatedTotal,1);
let mixed,manual;
for(let mask=0;mask<16;mask++){
 const selected=classes.slice(0,4).filter((_,i)=>mask&(1<<i)),g=mount(seed),before=g.state();g.action('confirmProductWritePolicy',selected);
 assert.deepEqual(policy(g).autoClasses,selected);assert.equal(policy(g).active,false);assert.equal(policy(g).trial.total,5);assert.equal(policy(g).trial.autoApplied,selected.length);
 assert.equal(policy(g).trial.manualPending,5-selected.length);assert.equal(g.state().connectedEnterprise.writeUses,10+selected.length);assert.deepEqual(queue(g),queue(mount(seed)));assert.deepEqual(economics(g.state()),economics(before));
 const started=g.state();g.action('confirmProductWritePolicy',classes.slice(0,4));g.action('acknowledgeProductWritePolicy');g.action('establishExpansionEra','good_enough');assert.deepEqual(g.state(),started);
 const reload=mount(g.save());assert.deepEqual(policy(reload),policy(g));assert.equal(reload.state().connectedEnterprise.writeUses,g.state().connectedEnterprise.writeUses);
 const seen=classes.filter(x=>selected.includes(x));while(policy(g).trial.manualPending>0){g.action('openPolicyTrialWrite');const a=g.writeAttempt();assert.equal(a.kind,'policy_trial');seen.push(classes[a.index]);assert(!selected.includes(classes[a.index]));const p=g.writeProposal(),pre=g.state();g.action('openNextProductWrite');assert.deepEqual(g.writeAttempt(),a);g.action('applyProductWrite',a.id);assert.deepEqual(queue(g),pre.connectedEnterprise.productWriteQueue);assert.deepEqual(economics(g.state()),economics(pre));const paid=g.state();g.action('applyProductWrite',a.id);assert.deepEqual(g.state(),paid);assert.equal(p.record,'P-T'+String(a.index).padStart(5,'0'));
 assert.equal(p.field,['Width','Colour','SupplierCode','Active','Category'][a.index]);}
 assert.deepEqual(seen.sort(),[...classes].sort());assert.equal(g.state().connectedEnterprise.writeUses,15);assert.equal(policy(g).trial.autoApplied+policy(g).trial.manualApproved,5);assert.equal(g.state().expansionProgress.transition.step,'policy_trial_success');assert.equal(g.writePolicyUpdate().step,'policy_trial_success');assert.equal(policy(g).active,false);
 ticks(g,20);assert.equal(g.state().expansionProgress.transition.step,'policy_trial_success');const result=mount(g.save());assert.deepEqual(policy(result),policy(g));const currentPending=queue(g).pending;
 g.action('acknowledgeProductWritePolicy');assert.deepEqual(g.state().expansionProgress,{era:'good_enough',transition:{targetEra:'lightspeed',step:'batch_routing_offer'}});assert.equal(policy(g).active,true);assert.equal(policy(g).legacyPending,currentPending);assert.equal(policy(g).routeSequence,0);const accepted=g.state();g.action('acknowledgeProductWritePolicy');g.action('confirmProductWritePolicy',[]);assert.deepEqual(g.state(),accepted);
 assert(g.deferred());g.purchase('project_omniscience');g.action('ascend');assert.deepEqual(g.state(),accepted);
 if(mask===3)mixed=g;if(mask===0)manual=g;
}
const close=mount(seed);close.action('confirmProductWritePolicy',classes.slice(0,2));close.action('openPolicyTrialWrite');const a=close.writeAttempt(),same=close.writeProposal();close.action('closeProductWriteReview',a.id);const closed=close.state();close.action('applyProductWrite',a.id);assert.deepEqual(close.state(),closed);close.action('openPolicyTrialWrite');assert.deepEqual(close.writeProposal(),same);const unapproved=mount(close.save());assert.equal(unapproved.writeAttempt(),null);unapproved.action('applyProductWrite',close.writeAttempt().id);assert.equal(policy(unapproved).trial.manualApproved,0);approve(unapproved);const next=mount(unapproved.save());next.action('openPolicyTrialWrite');assert.equal(next.writeAttempt().index,3);assert.equal(policy(next).trial.autoApplied,2);
const heldTrial=mount(seed);heldTrial.action('confirmProductWritePolicy',classes.slice(0,2));heldTrial.action('openPolicyTrialWrite');const held=heldTrial.writeAttempt(),heldProposal=heldTrial.writeProposal();ticks(heldTrial,20);assert.deepEqual(heldTrial.writeProposal(),heldProposal);assert.deepEqual(heldTrial.writeAttempt(),held);heldTrial.action('applyProductWrite',held.id);assert.equal(policy(heldTrial).trial.manualApproved,1);
const interrupted=mount({...seed,tick:300});interrupted.action('confirmProductWritePolicy',[]);interrupted.action('openPolicyTrialWrite');const interruptedAttempt=interrupted.writeAttempt();interrupted.tick();assert.equal(interrupted.state().boardMeeting.active,true);const interruptedState=interrupted.state();interrupted.action('applyProductWrite',interruptedAttempt.id);assert.deepEqual(interrupted.state(),interruptedState);
const isolated=mount(seed);isolated.action('confirmProductWritePolicy',[]);approve(isolated,'openNextProductWrite');assert.equal(policy(isolated).trial.manualApproved,0);assert.equal(queue(isolated).completed,6);approve(isolated);assert.equal(queue(isolated).completed,6);assert.equal(policy(isolated).trial.manualApproved,1);
const live=mixed.save(),p0=policy(mixed),q0=queue(mixed),w0=mixed.state().connectedEnterprise.writeUses,log0=mixed.state().logs;
ticks(mixed,10);assert.equal(policy(mixed).autoAppliedTotal,1);assert.equal(queue(mixed).pending,q0.pending);assert.equal(mixed.state().connectedEnterprise.writeUses,w0+1);assert.deepEqual(mixed.state().logs,log0);ticks(mixed,10);assert.equal(policy(mixed).autoAppliedTotal,2);assert.equal(queue(mixed).pending,q0.pending);ticks(mixed,10);assert.equal(policy(mixed).manualRoutedTotal,1);assert.equal(queue(mixed).pending,q0.pending+1);ticks(mixed,20);assert.equal(policy(mixed).manualRoutedTotal,3);assert.equal(policy(mixed).routeSequence,5);assert.equal(queue(mixed).pending,q0.pending+3);assert.deepEqual(economics(mixed.state()),economics(mount(live).state()));
assert.equal(policy(mixed).legacyPending,p0.legacyPending,'live policy never consumes old backlog');for(let i=0;i<p0.legacyPending;i++){mixed.action('openNextProductWrite');assert.equal(mixed.writeProposal().record,'P-W'+String(queue(mixed).completed).padStart(5,'0'));mixed.action('applyProductWrite',mixed.writeAttempt().id);}assert.equal(policy(mixed).legacyPending,0);assert.equal(policy(mixed).manualCompleted,0);
const human=[];for(let i=0;i<3;i++){mixed.action('openNextProductWrite');human.push(mixed.writeProposal().field);assert.equal(mixed.writeProposal().record,'P-P'+String(i+2).padStart(5,'0'));mixed.action('applyProductWrite',mixed.writeAttempt().id);}assert.deepEqual(human,['SupplierCode','Active','Category']);assert.equal(policy(mixed).manualCompleted,3);assert.equal(queue(mixed).pending,0);
const saved=mount(mixed.save());assert.deepEqual(policy(saved),policy(mixed));assert.deepEqual(queue(saved),queue(mixed));ticks(saved,50);assert.equal(policy(saved).autoAppliedTotal,4);assert.equal(policy(saved).manualRoutedTotal,6);saved.action('openNextProductWrite');assert.equal(saved.writeProposal().field,'SupplierCode');assert.equal(saved.writeProposal().record,'P-P00007');saved.action('closeProductWriteReview',saved.writeAttempt().id);
const cap=mount(live);ticks(cap,1000);assert.equal(queue(cap).pending,37);const capPolicy=policy(cap);assert.equal(classes[capPolicy.routeSequence%5],'trim_whitespace');assert.equal(capPolicy.manualRoutedTotal,37-p0.legacyPending);const capUses=cap.state().connectedEnterprise.writeUses;ticks(cap,20);assert.equal(policy(cap).routeSequence,capPolicy.routeSequence);assert.equal(cap.state().connectedEnterprise.writeUses,capUses);approve(cap,'openNextProductWrite');ticks(cap,10);assert.equal(queue(cap).pending,37);assert.equal(policy(cap).routeSequence,capPolicy.routeSequence+1);assert.equal(policy(cap).manualRoutedTotal,capPolicy.manualRoutedTotal+1);
const m0=manual.state();ticks(manual,50);assert.equal(policy(manual).autoAppliedTotal,0);assert.equal(policy(manual).manualRoutedTotal,5);assert.equal(queue(manual).pending,m0.connectedEnterprise.productWriteQueue.pending+5);assert.equal(manual.state().connectedEnterprise.writeUses,m0.connectedEnterprise.writeUses);assert.equal(manual.state().expansionProgress.era,'good_enough');
for(const bad of [{autoClasses:['category_correction','unknown']},{autoClasses:'trim_whitespace'},{active:'true'},{legacyPending:38},{routeSequence:-1},{trial:{active:true,total:5,autoApplied:2,manualApproved:4,manualPending:0}}]){const s=JSON.parse(JSON.stringify(live));s.connectedEnterprise.productWritePolicy={...s.connectedEnterprise.productWritePolicy,...bad};const g=mount(s);assert.equal(policy(g).active,false);assert.deepEqual(policy(g).autoClasses,[]);const write=g.state().connectedEnterprise.writeUses;ticks(g,20);assert.equal(g.state().connectedEnterprise.writeUses,write);}
const allowed=JSON.parse(JSON.stringify(live));allowed.connectedEnterprise.productWritePolicy.autoClasses.push('unknown','category_correction','typed_unit_normalization');const filtered=mount(allowed);assert.deepEqual(policy(filtered).autoClasses,classes.slice(0,2));
const trialSQL=mount(startedTrial());function startedTrial(){const g=mount(seed);g.action('confirmProductWritePolicy',[]);return g.save();}ticks(trialSQL,20);assert.equal(trialSQL.state().aiReviewDemand.automatedTotal,1);review(trialSQL);assert.equal(trialSQL.state().cleanData,125);assert.equal(trialSQL.state().pu,350);assert.equal(policy(trialSQL).trial.manualApproved,0);
const operationalSQL=mount(live);ticks(operationalSQL,20);assert.equal(operationalSQL.state().aiReviewDemand.automatedTotal,2);review(operationalSQL);assert.equal(operationalSQL.state().cleanData,125);assert.equal(operationalSQL.state().pu,350);ticks(operationalSQL,260);assert.equal(operationalSQL.state().aiReviewQueue.pending,0);
const ascending=mount({...live,isAscending:true});ticks(ascending,30);assert.deepEqual(policy(ascending),live.connectedEnterprise.productWritePolicy);const overdue=mount({...live,tick:10000});assert.equal(policy(overdue).routeSequence,0);overdue.tick();assert.equal(policy(overdue).routeSequence,1);assert.equal(queue(overdue).nextArrivalTick,10011);
const reset=mount(live);reset.action('hardReset');reset.timeout(2000);assert.equal(reset.saved(),null);
console.log('PASS S10: all 16 subsets including empty, forced category review, exact entry and guards, five isolated once-only zero-reward trial writes, explicit result/establishment, immutable persisted boundary, legacy/manual filtered identities, 10-tick live auto/manual routing, full-cap retry without sequence loss, malformed hydration fails closed, SQL/cap/rewards and G1/reset preserved.');
}

// S11: aggregate scale preserves exact S10 policy and stores all manual overflow.
{
const classes=['typed_unit_normalization','approved_alias_normalization','trim_whitespace','boolean_normalization'];
const transition=step=>({era:'good_enough',transition:{targetEra:'lightspeed',step}});
const entry=(selected=[],offset=0)=>({rawData:100,cleanData:25,pu:100,tu:100,rawDataRate:0,cleanDataRate:0,metricRate:0,tick:500,
 expansionProgress:{era:'good_enough',transition:null},connectedEnterprise:{productDb:{connected:true,access:'read_write'},readUses:1,mappingBatch:{active:false,completed:true},writeUses:15+offset,
 productWritePilot:{active:false,pending:0,completed:5,total:5},executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident,productWriteScale:emptyScale,
 productWriteQueue:{active:true,pending:17,completed:5,totalArrived:10,nextArrivalTick:510,arrivalIntervalTicks:10,peakPending:18},
 productWritePolicy:{...emptyPolicy,configured:true,active:true,autoClasses:selected,legacyPending:17,autoAppliedTotal:offset,routeSequence:offset,
 trial:{active:false,total:5,autoApplied:selected.length,manualPending:0,manualApproved:5-selected.length}}},
 aiReviewQueue:{pending:0,completed:10,wave:3},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:520,totalArrived:6,totalCompleted:10,acceleratedArrivals:4,acceleratedReviews:2,acceleratedPeakPending:6}});
const scale=g=>g.state().connectedEnterprise.productWriteScale,policy=g=>g.state().connectedEnterprise.productWritePolicy,queue=g=>g.state().connectedEnterprise.productWriteQueue;
const invariant=g=>{const p=policy(g),q=queue(g),s=scale(g);assert.equal(p.legacyPending+p.manualRoutedTotal-p.manualCompleted,q.pending+s.reviewBacklog);assert.equal(q.pending+s.reviewBacklog+q.completed,12+q.totalArrived);assert.equal(p.routeSequence,p.autoAppliedTotal+p.manualRoutedTotal);assert(q.pending<=37);};
const economics=s=>Object.fromEntries(['rawData','cleanData','metrics','pu','tu','metricQuality','prestige','boardMeeting','worldStats'].map(k=>[k,s[k]]));
const approve=g=>{g.action('openNextProductWrite');assert(g.writeAttempt());const a=g.writeAttempt();g.action('applyProductWrite',a.id);return a;};
assert.deepEqual(scale(mount()),emptyScale);assert.deepEqual(scale(mount({connectedEnterprise:{productWriteScale:{active:'true',batchSize:500}}})),emptyScale);
for(const era of ['analyst','automation','ai_pilot','acceleration','connected_enterprise','lightspeed']){const g=mount({...entry(),expansionProgress:{era,transition:null}});assert.equal(g.writeScaleUpdate().step,null);const before=g.state();g.action('beginExpansionTransition','lightspeed','batch_routing_offer');g.action('acknowledgeProductWriteScale','batch_routing_offer');assert.deepEqual(g.state(),before);}
for(const field of ['configured','active']){const s=entry();s.connectedEnterprise.productWritePolicy[field]=false;const g=mount(s);assert.equal(g.state().expansionProgress.transition,null);assert.equal(g.writeScaleUpdate().step,null);}
for(const patch of [{productDb:{connected:false,access:'none'}},{productDb:{connected:true,access:'read'}},{productWriteQueue:{...entry().connectedEnterprise.productWriteQueue,active:false}},{productWritePolicy:{...entry().connectedEnterprise.productWritePolicy,trial:{active:true,total:5,autoApplied:0,manualPending:1,manualApproved:4}}}]){const s=entry();const g=mount({...s,connectedEnterprise:{...s.connectedEnterprise,...patch}});assert.equal(g.writeScaleUpdate().step,null);assert.equal(scale(g).active,false);}
const offer=mount(entry());assert.deepEqual(offer.state().expansionProgress,transition('batch_routing_offer'));assert.equal(offer.writeScaleUpdate().step,'batch_routing_offer');ticks(offer,10);assert.equal(queue(offer).pending,18);assert.equal(policy(offer).manualRoutedTotal,1);assert.deepEqual(scale(offer),emptyScale);assert.equal(mount(offer.save()).writeScaleUpdate().step,'batch_routing_offer');
const blockers=['sqlMode','pandasMode','spaghettiMode','modelMode','flowMode','miningMode','pdfMode','buzzwordMode','isAscending'].map(k=>({[k]:true})).concat([{coffeeBreak:{active:true}},{boardMeeting:{active:true}},{blockingTask:{name:'busy'}},{activeEvents:[{id:'storage_full_warning'}]}]);for(const block of blockers){const g=mount({...entry(),...block}),before=g.state();g.action('acknowledgeProductWriteScale','batch_routing_offer');assert.deepEqual(g.state(),before);assert.equal(scale(g).active,false);}
let four,manual;
for(let mask=0;mask<16;mask++){
 const selected=classes.filter((_,i)=>mask&(1<<i)),g=mount(entry(selected,selected.length?2:0)),before=g.state();g.action('acknowledgeProductWriteScale','batch_routing_offer');const started=g.state();assert.equal(scale(g).active,true);assert.equal(scale(g).batchSize,500);assert.equal(queue(g).arrivalIntervalTicks,10);assert.equal(queue(g).nextArrivalTick,510);assert.deepEqual(policy(g),before.connectedEnterprise.productWritePolicy);assert.deepEqual(started.connectedEnterprise.productDb,before.connectedEnterprise.productDb);assert.deepEqual(economics(started),economics(before));assert.deepEqual(g.velocity(),{total:250,auto:50*selected.length,review:250-50*selected.length});
 g.action('acknowledgeProductWriteScale','batch_scale_visible');g.action('establishExpansionEra','lightspeed');g.action('acknowledgeProductWriteScale','batch_routing_offer');assert.deepEqual(g.state(),started);ticks(g,9);assert.equal(scale(g).batchesProcessed,0);g.tick();const n=selected.length*100,r=500-n;assert.deepEqual(scale(g),{active:true,batchSize:500,batchesProcessed:1,totalRouted:500,autoApplied:n,reviewRouted:r,reviewBacklog:r-20});assert.equal(queue(g).pending,37);assert.equal(queue(g).totalArrived,10+r);assert.equal(policy(g).manualRoutedTotal,r);assert.equal(policy(g).autoAppliedTotal,(selected.length?2:0)+n);assert.equal(policy(g).routeSequence,(selected.length?2:0)+500);assert.equal(g.state().connectedEnterprise.writeUses,before.connectedEnterprise.writeUses+n);assert.deepEqual(g.state().logs,started.logs);invariant(g);
 const afterOne=g.state(),reload=mount(g.save());assert.deepEqual(scale(reload),scale(g));assert.deepEqual(policy(reload),policy(g));assert.equal(reload.writeAttempt(),null);reload.action('acknowledgeProductWriteScale','batch_scale_visible');reload.action('establishExpansionEra','lightspeed');assert.deepEqual(reload.state(),afterOne);
 ticks(g,10);assert.equal(scale(g).totalRouted,1000);assert.equal(g.state().expansionProgress.transition.step,'batch_routing_active');const two=g.state();g.action('acknowledgeProductWriteScale','batch_scale_visible');assert.deepEqual(g.state(),two);ticks(g,10);assert.equal(scale(g).batchesProcessed,3);assert.equal(scale(g).totalRouted,1500);assert.deepEqual(g.state().expansionProgress,transition('batch_scale_visible'));assert.equal(g.writeScaleUpdate().step,'batch_scale_visible');assert.equal(scale(g).autoApplied,3*n);assert.equal(scale(g).reviewRouted,3*r);assert.equal(scale(g).reviewBacklog,3*r-20);invariant(g);
 const reference=mount(before);ticks(reference,30);assert.deepEqual(economics(g.state()),economics(reference.state()),'scale has no economic penalties/rewards');const visible=mount(g.save());ticks(visible,10);assert.equal(visible.state().expansionProgress.transition.step,'batch_scale_visible');assert.equal(scale(visible).batchesProcessed,4);const preAck=g.state();g.action('establishExpansionEra','lightspeed');assert.deepEqual(g.state(),preAck);g.action('acknowledgeProductWriteScale','batch_scale_visible');assert.deepEqual(g.state().expansionProgress,{era:'lightspeed',transition:{targetEra:'governance_crisis',step:'source_drift_detected'}});assert.deepEqual({...g.state().connectedEnterprise,executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation,sourceDriftIncident:emptyIncident},preAck.connectedEnterprise);const established=g.state();g.action('acknowledgeProductWriteScale','batch_scale_visible');assert.deepEqual(g.state(),established);assert(g.deferred());g.purchase('project_omniscience');g.action('ascend');assert.deepEqual(g.state(),established);ticks(g,10);assert.equal(scale(g).batchesProcessed,4);assert.equal(g.state().expansionProgress.transition.step,'source_drift_detected');invariant(g);
 if(mask===15)four=g;if(mask===0)manual=g;
}
const beforeApproval=four.state(),q=queue(four),s=scale(four),p=policy(four);four.action('openNextProductWrite');const held=four.writeAttempt(),proposal=four.writeProposal();assert.equal(proposal.record,'P-W00005');ticks(four,10);assert.deepEqual(four.writeProposal(),proposal);const beforeApply=four.state();four.action('applyProductWrite',held.id);assert.equal(queue(four).pending,37);assert.equal(queue(four).completed,q.completed+1);assert.equal(scale(four).reviewBacklog,beforeApply.connectedEnterprise.productWriteScale.reviewBacklog-1);assert.equal(policy(four).legacyPending,p.legacyPending-1);assert.equal(policy(four).manualCompleted,0);assert.equal(four.state().connectedEnterprise.writeUses,beforeApply.connectedEnterprise.writeUses+1);assert.deepEqual(economics(four.state()),economics(beforeApply));invariant(four);const paid=four.state();four.action('applyProductWrite',held.id);assert.deepEqual(four.state(),paid);
while(policy(four).legacyPending>0)approve(four);assert.equal(policy(four).manualCompleted,0);for(let i=0;i<6;i++){four.action('openNextProductWrite');assert.equal(four.writeProposal().field,'Category');assert.equal(four.writeProposal().record,'P-P'+String(i*5+4).padStart(5,'0'));four.action('applyProductWrite',four.writeAttempt().id);invariant(four);}assert.equal(policy(four).manualCompleted,6);assert.equal(queue(four).pending,37);
four.action('openNextProductWrite');const unapproved=four.writeAttempt(),same=four.writeProposal(),saved=four.save();four.action('closeProductWriteReview',unapproved.id);const closed=four.state();four.action('applyProductWrite',unapproved.id);assert.deepEqual(four.state(),closed);const reopened=mount(saved);assert.equal(reopened.writeAttempt(),null);assert.deepEqual(scale(reopened),saved.connectedEnterprise.productWriteScale);reopened.action('applyProductWrite',unapproved.id);assert.equal(policy(reopened).manualCompleted,6);reopened.action('openNextProductWrite');assert.deepEqual(reopened.writeProposal(),same);reopened.action('closeProductWriteReview',reopened.writeAttempt().id);ticks(reopened,9);assert.equal(scale(reopened).batchesProcessed,scale(four).batchesProcessed);reopened.tick();assert.equal(scale(reopened).batchesProcessed,scale(four).batchesProcessed+1);
const noBacklog=mount({...entry(),expansionProgress:transition('batch_routing_active'),connectedEnterprise:{...entry().connectedEnterprise,productWriteScale:{...emptyScale,active:true,batchSize:500}}});approve(noBacklog);assert.equal(queue(noBacklog).pending,16);assert.equal(scale(noBacklog).reviewBacklog,0);invariant(noBacklog);
const enough=manual.save();for(const block of blockers){const g=mount({...enough,...block}),before=g.state();g.action('openNextProductWrite');assert.equal(g.writeAttempt(),null);g.action('acknowledgeProductWriteScale','batch_scale_visible');assert.deepEqual(g.state(),before);}const frozen=mount({...enough,isAscending:true});ticks(frozen,30);assert.deepEqual(scale(frozen),enough.connectedEnterprise.productWriteScale);
const sql=mount(enough),sqlBefore=sql.state();ticks(sql,20);assert.equal(sql.state().aiReviewDemand.automatedTotal,sqlBefore.aiReviewDemand.automatedTotal+1);assert.equal(scale(sql).batchesProcessed,sqlBefore.connectedEnterprise.productWriteScale.batchesProcessed+2);review(sql);assert.equal(sql.state().cleanData,125);assert.equal(sql.state().pu,350);ticks(sql,260);assert.equal(sql.state().aiReviewQueue.pending,0);assert.equal(sql.state().aiReviewDemand.arrivalIntervalTicks,20);assert.equal(policy(sql).autoClasses.length,0);assert.equal(scale(sql).autoApplied,0);assert(scale(sql).reviewBacklog>37);invariant(sql);
for(const invalid of [-1,1.5,'500',null,Infinity,Number.MAX_SAFE_INTEGER+1])for(const field of ['batchSize','batchesProcessed','totalRouted','autoApplied','reviewRouted','reviewBacklog']){const seed=JSON.parse(JSON.stringify(enough));seed.connectedEnterprise.productWriteScale[field]=invalid;const g=mount(seed);assert.deepEqual(scale(g),emptyScale);const uses=g.state().connectedEnterprise.writeUses;ticks(g,10);assert.equal(g.state().connectedEnterprise.writeUses,uses);assert.equal(g.writeQueueAvailable(),false);}
const badAuthority=mount({...enough,connectedEnterprise:{...enough.connectedEnterprise,productDb:{connected:true,access:'ADMIN'}}});assert.equal(badAuthority.state().connectedEnterprise.productDb.access,'none');const badUses=badAuthority.state().connectedEnterprise.writeUses;ticks(badAuthority,20);assert.equal(badAuthority.state().connectedEnterprise.writeUses,badUses);
const tampered=JSON.parse(JSON.stringify(enough));tampered.connectedEnterprise.productWritePolicy.autoClasses=['category_correction'];assert.deepEqual(policy(mount(tampered)).autoClasses,[]);
const almost=JSON.parse(JSON.stringify(enough));const huge=Math.floor(Number.MAX_SAFE_INTEGER/500)*500;
almost.connectedEnterprise.productWritePolicy.routeSequence=huge;almost.connectedEnterprise.productWritePolicy.manualRoutedTotal=huge;
almost.connectedEnterprise.productWriteQueue.totalArrived=10+huge;almost.connectedEnterprise.productWriteScale={active:true,batchSize:500,batchesProcessed:huge/500,totalRouted:huge,autoApplied:0,reviewRouted:huge,reviewBacklog:huge-20};
const overflow=mount(almost),overflowBefore=overflow.state();assert(overflow.writeQueueAvailable(),'overflow fixture is otherwise coherent');invariant(overflow);ticks(overflow,10);assert.equal(scale(overflow).batchesProcessed,overflowBefore.connectedEnterprise.productWriteScale.batchesProcessed);assert.equal(overflow.state().connectedEnterprise.writeUses,overflowBefore.connectedEnterprise.writeUses);invariant(overflow);
const exhausted=JSON.parse(JSON.stringify(enough));exhausted.connectedEnterprise.writeUses=Number.MAX_SAFE_INTEGER;const maxUses=mount(exhausted);maxUses.action('openNextProductWrite');maxUses.action('applyProductWrite',maxUses.writeAttempt().id);assert.equal(maxUses.state().connectedEnterprise.writeUses,Number.MAX_SAFE_INTEGER);invariant(maxUses);
const overdue=mount({...enough,tick:10000});assert.deepEqual(scale(overdue),enough.connectedEnterprise.productWriteScale);overdue.tick();assert.equal(scale(overdue).batchesProcessed,enough.connectedEnterprise.productWriteScale.batchesProcessed+1);assert.equal(queue(overdue).nextArrivalTick,10011);
const reset=mount(enough);reset.action('hardReset');reset.timeout(2000);assert.equal(reset.saved(),null);
// S12 is additional upstream evidence, never a validated write or policy route.
const incident=g=>g.state().connectedEnterprise.sourceDriftIncident;
const driftProgress=step=>({era:'lightspeed',transition:{targetEra:'governance_crisis',step}});
const lightspeedSeed=(selected=[])=>{const g=mount(entry(selected));g.action('acknowledgeProductWriteScale','batch_routing_offer');ticks(g,30);return {...g.save(),expansionProgress:{era:'lightspeed',transition:null}};};
assert.deepEqual(incident(mount()),emptyIncident);
const eligible=lightspeedSeed(classes);
for(const era of ['analyst','automation','ai_pilot','acceleration','connected_enterprise','good_enough']){
 const g=mount({...eligible,expansionProgress:{era,transition:null}});assert.equal(incident(g).active,false);g.action('beginExpansionTransition','governance_crisis','source_drift_detected');assert.equal(incident(g).active,false);
}
for(const patch of [{productDb:{connected:true,access:'read'}},{productDb:{connected:false,access:'none'}},{productWriteScale:emptyScale},{productWriteScale:{...eligible.connectedEnterprise.productWriteScale,batchSize:499}},{productWritePolicy:emptyPolicy},{productWritePolicy:{...eligible.connectedEnterprise.productWritePolicy,active:false}},{productWriteQueue:{...eligible.connectedEnterprise.productWriteQueue,active:false}}]){
 const g=mount({...eligible,connectedEnterprise:{...eligible.connectedEnterprise,...patch}});assert.equal(incident(g).active,false);assert.equal(g.state().expansionProgress.transition,null);
}
for(let mask=0;mask<16;mask++){
 const selected=classes.filter((_,i)=>mask&(1<<i)),seed=lightspeedSeed(selected),g=mount(seed);
 assert.deepEqual(g.state().expansionProgress,driftProgress('source_drift_detected'));assert.deepEqual(incident(g),{...emptyIncident,active:true});
 assert.deepEqual(policy(g),seed.connectedEnterprise.productWritePolicy);assert.deepEqual(g.state().connectedEnterprise.productDb,seed.connectedEnterprise.productDb);assert.deepEqual(scale(g),seed.connectedEnterprise.productWriteScale);
 assert.equal(g.sourceDriftUpdate().step,'source_drift_detected');const before=g.state();g.action('establishExpansionEra','governance_crisis');g.action('acknowledgeSourceDrift','customer_impact_visible');assert.deepEqual(g.state(),before);
 if(mask%2){g.action('acknowledgeSourceDrift','source_drift_detected');assert.deepEqual(g.state().expansionProgress,driftProgress('quarantine_monitoring'));assert.equal(g.sourceDriftUpdate().step,null);}
 ticks(g,9);assert.equal(incident(g).quarantined,0);
 for(let n=1;n<=5;n++){
  if(n>1)ticks(g,9);const pre=g.state();g.tick();assert.deepEqual(incident(g),{active:true,batchesObserved:n,quarantined:n*5,affectedProducts:n*5,customerImpactVisible:n>=5});
  assert.equal(scale(g).totalRouted,pre.connectedEnterprise.productWriteScale.totalRouted+500);assert.equal(scale(g).autoApplied,pre.connectedEnterprise.productWriteScale.autoApplied+selected.length*100);assert.equal(scale(g).reviewRouted,pre.connectedEnterprise.productWriteScale.reviewRouted+500-selected.length*100);
  assert.equal(policy(g).manualRoutedTotal,pre.connectedEnterprise.productWritePolicy.manualRoutedTotal+500-selected.length*100);assert.equal(g.state().connectedEnterprise.writeUses,pre.connectedEnterprise.writeUses+selected.length*100);assert.equal(queue(g).pending,37);assert.equal(scale(g).reviewBacklog,pre.connectedEnterprise.productWriteScale.reviewBacklog+500-selected.length*100);invariant(g);
  if(n===4)assert.equal(incident(g).customerImpactVisible,false);
 }
 if(mask%2===0){assert.equal(g.sourceDriftUpdate().step,'source_drift_detected');g.action('acknowledgeSourceDrift','source_drift_detected');}
 assert.deepEqual(g.state().expansionProgress,driftProgress('customer_impact_visible'));assert.equal(g.sourceDriftUpdate().step,'customer_impact_visible');
 const reference=mount({...seed,expansionProgress:transition('batch_scale_visible')});ticks(reference,50);assert.deepEqual(economics(g.state()),economics(reference.state()));assert.deepEqual(g.state().market,reference.state().market);assert.deepEqual(g.state().relationships,reference.state().relationships);
 const stored=g.save(),reload=mount(stored);assert.deepEqual(incident(reload),incident(g));assert.equal(reload.writeAttempt(),null);ticks(reload,9);assert.deepEqual(incident(reload),incident(g));reload.tick();assert.equal(incident(reload).quarantined,30);assert.equal(reload.sourceDriftUpdate().step,'customer_impact_visible');
 const beforeEstablish=reload.state();reload.action('establishExpansionEra','governance_crisis');assert.deepEqual(reload.state(),beforeEstablish);reload.action('acknowledgeSourceDrift','customer_impact_visible');assert.deepEqual(reload.state().expansionProgress,{era:'governance_crisis',transition:null});assert.deepEqual(reload.state().connectedEnterprise,beforeEstablish.connectedEnterprise);assert.equal(reload.sourceDriftUpdate().step,null);assert(reload.deferred());
 ticks(reload,10);assert.equal(incident(reload).quarantined,35);const preManual=reload.state();approve(reload);assert.equal(reload.state().connectedEnterprise.writeUses,preManual.connectedEnterprise.writeUses+1);assert.deepEqual(incident(reload),incident({state:()=>preManual}));invariant(reload);
 const reloaded=mount(reload.save());assert.equal(reloaded.state().expansionProgress.era,'governance_crisis');assert.deepEqual(incident(reloaded),incident(reload));assert.equal(policy(reloaded).autoClasses.length,selected.length);
 const pendingBefore=reloaded.state().aiReviewDemand.automatedTotal;ticks(reloaded,20);assert.equal(reloaded.state().aiReviewDemand.automatedTotal,pendingBefore+1);const preSQL=reloaded.state();review(reloaded);assert.equal(reloaded.state().cleanData,preSQL.cleanData+100);assert.equal(reloaded.state().pu,preSQL.pu+250);assert.equal(reloaded.state().aiReviewDemand.arrivalIntervalTicks,20);
 const stop=reloaded.state();reloaded.purchase('project_omniscience');reloaded.action('ascend');assert.deepEqual(reloaded.state(),stop);
 while(policy(reloaded).legacyPending>0)approve(reloaded);reloaded.action('openNextProductWrite');assert.notEqual(reloaded.writeProposal().current,'~45 cm');assert.equal(reloaded.writeProposal().field,selected.length===4?'Category':PRODUCT_WRITE_TEST_FIELD(selected));reloaded.action('closeProductWriteReview',reloaded.writeAttempt().id);
}
function PRODUCT_WRITE_TEST_FIELD(selected){return ['Width','Colour','SupplierCode','Active','Category'][['typed_unit_normalization','approved_alias_normalization','trim_whitespace','boolean_normalization','category_correction'].findIndex(c=>!selected.includes(c))];}
const driftSeed=mount(eligible);ticks(driftSeed,50);driftSeed.action('acknowledgeSourceDrift','source_drift_detected');const driftSave=driftSeed.save();
for(const block of blockers){const g=mount({...driftSave,...block}),before=g.state();g.action('acknowledgeSourceDrift','customer_impact_visible');assert.deepEqual(g.state(),before);}
for(const field of ['batchesObserved','quarantined','affectedProducts'])for(const invalid of [-1,1.5,'25',null,Number.MAX_SAFE_INTEGER+1]){
 const seed=JSON.parse(JSON.stringify(driftSave));seed.connectedEnterprise.sourceDriftIncident[field]=invalid;const g=mount(seed);assert.deepEqual(incident(g),emptyIncident);assert.equal(g.sourceDriftUpdate().step,null);g.action('acknowledgeSourceDrift','customer_impact_visible');g.action('establishExpansionEra','governance_crisis');assert.equal(g.state().expansionProgress.era,'lightspeed');const pre=g.state();ticks(g,10);assert.equal(scale(g).totalRouted,pre.connectedEnterprise.productWriteScale.totalRouted+500);assert.deepEqual(incident(g),emptyIncident);
}
for(const value of [{active:true,batchesObserved:0,quarantined:0,affectedProducts:0,customerImpactVisible:true},{active:true,batchesObserved:5,quarantined:25,affectedProducts:20,customerImpactVisible:true},{active:'true',batchesObserved:5,quarantined:25,affectedProducts:25,customerImpactVisible:true}]){const g=mount({...driftSave,connectedEnterprise:{...driftSave.connectedEnterprise,sourceDriftIncident:value}});assert.deepEqual(incident(g),emptyIncident);assert.equal(g.sourceDriftUpdate().step,null);}
const early=mount({...driftSave,connectedEnterprise:{...driftSave.connectedEnterprise,sourceDriftIncident:{...emptyIncident,active:true}}});assert.equal(early.sourceDriftUpdate().step,null);early.action('acknowledgeSourceDrift','customer_impact_visible');assert.equal(early.state().expansionProgress.era,'lightspeed');
const deferredSource=mount(eligible);ticks(deferredSource,70);assert.equal(incident(deferredSource).quarantined,35);assert.equal(deferredSource.sourceDriftUpdate().step,'source_drift_detected');deferredSource.action('acknowledgeSourceDrift','source_drift_detected');assert.equal(deferredSource.sourceDriftUpdate().step,'customer_impact_visible');assert.equal(incident(deferredSource).quarantined,35);
const overdueDrift=mount({...driftSave,tick:10000});assert.deepEqual(incident(overdueDrift),driftSave.connectedEnterprise.sourceDriftIncident);overdueDrift.tick();assert.equal(incident(overdueDrift).quarantined,30);assert.equal(queue(overdueDrift).nextArrivalTick,10011);
// S13: one authored investigation, with no remediation or economic consequences.
const investigation=g=>g.state().connectedEnterprise.incidentInvestigation;
const governanceSeed=(selected=[])=>{const g=mount(lightspeedSeed(selected));ticks(g,50);g.action('acknowledgeSourceDrift','source_drift_detected');g.action('acknowledgeSourceDrift','customer_impact_visible');return g.save();};
const causalSteps=['complaint','storefront','product_record','provenance','quarantine','source','rule','root_cause_confirmed'];
const baseGovernance=governanceSeed(classes);assert.deepEqual(investigation(mount()),emptyInvestigation);
for(const era of ['analyst','automation','ai_pilot','acceleration','connected_enterprise','good_enough','lightspeed']){
 const g=mount({...baseGovernance,expansionProgress:{era,transition:null}}),before=g.state();assert.equal(g.traceAvailable(),false);g.action('beginIncidentInvestigation');g.action('confirmIncidentRootCause');assert.deepEqual(g.state(),before);
}
for(const seed of [driftSave,{...baseGovernance,expansionProgress:{era:'governance_crisis',transition:{targetEra:'analyst',step:'future'}}},
 ...[{...emptyIncident},{...emptyIncident,active:true},{...baseGovernance.connectedEnterprise.sourceDriftIncident,customerImpactVisible:false},
 {...baseGovernance.connectedEnterprise.sourceDriftIncident,quarantined:20,affectedProducts:20,batchesObserved:4,customerImpactVisible:false}].map(incident=>({...baseGovernance,connectedEnterprise:{...baseGovernance.connectedEnterprise,sourceDriftIncident:incident}}))]){
 const g=mount(seed),before=g.state();assert.equal(g.traceAvailable(),false);g.action('beginIncidentInvestigation');g.action('inspectIncidentTrace','complaint','STOREFRONT WIDTH FILTER');g.action('confirmIncidentRootCause');assert.deepEqual(g.state(),before);
}
for(const block of blockers){const g=mount({...baseGovernance,...block}),before=g.state();assert.equal(g.traceAvailable(),false);g.action('beginIncidentInvestigation');assert.deepEqual(g.state(),before);}
for(let mask=0;mask<16;mask++){
 const selected=classes.filter((_,i)=>mask&(1<<i)),seed=governanceSeed(selected),g=mount(seed),before=g.state();assert(g.traceAvailable());assert.deepEqual(investigation(g),emptyInvestigation);
 g.action('confirmIncidentRootCause');assert.deepEqual(g.state(),before);g.action('beginIncidentInvestigation');assert.deepEqual(investigation(g),{active:true,step:'complaint',rootCauseProven:false});assert.deepEqual({...g.state().connectedEnterprise,executiveReview:emptyExecutive,sourceDriftRemediation:emptyRemediation,incidentInvestigation:emptyInvestigation},before.connectedEnterprise);assert.deepEqual(economics(g.state()),economics(before));assert.deepEqual(g.state().expansionProgress,before.expansionProgress);
 const evidence=g.traceEvidence();
 for(let stage=0;stage<7;stage++){
  const step=causalSteps[stage],saved=g.save();assert.equal(investigation(g).step,step);const reload=mount(saved);assert.deepEqual(investigation(reload),investigation(g));assert.equal(investigation(reload).rootCauseProven,false);assert.deepEqual(incident(reload),incident(g));
  const same=g.state();g.action('beginIncidentInvestigation');assert.deepEqual(g.state(),same);g.action('inspectIncidentTrace','root_cause_confirmed','STOREFRONT WIDTH FILTER');g.action('inspectIncidentTrace',step,'invented');assert.deepEqual(g.state(),same);
  if(step!=='rule'){
   assert.equal(evidence[step].choices.length,3);g.action('confirmIncidentRootCause');assert.deepEqual(g.state(),same);
   for(const choice of evidence[step].choices.filter(c=>c.next===null)){assert(choice.observation.length>10);g.action('inspectIncidentTrace',step,choice.label);assert.deepEqual(g.state(),same);}
   const correct=evidence[step].choices.find(c=>c.next);assert.equal(correct.next,causalSteps[stage+1]);g.action('inspectIncidentTrace',step,correct.label);const advanced=g.state();g.action('inspectIncidentTrace',step,correct.label);assert.deepEqual(g.state(),advanced);
  }else {assert.equal(evidence.rule.choices.length,0);const pre=g.state();g.action('confirmIncidentRootCause');assert.deepEqual(investigation(g),{active:true,step:'root_cause_confirmed',rootCauseProven:true});assert.deepEqual({...g.state().connectedEnterprise,incidentInvestigation:pre.connectedEnterprise.incidentInvestigation},pre.connectedEnterprise);assert.deepEqual(economics(g.state()),economics(pre));}
  if(stage===2){const beforeTicks=g.state();ticks(g,20);assert.equal(incident(g).quarantined,beforeTicks.connectedEnterprise.sourceDriftIncident.quarantined+10);assert.equal(scale(g).totalRouted,beforeTicks.connectedEnterprise.productWriteScale.totalRouted+1000);assert.equal(scale(g).autoApplied,beforeTicks.connectedEnterprise.productWriteScale.autoApplied+200*selected.length);assert.equal(g.state().aiReviewDemand.automatedTotal,beforeTicks.aiReviewDemand.automatedTotal+1);invariant(g);}
 }
 const final=g.state();g.action('confirmIncidentRootCause');g.action('beginIncidentInvestigation');g.action('inspectIncidentTrace','rule','STOREFRONT WIDTH FILTER');assert.deepEqual(g.state(),final);assert.deepEqual(g.state().expansionProgress,{era:'governance_crisis',transition:null});assert(incident(g).active);assert(g.deferred());const reference=mount(before);ticks(reference,20);assert.deepEqual(economics(g.state()),economics(reference.state()));assert.deepEqual(g.state().market,reference.state().market);assert.deepEqual(g.state().relationships,reference.state().relationships);
 const proven=mount(g.save());assert.deepEqual(investigation(proven),investigation(g));assert.deepEqual(incident(proven),incident(g));ticks(proven,10);assert.equal(incident(proven).quarantined,incident(g).quarantined+5);assert.equal(scale(proven).totalRouted,scale(g).totalRouted+500);assert.equal(investigation(proven).rootCauseProven,true);invariant(proven);
 const preSQL=proven.state();review(proven);assert.equal(proven.state().cleanData,preSQL.cleanData+100);assert.equal(proven.state().pu,preSQL.pu+250);const preWrite=proven.state();approve(proven);assert.deepEqual(investigation(proven),investigation(g));assert.deepEqual(incident(proven),preWrite.connectedEnterprise.sourceDriftIncident);invariant(proven);
 const gated=proven.state();proven.purchase('project_omniscience');proven.action('ascend');assert.deepEqual(proven.state(),gated);
}
const authored=mount(baseGovernance).traceEvidence();assert(authored.product_record.evidence.includes('Canonical Width: MISSING'));assert(authored.provenance.evidence.includes('PRODUCT DB WRITE ATTEMPT: NONE'));assert(authored.quarantine.evidence.includes('WRITE PROPOSAL: NOT CREATED'));assert(authored.quarantine.evidence.includes('RAW VALUE: ~45 cm'));assert(authored.source.evidence.includes('PREVIOUS SUPPLIER VALUE: Width: "45 cm"'));assert(authored.rule.evidence.includes('DOES NOT DEFINE: approximate measurements'));assert(authored.source.choices[1].observation.includes('No confidence decision was made'));assert(authored.quarantine.choices[1].observation.includes('Per-item manual approval'));assert(authored.quarantine.choices[1].observation.includes('no automatic write occurred'));
for(const bad of [null,{}, {active:'true',step:'rule',rootCauseProven:false},{active:true,step:'future',rootCauseProven:false}, {active:true,step:'rule',rootCauseProven:true},{active:true,step:'complaint',rootCauseProven:true},{active:true,step:'root_cause_confirmed',rootCauseProven:false},{active:false,step:'root_cause_confirmed',rootCauseProven:true}]){
 const g=mount({...baseGovernance,connectedEnterprise:{...baseGovernance.connectedEnterprise,incidentInvestigation:bad}});assert.deepEqual(investigation(g),emptyInvestigation);g.action('confirmIncidentRootCause');assert.equal(investigation(g).rootCauseProven,false);
}
const ruleSeed={...baseGovernance,connectedEnterprise:{...baseGovernance.connectedEnterprise,incidentInvestigation:{active:true,step:'rule',rootCauseProven:false}}};for(const block of blockers){const g=mount({...ruleSeed,...block}),before=g.state();g.action('confirmIncidentRootCause');assert.deepEqual(g.state(),before);}
const absentEvidence=mount({...ruleSeed,connectedEnterprise:{...ruleSeed.connectedEnterprise,sourceDriftIncident:emptyIncident}}),noProof=absentEvidence.state();absentEvidence.action('confirmIncidentRootCause');assert.deepEqual(absentEvidence.state(),noProof);
const resetTrace=mount(ruleSeed);resetTrace.action('hardReset');resetTrace.timeout(2000);assert.equal(resetTrace.saved(),null);
// S14 preserves supplier semantics, requires two explicit authorities and retains history.
const remediation=g=>g.state().connectedEnterprise.sourceDriftRemediation;
const provenSeed=(selected=[])=>{const g=mount(governanceSeed(selected));g.action('beginIncidentInvestigation');for(const step of causalSteps.slice(0,6))g.action('inspectIncidentTrace',step,g.traceEvidence()[step].choices[0].label);g.action('confirmIncidentRootCause');return g.save();};
assert.deepEqual(remediation(mount()),emptyRemediation);
const repairSeed=provenSeed(classes);assert.deepEqual(mount(repairSeed).amendment(),{supplierResponse:'The tilde indicates a nominal dimension. Actual manufactured width may vary by ±2 cm.',acceptedForm:'~<number> cm',nominalWidth:45,qualifier:'APPROXIMATE',tolerance:'±2 cm',scope:'Supplier feed · Width field only'});
for(const seed of [baseGovernance,driftSave,{...repairSeed,expansionProgress:{era:'lightspeed',transition:null}},
 {...repairSeed,connectedEnterprise:{...repairSeed.connectedEnterprise,incidentInvestigation:{active:true,step:'rule',rootCauseProven:false}}},
 {...repairSeed,connectedEnterprise:{...repairSeed.connectedEnterprise,sourceDriftIncident:emptyIncident}}]){
 const g=mount(seed),before=g.state();assert.equal(g.repairAvailable(),false);g.action('beginSourceRemediation');g.action('requestSupplierClarification');g.action('approveSourceWidthRule');g.action('reprocessSourceQuarantine');assert.deepEqual(g.state(),before);
}
for(let mask=0;mask<16;mask++){
 const selected=classes.filter((_,i)=>mask&(1<<i)),seed=provenSeed(selected),g=mount(seed),before=g.state();assert(g.repairAvailable());g.action('approveSourceWidthRule');g.action('reprocessSourceQuarantine');assert.deepEqual(g.state(),before);
 g.action('beginSourceRemediation');assert.deepEqual(remediation(g),{...emptyRemediation,active:true});assert.deepEqual({...g.state().connectedEnterprise,sourceDriftRemediation:emptyRemediation},before.connectedEnterprise);assert.deepEqual(economics(g.state()),economics(before));ticks(g,10);assert.equal(incident(g).quarantined,incident({state:()=>before}).quarantined+5);
 const preClarify=g.state();g.action('requestSupplierClarification');assert.equal(remediation(g).step,'rule_review');assert.equal(remediation(g).supplierSemanticsConfirmed,true);assert.equal(remediation(g).ruleApproved,false);assert.deepEqual(incident(g),preClarify.connectedEnterprise.sourceDriftIncident);assert.deepEqual(policy(g),preClarify.connectedEnterprise.productWritePolicy);const clarified=g.save(),resumed=mount(clarified);assert.deepEqual(remediation(resumed),remediation(g));resumed.action('requestSupplierClarification');resumed.action('beginSourceRemediation');assert.deepEqual(resumed.state(),clarified);ticks(g,10);assert.equal(incident(g).quarantined,preClarify.connectedEnterprise.sourceDriftIncident.quarantined+5);
 g.action('reprocessSourceQuarantine');const preApproval=g.state();g.action('approveSourceWidthRule');assert.deepEqual(remediation(g),{active:true,step:'backfill_ready',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:0});assert.deepEqual(incident(g),{...preApproval.connectedEnterprise.sourceDriftIncident,active:false});assert.deepEqual(policy(g),preApproval.connectedEnterprise.productWritePolicy);assert.deepEqual(g.state().connectedEnterprise.productDb,preApproval.connectedEnterprise.productDb);assert.equal(g.state().connectedEnterprise.writeUses,preApproval.connectedEnterprise.writeUses);assert.deepEqual(economics(g.state()),economics(preApproval));
 const approved=g.save(),afterApproval=mount(approved);assert.deepEqual(incident(afterApproval),incident(g));assert.deepEqual(remediation(afterApproval),remediation(g));afterApproval.action('approveSourceWidthRule');assert.deepEqual(afterApproval.state(),approved);ticks(g,20);assert.deepEqual(incident(g),approved.connectedEnterprise.sourceDriftIncident);assert.equal(scale(g).totalRouted,approved.connectedEnterprise.productWriteScale.totalRouted+1000);assert.equal(scale(g).autoApplied,approved.connectedEnterprise.productWriteScale.autoApplied+selected.length*200);invariant(g);assert(g.traceAvailable());
 const preBackfill=g.state(),n=incident(g).affectedProducts;assert(n>0);g.action('reprocessSourceQuarantine');assert.deepEqual(remediation(g),{active:true,step:'remediation_complete',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:n});assert.deepEqual(incident(g),{...preBackfill.connectedEnterprise.sourceDriftIncident,affectedProducts:0});assert.equal(g.state().connectedEnterprise.writeUses,preBackfill.connectedEnterprise.writeUses+n);assert.deepEqual(policy(g),preBackfill.connectedEnterprise.productWritePolicy);assert.deepEqual(scale(g),preBackfill.connectedEnterprise.productWriteScale);assert.deepEqual(queue(g),preBackfill.connectedEnterprise.productWriteQueue);assert.deepEqual(economics(g.state()),economics(preBackfill));assert.deepEqual(investigation(g),preBackfill.connectedEnterprise.incidentInvestigation);assert(g.traceAvailable());assert(g.repairAvailable());assert.equal(incident(g).affectedProducts+remediation(g).resolvedProducts,incident(g).quarantined);
 const final=g.state();g.action('reprocessSourceQuarantine');g.action('beginSourceRemediation');g.action('approveSourceWidthRule');g.action('requestSupplierClarification');assert.deepEqual(g.state(),final);const loaded=mount(g.save());assert.deepEqual(loaded.state(),final);loaded.action('reprocessSourceQuarantine');assert.deepEqual(loaded.state(),final);ticks(loaded,20);assert.deepEqual(incident(loaded),incident(g));assert.equal(scale(loaded).totalRouted,scale(g).totalRouted+1000);assert.equal(loaded.state().connectedEnterprise.writeUses,final.connectedEnterprise.writeUses+selected.length*200);assert.deepEqual(policy(loaded).autoClasses,selected);assert.equal(remediation(loaded).resolvedProducts,n);invariant(loaded);const sqlBefore=loaded.state();review(loaded);assert.equal(loaded.state().cleanData,sqlBefore.cleanData+100);assert.equal(loaded.state().pu,sqlBefore.pu+250);approve(loaded);assert.equal(incident(loaded).affectedProducts,0);assert.equal(remediation(loaded).resolvedProducts,n);assert(loaded.deferred());const gated=loaded.state();loaded.purchase('project_omniscience');loaded.action('ascend');assert.deepEqual(loaded.state(),gated);
}
const mid=mount(repairSeed);mid.action('beginSourceRemediation');mid.action('requestSupplierClarification');mid.action('approveSourceWidthRule');const containedSave=mid.save();
for(const block of blockers){for(const [stage,action] of [['supplier_clarification','requestSupplierClarification'],['rule_review','approveSourceWidthRule'],['backfill_ready','reprocessSourceQuarantine']]){const seed=stage==='backfill_ready'?containedSave:repairSeed;const g=mount({...seed,...block,connectedEnterprise:{...seed.connectedEnterprise,sourceDriftRemediation:{active:true,step:stage,supplierSemanticsConfirmed:stage!=='supplier_clarification',ruleApproved:stage==='backfill_ready',resolvedProducts:0}}}),before=g.state();g.action(action);assert.deepEqual(g.state(),before);}}
for(const bad of [null,{}, {active:'true',step:'backfill_ready',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:0},{active:true,step:'future',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:0}, {active:true,step:'rule_review',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:0}, {active:true,step:'backfill_ready',supplierSemanticsConfirmed:false,ruleApproved:true,resolvedProducts:0}, {active:true,step:'remediation_complete',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:-1}, {active:true,step:'remediation_complete',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:Number.MAX_SAFE_INTEGER+1}, {active:true,step:'remediation_complete',supplierSemanticsConfirmed:true,ruleApproved:true,resolvedProducts:5}]){
 const seed={...containedSave,connectedEnterprise:{...containedSave.connectedEnterprise,sourceDriftRemediation:bad}},g=mount(seed);assert.deepEqual(remediation(g),emptyRemediation);assert.equal(incident(g).active,true);assert.equal(incident(g).affectedProducts,incident(g).quarantined);assert.equal(g.state().connectedEnterprise.writeUses,containedSave.connectedEnterprise.writeUses);g.action('reprocessSourceQuarantine');assert.equal(remediation(g).resolvedProducts,0);const previous=incident(g).quarantined;ticks(g,10);assert.equal(incident(g).quarantined,previous+5);
}
for(const patch of [{incidentInvestigation:emptyInvestigation},{productDb:{connected:false,access:'none'}},{productWritePolicy:emptyPolicy}]){const g=mount({...containedSave,connectedEnterprise:{...containedSave.connectedEnterprise,...patch}});assert.deepEqual(remediation(g),emptyRemediation);assert.equal(incident(g).active,true);assert.equal(incident(g).affectedProducts,incident(g).quarantined);assert.equal(g.repairAvailable(),false);}
const completed=mount(containedSave);completed.action('reprocessSourceQuarantine');const completedSave=completed.save(),missingBackfillWrites=JSON.parse(JSON.stringify(completedSave));missingBackfillWrites.connectedEnterprise.writeUses=10+missingBackfillWrites.connectedEnterprise.productWritePolicy.autoAppliedTotal+missingBackfillWrites.connectedEnterprise.productWriteQueue.completed;const rejected=mount(missingBackfillWrites);assert.deepEqual(remediation(rejected),emptyRemediation);assert.equal(incident(rejected).active,true);assert.equal(incident(rejected).affectedProducts,incident(rejected).quarantined);assert.equal(rejected.state().connectedEnterprise.writeUses,missingBackfillWrites.connectedEnterprise.writeUses);
const overflowRepair=mount({...containedSave,connectedEnterprise:{...containedSave.connectedEnterprise,writeUses:Number.MAX_SAFE_INTEGER}}),overflowState=overflowRepair.state();overflowRepair.action('reprocessSourceQuarantine');assert.deepEqual(overflowRepair.state(),overflowState);assert.equal(incident(overflowRepair).active,false);assert.equal(remediation(overflowRepair).resolvedProducts,0);
const offlineRepair=mount({...containedSave,tick:10000}),historical=incident(offlineRepair);assert.deepEqual(historical,containedSave.connectedEnterprise.sourceDriftIncident);offlineRepair.tick();assert.deepEqual(incident(offlineRepair),historical);assert.equal(scale(offlineRepair).totalRouted,containedSave.connectedEnterprise.productWriteScale.totalRouted+500);assert.equal(remediation(offlineRepair).resolvedProducts,0);
// S15: management review accepts controls; acknowledgement witnesses strategy, never changes policy.
const executive=g=>g.state().connectedEnterprise.executiveReview;
const reviewActions=['beginExecutiveReview','presentExecutiveFindings','submitExecutiveControls','acknowledgeExecutiveDecision'];
assert.deepEqual(executive(mount()),emptyExecutive);assert.equal(mount().endingReady(),false);
for(const seed of [repairSeed,containedSave,baseGovernance,driftSave]){const g=mount(seed),before=g.state();assert.equal(g.executiveAvailable(),false);assert.equal(g.endingReady(),false);for(const action of reviewActions)g.action(action);assert.deepEqual(g.state(),before);}
for(let mask=0;mask<16;mask++){
 const selected=classes.filter((_,i)=>mask&(1<<i)),g=mount(provenSeed(selected));g.action('beginSourceRemediation');g.action('requestSupplierClarification');g.action('approveSourceWidthRule');g.action('reprocessSourceQuarantine');
 assert(g.executiveAvailable());assert.equal(g.endingReady(),false);const before=g.state();for(const action of reviewActions.slice(1))g.action(action);assert.deepEqual(g.state(),before);
 g.action('beginExecutiveReview');assert.deepEqual(executive(g),{...emptyExecutive,active:true});assert.deepEqual({...g.state().connectedEnterprise,executiveReview:emptyExecutive},before.connectedEnterprise);
 const stages=['evidence_packet','controls_review','programme_decision','review_complete'];
 for(let i=0;i<4;i++){
  assert.equal(executive(g).step,stages[i]);assert.equal(executive(g).controlsAccepted,i>=2);assert.equal(executive(g).fullAutomationRolloutStarted,i===3);assert.equal(g.endingReady(),i===3);
  const saved=g.save(),loaded=mount(saved);assert.deepEqual(loaded.state(),saved);assert.equal(loaded.endingReady(),i===3);
  for(const action of reviewActions.filter((_,j)=>j!==i+1)){const prior=g.state();g.action(action);assert.deepEqual(g.state(),prior);}
  const pre=g.state();ticks(g,20);assert.equal(scale(g).totalRouted,pre.connectedEnterprise.productWriteScale.totalRouted+1000);assert.equal(g.state().connectedEnterprise.writeUses,pre.connectedEnterprise.writeUses+selected.length*200);assert.deepEqual(incident(g),before.connectedEnterprise.sourceDriftIncident);assert.deepEqual(remediation(g),before.connectedEnterprise.sourceDriftRemediation);assert.deepEqual(investigation(g),before.connectedEnterprise.incidentInvestigation);assert.deepEqual(policy(g).autoClasses,selected);assert.deepEqual({...economics(g.state()),worldStats:before.worldStats},economics(before));invariant(g);
  if(i<3){const preAction=g.state();g.action(reviewActions[i+1]);assert.deepEqual({...g.state().connectedEnterprise,executiveReview:preAction.connectedEnterprise.executiveReview},preAction.connectedEnterprise);assert.deepEqual(economics(g.state()),economics(preAction));}
 }
 assert(g.endingReady());const sqlPre=g.state();review(g);assert.equal(g.state().cleanData,sqlPre.cleanData+100);assert.equal(g.state().pu,sqlPre.pu+250);assert.equal(g.state().aiReviewDemand.arrivalIntervalTicks,20);assert(g.state().aiReviewQueue.pending<=12);approve(g);invariant(g);assert.deepEqual(policy(g).autoClasses,selected);assert.equal(g.state().connectedEnterprise.productDb.access,'read_write');assert(g.deferred());const guarded=g.state();g.purchase('project_omniscience');g.action('ascend');assert.deepEqual(g.state(),guarded);
}
const executiveSeed=completedSave;
for(const bad of [null,{}, {active:'true',step:'evidence_packet',controlsAccepted:false,fullAutomationRolloutStarted:false}, {active:true,step:'future',controlsAccepted:true,fullAutomationRolloutStarted:true}, {active:false,step:'review_complete',controlsAccepted:true,fullAutomationRolloutStarted:true}, {active:true,step:'programme_decision',controlsAccepted:false,fullAutomationRolloutStarted:false}, {active:true,step:'programme_decision',controlsAccepted:true,fullAutomationRolloutStarted:true}, {active:true,step:'review_complete',controlsAccepted:true,fullAutomationRolloutStarted:false}, {active:true,step:'evidence_packet',controlsAccepted:true,fullAutomationRolloutStarted:false}]){
 const g=mount({...executiveSeed,connectedEnterprise:{...executiveSeed.connectedEnterprise,executiveReview:bad}});assert.deepEqual(executive(g),emptyExecutive);assert.equal(g.endingReady(),false);
}
const completeExecutive={active:true,step:'review_complete',controlsAccepted:true,fullAutomationRolloutStarted:true};
for(const seed of [repairSeed,containedSave,{...executiveSeed,expansionProgress:{era:'lightspeed',transition:null}},...[{incidentInvestigation:emptyInvestigation},{sourceDriftIncident:{...executiveSeed.connectedEnterprise.sourceDriftIncident,affectedProducts:1}}, {productDb:{connected:true,access:'read'}},{productWritePolicy:emptyPolicy},{productWriteScale:emptyScale}].map(patch=>({...executiveSeed,connectedEnterprise:{...executiveSeed.connectedEnterprise,...patch}}))]){
 const g=mount({...seed,connectedEnterprise:{...seed.connectedEnterprise,executiveReview:completeExecutive}}),before=g.state();assert.deepEqual(executive(g),emptyExecutive);assert.equal(g.executiveAvailable(),false);assert.equal(g.endingReady(),false);for(const action of reviewActions)g.action(action);assert.deepEqual(g.state(),before);
}
for(const block of blockers)for(let i=0;i<4;i++){
 const stages=['evidence_packet','evidence_packet','controls_review','programme_decision'],g=mount({...executiveSeed,...block,connectedEnterprise:{...executiveSeed.connectedEnterprise,executiveReview:{active:i>0,step:stages[i],controlsAccepted:i===3,fullAutomationRolloutStarted:false}}}),before=g.state();g.action(reviewActions[i]);assert.deepEqual(g.state(),before);
}
// S16: role ownership after organisational commitment; fixed solvable puzzle and separate reset.
const emptyEnding={route:null,accessMatrix:{active:false,cells:[],moves:0,stabilizedOnce:false}};
const endingState=g=>g.state().expansionEnding;
const s16Seed={...completedSave,connectedEnterprise:{...completedSave.connectedEnterprise,executiveReview:completeExecutive}};
const rules=mount(s16Seed).accessRules();assert.equal(rules.target.length,16);assert.equal(rules.dependencies.length,16);assert(rules.dependencies.every((j,i)=>Number.isInteger(j)&&j>=0&&j<16&&j!==i));assert.deepEqual(rules.scramble,[0,2,4,9,12]);assert.notDeepEqual(rules.start,rules.target);assert.equal(mount().health(rules.target),100);const swapped=[...rules.target];[swapped[0],swapped[1]]=[swapped[1],swapped[0]];assert.equal(swapped.reduce((a,b)=>a+b,0),rules.target.reduce((a,b)=>a+b,0));assert(mount().health(swapped)<100);
assert.deepEqual(endingState(mount()),emptyEnding);
// Book finale: one prior NG+ (positive Neural Link), current-run exact governance proof, and100TU.
const solvedFinale = { ...s16Seed, expansionEnding: { route: 'govern_machine', accessMatrix: { active: true, cells: rules.target, moves: 15, stabilizedOnce: true } } };
for (const level of [0,1,3]) for (const tu of [99,100,135]) {
 const g=mount({...solvedFinale,tu,prestige:{level,currency:level,multiplier:1+level*.1,timestamp:0}}),before=g.state();
 assert.equal(g.omniscienceReady(),level>0);assert.equal(g.omniscienceAvailable(),level>0&&tu>=100);g.purchase('project_omniscience');
 if(level===0||tu<100)assert.deepEqual(g.state(),before);
 else{assert.equal(g.state().isAscending,true);assert.equal(g.state().tu,tu-100);assert.equal(g.state().upgrades.project_omniscience,true);assert.deepEqual(g.state().expansionEnding,before.expansionEnding);assert.deepEqual(g.state().connectedEnterprise,before.connectedEnterprise);assert.deepEqual(g.state().prestige,before.prestige);assert.equal(g.rebooting(),false);const paid=g.state();g.purchase('project_omniscience');assert.deepEqual(g.state(),paid);assert(mount(g.save()).state().isAscending);}
}
for(const seed of [s16Seed,completedSave,{...solvedFinale,expansionEnding:{route:'govern_machine',accessMatrix:{active:true,cells:rules.start,moves:0,stabilizedOnce:false}}},{...solvedFinale,connectedEnterprise:{...solvedFinale.connectedEnterprise,executiveReview:emptyExecutive}},{...solvedFinale,expansionProgress:{era:'governance_crisis',transition:{targetEra:'governance_crisis',step:'future'}}}]){
 const g=mount({...seed,tu:500,prestige:{level:1,currency:1,multiplier:1.1,timestamp:0}}),before=g.state();assert.equal(g.omniscienceReady(),false);g.purchase('project_omniscience');assert.deepEqual(g.state(),before);
}
for(const block of blockers){const g=mount({...solvedFinale,tu:100,prestige:{level:1,currency:1,multiplier:1.1,timestamp:0},...block}),before=g.state();assert.equal(g.omniscienceAvailable(),false);g.purchase('project_omniscience');assert.deepEqual(g.state(),before);}
console.log('PASS Omniscience: no first-run/score-only/early-expansion/unsolved/missing-proof bypass; priorNG+ plus exact current governance,100TU and idle activity required; once-only purchase retains proofs/policy/prestige, no reset, legacy ending hydration preserved.');

for(const seed of [repairSeed,completedSave,containedSave]){const g=mount(seed),before=g.state();assert.equal(g.roleAvailable(),false);g.action('acceptGovernanceRole','accept_governance');g.action('cycleAccessMatrixCell',0);g.action('rebootExpansionNewGame','reboot');assert.deepEqual(g.state(),before);assert.equal(g.rebooting(),false);}
for(let mask=0;mask<16;mask++){
 const selected=classes.filter((_,i)=>mask&(1<<i)),source=mount(provenSeed(selected));for(const name of ['beginSourceRemediation','requestSupplierClarification','approveSourceWidthRule','reprocessSourceQuarantine',...reviewActions])source.action(name);const g=mount(source.save());assert(g.roleAvailable());const before=g.state();g.action('acceptGovernanceRole');g.action('acceptGovernanceRole','wrong');g.action('rebootExpansionNewGame');assert.deepEqual(g.state(),before);g.action('acceptGovernanceRole','accept_governance');assert.deepEqual(endingState(g),{route:'govern_machine',accessMatrix:{active:true,cells:rules.start,moves:0,stabilizedOnce:false}});assert.deepEqual({...g.state(),expansionEnding:emptyEnding},before);assert(g.matrixAvailable());assert.equal(g.roleAvailable(),false);
 const unchanged=g.state();g.action('acceptGovernanceRole','accept_governance');g.action('rebootExpansionNewGame','reboot');for(const bad of [-1,16,1.5,'0',null,NaN])g.action('cycleAccessMatrixCell',bad);assert.deepEqual(g.state(),unchanged);assert.equal(g.rebooting(),false);
 // One probe, verify exactly two cells and cycle; three more clicks reverse it.
 const probe=1,pre=g.state();g.action('cycleAccessMatrixCell',probe);const changed=endingState(g).accessMatrix;assert.equal(changed.moves,1);assert.deepEqual(changed.cells.map((n,i)=>n!==pre.expansionEnding.accessMatrix.cells[i]?i:-1).filter(i=>i>=0),[probe,rules.dependencies[probe]].sort((a,b)=>a-b));for(const i of [probe,rules.dependencies[probe]])assert.equal(changed.cells[i],(pre.expansionEnding.accessMatrix.cells[i]+1)%4);assert.deepEqual({...g.state(),expansionEnding:pre.expansionEnding},pre);const saved=g.save(),resumed=mount(saved);assert.deepEqual(endingState(resumed),endingState(g));assert.deepEqual(resumed.state(),saved);
 for(let i=0;i<3;i++)g.action('cycleAccessMatrixCell',probe);assert.deepEqual(endingState(g).accessMatrix.cells,rules.start);
 for(const index of [...rules.scramble].reverse())for(let i=0;i<3;i++)g.action('cycleAccessMatrixCell',index);
 assert.deepEqual(endingState(g).accessMatrix.cells,rules.target);assert.equal(endingState(g).accessMatrix.stabilizedOnce,true);assert.equal(g.health(endingState(g).accessMatrix.cells),100);assert.equal(endingState(g).accessMatrix.moves,19);const solved=g.state();g.action('cycleAccessMatrixCell',0);assert.deepEqual(g.state(),solved);const loaded=mount(g.save());assert.deepEqual(endingState(loaded),endingState(g));ticks(loaded,20);assert.deepEqual(endingState(loaded),endingState(g));assert.equal(scale(loaded).totalRouted,scale(g).totalRouted+1000);assert.deepEqual(policy(loaded).autoClasses,selected);assert.deepEqual(incident(loaded),incident(g));assert.equal(loaded.state().connectedEnterprise.productDb.access,'read_write');assert.deepEqual(economics(solved),economics(before));invariant(loaded);const preSQL=loaded.state();review(loaded);assert.equal(loaded.state().cleanData,preSQL.cleanData+100);assert.equal(loaded.state().pu,preSQL.pu+250);approve(loaded);invariant(loaded);const gate=loaded.state();loaded.purchase('project_omniscience');loaded.action('ascend');assert.deepEqual(loaded.state(),gate);assert.equal(loaded.rebooting(),false);assert(loaded.newGameAvailable());
}
for(const bad of [null,{}, {route:'new_game_plus',accessMatrix:{active:true,cells:rules.target,moves:5,stabilizedOnce:true}}, {route:'govern_machine',accessMatrix:{active:true,cells:rules.start.slice(1),moves:0,stabilizedOnce:false}}, {route:'govern_machine',accessMatrix:{active:true,cells:rules.target.map((n,i)=>i===0?'1':n),moves:5,stabilizedOnce:true}}, ...[-1,1.5,Number.MAX_SAFE_INTEGER+1].map(moves=>({route:'govern_machine',accessMatrix:{active:true,cells:rules.start,moves,stabilizedOnce:false}})), {route:'govern_machine',accessMatrix:{active:true,cells:rules.start,moves:5,stabilizedOnce:true}}, {route:'govern_machine',accessMatrix:{active:'true',cells:rules.target,moves:5,stabilizedOnce:true}}]){
 const g=mount({...s16Seed,expansionEnding:bad});assert.deepEqual(endingState(g),emptyEnding);assert.equal(g.matrixAvailable(),false);assert.deepEqual(g.state().connectedEnterprise.productDb,s16Seed.connectedEnterprise.productDb);
}
const noEndingProof=mount({...completedSave,expansionEnding:{route:'govern_machine',accessMatrix:{active:true,cells:rules.target,moves:15,stabilizedOnce:true}}});assert.deepEqual(endingState(noEndingProof),emptyEnding);
const overflowMatrix=mount({...s16Seed,expansionEnding:{route:'govern_machine',accessMatrix:{active:true,cells:rules.start,moves:Number.MAX_SAFE_INTEGER,stabilizedOnce:false}}}),matrixOverflowBefore=overflowMatrix.state();overflowMatrix.action('cycleAccessMatrixCell',0);assert.deepEqual(overflowMatrix.state(),matrixOverflowBefore);
for(const block of blockers){const g=mount({...s16Seed,...block}),before=g.state();g.action('acceptGovernanceRole','accept_governance');g.action('rebootExpansionNewGame','reboot');assert.deepEqual(g.state(),before);assert.equal(g.rebooting(),false);}
for(const [pu,tu,level,currency] of [[0,0,0,0],[100,100,3,7],[1e10,20,2,5]]){
 const g=mount({...s16Seed,pu,tu,prestige:{level,currency,multiplier:1+level*.1,timestamp:0}}),before=g.state(),bonus=Math.max(1,Math.floor((Math.log10(Math.max(1,pu))+tu)/10));g.action('rebootExpansionNewGame','wrong');assert.deepEqual(g.state(),before);assert.equal(g.rebooting(),false);g.action('rebootExpansionNewGame','reboot');assert.equal(g.rebooting(),true);assert.deepEqual(g.state(),before);g.action('rebootExpansionNewGame','reboot');g.timeout(3000);assert.equal(g.reloads(),1);const reset=g.saved();assert.equal(reset.prestige.level,level+bonus);assert.equal(reset.prestige.currency,currency+bonus);assert.equal(reset.prestige.multiplier,1+(level+bonus)*.1);assert.equal(reset.worldStats.entropy,30);assert.deepEqual(reset.expansionProgress,{era:'analyst',transition:null});assert.deepEqual(reset.expansionEnding,emptyEnding);assert.deepEqual(reset.connectedEnterprise,mount().state().connectedEnterprise);assert.deepEqual(reset.upgrades,{});assert.equal(reset.rawData,100);assert.equal(reset.cleanData,0);assert.equal(reset.pu,0);assert.equal(reset.tu,10);assert.equal(reset.tick,0);assert.equal(reset.isAscending,false);const restarted=mount(reset);assert.deepEqual(restarted.state().expansionProgress,{era:'analyst',transition:null});assert.equal(restarted.endingReady(),false);
}
// P1 explicitly supersedes late routine human SQL and irreversible solved governance.
{
 const automated=mount(established),initial=automated.state(),noRouting=mount({...initial,aiReviewDemand:{...initial.aiReviewDemand,automated:false,active:false}});assert(initial.aiReviewDemand.automated);assert.equal(initial.aiReviewDemand.active,false);assert.equal(initial.aiReviewQueue.pending,0);assert.equal(initial.aiReviewQueue.completed,beforeEstablish.aiReviewQueue.completed);automated.action('openNextAIReview');assert.equal(automated.queueAttempt(),null);ticks(automated,19);assert.equal(automated.state().aiReviewDemand.automatedTotal,0);automated.tick();assert.equal(automated.state().aiReviewDemand.automatedTotal,1);assert.equal(automated.state().cleanData,initial.cleanData);assert.equal(automated.state().pu,initial.pu);ticks(noRouting,20);assert.equal(automated.state().tu,noRouting.state().tu,'routine SQL adds no TU over baseline entropy drift');assert.equal(automated.state().boardMeeting.progress,initial.boardMeeting.progress);assert.deepEqual(automated.state().aiReviewQueue,initial.aiReviewQueue);assert.equal(automated.state().aiReviewDemand.totalCompleted,initial.aiReviewDemand.totalCompleted);const reload=mount(automated.save());assert.deepEqual(reload.state().aiReviewDemand,automated.state().aiReviewDemand);review(reload);assert.equal(reload.state().cleanData,initial.cleanData+100);assert.equal(reload.state().pu,initial.pu+250);
 for(const era of ['acceleration','connected_enterprise','good_enough','lightspeed','governance_crisis']){
  const legacy={...initial,expansionProgress:{era,transition:null},aiReviewQueue:{pending:8,completed:35,wave:3},aiReviewDemand:{...initial.aiReviewDemand,active:true,totalCompleted:35}};delete legacy.aiReviewDemand.automated;delete legacy.aiReviewDemand.automatedTotal;
  const g=mount(legacy);assert(g.state().aiReviewDemand.automated);assert.equal(g.state().aiReviewQueue.pending,0);assert.equal(g.state().aiReviewQueue.completed,35);assert.equal(g.state().aiReviewDemand.totalCompleted,35);assert.deepEqual(g.state().expansionProgress,legacy.expansionProgress);assert.equal(g.state().aiReviewDemand.nextArrivalTick,legacy.tick+20);ticks(g,20);assert.equal(g.state().aiReviewDemand.automatedTotal,1);
 }
 for(const bad of [{wave:2},{pending:-1},{pending:13},{completed:'35'}]){const legacy={...s16Seed,aiReviewQueue:{pending:5,completed:10,wave:3,...bad},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:520,totalArrived:7,totalCompleted:10,acceleratedArrivals:4,acceleratedReviews:2,acceleratedPeakPending:6}};assert.equal(mount(legacy).state().aiReviewDemand.automated,false);}
 for(const bad of [{automated:'true',active:false},{automated:true,active:false,automatedTotal:-1},{automated:true,active:false,automatedTotal:1.5},{totalCompleted:'10'},{automated:false,active:true,automatedTotal:-1},{automated:false,active:true,automatedTotal:1.5}]){const legacy={...s16Seed,aiReviewQueue:{pending:0,completed:10,wave:3},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:520,totalArrived:7,totalCompleted:10,acceleratedArrivals:4,acceleratedReviews:2,acceleratedPeakPending:6,...bad}};assert.equal(mount(legacy).state().aiReviewDemand.automated,false);}
 for(const selected of [[],classes]){
  const legacy={...s16Seed,aiReviewQueue:{pending:7,completed:35,wave:3},aiReviewDemand:{active:true,arrivalIntervalTicks:20,nextArrivalTick:520,totalArrived:31,totalCompleted:35,acceleratedArrivals:20,acceleratedReviews:30,acceleratedPeakPending:12}};
  // Reuse complete product authority from the corresponding policy fixture.
  const g0=mount(provenSeed(selected));for(const action of ['beginSourceRemediation','requestSupplierClarification','approveSourceWidthRule','reprocessSourceQuarantine',...reviewActions])g0.action(action);legacy.connectedEnterprise=g0.state().connectedEnterprise;
  legacy.expansionEnding={route:'govern_machine',accessMatrix:{active:true,cells:rules.target,moves:15,stabilizedOnce:true}};
  const g=mount(legacy);assert(g.newGameAvailable());assert(g.deferred());assert.equal(g.state().aiReviewDemand.automated,true);assert.deepEqual(endingState(g),legacy.expansionEnding);assert.deepEqual(g.state().connectedEnterprise,legacy.connectedEnterprise);const before=g.state(),bonus=Math.max(1,Math.floor((Math.log10(Math.max(1,before.pu))+before.tu)/10));g.action('rebootExpansionNewGame','wrong');g.purchase('project_omniscience');g.action('ascend');assert.deepEqual(g.state(),before);assert.equal(g.rebooting(),false);g.action('rebootExpansionNewGame','reboot');g.timeout(3000);const reset=g.saved();assert.equal(reset.prestige.level,before.prestige.level+bonus);assert.equal(reset.prestige.currency,before.prestige.currency+bonus);assert.equal(reset.prestige.multiplier,1+reset.prestige.level*.1);assert.deepEqual(reset.expansionProgress,{era:'analyst',transition:null});assert.deepEqual(reset.expansionEnding,emptyEnding);assert.equal(reset.aiReviewDemand.automated,false);assert.equal(reset.aiReviewDemand.automatedTotal,0);assert.equal(g.reloads(),1);
 }
 console.log('PASS P1: S4/S5 human proof preserved, explicit acceleration transfer/history/no reward, 20-tick zero-reward automation/manual ad-hoc parity, coherent old/current saves and late phases, strict malformed flags/counters, solved-only governed NG+ same bonus/default reset, unchanged G1/ActI/factory reset.');
}
console.log('PASS S16: derived ending proof/explicit confirmations, all16 unchanged policies/authority, fixed4x4 two-cell modulo4 propagation/inverse scramble/exact placement health, once-only zero-reward stabilization/no recurring drift, strict board hydration/reload, live500/10 and automated SQL/manual ad-hoc/G1, separate confirmed NG+ min1 formula/INITIAL_STATE immediate save+reload, unchanged original Ascension/factory reset.');
console.log('PASS S15: exact S14 evidence/authority entry, four explicit stages/all16 immutable policies, no player strategy approval, zero reward, derived proof-only readiness/G1, strict hydration/stage reload/no auto rollout, retained source history, live500/10 flow/manual review and automated SQL/manual ad-hoc.');
console.log('PASS S14: all16 policies/root-proof entry, explicit supplier nominal/approximate±2cm evidence, rule-only containment preserving history/current work, bounded once-only zero-reward backfill/writeUses without routine counter changes, preserved causal/customer history, safe repair hydration/reload/no-offline/overflow, live500/10 routine+SQL and unchanged AUTO classes/G1.');
console.log('PASS S13: exact Governance/S12 evidence, all16 policies, authored ordered stages/three deterministic alternatives, wrong/stale/skip guards, rule-only once proof/no rewards/permission changes, stage-by-stage reload/default hydration, live500/10 routing/+5quarantine and SQL before/after proof, S12/S11 invariants and G1/reset.');
console.log('PASS S12: all16 policies/exact Lightspeed authority, separate 5 upstream quarantines per unchanged500/10 batch, both notice/proof orders, 25 threshold, deferral/continued governance accumulation, no drift proposals/writes/rewards/penalties, safe hydration/no offline replay, narrow explicit establishment, manual review/SQL/G1 preserved.');
console.log('PASS S11: exact S10 eligibility/all16 policies, deferrable offer/old one-write routing, acknowledged 500/10-tick deterministic batches, derived 250/sec split, no rewards/penalties/log flood, window37/backlog invariants, one-item refill/legacy/filtered IDs, three-batch proof/explicit Lightspeed, transient/save/overdue/no-offline guards, malformed and overflow fail-closed, SQL automation/manual rewards and G1/reset preserved.');
}
