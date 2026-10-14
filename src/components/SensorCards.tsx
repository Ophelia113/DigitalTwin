import React from 'react';
import {
  Thermometer,
  Waves,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import { TelemetryPoint, ThresholdConfig } from '../types/telemetry';

interface SensorCardsProps {
  current: TelemetryPoint | null;
  thresholds: ThresholdConfig;
}

export const SensorCards: React.FC<SensorCardsProps> = ({ current, thresholds }) => {
  if (!current) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // 1. Head Temp (Drive Motor)
  const isHeadHot = current.temperature_head_c >= thresholds.temp_cutoff_c;
  const isHeadWarm = !isHeadHot && current.temperature_head_c >= thresholds.temp_warning_c;

  // 2. Tail Temp (Idler Roller)
  const isTailHot = current.temperature_tail_c >= thresholds.temp_cutoff_c;
  const isTailWarm = !isTailHot && current.temperature_tail_c >= thresholds.temp_warning_c;

  // 3. Vibration
  const isVibHigh = current.vibration_rms_g >= thresholds.vib_cutoff_g;
  const isVibWarn = !isVibHigh && current.vibration_rms_g >= thresholds.vib_warning_g;

  // 4. Object Detection
  const isObjectDetected = current.object_detected || current.ultrasonic_distance_cm <= thresholds.ultrasonic_trigger_cm;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. MOTOR TEMP (HEAD) */}
      <div className={`p-4 rounded-xl border transition-all ${
        isHeadHot
          ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-950/50'
          : isHeadWarm
          ? 'bg-amber-950/30 border-amber-500/60'
          : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Thermometer className="w-4 h-4" />
            <span>Motor Temp (Head)</span>
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            isHeadHot ? 'bg-rose-500/20 text-rose-300' : isHeadWarm ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {isHeadHot ? 'Overheated' : isHeadWarm ? 'Warm' : 'Normal'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold font-mono text-white tracking-tight">
            {current.temperature_head_c.toFixed(1)}
          </span>
          <span className="text-sm font-mono text-slate-400">°C</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-mono">
          Safe limit: &lt; {thresholds.temp_cutoff_c}°C
        </p>
      </div>

      {/* 2. ROLLER TEMP (TAIL) */}
      <div className={`p-4 rounded-xl border transition-all ${
        isTailHot
          ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-950/50'
          : isTailWarm
          ? 'bg-amber-950/30 border-amber-500/60'
          : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
            <Thermometer className="w-4 h-4" />
            <span>Roller Temp (Tail)</span>
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            isTailHot ? 'bg-rose-500/20 text-rose-300' : isTailWarm ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {isTailHot ? 'Overheated' : isTailWarm ? 'Warm' : 'Normal'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold font-mono text-white tracking-tight">
            {current.temperature_tail_c.toFixed(1)}
          </span>
          <span className="text-sm font-mono text-slate-400">°C</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-mono">
          Safe limit: &lt; {thresholds.temp_cutoff_c}°C
        </p>
      </div>

      {/* 3. VIBRATION */}
      <div className={`p-4 rounded-xl border transition-all ${
        isVibHigh
          ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-950/50'
          : isVibWarn
          ? 'bg-amber-950/30 border-amber-500/60'
          : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <Waves className="w-4 h-4" />
            <span>Belt Vibration</span>
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            isVibHigh ? 'bg-rose-500/20 text-rose-300' : isVibWarn ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {isVibHigh ? 'High Shake' : isVibWarn ? 'Vibrating' : 'Smooth'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold font-mono text-white tracking-tight">
            {current.vibration_rms_g.toFixed(2)}
          </span>
          <span className="text-sm font-mono text-slate-400">g RMS</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-mono">
          Cutoff: &gt; {thresholds.vib_cutoff_g} g
        </p>
      </div>

      {/* 4. ULTRASONIC OBJECT SENSOR */}
      <div className={`p-4 rounded-xl border transition-all ${
        isObjectDetected
          ? 'bg-emerald-950/30 border-emerald-500/70 shadow-lg shadow-emerald-950/40'
          : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Ruler className="w-4 h-4" />
            <span>Object Sensor</span>
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            isObjectDetected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {isObjectDetected ? 'BOX PRESENT' : 'CLEAR'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold font-mono text-white tracking-tight">
            {current.ultrasonic_distance_cm.toFixed(1)}
          </span>
          <span className="text-sm font-mono text-slate-400">cm</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 font-mono">
          {isObjectDetected ? 'Item passing under sensor' : 'Conveyor path empty'}
        </p>
      </div>
    </div>
  );
};
