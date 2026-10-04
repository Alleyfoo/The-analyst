import React, { useRef, useState } from 'react';
import { X, Activity } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (metricsReward: number, tuReward: number) => void;
}

const STAGES = ['RECEIVED', 'VALIDATE', 'ENRICH', 'APPROVE', 'PUBLISH'] as const;
type Stage = typeof STAGES[number];
type Trace = { id: string; steps: { stage: Stage; wait: number }[] };
type Scenario = { title: string; cases: Trace[]; bottleneck: Stage; variant: string; candidates: string[]; explanation: string };
const canonical = STAGES.join(' → ');
const approvalRework = 'RECEIVED → VALIDATE → ENRICH → APPROVE → ENRICH → APPROVE → PUBLISH';
const validationRework = 'RECEIVED → VALIDATE → RECEIVED → VALIDATE → ENRICH → APPROVE → PUBLISH';
const skippedApproval = 'RECEIVED → VALIDATE → ENRICH → PUBLISH';
const trace = (id: string, stages: readonly Stage[], waits: number[]): Trace => ({
  id, steps: stages.map((stage, index) => ({ stage, wait: waits[index] })),
});
const approvalRoute: Stage[] = ['RECEIVED', 'VALIDATE', 'ENRICH', 'APPROVE', 'ENRICH', 'APPROVE', 'PUBLISH'];
const validationRoute: Stage[] = ['RECEIVED', 'VALIDATE', 'RECEIVED', 'VALIDATE', 'ENRICH', 'APPROVE', 'PUBLISH'];
const skipRoute: Stage[] = ['RECEIVED', 'VALIDATE', 'ENRICH', 'PUBLISH'];

// Fixed completed cases; only the choice of dataset varies between openings.
const SCENARIOS: Scenario[] = [
  {
    title: 'Product listing approvals', bottleneck: 'APPROVE', variant: approvalRework,
    candidates: [canonical, approvalRework, skippedApproval],
    explanation: 'Approval holds most of the accumulated wait. Two cases return from APPROVE to ENRICH and then seek approval again.',
    cases: [
      trace('1042', STAGES, [1, 2, 3, 14, 1]), trace('1043', approvalRoute, [1, 2, 2, 12, 2, 6, 1]),
      trace('1044', STAGES, [1, 1, 3, 15, 1]), trace('1045', STAGES, [2, 2, 2, 13, 1]),
      trace('1046', approvalRoute, [1, 2, 3, 11, 1, 5, 1]), trace('1047', STAGES, [1, 2, 2, 14, 1]),
    ],
  },
  {
    title: 'Supplier intake validation', bottleneck: 'VALIDATE', variant: validationRework,
    candidates: [approvalRework, canonical, validationRework],
    explanation: 'Validation holds most of the accumulated wait. Two cases return to RECEIVED for corrected intake and are validated a second time.',
    cases: [
      trace('2081', STAGES, [1, 13, 2, 2, 1]), trace('2082', STAGES, [2, 15, 3, 1, 1]),
      trace('2083', validationRoute, [1, 11, 2, 6, 2, 2, 1]), trace('2084', STAGES, [1, 14, 2, 2, 1]),
      trace('2085', STAGES, [1, 12, 3, 2, 1]), trace('2086', validationRoute, [2, 12, 1, 5, 2, 1, 1]),
    ],
  },
  {
    title: 'Catalogue enrichment', bottleneck: 'ENRICH', variant: skippedApproval,
    candidates: [skippedApproval, validationRework, canonical],
    explanation: 'Enrichment holds most of the accumulated wait. Two cases go directly from ENRICH to PUBLISH, missing the expected approval step.',
    cases: [
      trace('3091', STAGES, [1, 2, 14, 2, 1]), trace('3092', skipRoute, [1, 2, 13, 1]),
      trace('3093', STAGES, [2, 1, 15, 2, 1]), trace('3094', STAGES, [1, 2, 12, 3, 1]),
      trace('3095', skipRoute, [1, 2, 14, 1]), trace('3096', STAGES, [1, 1, 13, 2, 1]),
    ],
  },
];

const TraceAnalysisRound: React.FC<Omit<Props, 'active'>> = ({ onClose, onComplete }) => {
  const [scenario] = useState(() => SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
  const [bottleneck, setBottleneck] = useState<Stage | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const finished = useRef(false);
  const totals = STAGES.map(stage => ({ stage, wait: scenario.cases.reduce((sum, item) =>
    sum + item.steps.reduce((subtotal, step) => subtotal + (step.stage === stage ? step.wait : 0), 0), 0) }));
  const maximumTotal = Math.max(...totals.map(item => item.wait));
  const maximumWait = Math.max(...scenario.cases.flatMap(item => item.steps.map(step => step.wait)));
  const frequencies = scenario.cases.reduce<Record<string, number>>((counts, item) => {
    const route = item.steps.map(step => step.stage).join(' → ');
    counts[route] = (counts[route] ?? 0) + 1;
    return counts;
  }, {});
  const correct = Number(bottleneck === scenario.bottleneck) + Number(variant === scenario.variant);
  const [metricsReward, tuReward] = correct === 2 ? [50, 5] : correct === 1 ? [25, 2] : [0, 0];
  const close = () => { if (finished.current) return; finished.current = true; onClose(); };
  const apply = () => {
    if (!submitted || finished.current) return;
    finished.current = true;
    onComplete(metricsReward, tuReward);
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="process-mining-title"
      className="w-full max-w-5xl max-h-[94vh] min-h-0 flex flex-col bg-slate-900 border border-emerald-700/50 rounded-lg shadow-2xl overflow-hidden">
      <header className="shrink-0 p-4 border-b border-slate-700 flex items-start justify-between gap-3">
        <div>
          <h2 id="process-mining-title" className="font-bold text-lg text-emerald-300 flex items-center gap-2"><Activity size={18} />PROCESS MINING</h2>
          <p className="text-sm text-slate-300">TRACE ANALYSIS · {scenario.title}</p>
          <p className="text-xs text-slate-400 mt-1">CASE LOG: {scenario.cases.length} CASES · Completed cases reconstructed from event logs.</p>
        </div>
        <button aria-label="Close process mining" onClick={close} className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"><X size={20} /></button>
      </header>
      <div aria-label="Expected process map" className="shrink-0 p-3 border-b border-slate-700 bg-slate-950">
        <p className="text-xs text-slate-400 mb-2">EXPECTED PROCESS</p>
        <ol className="grid grid-cols-5 gap-1 text-xs font-mono text-slate-200">
          {STAGES.map((stage, index) => <li key={stage} className="flex items-center justify-between gap-1"><span>{stage}</span>{index < 4 && <span className="text-slate-500">→</span>}</li>)}
        </ol>
      </div>
      <div role="region" aria-label="Trace analysis evidence and findings" className="min-h-0 overflow-y-auto p-4 space-y-5">
        {!submitted ? <>
          <fieldset>
            <legend className="font-bold text-sm text-slate-100">1. WHERE IS WORK WAITING?</legend>
            <p className="text-xs text-slate-400 mt-1 mb-2">Accumulated wait across all cases, including repeat visits. Select one stage.</p>
            <div className="grid grid-cols-5 gap-2">
              {totals.map(({ stage, wait }) => <button type="button" key={stage} aria-pressed={bottleneck === stage}
                onClick={() => setBottleneck(stage)} className={clsx('p-2 rounded border text-left text-xs font-mono', bottleneck === stage ? 'border-emerald-400 bg-emerald-900/30' : 'border-slate-700 bg-slate-800 hover:bg-slate-700')}>
                <span className="block text-slate-200">{stage}</span>
                <span className="block text-slate-400 my-1">{wait} min wait</span>
                <span className="block h-2 bg-slate-950 rounded overflow-hidden"><span className="block h-full bg-emerald-500" style={{ width: `${wait / maximumTotal * 100}%` }} /></span>
              </button>)}
            </div>
          </fieldset>
          <section aria-label="Completed case traces">
            <h3 className="font-bold text-sm text-slate-100 mb-2">OBSERVED WAIT · CASE TRACES</h3>
            <p className="text-xs text-slate-400 mb-3">Read each case from top to bottom. Bars share the same scale; repeat or missing stages remain visible.</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {scenario.cases.map(item => <article key={item.id} aria-label={`Case ${item.id}`} className="p-3 rounded border border-slate-700 bg-slate-950">
                <h4 className="font-bold text-xs text-blue-200 mb-2">CASE {item.id}</h4>
                <ol className="space-y-1">
                  {item.steps.map((step, index) => <li key={index} className="grid grid-cols-[65px_1fr_28px] items-center gap-2 text-[10px] font-mono">
                    <span className="text-slate-300">{step.stage}</span>
                    <span className="h-2 bg-slate-800 rounded overflow-hidden"><span className="block h-full bg-blue-400" style={{ width: `${step.wait / maximumWait * 100}%` }} /></span>
                    <span className="text-right text-slate-400">{step.wait}m</span>
                  </li>)}
                </ol>
              </article>)}
            </div>
          </section>
          <section aria-label="Observed route frequency" className="space-y-2">
            <h3 className="font-bold text-sm text-slate-100">OBSERVED ROUTES</h3>
            {Object.entries(frequencies).map(([route, count]) => <p key={route} className="text-xs font-mono text-slate-300"><span className="text-blue-200">{count} / {scenario.cases.length} cases</span> · {route}</p>)}
          </section>
          <fieldset>
            <legend className="font-bold text-sm text-slate-100 mb-2">2. WHICH VARIANT NEEDS INVESTIGATION?</legend>
            <div className="space-y-2">
              {scenario.candidates.map(route => <button type="button" key={route} aria-pressed={variant === route}
                onClick={() => setVariant(route)} className={clsx('w-full p-3 rounded border text-left text-xs font-mono', variant === route ? 'border-emerald-400 bg-emerald-900/30 text-emerald-200' : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300')}>{route}</button>)}
            </div>
          </fieldset>
          <button disabled={!bottleneck || !variant} onClick={() => { if (bottleneck && variant && !finished.current) setSubmitted(true); }}
            className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed">SUBMIT ANALYSIS</button>
        </> : <section aria-label="Analysis result" className="space-y-4">
          <h3 className="text-lg font-bold text-emerald-300">ANALYSIS RESULT · {correct} / 2 FINDINGS</h3>
          <div className="p-3 rounded border border-slate-700 space-y-2 text-sm">
            <h4 className="font-bold text-slate-100">BOTTLENECK</h4>
            <p className="text-slate-300">Your answer: {bottleneck}</p>
            <p className="text-emerald-200">Observed: {scenario.bottleneck}</p>
          </div>
          <div className="p-3 rounded border border-slate-700 space-y-2 text-sm">
            <h4 className="font-bold text-slate-100">PROCESS VARIANT</h4>
            <p className="text-slate-300">Your answer: {variant}</p>
            <p className="text-emerald-200">Observed: {scenario.variant}</p>
          </div>
          <p className="text-sm text-slate-300">{scenario.explanation}</p>
          <p className="text-sm font-mono text-emerald-200">Finding reward: {metricsReward} Metrics / {tuReward} TU · before Neural Link scaling.</p>
          <button onClick={apply} className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">COMPLETE ANALYSIS</button>
        </section>}
        <p className="text-xs text-slate-500">Simplified corporate trace analysis, not professional training material. Close without applying to leave the finding unclaimed.</p>
      </div>
    </section>
  </div>;
};

// Unmounting the local round on close guarantees a fresh board on each opening.
export const ProcessMiningGame: React.FC<Props> = ({ active, onClose, onComplete }) =>
  active ? <TraceAnalysisRound onClose={onClose} onComplete={onComplete} /> : null;
