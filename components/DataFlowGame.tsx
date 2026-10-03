import React, { useEffect, useRef, useState } from 'react';
import { X, Server, Trash2, Filter } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (cleanReward: number, entropyReduction: number) => void;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'valid' | 'noise';
    active: boolean;
    trail: {x: number, y: number}[];
}

interface Gate {
    id: number;
    x: number;
    y: number;
    direction: -1 | 1; // -1 left, 1 right
    color: string;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981'];

export const DataFlowGame: React.FC<Props> = ({ active, onClose, onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState({ valid: 0, noise: 0 });
    const [timeLeft, setTimeLeft] = useState(20);
    const particlesRef = useRef<Particle[]>([]);
    const gatesRef = useRef<Gate[]>([]);
    const animationFrameRef = useRef(0);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        if (active) {
            setScore({ valid: 0, noise: 0 });
            setTimeLeft(20);
            particlesRef.current = [];
            
            // Init Gates (Grid)
            const gates = [];
            const rows = 4;
            const cols = 5;
            const startY = 150;
            const startX = window.innerWidth / 2 - (cols * 70) / 2;
            
            for(let r=0; r<rows; r++) {
                for(let c=0; c<cols; c++) {
                    // Staggered grid
                    const x = startX + c * 70 + (r%2 === 0 ? 0 : 35);
                    const y = startY + r * 90;
                    gates.push({
                        id: r*cols + c,
                        x,
                        y,
                        direction: Math.random() > 0.5 ? 1 : -1,
                        color: COLORS[(r+c) % COLORS.length]
                    });
                }
            }
            gatesRef.current = gates;
        }
    }, [active]);

    useEffect(() => {
        if (!active) return;
        if (timeLeft <= 0) {
            const entropyReduction = Math.floor(score.noise / 2);
            onComplete(score.valid * 5, entropyReduction);
            onClose();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(t => t - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, active]);

    // Game Loop
    useEffect(() => {
        if (!active) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const animate = (time: number) => {
            const dt = time - lastTimeRef.current;
            lastTimeRef.current = time;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw Background Areas
            const mid = canvas.width / 2;
            const bucketHeight = 120;
            const floorY = canvas.height - bucketHeight;
            
            // Left Bucket (DB)
            ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
            ctx.fillRect(0, floorY, mid, bucketHeight);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, floorY, mid, bucketHeight);
            
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 24px Mono';
            ctx.textAlign = 'center';
            ctx.fillText("VALID DATA (DB)", mid/2, floorY + 60);

            // Right Bucket (Trash)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.fillRect(mid, floorY, mid, bucketHeight);
            ctx.strokeStyle = '#ef4444';
            ctx.strokeRect(mid, floorY, mid, bucketHeight);
            
            ctx.fillStyle = '#ef4444';
            ctx.fillText("NOISE (DISCARD)", mid + mid/2, floorY + 60);

            // Spawn Particles
            if (Math.random() < 0.15) {
                particlesRef.current.push({
                    id: Math.random(),
                    x: canvas.width / 2 + (Math.random() - 0.5) * 60,
                    y: 50,
                    vx: 0,
                    vy: 3,
                    type: Math.random() > 0.6 ? 'noise' : 'valid', // 40% noise
                    active: true,
                    trail: []
                });
            }

            // Draw Gates (Neon Style)
            gatesRef.current.forEach(g => {
                ctx.save();
                
                // Glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = g.color;
                
                // Draw Deflector Paddle
                ctx.beginPath();
                ctx.strokeStyle = g.color;
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                
                const size = 18;
                if (g.direction === 1) { // Right (\)
                     ctx.moveTo(g.x - size, g.y - size);
                     ctx.lineTo(g.x + size, g.y + size);
                } else { // Left (/)
                     ctx.moveTo(g.x + size, g.y - size);
                     ctx.lineTo(g.x - size, g.y + size);
                }
                ctx.stroke();
                
                // Draw Pivot Point
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(g.x, g.y, 3, 0, Math.PI*2);
                ctx.fill();
                
                ctx.restore();
            });

            // Update & Draw Particles
            particlesRef.current.forEach(p => {
                if (!p.active) return;
                
                // Update Trail
                p.trail.push({x: p.x, y: p.y});
                if (p.trail.length > 5) p.trail.shift();

                p.y += p.vy;
                p.x += p.vx;
                p.vy += 0.15; // gravity
                p.vx *= 0.96; // friction

                // Gate Collision
                gatesRef.current.forEach(g => {
                     const dx = p.x - g.x;
                     const dy = p.y - g.y;
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     if (dist < 25) {
                         // Deflect logic
                         const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                         p.vx = g.direction * (speed * 0.8 + 2); // Transfer momentum sideways
                         p.vy = speed * 0.5; // Lose some vertical speed
                         p.y = g.y + 15; // Push down slightly to avoid stick
                     }
                });

                // Wall Collision
                if (p.x < 0 || p.x > canvas.width) {
                    p.vx *= -1;
                    p.x = Math.max(0, Math.min(canvas.width, p.x));
                }

                // Bucket Collision
                if (p.y > floorY) {
                    p.active = false;
                    if (p.x < canvas.width / 2) {
                        // Left Bucket
                        if (p.type === 'valid') setScore(s => ({ ...s, valid: s.valid + 1 }));
                        else setScore(s => ({ ...s, valid: Math.max(0, s.valid - 1) })); // Penalty
                    } else {
                        // Right Bucket
                        if (p.type === 'noise') setScore(s => ({ ...s, noise: s.noise + 1 }));
                        else setScore(s => ({ ...s, noise: Math.max(0, s.noise - 1) })); // Penalty
                    }
                }

                // Draw Trail
                if (p.trail.length > 1) {
                    ctx.beginPath();
                    ctx.strokeStyle = p.type === 'valid' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for(let i=1; i<p.trail.length; i++) {
                        ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    }
                    ctx.stroke();
                }

                // Draw Head
                ctx.fillStyle = p.type === 'valid' ? '#10b981' : '#ef4444';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            particlesRef.current = particlesRef.current.filter(p => p.active);
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current);

    }, [active]);

    const handleClick = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Toggle Gate
        gatesRef.current.forEach(g => {
            const dist = Math.sqrt(Math.pow(x - g.x, 2) + Math.pow(y - g.y, 2));
            if (dist < 40) {
                g.direction *= -1;
            }
        });
    };

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950">
            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-pointer"
                onClick={handleClick}
            />
            
            <div className="absolute top-6 left-6 text-white font-mono pointer-events-none">
                 <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                     <Filter size={24} className="text-blue-400" /> Data Flow Modeling
                 </h2>
                 <p className="text-xs text-slate-400 mb-4">Click gates to route VALID (Green) to Left, NOISE (Red) to Right.</p>
                 
                 <div className="flex gap-6">
                     <div className="bg-emerald-900/50 p-4 rounded border border-emerald-500">
                         <div className="text-2xl font-bold">{score.valid}</div>
                         <div className="text-xs text-emerald-400">CLEAN DATA SAVED</div>
                     </div>
                     <div className="bg-red-900/50 p-4 rounded border border-red-500">
                         <div className="text-2xl font-bold">{score.noise}</div>
                         <div className="text-xs text-red-400">NOISE DISCARDED</div>
                     </div>
                 </div>
            </div>

            <div className="absolute top-6 right-20 text-white font-mono text-4xl font-bold">
                 {timeLeft}s
            </div>

            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer z-50"
            >
                <X size={24} />
            </button>
        </div>
    );
};