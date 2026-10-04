import React, { useLayoutEffect, useRef, useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  active: boolean;
  onClose: () => void;
  onClean: (cost: number, reward: number, puBonus: number) => void;
  rawData: number;
}

type Value = string | number | boolean;
type CleaningCase = { id: string; field: string; raw: string; target: string; clean: Value; choices: Value[] };
const CASES: CleaningCase[] = [
  { id: 'P-0182', field: 'SupplierCode', raw: '  SUP-014  ', target: 'identifier · trim outer spaces; preserve case', clean: 'SUP-014', choices: ['sup-014', 'SUP-014', '  SUP-014  '] },
  { id: 'P-0183', field: 'Width', raw: '45 cm', target: 'number (cm) · remove unit suffix', clean: 45, choices: ['45 cm', '45', 45] },
  { id: 'P-0184', field: 'Active', raw: 'yes', target: 'boolean · yes = true; no = false', clean: true, choices: [true, 'yes', false] },
  { id: 'P-0185', field: 'Colour', raw: 'navy blue', target: 'approved colour · navy blue → Navy', clean: 'Navy', choices: ['navy blue', 'Navy', 'Blue'] },
  { id: 'P-0186', field: 'WeightKg', raw: '12,5', target: 'number (kg) · decimal comma becomes decimal point', clean: 12.5, choices: [125, '12.5', 12.5] },
  { id: 'P-0187', field: 'CountryCode', raw: 'fi', target: 'ISO country code · uppercase two-letter identifier', clean: 'FI', choices: ['FI', 'Finland', 'fi'] },
  { id: 'P-0241', field: 'ProductCode', raw: ' SKU-208 ', target: 'identifier · trim outer spaces; preserve case', clean: 'SKU-208', choices: [' SKU-208 ', 'SKU-208', 'sku-208'] },
  { id: 'P-0242', field: 'Height', raw: '18 cm', target: 'number (cm) · remove unit suffix', clean: 18, choices: ['18', '18 cm', 18] },
  { id: 'P-0243', field: 'Discontinued', raw: 'no', target: 'boolean · yes = true; no = false', clean: false, choices: [false, 'no', true] },
  { id: 'P-0244', field: 'Colour', raw: 'light grey', target: 'approved colour · light grey → Grey', clean: 'Grey', choices: ['light grey', 'Grey', 'White'] },
  { id: 'P-0245', field: 'WeightKg', raw: '7,25', target: 'number (kg) · decimal comma becomes decimal point', clean: 7.25, choices: [725, '7.25', 7.25] },
  { id: 'P-0246', field: 'CountryCode', raw: 'se', target: 'ISO country code · uppercase two-letter identifier', clean: 'SE', choices: ['SE', 'Sweden', 'se'] },
];
const COLORS = ['#f472b6', '#38bdf8', '#a78bfa', '#fbbf24', '#fb7185', '#22d3ee'];
const valueText = (value: Value) => JSON.stringify(value);
const tangled = 'M 0 30 C 80 0 15 60 50 30 C 85 0 20 60 100 30';
const straight = 'M 0 30 C 16 30 33 30 50 30 C 66 30 83 30 100 30';

const CleanupSession: React.FC<Omit<Props, 'active'>> = ({ onClose, onClean, rawData }) => {
  const [batch, setBatch] = useState(() => Math.floor(Math.random() * 2));
  const [cleaned, setCleaned] = useState<string[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [sessionCount, setSessionCount] = useState(0);
  // Reserve Raw synchronously, before parent state/props can catch up with rapid clicks.
  const available = useRef(rawData);
  const claimed = useRef(new Set<string>());
  const currentBatch = useRef(batch);
  const closed = useRef(false);
  useLayoutEffect(() => { available.current = rawData; }, [rawData]);
  const records = CASES.slice(batch * 6, batch * 6 + 6);
  const batchClean = cleaned.length === 6;
  const close = () => { if (closed.current) return; closed.current = true; onClose(); };
  const choose = (record: CleaningCase, value: Value) => {
    if (closed.current || batch !== currentBatch.current || claimed.current.has(record.id)) return;
    if (value !== record.clean) {
      setMessages(prev => ({ ...prev, [record.id]: 'DOES NOT MATCH TARGET FORMAT' }));
      return;
    }
    if (available.current < 5) {
      setMessages(prev => ({ ...prev, [record.id]: 'INSUFFICIENT RAW DATA' }));
      return;
    }
    available.current -= 5;
    claimed.current.add(record.id);
    onClean(5, 5, 25);
    setCleaned(prev => [...prev, record.id]);
    setMessages(prev => ({ ...prev, [record.id]: '' }));
    setSessionCount(prev => prev + 1);
  };
  const loadBatch = () => {
    if (closed.current || batch !== currentBatch.current || claimed.current.size !== 6) return;
    const next = (batch + 1) % 2;
    currentBatch.current = next;
    claimed.current = new Set();
    setBatch(next); setCleaned([]); setMessages({});
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="cleanup-title" className="w-full max-w-5xl max-h-[94vh] min-h-0 flex flex-col bg-slate-900 border border-indigo-600/50 rounded-lg shadow-2xl overflow-hidden">
      <header className="shrink-0 p-4 border-b border-slate-700 flex items-start justify-between gap-3">
        <div>
          <h2 id="cleanup-title" className="font-bold text-lg text-indigo-200 flex items-center gap-2"><Wand2 size={18} />MANUAL DATA CLEANUP</h2>
          <p className="text-sm text-purple-300">SPAGHETTI MODE</p>
          <p className="text-xs text-slate-400 mt-1">Normalize messy source values into the format expected by the clean dataset.</p>
        </div>
        <button aria-label="Close manual data cleanup" onClick={close} className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"><X size={20} /></button>
      </header>
      <div className="shrink-0 px-4 py-3 border-b border-slate-700 bg-slate-950 text-xs font-mono space-y-2">
        <p className="text-indigo-200">RAW BUFFER → NORMALIZE → CLEAN BUFFER</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-300">
          <p>Raw available: <span data-testid="cleanup-raw">{rawData.toFixed(1)}</span></p>
          <p>Records cleaned this session: <span data-testid="cleanup-session">{sessionCount}</span></p>
          <p>Batch: {cleaned.length} / 6 clean</p>
        </div>
        <p className="text-slate-500">Per record: 5 Raw → 5 Clean + 25 PU · rewards before Neural Link scaling.</p>
      </div>
      <div role="region" aria-label="Cleanup records and batch controls" className="min-h-0 overflow-y-auto p-4 space-y-3">
        {records.map((record, index) => {
          const isClean = cleaned.includes(record.id);
          return <article key={record.id} aria-label={`Record ${record.id}`} className={clsx('p-3 rounded border grid grid-cols-1 sm:grid-cols-[1fr_90px_1.4fr] items-center gap-3', isClean ? 'border-emerald-600/60 bg-emerald-950/20' : 'border-slate-700 bg-slate-950')}>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-400">RAW RECORD · {record.id}</h3>
              <p className="text-sm text-slate-200 mt-1">{record.field}</p>
              <p className="font-mono text-sm text-amber-200 whitespace-pre-wrap break-words mt-1">{valueText(record.raw)}</p>
            </div>
            <svg role="img" aria-label={isClean ? 'Clean straight connection' : 'Dirty tangled connection'} viewBox="0 0 100 60" className="w-full h-14" fill="none">
              <motion.path initial={false} animate={{ d: isClean ? straight : tangled, stroke: isClean ? '#10b981' : COLORS[index] }} transition={{ duration: 0.3 }} strokeWidth="3" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400">TARGET · {record.target}</p>
              {isClean ? <div className="mt-2">
                <p className="text-xs font-bold text-emerald-400">CLEAN VALUE</p>
                <p className="font-mono text-base text-emerald-200 mt-1">{valueText(record.clean)}</p>
              </div> : <div className="grid grid-cols-3 gap-2 mt-2">
                {record.choices.map(value => <button key={valueText(value)} onClick={() => choose(record, value)} className="p-2 rounded border border-indigo-600/40 bg-indigo-950/30 hover:bg-indigo-900/50 text-xs font-mono text-indigo-100 whitespace-pre-wrap break-words">{valueText(value)}</button>)}
              </div>}
              {!isClean && messages[record.id] && <p role="status" className="mt-2 text-[10px] font-bold text-amber-400">{messages[record.id]}</p>}
            </div>
          </article>;
        })}
        {batchClean && <div className="p-4 border border-emerald-700 rounded bg-emerald-950/30 space-y-3">
          <h3 className="font-bold text-emerald-300">BATCH CLEAN</h3>
          <button onClick={loadBatch} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">LOAD ANOTHER BATCH</button>
        </div>}
        <button onClick={close} className="w-full py-3 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 font-bold text-slate-200">CLOSE</button>
      </div>
    </section>
  </div>;
};

// A closed overlay owns no round, reservations or animation work.
export const SpaghettiOverlay: React.FC<Props> = ({ active, ...props }) => active ? <CleanupSession {...props} /> : null;
