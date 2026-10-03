import React, { useEffect, useRef, useState } from 'react';
import { X, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (metricsReward: number, tuReward: number) => void;
}

export const ProcessMiningGame: React.FC<Props> = ({ active, onClose, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'running' | 'complete'>('waiting');
  
  // Game constants
  const SPEED = 2; // Speed of the signal
  const RADIUS = 30; // Radius of target circle
  
  const mouseRef = useRef({ x: 0, y: 0 });
  const progressRef = useRef(0);
  const pathRef = useRef<{x: number, y: number}[]>([]);
  const animationFrameRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (active) {
       setStatus('waiting');
       setScore(0);
       scoreRef.current = 0;
       progressRef.current = 0;
       
       // Generate Path
       // Simple Bezier-ish path
       const path = [];
       const w = window.innerWidth * 0.8;
       const h = window.innerHeight * 0.6;
       const startX = window.innerWidth * 0.1;
       const startY = window.innerHeight * 0.5;
       
       let cx = startX;
       let cy = startY;
       
       // Generate points
       for (let i = 0; i < 1000; i++) {
           path.push({ x: cx, y: cy });
           cx += SPEED;
           cy += Math.sin(i * 0.02) * 2 + (Math.random() - 0.5) * 4;
           
           // Clamp
           if (cy < window.innerHeight * 0.2) cy += 2;
           if (cy > window.innerHeight * 0.8) cy -= 2;
       }
       pathRef.current = path;
    }
  }, [active]);

  const startGame = () => {
      setStatus('running');
  };

  useEffect(() => {
      if (status !== 'running') return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw Path (Faint)
          ctx.beginPath();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 4;
          const path = pathRef.current;
          if (path.length > 0) {
              ctx.moveTo(path[0].x, path[0].y);
              for (let i = 1; i < path.length; i++) {
                  ctx.lineTo(path[i].x, path[i].y);
              }
          }
          ctx.stroke();

          // Update Progress
          progressRef.current += 1;
          
          if (progressRef.current >= path.length) {
              // End Game
              setStatus('complete');
              // Reward based on score
              const maxScore = path.length; // Max possible if perfectly tracking every frame
              const accuracy = scoreRef.current / maxScore;
              
              const metricsReward = Math.floor(accuracy * 50);
              const tuReward = Math.floor(accuracy * 5);
              
              setTimeout(() => {
                  onComplete(metricsReward, tuReward);
                  onClose();
              }, 1500);
              return;
          }

          // Current Target Position
          const target = path[progressRef.current];

          // Draw Target Circle
          ctx.beginPath();
          ctx.arc(target.x, target.y, RADIUS, 0, Math.PI * 2);
          
          // Check Collision
          const dx = mouseRef.current.x - target.x;
          const dy = mouseRef.current.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const isTracking = dist < RADIUS;
          if (isTracking) {
              scoreRef.current += 1;
              setScore(scoreRef.current);
              ctx.fillStyle = 'rgba(16, 185, 129, 0.5)'; // Green
              ctx.strokeStyle = '#10b981';
          } else {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Red
              ctx.strokeStyle = '#ef4444';
          }
          
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.stroke();

          // Connect cursor line
          ctx.beginPath();
          ctx.moveTo(mouseRef.current.x, mouseRef.current.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = isTracking ? '#10b981' : '#ef4444';
          ctx.stroke();

          animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrameRef.current);

  }, [status]);

  const handleMouseMove = (e: React.MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 cursor-none" onMouseMove={handleMouseMove}>
         <canvas ref={canvasRef} className="block" />
         
         {/* UI Overlay */}
         <div className="absolute top-6 left-6 text-white font-mono pointer-events-none select-none">
             <div className="flex items-center gap-2 text-emerald-400 mb-2">
                 <Activity size={20} />
                 <h2 className="text-xl font-bold">Process Mining</h2>
             </div>
             {status === 'waiting' && (
                 <div className="bg-slate-800 p-4 rounded border border-slate-700 animate-pulse">
                     <p className="text-sm text-slate-300">Keep your mouse inside the moving signal to capture data.</p>
                     <p className="text-xs text-slate-500 mt-2">CLICK TO START TRACE</p>
                 </div>
             )}
             {status === 'running' && (
                 <div>
                     <div className="text-2xl font-bold">{score} / {pathRef.current.length}</div>
                     <div className="text-xs text-slate-500">SAMPLES CAPTURED</div>
                 </div>
             )}
             {status === 'complete' && (
                 <div className="bg-emerald-900/50 p-6 rounded border border-emerald-500 text-center">
                     <h3 className="text-2xl font-bold text-white mb-2">TRACE COMPLETE</h3>
                     <p className="text-emerald-300">Efficiency: {Math.floor((score / pathRef.current.length) * 100)}%</p>
                 </div>
             )}
         </div>

         {/* Start Click Layer */}
         {status === 'waiting' && (
             <div 
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
                onClick={startGame}
             >
                 <div className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-105 transition-transform">
                     START TRACE
                 </div>
             </div>
         )}
         
         <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer z-20"
         >
             <X size={24} />
         </button>
    </div>
  );
};