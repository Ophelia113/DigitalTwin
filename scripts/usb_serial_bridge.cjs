/**
 * USB SERIAL TO WEBSOCKET BRIDGE SCRIPT
 * 
 * If you are using a browser that does not support the Web Serial API (like Mozilla Firefox),
 * you can run this lightweight Node.js bridge to read the ESP32 COM port and forward telemetry
 * packets to the web dashboard via WebSocket!
 * 
 * Usage:
 *   1. Install dependencies:
 *      npm install serialport @serialport/parser-readline ws
 *   2. Run the bridge:
 *      node scripts/usb_serial_bridge.cjs COM3
 *      (Replace COM3 with your ESP32 port, e.g. COM4, COM5, or /dev/ttyUSB0 on Linux)
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');

const portName = process.argv[2] || 'COM3';
const baudRate = 115200;
const WS_PORT = 8080;

console.log(`=======================================================`);
console.log(` ESP32 USB SERIAL -> WEBSOCKET BRIDGE`);
console.log(` Port: ${portName} @ ${baudRate} baud`);
console.log(` WebSocket Server: ws://localhost:${WS_PORT}`);
console.log(`=======================================================`);

// Start WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('[WebSocket] Web Dashboard client connected!');
  clients.add(ws);

  ws.on('message', (msg) => {
    // Forward command from web dashboard to ESP32 serial
    if (serial && serial.isOpen) {
      serial.write(msg.toString() + '\n');
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WebSocket] Web Dashboard client disconnected.');
  });
});

// Open Serial Port
const serial = new SerialPort({
  path: portName,
  baudRate: baudRate,
  autoOpen: true,
}, (err) => {
  if (err) {
    console.error(`[Serial Error] Failed to open ${portName}:`, err.message);
    console.log(`Tip: Run "Get-CimInstance Win32_SerialPort" in PowerShell to see your active COM ports.`);
  } else {
    console.log(`[Serial] Successfully opened ${portName}! Waiting for telemetry...`);
  }
});

const parser = serial.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  // Broadcast to all connected web dashboard clients
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(trimmed);
    }
  }
});
