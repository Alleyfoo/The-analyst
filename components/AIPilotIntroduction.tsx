import React from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { AIPilotStep, AIPilotFeedbackStep } from '../types';

interface Props {
  step: AIPilotFeedbackStep | 'continuous_demand_offer' | 'pressure_visible' | 'review_bottleneck_visible' | 'schema_introduction' | 'schema_first_result';
  onContinue: (step: AIPilotStep | 'continuous_demand_offer' | 'pressure_visible' | 'review_bottleneck_visible' | 'schema_introduction' | 'schema_first_result') => void;
  onLater: () => void;
}

// Presentation only: the engine owns eligibility, sequence and acknowledgement.
export const AIPilotIntroduction: React.FC<Props> = ({ step, onContinue, onLater }) => {
  const recognition = step === 'automation_recognized';
  const result = step === 'pilot_success';
  const expansion = step === 'demand_pending';
  const cleared = step === 'rollout_success';
  const operational = step === 'continuous_demand_offer';
  const turnaround = step === 'pressure_visible';
  const capacity = step === 'review_bottleneck_visible';
  const schema = step === 'schema_introduction';
  const schemaResult = step === 'schema_first_result';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="pilot-introduction-title"
        className="bg-slate-900 border border-emerald-700/50 rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-4 mb-4">
          {recognition ? <CheckCircle className="text-emerald-400" size={32} /> : <Sparkles className="text-blue-400" size={32} />}
          <div>
            <h2 id="pilot-introduction-title" className="text-xl font-bold text-slate-100">
              {recognition ? 'AUTOMATION RECOGNIZED' : result ? 'PILOT RESULT' : expansion ? 'PILOT EXPANSION' : cleared ? 'INITIAL PILOT QUEUE CLEARED' : operational ? 'OPERATIONAL ROLLOUT' : turnaround ? 'TURNAROUND TARGET' : capacity ? 'REVIEW CAPACITY' : schema ? 'SCHEMA MAPPING PILOT' : schemaResult ? 'BATCH COMPLETE' : 'ENTERPRISE AI PILOT'}
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
          </> : expansion ? <>
            <p>The trial reduced preparation time while keeping final analyst review. Operations would like to widen the pilot with three SQL requests.</p>
            <p>“Let's put that time saving to work. Review each prepared query and execute it when you're satisfied.”</p>
            <p>Acknowledging this update adds three requests to your review queue.</p>
          </> : cleared ? <>
            <p>All three requests are complete. Preparation time dropped and each query retained your final review.</p>
            <p>“The workflow is working well. Operations would like to route six requests through it next.”</p>
            <p>Acknowledging this result establishes the AI pilot and adds the six-request queue.</p>
          </> : operational ? <>
            <p>The expanded pilot has cleared its assigned workload while retaining final analyst review. Operations is moving the workflow into standard service.</p>
            <p>“We'll route routine requests directly into the review queue from now on.”</p>
            <p>Start with four requests. New requests will join the queue as you work.</p>
          </> : turnaround ? <>
            <p>The continuous review service is handling routine requests reliably. Operations has updated the expected turnaround for AI-assisted requests.</p>
            <p>“The preparation step is nearly instant now. We can shorten the service target.”</p>
            <p>New requests will be routed every four seconds. Final analyst review and EXECUTE remain part of the service.</p>
          </> : capacity ? <>
            <p>AI preparation time is no longer the primary constraint. Requests are spending more of their lifecycle waiting for final analyst review.</p>
            <p>“The workflow is fast. The approval step isn't.”</p>
            <p>This establishes the Acceleration phase. Continuous routing and final human execution continue.</p>
          </> : schema ? <>
            <p>Routine field mappings are now being proposed automatically. Operations wants the analyst team to review only cases the system cannot resolve confidently.</p>
            <p>“No need to inspect the obvious ones. Just handle the exceptions.”</p>
            <p>The first batch contains 2,400 fields. 2,395 are mapped correctly; five ambiguous mappings are withheld for your review.</p>
          </> : schemaResult ? <>
            <p>2,400 fields processed. 2,395 handled automatically. Five reviewed by analyst.</p>
            <p>“That seems like a better use of your time.”</p>
            <p>The next batch contains 12,000 fields, with five exceptions for analyst review.</p>
          </> : <>
            <p>Your automation work has earned approval for a limited AI-assisted workflow pilot. It can help prepare routine data work faster, giving you more time to review the result.</p>
            <p>“If we can reduce turnaround without adding headcount, this could be significant. Let's start with one real task.”</p>
            <p>The pilot is approved. Open Run Ad-Hoc SQL Query and use the pilot to prepare a query, then review it before pressing EXECUTE.</p>
          </>}
        </div>
        <button onClick={() => onContinue(step)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors">
          {recognition ? 'Acknowledge progress' : result ? 'Acknowledge pilot result' : expansion ? 'Acknowledge pilot expansion' : cleared ? 'Acknowledge queue result' : operational ? 'Acknowledge operational rollout' : turnaround ? 'Acknowledge turnaround target' : capacity ? 'Acknowledge review capacity' : schema ? 'Acknowledge schema pilot' : schemaResult ? 'Acknowledge batch result' : 'Acknowledge pilot approval'}
        </button>
        <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
      </section>
    </div>
  );
};
