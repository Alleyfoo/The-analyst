import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sword, Zap, Brain, Trophy, Frown } from 'lucide-react';
import { BUZZWORDS_REAL, BUZZWORDS_FAKE } from '../constants';
import clsx from 'clsx';

interface Props {
  active: boolean;
  onClose: () => void;
  onComplete: (score: number, stolenData: number) => void;
}

interface Word {
  id: number;
  text: string;
  isReal: boolean;
  status: 'initial' | 'correct' | 'wrong';
}

export const BuzzwordBattle: React.FC<Props> = ({ active, onClose, onComplete }) => {
  const [words, setWords] = useState<Word[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (active) {
      setScore(0);
      setTimeLeft(15);
      setGameOver(false);
      setShowResult(false);
      generateWords();
    }
  }, [active]);

  useEffect(() => {
    if (!active || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [active, gameOver]);

  const generateWords = () => {
    // Pick 9 words total, mix of real and fake
    const count = 9;
    const realCount = 4 + Math.floor(Math.random() * 2); // 4-5 real words
    const fakeCount = count - realCount;

    const chosenReal = [...BUZZWORDS_REAL].sort(() => 0.5 - Math.random()).slice(0, realCount);
    const chosenFake = [...BUZZWORDS_FAKE].sort(() => 0.5 - Math.random()).slice(0, fakeCount);

    const allWords = [
      ...chosenReal.map(w => ({ id: Math.random(), text: w, isReal: true, status: 'initial' as const })),
      ...chosenFake.map(w => ({ id: Math.random(), text: w, isReal: false, status: 'initial' as const }))
    ];

    setWords(allWords.sort(() => 0.5 - Math.random()));
  };

  const handleWordClick = (id: number) => {
    if (gameOver) return;

    setWords(prev => prev.map(w => {
      if (w.id === id) {
        if (w.isReal) {
          setScore(s => s + 1);
          return { ...w, status: 'correct' };
        } else {
          setScore(s => Math.max(0, s - 1));
          return { ...w, status: 'wrong' };
        }
      }
      return w;
    }));
  };

  // Check if all real words found in current batch
  useEffect(() => {
      if (gameOver) return;
      const realWords = words.filter(w => w.isReal);
      const foundReal = realWords.every(w => w.status === 'correct');
      
      if (realWords.length > 0 && foundReal) {
          setTimeout(generateWords, 300);
      }
  }, [words, gameOver]);

  const endGame = () => {
    setGameOver(true);
    setTimeout(() => {
        setShowResult(true);
    }, 500);
  };

  const handleClaim = () => {
      const stolenData = score * 50;
      onComplete(score, stolenData);
      onClose();
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm font-mono">
      <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.3)] overflow-hidden flex flex-col p-6 relative min-h-[500px]">
        
        {/* Result Overlay */}
        <AnimatePresence>
            {showResult && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center"
                >
                    {score > 0 ? (
                        <>
                            <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                                transition={{ delay: 0.2 }}
                                className="bg-yellow-500/20 p-6 rounded-full border-2 border-yellow-500 mb-6"
                            >
                                <Trophy size={64} className="text-yellow-400" />
                            </motion.div>
                            <h2 className="text-4xl font-bold text-white mb-2">10x ENGINEER DEFEATED</h2>
                            <p className="text-indigo-300 text-lg mb-6">You are clearly 11x. Eric is devastated.</p>
                            
                            <div className="bg-black/40 p-4 rounded-lg border border-indigo-500/30 mb-8 w-full max-w-md">
                                <div className="flex justify-between text-slate-400 text-sm mb-2">
                                    <span>Eric's Ego Damage:</span>
                                    <span className="text-red-400">CRITICAL</span>
                                </div>
                                <div className="flex justify-between text-slate-400 text-sm mb-2">
                                    <span>Buzzwords Mastered:</span>
                                    <span className="text-emerald-400">{score}</span>
                                </div>
                                <div className="flex justify-between text-white font-bold text-lg border-t border-slate-700 pt-2 mt-2">
                                    <span>DATA STOLEN:</span>
                                    <span className="text-emerald-400">+{score * 50}</span>
                                </div>
                            </div>

                            <p className="text-slate-500 italic text-sm mb-8">"I... I must have missed a semicolon..." - Eric</p>

                            <button 
                                onClick={handleClaim}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                            >
                                CLAIM VICTORY & DATA
                            </button>
                        </>
                    ) : (
                        <>
                             <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }}
                                className="bg-red-500/20 p-6 rounded-full border-2 border-red-500 mb-6"
                            >
                                <Frown size={64} className="text-red-400" />
                            </motion.div>
                            <h2 className="text-3xl font-bold text-white mb-2">DEFEAT</h2>
                            <p className="text-slate-400 mb-8">Eric laughs at your lack of synergy.</p>
                            <button 
                                onClick={handleClaim}
                                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-all"
                            >
                                CLOSE
                            </button>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/20 p-2 rounded-full border border-indigo-500">
                <Sword size={24} className="text-indigo-400" />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Buzzword Blitz</h2>
                <p className="text-xs text-indigo-300">Identify <span className="text-emerald-400 font-bold">REAL TECH</span>. Ignore nonsense.</p>
             </div>
          </div>
          <div className="text-right">
             <div className="text-4xl font-bold text-white">{timeLeft}s</div>
             <div className="text-xs text-slate-500">REMAINING</div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 flex-1">
           <AnimatePresence mode='popLayout'>
             {words.map(w => (
               <motion.button
                 key={w.id}
                 layout
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ 
                     scale: 1, 
                     opacity: w.status === 'initial' ? 1 : 0.5,
                     backgroundColor: w.status === 'initial' ? '#1e293b' : w.status === 'correct' ? '#064e3b' : '#7f1d1d',
                     borderColor: w.status === 'initial' ? '#334155' : w.status === 'correct' ? '#10b981' : '#ef4444'
                 }}
                 exit={{ scale: 0, opacity: 0 }}
                 whileHover={{ scale: w.status === 'initial' ? 1.05 : 1 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => handleWordClick(w.id)}
                 disabled={w.status !== 'initial' || gameOver}
                 className="h-24 rounded-lg border-2 flex flex-col items-center justify-center p-2 text-center transition-colors relative overflow-hidden"
               >
                  <span className={clsx("font-bold text-sm md:text-base break-words", 
                      w.status === 'initial' ? "text-slate-200" : "text-white"
                  )}>
                      {w.text}
                  </span>
                  {w.status === 'correct' && <Zap size={48} className="absolute text-emerald-500/20" />}
                  {w.status === 'wrong' && <X size={48} className="absolute text-red-500/20" />}
               </motion.button>
             ))}
           </AnimatePresence>
        </div>

        {/* Score Footer */}
        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-lg border border-slate-800 mt-auto">
           <div>
               <div className="text-xs text-slate-500">SCORE</div>
               <div className="text-2xl font-bold text-emerald-400">{score}</div>
           </div>
           
           <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
               <X size={20} />
           </button>
        </div>

      </div>
    </div>
  );
};