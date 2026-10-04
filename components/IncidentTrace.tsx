import React, { useState } from 'react';
import { IncidentInvestigation, IncidentInvestigationStep, SourceDriftIncident } from '../types';
import { INCIDENT_TRACE_EVIDENCE, INCIDENT_TRACE_SAMPLE, INCIDENT_TRACE_SUMMARY, SOURCE_DRIFT_ROOT_CAUSE } from '../constants';

interface Props {
  investigation: IncidentInvestigation;
  incident: SourceDriftIncident;
  onInspect: (expectedStep: IncidentInvestigationStep, candidate: string) => void;
  onConfirm: () => void;
  onLater: () => void;
}

// One authored trace. Wrong-branch observations are local; the engine owns causal progress.
export const IncidentTrace: React.FC<Props> = ({ investigation, incident, onInspect, onConfirm, onLater }) => {
  const [observation, setObservation] = useState('');
  const confirmed = investigation.step === 'root_cause_confirmed';
  const stage = confirmed ? null : INCIDENT_TRACE_EVIDENCE[investigation.step];
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="incident-trace-title"
      className="bg-slate-900 border border-amber-700/50 rounded-lg shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <p className="text-xs uppercase tracking-wider text-amber-300 mb-2">Root cause trace · {INCIDENT_TRACE_SAMPLE.record}</p>
      <h2 id="incident-trace-title" className="text-xl font-bold text-slate-100">{confirmed ? 'SOURCE CONTRACT DRIFT' : stage?.title}</h2>
      <div className="my-4 p-4 bg-slate-950/50 border border-slate-800 rounded text-sm text-slate-300 space-y-2">
        {confirmed ? <>
          <p>{SOURCE_DRIFT_ROOT_CAUSE}</p>
          <p>AI WRONG WRITE: NO · POLICY VIOLATION: NO</p>
          <p>UNAPPROVED WRITE: NO · CUSTOMER IMPACT: YES</p>
          <p>ROOT CAUSE: CONFIRMED · Remediation: NOT DEFINED</p>
        </> : stage?.evidence.map(line => <p key={line}>{line}</p>)}
      </div>
      {confirmed ? <ol className="text-sm text-slate-300 space-y-2 mb-4">
        {INCIDENT_TRACE_SUMMARY.map((line, index) => <li key={line}>{index > 0 && <span className="block text-amber-400" aria-hidden="true">↓</span>}{line}</li>)}
      </ol> : investigation.step === 'rule' ? <button onClick={onConfirm}
        className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">CONFIRM ROOT CAUSE</button> : <>
        <p className="mb-2 text-xs text-slate-400">Choose the next evidence to inspect.</p>
        <div className="space-y-2">{stage?.choices.map(choice => <button key={choice.label}
          onClick={() => {
            if (choice.next) onInspect(investigation.step, choice.label);
            else setObservation(choice.observation);
          }} className="w-full text-left px-3 py-2 rounded border border-slate-700 hover:bg-slate-800 text-sm text-slate-200">{choice.label}</button>)}</div>
        {observation && <p role="status" className="mt-3 p-3 rounded bg-slate-800 text-sm text-slate-300">{observation}</p>}
      </>}
      <p className="mt-4 text-xs text-amber-200">{incident.active ? 'Live quarantine' : 'Historical quarantine'}: {incident.quarantined.toLocaleString()} · Current affected products: {incident.affectedProducts.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-400">{incident.active ? 'The sample record stays stable. The incident continues; understanding does not repair it.' : 'This trace preserves the original incident evidence. The governed source repair is recorded separately.'}</p>
      <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
    </section>
  </div>;
};
