import React from 'react';
import { SourceDriftIncident, SourceDriftRemediation } from '../types';
import { INCIDENT_TRACE_SAMPLE, SOURCE_DRIFT, SOURCE_WIDTH_AMENDMENT } from '../constants';

interface Props {
  repair: SourceDriftRemediation;
  incident: SourceDriftIncident;
  onClarify: () => void;
  onApprove: () => void;
  onReprocess: () => void;
  onLater: () => void;
}

// One governed supplier Width amendment and an explicitly authorized historical backfill.
export const SourceContractRepair: React.FC<Props> = ({ repair, incident, onClarify, onApprove, onReprocess, onLater }) => {
  const clarification = repair.step === 'supplier_clarification';
  const review = repair.step === 'rule_review';
  const backfill = repair.step === 'backfill_ready';
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="source-repair-title"
      className="bg-slate-900 border border-amber-700/50 rounded-lg shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <p className="text-xs uppercase tracking-wider text-amber-300 mb-2">Governed source contract · Supplier Width</p>
      <h2 id="source-repair-title" className="text-xl font-bold text-slate-100">
        {clarification ? 'SUPPLIER CONTRACT CLARIFICATION' : review ? 'SOURCE RULE REVIEW' : backfill ? 'QUARANTINE BACKFILL' : 'INCIDENT REMEDIATION'}
      </h2>
      <div className="my-4 p-4 bg-slate-950/50 border border-slate-800 rounded text-sm text-slate-300 space-y-2">
        {clarification ? <>
          <p>Previous: Width: "{SOURCE_DRIFT.expected}"</p>
          <p>Current: Width: "{SOURCE_DRIFT.observed}"</p>
          <p>What does "~" mean in this feed?</p>
          <p>The original rule was correct for the contract it knew. Clarification is required before defining a new interpretation.</p>
        </> : review ? <>
          <p className="font-bold text-amber-200">SUPPLIER RESPONSE</p>
          <p>“{SOURCE_WIDTH_AMENDMENT.supplierResponse}”</p>
          <p>Nominal Width: 45 cm · Qualifier: APPROXIMATE · Tolerance: {SOURCE_WIDTH_AMENDMENT.tolerance}</p>
          <p className="font-bold text-amber-200 pt-2">PROPOSED SOURCE CONTRACT AMENDMENT</p>
          <p>NEW ACCEPTED FORM: {SOURCE_WIDTH_AMENDMENT.acceptedForm}</p>
          <p>TARGET: Width = &lt;number&gt; · WidthQualifier = APPROXIMATE</p>
          <p>Tolerance: supplier-defined {SOURCE_WIDTH_AMENDMENT.tolerance}</p>
          <p>SCOPE: {SOURCE_WIDTH_AMENDMENT.scope}</p>
          <p>For "~45 cm": Width = 45 AND WidthQualifier = APPROXIMATE. The qualifier is preserved, not stripped.</p>
          <p>This is a semantic rule/schema decision upstream of the fixed Product DB write policy. It grants no new Product DB permission or routine AUTO class.</p>
          <p>Approval contains new source quarantine. Existing affected products still require explicit reprocessing.</p>
        </> : backfill ? <>
          <p>Historical quarantined: {incident.quarantined.toLocaleString()}</p>
          <p>Rule: APPROVED · New source drift: CONTAINED</p>
          <p>Products requiring reprocessing: {incident.affectedProducts.toLocaleString()}</p>
          <p>Authorize one bounded Product DB repair of these historical products under the clarified contract.</p>
          <p>Width = 45 · WidthQualifier = APPROXIMATE · Tolerance: {SOURCE_WIDTH_AMENDMENT.tolerance}</p>
          <p>Routine write policy and its review queue remain separate. This action grants no economic reward.</p>
        </> : <>
          <p>ROOT CAUSE: Source contract drift · RULE: UPDATED</p>
          <p>SOURCE DRIFT: CONTAINED</p>
          <p>HISTORICAL QUARANTINED: {incident.quarantined.toLocaleString()} · REPROCESSED: {repair.resolvedProducts.toLocaleString()}</p>
          <p>CURRENT AFFECTED PRODUCTS: {incident.affectedProducts}</p>
          <p>CUSTOMER WIDTH FILTER: RESTORED</p>
          <p className="font-bold text-amber-200 pt-2">CUSTOMER VERIFICATION · {INCIDENT_TRACE_SAMPLE.record} · {INCIDENT_TRACE_SAMPLE.title}</p>
          <p>BEFORE: Canonical Width: MISSING · 45 cm filter: NOT INDEXED</p>
          <p>AFTER: Canonical Width: {SOURCE_WIDTH_AMENDMENT.nominalWidth} · Qualifier: {SOURCE_WIDTH_AMENDMENT.qualifier} · 45 cm filter: INDEXED</p>
          <p>The source contract evolved. No wrong write was rolled back; the original causal evidence remains available.</p>
          <p>EXECUTIVE REVIEW: READY</p>
          <p>Executive review and the organisation's automation programme decision have not occurred.</p>
        </>}
      </div>
      {clarification ? <button onClick={onClarify} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">REQUEST SUPPLIER CLARIFICATION</button> :
        review ? <button onClick={onApprove} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">APPROVE SCHEMA / RULE CHANGE</button> :
        backfill ? <button onClick={onReprocess} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">REPROCESS QUARANTINE</button> : null}
      <p className="mt-4 text-xs text-amber-200">Historical quarantine: {incident.quarantined.toLocaleString()} · Current affected products: {incident.affectedProducts.toLocaleString()}</p>
      <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
    </section>
  </div>;
};
