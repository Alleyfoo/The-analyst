import React, { useEffect, useState } from 'react';
import { Database, FileJson, FileSpreadsheet, Server, AlertOctagon, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  rawData: number;
  rate: number;
  maxStorage?: number;
  packetLoss?: number;
}

const FloatingBit: React.FC<{ delay: number }> = ({ delay }) => {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 400, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay: delay, ease: "linear" }}
      className="absolute top-1/2 left-0 text-[10px] font-mono text-emerald-900 pointer-events-none select-none"
      style={{ marginTop: Math.random() * 40 - 20 }}
    >
      {Math.random() > 0.5 ? '1' : '0'}
    </motion.div>
  );
};

export const DataStream: React.FC<Props> = ({ rawData, rate, maxStorage = 100, packetLoss = 0 }) => {
  const [isBooting, setIsBooting] = useState(true);

  // Boot Sequence
  useEffect(() => {
      const timer = setTimeout(() => {
          setIsBooting(false);
      }, 1500);
      return () => clearTimeout(timer);
  }, []);

  // Visualizer for data stream intensity
  const intensity = Math.min(10, Math.max(1, Math.floor(rate * 2)));
  const percentageFull = Math.min(100, (rawData / maxStorage) * 100);
  const isCritical = percentageFull > 90;
  const isLosingData = packetLoss > 0;

  return (
    <div role="region" aria-label="Data ingestion" className="flex flex-col shrink-0 bg-slate-950 relative overflow-hidden">
      <div className="p-3 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <Database size={14} />
          Data Ingestion
        </h2>
      </div>

      <div className="relative p-3 flex flex-col items-center gap-2">
        
        {/* Boot Overlay */}
        <AnimatePresence>
            {isBooting && (
                <motion.div 
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950 z-20 flex flex-col items-center justify-center font-mono text-xs text-emerald-500"
                >
                    <div className="space-y-1">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>CONNECTING...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>HANDSHAKE ESTABLISHED</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>STREAM ONLINE</motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Background Stream Animation */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
           {Array.from({ length: 10 }).map((_, i) => (
             <FloatingBit key={i} delay={i * 0.5} />
           ))}
        </div>

        <div className="z-10 w-full relative space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className={clsx("text-2xl font-mono font-bold", isCritical ? "text-red-100" : "text-slate-100")}>
                {Math.floor(rawData).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Raw Units Buffered</div>
            </div>
            <div className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-2">
              <Server size={16} className={isCritical ? "text-red-400" : "text-slate-500"} />
              +{rate.toFixed(1)} / sec
            </div>
          </div>
          {isLosingData && <div className="text-red-500 font-bold font-mono text-xs flex items-center gap-1"><AlertOctagon size={12} /> PACKET LOSS</div>}
          <div className="bg-slate-900 border border-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div className={clsx("h-full", isCritical ? "bg-red-500" : "bg-blue-500")}
              animate={{ width: `${percentageFull}%` }} transition={{ type: "spring", stiffness: 50 }} />
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex justify-between">
            <span>0</span><span>{maxStorage.toLocaleString()} CAP</span>
          </div>
        </div>

        {/* Visual Representations of source types */}
        <div className="w-full grid grid-cols-2 gap-2 opacity-50">
            <div className="bg-slate-900 p-1 rounded border border-slate-800 flex items-center gap-3">
                <FileSpreadsheet className="text-green-600" size={14} />
                <div className="h-1.5 w-full bg-slate-800 rounded overflow-hidden">
                    <motion.div 
                        className="h-full bg-green-600"
                        animate={{ width: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            </div>
            <div className="bg-slate-900 p-1 rounded border border-slate-800 flex items-center gap-3">
                <FileJson className="text-yellow-600" size={14} />
                <div className="h-1.5 w-full bg-slate-800 rounded overflow-hidden">
                    <motion.div 
                        className="h-full bg-yellow-600"
                        animate={{ width: ["0%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            </div>
        </div>
      </div>
      
      {/* Bottom info */}
      <div className="p-2 border-t border-slate-800 text-[10px] text-slate-600 font-mono">
        <div className="flex justify-between">
             <span>STREAM: {isLosingData ? <span className="text-red-500 font-bold">UNSTABLE</span> : "CONNECTED"}</span>
             <span>CAPACITY: {percentageFull.toFixed(1)}%</span>
        </div>
        <p className={clsx("transition-colors", isLosingData ? "text-red-500 font-bold" : "")}>
            PACKET_LOSS: {packetLoss.toFixed(2)}%
        </p>
      </div>
    </div>
  );
};