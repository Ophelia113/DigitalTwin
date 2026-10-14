// Types definition for Conveyor Digital Twin SCADA Dashboard

export type MotorState = 'RUNNING' | 'STOPPED' | 'FAULT';

export type SystemMode = 'SIMULATION' | 'LIVE';

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'SIMULATING';

export type AlertSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type AlertCode = 
  | 'NORMAL'
  | 'TEMP_WARN'
  | 'TEMP_CUTOFF'
  | 'HEAD_TEMP_WARN'
  | 'HEAD_TEMP_CUTOFF'
  | 'TAIL_TEMP_WARN'
  | 'TAIL_TEMP_CUTOFF'
  | 'VIB_WARN'
  | 'VIB_CUTOFF'
  | 'SENSOR_OFFLINE'
  | 'CONN_LOST'
  | 'ESTOP_TRIGGERED'
  | 'OBJECT_JAM';

export type SensorType = 
  | 'TEMPERATURE' 
  | 'HEAD_TEMP' 
  | 'TAIL_TEMP' 
  | 'VIBRATION' 
  | 'ULTRASONIC' 
  | 'MOTOR' 
  | 'SYSTEM';

export interface TelemetryPoint {
  timestamp: number;
  timeFormatted: string;
  temperature_c: number;        // Primary/Peak temperature (°C)
  temperature_head_c: number;   // Head / Drive Motor End Temperature (°C)
  temperature_tail_c: number;   // Tail / Idler Bearing End Temperature (°C)
  vibration_rms_g: number;
  ultrasonic_distance_cm: number;
  object_detected: boolean;
  motor_state: MotorState;
  motor_speed_rpm: number;
  motor_current_a: number;
  device_id: string;
}

export interface ThresholdConfig {
  temp_warning_c: number;    // e.g. 45°C
  temp_cutoff_c: number;     // e.g. 58°C (Critical Auto Cutoff)
  vib_warning_g: number;     // e.g. 0.65 g RMS
  vib_cutoff_g: number;      // e.g. 1.20 g RMS (Critical Auto Cutoff)
  ultrasonic_trigger_cm: number; // e.g. 9.0 cm (Object presence)
  ultrasonic_baseline_cm: number; // e.g. 24.5 cm (Empty conveyor bed)
}

export interface SystemAlert {
  id: string;
  timestamp: string;
  timeUnix: number;
  severity: AlertSeverity;
  code: AlertCode;
  sensor: SensorType;
  measured_value: string;
  threshold: string;
  description: string;
  acknowledged: boolean;
}

export interface ConveyorMetrics {
  total_objects_counted: number;
  throughput_cpm: number; // counts per minute
  running_hours: number;
  estop_active: boolean;
  last_fault_reason: string | null;
  last_command_origin: 'LOCAL_SIM' | 'REMOTE_ESP32_ACK';
  esp32_firmware_version: string;
}
