import React, { useState } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Flame,
  Waves,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { MotorState, ConveyorMetrics } from '../types/telemetry';

interface ControlPanelProps {
  motorState: MotorState;
  metrics: ConveyorMetrics;
  onStartConveyor: () => void;
  onStopConveyor: () => void;
  onResetDemo: () => void;
  onInjectFault: (type: 'OVERHEAT' | 'OVERHEAT_HEAD' | 'OVERHEAT_TAIL' | 'VIBRATION' | 'SENSOR_OFFLINE' | 'OBJECT_PASS') => void;
  onEmergencyStop: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  motorState,
  metrics,
  onStartConveyor,
  onStopConveyor,
  onResetDemo,
  onInjectFault,
  onEmergencyStop,
}) => {
  const [showMoreTests, setShowMoreTests] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              CONVEYOR CONTROLS
            </h3>
            <p className="text-xs text-slate-400">
              Operate belt & test automatic safety auto-stop
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            motorState === 'RUNNING'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : motorState === 'FAULT'
              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 animate-pulse'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
          }`}>
            {motorState === 'RUNNING' ? '● Running' : motorState === 'FAULT' ? 'Tripped (Safe)' : '○ Standby (Stopped)'}
          </span>
        </div>

        {/* Safety Trip Banner if in FAULT */}
        {motorState === 'FAULT' && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/60 rounded-lg mb-4 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-rose-300 block font-bold">
                Safety Cutoff Triggered!
              </strong>
              <p className="text-slate-300 mt-0.5">
                {metrics.last_fault_reason || 'Conveyor stopped automatically to prevent damage.'}
              </p>
              <button
                onClick={onResetDemo}
                className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset & Clear Safety Trip</span>
              </button>
            </div>
          </div>
        )}

        {/* Standby Prompt when Stopped */}
        {motorState === 'STOPPED' && (
          <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/40 rounded-lg mb-3.5 flex items-center gap-2 text-xs text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Simulation is in Standby. Press <strong>Start Conveyor</strong> to begin.</span>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 1. START */}
          <button
            onClick={onStartConveyor}
            disabled={motorState === 'RUNNING' || motorState === 'FAULT'}
            className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              motorState === 'RUNNING'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : motorState === 'FAULT'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50 active:scale-95 animate-pulse'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Conveyor</span>
          </button>

          {/* 2. STOP */}
          <button
            onClick={onStopConveyor}
            disabled={motorState === 'STOPPED'}
            className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              motorState === 'STOPPED'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600 text-white active:scale-95'
            }`}
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Conveyor</span>
          </button>
        </div>

        {/* 3. The One Key Demo Button for Examiners */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200">
              Safety Interlock Demonstration
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Click below to simulate motor overheating. Watch the belt automatically shut down when safe limits are exceeded:
          </p>

          <button
            onClick={() => onInjectFault('OVERHEAT_HEAD')}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Flame className="w-4 h-4" />
            <span>Test Overheating & Safety Auto-Stop</span>
          </button>
        </div>
      </div>

      {/* Optional More Tests Collapsible */}
      <div>
        <button
          onClick={() => setShowMoreTests(!showMoreTests)}
          className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 transition-colors"
        >
          <span>{showMoreTests ? 'Hide extra tests' : 'More demonstration tests'}</span>
          {showMoreTests ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showMoreTests && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 animate-fadeIn text-xs">
            <button
              onClick={() => onInjectFault('OVERHEAT_TAIL')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/50 rounded-lg text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Overheat Tail Roller</span>
            </button>
            <button
              onClick={() => onInjectFault('VIBRATION')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-lg text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Waves className="w-3.5 h-3.5 text-purple-400" />
              <span>Bearing Vibration Trip</span>
            </button>
            <button
              onClick={() => onInjectFault('OBJECT_PASS')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pass Box Under Sonar</span>
            </button>
            <button
              onClick={onResetDemo}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reset to Baseline</span>
            </button>
            <button
              onClick={onEmergencyStop}
              className="col-span-2 p-2.5 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-700/80 rounded-lg text-rose-200 text-xs flex items-center justify-center gap-2 font-bold shadow-md shadow-rose-950/40 transition-all active:scale-95"
            >
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>EMERGENCY STOP (E-STOP HARD CUTOFF)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
