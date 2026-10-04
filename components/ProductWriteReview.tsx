import React from 'react';

interface Props {
  attempt: { id: number; index: number };
  pending: number;
  queueMode: boolean;
  proposal: { record: string; field: string; current: string; proposed: string | number | boolean };
  sqlPending: number;
  onApply: (attemptId: number) => void;
  onLater: (attemptId: number) => void;
}

// Presentation only. Opening this dialog neither writes nor consumes a proposal.
export const ProductWriteReview: React.FC<Props> = ({ attempt, pending, queueMode, proposal, sqlPending, onApply, onLater }) => {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="product-write-title"
      className="bg-slate-900 border border-blue-700/50 rounded-lg shadow-2xl max-w-md w-full p-6">
      <h2 id="product-write-title" className="text-xl font-bold text-slate-100">PRODUCT DB WRITE</h2>
      <p className="mt-2 text-xs text-blue-200">READ + WRITE · Existing attribute values only · Human approval required</p>
      <div className="my-5 p-4 bg-slate-950/50 border border-slate-800 rounded text-sm text-slate-300 space-y-2">
        <p>Record: {proposal.record}</p>
        <p>Field: {proposal.field}</p>
        <p>Current: <code>{JSON.stringify(proposal.current)}</code></p>
        <p>Proposed: <code>{JSON.stringify(proposal.proposed)}</code></p>
        <p>Source: validated schema correction</p>
        <p className="font-bold text-emerald-300">VALIDATED BY ANALYST</p>
      </div>
      <p className="mb-4 text-xs text-slate-400">{queueMode ? `Write approvals: ${pending} pending · HUMAN APPROVAL: REQUIRED` : `Write pilot: ${pending} pending / 5`} · SQL review queue: {sqlPending}</p>
      <button onClick={() => onApply(attempt.id)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded">APPLY TO PRODUCT DB</button>
      <button onClick={() => onLater(attempt.id)} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
    </section>
  </div>;
};
