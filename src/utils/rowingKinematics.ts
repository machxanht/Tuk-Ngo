/**
 * Biomechanical Rowing Kinematics Engine for Ghe Ngo Championship Racing
 * Based on 2024 Sóc Trăng Champions (Chùa Tum Núp 2) video footage & technical observations.
 */

export interface StrokePhaseInfo {
  id: 'CATCH' | 'DRIVE' | 'FINISH' | 'EXTRACTION' | 'RECOVERY';
  nameVi: string;
  nameEn: string;
  badge: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  range: [number, number]; // Normalized range [start, end]
  description: string;
  biomechanics: string;
}

export const STROKE_PHASES: StrokePhaseInfo[] = [
  {
    id: 'CATCH',
    nameVi: '1. Vào nước (Catch)',
    nameEn: 'Blade Entry',
    badge: 'CẮM DẦM',
    colorHex: '#0284c7',
    bgClass: 'bg-sky-500/20',
    borderClass: 'border-sky-500/50',
    textClass: 'text-sky-400',
    range: [0.00, 0.15],
    description: 'Dầm cắm ngập mặt nước, góc tới 24°, thân người chồm gập sâu 34°.',
    biomechanics: 'Cổ tay khoá chặt, chân đạp tì thanh giằng đáy, lưng căng cơ xô đón lực cản nước.',
  },
  {
    id: 'DRIVE',
    nameVi: '2. Kéo mái (Drive)',
    nameEn: 'Power Pull',
    badge: 'PHÁT LỰC',
    colorHex: '#10b981',
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-400',
    range: [0.15, 0.55],
    description: 'Quét dầm uy lực từ +24° về -27.5°, thân ngửa từ +34° về -13°, tạo lực đẩy tối đa.',
    biomechanics: 'Cơ lưng, cơ bụng và cơ đùi bộc phát đồng thời. Nẹp be ghe làm điểm tì đòn bẩy.',
  },
  {
    id: 'FINISH',
    nameVi: '3. Kết thúc lực (Finish)',
    nameEn: 'Blade Release',
    badge: 'TRẢ LỰC',
    colorHex: '#f59e0b',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-400',
    range: [0.55, 0.65],
    description: 'Dầm quét hết biên độ ngang hông, thân người khóa cứng thế tấn sau.',
    biomechanics: 'Khóa cơ bụng, chuyển động chậm lại trong khoảnh khắc để chuẩn bị nhấc dầm.',
  },
  {
    id: 'EXTRACTION',
    nameVi: '4. Rút mái chèo (Extraction)',
    nameEn: 'Blade Clearance',
    badge: 'RÚT MÁI',
    colorHex: '#ec4899',
    bgClass: 'bg-pink-500/20',
    borderClass: 'border-pink-500/50',
    textClass: 'text-pink-400',
    range: [0.65, 0.78],
    description: 'Nhấc lưỡi dầm vọt lên khỏi mặt nước (+20cm), xoay lưỡi lướt gió không cản khí động.',
    biomechanics: 'Khuỷu tay nhấc nhanh, cổ tay gập nhẹ đưa lá dầm thoát mép nước tức thì.',
  },
  {
    id: 'RECOVERY',
    nameVi: '5. Hồi vị (Recovery)',
    nameEn: 'Forward Reach',
    badge: 'VƯƠN VỊ',
    colorHex: '#8b5cf6',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/50',
    textClass: 'text-purple-400',
    range: [0.78, 1.00],
    description: 'Thân người vươn mượt về phía trước (+34°), dầm lướt song song mặt nước chuẩn bị nhịp mới.',
    biomechanics: 'Thả lỏng cơ xô trong 0.15 giây để hồi phục năng lượng cho nhịp nổ lực tiếp theo.',
  },
];

export interface KinematicOutput {
  strokeAngleZ: number;   // Forward/Backward paddle rotation (rad)
  immersionY: number;     // Vertical displacement relative to gunwale (m)
  featherRotX: number;    // Blade lateral cant / feathering (rad)
  bladePitchY: number;    // Blade attack angle (rad)
  bodyLeanZ: number;      // Athlete torso forward/backward lean (rad)
  torsoElevY: number;     // Athlete vertical hip/torso rise (m)
  armReachX: number;      // Arms forward extension (m)
  armPullZ: number;       // Arms pull flexion (m)
  phase: StrokePhaseInfo;
  phaseProgress: number;  // 0.0 to 1.0 within current phase
}

/**
 * Calculates accurate biomechanical posture and paddle kinematics
 * @param globalNormalizedTime Cycle time normalized to [0.0, 1.0)
 * @param pairIndex Pair index from 1 (Bow) to 25 (Stern)
 * @param isPort True for port side (left), False for starboard (right)
 */
export function calculateStrokeKinematics(
  globalNormalizedTime: number,
  pairIndex: number,
  isPort: boolean
): KinematicOutput {
  // Wave propagation delay from bow to stern (human reaction time across 30m)
  const waveLag = ((pairIndex - 1) / 24) * 0.16; // ~0.16 rad delay
  const organicJitter = Math.sin(pairIndex * 17.3 + (isPort ? 0.3 : 0.0)) * 0.012; // Realistic micro-variance
  
  let t = (globalNormalizedTime - waveLag / (Math.PI * 2) + organicJitter) % 1.0;
  if (t < 0) t += 1.0;

  let strokeAngleZ = 0;
  let immersionY = 0;
  let featherRotX = 0;
  let bladePitchY = 0;
  let bodyLeanZ = 0;
  let torsoElevY = 0;
  let armReachX = 0;
  let armPullZ = 0;
  let phase: StrokePhaseInfo = STROKE_PHASES[0];
  let phaseProgress = 0;

  // Phase 1: CATCH (0.00 -> 0.15)
  if (t < 0.15) {
    phase = STROKE_PHASES[0];
    const p = t / 0.15;
    phaseProgress = p;

    // Torso: Deep forward power catch (34° ~ 0.59 rad forward)
    bodyLeanZ = 0.58 - 0.02 * p;
    torsoElevY = -0.02 * (1 - p);

    // Paddle: Sharp forward entry angle (24° ~ 0.42 rad)
    strokeAngleZ = 0.42;

    // Immersion: Rapid plunge from surface (+0.02m) down to deep water (-0.18m)
    immersionY = 0.02 - 0.20 * Math.sin(p * Math.PI * 0.5);

    featherRotX = isPort ? -0.42 : 0.42;
    bladePitchY = isPort ? -0.08 : 0.08;
    armReachX = 0.06;
    armPullZ = 0.0;
  }
  // Phase 2: DRIVE (0.15 -> 0.55)
  else if (t < 0.55) {
    phase = STROKE_PHASES[1];
    const p = (t - 0.15) / 0.40;
    phaseProgress = p;

    const powerCurve = Math.pow(p, 0.86); // Explosive catch into strong pull

    // Torso: Powerful pull backward from +0.56 rad (+32°) to -0.22 rad (-12.6°)
    bodyLeanZ = 0.56 - 0.78 * powerCurve;
    torsoElevY = 0.03 * Math.sin(p * Math.PI);

    // Paddle: Sweeps from +0.42 rad (+24°) back to -0.48 rad (-27.5°)
    strokeAngleZ = 0.42 - 0.90 * powerCurve;

    // Immersion: Deeply submerged under water throughout drive (-0.18m to -0.15m)
    immersionY = -0.18 + 0.03 * Math.sin(p * Math.PI);

    featherRotX = isPort ? -0.42 : 0.42;
    bladePitchY = isPort ? -0.10 : 0.10;
    armReachX = 0.06 * (1 - p);
    armPullZ = 0.08 * p;
  }
  // Phase 3: FINISH (0.55 -> 0.65)
  else if (t < 0.65) {
    phase = STROKE_PHASES[2];
    const p = (t - 0.55) / 0.10;
    phaseProgress = p;

    // Torso: Holds rear-brace position (-0.22 rad)
    bodyLeanZ = -0.22 + 0.04 * p;
    torsoElevY = 0.01;

    // Paddle: Full rear stroke excursion (-0.48 rad)
    strokeAngleZ = -0.48 + 0.06 * p;

    // Immersion: Rising to surface (-0.15m -> -0.04m)
    immersionY = -0.15 + 0.11 * p;

    featherRotX = isPort ? -0.40 : 0.40;
    bladePitchY = 0;
    armReachX = 0;
    armPullZ = 0.08 * (1 - p);
  }
  // Phase 4: EXTRACTION (0.65 -> 0.78)
  else if (t < 0.78) {
    phase = STROKE_PHASES[3];
    const p = (t - 0.65) / 0.13;
    phaseProgress = p;

    // Torso: Starts moving forward
    bodyLeanZ = -0.18 + 0.28 * p;
    torsoElevY = 0.0;

    // Paddle: Lifts rapidly out of water into air (+0.18m above water)
    strokeAngleZ = -0.42 + 0.22 * p;
    immersionY = -0.04 + 0.22 * Math.sin(p * Math.PI * 0.5);

    // Blade feathers to slice through air
    featherRotX = isPort ? -0.30 : 0.30;
    bladePitchY = isPort ? 0.04 : -0.04;
    armReachX = 0.02 * p;
    armPullZ = 0;
  }
  // Phase 5: RECOVERY (0.78 -> 1.00)
  else {
    phase = STROKE_PHASES[4];
    const p = (t - 0.78) / 0.22;
    phaseProgress = p;

    const smoothSwing = 0.5 - 0.5 * Math.cos(p * Math.PI);

    // Torso: Smooth forward reach back to catch angle (+0.10 -> +0.58 rad)
    bodyLeanZ = 0.10 + 0.48 * smoothSwing;
    torsoElevY = 0.0;

    // Paddle: Glides horizontally through the air from -0.20 rad to +0.42 rad
    strokeAngleZ = -0.20 + 0.62 * smoothSwing;
    immersionY = 0.18 + 0.04 * Math.sin(p * Math.PI); // Elevated in air

    featherRotX = isPort ? -0.32 : 0.32;
    bladePitchY = 0;
    armReachX = 0.02 + 0.04 * smoothSwing;
    armPullZ = 0;
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
    phase,
    phaseProgress,
  };
}

/**
 * Gets global phase telemetry based on master normalized time
 */
export function getGlobalStrokePhase(normalizedTime: number): {
  phase: StrokePhaseInfo;
  phaseProgress: number;
  globalTime: number;
} {
  const t = ((normalizedTime % 1.0) + 1.0) % 1.0;
  let phase = STROKE_PHASES[0];
  let phaseProgress = 0;

  for (const p of STROKE_PHASES) {
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
