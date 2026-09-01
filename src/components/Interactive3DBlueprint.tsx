import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TECHNICAL_SECTIONS, COLOR_PALETTE, CREW_ROSTER } from '../data/technicalReferenceData';
import { CrewFormationModal } from './CrewFormationModal';
import { RowingKinematicsController } from './RowingKinematicsController';
import {
  calculateStrokeKinematics,
  getGlobalStrokePhase,
  STROKE_PHASES,
  StrokePhaseInfo,
} from '../utils/rowingKinematics';
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
  MapPin,
  Gauge,
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
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // Start active for instant live demonstration
  const [strokeCadenceSPM, setStrokeCadenceSPM] = useState<number>(105);
  const [globalCycleProgress, setGlobalCycleProgress] = useState<number>(0.0);
  const [currentPhase, setCurrentPhase] = useState<StrokePhaseInfo>(STROKE_PHASES[0]);
  const [phaseProgress, setPhaseProgress] = useState<number>(0.0);
  const [stationSliceMeters, setStationSliceMeters] = useState<number>(15.1);
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showCrew, setShowCrew] = useState<boolean>(true);
  const [showWake, setShowWake] = useState<boolean>(true);
  const [showSpecsHUD, setShowSpecsHUD] = useState<boolean>(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isCrewFormationOpen, setIsCrewFormationOpen] = useState<boolean>(false);

  // References for live animation loop without state recreation lag
  const isPlayingRef = useRef<boolean>(isPlaying);
  const cadenceRef = useRef<number>(strokeCadenceSPM);
  const manualProgressRef = useRef<number>(0.0);
  const accumulatedCycleRef = useRef<number>(0.0);
  const lastTimestampRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    cadenceRef.current = strokeCadenceSPM;
  }, [strokeCadenceSPM]);

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
      const delta = lastTimestampRef.current === 0 ? 0.016 : Math.min(0.1, elapsedTime - lastTimestampRef.current);
      lastTimestampRef.current = elapsedTime;

      // Kinematics cycle calculation
      if (isPlayingRef.current) {
        const spm = cadenceRef.current;
        accumulatedCycleRef.current = (accumulatedCycleRef.current + (delta * spm) / 60) % 1.0;
        manualProgressRef.current = accumulatedCycleRef.current;
      }

      const masterT = manualProgressRef.current;

      // 1. PADDLES MOTION CYCLE (Catch, Drive, Finish, Extraction, Recovery)
      if (paddlesGroupRef.current) {
        paddlesGroupRef.current.children.forEach((paddleMesh) => {
          const uData = paddleMesh.userData;
          if (uData && uData.isPaddle) {
            const kin = calculateStrokeKinematics(masterT, uData.pair, uData.isPort);
            paddleMesh.position.set(
              uData.baseX,
              uData.baseY + kin.immersionY,
              uData.baseZ
            );
            paddleMesh.rotation.set(
              uData.baseRotX + kin.featherRotX,
              uData.baseRotY + kin.bladePitchY,
              kin.strokeAngleZ
            );
          } else if (uData && uData.isSteeringOar) {
            // Steering oar subtle dynamic scull to maintain heading
            paddleMesh.rotation.z = uData.baseRotZ + Math.sin(masterT * Math.PI * 2) * 0.035;
            paddleMesh.rotation.x = uData.baseRotX + Math.cos(masterT * Math.PI * 2) * 0.045;
          }
        });
      }

      // 2. CREW SKELETAL & ARTICULATED TORSO KINEMATICS
      if (crewGroupRef.current) {
        crewGroupRef.current.children.forEach((athleteGroup) => {
          const uData = athleteGroup.userData;
          if (uData && uData.isRower) {
            const kin = calculateStrokeKinematics(masterT, uData.pair, uData.isPort);
            if (uData.upperBody) {
              // Torso bends forward at Catch (+38 deg) and drives back at Finish (-14 deg)
              uData.upperBody.rotation.z = kin.bodyLeanZ;
              uData.upperBody.position.y = kin.torsoElevY;
            }
            if (uData.outsideArm) {
              // Arm extension and catch reach
              uData.outsideArm.rotation.z = -0.52 - kin.armReachX * 0.45 + kin.armPullZ * 0.35;
            }
            if (uData.insideArm) {
              // Arm pull and handle recovery
              uData.insideArm.rotation.z = -0.48 - kin.armReachX * 0.40 + kin.armPullZ * 0.45;
            }
          } else if (uData && uData.isBowLeader) {
            // Bow leader dynamic rhythm bounce on prow
            athleteGroup.position.y = uData.baseY + Math.sin(masterT * Math.PI * 2) * 0.05;
            athleteGroup.rotation.z = uData.baseRotZ + Math.cos(masterT * Math.PI * 2) * 0.10;
          } else if (uData && uData.isMidCommander) {
            // Midship rhythm commander jumping/stamping on central Kềm
            athleteGroup.position.y = uData.baseY + Math.abs(Math.sin(masterT * Math.PI)) * 0.07;
            athleteGroup.rotation.z = Math.sin(masterT * Math.PI * 2) * 0.07;
          } else if (uData && uData.isSteersman) {
            // Steersmen balancing against torque
            athleteGroup.rotation.z = uData.baseRotZ + Math.sin(masterT * Math.PI * 2) * 0.025;
          }
        });
      }

      // 3. BOAT DYNAMIC HEAVE, PITCH & KÈM ELASTIC SURGE
      if (boatGroupRef.current) {
        // Peak forward thrust occurs during Drive phase (0.15 - 0.58)
        const heaveDisplacement = Math.sin(masterT * Math.PI * 2) * 0.028;
        const pitchAngle = Math.cos(masterT * Math.PI * 2 - 0.2) * 0.011; // ~0.65 degrees pitch rocking
        const surgeX = Math.sin(masterT * Math.PI * 2 - 0.3) * 0.035;
        boatGroupRef.current.position.set(surgeX, heaveDisplacement, 0);
        boatGroupRef.current.rotation.z = pitchAngle;
      }

      // 4. Wake splash & spray animation
      if (wakeGroupRef.current) {
        wakeGroupRef.current.visible = showWake;
        const isDrive = masterT >= 0.15 && masterT < 0.60;
        const drivePulse = isDrive ? 1.0 + Math.sin(((masterT - 0.15) / 0.45) * Math.PI) * 0.35 : 0.75;
        wakeGroupRef.current.children.forEach((wakeParticle, wIdx) => {
          const scalePulse = drivePulse * (1.0 + Math.sin(masterT * Math.PI * 2 + wIdx) * 0.15);
          wakeParticle.scale.set(scalePulse, scalePulse, scalePulse);
        });
      }

      // Throttle telemetry update to React state (every 4 frames)
      frameCountRef.current++;
      if (frameCountRef.current % 4 === 0) {
        const info = getGlobalStrokePhase(masterT);
        setGlobalCycleProgress(masterT);
        setCurrentPhase(info.phase);
        setPhaseProgress(info.phaseProgress);
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

        // Color coding for authentic 2024 Tum Núp 2 livery (Royal Blue, Naga Scales, Gold Kbach, Scarlet Trim)
        if (isCAD) {
          outerColors.push(0.22, 0.74, 0.97); // Neon Cyan CAD
        } else if (isKemFocus) {
          outerColors.push(0.18, 0.22, 0.32); // Translucent muted slate
        } else {
          // Authentic Tum Núp 2 Livery
          if (u > 0.94) {
            // Scarlet Red & Gold Prow Tip (Mũi Rồng)
            outerColors.push(0.86, 0.15, 0.15);
          } else if (u < 0.06) {
            // Scarlet Red & Gold Stern Fin Tip (Đuôi Rồng)
            outerColors.push(0.86, 0.15, 0.15);
          } else if ((j <= 1 || j >= SLICES - 1) && halfBeam > 0.1) {
            // Gold Angkor Kbach Scroll Trim along upper Gunwales (#FBBF24)
            outerColors.push(0.98, 0.75, 0.14);
          } else if ((j === 2 || j === SLICES - 2) && halfBeam > 0.1) {
            // Scarlet Red accent pinstripe (#DC2626)
            outerColors.push(0.86, 0.15, 0.15);
          } else if (uCurvature < 0.18) {
            // Bottom Keel & Bilge (Gỗ sao ngâm dầu / Sơn đen chống hà #18181B)
            outerColors.push(0.09, 0.09, 0.11);
          } else {
            // Side Hull: Royal Sapphire Blue (#1D4ED8) with subtle Naga Gold Scale waves
            const scaleWave = Math.sin(u * Math.PI * 48) * Math.cos(angle * 6);
            if (scaleWave > 0.65 && halfBeam > 0.25) {
              // Naga Gold dragon scale highlight (#F59E0B)
              outerColors.push(0.96, 0.62, 0.04);
            } else if (scaleWave > 0.35 && halfBeam > 0.25) {
              // Amber dragon scale transition (#EA580C)
              outerColors.push(0.92, 0.35, 0.05);
            } else {
              // Royal Blue Primary Racing Hull Ground (#1D4ED8)
              outerColors.push(0.11, 0.31, 0.85);
            }
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

    // 3. Build Gunwales Rails & Paddle Pivot Fulcrum Plates (Be Ghe & Nẹp Mép Be)
    buildGunwalesAndFulcrums(parent, mode);

    // 4. Build Inner Keel Spine & Bilge Limber Channel (Sống Đáy & Rãnh Thoát Nước)
    buildHullInteriorDetails(parent, mode);

    // 5. Sacred Dragon Eyes on Bow Flanks & Traditional Tum Núp 2 Ornaments
    if (!isCAD) {
      buildSacredEyes(parent);
      buildTumNup2Ornaments(parent);
    }
  };

  // Helper: Build Gunwale Rails (Mặt Be Ghe) and Wear Plates / Paddle Fulcrum Points (Nẹp Tì Dầm)
  const buildGunwalesAndFulcrums = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const gunwaleMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x7c2d12, // Dark seasoned Hopea wood strake
      roughness: 0.45,
    });
    const wearPlateMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xd97706, // Hardwood friction fulcrum pad
      roughness: 0.35,
      metalness: 0.2,
    });

    const SAMPLES = 80;
    const portGunwalePoints: THREE.Vector3[] = [];
    const stbdGunwalePoints: THREE.Vector3[] = [];

    for (let i = 0; i <= SAMPLES; i++) {
      const u = i / SAMPLES;
      const x = (u - 0.5) * BOAT_LENGTH;
      const beamHere = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const halfB = beamHere / 2;
      const flareRatio = Math.min(1.0, (beamHere / BOAT_MAX_BEAM) * 1.2);
      const zPort = -halfB * (1.0 + flareRatio * FLARE_ANGLE);
      const zStbd = halfB * (1.0 + flareRatio * FLARE_ANGLE);

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.4)
          : BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - u) / 0.5, 2.2);

      portGunwalePoints.push(new THREE.Vector3(x, ySheer, zPort));
      stbdGunwalePoints.push(new THREE.Vector3(x, ySheer, zStbd));
    }

    const portCurve = new THREE.CatmullRomCurve3(portGunwalePoints);
    const stbdCurve = new THREE.CatmullRomCurve3(stbdGunwalePoints);

    const portRailGeo = new THREE.TubeGeometry(portCurve, 80, 0.022, 6, false);
    const stbdRailGeo = new THREE.TubeGeometry(stbdCurve, 80, 0.022, 6, false);

    const portRail = new THREE.Mesh(portRailGeo, gunwaleMat);
    const stbdRail = new THREE.Mesh(stbdRailGeo, gunwaleMat);
    parent.add(portRail);
    parent.add(stbdRail);

    // Add 25 pairs of hardwood fulcrum wear plates along gunwales (Điểm tiếp xúc tì dầm bơi)
    for (let i = 0; i < 25; i++) {
      const u = 0.14 + (i / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const halfB = localBeam / 2;
      const flareRatio = Math.min(1.0, (localBeam / BOAT_MAX_BEAM) * 1.2);
      const zPort = -halfB * (1.0 + flareRatio * FLARE_ANGLE);
      const zStbd = halfB * (1.0 + flareRatio * FLARE_ANGLE);

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.4)
          : BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - u) / 0.5, 2.2);

      const plateGeo = new THREE.BoxGeometry(0.12, 0.03, 0.04);

      const portPlate = new THREE.Mesh(plateGeo, wearPlateMat);
      portPlate.position.set(x, ySheer + 0.01, zPort);
      parent.add(portPlate);

      const stbdPlate = new THREE.Mesh(plateGeo, wearPlateMat);
      stbdPlate.position.set(x, ySheer + 0.01, zStbd);
      parent.add(stbdPlate);
    }
  };

  // Helper: Build Inner Keel Spine & Bilge Limber Trough (Sống Đáy Độc Mộc & Rãnh Ki)
  const buildHullInteriorDetails = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const woodMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x451a03,
      roughness: 0.7,
    });

    // Central inner keel spine bar (Thanh sống đáy độc mộc)
    const spinePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const x = (u - 0.5) * (BOAT_LENGTH - 1.2);
      const keelY =
        u >= 0.5
          ? (PROW_RISE - 0.16) * Math.pow((u - 0.5) / 0.5, 2.8) + 0.04
          : (STERN_RISE - 0.18) * Math.pow((0.5 - u) / 0.5, 2.8) + 0.04;
      spinePoints.push(new THREE.Vector3(x, keelY, 0));
    }
    const spineCurve = new THREE.CatmullRomCurve3(spinePoints);
    const spineGeo = new THREE.TubeGeometry(spineCurve, 60, 0.035, 6, false);
    const spineMesh = new THREE.Mesh(spineGeo, woodMat);
    parent.add(spineMesh);

    // Bow Solid Timber Deadwood Block (Khối gỗ đệm đặc đầu mũi)
    const bowDeadwood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 0.22), woodMat);
    bowDeadwood.position.set(BOAT_LENGTH / 2 - 1.0, 0.85, 0);
    bowDeadwood.rotation.z = -0.32;
    parent.add(bowDeadwood);

    // Stern Solid Timber Deadwood Block (Khối gỗ đệm đặc đuôi lái)
    const sternDeadwood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.32, 0.25), woodMat);
    sternDeadwood.position.set(-BOAT_LENGTH / 2 + 1.1, 0.95, 0);
    sternDeadwood.rotation.z = 0.38;
    parent.add(sternDeadwood);
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

  // Helper: Build Authentic Tum Núp 2 Ornaments (Prow Naga Head Crest, Flame Horns, Flag, Stern Tail Fin & Nameplates)
  const buildTumNup2Ornaments = (parent: THREE.Group) => {
    const goldOrnamentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Angkor Imperial Gold
      roughness: 0.28,
      metalness: 0.65,
    });
    const scarletMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Temple Scarlet Red
      roughness: 0.35,
      metalness: 0.2,
    });
    const woodFlagMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
    });

    // 1. PROW NAGA HEAD CREST & FLAME HORNS (Kbach Kranok)
    const prowGroup = new THREE.Group();
    prowGroup.position.set(BOAT_LENGTH / 2 - 0.25, 1.34, 0);

    // Naga Snout & Crown
    const nagaCrownGeo = new THREE.ConeGeometry(0.09, 0.42, 8);
    nagaCrownGeo.rotateZ(-Math.PI / 3.2);
    const nagaCrown = new THREE.Mesh(nagaCrownGeo, goldOrnamentMat);
    nagaCrown.position.set(0.12, 0.16, 0);
    prowGroup.add(nagaCrown);

    // Scarlet Flame Beard / Under-crest
    const flameBeardGeo = new THREE.ConeGeometry(0.06, 0.28, 6);
    flameBeardGeo.rotateZ(Math.PI / 4);
    const flameBeard = new THREE.Mesh(flameBeardGeo, scarletMat);
    flameBeard.position.set(0.05, -0.10, 0);
    prowGroup.add(flameBeard);

    // Left & Right Flame Horns (Kbach Horns)
    [-0.07, 0.07].forEach((zHorn) => {
      const hornGeo = new THREE.CylinderGeometry(0.015, 0.035, 0.32, 6);
      const hornMesh = new THREE.Mesh(hornGeo, goldOrnamentMat);
      hornMesh.position.set(-0.08, 0.22, zHorn);
      hornMesh.rotation.z = -0.65;
      hornMesh.rotation.x = zHorn > 0 ? 0.35 : -0.35;
      prowGroup.add(hornMesh);
    });

    // Ceremonial Prow Flag Pole & Triangular Banner
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.75, 8), woodFlagMat);
    flagPole.position.set(-0.35, 0.35, 0);
    flagPole.rotation.z = -0.18;
    prowGroup.add(flagPole);

    // Triangular Banner (Vàng viền đỏ truyền thống Tum Núp)
    const bannerShape = new THREE.Shape();
    bannerShape.moveTo(0, 0);
    bannerShape.lineTo(0.28, -0.09);
    bannerShape.lineTo(0, -0.18);
    bannerShape.closePath();

    const bannerGeo = new THREE.ShapeGeometry(bannerShape);
    const bannerMesh = new THREE.Mesh(bannerGeo, goldOrnamentMat);
    bannerMesh.position.set(-0.35, 0.65, 0.005);
    bannerMesh.rotation.z = 0.12;
    prowGroup.add(bannerMesh);

    parent.add(prowGroup);

    // 2. STERN NAGA TAIL FIN (Uốn lượn cong vút +1.52m)
    const sternGroup = new THREE.Group();
    sternGroup.position.set(-BOAT_LENGTH / 2 + 0.30, 1.46, 0);

    // Curving Swept-up Naga Tail Fin
    const tailPoints: THREE.Vector3[] = [
      new THREE.Vector3(0.0, 0.0, 0),
      new THREE.Vector3(-0.25, 0.28, 0),
      new THREE.Vector3(-0.45, 0.58, 0),
      new THREE.Vector3(-0.52, 0.85, 0),
    ];
    const tailCurve = new THREE.CatmullRomCurve3(tailPoints);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 16, 0.045, 8, false);
    const tailMesh = new THREE.Mesh(tailGeo, goldOrnamentMat);
    sternGroup.add(tailMesh);

    // Scarlet Flame Plumage on Tail Top
    const tailFeatherGeo = new THREE.ConeGeometry(0.08, 0.35, 6);
    tailFeatherGeo.rotateZ(Math.PI / 6);
    const tailFeather = new THREE.Mesh(tailFeatherGeo, scarletMat);
    tailFeather.position.set(-0.54, 0.95, 0);
    sternGroup.add(tailFeather);

    parent.add(sternGroup);

    // 3. TEAM IDENTIFICATION DECALS ("TUM NÚP 2" on Bow Flanks)
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Sapphire plate backing
      roughness: 0.3,
    });
    const textBorderMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Gold border
      roughness: 0.2,
      metalness: 0.8,
    });

    [-1, 1].forEach((sideSign) => {
      const zOffset = sideSign * 0.22;
      const decalGroup = new THREE.Group();
      decalGroup.position.set(BOAT_LENGTH / 2 - 3.2, 0.82, zOffset);
      decalGroup.rotation.y = sideSign * 0.08;

      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.02), plateMat);
      decalGroup.add(plate);

      const border = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.18, 0.015), textBorderMat);
      border.position.z = -sideSign * 0.005;
      decalGroup.add(border);

      // Gold stylized text block representing "TUM NÚP 2"
      const textBlock = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.09, 0.025), goldOrnamentMat);
      textBlock.position.z = sideSign * 0.01;
      decalGroup.add(textBlock);

      parent.add(decalGroup);
    });
  };

  // Helper: Build 48 Internal Transverse Ribs (Cong Ghe)
  const buildTransverseRibs = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const ribMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x78350f, // Seasoned Hopea / Sao timber
      roughness: 0.65,
    });
    const pegMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xd97706, // Wooden trunnel dowel pins
      roughness: 0.4,
    });

    for (let k = 1; k < 48; k++) {
      const u = k / 48;
      const x = (u - 0.5) * BOAT_LENGTH;
      const rawBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const beamHere = Math.max(0.08, rawBeam * 0.92);
      const halfB = beamHere / 2;

      const keelY =
        u >= 0.5
          ? (PROW_RISE - 0.16) * Math.pow((u - 0.5) / 0.5, 2.8) + 0.04
          : (STERN_RISE - 0.18) * Math.pow((0.5 - u) / 0.5, 2.8) + 0.04;

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.4)
          : BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - u) / 0.5, 2.2);

      // Authentic U-shaped frame curve hugging the monoxyle hull bottom
      const ribPoints: THREE.Vector3[] = [];
      const PTS = 16;
      for (let p = 0; p <= PTS; p++) {
        const v = p / PTS; // 0 (Port top) -> 0.5 (Bottom keel) -> 1.0 (Starboard top)
        const angle = (v - 0.5) * Math.PI;
        const z = Math.sin(angle) * halfB;
        const uCurv = Math.pow(Math.abs(Math.sin(angle)), 1.6);
        const y = keelY + uCurv * (ySheer - keelY) * 0.92;
        ribPoints.push(new THREE.Vector3(x, y, z));
      }

      const ribCurve = new THREE.CatmullRomCurve3(ribPoints);
      const ribGeo = new THREE.TubeGeometry(ribCurve, 16, 0.016, 6, false);
      const ribMesh = new THREE.Mesh(ribGeo, ribMat);
      parent.add(ribMesh);

      // Trunnel dowel pins at Port and Starboard gunwale joints
      if (halfB > 0.15) {
        const pegGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6);
        const portPeg = new THREE.Mesh(pegGeo, pegMat);
        portPeg.position.set(x, ySheer - 0.03, -halfB);
        parent.add(portPeg);

        const stbdPeg = new THREE.Mesh(pegGeo, pegMat);
        stbdPeg.position.set(x, ySheer - 0.03, halfB);
        parent.add(stbdPeg);
      }
    }
  };

  // Helper: Build 26 Seating Thwarts (Đòn Ngồi) + 25 Footrest Chocks (Thanh Giậm Chân) + Bow/Stern Tie-Beams
  const buildSeatingThwarts = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const thwartMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0x92400e, // Polished hardwood thwart
      roughness: 0.45,
    });
    const chockMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x5c2b09, // Footrest brace timber
      roughness: 0.6,
    });
    const tieMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0ea5e9 : 0x78350f, // Structural tie-beam
      roughness: 0.5,
    });

    // 1. 26 Primary Seating Thwarts (Đòn Ngồi)
    for (let k = 0; k < 26; k++) {
      const u = 0.14 + (k / 25) * 0.68; // Spanned across rowers zone
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = Math.max(0.18, BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25) * 0.96);
      const halfB = localBeam / 2;

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.4)
          : BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - u) / 0.5, 2.2);

      const keelY =
        u >= 0.5
          ? (PROW_RISE - 0.16) * Math.pow((u - 0.5) / 0.5, 2.8) + 0.04
          : (STERN_RISE - 0.18) * Math.pow((0.5 - u) / 0.5, 2.8) + 0.04;

      // Cross-thwart beam with mortise notches over gunwales
      const thwartGeo = new THREE.BoxGeometry(0.08, 0.042, localBeam + 0.05);
      const thwart = new THREE.Mesh(thwartGeo, thwartMat);
      thwart.position.set(x, ySheer - 0.035, 0);
      thwart.castShadow = true;
      thwart.receiveShadow = true;
      parent.add(thwart);

      // 2. Footrest Chocks (Thanh Giậm Chân Tì Lực) placed on floor ahead of thwart
      if (k < 25) {
        const xChock = x + 0.36; // 36cm forward of seat
        const chockGeo = new THREE.BoxGeometry(0.05, 0.035, Math.max(0.14, localBeam * 0.72));
        const chock = new THREE.Mesh(chockGeo, chockMat);
        chock.position.set(xChock, keelY + 0.035, 0);
        chock.rotation.z = -0.22; // Angled foot push wedge
        chock.castShadow = true;
        parent.add(chock);
      }
    }

    // 3. Forward Bow Bracing Tie-Beams (4 thanh giằng liên kết mũi)
    for (let b = 1; b <= 4; b++) {
      const uBow = 0.84 + b * 0.035;
      const xB = (uBow - 0.5) * BOAT_LENGTH;
      const wB = Math.max(0.08, BOAT_MAX_BEAM * Math.pow(Math.sin(uBow * Math.PI), 1.25));
      const yB = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((uBow - 0.5) / 0.5, 2.4);
      const tieGeo = new THREE.BoxGeometry(0.05, 0.03, wB);
      const tieMesh = new THREE.Mesh(tieGeo, tieMat);
      tieMesh.position.set(xB, yB - 0.03, 0);
      parent.add(tieMesh);
    }

    // 4. Aft Stern Bracing Tie-Beams (3 thanh giằng liên kết đuôi)
    for (let s = 1; s <= 3; s++) {
      const uStern = 0.12 - s * 0.03;
      if (uStern > 0.02) {
        const xS = (uStern - 0.5) * BOAT_LENGTH;
        const wS = Math.max(0.08, BOAT_MAX_BEAM * Math.pow(Math.sin(uStern * Math.PI), 1.25));
        const yS = BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - uStern) / 0.5, 2.2);
        const tieGeo = new THREE.BoxGeometry(0.05, 0.03, wS);
        const tieMesh = new THREE.Mesh(tieGeo, tieMat);
        tieMesh.position.set(xS, yS - 0.03, 0);
        parent.add(tieMesh);
      }
    }
  };

  // Helper: Build Master Kèm Longitudinal Spring-Truss System (Cây Kềm Suốt + 5 Trụ Kềm + Cáp néo tăng đơ + Cần câu lái)
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

    // 1. Primary Round Hopea/Cajun Timber Pole (Cây Kềm Suốt - 24.6m, Ø 0.19m)
    const kemPoleGeo = new THREE.CylinderGeometry(0.095, 0.095, 24.6, 20);
    kemPoleGeo.rotateZ(Math.PI / 2);
    const kemPole = new THREE.Mesh(kemPoleGeo, kemMat);
    kemPole.position.set(0.2, 0.24, 0);
    kemPole.castShadow = true;
    parent.add(kemPole);

    // 2. Secondary Aft Cantilever Lever (Cần Câu Lái - Uốn cong dằn lực đuôi)
    const aftKemPoints: THREE.Vector3[] = [
      new THREE.Vector3(-12.0, 0.24, 0),
      new THREE.Vector3(-13.2, 0.45, 0),
      new THREE.Vector3(-14.2, 0.78, 0),
    ];
    const aftKemCurve = new THREE.CatmullRomCurve3(aftKemPoints);
    const aftKemGeo = new THREE.TubeGeometry(aftKemCurve, 16, 0.05, 8, false);
    const aftKemMesh = new THREE.Mesh(aftKemGeo, kemMat);
    parent.add(aftKemMesh);

    // 3. 5 Strategic Vertical Compression Struts (Trụ Kềm)
    const strutPositions = [
      { x: 8.5, height: 0.34, label: 'Trụ Kềm Mũi' },
      { x: 4.2, height: 0.42, label: 'Trụ Kềm Thân Trước' },
      { x: 0.0, height: 0.46, label: 'Trụ Kềm Giữa (Bệ Chỉ Huy)' },
      { x: -4.5, height: 0.42, label: 'Trụ Kềm Thân Sau' },
      { x: -9.0, height: 0.36, label: 'Trụ Kềm Lái' },
    ];

    strutPositions.forEach((strut) => {
      const sGeo = new THREE.CylinderGeometry(0.048, 0.052, strut.height, 14);
      const sMesh = new THREE.Mesh(sGeo, strutMat);
      sMesh.position.set(strut.x, 0.12 + strut.height / 2, 0);
      sMesh.castShadow = true;
      parent.add(sMesh);

      // Steel brackets at base and top
      const bracketGeo = new THREE.BoxGeometry(0.13, 0.035, 0.13);
      const bracketTop = new THREE.Mesh(bracketGeo, turnbuckleMat);
      bracketTop.position.set(strut.x, 0.12 + strut.height, 0);
      parent.add(bracketTop);
    });

    // 4. Central Commander Platform atop Middle Kềm Strut (Bệ Đứng Chỉ Huy Giữa)
    const platGeo = new THREE.BoxGeometry(0.38, 0.045, 0.44);
    const platform = new THREE.Mesh(platGeo, strutMat);
    platform.position.set(0.0, 0.60, 0);
    parent.add(platform);

    // 5. Pre-stressed High-Tensile Steel Cable & Turnbuckles
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12.2, 0.22, 0),
      new THREE.Vector3(-9.0, 0.48, 0),
      new THREE.Vector3(-4.5, 0.54, 0),
      new THREE.Vector3(0.0, 0.58, 0),
      new THREE.Vector3(4.2, 0.54, 0),
      new THREE.Vector3(8.5, 0.46, 0),
      new THREE.Vector3(12.2, 0.24, 0),
    ]);

    const cableTubeGeo = new THREE.TubeGeometry(cableCurve, 40, 0.014, 8, false);
    const cableMesh = new THREE.Mesh(cableTubeGeo, cableMat);
    parent.add(cableMesh);

    // 6. Dual Turnbuckles (Tăng Đơ Siết Lực Néo)
    [-10.5, 10.5].forEach((tbX) => {
      const tbGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.24, 12);
      tbGeo.rotateZ(Math.PI / 2);
      const tb = new THREE.Mesh(tbGeo, turnbuckleMat);
      tb.position.set(tbX, 0.32, 0);
      parent.add(tb);
    });
  };

  // Helper: Build 50 Leaf Paddles (Dầm bơi lá muỗng) + 3 Long Steering Oars (Dầm lái 3m) resting on Gunwales
  const buildAuthenticPaddles = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const isCrewMode = mode === 'CREW_MATRIX';

    const shaftMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0x78350f, // Hopea wood shaft
      roughness: 0.4,
    });

    const portBladeMat = new THREE.MeshStandardMaterial({
      color: isCrewMode ? 0x0284c7 : isCAD ? 0x0284c7 : 0xd97706, // Amber lacquered teardrop blade with red tip
      roughness: 0.3,
      metalness: 0.1,
    });

    const stbdBladeMat = new THREE.MeshStandardMaterial({
      color: isCrewMode ? 0x059669 : isCAD ? 0x0284c7 : 0xd97706,
      roughness: 0.3,
      metalness: 0.1,
    });

    const paddleTipMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xdc2626, // Authentic Tum Núp 2 Scarlet Red Tip Accent
      roughness: 0.35,
    });

    const steeringShaftMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0xf43f5e : 0x451a03,
      roughness: 0.3,
    });

    const steeringBladeMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0xf43f5e : 0xdc2626, // Scarlet red steering blade
      roughness: 0.35,
    });

    // 50 Standard Racing Paddles (25 pairs) pivoting directly on Gunwales
    for (let pair = 1; pair <= 25; pair++) {
      const u = 0.82 - ((pair - 1) / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const halfB = localBeam / 2;
      const flareRatio = Math.min(1.0, (localBeam / BOAT_MAX_BEAM) * 1.2);
      const zPortGunwale = -halfB * (1.0 + flareRatio * FLARE_ANGLE);
      const zStbdGunwale = halfB * (1.0 + flareRatio * FLARE_ANGLE);

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.4)
          : BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - u) / 0.5, 2.2);

      // Port Paddle (Mạn Trái) — Shaft gripped by port rower & rests on port gunwale
      const portGroup = new THREE.Group();
      const portShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.30, 10), shaftMat);
      const portBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.50, 0.18), portBladeMat);
      portBlade.position.y = -0.33;
      const portTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.182), paddleTipMat);
      portTip.position.y = -0.62;
      const portSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.60, 6), shaftMat);
      portSpine.position.set(0.011, -0.38, 0);
      portGroup.add(portShaft);
      portGroup.add(portBlade);
      portGroup.add(portTip);
      portGroup.add(portSpine);
      // Pivot directly on port gunwale contact point
      portGroup.position.set(x, ySheer + 0.02, zPortGunwale);
      portGroup.rotation.x = -0.42;
      portGroup.rotation.z = 0.18; // Catch angle
      portGroup.rotation.y = -0.10;
      portGroup.userData = {
        isPaddle: true,
        isPort: true,
        pair,
        baseX: x,
        baseY: ySheer + 0.02,
        baseZ: zPortGunwale,
        baseRotX: -0.42,
        baseRotY: -0.10,
        baseRotZ: 0.18,
      };
      parent.add(portGroup);

      // Starboard Paddle (Mạn Phải) — Shaft gripped by starboard rower & rests on starboard gunwale
      const stbdGroup = new THREE.Group();
      const stbdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.30, 10), shaftMat);
      const stbdBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.50, 0.18), stbdBladeMat);
      stbdBlade.position.y = -0.33;
      const stbdTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.182), paddleTipMat);
      stbdTip.position.y = -0.62;
      const stbdSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.60, 6), shaftMat);
      stbdSpine.position.set(-0.011, -0.38, 0);
      stbdGroup.add(stbdShaft);
      stbdGroup.add(stbdBlade);
      stbdGroup.add(stbdTip);
      stbdGroup.add(stbdSpine);
      // Pivot directly on starboard gunwale contact point
      stbdGroup.position.set(x, ySheer + 0.02, zStbdGunwale);
      stbdGroup.rotation.x = 0.42;
      stbdGroup.rotation.z = 0.18; // Catch angle
      stbdGroup.rotation.y = 0.10;
      stbdGroup.userData = {
        isPaddle: true,
        isPort: false,
        pair,
        baseX: x,
        baseY: ySheer + 0.02,
        baseZ: zStbdGunwale,
        baseRotX: 0.42,
        baseRotY: 0.10,
        baseRotZ: 0.18,
      };
      parent.add(stbdGroup);
    }

    // 3 Long Steering Oars (Dầm Lái - 3.1m) at Stern resting on aft gunwales
    const steerPositions = [
      { x: -11.80, y: 1.02, z: 0.16, rotX: 0.22, rotZ: -0.68 },
      { x: -12.60, y: 1.14, z: -0.16, rotX: -0.22, rotZ: -0.68 },
      { x: -13.50, y: 1.28, z: 0.00, rotX: 0.00, rotZ: -0.72 },
    ];

    steerPositions.forEach((st) => {
      const steerGroup = new THREE.Group();
      const steerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.10, 12), steeringShaftMat);
      const steerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.10, 0.22), steeringBladeMat);
      steerBlade.position.y = -1.05;
      steerGroup.add(steerShaft);
      steerGroup.add(steerBlade);
      steerGroup.position.set(st.x, st.y + 0.05, st.z);
      steerGroup.rotation.z = st.rotZ;
      steerGroup.rotation.x = st.rotX;
      steerGroup.userData = {
        isSteeringOar: true,
        baseX: st.x,
        baseY: st.y + 0.05,
        baseZ: st.z,
        baseRotZ: st.rotZ,
        baseRotX: st.rotX,
      };
      parent.add(steerGroup);
    });
  };

  // Helper: Build Full 55-Athlete Championship Crew Structure (1 Mũi + 1 Giữa + 50 Bơi + 3 Lái)
  const buildAuthenticCrew = (parent: THREE.Group, mode: RenderMode) => {
    const isCrewMode = mode === 'CREW_MATRIX';

    // Materials
    const defaultJerseyMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Tum Núp 2 Official Royal Blue Jersey
      roughness: 0.6,
    });
    const portJerseyMat = new THREE.MeshStandardMaterial({
      color: isCrewMode ? 0x0284c7 : 0x1d4ed8, // Sky blue in diagram mode
      emissive: isCrewMode ? 0x0369a1 : 0x000000,
      roughness: 0.5,
    });
    const stbdJerseyMat = new THREE.MeshStandardMaterial({
      color: isCrewMode ? 0x059669 : 0x1d4ed8, // Emerald green in diagram mode
      emissive: isCrewMode ? 0x047857 : 0x000000,
      roughness: 0.5,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xc68642, // Healthy sun-tanned skin
      roughness: 0.7,
    });
    const headbandMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Yellow victory headband
      roughness: 0.4,
    });
    const bowLeaderMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Gold/Amber leader outfit
      emissive: isCrewMode ? 0xb45309 : 0x451a03,
      roughness: 0.4,
    });
    const midLeaderMat = new THREE.MeshStandardMaterial({
      color: 0xea580c, // Flame orange whistle master
      emissive: isCrewMode ? 0xc2410c : 0x431407,
      roughness: 0.4,
    });
    const steerMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Crimson red steersman
      emissive: isCrewMode ? 0x991b1b : 0x450a0a,
      roughness: 0.4,
    });

    // Helper: Create authentic Ghe Ngo seated rower model with articulated joints
    const createRowerMesh = (jerseyMaterial: THREE.Material, isPort: boolean, pair: number) => {
      const athlete = new THREE.Group();

      // Lower body (Pelvis base and braced legs fixed on thwart)
      const lowerGroup = new THREE.Group();
      const legGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.30, 8);

      // Front braced leg
      const frontLeg = new THREE.Mesh(legGeo, skinMat);
      frontLeg.position.set(0.12, -0.06, isPort ? -0.09 : 0.09);
      frontLeg.rotation.z = 0.65;
      lowerGroup.add(frontLeg);

      // Rear tucked leg
      const rearLeg = new THREE.Mesh(legGeo, skinMat);
      rearLeg.position.set(0.02, -0.08, isPort ? 0.08 : -0.08);
      rearLeg.rotation.z = 0.35;
      lowerGroup.add(rearLeg);
      athlete.add(lowerGroup);

      // Upper body group (Pivoting around the hip joint for authentic forward lean / backward drive)
      const upperBody = new THREE.Group();
      upperBody.position.set(0, 0.0, 0);

      // Torso with authentic racing proportion
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.28), jerseyMaterial);
      torso.position.y = 0.21;
      torso.castShadow = true;
      upperBody.add(torso);

      // Head with headband
      const headGroup = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 14), skinMat);
      head.position.set(0.04, 0.48, 0);
      head.castShadow = true;
      headGroup.add(head);

      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 14), headbandMat);
      headband.position.set(0.04, 0.49, 0);
      headband.rotation.x = Math.PI / 2;
      headGroup.add(headband);
      upperBody.add(headGroup);

      // Arms: Outside arm grips lower shaft, inside arm grips upper handle
      const armGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.34, 8);

      // Outside arm (Left for Port, Right for Starboard)
      const outsideArm = new THREE.Mesh(armGeo, skinMat);
      outsideArm.position.set(0.14, 0.20, isPort ? -0.14 : 0.14);
      outsideArm.rotation.x = isPort ? -0.45 : 0.45;
      outsideArm.rotation.z = -0.52;
      upperBody.add(outsideArm);

      // Inside arm reaching forward across
      const insideArm = new THREE.Mesh(armGeo, skinMat);
      insideArm.position.set(0.12, 0.24, isPort ? 0.12 : -0.12);
      insideArm.rotation.x = isPort ? 0.35 : -0.35;
      insideArm.rotation.z = -0.48;
      upperBody.add(insideArm);

      athlete.add(upperBody);

      athlete.userData = {
        isRower: true,
        isPort,
        pair,
        upperBody,
        outsideArm,
        insideArm,
        headGroup,
      };

      return athlete;
    };

    // Helper: Create standing/kneeling conductor or steersman
    const createStandingAthlete = (roleMaterial: THREE.Material, isKneeling = false) => {
      const athlete = new THREE.Group();

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.44, 0.28), roleMaterial);
      torso.position.y = 0.22;
      torso.castShadow = true;
      athlete.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 14), skinMat);
      head.position.set(isKneeling ? 0.04 : 0.0, 0.50, 0);
      head.castShadow = true;
      athlete.add(head);

      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 14), headbandMat);
      headband.position.set(isKneeling ? 0.04 : 0.0, 0.51, 0);
      headband.rotation.x = Math.PI / 2;
      athlete.add(headband);

      // Arms
      const armGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.34, 8);
      const armL = new THREE.Mesh(armGeo, skinMat);
      armL.position.set(0.10, 0.22, 0.14);
      armL.rotation.x = 0.30;
      armL.rotation.z = -0.35;
      athlete.add(armL);

      const armR = new THREE.Mesh(armGeo, skinMat);
      armR.position.set(0.10, 0.22, -0.14);
      armR.rotation.x = -0.30;
      armR.rotation.z = -0.35;
      athlete.add(armR);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.045, 0.045, isKneeling ? 0.26 : 0.42, 8);
      const legL = new THREE.Mesh(legGeo, skinMat);
      legL.position.set(isKneeling ? 0.08 : 0.0, isKneeling ? -0.06 : -0.18, 0.09);
      legL.rotation.z = isKneeling ? 0.55 : 0.08;
      athlete.add(legL);

      const legR = new THREE.Mesh(legGeo, skinMat);
      legR.position.set(isKneeling ? 0.08 : 0.0, isKneeling ? -0.06 : -0.18, -0.09);
      legR.rotation.z = isKneeling ? 0.55 : -0.08;
      athlete.add(legR);

      return athlete;
    };

    // Helper: 3D station badge maker for CREW_MATRIX mode
    const createStationBadge = (text: string, colorHex: number) => {
      const badgeGroup = new THREE.Group();
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.08, 0.02),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      badgeGroup.add(plate);
      badgeGroup.position.y = 0.72;
      return badgeGroup;
    };

    // 1. Bow Commander (Chỉ huy mũi - Station #1) at Prow Platform
    const bowCommander = createStandingAthlete(bowLeaderMat, true);
    bowCommander.position.set(13.60, 1.15, 0);
    bowCommander.rotation.z = 0.26; // Leaning forward leading cadence
    bowCommander.userData = {
      isBowLeader: true,
      baseX: 13.60,
      baseY: 1.15,
      baseZ: 0,
      baseRotZ: 0.26,
    };
    if (isCrewMode) {
      bowCommander.add(createStationBadge('MŨI', 0xf59e0b));
    }
    parent.add(bowCommander);

    // 2. 50 Paired Rowers (25 Pairs on Thwarts - Stations #2 to #51)
    for (let pair = 1; pair <= 25; pair++) {
      const u = 0.82 - ((pair - 1) / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const halfB = localBeam / 2;
      const lateralAthleteZ = halfB * 0.48;

      const tBow = u >= 0.5 ? (u - 0.5) / 0.5 : (0.5 - u) / 0.5;
      const yPos = 0.48 + Math.pow(tBow, 2.2) * 0.16;

      // Port Rower (Mạn Trái - Station 2*pair)
      const portRower = createRowerMesh(portJerseyMat, true, pair);
      portRower.position.set(x, yPos, -lateralAthleteZ);
      portRower.rotation.y = -0.12; // Torso angled slightly toward port gunwale
      if (isCrewMode && pair % 2 !== 0) {
        portRower.add(createStationBadge(`C${pair}`, 0x0284c7));
      }
      parent.add(portRower);

      // Starboard Rower (Mạn Phải - Station 2*pair + 1)
      const stbdRower = createRowerMesh(stbdJerseyMat, false, pair);
      stbdRower.position.set(x, yPos, lateralAthleteZ);
      stbdRower.rotation.y = 0.12; // Torso angled slightly toward starboard gunwale
      if (isCrewMode && pair % 2 !== 0) {
        stbdRower.add(createStationBadge(`C${pair}`, 0x059669));
      }
      parent.add(stbdRower);
    }

    // 3. Central Whistle Commander (Chỉ huy còi giữa - Station #52) atop Central Kềm Bridge
    const midCommander = createStandingAthlete(midLeaderMat, false);
    midCommander.position.set(0.0, 0.85, 0);
    midCommander.userData = {
      isMidCommander: true,
      baseX: 0.0,
      baseY: 0.85,
      baseZ: 0,
    };
    if (isCrewMode) {
      midCommander.add(createStationBadge('GIỮA', 0xea580c));
    }
    parent.add(midCommander);

    // 4. 3 Steersmen (Tổ Lái Đuôi - Stations #53, #54, #55) in stepped aft formation
    const steersmenConfig = [
      { x: -11.80, y: 1.02, z: 0.14, rotZ: -0.12, label: 'LÁI 1' },
      { x: -12.60, y: 1.14, z: -0.14, rotZ: -0.15, label: 'LÁI 2' },
      { x: -13.50, y: 1.28, z: 0.00, rotZ: -0.18, label: 'LÁI 3' },
    ];

    steersmenConfig.forEach((st) => {
      const steersman = createStandingAthlete(steerMat, false);
      steersman.position.set(st.x, st.y, st.z);
      steersman.rotation.z = st.rotZ;
      steersman.userData = {
        isSteersman: true,
        baseX: st.x,
        baseY: st.y,
        baseZ: st.z,
        baseRotZ: st.rotZ,
      };
      if (isCrewMode) {
        steersman.add(createStationBadge(st.label, 0xdc2626));
      }
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

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleChangeCadence = useCallback((spm: number) => {
    setStrokeCadenceSPM(spm);
  }, []);

  const handleScrubCycle = useCallback((progress: number) => {
    manualProgressRef.current = progress;
    accumulatedCycleRef.current = progress;
    setGlobalCycleProgress(progress);
    const info = getGlobalStrokePhase(progress);
    setCurrentPhase(info.phase);
    setPhaseProgress(info.phaseProgress);
  }, []);

  const handleStepPhase = useCallback(
    (direction: 'prev' | 'next') => {
      const currentIndex = STROKE_PHASES.findIndex((p) => p.id === currentPhase.id);
      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= STROKE_PHASES.length) nextIndex = 0;
      if (nextIndex < 0) nextIndex = STROKE_PHASES.length - 1;
      const targetPhase = STROKE_PHASES[nextIndex];
      handleScrubCycle(targetPhase.range[0]);
    },
    [currentPhase.id, handleScrubCycle]
  );

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
              { id: 'CREW_MATRIX', label: 'Đội hình 3D' },
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
          <button
            id="btn-open-formation-top"
            onClick={() => setIsCrewFormationOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600/40 transition font-bold"
            title="Mở Sơ đồ đội hình 55 VĐV chi tiết"
          >
            <Users className="w-3 h-3 text-sky-400" />
            <span>Sơ đồ 2D</span>
          </button>
        </div>
      </div>

      {/* 2. Main 3D Canvas Area */}
      <div className="relative w-full h-[480px] md:h-[540px] bg-slate-950 select-none overflow-hidden">
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

      {/* 3. Specialized 5-Phase Rowing Kinematics Controller & SPM Dial */}
      <RowingKinematicsController
        isPlaying={isPlaying}
        strokeCadenceSPM={strokeCadenceSPM}
        cycleProgress={globalCycleProgress}
        currentPhase={currentPhase}
        phaseProgress={phaseProgress}
        onTogglePlay={handleTogglePlay}
        onChangeCadence={handleChangeCadence}
        onScrubCycle={handleScrubCycle}
        onStepPhase={handleStepPhase}
      />

      {/* 4. Essential Direct Controls Bar at Bottom */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-xs">
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
            <span>55 VĐV ({showCrew ? 'Hiện' : 'Ẩn'})</span>
          </button>

          <button
            id="btn-open-crew-formation-bottom"
            onClick={() => setIsCrewFormationOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border-sky-600/40 transition font-bold"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Sơ đồ 55 VĐV (2D)</span>
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
            <span>Thông số HUD</span>
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
            <span>Chi tiết cấu trúc & Cắt trạm</span>
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
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-white text-xs">
                    KIỂM TOÁN CẤU TRÚC GHE NGO TUM NÚP 2
                  </span>
                  <span className="text-[10px] text-slate-400">Nguồn: Thực tế & Đo đạc hiện trường</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Chiều dài tổng thể (LOA): <strong className="text-white">30.20 m</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Chiều rộng lớn nhất (Beam max): <strong className="text-white">1.16 m</strong> (Mạn thon tỷ lệ ~26:1)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Độ sâu mạn giữa (Depth mid): <strong className="text-white">0.48 m</strong> (Lòng máng chữ U)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Độ vút Mũi / Đuôi: <strong className="text-white">+1.38 m / +1.52 m</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40">XẤP XỈ / SUY LUẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>26 Đòn ngồi ngang (Băng ngồi 2 người): <strong className="text-emerald-400">Gỗ căm xe khóa mộng be</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Cây Kềm suốt dọc thân: <strong className="text-purple-400">24.5 m (Ø 0.19m) + 5 trụ chống vòm</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/40">KẾT CẤU XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Cần câu lái (Kềm đuôi triệt vặn): <strong className="text-purple-400">Thanh gỗ dằn lực đuôi</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/40">KẾT CẤU XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>48 Khung sườn Cong Ghe (Transverse Ribs): <strong className="text-white">Gỗ sao uốn chữ U</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>25 Thanh chốt đạp chân (Footrest chocks): <strong className="text-white">Gá đáy vát 22°</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Biên chế VĐV: <strong className="text-sky-400">55 người (1 Mũi + 1 Giữa + 50 Bơi + 3 Lái)</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Mái chèo búp sen (1.30m) & Điểm tì nẹp be: <strong className="text-white">Đòn bẩy tì mạn</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Lực căng néo cáp Kềm (Pre-stress kN): <strong className="text-slate-400">~12 - 18 kN khi đua</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-rose-300 border border-rose-500/40 font-bold">CHƯA XÁC ĐỊNH</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                    <span>Đường kính chốt mộng chìm (Trunnel pin): <strong className="text-slate-400">~12 - 16 mm</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-rose-300 border border-rose-500/40 font-bold">CHƯA XÁC ĐỊNH</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Độ dày lớp composite gia cường vỏ ngoài: <strong className="text-slate-400">1.8 - 2.5 mm</strong></span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-rose-300 border border-rose-500/40 font-bold">CHƯA XÁC ĐỊNH</span>
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

      {/* 5. Interactive 55-Athlete Crew Formation Diagram Modal (Sơ đồ đội hình 55 VĐV) */}
      <CrewFormationModal
        isOpen={isCrewFormationOpen}
        onClose={() => setIsCrewFormationOpen(false)}
      />
    </div>
  );
};
