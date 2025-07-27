import { useData } from '../contexts/DataContext';
// FIX: Imported DebugLog type directly from @pediaquiz/types
import type { DebugLog } from '@pediaquiz/types';

const StatusIcon = ({ status }: { status: 'pending' | 'success' | 'error' }) => {
  if (status === 'success') return <span className="text-green-500 font-bold">✓</span>;
  if (status === 'error') return <span className="text-red-500 font-bold">✗</span>;
  return <span className="text-yellow-500 font-bold animate-pulse">…</span>;
};

const DebugView = () => {
  const { debugLog } = useData();

  return (
    <div className="fixed bottom-[70px] right-4 z-[101] bg-white dark:bg-slate-800 shadow-2xl rounded-lg border border-slate-300 dark:border-slate-700 w-full max-w-lg max-h-60 flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-lg">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Live Debug Log</h3>
      </div>
      <div className="p-3 overflow-y-auto flex-grow">
        {debugLog.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
                Waiting for an action to log...
            </div>
        ) : (
            <ul className="space-y-2 text-sm">
            {[...debugLog].reverse().map((log: DebugLog, index: number) => ( // FIX: Explicitly type log parameter
                <li key={index} className="flex items-start gap-2 font-mono">
                <div className="flex-shrink-0 pt-0.5"><StatusIcon status={log.status} /></div>
                <div className="flex-grow">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{log.step}</span>
                    {log.data && (
                    <pre className="mt-1 text-xs bg-slate-100 dark:bg-slate-900/50 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap break-all">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                    )}
                </div>
                </li>
            ))}
            </ul>
        )}
      </div>
    </div>
  );
};

export default DebugView;