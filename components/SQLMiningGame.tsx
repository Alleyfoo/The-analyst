import React, { useState, useEffect } from 'react';
import { Terminal, Play, X, Database } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (reward: number, puBonus: number) => void;
}

// Simple puzzle logic
// Request: "Select all [Status] Users from [City]"
// Valid Query: SELECT * FROM Users WHERE Status = [Status] AND City = [City]

const REQUESTS = [
    { text: "Find all Active Users from New York", required: ["SELECT", "*", "FROM", "Users", "WHERE", "Status='Active'", "AND", "City='NY'"] },
    { text: "List Premium Accounts with > $1000 Balance", required: ["SELECT", "id", "FROM", "Accounts", "WHERE", "Plan='Premium'", "AND", "Balance > 1000"] },
    { text: "Get Error Logs with Code 500", required: ["SELECT", "*", "FROM", "Logs", "WHERE", "Code=500"] },
    { text: "Find Inactive items in Inventory", required: ["SELECT", "sku", "FROM", "Inventory", "WHERE", "Active=FALSE"] },
];

const FRAGMENTS = [
    "SELECT", "FROM", "WHERE", "AND", "OR", "DELETE",
    "*", "id", "sku", 
    "Users", "Accounts", "Logs", "Inventory",
    "Status='Active'", "City='NY'", "Plan='Premium'", "Balance > 1000",
    "Code=500", "Active=FALSE", "Active=TRUE", "Code=404"
];

export const SQLMiningGame: React.FC<Props> = ({ active, onClose, onComplete }) => {
    const [requestIndex, setRequestIndex] = useState(0);
    const [query, setQuery] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (active) {
            setQuery([]);
            setError(null);
            setSuccess(false);
            setRequestIndex(Math.floor(Math.random() * REQUESTS.length));
        }
    }, [active]);

    const handleFragmentClick = (frag: string) => {
        if (success) return;
        setQuery([...query, frag]);
        setError(null);
    };

    const handleBackspace = () => {
        if (success) return;
        setQuery(query.slice(0, -1));
        setError(null);
    };

    const handleExecute = () => {
        if (success) return;
        
        const target = REQUESTS[requestIndex];
        
        // Check if query matches target requirement exactly (simplified)
        // We check if all required tokens are present in relative order
        // Actually, let's just check exact sequence for this simple puzzle
        
        const currentString = query.join(" ");
        const targetString = target.required.join(" ");

        if (currentString === targetString) {
            setSuccess(true);
            setTimeout(() => {
                onComplete(100, 250); // 100 Clean Data, 250 PU
                onClose();
            }, 1500);
        } else {
            // Determine error type
            if (query.length === 0) setError("Empty Query");
            else if (query[0] !== "SELECT") setError("Syntax Error: Must start with SELECT");
            else setError("Result Set Empty (Incorrect Logic)");
        }
    };

    if (!active) return null;

    const target = REQUESTS[requestIndex];

    // Data filtering visualization
    // We visualize "rows" of data.
    // Base rows: 20
    // SELECT * FROM Table -> 20 rows
    // WHERE ... -> Filters down
    
    // We can simulate "filtering" based on how many correct keywords from the start match
    let correctCount = 0;
    for(let i=0; i<Math.min(query.length, target.required.length); i++) {
        if (query[i] === target.required[i]) correctCount++;
        else break;
    }
    
    const progress = correctCount / target.required.length;
    const rowsRemaining = Math.max(1, Math.floor(20 * (1 - (progress * 0.9)))); // Go down to 1-2 rows
    const isGold = success;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono">
            <div className="w-full max-w-5xl h-[600px] bg-slate-900 rounded-lg border border-slate-700 shadow-2xl flex overflow-hidden">
                
                {/* Left Panel: Query Interface */}
                <div className="flex-1 flex flex-col border-r border-slate-700">
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                         <div className="flex items-center gap-2">
                             <Database size={16} className="text-blue-400" />
                             <span className="text-slate-200 font-bold text-sm">SQL_EDITOR_PRO.exe</span>
                         </div>
                         <button onClick={onClose}><X size={18} className="text-slate-500 hover:text-white" /></button>
                    </div>

                    <div className="p-6 bg-slate-900/50 flex-1 flex flex-col gap-6">
                        {/* Task */}
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded">
                            <h3 className="text-blue-400 text-xs font-bold uppercase mb-1">Incoming Request</h3>
                            <p className="text-slate-200 text-lg">"{target.text}"</p>
                        </div>

                        {/* Editor Display */}
                        <div className="bg-black border border-slate-600 p-4 rounded min-h-[100px] relative font-mono text-base shadow-inner">
                            {query.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {query.map((q, i) => (
                                        <span key={i} className={clsx(
                                            "px-1 rounded",
                                            ["SELECT", "FROM", "WHERE", "AND", "OR", "DELETE"].includes(q) ? "text-purple-400 font-bold" : 
                                            q.includes("'") ? "text-green-400" :
                                            "text-blue-300"
                                        )}>
                                            {q}
                                        </span>
                                    ))}
                                    <span className="animate-pulse bg-slate-500 w-2 h-5 inline-block ml-1 align-middle"></span>
                                </div>
                            ) : (
                                <span className="text-slate-600 italic">Select clauses below to construct query...</span>
                            )}
                            
                            {error && (
                                <div className="absolute bottom-2 right-2 text-red-500 text-xs font-bold bg-red-900/20 px-2 py-1 rounded border border-red-500/50">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="absolute bottom-2 right-2 text-emerald-500 text-xs font-bold bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/50 flex items-center gap-1">
                                    <Terminal size={12} /> EXECUTION SUCCESSFUL
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-2">
                            <button 
                                onClick={handleExecute}
                                disabled={success}
                                className={clsx("flex-1 py-3 rounded font-bold flex items-center justify-center gap-2 transition-all", 
                                    success ? "bg-emerald-600 text-white cursor-default" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20")}
                            >
                                <Play size={16} fill="currentColor" /> {success ? "COMPLETED" : "EXECUTE"}
                            </button>
                            <button 
                                onClick={handleBackspace}
                                disabled={query.length === 0 || success}
                                className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded font-bold"
                            >
                                ⌫
                            </button>
                        </div>

                        {/* Clause Bank */}
                        <div className="mt-auto">
                            <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">Clause Bank</h4>
                            <div className="flex flex-wrap gap-2">
                                {FRAGMENTS.map((frag, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleFragmentClick(frag)}
                                        disabled={success}
                                        className={clsx("px-3 py-1.5 rounded text-xs font-mono border transition-all active:scale-95", 
                                            ["SELECT", "FROM", "WHERE", "AND", "OR", "DELETE"].includes(frag) ? "bg-purple-900/30 border-purple-500/50 text-purple-300 hover:bg-purple-900/50" : 
                                            frag.includes("'") ? "bg-green-900/30 border-green-500/50 text-green-300 hover:bg-green-900/50" :
                                            "bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-900/50"
                                        )}
                                    >
                                        {frag}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Panel: Visualization */}
                <div className="w-64 bg-black p-4 flex flex-col border-l border-slate-700">
                    <h3 className="text-slate-500 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                         Data Core Preview
                    </h3>
                    
                    <div className="flex-1 space-y-1 overflow-hidden relative">
                         {/* Rows */}
                         <AnimatePresence>
                             {Array.from({length: 20}).map((_, i) => {
                                 const isRemoved = i >= rowsRemaining;
                                 if (isRemoved) return null;

                                 return (
                                     <motion.div
                                        key={i}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0, filter: 'blur(10px)' }}
                                        className={clsx(
                                            "h-6 w-full rounded flex items-center px-2 gap-2 text-[10px]",
                                            isGold ? "bg-amber-500/20 border border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-slate-800 border border-slate-700 text-slate-500"
                                        )}
                                     >
                                         <div className={clsx("w-2 h-2 rounded-full", isGold ? "bg-amber-500 animate-pulse" : "bg-slate-600")} />
                                         <div className="h-1 bg-current w-1/3 opacity-50 rounded" />
                                         <div className="h-1 bg-current w-1/4 opacity-30 rounded" />
                                     </motion.div>
                                 )
                             })}
                         </AnimatePresence>
                         
                         {/* Scanline */}
                         <motion.div 
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent pointer-events-none"
                            animate={{ top: ['-100%', '100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                         />
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                         <span>ROWS: {rowsRemaining} / 20</span>
                         <span>FILTER_DEPTH: {(progress * 100).toFixed(0)}%</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
