// Focused component lifecycle/evidence checks; actual UI is covered in Chromium.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ts = require(path.join(root, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'components/ProcessMiningGame.tsx'), 'utf8');
assert(!/requestAnimationFrame|cancelAnimationFrame|setTimeout|setInterval|canvas|window\.inner/.test(source), 'round has no scheduled work or viewport geometry');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
function round(index) {
  const slots = [], refs = []; let cursor = 0, refCursor = 0, closed = 0; const paid = [];
  const react = { useState(init) { const i = cursor++; if (!(i in slots)) slots[i] = typeof init === 'function' ? init() : init; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; }, useRef(init) { return refs[refCursor++] ??= { current: init }; }, createElement(type, props, ...children) { return { type, props: { ...props, children } }; } }; react.default = react;
  const math = Object.create(Math); math.random = () => (index + .1) / 3;
  const exports = {}; vm.runInNewContext(output + '\nexports.round = TraceAnalysisRound; exports.scenarios = SCENARIOS; exports.wrapper = ProcessMiningGame;', { exports, Math: math, require: name => name === 'react' ? react : name === 'clsx' ? { default: () => '' } : { X: 'svg', Activity: 'svg' } });
  const render = () => { cursor = refCursor = 0; return exports.round({ onClose: () => closed++, onComplete: (m, t) => paid.push([m, t]) }); };
  const walk = node => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children ?? []).flat(Infinity).flatMap(walk)];
  const text = node => typeof node === 'string' ? node : typeof node === 'number' ? String(node) : (node?.props?.children ?? []).flat(Infinity).map(text).join('');
  const button = (tree, label) => { const result = walk(tree).find(n => n.type === 'button' && (n.props['aria-label'] === label || text(n).startsWith(label))); assert(result, label); return result.props; };
  return { render, button, walk, paid, closed: () => closed, scenario: exports.scenarios[index], wrapper: exports.wrapper };
}
for (let index = 0; index < 3; index++) {
  const sample = round(index), s = sample.scenario; assert(s.cases.length >= 6 && s.cases.length <= 8);
  const expected = ['RECEIVED', 'VALIDATE', 'ENRICH', 'APPROVE', 'PUBLISH'];
  const totals = Object.fromEntries(expected.map(stage => [stage, s.cases.flatMap(c => c.steps).reduce((sum, step) => sum + (step.stage === stage ? step.wait : 0), 0)]));
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]); assert.equal(sorted[0][0], s.bottleneck); assert(sorted[0][1] > sorted[1][1] * 2, 'unambiguous waiting evidence');
  const routes = s.cases.map(c => c.steps.map(step => step.stage).join(' → ')), unusual = [...new Set(routes.filter(route => route !== expected.join(' → ')))];
  assert.equal(unusual.length, 1); assert.equal(unusual[0], s.variant); assert.equal(routes.filter(r => r === s.variant).length, 2); assert.equal(s.candidates.filter(r => r === s.variant).length, 1); assert.equal(new Set(s.candidates).size, 3);
  for (const correctness of [2, 1, 0]) {
    const g = round(index); let tree = g.render(); assert(g.button(tree, 'SUBMIT ANALYSIS').disabled);
    g.button(tree, correctness > 0 ? s.bottleneck : 'PUBLISH').onClick(); tree = g.render(); assert(g.button(tree, 'SUBMIT ANALYSIS').disabled);
    g.button(tree, correctness === 2 ? s.variant : expected.join(' → ')).onClick(); tree = g.render(); assert.equal(g.button(tree, 'SUBMIT ANALYSIS').disabled, false); g.button(tree, 'SUBMIT ANALYSIS').onClick(); tree = g.render(); assert.deepEqual(g.paid, []);
    const claim = g.button(tree, 'COMPLETE ANALYSIS'); claim.onClick(); claim.onClick(); g.button(g.render(), 'COMPLETE ANALYSIS').onClick(); assert.deepEqual(g.paid, [correctness === 2 ? [50, 5] : correctness === 1 ? [25, 2] : [0, 0]]); assert.equal(g.closed(), 1);
  }
  for (const submit of [false, true]) {
    const g = round(index); let tree = g.render(); if (submit) { g.button(tree, s.bottleneck).onClick(); g.button(tree, s.variant).onClick(); tree = g.render(); g.button(tree, 'SUBMIT ANALYSIS').onClick(); tree = g.render(); }
    g.button(tree, 'Close process mining').onClick(); if (submit) g.button(tree, 'COMPLETE ANALYSIS').onClick(); assert.deepEqual(g.paid, []); assert.equal(g.closed(), 1); assert.equal(g.wrapper({ active: false }), null);
    const reopened = round(index), fresh = reopened.render(); assert(reopened.button(fresh, 'SUBMIT ANALYSIS').disabled); assert(reopened.walk(fresh).filter(n => n.type === 'button' && n.props['aria-pressed']).length === 0);
  }
}
const engine = fs.readFileSync(path.join(root, 'hooks/useGameEngine.ts'), 'utf8');
const oldEngine = cp.execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), 'show', '1263845279e9afd65ac05a6a1ac809e9bc70ee3c:hooks/useGameEngine.ts'], { encoding: 'utf8' });
const block = s => s.slice(s.indexOf('  const completeMiningLevel ='), s.indexOf('  const completeFlowBatch ='));
assert.equal(block(engine).replaceAll('\r\n', '\n'), block(oldEngine).replaceAll('\r\n', '\n'), 'engine callback exactly matches original baseline');
for (const level of [0, 3]) for (const active of [false, true]) for (const reward of [[50, 5], [25, 2], [0, 0]]) {
  let state = { metrics: 10, tu: 20, pu: 30, prestige: { level }, boardMeeting: { active, progress: 7 }, logs: [] };
  const callback = vm.runInNewContext(ts.transpileModule(block(engine) + '\ncompleteMiningLevel;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { setState: fn => { state = fn(state); }, Date: { now: () => 123 } }); callback(...reward); const mult = 1 + level * .1;
  assert.equal(state.metrics, 10 + reward[0] * mult); assert.equal(state.tu, 20 + reward[1] * mult); assert.equal(state.pu, 30); assert.equal(state.boardMeeting.progress, 7 + (active ? reward[1] * 10 * mult : 0)); assert.equal(state.logs.length, 1);
}
console.log('PASS P2: all three authored evidence sets, both selections, 50/5–25/2–0/0 callback inputs, submit without payout, explicit once-only claim, unclaimed close/stale claim/fresh round, no scheduler/canvas/viewport loop, original engine prestige/meeting/log/no-PU parity. Chromium separately exercises the displayed evidence.');
