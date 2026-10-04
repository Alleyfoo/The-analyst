import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, INITIAL_STATE, ResourceType, Upgrade, GameEvent, ChatMessage, ChatScenario, Campaign, CampaignType, EXPANSION_ERAS, ExpansionEra, AI_PILOT_STEPS, AIPilotStep, ProductWriteClass, ProductWritePolicy, ProductWriteScale, SourceDriftIncident, IncidentInvestigation, IncidentInvestigationStep, INCIDENT_INVESTIGATION_STEPS, SourceDriftRemediation, SOURCE_REMEDIATION_STEPS } from '../types';
import { TICK_RATE_MS, UPGRADES, EVENTS, checkUpgradeVisibility, HISTORY_LENGTH, CHAT_SCENARIOS, TERMINAL_FLAVOR_TEXT, isAIPilotEligible, isAscensionDeferred, AI_REVIEW_QUEUE_CAP, AI_REVIEW_ACCELERATED_INTERVAL_TICKS, RAW_HEADERS, PRODUCT_WRITE_PROPOSALS, PRODUCT_WRITE_QUEUE_INITIAL, PRODUCT_WRITE_QUEUE_INTERVAL_TICKS, PRODUCT_WRITE_QUEUE_CAP, getOperationalProductWriteProposal, PRODUCT_WRITE_CLASSES, PRODUCT_WRITE_AUTO_CLASSES, getPolicyTrialProductWriteProposal, PRODUCT_WRITE_BATCH_SIZE, SOURCE_DRIFT, INCIDENT_TRACE_EVIDENCE } from '../constants';

// Board Meeting Settings
const MEETING_DURATION_SEC = 30;
const INITIAL_MEETING_TICK = 300; // 1 minute (300 ticks * 200ms)
const MEETING_INTERVAL_TICKS = 1500; // 5 minutes
const COFFEE_COOLDOWN_TICKS = 600; // 2 minutes

const SAVE_KEY = 'the_analyst_save_v1';

const isExpansionEra = (value: unknown): value is ExpansionEra =>
    EXPANSION_ERAS.some(era => era === value);

const isSQLPilotReady = (state: GameState) =>
    state.expansionProgress.era === 'automation' &&
    state.expansionProgress.transition?.targetEra === 'ai_pilot' &&
    state.expansionProgress.transition.step === 'pilot_ready';

const sourceDriftStep = (state: GameState) => state.expansionProgress.era === 'lightspeed' &&
    state.expansionProgress.transition?.targetEra === 'governance_crisis' ? state.expansionProgress.transition.step : null;
const isSourceDriftPhase = (state: GameState) =>
    ['source_drift_detected', 'quarantine_monitoring', 'customer_impact_visible'].includes(sourceDriftStep(state) ?? '') ||
    (state.expansionProgress.era === 'governance_crisis' && state.expansionProgress.transition === null);
const isSourceRemediationValid = (repair: SourceDriftRemediation) => typeof repair.active === 'boolean' &&
    SOURCE_REMEDIATION_STEPS.includes(repair.step) && Number.isSafeInteger(repair.resolvedProducts) && repair.resolvedProducts >= 0 &&
    repair.supplierSemanticsConfirmed === (repair.step !== 'supplier_clarification') &&
    repair.ruleApproved === ['backfill_ready', 'remediation_complete'].includes(repair.step) &&
    (repair.step === 'remediation_complete' ? repair.resolvedProducts > 0 : repair.resolvedProducts === 0) &&
    (repair.active || (repair.step === 'supplier_clarification' && !repair.supplierSemanticsConfirmed && !repair.ruleApproved && repair.resolvedProducts === 0));
const hasSourceDriftHistory = (incident: SourceDriftIncident) => typeof incident.active === 'boolean' &&
    ['batchesObserved', 'quarantined', 'affectedProducts'].every(key =>
      Number.isSafeInteger(incident[key as keyof SourceDriftIncident]) && Number(incident[key as keyof SourceDriftIncident]) >= 0) &&
    incident.quarantined / SOURCE_DRIFT.recordsPerBatch === incident.batchesObserved && incident.affectedProducts <= incident.quarantined &&
    incident.customerImpactVisible === (incident.batchesObserved >= SOURCE_DRIFT.impactBatches);
const isSourceDriftValid = (incident: SourceDriftIncident, repair: SourceDriftRemediation) => hasSourceDriftHistory(incident) &&
    isSourceRemediationValid(repair) && Number.isSafeInteger(incident.affectedProducts + repair.resolvedProducts) &&
    incident.affectedProducts + repair.resolvedProducts === incident.quarantined &&
    (incident.active ? !repair.ruleApproved && repair.resolvedProducts === 0 :
      repair.active && repair.ruleApproved && incident.customerImpactVisible &&
      (repair.step === 'backfill_ready' ? incident.affectedProducts === incident.quarantined && incident.affectedProducts > 0 :
        repair.step === 'remediation_complete' && incident.affectedProducts === 0 && repair.resolvedProducts === incident.quarantined));

const hasAcceleratedAIReviewDemand = (state: GameState) =>
    (state.expansionProgress.era === 'acceleration' && (state.expansionProgress.transition === null ||
      (state.expansionProgress.transition.targetEra === 'connected_enterprise' &&
       ['read_connection_offer', 'product_db_read_connected', 'connected_mapping_success'].includes(state.expansionProgress.transition.step)))) ||
    (state.expansionProgress.era === 'connected_enterprise' && (state.expansionProgress.transition === null ||
      (state.expansionProgress.transition.targetEra === 'good_enough' &&
       ['write_access_offer', 'write_pilot_active', 'write_pilot_success', 'approval_rollout_ready', 'approval_queue_active', 'approval_bottleneck_visible', 'approval_policy_offer', 'policy_trial_active', 'policy_trial_success'].includes(state.expansionProgress.transition.step)))) ||
    (state.expansionProgress.era === 'good_enough' && (state.expansionProgress.transition === null ||
      (state.expansionProgress.transition.targetEra === 'lightspeed' && ['batch_routing_offer', 'batch_routing_active', 'batch_scale_visible'].includes(state.expansionProgress.transition.step)))) ||
    ((state.expansionProgress.era === 'lightspeed' && state.expansionProgress.transition === null) || isSourceDriftPhase(state)) ||
    (state.expansionProgress.era === 'ai_pilot' && state.expansionProgress.transition?.targetEra === 'acceleration' &&
     (state.expansionProgress.transition.step === 'accelerated_routing_active' || state.expansionProgress.transition.step === 'review_bottleneck_visible'));

const hasContinuousAIReviewDemand = (state: GameState) => state.aiReviewDemand.active &&
    state.aiReviewQueue.wave === 3 && (hasAcceleratedAIReviewDemand(state) || (state.expansionProgress.era === 'ai_pilot' &&
    state.expansionProgress.transition?.targetEra === 'acceleration' &&
    (state.expansionProgress.transition.step === 'continuous_demand_active' || state.expansionProgress.transition.step === 'pressure_visible')));

const continuousDemandProof = (state: GameState) => {
    if (!hasContinuousAIReviewDemand(state)) return state.expansionProgress;
    const step = state.expansionProgress.transition?.step;
    const demand = state.aiReviewDemand;
    if (step === 'continuous_demand_active' && demand.totalArrived >= 3 && demand.totalCompleted >= 3) {
        return { ...state.expansionProgress, transition: { ...state.expansionProgress.transition!, step: 'pressure_visible' } };
    }
    if (step === 'accelerated_routing_active' && demand.acceleratedArrivals >= 4 && demand.acceleratedReviews >= 2 &&
        (demand.acceleratedPeakPending >= 6 || demand.acceleratedArrivals >= 6)) {
        return { ...state.expansionProgress, transition: { ...state.expansionProgress.transition!, step: 'review_bottleneck_visible' } };
    }
    return state.expansionProgress;
};

// One scheduled opportunity per game interval; a full queue simply waits for the next.
const arriveAIReview = (prev: GameState, tick: number): Partial<GameState> => {
    if (prev.isAscending || !hasContinuousAIReviewDemand(prev) || tick < prev.aiReviewDemand.nextArrivalTick) return {};
    const added = prev.aiReviewQueue.pending < AI_REVIEW_QUEUE_CAP ? 1 : 0;
    const next = { ...prev, aiReviewQueue: { ...prev.aiReviewQueue, pending: prev.aiReviewQueue.pending + added },
        aiReviewDemand: { ...prev.aiReviewDemand, nextArrivalTick: tick + prev.aiReviewDemand.arrivalIntervalTicks,
            totalArrived: prev.aiReviewDemand.totalArrived + added,
            ...(hasAcceleratedAIReviewDemand(prev) ? {
                acceleratedArrivals: prev.aiReviewDemand.acceleratedArrivals + added,
                acceleratedPeakPending: Math.max(prev.aiReviewDemand.acceleratedPeakPending, prev.aiReviewQueue.pending + added),
            } : {}) } };
    return { aiReviewQueue: next.aiReviewQueue, aiReviewDemand: next.aiReviewDemand, expansionProgress: continuousDemandProof(next) };
};

const isAIReviewActive = (state: GameState) => state.aiReviewQueue.pending > 0 && (
    (state.aiReviewQueue.wave === 1 && state.expansionProgress.era === 'automation' &&
     state.expansionProgress.transition?.targetEra === 'ai_pilot' && state.expansionProgress.transition.step === 'rollout_review') ||
    (state.aiReviewQueue.wave === 2 && state.expansionProgress.era === 'ai_pilot' && state.expansionProgress.transition === null) ||
    hasContinuousAIReviewDemand(state)
);

// Shared reward calculation keeps the assistive trial economically identical to manual SQL.
const sqlQueryReward = (prev: GameState, reward: number, puBonus: number): GameState => {
    let bm = prev.boardMeeting;
    const mult = (1 + prev.prestige.level * 0.1);
    if (bm.active) bm = { ...bm, progress: bm.progress + (puBonus * mult) };
    return {
        ...prev,
        cleanData: prev.cleanData + (reward * mult),
        pu: prev.pu + (puBonus * mult),
        logs: [...prev.logs, { id: Date.now(), text: `Query Success. ${reward} Clean Data.`, type: 'success', timestamp: Date.now() }],
        boardMeeting: bm
    };
};

const isSchemaBatchEligible = (state: GameState) => state.expansionProgress.era === 'acceleration' &&
    state.expansionProgress.transition === null && state.upgrades['pandas_scripts'] === true;

const isSchemaBatchActive = (state: GameState) => isSchemaBatchEligible(state) &&
    state.schemaBatchReview.introduced && state.schemaBatchReview.active &&
    state.schemaBatchReview.exceptionsTotal === 5 && state.schemaBatchReview.exceptionsResolved === 0 &&
    ((state.schemaBatchReview.batchesCompleted === 0 && state.schemaBatchReview.batchSize === 2400 && state.schemaBatchReview.autoMapped === 2395) ||
     (state.schemaBatchReview.batchesCompleted === 1 && state.schemaBatchReview.batchSize === 12000 && state.schemaBatchReview.autoMapped === 11995));

const isConnectedMappingActive = (state: GameState) => state.expansionProgress.era === 'acceleration' &&
    state.expansionProgress.transition?.targetEra === 'connected_enterprise' && state.expansionProgress.transition.step === 'product_db_read_connected' &&
    state.connectedEnterprise.productDb.connected && state.connectedEnterprise.productDb.access === 'read' &&
    state.connectedEnterprise.mappingBatch.active && !state.connectedEnterprise.mappingBatch.completed;

type SchemaBatchAttempt = { id: number; kind: 'schema' | 'connected'; fieldIds: number[]; batchesCompleted: number };

const isWritePilotEligible = (state: GameState) => state.expansionProgress.era === 'connected_enterprise' &&
    state.expansionProgress.transition === null && state.connectedEnterprise.productDb.connected &&
    state.connectedEnterprise.productDb.access === 'read' && state.connectedEnterprise.mappingBatch.completed && state.connectedEnterprise.readUses >= 1;

const isWritePilotActive = (state: GameState) => state.expansionProgress.era === 'connected_enterprise' &&
    state.expansionProgress.transition?.targetEra === 'good_enough' && state.expansionProgress.transition.step === 'write_pilot_active' &&
    state.connectedEnterprise.productDb.connected && state.connectedEnterprise.productDb.access === 'read_write' &&
    state.connectedEnterprise.productWritePilot.active && state.connectedEnterprise.productWritePilot.total === 5 &&
    state.connectedEnterprise.productWritePilot.pending > 0 &&
    state.connectedEnterprise.productWritePilot.completed + state.connectedEnterprise.productWritePilot.pending === 5 &&
    state.connectedEnterprise.writeUses === state.connectedEnterprise.productWritePilot.completed;

const hasWritePilotProof = (state: GameState) => state.connectedEnterprise.productDb.connected &&
    state.connectedEnterprise.productDb.access === 'read_write' && !state.connectedEnterprise.productWritePilot.active &&
    state.connectedEnterprise.productWritePilot.completed === 5 && state.connectedEnterprise.productWritePilot.pending === 0 &&
    state.connectedEnterprise.productWritePilot.total === 5 && state.connectedEnterprise.writeUses >= 5;

const reviewClassIndices = (policy: ProductWritePolicy) => PRODUCT_WRITE_CLASSES
    .map((value, index) => policy.autoClasses.includes(value) ? -1 : index).filter(index => index >= 0);
const batchRoutingStep = (state: GameState) => state.expansionProgress.era === 'good_enough' &&
    state.expansionProgress.transition?.targetEra === 'lightspeed' ? state.expansionProgress.transition.step : null;
const isBatchRoutingPhase = (state: GameState) => ['batch_routing_active', 'batch_scale_visible'].includes(batchRoutingStep(state) ?? '') ||
    ((state.expansionProgress.era === 'lightspeed' && state.expansionProgress.transition === null) || isSourceDriftPhase(state));
const isProductWriteScaleValid = (state: GameState) => {
    const scale = state.connectedEnterprise.productWriteScale;
    const policy = state.connectedEnterprise.productWritePolicy;
    return scale.active && scale.batchSize === PRODUCT_WRITE_BATCH_SIZE &&
      ['batchesProcessed', 'totalRouted', 'autoApplied', 'reviewRouted', 'reviewBacklog'].every(key => Number.isSafeInteger(scale[key as keyof ProductWriteScale]) && Number(scale[key as keyof ProductWriteScale]) >= 0) &&
      scale.totalRouted / PRODUCT_WRITE_BATCH_SIZE === scale.batchesProcessed &&
      scale.autoApplied === scale.totalRouted / PRODUCT_WRITE_CLASSES.length * policy.autoClasses.length &&
      scale.reviewRouted === scale.totalRouted - scale.autoApplied && scale.reviewBacklog <= scale.reviewRouted &&
      scale.autoApplied <= policy.autoAppliedTotal && scale.reviewRouted <= policy.manualRoutedTotal;
};

const isOperationalWritePolicy = (state: GameState) => {
    const policy = state.connectedEnterprise.productWritePolicy;
    const queue = state.connectedEnterprise.productWriteQueue;
    const scale = state.connectedEnterprise.productWriteScale;
    const phase = (state.expansionProgress.era === 'good_enough' && (state.expansionProgress.transition === null ||
      ['batch_routing_offer', 'batch_routing_active', 'batch_scale_visible'].includes(batchRoutingStep(state) ?? ''))) ||
      ((state.expansionProgress.era === 'lightspeed' && state.expansionProgress.transition === null) || isSourceDriftPhase(state));
    return phase && (isBatchRoutingPhase(state) ? isProductWriteScaleValid(state) : !scale.active && scale.reviewBacklog === 0) &&
      policy.configured && policy.active && !policy.trial.active && policy.trial.total === 5 &&
      policy.trial.autoApplied === policy.autoClasses.length && policy.trial.manualPending === 0 &&
      policy.trial.autoApplied + policy.trial.manualApproved === 5 &&
      policy.routeSequence === policy.autoAppliedTotal + policy.manualRoutedTotal &&
      policy.manualCompleted <= policy.manualRoutedTotal &&
      Number.isSafeInteger(queue.pending + scale.reviewBacklog) &&
      queue.pending + scale.reviewBacklog === policy.legacyPending + policy.manualRoutedTotal - policy.manualCompleted;
};
const isProductWriteQueueActive = (state: GameState) => {
    const queue = state.connectedEnterprise.productWriteQueue;
    const prePolicy = state.expansionProgress.era === 'connected_enterprise' && state.expansionProgress.transition?.targetEra === 'good_enough' &&
      ['approval_queue_active', 'approval_bottleneck_visible', 'approval_policy_offer', 'policy_trial_active', 'policy_trial_success'].includes(state.expansionProgress.transition.step);
    const policy = state.connectedEnterprise.productWritePolicy;
    const expectedWrites = 5 + queue.completed + (policy.configured ? policy.trial.autoApplied + policy.trial.manualApproved + policy.autoAppliedTotal : 0) + state.connectedEnterprise.sourceDriftRemediation.resolvedProducts;
    return (prePolicy || isOperationalWritePolicy(state)) &&
      hasWritePilotProof(state) && queue.active && queue.arrivalIntervalTicks === PRODUCT_WRITE_QUEUE_INTERVAL_TICKS &&
      queue.pending <= PRODUCT_WRITE_QUEUE_CAP &&
      Number.isSafeInteger(queue.pending + state.connectedEnterprise.productWriteScale.reviewBacklog + queue.completed) &&
      queue.pending + state.connectedEnterprise.productWriteScale.reviewBacklog + queue.completed === PRODUCT_WRITE_QUEUE_INITIAL + queue.totalArrived &&
      Number.isSafeInteger(expectedWrites) && state.connectedEnterprise.writeUses >= expectedWrites;
};
const isBatchRoutingEligible = (state: GameState) => state.expansionProgress.era === 'good_enough' &&
    state.expansionProgress.transition === null && isProductWriteQueueActive(state) && !state.connectedEnterprise.productWriteScale.active;

const isSourceDriftEligible = (state: GameState) => state.expansionProgress.era === 'lightspeed' &&
    state.expansionProgress.transition === null && isProductWriteQueueActive(state) && isProductWriteScaleValid(state) &&
    !state.connectedEnterprise.sourceDriftIncident.active;
const hasSourceDriftProof = (state: GameState) => isSourceDriftPhase(state) && isProductWriteQueueActive(state) &&
    isSourceDriftValid(state.connectedEnterprise.sourceDriftIncident, state.connectedEnterprise.sourceDriftRemediation) &&
    state.connectedEnterprise.sourceDriftIncident.batchesObserved <= state.connectedEnterprise.productWriteScale.batchesProcessed;

const isIncidentInvestigationEligible = (state: GameState) => state.expansionProgress.era === 'governance_crisis' &&
    state.expansionProgress.transition === null && hasSourceDriftProof(state) &&
    state.connectedEnterprise.sourceDriftIncident.customerImpactVisible &&
    state.connectedEnterprise.sourceDriftIncident.quarantined >= 25 && state.connectedEnterprise.sourceDriftIncident.affectedProducts >= 25;

const hasConfirmedIncidentRootCause = (state: GameState) => state.expansionProgress.era === 'governance_crisis' &&
    state.expansionProgress.transition === null && state.connectedEnterprise.incidentInvestigation.active &&
    state.connectedEnterprise.incidentInvestigation.step === 'root_cause_confirmed' && state.connectedEnterprise.incidentInvestigation.rootCauseProven;
const isSourceRemediationAvailable = (state: GameState) => hasConfirmedIncidentRootCause(state) && hasSourceDriftProof(state) &&
    state.connectedEnterprise.sourceDriftIncident.customerImpactVisible &&
    (state.connectedEnterprise.sourceDriftRemediation.active ||
      (state.connectedEnterprise.sourceDriftIncident.active && state.connectedEnterprise.sourceDriftIncident.affectedProducts > 0));
const canReviewIncidentTrace = (state: GameState) => isIncidentInvestigationEligible(state) ||
    (hasConfirmedIncidentRootCause(state) && hasSourceDriftProof(state) && state.connectedEnterprise.sourceDriftRemediation.ruleApproved);

const policyTrialStep = (state: GameState) => state.expansionProgress.era === 'connected_enterprise' &&
    state.expansionProgress.transition?.targetEra === 'good_enough' ? state.expansionProgress.transition.step : null;
const hasPolicyTrialProof = (state: GameState) => {
    const policy = state.connectedEnterprise.productWritePolicy;
    return isProductWriteQueueActive(state) && policy.configured && !policy.active && policy.trial.total === 5 &&
      policy.trial.autoApplied === policy.autoClasses.length &&
      policy.trial.autoApplied + policy.trial.manualApproved + policy.trial.manualPending === 5;
};
const isPolicyTrialActive = (state: GameState) => policyTrialStep(state) === 'policy_trial_active' &&
    hasPolicyTrialProof(state) && state.connectedEnterprise.productWritePolicy.trial.active && state.connectedEnterprise.productWritePolicy.trial.manualPending > 0;
const queueWriteProposal = (state: GameState, index: number) => {
    const policy = state.connectedEnterprise.productWritePolicy;
    if (!policy.active || policy.legacyPending > 0) return getOperationalProductWriteProposal(index);
    const indices = reviewClassIndices(policy);
    const position = policy.manualCompleted;
    const classIndex = indices[position % indices.length];
    const route = BigInt(position) / BigInt(indices.length) * BigInt(5) + BigInt(classIndex);
    return { ...PRODUCT_WRITE_PROPOSALS[classIndex], record: `P-P${String(route).padStart(5, '0')}` };
};

const productWritePressureProof = (state: GameState) => {
    const queue = state.connectedEnterprise.productWriteQueue;
    return isProductWriteQueueActive(state) && state.expansionProgress.transition?.step === 'approval_queue_active' &&
      queue.completed >= 5 && (queue.peakPending >= 18 || queue.totalArrived >= 10)
        ? { ...state.expansionProgress, transition: { targetEra: 'good_enough' as const, step: 'approval_bottleneck_visible' } }
        : state.expansionProgress;
};

// One deterministic opportunity per engine interval; no offline catch-up or full-queue penalty.
const arriveProductWrite = (prev: GameState, tick: number): Partial<GameState> => {
    const queue = prev.connectedEnterprise.productWriteQueue;
    if (prev.isAscending || !isProductWriteQueueActive(prev) || tick < queue.nextArrivalTick) return {};
    const policy = prev.connectedEnterprise.productWritePolicy;
    if (isBatchRoutingPhase(prev)) {
      const scale = prev.connectedEnterprise.productWriteScale;
      // 500 complete logical positions contain exactly 100 of each class, at any starting offset.
      const automatic = PRODUCT_WRITE_BATCH_SIZE / PRODUCT_WRITE_CLASSES.length * policy.autoClasses.length;
      const manual = PRODUCT_WRITE_BATCH_SIZE - automatic;
      const loaded = Math.min(manual, PRODUCT_WRITE_QUEUE_CAP - queue.pending);
      const incident = prev.connectedEnterprise.sourceDriftIncident;
      const observeDrift = incident.active && hasSourceDriftProof(prev);
      const additions = [[prev.connectedEnterprise.writeUses, automatic], [policy.autoAppliedTotal, automatic],
        [policy.manualRoutedTotal, manual], [policy.routeSequence, PRODUCT_WRITE_BATCH_SIZE], [queue.totalArrived, manual],
        [scale.batchesProcessed, 1], [scale.totalRouted, PRODUCT_WRITE_BATCH_SIZE], [scale.autoApplied, automatic],
        [scale.reviewRouted, manual], [scale.reviewBacklog, manual - loaded], [tick, PRODUCT_WRITE_QUEUE_INTERVAL_TICKS],
        [queue.pending + queue.completed + scale.reviewBacklog, manual]];
      if (observeDrift) additions.push([incident.batchesObserved, 1], [incident.quarantined, SOURCE_DRIFT.recordsPerBatch],
        [incident.affectedProducts, SOURCE_DRIFT.recordsPerBatch]);
      if (!additions.every(([value, increment]) => Number.isSafeInteger(value + increment) && value + increment >= 0)) return {};
      const nextScale = { ...scale, batchesProcessed: scale.batchesProcessed + 1, totalRouted: scale.totalRouted + PRODUCT_WRITE_BATCH_SIZE,
        autoApplied: scale.autoApplied + automatic, reviewRouted: scale.reviewRouted + manual, reviewBacklog: scale.reviewBacklog + manual - loaded };
      const nextIncident = observeDrift ? { ...incident, batchesObserved: incident.batchesObserved + 1,
        quarantined: incident.quarantined + SOURCE_DRIFT.recordsPerBatch,
        affectedProducts: incident.affectedProducts + SOURCE_DRIFT.recordsPerBatch,
        customerImpactVisible: incident.batchesObserved + 1 >= SOURCE_DRIFT.impactBatches } : incident;
      return { connectedEnterprise: { ...prev.connectedEnterprise, sourceDriftIncident: nextIncident, productWriteScale: nextScale,
        writeUses: prev.connectedEnterprise.writeUses + automatic,
        productWritePolicy: { ...policy, autoAppliedTotal: policy.autoAppliedTotal + automatic, manualRoutedTotal: policy.manualRoutedTotal + manual,
          routeSequence: policy.routeSequence + PRODUCT_WRITE_BATCH_SIZE },
        productWriteQueue: { ...queue, pending: queue.pending + loaded, totalArrived: queue.totalArrived + manual,
          peakPending: Math.max(queue.peakPending, queue.pending + loaded), nextArrivalTick: tick + PRODUCT_WRITE_QUEUE_INTERVAL_TICKS } },
        ...(batchRoutingStep(prev) === 'batch_routing_active' && nextScale.batchesProcessed >= 3 && nextScale.totalRouted >= 1500 ? {
          expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'lightspeed', step: 'batch_scale_visible' } } } : {}),
        ...(observeDrift && sourceDriftStep(prev) === 'quarantine_monitoring' && nextIncident.customerImpactVisible ? {
          expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'governance_crisis', step: 'customer_impact_visible' } } } : {}) };
    }
    if (isOperationalWritePolicy(prev)) {
      const automatic = policy.autoClasses.includes(PRODUCT_WRITE_CLASSES[policy.routeSequence % 5]);
      const manual = !automatic && queue.pending < PRODUCT_WRITE_QUEUE_CAP;
      return { connectedEnterprise: { ...prev.connectedEnterprise,
        writeUses: prev.connectedEnterprise.writeUses + (automatic ? 1 : 0),
        productWritePolicy: { ...policy, autoAppliedTotal: policy.autoAppliedTotal + (automatic ? 1 : 0),
          manualRoutedTotal: policy.manualRoutedTotal + (manual ? 1 : 0), routeSequence: policy.routeSequence + (automatic || manual ? 1 : 0) },
        productWriteQueue: { ...queue, pending: queue.pending + (manual ? 1 : 0), totalArrived: queue.totalArrived + (manual ? 1 : 0),
          peakPending: Math.max(queue.peakPending, queue.pending + (manual ? 1 : 0)), nextArrivalTick: tick + PRODUCT_WRITE_QUEUE_INTERVAL_TICKS } } };
    }
    const added = queue.pending < PRODUCT_WRITE_QUEUE_CAP ? 1 : 0;
    const next = { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, productWriteQueue: { ...queue,
      pending: queue.pending + added, totalArrived: queue.totalArrived + added, peakPending: Math.max(queue.peakPending, queue.pending + added),
      nextArrivalTick: tick + PRODUCT_WRITE_QUEUE_INTERVAL_TICKS } } };
    return { connectedEnterprise: next.connectedEnterprise, expansionProgress: productWritePressureProof(next) };
};

type ProductWriteAttempt = { id: number; index: number; kind: 'pilot' | 'queue' | 'policy_trial' };

const hydrateProductWritePolicy = (saved: any): ProductWritePolicy => {
    const empty = () => ({ ...INITIAL_STATE.connectedEnterprise.productWritePolicy, autoClasses: [],
      trial: { ...INITIAL_STATE.connectedEnterprise.productWritePolicy.trial } });
    if (!saved || saved.configured !== true || typeof saved.active !== 'boolean' || !Array.isArray(saved.autoClasses)) return empty();
    const autoClasses = PRODUCT_WRITE_AUTO_CLASSES.filter(value => saved.autoClasses.includes(value));
    const trial = saved.trial;
    if (!trial || typeof trial.active !== 'boolean' ||
      !['legacyPending', 'autoAppliedTotal', 'manualRoutedTotal', 'manualCompleted', 'routeSequence'].every(key => Number.isSafeInteger(saved[key]) && saved[key] >= 0) ||
      !['total', 'autoApplied', 'manualPending', 'manualApproved'].every(key => Number.isSafeInteger(trial[key]) && trial[key] >= 0) ||
      saved.legacyPending > PRODUCT_WRITE_QUEUE_CAP || saved.manualCompleted > saved.manualRoutedTotal ||
      saved.routeSequence !== saved.autoAppliedTotal + saved.manualRoutedTotal ||
      trial.total !== 5 || trial.autoApplied !== autoClasses.length || trial.autoApplied + trial.manualPending + trial.manualApproved !== 5 ||
      trial.active !== (trial.manualPending > 0) || (saved.active && trial.manualPending !== 0) ||
      (!saved.active && ['legacyPending', 'autoAppliedTotal', 'manualRoutedTotal', 'manualCompleted', 'routeSequence'].some(key => saved[key] !== 0))) return empty();
    return { configured: true, active: saved.active, autoClasses, legacyPending: saved.legacyPending,
      autoAppliedTotal: saved.autoAppliedTotal, manualRoutedTotal: saved.manualRoutedTotal, manualCompleted: saved.manualCompleted,
      routeSequence: saved.routeSequence, trial: { active: trial.active, total: 5, autoApplied: trial.autoApplied,
        manualPending: trial.manualPending, manualApproved: trial.manualApproved } };
};

const hydrateProductWriteScale = (saved: any): ProductWriteScale => {
    const empty = { ...INITIAL_STATE.connectedEnterprise.productWriteScale };
    if (!saved || saved.active !== true || saved.batchSize !== PRODUCT_WRITE_BATCH_SIZE ||
      !['batchesProcessed', 'totalRouted', 'autoApplied', 'reviewRouted', 'reviewBacklog'].every(key => Number.isSafeInteger(saved[key]) && saved[key] >= 0) ||
      saved.totalRouted / PRODUCT_WRITE_BATCH_SIZE !== saved.batchesProcessed ||
      saved.autoApplied + saved.reviewRouted !== saved.totalRouted || saved.reviewBacklog > saved.reviewRouted) return empty;
    return { active: true, batchSize: PRODUCT_WRITE_BATCH_SIZE, batchesProcessed: saved.batchesProcessed,
      totalRouted: saved.totalRouted, autoApplied: saved.autoApplied, reviewRouted: saved.reviewRouted, reviewBacklog: saved.reviewBacklog };
};

const hydrateSourceDriftRemediation = (saved: any): SourceDriftRemediation => {
    if (!saved || !isSourceRemediationValid(saved)) return { ...INITIAL_STATE.connectedEnterprise.sourceDriftRemediation };
    return { active: saved.active, step: saved.step, supplierSemanticsConfirmed: saved.supplierSemanticsConfirmed,
      ruleApproved: saved.ruleApproved, resolvedProducts: saved.resolvedProducts };
};
const hydrateSourceDriftIncident = (saved: any, savedRepair: any): SourceDriftIncident => {
    if (!saved || !hasSourceDriftHistory(saved) || (saved.active && saved.affectedProducts !== saved.quarantined && savedRepair?.active !== true))
      return { ...INITIAL_STATE.connectedEnterprise.sourceDriftIncident };
    return { active: saved.active, batchesObserved: saved.batchesObserved, quarantined: saved.quarantined,
      affectedProducts: saved.affectedProducts, customerImpactVisible: saved.customerImpactVisible };
};

const hydrateIncidentInvestigation = (saved: any): IncidentInvestigation => {
    if (!saved || saved.active !== true || !INCIDENT_INVESTIGATION_STEPS.includes(saved.step) ||
      saved.rootCauseProven !== (saved.step === 'root_cause_confirmed')) return { ...INITIAL_STATE.connectedEnterprise.incidentInvestigation };
    return { active: true, step: saved.step, rootCauseProven: saved.rootCauseProven };
};

const hydrateState = (parsed: any): GameState => {
    const savedWritePilot = parsed.connectedEnterprise?.productWritePilot;
    const validWritePilot = savedWritePilot?.total === 5 && Number.isSafeInteger(savedWritePilot.completed) &&
        savedWritePilot.completed >= 0 && savedWritePilot.completed <= 5 && savedWritePilot.pending === 5 - savedWritePilot.completed;
    const savedProgress = parsed.expansionProgress;
    const savedTransition = savedProgress?.transition;
    // Merge basic fields to ensure new properties from updates exist
    const state: GameState = {
        ...INITIAL_STATE,
        ...parsed,
        connectedEnterprise: {
            sourceDriftRemediation: hydrateSourceDriftRemediation(parsed.connectedEnterprise?.sourceDriftRemediation),
            incidentInvestigation: hydrateIncidentInvestigation(parsed.connectedEnterprise?.incidentInvestigation),
            sourceDriftIncident: hydrateSourceDriftIncident(parsed.connectedEnterprise?.sourceDriftIncident, parsed.connectedEnterprise?.sourceDriftRemediation),
            productWriteScale: hydrateProductWriteScale(parsed.connectedEnterprise?.productWriteScale),
            productWritePolicy: hydrateProductWritePolicy(parsed.connectedEnterprise?.productWritePolicy),
            productDb: { connected: parsed.connectedEnterprise?.productDb?.connected === true && ['read', 'read_write'].includes(parsed.connectedEnterprise.productDb.access),
                access: parsed.connectedEnterprise?.productDb?.connected === true && ['read', 'read_write'].includes(parsed.connectedEnterprise.productDb.access) ? parsed.connectedEnterprise.productDb.access : 'none' },
            writeUses: Number.isSafeInteger(parsed.connectedEnterprise?.writeUses) && parsed.connectedEnterprise.writeUses >= 0 ? parsed.connectedEnterprise.writeUses : 0,
            productWritePilot: validWritePilot ? { active: savedWritePilot.active === true && savedWritePilot.pending > 0, pending: savedWritePilot.pending, completed: savedWritePilot.completed, total: 5 } : { ...INITIAL_STATE.connectedEnterprise.productWritePilot },
            productWriteQueue: {
                active: parsed.connectedEnterprise?.productWriteQueue?.active === true,
                ...Object.fromEntries(['pending', 'completed', 'totalArrived', 'nextArrivalTick', 'arrivalIntervalTicks', 'peakPending'].map(key => [key,
                  Number.isSafeInteger(parsed.connectedEnterprise?.productWriteQueue?.[key]) && parsed.connectedEnterprise.productWriteQueue[key] >= 0 &&
                  (!['pending', 'peakPending'].includes(key) || parsed.connectedEnterprise.productWriteQueue[key] <= PRODUCT_WRITE_QUEUE_CAP)
                    ? parsed.connectedEnterprise.productWriteQueue[key] : 0])),
            },
            readUses: Number.isSafeInteger(parsed.connectedEnterprise?.readUses) && parsed.connectedEnterprise.readUses >= 0 ? parsed.connectedEnterprise.readUses : 0,
            mappingBatch: { active: parsed.connectedEnterprise?.mappingBatch?.active === true && parsed.connectedEnterprise.mappingBatch.completed !== true,
                completed: parsed.connectedEnterprise?.mappingBatch?.completed === true },
        },
        schemaBatchReview: {
            ...INITIAL_STATE.schemaBatchReview,
            introduced: parsed.schemaBatchReview?.introduced === true,
            active: parsed.schemaBatchReview?.active === true,
            ...Object.fromEntries(['batchSize', 'autoMapped', 'exceptionsTotal', 'exceptionsResolved', 'batchesCompleted'].map(key => [key,
                Number.isSafeInteger(parsed.schemaBatchReview?.[key]) && parsed.schemaBatchReview[key] >= 0 ? parsed.schemaBatchReview[key] : 0])),
        },
        aiReviewDemand: {
            ...INITIAL_STATE.aiReviewDemand,
            active: parsed.aiReviewDemand?.active === true,
            arrivalIntervalTicks: Number.isSafeInteger(parsed.aiReviewDemand?.arrivalIntervalTicks) && parsed.aiReviewDemand.arrivalIntervalTicks > 0
                ? parsed.aiReviewDemand.arrivalIntervalTicks : INITIAL_STATE.aiReviewDemand.arrivalIntervalTicks,
            ...Object.fromEntries(['nextArrivalTick', 'totalArrived', 'totalCompleted', 'acceleratedArrivals', 'acceleratedReviews', 'acceleratedPeakPending'].map(key => [key,
                Number.isSafeInteger(parsed.aiReviewDemand?.[key]) && parsed.aiReviewDemand[key] >= 0 ? parsed.aiReviewDemand[key] : 0])),
        },
        aiReviewQueue: {
            ...INITIAL_STATE.aiReviewQueue,
            ...Object.fromEntries(['pending', 'completed', 'wave'].map(key => [key,
                Number.isSafeInteger(parsed.aiReviewQueue?.[key]) && parsed.aiReviewQueue[key] >= 0
                    ? parsed.aiReviewQueue[key] : 0])),
        },
        expansionProgress: {
            ...INITIAL_STATE.expansionProgress,
            ...(savedProgress || {}),
            era: isExpansionEra(savedProgress?.era) ? savedProgress.era : INITIAL_STATE.expansionProgress.era,
            transition: isExpansionEra(savedTransition?.targetEra) && typeof savedTransition?.step === 'string'
                ? { ...savedTransition }
                : null,
        },
        // Deep merge nested objects where necessary to preserve defaults for new fields
        worldStats: { ...INITIAL_STATE.worldStats, ...(parsed.worldStats || {}) },
        market: { ...INITIAL_STATE.market, ...(parsed.market || {}) },
        boardMeeting: { ...INITIAL_STATE.boardMeeting, ...(parsed.boardMeeting || {}) },
        upgrades: parsed.upgrades || {},
        eventHistory: parsed.eventHistory || [],
        history: parsed.history || [],
        logs: parsed.logs || [],
        activeCampaigns: parsed.activeCampaigns || [],
        blockingTask: parsed.blockingTask || null,
        prestige: { ...INITIAL_STATE.prestige, ...(parsed.prestige || {}) },
        isAscending: parsed.isAscending || false,
        rival: { ...INITIAL_STATE.rival, ...(parsed.rival || {}) },
        buzzwordMode: parsed.buzzwordMode || false,
        pdfMode: parsed.pdfMode || false,
        relationships: parsed.relationships || {},
        coffeeBreak: { ...INITIAL_STATE.coffeeBreak, ...(parsed.coffeeBreak || {}) },
        lastCoffeeTick: parsed.lastCoffeeTick || -9999,
    };

    // S14 containment/backfill must retain a coherent semantic approval and prior causal proof.
    const incident = state.connectedEnterprise.sourceDriftIncident;
    const repair = state.connectedEnterprise.sourceDriftRemediation;
    if (!isSourceDriftValid(incident, repair) || (repair.active && (!hasConfirmedIncidentRootCause(state) || !isProductWriteQueueActive(state)))) {
        state.connectedEnterprise.sourceDriftRemediation = { ...INITIAL_STATE.connectedEnterprise.sourceDriftRemediation };
        // Invalid repair authority cannot clear valid historical work or silently contain its source.
        state.connectedEnterprise.sourceDriftIncident = hasSourceDriftHistory(incident) && incident.quarantined > 0
          ? { ...incident, active: true, affectedProducts: incident.quarantined }
          : { ...INITIAL_STATE.connectedEnterprise.sourceDriftIncident };
    }

    // Hydrate Active Events (reattach functions from constants)
    state.activeEvents = (parsed.activeEvents || []).map((savedEv: any) => {
        const original = EVENTS.find(e => e.id === savedEv.id);
        return original ? { ...original, ...savedEv } : null; 
    }).filter(Boolean) as GameEvent[];

    // Hydrate Active Chats (reattach functions from constants)
    state.activeChats = (parsed.activeChats || []).map((savedChat: any) => {
        const scenario = CHAT_SCENARIOS.find(s => s.id === savedChat.scenarioId);
        if (!scenario) return null;
        return {
            ...savedChat,
            responses: scenario.responses // Restore functions
        };
    }).filter(Boolean) as ChatMessage[];

    return state;
};

export const useGameEngine = () => {
  const [state, setState] = useState<GameState>(() => {
      try {
          const saved = localStorage.getItem(SAVE_KEY);
          if (saved) {
              console.log("Loading save game...");
              return hydrateState(JSON.parse(saved));
          }
      } catch (e) {
          console.error("Failed to load save", e);
      }
      return INITIAL_STATE;
  });
  
  const [isRebooting, setIsRebooting] = useState(false); // Local UI state for reboot sequence
  const stateRef = useRef(state);
  const sqlPilotAttempt = useRef<number | null>(null);
  const sqlPilotAttemptSequence = useRef(0);
  const [sqlQueueAttemptId, setSQLQueueAttemptId] = useState<number | null>(null);
  const sqlQueueAttempt = useRef<{ id: number; wave: number; completed: number } | null>(null);
  const sqlQueueSequence = useRef(0);
  const [schemaBatchAttempt, setSchemaBatchAttempt] = useState<SchemaBatchAttempt | null>(null);
  const schemaBatchAttemptRef = useRef<SchemaBatchAttempt | null>(null);
  const schemaBatchSequence = useRef(0);
  const [productWriteAttempt, setProductWriteAttempt] = useState<ProductWriteAttempt | null>(null);
  const productWriteAttemptRef = useRef<ProductWriteAttempt | null>(null);
  const productWriteSequence = useRef(0);

  useEffect(() => {
    if (!state.pandasMode) {
      schemaBatchAttemptRef.current = null;
      setSchemaBatchAttempt(null);
    }
  }, [state.pandasMode, schemaBatchAttempt]);

  useEffect(() => {
    if (!state.sqlMode) {
      sqlPilotAttempt.current = null;
      sqlQueueAttempt.current = null;
      setSQLQueueAttemptId(null);
    }
  }, [state.sqlMode, sqlQueueAttemptId]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-Save Loop
  useEffect(() => {
      const interval = setInterval(() => {
          try {
              if (!isRebooting) {
                  localStorage.setItem(SAVE_KEY, JSON.stringify(stateRef.current));
              }
          } catch(e) {
              console.error("Auto-save failed", e);
          }
      }, 2000); // Save every 2 seconds
      return () => clearInterval(interval);
  }, [isRebooting]);

  const addLog = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'danger' | 'system' = 'info') => {
    setState(prev => ({
      ...prev,
      logs: [{ id: Date.now() + Math.random(), text, type, timestamp: Date.now() }, ...prev.logs].slice(0, 100)
    }));
  }, []);

  // Main Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRebooting) return; // Stop loop during reboot

      const current = stateRef.current;
      
      // Pause loop if ascending (End Screen)
      if (current.isAscending) {
          return;
      }

      // Check for Layoffs (Penalty)
      const isPenaltyActive = current.tick < current.boardMeeting.penaltyEndTime;
      const productionMultiplier = isPenaltyActive ? 0.5 : 1.0;
      
      // PRESTIGE MULTIPLIER
      // Each level adds 10% to production
      const prestigeMult = 1 + (current.prestige.level * 0.1);

      // 1. Calculate Marketing Effects
      let marketingRawData = 0;
      let marketingPU = 0;
      let activeCampaigns = current.activeCampaigns.map(c => {
          // Base rates per tick
          let rawTick = 0;
          let puTick = 0;
          
          if (c.type === 'email') { rawTick = 2; puTick = 1; }
          if (c.type === 'social') { rawTick = 5; puTick = 8; }
          if (c.type === 'influencer') { rawTick = 15; puTick = 40; }
          if (c.type === 'tv') { rawTick = 50; puTick = 200; }

          rawTick *= c.effectiveness;
          puTick *= c.effectiveness;

          marketingRawData += rawTick;
          marketingPU += puTick;

          return {
              ...c,
              timeLeft: c.timeLeft - 1,
              generatedRaw: c.generatedRaw + rawTick,
              generatedPU: c.generatedPU + puTick
          };
      }).filter(c => c.timeLeft > 0);

      // 2. Calculate Deltas
      const rawDataInflow = (current.rawDataRate * (TICK_RATE_MS / 1000) * productionMultiplier * prestigeMult) + marketingRawData;
      
      // -- Storage Logic --
      let potentialRawData = current.rawData + rawDataInflow;
      
      let cleanDataDelta = current.cleanDataRate * (TICK_RATE_MS / 1000) * productionMultiplier * prestigeMult;
      
      if (current.rawData < cleanDataDelta) {
        cleanDataDelta = current.rawData;
      }
      
      potentialRawData -= cleanDataDelta;

      let finalRawData = potentialRawData;
      let lostData = 0;
      
      if (potentialRawData > current.maxStorage) {
          finalRawData = current.maxStorage;
          lostData = potentialRawData - current.maxStorage;
      }

      const instantaneousLoss = rawDataInflow > 0 ? (lostData / rawDataInflow) * 100 : 0;
      
      let metricDelta = current.metricRate * (TICK_RATE_MS / 1000) * productionMultiplier * prestigeMult;
      if (current.cleanData < metricDelta) metricDelta = current.cleanData;

      // 3. Calculate Complexity & Observability
      // REBALANCED: Reduced weight of throughput on complexity. 
      // Complexity is now more about "Tech Debt" (Dashboards/Models) than "Volume".
      const infraComplexity = (current.dashboards * 5) + (current.models * 15);
      const throughputComplexity = (current.rawDataRate * 0.1) + (current.cleanDataRate * 0.2) + (current.metricRate * 1.0);
      const newComplexity = 10 + infraComplexity + throughputComplexity;

      const newObservability = Math.max(1, 100 * (100 / (100 + newComplexity)));

      // 4. Calculate PU and TU changes
      let puGain = (metricDelta * 5) + (current.dashboards * 0.5) + (current.models * 2);
      if (isPenaltyActive) puGain *= 0.5;
      
      // Add Marketing PU
      puGain += marketingPU;
      
      // Prestige Boosts PU gain
      puGain *= prestigeMult;

      const qualityFactor = current.metricQuality;
      const entropyFactor = current.worldStats.entropy / 100;
      
      // REBALANCED: TU Generation (BUFFED)
      // Lowered quality threshold from 0.25 to 0.15 to make it easier to start gaining TU
      // Increased multiplier from 0.2 to 0.4
      const tuFromMetrics = (metricDelta * (qualityFactor - 0.15) * 0.4); 
      const tuFromModels = (current.models * 0.05); // Buffed from 0.02
      
      const tuChange = (tuFromMetrics + tuFromModels - (entropyFactor * 0.01)) * prestigeMult;
      
      // ENTROPY BALANCING (RELAXED)
      // Relaxed Perception Gap: Allow PU to be 50x TU before significant penalty (was 25x)
      const perceptionGap = Math.max(0, current.pu - (current.tu * 50)); 
      
      // Reduced penalty for blind spots (0.002 instead of 0.005)
      const blindSpotPenalty = newObservability < 50 ? (50 - newObservability) * 0.002 : 0;
      
      // Dynamic Threshold: The more TU you have, the more "Fake" PU you can sustain safely
      // Increased Base from 500 -> 2000. Increased Multiplier from 20 -> 50.
      const gapThreshold = 2000 + (current.tu * 50);
      
      // Stronger decay rate (-0.2 vs -0.05) to allow faster recovery
      // Slower rising rate (0.01 vs 0.02)
      const gapPenalty = perceptionGap > gapThreshold ? 0.01 : -0.2;
      
      // Reduced overflow penalty (0.005 vs 0.02) so full storage isn't a death sentence
      const overflowPenalty = lostData > 0 ? 0.005 : 0;
      
      const entropyChange = (gapPenalty + blindSpotPenalty + overflowPenalty) * (TICK_RATE_MS / 1000);

      const economyTarget = 50 + (current.tu - 10) * 3;
      const economyDrift = (economyTarget - current.worldStats.economy) * 0.01;

      // 5. Chat Mechanic
      const now = Date.now();
      let activeChats = [...current.activeChats];
      let chatPenalty = 0;
      
      activeChats = activeChats.map(c => {
          if (!c.isUrgent && (now - c.timestamp > 15000)) {
              return { ...c, isUrgent: true };
          }
          return c;
      });

      const urgentCount = activeChats.filter(c => c.isUrgent).length;
      if (urgentCount > 0) {
          chatPenalty = urgentCount * 5; 
          puGain -= chatPenalty;
      }

      // 5b. Rival Logic (Eric)
      let rival = { ...current.rival };
      if (!rival.active && current.cleanData > 50) {
          rival.active = true;
          // He starts with a lead
          rival.cleanData = current.cleanData * 1.5;
          rival.metrics = current.metrics * 1.5;
      }

      if (rival.active) {
          // Eric is always just slightly faster than you to cause anxiety
          const rivalRate = Math.max(2, current.cleanDataRate * 1.1);
          rival.cleanData += rivalRate * (TICK_RATE_MS / 1000);
          rival.metrics += (rivalRate * 0.4) * (TICK_RATE_MS / 1000);

          // Random mock from Eric
          // Chance increases if he is way ahead
          const lead = rival.cleanData - current.cleanData;
          if (lead > 0 && Math.random() < 0.002 && (current.tick - rival.lastMockTick > 500)) {
              const ericScenarios = CHAT_SCENARIOS.filter(s => s.sender === "10x Engineer Eric");
              if (ericScenarios.length > 0) {
                 const scenario = ericScenarios[Math.floor(Math.random() * ericScenarios.length)];
                 // Only add if not already in active chats
                 if (!activeChats.find(c => c.scenarioId === scenario.id)) {
                      activeChats.push({
                          id: Math.random().toString(36).substr(2, 9),
                          scenarioId: scenario.id,
                          sender: scenario.sender,
                          message: scenario.message,
                          responses: scenario.responses,
                          timestamp: now,
                          isUrgent: false
                      });
                      rival.lastMockTick = current.tick;
                 }
              }
          }
      }

      const spawnChance = 0.005 + (current.dashboards * 0.002);
      if (Math.random() < spawnChance && activeChats.length < 5) {
          const nonEricScenarios = CHAT_SCENARIOS.filter(s => s.sender !== "10x Engineer Eric");
          const scenario = nonEricScenarios[Math.floor(Math.random() * nonEricScenarios.length)];
          if (scenario) { // Safety check
            activeChats.push({
                id: Math.random().toString(36).substr(2, 9),
                scenarioId: scenario.id,
                sender: scenario.sender,
                message: scenario.message,
                responses: scenario.responses,
                timestamp: now,
                isUrgent: false
            });
          }
      }

      // 6. Market Mechanics
      let market = { ...current.market };
      let crashOccurred = false;

      // Unlock market if PU is high enough
      if (!market.unlocked && current.pu > 500) {
          market.unlocked = true;
      }

      if (market.unlocked && current.tick % 5 === 0) { // Update price every second-ish (every 5 ticks)
          // True value approx 1 TU = $10 ?
          const trueValue = Math.max(1, current.tu * 5);
          
          // Hype factor
          const hype = Math.log10(Math.max(1, current.pu)) * 5;
          
          // Entropy Volatility
          const volatility = (current.worldStats.entropy / 100) * (Math.random() - 0.5) * 10;
          
          let targetPrice = trueValue + hype + volatility;
          
          // Smooth movement
          const drift = (targetPrice - market.stockPrice) * 0.1;
          const newPrice = Math.max(1, market.stockPrice + drift);
          
          market.lastPriceDelta = newPrice - market.stockPrice;
          market.stockPrice = newPrice;
          
          // Check Bubble Crash
          // If Price is 3x True Value and Entropy > 80
          if (market.stockPrice > trueValue * 3 && current.worldStats.entropy > 80 && Math.random() < 0.05) {
              // CRASH
              market.stockPrice = market.stockPrice * 0.3; // Drop 70%
              crashOccurred = true;
          }

          // Update History
          market.history = [...market.history, { tick: current.tick, price: market.stockPrice, trueValue }].slice(-30);
      }

      // 7. Board Meeting Logic
      let meetingState = { ...current.boardMeeting };
      let newLog = null;
      if (crashOccurred) {
          newLog = { id: Date.now(), text: "MARKET CRASH DETECTED! Stock value plummeted.", type: 'danger', timestamp: Date.now() };
      }

      const shouldTriggerMeeting = 
          !meetingState.active && 
          (current.tick === INITIAL_MEETING_TICK || (current.tick > INITIAL_MEETING_TICK && (current.tick - INITIAL_MEETING_TICK) % MEETING_INTERVAL_TICKS === 0));

      if (shouldTriggerMeeting) {
          const ratePerSec = puGain * (1000/TICK_RATE_MS);
          const target = Math.max(100, Math.floor(ratePerSec * MEETING_DURATION_SEC * 1.5));
          
          meetingState = {
              active: true,
              target: target,
              progress: 0,
              timeRemaining: MEETING_DURATION_SEC,
              penaltyEndTime: current.boardMeeting.penaltyEndTime
          };
          
          newLog = { id: Date.now(), text: "URGENT: Board Meeting started! Hit the PU targets!", type: 'warning', timestamp: Date.now() };
      }

      if (meetingState.active) {
          if (puGain > 0) meetingState.progress += puGain;
          if (current.tick % 5 === 0) meetingState.timeRemaining -= 1;
          if (meetingState.progress >= meetingState.target) {
              meetingState.active = false;
              const fundingBonus = meetingState.target * 2;
              newLog = { id: Date.now(), text: `Board Meeting Successful. Series Funding Secured: +${fundingBonus} PU.`, type: 'success', timestamp: Date.now() };
              puGain += fundingBonus;
          } else if (meetingState.timeRemaining <= 0) {
              meetingState.active = false;
              meetingState.penaltyEndTime = current.tick + 300;
              newLog = { id: Date.now(), text: "Meeting Failed. Board orders restructuring. Production halved for 60s.", type: 'danger', timestamp: Date.now() };
          }
      }

      // 8. Event System Check
      let newActiveEvents = current.activeEvents;
      let newEventHistory = current.eventHistory;
      
      if (current.activeEvents.length === 0 && current.tick % 5 === 0) { 
        const availableEvents = EVENTS.filter(e => !current.eventHistory.includes(e.id));
        for (const event of availableEvents) {
          if (event.condition(current)) {
            newActiveEvents = [...newActiveEvents, event];
            newEventHistory = [...newEventHistory, event.id];
            break; 
          }
        }
      }

      // 9. Update History
      let newHistory = current.history;
      if (current.tick % 5 === 0) {
        newHistory = [...current.history, {
          tick: current.tick,
          pu: current.pu,
          tu: current.tu,
          revenue: current.worldStats.economy * 1000
        }].slice(-HISTORY_LENGTH);
      }
      
      // 10. Process Blocking Task
      let blockingTask = current.blockingTask;
      let blockingLog = null;
      let stateDeltaFromTask = {};
      
      if (blockingTask) {
          const endTick = blockingTask.startTick + blockingTask.durationTicks;
          if (current.tick >= endTick) {
              // Task Finished
              const chat = activeChats.find(c => c.id === blockingTask?.chatId);
              if (chat && chat.responses[blockingTask.responseIndex]) {
                  const response = chat.responses[blockingTask.responseIndex];
                  // Apply effect now
                  const effectState = response.effect(current);
                  stateDeltaFromTask = effectState;
                  
                  // Add Log
                  let logType: 'success' | 'warning' | 'info' = 'info';
                  if (response.type === 'truth') logType = 'warning';
                  if (response.type === 'corporate') logType = 'success';
                  
                  blockingLog = { id: Date.now(), text: `Task Complete: "${response.label}" for ${chat.sender}.`, type: logType, timestamp: Date.now() };

                  // Remove Chat
                  activeChats = activeChats.filter(c => c.id !== blockingTask?.chatId);
              }
              blockingTask = null; // Clear task
          }
      }

      // Random Flavor Text (approx every 150 ticks -> 30s)
      if (Math.random() < 0.007 && !blockingTask) {
          const flavor = TERMINAL_FLAVOR_TEXT[Math.floor(Math.random() * TERMINAL_FLAVOR_TEXT.length)];
          // Only add if not recently added to avoid spam
          if (current.logs.length === 0 || current.logs[0].text !== flavor) {
              // @ts-ignore
              newLog = { id: Date.now() + Math.random(), text: flavor, type: 'system', timestamp: Date.now() };
          }
      }
      
      let nextLogs = current.logs;
      if (newLog) {
           // @ts-ignore
           nextLogs = [newLog, ...current.logs].slice(0, 100);
      }
      if (blockingLog) {
           // @ts-ignore
           nextLogs = [blockingLog, ...nextLogs].slice(0, 100);
      }

      // Expired Campaigns Logs
      const expiredCampaigns = current.activeCampaigns.filter(c => c.timeLeft === 1); // About to expire
      expiredCampaigns.forEach(c => {
          // @ts-ignore
          nextLogs = [{ id: Date.now() + Math.random(), text: `Campaign "${c.name}" finished. Total Raw Data: ${c.generatedRaw}.`, type: 'info', timestamp: Date.now() }, ...nextLogs];
      });


      setState(prev => ({
        ...prev,
        tick: prev.tick + 1,
        rawData: finalRawData,
        cleanData: prev.cleanData + cleanDataDelta - metricDelta,
        metrics: prev.metrics + metricDelta,
        complexity: newComplexity,
        observability: newObservability,
        packetLoss: instantaneousLoss,
        pu: Math.max(0, prev.pu + puGain),
        tu: Math.max(0, prev.tu + tuChange),
        worldStats: {
          ...prev.worldStats,
          entropy: Math.min(100, Math.max(0, prev.worldStats.entropy + entropyChange)),
          economy: prev.worldStats.economy + economyDrift,
        },
        market: market,
        activeChats: activeChats,
        boardMeeting: meetingState,
        activeEvents: newActiveEvents,
        eventHistory: newEventHistory,
        history: newHistory,
        logs: nextLogs,
        activeCampaigns: activeCampaigns,
        blockingTask: blockingTask,
        rival: rival,
        ...stateDeltaFromTask,
        ...arriveAIReview(prev, prev.tick + 1),
        ...arriveProductWrite(prev, prev.tick + 1)
      }));

    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, [isRebooting]);

  // Actions
  // Future progression callers must begin a transition before establishing its era.
  const beginExpansionTransition = useCallback((targetEra: ExpansionEra, step: string) => {
    setState(prev => {
      if (prev.isAscending || !isExpansionEra(targetEra) || !step.trim()) return prev;
      if (prev.expansionProgress.transition || prev.expansionProgress.era === targetEra) return prev;
      if (targetEra === 'ai_pilot' && (prev.expansionProgress.era !== 'analyst' ||
          step !== 'automation_recognized' || !isAIPilotEligible(prev))) return prev;
      if (targetEra === 'acceleration' && (prev.expansionProgress.era !== 'ai_pilot' ||
          step !== 'continuous_demand_offer' || prev.aiReviewQueue.wave !== 2 ||
          prev.aiReviewQueue.pending !== 0 || prev.aiReviewQueue.completed !== 6 || prev.aiReviewDemand.active)) return prev;
      if (targetEra === 'connected_enterprise' && (prev.expansionProgress.era !== 'acceleration' ||
          prev.schemaBatchReview.batchesCompleted < 2 || step !== 'read_connection_offer')) return prev;
      if (targetEra === 'governance_crisis' && (!isSourceDriftEligible(prev) || step !== 'source_drift_detected')) return prev;
      if (targetEra === 'lightspeed' && (!isBatchRoutingEligible(prev) || step !== 'batch_routing_offer')) return prev;
      if (targetEra === 'good_enough' && (!isWritePilotEligible(prev) || step !== 'write_access_offer')) return prev;
      return {
        ...prev,
        expansionProgress: { ...prev.expansionProgress, transition: { targetEra, step } },
        ...(targetEra === 'governance_crisis' ? { connectedEnterprise: { ...prev.connectedEnterprise,
          sourceDriftIncident: { ...INITIAL_STATE.connectedEnterprise.sourceDriftIncident, active: true } } } : {}),
      };
    });
  }, []);

  const establishExpansionEra = (targetEra: ExpansionEra) => {
    setState(prev => {
      if (!isExpansionEra(targetEra)) return prev;
      // AI establishment belongs exclusively to the acknowledged first-queue result below.
      if (targetEra === 'ai_pilot' || targetEra === 'acceleration' || targetEra === 'connected_enterprise' || targetEra === 'good_enough' || targetEra === 'lightspeed' || targetEra === 'governance_crisis') return prev;
      if (prev.expansionProgress.transition?.targetEra !== targetEra) return prev;
      return {
        ...prev,
        expansionProgress: { ...prev.expansionProgress, era: targetEra, transition: null },
      };
    });
  };

  const eligibleForPilot = isAIPilotEligible(state);
  useEffect(() => {
    if (!state.isAscending && state.expansionProgress.era === 'analyst' && !state.expansionProgress.transition && eligibleForPilot) {
      beginExpansionTransition('ai_pilot', 'automation_recognized');
    }
  }, [eligibleForPilot, state.expansionProgress, state.isAscending, beginExpansionTransition]);

  // Recover a fully cleared finite wave from pre-S4 saves without replaying six jobs.
  useEffect(() => {
    if (!state.isAscending && state.expansionProgress.era === 'ai_pilot' && !state.expansionProgress.transition &&
        state.aiReviewQueue.wave === 2 && state.aiReviewQueue.pending === 0 && state.aiReviewQueue.completed === 6 && !state.aiReviewDemand.active) {
      beginExpansionTransition('acceleration', 'continuous_demand_offer');
    }
  }, [state.isAscending, state.expansionProgress, state.aiReviewQueue, state.aiReviewDemand.active, beginExpansionTransition]);

  useEffect(() => {
    if (!state.isAscending && state.expansionProgress.era === 'acceleration' && state.expansionProgress.transition === null && state.schemaBatchReview.batchesCompleted >= 2) {
      beginExpansionTransition('connected_enterprise', 'read_connection_offer');
    }
  }, [state.isAscending, state.expansionProgress, state.schemaBatchReview.batchesCompleted, beginExpansionTransition]);

  useEffect(() => {
    if (!state.isAscending && isWritePilotEligible(state)) beginExpansionTransition('good_enough', 'write_access_offer');
  }, [state.isAscending, state.expansionProgress, state.connectedEnterprise, beginExpansionTransition]);

  useEffect(() => {
    if (!state.isAscending && isBatchRoutingEligible(state)) beginExpansionTransition('lightspeed', 'batch_routing_offer');
  }, [state.isAscending, state.expansionProgress, state.connectedEnterprise, beginExpansionTransition]);

  useEffect(() => {
    if (!state.isAscending && isSourceDriftEligible(state)) beginExpansionTransition('governance_crisis', 'source_drift_detected');
  }, [state.isAscending, state.expansionProgress, state.connectedEnterprise, beginExpansionTransition]);

  const pendingPilot = state.expansionProgress.transition;
  const pilotStep = pendingPilot?.targetEra === 'ai_pilot'
    ? AI_PILOT_STEPS.find(step => step === pendingPilot.step) ?? null
    : null;
  const canPresentPilotIntroduction = (snapshot: GameState, approvingWrite = false) =>
    (approvingWrite || !productWriteAttemptRef.current) && !isRebooting && !snapshot.isAscending && !snapshot.blockingTask &&
    !snapshot.coffeeBreak.active && !snapshot.boardMeeting.active && snapshot.activeEvents.length === 0 &&
    !snapshot.spaghettiMode && !snapshot.pandasMode && !snapshot.sqlMode && !snapshot.modelMode &&
    !snapshot.miningMode && !snapshot.flowMode && !snapshot.buzzwordMode && !snapshot.pdfMode;

  const advancePilotIntroduction = (expectedStep: AIPilotStep) => {
    setState(prev => {
      const transition = prev.expansionProgress.transition;
      if (!canPresentPilotIntroduction(prev) || transition?.targetEra !== 'ai_pilot' ||
          transition.step !== expectedStep) return prev;
      if (expectedStep === 'demand_pending' && prev.expansionProgress.era === 'automation' && prev.aiReviewQueue.wave === 0) {
        return { ...prev, aiReviewQueue: { pending: 3, completed: 0, wave: 1 },
          expansionProgress: { ...prev.expansionProgress, transition: { ...transition, step: 'rollout_review' } } };
      }
      if (expectedStep === 'rollout_success' && prev.expansionProgress.era === 'automation' &&
          prev.aiReviewQueue.wave === 1 && prev.aiReviewQueue.pending === 0 && prev.aiReviewQueue.completed === 3) {
        return { ...prev, aiReviewQueue: { pending: 6, completed: 0, wave: 2 },
          expansionProgress: { ...prev.expansionProgress, era: 'ai_pilot', transition: null } };
      }
      if (expectedStep !== 'automation_recognized' && expectedStep !== 'pilot_announced' && expectedStep !== 'pilot_success') return prev;
      if (prev.expansionProgress.era !== 'analyst' && prev.expansionProgress.era !== 'automation') return prev;
      if (expectedStep === 'pilot_success' && prev.expansionProgress.era !== 'automation') return prev;
      return {
        ...prev,
        expansionProgress: {
          ...prev.expansionProgress,
          era: 'automation',
          transition: { ...transition, step: expectedStep === 'automation_recognized' ? 'pilot_announced' : expectedStep === 'pilot_announced' ? 'pilot_ready' : 'demand_pending' },
        },
      };
    });
  };

  const acknowledgeOperationalRollout = () => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || prev.expansionProgress.era !== 'ai_pilot' ||
          prev.expansionProgress.transition?.targetEra !== 'acceleration' || prev.expansionProgress.transition.step !== 'continuous_demand_offer' ||
          prev.aiReviewQueue.wave !== 2 || prev.aiReviewQueue.pending !== 0 || prev.aiReviewQueue.completed !== 6 || prev.aiReviewDemand.active) return prev;
      return { ...prev, aiReviewQueue: { pending: 4, completed: 0, wave: 3 },
        aiReviewDemand: { ...INITIAL_STATE.aiReviewDemand, active: true, nextArrivalTick: prev.tick + INITIAL_STATE.aiReviewDemand.arrivalIntervalTicks },
        expansionProgress: { ...prev.expansionProgress, transition: { ...prev.expansionProgress.transition, step: 'continuous_demand_active' } } };
    });
  };

  const accelerationFeedbackStep = (snapshot: GameState): 'pressure_visible' | 'review_bottleneck_visible' | null => {
    const transition = snapshot.expansionProgress.transition;
    return snapshot.expansionProgress.era === 'ai_pilot' && hasContinuousAIReviewDemand(snapshot) &&
      transition?.targetEra === 'acceleration' && (transition.step === 'pressure_visible' || transition.step === 'review_bottleneck_visible')
        ? transition.step : null;
  };

  const acknowledgeAccelerationUpdate = (expectedStep: 'pressure_visible' | 'review_bottleneck_visible') => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || accelerationFeedbackStep(prev) !== expectedStep) return prev;
      if (expectedStep === 'pressure_visible') {
        return { ...prev, aiReviewDemand: { ...prev.aiReviewDemand,
          arrivalIntervalTicks: AI_REVIEW_ACCELERATED_INTERVAL_TICKS,
          nextArrivalTick: prev.tick + AI_REVIEW_ACCELERATED_INTERVAL_TICKS,
          acceleratedArrivals: 0, acceleratedReviews: 0, acceleratedPeakPending: prev.aiReviewQueue.pending },
          expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'acceleration', step: 'accelerated_routing_active' } } };
      }
      return { ...prev, expansionProgress: { ...prev.expansionProgress, era: 'acceleration', transition: null } };
    });
  };

  const schemaFeedbackStep = (snapshot: GameState): 'schema_introduction' | 'schema_first_result' | null => {
    if (!isSchemaBatchEligible(snapshot)) return null;
    const batch = snapshot.schemaBatchReview;
    if (!batch.introduced && !batch.active && batch.batchesCompleted === 0) return 'schema_introduction';
    return batch.introduced && !batch.active && batch.batchesCompleted === 1 && batch.exceptionsResolved === 5
      ? 'schema_first_result' : null;
  };

  const acknowledgeSchemaUpdate = (expectedStep: 'schema_introduction' | 'schema_first_result') => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || schemaFeedbackStep(prev) !== expectedStep) return prev;
      const batchSize = expectedStep === 'schema_introduction' ? 2400 : 12000;
      return { ...prev, schemaBatchReview: { ...prev.schemaBatchReview, introduced: true, active: true,
        batchSize, autoMapped: batchSize - 5, exceptionsTotal: 5, exceptionsResolved: 0 } };
    });
  };

  const openSchemaBatchReview = () => {
    const current = stateRef.current;
    const connected = isConnectedMappingActive(current);
    if ((!connected && !isSchemaBatchActive(current)) || current.rawData < 20 || !canPresentPilotIntroduction(current) || schemaBatchAttemptRef.current) return;
    const attempt: SchemaBatchAttempt = { id: ++schemaBatchSequence.current, kind: connected ? 'connected' : 'schema', batchesCompleted: current.schemaBatchReview.batchesCompleted,
      fieldIds: Array.from({ length: RAW_HEADERS.length }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, connected ? 3 : 5) };
    schemaBatchAttemptRef.current = attempt;
    setSchemaBatchAttempt(attempt);
    setState(prev => (attempt.kind === 'connected' ? isConnectedMappingActive(prev) : isSchemaBatchActive(prev)) && canPresentPilotIntroduction(prev) && prev.rawData >= 20 &&
      prev.schemaBatchReview.batchesCompleted === attempt.batchesCompleted ? { ...prev, pandasMode: true,
        ...(connected ? { connectedEnterprise: { ...prev.connectedEnterprise, readUses: Math.max(1, prev.connectedEnterprise.readUses) } } : {}) } : prev);
  };

  const closeSchemaBatchReview = (attemptId: number) => {
    if (schemaBatchAttemptRef.current?.id !== attemptId) return;
    schemaBatchAttemptRef.current = null;
    setSchemaBatchAttempt(null);
    setState(prev => ({ ...prev, pandasMode: false }));
  };

  const completeSchemaBatchReview = (attemptId: number, mappings: { rawId: number; cleanId: number }[], mistakes: number) => {
    // Capture issued authority before the presentation closes and clears its transient ref.
    const attempt = schemaBatchAttemptRef.current;
    setState(prev => {
      if (isRebooting || prev.isAscending || !attempt || !(attempt.kind === 'connected' ? isConnectedMappingActive(prev) : isSchemaBatchActive(prev)) || !prev.pandasMode || attempt.id !== attemptId ||
          attempt.batchesCompleted !== prev.schemaBatchReview.batchesCompleted || !Number.isSafeInteger(mistakes) || mistakes < 0 ||
          !Array.isArray(mappings) || mappings.length !== attempt.fieldIds.length || new Set(mappings.map(pair => pair?.rawId)).size !== attempt.fieldIds.length ||
          !mappings.every(pair => pair && pair.rawId === pair.cleanId && attempt.fieldIds.includes(pair.rawId)) || prev.rawData < 20) return prev;
      const qualityBonus = Math.max(0.01, 0.05 - mistakes * 0.01);
      return { ...prev, rawData: prev.rawData - 20, cleanData: prev.cleanData + 50 * (1 + prev.prestige.level * 0.1),
        metricQuality: Math.min(1.0, prev.metricQuality + qualityBonus),
        logs: [...prev.logs, { id: Date.now(), text: `Schema Mapping Complete. Quality +${(qualityBonus * 100).toFixed(0)}%.`, type: 'success', timestamp: Date.now() }],
        ...(attempt.kind === 'connected' ? {
          connectedEnterprise: { ...prev.connectedEnterprise, mappingBatch: { active: false, completed: true } },
          expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'connected_enterprise', step: 'connected_mapping_success' } },
        } : { schemaBatchReview: { ...prev.schemaBatchReview, active: false, exceptionsResolved: 5, batchesCompleted: prev.schemaBatchReview.batchesCompleted + 1 } }) };
    });
  };

  const connectedFeedbackStep = (snapshot: GameState): 'read_connection_offer' | 'connected_mapping_success' | null => {
    const transition = snapshot.expansionProgress.transition;
    if (snapshot.expansionProgress.era !== 'acceleration' || transition?.targetEra !== 'connected_enterprise') return null;
    if (transition.step === 'read_connection_offer' && !snapshot.connectedEnterprise.productDb.connected) return 'read_connection_offer';
    return transition.step === 'connected_mapping_success' && snapshot.connectedEnterprise.mappingBatch.completed &&
      snapshot.connectedEnterprise.productDb.connected && snapshot.connectedEnterprise.productDb.access === 'read' && snapshot.connectedEnterprise.readUses >= 1
        ? 'connected_mapping_success' : null;
  };

  const connectProductDb = (requestedAccess: string) => {
    setState(prev => {
      if (requestedAccess !== 'read' || !canPresentPilotIntroduction(prev) || connectedFeedbackStep(prev) !== 'read_connection_offer') return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, productDb: { connected: true, access: 'read' }, mappingBatch: { active: true, completed: false } },
        expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'connected_enterprise', step: 'product_db_read_connected' } } };
    });
  };

  const acknowledgeConnectedResult = () => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || connectedFeedbackStep(prev) !== 'connected_mapping_success') return prev;
      return { ...prev, expansionProgress: { ...prev.expansionProgress, era: 'connected_enterprise', transition: null } };
    });
  };

  const writeFeedbackStep = (snapshot: GameState): 'write_access_offer' | 'write_pilot_success' | null => {
    const transition = snapshot.expansionProgress.transition;
    const connected = snapshot.connectedEnterprise;
    if (snapshot.expansionProgress.era !== 'connected_enterprise' || transition?.targetEra !== 'good_enough' || !connected.productDb.connected) return null;
    if (transition.step === 'write_access_offer' && connected.productDb.access === 'read' && connected.mappingBatch.completed && connected.readUses >= 1) return 'write_access_offer';
    return transition.step === 'write_pilot_success' && connected.productDb.access === 'read_write' &&
      !connected.productWritePilot.active && connected.productWritePilot.total === 5 && connected.productWritePilot.pending === 0 &&
      connected.productWritePilot.completed === 5 && connected.writeUses === 5 ? 'write_pilot_success' : null;
  };

  const grantProductWrite = (requestedAccess: string) => {
    setState(prev => {
      if (requestedAccess !== 'read_write' || !canPresentPilotIntroduction(prev) || writeFeedbackStep(prev) !== 'write_access_offer') return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, productDb: { connected: true, access: 'read_write' },
        writeUses: 0, productWritePilot: { active: true, pending: 5, completed: 0, total: 5 } },
        expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'write_pilot_active' } } };
    });
  };

  const openProductWriteReview = () => {
    const current = stateRef.current;
    if (!isWritePilotActive(current) || !canPresentPilotIntroduction(current)) return;
    const attempt: ProductWriteAttempt = { id: ++productWriteSequence.current, kind: 'pilot', index: current.connectedEnterprise.productWritePilot.completed };
    productWriteAttemptRef.current = attempt;
    setProductWriteAttempt(attempt);
  };

  const openNextProductWrite = () => {
    const current = stateRef.current;
    if (!isProductWriteQueueActive(current) || current.connectedEnterprise.productWriteQueue.pending <= 0 || !canPresentPilotIntroduction(current)) return;
    const attempt: ProductWriteAttempt = { id: ++productWriteSequence.current, kind: 'queue', index: current.connectedEnterprise.productWriteQueue.completed };
    productWriteAttemptRef.current = attempt;
    setProductWriteAttempt(attempt);
  };

  const closeProductWriteReview = (attemptId: number) => {
    if (productWriteAttemptRef.current?.id !== attemptId) return;
    productWriteAttemptRef.current = null;
    setProductWriteAttempt(null);
  };

  const applyProductWrite = (attemptId: number) => {
    const attempt = productWriteAttemptRef.current;
    if (!attempt || attempt.id !== attemptId) return;
    // Consume transient approval authority before a duplicate click can reuse it.
    productWriteAttemptRef.current = null;
    setProductWriteAttempt(null);
    setState(prev => {
      if (attempt.kind === 'policy_trial') {
        const policy = prev.connectedEnterprise.productWritePolicy;
        const indices = reviewClassIndices(policy);
        if (!isPolicyTrialActive(prev) || !canPresentPilotIntroduction(prev, true) || attempt.index !== indices[policy.trial.manualApproved]) return prev;
        const proposal = getPolicyTrialProductWriteProposal(attempt.index);
        const trial = { ...policy.trial, manualApproved: policy.trial.manualApproved + 1, manualPending: policy.trial.manualPending - 1,
          active: policy.trial.manualPending > 1 };
        return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, writeUses: prev.connectedEnterprise.writeUses + 1,
          productWritePolicy: { ...policy, trial } },
          logs: [...prev.logs, { id: Date.now(), text: `Product DB policy trial applied: ${proposal.record}.${proposal.field} (${JSON.stringify(proposal.current)} → ${JSON.stringify(proposal.proposed)})`, type: 'success', timestamp: Date.now() }],
          ...(trial.manualPending === 0 && trial.autoApplied + trial.manualApproved === 5 ? {
            expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'policy_trial_success' } } } : {}) };
      }
      if (attempt.kind === 'queue') {
        const queue = prev.connectedEnterprise.productWriteQueue;
        if (!isProductWriteQueueActive(prev) || !canPresentPilotIntroduction(prev, true) || queue.pending <= 0 || attempt.index !== queue.completed) return prev;
        const scale = prev.connectedEnterprise.productWriteScale;
        const refill = scale.active && scale.reviewBacklog > 0 ? 1 : 0;
        if (scale.active && ![prev.connectedEnterprise.writeUses + 1, queue.completed + 1,
          prev.connectedEnterprise.productWritePolicy.manualCompleted + 1].every(Number.isSafeInteger)) return prev;
        const proposal = queueWriteProposal(prev, attempt.index);
        const next = { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, writeUses: prev.connectedEnterprise.writeUses + 1,
          productWriteQueue: { ...queue, pending: queue.pending - 1 + refill, completed: queue.completed + 1 },
          productWriteScale: { ...scale, reviewBacklog: scale.reviewBacklog - refill },
          productWritePolicy: prev.connectedEnterprise.productWritePolicy.active ? { ...prev.connectedEnterprise.productWritePolicy,
            legacyPending: Math.max(0, prev.connectedEnterprise.productWritePolicy.legacyPending - 1),
            manualCompleted: prev.connectedEnterprise.productWritePolicy.manualCompleted + (prev.connectedEnterprise.productWritePolicy.legacyPending === 0 ? 1 : 0) }
            : prev.connectedEnterprise.productWritePolicy },
          logs: [...prev.logs, { id: Date.now(), text: `Product DB update applied: ${proposal.record}.${proposal.field} (${JSON.stringify(proposal.current)} → ${JSON.stringify(proposal.proposed)})`, type: 'success' as const, timestamp: Date.now() }] };
        return { ...next, expansionProgress: productWritePressureProof(next) };
      }
      if (!isWritePilotActive(prev) || !canPresentPilotIntroduction(prev, true) || attempt.index !== prev.connectedEnterprise.productWritePilot.completed) return prev;
      const proposal = PRODUCT_WRITE_PROPOSALS[attempt.index];
      if (!proposal) return prev;
      const completed = attempt.index + 1;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, writeUses: prev.connectedEnterprise.writeUses + 1,
        productWritePilot: { active: completed < 5, total: 5, completed, pending: 5 - completed } },
        logs: [...prev.logs, { id: Date.now(), text: `Product DB update applied: ${proposal.record}.${proposal.field} (${JSON.stringify(proposal.current)} → ${JSON.stringify(proposal.proposed)})`, type: 'success', timestamp: Date.now() }],
        ...(completed === 5 ? { expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'write_pilot_success' } } } : {}) };
    });
  };

  const acknowledgeWriteResult = () => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || writeFeedbackStep(prev) !== 'write_pilot_success') return prev;
      return { ...prev, expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'approval_rollout_ready' } } };
    });
  };

  const writeQueueFeedbackStep = (snapshot: GameState): 'approval_rollout_ready' | 'approval_bottleneck_visible' | null => {
    const transition = snapshot.expansionProgress.transition;
    if (snapshot.expansionProgress.era !== 'connected_enterprise' || transition?.targetEra !== 'good_enough' || !hasWritePilotProof(snapshot)) return null;
    const queue = snapshot.connectedEnterprise.productWriteQueue;
    if (transition.step === 'approval_rollout_ready' && !queue.active && queue.pending === 0 && queue.completed === 0 && queue.totalArrived === 0) return 'approval_rollout_ready';
    return transition.step === 'approval_bottleneck_visible' && isProductWriteQueueActive(snapshot) &&
      queue.completed >= 5 && (queue.peakPending >= 18 || queue.totalArrived >= 10) ? 'approval_bottleneck_visible' : null;
  };

  const acknowledgeWriteQueueUpdate = (expectedStep: 'approval_rollout_ready' | 'approval_bottleneck_visible') => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || writeQueueFeedbackStep(prev) !== expectedStep) return prev;
      if (expectedStep === 'approval_rollout_ready') {
        return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, productWriteQueue: { active: true,
          pending: PRODUCT_WRITE_QUEUE_INITIAL, completed: 0, totalArrived: 0, peakPending: PRODUCT_WRITE_QUEUE_INITIAL,
          arrivalIntervalTicks: PRODUCT_WRITE_QUEUE_INTERVAL_TICKS, nextArrivalTick: prev.tick + PRODUCT_WRITE_QUEUE_INTERVAL_TICKS } },
          expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'approval_queue_active' } } };
      }
      return { ...prev, expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'approval_policy_offer' } } };
    });
  };

  const writePolicyFeedbackStep = (snapshot: GameState): 'approval_policy_offer' | 'policy_trial_success' | null => {
    if (policyTrialStep(snapshot) === 'approval_policy_offer' && isProductWriteQueueActive(snapshot) && !snapshot.connectedEnterprise.productWritePolicy.configured) return 'approval_policy_offer';
    const trial = snapshot.connectedEnterprise.productWritePolicy.trial;
    return policyTrialStep(snapshot) === 'policy_trial_success' && hasPolicyTrialProof(snapshot) && !trial.active &&
      trial.manualPending === 0 && trial.autoApplied + trial.manualApproved === 5 ? 'policy_trial_success' : null;
  };
  const confirmProductWritePolicy = (selected: ProductWriteClass[]) => {
    setState(prev => {
      if (!Array.isArray(selected) || selected.some(value => !PRODUCT_WRITE_AUTO_CLASSES.includes(value as typeof PRODUCT_WRITE_AUTO_CLASSES[number])) ||
        !canPresentPilotIntroduction(prev) || writePolicyFeedbackStep(prev) !== 'approval_policy_offer') return prev;
      const autoClasses = PRODUCT_WRITE_AUTO_CLASSES.filter(value => selected.includes(value));
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise, writeUses: prev.connectedEnterprise.writeUses + autoClasses.length,
        productWritePolicy: { ...INITIAL_STATE.connectedEnterprise.productWritePolicy, configured: true, autoClasses,
          trial: { active: true, total: 5, autoApplied: autoClasses.length, manualPending: 5 - autoClasses.length, manualApproved: 0 } } },
        expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'good_enough', step: 'policy_trial_active' } } };
    });
  };
  const openPolicyTrialWrite = () => {
    const current = stateRef.current;
    if (!isPolicyTrialActive(current) || !canPresentPilotIntroduction(current)) return;
    const attempt: ProductWriteAttempt = { id: ++productWriteSequence.current, kind: 'policy_trial',
      index: reviewClassIndices(current.connectedEnterprise.productWritePolicy)[current.connectedEnterprise.productWritePolicy.trial.manualApproved] };
    productWriteAttemptRef.current = attempt;
    setProductWriteAttempt(attempt);
  };
  const acknowledgeProductWritePolicy = () => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || writePolicyFeedbackStep(prev) !== 'policy_trial_success') return prev;
      return { ...prev, expansionProgress: { era: 'good_enough', transition: null }, connectedEnterprise: { ...prev.connectedEnterprise,
        productWritePolicy: { ...prev.connectedEnterprise.productWritePolicy, active: true, legacyPending: prev.connectedEnterprise.productWriteQueue.pending } } };
    });
  };

  const writeScaleFeedbackStep = (snapshot: GameState): 'batch_routing_offer' | 'batch_scale_visible' | null => {
    if (!isProductWriteQueueActive(snapshot)) return null;
    const scale = snapshot.connectedEnterprise.productWriteScale;
    if (batchRoutingStep(snapshot) === 'batch_routing_offer' && !scale.active) return 'batch_routing_offer';
    return batchRoutingStep(snapshot) === 'batch_scale_visible' && isProductWriteScaleValid(snapshot) &&
      scale.batchesProcessed >= 3 && scale.totalRouted >= 1500 ? 'batch_scale_visible' : null;
  };
  const acknowledgeProductWriteScale = (expectedStep: 'batch_routing_offer' | 'batch_scale_visible') => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || writeScaleFeedbackStep(prev) !== expectedStep) return prev;
      if (expectedStep === 'batch_routing_offer') {
        if (!Number.isSafeInteger(prev.tick + PRODUCT_WRITE_QUEUE_INTERVAL_TICKS)) return prev;
        return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
          productWriteScale: { ...INITIAL_STATE.connectedEnterprise.productWriteScale, active: true, batchSize: PRODUCT_WRITE_BATCH_SIZE },
          productWriteQueue: { ...prev.connectedEnterprise.productWriteQueue, nextArrivalTick: prev.tick + PRODUCT_WRITE_QUEUE_INTERVAL_TICKS } },
          expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'lightspeed', step: 'batch_routing_active' } } };
      }
      return { ...prev, expansionProgress: { era: 'lightspeed', transition: null } };
    });
  };

  const sourceDriftFeedbackStep = (snapshot: GameState): 'source_drift_detected' | 'customer_impact_visible' | null => {
    if (!hasSourceDriftProof(snapshot)) return null;
    const step = sourceDriftStep(snapshot);
    if (step === 'source_drift_detected') return step;
    return step === 'customer_impact_visible' && snapshot.connectedEnterprise.sourceDriftIncident.customerImpactVisible ? step : null;
  };
  const acknowledgeSourceDrift = (expectedStep: 'source_drift_detected' | 'customer_impact_visible') => {
    setState(prev => {
      if (!canPresentPilotIntroduction(prev) || sourceDriftFeedbackStep(prev) !== expectedStep) return prev;
      if (expectedStep === 'customer_impact_visible') return { ...prev, expansionProgress: { era: 'governance_crisis', transition: null } };
      return { ...prev, expansionProgress: { ...prev.expansionProgress, transition: { targetEra: 'governance_crisis',
        step: prev.connectedEnterprise.sourceDriftIncident.customerImpactVisible ? 'customer_impact_visible' : 'quarantine_monitoring' } } };
    });
  };

  const beginIncidentInvestigation = () => {
    setState(prev => {
      if (!isIncidentInvestigationEligible(prev) || !canPresentPilotIntroduction(prev) || prev.connectedEnterprise.incidentInvestigation.active) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        incidentInvestigation: { active: true, step: 'complaint', rootCauseProven: false } } };
    });
  };
  const inspectIncidentTrace = (expectedStep: IncidentInvestigationStep, candidate: string) => {
    setState(prev => {
      const investigation = prev.connectedEnterprise.incidentInvestigation;
      if (!isIncidentInvestigationEligible(prev) || !canPresentPilotIntroduction(prev) || !investigation.active ||
        investigation.rootCauseProven || investigation.step !== expectedStep || expectedStep === 'root_cause_confirmed') return prev;
      const next = INCIDENT_TRACE_EVIDENCE[expectedStep]?.choices.find(choice => choice.label === candidate)?.next;
      if (!next) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        incidentInvestigation: { ...investigation, step: next } } };
    });
  };
  const confirmIncidentRootCause = () => {
    setState(prev => {
      const investigation = prev.connectedEnterprise.incidentInvestigation;
      if (!isIncidentInvestigationEligible(prev) || !canPresentPilotIntroduction(prev) || !investigation.active ||
        investigation.step !== 'rule' || investigation.rootCauseProven) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        incidentInvestigation: { ...investigation, step: 'root_cause_confirmed', rootCauseProven: true } } };
    });
  };

  const beginSourceRemediation = () => {
    setState(prev => {
      if (!isSourceRemediationAvailable(prev) || !canPresentPilotIntroduction(prev) || prev.connectedEnterprise.sourceDriftRemediation.active) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        sourceDriftRemediation: { ...INITIAL_STATE.connectedEnterprise.sourceDriftRemediation, active: true } } };
    });
  };
  const requestSupplierClarification = () => {
    setState(prev => {
      const repair = prev.connectedEnterprise.sourceDriftRemediation;
      if (!isSourceRemediationAvailable(prev) || !canPresentPilotIntroduction(prev) || !repair.active || repair.step !== 'supplier_clarification' ||
        !prev.connectedEnterprise.sourceDriftIncident.active) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        sourceDriftRemediation: { ...repair, step: 'rule_review', supplierSemanticsConfirmed: true } } };
    });
  };
  const approveSourceWidthRule = () => {
    setState(prev => {
      const repair = prev.connectedEnterprise.sourceDriftRemediation;
      if (!isSourceRemediationAvailable(prev) || !canPresentPilotIntroduction(prev) || !repair.active || repair.step !== 'rule_review' ||
        !repair.supplierSemanticsConfirmed || repair.ruleApproved || !prev.connectedEnterprise.sourceDriftIncident.active) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        sourceDriftRemediation: { ...repair, step: 'backfill_ready', ruleApproved: true },
        sourceDriftIncident: { ...prev.connectedEnterprise.sourceDriftIncident, active: false } } };
    });
  };
  const reprocessSourceQuarantine = () => {
    setState(prev => {
      const repair = prev.connectedEnterprise.sourceDriftRemediation;
      const incident = prev.connectedEnterprise.sourceDriftIncident;
      if (!isSourceRemediationAvailable(prev) || !canPresentPilotIntroduction(prev) || !repair.active || repair.step !== 'backfill_ready' ||
        !repair.ruleApproved || !repair.supplierSemanticsConfirmed || incident.active || incident.affectedProducts <= 0 ||
        !Number.isSafeInteger(prev.connectedEnterprise.writeUses + incident.affectedProducts) ||
        !Number.isSafeInteger(repair.resolvedProducts + incident.affectedProducts)) return prev;
      return { ...prev, connectedEnterprise: { ...prev.connectedEnterprise,
        writeUses: prev.connectedEnterprise.writeUses + incident.affectedProducts,
        sourceDriftRemediation: { ...repair, step: 'remediation_complete', resolvedProducts: repair.resolvedProducts + incident.affectedProducts },
        sourceDriftIncident: { ...incident, affectedProducts: 0 } } };
    });
  };

  const manualClean = () => {
    setState(prev => {
      if (prev.blockingTask) return prev; // Blocked
      if (prev.rawData < 1) return prev;
      const bonus = prev.upgrades['macros'] ? 4 : 0;
      // Prestige Bonus to clicks
      const prestigeBonus = prev.prestige.level * 2;
      // Neural Upgrade: "Neural Interface" gives massive click boost
      const neuralBonus = prev.upgrades['neural_interface'] ? 20 : 0;
      
      const amount = 1 + bonus + prestigeBonus + neuralBonus;
      if (prev.rawData < amount) return prev;
      
      if (Math.random() > 0.9) addLog(`Manual clean: Processed batch of ${amount} records.`, 'info');

      let bm = prev.boardMeeting;
      const puGain = 0.5 * amount * (1 + prev.prestige.level * 0.1);
      if (bm.active) bm = { ...bm, progress: bm.progress + puGain };

      return {
        ...prev,
        rawData: prev.rawData - amount,
        cleanData: prev.cleanData + amount,
        pu: prev.pu + puGain,
        boardMeeting: bm
      };
    });
  };

  const manualAnalyze = () => {
    setState(prev => {
      if (prev.blockingTask) return prev; // Blocked
      if (prev.cleanData < 1) return prev;
      if (Math.random() > 0.9) addLog(`Analysis complete. Correlation found.`, 'success');
      
      let bm = prev.boardMeeting;
      const puGain = 2 * (1 + prev.prestige.level * 0.1);
      if (bm.active) bm = { ...bm, progress: bm.progress + puGain };

      return {
        ...prev,
        cleanData: prev.cleanData - 1,
        metrics: prev.metrics + 1,
        pu: prev.pu + puGain,
        boardMeeting: bm
      };
    });
  };

  const toggleSpaghettiMode = () => setState(prev => (!prev.blockingTask ? { ...prev, spaghettiMode: !prev.spaghettiMode } : prev));
  const togglePandasMode = () => setState(prev => (!prev.blockingTask ? { ...prev, pandasMode: !prev.pandasMode } : prev));
  const toggleSQLMode = () => setState(prev => (!prev.blockingTask ? { ...prev, sqlMode: !prev.sqlMode } : prev));
  const toggleModelMode = () => setState(prev => (!prev.blockingTask ? { ...prev, modelMode: !prev.modelMode } : prev));
  const toggleMiningMode = () => setState(prev => (!prev.blockingTask ? { ...prev, miningMode: !prev.miningMode } : prev));
  const toggleFlowMode = () => setState(prev => (!prev.blockingTask ? { ...prev, flowMode: !prev.flowMode } : prev));
  const toggleBuzzwordMode = () => setState(prev => ({ ...prev, buzzwordMode: !prev.buzzwordMode })); // Usually just closes it
  const togglePDFMode = () => setState(prev => (!prev.blockingTask ? { ...prev, pdfMode: !prev.pdfMode } : prev));

  const cleanSpaghettiStrand = (cost: number, reward: number, puBonus: number) => {
    setState(prev => {
        if (prev.rawData < cost) return prev;
        let bm = prev.boardMeeting;
        const mult = (1 + prev.prestige.level * 0.1);
        if (bm.active) bm = { ...bm, progress: bm.progress + (puBonus * mult) };
        return {
            ...prev,
            rawData: prev.rawData - cost,
            cleanData: prev.cleanData + (reward * mult),
            pu: prev.pu + (puBonus * mult),
            boardMeeting: bm
        };
    });
  };

  const completePandasLevel = (cost: number, reward: number, qualityBonus: number) => {
      setState(prev => {
          if (prev.rawData < cost) return prev;
          const mult = (1 + prev.prestige.level * 0.1);
          return {
              ...prev,
              rawData: prev.rawData - cost,
              cleanData: prev.cleanData + (reward * mult),
              metricQuality: Math.min(1.0, prev.metricQuality + qualityBonus),
              logs: [...prev.logs, { id: Date.now(), text: `Schema Mapping Complete. Quality +${(qualityBonus * 100).toFixed(0)}%.`, type: 'success', timestamp: Date.now() }]
          }
      });
  };

  const completeSQLQuery = (reward: number, puBonus: number) => {
      setState(prev => sqlQueryReward(prev, reward, puBonus));
  };

  const openNextAIReview = () => {
      const current = stateRef.current;
      if (!isAIReviewActive(current) || !canPresentPilotIntroduction(current) || sqlQueueAttempt.current) return;
      const id = ++sqlQueueSequence.current;
      sqlQueueAttempt.current = { id, wave: current.aiReviewQueue.wave, completed: current.aiReviewQueue.completed };
      setSQLQueueAttemptId(id);
      setState(prev => isAIReviewActive(prev) && canPresentPilotIntroduction(prev) &&
          prev.aiReviewQueue.wave === current.aiReviewQueue.wave &&
          prev.aiReviewQueue.completed === current.aiReviewQueue.completed ? { ...prev, sqlMode: true } : prev);
  };

  const completeAIReviewQuery = (attemptId: number) => {
      setState(prev => {
          const attempt = sqlQueueAttempt.current;
          if (!isAIReviewActive(prev) || !prev.sqlMode || !attempt || attempt.id !== attemptId ||
              attempt.wave !== prev.aiReviewQueue.wave || attempt.completed !== prev.aiReviewQueue.completed) return prev;
          const queue = { ...prev.aiReviewQueue, pending: prev.aiReviewQueue.pending - 1, completed: prev.aiReviewQueue.completed + 1 };
          if (hasContinuousAIReviewDemand(prev)) {
              const next = { ...sqlQueryReward(prev, 100, 250), aiReviewQueue: queue,
                  aiReviewDemand: { ...prev.aiReviewDemand, totalCompleted: prev.aiReviewDemand.totalCompleted + 1,
                    ...(hasAcceleratedAIReviewDemand(prev) ? { acceleratedReviews: prev.aiReviewDemand.acceleratedReviews + 1,
                      acceleratedPeakPending: Math.max(prev.aiReviewDemand.acceleratedPeakPending, prev.aiReviewQueue.pending) } : {}) } };
              return { ...next, expansionProgress: continuousDemandProof(next) };
          }
          return { ...sqlQueryReward(prev, 100, 250), aiReviewQueue: queue,
              expansionProgress: queue.wave === 1 && queue.pending === 0
                  ? { ...prev.expansionProgress, transition: { targetEra: 'ai_pilot', step: 'rollout_success' } }
                  : queue.wave === 2 && queue.pending === 0
                    ? { ...prev.expansionProgress, transition: { targetEra: 'acceleration', step: 'continuous_demand_offer' } }
                  : prev.expansionProgress };
      });
  };

  const beginSQLPilotAttempt = () => {
      const current = stateRef.current;
      if (!isSQLPilotReady(current) || !current.sqlMode || current.blockingTask || current.isAscending || isRebooting) return null;
      if (sqlPilotAttempt.current !== null) return sqlPilotAttempt.current;
      sqlPilotAttempt.current = ++sqlPilotAttemptSequence.current;
      return sqlPilotAttempt.current;
  };

  const completeSQLPilotQuery = (attemptId: number) => {
      setState(prev => {
          if (!isSQLPilotReady(prev) || !prev.sqlMode || typeof attemptId !== 'number' ||
              sqlPilotAttempt.current !== attemptId) return prev;
          return {
              ...sqlQueryReward(prev, 100, 250),
              expansionProgress: {
                  ...prev.expansionProgress,
                  transition: { ...prev.expansionProgress.transition!, step: 'pilot_success' },
              },
          };
      });
  };

  const completeModelTraining = (puBonus: number, tuBonus: number, entropyEffect: number) => {
      setState(prev => {
          let bm = prev.boardMeeting;
          const mult = (1 + prev.prestige.level * 0.1);
          if (bm.active) bm = { ...bm, progress: bm.progress + (puBonus * mult) };
          return {
              ...prev,
              models: prev.models + 1,
              pu: prev.pu + (puBonus * mult),
              tu: Math.max(0, prev.tu + (tuBonus * mult)),
              worldStats: { ...prev.worldStats, entropy: Math.min(100, Math.max(0, prev.worldStats.entropy + entropyEffect)) },
              logs: [...prev.logs, { id: Date.now(), text: `Model Deployed. PU +${puBonus}.`, type: tuBonus > 0 ? 'success' : 'warning', timestamp: Date.now() }],
              boardMeeting: bm
          }
      });
  };

  const completeMiningLevel = (metricsReward: number, tuReward: number) => {
      setState(prev => {
          let bm = prev.boardMeeting;
          const mult = (1 + prev.prestige.level * 0.1);
          if (bm.active) bm = { ...bm, progress: bm.progress + (tuReward * 10 * mult) };
          return {
              ...prev,
              metrics: prev.metrics + (metricsReward * mult),
              tu: prev.tu + (tuReward * mult),
              boardMeeting: bm,
              logs: [...prev.logs, { id: Date.now(), text: `Process Analysis Complete. +${tuReward.toFixed(1)} TU.`, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  const completeFlowBatch = (cleanReward: number, entropyReduction: number) => {
      setState(prev => {
          let bm = prev.boardMeeting;
          const mult = (1 + prev.prestige.level * 0.1);
          if (bm.active) bm = { ...bm, progress: bm.progress + (cleanReward * 0.5 * mult) };
          return {
              ...prev,
              cleanData: prev.cleanData + (cleanReward * mult),
              worldStats: { ...prev.worldStats, entropy: Math.max(0, prev.worldStats.entropy - entropyReduction) },
              boardMeeting: bm,
              logs: [...prev.logs, { id: Date.now(), text: `Flow Optimized. Entropy reduced.`, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  const completeBuzzwordBattle = (score: number, stolenData: number) => {
      setState(prev => {
          // If score > 0, we won some respect/data
          // Stolen data comes from Rival
          let stolen = Math.min(prev.rival.cleanData, stolenData);
          
          return {
              ...prev,
              cleanData: prev.cleanData + stolen,
              rival: { ...prev.rival, cleanData: prev.rival.cleanData - stolen },
              pu: prev.pu + (score * 100),
              logs: [...prev.logs, { id: Date.now(), text: `Buzzword Battle: You outsmarted Eric! Stole ${stolen.toFixed(0)} Clean Data.`, type: 'success', timestamp: Date.now() }],
              // Win battle increases Eric's respect
              relationships: { ...prev.relationships, '10x Engineer Eric': (prev.relationships['10x Engineer Eric'] || 0) + 15 }
          }
      });
  };

  const completePDFBatch = (rawReward: number, cleanReward: number) => {
      setState(prev => {
          const mult = (1 + prev.prestige.level * 0.1);
          const actualRaw = rawReward * mult;
          
          let potentialRawData = prev.rawData + actualRaw;
          let lostData = 0;
          if (potentialRawData > prev.maxStorage) {
              lostData = potentialRawData - prev.maxStorage;
              potentialRawData = prev.maxStorage;
          }

          let logs = [...prev.logs];
          if (lostData > 0) {
              logs.unshift({ id: Date.now(), text: `PDF Extraction: Storage Full. Lost ${lostData.toFixed(0)} Units.`, type: 'warning', timestamp: Date.now() });
          } else {
              logs.unshift({ id: Date.now(), text: `PDF Extraction Complete. +${actualRaw.toFixed(0)} Raw Data.`, type: 'success', timestamp: Date.now() });
          }

          return {
              ...prev,
              rawData: potentialRawData,
              cleanData: prev.cleanData + (cleanReward * mult),
              logs
          };
      });
  };

  const resolveChat = (chatId: string, responseIndex: number) => {
      setState(prev => {
          if (prev.blockingTask) return prev; // Cannot reply if busy

          const chat = prev.activeChats.find(c => c.id === chatId);
          if (!chat) return prev;
          if (responseIndex < 0 || responseIndex >= chat.responses.length) return prev;
          
          const response = chat.responses[responseIndex];

          // Relationship Update
          // Corporate = They Like you (+), Truth = They Dislike you (-)
          // Eric Exception: Truth/Challenge = Respect (+), Corporate/Neutral = Disrespect (-)
          let relChange = 0;
          if (chat.sender === "10x Engineer Eric") {
               if (response.type === 'truth') relChange = 10;
               else relChange = -5;
          } else {
               if (response.type === 'corporate') relChange = 10;
               else if (response.type === 'truth') relChange = -10;
          }
          
          const newRel = (prev.relationships[chat.sender] || 0) + relChange;

          // Check for blocking task duration
          if (response.taskDuration && response.taskDuration > 0) {
              return {
                  ...prev,
                  blockingTask: {
                      name: response.label,
                      startTick: prev.tick,
                      durationTicks: response.taskDuration * (1000 / TICK_RATE_MS),
                      chatId: chatId,
                      responseIndex: responseIndex
                  },
                  relationships: { ...prev.relationships, [chat.sender]: newRel }
              };
          }

          // Immediate effect for non-blocking
          const effectState = response.effect(prev);
          let logType: 'success' | 'warning' | 'info' = 'info';
          if (response.type === 'truth') logType = 'warning';
          if (response.type === 'corporate') logType = 'success';
          return {
              ...prev,
              ...effectState,
              activeChats: prev.activeChats.filter(c => c.id !== chatId),
              logs: [...prev.logs, { id: Date.now(), text: `Replied "${response.label}" to ${chat.sender}.`, type: logType, timestamp: Date.now() }],
              relationships: { ...prev.relationships, [chat.sender]: newRel }
          };
      });
  };

  const startCoffeeBreak = () => {
    setState(prev => {
        if (prev.blockingTask) return prev;
        if (prev.tick - prev.lastCoffeeTick < COFFEE_COOLDOWN_TICKS) return prev; // Cooldown active

        // Pick random known character
        const chars = ["Middle Manager Mike", "The CEO", "Karen from Acct", "Sales Guy Steve", "Intern Ian"];
        // Maybe Eric?
        if (prev.rival.active) chars.push("10x Engineer Eric");

        const char = chars[Math.floor(Math.random() * chars.length)];
        const rel = prev.relationships[char] || 0;
        
        let mood: 'happy' | 'neutral' | 'angry' = 'neutral';
        let dialogue = "Mmh. Coffee's decent today.";
        let effectDescription = "You sip coffee. Nothing happens.";
        let effect: Partial<GameState> = {};

        if (rel >= 20) {
            mood = 'happy';
            dialogue = "Hey! Thanks for being a team player recently. Here, I found this data stick.";
            effectDescription = "+100 Clean Data";
            effect = { cleanData: prev.cleanData + 100 };
        } else if (rel <= -20) {
            mood = 'angry';
            dialogue = "Oh, it's you. Watch where you're walking.";
            effectDescription = "They bumped into you. Spilled coffee on server. -50 Clean Data.";
            effect = { cleanData: Math.max(0, prev.cleanData - 50) };
        }

        return {
            ...prev,
            ...effect,
            coffeeBreak: {
                active: true,
                character: char,
                mood,
                dialogue,
                effectDescription
            },
            lastCoffeeTick: prev.tick,
            logs: [...prev.logs, { id: Date.now(), text: `Coffee Break with ${char}. Mood: ${mood.toUpperCase()}.`, type: 'info', timestamp: Date.now() }]
        };
    });
  };

  const endCoffeeBreak = () => {
      setState(prev => ({
          ...prev,
          coffeeBreak: { ...prev.coffeeBreak, active: false }
      }));
  };

  const purchaseUpgrade = (upgrade: Upgrade) => {
    setState(prev => {
      if (upgrade.id === 'project_omniscience' && isAscensionDeferred(prev)) return prev;
      if (prev.blockingTask) return prev;
      if (prev.upgrades[upgrade.id]) return prev; 
      const costAmount = upgrade.cost.amount;
      if (upgrade.cost.resource === 'PU') {
        if (prev.pu < costAmount) return prev;
        const newState = { ...prev, pu: prev.pu - costAmount, upgrades: { ...prev.upgrades, [upgrade.id]: true } };
        const effect = upgrade.effect(newState);
        addLog(`Upgrade: ${upgrade.name} installed.`, 'success');
        return { ...newState, ...effect };
      } 
      else if (upgrade.cost.resource === 'TU') {
         if (prev.tu < costAmount) return prev;
         const newState = { ...prev, tu: prev.tu - costAmount, upgrades: { ...prev.upgrades, [upgrade.id]: true } };
         const effect = upgrade.effect(newState);
         addLog(`System Evolution: ${upgrade.name} initiated.`, 'warning');
         return { ...newState, ...effect };
      }
      else {
        const resKey = upgrade.cost.resource === ResourceType.RawData ? 'rawData' : 
                       upgrade.cost.resource === ResourceType.CleanData ? 'cleanData' : 'metrics';
        // @ts-ignore
        if (prev[resKey] < costAmount) return prev;
        // @ts-ignore
        const newState = { ...prev, [resKey]: prev[resKey] - costAmount, upgrades: { ...prev.upgrades, [upgrade.id]: true } };
        const effect = upgrade.effect(newState);
        addLog(`Upgrade: ${upgrade.name} installed.`, 'success');
        return { ...newState, ...effect };
      }
    });
  };

  const dismissEvent = (eventId: string) => {
      setState(prev => {
         const event = prev.activeEvents.find(e => e.id === eventId);
         if (!event) return prev;
         const effectState = event.effect(prev);
         addLog(`Event: ${event.title} resolved.`, event.type === 'good' ? 'success' : event.type === 'bad' ? 'danger' : 'warning');
         return { ...prev, ...effectState, activeEvents: prev.activeEvents.filter(e => e.id !== eventId) };
      });
  };

  const buyStock = (amount: number) => {
      setState(prev => {
          if (prev.blockingTask) return prev;
          const cost = prev.market.stockPrice * amount;
          if (prev.pu < cost) return prev;
          return {
              ...prev,
              pu: prev.pu - cost,
              market: { ...prev.market, ownedShares: prev.market.ownedShares + amount },
              logs: [...prev.logs, { id: Date.now(), text: `Market: Bought ${amount} shares @ $${prev.market.stockPrice.toFixed(2)}.`, type: 'info', timestamp: Date.now() }]
          };
      });
  };

  const sellStock = (amount: number) => {
      setState(prev => {
          if (prev.blockingTask) return prev;
          if (prev.market.ownedShares < amount) return prev;
          const revenue = prev.market.stockPrice * amount;
          return {
              ...prev,
              pu: prev.pu + revenue,
              market: { ...prev.market, ownedShares: prev.market.ownedShares - amount },
              logs: [...prev.logs, { id: Date.now(), text: `Market: Sold ${amount} shares @ $${prev.market.stockPrice.toFixed(2)}.`, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  // Marketing Actions
  const launchCampaign = (type: CampaignType) => {
      setState(prev => {
          if (prev.blockingTask) return prev;
          let cost = 0;
          let duration = 300; // 60 seconds (300 ticks)
          let name = "";
          
          if (type === 'email') { cost = 100; name = "Cold Email Blast"; }
          if (type === 'social') { cost = 500; name = "Social Media Push"; }
          if (type === 'influencer') { cost = 2000; name = "Influencer Partnership"; }
          if (type === 'tv') { cost = 10000; name = "Superbowl Ad Spot"; }
          
          if (prev.pu < cost) return prev;

          const newCampaign: Campaign = {
              id: Math.random().toString(36),
              name,
              type,
              duration,
              timeLeft: duration,
              cost,
              effectiveness: 1.0,
              generatedRaw: 0,
              generatedPU: 0
          };

          return {
              ...prev,
              pu: prev.pu - cost,
              activeCampaigns: [...prev.activeCampaigns, newCampaign],
              logs: [...prev.logs, { id: Date.now(), text: `Marketing: Launched ${name}.`, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  const boostCampaign = (id: string) => {
      setState(prev => {
          if (prev.blockingTask) return prev;
          const campaign = prev.activeCampaigns.find(c => c.id === id);
          if (!campaign) return prev;
          
          const boostCost = 50; 
          if (prev.cleanData < boostCost) return prev;

          return {
              ...prev,
              cleanData: prev.cleanData - boostCost,
              activeCampaigns: prev.activeCampaigns.map(c => 
                  c.id === id ? { ...c, effectiveness: c.effectiveness + 0.5 } : c
              ),
              logs: [...prev.logs, { id: Date.now(), text: `Marketing: Boosted ${campaign.name} targeting.`, type: 'success', timestamp: Date.now() }]
          };
      });
  };

  const hardReset = () => {
    setIsRebooting(true);
    setTimeout(() => {
        localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }, 2000);
  };

  const ascend = () => {
      // Preserve an already-open ending, including older mixed ending/expansion saves.
      if (isAscensionDeferred(stateRef.current) && !stateRef.current.isAscending) return;
      // Step 1: Trigger Reboot UI
      setIsRebooting(true);

      // Step 2: Calculate and Save State (after delay)
      setTimeout(() => {
          setState(prev => {
              // Calculate Bonus
              const rawBonus = Math.log10(Math.max(1, prev.pu)) + (prev.tu);
              const bonusLevel = Math.floor(rawBonus / 10);
              
              const newPrestigeLevel = prev.prestige.level + bonusLevel;

              // Create fresh state
              const newState: GameState = {
                  ...INITIAL_STATE,
                  // Apply Prestige
                  prestige: {
                      level: newPrestigeLevel,
                      currency: prev.prestige.currency + bonusLevel,
                      multiplier: 1 + (newPrestigeLevel * 0.1),
                      timestamp: Date.now()
                  },
                  // Start round 2 with higher entropy for variety
                  worldStats: {
                      ...INITIAL_STATE.worldStats,
                      entropy: newPrestigeLevel > 0 ? 30 : 0 
                  },
                  logs: [{ 
                      id: Date.now(), 
                      text: `SYSTEM REBOOT COMPLETE. NEURAL LINK ESTABLISHED: LEVEL ${newPrestigeLevel}.`, 
                      type: 'system', 
                      timestamp: Date.now() 
                  }],
                  isAscending: false // Ensure we are not stuck in ending
              };
              
              // Force immediate save to overwrite old state
              localStorage.setItem(SAVE_KEY, JSON.stringify(newState));
              
              // Reload page to clear all intervals/timeouts cleanly
              window.location.reload();
              
              return newState; 
          });
      }, 3000); // 3 second reboot animation
  };

  const cancelAscension = () => {
      setState(prev => ({
          ...prev,
          isAscending: false
      }));
  };

  return {
    state,
    isRebooting,
    pilotIntroduction: { step: pilotStep, available: canPresentPilotIntroduction(state) },
    sqlPilotAvailable: isSQLPilotReady(state),
    sqlQueueAttemptId,
    aiReviewAvailable: isAIReviewActive(state) && canPresentPilotIntroduction(state),
    aiReviewDemandActive: hasContinuousAIReviewDemand(state),
    accelerationUpdate: { step: accelerationFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    schemaBatchAttempt,
    schemaUpdate: { step: schemaFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    schemaBatchAvailable: isSchemaBatchActive(state) && state.rawData >= 20 && canPresentPilotIntroduction(state),
    connectedUpdate: { step: connectedFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    productWriteAttempt,
    productWriteProposal: productWriteAttempt ? (productWriteAttempt.kind === 'queue'
      ? queueWriteProposal(state, productWriteAttempt.index) : productWriteAttempt.kind === 'policy_trial'
        ? getPolicyTrialProductWriteProposal(productWriteAttempt.index) : PRODUCT_WRITE_PROPOSALS[productWriteAttempt.index]) : null,
    sourceRemediationAvailable: isSourceRemediationAvailable(state) && canPresentPilotIntroduction(state),
    incidentTraceAvailable: canReviewIncidentTrace(state) && canPresentPilotIntroduction(state),
    sourceDriftUpdate: { step: sourceDriftFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    writeScaleUpdate: { step: writeScaleFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    writePolicyUpdate: { step: writePolicyFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    policyTrialAvailable: isPolicyTrialActive(state) && canPresentPilotIntroduction(state),
    writeQueueUpdate: { step: writeQueueFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    productWriteQueueAvailable: isProductWriteQueueActive(state) && state.connectedEnterprise.productWriteQueue.pending > 0 && canPresentPilotIntroduction(state),
    // Local simulated record values derive from the persisted applied prefix, never from logs.
    productWriteRecords: PRODUCT_WRITE_PROPOSALS.map((proposal, index) => ({ record: proposal.record, field: proposal.field,
      value: index < state.connectedEnterprise.productWritePilot.completed ? proposal.proposed : proposal.current })),
    writeUpdate: { step: writeFeedbackStep(state), available: canPresentPilotIntroduction(state) },
    productWriteAvailable: isWritePilotActive(state) && canPresentPilotIntroduction(state),
    connectedMappingOffered: isConnectedMappingActive(state),
    connectedMappingAvailable: isConnectedMappingActive(state) && state.rawData >= 20 && canPresentPilotIntroduction(state),
    operationalRollout: { offered: state.expansionProgress.era === 'ai_pilot' &&
        state.expansionProgress.transition?.targetEra === 'acceleration' && state.expansionProgress.transition.step === 'continuous_demand_offer',
        available: canPresentPilotIntroduction(state) },
    actions: {
      beginExpansionTransition, establishExpansionEra, advancePilotIntroduction,
      beginSQLPilotAttempt, completeSQLPilotQuery,
      openNextAIReview, completeAIReviewQuery,
      acknowledgeOperationalRollout, acknowledgeAccelerationUpdate,
      acknowledgeSchemaUpdate, openSchemaBatchReview, closeSchemaBatchReview, completeSchemaBatchReview,
      connectProductDb, acknowledgeConnectedResult,
      grantProductWrite, openProductWriteReview, closeProductWriteReview, applyProductWrite, acknowledgeWriteResult,
      openNextProductWrite, acknowledgeWriteQueueUpdate, confirmProductWritePolicy, openPolicyTrialWrite, acknowledgeProductWritePolicy, acknowledgeProductWriteScale, acknowledgeSourceDrift, beginIncidentInvestigation, inspectIncidentTrace, confirmIncidentRootCause, beginSourceRemediation, requestSupplierClarification, approveSourceWidthRule, reprocessSourceQuarantine,
      manualClean, manualAnalyze, purchaseUpgrade, dismissEvent,
      toggleSpaghettiMode, togglePandasMode, toggleSQLMode, toggleModelMode, toggleMiningMode, toggleFlowMode, toggleBuzzwordMode, togglePDFMode,
      cleanSpaghettiStrand, completePandasLevel, completeSQLQuery, completeModelTraining, completeMiningLevel, completeFlowBatch, completeBuzzwordBattle, completePDFBatch,
      resolveChat, buyStock, sellStock,
      launchCampaign, boostCampaign,
      startCoffeeBreak, endCoffeeBreak,
      hardReset, ascend, cancelAscension
    }
  };
};
