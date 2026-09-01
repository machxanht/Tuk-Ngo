import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TECHNICAL_SECTIONS, COLOR_PALETTE, CREW_ROSTER } from '../data/technicalReferenceData';
import { Camera, Layers, Play, Pause, Eye, Maximize2, RotateCcw, Crosshair, Sparkles, Sliders } from 'lucide-react';

interface Interactive3DBlueprintProps {
  activeSectionId?: number;
  onSelectSection?: (sectionId: number) => void;
}

type ViewAngle = '3D_ORBIT' | 'TOP_PLAN' | 'SIDE_ELEVATION' | 'BOW_FRONT' | 'MIDSHIP_SECTION';
type RenderMode = 'BLUEPRINT_CAD' | 'REALISTIC_PBR' | 'STRUCTURAL_KEM' | 'CREW_MATRIX';

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

  // References for Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraTypeRef = useRef<'PERSPECTIVE' | 'ORTHO'>('PERSPECTIVE');
  const boatGroupRef = useRef<THREE.Group | null>(null);
  const paddlesGroupRef = useRef<THREE.Group | null>(null);
  const crewGroupRef = useRef<THREE.Group | null>(null);
  const kemGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);
  const mousePrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraOrbitRef = useRef<{ radius: number; theta: number; phi: number; target: THREE.Vector3 }>({
    radius: 34,
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
    target: new THREE.Vector3(0, 0, 0),
  });

  // Calculate hull dimensions
  const BOAT_LENGTH = 30.2; // meters
  const BOAT_MAX_BEAM = 1.16; // meters
  const BOAT_MID_DEPTH = 0.48; // meters
  const PROW_RISE = 1.38; // meters
  const STERN_RISE = 1.52; // meters

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(renderMode === 'BLUEPRINT_CAD' ? 0x061121 : 0x0b1320);

    // 2. CAMERAS
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    cameraRef.current = camera;

    const frustumSize = 35;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      200
    );
    orthoCameraRef.current = orthoCamera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    sunLight.position.set(18, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fillLight.position.set(-15, 12, -15);
    scene.add(fillLight);

    // 5. GRID / CAD PLANE
    const gridHelper = new THREE.GridHelper(50, 50, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.3;
    scene.add(gridHelper);

    // 6. BUILD 3D NGO BOAT MESHES
    const boatGroup = new THREE.Group();
    boatGroupRef.current = boatGroup;
    scene.add(boatGroup);

    // BUILD HULL
    buildHullMesh(boatGroup, renderMode);

    // BUILD KÈM STRUCTURAL TRUSS
    const kemGroup = new THREE.Group();
    kemGroupRef.current = kemGroup;
    buildKemTruss(kemGroup, renderMode);
    boatGroup.add(kemGroup);

    // BUILD PADDLES
    const paddlesGroup = new THREE.Group();
    paddlesGroupRef.current = paddlesGroup;
    buildPaddles(paddlesGroup, renderMode);
    boatGroup.add(paddlesGroup);

    // BUILD CREW MATRIX
    const crewGroup = new THREE.Group();
    crewGroupRef.current = crewGroup;
    buildCrew(crewGroup, renderMode);
    boatGroup.add(crewGroup);

    // BUILD WATER SURFACE
    const waterGeo = new THREE.PlaneGeometry(60, 20, 32, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x85583e,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.65,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.0;
    waterMeshRef.current = waterMesh;
    scene.add(waterMesh);

    // BUILD SLICE PLANE INDICATOR
    const sliceGeo = new THREE.PlaneGeometry(3, 3);
    const sliceMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const slicePlane = new THREE.Mesh(sliceGeo, sliceMat);
    slicePlane.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    slicePlane.position.y = 0.4;
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
        cameraOrbitRef.current.theta -= dx * 0.008;
        cameraOrbitRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.05, cameraOrbitRef.current.phi + dy * 0.008)
        );
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraOrbitRef.current.radius = Math.max(
        6,
        Math.min(60, cameraOrbitRef.current.radius + e.deltaY * 0.03)
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

    // 9. ANIMATION LOOP
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Animate stroke cadence
      if (isPlaying && paddlesGroupRef.current && boatGroupRef.current) {
        const strokeFreq = (strokeCadenceSPM / 60) * Math.PI * 2;
        const cycleProgress = (elapsedTime * strokeFreq) % (Math.PI * 2);

        // Paddle stroke rotation (Catch, Drive, Extraction, Recovery)
        paddlesGroupRef.current.children.forEach((paddle, idx) => {
          const isPort = idx % 2 === 0;
          const phaseOffset = (idx / 52) * 0.15; // subtle wave propagation lag
          const angle = Math.sin(cycleProgress - phaseOffset);

          paddle.rotation.z = angle * 0.45; // forward-backward stroke swing
          paddle.rotation.x = isPort ? 0.3 + Math.cos(cycleProgress) * 0.15 : -0.3 - Math.cos(cycleProgress) * 0.15;
          paddle.position.y = Math.sin(cycleProgress) * 0.08;
        });

        // Boat dynamic heave & pitch & spring surge from Kềm tension
        boatGroupRef.current.position.y = Math.sin(cycleProgress) * 0.04;
        boatGroupRef.current.rotation.z = Math.cos(cycleProgress) * 0.008; // pitch rocking
      }

      // Update camera position based on current view angle
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

  // Update Slice plane
  useEffect(() => {
    if (slicePlaneRef.current) {
      slicePlaneRef.current.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    }
  }, [stationSliceMeters]);

  // Update visibility toggles
  useEffect(() => {
    if (waterMeshRef.current) waterMeshRef.current.visible = showWater;
    if (crewGroupRef.current) crewGroupRef.current.visible = showCrew;
    if (kemGroupRef.current) {
      kemGroupRef.current.visible = renderMode === 'STRUCTURAL_KEM' || renderMode === 'REALISTIC_PBR' || renderMode === 'BLUEPRINT_CAD';
    }
  }, [showWater, showCrew, renderMode]);

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
      orthoCameraRef.current.position.set(0, 35, 0);
      orthoCameraRef.current.lookAt(0, 0, 0);
      orthoCameraRef.current.rotation.z = Math.PI / 2;
    } else if (viewAngle === 'SIDE_ELEVATION') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(0, 0.4, 25);
      orthoCameraRef.current.lookAt(0, 0.4, 0);
      orthoCameraRef.current.rotation.z = 0;
    } else if (viewAngle === 'BOW_FRONT') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(BOAT_LENGTH / 2 + 6, 0.6, 0);
      orthoCameraRef.current.lookAt(0, 0.6, 0);
      orthoCameraRef.current.rotation.z = 0;
    } else if (viewAngle === 'MIDSHIP_SECTION') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.position.set(stationSliceMeters - BOAT_LENGTH / 2 + 5, 0.3, 0);
      orthoCameraRef.current.lookAt(stationSliceMeters - BOAT_LENGTH / 2, 0.3, 0);
      orthoCameraRef.current.rotation.z = 0;
    }
  };

  // Helper functions to generate 3D procedural Ngo boat geometry
  const buildHullMesh = (parent: THREE.Group, mode: RenderMode) => {
    // 32 Station profiles lofted longitudinally
    const stations = 36;
    const slices = 16;
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    // Base materials
    const isCAD = mode === 'BLUEPRINT_CAD';
    const isKemFocus = mode === 'STRUCTURAL_KEM';

    for (let i = 0; i <= stations; i++) {
      const u = i / stations; // 0 (Stern) to 1 (Bow)
      const x = (u - 0.5) * BOAT_LENGTH; // meters along longitudinal axis

      // Hull beam tapering formula (station width)
      // Max beam at midship (u = 0.5), tapering to 0.08m bow and 0.14m stern
      let beamAtStation = BOAT_MAX_BEAM * Math.sin(u * Math.PI);
      if (u > 0.88) {
        beamAtStation = 0.08 + (1 - (u - 0.88) / 0.12) * (BOAT_MAX_BEAM * 0.4 - 0.08);
      } else if (u < 0.12) {
        beamAtStation = 0.14 + (u / 0.12) * (BOAT_MAX_BEAM * 0.45 - 0.14);
      }

      // Rocker & sheer elevation formula
      // Lowest at midship (y = 0.0), rising to PROW_RISE at u=1.0 and STERN_RISE at u=0.0
      const rockerY = Math.pow(Math.abs(u - 0.5) * 2, 2.2) * 0.26;
      let gunwaleY = 0.46;
      if (u > 0.75) {
        const factor = (u - 0.75) / 0.25;
        gunwaleY = 0.46 + Math.pow(factor, 1.8) * (PROW_RISE - 0.46);
      } else if (u < 0.25) {
        const factor = (0.25 - u) / 0.25;
        gunwaleY = 0.46 + Math.pow(factor, 1.8) * (STERN_RISE - 0.46);
      }

      for (let j = 0; j <= slices; j++) {
        const v = j / slices; // -1 (Port Gunwale) -> 0 (Keel) -> 1 (Starboard Gunwale)
        const angle = (v - 0.5) * Math.PI; // -PI/2 to +PI/2

        const halfBeam = beamAtStation / 2;
        const z = Math.sin(angle) * halfBeam;
        const y = rockerY + (1 - Math.cos(angle)) * (gunwaleY - rockerY);

        vertices.push(x, y, z);

        // Vertex colors for royal blue + gold scroll livery in realistic mode
        if (isCAD) {
          colors.push(0.2, 0.75, 1.0); // Cyan CAD
        } else if (isKemFocus) {
          colors.push(0.2, 0.25, 0.35); // Dim grey
        } else {
          // Realistic Tum Núp 2 livery mapping
          if (u > 0.92) {
            colors.push(0.85, 0.15, 0.15); // Scarlet Red Prow
          } else if (Math.abs(z) > halfBeam * 0.85) {
            colors.push(0.96, 0.62, 0.04); // Gold Gunwale Scroll Trim
          } else if (y < rockerY + 0.12) {
            colors.push(0.12, 0.22, 0.45); // Deep Royal Blue base
          } else {
            colors.push(0.08, 0.15, 0.35); // Midnight blue body
          }
        }
      }
    }

    // Indices for quads
    for (let i = 0; i < stations; i++) {
      for (let j = 0; j < slices; j++) {
        const a = i * (slices + 1) + j;
        const b = (i + 1) * (slices + 1) + j;
        const c = (i + 1) * (slices + 1) + (j + 1);
        const d = i * (slices + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    hullGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    hullGeo.setIndex(indices);
    hullGeo.computeVertexNormals();

    const hullMat = isCAD
      ? new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.85,
        })
      : new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: isKemFocus ? 0.8 : 0.22,
          metalness: 0.15,
          side: THREE.DoubleSide,
          transparent: isKemFocus,
          opacity: isKemFocus ? 0.35 : 1.0,
        });

    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    parent.add(hullMesh);

    // ADD 26 SEATING THWARTS (ĐÒN NGỒI)
    const thwartMat = new THREE.MeshStandardMaterial({
      color: isCAD ? 0x0284c7 : 0x78350f,
      roughness: 0.6,
    });

    for (let k = 0; k < 26; k++) {
      const uPos = 0.12 + (k / 25) * 0.74;
      const xPos = (uPos - 0.5) * BOAT_LENGTH;
      const beamHere = BOAT_MAX_BEAM * Math.sin(uPos * Math.PI) * 0.94;

      const thwartGeo = new THREE.BoxGeometry(0.08, 0.04, beamHere);
      const thwart = new THREE.Mesh(thwartGeo, thwartMat);
      thwart.position.set(xPos, 0.42, 0);
      parent.add(thwart);
    }

    // ADD SACRED EYE (ĐÔI MẮT GHE NGO) ON PROW
    if (!isCAD) {
      const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
      eyeGeo.scale(1.8, 1.0, 0.3);
      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

      // Starboard Eye
      const eyeStarboard = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eyeStarboard.position.set(BOAT_LENGTH / 2 - 1.1, 0.85, 0.18);
      eyeStarboard.rotation.y = 0.25;
      parent.add(eyeStarboard);

      const pupilStarboard = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), eyePupilMat);
      pupilStarboard.position.set(BOAT_LENGTH / 2 - 1.08, 0.85, 0.22);
      parent.add(pupilStarboard);

      // Port Eye
      const eyePort = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eyePort.position.set(BOAT_LENGTH / 2 - 1.1, 0.85, -0.18);
      eyePort.rotation.y = -0.25;
      parent.add(eyePort);

      const pupilPort = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), eyePupilMat);
      pupilPort.position.set(BOAT_LENGTH / 2 - 1.08, 0.85, -0.22);
      parent.add(pupilPort);
    }
  };

  // Build Kèm structural spring-truss system
  const buildKemTruss = (parent: THREE.Group, mode: RenderMode) => {
    const isHighlight = mode === 'STRUCTURAL_KEM';

    const kemMat = new THREE.MeshStandardMaterial({
      color: isHighlight ? 0xf59e0b : 0x582a0b,
      emissive: isHighlight ? 0xb45309 : 0x000000,
      emissiveIntensity: isHighlight ? 0.6 : 0.0,
      roughness: 0.4,
    });

    const cableMat = new THREE.MeshBasicMaterial({
      color: isHighlight ? 0x38bdf8 : 0x94a3b8,
    });

    // 1. Long Cajeput Round Timber (Cây Kềm Suốt - 24m)
    const kemPoleGeo = new THREE.CylinderGeometry(0.09, 0.09, 24.5, 16);
    kemPoleGeo.rotateZ(Math.PI / 2);
    const kemPole = new THREE.Mesh(kemPoleGeo, kemMat);
    kemPole.position.set(0, 0.22, 0);
    parent.add(kemPole);

    // 2. Vertical Pre-stress Struts (Trụ Kềm) at 3 stations
    [-7.5, 0, 7.5].forEach((xOffset) => {
      const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12);
      const strut = new THREE.Mesh(strutGeo, kemMat);
      strut.position.set(xOffset, 0.28, 0);
      parent.add(strut);
    });

    // 3. Tension Rigging Cable lines
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-12.0, 0.12, 0),
      new THREE.Vector3(-7.5, 0.45, 0),
      new THREE.Vector3(0, 0.48, 0),
      new THREE.Vector3(7.5, 0.45, 0),
      new THREE.Vector3(12.0, 0.12, 0),
    ]);
    const cableLine = new THREE.Line(lineGeo, cableMat);
    parent.add(cableLine);
  };

  // Build 52 individual paddles (dầm bơi) + 3 steering oars (dầm lái)
  const buildPaddles = (parent: THREE.Group, mode: RenderMode) => {
    const paddleMat = new THREE.MeshStandardMaterial({
      color: mode === 'BLUEPRINT_CAD' ? 0x38bdf8 : 0xd97706,
      roughness: 0.5,
    });

    const steeringMat = new THREE.MeshStandardMaterial({
      color: mode === 'BLUEPRINT_CAD' ? 0xec4899 : 0xb91c1c,
      roughness: 0.4,
    });

    // 52 Standard leaf-blade racing paddles
    for (let i = 0; i < 26; i++) {
      const uPos = 0.12 + (i / 25) * 0.74;
      const xPos = (uPos - 0.5) * BOAT_LENGTH;
      const beamHere = BOAT_MAX_BEAM * Math.sin(uPos * Math.PI) * 0.5;

      // Port Paddle
      const portPaddleGroup = new THREE.Group();
      const portShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 8), paddleMat);
      const portBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.18), paddleMat);
      portBlade.position.y = -0.35;
      portPaddleGroup.add(portShaft);
      portPaddleGroup.add(portBlade);
      portPaddleGroup.position.set(xPos, 0.4, -beamHere - 0.12);
      portPaddleGroup.rotation.x = -0.35;
      parent.add(portPaddleGroup);

      // Starboard Paddle
      const stbdPaddleGroup = new THREE.Group();
      const stbdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 8), paddleMat);
      const stbdBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.18), paddleMat);
      stbdBlade.position.y = -0.35;
      stbdPaddleGroup.add(stbdShaft);
      stbdPaddleGroup.add(stbdBlade);
      stbdPaddleGroup.position.set(xPos, 0.4, beamHere + 0.12);
      stbdPaddleGroup.rotation.x = 0.35;
      parent.add(stbdPaddleGroup);
    }

    // 3 Long Steering Oars (Dầm lái - 3.0m) at stern
    [-13.2, -13.8, -14.4].forEach((xStern, sIdx) => {
      const steerGroup = new THREE.Group();
      const steerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.1, 10), steeringMat);
      const steerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.1, 0.24), steeringMat);
      steerBlade.position.y = -1.0;
      steerGroup.add(steerShaft);
      steerGroup.add(steerBlade);
      steerGroup.position.set(xStern, 0.9, sIdx % 2 === 0 ? 0.25 : -0.25);
      steerGroup.rotation.z = -0.65;
      steerGroup.rotation.x = sIdx % 2 === 0 ? 0.2 : -0.2;
      parent.add(steerGroup);
    });
  };

  // Build crew nodes (55 athletes with role color coding)
  const buildCrew = (parent: THREE.Group, mode: RenderMode) => {
    // Role materials
    const blueTeamMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }); // Blue Jersey (Tum Núp 2)
    const goldLeaderMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b }); // Gold Leader (Conductor)
    const redSteerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 }); // Red Steersman

    // 1. Bow Conductor (Dynamic crouch on prow tip)
    const bowLeaderGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.75, 12);
    const bowLeader = new THREE.Mesh(bowLeaderGeo, goldLeaderMat);
    bowLeader.position.set(BOAT_LENGTH / 2 - 1.4, 0.85, 0);
    bowLeader.rotation.z = 0.3;
    parent.add(bowLeader);

    // 2. Central Whistle Conductor (Standing midship on Kềm bridge)
    const midLeader = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.85, 12), goldLeaderMat);
    midLeader.position.set(0, 0.78, 0);
    parent.add(midLeader);

    // 3. 50 Seated Rowers (25 Pairs)
    for (let i = 0; i < 25; i++) {
      const uPos = 0.14 + (i / 24) * 0.7;
      const xPos = (uPos - 0.5) * BOAT_LENGTH;

      // Port Rower
      const rowerPort = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.28), blueTeamMat);
      rowerPort.position.set(xPos, 0.58, -0.22);
      rowerPort.rotation.z = 0.25; // forward lean at catch
      parent.add(rowerPort);

      // Starboard Rower
      const rowerStbd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.28), blueTeamMat);
      rowerStbd.position.set(xPos, 0.58, 0.22);
      rowerStbd.rotation.z = 0.25;
      parent.add(rowerStbd);
    }

    // 4. 3 Standing Steersmen at stern
    [-13.0, -13.6, -14.2].forEach((xStern, sIdx) => {
      const steerMan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.85, 12), redSteerMat);
      steerMan.position.set(xStern, 1.15, sIdx % 2 === 0 ? 0.12 : -0.12);
      steerMan.rotation.z = -0.15;
      parent.add(steerMan);
    });
  };

  // Calculate live Station properties
  const uStation = stationSliceMeters / BOAT_LENGTH;
  const currentBeam = (
    BOAT_MAX_BEAM * (uStation > 0.88 ? 0.08 + (1 - (uStation - 0.88) / 0.12) * (BOAT_MAX_BEAM * 0.4 - 0.08) : Math.sin(uStation * Math.PI))
  ).toFixed(2);
  const currentDepth = (0.46 + Math.pow(Math.abs(uStation - 0.5) * 2, 2) * 0.25).toFixed(2);

  return (
    <div id="interactive-3d-blueprint-viewport" className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl flex flex-col">
      {/* Viewport Top Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
            HỆ THỐNG DỰNG HÌNH 3D & CAD
          </span>
          <span className="text-xs font-mono text-slate-400">
            [NGO_ST_TUMNUP2_2024_MASTER]
          </span>
        </div>

        {/* View Camera Angles Selector */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
          <button
            id="btn-view-3d-orbit"
            onClick={() => setViewAngle('3D_ORBIT')}
            className={`px-2.5 py-1 rounded transition font-mono ${
              viewAngle === '3D_ORBIT'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Xoay tự do (3D Orbit)
          </button>
          <button
            id="btn-view-top-plan"
            onClick={() => setViewAngle('TOP_PLAN')}
            className={`px-2.5 py-1 rounded transition font-mono ${
              viewAngle === 'TOP_PLAN'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nhìn từ trên (Top Plan)
          </button>
          <button
            id="btn-view-side-elev"
            onClick={() => setViewAngle('SIDE_ELEVATION')}
            className={`px-2.5 py-1 rounded transition font-mono ${
              viewAngle === 'SIDE_ELEVATION'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chiếu cạnh (Side Sheer)
          </button>
          <button
            id="btn-view-bow-front"
            onClick={() => setViewAngle('BOW_FRONT')}
            className={`px-2.5 py-1 rounded transition font-mono ${
              viewAngle === 'BOW_FRONT'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chính diện mũi (Bow Front)
          </button>
          <button
            id="btn-view-midship-section"
            onClick={() => setViewAngle('MIDSHIP_SECTION')}
            className={`px-2.5 py-1 rounded transition font-mono ${
              viewAngle === 'MIDSHIP_SECTION'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mặt cắt trạm (Section Cut)
          </button>
        </div>

        {/* Shader Render Modes */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
          <button
            id="btn-render-pbr"
            onClick={() => setRenderMode('REALISTIC_PBR')}
            className={`px-2.5 py-1 rounded transition font-mono ${
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
            className={`px-2.5 py-1 rounded transition font-mono ${
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
            className={`px-2.5 py-1 rounded transition font-mono ${
              renderMode === 'STRUCTURAL_KEM'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kết cấu kềm
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-[480px] cursor-grab active:cursor-grabbing relative select-none"
      >
        {/* Floating Calibration Overlay on 3D Canvas */}
        <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5 font-mono text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2 text-sky-400 font-bold border-b border-slate-800 pb-1">
            <Crosshair className="w-3.5 h-3.5" />
            <span>THÔNG SỐ HÌNH HỌC THỰC TẾ</span>
          </div>
          <div>Chiều dài tổng thể (LOA): <span className="text-white font-bold">30.20 m</span></div>
          <div>Chiều rộng lớn nhất (Beam): <span className="text-white font-bold">1.16 m</span></div>
          <div>Chiều cao mạn giữa (Depth): <span className="text-white font-bold">0.48 m</span></div>
          <div>Độ vút Mũi / Độ vút Đuôi: <span className="text-white font-bold">+1.38m / +1.52m</span></div>
          <div>Lượng choán nước: <span className="text-emerald-400 font-bold">5.100 kg (55 VĐV)</span></div>
          <div className="text-amber-400">Vị trí cắt trạm: Trạm {Math.round((stationSliceMeters / BOAT_LENGTH) * 32)} ({stationSliceMeters.toFixed(1)}m) | Chiều rộng: {currentBeam}m</div>
        </div>

        {/* Floating View Angle Prompt */}
        <div className="absolute bottom-3 right-3 pointer-events-none font-mono text-[10px] text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-md border border-slate-800">
          Kéo chuột trái: Xoay | Cuộn chuột: Thu phóng | Góc nhìn: {viewAngle}
        </div>
      </div>

      {/* Viewport Bottom Controls Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border-t border-slate-800 text-xs">
        {/* Animation Kinematics Slider */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-kinematics"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition"
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
            <span className="font-mono font-bold text-sky-400 w-16">
              {strokeCadenceSPM} SPM
            </span>
          </div>
        </div>

        {/* Station Cross-Section Scrub Slider */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">Vị trí cắt (0-30m):</span>
          <input
            id="slider-station-slice"
            type="range"
            min="0.5"
            max="29.7"
            step="0.1"
            value={stationSliceMeters}
            onChange={(e) => setStationSliceMeters(Number(e.target.value))}
            className="w-32 accent-rose-500 cursor-pointer"
          />
          <span className="font-mono font-bold text-rose-400 w-12">
            {stationSliceMeters.toFixed(1)}m
          </span>
        </div>

        {/* Visibility Checkbox Toggles */}
        <div className="flex items-center gap-4 text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showWater}
              onChange={(e) => setShowWater(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <span>Mặt nước sông Maspéro</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showCrew}
              onChange={(e) => setShowCrew(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <span>Mô hình 55 vận động viên</span>
          </label>
        </div>
      </div>
    </div>
  );
};
