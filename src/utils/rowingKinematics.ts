/**
 * Biomechanical 7-Phase Rowing Kinematics Engine for Ghe Ngo Championship Racing
 * Grounded directly in 2024 Sóc Trăng Champions (Chùa Tum Núp 2) YouTube Reference:
 * https://www.youtube.com/live/XagC29Eyt_U?si=-MEQXY-vzW3dxT2w
 * (Chung kết Maspéro 2024 - Timestamp 00:45:10 - 00:47:30)
 */

export interface StrokePhaseInfo {
  id: 'PREPARATION' | 'ENTRY' | 'EARLY_DRIVE' | 'PEAK_POWER' | 'EXTRACTION' | 'RECOVERY' | 'LOOP';
  phaseIndex: number; // 1 to 7
  nameVi: string;
  nameEn: string;
  badge: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  range: [number, number]; // Normalized time range [start, end]
  description: string;
  biomechanics: string;
  paddleAngleDeg: number;
  bladeDepthM: number;
  torsoAngleDeg: number;
  forceVector: string;
}

export const SEVEN_STROKE_PHASES: StrokePhaseInfo[] = [
  {
    id: 'PREPARATION',
    phaseIndex: 1,
    nameVi: '1. Chuẩn bị (Reach)',
    nameEn: 'Forward Reach & Preparation',
    badge: 'CHUẨN BỊ',
    colorHex: '#38bdf8',
    bgClass: 'bg-sky-500/20',
    borderClass: 'border-sky-500/50',
    textClass: 'text-sky-400',
    range: [0.00, 0.10],
    description: 'Thân người rướn sâu về phía MŨI GHE (+X, +34°), hai tay vươn dài, dầm bơi nằm ngang trên không xòe ra ngoài mạn chuẩn bị cắm nước.',
    biomechanics: 'Thả lỏng cơ xô, mắt nhìn thẳng hướng MŨI (+X), đùi tì chặt đòn ngồi, mũi chân ghìm gờ sàn ghe. Mái chèo xòe ngoài mạn 28°.',
    paddleAngleDeg: 28,
    bladeDepthM: 0.18,
    torsoAngleDeg: 34,
    forceVector: '0 N (Tích năng lượng)',
  },
  {
    id: 'ENTRY',
    phaseIndex: 2,
    nameVi: '2. Cắm nước (Catch)',
    nameEn: 'Blade Entry & Water Penetration',
    badge: 'CẮM NƯỚC',
    colorHex: '#0284c7',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    textClass: 'text-blue-400',
    range: [0.10, 0.22],
    description: 'Lưỡi dầm cắm dứt khoát ngập sâu vào dòng nước (-0.16m) ở phía NGOÀI be ghe tại vị trí đón nước phía trước MŨI (+X), góc cắm 55°-60°.',
    biomechanics: 'Cổ tay khóa chặt, lưng và vai căng cứng đón phản lực dòng chảy, bắt trọn khối nước tĩnh tạo điểm tựa đẩy ghe.',
    paddleAngleDeg: 24,
    bladeDepthM: -0.16,
    torsoAngleDeg: 32,
    forceVector: '+850 N (Đón lực tại Mũi +X)',
  },
  {
    id: 'EARLY_DRIVE',
    phaseIndex: 3,
    nameVi: '3. Kéo mái chèo (Early Drive)',
    nameEn: 'Power Initiation & Initial Pull',
    badge: 'KÉO MÁI',
    colorHex: '#10b981',
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-400',
    range: [0.22, 0.42],
    description: 'Cơ lưng xô và đùi kéo mạnh dầm về phía SAU ĐUÔI (-X). Phản lực từ khối nước tĩnh đẩy toàn bộ thân ghe TIẾN VỀ PHÍA TRƯỚC MŨI (+X).',
    biomechanics: 'Nẹp be ghe làm điểm tì đòn bẩy cấp 1. Kéo mái chèo về phía sau (-X) tạo phản lực đẩy ghe tiến về phía trước (+X).',
    paddleAngleDeg: 8,
    bladeDepthM: -0.18,
    torsoAngleDeg: 14,
    forceVector: '+1.450 N (Đẩy ghe tiến Mũi +X)',
  },
  {
    id: 'PEAK_POWER',
    phaseIndex: 4,
    nameVi: '4. Dùng lực toàn thân (Peak Drive)',
    nameEn: 'Maximum Power & Torso Drive',
    badge: 'CỰC ĐẠI LỰC',
    colorHex: '#f59e0b',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-400',
    range: [0.42, 0.60],
    description: 'Cực đại công suất! Toàn thân ngả về sau (-13°), giật mạnh dầm về sau đuôi (-X). Lực đẩy phản lực cực đại phóng ghe vọt tới trước (+X).',
    biomechanics: 'Toàn bộ khối cơ trung tâm (Core) khóa cứng đẩy nước về sau (-X), truyền 1.820N lực phản lực đẩy ghe chồm lên tiến về phía trước (+X).',
    paddleAngleDeg: -26,
    bladeDepthM: -0.15,
    torsoAngleDeg: -13,
    forceVector: '+1.820 N (Cực đại tiến Mũi +X)',
  },
  {
    id: 'EXTRACTION',
    phaseIndex: 5,
    nameVi: '5. Rút mái chèo (Extraction)',
    nameEn: 'Blade Clearance & Release',
    badge: 'RÚT MÁI',
    colorHex: '#ec4899',
    bgClass: 'bg-pink-500/20',
    borderClass: 'border-pink-500/50',
    textClass: 'text-pink-400',
    range: [0.60, 0.74],
    description: 'Khuỷu tay nhấc nhanh đưa lưỡi chèo vọt lên khỏi mặt nước (+0.12m) ở phía ngoài, xoay lưỡi dầm lướt gió không hãm đà ghe.',
    biomechanics: 'Cổ tay gập nhẹ, nhấc lưỡi dầm dứt khoát không để mép dầm kéo lê trong nước hãm tốc độ tiến của ghe.',
    paddleAngleDeg: -18,
    bladeDepthM: 0.12,
    torsoAngleDeg: -5,
    forceVector: '+120 N (Quán tính tiến Mũi +X)',
  },
  {
    id: 'RECOVERY',
    phaseIndex: 6,
    nameVi: '6. Hồi vị (Recovery)',
    nameEn: 'Airborne Swing & Recovery',
    badge: 'HỒI VỊ',
    colorHex: '#8b5cf6',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/50',
    textClass: 'text-purple-400',
    range: [0.74, 0.94],
    description: 'Thân người lướt êm về phía trước (+X), dầm bay trên không ngoài mạn ghe chuẩn bị góc đón nước mới. Ghe lướt nhanh theo quán tính.',
    biomechanics: 'Thả lỏng các nhóm cơ trong 0.12 giây để tái nạp ATP và oxy trước khi dập nhịp kế tiếp. Ghe lướt thẳng tới trước.',
    paddleAngleDeg: 12,
    bladeDepthM: 0.18,
    torsoAngleDeg: 22,
    forceVector: '0 N (Lướt quán tính Mũi +X)',
  },
  {
    id: 'LOOP',
    phaseIndex: 7,
    nameVi: '7. Lặp lại (Cycle Loop)',
    nameEn: 'Cycle Loop & Synchrony Transition',
    badge: 'CHUYỂN NHỊP',
    colorHex: '#06b6d4',
    bgClass: 'bg-cyan-500/20',
    borderClass: 'border-cyan-500/50',
    textClass: 'text-cyan-400',
    range: [0.94, 1.00],
    description: 'Chuyển tiếp trơn tru vào chu kỳ mới, khóa tư thế đón nước ở Mũi (+X) với tần số nước rút 105-120 nhịp/phút.',
    biomechanics: 'Duy trì nhịp thở đồng thanh, toàn bộ 50 tay chèo đạt độ đồng pha cao độ, sẵn sàng dập mái chèo cho chu kỳ kế tiếp.',
    paddleAngleDeg: 26,
    bladeDepthM: 0.18,
    torsoAngleDeg: 32,
    forceVector: '0 N (Đồng pha chu kỳ mới)',
  },
];

export const STROKE_PHASES = SEVEN_STROKE_PHASES;

export interface KinematicOutput {
  strokeAngleZ: number;   // Forward/Backward paddle rotation (rad)
  immersionY: number;     // Vertical paddle displacement (m) - negative is below water
  featherRotX: number;    // Blade lateral cant / feathering OUTWARD (rad) - POSITIVE for Port (+Z outward), NEGATIVE for Starboard (-Z outward)
  bladePitchY: number;    // Blade attack angle (rad)
  bodyLeanZ: number;      // Torso forward/backward lean (rad)
  torsoElevY: number;     // Vertical hip/torso displacement (m)
  armReachX: number;      // Arms forward reach extension (m)
  armPullZ: number;       // Arms pull flexion (m)
  headPitch: number;      // Head tilt (rad)
  phase: StrokePhaseInfo;
  phaseProgress: number;  // 0.0 to 1.0 within current phase
}

/**
 * Calculates 7-phase biomechanical posture and paddle kinematics for each crew athlete.
 * CRITICAL FIX: The paddle is always directed and canted OUTWARD away from the boat flanks.
 *
 * @param globalNormalizedTime Cycle time normalized to [0.0, 1.0)
 * @param pairIndex Pair index from 1 (Bow) to 24 (Stern)
 * @param isPort True for port side (left, -Z in 3D scene), False for starboard (+Z)
 */
export function calculateStrokeKinematics(
  globalNormalizedTime: number,
  pairIndex: number,
  isPort: boolean
): KinematicOutput {
  // Wave propagation delay from bow to stern (human reaction transmission across 30.2m hull)
  // ~0.03s delay per pair, ~0.07 normalized phase shift from bow (pair 1) to stern (pair 24)
  const waveLag = ((pairIndex - 1) / 24) * 0.072;
  // Subtle organic jitter between individual athletes (±1.0% micro-variance)
  const organicJitter = Math.sin(pairIndex * 19.7 + (isPort ? 0.35 : 0.0)) * 0.008;

  let t = (globalNormalizedTime - waveLag + organicJitter) % 1.0;
  if (t < 0) t += 1.0;

  let strokeAngleZ = 0;
  let immersionY = 0;
  let featherRotX = 0;
  let bladePitchY = 0;
  let bodyLeanZ = 0;
  let torsoElevY = 0;
  let armReachX = 0;
  let armPullZ = 0;
  let headPitch = 0;
  let phase: StrokePhaseInfo = SEVEN_STROKE_PHASES[0];
  let phaseProgress = 0;

  // BASE OUTWARD CANT:
  // In Three.js with paddle down in -Y:
  // For Port (Left, -Z in world space): rotation.x > 0 tilts the paddle blade to negative Z (OUTWARD TO LEFT).
  // For Starboard (Right, +Z in world space): rotation.x < 0 tilts the paddle blade to positive Z (OUTWARD TO RIGHT).
  const baseOutwardCant = isPort ? 0.48 : -0.48; // ~27.5 degrees outward cant

  // Phase 1: PREPARATION (0.00 -> 0.10)
  if (t < 0.10) {
    phase = SEVEN_STROKE_PHASES[0];
    const p = t / 0.10;
    phaseProgress = p;

    // Torso leans deeply forward towards Bow (+X) (+34° ~ 0.59 rad)
    bodyLeanZ = 0.54 + 0.05 * Math.sin(p * Math.PI * 0.5);
    torsoElevY = 0.01 * p;
    headPitch = -0.15; // Eyes focused ahead on bow water

    // Paddle: Reaches high forward in air (+0.18m above water) towards Bow (+X), canted outwards
    strokeAngleZ = 0.44 + 0.04 * p; // Positive angle rotates paddle tip forward towards +X
    immersionY = 0.18 - 0.04 * (p * p);

    featherRotX = baseOutwardCant + (isPort ? 0.02 : -0.02) * p;
    bladePitchY = isPort ? -0.04 : 0.04;
    armReachX = 0.08 * p;
    armPullZ = 0.0;
  }
  // Phase 2: ENTRY / CATCH (0.10 -> 0.22)
  else if (t < 0.22) {
    phase = SEVEN_STROKE_PHASES[1];
    const p = (t - 0.10) / 0.12;
    phaseProgress = p;

    // Torso: Deep catch posture leaning forward towards Bow (+X)
    bodyLeanZ = 0.59 - 0.03 * p;
    torsoElevY = -0.015 * Math.sin(p * Math.PI);
    headPitch = -0.10;

    // Paddle: Plunges rapidly from air into water (-0.16m) at forward reach position (+X)
    strokeAngleZ = 0.48 - 0.06 * p; // Still forward at entry
    immersionY = 0.14 - 0.30 * Math.sin(p * Math.PI * 0.5); // Deep plunge into water!

    featherRotX = baseOutwardCant + (isPort ? 0.04 : -0.04) * p;
    bladePitchY = isPort ? -0.08 : 0.08;
    armReachX = 0.08 * (1 - p * 0.3);
    armPullZ = 0.02 * p;
  }
  // Phase 3: EARLY DRIVE (0.22 -> 0.42)
  else if (t < 0.42) {
    phase = SEVEN_STROKE_PHASES[2];
    const p = (t - 0.22) / 0.20;
    phaseProgress = p;

    const pullProg = Math.pow(p, 0.9);

    // Torso: Powers from forward lean (+32°) backward towards upright (+7°)
    bodyLeanZ = 0.56 - 0.44 * pullProg;
    torsoElevY = 0.02 * Math.sin(p * Math.PI);
    headPitch = 0.0;

    // Paddle: Deeply submerged (-0.18m), sweeping powerfully BACKWARD (from +X towards -X / Stern)
    strokeAngleZ = 0.42 - 0.50 * pullProg; // Sweeps from +0.42 (forward) through 0 to -0.08 (backward)
    immersionY = -0.16 - 0.02 * Math.sin(p * Math.PI); // Solid underwater bite!

    featherRotX = baseOutwardCant + (isPort ? 0.05 : -0.05);
    bladePitchY = isPort ? -0.10 : 0.10;
    armReachX = 0.05 * (1 - p);
    armPullZ = 0.06 * p;
  }
  // Phase 4: PEAK POWER DRIVE (0.42 -> 0.60)
  else if (t < 0.60) {
    phase = SEVEN_STROKE_PHASES[3];
    const p = (t - 0.42) / 0.18;
    phaseProgress = p;

    const driveProg = Math.pow(p, 1.1);

    // Torso: Reaches peak rear excursion leaning backward (-13.2° towards Stern -X)
    bodyLeanZ = 0.12 - 0.35 * driveProg;
    torsoElevY = 0.015 * (1 - p);
    headPitch = 0.08;

    // Paddle: Sweeps to maximum rearward angle (-0.46 rad ~ -26.4° towards Stern -X)
    strokeAngleZ = -0.08 - 0.38 * driveProg; // Sweeps backwards to -0.46 rad
    immersionY = -0.18 + 0.03 * p; // Still submerged in driving water

    featherRotX = baseOutwardCant + (isPort ? 0.03 : -0.03);
    bladePitchY = isPort ? -0.06 : 0.06;
    armReachX = 0.0;
    armPullZ = 0.06 + 0.04 * p;
  }
  // Phase 5: EXTRACTION (0.60 -> 0.74)
  else if (t < 0.74) {
    phase = SEVEN_STROKE_PHASES[4];
    const p = (t - 0.60) / 0.14;
    phaseProgress = p;

    // Torso: Begins forward recovery
    bodyLeanZ = -0.23 + 0.15 * p;
    torsoElevY = 0.0;
    headPitch = 0.0;

    // Paddle: Lifts rapidly out of water up into air (+0.12m), starts moving forward
    strokeAngleZ = -0.46 + 0.20 * p; // Begins recovery swing forward towards +X
    immersionY = -0.15 + 0.27 * Math.sin(p * Math.PI * 0.5); // Emerges cleanly out of water!

    featherRotX = baseOutwardCant - (isPort ? 0.04 : -0.04) * p; // Feathers slightly
    bladePitchY = isPort ? 0.04 : -0.04;
    armReachX = 0.02 * p;
    armPullZ = 0.10 * (1 - p);
  }
  // Phase 6: RECOVERY (0.74 -> 0.94)
  else if (t < 0.94) {
    phase = SEVEN_STROKE_PHASES[5];
    const p = (t - 0.74) / 0.20;
    phaseProgress = p;

    const smoothSwing = 0.5 - 0.5 * Math.cos(p * Math.PI);

    // Torso: Smooth swing forward towards Bow (+X) for catch posture
    bodyLeanZ = -0.08 + 0.52 * smoothSwing;
    torsoElevY = 0.0;
    headPitch = -0.08 * p;

    // Paddle: Glides smoothly in the air (+0.18m above water) OUTSIDE the hull, swinging forward to Bow (+X)
    strokeAngleZ = -0.26 + 0.64 * smoothSwing; // Swings forward through air from -0.26 to +0.38 rad
    immersionY = 0.12 + 0.06 * Math.sin(p * Math.PI); // Gliding in air

    featherRotX = baseOutwardCant;
    bladePitchY = 0;
    armReachX = 0.02 + 0.05 * smoothSwing;
    armPullZ = 0.0;
  }
  // Phase 7: CYCLE LOOP (0.94 -> 1.00)
  else {
    phase = SEVEN_STROKE_PHASES[6];
    const p = (t - 0.94) / 0.06;
    phaseProgress = p;

    // Torso: Locked in forward reach (+34° towards Bow +X)
    bodyLeanZ = 0.44 + 0.10 * p;
    torsoElevY = 0.0;
    headPitch = -0.15;

    // Paddle: Final airborne reach forward towards Bow (+X)
    strokeAngleZ = 0.38 + 0.06 * p; // Reach +0.44 rad
    immersionY = 0.18;

    featherRotX = baseOutwardCant;
    bladePitchY = isPort ? -0.04 : 0.04;
    armReachX = 0.07 + 0.01 * p;
    armPullZ = 0.0;
  }

  return {
    strokeAngleZ,
    immersionY,
    featherRotX,
    bladePitchY,
    bodyLeanZ,
    torsoElevY,
    armReachX,
    armPullZ,
    headPitch,
    phase,
    phaseProgress,
  };
}

/**
 * Gets global 7-phase telemetry based on master normalized time
 */
export function getGlobalStrokePhase(normalizedTime: number): {
  phase: StrokePhaseInfo;
  phaseProgress: number;
  globalTime: number;
} {
  const t = ((normalizedTime % 1.0) + 1.0) % 1.0;
  let phase = SEVEN_STROKE_PHASES[0];
  let phaseProgress = 0;

  for (const p of SEVEN_STROKE_PHASES) {
    if (t >= p.range[0] && t < p.range[1]) {
      phase = p;
      phaseProgress = (t - p.range[0]) / (p.range[1] - p.range[0]);
      break;
    }
  }

  return {
    phase,
    phaseProgress,
    globalTime: t,
  };
}

export interface HydrodynamicState {
  forwardSpeedMs: number;       // Instantaneous forward velocity along +X (m/s)
  thrustForceN: number;         // Forward reaction thrust along +X (N)
  surgeOffsetX: number;         // Micro-surge displacement along +X (m)
  pitchRad: number;             // Bow pitch angle (positive lifts bow +Y)
  heaveY: number;               // Vertical boat heave (m)
}

/**
 * Calculates authentic hydrodynamic propulsion dynamics and boat surge velocity.
 * When rowers pull water backward towards Stern (-X), reaction force pushes boat forward towards Bow (+X).
 */
export function calculateBoatHydrodynamics(
  normalizedTime: number,
  cadenceSPM: number
): HydrodynamicState {
  const t = ((normalizedTime % 1.0) + 1.0) % 1.0;
  const baseSpeed = (cadenceSPM / 105.0) * 5.2; // ~5.2 m/s (~18.7 km/h) competition speed

  let thrustForceN = 0;
  let speedMultiplier = 1.0;
  let pitchRad = 0;
  let heaveY = 0;

  // Phase 1 & 2: Reach & Catch (0.0 -> 0.22) - Coasting forward towards Bow (+X)
  if (t < 0.22) {
    const p = t / 0.22;
    thrustForceN = t < 0.10 ? 0 : 850 * ((t - 0.10) / 0.12);
    speedMultiplier = 0.94 + 0.04 * (1 - p);
    pitchRad = 0.002 * (1 - p);
    heaveY = -0.003 * Math.sin(p * Math.PI);
  }
  // Phase 3 & 4: Early & Peak Drive (0.22 -> 0.60) - MAXIMUM FORWARD THRUST SURGE TOWARDS BOW (+X)
  else if (t < 0.60) {
    const p = (t - 0.22) / 0.38;
    const powerCurve = Math.sin(p * Math.PI);
    thrustForceN = 1450 + 370 * powerCurve; // 1,450 N -> 1,820 N forward propulsion!
    speedMultiplier = 1.0 + 0.24 * Math.pow(powerCurve, 1.2); // Acceleration surge along +X
    pitchRad = 0.014 * powerCurve; // Bow lifts as dynamic water pressure builds under cutwater
    heaveY = 0.012 * powerCurve; // Dynamic hull hydrofoil lift
  }
  // Phase 5, 6, 7: Extraction, Recovery, Loop (0.60 -> 1.00) - Clean blade exit and forward glide
  else {
    const p = (t - 0.60) / 0.40;
    thrustForceN = Math.max(0, 120 * (1 - p * 3));
    speedMultiplier = 1.16 - 0.22 * p; // Smooth glide tapering to base speed
    pitchRad = 0.006 * (1 - p);
    heaveY = 0.004 * (1 - p);
  }

  const forwardSpeedMs = baseSpeed * speedMultiplier;
  const surgeOffsetX = 0.09 * (speedMultiplier - 1.0);

  return {
    forwardSpeedMs,
    thrustForceN,
    surgeOffsetX,
    pitchRad,
    heaveY,
  };
}
