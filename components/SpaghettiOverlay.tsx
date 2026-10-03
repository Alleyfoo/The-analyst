import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    active: boolean;
    onClose: () => void;
    onClean: (cost: number, reward: number, puBonus: number) => void;
    rawData: number;
}

interface Point {
    x: number;
    y: number;
}

interface Strand {
    id: number;
    p1: Point;
    p2: Point;
    cp1: Point;
    cp2: Point;
    color: string;
    isFixed: boolean;
    fixProgress: number; // 0 to 1
    fixedTime: number; // timestamp
    flowOffset: number; // 0 to 1 for animation
    flowSpeed: number;
}

const COLORS = ['#ef4444', '#f472b6', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];
const CLEAN_COLOR = '#10b981'; // Emerald for fixed lines

export const SpaghettiOverlay: React.FC<Props> = ({ active, onClose, onClean, rawData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strandsRef = useRef<Strand[]>([]);
    const [score, setScore] = useState(0);
    const animationFrameRef = useRef<number>(0);
    const lastSpawnRef = useRef<number>(0);
    
    // Local tracker to prevent race conditions where user cleans faster than React prop updates
    const localDataRef = useRef(rawData);

    const COST = 5;
    const REWARD = 5;
    const PU_BONUS = 25;

    // Sync local ref with prop when prop updates
    useEffect(() => {
        localDataRef.current = rawData;
    }, [rawData]);

    // Bezier math helper to find point at t (0-1)
    const getBezierPoint = (t: number, p1: Point, cp1: Point, cp2: Point, p2: Point) => {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = mt3 * p1.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p2.x;
        const y = mt3 * p1.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p2.y;
        return { x, y };
    };

    const generateStrand = (width: number, height: number): Strand => {
        const p1 = { x: -50, y: Math.random() * height };
        const p2 = { x: width + 50, y: Math.random() * height };
        
        // Chaotic control points
        const cp1 = { 
            x: width * 0.3 + (Math.random() - 0.5) * width * 0.5, 
            y: Math.random() * height 
        };
        const cp2 = { 
            x: width * 0.7 + (Math.random() - 0.5) * width * 0.5, 
            y: Math.random() * height 
        };

        return {
            id: Math.random(),
            p1, p2, cp1, cp2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            isFixed: false,
            fixProgress: 0,
            fixedTime: 0,
            flowOffset: Math.random(),
            flowSpeed: 0.005 + Math.random() * 0.01
        };
    };

    const spawnBatch = (width: number, height: number) => {
        const count = 5 + Math.floor(Math.random() * 5);
        for(let i=0; i<count; i++) {
            strandsRef.current.push(generateStrand(width, height));
        }
    };

    useEffect(() => {
        if (!active) {
            strandsRef.current = [];
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initial spawn
        if (strandsRef.current.length === 0) {
            spawnBatch(canvas.width, canvas.height);
        }

        const animate = (time: number) => {
            if (!active) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Background - Dark Tech Grid
            ctx.fillStyle = '#020617'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Faint Grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let x=0; x<canvas.width; x+=50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
            for(let y=0; y<canvas.height; y+=50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
            ctx.stroke();

            // Text
            ctx.shadowBlur = 0;
            ctx.font = 'bold 24px JetBrains Mono';
            ctx.fillStyle = '#fff';
            ctx.fillText("DATA CLEANING MODE [SPAGHETTI PROTOCOL]", 40, 60);
            
            ctx.font = '14px Inter';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText("Untangle the corrupt data streams. Hover to process.", 40, 90);
            
            // Respawn Logic
            if (time - lastSpawnRef.current > 3000 && strandsRef.current.length < 12) {
                spawnBatch(canvas.width, canvas.height);
                lastSpawnRef.current = time;
            }

            // Render Strands
            strandsRef.current.forEach(strand => {
                // Physics Update
                strand.flowOffset += strand.flowSpeed;
                if (strand.flowOffset > 1) strand.flowOffset = 0;

                if (strand.isFixed) {
                    strand.fixProgress = Math.min(1, strand.fixProgress + 0.05);
                    
                    // Linear interpolate control points towards straight line
                    const targetCp1 = {
                        x: strand.p1.x + (strand.p2.x - strand.p1.x) * 0.33,
                        y: strand.p1.y + (strand.p2.y - strand.p1.y) * 0.33
                    };
                    const targetCp2 = {
                        x: strand.p1.x + (strand.p2.x - strand.p1.x) * 0.66,
                        y: strand.p1.y + (strand.p2.y - strand.p1.y) * 0.66
                    };

                    strand.cp1.x += (targetCp1.x - strand.cp1.x) * 0.1;
                    strand.cp1.y += (targetCp1.y - strand.cp1.y) * 0.1;
                    strand.cp2.x += (targetCp2.x - strand.cp2.x) * 0.1;
                    strand.cp2.y += (targetCp2.y - strand.cp2.y) * 0.1;
                }

                // --- DRAWING ---
                const currentColor = strand.isFixed ? CLEAN_COLOR : strand.color;
                const alpha = strand.isFixed ? (1 - (time - strand.fixedTime)/2000) : 1;
                
                if (alpha <= 0) return; // Skip invisible

                ctx.globalAlpha = alpha;

                // 1. Draw Glow/Blur
                ctx.shadowBlur = 15;
                ctx.shadowColor = currentColor;
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = strand.isFixed ? 3 : 2;
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.moveTo(strand.p1.x, strand.p1.y);
                ctx.bezierCurveTo(strand.cp1.x, strand.cp1.y, strand.cp2.x, strand.cp2.y, strand.p2.x, strand.p2.y);
                ctx.stroke();

                // 2. Draw Core (White/Bright center for fiber optic look)
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke(); // Stroke same path

                // 3. Draw Data Pulse (Traveling dot)
                const pulsePos = getBezierPoint(strand.flowOffset, strand.p1, strand.cp1, strand.cp2, strand.p2);
                
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(pulsePos.x, pulsePos.y, 3, 0, Math.PI * 2);
                ctx.fill();

                // 4. Draw Tail behind pulse
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                // Simple tail approximation using previous t
                const tailT = Math.max(0, strand.flowOffset - 0.05);
                const tailPos = getBezierPoint(tailT, strand.p1, strand.cp1, strand.cp2, strand.p2);
                ctx.moveTo(pulsePos.x, pulsePos.y);
                ctx.lineTo(tailPos.x, tailPos.y);
                ctx.stroke();

                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            });

            // Cleanup old fixed strands
            strandsRef.current = strandsRef.current.filter(s => !s.isFixed || (time - s.fixedTime) < 2000);

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [active]);

    // Input Handling
    const handleInput = (clientX: number, clientY: number) => {
        if (!active) return;
        
        // Safe Budget Check:
        // We ensure we have slightly more than needed (COST + 2) to account for 
        // potential engine tick consumption happening between frames.
        if (localDataRef.current < COST + 2) return;

        let cleanedCount = 0;

        strandsRef.current.forEach(strand => {
            if (strand.isFixed) return;

            // Simple hit detection at t=0.5
            const t = 0.5;
            const mid = getBezierPoint(t, strand.p1, strand.cp1, strand.cp2, strand.p2);
            
            // Allow larger hit area
            const dist = Math.sqrt(Math.pow(clientX - mid.x, 2) + Math.pow(clientY - mid.y, 2));

            if (dist < 80) { 
                // Double check budget before committing this specific strand
                if (localDataRef.current >= COST + 2) {
                    strand.isFixed = true;
                    strand.fixedTime = performance.now();
                    strand.flowSpeed *= 4; // Data speeds up when clean
                    cleanedCount++;
                    
                    // Deduct locally immediately
                    localDataRef.current -= COST;
                }
            }
        });

        if (cleanedCount > 0) {
            // Batch update to engine: Send total cost and total reward
            // This ensures atomic update in the game engine state
            onClean(COST * cleanedCount, REWARD * cleanedCount, PU_BONUS * cleanedCount);
            setScore(s => s + cleanedCount);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        handleInput(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleInput(touch.clientX, touch.clientY);
    };

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-50 cursor-crosshair">
            <canvas 
                ref={canvasRef} 
                className="w-full h-full"
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            />
            
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-4 bg-slate-800 rounded-full hover:bg-slate-700 text-white z-50 border border-slate-600 shadow-xl"
            >
                <X size={24} />
            </button>
            
            {/* Warning if no data */}
            {localDataRef.current < COST && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 font-mono font-bold bg-black/80 p-4 rounded border border-red-500 pointer-events-none">
                    INSUFFICIENT RAW DATA
                </div>
            )}

            <div className="absolute bottom-6 left-6 flex items-center gap-4">
                <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-700 shadow-2xl backdrop-blur-sm pointer-events-none">
                    <div className="text-xs text-slate-400 font-mono mb-1">SESSION EFFICIENCY</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{score}</span>
                        <span className="text-sm text-slate-500">streams optimized</span>
                    </div>
                </div>
                
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={score}
                    className="text-emerald-400 font-mono font-bold text-lg"
                >
                    {score > 0 ? `+${score * PU_BONUS} PU` : ''}
                </motion.div>
            </div>
        </div>
    );
};