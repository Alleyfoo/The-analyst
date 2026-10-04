import React, { useState } from 'react';
import { ProductWriteClass } from '../types';
import { PRODUCT_WRITE_CLASSES, PRODUCT_WRITE_CLASS_DETAILS, PRODUCT_WRITE_PROPOSALS } from '../constants';

interface Props {
  onConfirm: (classes: ProductWriteClass[]) => void;
  onLater: () => void;
}

// An unconfirmed selection is presentation only. Engine authority owns the fixed trial/policy.
export const ProductWritePolicyEditor: React.FC<Props> = ({ onConfirm, onLater }) => {
  const [selected, setSelected] = useState<ProductWriteClass[]>([]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="write-policy-title"
      className="bg-slate-900 border border-blue-700/50 rounded-lg shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 text-sm text-slate-300">
      <h2 id="write-policy-title" className="text-xl font-bold text-slate-100">APPROVAL POLICY</h2>
      <p className="mt-3">Routine validated writes are spending more time waiting for approval than being prepared. Operations wants a standing policy for changes that do not need individual review.</p>
      <p className="my-3">“Don't remove oversight. Define what is boring enough not to require it.”</p>
      <h3 className="font-bold text-blue-200">PRODUCT DB WRITE POLICY</h3>
      <div className="my-3 space-y-2">
        {PRODUCT_WRITE_CLASSES.map((value, index) => <div key={value} className="border border-slate-700 rounded p-2">
          <p className="font-semibold">{PRODUCT_WRITE_CLASS_DETAILS[index].label}</p>
          <p className="text-xs mt-1">{PRODUCT_WRITE_CLASS_DETAILS[index].scope}</p>
          <p className="text-xs my-1">{PRODUCT_WRITE_PROPOSALS[index].field}: {JSON.stringify(PRODUCT_WRITE_PROPOSALS[index].current)} → {JSON.stringify(PRODUCT_WRITE_PROPOSALS[index].proposed)}</p>
          {index === 4 ? <p className="text-blue-200 text-xs font-bold">REVIEW REQUIRED</p> : <div className="flex gap-2" role="group" aria-label={PRODUCT_WRITE_CLASS_DETAILS[index].label}>
            <button aria-pressed={!selected.includes(value)} onClick={() => setSelected(prev => prev.filter(item => item !== value))}
              className={!selected.includes(value) ? 'px-3 py-1 rounded bg-indigo-600 text-white' : 'px-3 py-1 rounded border border-slate-600'}>REVIEW</button>
            <button aria-pressed={selected.includes(value)} onClick={() => setSelected(prev => prev.includes(value) ? prev : [...prev, value])}
              className={selected.includes(value) ? 'px-3 py-1 rounded bg-indigo-600 text-white' : 'px-3 py-1 rounded border border-slate-600'}>AUTO APPLY</button>
          </div>}
        </div>)}
      </div>
      <p className="text-xs mb-3">AUTO APPLY is standing pre-authorization for the exact class only. It grants no additional Product DB permissions, new values or schema changes, and cannot change its own policy. REVIEW retains approval per item.</p>
      <p className="text-xs mb-4">All-manual is a valid boundary. Confirm a fixed policy, then test five validated writes before it applies to new work. Existing backlog stays manual.</p>
      <button onClick={() => onConfirm(selected)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded">CONFIRM POLICY AND RUN TRIAL</button>
      <button onClick={onLater} className="w-full mt-3 py-2 text-slate-400 hover:text-slate-200">Later</button>
    </section>
  </div>;
};
