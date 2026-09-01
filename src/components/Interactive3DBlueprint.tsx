import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CrewFormationModal } from './CrewFormationModal';
import {
  calculateStrokeKinematics,
  getGlobalStrokePhase,
} from '../utils/rowingKinematics';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Settings2,
  Camera,
  Play,
  Pause,
  Check,
  ChevronDown,
  Layers,
  Users,
  Grid,
  Ruler,
  Scissors,
  Eye,
  Waves,
  Sparkles,
  MapPin,
  X,
} from 'lucide-react';

interface Interactive3DBlueprintProps {
  activeSectionId?: number;
  onSelectSection?: (sectionId: number) => void;
}

type ViewAngle = '3/4' | 'TOP' | 'SIDE' | 'CLOSE_UP_BOW' | 'CLOSE_UP_STERN';
type RenderMode = 'REALISTIC_PBR' | 'BLUEPRINT_CAD' | 'STRUCTURAL_KEM';

export const Interactive3DBlueprint: React.FC<Interactive3DBlueprintProps> = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // View & Render State (5 Validation Inspection Modes: 3/4, TOP, SIDE, CLOSE-UP MŨI, CLOSE-UP ĐUÔI)
  const [viewAngle, setViewAngle] = useState<ViewAngle>('3/4');
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC_PBR');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);

  // Feature Toggles (Under "⚙ Hiển thị")
  const [showCrew, setShowCrew] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(false);
  const [showSlicePlane, setShowSlicePlane] = useState<boolean>(false);
  const [stationSliceMeters, setStationSliceMeters] = useState<number>(15.1);
  const [showWater, setShowWater] = useState<boolean>(true);

  // Dropdown Popovers
  const [isViewMenuOpen, setIsViewMenuOpen] = useState<boolean>(false);
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState<boolean>(false);
  const [isCrewFormationOpen, setIsCrewFormationOpen] = useState<boolean>(false);

  // Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const strokeCadenceSPM = 105;

  // Refs for Animation Loop
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isAutoRotatingRef = useRef<boolean>(isAutoRotating);
  const cadenceRef = useRef<number>(strokeCadenceSPM);
  const manualProgressRef = useRef<number>(0.0);
  const accumulatedCycleRef = useRef<number>(0.0);
  const lastTimestampRef = useRef<number>(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraTypeRef = useRef<'PERSPECTIVE' | 'ORTHO'>('PERSPECTIVE');
  const boatGroupRef = useRef<THREE.Group | null>(null);
  const paddlesGroupRef = useRef<THREE.Group | null>(null);
  const crewGroupRef = useRef<THREE.Group | null>(null);
  const kemGroupRef = useRef<THREE.Group | null>(null);
  const ribsGroupRef = useRef<THREE.Group | null>(null);
  const thwartsGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const wakeGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);
  const dimensionsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Interaction Refs
  const isMouseDownRef = useRef<boolean>(false);
  const isRightMouseDownRef = useRef<boolean>(false);
  const mousePrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number>(0);
  const touchPrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cameraOrbitRef = useRef<{ radius: number; theta: number; phi: number; target: THREE.Vector3 }>({
    radius: 32,
    theta: Math.PI / 4.2,
    phi: Math.PI / 3.4,
    target: new THREE.Vector3(0, 0.4, 0),
  });

  // Physical Metric Dimensions
  const BOAT_LENGTH = 30.20;
  const BOAT_MAX_BEAM = 1.16;
  const BOAT_MID_DEPTH = 0.48;
  const PROW_RISE = 1.38;
  const STERN_RISE = 1.52;
  const FLARE_ANGLE = 0.22;

  // 1. Zoom Control
  const handleZoom = (delta: number) => {
    if (activeCameraTypeRef.current === 'PERSPECTIVE' && cameraRef.current) {
      cameraOrbitRef.current.radius = Math.max(2.5, Math.min(65, cameraOrbitRef.current.radius + delta));
      const { radius, theta, phi, target } = cameraOrbitRef.current;
      cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = target.y + radius * Math.cos(phi);
      cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(target);
    } else if (orthoCameraRef.current) {
      orthoCameraRef.current.zoom = Math.max(0.6, Math.min(12, orthoCameraRef.current.zoom * (delta < 0 ? 1.25 : 0.8)));
      orthoCameraRef.current.updateProjectionMatrix();
    }
  };

  // 2. Reset View Control
  const handleResetView = () => {
    setViewAngle('3/4');
    setIsAutoRotating(false);
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

  // Helper: Create 3D Dimension Canvas Sprite
  const createDimensionSprite = (text: string, bgColor = 'rgba(15, 23, 42, 0.85)', textColor = '#38bdf8') => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.roundRect(4, 4, 248, 56, 12);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.6, 1);
    return sprite;
  };

  // Main Three.js Initialization Effect
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
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 300);
    cameraRef.current = camera;

    const frustumSize = 34;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      300
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

    // 4. LIGHTING SYSTEM
    const ambientLight = new THREE.AmbientLight(0xfff8ed, 0.8);
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

    const skyFill = new THREE.DirectionalLight(0x7dd3fc, 0.5);
    skyFill.position.set(-15, 15, -15);
    scene.add(skyFill);

    const waterBounceLight = new THREE.DirectionalLight(0xb45309, 0.35);
    waterBounceLight.position.set(0, -10, 0);
    scene.add(waterBounceLight);

    // 5. GRID / CAD PLANE
    const gridHelper = new THREE.GridHelper(52, 52, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.28;
    gridHelper.visible = showGrid;
    gridHelperRef.current = gridHelper;
    scene.add(gridHelper);

    // 6. BUILD HIGH-FIDELITY NGO BOAT SYSTEM
    const boatGroup = new THREE.Group();
    boatGroupRef.current = boatGroup;
    scene.add(boatGroup);

    // Build Dual-Layer Shell Hull
    buildAuthenticHull(boatGroup, renderMode);

    // Build 48 Internal Ribs (Cong Ghe)
    const ribsGroup = new THREE.Group();
    ribsGroupRef.current = ribsGroup;
    buildTransverseRibs(ribsGroup, renderMode);
    boatGroup.add(ribsGroup);

    // Build 26 Seating Thwarts (Đòn Ngồi)
    const thwartsGroup = new THREE.Group();
    thwartsGroupRef.current = thwartsGroup;
    buildSeatingThwarts(thwartsGroup, renderMode);
    boatGroup.add(thwartsGroup);

    // Build Master Kèm Spring Truss
    const kemGroup = new THREE.Group();
    kemGroupRef.current = kemGroup;
    buildMasterKemTruss(kemGroup, renderMode);
    boatGroup.add(kemGroup);

    // Build 50 Racing Paddles + 3 Steering Oars
    const paddlesGroup = new THREE.Group();
    paddlesGroupRef.current = paddlesGroup;
    buildAuthenticPaddles(paddlesGroup, renderMode);
    boatGroup.add(paddlesGroup);

    // Build 55-Athlete Crew
    const crewGroup = new THREE.Group();
    crewGroupRef.current = crewGroup;
    buildAuthenticCrew(crewGroup, renderMode);
    crewGroup.visible = showCrew;
    boatGroup.add(crewGroup);

    // Build Maspéro Water Surface & Wake
    const waterGeo = new THREE.PlaneGeometry(64, 22, 48, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x85583e,
      roughness: 0.12,
      metalness: 0.28,
      transparent: true,
      opacity: 0.72,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.0;
    waterMesh.visible = showWater;
    waterMeshRef.current = waterMesh;
    scene.add(waterMesh);

    const wakeGroup = new THREE.Group();
    wakeGroupRef.current = wakeGroup;
    buildWakeAndSplashes(wakeGroup);
    wakeGroup.visible = showWater;
    boatGroup.add(wakeGroup);

    // Build Station Slice Plane Indicator
    const sliceGeo = new THREE.PlaneGeometry(3.4, 3.4);
    const sliceMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const slicePlane = new THREE.Mesh(sliceGeo, sliceMat);
    slicePlane.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    slicePlane.position.y = 0.5;
    slicePlane.visible = showSlicePlane;
    slicePlaneRef.current = slicePlane;
    scene.add(slicePlane);

    // Build 3D Dimensions & Rulers System
    const dimensionsGroup = new THREE.Group();
    dimensionsGroupRef.current = dimensionsGroup;
    build3DDimensions(dimensionsGroup);
    dimensionsGroup.visible = showDimensions;
    scene.add(dimensionsGroup);

    // 7. MOUSE & TOUCH EVENT HANDLERS
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDownRef.current = true;
      } else {
        isMouseDownRef.current = true;
      }
      mousePrevRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current && !isRightMouseDownRef.current) return;
      const dx = e.clientX - mousePrevRef.current.x;
      const dy = e.clientY - mousePrevRef.current.y;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };

      if (isRightMouseDownRef.current) {
        // Pan Target
        const panSpeed = 0.02;
        cameraOrbitRef.current.target.x -= dx * panSpeed;
        cameraOrbitRef.current.target.y += dy * panSpeed;
      } else if (isMouseDownRef.current) {
        // Rotate 360
        if (viewAngle === '3/4' || viewAngle === 'CLOSE_UP_BOW' || viewAngle === 'CLOSE_UP_STERN') {
          cameraOrbitRef.current.theta -= dx * 0.007;
          cameraOrbitRef.current.phi = Math.max(
            0.06,
            Math.min(Math.PI / 2 - 0.04, cameraOrbitRef.current.phi + dy * 0.007)
          );
        }
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      isRightMouseDownRef.current = false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY * 0.03);
    };

    // Touch Support for Pinch-to-Zoom & Orbit
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchPrevRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchPrevRef.current.x;
        const dy = e.touches[0].clientY - touchPrevRef.current.y;
        touchPrevRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        if (viewAngle === '3/4' || viewAngle === 'CLOSE_UP_BOW' || viewAngle === 'CLOSE_UP_STERN') {
          cameraOrbitRef.current.theta -= dx * 0.008;
          cameraOrbitRef.current.phi = Math.max(
            0.06,
            Math.min(Math.PI / 2 - 0.04, cameraOrbitRef.current.phi + dy * 0.008)
          );
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = touchStartDistRef.current - dist;
        touchStartDistRef.current = dist;
        handleZoom(delta * 0.05);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });

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

    // 9. ANIMATION LOOP
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const delta = lastTimestampRef.current === 0 ? 0.016 : Math.min(0.1, elapsedTime - lastTimestampRef.current);
      lastTimestampRef.current = elapsedTime;

      // Auto-rotation handling
      if (
        isAutoRotatingRef.current &&
        (viewAngle === '3/4' || viewAngle === 'CLOSE_UP_BOW' || viewAngle === 'CLOSE_UP_STERN') &&
        !isMouseDownRef.current
      ) {
        cameraOrbitRef.current.theta += 0.005;
      }

      // Kinematics cycle calculation
      if (isPlayingRef.current) {
        const spm = cadenceRef.current;
        accumulatedCycleRef.current = (accumulatedCycleRef.current + (delta * spm) / 60) % 1.0;
        manualProgressRef.current = accumulatedCycleRef.current;
      }

      const masterT = manualProgressRef.current;

      // 1. Paddles Motion
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
            paddleMesh.rotation.z = uData.baseRotZ + Math.sin(masterT * Math.PI * 2) * 0.035;
            paddleMesh.rotation.x = uData.baseRotX + Math.cos(masterT * Math.PI * 2) * 0.045;
          }
        });
      }

      // 2. Crew Skeletal Kinematics
      if (crewGroupRef.current) {
        crewGroupRef.current.children.forEach((athleteGroup) => {
          const uData = athleteGroup.userData;
          if (uData && uData.isRower) {
            const kin = calculateStrokeKinematics(masterT, uData.pair, uData.isPort);
            if (uData.upperBody) {
              uData.upperBody.rotation.z = kin.bodyLeanZ;
              uData.upperBody.position.y = kin.torsoElevY;
            }
            if (uData.outsideArm) {
              uData.outsideArm.rotation.z = -0.52 - kin.armReachX * 0.45 + kin.armPullZ * 0.35;
            }
            if (uData.insideArm) {
              uData.insideArm.rotation.z = -0.48 - kin.armReachX * 0.40 + kin.armPullZ * 0.45;
            }
          } else if (uData && uData.isBowLeader) {
            athleteGroup.position.y = uData.baseY + Math.sin(masterT * Math.PI * 2) * 0.05;
            athleteGroup.rotation.z = uData.baseRotZ + Math.cos(masterT * Math.PI * 2) * 0.10;
          } else if (uData && uData.isMidCommander) {
            athleteGroup.position.y = uData.baseY + Math.abs(Math.sin(masterT * Math.PI)) * 0.07;
            athleteGroup.rotation.z = Math.sin(masterT * Math.PI * 2) * 0.07;
          } else if (uData && uData.isSteersman) {
            athleteGroup.rotation.z = uData.baseRotZ + Math.sin(masterT * Math.PI * 2) * 0.025;
          }
        });
      }

      // 3. Boat Dynamic Heave & Pitch
      if (boatGroupRef.current) {
        const heaveDisplacement = Math.sin(masterT * Math.PI * 2) * 0.028;
        const pitchAngle = Math.cos(masterT * Math.PI * 2 - 0.2) * 0.011;
        const surgeX = Math.sin(masterT * Math.PI * 2 - 0.3) * 0.035;
        boatGroupRef.current.position.set(surgeX, heaveDisplacement, 0);
        boatGroupRef.current.rotation.z = pitchAngle;
      }

      // 4. Wake Splash Animation
      if (wakeGroupRef.current) {
        const isDrive = masterT >= 0.15 && masterT < 0.60;
        const drivePulse = isDrive ? 1.0 + Math.sin(((masterT - 0.15) / 0.45) * Math.PI) * 0.35 : 0.75;
        wakeGroupRef.current.children.forEach((wakeParticle, wIdx) => {
          const scalePulse = drivePulse * (1.0 + Math.sin(masterT * Math.PI * 2 + wIdx) * 0.15);
          wakeParticle.scale.set(scalePulse, scalePulse, scalePulse);
        });
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
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [renderMode]);

  // Synchronize Toggles with Three.js Objects
  useEffect(() => {
    if (waterMeshRef.current) waterMeshRef.current.visible = showWater;
    if (wakeGroupRef.current) wakeGroupRef.current.visible = showWater;
    if (crewGroupRef.current) crewGroupRef.current.visible = showCrew;
    if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
    if (dimensionsGroupRef.current) dimensionsGroupRef.current.visible = showDimensions;
    if (slicePlaneRef.current) slicePlaneRef.current.visible = showSlicePlane;
  }, [showWater, showCrew, showGrid, showDimensions, showSlicePlane]);

  // Update Slice plane position
  useEffect(() => {
    if (slicePlaneRef.current) {
      slicePlaneRef.current.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    }
  }, [stationSliceMeters]);

  // Update Camera View Angle (5 Validation Modes: 3/4, TOP, SIDE, CLOSE-UP MŨI, CLOSE-UP ĐUÔI)
  const updateCameraView = () => {
    if (!cameraRef.current || !orthoCameraRef.current) return;

    if (viewAngle === '3/4') {
      activeCameraTypeRef.current = 'PERSPECTIVE';
      const { radius, theta, phi, target } = cameraOrbitRef.current;
      const x = target.x + radius * Math.sin(phi) * Math.cos(theta);
      const y = target.y + radius * Math.cos(phi);
      const z = target.z + radius * Math.sin(phi) * Math.sin(theta);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(target);
    } else if (viewAngle === 'TOP') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.position.set(0, 38, 0);
      orthoCameraRef.current.lookAt(0, 0, 0);
      orthoCameraRef.current.up.set(0, 0, -1);
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (viewAngle === 'SIDE') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.position.set(0, 0.70, 28);
      orthoCameraRef.current.lookAt(0, 0.70, 0);
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (viewAngle === 'CLOSE_UP_BOW') {
      activeCameraTypeRef.current = 'PERSPECTIVE';
      const bowTarget = new THREE.Vector3(BOAT_LENGTH / 2 - 1.2, 1.15, 0);
      const { radius, theta, phi } = cameraOrbitRef.current;
      const closeRadius = Math.min(6.8, radius);
      const x = bowTarget.x + closeRadius * Math.sin(phi) * Math.cos(theta);
      const y = bowTarget.y + closeRadius * Math.cos(phi);
      const z = bowTarget.z + closeRadius * Math.sin(phi) * Math.sin(theta);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(bowTarget);
    } else if (viewAngle === 'CLOSE_UP_STERN') {
      activeCameraTypeRef.current = 'PERSPECTIVE';
      const sternTarget = new THREE.Vector3(-BOAT_LENGTH / 2 + 1.2, 1.25, 0);
      const { radius, theta, phi } = cameraOrbitRef.current;
      const closeRadius = Math.min(6.8, radius);
      const x = sternTarget.x + closeRadius * Math.sin(phi) * Math.cos(theta);
      const y = sternTarget.y + closeRadius * Math.cos(phi);
      const z = sternTarget.z + closeRadius * Math.sin(phi) * Math.sin(theta);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(sternTarget);
    }
  };

  // Helper: Build 3D Dimension Lines & Rulers
  const build3DDimensions = (parent: THREE.Group) => {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });

    // 1. Overall Length LOA = 30.20m
    const loaPoints = [
      new THREE.Vector3(-BOAT_LENGTH / 2, -0.6, 1.6),
      new THREE.Vector3(BOAT_LENGTH / 2, -0.6, 1.6),
    ];
    const loaGeo = new THREE.BufferGeometry().setFromPoints(loaPoints);
    parent.add(new THREE.Line(loaGeo, lineMat));

    // End ticks for LOA
    const tickA = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-BOAT_LENGTH / 2, -0.8, 1.6),
        new THREE.Vector3(-BOAT_LENGTH / 2, -0.4, 1.6),
      ]),
      lineMat
    );
    const tickB = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(BOAT_LENGTH / 2, -0.8, 1.6),
        new THREE.Vector3(BOAT_LENGTH / 2, -0.4, 1.6),
      ]),
      lineMat
    );
    parent.add(tickA);
    parent.add(tickB);

    const loaSprite = createDimensionSprite('LOA: 30.20 m');
    loaSprite.position.set(0, -0.9, 1.6);
    parent.add(loaSprite);

    // 2. Beam Max = 1.16m
    const beamPoints = [
      new THREE.Vector3(0, 0.65, -BOAT_MAX_BEAM / 2),
      new THREE.Vector3(0, 0.65, BOAT_MAX_BEAM / 2),
    ];
    const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);
    parent.add(new THREE.Line(beamGeo, lineMat));

    const beamSprite = createDimensionSprite('Beam: 1.16 m');
    beamSprite.position.set(0, 1.1, 0);
    parent.add(beamSprite);

    // 3. Prow Tip Height = +1.38m
    const prowSprite = createDimensionSprite('Mũi: +1.38 m', 'rgba(220, 38, 38, 0.85)', '#fef08a');
    prowSprite.position.set(BOAT_LENGTH / 2 - 0.5, 1.9, 0);
    parent.add(prowSprite);

    // 4. Stern Fin Height = +1.52m
    const sternSprite = createDimensionSprite('Đuôi: +1.52 m', 'rgba(220, 38, 38, 0.85)', '#fef08a');
    sternSprite.position.set(-BOAT_LENGTH / 2 + 0.5, 2.1, 0);
    parent.add(sternSprite);
  };

  // Helper: Build authentic Khmer Ngo Boat Hull (Tum Núp 2 2024 Reference)
  const buildAuthenticHull = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const isKemFocus = mode === 'STRUCTURAL_KEM';

    const STATIONS = 200;
    const SLICES = 40;
    const outerVerts: number[] = [];
    const outerIndices: number[] = [];
    const outerColors: number[] = [];

    const innerVerts: number[] = [];
    const innerIndices: number[] = [];
    const innerColors: number[] = [];

    for (let i = 0; i <= STATIONS; i++) {
      const u = i / STATIONS;
      const x = (u - 0.5) * BOAT_LENGTH;

      const sinU = Math.sin(u * Math.PI);
      let beamAtStation = BOAT_MAX_BEAM * Math.pow(sinU, 1.18);

      let keelY = 0.0;
      let gunwaleSheerY = BOAT_MID_DEPTH;

      if (u >= 0.5) {
        const tBow = (u - 0.5) / 0.5;
        // Non-linear sheer rise and keel rise to +1.38m
        keelY = (PROW_RISE - 0.14) * Math.pow(tBow, 2.6);
        gunwaleSheerY = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow(tBow, 2.2);
        // Slender knife-edge arrow taper at prow tip
        beamAtStation *= 1.0 - 0.12 * Math.pow(tBow, 3.0);
        if (i === STATIONS) beamAtStation = 0.015;
      } else {
        const tStern = (0.5 - u) / 0.5;
        // Non-linear sheer rise and keel rise to +1.52m (curved swept tail)
        keelY = (STERN_RISE - 0.16) * Math.pow(tStern, 2.6);
        gunwaleSheerY = BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow(tStern, 2.2);
        // Slender swept tail fin taper at stern
        beamAtStation *= 1.0 - 0.15 * Math.pow(tStern, 3.0);
        if (i === 0) beamAtStation = 0.012;
      }

      for (let j = 0; j <= SLICES; j++) {
        const v = j / SLICES;
        const angle = (v - 0.5) * Math.PI;

        const halfBeam = beamAtStation / 2;
        const flareRatio = Math.min(1.0, (beamAtStation / BOAT_MAX_BEAM) * 1.2);
        const localFlare = FLARE_ANGLE * flareRatio;
        const z = Math.sin(angle) * halfBeam * (1.0 + Math.abs(Math.sin(angle)) * localFlare);

        // U-to-V cross section transition: U-bottom at midship, sharpening into V-hydrofoil at bow
        const tEnd = u >= 0.5 ? (u - 0.5) / 0.5 : (0.5 - u) / 0.5;
        const curvatureExp = 1.6 - 0.6 * tEnd;
        const uCurvature = Math.pow(Math.abs(Math.sin(angle)), curvatureExp);
        const y = keelY + uCurvature * (gunwaleSheerY - keelY);

        outerVerts.push(x, y, z);

        if (isCAD) {
          outerColors.push(0.22, 0.74, 0.97);
        } else if (isKemFocus) {
          outerColors.push(0.18, 0.22, 0.32);
        } else {
          // Authentic Tum Núp 2 Livery: Royal Blue Hull, Golden Dragon Scales, Red Waterline & Accents
          if (u > 0.94) {
            outerColors.push(0.86, 0.15, 0.15); // Prow Red
          } else if (u < 0.06) {
            outerColors.push(0.86, 0.15, 0.15); // Stern Red
          } else if ((j <= 2 || j >= SLICES - 2) && halfBeam > 0.08) {
            outerColors.push(0.98, 0.75, 0.14); // Gold Gunwale Band
          } else if ((j === 3 || j === SLICES - 3) && halfBeam > 0.08) {
            outerColors.push(0.86, 0.15, 0.15); // Red Accent Pinstripe
          } else if (uCurvature < 0.16) {
            outerColors.push(0.09, 0.09, 0.11); // Keel bottom dark sao wood
          } else {
            const scaleWave = Math.sin(u * Math.PI * 52) * Math.cos(angle * 6);
            if (scaleWave > 0.65 && halfBeam > 0.22) {
              outerColors.push(0.96, 0.62, 0.04); // Naga Golden Scales
            } else if (scaleWave > 0.35 && halfBeam > 0.22) {
              outerColors.push(0.92, 0.35, 0.05); // Amber Glow
            } else {
              outerColors.push(0.11, 0.31, 0.85); // Tum Núp Royal Blue
            }
          }
        }

        const wallThickness = Math.min(0.042, halfBeam * 0.38);
        const innerHalfBeam = Math.max(0.0, halfBeam - wallThickness);
        const innerZ = Math.sin(angle) * innerHalfBeam * (1.0 + Math.abs(Math.sin(angle)) * localFlare);
        const innerY = Math.max(keelY + wallThickness, y - wallThickness * 0.5);
        innerVerts.push(x, innerY, innerZ);

        if (isCAD) {
          innerColors.push(0.14, 0.48, 0.72);
        } else if (isKemFocus) {
          innerColors.push(0.12, 0.16, 0.24);
        } else {
          innerColors.push(0.35, 0.18, 0.08); // Sao Wood Interior
        }
      }
    }

    for (let i = 0; i < STATIONS; i++) {
      for (let j = 0; j < SLICES; j++) {
        const a = i * (SLICES + 1) + j;
        const b = (i + 1) * (SLICES + 1) + j;
        const c = (i + 1) * (SLICES + 1) + (j + 1);
        const d = i * (SLICES + 1) + (j + 1);

        outerIndices.push(a, b, d);
        outerIndices.push(b, c, d);

        innerIndices.push(a, d, b);
        innerIndices.push(b, d, c);
      }
    }

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
    parent.add(outerMesh);

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
    parent.add(innerMesh);

    buildGunwalesAndFulcrums(parent, mode);
    buildHullInteriorDetails(parent, mode);

    if (!isCAD) {
      buildSacredEyes(parent);
      buildTumNup2Ornaments(parent);
    }
  };

  // Helper: Build Gunwale Rails and Paddle Fulcrum Wear Plates
  const buildGunwalesAndFulcrums = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const gunwaleMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x7c2d12,
      roughness: 0.45,
    });
    const wearPlateMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xd97706,
      roughness: 0.35,
      metalness: 0.2,
    });

    const SAMPLES = 160;
    const portGunwalePoints: THREE.Vector3[] = [];
    const stbdGunwalePoints: THREE.Vector3[] = [];

    for (let i = 0; i <= SAMPLES; i++) {
      const u = i / SAMPLES;
      const x = (u - 0.5) * BOAT_LENGTH;
      const sinU = Math.sin(u * Math.PI);
      let beamHere = BOAT_MAX_BEAM * Math.pow(sinU, 1.18);

      let ySheer = BOAT_MID_DEPTH;
      if (u >= 0.5) {
        const tBow = (u - 0.5) / 0.5;
        ySheer = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow(tBow, 2.2);
        beamHere *= 1.0 - 0.12 * Math.pow(tBow, 3.0);
        if (i === SAMPLES) beamHere = 0.015;
      } else {
        const tStern = (0.5 - u) / 0.5;
        ySheer = BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow(tStern, 2.2);
        beamHere *= 1.0 - 0.15 * Math.pow(tStern, 3.0);
        if (i === 0) beamHere = 0.012;
      }

      const halfB = beamHere / 2;
      const flareRatio = Math.min(1.0, (beamHere / BOAT_MAX_BEAM) * 1.2);
      const zPort = -halfB * (1.0 + flareRatio * FLARE_ANGLE);
      const zStbd = halfB * (1.0 + flareRatio * FLARE_ANGLE);

      portGunwalePoints.push(new THREE.Vector3(x, ySheer, zPort));
      stbdGunwalePoints.push(new THREE.Vector3(x, ySheer, zStbd));
    }

    const portCurve = new THREE.CatmullRomCurve3(portGunwalePoints);
    const stbdCurve = new THREE.CatmullRomCurve3(stbdGunwalePoints);

    const portRail = new THREE.Mesh(new THREE.TubeGeometry(portCurve, 160, 0.022, 8, false), gunwaleMat);
    const stbdRail = new THREE.Mesh(new THREE.TubeGeometry(stbdCurve, 160, 0.022, 8, false), gunwaleMat);
    parent.add(portRail);
    parent.add(stbdRail);

    for (let i = 0; i < 25; i++) {
      const u = 0.14 + (i / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.18);
      const halfB = localBeam / 2;
      const flareRatio = Math.min(1.0, (localBeam / BOAT_MAX_BEAM) * 1.2);
      const zPort = -halfB * (1.0 + flareRatio * FLARE_ANGLE);
      const zStbd = halfB * (1.0 + flareRatio * FLARE_ANGLE);

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.2)
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

  // Helper: Build Hull Interior Details
  const buildHullInteriorDetails = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const woodMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x451a03,
      roughness: 0.7,
    });

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
    const spineMesh = new THREE.Mesh(new THREE.TubeGeometry(spineCurve, 60, 0.035, 6, false), woodMat);
    parent.add(spineMesh);

    const bowDeadwood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 0.22), woodMat);
    bowDeadwood.position.set(BOAT_LENGTH / 2 - 1.0, 0.85, 0);
    bowDeadwood.rotation.z = -0.32;
    parent.add(bowDeadwood);

    const sternDeadwood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.32, 0.25), woodMat);
    sternDeadwood.position.set(-BOAT_LENGTH / 2 + 1.1, 0.95, 0);
    sternDeadwood.rotation.z = 0.38;
    parent.add(sternDeadwood);
  };

  // Helper: Build Sacred Dragon Eyes
  const buildSacredEyes = (parent: THREE.Group) => {
    const eyeBezelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.6,
    });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });

    // Starboard Eye
    const stbdEyeGroup = new THREE.Group();
    const eyeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.025, 24), eyeBezelMat);
    eyeBase.rotation.x = Math.PI / 2;
    eyeBase.scale.set(1.5, 0.9, 1.0);
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

  // Helper: Build Tum Núp 2 Traditional Ornaments
  const buildTumNup2Ornaments = (parent: THREE.Group) => {
    const goldOrnamentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.65,
    });
    const scarletMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.35,
      metalness: 0.2,
    });
    const woodFlagMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
    });

    // Prow Crest & Flame Horns
    const prowGroup = new THREE.Group();
    prowGroup.position.set(BOAT_LENGTH / 2 - 0.25, 1.34, 0);

    const nagaCrownGeo = new THREE.ConeGeometry(0.09, 0.42, 8);
    nagaCrownGeo.rotateZ(-Math.PI / 3.2);
    const nagaCrown = new THREE.Mesh(nagaCrownGeo, goldOrnamentMat);
    nagaCrown.position.set(0.12, 0.16, 0);
    prowGroup.add(nagaCrown);

    const flameBeardGeo = new THREE.ConeGeometry(0.06, 0.28, 6);
    flameBeardGeo.rotateZ(Math.PI / 4);
    const flameBeard = new THREE.Mesh(flameBeardGeo, scarletMat);
    flameBeard.position.set(0.05, -0.10, 0);
    prowGroup.add(flameBeard);

    [-0.07, 0.07].forEach((zHorn) => {
      const hornGeo = new THREE.CylinderGeometry(0.015, 0.035, 0.32, 6);
      const hornMesh = new THREE.Mesh(hornGeo, goldOrnamentMat);
      hornMesh.position.set(-0.08, 0.22, zHorn);
      hornMesh.rotation.z = -0.65;
      hornMesh.rotation.x = zHorn > 0 ? 0.35 : -0.35;
      prowGroup.add(hornMesh);
    });

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.75, 8), woodFlagMat);
    flagPole.position.set(-0.35, 0.35, 0);
    flagPole.rotation.z = -0.18;
    prowGroup.add(flagPole);

    const bannerShape = new THREE.Shape();
    bannerShape.moveTo(0, 0);
    bannerShape.lineTo(0.28, -0.09);
    bannerShape.lineTo(0, -0.18);
    bannerShape.closePath();

    const bannerMesh = new THREE.Mesh(new THREE.ShapeGeometry(bannerShape), goldOrnamentMat);
    bannerMesh.position.set(-0.35, 0.65, 0.005);
    bannerMesh.rotation.z = 0.12;
    prowGroup.add(bannerMesh);

    parent.add(prowGroup);

    // Stern Fin
    const sternGroup = new THREE.Group();
    sternGroup.position.set(-BOAT_LENGTH / 2 + 0.30, 1.46, 0);

    const tailPoints = [
      new THREE.Vector3(0.0, 0.0, 0),
      new THREE.Vector3(-0.25, 0.28, 0),
      new THREE.Vector3(-0.45, 0.58, 0),
      new THREE.Vector3(-0.52, 0.85, 0),
    ];
    const tailCurve = new THREE.CatmullRomCurve3(tailPoints);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 16, 0.045, 8, false), goldOrnamentMat);
    sternGroup.add(tailMesh);

    const tailFeatherGeo = new THREE.ConeGeometry(0.08, 0.35, 6);
    tailFeatherGeo.rotateZ(Math.PI / 6);
    const tailFeather = new THREE.Mesh(tailFeatherGeo, scarletMat);
    tailFeather.position.set(-0.54, 0.95, 0);
    sternGroup.add(tailFeather);

    parent.add(sternGroup);

    // Team Decals "TUM NÚP 2"
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3 });
    const textBorderMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });

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

      const textBlock = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.09, 0.025), goldOrnamentMat);
      textBlock.position.z = sideSign * 0.01;
      decalGroup.add(textBlock);

      parent.add(decalGroup);
    });
  };

  // Helper: Build 48 Internal Ribs
  const buildTransverseRibs = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const ribMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x78350f,
      roughness: 0.65,
    });
    const pegMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xd97706,
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

      const ribPoints: THREE.Vector3[] = [];
      const PTS = 16;
      for (let p = 0; p <= PTS; p++) {
        const v = p / PTS;
        const angle = (v - 0.5) * Math.PI;
        const z = Math.sin(angle) * halfB;
        const uCurv = Math.pow(Math.abs(Math.sin(angle)), 1.6);
        const y = keelY + uCurv * (ySheer - keelY) * 0.92;
        ribPoints.push(new THREE.Vector3(x, y, z));
      }

      const ribMesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPoints), 16, 0.016, 6, false),
        ribMat
      );
      parent.add(ribMesh);

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

  // Helper: Build Seating Thwarts
  const buildSeatingThwarts = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';
    const thwartMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0x92400e,
      roughness: 0.45,
    });
    const chockMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x5c2b09,
      roughness: 0.6,
    });
    const tieMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0ea5e9 : 0x78350f,
      roughness: 0.5,
    });

    for (let k = 0; k < 26; k++) {
      const u = 0.14 + (k / 25) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = Math.max(0.18, BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25) * 0.96);

      const ySheer =
        u >= 0.5
          ? BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((u - 0.5) / 0.5, 2.4)
          : BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - u) / 0.5, 2.2);

      const keelY =
        u >= 0.5
          ? (PROW_RISE - 0.16) * Math.pow((u - 0.5) / 0.5, 2.8) + 0.04
          : (STERN_RISE - 0.18) * Math.pow((0.5 - u) / 0.5, 2.8) + 0.04;

      const thwart = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.042, localBeam + 0.05), thwartMat);
      thwart.position.set(x, ySheer - 0.035, 0);
      thwart.castShadow = true;
      parent.add(thwart);

      if (k < 25) {
        const xChock = x + 0.36;
        const chock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, Math.max(0.14, localBeam * 0.72)), chockMat);
        chock.position.set(xChock, keelY + 0.035, 0);
        chock.rotation.z = -0.22;
        chock.castShadow = true;
        parent.add(chock);
      }
    }

    for (let b = 1; b <= 4; b++) {
      const uBow = 0.84 + b * 0.035;
      const xB = (uBow - 0.5) * BOAT_LENGTH;
      const wB = Math.max(0.08, BOAT_MAX_BEAM * Math.pow(Math.sin(uBow * Math.PI), 1.25));
      const yB = BOAT_MID_DEPTH + (PROW_RISE - BOAT_MID_DEPTH) * Math.pow((uBow - 0.5) / 0.5, 2.4);
      const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, wB), tieMat);
      tieMesh.position.set(xB, yB - 0.03, 0);
      parent.add(tieMesh);
    }

    for (let s = 1; s <= 3; s++) {
      const uStern = 0.12 - s * 0.03;
      if (uStern > 0.02) {
        const xS = (uStern - 0.5) * BOAT_LENGTH;
        const wS = Math.max(0.08, BOAT_MAX_BEAM * Math.pow(Math.sin(uStern * Math.PI), 1.25));
        const yS = BOAT_MID_DEPTH + (STERN_RISE - BOAT_MID_DEPTH) * Math.pow((0.5 - uStern) / 0.5, 2.2);
        const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, wS), tieMat);
        tieMesh.position.set(xS, yS - 0.03, 0);
        parent.add(tieMesh);
      }
    }
  };

  // Helper: Build Master Kèm Spring-Truss
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
      color: isHighlight ? 0x38bdf8 : 0x94a3b8,
      metalness: 0.85,
      roughness: 0.2,
    });

    const turnbuckleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.15,
    });

    const kemPoleGeo = new THREE.CylinderGeometry(0.095, 0.095, 24.6, 20);
    kemPoleGeo.rotateZ(Math.PI / 2);
    const kemPole = new THREE.Mesh(kemPoleGeo, kemMat);
    kemPole.position.set(0.2, 0.24, 0);
    kemPole.castShadow = true;
    parent.add(kemPole);

    const aftKemPoints = [
      new THREE.Vector3(-12.0, 0.24, 0),
      new THREE.Vector3(-13.2, 0.45, 0),
      new THREE.Vector3(-14.2, 0.78, 0),
    ];
    const aftKemMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(aftKemPoints), 16, 0.05, 8, false),
      kemMat
    );
    parent.add(aftKemMesh);

    const strutPositions = [
      { x: 8.5, height: 0.34 },
      { x: 4.2, height: 0.42 },
      { x: 0.0, height: 0.46 },
      { x: -4.5, height: 0.42 },
      { x: -9.0, height: 0.36 },
    ];

    strutPositions.forEach((strut) => {
      const sMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, strut.height, 14), strutMat);
      sMesh.position.set(strut.x, 0.12 + strut.height / 2, 0);
      sMesh.castShadow = true;
      parent.add(sMesh);

      const bracketTop = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.13), turnbuckleMat);
      bracketTop.position.set(strut.x, 0.12 + strut.height, 0);
      parent.add(bracketTop);
    });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.44), strutMat);
    platform.position.set(0.0, 0.60, 0);
    parent.add(platform);

    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12.2, 0.22, 0),
      new THREE.Vector3(-9.0, 0.48, 0),
      new THREE.Vector3(-4.5, 0.54, 0),
      new THREE.Vector3(0.0, 0.58, 0),
      new THREE.Vector3(4.2, 0.54, 0),
      new THREE.Vector3(8.5, 0.46, 0),
      new THREE.Vector3(12.2, 0.24, 0),
    ]);
    const cableMesh = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 40, 0.014, 8, false), cableMat);
    parent.add(cableMesh);

    [-10.5, 10.5].forEach((tbX) => {
      const tbGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.24, 12);
      tbGeo.rotateZ(Math.PI / 2);
      const tb = new THREE.Mesh(tbGeo, turnbuckleMat);
      tb.position.set(tbX, 0.32, 0);
      parent.add(tb);
    });
  };

  // Helper: Build Paddles
  const buildAuthenticPaddles = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';

    const shaftMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0x78350f,
      roughness: 0.4,
    });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0xd97706,
      roughness: 0.25,
      metalness: 0.2,
    });
    const bladeTipMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xdc2626,
      roughness: 0.3,
    });
    const steerOarMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0xdc2626,
      roughness: 0.3,
    });

    const paddleShaftGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.30, 8);
    const paddleBladeGeo = new THREE.BoxGeometry(0.18, 0.38, 0.022);
    const paddleTipGeo = new THREE.BoxGeometry(0.18, 0.10, 0.023);

    for (let pair = 1; pair <= 25; pair++) {
      const u = 0.82 - ((pair - 1) / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const halfB = localBeam / 2;
      const flareRatio = Math.min(1.0, (localBeam / BOAT_MAX_BEAM) * 1.2);
      const zPort = -halfB * (1.0 + flareRatio * FLARE_ANGLE);
      const zStbd = halfB * (1.0 + flareRatio * FLARE_ANGLE);

      const tBow = u >= 0.5 ? (u - 0.5) / 0.5 : (0.5 - u) / 0.5;
      const ySheer = BOAT_MID_DEPTH + Math.pow(tBow, 2.3) * 0.35;

      // Port Paddle
      const portPaddle = new THREE.Group();
      const pShaft = new THREE.Mesh(paddleShaftGeo, shaftMat);
      pShaft.position.y = -0.35;
      portPaddle.add(pShaft);

      const pBlade = new THREE.Mesh(paddleBladeGeo, bladeMat);
      pBlade.position.set(0, -0.85, 0);
      portPaddle.add(pBlade);

      const pTip = new THREE.Mesh(paddleTipGeo, bladeTipMat);
      pTip.position.set(0, -1.0, 0);
      portPaddle.add(pTip);

      portPaddle.position.set(x, ySheer + 0.05, zPort - 0.08);
      portPaddle.rotation.set(-0.35, 0, 0);
      portPaddle.userData = {
        isPaddle: true,
        isPort: true,
        pair,
        baseX: x,
        baseY: ySheer + 0.05,
        baseZ: zPort - 0.08,
        baseRotX: -0.35,
        baseRotY: 0,
        baseRotZ: 0,
      };
      parent.add(portPaddle);

      // Starboard Paddle
      const stbdPaddle = new THREE.Group();
      const sShaft = new THREE.Mesh(paddleShaftGeo, shaftMat);
      sShaft.position.y = -0.35;
      stbdPaddle.add(sShaft);

      const sBlade = new THREE.Mesh(paddleBladeGeo, bladeMat);
      sBlade.position.set(0, -0.85, 0);
      stbdPaddle.add(sBlade);

      const sTip = new THREE.Mesh(paddleTipGeo, bladeTipMat);
      sTip.position.set(0, -1.0, 0);
      stbdPaddle.add(sTip);

      stbdPaddle.position.set(x, ySheer + 0.05, zStbd + 0.08);
      stbdPaddle.rotation.set(0.35, 0, 0);
      stbdPaddle.userData = {
        isPaddle: true,
        isPort: false,
        pair,
        baseX: x,
        baseY: ySheer + 0.05,
        baseZ: zStbd + 0.08,
        baseRotX: 0.35,
        baseRotY: 0,
        baseRotZ: 0,
      };
      parent.add(stbdPaddle);
    }

    // 3 Steering Oars
    const steerConfigs = [
      { x: -11.8, y: 1.05, z: 0.22, rotX: 0.32, rotZ: 0.45 },
      { x: -12.6, y: 1.18, z: -0.22, rotX: -0.32, rotZ: 0.50 },
      { x: -13.5, y: 1.32, z: 0.0, rotX: 0.0, rotZ: 0.55 },
    ];

    steerConfigs.forEach((st) => {
      const oarGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 3.1, 8), shaftMat);
      shaft.position.y = -1.1;
      oarGroup.add(shaft);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.1, 0.035), steerOarMat);
      blade.position.y = -2.1;
      oarGroup.add(blade);

      oarGroup.position.set(st.x, st.y, st.z);
      oarGroup.rotation.set(st.rotX, 0, st.rotZ);
      oarGroup.userData = {
        isSteeringOar: true,
        baseX: st.x,
        baseY: st.y,
        baseZ: st.z,
        baseRotX: st.rotX,
        baseRotZ: st.rotZ,
      };
      parent.add(oarGroup);
    });
  };

  // Helper: Build Crew
  const buildAuthenticCrew = (parent: THREE.Group, mode: RenderMode) => {
    const isCAD = mode === 'BLUEPRINT_CAD';

    const skinMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0x7c4a2d,
      roughness: 0.65,
    });
    const portJerseyMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x1d4ed8,
      roughness: 0.5,
    });
    const stbdJerseyMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x1e40af,
      roughness: 0.5,
    });
    const bowLeaderMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xf59e0b,
      roughness: 0.4,
    });
    const midLeaderMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xea580c,
      roughness: 0.4,
    });
    const steerMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x38bdf8 : 0xdc2626,
      roughness: 0.4,
    });
    const headbandMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
    });

    const createRowerMesh = (jerseyMaterial: THREE.Material, isPort: boolean, pair: number) => {
      const athlete = new THREE.Group();

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.32), skinMat);
      legs.position.set(0.04, 0.08, 0);
      athlete.add(legs);

      const upperBody = new THREE.Group();
      upperBody.position.set(0, 0.0, 0);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.28), jerseyMaterial);
      torso.position.y = 0.21;
      torso.castShadow = true;
      upperBody.add(torso);

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

      const armGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.34, 8);

      const outsideArm = new THREE.Mesh(armGeo, skinMat);
      outsideArm.position.set(0.14, 0.20, isPort ? -0.14 : 0.14);
      outsideArm.rotation.x = isPort ? -0.45 : 0.45;
      outsideArm.rotation.z = -0.52;
      upperBody.add(outsideArm);

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
      };

      return athlete;
    };

    const createStandingAthlete = (roleMaterial: THREE.Material, isKneeling = false) => {
      const athlete = new THREE.Group();

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.44, 0.28), roleMaterial);
      torso.position.y = 0.22;
      torso.castShadow = true;
      athlete.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 14), skinMat);
      head.position.set(isKneeling ? 0.04 : 0.0, 0.50, 0);
      head.castShadow = true;
      athlete.add(head);

      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 14), headbandMat);
      headband.position.set(isKneeling ? 0.04 : 0.0, 0.51, 0);
      headband.rotation.x = Math.PI / 2;
      athlete.add(headband);

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

    // 1. Bow Commander
    const bowCommander = createStandingAthlete(bowLeaderMat, true);
    bowCommander.position.set(13.60, 1.15, 0);
    bowCommander.rotation.z = 0.26;
    bowCommander.userData = {
      isBowLeader: true,
      baseX: 13.60,
      baseY: 1.15,
      baseZ: 0,
      baseRotZ: 0.26,
    };
    parent.add(bowCommander);

    // 2. 50 Rowers
    for (let pair = 1; pair <= 25; pair++) {
      const u = 0.82 - ((pair - 1) / 24) * 0.68;
      const x = (u - 0.5) * BOAT_LENGTH;
      const localBeam = BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25);
      const halfB = localBeam / 2;
      const lateralAthleteZ = halfB * 0.48;

      const tBow = u >= 0.5 ? (u - 0.5) / 0.5 : (0.5 - u) / 0.5;
      const yPos = 0.48 + Math.pow(tBow, 2.2) * 0.16;

      const portRower = createRowerMesh(portJerseyMat, true, pair);
      portRower.position.set(x, yPos, -lateralAthleteZ);
      portRower.rotation.y = -0.12;
      parent.add(portRower);

      const stbdRower = createRowerMesh(stbdJerseyMat, false, pair);
      stbdRower.position.set(x, yPos, lateralAthleteZ);
      stbdRower.rotation.y = 0.12;
      parent.add(stbdRower);
    }

    // 3. Central Whistle Commander
    const midCommander = createStandingAthlete(midLeaderMat, false);
    midCommander.position.set(0.0, 0.85, 0);
    midCommander.userData = {
      isMidCommander: true,
      baseX: 0.0,
      baseY: 0.85,
      baseZ: 0,
    };
    parent.add(midCommander);

    // 4. 3 Steersmen
    const steersmenConfig = [
      { x: -11.80, y: 1.02, z: 0.14, rotZ: -0.12 },
      { x: -12.60, y: 1.14, z: -0.14, rotZ: -0.15 },
      { x: -13.50, y: 1.28, z: 0.00, rotZ: -0.18 },
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
      parent.add(steersman);
    });
  };

  // Helper: Build Wake & Splashes
  const buildWakeAndSplashes = (parent: THREE.Group) => {
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
    });

    for (let i = 0; i < 16; i++) {
      const splash = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8), foamMat);
      const x = BOAT_LENGTH / 2 - i * 0.8;
      const z = (i * 0.12) * (i % 2 === 0 ? 1 : -1);
      splash.position.set(x, 0.02, z);
      parent.add(splash);
    }

    for (let j = 0; j < 20; j++) {
      const sternWake = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), foamMat);
      sternWake.rotation.x = -Math.PI / 2;
      sternWake.position.set(-BOAT_LENGTH / 2 - j * 0.7, 0.01, (Math.random() - 0.5) * 0.8);
      parent.add(sternWake);
    }
  };

  const viewAngleLabels: Record<ViewAngle, string> = {
    '3/4': '3/4',
    'TOP': 'TOP',
    'SIDE': 'SIDE',
    'CLOSE_UP_BOW': 'CLOSE-UP MŨI',
    'CLOSE_UP_STERN': 'CLOSE-UP ĐUÔI',
  };

  return (
    <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden select-none">
      {/* 1. Main 3D Viewport - Occupying >80% Dominant Canvas */}
      <div className="relative w-full h-[620px] md:h-[680px] bg-slate-950">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        />

        {/* Minimal Floating Status Tag at Top-Left */}
        <div className="absolute top-3.5 left-4 z-10 pointer-events-none flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md text-slate-300 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong className="text-white tracking-wide">TUM NÚP 2</strong>
            <span className="text-slate-500">•</span>
            <span className="text-sky-400 font-mono">30.20m</span>
          </div>
        </div>

        {/* Minimal Play/Pause Indicator at Top-Right */}
        <div className="absolute top-3.5 right-4 z-10 flex items-center gap-2">
          <button
            id="btn-quick-toggle-animation"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 backdrop-blur-md text-xs font-mono text-slate-300 hover:text-white shadow-lg transition"
            title={isPlaying ? 'Tạm dừng mô phỏng chèo' : 'Tiếp tục mô phỏng chèo'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">105 nhịp/phút</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span className="hidden sm:inline">Tiếp tục</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Floating Minimal Dock - Fixed at Bottom Center */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/90 px-3 py-2 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-200">
          {/* Main 4 Controls */}
          {/* Button 1: Xoay 360° */}
          <button
            id="btn-toggle-auto-rotate"
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
              isAutoRotating
                ? 'bg-sky-600 text-white font-bold shadow-lg shadow-sky-600/30'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Bật/tắt tự động xoay 360°"
          >
            <Compass className={`w-4 h-4 ${isAutoRotating ? 'animate-spin text-white' : 'text-sky-400'}`} />
            <span>Xoay 360°</span>
          </button>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* Button 2: Phóng to */}
          <button
            id="btn-zoom-in"
            onClick={() => handleZoom(-4)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Phóng to (Scroll / Pinch)"
          >
            <ZoomIn className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Phóng to</span>
          </button>

          {/* Button 3: Thu nhỏ */}
          <button
            id="btn-zoom-out"
            onClick={() => handleZoom(4)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Thu nhỏ (Scroll / Pinch)"
          >
            <ZoomOut className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Thu nhỏ</span>
          </button>

          {/* Button 4: Đặt lại góc nhìn */}
          <button
            id="btn-reset-view"
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Đặt lại góc nhìn 3D ban đầu"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Đặt lại</span>
          </button>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* Compact Menu 1: Góc nhìn */}
          <div className="relative">
            <button
              id="btn-menu-camera-angle"
              onClick={() => {
                setIsViewMenuOpen(!isViewMenuOpen);
                setIsDisplayMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                isViewMenuOpen
                  ? 'bg-slate-800 text-sky-400 font-bold'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Góc nhìn: {viewAngleLabels[viewAngle]}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* View Angle Dropdown */}
            {isViewMenuOpen && (
              <div className="absolute bottom-full mb-2.5 right-0 sm:left-0 w-44 bg-slate-900/95 border border-slate-800 rounded-xl p-1.5 backdrop-blur-xl shadow-2xl space-y-1 font-mono text-xs z-30 animate-in fade-in slide-in-from-bottom-2">
                {(
                  [
                    { id: '3/4', label: '3/4 (Tổng thể)' },
                    { id: 'TOP', label: 'TOP (Nhìn trên)' },
                    { id: 'SIDE', label: 'SIDE (Nhìn bên)' },
                    { id: 'CLOSE_UP_BOW', label: 'CLOSE-UP MŨI' },
                    { id: 'CLOSE_UP_STERN', label: 'CLOSE-UP ĐUÔI' },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    id={`btn-select-view-${v.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => {
                      setViewAngle(v.id);
                      setIsViewMenuOpen(false);
                      setIsAutoRotating(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      viewAngle === v.id
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{v.label}</span>
                    {viewAngle === v.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compact Menu 2: ⚙ Hiển thị */}
          <div className="relative">
            <button
              id="btn-menu-display-settings"
              onClick={() => {
                setIsDisplayMenuOpen(!isDisplayMenuOpen);
                setIsViewMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                isDisplayMenuOpen
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <Settings2 className="w-4 h-4 text-emerald-400" />
              <span>⚙ Hiển thị</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Display Settings Popover */}
            {isDisplayMenuOpen && (
              <div className="absolute bottom-full mb-2.5 right-0 w-64 bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl space-y-3 font-mono text-xs z-30 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                    TÙY CHỌN HIỂN THỊ
                  </span>
                  <button
                    onClick={() => setIsDisplayMenuOpen(false)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1. Render Modes */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Chế độ vật liệu:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      id="btn-mode-pbr"
                      onClick={() => setRenderMode('REALISTIC_PBR')}
                      className={`px-2 py-1.5 rounded-lg text-center transition ${
                        renderMode === 'REALISTIC_PBR'
                          ? 'bg-emerald-600 text-white font-bold shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      PBR
                    </button>
                    <button
                      id="btn-mode-cad"
                      onClick={() => setRenderMode('BLUEPRINT_CAD')}
                      className={`px-2 py-1.5 rounded-lg text-center transition ${
                        renderMode === 'BLUEPRINT_CAD'
                          ? 'bg-sky-600 text-white font-bold shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Khung dây
                    </button>
                    <button
                      id="btn-mode-kem"
                      onClick={() => setRenderMode('STRUCTURAL_KEM')}
                      className={`px-2 py-1.5 rounded-lg text-center transition ${
                        renderMode === 'STRUCTURAL_KEM'
                          ? 'bg-purple-600 text-white font-bold shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Kềm
                    </button>
                  </div>
                </div>

                {/* 2. Feature Toggles List */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Các lớp đối tượng:
                  </span>

                  {/* VĐV Toggle */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>VĐV (55 người)</span>
                    </span>
                    <input
                      id="checkbox-show-crew"
                      type="checkbox"
                      checked={showCrew}
                      onChange={(e) => setShowCrew(e.target.checked)}
                      className="accent-sky-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>

                  {/* Thước đo Toggle */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Ruler className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thước đo 3D</span>
                    </span>
                    <input
                      id="checkbox-show-dimensions"
                      type="checkbox"
                      checked={showDimensions}
                      onChange={(e) => setShowDimensions(e.target.checked)}
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>

                  {/* Lưới tọa độ Toggle */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Grid className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lưới tọa độ</span>
                    </span>
                    <input
                      id="checkbox-show-grid"
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="accent-slate-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>

                  {/* Mặt cắt Toggle & Slider */}
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Scissors className="w-3.5 h-3.5 text-rose-400" />
                        <span>Mặt cắt trạm</span>
                      </span>
                      <input
                        id="checkbox-show-slice"
                        type="checkbox"
                        checked={showSlicePlane}
                        onChange={(e) => setShowSlicePlane(e.target.checked)}
                        className="accent-rose-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </label>

                    {showSlicePlane && (
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Vị trí X:</span>
                          <strong className="text-rose-400">{stationSliceMeters.toFixed(1)} m</strong>
                        </div>
                        <input
                          id="slider-station-slice-popover"
                          type="range"
                          min="0"
                          max={BOAT_LENGTH}
                          step="0.1"
                          value={stationSliceMeters}
                          onChange={(e) => setStationSliceMeters(Number(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Open 2D Formation Button */}
                <button
                  id="btn-open-formation-from-popover"
                  onClick={() => {
                    setIsCrewFormationOpen(true);
                    setIsDisplayMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-600/40 text-xs font-bold transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Xem Sơ đồ 55 VĐV (2D)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 55-Athlete 2D Crew Formation Modal */}
      <CrewFormationModal
        isOpen={isCrewFormationOpen}
        onClose={() => setIsCrewFormationOpen(false)}
      />
    </div>
  );
};
