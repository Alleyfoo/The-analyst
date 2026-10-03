// Focused S1 checks using installed TypeScript, Node assertions and stubbed React/timers.
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
    action(name, ...args) { api.actions[name](...args); flush(); },
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
for (const step of ['automation_recognized', 'pilot_announced', 'pilot_ready']) {
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
console.log('PASS: eligibility, legacy scores, each step save/reload, idempotence, acknowledgement guards, blockers; exact baseline fresh/below/eligible production comparison over 20 ticks. Hooks/timers are stubbed.');
