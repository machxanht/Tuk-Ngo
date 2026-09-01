import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TECHNICAL_SECTIONS, COLOR_PALETTE, CREW_ROSTER } from '../data/technicalReferenceData';
import { Camera, Layers, Play, Pause, Eye, Maximize2, RotateCcw, Crosshair, Sparkles, Sliders, Shield, Anchor, Users } from 'lucide-react';

interface Interactive3DBlueprintProps {
  activeSectionId?: number;
  onSelectSection?: (sectionId: number) => void;
}

type ViewAngle = '3D_ORBIT' | 'TOP_PLAN' | 'SIDE_ELEVATION' | 'BOW_FRONT' | 'MIDSHIP_SECTION';
type RenderMode = 'REALISTIC_PBR' | 'BLUEPRINT_CAD' | 'STRUCTURAL_KEM' | 'CREW_MATRIX';

export const Interactive3DBlueprint: React.FC<Interactive3DBlueprintProps> = ({
  activeSectionId,
  onSelectSection,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewAngle, setViewAngle] = useState<ViewAngle>('3D_ORBIT');
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC_PBR');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [strokeCadenceSPM, setStrokeCadenceSPM] = useState<number>(105);
  const [stationSliceMeters, setStationSliceMeters] = useState<number>(15.1);
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showCrew, setShowCrew] = useState<boolean>(true);
  const [showWake, setShowWake] = useState<boolean>(true);

  // References for Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraTypeRef = useRef<'PERSPECTIVE' | 'ORTHO'>('PERSPECTIVE');
  const boatGroupRef = useRef<THREE.Group | null>(null);
  const hullOuterMeshRef = useRef<THREE.Mesh | null>(null);
  const hullInnerMeshRef = useRef<THREE.Mesh | null>(null);
  const paddlesGroupRef = useRef<THREE.Group | null>(null);
  const crewGroupRef = useRef<THREE.Group | null>(null);
  const kemGroupRef = useRef<THREE.Group | null>(null);
  const ribsGroupRef = useRef<THREE.Group | null>(null);
  const thwartsGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const wakeGroupRef = useRef<THREE.Group | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);
  const mousePrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraOrbitRef = useRef<{ radius: number; theta: number; phi: number; target: THREE.Vector3 }>({
    radius: 32,
    theta: Math.PI / 4.2,
    phi: Math.PI / 3.4,
    target: new THREE.Vector3(0, 0.4, 0),
  });

  // Physical Metric Dimensions (Verified from Tum Núp 2 Sóc Trăng 2024 Reference)
  const BOAT_LENGTH = 30.20; // meters (LOA)
  const BOAT_MAX_BEAM = 1.16; // meters (Max width at midship)
  const BOAT_MID_DEPTH = 0.48; // meters (Keel bottom to sheer line)
  const PROW_RISE = 1.38; // meters (Prow tip rise above baseline)
  const STERN_RISE = 1.52; // meters (Stern fin rise above baseline)
  const DEADRISE_ANGLE = 0.15; // radians (~8.6 degrees shallow U-bottom)
  const FLARE_ANGLE = 0.22; // radians (~12.6 degrees gunwale outward flare)

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(renderMode === 'BLUEPRINT_CAD' ? 0x050c18 : 0x09101d);

    // 2. CAMERAS
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 250);
    cameraRef.current = camera;

    const frustumSize = 34;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      250
    );
    orthoCameraRef.current = orthoCamera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. LIGHTING SYSTEM (Maspéro daylight sunshine + alluvial bounce)
    const ambientLight = new THREE.AmbientLight(0xfff8ed, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffae8, 1.6);
    sunLight.position.set(16, 28, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);

    // Sky & River fill bounce
    const skyFill = new THREE.DirectionalLight(0x7dd3fc, 0.5);
    skyFill.position.set(-15, 15, -15);
    scene.add(skyFill);

    const waterBounceLight = new THREE.DirectionalLight(0xb45309, 0.35);
    waterBounceLight.position.set(0, -10, 0);
    scene.add(waterBounceLight);

    // 5. GRID / CAD PLANE
    const gridHelper = new THREE.GridHelper(52, 52, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.28;
    scene.add(gridHelper);

    // 6. BUILD HIGH-FIDELITY NGO BOAT SYSTEM
    const boatGroup = new THREE.Group();
    boatGroupRef.current = boatGroup;
    scene.add(boatGroup);

    // BUILD DUAL-LAYER SHELL HULL (Outer + Inner Hollow Dugout Cavity + Khmer Prow/Stern)
    buildAuthenticHull(boatGroup, renderMode);

    // BUILD 48 INTERNAL RIBS (Cong Ghe)
    const ribsGroup = new THREE.Group();
    ribsGroupRef.current = ribsGroup;
    buildTransverseRibs(ribsGroup, renderMode);
    boatGroup.add(ribsGroup);

    // BUILD 26 SEATING THWARTS (Đòn Ngồi)
    const thwartsGroup = new THREE.Group();
    thwartsGroupRef.current = thwartsGroup;
    buildSeatingThwarts(thwartsGroup, renderMode);
    boatGroup.add(thwartsGroup);

    // BUILD MASTER KÈM SPRING TRUSS (Cây Kềm Suốt + 5 Trụ Kềm + Cáp néo tăng đơ)
    const kemGroup = new THREE.Group();
    kemGroupRef.current = kemGroup;
    buildMasterKemTruss(kemGroup, renderMode);
    boatGroup.add(kemGroup);

    // BUILD 50 RACING PADDLES + 3 STEERING OARS (Dầm bơi lá muỗng & Dầm lái 3m)
    const paddlesGroup = new THREE.Group();
    paddlesGroupRef.current = paddlesGroup;
    buildAuthenticPaddles(paddlesGroup, renderMode);
    boatGroup.add(paddlesGroup);

    // BUILD FULL 55-ATHLETE ROSTER (Chỉ huy mũi, Chỉ huy còi giữa, 50 VĐV chèo, 3 Tài công lái)
    const crewGroup = new THREE.Group();
    crewGroupRef.current = crewGroup;
    buildAuthenticCrew(crewGroup, renderMode);
    boatGroup.add(crewGroup);

    // BUILD MASPERO RIVER WATER SURFACE & WAKE
    const waterGeo = new THREE.PlaneGeometry(64, 22, 48, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x85583e, // Maspero Mud Brown
      roughness: 0.12,
      metalness: 0.28,
      transparent: true,
      opacity: 0.72,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.0;
    waterMeshRef.current = waterMesh;
    scene.add(waterMesh);

    // BUILD WATER WAKE & SPRAY EFFECT GROUP
    const wakeGroup = new THREE.Group();
    wakeGroupRef.current = wakeGroup;
    buildWakeAndSplashes(wakeGroup);
    boatGroup.add(wakeGroup);

    // BUILD STATION SLICE PLANE INDICATOR
    const sliceGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const sliceMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const slicePlane = new THREE.Mesh(sliceGeo, sliceMat);
    slicePlane.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    slicePlane.position.y = 0.5;
    slicePlaneRef.current = slicePlane;
    scene.add(slicePlane);

    // 7. MOUSE ORBIT CONTROLS
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const dx = e.clientX - mousePrevRef.current.x;
      const dy = e.clientY - mousePrevRef.current.y;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };

      if (viewAngle === '3D_ORBIT') {
        cameraOrbitRef.current.theta -= dx * 0.007;
        cameraOrbitRef.current.phi = Math.max(
          0.06,
          Math.min(Math.PI / 2 - 0.04, cameraOrbitRef.current.phi + dy * 0.007)
        );
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraOrbitRef.current.radius = Math.max(
        5,
        Math.min(65, cameraOrbitRef.current.radius + e.deltaY * 0.035)
      );
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // 8. RESIZE OBSERVER
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current || !orthoCameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const asp = w / h;

      cameraRef.current.aspect = asp;
      cameraRef.current.updateProjectionMatrix();

      orthoCameraRef.current.left = (-frustumSize * asp) / 2;
      orthoCameraRef.current.right = (frustumSize * asp) / 2;
      orthoCameraRef.current.top = frustumSize / 2;
      orthoCameraRef.current.bottom = -frustumSize / 2;
      orthoCameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. ANIMATION LOOP & BIOMECHANICAL KINEMATICS ENGINE
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Kinematics cycle calculation
      if (isPlaying && paddlesGroupRef.current && boatGroupRef.current && crewGroupRef.current) {
        const strokeFreq = (strokeCadenceSPM / 60) * Math.PI * 2;
        const cycleProgress = (elapsedTime * strokeFreq) % (Math.PI * 2);

        // 1. PADDLES MOTION CYCLE (Catch, Drive, Extraction, Recovery)
        paddlesGroupRef.current.children.forEach((paddle, idx) => {
          const isPort = idx % 2 === 0;
          // Rowers closer to stern lag slightly (wave surge propagation ~0.12 rads)
          const waveLag = (Math.floor(idx / 2) / 26) * 0.14;
          const cycleWithLag = cycleProgress - waveLag;

          // Main forward/backward stroke angle (Catch: +35deg, Extraction: -25deg)
          const strokeAngle = Math.sin(cycleWithLag) * 0.48;
          paddle.rotation.z = strokeAngle;

          // Lateral blade feather & immersion depth
          const immersion = Math.sin(cycleWithLag);
          if (immersion > 0.0) {
            // Blade immersed during Catch & Drive (power phase)
            paddle.position.y = 0.38 - immersion * 0.22;
            paddle.rotation.x = isPort ? 0.32 + immersion * 0.08 : -0.32 - immersion * 0.08;
          } else {
            // Blade lifted above water in air during Recovery
            paddle.position.y = 0.38 - immersion * 0.12;
            paddle.rotation.x = isPort ? 0.28 : -0.28;
          }
        });

        // 2. CREW SKELETAL TORSO KINEMATICS
        // Athletes flex torso forward 40deg at Catch, then drive back 15deg at finish
        crewGroupRef.current.children.forEach((athleteMesh, aIdx) => {
          if (aIdx >= 2 && aIdx < 52) {
            // Seated 50 rowers
            const pairIdx = Math.floor((aIdx - 2) / 2);
            const waveLag = (pairIdx / 25) * 0.14;
            const athleteCycle = cycleProgress - waveLag;
            const bodyLean = Math.sin(athleteCycle) * 0.32 + 0.12; // Forward lean
            athleteMesh.rotation.z = bodyLean;
            athleteMesh.position.y = 0.54 + Math.sin(athleteCycle) * 0.03;
          } else if (aIdx === 0) {
            // Bow leader dynamic rhythm bounce on prow
            athleteMesh.position.y = 0.95 + Math.sin(cycleProgress * 2) * 0.06;
            athleteMesh.rotation.z = 0.25 + Math.cos(cycleProgress) * 0.12;
          } else if (aIdx === 1) {
            // Midship rhythm commander jumping/stamping on central Kềm
            athleteMesh.position.y = 0.84 + Math.abs(Math.sin(cycleProgress)) * 0.08;
            athleteMesh.rotation.z = Math.sin(cycleProgress) * 0.08;
          }
        });

        // 3. BOAT DYNAMIC HEAVE, PITCH & KÈM ELASTIC SURGE
        // Peak forward thrust occurs during mid-Drive phase, causing prow lift and surge
        const heaveDisplacement = Math.sin(cycleProgress) * 0.038;
        const pitchAngle = Math.cos(cycleProgress) * 0.012; // ~0.7 degrees pitch rocking
        boatGroupRef.current.position.y = heaveDisplacement;
        boatGroupRef.current.rotation.z = pitchAngle;

        // Wake splash animation
        if (wakeGroupRef.current) {
          wakeGroupRef.current.visible = showWake;
          wakeGroupRef.current.children.forEach((wakeParticle, wIdx) => {
            const scalePulse = 1.0 + Math.sin(cycleProgress + wIdx) * 0.25;
            wakeParticle.scale.set(scalePulse, scalePulse, scalePulse);
          });
        }
      }

      // Update camera position
      updateCameraView();

      const activeCam = activeCameraTypeRef.current === 'PERSPECTIVE' ? cameraRef.current : orthoCameraRef.current;
      if (activeCam && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, activeCam);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [renderMode, strokeCadenceSPM]);

  // Update Slice plane position
  useEffect(() => {
    if (slicePlaneRef.current) {
      slicePlaneRef.current.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    }
  }, [stationSliceMeters]);

  // Update visibility toggles
  useEffect(() => {
    if (waterMeshRef.current) waterMeshRef.current.visible = showWater;
    if (crewGroupRef.current) crewGroupRef.current.visible = showCrew;
    if (wakeGroupRef.current) wakeGroupRef.current.visible = showWake && showWater;
    if (kemGroupRef.current) {
      kemGroupRef.current.visible =
        renderMode === 'STRUCTURAL_KEM' || renderMode === 'REALISTIC_PBR' || renderMode === 'BLUEPRINT_CAD';
    }
    if (ribsGroupRef.current) {
      ribsGroupRef.current.visible = renderMode !== 'CREW_MATRIX';
    }
    if (thwartsGroupRef.current) {
      thwartsGroupRef.current.visible = true;
    }
  }, [showWater, showCrew, showWake, renderMode]);

  // Update camera view angle
  const updateCameraView = () => {
    if (!cameraRef.current || !orthoCameraRef.current) return;

    if (viewAngle === '3D_ORBIT') {
      activeCameraTypeRef.current = 'PERSPECTIVE';
      const { radius, theta, phi, target } = cameraOrbitRef.current;
      const x = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.cos(theta);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(target);
    } else if (viewAngle === 'TOP_PLAN') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(0, 36, 0);
      orthoCameraRef.current.lookAt(0, 0, 0);
      orthoCameraRef.current.rotation.z = Math.PI / 2;
    } else if (viewAngle === 'SIDE_ELEVATION') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(0, 0.45, 26);
      orthoCameraRef.current.lookAt(0, 0.45, 0);
      orthoCameraRef.current.rotation.z = 0;
    } else if (viewAngle === 'BOW_FRONT') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(BOAT_LENGTH / 2 + 5.5, 0.7, 0);
      orthoCameraRef.current.lookAt(0, 0.7, 0);
      orthoCameraRef.current.rotation.z = 0;
    } else if (viewAngle === 'MIDSHIP_SECTION') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(stationSliceMeters - BOAT_LENGTH / 2 + 4.5, 0.35, 0);
      orthoCameraRef.current.lookAt(stationSliceMeters - BOAT_LENGTH / 2, 0.35, 0);
      orthoCameraRef.current.rotation.z = 0;
    }
  };

  // Helper: Build authentic Khmer Ngo Boat Hull (Outer Shell + Inner Dugout Cockpit)
  const buildAuthenticHull = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const isKemFocus = mode === 'STRUCTURAL_KEM';

    const STATIONS = 48; // 48 longitudinal cross-sections
    const SLICES = 20; // 20 lateral profile points
    const outerVerts: number[] = [];
    const outerIndices: number[] = [];
    const outerColors: number[] = [];

    const innerVerts: number[] = [];
    const innerIndices: number[] = [];
    const innerColors: number[] = [];

    // Calculate station profile coordinates for Outer Shell
    for (let i = 0; i <= STATIONS; i++) {
      const u = i / STATIONS; // 0 = Stern, 1 = Bow
      const x = (u - 0.5) * BOAT_LENGTH; // Longitude

      // 1. Max Beam Calculation (Tapered waterplane)
      let beamAtStation = BOAT_MAX_BEAM * Math.sin(u * Math.PI);
      if (u > 0.88) {
        // Bow sharpening towards prow tip
        const t = (u - 0.88) / 0.12;
        beamAtStation = (1 - t) * (BOAT_MAX_BEAM * 0.38) + t * 0.06;
      } else if (u < 0.12) {
        // Stern tapering to dragon fin blade
        const t = u / 0.12;
        beamAtStation = t * (BOAT_MAX_BEAM * 0.42) + (1 - t) * 0.08;
      }

      // 2. Rocker Keel Curve & Gunwale Sheer Line
      const midDist = Math.abs(u - 0.5) * 2.0;
      const keelY = Math.pow(midDist, 2.3) * 0.28; // Bottom rocker curve

      let gunwaleSheerY = BOAT_MID_DEPTH;
      if (u > 0.72) {
        const bowT = (u - 0.72) / 0.28;
        // Prow upsweep curve (+1.38m)
        gunwaleSheerY = BOAT_MID_DEPTH + Math.pow(bowT, 2.0) * (PROW_RISE - BOAT_MID_DEPTH);
      } else if (u < 0.24) {
        const sternT = (0.24 - u) / 0.24;
        // Stern upsweep curve (+1.52m)
        gunwaleSheerY = BOAT_MID_DEPTH + Math.pow(sternT, 2.0) * (STERN_RISE - BOAT_MID_DEPTH);
      }

      // Outer hull points
      for (let j = 0; j <= SLICES; j++) {
        const v = j / SLICES; // 0 = Port Gunwale, 0.5 = Keel center, 1 = Starboard Gunwale
        const angle = (v - 0.5) * Math.PI; // -PI/2 to +PI/2

        const halfBeam = beamAtStation / 2;
        // Authentic U-shaped bottom with deadrise and gunwale flare
        const z = Math.sin(angle) * halfBeam * (1 + Math.abs(Math.sin(angle)) * FLARE_ANGLE);
        const y = keelY + (1 - Math.cos(angle)) * (gunwaleSheerY - keelY);

        outerVerts.push(x, y, z);

        // Color coding for authentic 2024 Tum Núp 2 livery
        if (isCAD) {
          outerColors.push(0.22, 0.74, 0.97); // Neon Cyan CAD
        } else if (isKemFocus) {
          outerColors.push(0.18, 0.22, 0.32); // Translucent muted slate
        } else {
          // Authentic Tum Núp 2 Livery (Royal Blue Ground, Gold Khmer Kbach Scroll, Red Trim)
          if (u > 0.93) {
            // Scarlet Red & Gold Prow Tip
            outerColors.push(0.86, 0.15, 0.15);
          } else if (u < 0.07) {
            // Scarlet Red & Gold Stern Fin Tip
            outerColors.push(0.86, 0.15, 0.15);
          } else if (Math.abs(z) > halfBeam * 0.82) {
            // Gold Angkor Kbach Scroll Trim along upper Gunwales
            outerColors.push(0.96, 0.62, 0.04);
          } else if (y < keelY + 0.12) {
            // Polished Hopea Dugout Core (Deep Royal Blue / Natural Wood blend)
            outerColors.push(0.12, 0.23, 0.54);
          } else {
            // Royal Blue Primary Racing Hull (`#1E3A8A`)
            outerColors.push(0.12, 0.23, 0.54);
          }
        }

        // Inner hollow cavity (wall thickness ~4.5cm)
        const wallThickness = 0.045;
        const innerHalfBeam = Math.max(0.02, halfBeam - wallThickness);
        const innerZ = Math.sin(angle) * innerHalfBeam;
        const innerY = Math.max(keelY + wallThickness, y - wallThickness * 0.6);
        innerVerts.push(x, innerY, innerZ);

        // Inner wood lacquer color
        if (isCAD) {
          innerColors.push(0.14, 0.48, 0.72);
        } else if (isKemFocus) {
          innerColors.push(0.12, 0.16, 0.24);
        } else {
          // Natural oiled dark Sao wood (`#582A0B`)
          innerColors.push(0.35, 0.18, 0.08);
        }
      }
    }

    // Generate Quads for Outer and Inner Shells
    for (let i = 0; i < STATIONS; i++) {
      for (let j = 0; j < SLICES; j++) {
        const a = i * (SLICES + 1) + j;
        const b = (i + 1) * (SLICES + 1) + j;
        const c = (i + 1) * (SLICES + 1) + (j + 1);
        const d = i * (SLICES + 1) + (j + 1);

        outerIndices.push(a, b, d);
        outerIndices.push(b, c, d);

        // Reverse winding for inner shell
        innerIndices.push(a, d, b);
        innerIndices.push(b, d, c);
      }
    }

    // 1. Create Outer Hull Mesh
    const outerGeo = new THREE.BufferGeometry();
    outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVerts, 3));
    outerGeo.setAttribute('color', new THREE.Float32BufferAttribute(outerColors, 3));
    outerGeo.setIndex(outerIndices);
    outerGeo.computeVertexNormals();

    const outerMat = isCAD
      ? new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.85,
        })
      : new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: isKemFocus ? 0.85 : 0.26,
          metalness: 0.18,
          side: THREE.FrontSide,
          transparent: isKemFocus,
          opacity: isKemFocus ? 0.32 : 1.0,
        });

    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.castShadow = true;
    outerMesh.receiveShadow = true;
    hullOuterMeshRef.current = outerMesh;
    parent.add(outerMesh);

    // 2. Create Inner Dugout Cockpit Mesh
    const innerGeo = new THREE.BufferGeometry();
    innerGeo.setAttribute('position', new THREE.Float32BufferAttribute(innerVerts, 3));
    innerGeo.setAttribute('color', new THREE.Float32BufferAttribute(innerColors, 3));
    innerGeo.setIndex(innerIndices);
    innerGeo.computeVertexNormals();

    const innerMat = isCAD
      ? new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          wireframe: true,
          transparent: true,
          opacity: 0.5,
        })
      : new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.65,
          metalness: 0.05,
          side: THREE.BackSide,
          transparent: isKemFocus,
          opacity: isKemFocus ? 0.25 : 1.0,
        });

    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.receiveShadow = true;
    hullInnerMeshRef.current = innerMesh;
    parent.add(innerMesh);

    // 3. ADD SCULPTED SACRED DRAGON EYE (MẮT GHE NGO) ON PROW
    if (!isCAD) {
      buildSacredEyes(parent);
    }

    // 4. ADD PROW & STERN SCULPTED FIN EMBELLISHMENTS
    buildProwSternOrnaments(parent, mode);
  };

  // Helper: Build Sacred Dragon Eye (Đôi Mắt Thần Ghe Ngo)
  const buildSacredEyes = (parent: THREE.Group) => {
    const eyeBezelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Angkor Gold border
      roughness: 0.3,
      metalness: 0.6,
    });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const eyeFlameMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }); // Red flame eyeliner

    // Starboard Eye
    const stbdEyeGroup = new THREE.Group();
    const eyeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 24), eyeBezelMat);
    eyeBase.rotation.x = Math.PI / 2;
    eyeBase.scale.set(1.7, 1.0, 1.0); // Almond elongated shape
    stbdEyeGroup.add(eyeBase);

    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), eyeWhiteMat);
    eyeWhite.scale.set(1.5, 0.9, 0.3);
    eyeWhite.position.z = 0.02;
    stbdEyeGroup.add(eyeWhite);

    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), eyePupilMat);
    eyePupil.scale.set(1.0, 1.0, 0.4);
    eyePupil.position.set(0.02, 0, 0.04);
    stbdEyeGroup.add(eyePupil);

    stbdEyeGroup.position.set(BOAT_LENGTH / 2 - 1.25, 0.92, 0.16);
    stbdEyeGroup.rotation.y = 0.22;
    parent.add(stbdEyeGroup);

    // Port Eye
    const portEyeGroup = new THREE.Group();
    const portBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 24), eyeBezelMat);
    portBase.rotation.x = Math.PI / 2;
    portBase.scale.set(1.7, 1.0, 1.0);
    portEyeGroup.add(portBase);

    const portWhite = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), eyeWhiteMat);
    portWhite.scale.set(1.5, 0.9, 0.3);
    portWhite.position.z = -0.02;
    portEyeGroup.add(portWhite);

    const portPupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), eyePupilMat);
    portPupil.scale.set(1.0, 1.0, 0.4);
    portPupil.position.set(0.02, 0, -0.04);
    portEyeGroup.add(portPupil);

    portEyeGroup.position.set(BOAT_LENGTH / 2 - 1.25, 0.92, -0.16);
    portEyeGroup.rotation.y = -0.22;
    parent.add(portEyeGroup);
  };

  // Helper: Build Sculpted Prow & Stern Fin Ornaments
  const buildProwSternOrnaments = (parent: THREE.Group, mode: RenderMode) => {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.7,
      roughness: 0.25,
    });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.4,
    });

    // Prow Tip Crest (Đỉnh Mũi Búp Sen / Mỏ Rồng)
    const prowTipGeo = new THREE.ConeGeometry(0.09, 0.85, 16);
    prowTipGeo.rotateZ(-Math.PI / 2.8);
    const prowTip = new THREE.Mesh(prowTipGeo, goldMat);
    prowTip.position.set(BOAT_LENGTH / 2 - 0.15, PROW_RISE + 0.08, 0);
    parent.add(prowTip);

    // Stern Fin Tail (Đuôi Rồng / Phụng Uốn Lượn)
    const sternFinGeo = new THREE.ConeGeometry(0.11, 1.15, 16);
    sternFinGeo.rotateZ(Math.PI / 2.6);
    const sternFin = new THREE.Mesh(sternFinGeo, redMat);
    sternFin.position.set(-BOAT_LENGTH / 2 + 0.2, STERN_RISE + 0.12, 0);
    parent.add(sternFin);
  };

  // Helper: Build 48 Internal Transverse Ribs (Cong Ghe)
  const buildTransverseRibs = (parent: THREE.Group, mode: RenderMode) => {
    const ribMat = new THREE.MeshStandardMaterial({
      color: mode === 'BLUEPRINT_CAD' ? 0x0284c7 : 0x78350f, // Sao timber
      roughness: 0.7,
    });

    for (let k = 1; k < 48; k++) {
      const u = k / 48;
      const x = (u - 0.5) * BOAT_LENGTH;
      const beamHere = BOAT_MAX_BEAM * Math.sin(u * Math.PI) * 0.92;
      const keelY = Math.pow(Math.abs(u - 0.5) * 2.0, 2.3) * 0.28 + 0.05;

      // Curved U-rib shape
      const ribGeo = new THREE.TorusGeometry(beamHere / 2.05, 0.025, 8, 16, Math.PI);
      ribGeo.rotateZ(Math.PI);
      ribGeo.rotateY(Math.PI / 2);
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(x, keelY + beamHere / 2.05, 0);
      parent.add(rib);
    }
  };

  // Helper: Build 26 Seating Thwarts (Đòn Ngồi)
  const buildSeatingThwarts = (parent: THREE.Group, mode: RenderMode) => {
    const thwartMat = new THREE.MeshStandardMaterial({
      color: mode === 'BLUEPRINT_CAD' ? 0x38bdf8 : 0x92400e, // Polished hardwood
      roughness: 0.5,
    });

    for (let k = 0; k < 26; k++) {
      const u = 0.13 + (k / 25) * 0.72; // Spanned across rowers zone
      const x = (u - 0.5) * BOAT_LENGTH;
      const beamHere = BOAT_MAX_BEAM * Math.sin(u * Math.PI) * 0.96;
      const midDist = Math.abs(u - 0.5) * 2.0;
      const ySheer = BOAT_MID_DEPTH + (u > 0.72 ? Math.pow((u - 0.72) / 0.28, 2) * (PROW_RISE - BOAT_MID_DEPTH) : 0);

      const thwartGeo = new THREE.BoxGeometry(0.08, 0.045, Math.max(0.24, beamHere));
      const thwart = new THREE.Mesh(thwartGeo, thwartMat);
      thwart.position.set(x, ySheer - 0.04, 0);
      thwart.castShadow = true;
      thwart.receiveShadow = true;
      parent.add(thwart);
    }
  };

  // Helper: Build Master Kèm Longitudinal Spring-Truss System (Cây Kềm Suốt + 5 Trụ Kềm + Cáp néo tăng đơ)
  const buildMasterKemTruss = (parent: THREE.Group, mode: RenderMode) => {
    const isHighlight = mode === 'STRUCTURAL_KEM';

    const kemMat = new THREE.MeshStandardMaterial({
      color: isHighlight ? 0xf59e0b : 0x451a03,
      emissive: isHighlight ? 0xd97706 : 0x000000,
      emissiveIntensity: isHighlight ? 0.75 : 0.0,
      roughness: 0.35,
      metalness: isHighlight ? 0.3 : 0.0,
    });

    const strutMat = new THREE.MeshStandardMaterial({
      color: isHighlight ? 0xfbbf24 : 0x5c2b09,
      roughness: 0.4,
    });

    const cableMat = new THREE.MeshStandardMaterial({
      color: isHighlight ? 0x38bdf8 : 0x94a3b8, // Steel tension wire
      metalness: 0.85,
      roughness: 0.2,
    });

    const turnbuckleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.15,
    });

    // 1. Long Round Cajun Timber Pole (Cây Kềm Suốt - 24.6m)
    const kemPoleGeo = new THREE.CylinderGeometry(0.095, 0.095, 24.6, 20);
    kemPoleGeo.rotateZ(Math.PI / 2);
    const kemPole = new THREE.Mesh(kemPoleGeo, kemMat);
    kemPole.position.set(0.2, 0.24, 0);
    kemPole.castShadow = true;
    parent.add(kemPole);

    // 2. 5 Strategic Vertical Compression Struts (Trụ Kềm)
    const strutPositions = [
      { x: 8.5, height: 0.34, label: 'Trụ Kềm Mũi' },
      { x: 4.2, height: 0.42, label: 'Trụ Kềm Thân Trước' },
      { x: 0.0, height: 0.46, label: 'Trụ Kềm Giữa (Bệ Chỉ Huy)' },
      { x: -4.5, height: 0.42, label: 'Trụ Kềm Thân Sau' },
      { x: -9.0, height: 0.36, label: 'Trụ Kềm Lái' },
    ];

    strutPositions.forEach((strut) => {
      const sGeo = new THREE.CylinderGeometry(0.045, 0.045, strut.height, 14);
      const sMesh = new THREE.Mesh(sGeo, strutMat);
      sMesh.position.set(strut.x, 0.12 + strut.height / 2, 0);
      sMesh.castShadow = true;
      parent.add(sMesh);

      // Steel brackets at base and top
      const bracketGeo = new THREE.BoxGeometry(0.12, 0.03, 0.12);
      const bracketTop = new THREE.Mesh(bracketGeo, turnbuckleMat);
      bracketTop.position.set(strut.x, 0.12 + strut.height, 0);
      parent.add(bracketTop);
    });

    // 3. Central Commander Platform atop Middle Kềm Strut
    const platGeo = new THREE.BoxGeometry(0.32, 0.04, 0.38);
    const platform = new THREE.Mesh(platGeo, strutMat);
    platform.position.set(0.0, 0.60, 0);
    parent.add(platform);

    // 4. Pre-stressed Steel Tension Rigging Line & Turnbuckles
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12.2, 0.22, 0),
      new THREE.Vector3(-9.0, 0.48, 0),
      new THREE.Vector3(-4.5, 0.54, 0),
      new THREE.Vector3(0.0, 0.58, 0),
      new THREE.Vector3(4.2, 0.54, 0),
      new THREE.Vector3(8.5, 0.46, 0),
      new THREE.Vector3(12.2, 0.24, 0),
    ]);

    const cableTubeGeo = new THREE.TubeGeometry(cableCurve, 36, 0.012, 8, false);
    const cableMesh = new THREE.Mesh(cableTubeGeo, cableMat);
    parent.add(cableMesh);

    // 5. Turnbuckles (Tăng Đơ Siết Lực)
    [-10.5, 10.5].forEach((tbX) => {
      const tbGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12);
      tbGeo.rotateZ(Math.PI / 2);
      const tb = new THREE.Mesh(tbGeo, turnbuckleMat);
      tb.position.set(tbX, 0.32, 0);
      parent.add(tb);
    });
  };

  // Helper: Build 50 Leaf Paddles (Dầm bơi lá muỗng) + 3 Long Steering Oars (Dầm lái 3m)
  const buildAuthenticPaddles = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';

    const shaftMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0x78350f, // Hopea wood shaft
      roughness: 0.4,
    });

    const bladeMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0xd97706, // Amber lacquered teardrop blade with red tip
      roughness: 0.3,
      metalness: 0.1,
    });

    const steeringShaftMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0xf43f5e : 0x451a03,
      roughness: 0.3,
    });

    const steeringBladeMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0xf43f5e : 0xdc2626, // Scarlet red steering blade
      roughness: 0.35,
    });

    // 50 Standard Racing Paddles (25 pairs)
    for (let i = 0; i < 25; i++) {
      const u = 0.13 + (i / 24) * 0.70;
      const x = (u - 0.5) * BOAT_LENGTH;
      const beamHalf = (BOAT_MAX_BEAM * Math.sin(u * Math.PI)) / 2;

      // Port Paddle (Mạn Trái)
      const portGroup = new THREE.Group();
      // Shaft (1.30m)
      const portShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.30, 10), shaftMat);
      // Teardrop Blade (0.60m x 0.18m with central spine rib)
      const portBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.60, 0.18), bladeMat);
      portBlade.position.y = -0.38;
      // Central blade spine rib
      const portSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.60, 6), shaftMat);
      portSpine.position.set(0.011, -0.38, 0);
      portGroup.add(portShaft);
      portGroup.add(portBlade);
      portGroup.add(portSpine);
      portGroup.position.set(x, 0.38, -beamHalf - 0.15);
      portGroup.rotation.x = -0.32;
      parent.add(portGroup);

      // Starboard Paddle (Mạn Phải)
      const stbdGroup = new THREE.Group();
      const stbdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.30, 10), shaftMat);
      const stbdBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.60, 0.18), bladeMat);
      stbdBlade.position.y = -0.38;
      const stbdSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.60, 6), shaftMat);
      stbdSpine.position.set(-0.011, -0.38, 0);
      stbdGroup.add(stbdShaft);
      stbdGroup.add(stbdBlade);
      stbdGroup.add(stbdSpine);
      stbdGroup.position.set(x, 0.38, beamHalf + 0.15);
      stbdGroup.rotation.x = 0.32;
      parent.add(stbdGroup);
    }

    // 3 Long Steering Oars (Dầm Lái - 3.0m) at Stern
    [-12.2, -13.0, -13.8].forEach((xStern, sIdx) => {
      const steerGroup = new THREE.Group();
      const steerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 3.10, 12), steeringShaftMat);
      const steerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.10, 0.24), steeringBladeMat);
      steerBlade.position.y = -1.05;
      steerGroup.add(steerShaft);
      steerGroup.add(steerBlade);
      steerGroup.position.set(xStern, 0.95, sIdx % 2 === 0 ? 0.22 : -0.22);
      steerGroup.rotation.z = -0.68;
      steerGroup.rotation.x = sIdx % 2 === 0 ? 0.18 : -0.18;
      parent.add(steerGroup);
    });
  };

  // Helper: Build Full 55-Athlete Championship Crew Structure
  const buildAuthenticCrew = (parent: THREE.Group, mode: RenderMode) => {
    // Role Color Materials
    const isCrewMode = mode === 'CREW_MATRIX';

    // 1. Blue Team Uniform (Tum Núp 2 Official Jersey `#1E3A8A`)
    const jerseyMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.6,
    });
    // 2. Skin tone
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xc68642, // Healthy sun-tanned skin
      roughness: 0.7,
    });
    // 3. Headband / Cap (Tum Núp Yellow Band `#F59E0B`)
    const headbandMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
    });
    // 4. Bow Commander Gold Accent
    const bowLeaderMat = new THREE.MeshStandardMaterial({
      color: isCrewMode ? 0xf59e0b : 0x1e3a8a,
      emissive: isCrewMode ? 0xb45309 : 0x000000,
      roughness: 0.4,
    });
    // 5. Steersmen Red Accent
    const steerMat = new THREE.MeshStandardMaterial({
      color: isCrewMode ? 0xdc2626 : 0x1e3a8a,
      emissive: isCrewMode ? 0x991b1b : 0x000000,
      roughness: 0.4,
    });

    // Helper: Create single 3D athlete character model
    const createAthleteMesh = (roleMat: THREE.Material, hasPaddle = true) => {
      const athlete = new THREE.Group();

      // Torso with jersey
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.28), roleMat);
      torso.position.y = 0.21;
      torso.castShadow = true;
      athlete.add(torso);

      // Head with headband
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skinMat);
      head.position.y = 0.48;
      head.castShadow = true;
      athlete.add(head);

      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.015, 6, 12), headbandMat);
      headband.position.y = 0.49;
      headband.rotation.x = Math.PI / 2;
      athlete.add(headband);

      // Arms grasping paddle
      const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8);
      const armLeft = new THREE.Mesh(armGeo, skinMat);
      armLeft.position.set(0.12, 0.22, 0.14);
      armLeft.rotation.x = 0.6;
      armLeft.rotation.z = -0.4;
      athlete.add(armLeft);

      const armRight = new THREE.Mesh(armGeo, skinMat);
      armRight.position.set(0.12, 0.22, -0.14);
      armRight.rotation.x = -0.6;
      armRight.rotation.z = -0.4;
      athlete.add(armRight);

      return athlete;
    };

    // 1. Bow Commander (Chỉ huy mũi - Index 0)
    const bowCommander = createAthleteMesh(bowLeaderMat, false);
    bowCommander.position.set(BOAT_LENGTH / 2 - 1.45, 0.95, 0);
    bowCommander.rotation.z = 0.28;
    parent.add(bowCommander);

    // 2. Central Whistle/Drum Commander (Chỉ huy giữa - Index 1)
    const midCommander = createAthleteMesh(bowLeaderMat, false);
    midCommander.position.set(0.0, 0.84, 0);
    parent.add(midCommander);

    // 3. 50 Seated Rowers (25 Pairs on Thwarts - Index 2 to 51)
    for (let i = 0; i < 25; i++) {
      const u = 0.13 + (i / 24) * 0.70;
      const x = (u - 0.5) * BOAT_LENGTH;

      // Port Rower (Mạn Trái)
      const portRower = createAthleteMesh(jerseyMat);
      portRower.position.set(x, 0.54, -0.22);
      portRower.rotation.z = 0.22;
      parent.add(portRower);

      // Starboard Rower (Mạn Phải)
      const stbdRower = createAthleteMesh(jerseyMat);
      stbdRower.position.set(x, 0.54, 0.22);
      stbdRower.rotation.z = 0.22;
      parent.add(stbdRower);
    }

    // 4. 3 Standing Steersmen (Tổ Lái Đuôi - Index 52 to 54)
    [-11.8, -12.6, -13.5].forEach((xStern, sIdx) => {
      const steersman = createAthleteMesh(steerMat, false);
      steersman.position.set(xStern, 1.05 + sIdx * 0.12, sIdx % 2 === 0 ? 0.12 : -0.12);
      steersman.rotation.z = -0.18;
      parent.add(steersman);
    });
  };

  // Helper: Build Water Wake, Bow Spray & Paddle Splashes
  const buildWakeAndSplashes = (parent: THREE.Group) => {
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
    });

    // Bow V-Shaped Wake Splashes
    for (let i = 0; i < 16; i++) {
      const splash = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8), foamMat);
      const x = BOAT_LENGTH / 2 - i * 0.8;
      const z = (i * 0.12) * (i % 2 === 0 ? 1 : -1);
      splash.position.set(x, 0.02, z);
      parent.add(splash);
    }

    // Stern Trailing Wake Streamers
    for (let j = 0; j < 20; j++) {
      const sternWake = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), foamMat);
      sternWake.rotation.x = -Math.PI / 2;
      sternWake.position.set(-BOAT_LENGTH / 2 - j * 0.7, 0.01, (Math.random() - 0.5) * 0.8);
      parent.add(sternWake);
    }
  };

  // Calculate live station geometric slice data
  const uStation = Math.min(1.0, Math.max(0.0, stationSliceMeters / BOAT_LENGTH));
  let liveBeam = (BOAT_MAX_BEAM * Math.sin(uStation * Math.PI));
  if (uStation > 0.88) {
    const t = (uStation - 0.88) / 0.12;
    liveBeam = (1 - t) * (BOAT_MAX_BEAM * 0.38) + t * 0.06;
  } else if (uStation < 0.12) {
    const t = uStation / 0.12;
    liveBeam = t * (BOAT_MAX_BEAM * 0.42) + (1 - t) * 0.08;
  }
  const currentBeam = Math.max(0.08, liveBeam).toFixed(2);
  const midDist = Math.abs(uStation - 0.5) * 2.0;
  const currentDepth = (BOAT_MID_DEPTH + Math.pow(midDist, 2.0) * 0.22).toFixed(2);

  return (
    <div className="flex flex-col w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
      {/* 3D Viewport Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/90 border-b border-slate-800 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
            HỆ THỐNG DỰNG HÌNH 3D & CAD NGO BOAT MASTER
          </span>
          <span className="text-xs font-mono text-slate-400">
            [NGO_ST_TUMNUP2_2024_MASTER]
          </span>
        </div>

        {/* View Angle Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            id="btn-view-3d-orbit"
            onClick={() => setViewAngle('3D_ORBIT')}
            className={`px-2.5 py-1 rounded transition ${
              viewAngle === '3D_ORBIT'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Xoay tự do (3D Orbit)
          </button>
          <button
            id="btn-view-top-plan"
            onClick={() => setViewAngle('TOP_PLAN')}
            className={`px-2.5 py-1 rounded transition ${
              viewAngle === 'TOP_PLAN'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nhìn từ trên (Top Plan)
          </button>
          <button
            id="btn-view-side-elev"
            onClick={() => setViewAngle('SIDE_ELEVATION')}
            className={`px-2.5 py-1 rounded transition ${
              viewAngle === 'SIDE_ELEVATION'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chiếu cạnh (Side Sheer)
          </button>
          <button
            id="btn-view-bow-front"
            onClick={() => setViewAngle('BOW_FRONT')}
            className={`px-2.5 py-1 rounded transition ${
              viewAngle === 'BOW_FRONT'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chính diện mũi (Bow Front)
          </button>
          <button
            id="btn-view-midship-section"
            onClick={() => setViewAngle('MIDSHIP_SECTION')}
            className={`px-2.5 py-1 rounded transition ${
              viewAngle === 'MIDSHIP_SECTION'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mặt cắt trạm (Section Cut)
          </button>
        </div>

        {/* Render Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            id="btn-render-pbr"
            onClick={() => setRenderMode('REALISTIC_PBR')}
            className={`px-2.5 py-1 rounded transition ${
              renderMode === 'REALISTIC_PBR'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hiển thị vật liệu PBR
          </button>
          <button
            id="btn-render-cad"
            onClick={() => setRenderMode('BLUEPRINT_CAD')}
            className={`px-2.5 py-1 rounded transition ${
              renderMode === 'BLUEPRINT_CAD'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Khung dây CAD
          </button>
          <button
            id="btn-render-kem"
            onClick={() => setRenderMode('STRUCTURAL_KEM')}
            className={`px-2.5 py-1 rounded transition ${
              renderMode === 'STRUCTURAL_KEM'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kết cấu Kềm (Spring Truss)
          </button>
          <button
            id="btn-render-crew"
            onClick={() => setRenderMode('CREW_MATRIX')}
            className={`px-2.5 py-1 rounded transition ${
              renderMode === 'CREW_MATRIX'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sơ đồ 55 VĐV
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div className="relative w-full h-[520px] bg-slate-950 select-none overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Real Metric Specs HUD Overlay */}
        <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 font-mono text-[11px] text-slate-300 bg-slate-950/90 p-3 rounded-xl border border-slate-800 backdrop-blur shadow-xl max-w-sm">
          <div className="flex items-center gap-2 text-sky-400 font-bold border-b border-slate-800 pb-1.5 mb-1">
            <Crosshair className="w-3.5 h-3.5" />
            <span className="tracking-wide">THÔNG SỐ THAM CHIẾU & MÔ HÌNH HÓA (TUM NÚP 2 2024)</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Chiều dài tổng thể (LOA): <span className="text-white font-bold">30.20 m</span></span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Chiều rộng lớn nhất: <span className="text-white font-bold">1.16 m</span> (Tỷ lệ 26:1)</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Chiều cao mạn giữa: <span className="text-white font-bold">0.48 m</span> (Máng chữ U)</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Độ vút Mũi / Đuôi: <span className="text-white font-bold">+1.38m / +1.52m</span></span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Lượng choán nước tính toán: <span className="text-emerald-400 font-bold">~5.100 kg</span></span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Biên chế thi đấu: <span className="text-sky-400 font-bold">55 - 58 VĐV</span></span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Cây Kềm suốt dọc thân (24.5m + 5 trụ):</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/40">KẾT CẤU XÁC NHẬN</span>
          </div>
          <div className="text-slate-400 border-t border-slate-800 pt-1.5 mt-1 flex items-center justify-between gap-2">
            <span>Trạm cắt CAD: Trạm {Math.round((stationSliceMeters / BOAT_LENGTH) * 48)} ({stationSliceMeters.toFixed(1)}m) | B: {currentBeam}m | D: {currentDepth}m</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-950/80 text-sky-300 border border-sky-500/40">LƯỚI CAD</span>
          </div>
        </div>

        {/* Floating View Angle Prompt */}
        <div className="absolute bottom-3 right-3 pointer-events-none font-mono text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur">
          Kéo chuột trái: Xoay | Cuộn chuột: Thu phóng | Chế độ: {viewAngle}
        </div>
      </div>

      {/* Control & Kinematics Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950 border-t border-slate-800 text-xs">
        {/* Stroke Cadence & Playback */}
        <div className="flex items-center gap-4">
          <button
            id="btn-toggle-kinematics"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-md shadow-sky-600/20 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Tạm dừng chuyển động' : 'Phát chuyển động (Kinematics)'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Nhịp chèo (SPM):</span>
            <input
              id="slider-cadence-spm"
              type="range"
              min="60"
              max="125"
              step="1"
              value={strokeCadenceSPM}
              onChange={(e) => setStrokeCadenceSPM(Number(e.target.value))}
              className="w-28 accent-sky-500 cursor-pointer"
            />
            <span className="font-mono font-bold text-sky-400 w-12">{strokeCadenceSPM} SPM</span>
          </div>
        </div>

        {/* Station Cross-Section Scrub Slider */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">Vị trí cắt trạm (0-30.2m):</span>
          <input
            id="slider-station-slice"
            type="range"
            min="0"
            max={BOAT_LENGTH}
            step="0.1"
            value={stationSliceMeters}
            onChange={(e) => setStationSliceMeters(Number(e.target.value))}
            className="w-36 accent-rose-500 cursor-pointer"
          />
          <span className="font-mono font-bold text-rose-400 w-14">{stationSliceMeters.toFixed(1)} m</span>
        </div>

        {/* Visibility Feature Toggles */}
        <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              id="toggle-water"
              type="checkbox"
              checked={showWater}
              onChange={(e) => setShowWater(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <span>Mặt nước sông Maspéro</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              id="toggle-crew"
              type="checkbox"
              checked={showCrew}
              onChange={(e) => setShowCrew(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <span>Đội hình 55 VĐV</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              id="toggle-wake"
              type="checkbox"
              checked={showWake}
              onChange={(e) => setShowWake(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <span>Vệt rẽ sóng & bọt nước</span>
          </label>
        </div>
      </div>
    </div>
  );
};
