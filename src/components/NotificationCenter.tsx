import React from 'react';
import { NotificationLog } from '../types';
import { Bell, Check, Smartphone, MessageSquare, AlertTriangle } from 'lucide-react';

interface NotificationCenterProps {
  logs: NotificationLog[];
  onClear: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ logs, onClear }) => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-sm p-6 shadow-xs text-white h-full flex flex-col font-sans">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-500 inline-block"></span>
          <div>
            <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-205">Notification Gate</h3>
            <p className="text-[10px] text-slate-450 uppercase font-mono mt-0.5">Automated System Logs & Alerts</p>
          </div>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-slate-850 px-2.5 py-1.5 rounded-sm border border-slate-800 transition-colors cursor-pointer font-display"
          >
            Purge
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-500 text-center">
          <div className="mb-3 p-3 bg-slate-900 rounded-sm border border-slate-800">
            <Bell size={20} className="text-slate-600 animate-pulse" />
          </div>
          <p className="text-xs font-bold font-display uppercase tracking-wider text-slate-400">Queue is Clear</p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-snug">
            Automated notifications log sales activity and trigger low-stock alerts for Admin instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 flex-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-sm p-3.5 flex gap-3 transition-colors ${
                log.type === 'Alert' 
                  ? 'bg-rose-950/25 border-rose-900/50 hover:bg-rose-950/45' 
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="mt-0.5">
                {log.type === 'Alert' ? (
                  <div className="p-1.5 bg-rose-500/10 rounded-sm text-rose-400 border border-rose-500/20">
                    <AlertTriangle size={13} />
                  </div>
                ) : (
                  <div className="p-1.5 bg-indigo-500/10 rounded-sm text-indigo-400 border border-indigo-500/20">
                    <Smartphone size={13} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold text-[11px] ${log.type === 'Alert' ? 'text-rose-400 font-black animate-pulse' : 'text-slate-200'}`}>
                    {log.type === 'Alert' ? 'ADMIN ALARM' : `${log.type}: ${log.recipient}`}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{log.date}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal font-sans select-all">{log.message}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {log.type === 'Alert' ? (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black tracking-widest text-rose-400 uppercase bg-rose-950/80 border border-rose-800 px-1.5 py-0.5 rounded-sm">
                      Low Stock Warning
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black tracking-widest text-green-405 uppercase bg-green-950 border border-green-800 px-1.5 py-0.5 rounded-sm">
                      <Check size={8} /> {log.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
