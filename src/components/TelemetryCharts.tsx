import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Thermometer } from 'lucide-react';
import { TelemetryPoint, ThresholdConfig } from '../types/telemetry';

interface TelemetryChartsProps {
  history: TelemetryPoint[];
  thresholds: ThresholdConfig;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  history,
  thresholds,
}) => {
  const chartData = history.slice(-40);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl font-mono text-xs">
          <p className="text-slate-400 mb-1">Time: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="font-semibold">
              {entry.name}: {Number(entry.value).toFixed(1)} °C
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">
            LIVE TEMPERATURE HISTORY (°C)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Head (Drive)
          </span>
          <span className="flex items-center gap-1.5 text-orange-400">
            <span className="w-2.5 h-0.5 bg-orange-400 inline-block" /> Tail (Idler)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-0.5 bg-rose-500 border border-dashed border-rose-500 inline-block" /> Cutoff (58°C)
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timeFormatted"
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
            />
            <YAxis
              domain={[20, 70]}
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              unit="°C"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={thresholds.temp_cutoff_c}
              stroke="#ef4444"
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="temperature_head_c"
              name="Head (Motor)"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="temperature_tail_c"
              name="Tail (Roller)"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
