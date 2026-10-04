import React from 'react';
import { GameState, AIPilotStep } from '../types';
import { TICK_RATE_MS, getProductWriteVelocity, PRODUCT_WRITE_QUEUE_CAP, SOURCE_DRIFT } from '../constants';

interface Props {
  state: GameState;
  pilotIntroduction: { step: AIPilotStep | null; available: boolean };
  aiReviewAvailable: boolean;
  onReviewNextQuery: () => void;
  onReviewPilot: () => void;
  operationalRollout: { offered: boolean; available: boolean };
  aiReviewDemandActive: boolean;
  accelerationUpdate: { step: 'pressure_visible' | 'review_bottleneck_visible' | null; available: boolean };
  schemaUpdate: { step: 'schema_introduction' | 'schema_first_result' | null; available: boolean };
  schemaBatchAvailable: boolean;
  onReviewSchemaBatch: () => void;
  connectedUpdate: { step: 'read_connection_offer' | 'connected_mapping_success' | null; available: boolean };
  connectedMappingOffered: boolean;
  connectedMappingAvailable: boolean;
  writeUpdate: { step: 'write_access_offer' | 'write_pilot_success' | null; available: boolean };
  productWriteAvailable: boolean;
  writeQueueUpdate: { step: 'approval_rollout_ready' | 'approval_bottleneck_visible' | null; available: boolean };
  postGovernNewGameAvailable: boolean;
  onGovernNewGame: () => void;
  expansionRoleAvailable: boolean;
  accessMatrixAvailable: boolean;
  onDecideRole: () => void;
  onReviewAccessMatrix: () => void;
  executiveReviewAvailable: boolean;
  expansionEndingReady: boolean;
  onOpenExecutiveReview: () => void;
  sourceRemediationAvailable: boolean;
  onOpenSourceRepair: () => void;
  incidentTraceAvailable: boolean;
  onOpenIncidentTrace: () => void;
  sourceDriftUpdate: { step: 'source_drift_detected' | 'customer_impact_visible' | null; available: boolean };
  writeScaleUpdate: { step: 'batch_routing_offer' | 'batch_scale_visible' | null; available: boolean };
  writePolicyUpdate: { step: 'approval_policy_offer' | 'policy_trial_success' | null; available: boolean };
  policyTrialAvailable: boolean;
  onReviewPolicyTrial: () => void;
  productWriteQueueAvailable: boolean;
  onReviewNextWrite: () => void;
  onReviewProductWrite: () => void;
}

export const OperationsStatus: React.FC<Props> = ({ state, pilotIntroduction, aiReviewAvailable, onReviewNextQuery, onReviewPilot, operationalRollout, aiReviewDemandActive, accelerationUpdate, schemaUpdate, schemaBatchAvailable, onReviewSchemaBatch, connectedUpdate, connectedMappingOffered, connectedMappingAvailable, writeUpdate, productWriteAvailable, writeQueueUpdate, postGovernNewGameAvailable, onGovernNewGame, expansionRoleAvailable, accessMatrixAvailable, onDecideRole, onReviewAccessMatrix, executiveReviewAvailable, expansionEndingReady, onOpenExecutiveReview, sourceRemediationAvailable, onOpenSourceRepair, incidentTraceAvailable, onOpenIncidentTrace, sourceDriftUpdate, writeScaleUpdate, writePolicyUpdate, policyTrialAvailable, onReviewPolicyTrial, productWriteQueueAvailable, onReviewNextWrite, onReviewProductWrite }) => {
  const writeVelocity = getProductWriteVelocity(state.connectedEnterprise.productWritePolicy.autoClasses.length);
  return <section aria-label="Operations status" className="h-full min-h-0 overflow-y-auto bg-slate-950 border-r border-slate-800">
    <h2 className="p-4 border-b border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-400">Operations status</h2>
      {pilotIntroduction.step && (
        <div className="shrink-0 border-b border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-slate-300">
          {pilotIntroduction.step === 'rollout_review' ? <p className="font-bold text-emerald-400">Pilot review queue active</p> : pilotIntroduction.step === 'pilot_ready' ? <>
            <p className="font-bold text-emerald-400">AI pilot approved</p>
            <p className="mt-1">Open Run Ad-Hoc SQL Query, use the pilot to prepare a query, then review and EXECUTE it.</p>
          </> : <>
            <p className="font-bold text-emerald-400">Management update available</p>
            <button onClick={onReviewPilot} disabled={!pilotIntroduction.available}
              className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {pilotIntroduction.step === 'automation_recognized' ? 'Review automation progress' : pilotIntroduction.step === 'pilot_success' ? 'Review pilot result' : pilotIntroduction.step === 'demand_pending' ? 'Review pilot expansion' : pilotIntroduction.step === 'rollout_success' ? 'Review queue result' : 'Review AI pilot'}
            </button>
            {!pilotIntroduction.available && <p className="mt-1 text-slate-400">Finish the current activity to review this update.</p>}
          </>}
        </div>
      )}
      {state.aiReviewDemand.automated && <div className="shrink-0 border-b border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-slate-300">
        <p className="font-bold text-blue-200">AI SQL ROUTING — AUTOMATED</p>
        <p>Routine requests routed: {state.aiReviewDemand.automatedTotal.toLocaleString()}</p>
        <p>Human reviews before automation: {state.aiReviewQueue.completed.toLocaleString()}</p>
        <p>Manual Ad-Hoc SQL remains available.</p>
      </div>}
      {!state.aiReviewDemand.automated && state.aiReviewQueue.wave > 0 && (
        <div className="shrink-0 border-b border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-slate-300">
          <p>AI SQL review queue — {state.aiReviewQueue.pending} pending · {state.aiReviewQueue.completed} completed · wave {state.aiReviewQueue.wave}</p>
          {aiReviewDemandActive && <p className="mt-1 text-blue-300">INCOMING ROUTING: ACTIVE · Next request: ~{Math.ceil(Math.max(0, state.aiReviewDemand.nextArrivalTick - state.tick) * TICK_RATE_MS / 1000)}s</p>}
          {aiReviewDemandActive && state.aiReviewDemand.arrivalIntervalTicks === 20 && <p className="mt-1 text-blue-300">ROUTING: ACCELERATED · New request every ~4s · HUMAN EXECUTION: REQUIRED</p>}
          {state.aiReviewQueue.pending > 0 && <button onClick={onReviewNextQuery} disabled={!aiReviewAvailable}
            className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">REVIEW NEXT QUERY</button>}
        </div>
      )}
      {operationalRollout.offered && <div className="shrink-0 border-b border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-slate-300">
        <p>Management update available</p>
        <button onClick={onReviewPilot} disabled={!operationalRollout.available}
          className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">Review operational rollout</button>
        {!operationalRollout.available && <p className="mt-1 text-slate-400">Finish the current activity to review this update.</p>}
      </div>}
      {accelerationUpdate.step && <div className="shrink-0 border-b border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-slate-300">
        <p>Management update available</p>
        <button onClick={onReviewPilot} disabled={!accelerationUpdate.available}
          className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
          {accelerationUpdate.step === 'pressure_visible' ? 'Review turnaround target' : 'Review capacity'}
        </button>
        {!accelerationUpdate.available && <p className="mt-1 text-slate-400">Finish the current activity to review this update.</p>}
      </div>}
      {(state.expansionProgress.era === 'acceleration' || state.expansionProgress.era === 'connected_enterprise' || state.expansionProgress.era === 'good_enough' || state.expansionProgress.era === 'lightspeed' || state.expansionProgress.era === 'governance_crisis') &&
       (state.expansionProgress.transition === null || state.expansionProgress.transition.targetEra === 'connected_enterprise' || state.expansionProgress.transition.targetEra === 'lightspeed' || state.expansionProgress.transition.targetEra === 'governance_crisis' ||
        (state.expansionProgress.era === 'connected_enterprise' && state.expansionProgress.transition.targetEra === 'good_enough')) && state.upgrades['pandas_scripts'] === true && (
        <div className="shrink-0 border-b border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-slate-300">
          {schemaUpdate.step ? <>
            <p>Management update available</p>
            <button onClick={onReviewPilot} disabled={!schemaUpdate.available}
              className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
              {schemaUpdate.step === 'schema_introduction' ? 'Review schema mapping pilot' : 'Review schema batch result'}
            </button>
            {!schemaUpdate.available && <p className="mt-1 text-slate-400">Finish the current activity to review this update.</p>}
          </> : state.schemaBatchReview.active ? <>
            <p>Schema batch — {state.schemaBatchReview.batchSize.toLocaleString()} fields · 5 exceptions</p>
            <button onClick={onReviewSchemaBatch} disabled={!schemaBatchAvailable}
              className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">REVIEW SCHEMA EXCEPTIONS</button>
            <p className="mt-1 text-slate-400">20 raw · 50 clean · quality based on analyst mistakes</p>
          </> : state.schemaBatchReview.batchesCompleted >= 2 && <p>Schema exception workflow experienced — 2 batches complete</p>}
        </div>
      )}
      {(connectedUpdate.step || state.connectedEnterprise.productDb.connected) && <div className="shrink-0 border-b border-blue-800/50 bg-blue-950/30 p-3 text-xs text-slate-300">
        {state.connectedEnterprise.productDb.connected && <p className="font-bold text-blue-200">CONNECTED SYSTEMS · Product DB · {state.connectedEnterprise.productDb.access === 'read_write' ? (state.connectedEnterprise.productWritePolicy.configured ? 'READ + WRITE · BOUNDED APPROVAL POLICY' : 'READ + WRITE · HUMAN APPROVAL REQUIRED') : 'READ ONLY'}</p>}
        {(state.connectedEnterprise.sourceDriftIncident.active || state.connectedEnterprise.sourceDriftIncident.quarantined > 0) && <div className="mt-2 border border-amber-700/50 rounded p-2 space-y-1">
          <p className="font-bold text-amber-200">{state.connectedEnterprise.sourceDriftIncident.active ? 'SOURCE QUALITY · DRIFT DETECTED' : 'SOURCE QUALITY · DRIFT CONTAINED'}</p>
          <p>Supplier Width · EXPECTED: {SOURCE_DRIFT.expected} · OBSERVED: {SOURCE_DRIFT.observed}</p>
          <p>QUARANTINED: {state.connectedEnterprise.sourceDriftIncident.quarantined.toLocaleString()} · AFFECTED PRODUCTS: {state.connectedEnterprise.sourceDriftIncident.affectedProducts.toLocaleString()}</p>
          <p>{state.connectedEnterprise.sourceDriftRemediation.step === 'remediation_complete' ? 'CURRENT CUSTOMER IMPACT: RESOLVED · CUSTOMER WIDTH FILTER: RESTORED' : state.connectedEnterprise.sourceDriftRemediation.ruleApproved ? 'NEW SOURCE QUARANTINE: STOPPED · Historical products await backfill' : 'STATUS: NO WRITE ATTEMPTED · Upstream quarantine, separate from write review'}</p>
          {state.expansionProgress.era === 'governance_crisis' && state.expansionProgress.transition === null && state.connectedEnterprise.sourceDriftIncident.customerImpactVisible && <>
            {state.connectedEnterprise.incidentInvestigation.rootCauseProven ? <>
              <p className="font-bold text-amber-200">ROOT CAUSE: CONFIRMED · Source contract drift</p>
              <p>Containment: {state.connectedEnterprise.sourceDriftIncident.active ? 'QUARANTINED' : 'SOURCE CONTRACT UPDATED'} · Remediation: {state.connectedEnterprise.sourceDriftRemediation.step === 'remediation_complete' ? 'COMPLETE' : state.connectedEnterprise.sourceDriftRemediation.active ? 'IN PROGRESS' : 'NOT DEFINED'}</p>
              {state.connectedEnterprise.sourceDriftRemediation.step === 'remediation_complete' && <p>REPROCESSED: {state.connectedEnterprise.sourceDriftRemediation.resolvedProducts.toLocaleString()} · EXECUTIVE REVIEW: {state.connectedEnterprise.executiveReview.step === 'review_complete' ? 'COMPLETE' : state.connectedEnterprise.executiveReview.active ? 'IN PROGRESS' : 'READY'}</p>}
              {executiveReviewAvailable && <>
                {expansionEndingReady && <p>FULL AUTOMATION ROLLOUT: ACTIVE · EXCEPTIONS: GOVERNED · EXPANSION END-STATE: READY · {postGovernNewGameAvailable ? 'GOVERNANCE ROLE COMPLETE · NEW GAME+ AVAILABLE' : 'ASCENSION DEFERRED'}</p>}
                {expansionRoleAvailable && <>
                  <p>AUTOMATION OPERATING MODEL: ACTIVE · EXECUTIVE REVIEW: COMPLETE · YOUR ROLE: UNDECIDED</p>
                  <button onClick={onDecideRole} className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 hover:bg-blue-900/30">DECIDE WHAT COMES NEXT</button>
                </>}
                {accessMatrixAvailable && <>
                  <p>GOVERN THE MACHINE · {state.expansionEnding.accessMatrix.stabilizedOnce ? 'SYSTEM STABLE — FOR NOW · ACCESS HEALTH: 100%' : 'ACCESS MODEL: IN PROGRESS'}</p>
                  {postGovernNewGameAvailable && <button onClick={onGovernNewGame} className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 hover:bg-blue-900/30">LEAVE GOVERNANCE ROLE / NEW GAME+</button>}
                  <button onClick={onReviewAccessMatrix} className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 hover:bg-blue-900/30">REVIEW ACCESS MATRIX</button>
                </>}
                <button onClick={onOpenExecutiveReview} className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 hover:bg-blue-900/30">
                  {state.connectedEnterprise.executiveReview.step === 'review_complete' ? 'REVIEW EXECUTIVE RESULT' : state.connectedEnterprise.executiveReview.active ? 'CONTINUE EXECUTIVE REVIEW' : 'OPEN EXECUTIVE REVIEW'}
                </button>
              </>}
              <button onClick={onOpenSourceRepair} disabled={!sourceRemediationAvailable}
                className="mt-2 w-full py-2 border border-amber-500 rounded text-amber-200 disabled:opacity-40 hover:bg-amber-900/30">
                {state.connectedEnterprise.sourceDriftRemediation.step === 'remediation_complete' ? 'REVIEW REMEDIATION' : state.connectedEnterprise.sourceDriftRemediation.active ? 'CONTINUE REMEDIATION' : 'DEFINE REMEDIATION'}
              </button>
            </> : <p>INCIDENT RESPONSE · Customer impact confirmed · Source quarantine active</p>}
            <button onClick={onOpenIncidentTrace} disabled={!incidentTraceAvailable}
              className="mt-2 w-full py-2 border border-amber-500 rounded text-amber-200 disabled:opacity-40 hover:bg-amber-900/30">
              {state.connectedEnterprise.incidentInvestigation.rootCauseProven ? 'REVIEW ROOT CAUSE' : state.connectedEnterprise.incidentInvestigation.active ? 'CONTINUE ROOT CAUSE TRACE' : 'BEGIN ROOT CAUSE TRACE'}
            </button>
          </>}
          {sourceDriftUpdate.step && <button onClick={onReviewPilot} disabled={!sourceDriftUpdate.available}
            className="mt-2 w-full py-2 border border-amber-500 rounded text-amber-200 disabled:opacity-40 hover:bg-amber-900/30">
            {sourceDriftUpdate.step === 'source_drift_detected' ? 'Review source format change' : 'Review customer feedback'}
          </button>}
        </div>}
        {writeScaleUpdate.step && <button onClick={onReviewPilot} disabled={!writeScaleUpdate.available}
          className="mt-2 w-full py-2 border border-indigo-500 rounded text-indigo-200 disabled:opacity-40 hover:bg-indigo-900/30">
          {writeScaleUpdate.step === 'batch_routing_offer' ? 'Review batch routing' : 'Review operating scale'}
        </button>}
        {writePolicyUpdate.step && <button onClick={onReviewPilot} disabled={!writePolicyUpdate.available}
          className="mt-2 w-full py-2 border border-indigo-500 rounded text-indigo-200 disabled:opacity-40 hover:bg-indigo-900/30">
          {writePolicyUpdate.step === 'approval_policy_offer' ? 'Review approval policy' : 'Review policy trial result'}
        </button>}
        {state.connectedEnterprise.productWritePolicy.configured && <div className="mt-2 space-y-1">
          <p className="font-bold text-blue-200">PRODUCT DB WRITE POLICY</p>
          <p>AUTO APPLY: {state.connectedEnterprise.productWritePolicy.autoClasses.length} transform classes · HUMAN REVIEW: {5 - state.connectedEnterprise.productWritePolicy.autoClasses.length} transform classes</p>
          <p>Category changes: REVIEW REQUIRED · Policy: {state.connectedEnterprise.productWritePolicy.active ? 'ACTIVE · FIXED' : 'CONTROLLED TRIAL · FIXED'}</p>
          <p>AUTO APPLIED: {state.connectedEnterprise.productWritePolicy.autoAppliedTotal} · PENDING REVIEW: {state.connectedEnterprise.productWriteQueue.pending}</p>
          {state.connectedEnterprise.productWritePolicy.trial.active && <>
            <p>Policy trial: {state.connectedEnterprise.productWritePolicy.trial.autoApplied} automatic · {state.connectedEnterprise.productWritePolicy.trial.manualApproved} human reviewed · {state.connectedEnterprise.productWritePolicy.trial.manualPending} pending</p>
            <button onClick={onReviewPolicyTrial} disabled={!policyTrialAvailable}
              className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 disabled:opacity-40 hover:bg-blue-900/30">REVIEW POLICY TRIAL WRITE</button>
          </>}
        </div>}
        {writeQueueUpdate.step && <button onClick={onReviewPilot} disabled={!writeQueueUpdate.available}
          className="mt-2 w-full py-2 border border-indigo-500 rounded text-indigo-200 disabled:opacity-40 hover:bg-indigo-900/30">
          {writeQueueUpdate.step === 'approval_rollout_ready' ? 'Review standard writeback' : 'Review approval capacity'}
        </button>}
        {state.connectedEnterprise.productWriteQueue.active && <div className="mt-2 space-y-1">
          {state.connectedEnterprise.productWriteScale.active ? <>
            <p className="font-bold text-blue-200">PRODUCT DB WRITE FLOW</p>
            <p>OPERATIONAL VELOCITY: {writeVelocity.total} write intents / sec</p>
            <p>AUTO APPLY RATE: {writeVelocity.auto} / sec · HUMAN REVIEW ROUTING: {writeVelocity.review} / sec</p>
            <p>REVIEW WINDOW: {state.connectedEnterprise.productWriteQueue.pending} / {PRODUCT_WRITE_QUEUE_CAP}</p>
            <p>AGGREGATE BACKLOG: {state.connectedEnterprise.productWriteScale.reviewBacklog.toLocaleString()}</p>
            <p>BATCHES PROCESSED: {state.connectedEnterprise.productWriteScale.batchesProcessed.toLocaleString()} · TOTAL ROUTED: {state.connectedEnterprise.productWriteScale.totalRouted.toLocaleString()}</p>
          </> : <>
            <p className="font-bold text-blue-200">PRODUCT DB WRITE APPROVALS</p>
            <p>{state.connectedEnterprise.productWriteQueue.pending} pending · {state.connectedEnterprise.productWriteQueue.completed} approved</p>
          </>}
          <p>{state.connectedEnterprise.productWritePolicy.active ? "ROUTING: ACTIVE · POLICY FOR NEW WRITES · PENDING ITEMS REQUIRE HUMAN APPROVAL" : "ROUTING: ACTIVE · VALIDATED WRITES · HUMAN APPROVAL: REQUIRED"}</p>
          <p>{state.connectedEnterprise.productWriteScale.active ? "Next 500-intent batch" : "Next write"}: ~{Math.ceil(Math.max(0, state.connectedEnterprise.productWriteQueue.nextArrivalTick - state.tick) * TICK_RATE_MS / 1000)}s</p>
          <button onClick={onReviewNextWrite} disabled={!productWriteQueueAvailable}
            className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 disabled:opacity-40 hover:bg-blue-900/30">REVIEW NEXT WRITE</button>
        </div>}
        {writeUpdate.step && <button onClick={onReviewPilot} disabled={!writeUpdate.available}
          className="mt-2 w-full py-2 border border-indigo-500 rounded text-indigo-200 disabled:opacity-40 hover:bg-indigo-900/30">
          {writeUpdate.step === 'write_access_offer' ? 'Review writeback access' : 'Review write pilot result'}
        </button>}
        {state.connectedEnterprise.productWritePilot.active && <>
          <p className="mt-2">Write pilot: {state.connectedEnterprise.productWritePilot.pending} pending / 5 · {state.connectedEnterprise.writeUses} applied</p>
          <button onClick={onReviewProductWrite} disabled={!productWriteAvailable}
            className="mt-2 w-full py-2 border border-blue-500 rounded text-blue-200 disabled:opacity-40 hover:bg-blue-900/30">Review prepared Product DB write</button>
        </>}
        {state.expansionProgress.transition?.targetEra === 'good_enough' && state.expansionProgress.transition.step === 'approval_rollout_ready' &&
          <p className="mt-2">Write pilot complete · 5 approved / 5 applied · Human approval required</p>}
        {connectedUpdate.step && <>
          <button onClick={onReviewPilot} disabled={!connectedUpdate.available}
            className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
            {connectedUpdate.step === 'read_connection_offer' ? 'Review source context' : 'Review connected result'}
          </button>
          {!connectedUpdate.available && <p className="mt-1 text-slate-400">Finish the current activity to review this update.</p>}
        </>}
        {connectedMappingOffered && <>
          <p className="mt-2">Connected schema batch — 20,000 fields · 3 exceptions</p>
          <button onClick={onReviewSchemaBatch} disabled={!connectedMappingAvailable}
            className="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">REVIEW CONNECTED SCHEMA EXCEPTIONS</button>
        </>}
      </div>}
  </section>;
};
