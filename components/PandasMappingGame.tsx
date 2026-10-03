import React, { useState, useEffect, useRef } from 'react';
import { X, Code, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (cost: number, reward: number, qualityBonus: number) => void;
  rawData: number;
}

const RAW_HEADERS = [
  'User_ID_final_v2', '$$revenue$$', 'cust_name (legacy)', 'Unnamed: 0', 
  'e_mail_ADDR', 'is_active?', 'manager_notes_hidden', 'Date (ISO)',
  'x_coord', 'Q3_Profit_LOSS', 'ERROR_CODE', 'temp_c'
];

const CLEAN_HEADERS = [
  'UserID', 'Revenue', 'CustomerName', 'Index',
  'Email', 'IsActive', 'Notes', 'Timestamp',
  'X', 'Profit', 'ErrorID', 'Temperature'
];

interface Pair {
  id: number;
  raw: string;
  clean: string;
}

export const PandasMappingGame: React.FC<Props> = ({ active, onClose, onComplete, rawData }) => {
  const [level, setLevel] = useState<Pair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({}); // leftId -> rightId
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Generate level on open
  useEffect(() => {
    if (active) {
      const count = 5;
      const indices = Array.from({ length: RAW_HEADERS.length }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
      
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
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

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
                            <span>"{item.raw}"</span>
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
