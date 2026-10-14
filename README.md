# Digital Twin for Process Monitoring in Heating and Moving Plate

**Real-Time Monitoring, Telemetry Analytics & Autonomous Safety Interlocks**

---

## 🌟 Executive Summary

This project delivers a responsive **Industrial SCADA/IoT Digital Twin Dashboard** for a tabletop dual-roller mini conveyor belt system. The system monitors critical operational telemetry, renders a synchronized digital twin (both 3D WebGL tabletop model and 2D CAD engineering schematic), executes automatic safety cutoffs for thermal runaway and vibration anomalies, and maintains an auditable event log.

The architecture is built for **immediate demonstration** in standalone simulation mode, with full readiness to ingest real ESP32 microcontroller telemetry via REST API, WebSockets, or MQTT.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or v20+ / v22+
- **npm** v9+

### 2. Run the Development Server
```bash
# In the project root directory
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in any modern browser.

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 🖥️ System Architecture & SCADA Design

```
+-------------------------------------------------------------------------+
|                        CONVEYOR DIGITAL TWIN UI                         |
|   (React 18 + TypeScript + Three.js WebGL + Tailwind CSS + Recharts)    |
+------------------------------------+------------------------------------+
                                     |
               HTTP REST / WebSocket | (Automatic Simulation Fallback)
                                     v
+------------------------------------+------------------------------------+
|                      BACKEND / MQTT BROKER                              |
|           Topics: conveyor/telemetry, conveyor/alerts, cmd/ack          |
+------------------------------------+------------------------------------+
                                     | WiFi 802.11 b/g/n
                                     v
+-------------------------------------------------------------------------+
|                  ESP32 HARDWARE NODE (FreeRTOS Dual-Core)               |
|                                                                         |
|  [Core 0: Networking]                     [Core 1: Safety & DSP Engine] |
|  - WiFi & MQTT Client                     - 1 kHz Accelerometer Read    |
|  - REST Server (/api/status)              - DSP RMS Vibration Calc      |
|  - Async Command Ack                      - DS18B20 1-Wire Thermal Loop |
|                                           - Hardware Emergency Trip     |
+--------------------+---------------------------------+------------------+
                     |                                 |
                     v                                 v
   +---------------------------------+   +-----------------------------+
   |             SENSORS             |   |         ACTUATORS           |
   | - DS18B20 Temp Probe (GPIO 4)   |   | - L298N H-Bridge Driver     |
   | - MPU-6050 Vibration (I2C 21/22)|   | - 12V DC Planetary Motor    |
   | - HC-SR04 Ultrasonic (GPIO 18/19|   | - E-Stop Emergency Guard    |
   +---------------------------------+   +-----------------------------+
```

---

## 📊 Core Features

### 1. Premium SCADA Visual Design
- Industrial dark charcoal palette (`#080c14`, `#0f172a`), slate panels, cyan accents, amber warning indicators, and red critical trip alarms.
- High-contrast typography featuring **Chakra Petch** and **JetBrains Mono**.
- Real-time millisecond-precision SCADA clock and system heartbeat.
- Optional Web Audio API industrial audio buzzer and chirp feedback.

### 2. Main Telemetry Cards
- **Motor Temperature (°C)**: DS18B20 probe reading, trend direction, dynamic sparkline, warning threshold at 45°C, trip limit at 58°C.
- **Vibration RMS (g RMS)**: MPU-6050 6-DOF IMU reading, bearing condition indicator, trip cutoff at 1.20g RMS.
- **Ultrasonic Distance (cm)**: HC-SR04 time-of-flight sensor, item detection beam trigger (≤ 9.0cm).
- **Conveyor Drive**: Motor state (`RUNNING`, `STOPPED`, `FAULT`), speed in RPM, current draw in Amperes, direction indicator.

### 3. Dual Digital Twin Visualization
- **Interactive 3D WebGL Model (Three.js)**:
  - Tabletop aluminum extrusion frame with mounting feet.
  - Head drive roller and tail idler roller physically rotating when running.
  - Continuous black conveyor belt with dynamic moving rubber texture.
  - Moving cardboard parcel box traversing the belt.
  - Visual sensor hardware: HC-SR04 arched bridge with dynamic pulsing sonar cone, MPU-6050 sensor block on bearing pillow block, DS18B20 thermal probe on motor casing, and ESP32 enclosure with blinking status LEDs.
  - Interactive mouse drag rotation and scroll zoom.
- **2D CAD SCADA Schematic**:
  - Millimeter dimensions (500mm length, 120mm width, 28mm roller diameter).
  - Animated belt hashes, sonar beam coverage zone, and live pinout markers.

### 4. Rolling Telemetry Charts
- Separate Recharts line charts for Temperature, Vibration, and Ultrasonic Distance.
- Configurable rolling history window (30s / 60s).
- Dynamic reference lines showing warning and critical cutoff thresholds.
- Live minimum, average, and peak statistics badges.

### 5. Configurable Controls & Fault Injection Suite
- **Conveyor Start / Stop** with safety interlock validation.
- **Emergency Stop (E-Stop)** hard cutoff button.
- **System Reset** to restore nominal parameters.
- **Demonstration Fault Injections for Viva Evaluators**:
  - `Overheat Motor`: Simulates thermal runaway up to 70°C, triggering an immediate trip.
  - `Bearing Imbalance`: Spikes vibration to 1.4g RMS, triggering bearing protection cutoff.
  - `Sensor Offline`: Simulates ultrasonic connection loss / timeout.
  - `Trigger Sonar Beam`: Advances package into the sensor path.
- **Configurable Threshold Sliders**: Real-time calibration of temperature warning/cutoff and vibration limits.

### 6. Audit Alert & Event Log
- Records events with timestamp, severity (`NORMAL`, `WARNING`, `CRITICAL`), sensor type, measured value, threshold, and description.
- Acknowledge individual or all alerts (acknowledgement silences UI alarms without bypassing motor safety trips).
- Export log as JSON for lab submission and project reports.

---

## 🔌 ESP32 Hardware Wiring Reference

| Sensor / Component | Module | ESP32 Pin | Interface / Notes |
|---|---|---|---|
| **Head Temp Sensor (Drive End)** | DS18B20 #1 | GPIO 4 | One-Wire bus (requires 4.7kΩ pull-up to 3.3V) |
| **Tail Temp Sensor (Idler End)** | DS18B20 #2 | GPIO 4 | Shared One-Wire multi-drop (unique 64-bit ROM ID) |
| **Vibration Sensor (SDA)** | MPU-6050 | GPIO 21 | I2C Data bus |
| **Vibration Sensor (SCL)** | MPU-6050 | GPIO 22 | I2C Clock bus |
| **Ultrasonic Trigger** | HC-SR04 | GPIO 18 | 10µs digital trigger pulse |
| **Ultrasonic Echo** | HC-SR04 | GPIO 19 | 5V to 3.3V voltage divider (1kΩ / 2kΩ) |
| **Motor Driver IN1** | L298N | GPIO 14 | Digital Direction Pin A |
| **Motor Driver IN2** | L298N | GPIO 27 | Digital Direction Pin B |
| **Motor Driver ENA (PWM)** | L298N | GPIO 12 | 20 kHz PWM speed control |
| **Emergency Stop Button** | NC Pushbutton | GPIO 34 | Hardware interrupt line (active LOW) |

---

## 📡 Telemetry Data Model

```json
{
  "device_id": "ESP32_CONVEYOR_NODE_01",
  "timestamp": 1791912000000,
  "temperature_c": 34.2,
  "vibration_rms_g": 0.32,
  "ultrasonic_distance_cm": 24.5,
  "object_detected": false,
  "motor_state": "RUNNING",
  "motor_speed_rpm": 180,
  "motor_current_a": 1.15
}
```

### Supported API Endpoints
- `GET /api/status` — Returns instantaneous node telemetry and motor state.
- `GET /api/history` — Returns 60-second rolling buffer for charts.
- `GET /api/alerts` — Returns active alarms and audit trail.
- `WebSocket /ws` — 10 Hz bidirectional telemetry streaming channel.

*If these endpoints are unavailable, the dashboard automatically operates in **DEMO SIMULATION MODE** with zero broken states.*

---

## 🛡️ Industrial Safety Philosophy

In mission-critical industrial automation, web dashboards and cloud brokers must **never** be responsible for emergency cutoffs.
1. **Local Firmware Autonomy**: The ESP32 firmware independently monitors sensor thresholds on FreeRTOS Core 1. If a critical temperature or vibration limit is breached, the microcontroller immediately de-energizes the motor driver at the hardware level.
2. **Command Acknowledgement (ACK)**: Web control actions (`Start`, `Stop`) issue requests that are only reflected as running after confirmation from the hardware node (`REMOTE_ESP32_ACK`).

---

## 🎓 Viva Demonstration Walkthrough

1. **Nominal State**: Show the live 3D conveyor model running with rollers turning, belt texture translating, and boxes traversing smoothly.
2. **Ultrasonic Item Detection**: Watch the package pass under the arched ultrasonic sensor. Notice distance drop from 24.5cm to ~6.5cm, beam pulsing emerald, and item count incrementing.
3. **Thermal Runaway Demonstration**: Click **"Overheat Motor"**. Watch temperature rise on the card and chart. At 45°C, an amber warning triggers. At 58°C, an automatic **HIGH TEMPERATURE CUTOFF** trips the motor, stops the belt, changes lighting to red, and logs a critical event.
4. **Safety Reset**: Demonstrate that the operator must acknowledge the condition and click **"Reset Demo"** to re-arm the motor.
5. **Specification Review**: Click **"ESP32 Specs"** in the top bar to walk the evaluators through pinouts, FreeRTOS dual-core tasking, and MQTT protocol design.
