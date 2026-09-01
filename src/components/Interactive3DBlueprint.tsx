import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CrewFormationModal } from './CrewFormationModal';
import {
  calculateStrokeKinematics,
  getGlobalStrokePhase,
} from '../utils/rowingKinematics';
import {
  BOAT_SPECS_V2,
  getTumNup2ProfileV2,
  buildTumNup2MasterV2,
} from '../utils/tumNup2MasterV2';
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
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
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
    id: 'DRY_WEIGHT',
    name: 'Dry Hull Mass (Khối lượng khô vỏ ghe)',
    vietnameseName: 'Tổng trọng lượng vỏ gỗ sao khi hạ thủy',
    status: 'APPROXIMATE',
    targetView: '3/4',
    evidenceSource: 'Tính toán thể tích hình học 3D x Tỷ trọng gỗ sao (850 kg/m³)',
    description: 'Khối lượng vỏ gỗ khô ước tính khoảng 1.35 tấn, đảm bảo đủ nhẹ để bứt tốc nhưng đủ đầm để chịu tải 55 VĐV (~4.000 kg).',
    specs: 'Khối lượng vỏ: ~1.350 kg • Tổng choán nước thi đấu: ~5.350 kg',
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

  // Active Main Tab within 3D Component: '3D_CANVAS' | 'GEOMETRY_CHECKLIST'
  const [activeSubTab, setActiveSubTab] = useState<'3D_CANVAS' | 'GEOMETRY_CHECKLIST'>('3D_CANVAS');

  // View & Render State (5 Validation Inspection Modes: TOP, SIDE, FRONT, REAR, 3/4 + CLOSE-UPS)
  const [viewAngle, setViewAngle] = useState<ViewAngle>('3/4');
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC_PBR');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);

  // Feature Toggles: Pure Geometry Mode default (hidden crew & water for clean silhouette inspection)
  const [showCrew, setShowCrew] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showSlicePlane, setShowSlicePlane] = useState<boolean>(false);
  const [stationSliceMeters, setStationSliceMeters] = useState<number>(15.1);
  const [showWater, setShowWater] = useState<boolean>(false);

  // Dropdown Popovers
  const [isViewMenuOpen, setIsViewMenuOpen] = useState<boolean>(false);
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState<boolean>(false);
  const [isCrewFormationOpen, setIsCrewFormationOpen] = useState<boolean>(false);

  // Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const strokeCadenceSPM = 105;

  // Selected item in geometry inspection
  const [selectedGeoItem, setSelectedGeoItem] = useState<string>('BOW_PROW');

  // Refs for Animation Loop
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isAutoRotatingRef = useRef<boolean>(isAutoRotating);
  const cadenceRef = useRef<number>(strokeCadenceSPM);
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
  const masterBoatGroupRef = useRef<THREE.Group | null>(null);
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

  const BOAT_LENGTH = BOAT_SPECS_V2.LOA;
  const BOAT_MAX_BEAM = BOAT_SPECS_V2.BEAM_MAX;

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

    // 2. Beam Max = 1.12m
    const beamPoints = [
      new THREE.Vector3(0, 0.65, -BOAT_MAX_BEAM / 2),
      new THREE.Vector3(0, 0.65, BOAT_MAX_BEAM / 2),
    ];
    const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);
    parent.add(new THREE.Line(beamGeo, lineMat));

    const beamSprite = createDimensionSprite('Beam: 1.12 m');
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

  // Main Three.js Initialization Effect
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 620;

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
    const ambientLight = new THREE.AmbientLight(0xfff8ed, 0.85);
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

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.6);
    fillLight.position.set(-16, 12, -18);
    scene.add(fillLight);

    const bottomReflectLight = new THREE.DirectionalLight(0x0284c7, 0.45);
    bottomReflectLight.position.set(0, -10, 0);
    scene.add(bottomReflectLight);

    // 5. GRID HELPER
    const gridHelper = new THREE.GridHelper(36, 36, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.02;
    gridHelperRef.current = gridHelper;
    scene.add(gridHelper);

    // 6. BUILD NEW HULL V2 (TUM_NUP_2_2024_MASTER_V2)
    const masterBoatGroup = buildTumNup2MasterV2(renderMode);
    masterBoatGroupRef.current = masterBoatGroup;
    scene.add(masterBoatGroup);

    // 7. BUILD 3D DIMENSION RULERS
    const dimensionsGroup = new THREE.Group();
    build3DDimensions(dimensionsGroup);
    dimensionsGroupRef.current = dimensionsGroup;
    dimensionsGroup.visible = showDimensions;
    scene.add(dimensionsGroup);

    // 8. SLICE PLANE
    const sliceGeo = new THREE.PlaneGeometry(3.5, 3.0);
    const sliceMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    const slicePlane = new THREE.Mesh(sliceGeo, sliceMat);
    slicePlane.rotation.y = Math.PI / 2;
    slicePlane.position.set(stationSliceMeters - BOAT_LENGTH / 2, 0.8, 0);
    slicePlane.visible = showSlicePlane;
    slicePlaneRef.current = slicePlane;
    scene.add(slicePlane);

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
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Auto-rotation in 3D Perspective mode
      if (isAutoRotatingRef.current && activeCameraTypeRef.current === 'PERSPECTIVE') {
        cameraOrbitRef.current.theta += dt * 0.22;
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
    if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
    if (dimensionsGroupRef.current) dimensionsGroupRef.current.visible = showDimensions;
    if (slicePlaneRef.current) slicePlaneRef.current.visible = showSlicePlane;
  }, [showGrid, showDimensions, showSlicePlane]);

  // Update Slice plane position
  useEffect(() => {
    if (slicePlaneRef.current) {
      slicePlaneRef.current.position.x = stationSliceMeters - BOAT_LENGTH / 2;
    }
  }, [stationSliceMeters]);

  // Update Camera View Angle (5 Validation Modes: TOP, SIDE, FRONT, REAR, 3/4 + CLOSE-UPS)
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

  const viewAngleLabels: Record<ViewAngle, string> = {
    '3/4': '3/4',
    'TOP': 'TOP',
    'SIDE': 'SIDE',
    'FRONT': 'FRONT',
    'REAR': 'REAR',
    'CLOSE_UP_BOW': 'MŨI',
    'CLOSE_UP_STERN': 'ĐUÔI',
  };

  return (
    <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden select-none">
      {/* Sub-Tabs Selector: [Bản vẽ 3D Thân ghe V2] vs [Kiểm tra Hình học (Checklist)] */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
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
            <span>Mô hình 3D (TUM_NUP_2_MASTER_V2)</span>
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
            <span>Kiểm tra Hình học (Verification Checklist)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 text-[10px]">
              8/8
            </span>
          </button>
        </div>

        {/* Rebuild Asset Tag */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-bold">
            HULL V2: REBUILT
          </span>
          <span>LOA: 30.20m • Beam: 1.12m</span>
        </div>
      </div>

      {/* Mode 1: 3D Viewport */}
      {activeSubTab === '3D_CANVAS' && (
        <div className="relative w-full h-[620px] md:h-[680px] bg-slate-950">
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
          />

          {/* Floating Status Tag at Top-Left */}
          <div className="absolute top-3.5 left-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md text-slate-300 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-white tracking-wide">TUM_NUP_2_2024_MASTER_V2</strong>
              <span className="text-slate-500">•</span>
              <span className="text-sky-400 font-mono">30.20m</span>
            </div>
          </div>

          {/* Top Center: Direct Quick View Inspection Bar (TOP, SIDE, FRONT, REAR, 3/4, MŨI, ĐUÔI) */}
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-950/90 border border-slate-800/90 p-1 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-200">
            {(
              [
                { id: 'TOP', label: 'TOP' },
                { id: 'SIDE', label: 'SIDE' },
                { id: 'FRONT', label: 'FRONT' },
                { id: 'REAR', label: 'REAR' },
                { id: '3/4', label: '3/4' },
                { id: 'CLOSE_UP_BOW', label: 'MŨI' },
                { id: 'CLOSE_UP_STERN', label: 'ĐUÔI' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                id={`btn-quick-view-${v.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => {
                  setViewAngle(v.id);
                  setIsAutoRotating(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl transition text-[11px] font-bold ${
                  viewAngle === v.id
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* 2. Floating Minimal Dock - Fixed at Bottom Center */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/90 px-3 py-2 rounded-2xl backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-200">
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
                <div className="absolute bottom-full mb-2.5 right-0 sm:left-0 w-48 bg-slate-900/95 border border-slate-800 rounded-xl p-1.5 backdrop-blur-xl shadow-2xl space-y-1 font-mono text-xs z-30 animate-in fade-in slide-in-from-bottom-2">
                  {(
                    [
                      { id: 'TOP', label: 'TOP (Nhìn trên)' },
                      { id: 'SIDE', label: 'SIDE (Nhìn mạn)' },
                      { id: 'FRONT', label: 'FRONT (Trực diện mũi)' },
                      { id: 'REAR', label: 'REAR (Sau lái)' },
                      { id: '3/4', label: '3/4 (Phối cảnh)' },
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Geometry Verification Checklist Panel (Kiểm tra Hình học) */}
      {activeSubTab === 'GEOMETRY_CHECKLIST' && (
        <div className="p-5 space-y-5 bg-slate-950 text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-serif tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Bảng Kiểm tra Hình học Thân ghe (Geometry Verification Checklist)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Phân loại mức độ xác thực cho từng bộ phận model 3D: CONFIRMED / APPROXIMATE / UNKNOWN
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                5 CONFIRMED
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/70 text-amber-300 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                2 APPROXIMATE
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
                        <span>Tài liệu nguồn</span>
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
    </div>
  );
};
