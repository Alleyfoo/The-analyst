import React from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { AIPilotStep } from '../types';

interface Props {
  step: Exclude<AIPilotStep, 'pilot_ready'>;
  onContinue: (step: AIPilotStep) => void;
  onLater: () => void;
}

// Presentation only: the engine owns eligibility, sequence and acknowledgement.
export const AIPilotIntroduction: React.FC<Props> = ({ step, onContinue, onLater }) => {
  const recognition = step === 'automation_recognized';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="pilot-introduction-title"
        className="bg-slate-900 border border-emerald-700/50 rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-4 mb-4">
          {recognition ? <CheckCircle className="text-emerald-400" size={32} /> : <Sparkles className="text-blue-400" size={32} />}
          <div>
            <h2 id="pilot-introduction-title" className="text-xl font-bold text-slate-100">
              {recognition ? 'AUTOMATION RECOGNIZED' : 'ENTERPRISE AI PILOT'}
            </h2>
            <p className="text-xs font-mono uppercase text-slate-500 tracking-wider">Management update</p>
          </div>
        </div>
        <div className="bg-slate-950/50 p-4 rounded border border-slate-800 mb-6 text-sm text-slate-300 leading-relaxed space-y-3">
          {recognition ? <>
            <p>Your ETL scripts, indexed queries and server capacity have turned a spreadsheet routine into a repeatable workflow. Management has noticed the improvement in processing and turnaround.</p>
            <p>“This is working. You've made room for more useful analysis. We'd like to build on it.”</p>
          </> : <>
            <p>Your automation work has earned approval for a limited AI-assisted workflow pilot. It can help prepare routine data work faster, giving you more time to review the result.</p>
            <p>“If we can reduce turnaround without adding headcount, this could be significant. Let's start with one real task.”</p>
            <p>The pilot is approved. The next step will be trying it on an existing task; that trial will arrive in a later update. Your current tools continue to work as before.</p>
          </>}
        </div>
        <button onClick={() => onContinue(step)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors">
          {recognition ? 'Acknowledge progress' : 'Acknowledge pilot approval'}
        </button>
        <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
      </section>
    </div>
  );
};
