import React, { useEffect, useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { WorldStats } from './components/WorldStats';
import { DataStream } from './components/DataStream';
import { Workstation } from './components/Workstation';
import { DashboardPanel } from './components/DashboardPanel';
import { EventModal } from './components/EventModal';
import { AIPilotIntroduction } from './components/AIPilotIntroduction';
import { SpaghettiOverlay } from './components/SpaghettiOverlay';
import { PandasMappingGame } from './components/PandasMappingGame';
import { SQLMiningGame } from './components/SQLMiningGame';
import { ModelTrainingGame } from './components/ModelTrainingGame';
import { ProcessMiningGame } from './components/ProcessMiningGame'; 
import { DataFlowGame } from './components/DataFlowGame'; 
import { BuzzwordBattle } from './components/BuzzwordBattle'; 
import { PDFScanningGame } from './components/PDFScanningGame'; 
import { EntropyLayer } from './components/EntropyLayer';
import { TeamComms } from './components/TeamComms';
import { BoardMeetingOverlay } from './components/BoardMeetingOverlay';
import { TaskBusyOverlay } from './components/TaskBusyOverlay';
import { AscensionOverlay } from './components/AscensionOverlay';
import { CoffeeBreakOverlay } from './components/CoffeeBreakOverlay';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

const App: React.FC = () => {
  const { state, actions, isRebooting, pilotIntroduction } = useGameEngine();
  const [pilotOpen, setPilotOpen] = useState(false);
  useEffect(() => {
    if (!pilotIntroduction.available || pilotIntroduction.step === 'pilot_ready') setPilotOpen(false);
  }, [pilotIntroduction.available, pilotIntroduction.step]);

  // Get first active event if any
  const activeEvent = state.activeEvents.length > 0 ? state.activeEvents[0] : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden selection:bg-emerald-500/30 font-inter relative">
      
      {/* Global Visual FX */}
      <EntropyLayer entropy={state.worldStats.entropy} />

      {/* Reboot Overlay */}
      <AnimatePresence>
          {isRebooting && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center font-mono text-emerald-500"
              >
                  <div className="w-full max-w-lg p-8">
                      <Terminal size={48} className="mb-6 animate-pulse" />
                      <div className="space-y-2 text-sm">
                          <p>INITIATING SYSTEM REBOOT...</p>
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>STOPPING SERVICES... OK</motion.p>
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>FLUSHING CACHE... OK</motion.p>
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>UPGRADING KERNEL... DONE</motion.p>
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-white font-bold blink">RESTARTING...</motion.p>
                      </div>
                      <motion.div 
                          className="mt-8 h-1 bg-emerald-900 w-full rounded overflow-hidden"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                      >
                          <motion.div 
                              className="h-full bg-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2.5, ease: "easeInOut" }}
                          />
                      </motion.div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Blocking Task Overlay */}
      <TaskBusyOverlay task={state.blockingTask} currentTick={state.tick} />

      {/* Endgame Overlay */}
      <AscensionOverlay 
          active={state.isAscending} 
          state={state} 
          onAscend={actions.ascend} 
          onStay={actions.cancelAscension} 
      />
      
      {/* Coffee Break Overlay */}
      <CoffeeBreakOverlay 
          coffee={state.coffeeBreak}
          onClose={actions.endCoffeeBreak}
      />

      {/* Mini-Games */}
      <SpaghettiOverlay 
        active={state.spaghettiMode} 
        onClose={actions.toggleSpaghettiMode}
        onClean={actions.cleanSpaghettiStrand}
        rawData={state.rawData}
      />
      
      <PandasMappingGame 
         active={state.pandasMode}
         onClose={actions.togglePandasMode}
         onComplete={actions.completePandasLevel}
         rawData={state.rawData}
      />

      <SQLMiningGame 
        active={state.sqlMode}
        onClose={actions.toggleSQLMode}
        onComplete={actions.completeSQLQuery}
      />

      <ModelTrainingGame 
        active={state.modelMode}
        onClose={actions.toggleModelMode}
        onComplete={actions.completeModelTraining}
      />
      
      <ProcessMiningGame 
        active={state.miningMode}
        onClose={actions.toggleMiningMode}
        onComplete={actions.completeMiningLevel}
      />

      <DataFlowGame 
        active={state.flowMode}
        onClose={actions.toggleFlowMode}
        onComplete={actions.completeFlowBatch}
      />

      <BuzzwordBattle 
         active={state.buzzwordMode}
         onClose={actions.toggleBuzzwordMode}
         onComplete={actions.completeBuzzwordBattle}
      />
      
      <PDFScanningGame 
         active={state.pdfMode}
         onClose={actions.togglePDFMode}
         onComplete={actions.completePDFBatch}
      />

      {/* UI Overlays */}
      <BoardMeetingOverlay 
         meeting={state.boardMeeting}
         currentTick={state.tick}
      />

      <TeamComms 
        chats={state.activeChats} 
        onResolve={actions.resolveChat}
      />

      {/* Event Overlay */}
      <EventModal event={activeEvent} onDismiss={actions.dismissEvent} />
      {pilotOpen && pilotIntroduction.available && pilotIntroduction.step && pilotIntroduction.step !== 'pilot_ready' && (
        <AIPilotIntroduction
          step={pilotIntroduction.step}
          onContinue={actions.advancePilotIntroduction}
          onLater={() => setPilotOpen(false)}
        />
      )}

      {/* Top Bar */}
      <WorldStats 
        stats={state.worldStats} 
        pu={state.pu} 
        tu={state.tu} 
      />

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden relative z-10">
        
        {/* Left: Raw Data Stream */}
        <div className="col-span-3 h-full">
            <DataStream 
                rawData={state.rawData} 
                rate={state.rawDataRate} 
                maxStorage={state.maxStorage}
                packetLoss={state.packetLoss}
            />
        </div>

        {/* Center: Workstation */}
        <div className="col-span-5 h-full">
            <Workstation 
                state={state} 
                onManualClean={actions.manualClean}
                onManualAnalyze={actions.manualAnalyze}
                onBuyUpgrade={actions.purchaseUpgrade}
                onToggleSpaghetti={actions.toggleSpaghettiMode}
                onTogglePandas={actions.togglePandasMode}
                onToggleSQL={actions.toggleSQLMode}
                onToggleModel={actions.toggleModelMode}
                onToggleMining={actions.toggleMiningMode}
                onToggleFlow={actions.toggleFlowMode}
                onBuyStock={actions.buyStock}
                onSellStock={actions.sellStock}
                onLaunchCampaign={actions.launchCampaign}
                onBoostCampaign={actions.boostCampaign}
                onHardReset={actions.hardReset}
                onTogglePDF={actions.togglePDFMode}
                onVisitCoffee={actions.startCoffeeBreak}
                pilotIntroduction={pilotIntroduction}
                onReviewPilot={() => setPilotOpen(true)}
            />
        </div>

        {/* Right: Output Dashboard */}
        <div className="col-span-4 h-full">
            <DashboardPanel state={state} />
        </div>

      </div>

      {/* Mobile warning overlay */}
      <div className="md:hidden absolute inset-0 bg-slate-950 z-50 flex items-center justify-center p-8 text-center">
          <p className="text-amber-500 font-mono">Mobile interface not optimized for deep data analysis. Please use a terminal with higher resolution.</p>
      </div>
    </div>
  );
};

export default App;
