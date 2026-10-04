import React, { useState } from 'react';
import { ExpansionEndingState } from '../types';
import { ACCESS_IDENTITIES, ACCESS_SYSTEMS, ACCESS_LEVELS, ACCESS_TARGET, ACCESS_DEPENDENCIES, getAccessMatrixHealth } from '../constants';

interface Props { matrix: ExpansionEndingState['accessMatrix']; onCycle: (index: number) => void; onLater: () => void; onNewGame?: () => void }
const cellName = (index: number) => `${ACCESS_IDENTITIES[Math.floor(index / 4)]} / ${ACCESS_SYSTEMS[index % 4]}`;

export const AccessMatrix: React.FC<Props> = ({ matrix, onCycle, onLater, onNewGame }) => {
  const [lastChanged, setLastChanged] = useState<number | null>(null);
  const health = getAccessMatrixHealth(matrix.cells);
  const mismatches = matrix.cells.filter((level, index) => level !== ACCESS_TARGET[index]).length;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="access-title" className="bg-slate-900 border border-blue-700/50 rounded-lg shadow-2xl max-w-4xl w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
      <h2 id="access-title" className="text-xl font-bold text-slate-100">ACCESS MATRIX</h2>
      <p className="mt-2 text-sm text-blue-200">Expected configuration: DEFINED · ACCESS HEALTH: {health}% · Mismatched cells: {mismatches} · Moves: {matrix.moves}</p>
      <p className="mt-2 text-sm text-slate-300">Cycle NONE → READ → WRITE → ADMIN → NONE. Each change also cycles one linked cell. Match the expected placement.</p>
      <div className="overflow-x-auto mt-4">
        <table className="w-full min-w-[580px] border-separate border-spacing-1 text-xs">
          <thead><tr><th scope="col" className="text-left">IDENTITY / SYSTEM</th>{ACCESS_SYSTEMS.map(system => <th scope="col" key={system}>{system}</th>)}</tr></thead>
          <tbody>{ACCESS_IDENTITIES.map((identity, row) => <tr key={identity}>
            <th scope="row" className="text-left text-blue-200 pr-2">{identity}</th>
            {ACCESS_SYSTEMS.map((system, col) => { const index = row * 4 + col; return <td key={system}>
              <button aria-label={cellName(index)} disabled={matrix.stabilizedOnce} onClick={() => { onCycle(index); setLastChanged(index); }}
                className="w-full min-h-16 px-2 py-3 border border-slate-600 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-80 disabled:cursor-default">
                <span className="block font-bold text-slate-100">{ACCESS_LEVELS[matrix.cells[index]]}</span>
                <span className="block mt-1 text-slate-400">Expected: {ACCESS_LEVELS[ACCESS_TARGET[index]]}</span>
              </button>
            </td>; })}
          </tr>)}</tbody>
        </table>
      </div>
      {lastChanged !== null && <div role="status" className="mt-3 text-sm text-blue-200"><p>CHANGED: {cellName(lastChanged)}</p><p>PROPAGATED: {cellName(ACCESS_DEPENDENCIES[lastChanged])}</p></div>}
      {matrix.stabilizedOnce && <div className="mt-4 p-3 rounded border border-blue-700 text-sm space-y-2">
        <p className="font-bold text-blue-200">SYSTEM STABLE — FOR NOW</p>
        <p>FULL AUTOMATION: ACTIVE · ACCESS MODEL: STABILIZED · GOVERNANCE OWNER: ANALYST</p>
        <p>NEXT ACCESS REVIEW: INEVITABLE</p>
        {onNewGame && <button onClick={onNewGame} className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white">LEAVE GOVERNANCE ROLE / NEW GAME+</button>}
      </div>}
      <p className="mt-4 text-xs text-slate-400">A simplified corporate-authority puzzle, not IAM training. Routine company work continues.</p>
      <button onClick={onLater} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-200">Close</button>
    </section>
  </div>;
};
