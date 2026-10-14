import React, { useState, useEffect } from 'react';
import {
  TelemetryPoint,
  ThresholdConfig,
  SystemAlert,
  MotorState,
  ConveyorMetrics,
  SystemMode,
  ConnectionStatus
} from './types/telemetry';
import { telemetryService } from './services/telemetryService';
import { Header } from './components/Header';
import { SensorCards } from './components/SensorCards';
import { DigitalTwinViewer } from './components/DigitalTwinViewer';
import { ControlPanel } from './components/ControlPanel';
import { TelemetryCharts } from './components/TelemetryCharts';
import { AlertEventLog } from './components/AlertEventLog';
import { HardwareArchitectureModal } from './components/HardwareArchitectureModal';

export const App: React.FC = () => {
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [boxProgress, setBoxProgress] = useState<number>(0);

  // USB Serial & System Mode State
  const [systemMode, setSystemMode] = useState<SystemMode>('SIMULATION');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('SIMULATING');
  const [isUsbConnected, setIsUsbConnected] = useState<boolean>(false);
  const [usbPortName, setUsbPortName] = useState<string | null>(null);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<ConveyorMetrics>({
    total_objects_counted: 0,
    throughput_cpm: 0.0,
    running_hours: 0.0,
    estop_active: false,
    last_fault_reason: null,
    last_command_origin: 'LOCAL_SIM',
    esp32_firmware_version: 'ESP32-FW-v2.4.1-RTOS'
  });

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      timeUnix: Date.now(),
      severity: 'NORMAL',
      code: 'NORMAL',
      sensor: 'SYSTEM',
      measured_value: 'STANDBY',
      threshold: 'NOMINAL',
      description: 'System in Standby. Press [Start Conveyor] to begin, or click [Connect ESP32 (USB)] for physical hardware.',
      acknowledged: true,
    }
  ]);

  const [thresholds] = useState<ThresholdConfig>(telemetryService.thresholds);

  // Subscribe to Telemetry Service
  useEffect(() => {
    telemetryService.start();

    const unsubscribe = telemetryService.subscribe({
      onTelemetryUpdate: (point, fullHistory) => {
        setCurrentTelemetry(point);
        setHistory(fullHistory);
        setBoxProgress(telemetryService.getBoxPosition());
      },
      onAlert: (alert) => {
        setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
      },
      onMetricsUpdate: (newMetrics) => {
        setMetrics(newMetrics);
      },
      onModeChange: (mode, status) => {
        setSystemMode(mode);
        setConnectionStatus(status);
        const serialInfo = telemetryService.getSerialInfo();
        setIsUsbConnected(serialInfo.isConnected);
        setUsbPortName(serialInfo.portName);
      }
    });

    const animInterval = setInterval(() => {
      setBoxProgress(telemetryService.getBoxPosition());
    }, 33);

    return () => {
      unsubscribe();
      clearInterval(animInterval);
      telemetryService.stop();
    };
  }, []);

  const handleStartConveyor = () => {
    telemetryService.startConveyor();
  };

  const handleStopConveyor = () => {
    telemetryService.stopConveyor('Operator Stop');
  };

  const handleEmergencyStop = () => {
    telemetryService.emergencyStop();
  };

  const handleResetDemo = () => {
    telemetryService.resetDemo();
  };

  const handleInjectFault = (type: 'OVERHEAT' | 'OVERHEAT_HEAD' | 'OVERHEAT_TAIL' | 'VIBRATION' | 'SENSOR_OFFLINE' | 'OBJECT_PASS') => {
    telemetryService.injectFault(type);
  };

  const handleConnectUsb = async () => {
    const res = await telemetryService.connectWebSerial(115200);
    if (res.success) {
      setIsUsbConnected(true);
      setUsbPortName(telemetryService.getSerialInfo().portName);
    } else {
      alert(`USB Serial Connection: ${res.message}`);
    }
  };

  const handleDisconnectUsb = async () => {
    await telemetryService.disconnectWebSerial();
    setIsUsbConnected(false);
    setUsbPortName(null);
  };

  const motorState: MotorState = currentTelemetry?.motor_state || 'STOPPED';

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30">
      {/* 1. Clean Header with ESP32 USB Connect Button */}
      <Header
        motorState={motorState}
        systemMode={systemMode}
        connectionStatus={connectionStatus}
        isUsbConnected={isUsbConnected}
        usbPortName={usbPortName}
        onConnectUsb={handleConnectUsb}
        onDisconnectUsb={handleDisconnectUsb}
        onOpenHardwareModal={() => setIsHardwareModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* USB Connection Live Banner */}
        {isUsbConnected && (
          <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-emerald-200 shadow-lg shadow-emerald-950/40">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>
                <strong>LIVE USB SERIAL CONNECTED:</strong> Receiving real physical telemetry packets from ESP32 at 115200 baud.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Device ID: <strong className="text-white">{currentTelemetry?.device_id || 'ESP32'}</strong></span>
              <button
                onClick={handleDisconnectUsb}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold transition-colors"
              >
                Disconnect USB
              </button>
            </div>
          </div>
        )}

        {/* 2. Four Prominent Sensor Cards */}
        <SensorCards
          current={currentTelemetry}
          thresholds={thresholds}
        />

        {/* 3. Central Two-Column Layout: 3D Twin & Easy Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: 3D Conveyor Belt Twin (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <DigitalTwinViewer
              current={currentTelemetry}
              thresholds={thresholds}
              boxProgress={boxProgress}
              motorState={motorState}
              onStartConveyor={handleStartConveyor}
            />
          </div>

          {/* Right: Simple 3-Button Controls (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <ControlPanel
              motorState={motorState}
              metrics={metrics}
              onStartConveyor={handleStartConveyor}
              onStopConveyor={handleStopConveyor}
              onResetDemo={handleResetDemo}
              onInjectFault={handleInjectFault}
              onEmergencyStop={handleEmergencyStop}
            />
          </div>
        </div>

        {/* 4. Bottom Row: Temperature Graph & Recent Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Clean Temperature Chart (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <TelemetryCharts
              history={history}
              thresholds={thresholds}
            />
          </div>

          {/* Right: Recent Events Feed (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <AlertEventLog alerts={alerts} />
          </div>
        </div>

        {/* 5. Minimal Clean Hardware Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span>
              ESP32 Node:{' '}
              <strong className={isUsbConnected ? 'text-emerald-400' : 'text-cyan-400'}>
                {isUsbConnected ? 'USB Live' : 'Simulation'}
              </strong>
            </span>
            <span>Items Passed: <strong className="text-emerald-400">{metrics.total_objects_counted}</strong></span>
            <span>Speed: <strong className="text-white">{currentTelemetry?.motor_speed_rpm || 0} RPM</strong></span>
          </div>
          <button
            onClick={() => setIsHardwareModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
          >
            <span>View ESP32 Wiring & Firmware Code</span>
          </button>
        </div>
      </main>

      {/* Hardware Pinout & Wiring Modal */}
      <HardwareArchitectureModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />
    </div>
  );
};

export default App;
