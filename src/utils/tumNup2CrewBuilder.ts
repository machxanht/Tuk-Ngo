import * as THREE from 'three';
import { BOAT_SPECS_V2, getTumNup2ProfileV2 } from './tumNup2MasterV2';
import { calculateStrokeKinematics, KinematicOutput } from './rowingKinematics';
import { BoatMaterialConfig, getDefaultMaterialConfig } from './boatMaterialSystem';

export interface AthleteNode {
  id: string;
  role: 'PACER' | 'ROWER' | 'STEERSMAN';
  pairIndex: number; // 1 to 24 for rowers, 0 for pacer, 25 for steersmen
  isPort: boolean;
  basePosition: THREE.Vector3;
  rootGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headMesh: THREE.Mesh;
  paddleGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  bladeMesh?: THREE.Mesh;
  bladeTipMesh?: THREE.Mesh;
}

export interface CrewSystem {
  group: THREE.Group;
  paddlesGroup: THREE.Group;
  athletes: AthleteNode[];
  update: (normalizedTime: number) => void;
  updateMaterials: (config: BoatMaterialConfig) => void;
}

/**
 * Builds the authentic 55-member Tum Núp 2 Athlete Crew + Paddles
 * Features exact outward paddle splay and biomechanically authentic rowing kinematics.
 */
export function buildTumNup2Crew(initialConfig: BoatMaterialConfig = getDefaultMaterialConfig()): CrewSystem {
  const crewMasterGroup = new THREE.Group();
  crewMasterGroup.name = 'TumNup2CrewMasterGroup';

  const paddlesGroup = new THREE.Group();
  paddlesGroup.name = 'TumNup2PaddlesGroup';
  crewMasterGroup.add(paddlesGroup);

  const athletes: AthleteNode[] = [];

  // Reusable Materials with dynamic configuration
  const jerseyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.jerseyColor),
    roughness: 0.5,
    metalness: 0.1,
  });
  const jerseyStripeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.jerseyStripeColor),
    roughness: 0.35,
    metalness: 0.3,
  });
  const headbandMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.headbandColor),
    roughness: 0.35,
    metalness: 0.3,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.skinTone),
    roughness: 0.65,
    metalness: 0.05,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.shortsColor),
    roughness: 0.7,
  });
  const paddleWoodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.paddleShaftColor),
    roughness: 0.4,
    metalness: 0.1,
  });
  const paddleBladeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.paddleBladeColor),
    roughness: 0.35,
    metalness: 0.15,
  });
  const paddleGoldTipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.paddleTipColor),
    roughness: 0.3,
    metalness: 0.3,
  });

  // Reusable Geometries
  const headGeo = new THREE.SphereGeometry(0.10, 10, 8);
  const headbandGeo = new THREE.CylinderGeometry(0.103, 0.103, 0.035, 10);
  const torsoGeo = new THREE.BoxGeometry(0.24, 0.36, 0.16);
  const jerseyStripeGeo = new THREE.BoxGeometry(0.245, 0.06, 0.165);
  const upperArmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.22, 8);
  const forearmGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.20, 8);
  const thighGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8);
  const shinGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.26, 8);

  // Authentic Ghe Ngo Rower Paddle Geometry (Total length ~1.65m)
  const paddleShaftGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.25, 8);
  const paddleHandleTGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8);
  const paddleBladeGeo = new THREE.BoxGeometry(0.16, 0.48, 0.018);
  const paddleBladeTipGeo = new THREE.BoxGeometry(0.16, 0.12, 0.020);

  /**
   * Helper to create a single rower mannequin & paddle
   */
  const createRower = (
    id: string,
    x: number,
    yThwart: number,
    zOffset: number,
    pairIdx: number,
    isPort: boolean,
    halfBeam: number
  ): AthleteNode => {
    const root = new THREE.Group();
    root.name = `Athlete_${id}`;
    root.position.set(x, yThwart, zOffset);

    // 1. Pelvis / Seat Base
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.15), shortsMat);
    pelvis.position.set(0, 0.04, 0);
    root.add(pelvis);

    // 2. Legs in seated/kneeling race stance
    const leftThigh = new THREE.Mesh(thighGeo, shortsMat);
    leftThigh.rotation.z = Math.PI / 3.0;
    leftThigh.position.set(0.12, 0.05, -0.06);
    root.add(leftThigh);

    const leftShin = new THREE.Mesh(shinGeo, skinMat);
    leftShin.position.set(0.24, -0.08, -0.06);
    leftShin.rotation.z = -Math.PI / 6.0;
    root.add(leftShin);

    const rightThigh = new THREE.Mesh(thighGeo, shortsMat);
    rightThigh.rotation.z = Math.PI / 3.0;
    rightThigh.position.set(0.12, 0.05, 0.06);
    root.add(rightThigh);

    const rightShin = new THREE.Mesh(shinGeo, skinMat);
    rightShin.position.set(0.24, -0.08, 0.06);
    rightShin.rotation.z = -Math.PI / 6.0;
    root.add(rightShin);

    // 3. Articulated Torso (Rotates forward/backward from hips)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.08, 0); // Pivot at hip line

    const torsoMesh = new THREE.Mesh(torsoGeo, jerseyMat);
    torsoMesh.position.set(0, 0.18, 0);
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    const goldStripe = new THREE.Mesh(jerseyStripeGeo, jerseyStripeMat);
    goldStripe.position.set(0, 0.22, 0);
    torsoGroup.add(goldStripe);

    // 4. Head & Sacred Khmer Headband
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 0.44, 0);
    headMesh.castShadow = true;
    torsoGroup.add(headMesh);

    const headband = new THREE.Mesh(headbandGeo, headbandMat);
    headband.position.set(0, 0.46, 0);
    torsoGroup.add(headband);

    // 5. Left & Right Arm Groups with Authentic Grip Geometry:
    // For Port (Left):
    // - Left arm is OUTSIDE arm: extends forward & outward to grip shaft near gunwale.
    // - Right arm is INSIDE arm: reaches across chest to press top T-handle.
    // For Starboard (Right):
    // - Right arm is OUTSIDE arm: extends forward & outward to grip shaft near gunwale.
    // - Left arm is INSIDE arm: reaches across chest to press top T-handle.
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(0, 0.32, -0.14);
    const leftUpper = new THREE.Mesh(upperArmGeo, jerseyMat);
    leftUpper.position.set(0.04, -0.08, isPort ? -0.04 : 0.04);
    leftUpper.rotation.z = Math.PI / 5.0;
    leftUpper.rotation.x = isPort ? -Math.PI / 8.0 : Math.PI / 10.0;
    leftArmGroup.add(leftUpper);

    const leftFore = new THREE.Mesh(forearmGeo, skinMat);
    leftFore.position.set(0.12, -0.18, isPort ? -0.08 : 0.08);
    leftFore.rotation.z = Math.PI / 3.2;
    leftArmGroup.add(leftFore);
    torsoGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0, 0.32, 0.14);
    const rightUpper = new THREE.Mesh(upperArmGeo, jerseyMat);
    rightUpper.position.set(0.04, -0.08, !isPort ? 0.04 : -0.04);
    rightUpper.rotation.z = Math.PI / 5.0;
    rightUpper.rotation.x = !isPort ? Math.PI / 8.0 : -Math.PI / 10.0;
    rightArmGroup.add(rightUpper);

    const rightFore = new THREE.Mesh(forearmGeo, skinMat);
    rightFore.position.set(0.12, -0.18, !isPort ? 0.08 : -0.08);
    rightFore.rotation.z = Math.PI / 3.2;
    rightArmGroup.add(rightFore);
    torsoGroup.add(rightArmGroup);

    root.add(torsoGroup);

    // 6. Paddle Group (Anchor at gunwale fulcrum point outside athlete)
    const paddleGroup = new THREE.Group();
    paddleGroup.name = `Paddle_${id}`;
    // Position the paddle pivot right at the athlete's outer water flank
    const lateralGunwaleOffset = (halfBeam - Math.abs(zOffset)) + 0.06;
    const paddleLocalZ = isPort ? -lateralGunwaleOffset : lateralGunwaleOffset;
    paddleGroup.position.set(0.10, 0.18, paddleLocalZ);

    // Shaft
    const shaft = new THREE.Mesh(paddleShaftGeo, paddleWoodMat);
    shaft.position.set(0, -0.45, 0);
    shaft.castShadow = true;
    paddleGroup.add(shaft);

    // Top T-Handle (Tay trên bám)
    const tHandle = new THREE.Mesh(paddleHandleTGeo, paddleWoodMat);
    tHandle.position.set(0, 0.18, 0);
    tHandle.rotation.z = Math.PI / 2;
    paddleGroup.add(tHandle);

    // Teardrop Blade (Lưỡi dầm cắm nước)
    const blade = new THREE.Mesh(paddleBladeGeo, paddleBladeMat);
    blade.position.set(0, -1.02, 0);
    blade.castShadow = true;
    paddleGroup.add(blade);

    const bladeTip = new THREE.Mesh(paddleBladeTipGeo, paddleGoldTipMat);
    bladeTip.position.set(0, -1.24, 0);
    bladeTip.castShadow = true;
    paddleGroup.add(bladeTip);

    root.add(paddleGroup);
    crewMasterGroup.add(root);

    return {
      id,
      role: 'ROWER',
      pairIndex: pairIdx,
      isPort,
      basePosition: new THREE.Vector3(x, yThwart, zOffset),
      rootGroup: root,
      torsoGroup,
      headMesh,
      paddleGroup,
      leftArmGroup,
      rightArmGroup,
      bladeMesh: blade,
      bladeTipMesh: bladeTip,
    };
  };

  // 1. Build 24 Pairs of Rowers (48 Rowers total along the cockpit)
  for (let pIdx = 1; pIdx <= 24; pIdx++) {
    // Spacing from +9.6m (Bow pair) down to -9.7m (Stern pair)
    const px = 9.6 - (pIdx - 1) * 0.84;
    const pu = (px + BOAT_SPECS_V2.LOA / 2) / BOAT_SPECS_V2.LOA;
    const { halfBeam, gunwaleY } = getTumNup2ProfileV2(pu);
    const yThwart = gunwaleY - 0.04;
    const seatOffsetZ = Math.max(0.14, halfBeam * 0.52);

    // Port Athlete (Left, -Z)
    const portAthlete = createRower(
      `P${pIdx}_L`,
      px,
      yThwart,
      -seatOffsetZ,
      pIdx,
      true,
      halfBeam
    );
    athletes.push(portAthlete);

    // Starboard Athlete (Right, +Z)
    const stbdAthlete = createRower(
      `P${pIdx}_R`,
      px,
      yThwart,
      seatOffsetZ,
      pIdx,
      false,
      halfBeam
    );
    athletes.push(stbdAthlete);
  }

  // 2. Build 1 Pacer / Whistle Commander (Thủ tiêu chỉ huy mũi) at x = +11.2m
  const pacerU = (11.2 + BOAT_SPECS_V2.LOA / 2) / BOAT_SPECS_V2.LOA;
  const pacerProfile = getTumNup2ProfileV2(pacerU);
  const pacerRoot = new THREE.Group();
  pacerRoot.name = 'Pacer_Commander';
  pacerRoot.position.set(11.2, pacerProfile.gunwaleY - 0.02, 0);

  const pacerTorsoGroup = new THREE.Group();
  pacerTorsoGroup.position.set(0, 0.10, 0);

  const pacerTorso = new THREE.Mesh(torsoGeo, jerseyStripeMat); // Commander Golden Trim Jersey
  pacerTorso.position.set(0, 0.18, 0);
  pacerTorso.castShadow = true;
  pacerTorsoGroup.add(pacerTorso);

  const pacerHead = new THREE.Mesh(headGeo, skinMat);
  pacerHead.position.set(0, 0.44, 0);
  pacerTorsoGroup.add(pacerHead);

  const pacerHeadband = new THREE.Mesh(headbandGeo, headbandMat);
  pacerHeadband.position.set(0, 0.46, 0);
  pacerTorsoGroup.add(pacerHeadband);

  // Whistle & Rhythm Baton
  const whistleStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8),
    paddleGoldTipMat
  );
  whistleStick.position.set(0.18, 0.35, 0.15);
  whistleStick.rotation.z = Math.PI / 4.0;
  pacerTorsoGroup.add(whistleStick);

  pacerRoot.add(pacerTorsoGroup);
  crewMasterGroup.add(pacerRoot);

  athletes.push({
    id: 'PACER_CMD',
    role: 'PACER',
    pairIndex: 0,
    isPort: false,
    basePosition: new THREE.Vector3(11.2, pacerProfile.gunwaleY - 0.02, 0),
    rootGroup: pacerRoot,
    torsoGroup: pacerTorsoGroup,
    headMesh: pacerHead,
    paddleGroup: new THREE.Group(),
    leftArmGroup: new THREE.Group(),
    rightArmGroup: new THREE.Group(),
  });

  // 3. Build 3 Steersmen (Người cầm lái sau đuôi) at x = -11.0m, -11.8m, -12.6m
  const steerPositions = [-11.0, -11.8, -12.6];
  steerPositions.forEach((sx, idx) => {
    const su = (sx + BOAT_SPECS_V2.LOA / 2) / BOAT_SPECS_V2.LOA;
    const { gunwaleY } = getTumNup2ProfileV2(su);
    const steerRoot = new THREE.Group();
    steerRoot.name = `Steersman_${idx + 1}`;
    steerRoot.position.set(sx, gunwaleY - 0.02, idx % 2 === 0 ? 0.08 : -0.08);

    const steerTorsoGroup = new THREE.Group();
    steerTorsoGroup.position.set(0, 0.12, 0);

    const sTorso = new THREE.Mesh(torsoGeo, jerseyMat);
    sTorso.position.set(0, 0.18, 0);
    sTorso.castShadow = true;
    steerTorsoGroup.add(sTorso);

    const sHead = new THREE.Mesh(headGeo, skinMat);
    sHead.position.set(0, 0.44, 0);
    steerTorsoGroup.add(sHead);

    const sHeadband = new THREE.Mesh(headbandGeo, headbandMat);
    sHeadband.position.set(0, 0.46, 0);
    steerTorsoGroup.add(sHeadband);

    steerRoot.add(steerTorsoGroup);

    // Long Steering Oar (Dầm lái dài ~3.8m tì phía đuôi ngoài mạn)
    const steerOarGroup = new THREE.Group();
    const oarShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 3.2, 8),
      paddleWoodMat
    );
    oarShaft.position.set(-0.9, -0.6, idx % 2 === 0 ? 0.25 : -0.25);
    oarShaft.rotation.z = Math.PI / 3.4;
    oarShaft.castShadow = true;
    steerOarGroup.add(oarShaft);

    steerRoot.add(steerOarGroup);
    crewMasterGroup.add(steerRoot);

    athletes.push({
      id: `STEER_${idx + 1}`,
      role: 'STEERSMAN',
      pairIndex: 25,
      isPort: idx % 2 !== 0,
      basePosition: new THREE.Vector3(sx, gunwaleY - 0.02, idx % 2 === 0 ? 0.08 : -0.08),
      rootGroup: steerRoot,
      torsoGroup: steerTorsoGroup,
      headMesh: sHead,
      paddleGroup: steerOarGroup,
      leftArmGroup: new THREE.Group(),
      rightArmGroup: new THREE.Group(),
    });
  });

  // Dynamic Material Updater
  const updateMaterials = (cfg: BoatMaterialConfig) => {
    jerseyMat.color.set(cfg.jerseyColor);
    jerseyStripeMat.color.set(cfg.jerseyStripeColor);
    headbandMat.color.set(cfg.headbandColor);
    shortsMat.color.set(cfg.shortsColor);
    skinMat.color.set(cfg.skinTone);
    paddleWoodMat.color.set(cfg.paddleShaftColor);
    paddleBladeMat.color.set(cfg.paddleBladeColor);
    paddleGoldTipMat.color.set(cfg.paddleTipColor);
  };

  // Real-time Animation Loop Updater
  const update = (normalizedTime: number) => {
    athletes.forEach((athlete) => {
      if (athlete.role === 'ROWER') {
        const k: KinematicOutput = calculateStrokeKinematics(
          normalizedTime,
          athlete.pairIndex,
          athlete.isPort
        );

        // 1. Torso Lean (Rotates forward/backward around hip line)
        athlete.torsoGroup.rotation.z = -k.bodyLeanZ;
        athlete.torsoGroup.position.y = 0.08 + k.torsoElevY;
        athlete.headMesh.rotation.z = k.headPitch;

        // 2. Arm Extension & Pull
        athlete.leftArmGroup.position.x = k.armReachX;
        athlete.rightArmGroup.position.x = k.armReachX;
        athlete.leftArmGroup.rotation.z = -k.bodyLeanZ * 0.4;
        athlete.rightArmGroup.rotation.z = -k.bodyLeanZ * 0.4;

        // 3. Paddle Orientation:
        // - rotation.z sweeps forward (+X / Bow) at catch, and backward (-X / Stern) during drive
        // - rotation.x keeps paddle splayed strictly OUTWARD into river water
        // - rotation.y orients blade face to stroke arc
        athlete.paddleGroup.rotation.z = k.strokeAngleZ;
        athlete.paddleGroup.rotation.x = k.featherRotX;
        athlete.paddleGroup.rotation.y = k.bladePitchY;
        athlete.paddleGroup.position.y = 0.18 + k.immersionY;
      } else if (athlete.role === 'PACER') {
        // Pacer commands cadence with energetic torso & arm pumping
        const pacerPhase = (normalizedTime * 2.0) % 1.0;
        const pacerSwing = Math.sin(pacerPhase * Math.PI * 2);
        athlete.torsoGroup.rotation.z = 0.15 + pacerSwing * 0.18;
        athlete.torsoGroup.rotation.y = pacerSwing * 0.12;
      } else if (athlete.role === 'STEERSMAN') {
        // Steersmen maintain firm stability with slight reactionary boat sway
        const steerSway = Math.sin(normalizedTime * Math.PI * 2) * 0.04;
        athlete.torsoGroup.rotation.z = -0.10 + steerSway;
        athlete.paddleGroup.rotation.z = steerSway * 0.5;
      }
    });
  };

  return {
    group: crewMasterGroup,
    paddlesGroup,
    athletes,
    update,
    updateMaterials,
  };
}
