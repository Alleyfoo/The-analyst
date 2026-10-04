import React, { useState } from 'react';

interface Props { active: boolean; }

const OmniscienceFinale: React.FC = () => {
  const [reading, setReading] = useState(false);
  return <div role="dialog" aria-modal="true" aria-labelledby="omniscience-title"
    className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto font-mono text-slate-300">
    <div className="min-h-full flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        {!reading ? <>
          <h1 id="omniscience-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">PROJECT: OMNISCIENCE</h1>
          <p className="mt-3 text-xs tracking-[0.2em] text-emerald-400">DEPLOYMENT COMPLETE</p>
          <dl className="mt-8 space-y-2 text-sm">
            {[
              ['Incoming data', 'automated'], ['Cleaning', 'automated'],
              ['Analysis', 'automated'], ['Reporting', 'automated'],
              ['Exceptions', 'governed'], ['Incidents', 'monitored'],
            ].map(([label, status]) => <div key={label} className="flex justify-between gap-4">
              <dt>{label}:</dt><dd className="text-slate-100">{status}</dd>
            </div>)}
          </dl>
          <p className="mt-6 pt-6 border-t border-slate-800 text-sm">Pending tasks: <strong className="text-slate-100">0</strong></p>
          <div className="mt-8 space-y-4 text-sm leading-relaxed">
            <p>You wait for something to happen.</p>
            <p>Nothing happens.</p>
            <p>You take a book from the shelf.</p>
          </div>
          <button onClick={() => setReading(true)} className="mt-8 w-full py-3 rounded border border-slate-500 text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-100 font-bold">READ</button>
        </> : <div aria-live="polite">
          <div className="space-y-4 text-sm leading-relaxed">
            <p>You read for a while.</p>
            <p>Nobody messages you.</p>
            <p>The dashboards continue updating.</p>
          </div>
          <h1 id="omniscience-title" className="mt-12 text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">THE ANALYST</h1>
          <p className="mt-3 text-xs tracking-[0.3em] text-emerald-400">COMPLETE</p>
        </div>}
      </div>
    </div>
  </div>;
};

// The existing isAscending flag owns entry; READ is a local narrative action.
export const AscensionOverlay: React.FC<Props> = ({ active }) => active ? <OmniscienceFinale /> : null;
