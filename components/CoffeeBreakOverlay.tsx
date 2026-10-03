import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, User, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { CoffeeBreakState } from '../types';
import clsx from 'clsx';

interface Props {
    coffee: CoffeeBreakState;
    onClose: () => void;
}

export const CoffeeBreakOverlay: React.FC<Props> = ({ coffee, onClose }) => {
    if (!coffee.active) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ y: 50, scale: 0.9 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 50, scale: 0.9 }}
                    className="w-[450px] bg-slate-900 border border-amber-800 rounded-xl overflow-hidden shadow-2xl relative"
                >
                    {/* Header */}
                    <div className="bg-amber-950/50 p-4 border-b border-amber-900/50 flex items-center gap-3">
                        <div className="bg-amber-900/50 p-2 rounded-full border border-amber-700">
                            <Coffee size={24} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-amber-100">Break Room</h2>
                            <p className="text-xs text-amber-400/60 font-mono uppercase">Socializing...</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 text-center">
                         <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto mb-4 border-2 border-slate-700 flex items-center justify-center relative">
                             <User size={48} className="text-slate-500" />
                             <div className={clsx(
                                 "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center",
                                 coffee.mood === 'happy' ? "bg-emerald-500" : coffee.mood === 'angry' ? "bg-red-500" : "bg-slate-500"
                             )}>
                                 {coffee.mood === 'happy' ? <ThumbsUp size={14} className="text-white" /> : 
                                  coffee.mood === 'angry' ? <ThumbsDown size={14} className="text-white" /> :
                                  <MessageCircle size={14} className="text-white" />}
                             </div>
                         </div>
                         
                         <h3 className="text-lg font-bold text-slate-200 mb-2">{coffee.character}</h3>
                         
                         <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 relative">
                             <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 border-t border-l border-slate-800 rotate-45"></div>
                             <p className="text-slate-300 italic">"{coffee.dialogue}"</p>
                         </div>

                         <div className={clsx(
                             "text-xs font-mono py-2 px-4 rounded mb-6 inline-block",
                             coffee.mood === 'happy' ? "bg-emerald-900/30 text-emerald-400 border border-emerald-500/30" : 
                             coffee.mood === 'angry' ? "bg-red-900/30 text-red-400 border border-red-500/30" : 
                             "bg-slate-800 text-slate-400"
                         )}>
                             {coffee.effectDescription}
                         </div>

                         <button 
                            onClick={onClose}
                            className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded shadow-lg shadow-amber-900/20 transition-colors"
                         >
                             FINISH COFFEE
                         </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};