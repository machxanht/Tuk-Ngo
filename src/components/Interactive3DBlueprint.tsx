import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TECHNICAL_SECTIONS, COLOR_PALETTE, CREW_ROSTER } from '../data/technicalReferenceData';
import {
  Camera,
  Layers,
  Play,
  Pause,
  Eye,
  EyeOff,
  Maximize2,
  RotateCcw,
  Crosshair,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  Shield,
  Anchor,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  ZoomIn,
  ZoomOut,
  Waves,
  Activity,
} from 'lucide-react';

interface Interactive3DBlueprintProps {
  activeSectionId?: number;
  onSelectSection?: (sectionId: number) => void;
}

type ViewAngle = '3D_ORBIT' | 'TOP' | 'SIDE' | 'FRONT' | 'REAR';
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
  const [showSpecsHUD, setShowSpecsHUD] = useState<boolean>(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

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

  const handleZoom = (delta: number) => {
    if (activeCameraTypeRef.current === 'PERSPECTIVE' && cameraRef.current) {
      cameraOrbitRef.current.radius = Math.max(8, Math.min(65, cameraOrbitRef.current.radius + delta));
      const { radius, theta, phi, target } = cameraOrbitRef.current;
      cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = target.y + radius * Math.cos(phi);
      cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(target);
    } else if (orthoCameraRef.current) {
      orthoCameraRef.current.zoom = Math.max(10, Math.min(90, orthoCameraRef.current.zoom * (delta < 0 ? 1.25 : 0.8)));
      orthoCameraRef.current.updateProjectionMatrix();
    }
  };

  const handleResetView = () => {
    setViewAngle('3D_ORBIT');
    cameraOrbitRef.current = {
      radius: 32,
      theta: Math.PI / 4.2,
      phi: Math.PI / 3.4,
      target: new THREE.Vector3(0, 0.4, 0),
    };
    if (cameraRef.current) {
      const { radius, theta, phi, target } = cameraOrbitRef.current;
      cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = target.y + radius * Math.cos(phi);
      cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(target);
    }
  };

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
    } else if (viewAngle === 'TOP') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.position.set(0, 36, 0);
      orthoCameraRef.current.lookAt(0, 0, 0);
      orthoCameraRef.current.up.set(0, 0, -1);
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (viewAngle === 'SIDE') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.position.set(0, 0.70, 26);
      orthoCameraRef.current.lookAt(0, 0.70, 0);
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (viewAngle === 'FRONT') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 5.5;
      orthoCameraRef.current.position.set(BOAT_LENGTH / 2 + 10.0, 0.75, 0);
      orthoCameraRef.current.lookAt(0, 0.75, 0);
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (viewAngle === 'REAR') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 5.5;
      orthoCameraRef.current.position.set(-BOAT_LENGTH / 2 - 10.0, 0.85, 0);
      orthoCameraRef.current.lookAt(0, 0.85, 0);
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.updateProjectionMatrix();
    }
  };

  // Helper: Build authentic Khmer Ngo Boat Hull (Outer Shell + Inner Dugout Cockpit)
  // Helper: Build authentic Khmer Ngo Boat Hull (Outer Shell + Inner Dugout Cockpit)
  const buildAuthenticHull = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const isKemFocus = mode === 'STRUCTURAL_KEM';

    const STATIONS = 120; // 120 longitudinal cross-sections for ultra-smooth organic lofting
    const SLICES = 32; // 32 lateral profile points
    const outerVerts: number[] = [];
    const outerIndices: number[] = [];
    const outerColors: number[] = [];

    const innerVerts: number[] = [];
    const innerIndices: number[] = [];
    const innerColors: number[] = [];

    // Calculate station profile coordinates for Outer Shell
    for (let i = 0; i <= STATIONS; i++) {
      const u = i / STATIONS; // 0 = Stern Tip, 1 = Bow Tip
      const x = (u - 0.5) * BOAT_LENGTH; // Longitude (-15.1m to +15.1m)

      // 1. Organic willow-leaf (lá tre / thoi naga) continuous slender taper
      // Powers > 1.0 ensure needle-sharp tapering at bow and stern tips without bluntness
      const sinU = Math.sin(u * Math.PI);
      const beamAtStation = BOAT_MAX_BEAM * Math.pow(sinU, 1.25);

      // 2. Continuous Rocker Keel Curve & Gunwale Sheer Line
      let keelY = 0.0;
      let gunwaleSheerY = BOAT_MID_DEPTH;

      if (u >= 0.5) {
        // Forward section (Midship -> Bow Prow)
        const tBow = (u - 0.5) / 0.5; // 0 at midship, 1 at bow tip
        // Smooth C2 cubic keel sweep up to Meet the prow nose
        keelY = (PROW_RISE - 0.16) * Math.pow(tBow, 2.8);
        // Smooth C2 sheer sweep up to Prow Tip (+1.38m)
        gunwaleSheerY = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow(tBow, 2.4);
      } else {
        // Aft section (Midship -> Stern Fin)
        const tStern = (0.5 - u) / 0.5; // 0 at midship, 1 at stern tip
        // Smooth C2 cubic keel sweep up to Stern Fin bottom
        keelY = (STERN_RISE - 0.18) * Math.pow(tStern, 2.8);
        // Smooth C2 sheer sweep up to Stern Fin Tip (+1.52m)
        gunwaleSheerY = BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow(tStern, 2.2);
      }

      // Outer hull points
      for (let j = 0; j <= SLICES; j++) {
        const v = j / SLICES; // 0 = Port Gunwale, 0.5 = Keel center, 1 = Starboard Gunwale
        const angle = (v - 0.5) * Math.PI; // -PI/2 to +PI/2

        const halfBeam = beamAtStation / 2;
        // Subtle topside flare, naturally vanishing at razor-sharp tips
        const flareRatio = Math.min(1.0, (beamAtStation / BOAT_MAX_BEAM) * 1.2);
        const localFlare = FLARE_ANGLE * flareRatio;
        const z = Math.sin(angle) * halfBeam * (1.0 + Math.abs(Math.sin(angle)) * localFlare);

        // Authentic U-máng bottom: smooth transition from rounded bottom to vertical flared gunwale
        const uCurvature = Math.pow(Math.abs(Math.sin(angle)), 1.6);
        const y = keelY + uCurvature * (gunwaleSheerY - keelY);

        outerVerts.push(x, y, z);

        // Color coding for authentic 2024 Tum Núp 2 livery
        if (isCAD) {
          outerColors.push(0.22, 0.74, 0.97); // Neon Cyan CAD
        } else if (isKemFocus) {
          outerColors.push(0.18, 0.22, 0.32); // Translucent muted slate
        } else {
          // Authentic Tum Núp 2 Livery (Royal Blue Ground, Gold Khmer Kbach Scroll, Red Trim)
          if (u > 0.95) {
            // Scarlet Red & Gold Prow Tip
            outerColors.push(0.86, 0.15, 0.15);
          } else if (u < 0.05) {
            // Scarlet Red & Gold Stern Fin Tip
            outerColors.push(0.86, 0.15, 0.15);
          } else if (Math.abs(z) > halfBeam * 0.80 && halfBeam > 0.1) {
            // Gold Angkor Kbach Scroll Trim along upper Gunwales
            outerColors.push(0.96, 0.62, 0.04);
          } else {
            // Royal Blue Primary Racing Hull (`#1E3A8A`)
            outerColors.push(0.12, 0.23, 0.54);
          }
        }

        // Inner hollow cavity (wall thickness ~4.5cm, tapering at ends)
        const wallThickness = Math.min(0.045, halfBeam * 0.4);
        const innerHalfBeam = Math.max(0.0, halfBeam - wallThickness);
        const innerZ = Math.sin(angle) * innerHalfBeam * (1.0 + Math.abs(Math.sin(angle)) * localFlare);
        const innerY = Math.max(keelY + wallThickness, y - wallThickness * 0.5);
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

    // 3. ADD SCULPTED SACRED DRAGON EYE (MẮT GHE NGO) ON PROW FLANK
    if (!isCAD) {
      buildSacredEyes(parent);
    }
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

    // Starboard Eye
    const stbdEyeGroup = new THREE.Group();
    const eyeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.025, 24), eyeBezelMat);
    eyeBase.rotation.x = Math.PI / 2;
    eyeBase.scale.set(1.5, 0.9, 1.0); // Almond elongated shape
    stbdEyeGroup.add(eyeBase);

    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeWhiteMat);
    eyeWhite.scale.set(1.3, 0.8, 0.3);
    eyeWhite.position.z = 0.015;
    stbdEyeGroup.add(eyeWhite);

    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), eyePupilMat);
    eyePupil.scale.set(1.0, 1.0, 0.4);
    eyePupil.position.set(0.015, 0, 0.03);
    stbdEyeGroup.add(eyePupil);

    stbdEyeGroup.position.set(BOAT_LENGTH / 2 - 1.15, 1.08, 0.10);
    stbdEyeGroup.rotation.y = 0.25;
    stbdEyeGroup.rotation.z = 0.16;
    parent.add(stbdEyeGroup);

    // Port Eye
    const portEyeGroup = new THREE.Group();
    const portBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.025, 24), eyeBezelMat);
    portBase.rotation.x = Math.PI / 2;
    portBase.scale.set(1.5, 0.9, 1.0);
    portEyeGroup.add(portBase);

    const portWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeWhiteMat);
    portWhite.scale.set(1.3, 0.8, 0.3);
    portWhite.position.z = -0.015;
    portEyeGroup.add(portWhite);

    const portPupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), eyePupilMat);
    portPupil.scale.set(1.0, 1.0, 0.4);
    portPupil.position.set(0.015, 0, -0.03);
    portEyeGroup.add(portPupil);

    portEyeGroup.position.set(BOAT_LENGTH / 2 - 1.15, 1.08, -0.10);
    portEyeGroup.rotation.y = -0.25;
    portEyeGroup.rotation.z = 0.16;
    parent.add(portEyeGroup);
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
      const rawBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const beamHere = Math.max(0.06, rawBeam * 0.90);
      const midDist = Math.abs(u - 0.5) * 2.0;
      const keelY = (u >= 0.5 ? (PROW_RISE - 0.16) * Math.pow((u - 0.5) / 0.5, 2.8) : (STERN_RISE - 0.18) * Math.pow((0.5 - u) / 0.5, 2.8)) + 0.03;

      // Curved U-rib shape
      const ribGeo = new THREE.TorusGeometry(beamHere / 2.05, 0.018, 8, 16, Math.PI);
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

    // 26 Seating Thwarts (Đòn Ngồi)
    for (let k = 0; k < 26; k++) {
      const u = 0.14 + (k / 25) * 0.68; // Spanned across rowers zone
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = Math.max(0.18, BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25) * 0.94);
      const tBow = u >= 0.5 ? (u - 0.5) / 0.5 : 0;
      const ySheer = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow(tBow, 2.4);

      const thwartGeo = new THREE.BoxGeometry(0.07, 0.04, localBeam);
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
      const u = 0.14 + (i / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const beamHalf = localBeam / 2;
      const tBow = u >= 0.5 ? (u - 0.5) / 0.5 : 0;
      const ySheer = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow(tBow, 2.4);

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
      portGroup.position.set(x, ySheer - 0.12, -beamHalf - 0.12);
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
      stbdGroup.position.set(x, ySheer - 0.12, beamHalf + 0.12);
      stbdGroup.rotation.x = 0.32;
      parent.add(stbdGroup);
    }

    // 3 Long Steering Oars (Dầm Lái - 3.0m) at Stern
    [-11.8, -12.6, -13.5].forEach((xStern, sIdx) => {
      const steerGroup = new THREE.Group();
      const steerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.10, 12), steeringShaftMat);
      const steerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.10, 0.22), steeringBladeMat);
      steerBlade.position.y = -1.05;
      steerGroup.add(steerShaft);
      steerGroup.add(steerBlade);
      steerGroup.position.set(xStern, 1.05 + sIdx * 0.10, sIdx % 2 === 0 ? 0.16 : -0.16);
      steerGroup.rotation.z = -0.68;
      steerGroup.rotation.x = sIdx % 2 === 0 ? 0.16 : -0.16;
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
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.40, 0.26), roleMat);
      torso.position.y = 0.20;
      torso.castShadow = true;
      athlete.add(torso);

      // Head with headband
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), skinMat);
      head.position.y = 0.46;
      head.castShadow = true;
      athlete.add(head);

      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.014, 6, 12), headbandMat);
      headband.position.y = 0.47;
      headband.rotation.x = Math.PI / 2;
      athlete.add(headband);

      // Arms grasping paddle
      const armGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.30, 8);
      const armLeft = new THREE.Mesh(armGeo, skinMat);
      armLeft.position.set(0.11, 0.21, 0.13);
      armLeft.rotation.x = 0.6;
      armLeft.rotation.z = -0.4;
      athlete.add(armLeft);

      const armRight = new THREE.Mesh(armGeo, skinMat);
      armRight.position.set(0.11, 0.21, -0.13);
      armRight.rotation.x = -0.6;
      armRight.rotation.z = -0.4;
      athlete.add(armRight);

      return athlete;
    };

    // 1. Bow Commander (Chỉ huy mũi - Index 0)
    const bowCommander = createAthleteMesh(bowLeaderMat, false);
    bowCommander.position.set(BOAT_LENGTH / 2 - 1.40, 1.15, 0);
    bowCommander.rotation.z = 0.22;
    parent.add(bowCommander);

    // 2. Central Whistle/Drum Commander (Chỉ huy giữa - Index 1)
    const midCommander = createAthleteMesh(bowLeaderMat, false);
    midCommander.position.set(0.0, 0.84, 0);
    parent.add(midCommander);

    // 3. 50 Seated Rowers (25 Pairs on Thwarts - Index 2 to 51)
    for (let i = 0; i < 25; i++) {
      const u = 0.14 + (i / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const lateralOffset = Math.min(0.20, Math.max(0.10, (localBeam / 2) * 0.50));
      const tBow = u >= 0.5 ? (u - 0.5) / 0.5 : 0;
      const yPos = 0.52 + Math.pow(tBow, 2.4) * 0.35;

      // Port Rower (Mạn Trái)
      const portRower = createAthleteMesh(jerseyMat);
      portRower.position.set(x, yPos, -lateralOffset);
      portRower.rotation.z = 0.20;
      parent.add(portRower);

      // Starboard Rower (Mạn Phải)
      const stbdRower = createAthleteMesh(jerseyMat);
      stbdRower.position.set(x, yPos, lateralOffset);
      stbdRower.rotation.z = 0.20;
      parent.add(stbdRower);
    }

    // 4. 3 Standing Steersmen (Tổ Lái Đuôi - Index 52 to 54)
    [-11.8, -12.6, -13.5].forEach((xStern, sIdx) => {
      const steersman = createAthleteMesh(steerMat, false);
      steersman.position.set(xStern, 1.02 + sIdx * 0.12, sIdx % 2 === 0 ? 0.09 : -0.09);
      steersman.rotation.z = -0.16;
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

  // Calculate live station geometric slice data matching 3D lofting mesh
  const uStation = Math.min(1.0, Math.max(0.0, stationSliceMeters / BOAT_LENGTH));
  const rawLiveBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(uStation * Math.PI), 0.80);
  const currentBeam = Math.max(0.04, rawLiveBeam).toFixed(2);
  const midDist = Math.abs(uStation - 0.5) * 2.0;
  const liveKeelY = Math.pow(midDist, 2.5) * 0.28;
  const liveSheerY =
    uStation >= 0.5
      ? BOAT_MID_DEPTH + Math.pow((uStation - 0.5) / 0.5, 2.3) * (PROW_RISE - BOAT_MID_DEPTH)
      : BOAT_MID_DEPTH + Math.pow((0.5 - uStation) / 0.5, 2.2) * (STERN_RISE - BOAT_MID_DEPTH);
  const currentDepth = (liveSheerY - liveKeelY).toFixed(2);

  return (
    <div className="flex flex-col w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
      {/* 1. Sleek Top Bar: Camera & Render Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-white">
            TUM NÚP 2 <span className="text-sky-400 font-normal">3D</span>
          </span>
        </div>

        {/* View Angles */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80 text-xs font-mono">
          <span className="text-[10px] text-slate-400 px-1 hidden sm:inline">Góc:</span>
          {(
            [
              { id: '3D_ORBIT', label: '3D' },
              { id: 'TOP', label: 'Top' },
              { id: 'SIDE', label: 'Side' },
              { id: 'FRONT', label: 'Mũi' },
              { id: 'REAR', label: 'Đuôi' },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              id={`btn-view-${v.id.toLowerCase()}`}
              onClick={() => setViewAngle(v.id)}
              className={`px-2 py-0.5 rounded text-[11px] transition ${
                viewAngle === v.id
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Render Modes */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80 text-xs font-mono">
          <span className="text-[10px] text-slate-400 px-1 hidden sm:inline">Chế độ:</span>
          {(
            [
              { id: 'REALISTIC_PBR', label: 'PBR' },
              { id: 'BLUEPRINT_CAD', label: 'CAD' },
              { id: 'STRUCTURAL_KEM', label: 'Kèm' },
              { id: 'CREW_MATRIX', label: '55 VĐV' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              id={`btn-render-${m.id.toLowerCase()}`}
              onClick={() => setRenderMode(m.id)}
              className={`px-2 py-0.5 rounded text-[11px] transition ${
                renderMode === m.id
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main 3D Canvas Area */}
      <div className="relative w-full h-[520px] md:h-[600px] bg-slate-950 select-none overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Minimal Quick Specs Badge at Top-Left */}
        {showSpecsHUD && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 font-mono text-[11px] text-slate-300 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur shadow-xl max-w-[90vw]">
            <Crosshair className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">
              <strong className="text-white">30.20m × 1.16m</strong> <span className="text-amber-400 text-[10px]">[Suy luận]</span> | 55 VĐV <span className="text-emerald-400 text-[10px]">[Xác thực]</span>
            </span>
            <button
              id="btn-open-details-from-hud"
              onClick={() => setIsDetailsModalOpen(true)}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-600/40 text-[10px] font-bold transition ml-1 shrink-0"
            >
              <span>Chi tiết</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              id="btn-hide-specs-hud"
              onClick={() => setShowSpecsHUD(false)}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
              title="Ẩn thông số"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Zoom & Reset Controls at Top-Right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-950/85 p-1 rounded-xl border border-slate-800 backdrop-blur shadow-xl">
          <button
            id="btn-canvas-zoom-in"
            onClick={() => handleZoom(-4)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="btn-canvas-zoom-out"
            onClick={() => handleZoom(4)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="btn-canvas-reset-view"
            onClick={handleResetView}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Đặt lại góc nhìn"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Canvas Interaction Hint */}
        <div className="absolute bottom-3 right-3 pointer-events-none font-mono text-[10px] text-slate-500 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/60 backdrop-blur">
          Xoay 3D: Kéo chuột | Zoom: Cuộn bánh xe
        </div>
      </div>

      {/* 3. Essential Direct Controls Bar at Bottom */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-xs">
        {/* Play/Pause Simulation */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-kinematics"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-md shadow-sky-600/20 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Mô phỏng bơi'}</span>
          </button>
        </div>

        {/* Direct Essential Feature Toggles */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <button
            id="btn-toggle-crew"
            onClick={() => setShowCrew(!showCrew)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
              showCrew
                ? 'bg-slate-800 text-sky-400 border-sky-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>55 VĐV</span>
          </button>

          <button
            id="btn-toggle-water"
            onClick={() => setShowWater(!showWater)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
              showWater
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Mặt nước</span>
          </button>

          <button
            id="btn-toggle-specs-hud"
            onClick={() => setShowSpecsHUD(!showSpecsHUD)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
              showSpecsHUD
                ? 'bg-slate-800 text-amber-400 border-amber-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Thông số</span>
          </button>
        </div>

        {/* Details & Secondary Controls Button */}
        <div>
          <button
            id="btn-open-details-modal"
            onClick={() => setIsDetailsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition text-xs font-mono font-medium"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Chi tiết & Cắt trạm</span>
          </button>
        </div>
      </div>

      {/* 4. Full Technical Details & Station Analysis Modal */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Crosshair className="w-4 h-4" />
                <span>THÔNG SỐ KỸ THUẬT & CẮT TRẠM CAD</span>
              </div>
              <button
                id="btn-close-details-modal"
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-slate-300">
              {/* Live Station CAD Slider */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Mặt phẳng cắt trạm CAD (X-Station):</span>
                  <span className="text-rose-400 font-bold font-mono">
                    Trạm {Math.round((stationSliceMeters / BOAT_LENGTH) * 64)} / 64 ({stationSliceMeters.toFixed(1)}m)
                  </span>
                </div>
                <input
                  id="slider-modal-station-slice"
                  type="range"
                  min="0"
                  max={BOAT_LENGTH}
                  step="0.1"
                  value={stationSliceMeters}
                  onChange={(e) => setStationSliceMeters(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400 text-center">
                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="block text-[10px] text-slate-500">VỊ TRÍ X</span>
                    <strong className="text-white">{stationSliceMeters.toFixed(2)} m</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="block text-[10px] text-slate-500">CHIỀU RỘNG B(x)</span>
                    <strong className="text-sky-400">{currentBeam} m</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="block text-[10px] text-slate-500">CHIỀU CAO D(x)</span>
                    <strong className="text-emerald-400">{currentDepth} m</strong>
                  </div>
                </div>
              </div>

              {/* Stroke Cadence Adjustment */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Tần số nhịp chèo (Cadence SPM):</span>
                  <span className="text-sky-400 font-bold font-mono">{strokeCadenceSPM} SPM</span>
                </div>
                <input
                  id="slider-modal-cadence-spm"
                  type="range"
                  min="60"
                  max="125"
                  step="1"
                  value={strokeCadenceSPM}
                  onChange={(e) => setStrokeCadenceSPM(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Verified vs Inferred Specifications Table */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="font-bold text-white block text-xs border-b border-slate-800 pb-1.5">
                  ĐỐI CHIẾU THÔNG SỐ TUM NÚP 2 (2024)
                </span>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Chiều dài tổng thể (LOA): <strong className="text-white">30.20 m</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Chiều rộng lớn nhất: <strong className="text-white">1.16 m</strong> (Tỷ lệ ~26:1)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Chiều cao mạn giữa: <strong className="text-white">0.48 m</strong> (Máng cong chữ U)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Độ vút Mũi / Đuôi: <strong className="text-white">+1.38m / +1.52m</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Lượng choán nước tính toán: <strong className="text-emerald-400">~5.100 kg</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Biên chế thi đấu thực tế: <strong className="text-sky-400">55 - 58 VĐV</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Cây Kềm suốt dọc thân: <strong className="text-purple-400">24.5m + 5 trụ chống</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/40">KẾT CẤU XÁC NHẬN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-5 py-3 bg-slate-950 border-t border-slate-800">
              <button
                id="btn-modal-close"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
