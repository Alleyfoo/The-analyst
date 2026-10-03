import React from 'react';
import { GameEvent } from '../types';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  event: GameEvent | null;
  onDismiss: (id: string) => void;
}

export const EventModal: React.FC<Props> = ({ event, onDismiss }) => {
  if (!event) return null;

  const getIcon = () => {
    switch (event.type) {
        case 'good': return <CheckCircle className="text-emerald-400" size={32} />;
        case 'bad': return <AlertTriangle className="text-red-400" size={32} />;
        default: return <Info className="text-blue-400" size={32} />;
    }
  };

  return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-slate-800 p-3 rounded-full border border-slate-700">
                            {getIcon()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">{event.title}</h2>
                            <span className="text-xs font-mono uppercase text-slate-500 tracking-wider">System Event</span>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950/50 p-4 rounded border border-slate-800 mb-6">
                        <p className="text-slate-300 leading-relaxed text-sm">
                            {event.description}
                        </p>
                    </div>

                    <button
                        onClick={() => onDismiss(event.id)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors"
                    >
                        Acknowledge
                    </button>
                </div>
            </motion.div>
        </div>
    </AnimatePresence>
  );
};
