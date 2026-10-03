import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, RefreshCw } from 'lucide-react';
import { GameState } from '../types';

interface Props {
    active: boolean;
    state: GameState;
    onAscend: () => void;
    onStay: () => void;
}

export const AscensionOverlay: React.FC<Props> = ({ active, state, onAscend, onStay }) => {
    if (!active) return null;

    // Calculate Prestige Bonus
    // Log10 of PU + TU * 10
    const rawBonus = Math.log10(Math.max(1, state.pu)) + (state.tu);
    const bonusLevel = Math.floor(rawBonus / 10);
    const currentPrestige = state.prestige.level;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center text-center p-8 font-mono overflow-hidden"
            >
                {/* Background visual effects */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                        className="w-[800px] h-[800px] border border-white/5 rounded-full"
                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                     <motion.div 
                        className="absolute w-[600px] h-[600px] border border-white/10 rounded-full"
                        animate={{ rotate: -360, scale: [1, 0.9, 1] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                </div>

                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="relative z-10 max-w-2xl bg-slate-900/80 border border-indigo-500/50 p-12 rounded-2xl backdrop-blur-xl shadow-2xl"
                >
                    <div className="mb-6 flex justify-center">
                        <div className="bg-white/10 p-4 rounded-full border border-white/20">
                            <Brain size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tighter">
                        SINGULARITY ACHIEVED
                    </h1>
                    
                    <p className="text-indigo-200 text-lg mb-8 leading-relaxed">
                        The model has converged. You have parsed the noise of reality and found the signal underneath. 
                        The simulation can no longer contain the magnitude of your understanding.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8 bg-black/40 p-6 rounded-xl border border-white/10">
                        <div>
                            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Current Neural Link</div>
                            <div className="text-3xl font-bold text-white">Lvl {currentPrestige}</div>
                        </div>
                        <div>
                            <div className="text-emerald-400 text-xs uppercase tracking-widest mb-1">Upgrade To</div>
                            <div className="text-3xl font-bold text-emerald-400 flex items-center justify-center gap-2">
                                Lvl {currentPrestige + bonusLevel} <Sparkles size={20} />
                            </div>
                        </div>
                        <div className="col-span-2 text-xs text-slate-400 border-t border-white/5 pt-4 mt-2">
                            Ascending will reset your resources but permanently increase your <strong className="text-white">Insight Generation</strong> and <strong className="text-white">Processing Speed</strong> by {bonusLevel * 10}%.
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={onAscend}
                            className="w-full py-4 bg-white text-black font-bold text-lg rounded-lg hover:bg-indigo-50 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                        >
                            <RefreshCw size={20} />
                            ASCEND (NEW GAME+)
                        </button>
                        
                        <button 
                            onClick={onStay}
                            className="text-slate-500 hover:text-white text-sm transition-colors py-2"
                        >
                            Return to Sandbox (Continue Playing)
                        </button>
                    </div>
                </motion.div>

            </motion.div>
        </AnimatePresence>
    );
};