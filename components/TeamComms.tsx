import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, User, Bell, ShieldAlert, Building2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  chats: ChatMessage[];
  onResolve: (id: string, responseIndex: number) => void;
}

export const TeamComms: React.FC<Props> = ({ chats, onResolve }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = chats.length;
  const urgentCount = chats.filter(c => c.isUrgent).length;

  return (
    <div className="fixed bottom-6 right-6 z-[60] font-inter">
      
      {/* Minimized Icon */}
      <AnimatePresence>
        {!isOpen && (
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setIsOpen(true)}
                className={clsx(
                    "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors relative border-2",
                    urgentCount > 0 
                        ? "bg-red-600 border-red-400 animate-bounce" 
                        : "bg-indigo-600 border-indigo-400 hover:bg-indigo-500"
                )}
            >
                <MessageSquare className="text-white" size={24} />
                
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-white text-indigo-900 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-indigo-900">
                        {unreadCount}
                    </div>
                )}
            </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Window */}
      <AnimatePresence>
          {isOpen && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.9 }}
                className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-96 overflow-hidden flex flex-col"
                style={{ height: '500px' }}
              >
                  {/* Header */}
                  <div className={clsx("p-3 flex justify-between items-center border-b border-slate-700", urgentCount > 0 ? "bg-red-900/50" : "bg-indigo-900/50")}>
                      <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-green-500 absolute bottom-0 right-0 border border-slate-900"></div>
                            <User className="bg-slate-700 p-1 rounded-full text-slate-300" size={20} />
                          </div>
                          <span className="font-bold text-sm text-slate-100">Huddle <span className="text-xs font-normal opacity-70">({unreadCount})</span></span>
                      </div>
                      <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                          <X size={16} />
                      </button>
                  </div>

                  {/* Message List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
                      {chats.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs text-center p-4">
                              <Bell size={24} className="mb-2 opacity-20" />
                              <p>No unread messages.</p>
                              <p className="mt-1">You are all caught up!</p>
                          </div>
                      ) : (
                          chats.map(chat => (
                              <motion.div 
                                key={chat.id}
                                layout
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className={clsx(
                                    "p-3 rounded border text-xs relative",
                                    chat.isUrgent 
                                        ? "bg-red-900/20 border-red-500/50 text-red-100" 
                                        : "bg-slate-800 border-slate-700 text-slate-200"
                                )}
                              >
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-blue-300">{chat.sender}</span>
                                      <span className="text-[10px] opacity-50">Just now</span>
                                  </div>
                                  <p className="mb-3 leading-relaxed border-b border-slate-700/50 pb-2">{chat.message}</p>
                                  
                                  {/* Responses */}
                                  <div className="flex flex-col gap-2 mt-2">
                                    {chat.responses.map((resp, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onResolve(chat.id, idx)}
                                            className={clsx(
                                                "text-left p-2 rounded flex items-center justify-between group transition-colors",
                                                resp.type === 'corporate' ? "bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/20" :
                                                resp.type === 'truth' ? "bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/20" :
                                                "bg-slate-700 hover:bg-slate-600"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className={clsx("font-bold text-[10px] uppercase flex items-center gap-2", 
                                                    resp.type === 'corporate' ? "text-emerald-400" :
                                                    resp.type === 'truth' ? "text-amber-400" : "text-slate-300"
                                                )}>
                                                    {resp.label}
                                                    {resp.taskDuration && resp.taskDuration > 0 && (
                                                        <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded flex items-center gap-1 text-slate-400">
                                                            <Clock size={8} /> {resp.taskDuration}s
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-slate-400 italic">"{resp.description}"</span>
                                            </div>
                                            
                                            {resp.type === 'corporate' && <Building2 size={12} className="text-emerald-500 opacity-50 group-hover:opacity-100" />}
                                            {resp.type === 'truth' && <ShieldAlert size={12} className="text-amber-500 opacity-50 group-hover:opacity-100" />}
                                        </button>
                                    ))}
                                  </div>
                                  
                                  {chat.isUrgent && (
                                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                      </span>
                                  )}
                              </motion.div>
                          ))
                      )}
                  </div>

                  {/* Fake Input */}
                  <div className="p-3 bg-slate-900 border-t border-slate-700">
                      <div className="bg-slate-800 rounded px-3 py-2 text-xs text-slate-500 flex justify-between items-center cursor-not-allowed">
                          <span>Select a response above...</span>
                          <Send size={12} className="opacity-50" />
                      </div>
                  </div>

              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};