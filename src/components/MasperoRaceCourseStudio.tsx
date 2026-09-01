import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  buildMasperoRaceCourse,
  MasperoRaceCourseObject,
  DEFAULT_RACE_COURSE_CONFIG,
} from '../utils/masperoRaceCourseBuilder';
import { buildTumNup2MasterV2 } from '../utils/tumNup2MasterV2';
import { buildTumNup2Crew, CrewSystem } from '../utils/tumNup2CrewBuilder';
import {
  calculateBoatHydrodynamics,
  HydrodynamicState,
  getGlobalStrokePhase,
} from '../utils/rowingKinematics';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  Flag,
  Trophy,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Maximize2,
  Gauge,
  Timer,
  Navigation,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export type RaceCameraMode = 'FOLLOW' | 'OVERVIEW' | 'EMBANKMENT' | 'PERSPECTIVE_3_4';

export const MasperoRaceCourseStudio: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Simulation & Race State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeCameraMode, setActiveCameraMode] = useState<RaceCameraMode>('FOLLOW');
  const [activeLane, setActiveLane] = useState<1 | 2>(1); // Lane 1 (North / Grandstand A) or Lane 2 (South)
  const [cadenceSPM, setCadenceSPM] = useState<number>(105);
  const [boatDistanceM, setBoatDistanceM] = useState<number>(0);
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);
  const [currentMilestone, setCurrentMilestone] = useState<string>('XUẤT PHÁT (0M)');
  const [hasFinished, setHasFinished] = useState<boolean>(false);

  const [liveHydro, setLiveHydro] = useState<HydrodynamicState>({
    forwardSpeedMs: 5.2,
    thrustForceN: 1450,
    surgeOffsetX: 0,
    pitchRad: 0,
    heaveY: 0,
  });

  // Refs for animation loop
  const isPlayingRef = useRef<boolean>(isPlaying);
  const cadenceRef = useRef<number>(cadenceSPM);
  const boatDistanceRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);
  const activeCameraModeRef = useRef<RaceCameraMode>(activeCameraMode);
  const activeLaneRef = useRef<1 | 2>(activeLane);
  const accumulatedCycleRef = useRef<number>(0.0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    cadenceRef.current = cadenceSPM;
  }, [cadenceSPM]);

  useEffect(() => {
    activeCameraModeRef.current = activeCameraMode;
  }, [activeCameraMode]);

  useEffect(() => {
    activeLaneRef.current = activeLane;
  }, [activeLane]);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const courseObjRef = useRef<MasperoRaceCourseObject | null>(null);
  const boatRootRef = useRef<THREE.Group | null>(null);
  const crewSystemRef = useRef<CrewSystem | null>(null);
  const animationFrameRef = useRef<number>(0);

  // User interactive orbit when in perspective/free mode
  const isMouseDownRef = useRef<boolean>(false);
  const mousePrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraOffsetRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 22,
    theta: Math.PI * 0.95,
    phi: Math.PI / 3.2,
  });

  // Reset to Start (0m)
  const handleResetToStart = () => {
    boatDistanceRef.current = 0;
    elapsedTimeRef.current = 0;
    accumulatedCycleRef.current = 0;
    setBoatDistanceM(0);
    setElapsedTimeSec(0);
    setHasFinished(false);
    setCurrentMilestone('XUẤT PHÁT (0M)');
    if (boatRootRef.current) {
      const laneZ = activeLaneRef.current === 1 ? DEFAULT_RACE_COURSE_CONFIG.lane1Z : DEFAULT_RACE_COURSE_CONFIG.lane2Z;
      boatRootRef.current.position.set(0, 0, laneZ);
    }
  };

  // Jump to specific milestone (0m, 250m, 500m, 750m, 1000m)
  const handleJumpToDistance = (distanceM: number) => {
    boatDistanceRef.current = distanceM;
    setBoatDistanceM(distanceM);
    if (distanceM >= 1000) {
      setHasFinished(true);
      setCurrentMilestone('VỀ ĐÍCH (1.000M)!');
    } else if (distanceM >= 750) {
      setCurrentMilestone('MỐC 750M (NƯỚC RÚT)');
    } else if (distanceM >= 500) {
      setCurrentMilestone('MỐC 500M (GIỮA ĐƯỜNG)');
    } else if (distanceM >= 250) {
      setCurrentMilestone('MỐC 250M (GIA TỐC)');
    } else {
      setCurrentMilestone('XUẤT PHÁT (0M)');
    }
  };

  // Format Elapsed Time: mm:ss.cc
  const formatRaceTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 atmosphere
    scene.fog = new THREE.FogExp2(0x1e293b, 0.0018); // Soft distance river mist
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 2000);
    camera.position.set(-25, 6, -18);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Environment (Maspéro River Tropical Sunlight)
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(200, 300, -150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    sunLight.shadow.camera.left = -300;
    sunLight.shadow.camera.right = 300;
    sunLight.shadow.camera.top = 300;
    sunLight.shadow.camera.bottom = -300;
    scene.add(sunLight);

    const riverFillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    riverFillLight.position.set(-100, 100, 150);
    scene.add(riverFillLight);

    // 5. Build Maspéro Race Course Environment
    const courseObj = buildMasperoRaceCourse(DEFAULT_RACE_COURSE_CONFIG);
    courseObjRef.current = courseObj;
    scene.add(courseObj.group);

    // 6. Build TUM_NUP_2_2024_MASTER_V2 Boat & 55 Crew System
    const boatRoot = new THREE.Group();
    boatRoot.name = 'TUM_NUP_2_RACE_BOAT_ROOT';

    const hullGroup = buildTumNup2MasterV2('REALISTIC_PBR');
    boatRoot.add(hullGroup);

    const crewSystem = buildTumNup2Crew();
    crewSystemRef.current = crewSystem;
    boatRoot.add(crewSystem.group);

    // Position at Start (0m) on Lane 1
    const laneZ = activeLaneRef.current === 1 ? DEFAULT_RACE_COURSE_CONFIG.lane1Z : DEFAULT_RACE_COURSE_CONFIG.lane2Z;
    boatRoot.position.set(boatDistanceRef.current, 0, laneZ);
    boatRootRef.current = boatRoot;
    scene.add(boatRoot);

    // 7. Mouse/Touch Interaction Listeners for Perspective Camera Orbit
    const onMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const dx = e.clientX - mousePrevRef.current.x;
      const dy = e.clientY - mousePrevRef.current.y;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };

      cameraOffsetRef.current.theta -= dx * 0.006;
      cameraOffsetRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.05, cameraOffsetRef.current.phi - dy * 0.006));
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraOffsetRef.current.radius = Math.max(8, Math.min(120, cameraOffsetRef.current.radius + e.deltaY * 0.04));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. Main Animation Loop
    let lastTime = performance.now();
    let uiThrottle = 0;

    const animate = (currentTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const timeSec = currentTime * 0.001;

      // Update River Water Specular Dynamics
      if (courseObjRef.current) {
        courseObjRef.current.updateWater(timeSec);
      }

      // Update Boat Movement along Course (+X towards Finish at 1000m)
      if (isPlayingRef.current) {
        const cycleSpeed = cadenceRef.current / 60.0;
        accumulatedCycleRef.current = (accumulatedCycleRef.current + dt * cycleSpeed) % 1.0;

        // Calculate Hydrodynamic Propulsion & Forward Speed
        const hydro = calculateBoatHydrodynamics(accumulatedCycleRef.current, cadenceRef.current);
        const deltaDistance = hydro.forwardSpeedMs * dt;
        boatDistanceRef.current += deltaDistance;
        elapsedTimeRef.current += dt;

        // Update 55-Crew Stroke Kinematics
        if (crewSystemRef.current) {
          crewSystemRef.current.update(accumulatedCycleRef.current);
        }

        // Boat Position along Course
        const targetLaneZ = activeLaneRef.current === 1 ? DEFAULT_RACE_COURSE_CONFIG.lane1Z : DEFAULT_RACE_COURSE_CONFIG.lane2Z;
        if (boatRootRef.current) {
          // Micro-surge and dynamic prow pitch
          boatRootRef.current.position.set(
            boatDistanceRef.current + hydro.surgeOffsetX,
            hydro.heaveY,
            targetLaneZ
          );
          boatRootRef.current.rotation.z = -hydro.pitchRad; // Prow lifts on power stroke
        }

        // Milestone Checking
        const dist = boatDistanceRef.current;
        let milestoneText = 'XUẤT PHÁT (0M)';
        if (dist >= 1000) {
          milestoneText = 'VỀ ĐÍCH (1.000M)!';
          if (!hasFinished) setHasFinished(true);
        } else if (dist >= 750) {
          milestoneText = 'MỐC 750M (NƯỚC RÚT KHÁN ĐÀI A)';
        } else if (dist >= 500) {
          milestoneText = 'MỐC 500M (TRUNG ĐOẠN MASPÉRO)';
        } else if (dist >= 250) {
          milestoneText = 'MỐC 250M (GIA TỐC ĐỘI HÌNH)';
        }

        // UI Updates (Throttled to 15fps)
        uiThrottle += dt;
        if (uiThrottle > 0.065) {
          uiThrottle = 0;
          setBoatDistanceM(dist);
          setElapsedTimeSec(elapsedTimeRef.current);
          setLiveHydro(hydro);
          setCurrentMilestone(milestoneText);
        }
      }

      // 10. Update Camera based on active mode
      const currentX = boatDistanceRef.current;
      const targetLaneZ = activeLaneRef.current === 1 ? DEFAULT_RACE_COURSE_CONFIG.lane1Z : DEFAULT_RACE_COURSE_CONFIG.lane2Z;
      const camMode = activeCameraModeRef.current;

      if (camMode === 'FOLLOW') {
        // Dynamic chase cam trailing boat by 22m looking along forward vector (+X)
        camera.position.set(currentX - 22, 5.2, targetLaneZ);
        camera.lookAt(currentX + 16, 1.2, targetLaneZ);
      } else if (camMode === 'OVERVIEW') {
        // High aerial bird's eye view over the entire 1,000m track
        camera.position.set(500, 160, 120);
        camera.lookAt(500, 0, 0);
      } else if (camMode === 'EMBANKMENT') {
        // Fixed spectator viewpoint on North Bank (Khán đài A, Z = -43m) tracking boat as it sweeps past
        camera.position.set(currentX + 18, 3.8, -43.0);
        camera.lookAt(currentX, 0.8, targetLaneZ);
      } else if (camMode === 'PERSPECTIVE_3_4') {
        // 3/4 Perspective Camera with smooth interactive orbit around boat
        const { radius, theta, phi } = cameraOffsetRef.current;
        camera.position.x = currentX + radius * Math.sin(phi) * Math.cos(theta);
        camera.position.y = 1.0 + radius * Math.cos(phi);
        camera.position.z = targetLaneZ + radius * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(currentX + 4.0, 0.8, targetLaneZ);
      }

      renderer.render(scene, camera);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      courseObj.dispose();
      renderer.dispose();
    };
  }, []);

  const progressPercent = Math.min(100, Math.max(0, (boatDistanceM / 1000) * 100));

  return (
    <div id="maspero-race-course-studio" className="flex flex-col gap-4">
      {/* Top Header Bar: Reference & Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-serif tracking-wide">
                Mô phỏng 3D Sân Đua Sông Maspéro (TP. Sóc Trăng)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                1.000M THỰC ĐỊA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Tham chiếu thực tế: <strong className="text-sky-400">YouTube Livestream 2024</strong> • 2 Làn đua • Khán đài A • Tháp trọng tài • Cầu Maspéro
            </p>
          </div>
        </div>

        {/* 4 Dedicated Camera Modes */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/90 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono font-bold text-slate-500 px-2 uppercase">Camera:</span>
          {(
            [
              { id: 'FOLLOW', label: 'Theo ghe (Follow)' },
              { id: 'PERSPECTIVE_3_4', label: 'Góc 3/4' },
              { id: 'EMBANKMENT', label: 'Ngang bờ (Bank)' },
              { id: 'OVERVIEW', label: 'Toàn sân (Overview)' },
            ] as const
          ).map((cam) => (
            <button
              key={cam.id}
              id={`btn-cam-${cam.id.toLowerCase()}`}
              onClick={() => setActiveCameraMode(cam.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeCameraMode === cam.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{cam.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Viewport with Live HUD */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Three.js Container */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top-Left: Live Race Telemetry HUD */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl font-mono text-xs w-72">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              THÔNG SỐ ĐƯỜNG ĐUA
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
              LÀN {activeLane}: {activeLane === 1 ? 'BỜ BẮC KHÁN ĐÀI A' : 'BỜ NAM'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">CỰ LY ĐÃ BƠI</span>
              <div className="text-base font-bold text-emerald-400">
                {boatDistanceM.toFixed(1)} <span className="text-xs text-slate-400">/ 1.000m</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">THỜI GIAN THI ĐẤU</span>
              <div className="text-base font-bold text-amber-400">
                {formatRaceTime(elapsedTimeSec)}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">TỐC ĐỘ TỨC THỜI</span>
              <div className="text-base font-bold text-sky-400">
                {(liveHydro.forwardSpeedMs * 3.6).toFixed(1)} <span className="text-[10px] text-slate-400">km/h</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">LỰC ĐẨY THỦY ĐỘNG</span>
              <div className="text-base font-bold text-purple-400">
                +{liveHydro.thrustForceN.toFixed(0)} <span className="text-[10px] text-slate-400">N</span>
              </div>
            </div>
          </div>

          {/* Active Sector / Milestone Banner */}
          <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              Phân đoạn:
            </span>
            <span className="font-bold text-amber-300 truncate max-w-[140px]">
              {currentMilestone}
            </span>
          </div>
        </div>

        {/* Top-Right: Finish / Milestone Banner Alert */}
        {hasFinished && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 font-bold font-mono text-xs shadow-2xl shadow-amber-500/30 border border-amber-300 animate-pulse">
            <Trophy className="w-5 h-5 text-slate-950" />
            <div>
              <div className="text-xs uppercase tracking-wider">CÁN ĐÍCH 1.000M THÀNH CÔNG!</div>
              <div className="text-[11px] font-normal text-slate-900">
                Thời gian: {formatRaceTime(elapsedTimeSec)} • Ghe Tum Núp 2
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Control & Scrub Bar */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/92 border border-slate-800/90 backdrop-blur-xl shadow-2xl">
          {/* 1000m Progress Track Bar */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-[10px] font-bold text-slate-400">0M</span>
            <div className="relative flex-1 h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden cursor-pointer">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-400 transition-all duration-100 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Milestone Indicators on Bar */}
              <div className="absolute top-0 bottom-0 left-[25%] w-0.5 bg-slate-700/80" />
              <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-slate-700/80" />
              <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-slate-700/80" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400">1.000M (ĐÍCH)</span>
          </div>

          {/* Quick-Jump Milestone Buttons & Simulation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                id="btn-play-pause-race"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-amber-500/20 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Tạm dừng' : 'Tiếp tục bơi'}</span>
              </button>

              <button
                id="btn-reset-race"
                onClick={handleResetToStart}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs border border-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Về vạch xuất phát (0m)</span>
              </button>
            </div>

            {/* Test Milestones Jump */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase hidden sm:inline">
                Nhảy đến mốc:
              </span>
              {[
                { dist: 0, label: '0m' },
                { dist: 250, label: '250m' },
                { dist: 500, label: '500m' },
                { dist: 750, label: '750m' },
                { dist: 1000, label: '1000m (Đích)' },
              ].map((m) => (
                <button
                  key={m.dist}
                  id={`btn-jump-${m.dist}m`}
                  onClick={() => handleJumpToDistance(m.dist)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    Math.abs(boatDistanceM - m.dist) < 20
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Lane Toggle & Cadence Slider */}
            <div className="flex items-center gap-3">
              {/* Lane Switch */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                <button
                  id="btn-lane-1"
                  onClick={() => setActiveLane(1)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition ${
                    activeLane === 1 ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Làn 1 (Khán đài A)
                </button>
                <button
                  id="btn-lane-2"
                  onClick={() => setActiveLane(2)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition ${
                    activeLane === 2 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Làn 2 (Bờ Nam)
                </button>
              </div>

              {/* Cadence Slider */}
              <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-[10px]">Nhịp:</span>
                <input
                  type="range"
                  min="85"
                  max="125"
                  step="1"
                  value={cadenceSPM}
                  onChange={(e) => setCadenceSPM(Number(e.target.value))}
                  className="w-16 accent-amber-500 cursor-pointer"
                />
                <span className="font-bold text-amber-400 text-[11px]">{cadenceSPM} SPM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Information Cards: Real Course Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-white uppercase text-[11px]">ĐƯỜNG THỦY SÔNG MASPÉRO</span>
            <span className="text-emerald-400 text-[10px]">[XÁC THỰC]</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Chiều rộng sông 82m chia 2 làn thi đấu song song. Tim sông bố trí dải phao tiêu tròn màu Đỏ/Vàng cách ly an toàn 15m/cụm.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-white uppercase text-[11px]">KHÁN ĐÀI A & VẠCH ĐÍCH</span>
            <span className="text-emerald-400 text-[10px]">[XÁC THỰC]</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Khán đài A dài 110m mái vòm xanh dương nằm ở Bờ Bắc tại mốc 930m-1040m. Tháp trọng tài bấm giờ và camera photo-finish đặt đối diện vạch đích 1.000m.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-white uppercase text-[11px]">KHÍ THẾ LỄ HỘI OÓC OM BÓC</span>
            <span className="text-emerald-400 text-[10px]">[XÁC THỰC]</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Hai bên bờ kè bê tông chật kín hàng ngàn khán giả cổ vũ, cắm cờ ngũ sắc Khmer và cờ Tổ quốc rực rỡ dọc lan can suốt chiều dài đường đua.
          </p>
        </div>
      </div>
    </div>
  );
};
