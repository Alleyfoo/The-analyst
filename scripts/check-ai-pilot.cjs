// Focused S1-S3/G1 checks using installed TypeScript, Node assertions and stubbed React/timers.
// Browser smoke separately verifies actual rendering and persistence.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const baseline = '1263845279e9afd65ac05a6a1ac809e9bc70ee3c';
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
    const actual = newGame.state(); delete actual.expansionProgress; delete actual.aiReviewQueue;
    const expected = oldGame.state(); delete expected.expansionProgress; delete expected.aiReviewQueue;
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
const after = game.state(); delete before.expansionProgress; delete before.aiReviewQueue; delete after.expansionProgress; delete after.aiReviewQueue;
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
  delete currentManual.expansionProgress; delete currentManual.aiReviewQueue; delete baselineManual.expansionProgress; delete baselineManual.aiReviewQueue;
  assert.deepEqual(currentManual, baselineManual, 'ordinary SQL reward matches original source baseline');
  assert.deepEqual(manual.state().expansionProgress, progress('pilot_ready'), 'manual cannot advance pilot');
  assisted.action('completeSQLPilotQuery', attempt);
  assert.deepEqual(assisted.state().expansionProgress, progress('pilot_success'));
  const actual = assisted.state(), expected = manual.state();
  delete actual.expansionProgress; delete actual.aiReviewQueue; delete expected.expansionProgress; delete expected.aiReviewQueue;
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
  delete actual.expansionProgress; delete actual.aiReviewQueue; delete expected.expansionProgress; delete expected.aiReviewQueue;
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
const feedbackAfter = feedback.state(); delete feedbackBefore.expansionProgress; delete feedbackBefore.aiReviewQueue; delete feedbackAfter.expansionProgress; delete feedbackAfter.aiReviewQueue;
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
const baselineProgress = { era: 'analyst', transition: null };
for (const tu of [99, 100, 135]) {
  const seed = { tu, pu: 10000, prestige: { level: 2, currency: 7 }, expansionProgress: baselineProgress };
  const current = mount(seed), original = mount(seed, true);
  assert.equal(current.deferred(), false);
  for (const game of [current, original]) game.purchase('project_omniscience');
  const actual = current.state(), expected = original.state(); delete actual.aiReviewQueue; delete expected.aiReviewQueue;
  assert.deepEqual(actual, expected, 'baseline purchase/cost/flag/log matches original at TU ' + tu);
  if (tu < 100) continue;
  for (const game of [current, original]) { game.action('ascend'); assert.equal(game.rebooting(), true); game.timeout(3000); }
  const currentNG = current.saved(), originalNG = original.saved(); delete currentNG.expansionProgress; delete currentNG.aiReviewQueue; delete originalNG.expansionProgress; delete originalNG.aiReviewQueue;
  assert.deepEqual(currentNG, originalNG, 'baseline NG+ reset and prestige match original');
  assert.equal(current.reloads(), original.reloads());
}
const sandbox = mount({ tu: 100, expansionProgress: baselineProgress });
sandbox.purchase('project_omniscience'); sandbox.action('cancelAscension');
assert.equal(sandbox.state().isAscending, false);
assert.equal(sandbox.state().upgrades.project_omniscience, true);
const sandboxBefore = sandbox.state(); sandbox.purchase('project_omniscience');
assert.deepEqual(sandbox.state(), sandboxBefore, 'original one-shot sandbox quirk preserved');
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
console.log('PASS: S1-S3 regression and G1 baseline purchase/NG+/sandbox equivalence, already-open ending/handoff, all-era deferral, side-effect-free purchase/direct reset guards, gate reload, factory reset, queue/reward preservation. Hooks/timers are stubbed; Chromium covers UI.');
