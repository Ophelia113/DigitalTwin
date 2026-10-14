import React, { useState, useEffect, useCallback } from 'react';
import {
  TelemetryPoint,
  ThresholdConfig,
  SystemAlert,
  MotorState,
  ConveyorMetrics
} from './types/telemetry';
import { telemetryService } from './services/telemetryService';
import { Header } from './components/Header';
import { SensorCards } from './components/SensorCards';
import { DigitalTwinViewer } from './components/DigitalTwinViewer';
import { ControlPanel } from './components/ControlPanel';
import { TelemetryCharts } from './components/TelemetryCharts';
import { AlertEventLog } from './components/AlertEventLog';

export const App: React.FC = () => {
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [boxProgress, setBoxProgress] = useState<number>(0);

  const [metrics, setMetrics] = useState<ConveyorMetrics>({
    total_objects_counted: 14,
    throughput_cpm: 6.2,
    running_hours: 18.4,
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
      measured_value: 'OK',
      threshold: 'NOMINAL',
      description: 'Conveyor monitoring active. Both temperature sensors & vibration armed.',
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
      onModeChange: () => {}
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

  const motorState: MotorState = currentTelemetry?.motor_state || 'STOPPED';

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30">
      {/* 1. Clean Simple Header */}
      <Header motorState={motorState} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
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
            <span>ESP32 Node: <strong className="text-cyan-400">Online</strong></span>
            <span>Items Passed: <strong className="text-emerald-400">{metrics.total_objects_counted}</strong></span>
            <span>Speed: <strong className="text-white">{currentTelemetry?.motor_speed_rpm || 0} RPM</strong></span>
          </div>
          <span className="text-slate-500">
            Process Monitoring & Safety System
          </span>
        </div>
      </main>
    </div>
  );
};

export default App;
