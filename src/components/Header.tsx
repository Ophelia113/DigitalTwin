import React from 'react';
import { Activity, Usb, Cpu, Unplug, ShieldCheck } from 'lucide-react';
import { MotorState, SystemMode, ConnectionStatus } from '../types/telemetry';

interface HeaderProps {
  motorState: MotorState;
  systemMode: SystemMode;
  connectionStatus: ConnectionStatus;
  isUsbConnected: boolean;
  usbPortName: string | null;
  onConnectUsb: () => void;
  onDisconnectUsb: () => void;
  onOpenHardwareModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  motorState,
  systemMode,
  connectionStatus,
  isUsbConnected,
  usbPortName,
  onConnectUsb,
  onDisconnectUsb,
  onOpenHardwareModal,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 sm:px-8 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white font-scada tracking-wide">
                Digital Twin for Process Monitoring in Heating and Moving Plate
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-Time IoT Monitoring & Automatic Safety Protection • Tabletop Conveyor
            </p>
          </div>
        </div>

        {/* Right: Hardware USB Connection & System Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hardware & Pinout Reference Button */}
          <button
            onClick={onOpenHardwareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-all shadow-sm"
            title="Open ESP32 Pinout, Wiring & Firmware Code"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">ESP32 Pinout & Code</span>
            <span className="sm:hidden">Pinout</span>
          </button>

          {/* USB Serial Connection Button */}
          {isUsbConnected ? (
            <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-500/50 rounded-lg px-2.5 py-1 text-xs font-mono text-emerald-300">
              <Usb className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-bold">{usbPortName || 'ESP32 USB'}</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1 rounded uppercase">LIVE</span>
              <button
                onClick={onDisconnectUsb}
                className="ml-1 p-0.5 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                title="Disconnect USB Serial"
              >
                <Unplug className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectUsb}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 hover:shadow-cyan-500/25 transition-all active:scale-95"
              title="Connect directly to physical ESP32 via USB cable (Web Serial API)"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Connect ESP32 (USB)</span>
            </button>
          )}

          {/* System Run Status Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold font-mono ${
            motorState === 'RUNNING'
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
              : motorState === 'FAULT'
              ? 'bg-rose-500/10 border border-rose-500/40 text-rose-300 animate-pulse'
              : 'bg-slate-800 border border-slate-700 text-slate-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              motorState === 'RUNNING' ? 'bg-emerald-400 animate-ping' : motorState === 'FAULT' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <span>
              {motorState === 'RUNNING' ? 'RUNNING' : motorState === 'FAULT' ? 'SAFETY TRIP' : 'STOPPED'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
