import {
  TelemetryPoint,
  ThresholdConfig,
  SystemAlert,
  MotorState,
  SystemMode,
  ConnectionStatus,
  ConveyorMetrics,
  AlertSeverity
} from '../types/telemetry';
import { soundManager } from '../utils/soundEffects';

export interface TelemetryListener {
  onTelemetryUpdate: (point: TelemetryPoint, history: TelemetryPoint[]) => void;
  onAlert: (alert: SystemAlert) => void;
  onMetricsUpdate: (metrics: ConveyorMetrics) => void;
  onModeChange: (mode: SystemMode, status: ConnectionStatus) => void;
}

export class TelemetryService {
  private listeners: Set<TelemetryListener> = new Set();
  private mode: SystemMode = 'SIMULATION';
  private connectionStatus: ConnectionStatus = 'SIMULATING';
  private pollingIntervalId: number | null = null;
  private wsConnection: WebSocket | null = null;
  private simulationIntervalId: number | null = null;

  // History buffer (rolling 60 points)
  private history: TelemetryPoint[] = [];
  private maxHistoryLength = 60;

  // Configuration Thresholds
  public thresholds: ThresholdConfig = {
    temp_warning_c: 45.0,
    temp_cutoff_c: 58.0,
    vib_warning_g: 0.65,
    vib_cutoff_g: 1.20,
    ultrasonic_trigger_cm: 9.0,
    ultrasonic_baseline_cm: 24.5,
  };

  // Current State
  private currentMotorState: MotorState = 'RUNNING';
  // Dual Temperature Sensors (Head Drive End & Tail Idler End)
  private currentTempHead: number = 35.4;
  private currentTempTail: number = 29.8;
  private currentVibration: number = 0.32;
  private currentDistance: number = 24.5;
  private isObjectDetected: boolean = false;
  private motorRpm: number = 180;
  private motorCurrent: number = 1.15;

  // Metrics
  private metrics: ConveyorMetrics = {
    total_objects_counted: 14,
    throughput_cpm: 6.2,
    running_hours: 18.4,
    estop_active: false,
    last_fault_reason: null,
    last_command_origin: 'LOCAL_SIM',
    esp32_firmware_version: 'ESP32-FW-v2.4.1-RTOS'
  };

  // Demo Fault Injections
  private injectedFault: 'NONE' | 'OVERHEAT' | 'OVERHEAT_HEAD' | 'OVERHEAT_TAIL' | 'VIBRATION' | 'SENSOR_OFFLINE' = 'NONE';
  private simulatedBoxPosition: number = 0; // 0 to 1 along conveyor length
  private lastObjectRegistered: boolean = false;
  private sensorOfflineTarget: string | null = null;

  constructor() {
    this.seedInitialHistory();
  }

  private seedInitialHistory() {
    const now = Date.now();
    for (let i = this.maxHistoryLength; i >= 0; i--) {
      const timeOffset = now - i * 1000;
      const tHead = +(34.5 + Math.sin(i * 0.1) * 1.1).toFixed(1);
      const tTail = +(29.2 + Math.cos(i * 0.08) * 0.7).toFixed(1);
      const point: TelemetryPoint = {
        timestamp: timeOffset,
        timeFormatted: new Date(timeOffset).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature_head_c: tHead,
        temperature_tail_c: tTail,
        temperature_c: Math.max(tHead, tTail),
        vibration_rms_g: +(0.31 + (Math.random() * 0.06 - 0.03)).toFixed(2),
        ultrasonic_distance_cm: 24.5,
        object_detected: false,
        motor_state: 'RUNNING',
        motor_speed_rpm: 180,
        motor_current_a: 1.18,
        device_id: 'ESP32_CONVEYOR_NODE_01'
      };
      this.history.push(point);
    }
  }

  public subscribe(listener: TelemetryListener) {
    this.listeners.add(listener);
    // Send immediate initial push
    if (this.history.length > 0) {
      const latest = this.history[this.history.length - 1];
      listener.onTelemetryUpdate(latest, [...this.history]);
      listener.onMetricsUpdate({ ...this.metrics });
      listener.onModeChange(this.mode, this.connectionStatus);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public start() {
    if (this.simulationIntervalId) return;

    // Check backend availability
    this.checkLiveBackendAvailability();

    // Start simulation loop (100ms physics tick, 1s history record)
    let tickCount = 0;
    this.simulationIntervalId = window.setInterval(() => {
      tickCount++;
      this.stepSimulation(tickCount);
    }, 100);
  }

  public stop() {
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Graceful Live Backend Detection
  private async checkLiveBackendAvailability() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch('/api/status', { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        this.mode = 'LIVE';
        this.connectionStatus = 'CONNECTED';
        this.connectWebSocket();
      } else {
        this.mode = 'SIMULATION';
        this.connectionStatus = 'SIMULATING';
      }
    } catch {
      this.mode = 'SIMULATION';
      this.connectionStatus = 'SIMULATING';
    }
    this.notifyModeChange();
  }

  private connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        this.connectionStatus = 'CONNECTED';
        this.notifyModeChange();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleLiveTelemetryPayload(data);
        } catch (e) {
          console.warn('Failed to parse telemetry packet', e);
        }
      };

      this.wsConnection.onerror = () => {
        this.mode = 'SIMULATION';
        this.connectionStatus = 'SIMULATING';
        this.notifyModeChange();
      };

      this.wsConnection.onclose = () => {
        if (this.mode === 'LIVE') {
          this.connectionStatus = 'DISCONNECTED';
          this.notifyModeChange();
        }
      };
    } catch {
      this.mode = 'SIMULATION';
      this.connectionStatus = 'SIMULATING';
      this.notifyModeChange();
    }
  }

  private handleLiveTelemetryPayload(data: Partial<TelemetryPoint>) {
    if (this.mode !== 'LIVE') return;
    const now = Date.now();
    const tHead = data.temperature_head_c ?? (data.temperature_c ?? this.currentTempHead);
    const tTail = data.temperature_tail_c ?? this.currentTempTail;
    const point: TelemetryPoint = {
      timestamp: data.timestamp || now,
      timeFormatted: new Date(data.timestamp || now).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature_head_c: tHead,
      temperature_tail_c: tTail,
      temperature_c: Math.max(tHead, tTail),
      vibration_rms_g: data.vibration_rms_g ?? this.currentVibration,
      ultrasonic_distance_cm: data.ultrasonic_distance_cm ?? this.currentDistance,
      object_detected: !!data.object_detected,
      motor_state: data.motor_state ?? this.currentMotorState,
      motor_speed_rpm: data.motor_speed_rpm ?? this.motorRpm,
      motor_current_a: data.motor_current_a ?? this.motorCurrent,
      device_id: data.device_id || 'ESP32_CONVEYOR_NODE_01'
    };
    this.recordTelemetryPoint(point);
  }

  // Simulation Physics & Telemetry Generator
  private stepSimulation(tick: number) {
    if (this.mode === 'LIVE') return;

    const isRunning = this.currentMotorState === 'RUNNING';

    // 1. Box position update along conveyor
    if (isRunning) {
      this.simulatedBoxPosition += 0.012;
      if (this.simulatedBoxPosition > 1.0) {
        this.simulatedBoxPosition = 0;
      }
    }

    // 2. Ultrasonic Sensor Simulation (sensor mounted midway along belt at 0.45 - 0.58)
    if (isRunning && this.simulatedBoxPosition >= 0.45 && this.simulatedBoxPosition <= 0.58) {
      this.currentDistance = +(6.2 + Math.random() * 0.5).toFixed(1);
      this.isObjectDetected = true;

      if (!this.lastObjectRegistered) {
        this.metrics.total_objects_counted += 1;
        this.lastObjectRegistered = true;
        this.notifyMetrics();
      }
    } else {
      this.currentDistance = +(this.thresholds.ultrasonic_baseline_cm + (Math.random() * 0.4 - 0.2)).toFixed(1);
      this.isObjectDetected = false;
      this.lastObjectRegistered = false;
    }

    // 3. Dual Temperature Simulation: Head End (Motor) & Tail End (Idler Bearing)
    if (this.injectedFault === 'OVERHEAT' || this.injectedFault === 'OVERHEAT_HEAD') {
      // Rapid thermal runaway on Head drive motor (fast simulation so user sees immediate results)
      this.currentTempHead += 1.8;
      if (this.currentTempHead > 76) this.currentTempHead = 76;
    } else if (isRunning) {
      // Head temperature stabilizes ~36.8°C
      if (this.currentTempHead < 36.8) {
        this.currentTempHead += 0.04;
      } else {
        this.currentTempHead += (Math.random() * 0.1 - 0.05);
      }
    } else {
      // Cooling down to room temp (~25°C)
      if (this.currentTempHead > 25.5) {
        this.currentTempHead -= 0.08;
      }
    }
    this.currentTempHead = +this.currentTempHead.toFixed(1);

    if (this.injectedFault === 'OVERHEAT_TAIL') {
      // Rapid thermal runaway on Tail idler bearing
      this.currentTempTail += 1.8;
      if (this.currentTempTail > 74) this.currentTempTail = 74;
    } else if (isRunning) {
      // Tail temperature stabilizes ~30.6°C (cooler than drive motor)
      if (this.currentTempTail < 30.6) {
        this.currentTempTail += 0.03;
      } else {
        this.currentTempTail += (Math.random() * 0.08 - 0.04);
      }
    } else {
      if (this.currentTempTail > 24.8) {
        this.currentTempTail -= 0.06;
      }
    }
    this.currentTempTail = +this.currentTempTail.toFixed(1);

    // 4. Vibration Simulation
    if (this.injectedFault === 'VIBRATION') {
      this.currentVibration += 0.08;
      if (this.currentVibration > 1.6) this.currentVibration = 1.6;
    } else if (isRunning) {
      const baselineVib = 0.34;
      const jitter = (Math.sin(tick * 0.2) * 0.04) + (Math.random() * 0.03 - 0.015);
      this.currentVibration = +(baselineVib + jitter).toFixed(2);
    } else {
      this.currentVibration = +(0.03 + Math.random() * 0.02).toFixed(2);
    }

    // 5. Motor RPM & Current
    if (isRunning) {
      this.motorRpm = Math.round(180 + Math.sin(tick * 0.1) * 3);
      this.motorCurrent = +(1.12 + this.currentVibration * 0.2).toFixed(2);
      this.metrics.running_hours += (0.1 / 3600);
    } else {
      this.motorRpm = 0;
      this.motorCurrent = 0.04;
    }

    // 6. Sensor Offline Injected Fault check
    if (this.injectedFault === 'SENSOR_OFFLINE') {
      if (this.sensorOfflineTarget === 'ULTRASONIC') {
        this.currentDistance = -1;
      } else if (this.sensorOfflineTarget === 'VIBRATION') {
        this.currentVibration = -1;
      } else if (this.sensorOfflineTarget === 'HEAD_TEMPERATURE') {
        this.currentTempHead = -999;
      } else if (this.sensorOfflineTarget === 'TAIL_TEMPERATURE') {
        this.currentTempTail = -999;
      }
    }

    // 7. Safety Interlocks & Cutoff Evaluator
    this.evaluateAutomaticSafetyTrips();

    // 8. Record telemetry point at ~1 Hz or immediately on every tick while fault is active
    if (tick % 10 === 0 || this.injectedFault !== 'NONE') {
      const now = Date.now();
      const point: TelemetryPoint = {
        timestamp: now,
        timeFormatted: new Date(now).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature_head_c: this.currentTempHead,
        temperature_tail_c: this.currentTempTail,
        temperature_c: Math.max(this.currentTempHead, this.currentTempTail),
        vibration_rms_g: this.currentVibration,
        ultrasonic_distance_cm: this.currentDistance,
        object_detected: this.isObjectDetected,
        motor_state: this.currentMotorState,
        motor_speed_rpm: this.motorRpm,
        motor_current_a: this.motorCurrent,
        device_id: 'ESP32_CONVEYOR_NODE_01'
      };
      this.recordTelemetryPoint(point);
    }
  }

  // Automatic Cutoff & Trip Logic for both temperature ends
  private evaluateAutomaticSafetyTrips() {
    if (this.currentMotorState !== 'RUNNING') return;

    // Check Head Temperature Critical Cutoff
    if (this.currentTempHead >= this.thresholds.temp_cutoff_c) {
      this.triggerMotorTrip(
        'HEAD_TEMP_CUTOFF',
        `Head Drive Motor Thermal Trip (${this.currentTempHead.toFixed(1)}°C >= ${this.thresholds.temp_cutoff_c.toFixed(1)}°C). Motor auto-isolated for electrical and winding safety.`,
        'HEAD_TEMP',
        `${this.currentTempHead.toFixed(1)} °C`,
        `${this.thresholds.temp_cutoff_c.toFixed(1)} °C`
      );
      return;
    }

    // Check Tail Temperature Critical Cutoff
    if (this.currentTempTail >= this.thresholds.temp_cutoff_c) {
      this.triggerMotorTrip(
        'TAIL_TEMP_CUTOFF',
        `Tail Idler Bearing Thermal Trip (${this.currentTempTail.toFixed(1)}°C >= ${this.thresholds.temp_cutoff_c.toFixed(1)}°C). Roller bearing seizure prevention cutoff.`,
        'TAIL_TEMP',
        `${this.currentTempTail.toFixed(1)} °C`,
        `${this.thresholds.temp_cutoff_c.toFixed(1)} °C`
      );
      return;
    }

    // Check Head Temperature Warning
    if (this.currentTempHead >= this.thresholds.temp_warning_c) {
      this.emitWarningThrottled(
        'HEAD_TEMP_WARN',
        `Elevated Head drive motor temperature detected (${this.currentTempHead.toFixed(1)}°C). Approaching cutoff threshold.`,
        'HEAD_TEMP',
        `${this.currentTempHead.toFixed(1)} °C`,
        `${this.thresholds.temp_warning_c.toFixed(1)} °C`
      );
    }

    // Check Tail Temperature Warning
    if (this.currentTempTail >= this.thresholds.temp_warning_c) {
      this.emitWarningThrottled(
        'TAIL_TEMP_WARN',
        `Elevated Tail idler bearing temperature detected (${this.currentTempTail.toFixed(1)}°C). Check bearing lubrication.`,
        'TAIL_TEMP',
        `${this.currentTempTail.toFixed(1)} °C`,
        `${this.thresholds.temp_warning_c.toFixed(1)} °C`
      );
    }

    // Check Vibration Critical Cutoff
    if (this.currentVibration >= this.thresholds.vib_cutoff_g) {
      this.triggerMotorTrip(
        'VIB_CUTOFF',
        `Excessive Mechanical Vibration Cutoff (${this.currentVibration.toFixed(2)} g RMS >= ${this.thresholds.vib_cutoff_g.toFixed(2)} g RMS). Bearing protection interlock engaged.`,
        'VIBRATION',
        `${this.currentVibration.toFixed(2)} g RMS`,
        `${this.thresholds.vib_cutoff_g.toFixed(2)} g RMS`
      );
      return;
    }

    // Check Vibration Warning Threshold
    if (this.currentVibration >= this.thresholds.vib_warning_g) {
      this.emitWarningThrottled(
        'VIB_WARN',
        `Bearing oscillation warning (${this.currentVibration.toFixed(2)} g RMS). Mechanical inspection advised.`,
        'VIBRATION',
        `${this.currentVibration.toFixed(2)} g RMS`,
        `${this.thresholds.vib_warning_g.toFixed(2)} g RMS`
      );
    }
  }

  private lastAlertTimes: Record<string, number> = {};

  private emitWarningThrottled(
    code: 'HEAD_TEMP_WARN' | 'TAIL_TEMP_WARN' | 'TEMP_WARN' | 'VIB_WARN',
    message: string,
    sensor: 'HEAD_TEMP' | 'TAIL_TEMP' | 'TEMPERATURE' | 'VIBRATION',
    measured: string,
    threshold: string
  ) {
    const now = Date.now();
    if (this.lastAlertTimes[code] && (now - this.lastAlertTimes[code] < 10000)) {
      return;
    }
    this.lastAlertTimes[code] = now;

    soundManager.playWarning();

    const alert: SystemAlert = {
      id: `alert-${now}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date(now).toLocaleTimeString(),
      timeUnix: now,
      severity: 'WARNING',
      code: code,
      sensor: sensor,
      measured_value: measured,
      threshold: threshold,
      description: message,
      acknowledged: false,
    };
    this.notifyAlert(alert);
  }

  private triggerMotorTrip(
    code: 'HEAD_TEMP_CUTOFF' | 'TAIL_TEMP_CUTOFF' | 'TEMP_CUTOFF' | 'VIB_CUTOFF' | 'ESTOP_TRIGGERED',
    reason: string,
    sensor: 'HEAD_TEMP' | 'TAIL_TEMP' | 'TEMPERATURE' | 'VIBRATION' | 'MOTOR' | 'SYSTEM',
    measured: string,
    threshold: string
  ) {
    this.currentMotorState = 'FAULT';
    this.metrics.last_fault_reason = reason;
    this.metrics.last_command_origin = this.mode === 'LIVE' ? 'REMOTE_ESP32_ACK' : 'LOCAL_SIM';
    soundManager.playCriticalAlarm();

    const now = Date.now();
    const alert: SystemAlert = {
      id: `alert-${now}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date(now).toLocaleTimeString(),
      timeUnix: now,
      severity: 'CRITICAL',
      code: code,
      sensor: sensor,
      measured_value: measured,
      threshold: threshold,
      description: reason,
      acknowledged: false,
    };

    this.notifyAlert(alert);
    this.notifyMetrics();

    // Push immediate point showing FAULT state
    const point: TelemetryPoint = {
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature_head_c: this.currentTempHead,
      temperature_tail_c: this.currentTempTail,
      temperature_c: Math.max(this.currentTempHead, this.currentTempTail),
      vibration_rms_g: this.currentVibration,
      ultrasonic_distance_cm: this.currentDistance,
      object_detected: this.isObjectDetected,
      motor_state: 'FAULT',
      motor_speed_rpm: 0,
      motor_current_a: 0.05,
      device_id: 'ESP32_CONVEYOR_NODE_01'
    };
    this.recordTelemetryPoint(point);
  }

  private recordTelemetryPoint(point: TelemetryPoint) {
    this.history.push(point);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
    const clonedHistory = [...this.history];
    this.listeners.forEach((l) => l.onTelemetryUpdate(point, clonedHistory));
  }

  private notifyAlert(alert: SystemAlert) {
    this.listeners.forEach((l) => l.onAlert(alert));
  }

  private notifyMetrics() {
    const copy = { ...this.metrics };
    this.listeners.forEach((l) => l.onMetricsUpdate(copy));
  }

  private notifyModeChange() {
    this.listeners.forEach((l) => l.onModeChange(this.mode, this.connectionStatus));
  }

  // User Actions & Controls
  public startConveyor(): { success: boolean; message: string } {
    soundManager.playClick();
    if (this.currentMotorState === 'FAULT') {
      return {
        success: false,
        message: 'Cannot start conveyor while in FAULT condition. Please resolve fault and reset system.'
      };
    }
    if (this.metrics.estop_active) {
      return {
        success: false,
        message: 'Emergency Stop is engaged. Release E-Stop before motor startup.'
      };
    }

    this.currentMotorState = 'RUNNING';
    this.metrics.last_command_origin = this.mode === 'LIVE' ? 'REMOTE_ESP32_ACK' : 'LOCAL_SIM';
    this.notifyMetrics();

    const now = Date.now();
    this.notifyAlert({
      id: `alert-${now}`,
      timestamp: new Date(now).toLocaleTimeString(),
      timeUnix: now,
      severity: 'NORMAL',
      code: 'NORMAL',
      sensor: 'MOTOR',
      measured_value: 'START',
      threshold: 'N/A',
      description: `Motor startup initiated (${this.metrics.last_command_origin === 'LOCAL_SIM' ? 'Simulated Local Command' : 'ESP32 Command Acknowledged'}).`,
      acknowledged: true,
    });

    return { success: true, message: 'Conveyor motor running.' };
  }

  public stopConveyor(reason = 'Operator Manual Stop'): { success: boolean; message: string } {
    soundManager.playClick();
    this.currentMotorState = 'STOPPED';
    this.metrics.last_command_origin = this.mode === 'LIVE' ? 'REMOTE_ESP32_ACK' : 'LOCAL_SIM';
    this.notifyMetrics();

    const now = Date.now();
    this.notifyAlert({
      id: `alert-${now}`,
      timestamp: new Date(now).toLocaleTimeString(),
      timeUnix: now,
      severity: 'NORMAL',
      code: 'NORMAL',
      sensor: 'MOTOR',
      measured_value: 'STOP',
      threshold: 'N/A',
      description: `${reason} (${this.metrics.last_command_origin === 'LOCAL_SIM' ? 'Simulated' : 'ESP32 Acknowledged'}).`,
      acknowledged: true,
    });

    return { success: true, message: 'Conveyor stopped.' };
  }

  public emergencyStop(): void {
    this.metrics.estop_active = true;
    this.triggerMotorTrip(
      'ESTOP_TRIGGERED',
      'EMERGENCY STOP BUTTON ENGAGED! Immediate hard interlock shutdown triggered.',
      'SYSTEM',
      'ACTIVE',
      'INTERLOCK'
    );
  }

  public resetDemo(): void {
    soundManager.playClick();
    this.injectedFault = 'NONE';
    this.sensorOfflineTarget = null;
    this.metrics.estop_active = false;
    this.metrics.last_fault_reason = null;
    this.currentTempHead = 34.2;
    this.currentTempTail = 29.4;
    this.currentVibration = 0.32;
    this.currentDistance = 24.5;
    this.currentMotorState = 'STOPPED';
    this.metrics.last_command_origin = 'LOCAL_SIM';
    this.notifyMetrics();

    const now = Date.now();
    this.notifyAlert({
      id: `alert-${now}`,
      timestamp: new Date(now).toLocaleTimeString(),
      timeUnix: now,
      severity: 'NORMAL',
      code: 'NORMAL',
      sensor: 'SYSTEM',
      measured_value: 'RESET_OK',
      threshold: 'N/A',
      description: 'System state reset to nominal baseline. Interlocks cleared.',
      acknowledged: true,
    });
  }

  // Demonstration Fault Injections
  public injectFault(faultType: 'OVERHEAT' | 'OVERHEAT_HEAD' | 'OVERHEAT_TAIL' | 'VIBRATION' | 'SENSOR_OFFLINE' | 'OBJECT_PASS'): void {
    soundManager.playClick();
    if (faultType === 'OVERHEAT' || faultType === 'OVERHEAT_HEAD') {
      this.injectedFault = 'OVERHEAT_HEAD';
      if (this.currentMotorState !== 'RUNNING') {
        this.currentMotorState = 'RUNNING';
      }
    } else if (faultType === 'OVERHEAT_TAIL') {
      this.injectedFault = 'OVERHEAT_TAIL';
      if (this.currentMotorState !== 'RUNNING') {
        this.currentMotorState = 'RUNNING';
      }
    } else if (faultType === 'VIBRATION') {
      this.injectedFault = 'VIBRATION';
      if (this.currentMotorState !== 'RUNNING') {
        this.currentMotorState = 'RUNNING';
      }
    } else if (faultType === 'SENSOR_OFFLINE') {
      this.injectedFault = 'SENSOR_OFFLINE';
      this.sensorOfflineTarget = 'ULTRASONIC';
      const now = Date.now();
      this.notifyAlert({
        id: `alert-${now}`,
        timestamp: new Date(now).toLocaleTimeString(),
        timeUnix: now,
        severity: 'WARNING',
        code: 'SENSOR_OFFLINE',
        sensor: 'ULTRASONIC',
        measured_value: 'NO SIGNAL / TIMEOUT',
        threshold: 'ECHO_PIN_HIGH',
        description: 'Ultrasonic HC-SR04 echo timeout. Check ESP32 GPIO 18 connection or sensor power.',
        acknowledged: false,
      });
    } else if (faultType === 'OBJECT_PASS') {
      this.simulatedBoxPosition = 0.48;
      this.currentDistance = 7.2;
      this.isObjectDetected = true;
    }
  }

  public updateThresholds(partial: Partial<ThresholdConfig>) {
    this.thresholds = { ...this.thresholds, ...partial };
  }

  public setMode(mode: SystemMode) {
    soundManager.playClick();
    this.mode = mode;
    if (mode === 'LIVE') {
      this.connectionStatus = 'CONNECTING';
      this.checkLiveBackendAvailability();
    } else {
      this.connectionStatus = 'SIMULATING';
      this.notifyModeChange();
    }
  }

  public getMode(): SystemMode {
    return this.mode;
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getBoxPosition(): number {
    return this.simulatedBoxPosition;
  }

  public getLatestPoint(): TelemetryPoint | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  public getHistory(): TelemetryPoint[] {
    return [...this.history];
  }
}

export const telemetryService = new TelemetryService();
