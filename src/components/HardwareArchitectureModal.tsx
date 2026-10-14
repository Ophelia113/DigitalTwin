import React, { useState } from 'react';
import {
  X,
  Cpu,
  Server,
  Radio,
  ShieldCheck,
  Code,
  Layers,
  Terminal,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface HardwareArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareArchitectureModal: React.FC<HardwareArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'PINOUT' | 'API' | 'SAFETY' | 'FIRMWARE'>('PINOUT');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const sampleJsonTelemetry = `{
  "device_id": "ESP32_CONVEYOR_NODE_01",
  "timestamp": 1791912000000,
  "temperature_head_c": 35.4,
  "temperature_tail_c": 29.8,
  "temperature_c": 35.4,
  "vibration_rms_g": 0.32,
  "ultrasonic_distance_cm": 24.5,
  "object_detected": false,
  "motor_state": "RUNNING",
  "motor_speed_rpm": 180,
  "motor_current_a": 1.15
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white font-scada tracking-wider">
                ESP32 HARDWARE PINOUT & SYSTEM ARCHITECTURE SPECIFICATION
              </h3>
              <p className="text-[11px] text-slate-400">
                System Integration Reference • Hardware & Telemetry Standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950/60 border-b border-slate-800 px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('PINOUT')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeSubTab === 'PINOUT'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ESP32 Pinout & Sensors
          </button>
          <button
            onClick={() => setActiveSubTab('API')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeSubTab === 'API'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Backend & MQTT Schema
          </button>
          <button
            onClick={() => setActiveSubTab('SAFETY')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeSubTab === 'SAFETY'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Hardware Safety Interlocks
          </button>
          <button
            onClick={() => setActiveSubTab('FIRMWARE')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeSubTab === 'FIRMWARE'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FreeRTOS Dual-Core Architecture
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300">
          {activeSubTab === 'PINOUT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-cyan-400 font-bold block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    ESP32 NodeMCU DevKit V1 Pin Assignments
                  </span>
                  <div className="space-y-1.5 text-[11px] divide-y divide-slate-800/80">
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">DS18B20 #1 (Head Drive Temp):</span>
                      <span className="text-cyan-300 font-bold">GPIO 4 (1-Wire + 4.7kΩ Pull-Up)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">DS18B20 #2 (Tail Idler Temp):</span>
                      <span className="text-orange-300 font-bold">GPIO 4 (Shared 1-Wire Multi-Drop)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">MPU6050 SDA (Vibration):</span>
                      <span className="text-slate-200 font-bold">GPIO 21 (I2C Data Bus)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">MPU6050 SCL (Vibration):</span>
                      <span className="text-slate-200 font-bold">GPIO 22 (I2C Clock Bus)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">HC-SR04 Trigger:</span>
                      <span className="text-slate-200 font-bold">GPIO 18 (10µs Pulse)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">HC-SR04 Echo:</span>
                      <span className="text-slate-200 font-bold">GPIO 19 (Via 1k/2k Resistor Divider)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">L298N Motor IN1 / IN2:</span>
                      <span className="text-slate-200 font-bold">GPIO 14, GPIO 27 (H-Bridge Logic)</span>
                    </div>
                    <div className="pt-1 flex justify-between">
                      <span className="text-slate-400">L298N Motor ENA (PWM):</span>
                      <span className="text-slate-200 font-bold">GPIO 12 (LEDC PWM 20kHz)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Physical Mini Tabletop Specifications
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <p><strong className="text-slate-200">Bed Span:</strong> 500 mm aluminum profile rail</p>
                    <p><strong className="text-slate-200">Belt Type:</strong> 100 mm black matte continuous PU</p>
                    <p><strong className="text-slate-200">Rollers:</strong> 2x 28mm dual-flange aluminum rollers</p>
                    <p><strong className="text-slate-200">Motor:</strong> 12V DC Planetary Gearmotor (200 RPM max)</p>
                    <p><strong className="text-slate-200">Power Supply:</strong> 12V 3A DC for motor; 5V 2A for ESP32 & sensors</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'API' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">Standard Telemetry JSON Payload Model</span>
                <button
                  onClick={() => copyToClipboard(sampleJsonTelemetry, 'json')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedTab === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy JSON</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto">
                {sampleJsonTelemetry}
              </pre>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold block mb-1">REST Endpoints Supported</span>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    <li><code className="text-slate-200">GET /api/status</code> — Current system state</li>
                    <li><code className="text-slate-200">GET /api/history</code> — 60s rolling telemetry buffer</li>
                    <li><code className="text-slate-200">GET /api/alerts</code> — Active & historical event log</li>
                    <li><code className="text-slate-200">POST /api/control</code> — Safe motor command ingestion</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-sky-400 font-bold block mb-1">MQTT & WebSocket Protocol</span>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    <li><code className="text-slate-200">ws://localhost:5173/ws</code> — Streaming 10Hz socket</li>
                    <li><code className="text-slate-200">conveyor/telemetry</code> — ESP32 publish broker</li>
                    <li><code className="text-slate-200">conveyor/cmd/ack</code> — Hardware safety ACK</li>
                    <li><code className="text-slate-200">conveyor/safety/trip</code> — Emergency trip broadcast</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'SAFETY' && (
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Industrial Autonomous Safety Philosophy</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    In industrial SCADA design, human machine interfaces (HMIs) and web dashboards must <strong>never</strong> be in the critical path of emergency motor cutoffs. If the WiFi disconnects or the browser tab closes, the machine must remain physically protected.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-rose-400 font-bold block mb-1">Local ESP32 Hardware Cutoff</span>
                  <p className="text-[11px] text-slate-400">
                    The ESP32 runs an independent hardware interrupt timer checking thermal and vibration limits directly in firmware. If temperature exceeds 60°C or vibration exceeds 1.2g, the ESP32 disables the L298N enable pin immediately without awaiting server approval.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-cyan-400 font-bold block mb-1">Command Acknowledgement (ACK)</span>
                  <p className="text-[11px] text-slate-400">
                    The UI sends requests (e.g. Start / Stop), but the dashboard will only transition to 'RUNNING' when the hardware acknowledges via a cryptographically signed packet with origin <code className="text-cyan-300">REMOTE_ESP32_ACK</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'FIRMWARE' && (
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-white font-bold block">FreeRTOS Dual-Core Architecture Breakdown</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The ESP32 dual-core Xtensa LX6 microprocessor is partitioned for deterministic real-time safety:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-900 rounded-lg border border-cyan-900/40">
                  <span className="text-cyan-400 font-bold block mb-1">Core 1: Safety & Sampling (Priority 5 - Highest)</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                    <li>1 kHz Accelerometer read via I2C DMA</li>
                    <li>DSP RMS Vibration calculation</li>
                    <li>DS18B20 One-Wire thermal check</li>
                    <li>Zero-latency hardware shutdown interlock</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-300 font-bold block mb-1">Core 0: Networking & Telemetry (Priority 1)</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                    <li>Wi-Fi 802.11 b/g/n stack</li>
                    <li>MQTT Client publish at 10Hz rate</li>
                    <li>HTTP REST server handling <code className="text-slate-300">/api/status</code></li>
                    <li>Non-blocking queue link between cores</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Process Monitoring & Safety Interlock Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-colors"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
