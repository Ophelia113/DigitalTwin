import React from 'react';
import { Activity } from 'lucide-react';
import { MotorState } from '../types/telemetry';

interface HeaderProps {
  motorState: MotorState;
}

export const Header: React.FC<HeaderProps> = ({ motorState }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white font-scada tracking-wide">
              Digital Twin for Process Monitoring in Heating and Moving Plate
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-Time IoT Monitoring & Automatic Safety Protection
            </p>
          </div>
        </div>

        {/* Right: Clean Status Badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold font-mono ${
            motorState === 'RUNNING'
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
              : motorState === 'FAULT'
              ? 'bg-rose-500/10 border border-rose-500/40 text-rose-300 animate-pulse'
              : 'bg-slate-800 border border-slate-700 text-slate-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              motorState === 'RUNNING' ? 'bg-emerald-400 animate-ping' : motorState === 'FAULT' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <span>{motorState === 'RUNNING' ? 'CONVEYOR RUNNING' : motorState === 'FAULT' ? 'SAFETY STOP (FAULT)' : 'CONVEYOR STOPPED'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
