import React from 'react';
import { GameState } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { LayoutDashboard, PieChart, TrendingUp, Network, Eye, Filter, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  state: GameState;
}

export const DashboardPanel: React.FC<Props> = ({ state }) => {
  const chartData = state.history;

  // Prepare Funnel Data for Marketing Intelligence
  const activeCampaignsCount = state.activeCampaigns.length;
  const totalCampaignYieldRaw = state.activeCampaigns.reduce((acc, c) => acc + c.generatedRaw, 0);
  const totalCampaignYieldPU = state.activeCampaigns.reduce((acc, c) => acc + c.generatedPU, 0);

  const funnelData = [
      { name: 'Impressions', value: state.rawData * 10, fill: '#64748b' }, // Fake metric for impressions
      { name: 'Raw Data', value: state.rawData, fill: '#3b82f6' },
      { name: 'Clean Data', value: state.cleanData, fill: '#10b981' },
      { name: 'Metrics', value: state.metrics, fill: '#8b5cf6' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <LayoutDashboard size={14} />
          Executive Dashboard
        </h2>
        <div className="flex gap-2">
            <div className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                LIVE
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Dashboards</div>
                <div className="text-2xl font-mono text-slate-100">{state.dashboards}</div>
            </div>
            <div className="bg-slate-900 p-4 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Metric Quality</div>
                <div className="text-2xl font-mono text-blue-400">{(state.metricQuality * 100).toFixed(0)}%</div>
            </div>
        </div>

        {/* Rival Intelligence (New) */}
        {state.rival.active && (
             <div className="bg-slate-900 rounded border border-indigo-500/30 p-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-10">
                     <Swords size={48} />
                 </div>
                 <h3 className="text-xs font-bold text-indigo-400 uppercase mb-4 flex items-center gap-2">
                    <Swords size={14} /> Competitor Benchmark
                 </h3>
                 
                 <div className="flex items-center justify-between mb-2">
                     <div className="text-sm font-bold text-white">{state.rival.name}</div>
                     <div className="text-[10px] text-slate-400">RIVAL ANALYST</div>
                 </div>

                 <div className="space-y-3">
                     <div>
                         <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                             <span>Clean Data</span>
                             <span className={state.cleanData > state.rival.cleanData ? "text-emerald-400" : "text-red-400"}>
                                 {state.cleanData > state.rival.cleanData ? "AHEAD" : "BEHIND"}
                             </span>
                         </div>
                         <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                             <div className="h-full bg-indigo-500" style={{ width: '50%' }}></div> {/* Rival marker visual hack */}
                             <motion.div 
                                className={clsx("h-full", state.cleanData > state.rival.cleanData ? "bg-emerald-500" : "bg-red-500")}
                                animate={{ width: `${Math.min(100, (state.cleanData / Math.max(1, state.rival.cleanData)) * 50)}%` }}
                             />
                         </div>
                         <div className="flex justify-between text-[10px] font-mono mt-1">
                             <span className="text-indigo-400">{state.rival.cleanData.toFixed(0)}</span>
                             <span className="text-white">{state.cleanData.toFixed(0)}</span>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {/* Marketing Intelligence (New Section) */}
        {state.activeCampaigns.length > 0 || state.upgrades['bi_dashboards'] ? (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2">
                        <Filter size={14} /> Marketing Funnel
                    </h3>
                    <span className="text-[10px] text-slate-600 font-mono">Live Campaign Data</span>
                </div>
                
                <div className="h-40 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}} />
                              <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]} />
                         </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="bg-slate-950 p-2 rounded">
                        <div className="text-slate-500">Active Ads</div>
                        <div className="font-bold text-orange-400 text-lg">{activeCampaignsCount}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded">
                         <div className="text-slate-500">Inbound (Raw)</div>
                         <div className="font-bold text-blue-400 text-lg">+{totalCampaignYieldRaw.toFixed(0)}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded">
                         <div className="text-slate-500">Hype Gen</div>
                         <div className="font-bold text-emerald-400 text-lg">+{totalCampaignYieldPU.toFixed(0)}</div>
                    </div>
                </div>
            </div>
        ) : null}

        {/* System Topology (Complexity vs Observability) */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Network size={14} /> System Topology
                </h3>
                <span className="text-[10px] text-slate-600 font-mono">Current State</span>
            </div>
            
            <div className="space-y-4">
                {/* Visual Representation */}
                <div className="relative h-12 bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                    {/* The "Whole System" Pattern */}
                    <div className="absolute inset-0 opacity-20" 
                         style={{ 
                             backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', 
                             backgroundSize: `${Math.max(4, 20 - (state.complexity / 10))}px ${Math.max(4, 20 - (state.complexity / 10))}px` 
                         }} 
                    />
                    
                    {/* The "Observed" Slice */}
                    <motion.div 
                        className="absolute h-full bg-blue-500/10 border-x border-blue-500/30 flex items-center justify-center"
                        animate={{ width: `${state.observability}%` }}
                        transition={{ duration: 0.5 }}
                    >
                        <Eye size={16} className="text-blue-400 opacity-50" />
                    </motion.div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                     <div>
                        <div className="text-[10px] text-slate-500 mb-1">Complexity</div>
                        <div className="text-sm font-mono text-slate-300">{state.complexity.toFixed(0)} nodes</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-slate-500 mb-1">Observability</div>
                        <div className="text-sm font-mono font-bold text-blue-400">{state.observability.toFixed(1)}%</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-slate-500 mb-1">Packet Loss</div>
                        <div className={clsx("text-sm font-mono font-bold", state.packetLoss > 0 ? "text-red-400" : "text-emerald-400")}>
                            {state.packetLoss.toFixed(1)}%
                        </div>
                     </div>
                </div>

                {state.observability < 50 && (
                    <div className="text-[10px] text-amber-500 text-center font-mono border-t border-slate-800 pt-2">
                        WARNING: BLIND SPOTS DETECTED. ENTROPY INCREASING.
                    </div>
                )}
            </div>
        </div>

        {/* Main Chart */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4 h-64 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Growth Trajectory</h3>
                <TrendingUp size={14} className="text-slate-600" />
            </div>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="tick" stroke="#475569" tick={false} />
                        <YAxis stroke="#475569" width={30} tick={{fontSize: 10}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                            itemStyle={{ fontSize: 12 }}
                            labelStyle={{ display: 'none' }}
                        />
                        <Line type="monotone" dataKey="pu" stroke="#10b981" strokeWidth={2} dot={false} name="Perceived Value" />
                        <Line type="monotone" dataKey="tu" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="True Value" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Secondary Chart (Revenue/Economy) */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4 h-48 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase">External Impact</h3>
                <PieChart size={14} className="text-slate-600" />
            </div>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <YAxis stroke="#475569" width={30} tick={{fontSize: 10}} domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                            itemStyle={{ fontSize: 12 }}
                            labelStyle={{ display: 'none' }}
                        />
                        <Line type="step" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} name="Projected Revenue" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        {/* Log Window */}
        <div className="border border-slate-800 bg-black/50 rounded p-2 h-32 overflow-y-auto font-mono text-[10px] space-y-1">
             {state.logs.map((log) => (
                 <div key={log.id} className={log.type === 'success' ? 'text-emerald-500' : log.type === 'warning' ? 'text-amber-500' : 'text-slate-500'}>
                     <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span> {log.text}
                 </div>
             ))}
        </div>

      </div>
    </div>
  );
};