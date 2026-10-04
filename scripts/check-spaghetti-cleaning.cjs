const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ts = require(path.join(root, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'components/SpaghettiOverlay.tsx'), 'utf8');
assert(!/requestAnimationFrame|setTimeout|setInterval|canvas|window\.inner|onMouseMove|onTouchMove/.test(source));
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
function session(raw = 100, first = 0) {
  const slots = []; let cursor = 0, closed = 0; const paid = [];
  const react = { useState(init) { const i = cursor++; if (!(i in slots)) slots[i] = typeof init === 'function' ? init() : init; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; }, useRef(init) { const i = cursor++; return slots[i] ??= { current: init }; }, useLayoutEffect(effect, deps) { const i = cursor++; if (!slots[i] || deps.some((d,j) => d !== slots[i][j])) { slots[i] = deps; effect(); } }, createElement(type, props, ...children) { return { type, props: { ...props, children } }; } }; react.default = react;
  const math = Object.create(Math); math.random = () => first / 2 + .1;
  const exports = {}; vm.runInNewContext(output + '\nexports.session = CleanupSession; exports.cases = CASES;', { exports, Math: math, require: n => n === 'react' ? react : n === 'clsx' ? { default: () => '' } : n === 'framer-motion' ? { motion: { path: 'motion.path' } } : { X: 'svg', Wand2: 'svg' } });
  const render = (nextRaw = raw) => { raw = nextRaw; cursor = 0; return exports.session({ rawData: raw, onClose: () => closed++, onClean: (...r) => paid.push(r) }); };
  const walk = n => !n || typeof n !== 'object' ? [] : [n, ...(n.props?.children ?? []).flat(Infinity).flatMap(walk)];
  const text = n => typeof n === 'string' || typeof n === 'number' ? String(n) : (n?.props?.children ?? []).flat(Infinity).map(text).join('');
  const records = tree => walk(tree).filter(n => n.type === 'article');
  const button = (tree, name) => { const n = walk(tree).find(n => n.type === 'button' && (text(n) === name || n.props['aria-label'] === name)); assert(n, name); return n.props; };
  return { render, records, button, walk, text, paid, closed: () => closed, cases: exports.cases };
}
const normalize = c => c.field === 'Active' || c.field === 'Discontinued' ? c.raw === 'yes' : c.field === 'Colour' ? ({ 'navy blue': 'Navy', 'light grey': 'Grey' })[c.raw] : c.field === 'CountryCode' ? c.raw.toUpperCase() : c.field === 'Width' || c.field === 'Height' ? Number(c.raw.replace(' cm','')) : c.field === 'WeightKg' ? Number(c.raw.replace(',','.')) : c.raw.trim();
const sample = session(); assert.equal(sample.cases.length,12);
for (const c of sample.cases) { assert.equal(c.clean,normalize(c)); assert(c.target && c.raw && c.field); assert.equal(c.choices.length,3); assert.equal(c.choices.filter(v=>v===c.clean).length,1); assert.equal(new Set(c.choices.map(JSON.stringify)).size,3); assert(!c.raw.includes('~')); }
for (const start of [0,1]) {
  const g = session(100,start); let tree = g.render(); const firstIds = g.records(tree).map(n=>n.props['aria-label']); assert.equal(firstIds.length,6);
  for (let batch=0;batch<2;batch++) {
    const ids = g.records(tree).map(n=>n.props['aria-label']); if(batch)assert(ids.every(id=>!firstIds.includes(id)));
    for (const node of g.records(tree)) {
      const c = g.cases.find(c=>'Record '+c.id === node.props['aria-label']);
      const before=g.paid.length; g.button(node,JSON.stringify(c.choices.find(v=>v!==c.clean))).onClick(); tree=g.render(); assert.equal(g.paid.length,before); assert(g.text(tree).includes('DOES NOT MATCH TARGET FORMAT'));
      const current=g.records(tree).find(n=>n.props['aria-label']===node.props['aria-label']); const click=g.button(current,JSON.stringify(c.clean)).onClick; click(); click(); tree=g.render(); assert.equal(g.paid.length,before+1); assert.deepEqual(g.paid.at(-1),[5,5,25]); assert(g.text(tree).includes('CLEAN VALUE'));
      const cleanNode=g.records(tree).find(n=>n.props['aria-label']===node.props['aria-label']); const connection=g.walk(cleanNode).find(n=>n.type==='motion.path'); assert.equal(connection.props.animate.stroke,'#10b981'); assert.equal(connection.props.animate.d,'M 0 30 C 16 30 33 30 50 30 C 66 30 83 30 100 30');
    }
    assert(g.text(tree).includes('BATCH CLEAN')); assert.equal(g.paid.length,(batch+1)*6);
    if(!batch){const load=g.button(tree,'LOAD ANOTHER BATCH').onClick;load();load();tree=g.render();assert.equal(g.records(tree).length,6);assert(!g.text(tree).includes('CLEAN VALUE'));}
  }
  g.button(tree,'CLOSE').onClick();g.button(tree,'CLOSE').onClick();assert.equal(g.closed(),1);assert.equal(g.paid.length,12);
}
const poor=session(5),initial=poor.render(),rows=poor.records(initial); const actions=rows.map(n=>{const c=poor.cases.find(c=>'Record '+c.id===n.props['aria-label']);return poor.button(n,JSON.stringify(c.clean)).onClick;});actions[0]();actions[1]();actions[0]();let tree=poor.render();assert.equal(poor.paid.length,1);assert(poor.text(tree).includes('INSUFFICIENT RAW DATA'));
tree=poor.render(4);actions[2]();assert.equal(poor.paid.length,1);tree=poor.render(10);actions[2]();assert.equal(poor.paid.length,2);poor.button(tree,'Close manual data cleanup').onClick();actions[3]();assert.equal(poor.paid.length,2);assert.equal(poor.closed(),1);
const fresh=session();assert(!fresh.text(fresh.render()).includes('CLEAN VALUE'));assert.equal(fresh.records(fresh.render()).length,6);
const gitFile = (ref,file) => cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show',ref+':'+file],{encoding:'utf8'}).replaceAll('\r\n','\n');
assert.equal(fs.readFileSync(path.join(root,'components/PandasMappingGame.tsx'),'utf8').replaceAll('\r\n','\n'),gitFile('4aba858f5d0bd0fcca9db06921009046406a94b3','components/PandasMappingGame.tsx'));
const engine=fs.readFileSync(path.join(root,'hooks/useGameEngine.ts'),'utf8');const block=s=>s.slice(s.indexOf('  const cleanSpaghettiStrand ='),s.indexOf('  const completePandasLevel =')).replaceAll('\r\n','\n');assert.equal(block(engine),block(gitFile('1263845279e9afd65ac05a6a1ac809e9bc70ee3c','hooks/useGameEngine.ts')));
for(const level of [0,3])for(const active of [false,true])for(const raw of [4,5,100]) {let state={rawData:raw,cleanData:10,pu:20,tu:30,metricQuality:.5,worldStats:{entropy:40},prestige:{level},boardMeeting:{active,progress:7}};const before=state;const fn=vm.runInNewContext(ts.transpileModule(block(engine)+'\ncleanSpaghettiStrand;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{setState:update=>{state=update(state);}});fn(5,5,25);const m=1+level*.1;if(raw<5)assert.equal(state,before);else{assert.equal(state.rawData,raw-5);assert.equal(state.cleanData,10+5*m);assert.equal(state.pu,20+25*m);assert.equal(state.boardMeeting.progress,7+(active?25*m:0));assert.equal(state.tu,30);assert.equal(state.metricQuality,.5);assert.equal(state.worldStats.entropy,40);}}
const workstation=fs.readFileSync(path.join(root,'components/Workstation.tsx'),'utf8');assert(workstation.includes("const canManualClean = state.upgrades['manual_excel']"));assert(workstation.includes('Manual Data Cleanup (Spaghetti)'));
console.log('PASS P3:12 unambiguous value normalizations, two six-record batches, local wrong answers, immediate5/5/25 once-only rewards/no bonus, rapid-click Raw reservation/exact5/insufficient/refill, fresh close/no stale claims/no scheduler, straight-green clean routes, Pandas unchanged, original engine economics/prestige/meeting parity.');
