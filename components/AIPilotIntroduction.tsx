import React from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { AIPilotStep, AIPilotFeedbackStep } from '../types';

interface Props {
  step: AIPilotFeedbackStep;
  onContinue: (step: AIPilotStep) => void;
  onLater: () => void;
}

// Presentation only: the engine owns eligibility, sequence and acknowledgement.
export const AIPilotIntroduction: React.FC<Props> = ({ step, onContinue, onLater }) => {
  const recognition = step === 'automation_recognized';
  const result = step === 'pilot_success';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="pilot-introduction-title"
        className="bg-slate-900 border border-emerald-700/50 rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-4 mb-4">
          {recognition ? <CheckCircle className="text-emerald-400" size={32} /> : <Sparkles className="text-blue-400" size={32} />}
          <div>
            <h2 id="pilot-introduction-title" className="text-xl font-bold text-slate-100">
              {recognition ? 'AUTOMATION RECOGNIZED' : result ? 'PILOT RESULT' : 'ENTERPRISE AI PILOT'}
            </h2>
            <p className="text-xs font-mono uppercase text-slate-500 tracking-wider">Management update</p>
          </div>
        </div>
        <div className="bg-slate-950/50 p-4 rounded border border-slate-800 mb-6 text-sm text-slate-300 leading-relaxed space-y-3">
          {recognition ? <>
            <p>Your ETL scripts, indexed queries and server capacity have turned a spreadsheet routine into a repeatable workflow. Management has noticed the improvement in processing and turnaround.</p>
            <p>“This is working. You've made room for more useful analysis. We'd like to build on it.”</p>
          </> : result ? <>
            <p>The assisted query returned the expected result. Preparing it took a fraction of the usual clause assembly, while you retained the final review and execution.</p>
            <p>“That's a useful improvement. Let's widen the pilot so more of the team can benefit.”</p>
            <p>Operations will prepare the next round of work. For now, your workload and tools continue as before.</p>
          </> : <>
            <p>Your automation work has earned approval for a limited AI-assisted workflow pilot. It can help prepare routine data work faster, giving you more time to review the result.</p>
            <p>“If we can reduce turnaround without adding headcount, this could be significant. Let's start with one real task.”</p>
            <p>The pilot is approved. Open Run Ad-Hoc SQL Query and use the pilot to prepare a query, then review it before pressing EXECUTE.</p>
          </>}
        </div>
        <button onClick={() => onContinue(step)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors">
          {recognition ? 'Acknowledge progress' : result ? 'Acknowledge pilot result' : 'Acknowledge pilot approval'}
        </button>
        <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
      </section>
    </div>
  );
};
