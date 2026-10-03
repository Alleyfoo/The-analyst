// Focused S1/S2 checks using installed TypeScript, Node assertions and stubbed React/timers.
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
  const modules = {}, slots = [], refs = [], effects = [], callbacks = [], intervals = new Map();
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
      localStorage: { getItem: () => saved, setItem: (_key, value) => { saved = value; } },
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
    const actual = newGame.state(); delete actual.expansionProgress;
    const expected = oldGame.state(); delete expected.expansionProgress;
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
const after = game.state(); delete before.expansionProgress; delete after.expansionProgress;
assert.deepEqual(after, before, 'acknowledgements change only progression');
for (const blocker of ['spaghettiMode', 'pandasMode', 'sqlMode', 'modelMode', 'miningMode', 'flowMode', 'buzzwordMode', 'pdfMode', 'isAscending']) {
  const blocked = mount({ ...eligibleSeed, [blocker]: true });
  assert.equal(blocked.presentation().available, false, blocker);
  blocked.action('advancePilotIntroduction', 'automation_recognized');
  assert.deepEqual(blocked.state().expansionProgress, progress('automation_recognized'));
}
for (const block of [{ coffeeBreak: { active: true } }, { boardMeeting: { active: true, timeRemaining: 30 } }, { blockingTask: { name: 'Busy' } }, { activeEvents: [{ id: 'storage_full_warning' }] }]) {
  const blocked = mount({ ...eligibleSeed, ...block });
  assert.equal(blocked.presentation().available, false);
  blocked.action('advancePilotIntroduction', 'automation_recognized');
  assert.deepEqual(blocked.state().expansionProgress, progress('automation_recognized'));
}
const ending = mount({ ...eligibleSeed, tu: 110 });
ending.purchase('project_omniscience');
assert.equal(ending.state().isAscending, true);
assert.equal(ending.presentation().available, false);
assert.deepEqual(ending.state().expansionProgress, progress('automation_recognized'));
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
  delete currentManual.expansionProgress; delete baselineManual.expansionProgress;
  assert.deepEqual(currentManual, baselineManual, 'ordinary SQL reward matches original source baseline');
  assert.deepEqual(manual.state().expansionProgress, progress('pilot_ready'), 'manual cannot advance pilot');
  assisted.action('completeSQLPilotQuery', attempt);
  assert.deepEqual(assisted.state().expansionProgress, progress('pilot_success'));
  const actual = assisted.state(), expected = manual.state();
  delete actual.expansionProgress; delete expected.expansionProgress;
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
  delete actual.expansionProgress; delete expected.expansionProgress;
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
const feedbackAfter = feedback.state(); delete feedbackBefore.expansionProgress; delete feedbackAfter.expansionProgress;
assert.deepEqual(feedbackAfter, feedbackBefore, 'management response adds no demand/rewards');
assert.deepEqual(mount(feedback.save()).state().expansionProgress, progress('demand_pending'));
compareTicks({ ...eligibleSeed, expansionProgress: progress('demand_pending') });
console.log('PASS: S1 eligibility/steps/guards; S2 attempt authority, manual non-advancement, reward equivalence at two prestige levels with/without meetings, duplicate/stale guards, feedback/save recovery; exact baseline economy over 20 ticks. Hooks/timers are stubbed; browser smoke covers SQL interactions.');
