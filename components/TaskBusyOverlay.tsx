import React from 'react';
import { BlockingTask } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Briefcase } from 'lucide-react';

interface Props {
    task: BlockingTask | null;
    currentTick: number;
}

export const TaskBusyOverlay: React.FC<Props> = ({ task, currentTick }) => {
    if (!task) return null;

    const progressTicks = currentTick - task.startTick;
    const percent = Math.min(100, (progressTicks / task.durationTicks) * 100);
    const secondsRemaining = Math.ceil((task.durationTicks - progressTicks) / 5);

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center cursor-wait"
            >
                <div className="bg-slate-900 border border-slate-700 p-8 rounded-lg shadow-2xl max-w-md w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                        <motion.div 
                            className="h-full bg-indigo-500"
                            animate={{ width: `${percent}%` }}
                            transition={{ ease: 'linear' }}
                        />
                    </div>

                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                            <Briefcase size={48} className="text-indigo-400 relative z-10" />
                            <Loader2 size={48} className="text-indigo-500 absolute top-0 left-0 animate-spin opacity-50 z-10" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-100 mb-2">Executing Request</h2>
                    <p className="text-indigo-300 font-mono text-sm mb-6">"{task.name}"</p>
                    
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                        System Locked
                    </div>
                    <div className="text-3xl font-bold font-mono text-slate-200">
                        {secondsRemaining}s
                    </div>
                    <p className="text-xs text-slate-500 mt-4">Please wait while the task completes...</p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};