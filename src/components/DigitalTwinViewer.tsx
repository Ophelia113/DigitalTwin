import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Box, CheckCircle2 } from 'lucide-react';
import { TelemetryPoint, ThresholdConfig, MotorState } from '../types/telemetry';

interface DigitalTwinViewerProps {
  current: TelemetryPoint | null;
  thresholds: ThresholdConfig;
  boxProgress: number;
  motorState: MotorState;
}

export const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({
  current,
  thresholds,
  boxProgress,
  motorState,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const isHeadTempCrit = current ? current.temperature_head_c >= thresholds.temp_cutoff_c : false;
  const isHeadTempWarn = current ? !isHeadTempCrit && current.temperature_head_c >= thresholds.temp_warning_c : false;
  const isTailTempCrit = current ? current.temperature_tail_c >= thresholds.temp_cutoff_c : false;
  const isTailTempWarn = current ? !isTailTempCrit && current.temperature_tail_c >= thresholds.temp_warning_c : false;
  const isVibCritical = current ? current.vibration_rms_g >= thresholds.vib_cutoff_g : false;

  const isCritical = motorState === 'FAULT' || isHeadTempCrit || isTailTempCrit || isVibCritical;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 380;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.2, 3.4, 4.8);
    camera.lookAt(0, 0.4, 0);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdff0ff, 1.4);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const statusLight = new THREE.PointLight(0x06b6d4, 1.2, 8);
    statusLight.position.set(0, 2.5, 0);
    scene.add(statusLight);

    // 3. Grid & Tabletop Platform
    const gridHelper = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const tableMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.1, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.85, metalness: 0.2 })
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
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#262b36';
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
      new THREE.CylinderGeometry(0.22, 0.22, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    motorCylinder.rotation.x = Math.PI / 2;
    motorGroup.add(motorCylinder);

    const gearbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
    );
    gearbox.position.z = 0.25;
    motorGroup.add(gearbox);
    conveyorGroup.add(motorGroup);

    // SENSORS
    // 1. Ultrasonic Sonar Arch at x = 0.2
    const archGroup = new THREE.Group();
    archGroup.position.set(0.2, 0.55, 0);
    const archPillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), railMat);
    archPillar1.position.set(0, 0.3, 0.46);
    const archPillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), railMat);
    archPillar2.position.set(0, 0.3, -0.46);
    const archCrossbar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.96), railMat);
    archCrossbar.position.set(0, 0.6, 0);
    archGroup.add(archPillar1, archPillar2, archCrossbar);

    const hcsr04Pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8 })
    );
    hcsr04Pcb.position.set(0, 0.54, 0);
    archGroup.add(hcsr04Pcb);

    const coneGeo = new THREE.ConeGeometry(0.35, 0.42, 16, 1, true);
    coneGeo.translate(0, -0.21, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const sonarBeam = new THREE.Mesh(coneGeo, coneMat);
    sonarBeam.position.set(0, 0.46, 0);
    archGroup.add(sonarBeam);
    conveyorGroup.add(archGroup);

    // 2. Head Temp Sensor Probe (DS18B20 #1)
    const tempHeadGroup = new THREE.Group();
    tempHeadGroup.position.set(-1.9, 0.78, -0.72);
    const tempHeadProbe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 })
    );
    tempHeadProbe.rotation.z = Math.PI / 4;
    const tempHeadLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    tempHeadLed.position.set(-0.06, 0.06, 0);
    tempHeadGroup.add(tempHeadProbe, tempHeadLed);
    conveyorGroup.add(tempHeadGroup);

    // 3. Tail Temp Sensor Probe (DS18B20 #2)
    const tempTailGroup = new THREE.Group();
    tempTailGroup.position.set(1.9, 0.68, 0.46);
    const tempTailProbe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 })
    );
    tempTailProbe.rotation.x = Math.PI / 2;
    tempTailProbe.position.set(0, 0.04, -0.06);
    const tempTailLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    tempTailLed.position.set(0, 0.04, -0.14);
    tempTailGroup.add(tempTailProbe, tempTailLed);
    conveyorGroup.add(tempTailGroup);

    // 4. Moving Box
    const packageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.28, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
    );
    packageMesh.position.set(0, 0.88, 0);
    packageMesh.castShadow = true;
    scene.add(packageMesh);

    // Mouse drag
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
      radius = Math.max(3.2, Math.min(9.5, radius + e.deltaY * 0.005));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0.5, 0);

      const isRunning = motorState === 'RUNNING';

      if (isRunning) {
        headRoller.rotation.y += dt * 4;
        tailRoller.rotation.y += dt * 4;
        beltTexture.offset.x -= dt * 0.6;

        const boxX = 1.7 - boxProgress * 3.4;
        packageMesh.position.x = boxX;
        packageMesh.visible = true;

        const isUnderSensor = Math.abs(boxX - 0.2) < 0.25;
        if (isUnderSensor) {
          coneMat.color.setHex(0x10b981);
          coneMat.opacity = 0.55;
        } else {
          coneMat.color.setHex(0x06b6d4);
          coneMat.opacity = 0.2;
        }
      } else {
        coneMat.opacity = 0.15;
      }

      if (isHeadTempCrit) tempHeadLed.material.color.setHex(0xef4444);
      else if (isHeadTempWarn) tempHeadLed.material.color.setHex(0xf59e0b);
      else tempHeadLed.material.color.setHex(0x06b6d4);

      if (isTailTempCrit) tempTailLed.material.color.setHex(0xef4444);
      else if (isTailTempWarn) tempTailLed.material.color.setHex(0xf59e0b);
      else tempTailLed.material.color.setHex(0xf97316);

      if (isCritical) {
        statusLight.color.setHex(0xef4444);
        statusLight.intensity = 2.0;
      } else {
        statusLight.color.setHex(0x06b6d4);
        statusLight.intensity = 1.0;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 380;
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
  }, [motorState, boxProgress, isCritical, isHeadTempCrit, isHeadTempWarn, isTailTempCrit, isTailTempWarn]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>3D CONVEYOR TWIN</span>
          <span className="text-xs text-slate-400 font-normal">
            (Drag to rotate • Scroll to zoom)
          </span>
        </h3>
        <span className="text-xs text-cyan-400 font-mono">
          500mm Tabletop Model
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="relative w-full h-[320px] sm:h-[360px] rounded-lg overflow-hidden bg-slate-950 border border-slate-800/80">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>

      {/* Simple Clean Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs font-mono text-slate-400 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>Motor Temp (Head)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
            <span>Roller Temp (Tail)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Box Sensor</span>
          </span>
        </div>
        <span className="text-emerald-400 font-semibold">
          {motorState === 'RUNNING' ? '● Belt Moving' : '○ Belt Stopped'}
        </span>
      </div>
    </div>
  );
};
