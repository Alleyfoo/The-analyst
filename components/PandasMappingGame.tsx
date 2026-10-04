import React, { useState, useEffect, useRef } from 'react';
import { X, Code, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { RAW_HEADERS, CLEAN_HEADERS, PRODUCT_DB_FIELD_CONTEXT } from '../constants';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (cost: number, reward: number, qualityBonus: number) => void;
  rawData: number;
  batchReview: { attemptId: number; fieldIds: number[]; batchSize: number; autoMapped: number; connectedContext: boolean } | null;
  onBatchComplete: (attemptId: number, mappings: { rawId: number; cleanId: number }[], mistakes: number) => void;
}

interface Pair {
  id: number;
  raw: string;
  clean: string;
}

export const PandasMappingGame: React.FC<Props> = ({ active, onClose, onComplete, rawData, batchReview, onBatchComplete }) => {
  const [level, setLevel] = useState<Pair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({}); // leftId -> rightId
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(false);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate level on open
  useEffect(() => {
    if (active) {
      const count = 5;
      const indices = batchReview ? batchReview.fieldIds : Array.from({ length: RAW_HEADERS.length }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
      
      const pairs = indices.map(i => ({
        id: i,
        raw: RAW_HEADERS[i],
        clean: CLEAN_HEADERS[i]
      }));

      setLevel(pairs);
      setMatches({});
      setSelectedLeft(null);
      setMistakes(0);
      setCompleted(false);
    }
  }, [active]);

  // Check completion
  useEffect(() => {
    if (batchReview) return; // Batch timers/authority are isolated from the preserved manual path.
    if (level.length > 0 && Object.keys(matches).length === level.length) {
      setCompleted(true);
      setTimeout(() => {
         const COST = 20;
         const REWARD = 50;
         const QUALITY = Math.max(0.01, 0.05 - (mistakes * 0.01));
         onComplete(COST, REWARD, QUALITY);
         onClose();
      }, 1500);
    }
  }, [matches, level]);

  useEffect(() => {
    if (!batchReview || !active || level.length !== batchReview.fieldIds.length || Object.keys(matches).length !== batchReview.fieldIds.length) return;
    setCompleted(true);
    batchTimer.current = setTimeout(() => {
      batchTimer.current = null;
      onBatchComplete(batchReview.attemptId, Object.entries(matches).map(([rawId, cleanId]) => ({ rawId: Number(rawId), cleanId })), mistakes);
      onClose();
    }, 1500);
    return () => {
      if (batchTimer.current !== null) clearTimeout(batchTimer.current);
      batchTimer.current = null;
    };
  }, [active, matches, level, batchReview?.attemptId]);

  const handleClose = () => {
    if (batchTimer.current !== null) clearTimeout(batchTimer.current);
    batchTimer.current = null;
    onClose();
  };

  const handleLeftClick = (id: number) => {
    if (matches[id]) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (id: number) => {
    if (selectedLeft === null) return;
    if (Object.values(matches).includes(id)) return;

    if (selectedLeft === id) {
      // Correct match (ids match because we generated pairs with same id)
      setMatches(prev => ({ ...prev, [selectedLeft]: id }));
      setSelectedLeft(null);
    } else {
      // Wrong match
      setMistakes(m => m + 1);
      setSelectedLeft(null); // Reset selection
      
      // Visual shake logic could go here
    }
  };

  if (!active) return null;

  // Shuffle right side for display
  // We need a consistent shuffled order for the right column during the session
  // Using a deterministic sort based on id for now to keep it simple or random?
  // Let's just render them. To make it a game, right side must be shuffled.
  // We'll calculate a shuffled order once.
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[600px] bg-[#1e1e1e] rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col font-mono text-sm relative">
        
        {/* Header */}
        <div className="bg-[#2d2d2d] px-4 py-2 border-b border-black flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Code size={16} className="text-yellow-400" />
                <span className="text-slate-300 font-bold">schema_alignment_tool.py</span>
            </div>
            <button onClick={handleClose} aria-label="Close schema mapping" className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        {batchReview && <div className="px-4 py-3 border-b border-slate-700 bg-slate-900 text-xs text-blue-200">
          <p className="font-bold">AI BATCH MAPPING</p>
          {batchReview.connectedContext && <p className="mt-1">CONNECTED CONTEXT: Product DB · READ ONLY</p>}
          <p className="mt-1">{batchReview.batchSize.toLocaleString()} fields processed · {batchReview.autoMapped.toLocaleString()} mapped automatically · {batchReview.fieldIds.length} require analyst review</p>
          <p className="mt-1 text-slate-400">Ambiguous mappings withheld for human resolution. Automatic mappings are correct.</p>
        </div>}

        {/* Content */}
        <div className="flex-1 flex p-8 relative">
           
           {/* Success Overlay */}
           <AnimatePresence>
               {completed && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="absolute inset-0 z-10 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[2px]"
                   >
                       <motion.div 
                         initial={{ scale: 0.5 }}
                         animate={{ scale: 1 }}
                         className="bg-emerald-900 border border-emerald-500 p-6 rounded-lg text-center"
                       >
                           <Check size={48} className="text-emerald-400 mx-auto mb-2" />
                           <h2 className="text-2xl font-bold text-white mb-1">MAPPING COMPLETE</h2>
                           <p className="text-emerald-200">Schema Validated. Quality +{(Math.max(0.01, 0.05 - (mistakes * 0.01)) * 100).toFixed(0)}%</p>
                       </motion.div>
                   </motion.div>
               )}
           </AnimatePresence>

           {/* Left Column (Raw) */}
           <div className="flex-1 space-y-4">
                <h3 className="text-slate-500 uppercase text-xs font-bold mb-4">raw_input_stream</h3>
                {level.map(item => {
                    const isMatched = matches[item.id] !== undefined;
                    const isSelected = selectedLeft === item.id;
                    
                    return (
                        <button
                            key={item.id}
                            disabled={isMatched}
                            onClick={() => handleLeftClick(item.id)}
                            className={clsx(
                                "w-full text-left px-4 py-3 rounded border font-mono transition-all flex justify-between items-center",
                                isMatched ? "bg-emerald-900/30 border-emerald-500/50 text-emerald-400 opacity-50" :
                                isSelected ? "bg-blue-900/30 border-blue-500 text-blue-300 ring-1 ring-blue-500" :
                                "bg-[#252526] border-[#3e3e42] text-[#9cdcfe] hover:bg-[#2a2d2e]"
                            )}
                        >
                            {batchReview?.connectedContext ? <div>
                              <span>"{item.raw}"</span>
                              <p className="mt-2 text-[10px] text-slate-400">Product DB definition: {PRODUCT_DB_FIELD_CONTEXT[item.id].description}</p>
                              <p className="text-[10px] text-slate-400">Type: {PRODUCT_DB_FIELD_CONTEXT[item.id].type} · Examples: {PRODUCT_DB_FIELD_CONTEXT[item.id].examples}</p>
                            </div> : <span>"{item.raw}"</span>}
                            {isMatched && <ArrowRight size={14} />}
                        </button>
                    );
                })}
           </div>

           {/* SVG Connector Layer */}
           <div className="w-32 relative">
               {/* Could draw lines here if we had refs to elements, simplified for now */}
           </div>

           {/* Right Column (Clean) */}
           <div className="flex-1 space-y-4">
                <h3 className="text-slate-500 uppercase text-xs font-bold mb-4 text-right">target_schema</h3>
                {/* We render in matched order if matched, or shuffle? 
                    Actually, let's just render standard order but shuffled initially. 
                    For simplicity in this implementation, let's reverse the array so it's not 1:1 visually aligned by default 
                */}
                {[...level].reverse().map(item => {
                    const isMatched = Object.values(matches).includes(item.id);
                    // Find if this item is the target of the current match (to color it green)
                    const isLinked = Object.entries(matches).find(([k, v]) => v === item.id);
                    
                    return (
                        <button
                            key={item.id}
                            disabled={isMatched}
                            onClick={() => handleRightClick(item.id)}
                            className={clsx(
                                "w-full text-right px-4 py-3 rounded border font-mono transition-all block ml-auto",
                                isMatched ? "bg-emerald-900/30 border-emerald-500/50 text-emerald-400 opacity-50" :
                                "bg-[#252526] border-[#3e3e42] text-[#ce9178] hover:bg-[#2a2d2e]"
                            )}
                        >
                            {item.clean}
                        </button>
                    );
                })}
           </div>

        </div>

        {/* Footer */}
        <div className="bg-[#007acc] text-white px-4 py-1 text-xs flex justify-between">
            <span>Pandas Mode</span>
            <span>Mistakes: {mistakes}</span>
        </div>

      </div>
    </div>
  );
};
