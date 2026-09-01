import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CrewFormationModal } from './CrewFormationModal';
import { MaterialCustomizerModal } from './MaterialCustomizerModal';
import {
  SEVEN_STROKE_PHASES,
  getGlobalStrokePhase,
  calculateBoatHydrodynamics,
  HydrodynamicState,
  StrokePhaseInfo,
} from '../utils/rowingKinematics';
import {
  BOAT_SPECS_V2,
  buildTumNup2MasterV2,
} from '../utils/tumNup2MasterV2';
import {
  buildTumNup2Crew,
  CrewSystem,
} from '../utils/tumNup2CrewBuilder';
import {
  BoatMaterialConfig,
  getDefaultMaterialConfig,
} from '../utils/boatMaterialSystem';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Settings2,
  Camera,
  Play,
  Pause,
  ChevronDown,
  Users,
  Grid,
  Ruler,
  Eye,
  Waves,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  Activity,
  Palette,
  Layers,
  RotateCw,
} from 'lucide-react';

interface Interactive3DBlueprintProps {
  activeSectionId?: number;
  onSelectSection?: (sectionId: number) => void;
}

type ViewAngle = '3/4' | 'TOP' | 'SIDE' | 'FRONT' | 'REAR' | 'CLOSE_UP_BOW' | 'CLOSE_UP_STERN';
type RenderMode = 'REALISTIC_PBR' | 'BLUEPRINT_CAD' | 'STRUCTURAL_KEM';

export interface GeometryVerificationItem {
  id: string;
  name: string;
  vietnameseName: string;
  status: 'CONFIRMED' | 'APPROXIMATE' | 'UNKNOWN';
  targetView: ViewAngle;
  evidenceSource: string;
  evidenceUrl?: string;
  description: string;
  specs: string;
}

export const GEOMETRY_VERIFICATION_CHECKLIST: GeometryVerificationItem[] = [
  {
    id: 'PADDLE_OUTWARD',
    name: 'Paddle Orientation (Mái chèo ngoài mạn)',
    vietnameseName: 'Mái chèo xòe ngoài mạn & đòn bẩy be ghe',
    status: 'CONFIRMED',
    targetView: 'FRONT',
    evidenceSource: 'YouTube Livestream 2024 (Timestamp 00:45:10 - 00:47:30)',
    evidenceUrl: 'https://www.youtube.com/live/XagC29Eyt_U?si=-MEQXY-vzW3dxT2w',
    description: 'Mái chèo của 50 tay chèo bố trí đối xứng hai bên và luôn xòe ra ngoài mạn ghe (không chụm vào lòng). Mép be ghe làm điểm tì đòn bẩy tự nhiên khi kéo nước.',
    specs: 'Góc xòe mạn: 27.5° • Độ vươn ngoài be: 0.25m-0.42m • Không xuyên lòng ghe',
  },
  {
    id: 'BOW_PROW',
    name: 'Prow & Stem (Mũi ghe & Sống mũi)',
    vietnameseName: 'Mũi ghe vươn dài, thon nhọn & vút cong',
    status: 'CONFIRMED',
    targetView: 'CLOSE_UP_BOW',
    evidenceSource: 'Video Reference @monghuorhout (Frame 00:00-00:06 & 00:31-00:43)',
    evidenceUrl: 'https://baosoctrang.org.vn/the-thao/le-ha-thuy-ghe-ngo-chua-tum-nup-2024',
    description: 'Mũi ghe vươn dài nhọn như mũi kim, sống chữ V sắc chém nước vút lên +1.38m, chóp mũi có ốp đỏ vuốt nhọn và chùm tua thiêng đen rủ xuống.',
    specs: 'Cao độ: +1.38m • Góc vào nước: 11.8° • V-sharpness: 1.0 (Razor edge)',
  },
  {
    id: 'MIDBODY_HULL',
    name: 'Midbody & Cockpit (Thân giữa & Khoang chèo)',
    vietnameseName: 'Thân giữa thon hình thoi (Spindle Planform)',
    status: 'CONFIRMED',
    targetView: 'TOP',
    evidenceSource: 'Video Reference (Frame 00:07-00:20, 01:14-01:21) & Báo Sóc Trăng 2024',
    description: 'Bề rộng lớn nhất 1.12m tại tâm X=0m, đáy chữ U thoai thoải rẽ nước êm, mạn mở loe 14.5° cho 2 VĐV ngồi sát mép nước.',
    specs: 'Bmax: 1.12m • Dmid: 0.58m • Tỷ lệ L/B: 27.0:1 • Góc loe mạn: 14.5°',
  },
  {
    id: 'STERN_TAIL',
    name: 'Stern & Shrimp Tail (Đuôi ghe & Đuôi tôm)',
    vietnameseName: 'Đuôi tôm vút cao hình cánh cung',
    status: 'CONFIRMED',
    targetView: 'CLOSE_UP_STERN',
    evidenceSource: 'Video Reference @monghuorhout (Frame 00:21-00:30) & TTXVN 7706595',
    description: 'Đuôi tôm vuốt thuôn dài liên tục từ thân sau, uốn cong vút cao +1.52m tạo cánh vây định hướng ổn định đường bơi.',
    specs: 'Cao độ: +1.52m • Góc thoát nước: 9.2° • Tiết diện: Dẹp mỏng khí động',
  },
  {
    id: 'KEEL_ROCKER',
    name: 'Keel Rocker (Độ cong sống lườn đáy)',
    vietnameseName: 'Đường cong sống đáy C2 liên tục',
    status: 'CONFIRMED',
    targetView: 'SIDE',
    evidenceSource: 'Video Reference Toàn cảnh 100% (Frame 01:14-01:21)',
    description: 'Sống đáy nằm phẳng ở 1/3 thân giữa (baseline tiếp nước), sau đó gia tốc cong mượt mà lên +1.38m (mũi) và +1.52m (đuôi). Không gãy khúc.',
    specs: 'Đáy giữa: Y=0.00m • Độ vút mũi: +1.38m • Độ vút đuôi: +1.52m',
  },
  {
    id: 'MASTER_KEM',
    name: 'Master Kem (Cây Kềm chịu lực dọc)',
    vietnameseName: 'Cây Kềm gia cường đàn hồi toàn thân',
    status: 'CONFIRMED',
    targetView: 'SIDE',
    evidenceSource: 'Hiện trường Lễ hạ thủy Ghe Ngo chùa Bô Tum Răng Sây 2024',
    description: 'Thân gỗ sao tròn Ø90mm chạy dọc tim ghe từ mũi đến đuôi, liên kết bằng hệ thống trụ chống chịu lực uốn nén khi 55 VĐV dập mái.',
    specs: 'Đường kính: Ø90mm • Chiều dài: 28.5m • Trụ chống: 24 vị trí',
  },
  {
    id: 'CREW_SYNCHRONY',
    name: 'Crew Dynamics & 7-Phase Cycle',
    vietnameseName: 'Đội hình 55 VĐV & Chu kỳ 7 pha chèo chuẩn',
    status: 'CONFIRMED',
    targetView: '3/4',
    evidenceSource: 'Video YouTube Livestream Chung kết Maspero 2024 (Timestamp 00:45:10)',
    evidenceUrl: 'https://www.youtube.com/live/XagC29Eyt_U?si=-MEQXY-vzW3dxT2w',
    description: '55 VĐV phân bố gồm 1 chỉ huy mũi, 48-50 tay chèo ngồi đôi song song trên đòn gỗ, 3 tay lái sau đuôi. Chu kỳ 7 pha động tác thể hiện rõ phối hợp lưng-vai-tay và dầm cắm sâu dưới nước.',
    specs: '55 VĐV • 24 Cặp chèo đôi • Nhịp: 95-125 SPM • Góc cắm dầm: 55°-60°',
  },
  {
    id: 'WOOD_THICKNESS',
    name: 'Sao Wood Thickness (Độ dày ván gỗ)',
    vietnameseName: 'Chiều dày thành ván gỗ sao nguyên khối',
    status: 'APPROXIMATE',
    targetView: 'FRONT',
    evidenceSource: 'Kinh nghiệm nghệ nhân đóng ghe truyền thống Sóc Trăng',
    description: 'Đáy đục từ thân cây sao nguyên khối dày ~35mm, mạn ghép be mỏng dần ~24mm để tối ưu hóa trọng lượng.',
    specs: 'Đáy lườn: 35mm • Mạn be: 24mm • Sai số ước tính: ±4mm',
  },
  {
    id: 'BOTTOM_COATING',
    name: 'Bottom Composite Coating (Lớp phủ lườn)',
    vietnameseName: 'Vật liệu bảo vệ & giảm ma sát đáy lườn',
    status: 'UNKNOWN',
    targetView: 'FRONT',
    evidenceSource: 'Chưa có thông tin công bố chính thức từ Ban Quản trị Chùa',
    description: 'Công nghệ bí truyền xử lý trơn trượt bề mặt đáy (dầu rái truyền thống hay composite nano giảm ma sát) chưa được xác nhận.',
    specs: 'Trạng thái: Chưa xác nhận (Unknown) • Cần phỏng vấn nghệ nhân',
  },
];

export const Interactive3DBlueprint: React.FC<Interactive3DBlueprintProps> = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Active Sub-Tab: '3D_CANVAS' | 'GEOMETRY_CHECKLIST'
  const [activeSubTab, setActiveSubTab] = useState<'3D_CANVAS' | 'GEOMETRY_CHECKLIST'>('3D_CANVAS');

  // View & Render State
  const [viewAngle, setViewAngle] = useState<ViewAngle>('3/4');
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC_PBR');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);

  // Material System Configuration
  const [materialConfig, setMaterialConfig] = useState<BoatMaterialConfig>(getDefaultMaterialConfig());
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);

  // Feature Toggles: Real-time Essentials on by default
  const [showHull, setShowHull] = useState<boolean>(true);
  const [showAthletes, setShowAthletes] = useState<boolean>(true);
  const [showPaddles, setShowPaddles] = useState<boolean>(true);
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false); // Clean viewport by default
  const [showDimensions, setShowDimensions] = useState<boolean>(false);

  // Dropdown Popovers & Modals
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState<boolean>(false);
  const [isCrewFormationOpen, setIsCrewFormationOpen] = useState<boolean>(false);

  // Rowing Kinematics State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isContinuousLoop, setIsContinuousLoop] = useState<boolean>(true);
  const [selectedStaticPhase, setSelectedStaticPhase] = useState<number | null>(null);
  const [cadenceSPM, setCadenceSPM] = useState<number>(105);
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState<StrokePhaseInfo>(SEVEN_STROKE_PHASES[0]);

  // Selected item in geometry inspection
  const [selectedGeoItem, setSelectedGeoItem] = useState<string>('PADDLE_OUTWARD');

  // Refs for Animation Loop
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isContinuousLoopRef = useRef<boolean>(isContinuousLoop);
  const isAutoRotatingRef = useRef<boolean>(isAutoRotating);
  const cadenceRef = useRef<number>(cadenceSPM);
  const accumulatedCycleRef = useRef<number>(0.0);
  const crewSystemRef = useRef<CrewSystem | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isContinuousLoopRef.current = isContinuousLoop;
  }, [isContinuousLoop]);

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  useEffect(() => {
    cadenceRef.current = cadenceSPM;
  }, [cadenceSPM]);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraTypeRef = useRef<'PERSPECTIVE' | 'ORTHO'>('PERSPECTIVE');
  const masterBoatGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const buoysGroupRef = useRef<THREE.Group | null>(null);
  const buoyMeshesRef = useRef<THREE.Group[]>([]);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const dimensionsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const boatDistanceRef = useRef<number>(0);

  const [liveHydroState, setLiveHydroState] = useState<HydrodynamicState>({
    forwardSpeedMs: 5.2,
    thrustForceN: 0,
    surgeOffsetX: 0,
    pitchRad: 0,
    heaveY: 0,
  });
  const [boatDistanceM, setBoatDistanceM] = useState<number>(0);

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

  const BOAT_LENGTH = BOAT_SPECS_V2.LOA;

  // Zoom Control
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

  // Reset View Control
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

  // Reset Animation (rewind to t=0)
  const handleResetAnimation = () => {
    accumulatedCycleRef.current = 0.0;
    boatDistanceRef.current = 0;
    setBoatDistanceM(0);
    setIsContinuousLoop(true);
    setSelectedStaticPhase(null);
    if (crewSystemRef.current) {
      crewSystemRef.current.update(0.0);
      crewSystemRef.current.group.position.set(0, 0, 0);
      crewSystemRef.current.group.rotation.z = 0;
    }
    if (masterBoatGroupRef.current) {
      masterBoatGroupRef.current.position.set(0, 0, 0);
      masterBoatGroupRef.current.rotation.z = 0;
    }
    if (dimensionsGroupRef.current) {
      dimensionsGroupRef.current.position.set(0, 0, 0);
      dimensionsGroupRef.current.rotation.z = 0;
    }
    setCurrentPhaseInfo(SEVEN_STROKE_PHASES[0]);
  };

  // Select a specific stroke phase (1 to 6 or Loop)
  const handleSelectPhase = (phase: StrokePhaseInfo) => {
    setIsContinuousLoop(false);
    setIsPlaying(false);
    setSelectedStaticPhase(phase.phaseIndex);
    accumulatedCycleRef.current = (phase.range[0] + phase.range[1]) / 2.0;
    if (crewSystemRef.current) {
      crewSystemRef.current.update(accumulatedCycleRef.current);
      crewSystemRef.current.group.position.set(0, 0, 0);
      crewSystemRef.current.group.rotation.z = 0;
    }
    if (masterBoatGroupRef.current) {
      masterBoatGroupRef.current.position.set(0, 0, 0);
      masterBoatGroupRef.current.rotation.z = 0;
    }
    if (dimensionsGroupRef.current) {
      dimensionsGroupRef.current.position.set(0, 0, 0);
      dimensionsGroupRef.current.rotation.z = 0;
    }
    setCurrentPhaseInfo(phase);
  };

  const handleSelectContinuousLoop = () => {
    setIsContinuousLoop(true);
    setSelectedStaticPhase(null);
    setIsPlaying(true);
  };

  // Build 3D Dimensions
  const build3DDimensions = (parent: THREE.Group) => {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });

    // 1. LOA = 30.20m
    const loaPoints = [
      new THREE.Vector3(-BOAT_LENGTH / 2, -0.6, 1.6),
      new THREE.Vector3(BOAT_LENGTH / 2, -0.6, 1.6),
    ];
    const loaGeo = new THREE.BufferGeometry().setFromPoints(loaPoints);
    parent.add(new THREE.Line(loaGeo, lineMat));

    // 2. Max Beam = 1.12m
    const beamPoints = [
      new THREE.Vector3(0, 0.65, -BOAT_SPECS_V2.BEAM_MAX / 2),
      new THREE.Vector3(0, 0.65, BOAT_SPECS_V2.BEAM_MAX / 2),
    ];
    const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);
    parent.add(new THREE.Line(beamGeo, lineMat));
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.012);
    sceneRef.current = scene;

    // 2. CAMERAS
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const frustumSize = 34;
    const aspect = width / height;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    orthoCameraRef.current = orthoCamera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    sunLight.position.set(22, 36, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const riverBlueBounce = new THREE.DirectionalLight(0x0284c7, 0.85);
    riverBlueBounce.position.set(-18, -12, -18);
    scene.add(riverBlueBounce);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.9);
    rimLight.position.set(-25, 20, -15);
    scene.add(rimLight);

    // 5. GRID
    const gridHelper = new THREE.GridHelper(60, 60, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.01;
    gridHelper.visible = showGrid;
    gridHelperRef.current = gridHelper;
    scene.add(gridHelper);

    // 6. WATER SURFACE (Sông Maspéro Sóc Trăng)
    const waterGeo = new THREE.PlaneGeometry(120, 60, 64, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0c3b5e,
      roughness: 0.12,
      metalness: 0.75,
      transparent: true,
      opacity: 0.88,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.0; // Baseline water plane level
    waterMesh.receiveShadow = true;
    waterMesh.visible = showWater;
    waterMeshRef.current = waterMesh;
    scene.add(waterMesh);

    // 6.2 RACE COURSE LANE BUOYS (Phao tiêu luồng đua sông Maspéro)
    const buoysGroup = new THREE.Group();
    const buoyGeo = new THREE.SphereGeometry(0.12, 12, 8);
    buoyGeo.scale(1, 1.3, 1);
    const redBuoyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.3 });
    const yellowBuoyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.3 });
    const flagGeo = new THREE.ConeGeometry(0.06, 0.22, 4);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const buoyMeshes: THREE.Group[] = [];
    for (let x = -48; x <= 48; x += 4) {
      [-2.2, 2.2].forEach((z, sideIdx) => {
        const buoyObj = new THREE.Group();
        const mesh = new THREE.Mesh(buoyGeo, Math.floor(x / 4) % 2 === 0 ? redBuoyMat : yellowBuoyMat);
        mesh.position.y = 0.04;
        buoyObj.add(mesh);

        if (Math.abs(x) % 12 === 0) {
          const flag = new THREE.Mesh(flagGeo, flagMat);
          flag.position.y = 0.22;
          flag.rotation.z = sideIdx === 0 ? 0.25 : -0.25;
          buoyObj.add(flag);
        }

        buoyObj.position.set(x, 0, z);
        buoysGroup.add(buoyObj);
        buoyMeshes.push(buoyObj);
      });
    }
    buoysGroup.visible = showWater;
    buoysGroupRef.current = buoysGroup;
    buoyMeshesRef.current = buoyMeshes;
    scene.add(buoysGroup);

    // 7. BUILD NEW HULL V2 (TUM_NUP_2_2024_MASTER_V2)
    const masterBoatGroup = buildTumNup2MasterV2(renderMode);
    masterBoatGroupRef.current = masterBoatGroup;
    masterBoatGroup.visible = showHull;
    scene.add(masterBoatGroup);

    // 8. BUILD 55-ATHLETE CREW & PADDLES
    const crewSystem = buildTumNup2Crew(materialConfig);
    crewSystemRef.current = crewSystem;
    crewSystem.group.visible = showAthletes || showPaddles;
    scene.add(crewSystem.group);

    // 9. BUILD 3D DIMENSION RULERS
    const dimensionsGroup = new THREE.Group();
    build3DDimensions(dimensionsGroup);
    dimensionsGroupRef.current = dimensionsGroup;
    dimensionsGroup.visible = showDimensions;
    scene.add(dimensionsGroup);

    // Initial Camera Orientation
    const { radius, theta, phi, target } = cameraOrbitRef.current;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(target);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current || !orthoCameraRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      const newAspect = newW / newH;

      cameraRef.current.aspect = newAspect;
      cameraRef.current.updateProjectionMatrix();

      orthoCameraRef.current.left = (-frustumSize * newAspect) / 2;
      orthoCameraRef.current.right = (frustumSize * newAspect) / 2;
      orthoCameraRef.current.top = frustumSize / 2;
      orthoCameraRef.current.bottom = -frustumSize / 2;
      orthoCameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Mouse & Touch Controls
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDownRef.current = true;
      if (e.button === 2) isRightMouseDownRef.current = true;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - mousePrevRef.current.x;
      const deltaY = e.clientY - mousePrevRef.current.y;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };

      if (isMouseDownRef.current) {
        setIsAutoRotating(false);
        if (activeCameraTypeRef.current === 'PERSPECTIVE') {
          cameraOrbitRef.current.theta -= deltaX * 0.007;
          cameraOrbitRef.current.phi = Math.max(
            0.05,
            Math.min(Math.PI / 2 - 0.02, cameraOrbitRef.current.phi - deltaY * 0.007)
          );
        } else if (orthoCameraRef.current) {
          orthoCameraRef.current.position.x -= deltaX * 0.03;
          orthoCameraRef.current.position.y += deltaY * 0.03;
        }
      }

      if (isRightMouseDownRef.current) {
        const panSpeed = 0.03;
        cameraOrbitRef.current.target.x -= deltaX * panSpeed;
        cameraOrbitRef.current.target.y += deltaY * panSpeed;
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      isRightMouseDownRef.current = false;
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY * 0.04);
    };

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
        const deltaX = e.touches[0].clientX - touchPrevRef.current.x;
        const deltaY = e.touches[0].clientY - touchPrevRef.current.y;
        touchPrevRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        setIsAutoRotating(false);
        if (activeCameraTypeRef.current === 'PERSPECTIVE') {
          cameraOrbitRef.current.theta -= deltaX * 0.007;
          cameraOrbitRef.current.phi = Math.max(
            0.05,
            Math.min(Math.PI / 2 - 0.02, cameraOrbitRef.current.phi - deltaY * 0.007)
          );
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diff = touchStartDistRef.current - dist;
        touchStartDistRef.current = dist;
        handleZoom(diff * 0.06);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);

    // Animation Render Loop
    let lastTime = performance.now();
    let uiThrottleTimer = 0;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // 1. Auto-rotation in 3D Perspective mode
      if (isAutoRotatingRef.current && activeCameraTypeRef.current === 'PERSPECTIVE') {
        cameraOrbitRef.current.theta += dt * 0.22;
      }

      // 2. 7-Phase Rowing Animation & Hydrodynamic Propulsion Updates
      if (isPlayingRef.current && isContinuousLoopRef.current) {
        const cycleSpeed = cadenceRef.current / 60.0; // Cycles per second
        accumulatedCycleRef.current = (accumulatedCycleRef.current + dt * cycleSpeed) % 1.0;

        // Calculate authentic hydrodynamic propulsion
        const hydro = calculateBoatHydrodynamics(accumulatedCycleRef.current, cadenceRef.current);
        boatDistanceRef.current += hydro.forwardSpeedMs * dt;

        // 2a. Update 55-Athlete Crew Kinematics
        if (crewSystemRef.current) {
          crewSystemRef.current.update(accumulatedCycleRef.current);
        }

        // 2b. Dynamic Boat Hydrodynamic Response (Surge & Pitch)
        // Reaction force pushes boat FORWARD towards Bow (+X), causing dynamic prow lift and forward surge
        const surgeX = hydro.surgeOffsetX;
        const boatPitchZ = -hydro.pitchRad; // Positive pitch angle lifts bow (+Y)
        const boatHeaveY = hydro.heaveY;

        if (masterBoatGroupRef.current) {
          masterBoatGroupRef.current.position.set(surgeX, boatHeaveY, 0);
          masterBoatGroupRef.current.rotation.z = boatPitchZ;
        }
        if (crewSystemRef.current) {
          crewSystemRef.current.group.position.set(surgeX, boatHeaveY, 0);
          crewSystemRef.current.group.rotation.z = boatPitchZ;
        }
        if (dimensionsGroupRef.current) {
          dimensionsGroupRef.current.position.set(surgeX, boatHeaveY, 0);
          dimensionsGroupRef.current.rotation.z = boatPitchZ;
        }

        // 2c. Stream river race course lane buoys backwards (-X) at boat speed
        // This gives continuous, crystal-clear visual confirmation that the boat is moving FORWARD towards Bow (+X)
        if (buoyMeshesRef.current.length > 0) {
          buoyMeshesRef.current.forEach((b) => {
            b.position.x -= hydro.forwardSpeedMs * dt;
            if (b.position.x < -48) {
              b.position.x += 96;
            }
            b.position.y = 0.04 + Math.sin(now * 0.003 + b.position.x * 0.4) * 0.015;
          });
        }

        // Throttle React UI State updates to 15fps to keep rendering smooth at 60fps
        uiThrottleTimer += dt;
        if (uiThrottleTimer > 0.065) {
          uiThrottleTimer = 0;
          const phaseData = getGlobalStrokePhase(accumulatedCycleRef.current);
          setCurrentPhaseInfo(phaseData.phase);
          setLiveHydroState(hydro);
          setBoatDistanceM(boatDistanceRef.current);
        }
      }

      // 3. River Water Wave Animation
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y = Math.sin(now * 0.002) * 0.012;
      }

      // 4. Update camera position
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

  // Synchronize Materials
  useEffect(() => {
    if (crewSystemRef.current) {
      crewSystemRef.current.updateMaterials(materialConfig);
    }
  }, [materialConfig]);

  // Synchronize Layer Toggles
  useEffect(() => {
    if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
    if (waterMeshRef.current) waterMeshRef.current.visible = showWater;
    if (masterBoatGroupRef.current) masterBoatGroupRef.current.visible = showHull;
    if (dimensionsGroupRef.current) dimensionsGroupRef.current.visible = showDimensions;

    if (crewSystemRef.current) {
      crewSystemRef.current.group.visible = showAthletes || showPaddles;
      crewSystemRef.current.athletes.forEach((a) => {
        a.torsoGroup.visible = showAthletes;
        a.paddleGroup.visible = showPaddles;
      });
    }
  }, [showGrid, showWater, showHull, showAthletes, showPaddles, showDimensions]);

  // Update Camera View Angle (5 Standard Validation Modes: 3/4, TOP, SIDE, FRONT, REAR, CLOSE-UPS)
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
    } else if (viewAngle === 'FRONT') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 4.6;
      orthoCameraRef.current.position.set(28, 0.85, 0);
      orthoCameraRef.current.lookAt(0, 0.85, 0);
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (viewAngle === 'REAR') {
      activeCameraTypeRef.current = 'ORTHO';
      orthoCameraRef.current.zoom = 4.6;
      orthoCameraRef.current.position.set(-28, 0.95, 0);
      orthoCameraRef.current.lookAt(0, 0.95, 0);
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

  return (
    <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden select-none">
      {/* Sub-Tabs Selector: [Bản vẽ 3D Thân ghe + VĐV] vs [Kiểm tra Hình học (Checklist)] */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md gap-2">
        <div className="flex items-center gap-2">
          <button
            id="tab-sub-3d-view"
            onClick={() => setActiveSubTab('3D_CANVAS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
              activeSubTab === '3D_CANVAS'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>3D Ghe Ngo + 55 VĐV + Động tác Chèo</span>
          </button>

          <button
            id="tab-sub-geometry-checklist"
            onClick={() => setActiveSubTab('GEOMETRY_CHECKLIST')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
              activeSubTab === 'GEOMETRY_CHECKLIST'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Thẩm định Video & Hình học (Checklist)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 text-[10px]">
              9/9
            </span>
          </button>
        </div>

        {/* Video Direct Source Reference Badge */}
        <a
          href="https://www.youtube.com/live/XagC29Eyt_U?si=-MEQXY-vzW3dxT2w"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 font-mono text-xs text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-lg hover:bg-rose-900/60 transition"
          title="Mở Video Reference Trực tiếp YouTube Livestream Sóc Trăng 2024"
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>YouTube Livestream Ref</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Mode 1: 3D Viewport with Crew & Kinematics Engine */}
      {activeSubTab === '3D_CANVAS' && (
        <div className="relative w-full h-[640px] md:h-[720px] bg-slate-950">
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
          />

          {/* Floating Status Tag at Top-Left */}
          <div className="absolute top-3.5 left-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-2 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md text-slate-300 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-white tracking-wide">TUM NÚP 2 (V2)</strong>
              <span className="text-slate-500">•</span>
              <span className="text-sky-400 font-mono">55 VĐV (Mái chèo ngoài mạn)</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-mono">{cadenceSPM} SPM</span>
            </div>
          </div>

          {/* Top Center: Clean Quick Camera Angles Bar (TOP, SIDE, FRONT, 3/4) */}
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-950/90 border border-slate-800/90 p-1 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-200">
            {(
              [
                { id: '3/4', label: '3/4' },
                { id: 'TOP', label: 'TOP' },
                { id: 'SIDE', label: 'SIDE' },
                { id: 'FRONT', label: 'FRONT' },
                { id: 'CLOSE_UP_BOW', label: 'MŨI' },
                { id: 'CLOSE_UP_STERN', label: 'ĐUÔI' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                id={`btn-camera-view-${v.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => {
                  setViewAngle(v.id);
                  setIsAutoRotating(false);
                }}
                className={`px-3 py-1.5 rounded-xl transition text-[11px] font-bold ${
                  viewAngle === v.id
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Top Right: Real-time 7-Phase Rowing Telemetry HUD */}
          <div className="absolute top-3.5 right-4 z-20 hidden md:flex flex-col gap-1.5 w-72 bg-slate-950/90 border border-slate-800/90 p-3 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                ĐỘNG LỰC HỌC CHÈO (KINEMATICS)
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${currentPhaseInfo.colorHex}22`,
                  color: currentPhaseInfo.colorHex,
                  border: `1px solid ${currentPhaseInfo.colorHex}66`,
                }}
              >
                {currentPhaseInfo.badge}
              </span>
            </div>

            <div className="text-white font-bold text-xs truncate flex items-center justify-between">
              <span>{currentPhaseInfo.nameVi}</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {(liveHydroState.forwardSpeedMs * 3.6).toFixed(1)} km/h
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 pt-1">
              <div>
                <span className="text-slate-500 block">Góc dầm:</span>
                <strong className="text-sky-400">{currentPhaseInfo.paddleAngleDeg}°</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Ngập nước:</span>
                <strong className={currentPhaseInfo.bladeDepthM < 0 ? 'text-emerald-400' : 'text-amber-400'}>
                  {currentPhaseInfo.bladeDepthM} m
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Gập thân:</span>
                <strong className="text-purple-400">{currentPhaseInfo.torsoAngleDeg}°</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Phản lực đẩy:</span>
                <strong className="text-amber-400">+{liveHydroState.thrustForceN.toFixed(0)} N</strong>
              </div>
            </div>

            {/* Forward Vector Direction Indicator */}
            <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Hướng tiến:
              </span>
              <span className="font-bold text-emerald-400">
                MŨI (+X) ➔ TIẾN VỀ PHÍA TRƯỚC
              </span>
            </div>
          </div>

          {/* Canvas Direction Badges (Bow +X on right, Stern -X on left) */}
          <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none z-10 hidden sm:flex flex-col items-center gap-1 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded-xl font-mono text-[10px] backdrop-blur-md shadow-lg shadow-emerald-950/50">
            <span className="font-bold tracking-wider">MŨI GHE (+X)</span>
            <span className="text-[9px] text-emerald-400 font-bold">➔ HƯỚNG TIẾN</span>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none z-10 hidden sm:flex flex-col items-center gap-1 bg-slate-900/70 border border-slate-700/50 text-slate-400 px-2.5 py-1.5 rounded-xl font-mono text-[10px] backdrop-blur-md shadow-lg">
            <span className="font-bold tracking-wider">ĐUÔI GHE (-X)</span>
            <span className="text-[9px] text-slate-500">REAR STERN</span>
          </div>

          {/* Bottom Floating Bar: 7-Phase Selector & Cadence Controller */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-[95%] max-w-4xl bg-slate-950/90 border border-slate-800/90 p-2.5 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs">
            {/* Phase Selector Pills: Chuẩn bị -> Cắm nước -> Kéo mái -> Cực đại lực -> Rút mái -> Hồi vị -> Chạy toàn chu kỳ */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 w-full">
              {/* 1. Chuẩn bị */}
              <button
                id="btn-phase-1-reach"
                onClick={() => handleSelectPhase(SEVEN_STROKE_PHASES[0])}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  !isContinuousLoop && selectedStaticPhase === 1
                    ? 'bg-sky-950 border-sky-400 shadow-md shadow-sky-900/40 text-white font-bold ring-1 ring-sky-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-sky-400 font-bold">1. Chuẩn bị</span>
                <span className="text-[9px] text-slate-500 truncate w-full">Reach (+34°)</span>
              </button>

              {/* 2. Cắm nước */}
              <button
                id="btn-phase-2-catch"
                onClick={() => handleSelectPhase(SEVEN_STROKE_PHASES[1])}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  !isContinuousLoop && selectedStaticPhase === 2
                    ? 'bg-blue-950 border-blue-400 shadow-md shadow-blue-900/40 text-white font-bold ring-1 ring-blue-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-blue-400 font-bold">2. Cắm nước</span>
                <span className="text-[9px] text-slate-500 truncate w-full">Catch (-0.16m)</span>
              </button>

              {/* 3. Kéo mái */}
              <button
                id="btn-phase-3-early-drive"
                onClick={() => handleSelectPhase(SEVEN_STROKE_PHASES[2])}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  !isContinuousLoop && selectedStaticPhase === 3
                    ? 'bg-emerald-950 border-emerald-400 shadow-md shadow-emerald-900/40 text-white font-bold ring-1 ring-emerald-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-emerald-400 font-bold">3. Kéo mái</span>
                <span className="text-[9px] text-slate-500 truncate w-full">Drive (1.450N)</span>
              </button>

              {/* 4. Cực đại lực */}
              <button
                id="btn-phase-4-peak-drive"
                onClick={() => handleSelectPhase(SEVEN_STROKE_PHASES[3])}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  !isContinuousLoop && selectedStaticPhase === 4
                    ? 'bg-amber-950 border-amber-400 shadow-md shadow-amber-900/40 text-white font-bold ring-1 ring-amber-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-amber-400 font-bold">4. Cực đại lực</span>
                <span className="text-[9px] text-slate-500 truncate w-full">Peak (1.820N)</span>
              </button>

              {/* 5. Rút mái */}
              <button
                id="btn-phase-5-extraction"
                onClick={() => handleSelectPhase(SEVEN_STROKE_PHASES[4])}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  !isContinuousLoop && selectedStaticPhase === 5
                    ? 'bg-pink-950 border-pink-400 shadow-md shadow-pink-900/40 text-white font-bold ring-1 ring-pink-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-pink-400 font-bold">5. Rút mái</span>
                <span className="text-[9px] text-slate-500 truncate w-full">Release (+0.12m)</span>
              </button>

              {/* 6. Hồi vị */}
              <button
                id="btn-phase-6-recovery"
                onClick={() => handleSelectPhase(SEVEN_STROKE_PHASES[5])}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  !isContinuousLoop && selectedStaticPhase === 6
                    ? 'bg-purple-950 border-purple-400 shadow-md shadow-purple-900/40 text-white font-bold ring-1 ring-purple-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-purple-400 font-bold">6. Hồi vị</span>
                <span className="text-[9px] text-slate-500 truncate w-full">Airborne (+0.18m)</span>
              </button>

              {/* 7. Chạy toàn chu kỳ */}
              <button
                id="btn-phase-full-cycle-loop"
                onClick={handleSelectContinuousLoop}
                className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isContinuousLoop
                    ? 'bg-cyan-600 border-cyan-400 shadow-md shadow-cyan-900/40 text-white font-bold ring-2 ring-cyan-300'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                  <RotateCw className={`w-3 h-3 ${isContinuousLoop && isPlaying ? 'animate-spin' : ''}`} />
                  Toàn chu kỳ
                </span>
                <span className="text-[9px] text-slate-300 truncate w-full">Continuous Loop</span>
              </button>
            </div>

            {/* Playback Controls & SPM Cadence Slider */}
            <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-1 border-t border-slate-800/80 px-1">
              <div className="flex items-center gap-2">
                <button
                  id="btn-play-pause-rowing"
                  onClick={() => {
                    if (!isContinuousLoop) {
                      setIsContinuousLoop(true);
                      setSelectedStaticPhase(null);
                      setIsPlaying(true);
                    } else {
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition shadow ${
                    isPlaying && isContinuousLoop
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  }`}
                >
                  {isPlaying && isContinuousLoop ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying && isContinuousLoop ? 'Tạm dừng chèo' : 'Phát chu kỳ chèo'}</span>
                </button>

                <button
                  id="btn-reset-animation-loop"
                  onClick={handleResetAnimation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs transition"
                  title="Đặt lại chu kỳ về Pha 1 (Chuẩn bị)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset Animation</span>
                </button>

                <button
                  id="btn-open-crew-formation"
                  onClick={() => setIsCrewFormationOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs transition"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sơ đồ 55 VĐV</span>
                </button>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Nhịp chèo:</span>
                <input
                  id="slider-cadence-spm"
                  type="range"
                  min="60"
                  max="125"
                  value={cadenceSPM}
                  onChange={(e) => setCadenceSPM(Number(e.target.value))}
                  className="w-24 sm:w-32 accent-sky-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-sky-400 font-mono w-16 text-right">
                  {cadenceSPM} SPM
                </span>
              </div>
            </div>
          </div>

          {/* Floating Minimal Dock - Fixed at Bottom Center */}
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/90 px-3 py-1.5 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-200">
            {/* Button 1: Xoay 360° */}
            <button
              id="btn-toggle-auto-rotate"
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
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
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Phóng to (Scroll / Pinch)"
            >
              <ZoomIn className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Phóng to</span>
            </button>

            {/* Button 3: Thu nhỏ */}
            <button
              id="btn-zoom-out"
              onClick={() => handleZoom(4)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Thu nhỏ (Scroll / Pinch)"
            >
              <ZoomOut className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Thu nhỏ</span>
            </button>

            {/* Button 4: Đặt lại góc nhìn */}
            <button
              id="btn-reset-view"
              onClick={handleResetView}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Đặt lại góc nhìn 3D ban đầu"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Đặt lại</span>
            </button>

            <div className="w-px h-5 bg-slate-800 mx-0.5" />

            {/* Button 5: Tùy biến vật liệu (Material Customizer) */}
            <button
              id="btn-open-material-customizer"
              onClick={() => setIsMaterialModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-sky-200 transition"
              title="Tùy biến màu sắc thân ghe, mái chèo, đồng phục"
            >
              <Palette className="w-4 h-4 text-sky-400" />
              <span>Màu sắc</span>
            </button>

            <div className="w-px h-5 bg-slate-800 mx-0.5" />

            {/* Compact Menu: ⚙ Hiển thị */}
            <div className="relative">
              <button
                id="btn-menu-display-settings"
                onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
                  isDisplayMenuOpen
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <span>Hiển thị</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Display Settings Popover */}
              {isDisplayMenuOpen && (
                <div className="absolute bottom-full mb-2.5 right-0 w-72 bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl space-y-3 font-mono text-xs z-30 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                      LỚP HIỂN THỊ
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
                      Chế độ kết cấu ghe:
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
                        PBR Thực tế
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
                        Khung dây CAD
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
                        Cây Kềm
                      </button>
                    </div>
                  </div>

                  {/* 2. Feature Toggles List */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      Các lớp đối tượng:
                    </span>

                    {/* Vỏ ghe Hull Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Vỏ & Kết cấu ghe</span>
                      </span>
                      <input
                        id="checkbox-show-hull"
                        type="checkbox"
                        checked={showHull}
                        onChange={(e) => setShowHull(e.target.checked)}
                        className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </label>

                    {/* VĐV Mannequins Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>55 Vận động viên</span>
                      </span>
                      <input
                        id="checkbox-show-athletes"
                        type="checkbox"
                        checked={showAthletes}
                        onChange={(e) => setShowAthletes(e.target.checked)}
                        className="accent-sky-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </label>

                    {/* Mái chèo Paddles Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Activity className="w-3.5 h-3.5 text-rose-400" />
                        <span>Mái chèo (ngoài mạn)</span>
                      </span>
                      <input
                        id="checkbox-show-paddles"
                        type="checkbox"
                        checked={showPaddles}
                        onChange={(e) => setShowPaddles(e.target.checked)}
                        className="accent-rose-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </label>

                    {/* Mặt nước Water Plane Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Waves className="w-3.5 h-3.5 text-blue-400" />
                        <span>Mặt nước sông Maspero</span>
                      </span>
                      <input
                        id="checkbox-show-water"
                        type="checkbox"
                        checked={showWater}
                        onChange={(e) => setShowWater(e.target.checked)}
                        className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
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

                    {/* Thước đo Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 cursor-pointer hover:bg-slate-800/60 transition">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Thông số & Thước đo</span>
                      </span>
                      <input
                        id="checkbox-show-dimensions"
                        type="checkbox"
                        checked={showDimensions}
                        onChange={(e) => setShowDimensions(e.target.checked)}
                        className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Geometry & Video Verification Checklist Panel */}
      {activeSubTab === 'GEOMETRY_CHECKLIST' && (
        <div className="p-5 space-y-5 bg-slate-950 text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-serif tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Bảng Thẩm định Video & Hình học (Checklist)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Đối chiếu trực tiếp Frame-by-Frame từ Video Livestream Sóc Trăng 2024 & Blueprint @monghuorhout
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                7 CONFIRMED
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/70 text-amber-300 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                1 APPROXIMATE
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                1 UNKNOWN
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {GEOMETRY_VERIFICATION_CHECKLIST.map((item) => {
              const isSelected = selectedGeoItem === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedGeoItem(item.id);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-slate-900/90 border-sky-500/80 shadow-lg shadow-sky-950/40'
                      : 'bg-slate-900/50 border-slate-800/70 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                        {item.name}
                      </span>
                      <h4 className="text-sm font-bold text-white font-serif">{item.vietnameseName}</h4>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 border ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80'
                          : item.status === 'APPROXIMATE'
                          ? 'bg-amber-950 text-amber-300 border-amber-800/80'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.status === 'CONFIRMED' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {item.status === 'APPROXIMATE' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      {item.status === 'UNKNOWN' && <HelpCircle className="w-3 h-3 text-slate-400" />}
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-sky-300 space-y-1">
                    <div>
                      <strong className="text-slate-400">Thông số kỹ thuật:</strong> {item.specs}
                    </div>
                    <div className="text-slate-400 text-[10px] flex items-center gap-1 truncate">
                      <strong>Cơ sở bằng chứng:</strong> {item.evidenceSource}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewAngle(item.targetView);
                        setActiveSubTab('3D_CANVAS');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold transition shadow"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem góc 3D ({item.targetView})</span>
                    </button>

                    {item.evidenceUrl && (
                      <a
                        href={item.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-sky-400 transition"
                      >
                        <span>Mở tài liệu nguồn</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 55-Athlete 2D Crew Formation Modal */}
      <CrewFormationModal
        isOpen={isCrewFormationOpen}
        onClose={() => setIsCrewFormationOpen(false)}
      />

      {/* Material & Colors Customizer Modal */}
      <MaterialCustomizerModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        config={materialConfig}
        onChange={(newCfg) => setMaterialConfig(newCfg)}
      />
    </div>
  );
};
