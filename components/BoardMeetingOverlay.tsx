import React from 'react';
import { BoardMeeting } from '../types';
import { Briefcase, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  meeting: BoardMeeting;
  currentTick: number;
}

export const BoardMeetingOverlay: React.FC<Props> = ({ meeting, currentTick }) => {
    
    // Calculate Penalty Remaining Time
    const isPenaltyActive = currentTick < meeting.penaltyEndTime;
    const penaltyTicksRemaining = meeting.penaltyEndTime - currentTick;
    const penaltySeconds = Math.ceil(penaltyTicksRemaining / 5); // 5 ticks per sec

    return (
        <>
            {/* Active Meeting UI */}
            <AnimatePresence>
                {meeting.active && (
                    <motion.div 
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] w-[600px] bg-slate-900 border border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] rounded-lg overflow-hidden"
                    >
                        <div className="bg-indigo-600 px-4 py-2 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm">
                                <Briefcase size={16} /> Board Meeting in Progress
                            </div>
                            <div className="flex items-center gap-2 font-mono text-white font-bold">
                                <Clock size={16} /> {meeting.timeRemaining}s
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between text-xs text-indigo-300 mb-1 font-mono">
                                <span>TARGET: +{meeting.target} PU</span>
                                <span>PROGRESS: {Math.floor(meeting.progress)}</span>
                            </div>
                            <div className="w-full h-6 bg-slate-950 rounded-full overflow-hidden border border-slate-700 relative">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (meeting.progress / meeting.target) * 100)}%` }}
                                    transition={{ type: "spring", stiffness: 50 }}
                                />
                                {/* Marker for target if we wanted to show over-achievement */}
                            </div>
                            <p className="text-center text-[10px] text-indigo-400 mt-2 animate-pulse">
                                STAKEHOLDERS DEMAND IMMEDIATE GROWTH. INCREASE OUTPUT NOW.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Penalty UI */}
            <AnimatePresence>
                {isPenaltyActive && (
                    <motion.div 
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className="fixed top-20 right-4 z-[70] bg-red-950/90 border border-red-500 text-red-200 p-4 rounded shadow-lg backdrop-blur-sm max-w-xs"
                    >
                         <div className="flex items-start gap-3">
                             <AlertCircle className="shrink-0 text-red-500" size={20} />
                             <div>
                                 <h4 className="font-bold text-sm text-red-400 mb-1">RESTRUCTURING ACTIVE</h4>
                                 <p className="text-xs leading-relaxed opacity-90">
                                     Due to missed targets, layoffs are in effect. Production rates reduced by 50%.
                                 </p>
                                 <div className="mt-2 text-xs font-mono font-bold text-red-300">
                                     Normalization in: {penaltySeconds}s
                                 </div>
                             </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};