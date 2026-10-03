import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Scan, AlertOctagon, Check, Image as ImageIcon, Star } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (rawReward: number, cleanReward: number) => void;
}

interface DocElement {
    id: number;
    type: 'text' | 'image' | 'table';
    x: number;
    y: number;
    w: number;
    h: number;
    captured: boolean;
}

export const PDFScanningGame: React.FC<Props> = ({ active, onClose, onComplete }) => {
    const [elements, setElements] = useState<DocElement[]>([]);
    const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef<{x: number, y: number}>({x: 0, y: 0});
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [capturedTables, setCapturedTables] = useState(0);
    const [capturedNoise, setCapturedNoise] = useState(0);
    const [totalTables, setTotalTables] = useState(0);
    
    // Result State
    const [isComplete, setIsComplete] = useState(false);
    const [finalReward, setFinalReward] = useState({ raw: 0, clean: 0 });

    // Init Level
    useEffect(() => {
        if (active) {
            setIsComplete(false);
            setFinalReward({ raw: 0, clean: 0 });
            
            const newElements: DocElement[] = [];
            let tableCount = 0;
            
            // Generate Random Layout
            const rows = 12;
            const cols = 8;
            
            for(let i=0; i<15; i++) {
                const typeRoll = Math.random();
                const type = typeRoll > 0.7 ? 'table' : typeRoll > 0.4 ? 'image' : 'text';
                
                const w = type === 'table' ? 200 + Math.random() * 100 : type === 'image' ? 150 : 300 + Math.random() * 100;
                const h = type === 'table' ? 150 + Math.random() * 100 : type === 'image' ? 150 : 20;
                
                // Random position with some overlap allowance
                const x = Math.random() * (600 - w);
                const y = Math.random() * (800 - h);
                
                if (type === 'table') tableCount++;
                
                newElements.push({
                    id: i,
                    type,
                    x, y, w, h,
                    captured: false
                });
            }
            
            // Ensure at least 3 tables
            while (tableCount < 3) {
                 const x = Math.random() * (600 - 250);
                 const y = Math.random() * (800 - 200);
                 newElements.push({
                    id: Math.random(),
                    type: 'table',
                    x, y, w: 250, h: 200,
                    captured: false
                });
                tableCount++;
            }

            setElements(newElements);
            setTotalTables(tableCount);
            setCapturedTables(0);
            setCapturedNoise(0);
        }
    }, [active]);

    // Check Win Condition - With Delay to prevent suddenness
    useEffect(() => {
        if (!active || isComplete) return;
        
        if (totalTables > 0 && capturedTables >= totalTables) {
            // Add slight delay before showing win screen
            const timer = setTimeout(() => {
                const rawReward = 500 - (capturedNoise * 50); // Penalty for noise
                const cleanReward = Math.max(0, 50 - (capturedNoise * 10));
                
                setFinalReward({ 
                    raw: Math.max(100, rawReward), 
                    clean: cleanReward 
                });
                setIsComplete(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [capturedTables, totalTables, active, isComplete, capturedNoise]);

    const handleClaim = () => {
        onComplete(finalReward.raw, finalReward.clean);
        onClose();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isComplete || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setIsDragging(true);
        startPos.current = { x, y };
        setSelection({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isComplete || !isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const x = Math.min(currentX, startPos.current.x);
        const y = Math.min(currentY, startPos.current.y);
        const w = Math.abs(currentX - startPos.current.x);
        const h = Math.abs(currentY - startPos.current.y);
        
        setSelection({ x, y, w, h });
    };

    const handleMouseUp = () => {
        if (isComplete || !isDragging || !selection) return;
        setIsDragging(false);
        
        // Check Collisions
        const hits = elements.filter(el => {
            if (el.captured) return false;
            // Check overlap
            const elRight = el.x + el.w;
            const elBottom = el.y + el.h;
            const selRight = selection.x + selection.w;
            const selBottom = selection.y + selection.h;
            
            // AABB Collision
            return (selection.x < elRight && selRight > el.x && selection.y < elBottom && selBottom > el.y);
        });

        if (hits.length > 0) {
            let foundTable = false;
            let foundNoise = false;

            const nextElements = elements.map(el => {
                const hit = hits.find(h => h.id === el.id);
                if (hit) {
                    if (el.type === 'table') foundTable = true;
                    if (el.type === 'image') foundNoise = true; // Images are noise
                    return { ...el, captured: true };
                }
                return el;
            });
            
            setElements(nextElements);
            if (foundTable) setCapturedTables(prev => prev + hits.filter(h => h.type === 'table').length);
            if (foundNoise) setCapturedNoise(prev => prev + hits.filter(h => h.type === 'image').length);
        }

        setSelection(null);
    };

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
            
            {/* Result Overlay - Prevents clicks on anything else */}
            <AnimatePresence>
                {isComplete && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-[60] bg-slate-900/95 flex items-center justify-center"
                    >
                        <div className="bg-slate-800 p-8 rounded-xl border border-emerald-500 shadow-2xl text-center max-w-sm w-full relative overflow-hidden">
                            {/* Confetti / Particle effect could go here */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse"></div>

                            <div className="flex justify-center mb-6">
                                <div className="bg-emerald-500/20 p-4 rounded-full border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    <Star size={48} className="text-emerald-400" fill="currentColor" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">SCAN COMPLETE</h2>
                            <p className="text-slate-400 text-sm mb-8">Data successfully extracted and parsed.</p>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center bg-slate-900 p-4 rounded border border-slate-700">
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Raw Data</span>
                                    <span className="text-emerald-400 font-mono font-bold text-xl">+{finalReward.raw}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900 p-4 rounded border border-slate-700">
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Clean Data</span>
                                    <span className="text-blue-400 font-mono font-bold text-xl">+{finalReward.clean}</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleClaim}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                CLAIM REWARDS
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative w-full max-w-4xl h-[90vh] flex flex-col bg-[#e2e8f0] rounded shadow-2xl overflow-hidden text-slate-900 font-sans border-4 border-slate-800">
                
                {/* Header / Tools */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center z-10 shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <Scan className="text-blue-400" />
                             <span className="font-bold tracking-tight">OCR_SCANNER_V2.0</span>
                        </div>
                        <div className="h-6 w-px bg-slate-600" />
                        <div className="flex gap-4 text-xs font-mono">
                             <div className={clsx(capturedTables === totalTables ? "text-emerald-400 font-bold" : "text-slate-300")}>
                                 TABLES: {capturedTables}/{totalTables}
                             </div>
                             <div className={clsx(capturedNoise > 0 ? "text-red-400 font-bold" : "text-slate-400")}>
                                 ERRORS: {capturedNoise}
                             </div>
                        </div>
                    </div>
                    {/* Only allow close via X if not complete (complete forces claim) */}
                    {!isComplete && (
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-700 p-1.5 rounded hover:bg-slate-600">
                            <X size={20} />
                        </button>
                    )}
                </div>
                
                {/* Scrollable Document Area */}
                <div className="flex-1 overflow-auto bg-slate-700 p-8 flex justify-center relative cursor-crosshair">
                    <div 
                        ref={containerRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className="w-[700px] h-[1000px] bg-white shadow-xl relative select-none"
                    >
                        {/* Render Elements */}
                        {elements.map(el => (
                            <motion.div
                                key={el.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: el.captured ? 0.3 : 1 }}
                                className={clsx(
                                    "absolute border overflow-hidden transition-opacity duration-300",
                                    el.type === 'table' ? "border-slate-300" : "border-transparent"
                                )}
                                style={{
                                    left: el.x, top: el.y, width: el.w, height: el.h
                                }}
                            >
                                {el.type === 'text' && (
                                    <div className="w-full h-full flex flex-col justify-around opacity-60">
                                        {Array.from({ length: Math.ceil(el.h / 10) }).map((_, i) => (
                                            <div key={i} className="h-2 bg-slate-400 w-full rounded-full" style={{ width: `${Math.random() * 40 + 60}%` }} />
                                        ))}
                                    </div>
                                )}
                                
                                {el.type === 'image' && (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center relative border border-slate-200">
                                         <ImageIcon className="text-slate-300" size={48} />
                                         <div className="absolute bottom-2 right-2 text-[8px] text-slate-400 font-bold uppercase tracking-widest">Advertisement</div>
                                         {el.captured && <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold border-2 border-red-500 bg-red-100/80">NOISE DETECTED</div>}
                                    </div>
                                )}

                                {el.type === 'table' && (
                                    <div className="w-full h-full bg-white relative shadow-sm">
                                        {/* Fake Grid */}
                                        <div className="grid grid-cols-4 h-full border-l border-t border-slate-300">
                                            {Array.from({ length: 16 }).map((_, i) => (
                                                <div key={i} className="border-r border-b border-slate-300 text-[6px] text-slate-400 p-1 overflow-hidden whitespace-nowrap bg-white">
                                                    {i < 4 ? "HEADER_COL" : "DATA_CELL_VALUE"}
                                                </div>
                                            ))}
                                        </div>
                                        {el.captured && (
                                            <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold backdrop-blur-[1px]">
                                                <div className="bg-white/90 px-3 py-1 rounded shadow-sm flex items-center gap-1">
                                                    <Check size={14} /> EXTRACTED
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {/* Drag Selection Box */}
                        {selection && (
                            <div 
                                className="absolute bg-blue-500/20 border-2 border-blue-500 pointer-events-none z-50"
                                style={{
                                    left: selection.x, top: selection.y, width: selection.w, height: selection.h
                                }}
                            />
                        )}

                    </div>
                </div>
                
                {/* Footer Instructions */}
                <div className="bg-slate-800 text-slate-400 p-2 text-xs text-center font-mono border-t border-slate-700">
                    <span className="text-blue-400 font-bold">DRAG</span> to select tables. Avoid images.
                </div>

            </div>
        </div>
    );
};