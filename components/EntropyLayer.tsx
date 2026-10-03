import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  entropy: number;
}

// Random noise characters
const NOISE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const EntropyLayer: React.FC<Props> = ({ entropy }) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[100]">
      
      {/* Permanent CRT Scanline Effect (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
           style={{ 
               background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
               backgroundSize: '100% 2px, 3px 100%'
           }}
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 opacity-40 pointer-events-none"
           style={{
               background: 'radial-gradient(circle, transparent 60%, black 100%)'
           }}
      />

      {/* Entropy Visuals */}
      {entropy > 20 && (
          <div className="absolute inset-0 mix-blend-overlay">
            {/* 25% - Chromatic Aberration / Color shift */}
            {entropy > 25 && (
                <div className="absolute inset-0 opacity-20" style={{ 
                    boxShadow: 'inset 0 0 50px rgba(255,0,0,0.1)',
                    filter: `contrast(${100 + (entropy - 25)}%)`
                }}></div>
            )}

            {/* 50% - Random horizontal lines / noise */}
            {entropy > 50 && (
                <motion.div 
                    className="absolute inset-0 bg-repeat-y opacity-10"
                    style={{ 
                        backgroundImage: 'linear-gradient(transparent 50%, rgba(0, 255, 0, 0.25) 50%)', 
                        backgroundSize: '100% 4px' 
                    }}
                    animate={{ backgroundPosition: ['0px 0px', '0px 100px'] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                />
            )}

            {/* 75% - Heavy Glitches */}
            {entropy > 75 && (
                <>
                    <motion.div 
                        className="absolute inset-0 bg-red-500/10"
                        animate={{ opacity: [0, 0.1, 0, 0.2, 0] }}
                        transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 }}
                    />
                    {/* Random blocks */}
                    {Array.from({length: 3}).map((_, i) => (
                        <motion.div 
                            key={i}
                            className="absolute bg-white/20"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 200}px`,
                                height: `${Math.random() * 20}px`
                            }}
                            animate={{ 
                                opacity: [0, 1, 0],
                                x: [0, (Math.random()-0.5)*50]
                            }}
                            transition={{ duration: 0.1, repeat: Infinity, repeatDelay: Math.random() * 3 }}
                        />
                    ))}
                </>
            )}

            {/* 90% - Total Breakdown */}
            {entropy > 90 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                        className="text-9xl font-black text-transparent stroke-white opacity-10 rotate-12"
                        style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}
                        animate={{ scale: [1, 1.1, 1], rotate: [12, -12, 12] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    >
                        NULL
                    </motion.div>
                </div>
            )}
          </div>
      )}
    </div>
  );
};