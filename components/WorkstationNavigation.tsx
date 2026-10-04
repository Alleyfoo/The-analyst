import React from 'react';
import { Briefcase, TrendingUp, Megaphone, Terminal } from 'lucide-react';
import clsx from 'clsx';

export type WorkstationTab = 'ops' | 'market' | 'marketing' | 'terminal';
interface Props { activeTab: WorkstationTab; onSelectTab: (tab: WorkstationTab) => void }
const tabs = [
  { id: 'ops', label: 'OPS', icon: Briefcase, color: 'text-emerald-400' },
  { id: 'market', label: 'MARKET', icon: TrendingUp, color: 'text-purple-400' },
  { id: 'marketing', label: 'ADS', icon: Megaphone, color: 'text-orange-400' },
  { id: 'terminal', label: 'TERMINAL', icon: Terminal, color: 'text-blue-400' },
] as const;

export const WorkstationNavigation: React.FC<Props> = ({ activeTab, onSelectTab }) => (
  <nav aria-label="Workstation tabs" className="grid grid-cols-2 xl:grid-cols-4 shrink-0 border-b border-slate-800 bg-slate-900/50">
    {tabs.map(({ id, label, icon: Icon, color }) => <button key={id} aria-pressed={activeTab === id}
      onClick={() => onSelectTab(id)} className={clsx('min-w-0 px-1 py-3 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-900', activeTab === id ? color + ' bg-slate-900' : 'text-slate-500')}>
      <Icon size={12} className="shrink-0 hidden 2xl:block" />{label}
    </button>)}
  </nav>
);
