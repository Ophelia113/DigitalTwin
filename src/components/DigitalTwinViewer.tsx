import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Thermometer,
  Waves,
  Ruler,
  Play,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Cpu,
  Info
} from 'lucide-react';
import { TelemetryPoint, ThresholdConfig, MotorState } from '../types/telemetry';

interface DigitalTwinViewerProps {
  current: TelemetryPoint | null;
  thresholds: ThresholdConfig;
  boxProgress: number;
  motorState: MotorState;
  onStartConveyor?: () => void;
}

interface SensorCallout {
  id: string;
  num: number;
  name: string;
  shortName: string;
  hardware: string;
  location: string;
  gpio: string;
  colorHex: string;
  colorBorder: string;
  colorBg: string;
  worldPos: THREE.Vector3;
  anchorPos: THREE.Vector3;
}

export const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({
  current,
  thresholds,
  boxProgress,
  motorState,
  onStartConveyor,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'3D' | 'CAD'>('3D');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  // Screen positions for projected 3D floating callouts
  const [calloutCoords, setCalloutCoords] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

  const isHeadTempCrit = current ? current.temperature_head_c >= thresholds.temp_cutoff_c : false;
  const isHeadTempWarn = current ? !isHeadTempCrit && current.temperature_head_c >= thresholds.temp_warning_c : false;
  const isTailTempCrit = current ? current.temperature_tail_c >= thresholds.temp_cutoff_c : false;
  const isTailTempWarn = current ? !isTailTempCrit && current.temperature_tail_c >= thresholds.temp_warning_c : false;
  const isVibCritical = current ? current.vibration_rms_g >= thresholds.vib_cutoff_g : false;
  const isVibWarn = current ? !isVibCritical && current.vibration_rms_g >= thresholds.vib_warning_g : false;
  const isObjectDetected = current ? (current.object_detected || current.ultrasonic_distance_cm <= thresholds.ultrasonic_trigger_cm) : false;

  const isCritical = motorState === 'FAULT' || isHeadTempCrit || isTailTempCrit || isVibCritical;

  // Sensor definitions with exact physical coordinates in the 3D model
  const sensorDefs: SensorCallout[] = useMemo(() => [
    {
      id: 'head_temp',
      num: 1,
      name: 'DS18B20 Head Temp Sensor',
      shortName: 'Head Temp',
      hardware: 'DS18B20 Digital Probe',
      location: 'Drive Motor Casing (Head X=0mm)',
      gpio: 'GPIO 4 (1-Wire Bus)',
      colorHex: '#06b6d4',
      colorBorder: 'border-cyan-500/70',
      colorBg: 'bg-cyan-950/80',
      worldPos: new THREE.Vector3(-1.9, 1.45, -0.72),
      anchorPos: new THREE.Vector3(-1.9, 0.78, -0.72),
    },
    {
      id: 'vibration',
      num: 2,
      name: 'MPU-6050 Vibration Sensor',
      shortName: 'Vibration',
      hardware: 'MPU-6050 6-Axis IMU',
      location: 'Frame Pillow Block (X=120mm)',
      gpio: 'GPIO 21/22 (I2C Bus)',
      colorHex: '#a855f7',
      colorBorder: 'border-purple-500/70',
      colorBg: 'bg-purple-950/80',
      worldPos: new THREE.Vector3(-1.1, 1.35, 0.46),
      anchorPos: new THREE.Vector3(-1.1, 0.62, 0.46),
    },
    {
      id: 'ultrasonic',
      num: 3,
      name: 'HC-SR04 Ultrasonic Sonar',
      shortName: 'Object Sonar',
      hardware: 'HC-SR04 Transceiver',
      location: 'Overhead Gantry Arch (X=250mm)',
      gpio: 'GPIO 18/19 (Trig/Echo)',
      colorHex: '#10b981',
      colorBorder: 'border-emerald-500/70',
      colorBg: 'bg-emerald-950/80',
      worldPos: new THREE.Vector3(0.2, 1.75, 0.0),
      anchorPos: new THREE.Vector3(0.2, 1.15, 0.0),
    },
    {
      id: 'tail_temp',
      num: 4,
      name: 'DS18B20 Tail Temp Sensor',
      shortName: 'Roller Temp',
      hardware: 'DS18B20 Digital Probe',
      location: 'Tail Idler Bearing (X=500mm)',
      gpio: 'GPIO 4 (1-Wire Multi-Drop)',
      colorHex: '#f97316',
      colorBorder: 'border-orange-500/70',
      colorBg: 'bg-orange-950/80',
      worldPos: new THREE.Vector3(1.9, 1.45, 0.46),
      anchorPos: new THREE.Vector3(1.9, 0.68, 0.46),
    },
  ], []);

  // 3D Scene setup and render loop
  useEffect(() => {
    if (activeTab !== '3D') return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 390;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b16);
    scene.fog = new THREE.FogExp2(0x070b16, 0.032);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.2, 3.4, 4.8);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe2f1ff, 1.6);
    dirLight.position.set(6, 9, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const statusLight = new THREE.PointLight(0x06b6d4, 1.5, 9);
    statusLight.position.set(0, 2.5, 0);
    scene.add(statusLight);

    // 3. Grid & Tabletop Platform
    const gridHelper = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const tableMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.1, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.85, metalness: 0.25 })
    );
    tableMesh.position.y = -0.06;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // 4. Conveyor Assembly
    const conveyorGroup = new THREE.Group();
    scene.add(conveyorGroup);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.85 });

    const railGeo = new THREE.BoxGeometry(4.4, 0.16, 0.08);
    const frontRail = new THREE.Mesh(railGeo, railMat);
    frontRail.position.set(0, 0.55, 0.45);
    frontRail.castShadow = true;
    conveyorGroup.add(frontRail);

    const backRail = new THREE.Mesh(railGeo, railMat);
    backRail.position.set(0, 0.55, -0.45);
    backRail.castShadow = true;
    conveyorGroup.add(backRail);

    const bedMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.04, 0.82),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.6 })
    );
    bedMesh.position.set(0, 0.52, 0);
    conveyorGroup.add(bedMesh);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.55, 0.1);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.3 });
    [[-1.8, 0.275, 0.42], [1.8, 0.275, 0.42], [-1.8, 0.275, -0.42], [1.8, 0.275, -0.42]].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      conveyorGroup.add(leg);
    });

    // Rollers
    const rollerGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.86, 32);
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.25 });

    const headRoller = new THREE.Mesh(rollerGeo, rollerMat);
    headRoller.rotation.x = Math.PI / 2;
    headRoller.position.set(-1.9, 0.54, 0);
    conveyorGroup.add(headRoller);

    const tailRoller = new THREE.Mesh(rollerGeo, rollerMat);
    tailRoller.rotation.x = Math.PI / 2;
    tailRoller.position.set(1.9, 0.54, 0);
    conveyorGroup.add(tailRoller);

    // Belt
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#161920';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#232834';
    for (let i = 0; i < 128; i += 16) {
      ctx.fillRect(i, 0, 8, 128);
    }
    const beltTexture = new THREE.CanvasTexture(canvas);
    beltTexture.wrapS = THREE.RepeatWrapping;
    beltTexture.wrapT = THREE.RepeatWrapping;
    beltTexture.repeat.set(6, 1);

    const beltMat = new THREE.MeshStandardMaterial({
      map: beltTexture,
      roughness: 0.9,
      metalness: 0.1,
    });

    const beltTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.02, 0.84), beltMat);
    beltTop.position.set(0, 0.72, 0);
    conveyorGroup.add(beltTop);

    const beltBottom = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.02, 0.84), beltMat);
    beltBottom.position.set(0, 0.36, 0);
    conveyorGroup.add(beltBottom);

    // Motor Housing
    const motorGroup = new THREE.Group();
    motorGroup.position.set(-1.9, 0.54, -0.72);
    const motorCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.52, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
    );
    motorCylinder.rotation.x = Math.PI / 2;
    motorGroup.add(motorCylinder);

    const gearbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.36, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
    );
    gearbox.position.z = 0.25;
    motorGroup.add(gearbox);
    conveyorGroup.add(motorGroup);

    // ==========================================
    // DETAILED PHYSICAL SENSORS WITH CLEAR MARKERS
    // ==========================================

    // Helper: Build a glowing 3D beacon pole & ground target ring
    const createSensorMarkerBeacons = (anchorX: number, anchorY: number, anchorZ: number, topY: number, colorHex: number) => {
      const group = new THREE.Group();

      // Ground Target Ring
      const ringGeo = new THREE.RingGeometry(0.18, 0.26, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55
      });
      const groundRing = new THREE.Mesh(ringGeo, ringMat);
      groundRing.rotation.x = -Math.PI / 2;
      groundRing.position.set(anchorX, 0.01, anchorZ);
      group.add(groundRing);

      // Inner pulsating ground dot
      const dotGeo = new THREE.CircleGeometry(0.08, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const groundDot = new THREE.Mesh(dotGeo, dotMat);
      groundDot.rotation.x = -Math.PI / 2;
      groundDot.position.set(anchorX, 0.012, anchorZ);
      group.add(groundDot);

      // Vertical Stalk Line
      const stalkHeight = topY - anchorY;
      const stalkGeo = new THREE.CylinderGeometry(0.012, 0.012, stalkHeight, 8);
      const stalkMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.75
      });
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.set(anchorX, anchorY + stalkHeight / 2, anchorZ);
      group.add(stalk);

      // Floating Beacon Sphere at Top
      const beaconSphereGeo = new THREE.SphereGeometry(0.075, 16, 16);
      const beaconSphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const beaconSphere = new THREE.Mesh(beaconSphereGeo, beaconSphereMat);
      beaconSphere.position.set(anchorX, topY, anchorZ);
      group.add(beaconSphere);

      // Glowing Aura Ring around Beacon Sphere
      const beaconRingGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 24);
      const beaconRingMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.65
      });
      const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
      beaconRing.rotation.x = Math.PI / 2;
      beaconRing.position.set(anchorX, topY, anchorZ);
      group.add(beaconRing);

      return { group, beaconSphere, beaconRing, groundRing, groundDot };
    };

    // --- SENSOR 1: MOTOR TEMPERATURE SENSOR (HEAD END) ---
    // Physical location: Motor Housing X = -1.9, Y = 0.78, Z = -0.72
    const tempHeadGroup = new THREE.Group();
    tempHeadGroup.position.set(-1.9, 0.78, -0.72);

    // Metallic clamp bracket
    const probeBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
    );
    tempHeadGroup.add(probeBracket);

    // Stainless steel probe tube
    const tempHeadProbe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.24, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.15 })
    );
    tempHeadProbe.rotation.z = Math.PI / 4;
    tempHeadProbe.position.set(-0.06, 0.06, 0);
    tempHeadGroup.add(tempHeadProbe);

    // Sensor status LED
    const tempHeadLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    tempHeadLed.position.set(-0.14, 0.14, 0);
    tempHeadGroup.add(tempHeadLed);

    conveyorGroup.add(tempHeadGroup);
    const headMarker = createSensorMarkerBeacons(-1.9, 0.78, -0.72, 1.45, 0x06b6d4);
    conveyorGroup.add(headMarker.group);

    // --- SENSOR 2: VIBRATION SENSOR (MPU-6050 IMU) ---
    // Physical location: Conveyor Rail Frame X = -1.1, Y = 0.62, Z = 0.46
    const vibSensorGroup = new THREE.Group();
    vibSensorGroup.position.set(-1.1, 0.62, 0.46);

    // Mounting pillow adapter on aluminum rail
    const vibAdapter = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.05, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    vibAdapter.position.y = -0.025;
    vibSensorGroup.add(vibAdapter);

    // Signature MPU-6050 Blue PCB
    const vibPcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.035, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5, metalness: 0.2 })
    );
    vibPcb.position.y = 0.02;
    vibSensorGroup.add(vibPcb);

    // Central MPU-6050 IC chip (black epoxy package)
    const vibChip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.025, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 })
    );
    vibChip.position.set(0, 0.045, 0);
    vibSensorGroup.add(vibChip);

    // Pin header row (gold plated)
    const vibPins = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.03, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.2 })
    );
    vibPins.position.set(0, 0.04, 0.08);
    vibSensorGroup.add(vibPins);

    // Status LED
    const vibLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    vibLed.position.set(-0.08, 0.05, -0.06);
    vibSensorGroup.add(vibLed);

    // Concentric vibration visualizer wave ring
    const vibWaveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.18, 24),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    vibWaveRing.rotation.x = -Math.PI / 2;
    vibWaveRing.position.set(0, 0.06, 0);
    vibSensorGroup.add(vibWaveRing);

    conveyorGroup.add(vibSensorGroup);
    const vibMarker = createSensorMarkerBeacons(-1.1, 0.62, 0.46, 1.35, 0xa855f7);
    conveyorGroup.add(vibMarker.group);

    // --- SENSOR 3: ULTRASONIC OBJECT SENSOR (HC-SR04) ---
    // Physical location: Overhead Gantry Arch X = 0.2, Y = 1.15, Z = 0.0
    const archGroup = new THREE.Group();
    archGroup.position.set(0.2, 0.55, 0);

    // Gantry side pillars with hazard stripes
    const archPillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.68, 0.05), railMat);
    archPillar1.position.set(0, 0.34, 0.47);
    const archPillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.68, 0.05), railMat);
    archPillar2.position.set(0, 0.34, -0.47);
    const archCrossbar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.98), railMat);
    archCrossbar.position.set(0, 0.68, 0);
    archGroup.add(archPillar1, archPillar2, archCrossbar);

    // HC-SR04 Module Body (Blue PCB)
    const hcsr04Pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.14, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.3 })
    );
    hcsr04Pcb.position.set(0, 0.62, 0);
    archGroup.add(hcsr04Pcb);

    // Dual Silver Transducer Cylinders (Transmitter 'T' & Receiver 'R' eyes)
    const transducerGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.07, 24);
    const transducerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.2 });

    const txCylinder = new THREE.Mesh(transducerGeo, transducerMat);
    txCylinder.position.set(0, 0.56, 0.09);
    const rxCylinder = new THREE.Mesh(transducerGeo, transducerMat);
    rxCylinder.position.set(0, 0.56, -0.09);
    archGroup.add(txCylinder, rxCylinder);

    // Transducer front mesh faces
    const meshGeo = new THREE.CircleGeometry(0.046, 16);
    const meshMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const txMesh = new THREE.Mesh(meshGeo, meshMat);
    txMesh.rotation.x = Math.PI / 2;
    txMesh.position.set(0, 0.524, 0.09);
    const rxMesh = new THREE.Mesh(meshGeo, meshMat);
    rxMesh.rotation.x = Math.PI / 2;
    rxMesh.position.set(0, 0.524, -0.09);
    archGroup.add(txMesh, rxMesh);

    // Conical Sonar Pulse Beam
    const coneGeo = new THREE.ConeGeometry(0.38, 0.46, 20, 1, true);
    coneGeo.translate(0, -0.23, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const sonarBeam = new THREE.Mesh(coneGeo, coneMat);
    sonarBeam.position.set(0, 0.52, 0);
    archGroup.add(sonarBeam);

    // Arch Status LED
    const archLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    archLed.position.set(0, 0.74, 0);
    archGroup.add(archLed);

    conveyorGroup.add(archGroup);
    const archMarker = createSensorMarkerBeacons(0.2, 1.25, 0.0, 1.75, 0x10b981);
    conveyorGroup.add(archMarker.group);

    // --- SENSOR 4: ROLLER TEMPERATURE SENSOR (TAIL END) ---
    // Physical location: Tail Idler Bearing X = 1.9, Y = 0.68, Z = 0.46
    const tempTailGroup = new THREE.Group();
    tempTailGroup.position.set(1.9, 0.68, 0.46);

    // Bearing pillow block mount
    const tailPillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.2, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.25 })
    );
    tempTailGroup.add(tailPillow);

    // Stainless steel probe tube
    const tempTailProbe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.15 })
    );
    tempTailProbe.rotation.x = Math.PI / 2;
    tempTailProbe.position.set(0, 0.06, -0.06);
    tempTailGroup.add(tempTailProbe);

    // Status LED
    const tempTailLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    tempTailLed.position.set(0, 0.06, -0.16);
    tempTailGroup.add(tempTailLed);

    conveyorGroup.add(tempTailGroup);
    const tailMarker = createSensorMarkerBeacons(1.9, 0.68, 0.46, 1.45, 0xf97316);
    conveyorGroup.add(tailMarker.group);

    // --- MOVING CONVEYOR BOX ---
    const packageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.28, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85, metalness: 0.1 })
    );
    packageMesh.position.set(0, 0.88, 0);
    packageMesh.castShadow = true;
    scene.add(packageMesh);

    // --- INTERACTIVE MOUSE ROTATION & ZOOM ---
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = 0.75;
    let phi = 0.95;
    let radius = 6.8;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      theta -= (e.clientX - prevMouseX) * 0.008;
      phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, phi - (e.clientY - prevMouseY) * 0.008));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(3.0, Math.min(9.5, radius + e.deltaY * 0.005));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // Temp vector for coordinate projection
    const tempVec = new THREE.Vector3();
    let frameCount = 0;

    // --- ANIMATION LOOP ---
    let animId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      frameCount++;

      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0.55, 0);

      const isRunning = motorState === 'RUNNING';

      // 1. Conveyor Belt & Roller Physics
      if (isRunning) {
        headRoller.rotation.y += dt * 4;
        tailRoller.rotation.y += dt * 4;
        beltTexture.offset.x -= dt * 0.6;

        // Box position traversal
        const boxX = 1.7 - boxProgress * 3.4;
        packageMesh.position.x = boxX;
        packageMesh.visible = true;

        // Sonar Beam Detection Reaction
        const isUnderSensor = Math.abs(boxX - 0.2) < 0.26;
        if (isUnderSensor) {
          coneMat.color.setHex(0x10b981);
          coneMat.opacity = 0.6;
          sonarBeam.scale.set(1.15, 1.0, 1.15);
        } else {
          coneMat.color.setHex(0x06b6d4);
          coneMat.opacity = 0.2;
          sonarBeam.scale.set(1.0, 1.0, 1.0);
        }

        // Vibration pulse animation
        const vibScale = 1.0 + (current?.vibration_rms_g || 0.3) * Math.sin(time * 0.015) * 0.3;
        vibWaveRing.scale.set(vibScale, vibScale, 1);
      } else {
        // Stopped: Belt & Rollers stationary
        coneMat.opacity = 0.15;
        packageMesh.position.x = 1.7 - boxProgress * 3.4;
      }

      // 2. Beacon pulsation
      const pulse = 1.0 + Math.sin(time * 0.005) * 0.15;
      headMarker.beaconRing.scale.set(pulse, pulse, pulse);
      vibMarker.beaconRing.scale.set(pulse, pulse, pulse);
      archMarker.beaconRing.scale.set(pulse, pulse, pulse);
      tailMarker.beaconRing.scale.set(pulse, pulse, pulse);

      // 3. LED Status Colors
      if (isHeadTempCrit) {
        tempHeadLed.material.color.setHex(0xef4444);
        headMarker.beaconSphere.material.color.setHex(0xef4444);
      } else if (isHeadTempWarn) {
        tempHeadLed.material.color.setHex(0xf59e0b);
        headMarker.beaconSphere.material.color.setHex(0xf59e0b);
      } else {
        tempHeadLed.material.color.setHex(0x06b6d4);
        headMarker.beaconSphere.material.color.setHex(0x06b6d4);
      }

      if (isVibCritical) {
        vibLed.material.color.setHex(0xef4444);
        vibMarker.beaconSphere.material.color.setHex(0xef4444);
      } else if (isVibWarn) {
        vibLed.material.color.setHex(0xf59e0b);
        vibMarker.beaconSphere.material.color.setHex(0xf59e0b);
      } else {
        vibLed.material.color.setHex(0xa855f7);
        vibMarker.beaconSphere.material.color.setHex(0xa855f7);
      }

      if (isObjectDetected) {
        archLed.material.color.setHex(0x10b981);
        archMarker.beaconSphere.material.color.setHex(0x10b981);
      } else {
        archLed.material.color.setHex(0x06b6d4);
        archMarker.beaconSphere.material.color.setHex(0x06b6d4);
      }

      if (isTailTempCrit) {
        tempTailLed.material.color.setHex(0xef4444);
        tailMarker.beaconSphere.material.color.setHex(0xef4444);
      } else if (isTailTempWarn) {
        tempTailLed.material.color.setHex(0xf59e0b);
        tailMarker.beaconSphere.material.color.setHex(0xf59e0b);
      } else {
        tempTailLed.material.color.setHex(0xf97316);
        tailMarker.beaconSphere.material.color.setHex(0xf97316);
      }

      // 4. Critical Alarm Lighting
      if (isCritical) {
        statusLight.color.setHex(0xef4444);
        statusLight.intensity = 2.2;
      } else {
        statusLight.color.setHex(0x06b6d4);
        statusLight.intensity = 1.2;
      }

      // 5. Update Screen Projections for Floating Callout Badges
      if (frameCount % 2 === 0) {
        const coords: Record<string, { x: number; y: number; visible: boolean }> = {};
        sensorDefs.forEach((sensor) => {
          tempVec.copy(sensor.worldPos);
          tempVec.project(camera);

          // Convert to percentage coordinates inside the container
          const pctX = (tempVec.x * 0.5 + 0.5) * 100;
          const pctY = (-(tempVec.y * 0.5) + 0.5) * 100;
          const isFront = tempVec.z < 1.0;

          coords[sensor.id] = {
            x: pctX,
            y: pctY,
            visible: isFront && pctX >= 2 && pctX <= 98 && pctY >= 2 && pctY <= 96
          };
        });
        setCalloutCoords(coords);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 390;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      while (container.firstChild) container.removeChild(container.firstChild);
    };
  }, [activeTab, motorState, boxProgress, isCritical, isHeadTempCrit, isHeadTempWarn, isTailTempCrit, isTailTempWarn, isVibCritical, isVibWarn, isObjectDetected, sensorDefs]);

  // Helper to get formatted reading string for a sensor
  const getSensorReading = (id: string) => {
    if (!current) return '--';
    switch (id) {
      case 'head_temp':
        return `${current.temperature_head_c.toFixed(1)}°C`;
      case 'vibration':
        return `${current.vibration_rms_g.toFixed(2)} g`;
      case 'ultrasonic':
        return `${current.ultrasonic_distance_cm.toFixed(1)} cm`;
      case 'tail_temp':
        return `${current.temperature_tail_c.toFixed(1)}°C`;
      default:
        return '--';
    }
  };

  const getSensorStatusBadge = (id: string) => {
    if (!current) return { text: 'OFFLINE', color: 'bg-slate-800 text-slate-400' };
    switch (id) {
      case 'head_temp':
        if (isHeadTempCrit) return { text: 'CRITICAL', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' };
        if (isHeadTempWarn) return { text: 'WARM', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' };
        return { text: 'NORMAL', color: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' };
      case 'vibration':
        if (isVibCritical) return { text: 'HIGH SHAKE', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' };
        if (isVibWarn) return { text: 'VIBRATING', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' };
        return { text: 'SMOOTH', color: 'bg-purple-500/10 text-purple-300 border border-purple-500/30' };
      case 'ultrasonic':
        if (isObjectDetected) return { text: 'BOX DETECTED', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' };
        return { text: 'PATH CLEAR', color: 'bg-slate-800 text-slate-400 border border-slate-700' };
      case 'tail_temp':
        if (isTailTempCrit) return { text: 'CRITICAL', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' };
        if (isTailTempWarn) return { text: 'WARM', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' };
        return { text: 'NORMAL', color: 'bg-orange-500/10 text-orange-300 border border-orange-500/30' };
      default:
        return { text: 'OK', color: 'bg-slate-800 text-slate-400' };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col font-sans">
      {/* View Header with Dual-Mode Tabs and Sensor Marker Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('3D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === '3D'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Digital Twin</span>
            </button>
            <button
              onClick={() => setActiveTab('CAD')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === 'CAD'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>2D CAD Sensor Map</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            {activeTab === '3D' ? '(Drag to rotate • Scroll to zoom)' : '(500mm Tabletop Schematic)'}
          </span>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {activeTab === '3D' && (
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                showLabels
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle On-Screen Sensor Callout Labels"
            >
              {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Sensor Labels {showLabels ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-950 text-cyan-400 border border-slate-800">
            500mm Dual-Roller
          </span>
        </div>
      </div>

      {/* Main View Area (3D WebGL Canvas or 2D CAD Schematic) */}
      <div className="relative w-full h-[340px] sm:h-[390px] rounded-lg overflow-hidden bg-slate-950 border border-slate-800/80">
        {/* 1. 3D WebGL Canvas Container */}
        {activeTab === '3D' && (
          <>
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Standby Banner if Conveyor is Stopped */}
            {motorState === 'STOPPED' && (
              <div className="absolute top-3 left-3 right-3 z-10 p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/40 backdrop-blur-md flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2 text-xs text-amber-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>
                    <strong>SIMULATION IN STANDBY:</strong> Belt & motor are stopped. Press <strong>Start Conveyor</strong> to run.
                  </span>
                </div>
                {onStartConveyor && (
                  <button
                    onClick={onStartConveyor}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded shadow flex items-center gap-1 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Conveyor</span>
                  </button>
                )}
              </div>
            )}

            {/* 3D Projected Screen-Space Floating Sensor Callout Badges */}
            {showLabels && sensorDefs.map((sensor) => {
              const pos = calloutCoords[sensor.id];
              if (!pos || !pos.visible) return null;

              const isSelected = selectedSensorId === sensor.id;
              const status = getSensorStatusBadge(sensor.id);

              return (
                <div
                  key={sensor.id}
                  onClick={() => setSelectedSensorId(isSelected ? null : sensor.id)}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className={`absolute z-20 pointer-events-auto cursor-pointer transition-transform duration-100 ${
                    isSelected ? 'scale-105 ring-2 ring-cyan-400' : 'hover:scale-105'
                  }`}
                >
                  {/* Floating Pill Card */}
                  <div className={`px-2.5 py-1.5 rounded-lg backdrop-blur-md shadow-xl border ${sensor.colorBorder} ${sensor.colorBg} flex items-center gap-2 text-white font-mono`}>
                    {/* Sensor Number Dot */}
                    <span
                      style={{ backgroundColor: sensor.colorHex }}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shadow"
                    >
                      {sensor.num}
                    </span>

                    {/* Sensor Info */}
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-100">{sensor.shortName}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-300">
                        <span className="font-bold text-white text-xs">{getSensorReading(sensor.id)}</span>
                        <span className="text-slate-400 text-[9px]">• {sensor.location.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Leader Pointer Stem Line */}
                  <div className="flex flex-col items-center">
                    <div
                      style={{ backgroundColor: sensor.colorHex }}
                      className="w-0.5 h-3 opacity-80"
                    />
                    <div
                      style={{ backgroundColor: sensor.colorHex }}
                      className="w-2 h-2 rounded-full shadow-lg ring-2 ring-white/50 animate-ping"
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* 2. 2D CAD Engineering Schematic View */}
        {activeTab === 'CAD' && (
          <div className="w-full h-full p-4 flex flex-col justify-between overflow-y-auto font-mono text-slate-200">
            {/* CAD Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                <span>SCADA CAD BLUEPRINT: 500mm TABLETOP DUAL-ROLLER CONVEYOR</span>
              </span>
              <span className="text-[11px] text-slate-400">Scale: 1:1 Physical Geometry</span>
            </div>

            {/* Interactive SVG Diagram */}
            <div className="relative my-auto w-full max-w-2xl mx-auto py-2">
              <svg viewBox="0 0 700 220" className="w-full h-auto drop-shadow-lg">
                {/* Millimeter Scale Ruler at Bottom */}
                <line x1="80" y1="185" x2="620" y2="185" stroke="#475569" strokeWidth="2" />
                {[0, 100, 200, 300, 400, 500].map((mm, idx) => {
                  const x = 80 + idx * 108;
                  return (
                    <g key={mm}>
                      <line x1={x} y1="180" x2={x} y2="190" stroke="#94a3b8" strokeWidth="1.5" />
                      <text x={x} y="202" fill="#64748b" fontSize="10" textAnchor="middle">
                        {mm} mm
                      </text>
                    </g>
                  );
                })}

                {/* Frame Rails */}
                <rect x="70" y="70" width="560" height="36" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />

                {/* Conveyor Belt Loop */}
                <rect x="80" y="74" width="540" height="28" rx="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />

                {/* Head Roller (Drive End) */}
                <circle cx="94" cy="88" r="14" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="94" cy="88" r="4" fill="#06b6d4" />

                {/* Tail Roller (Idler End) */}
                <circle cx="606" cy="88" r="14" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="606" cy="88" r="4" fill="#f97316" />

                {/* Moving Parcel on CAD Belt */}
                <rect
                  x={600 - boxProgress * 480}
                  y="62"
                  width="44"
                  height="22"
                  rx="2"
                  fill="#d97706"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  className="transition-all duration-75"
                />

                {/* Sonar Beam Cone on CAD view */}
                <polygon
                  points="350,38 315,88 385,88"
                  fill={isObjectDetected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(6, 182, 212, 0.18)'}
                  stroke={isObjectDetected ? '#10b981' : '#06b6d4'}
                  strokeDasharray="3 3"
                />

                {/* SENSOR 1: Head Temp Marker (X=0mm) */}
                <g>
                  <circle cx="94" cy="40" r="10" fill="#083344" stroke="#06b6d4" strokeWidth="2" />
                  <text x="94" y="44" fill="#06b6d4" fontSize="11" fontWeight="bold" textAnchor="middle">1</text>
                  <line x1="94" y1="50" x2="94" y2="74" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="2 2" />
                </g>

                {/* SENSOR 2: Vibration Sensor Marker (X=120mm) */}
                <g>
                  <circle cx="210" cy="40" r="10" fill="#2e1065" stroke="#a855f7" strokeWidth="2" />
                  <text x="210" y="44" fill="#a855f7" fontSize="11" fontWeight="bold" textAnchor="middle">2</text>
                  <line x1="210" y1="50" x2="210" y2="74" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 2" />
                </g>

                {/* SENSOR 3: Ultrasonic Sonar Marker (X=250mm) */}
                <g>
                  <circle cx="350" cy="22" r="10" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                  <text x="350" y="26" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">3</text>
                  <line x1="350" y1="32" x2="350" y2="38" stroke="#10b981" strokeWidth="1.5" />
                </g>

                {/* SENSOR 4: Tail Temp Marker (X=500mm) */}
                <g>
                  <circle cx="606" cy="40" r="10" fill="#431407" stroke="#f97316" strokeWidth="2" />
                  <text x="606" y="44" fill="#f97316" fontSize="11" fontWeight="bold" textAnchor="middle">4</text>
                  <line x1="606" y1="50" x2="606" y2="74" stroke="#f97316" strokeWidth="1.5" strokeDasharray="2 2" />
                </g>
              </svg>
            </div>

            {/* CAD Wiring Pinout Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-cyan-500/30">
                <span className="text-cyan-400 font-bold block">① Head Motor Temp</span>
                <span className="text-slate-400">DS18B20 • GPIO 4</span>
                <div className="text-white font-bold mt-0.5">{current?.temperature_head_c.toFixed(1)} °C</div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-purple-500/30">
                <span className="text-purple-400 font-bold block">② Belt Vibration</span>
                <span className="text-slate-400">MPU6050 • GPIO 21/22</span>
                <div className="text-white font-bold mt-0.5">{current?.vibration_rms_g.toFixed(2)} g RMS</div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-emerald-500/30">
                <span className="text-emerald-400 font-bold block">③ Object Sensor</span>
                <span className="text-slate-400">HC-SR04 • GPIO 18/19</span>
                <div className="text-white font-bold mt-0.5">{current?.ultrasonic_distance_cm.toFixed(1)} cm</div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-orange-500/30">
                <span className="text-orange-400 font-bold block">④ Tail Roller Temp</span>
                <span className="text-slate-400">DS18B20 • GPIO 4 Multi</span>
                <div className="text-white font-bold mt-0.5">{current?.temperature_tail_c.toFixed(1)} °C</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Bottom Sensor Location Strip */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>SENSOR LOCATIONS & PHYSICAL MOUNTING POINTS</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {motorState === 'RUNNING' ? '● Conveyor Active' : '○ Standby'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {sensorDefs.map((sensor) => {
            const isSelected = selectedSensorId === sensor.id;
            const reading = getSensorReading(sensor.id);
            const status = getSensorStatusBadge(sensor.id);

            return (
              <button
                key={sensor.id}
                onClick={() => setSelectedSensorId(isSelected ? null : sensor.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? `${sensor.colorBorder} ${sensor.colorBg} ring-1 ring-cyan-400`
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 font-bold" style={{ color: sensor.colorHex }}>
                    <span
                      style={{ backgroundColor: sensor.colorHex }}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-slate-950 font-bold"
                    >
                      {sensor.num}
                    </span>
                    <span>{sensor.shortName}</span>
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${status.color}`}>
                    {status.text}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">{sensor.location}</div>
                <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-500">{sensor.gpio}</span>
                  <span className="text-xs font-bold text-white">{reading}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinViewer;
