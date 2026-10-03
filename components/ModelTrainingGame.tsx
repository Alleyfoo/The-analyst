import React, { useEffect, useRef, useState } from 'react';
import { X, Brain, Check, Info, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface Props {
    active: boolean;
    onClose: () => void;
    onComplete: (puBonus: number, tuBonus: number, entropyEffect: number) => void;
}

export const ModelTrainingGame: React.FC<Props> = ({ active, onClose, onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [complexity, setComplexity] = useState(1);
    const [trainPoints, setTrainPoints] = useState<{x: number, y: number}[]>([]);
    const [valPoints, setValPoints] = useState<{x: number, y: number}[]>([]);
    const [showValidation, setShowValidation] = useState(false);
    
    // Game State
    const [trainingAccuracy, setTrainingAccuracy] = useState(0);
    const [generalization, setGeneralization] = useState(0); // Hidden from user until end
    const [deployed, setDeployed] = useState(false);

    // Generate random noisy data points following a trend
    useEffect(() => {
        if (active) {
            const tPoints = [];
            const vPoints = [];
            const count = 15;
            
            // True Function: sin(x * PI * 1.5)
            // Generate Training Data
            for(let i=0; i<count; i++) {
                const x = (i / (count-1)) * 0.8 + 0.1; 
                const trend = Math.sin(x * Math.PI * 1.5) * 0.5 + 0.5;
                const noise = (Math.random() - 0.5) * 0.25;
                tPoints.push({ x, y: Math.max(0.1, Math.min(0.9, trend + noise)) });
            }

            // Generate Validation Data (shifted x, different noise)
            for(let i=0; i<count; i++) {
                const x = (i / (count-1)) * 0.8 + 0.15; // Shifted
                if (x > 0.9) continue;
                const trend = Math.sin(x * Math.PI * 1.5) * 0.5 + 0.5;
                const noise = (Math.random() - 0.5) * 0.25;
                vPoints.push({ x, y: Math.max(0.1, Math.min(0.9, trend + noise)) });
            }

            setTrainPoints(tPoints);
            setValPoints(vPoints);
            setComplexity(1);
            setDeployed(false);
            setShowValidation(false);
        }
    }, [active]);

    // Draw the graph
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);
        
        // Background Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=10; i++) {
            ctx.moveTo(i * (w/10), 0); ctx.lineTo(i * (w/10), h);
            ctx.moveTo(0, i * (h/10)); ctx.lineTo(w, i * (h/10));
        }
        ctx.stroke();

        // Draw Validation Points (if enabled)
        if (showValidation) {
            valPoints.forEach(p => {
                ctx.fillStyle = '#f59e0b'; // Amber
                ctx.beginPath();
                ctx.arc(p.x * w, (1 - p.y) * h, 4, 0, Math.PI * 2);
                ctx.fill();
                // Halo
                ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
                ctx.beginPath();
                ctx.arc(p.x * w, (1 - p.y) * h, 8, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw Training Points
        trainPoints.forEach(p => {
            ctx.fillStyle = '#f8fafc'; // Slate-50
            ctx.beginPath();
            ctx.arc(p.x * w, (1 - p.y) * h, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Model Curve
        ctx.strokeStyle = '#8b5cf6'; // Purple-500
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const segments = 200;

        for(let i=0; i<=segments; i++) {
            const x = i / segments;
            
            // True underlying function (Reality) - purely for calc logic
            const realityY = Math.sin(x * Math.PI * 1.5) * 0.5 + 0.5;

            // Simple Linear Approx (Underfit)
            const linearY = 0.2 + x * 0.6; 

            // Interpolated Point (Overfit)
            let num = 0;
            let den = 0;
            // High complexity -> extremely localized weighting (nearest neighbor)
            const power = 1 + (complexity / 5); 
            
            trainPoints.forEach(p => {
                const dist = Math.abs(x - p.x) + 0.0001; 
                const weight = 1 / Math.pow(dist, power);
                num += p.y * weight;
                den += weight;
            });
            const interpY = num / den;

            // Blend based on complexity slider
            let modelY = 0;
            // 0-40: Linear -> Reality (Good Fit Zone)
            // 40-100: Reality -> Overfit (Interpolated)
            
            if (complexity < 40) {
                const t = complexity / 40;
                modelY = linearY * (1-t) + realityY * t;
            } else {
                const t = (complexity - 40) / 60;
                modelY = realityY * (1-t) + interpY * t;
            }
            
            // Render
            const canvasY = (1 - modelY) * h;
            if (i===0) ctx.moveTo(x*w, canvasY);
            else ctx.lineTo(x*w, canvasY);
        }
        ctx.stroke();

        // Calculate Stats (Recalculate exactly for current state)
        const calcStats = () => {
             // Training Error
             let totalTrainDiff = 0;
             trainPoints.forEach(p => {
                 const modelY = getModelY(p.x);
                 totalTrainDiff += Math.abs(modelY - p.y);
             });

             // Validation Error (Proxy for Generalization)
             let totalValDiff = 0;
             valPoints.forEach(p => {
                 const modelY = getModelY(p.x);
                 totalValDiff += Math.abs(modelY - p.y);
             });

             // Training Accuracy: Easier to get high
             const acc = Math.max(0, 100 - (totalTrainDiff * 25)); // Scale factor
             
             // Generalization: Harder
             const gen = Math.max(0, 100 - (totalValDiff * 40)); 

             setTrainingAccuracy(acc);
             setGeneralization(gen);
        };

        const getModelY = (x: number) => {
             const realityY = Math.sin(x * Math.PI * 1.5) * 0.5 + 0.5;
             const linearY = 0.2 + x * 0.6;
             
             let num = 0, den = 0;
             const power = 1 + (complexity / 5); 
             trainPoints.forEach(p => {
                const dist = Math.abs(x - p.x) + 0.0001; 
                const weight = 1 / Math.pow(dist, power);
                num += p.y * weight;
                den += weight;
             });
             const interpY = num / den;
             
             if (complexity < 40) {
                 const t = complexity / 40;
                 return linearY * (1-t) + realityY * t;
             } else {
                 const t = (complexity - 40) / 60;
                 return realityY * (1-t) + interpY * t;
             }
        };

        calcStats();

    }, [complexity, trainPoints, valPoints, showValidation]);

    const handleDeploy = () => {
        setDeployed(true);
        setTimeout(() => {
            const puBonus = Math.floor(trainingAccuracy * 25);
            // TU Bonus: heavily penalized if overfitting (Training >> Generalization)
            let tuBonus = Math.floor(generalization / 2);
            let entropyEffect = 0;

            const gap = trainingAccuracy - generalization;
            
            if (gap > 30) {
                // Massive Overfit
                tuBonus = -20;
                entropyEffect = 10;
            } else if (gap > 15) {
                // Slight Overfit
                tuBonus = 0;
                entropyEffect = 5;
            } else if (trainingAccuracy < 50) {
                // Underfit
                tuBonus = 0;
                entropyEffect = 0;
            } else {
                // Sweet Spot
                tuBonus = Math.floor(generalization);
                entropyEffect = -5;
            }

            onComplete(puBonus, tuBonus, entropyEffect);
            onClose();
        }, 1500);
    };

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm font-inter">
            <div className="w-full max-w-3xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col p-6">
                
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                            <Brain className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">AI Analyst</h2>
                            <p className="text-xs text-slate-500">Balance bias vs variance. Optimize for the unseen.</p>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>

                <div className="relative bg-slate-950 rounded border border-slate-800 mb-6 h-64 shadow-inner">
                    <canvas ref={canvasRef} width={700} height={256} className="w-full h-full" />
                    
                    {/* Legend */}
                    <div className="absolute top-4 left-4 text-[10px] font-mono space-y-1 bg-black/50 p-2 rounded">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-100"></div> Training Data
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div> Validation Data
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-purple-500"></div> Model
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 text-xs font-mono">
                        <div className={clsx("px-2 py-1 rounded border transition-colors", 
                            trainingAccuracy > 80 ? "bg-purple-900/50 border-purple-500 text-purple-400" : "bg-slate-900/50 border-slate-700 text-slate-400"
                        )}>
                            TRAINING_ACC: {trainingAccuracy.toFixed(1)}% (Potential PU)
                        </div>
                        
                        {/* Hidden Metric */}
                         <div className={clsx("px-2 py-1 rounded border transition-colors flex items-center gap-2", 
                            showValidation ? (generalization > 70 ? "bg-emerald-900/50 border-emerald-500 text-emerald-400" : "bg-red-900/50 border-red-500 text-red-400") : "bg-slate-900/20 border-slate-800 text-slate-600"
                        )}>
                            GENERALIZATION: {showValidation ? `${generalization.toFixed(1)}%` : "???.?%"} (Potential TU)
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-end justify-between">
                         <div className="flex-1 mr-8">
                            <div className="flex justify-between text-xs uppercase font-bold text-slate-500 mb-2">
                                <span>Simplicity (Underfit)</span>
                                <span>Model Complexity</span>
                                <span className="text-purple-400">High Variance (Overfit)</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="100" 
                                value={complexity} 
                                onChange={(e) => setComplexity(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                        
                        <button
                            onClick={() => setShowValidation(!showValidation)}
                            className={clsx(
                                "flex flex-col items-center justify-center p-2 rounded border w-24 shrink-0 transition-colors",
                                showValidation ? "bg-amber-900/20 border-amber-500 text-amber-400" : "bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700"
                            )}
                        >
                            {showValidation ? <Eye size={20} /> : <EyeOff size={20} />}
                            <span className="text-[10px] font-bold mt-1 uppercase">{showValidation ? "Hide Val" : "Show Val"}</span>
                        </button>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded text-xs text-slate-400 flex items-start gap-2">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <p>
                            Increase complexity to fit the <strong className="text-white">White Dots</strong> for PU. 
                            Use <strong className="text-amber-400">Validation View</strong> to ensure you match the <strong className="text-amber-400">Orange Dots</strong> for TU. 
                            <span className="text-red-400 ml-1">Warning: Excessive complexity without validation leads to Model Collapse (Entropy).</span>
                        </p>
                    </div>

                    <button 
                        onClick={handleDeploy}
                        disabled={deployed}
                        className={clsx(
                            "w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2",
                            deployed ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20"
                        )}
                    >
                        {deployed ? <><Check size={18}/> Model Deployed</> : "Deploy to Production"}
                    </button>
                </div>

            </div>
        </div>
    );
};