import React from 'react';
import { GameState } from '../types';
import { SOURCE_DRIFT } from '../constants';

interface Props {
  enterprise: GameState['connectedEnterprise'];
  endingReady: boolean;
  onPresent: () => void;
  onSubmitControls: () => void;
  onAcknowledge: () => void;
  onLater: () => void;
}

// Authored management review: controls and organisational strategy are separate decisions.
export const ExecutiveReview: React.FC<Props> = ({ enterprise, endingReady, onPresent, onSubmitControls, onAcknowledge, onLater }) => {
  const review = enterprise.executiveReview;
  const incident = enterprise.sourceDriftIncident;
  const repair = enterprise.sourceDriftRemediation;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="executive-review-title"
      className="bg-slate-900 border border-blue-700/50 rounded-lg shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <p className="text-xs uppercase tracking-wider text-blue-300 mb-2">Governance / Crisis · Management review</p>
      <h2 id="executive-review-title" className="text-xl font-bold text-slate-100">
        {review.step === 'evidence_packet' ? 'EXECUTIVE INCIDENT REVIEW' : review.step === 'controls_review' ? 'CONTROL RECOMMENDATIONS' : review.step === 'programme_decision' ? 'EXECUTIVE RESPONSE' : 'EXECUTIVE REVIEW COMPLETE'}
      </h2>
      <div className="my-4 p-4 bg-slate-950/50 border border-slate-800 rounded text-sm text-slate-300 space-y-2">
        {review.step === 'evidence_packet' ? <>
          <p>CUSTOMER IMPACT: Confirmed · ROOT CAUSE: Source contract drift</p>
          <p>SOURCE VALUE: "{SOURCE_DRIFT.observed}"</p>
          <p>INCORRECT PRODUCT DB WRITES: 0 · UNAPPROVED PRODUCT DB WRITES: 0 · POLICY VIOLATIONS: 0</p>
          <p>QUARANTINED: {incident.quarantined.toLocaleString()} · RULE CHANGE: Approved</p>
          <p>REPROCESSED: {repair.resolvedProducts.toLocaleString()} · CURRENT AFFECTED PRODUCTS: {incident.affectedProducts}</p>
          <p>CUSTOMER WIDTH FILTER: Restored · ROUTINE PRODUCT DB FLOW: Active</p>
          <p>Automation worked as governed. Customer impact still occurred. The governance process found and repaired it.</p>
          <p>These findings describe the source-contract incident, including the path that attempted no write for unknown semantics.</p>
        </> : review.step === 'controls_review' ? <>
          <p>UNKNOWN SOURCE SEMANTICS → QUARANTINE. Do not invent canonical meaning.</p>
          <p>SOURCE CONTRACT CHANGE → GOVERNED RULE APPROVAL. New semantics require evidence and explicit approval.</p>
          <p>HISTORICAL QUARANTINE → EXPLICIT BOUNDED REPROCESSING. Repair affected records after the rule is established.</p>
          <p>ROUTINE PRODUCT DB WRITES → RETAIN EXISTING SYSTEM-SPECIFIC POLICY. The AUTO/REVIEW boundary remains unchanged.</p>
          <p>CUSTOMER / ROOT-CAUSE EVIDENCE → RETAIN INCIDENT EVIDENCE. Resolution does not erase its cause.</p>
          <p>These recommendations follow the established incident evidence.</p>
        </> : review.step === 'programme_decision' ? <>
          <p>“Root cause is clear. The quarantine behaved as designed. Source-contract changes need the same governed approval path going forward.”</p>
          <p>“Agreed. These controls should become standard.”</p>
          <p>GOVERNANCE CONTROLS: ACCEPTED</p>
          <p>The programme delivered greater processing capacity. This incident exposed a source-contract gap; containment and governed repair addressed it.</p>
          <p className="font-bold text-blue-200 pt-2">AUTOMATION PROGRAMME</p>
          <p>STATUS: APPROVED · OPERATING MODEL: AUTOMATION-FIRST · GOVERNED EXCEPTIONS: REQUIRED</p>
          <p>“The full automation rollout remains on schedule.”</p>
          <p>Management is continuing the programme with these controls. Acknowledgement records that you witnessed this organisational decision; it is not strategic approval.</p>
        </> : <>
          <p>INCIDENT FINDINGS: ACCEPTED · GOVERNANCE CONTROLS: ADOPTED</p>
          <p>FULL AUTOMATION ROLLOUT: ACTIVE · EXCEPTIONS: GOVERNED</p>
          {endingReady && <p className="font-bold text-blue-200">EXPANSION END-STATE: READY · ASCENSION DEFERRED</p>}
          <p>The organisation has committed to an automation-first operating model. Existing system-specific authority and exception boundaries remain real.</p>
          <p>Your role in that organisation is a separate decision. Reopen it from the Workstation when ready.</p>
        </>}
      </div>
      {review.step === 'evidence_packet' ? <button onClick={onPresent} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">PRESENT FINDINGS</button> :
        review.step === 'controls_review' ? <button onClick={onSubmitControls} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">SUBMIT CONTROL RECOMMENDATIONS</button> :
        review.step === 'programme_decision' ? <button onClick={onAcknowledge} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">ACKNOWLEDGE ORGANISATIONAL DECISION</button> : null}
      <p className="mt-4 text-xs text-blue-200">Product DB policy retained · Manual Ad-Hoc SQL remains available · Routine Lightspeed flow continues</p>
      <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
    </section>
  </div>;
};
