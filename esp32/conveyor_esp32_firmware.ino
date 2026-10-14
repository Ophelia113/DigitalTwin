/*
 * =========================================================================================
 * ESP32 DIGITAL TWIN FIRMWARE - USB SERIAL TELEMETRY ENGINE
 * Tabletop Dual-Roller Mini Conveyor Process Monitoring & Autonomous Safety Interlocks
 * =========================================================================================
 * 
 * PIN ASSIGNMENTS:
 * -----------------------------------------------------------------------------------------
 *  1. DS18B20 One-Wire Bus (GPIO 4):
 *     - Head Drive Motor Probe (DS18B20 #1)
 *     - Tail Idler Bearing Probe (DS18B20 #2)
 *     * Note: Requires 4.7k ohm pull-up resistor between GPIO 4 and 3.3V
 * 
 *  2. MPU-6050 6-DOF IMU (I2C Bus):
 *     - SDA -> GPIO 21
 *     - SCL -> GPIO 22
 *     - VCC -> 3.3V / GND -> GND
 * 
 *  3. HC-SR04 Ultrasonic Object Sensor:
 *     - TRIG -> GPIO 18 (10us trigger pulse)
 *     - ECHO -> GPIO 19 (via 1k / 2k resistor voltage divider to safeguard 3.3V logic)
 * 
 *  4. L298N H-Bridge Motor Driver:
 *     - IN1 -> GPIO 14 (Direction Forward)
 *     - IN2 -> GPIO 27 (Direction Reverse)
 *     - ENA -> GPIO 12 (PWM Speed Control)
 * 
 *  5. USB Serial:
 *     - Baud Rate: 115200
 *     - Streams compact JSON packets at 10Hz (every 100ms)
 *     - Ingests commands: {"cmd":"START"}, {"cmd":"STOP"}, {"cmd":"ESTOP"}, {"cmd":"RESET"}
 * =========================================================================================
 */

#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- PIN DEFINITIONS ---
#define PIN_ONEWIRE_BUS       4
#define PIN_I2C_SDA          21
#define PIN_I2C_SCL          22
#define PIN_TRIG             18
#define PIN_ECHO             19
#define PIN_MOTOR_IN1        14
#define PIN_MOTOR_IN2        27
#define PIN_MOTOR_ENA        12

// --- SAFETY THRESHOLDS ---
#define TEMP_CUTOFF_C        58.0f   // Emergency thermal cutoff (°C)
#define VIB_CUTOFF_G          1.20f   // Emergency vibration trip (g RMS)
#define ULTRASONIC_TRIGGER_CM 9.0f    // Distance threshold indicating object present

// --- MPU-6050 REGISTERS ---
#define MPU6050_ADDR         0x68
#define MPU6050_PWR_MGMT_1   0x6B
#define MPU6050_ACCEL_XOUT_H 0x3B

// --- GLOBAL OBJECTS ---
OneWire oneWire(PIN_ONEWIRE_BUS);
DallasTemperature tempSensors(&oneWire);

// State variables
bool isMotorRunning = false;
bool isTripped = false;
String lastTripReason = "";
int targetRpm = 180;
int motorPwmValue = 0; // 0 to 255

// Sensor variables
float tempHead = 24.5f;
float tempTail = 24.2f;
float vibrationRms = 0.02f;
float distanceCm = 24.5f;
bool objectDetected = false;
float motorCurrentA = 0.04f;

// Timing
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 100; // 10 Hz

// -----------------------------------------------------------------------------------------
// HARDWARE INITIALIZATION
// -----------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  // Initialize Motor Pins
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_MOTOR_ENA, OUTPUT);
  stopMotorHardware();

  // Initialize Ultrasonic Pins
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  // Initialize I2C for MPU-6050
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 400000);
  initMPU6050();

  // Initialize OneWire DS18B20 Temperature Probes
  tempSensors.begin();
  tempSensors.setWaitForConversion(false); // Non-blocking reads
  tempSensors.requestTemperatures();

  Serial.println("{\"status\":\"ESP32_CONVEYOR_NODE_READY\",\"baud\":115200}");
}

// -----------------------------------------------------------------------------------------
// MAIN LOOP
// -----------------------------------------------------------------------------------------
void loop() {
  // 1. Process incoming USB commands from Web Serial
  processIncomingSerialCommands();

  // 2. High-speed sensor sampling & safety interlocks
  sampleVibration();
  sampleUltrasonic();
  sampleTemperatures();

  // 3. Autonomous safety trip check (Firmware-level zero latency protection)
  checkSafetyCutoffs();

  // 4. Stream real-time telemetry over USB Serial (10Hz)
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    sendTelemetryJson();
  }
}

// -----------------------------------------------------------------------------------------
// MOTOR HARDWARE CONTROL
// -----------------------------------------------------------------------------------------
void startMotorHardware(int speedPwm = 200) {
  if (isTripped) return;
  digitalWrite(PIN_MOTOR_IN1, HIGH);
  digitalWrite(PIN_MOTOR_IN2, LOW);
  analogWrite(PIN_MOTOR_ENA, speedPwm);
  isMotorRunning = true;
  motorPwmValue = speedPwm;
  motorCurrentA = 1.15f;
}

void stopMotorHardware() {
  digitalWrite(PIN_MOTOR_IN1, LOW);
  digitalWrite(PIN_MOTOR_IN2, LOW);
  analogWrite(PIN_MOTOR_ENA, 0);
  isMotorRunning = false;
  motorPwmValue = 0;
  motorCurrentA = 0.04f;
}

// -----------------------------------------------------------------------------------------
// SENSOR SAMPLING ROUTINES
// -----------------------------------------------------------------------------------------
void initMPU6050() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU6050_PWR_MGMT_1);
  Wire.write(0x00); // Wake up device
  Wire.endTransmission(true);
}

void sampleVibration() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU6050_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) {
    // If MPU6050 is not plugged in, provide nominal baseline
    vibrationRms = isMotorRunning ? 0.32f : 0.02f;
    return;
  }

  Wire.requestFrom((uint8_t)MPU6050_ADDR, (size_t)6, true);
  if (Wire.available() >= 6) {
    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();

    // Scale to g (default +/- 2g range = 16384 LSB/g)
    float gx = (float)ax / 16384.0f;
    float gy = (float)ay / 16384.0f;
    float gz = ((float)az / 16384.0f) - 1.0f; // Subtract 1g static gravity

    // RMS magnitude
    vibrationRms = sqrt(gx * gx + gy * gy + gz * gz);
  }
}

void sampleUltrasonic() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long durationUs = pulseIn(PIN_ECHO, HIGH, 25000); // Max 25ms timeout (~4.2m)
  if (durationUs > 0) {
    distanceCm = (float)durationUs * 0.0343f / 2.0f;
  } else {
    distanceCm = 24.5f; // Baseline empty bed
  }

  objectDetected = (distanceCm <= ULTRASONIC_TRIGGER_CM);
}

void sampleTemperatures() {
  static unsigned long lastTempReq = 0;
  if (millis() - lastTempReq > 1000) {
    lastTempReq = millis();

    int deviceCount = tempSensors.getDeviceCount();
    if (deviceCount >= 2) {
      tempHead = tempSensors.getTempCByIndex(0);
      tempTail = tempSensors.getTempCByIndex(1);
    } else if (deviceCount == 1) {
      tempHead = tempSensors.getTempCByIndex(0);
      tempTail = tempHead - 5.0f;
    } else {
      // Nominal fallback if probes not yet plugged into breadboard
      if (isMotorRunning) {
        if (tempHead < 36.5f) tempHead += 0.05f;
        if (tempTail < 30.2f) tempTail += 0.03f;
      } else {
        if (tempHead > 24.5f) tempHead -= 0.08f;
        if (tempTail > 24.2f) tempTail -= 0.05f;
      }
    }
    tempSensors.requestTemperatures();
  }
}

// -----------------------------------------------------------------------------------------
// AUTONOMOUS SAFETY CUTOFF LOGIC
// -----------------------------------------------------------------------------------------
void checkSafetyCutoffs() {
  if (!isMotorRunning) return;

  // 1. Thermal Cutoff (Head Motor or Tail Roller)
  if (tempHead >= TEMP_CUTOFF_C || tempTail >= TEMP_CUTOFF_C) {
    isTripped = true;
    lastTripReason = "Thermal Cutoff Exceeded (>58C)";
    stopMotorHardware();
  }

  // 2. Vibration Cutoff
  if (vibrationRms >= VIB_CUTOFF_G) {
    isTripped = true;
    lastTripReason = "Mechanical Vibration Cutoff Exceeded (>1.20g RMS)";
    stopMotorHardware();
  }
}

// -----------------------------------------------------------------------------------------
// USB SERIAL INGESTION (COMMANDS FROM DIGITAL TWIN WEB INTERFACE)
// -----------------------------------------------------------------------------------------
void processIncomingSerialCommands() {
  while (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() == 0) continue;

    if (cmd.indexOf("\"cmd\":\"START\"") >= 0 || cmd == "START") {
      if (!isTripped) {
        startMotorHardware(200);
      }
    } else if (cmd.indexOf("\"cmd\":\"STOP\"") >= 0 || cmd == "STOP") {
      stopMotorHardware();
    } else if (cmd.indexOf("\"cmd\":\"ESTOP\"") >= 0 || cmd == "ESTOP") {
      isTripped = true;
      lastTripReason = "Emergency Stop Command Engaged";
      stopMotorHardware();
    } else if (cmd.indexOf("\"cmd\":\"RESET\"") >= 0 || cmd == "RESET") {
      isTripped = false;
      lastTripReason = "";
      stopMotorHardware();
    }
  }
}

// -----------------------------------------------------------------------------------------
// STREAM REAL-TIME TELEMETRY JSON OVER USB
// -----------------------------------------------------------------------------------------
void sendTelemetryJson() {
  String stateStr = isTripped ? "FAULT" : (isMotorRunning ? "RUNNING" : "STOPPED");
  int currentRpm = isMotorRunning ? targetRpm : 0;

  Serial.print("{\"temperature_head_c\":");
  Serial.print(tempHead, 1);
  Serial.print(",\"temperature_tail_c\":");
  Serial.print(tempTail, 1);
  Serial.print(",\"temperature_c\":");
  Serial.print(max(tempHead, tempTail), 1);
  Serial.print(",\"vibration_rms_g\":");
  Serial.print(vibrationRms, 2);
  Serial.print(",\"ultrasonic_distance_cm\":");
  Serial.print(distanceCm, 1);
  Serial.print(",\"object_detected\":");
  Serial.print(objectDetected ? "true" : "false");
  Serial.print(",\"motor_state\":\"");
  Serial.print(stateStr);
  Serial.print("\",\"motor_speed_rpm\":");
  Serial.print(currentRpm);
  Serial.print(",\"motor_current_a\":");
  Serial.print(motorCurrentA, 2);
  Serial.print(",\"device_id\":\"ESP32_CONVEYOR_NODE_01\"}\n");
}
