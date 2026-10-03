import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, INITIAL_STATE, ResourceType, Upgrade, GameEvent, ChatMessage, ChatScenario, Campaign, CampaignType } from '../types';
import { TICK_RATE_MS, UPGRADES, EVENTS, checkUpgradeVisibility, HISTORY_LENGTH, CHAT_SCENARIOS, TERMINAL_FLAVOR_TEXT } from '../constants';

// Board Meeting Settings
const MEETING_DURATION_SEC = 30;
const INITIAL_MEETING_TICK = 300; // 1 minute (300 ticks * 200ms)
const MEETING_INTERVAL_TICKS = 1500; // 5 minutes
const COFFEE_COOLDOWN_TICKS = 600; // 2 minutes

const SAVE_KEY = 'the_analyst_save_v1';

const hydrateState = (parsed: any): GameState => {
    // Merge basic fields to ensure new properties from updates exist
    const state: GameState = {
        ...INITIAL_STATE,
        ...parsed,
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
        ...stateDeltaFromTask
      }));

    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, [isRebooting]);

  // Actions
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
      setState(prev => {
          let bm = prev.boardMeeting;
          const mult = (1 + prev.prestige.level * 0.1);
          if (bm.active) bm = { ...bm, progress: bm.progress + (puBonus * mult) };
          return {
              ...prev,
              cleanData: prev.cleanData + (reward * mult),
              pu: prev.pu + (puBonus * mult),
              logs: [...prev.logs, { id: Date.now(), text: `Query Success. ${reward} Clean Data.`, type: 'success', timestamp: Date.now() }],
              boardMeeting: bm
          }
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
    actions: {
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