import React from 'react';
import { Bell, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SystemAlert } from '../types/telemetry';

interface AlertEventLogProps {
  alerts: SystemAlert[];
}

export const AlertEventLog: React.FC<AlertEventLogProps> = ({ alerts }) => {
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              RECENT SYSTEM EVENTS
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Audit Log
          </span>
        </div>

        <div className="space-y-2 max-h-[170px] overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No recent events</p>
          ) : (
            recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                    : alert.severity === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                {alert.severity === 'CRITICAL' ? (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : alert.severity === 'WARNING' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{alert.sensor}</span>
                    <span>{alert.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-200">{alert.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
