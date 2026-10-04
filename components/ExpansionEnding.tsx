import React, { useState } from 'react';

interface Props {
  onGovern: () => void;
  onReboot: () => void;
  onLater: () => void;
}

export const ExpansionEnding: React.FC<Props> = ({ onGovern, onReboot, onLater }) => {
  const [choice, setChoice] = useState<null | 'govern' | 'reboot'>(null);
  const button = 'w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white';
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="role-title" className="bg-slate-900 border border-blue-700/50 rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <h2 id="role-title" className="text-xl font-bold text-slate-100">{choice === 'govern' ? 'AUTOMATION WILL CONTINUE' : choice === 'reboot' ? 'NEW GAME+ CONFIRMATION' : 'CHOOSE YOUR ROLE'}</h2>
      {choice === null ? <>
        <p className="mt-4 text-blue-200">FULL AUTOMATION ROLLOUT: ACTIVE · Governed exceptions remain in force.</p>
        <p className="mt-2 text-sm text-slate-300">The organisation has already committed to automation. It requires someone to own what it is allowed to do.</p>
        <div className="grid sm:grid-cols-2 gap-4 my-5">
          <div className="border border-slate-700 rounded p-4 flex flex-col gap-3">
            <h3 className="font-bold">GOVERN THE MACHINE</h3>
            <p className="text-sm text-slate-300 flex-1">You stay and own the boundary. Define who — human, service or automated — can act on which systems. Automation continues; the work becomes governance.</p>
            <button className={button} onClick={() => setChoice('govern')}>GOVERN THE MACHINE</button>
          </div>
          <div className="border border-slate-700 rounded p-4 flex flex-col gap-3">
            <h3 className="font-bold">NEW GAME+</h3>
            <p className="text-sm text-slate-300 flex-1">You leave and carry the capability forward. Reboot with another Neural Link. Greater processing capability helps the next run reach automation sooner.</p>
            <button className={button} onClick={() => setChoice('reboot')}>NEW GAME+</button>
          </div>
        </div>
      </> : <div className="my-5 space-y-4 text-sm text-slate-300">
        {choice === 'govern' ? <><p>You will own the access model going forward. Full Automation Rollout and governed exceptions continue.</p><p>This role starts a permission puzzle. It does not change your existing Product DB policy.</p><button className={button} onClick={onGovern}>ACCEPT GOVERNANCE ROLE</button></> :
          <><p>The governance role will be left behind. Current run will reset. Neural Link will increase by at least one.</p><p>Greater capability means the next run reaches automation sooner. The story's mandatory beats still remain.</p><button className={button} onClick={onReboot}>REBOOT</button></>}
        <button onClick={() => setChoice(null)} className="w-full py-2 border border-slate-600 rounded">GO BACK</button>
      </div>}
      <button onClick={onLater} className="w-full py-2 text-sm text-slate-400 hover:text-slate-200">Later</button>
    </section>
  </div>;
};
