import React, { useState, useEffect, useRef } from 'react';
import { GameState, Upgrade, ResourceType, UpgradeCategory, LogMessage, CampaignType, AIPilotStep } from '../types';
import { UPGRADES, checkUpgradeVisibility, isAscensionDeferred, TICK_RATE_MS, getProductWriteVelocity, PRODUCT_WRITE_QUEUE_CAP, SOURCE_DRIFT } from '../constants';
import { Filter, Activity, Lock, Cpu, Terminal as TerminalIcon, Users, Scale, FlaskConical, Briefcase, Server, Wand2, FileCode, Database, Brain, GitGraph, TrendingUp, DollarSign, Megaphone, Send, Smartphone, Tv, Zap, Infinity as InfinityIcon, Sparkles, FileText, Scan, Coffee, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  state: GameState;
  onManualClean: () => void;
  onManualAnalyze: () => void;
  onBuyUpgrade: (u: Upgrade) => void;
  onToggleSpaghetti: () => void;
  onTogglePandas: () => void;
  onToggleSQL: () => void;
  onToggleModel: () => void;
  onToggleMining: () => void; 
  onToggleFlow: () => void; 
  onBuyStock: (amt: number) => void; 
  onSellStock: (amt: number) => void;
  onLaunchCampaign: (type: CampaignType) => void; 
  onBoostCampaign: (id: string) => void; 
  onHardReset: () => void; 
  onTogglePDF: () => void;
  onVisitCoffee: () => void;
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

const TerminalLine: React.FC<{ log: LogMessage }> = ({ log }) => {
    let color = "text-slate-400";
    if (log.type === 'success') color = "text-emerald-400";
    if (log.type === 'warning') color = "text-amber-400";
    if (log.type === 'danger') color = "text-red-400";
    if (log.type === 'system') color = "text-blue-400";

    return (
        <div className="font-mono text-[10px] md:text-xs py-0.5 border-b border-white/5">
            <span className="text-slate-600 mr-2">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]</span>
            <span className={color}>{log.text}</span>
        </div>
    );
};

// Floating Text Component
const FloatingText = ({ x, y, text, color, onComplete }: { x: number, y: number, text: string, color: string, onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 1, y: 0, x: 0 }}
            animate={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            className={clsx("absolute pointer-events-none font-bold text-sm z-50", color)}
            style={{ left: x, top: y }}
        >
            {text}
        </motion.div>
    );
};

export const Workstation: React.FC<Props> = ({ state, onManualClean, onManualAnalyze, onBuyUpgrade, onToggleSpaghetti, onTogglePandas, onToggleSQL, onToggleModel, onToggleMining, onToggleFlow, onBuyStock, onSellStock, onLaunchCampaign, onBoostCampaign, onHardReset, onTogglePDF, onVisitCoffee, pilotIntroduction, onReviewPilot, aiReviewAvailable, onReviewNextQuery, operationalRollout, aiReviewDemandActive, accelerationUpdate, schemaUpdate, schemaBatchAvailable, onReviewSchemaBatch, connectedUpdate, connectedMappingOffered, connectedMappingAvailable, writeUpdate, productWriteAvailable, onReviewProductWrite, writeQueueUpdate, productWriteQueueAvailable, onReviewNextWrite, writePolicyUpdate, policyTrialAvailable, onReviewPolicyTrial, writeScaleUpdate, sourceDriftUpdate, incidentTraceAvailable, onOpenIncidentTrace, sourceRemediationAvailable, onOpenSourceRepair, executiveReviewAvailable, expansionEndingReady, onOpenExecutiveReview }) => {
  const writeVelocity = getProductWriteVelocity(state.connectedEnterprise.productWritePolicy.autoClasses.length);
  const [activeTab, setActiveTab] = useState<'ops' | 'market' | 'marketing' | 'terminal'>('ops');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Floating Text State
  const [floatingTexts, setFloatingTexts] = useState<{id: number, x: number, y: number, text: string, color: string}[]>([]);
  const floatIdCounter = useRef(0);

  const addFloat = (e: React.MouseEvent, text: string, color: string) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;

      const id = floatIdCounter.current++;
      setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
  };

  const removeFloat = (id: number) => {
      setFloatingTexts(prev => prev.filter(f => f.id !== id));
  };

  const handleCleanClick = (e: React.MouseEvent) => {
      onManualClean();
      if (state.rawData >= 1) {
         // Calculate amount for display (approx logic from engine)
         const bonus = state.upgrades['macros'] ? 4 : 0;
         const prestigeBonus = state.prestige.level * 2;
         const neuralBonus = state.upgrades['neural_interface'] ? 20 : 0;
         const amount = 1 + bonus + prestigeBonus + neuralBonus;
         addFloat(e, `+${amount} Clean`, 'text-emerald-400');
      }
  };

  const handleAnalyzeClick = (e: React.MouseEvent) => {
      onManualAnalyze();
      if (state.cleanData >= 1) {
          addFloat(e, "+Metrics", 'text-blue-400');
      }
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (activeTab === 'terminal' && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs, activeTab]);

  const visibleUpgrades = UPGRADES.filter(u => checkUpgradeVisibility(state, u));
  const canManualClean = state.upgrades['manual_excel'];
  const canPandas = state.upgrades['pandas_scripts'];
  const canSQL = state.upgrades['sql_optimization'];
  const canModel = state.upgrades['data_scientist'];
  const canMining = state.upgrades['event_tracking']; 
  const canFlow = state.upgrades['cloud_bucket'];
  const canPDF = state.upgrades['pdf_parser'];
  
  const isAutoCleaning = state.cleanDataRate > 0;
  const isAutoAnalyzing = state.metricRate > 0;
  const canCoffee = state.tick - state.lastCoffeeTick >= 600;

  // Check for ascension availability
  const canAscend = state.tu >= 100 && !state.isAscending;
  const ascensionDeferred = isAscensionDeferred(state);

  const categories = [
      { id: UpgradeCategory.Tooling, icon: Cpu, label: "Tooling" },
      { id: UpgradeCategory.Infrastructure, icon: Server, label: "Infrastructure" },
      { id: UpgradeCategory.HR, icon: Users, label: "HR" },
      { id: UpgradeCategory.Granularity, icon: Filter, label: "Granularity" },
      { id: UpgradeCategory.Governance, icon: Scale, label: "Governance" },
      { id: UpgradeCategory.Scientific, icon: FlaskConical, label: "R&D" },
      { id: UpgradeCategory.Neural, icon: Brain, label: "Neural Link" }, // Prestige category
      { id: UpgradeCategory.Endgame, icon: InfinityIcon, label: "Singularity" },
  ];

  const market = state.market;

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 overflow-hidden relative">
      
      {/* Tabs */}
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
      {state.aiReviewQueue.wave > 0 && (
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
                {expansionEndingReady && <p>FULL AUTOMATION ROLLOUT: ACTIVE · EXCEPTIONS: GOVERNED · EXPANSION END-STATE: READY · ASCENSION DEFERRED</p>}
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
      <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0">
          <button 
            onClick={() => setActiveTab('ops')}
            className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-r border-slate-800 hover:bg-slate-900 transition-colors", activeTab === 'ops' ? "text-emerald-400 bg-slate-900 shadow-[inset_0_-2px_0_0_rgba(52,211,153,0.5)]" : "text-slate-500")}
          >
              <Briefcase size={14} /> Ops
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-r border-slate-800 hover:bg-slate-900 transition-colors", activeTab === 'market' ? "text-purple-400 bg-slate-900 shadow-[inset_0_-2px_0_0_rgba(168,85,247,0.5)]" : "text-slate-500")}
          >
              <TrendingUp size={14} /> Market
          </button>
          <button 
            onClick={() => setActiveTab('marketing')}
            className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-r border-slate-800 hover:bg-slate-900 transition-colors", activeTab === 'marketing' ? "text-orange-400 bg-slate-900 shadow-[inset_0_-2px_0_0_rgba(251,146,60,0.5)]" : "text-slate-500")}
          >
              <Megaphone size={14} /> Ads
          </button>
          <button 
            onClick={() => setActiveTab('terminal')}
            className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-r border-slate-800 hover:bg-slate-900 transition-colors", activeTab === 'terminal' ? "text-blue-400 bg-slate-900 shadow-[inset_0_-2px_0_0_rgba(96,165,250,0.5)]" : "text-slate-500")}
          >
              <TerminalIcon size={14} /> Terminal
          </button>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* Operations Tab */}
        {activeTab === 'ops' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-8">
                
                {state.prestige.level > 0 && (
                     <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg flex items-center gap-4">
                         <div className="p-2 bg-indigo-500/20 rounded-full">
                             <Sparkles size={20} className="text-indigo-400" />
                         </div>
                         <div>
                             <div className="text-indigo-400 text-xs font-bold uppercase">Neural Link Active</div>
                             <div className="text-white text-sm">Level {state.prestige.level} • Production +{(state.prestige.level * 10).toFixed(0)}%</div>
                         </div>
                     </div>
                )}
                
                {/* Ascension Button */}
                {canAscend && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-purple-900/30 border border-purple-500 p-4 rounded-lg flex items-center justify-between shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    >
                         <div className="flex items-center gap-4">
                             <div className="p-3 bg-purple-500/20 rounded-full animate-pulse">
                                 <InfinityIcon size={24} className="text-purple-400" />
                             </div>
                             <div>
                                 <div className="text-purple-300 text-sm font-bold uppercase tracking-wider">{ascensionDeferred ? 'ASCENSION DEFERRED' : 'Ascension Available'}</div>
                                 <div className="text-slate-300 text-xs">{ascensionDeferred ? 'ORGANISATIONAL TRANSFORMATION IN PROGRESS' : 'Singularity threshold reached. Reset simulation for permanent power.'}</div>
                             </div>
                         </div>
                         <button 
                            disabled={ascensionDeferred}
                            // Simulate buying the upgrade which triggers ascension
                            onClick={() => onBuyUpgrade(UPGRADES.find(u => u.id === 'project_omniscience')!)}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                             {ascensionDeferred ? 'DEFERRED' : 'ASCEND'}
                         </button>
                    </motion.div>
                )}

                {/* Active Processing Section */}
                <section>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleCleanClick}
                            disabled={!canManualClean || state.rawData < 1}
                            className={clsx(
                                "relative group p-4 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95 h-28 overflow-hidden",
                                !canManualClean ? "border-slate-800 bg-slate-900 opacity-50 cursor-not-allowed" : 
                                state.rawData < 1 ? "border-slate-700 bg-slate-900/50 opacity-70 cursor-not-allowed" :
                                "border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-emerald-500/50 cursor-pointer shadow-lg shadow-black/20"
                            )}
                        >
                            {floatingTexts.map(f => (
                                <FloatingText key={f.id} {...f} onComplete={() => removeFloat(f.id)} />
                            ))}

                            {!canManualClean && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-lg"><Lock size={16} /></div>}
                            
                            {isAutoCleaning && (
                                <motion.div 
                                    className="absolute inset-0 bg-emerald-500/5"
                                    animate={{ opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 2 / Math.max(1, state.cleanDataRate), repeat: Infinity }}
                                />
                            )}
                            
                            <Filter className={clsx("mb-2 relative z-10", canManualClean ? "text-emerald-400" : "text-slate-600")} />
                            <span className="font-bold text-sm text-slate-200 relative z-10">Clean Data</span>
                            <span className="text-[10px] text-slate-500 mt-1 relative z-10">Manual ETL</span>
                            
                            {isAutoCleaning && (
                                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[9px] text-emerald-500 font-mono">AUTO</span>
                                </div>
                            )}
                        </button>

                        <button
                            onClick={handleAnalyzeClick}
                            disabled={state.cleanData < 1}
                            className={clsx(
                                "relative group p-4 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95 h-28 overflow-hidden",
                                state.cleanData < 1 ? "border-slate-700 bg-slate-900/50 opacity-70 cursor-not-allowed" :
                                "border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500/50 cursor-pointer shadow-lg shadow-black/20"
                            )}
                        >
                            {isAutoAnalyzing && (
                                <motion.div 
                                    className="absolute inset-0 bg-blue-500/5"
                                    animate={{ opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 2 / Math.max(1, state.metricRate), repeat: Infinity }}
                                />
                            )}
                            
                            <Activity className="mb-2 text-blue-400 relative z-10" />
                            <span className="font-bold text-sm text-slate-200 relative z-10">Analyze</span>
                            <span className="text-[10px] text-slate-500 mt-1 relative z-10">Generate Insights</span>

                            {isAutoAnalyzing && (
                                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                                    <span className="text-[9px] text-blue-500 font-mono">AUTO</span>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Mini Games Grid */}
                    <div className="space-y-2 mt-4">
                        {canManualClean && (
                            <button
                                onClick={onToggleSpaghetti}
                                className="w-full p-3 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded flex items-center justify-center gap-2 hover:from-indigo-900 hover:to-purple-900 transition-all group"
                            >
                                <Wand2 size={16} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                <span className="text-sm font-bold text-indigo-200">Manual Deep Clean (Spaghetti Mode)</span>
                            </button>
                        )}
                        
                        {/* COFFEE BREAK BUTTON */}
                        <button
                            onClick={onVisitCoffee}
                            disabled={!canCoffee}
                            className={clsx(
                                "w-full p-3 bg-amber-900/30 border border-amber-500/30 rounded flex items-center justify-center gap-2 transition-all group",
                                canCoffee ? "hover:bg-amber-900/50 cursor-pointer" : "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Coffee size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-amber-200">
                                {canCoffee ? "Visit Break Room" : "Coffee Machine Cooling Down..."}
                            </span>
                        </button>

                        {canPandas && (
                             <button
                                onClick={onTogglePandas}
                                className="w-full p-3 bg-[#1e1e1e] border border-[#3e3e42] rounded flex items-center justify-center gap-2 hover:bg-[#252526] transition-all group"
                            >
                                <FileCode size={16} className="text-yellow-400" />
                                <span className="text-sm font-bold text-slate-200 font-mono">Initialize Schema Mapping</span>
                            </button>
                        )}

                        {canPDF && (
                            <button
                                onClick={onTogglePDF}
                                className="w-full p-3 bg-slate-900 border border-red-500/30 rounded flex items-center justify-center gap-2 hover:bg-slate-800 transition-all group"
                            >
                                <Scan size={16} className="text-red-400" />
                                <span className="text-sm font-bold text-red-200 font-mono">Manual PDF Extraction</span>
                            </button>
                        )}

                        {canSQL && (
                             <button
                                onClick={onToggleSQL}
                                className="w-full p-3 bg-slate-800 border border-slate-600 rounded flex items-center justify-center gap-2 hover:bg-slate-700 transition-all group"
                            >
                                <Database size={16} className="text-blue-400" />
                                <span className="text-sm font-bold text-blue-200 font-mono">Run Ad-Hoc SQL Query</span>
                            </button>
                        )}

                        {canMining && (
                            <button
                                onClick={onToggleMining}
                                className="w-full p-3 bg-slate-900 border border-emerald-500/30 rounded flex items-center justify-center gap-2 hover:bg-slate-800 transition-all group"
                            >
                                <Activity size={16} className="text-emerald-400 animate-pulse" />
                                <span className="text-sm font-bold text-emerald-200 font-mono">Process Mining Analysis</span>
                            </button>
                        )}

                        {canFlow && (
                            <button
                                onClick={onToggleFlow}
                                className="w-full p-3 bg-slate-900 border border-blue-500/30 rounded flex items-center justify-center gap-2 hover:bg-slate-800 transition-all group"
                            >
                                <GitGraph size={16} className="text-blue-400" />
                                <span className="text-sm font-bold text-blue-200 font-mono">Optimize Data Flow</span>
                            </button>
                        )}

                        {canModel && (
                             <button
                                onClick={onToggleModel}
                                className="w-full p-3 bg-purple-900/30 border border-purple-500/40 rounded flex items-center justify-center gap-2 hover:bg-purple-900/50 transition-all group"
                            >
                                <Brain size={16} className="text-purple-400" />
                                <span className="text-sm font-bold text-purple-200 font-mono">AI Analyst Console</span>
                            </button>
                        )}
                    </div>
                </section>

                {/* Inventory */}
                <section className="bg-slate-900/30 p-4 rounded border border-slate-800/50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase text-slate-500">Clean Data Buffer</span>
                        <span className="font-mono text-emerald-400">{Math.floor(state.cleanData)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                        <motion.div 
                            className="bg-emerald-500 h-full" 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (state.cleanData / 500) * 100)}%` }} // normalized to 500 for visual
                        />
                    </div>
                </section>

                {/* Upgrades List Grouped by Category */}
                <section className="space-y-6 pb-8">
                    {categories.map(cat => {
                        const catUpgrades = visibleUpgrades.filter(u => u.category === cat.id);
                        if (catUpgrades.length === 0) return null;

                        return (
                            <div key={cat.id}>
                                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <cat.icon size={12} className={cat.id === UpgradeCategory.Endgame ? "text-purple-500 animate-pulse" : cat.id === UpgradeCategory.Neural ? "text-indigo-400" : ""} />
                                    <span className={cat.id === UpgradeCategory.Endgame ? "text-purple-400" : cat.id === UpgradeCategory.Neural ? "text-indigo-300" : ""}>{cat.label}</span>
                                </h3>
                                <div className="space-y-2">
                                    {catUpgrades.map(u => {
                                        const isPurchased = state.upgrades[u.id];
                                        const isDeferred = u.id === 'project_omniscience' && ascensionDeferred;
                                        let canAfford = false;
                                        if (u.cost.resource === 'PU') {
                                            canAfford = state.pu >= u.cost.amount;
                                        } else if (u.cost.resource === 'TU') {
                                            canAfford = state.tu >= u.cost.amount;
                                        } else {
                                            const resKey = u.cost.resource === ResourceType.RawData ? 'rawData' : 
                                                        u.cost.resource === ResourceType.CleanData ? 'cleanData' : 'metrics';
                                            // @ts-ignore
                                            canAfford = state[resKey] >= u.cost.amount;
                                        }

                                        return (
                                            <button
                                                key={u.id}
                                                disabled={isPurchased || !canAfford || isDeferred}
                                                onClick={() => onBuyUpgrade(u)}
                                                className={clsx(
                                                    "w-full text-left p-3 rounded border transition-all flex justify-between items-start group relative overflow-hidden",
                                                    isDeferred ? "bg-purple-900/10 border-purple-800 opacity-70 cursor-not-allowed" : isPurchased
                                                        ? "bg-slate-900/30 border-slate-800/50 opacity-60" 
                                                        : canAfford
                                                            ? (u.category === UpgradeCategory.Endgame ? "bg-purple-900/20 border-purple-500 hover:bg-purple-900/40" : 
                                                               u.category === UpgradeCategory.Neural ? "bg-indigo-900/20 border-indigo-500 hover:bg-indigo-900/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : 
                                                               "bg-slate-900 border-slate-700 hover:border-emerald-500 hover:bg-slate-800")
                                                            : "bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed"
                                                )}
                                            >
                                                {/* Progress Bar for TU Costs (Goal Visualization) */}
                                                {!isPurchased && u.cost.resource === 'TU' && (
                                                    <div className="absolute bottom-0 left-0 h-1 bg-purple-900 w-full">
                                                        <motion.div 
                                                            className="h-full bg-purple-500" 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, (state.tu / u.cost.amount) * 100)}%` }}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex-1 pr-4 relative z-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx("font-bold text-xs md:text-sm", isPurchased ? "text-emerald-500 line-through" : (u.category === UpgradeCategory.Endgame ? "text-purple-300" : u.category === UpgradeCategory.Neural ? "text-indigo-200" : "text-slate-200"))}>
                                                            {u.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] md:text-[11px] text-slate-500 mt-1 leading-tight">{u.description}</p>
                                                    {isDeferred && <p className="text-[10px] text-purple-300 mt-1">ASCENSION DEFERRED — ORGANISATIONAL TRANSFORMATION IN PROGRESS</p>}
                                                </div>
                                                {!isPurchased && (
                                                    <div className="flex flex-col items-end shrink-0 relative z-10">
                                                        <span className={clsx("text-xs font-mono font-bold", canAfford ? "text-emerald-400" : "text-red-400")}>
                                                            {u.cost.amount} <span className="text-[9px] text-slate-500">{u.cost.resource === ResourceType.RawData ? 'RAW' : u.cost.resource}</span>
                                                        </span>
                                                    </div>
                                                )}
                                                {isPurchased && <CheckCircle size={14} className="text-emerald-600 relative z-10" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </section>
            </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
            <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col h-full overflow-hidden">
                {market.unlocked ? (
                    <>
                        {/* Header Stats */}
                        <div className="flex justify-between items-end mb-4 shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                    <DollarSign className="text-purple-400" /> 
                                    DATA: ${market.stockPrice.toFixed(2)}
                                </h2>
                                <p className={clsx("text-xs font-mono", market.lastPriceDelta >= 0 ? "text-emerald-400" : "text-red-400")}>
                                    {market.lastPriceDelta >= 0 ? "+" : ""}{market.lastPriceDelta.toFixed(2)} (Last Tick)
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase">Shares Owned</div>
                                <div className="text-xl font-mono text-white">{market.ownedShares}</div>
                                <div className="text-xs text-slate-500">Value: <span className="text-purple-400">${(market.ownedShares * market.stockPrice).toFixed(0)}</span></div>
                            </div>
                        </div>

                        {/* Chart (Flexible Height - will shrink if needed) */}
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-4 mb-4 min-h-0 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={market.history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="tick" hide />
                                    <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 10}} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                                        itemStyle={{ fontSize: 12 }}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Line type="stepAfter" dataKey="price" stroke="#a855f7" strokeWidth={2} dot={false} name="Stock Price" />
                                    <Line type="monotone" dataKey="trueValue" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" dot={false} name="True Value" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Controls (Pinned to bottom via shrink-0) */}
                        <div className="grid grid-cols-2 gap-4 shrink-0 overflow-y-auto max-h-[40%]">
                            <div className="space-y-2">
                                <button 
                                    onClick={() => onBuyStock(1)} 
                                    disabled={state.pu < market.stockPrice}
                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded font-bold text-xs flex justify-between px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Buy 1 Share</span>
                                    <span className={state.pu >= market.stockPrice ? "text-purple-300" : "text-red-400"}>-{Math.ceil(market.stockPrice)} PU</span>
                                </button>
                                <button 
                                    onClick={() => onBuyStock(10)} 
                                    disabled={state.pu < market.stockPrice * 10}
                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded font-bold text-xs flex justify-between px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Buy 10 Shares</span>
                                    <span className={state.pu >= market.stockPrice * 10 ? "text-purple-300" : "text-red-400"}>-{Math.ceil(market.stockPrice * 10)} PU</span>
                                </button>
                                <button 
                                    onClick={() => onBuyStock(100)} 
                                    disabled={state.pu < market.stockPrice * 100}
                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded font-bold text-xs flex justify-between px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Buy 100 Shares</span>
                                    <span className={state.pu >= market.stockPrice * 100 ? "text-purple-300" : "text-red-400"}>-{Math.ceil(market.stockPrice * 100)} PU</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <button onClick={() => onSellStock(1)} disabled={market.ownedShares < 1} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded font-bold text-xs flex justify-between px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span>Sell 1 Share</span>
                                    <span className="text-emerald-400">+{Math.floor(market.stockPrice)} PU</span>
                                </button>
                                <button onClick={() => onSellStock(10)} disabled={market.ownedShares < 10} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded font-bold text-xs flex justify-between px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span>Sell 10 Shares</span>
                                    <span className="text-emerald-400">+{Math.floor(market.stockPrice * 10)} PU</span>
                                </button>
                                <button onClick={() => onSellStock(100)} disabled={market.ownedShares < 100} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded font-bold text-xs flex justify-between px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span>Sell 100 Shares</span>
                                    <span className="text-emerald-400">+{Math.floor(market.stockPrice * 100)} PU</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                        <Lock size={48} className="mb-4 opacity-50" />
                        <h2 className="text-xl font-bold mb-2">Market Locked</h2>
                        <p className="text-sm">Reach <span className="text-emerald-400 font-bold">500 PU</span> to IPO your company.</p>
                    </div>
                )}
            </div>
        )}

        {/* Marketing (Ads) Tab */}
        {activeTab === 'marketing' && (
            <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col h-full overflow-hidden">
                
                {/* Launch New - Pinned Top */}
                <section className="shrink-0 mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <Megaphone size={14} /> Campaign Launchpad
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => onLaunchCampaign('email')}
                            disabled={state.pu < 100}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-3 rounded text-left disabled:opacity-50 disabled:cursor-not-allowed group transition-all hover:border-blue-500"
                        >
                            <div className="flex justify-between mb-1">
                                <Send size={14} className="text-blue-400 group-hover:text-blue-300" />
                                <span className={clsx("text-[10px] font-mono font-bold", state.pu >= 100 ? "text-emerald-400" : "text-red-400")}>100 PU</span>
                            </div>
                            <div className="text-xs font-bold text-slate-200">Email Blast</div>
                        </button>

                        <button 
                            onClick={() => onLaunchCampaign('social')}
                            disabled={state.pu < 500}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-3 rounded text-left disabled:opacity-50 disabled:cursor-not-allowed group transition-all hover:border-pink-500"
                        >
                            <div className="flex justify-between mb-1">
                                <Smartphone size={14} className="text-pink-400 group-hover:text-pink-300" />
                                <span className={clsx("text-[10px] font-mono font-bold", state.pu >= 500 ? "text-emerald-400" : "text-red-400")}>500 PU</span>
                            </div>
                            <div className="text-xs font-bold text-slate-200">Social Push</div>
                        </button>

                        <button 
                            onClick={() => onLaunchCampaign('influencer')}
                            disabled={state.pu < 2000}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-3 rounded text-left disabled:opacity-50 disabled:cursor-not-allowed group transition-all hover:border-purple-500"
                        >
                            <div className="flex justify-between mb-1">
                                <Users size={14} className="text-purple-400 group-hover:text-purple-300" />
                                <span className={clsx("text-[10px] font-mono font-bold", state.pu >= 2000 ? "text-emerald-400" : "text-red-400")}>2,000 PU</span>
                            </div>
                            <div className="text-xs font-bold text-slate-200">Influencer</div>
                        </button>

                        <button 
                            onClick={() => onLaunchCampaign('tv')}
                            disabled={state.pu < 10000}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-3 rounded text-left disabled:opacity-50 disabled:cursor-not-allowed group transition-all hover:border-emerald-500"
                        >
                            <div className="flex justify-between mb-1">
                                <Tv size={14} className="text-emerald-400 group-hover:text-emerald-300" />
                                <span className={clsx("text-[10px] font-mono font-bold", state.pu >= 10000 ? "text-emerald-400" : "text-red-400")}>10,000 PU</span>
                            </div>
                            <div className="text-xs font-bold text-slate-200">TV Ad</div>
                        </button>
                    </div>
                </section>

                {/* Active Campaigns List - Scrollable */}
                <section className="flex-1 overflow-y-auto">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <Zap size={14} className="text-orange-400" /> Active Campaigns
                    </h3>
                    
                    <div className="space-y-3">
                        {state.activeCampaigns.length === 0 && (
                            <div className="p-4 border border-dashed border-slate-800 rounded text-center text-slate-600 text-xs">
                                No active campaigns. Launch one to generate Hype.
                            </div>
                        )}
                        
                        {state.activeCampaigns.map(c => (
                            <div key={c.id} className="bg-slate-900 border border-orange-500/30 p-3 rounded relative overflow-hidden group">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="font-bold text-slate-200 text-xs md:text-sm">{c.name}</div>
                                        <div className="text-[10px] text-orange-400 font-mono mt-0.5">
                                            Yield: +{(c.generatedRaw).toFixed(0)} Raw / +{(c.generatedPU).toFixed(0)} PU
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono text-slate-400">{(c.timeLeft / 5).toFixed(0)}s</div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                                    <motion.div 
                                        className="h-full bg-orange-500" 
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: c.duration / 5, ease: "linear" }}
                                    />
                                </div>

                                {/* Tactics Button (Hover) */}
                                <div className="absolute top-2 right-2 z-20">
                                    <button 
                                        onClick={() => onBoostCampaign(c.id)}
                                        className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                        disabled={state.cleanData < 50}
                                    >
                                        BOOST
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
            <div className="absolute inset-0 bg-black p-4 font-mono text-xs overflow-y-auto" ref={scrollRef}>
                <div className="text-slate-500 mb-4 select-none">
                    AnalystOS v4.2.0 [User: admin]<br/>
                    Connected to remote_host: 192.168.1.104<br/>
                    ----------------------------------------
                </div>
                {state.logs.map((log) => (
                    <TerminalLine key={log.id} log={log} />
                ))}
                <motion.div 
                    animate={{ opacity: [0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="h-4 w-2 bg-slate-400 mt-2 inline-block"
                />

                {/* Hard Reset Button */}
                <div className="mt-8 pt-4 border-t border-slate-800">
                    <p className="text-red-500 mb-2 font-bold uppercase tracking-widest">Danger Zone</p>
                    <button 
                        onClick={onHardReset}
                        className="px-4 py-2 bg-red-900/10 border border-red-500/50 text-red-500 hover:bg-red-900/30 hover:text-red-400 transition-colors uppercase font-bold text-xs"
                    >
                        System Factory Reset
                    </button>
                    <p className="text-[10px] text-slate-600 mt-1">Irreversible. Wipes local storage.</p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

// Helper for check circle
const CheckCircle = ({size, className}: {size: number, className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
)
