import * as THREE from 'three';

export interface RaceCourseConfig {
  courseLengthM: number;       // e.g. 1000m (or 1200m)
  riverWidthM: number;          // 82.0m (Confirmed 75-85m)
  lane1Z: number;               // -18.0m (North Lane / Grandstand A)
  lane2Z: number;               // +18.0m (South Lane)
  buoyIntervalM: number;        // 15.0m
  startXM: number;              // 0.0m
  finishXM: number;             // 1000.0m
}

export const DEFAULT_RACE_COURSE_CONFIG: RaceCourseConfig = {
  courseLengthM: 1000,
  riverWidthM: 82.0,
  lane1Z: -18.0,
  lane2Z: 18.0,
  buoyIntervalM: 15.0,
  startXM: 0.0,
  finishXM: 1000.0,
};

export interface MasperoRaceCourseObject {
  group: THREE.Group;
  waterMesh: THREE.Mesh;
  startGantry: THREE.Group;
  finishGantry: THREE.Group;
  grandstandA: THREE.Group;
  refereeTower: THREE.Group;
  milestones: THREE.Group[];
  updateWater: (timeSec: number) => void;
  dispose: () => void;
}

/**
 * Builds authentic 3D environment of Maspéro River Race Course (Sóc Trăng)
 * Based on 2024-2025 Sóc Trăng Oóc Om Bóc Ghe Ngo Championship specifications.
 */
export function buildMasperoRaceCourse(
  config: RaceCourseConfig = DEFAULT_RACE_COURSE_CONFIG
): MasperoRaceCourseObject {
  const courseGroup = new THREE.Group();
  courseGroup.name = 'MASPERO_RACE_COURSE_GROUP';

  const { startXM, finishXM, riverWidthM, lane1Z, lane2Z, buoyIntervalM } = config;
  const courseTotalMinX = -120; // Pre-start alignment zone
  const courseTotalMaxX = finishXM + 250; // Deceleration & turnaround zone
  const totalLength = courseTotalMaxX - courseTotalMinX;
  const midX = (courseTotalMinX + courseTotalMaxX) / 2;
  const halfRiverW = riverWidthM / 2;

  // -------------------------------------------------------------
  // 1. REUSABLE MATERIALS & GEOMETRIES
  // -------------------------------------------------------------
  const waterGeo = new THREE.PlaneGeometry(totalLength, riverWidthM, 64, 16);
  waterGeo.rotateX(-Math.PI / 2);

  // Maspero silt-rich alluvial river water
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x223e32, // Brownish-olive sediment alluvial water
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.94,
  });

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(midX, -0.02, 0);
  waterMesh.receiveShadow = true;
  courseGroup.add(waterMesh);

  // Embankment Concrete Material
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x8a929a,
    roughness: 0.85,
    metalness: 0.1,
  });

  // Sidewalk Pavement Material
  const pavementMat = new THREE.MeshStandardMaterial({
    color: 0xa39e93,
    roughness: 0.9,
    metalness: 0.05,
  });

  // Grass / Riverbank Greenery Material
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    roughness: 0.95,
  });

  // Railing Metal Material
  const railingMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6, // Festival blue railing
    roughness: 0.3,
    metalness: 0.7,
  });

  // Khmer Festive Flag Materials
  const flagYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
  const flagRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
  const flagBlueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
  const flagWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
  const flagOrangeMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide });

  // Buoy Materials
  const buoyRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.2 });
  const buoyYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.2 });
  const buoyWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2 });

  // Tree Materials
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e5a2d, roughness: 0.85 });

  // -------------------------------------------------------------
  // 2. CONCRETE EMBANKMENTS (HAI BỜ KÈ SÔNG MASPÉRO)
  // -------------------------------------------------------------
  const embankmentSlopeW = 3.5;
  const embankmentHeight = 2.2;
  const promenadeW = 12.0;

  // Function to build an embankment on either North (-Z) or South (+Z) bank
  function createEmbankment(side: 'NORTH' | 'SOUTH') {
    const sign = side === 'NORTH' ? -1 : 1;
    const bankGroup = new THREE.Group();

    // 2a. Sloped Stone/Concrete Revetment (Kè nghiêng sát mép nước)
    const slopeGeo = new THREE.PlaneGeometry(totalLength, Math.sqrt(embankmentSlopeW * embankmentSlopeW + embankmentHeight * embankmentHeight));
    slopeGeo.rotateX(sign * Math.atan2(embankmentHeight, embankmentSlopeW));
    const slopeMesh = new THREE.Mesh(slopeGeo, concreteMat);
    slopeMesh.position.set(
      midX,
      embankmentHeight / 2,
      sign * (halfRiverW + embankmentSlopeW / 2)
    );
    bankGroup.add(slopeMesh);

    // 2b. Upper Paved Promenade (Vỉa hè bờ kè lát gạch)
    const promGeo = new THREE.BoxGeometry(totalLength, 0.3, promenadeW);
    const promMesh = new THREE.Mesh(promGeo, pavementMat);
    promMesh.position.set(
      midX,
      embankmentHeight,
      sign * (halfRiverW + embankmentSlopeW + promenadeW / 2)
    );
    bankGroup.add(promMesh);

    // 2c. Outer Green Park Belt (Thảm cỏ & cây xanh sau vỉa hè)
    const grassGeo = new THREE.BoxGeometry(totalLength, 0.2, 18.0);
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.set(
      midX,
      embankmentHeight - 0.05,
      sign * (halfRiverW + embankmentSlopeW + promenadeW + 9.0)
    );
    bankGroup.add(grassMesh);

    // 2d. Guardrail (Lan can bờ kè)
    const railPostGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
    const railBarGeo = new THREE.CylinderGeometry(0.025, 0.025, totalLength, 6);
    railBarGeo.rotateZ(Math.PI / 2);

    const railZ = sign * (halfRiverW + embankmentSlopeW + 0.1);
    const topRail = new THREE.Mesh(railBarGeo, railingMat);
    topRail.position.set(midX, embankmentHeight + 1.0, railZ);
    bankGroup.add(topRail);

    const midRail = new THREE.Mesh(railBarGeo, railingMat);
    midRail.position.set(midX, embankmentHeight + 0.55, railZ);
    bankGroup.add(midRail);

    // Posts & Khmer Festive Flags every 20m along promenade
    const flagGeo = new THREE.PlaneGeometry(1.2, 1.8);
    const flagColors = [flagYellowMat, flagRedMat, flagBlueMat, flagOrangeMat, flagWhiteMat];

    for (let x = courseTotalMinX; x <= courseTotalMaxX; x += 10) {
      // Railing post
      const post = new THREE.Mesh(railPostGeo, railingMat);
      post.position.set(x, embankmentHeight + 0.55, railZ);
      bankGroup.add(post);

      // Flagpole and Festive Buddhist/Khmer Flag every 25m
      if (Math.abs(x) % 25 === 0) {
        const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 4.5, 6);
        const pole = new THREE.Mesh(poleGeo, concreteMat);
        pole.position.set(x, embankmentHeight + 2.25, railZ + sign * 0.3);
        bankGroup.add(pole);

        const flagMatChoice = flagColors[Math.abs(Math.floor(x / 25)) % flagColors.length];
        const flag = new THREE.Mesh(flagGeo, flagMatChoice);
        flag.position.set(x + 0.6, embankmentHeight + 3.4, railZ + sign * 0.3);
        flag.rotation.y = sign * 0.2;
        bankGroup.add(flag);
      }

      // Trees along green belt every 30m
      if (Math.abs(x) % 30 === 0) {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 3.2, 7), trunkMat);
        trunk.position.y = 1.6;
        treeGroup.add(trunk);

        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), foliageMat);
        crown.position.y = 4.2;
        treeGroup.add(crown);

        const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), foliageMat);
        crownTop.position.y = 5.4;
        treeGroup.add(crownTop);

        treeGroup.position.set(x, embankmentHeight, sign * (halfRiverW + embankmentSlopeW + promenadeW + 4.0));
        bankGroup.add(treeGroup);
      }

      // Cheering Crowd Placeholders (Khán giả dọc bờ kè)
      if (x >= startXM - 20 && x <= finishXM + 80 && Math.abs(x) % 4 === 0) {
        const crowdCluster = createCrowdCluster(x, embankmentHeight, sign * (halfRiverW + embankmentSlopeW + 2.0));
        bankGroup.add(crowdCluster);
      }
    }

    return bankGroup;
  }

  // Helper for generating crowd figures
  function createCrowdCluster(x: number, y: number, z: number): THREE.Group {
    const cluster = new THREE.Group();
    const colors = [0x1e3a8a, 0xdc2626, 0xf59e0b, 0x16a34a, 0xffffff, 0x9333ea];
    const headGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6);

    for (let i = 0; i < 4; i++) {
      const pMat = new THREE.MeshStandardMaterial({
        color: colors[(Math.abs(x * 7 + i)) % colors.length],
        roughness: 0.7,
      });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 });

      const person = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, pMat);
      body.position.y = 0.4;
      person.add(body);

      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 0.92;
      person.add(head);

      person.position.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
      cluster.add(person);
    }

    cluster.position.set(x, y, z);
    return cluster;
  }

  // Add North & South Embankments
  courseGroup.add(createEmbankment('NORTH'));
  courseGroup.add(createEmbankment('SOUTH'));

  // -------------------------------------------------------------
  // 3. RACING LANES & BUOY SYSTEM (DÂY PHAO PHÂN LÀN SÔNG MASPÉRO)
  // -------------------------------------------------------------
  const buoyGroup = new THREE.Group();
  buoyGroup.name = 'RACE_LANES_BUOYS';

  const buoyGeo = new THREE.SphereGeometry(0.24, 12, 8);
  buoyGeo.scale(1, 1.25, 1);
  const smallFlagGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
  smallFlagGeo.rotateZ(Math.PI / 2);

  // Center Divider Line (Tim sông Z = 0)
  for (let x = startXM - 40; x <= finishXM + 150; x += buoyIntervalM) {
    const isRed = Math.floor(x / buoyIntervalM) % 2 === 0;
    const bMesh = new THREE.Mesh(buoyGeo, isRed ? buoyRedMat : buoyYellowMat);
    bMesh.position.set(x, 0.05, 0);

    const flag = new THREE.Mesh(smallFlagGeo, isRed ? flagYellowMat : flagRedMat);
    flag.position.set(x, 0.36, 0);
    buoyGroup.add(bMesh);
    buoyGroup.add(flag);
  }

  // Outer Safety Buoy Lines (Lane 1 Outer Z = -32m, Lane 2 Outer Z = +32m)
  [-33, 33].forEach((zPos) => {
    for (let x = startXM - 20; x <= finishXM + 100; x += buoyIntervalM * 1.5) {
      const bMesh = new THREE.Mesh(buoyGeo, buoyWhiteMat);
      bMesh.position.set(x, 0.05, zPos);
      buoyGroup.add(bMesh);
    }
  });

  courseGroup.add(buoyGroup);

  // -------------------------------------------------------------
  // 4. START LINE AREA (VẠCH XUẤT PHÁT X = 0M)
  // -------------------------------------------------------------
  const startGantry = new THREE.Group();
  startGantry.name = 'START_LINE_GANTRY';

  // Start Line floating buoys string across the river at X = 0
  const startLineGeo = new THREE.CylinderGeometry(0.06, 0.06, riverWidthM - 4, 8);
  startLineGeo.rotateX(Math.PI / 2);
  const startCableMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const startCable = new THREE.Mesh(startLineGeo, startCableMat);
  startCable.position.set(startXM, 0.1, 0);
  startGantry.add(startCable);

  // Red Start Flags across the river
  for (let z = -32; z <= 32; z += 8) {
    const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.8), flagRedMat);
    flagMesh.position.set(startXM, 0.45, z);
    startGantry.add(flagMesh);
  }

  // Start Pylons on both banks
  [-halfRiverW - 1.5, halfRiverW + 1.5].forEach((zPos, idx) => {
    const pylonGeo = new THREE.CylinderGeometry(0.3, 0.4, 6.0, 8);
    const pylon = new THREE.Mesh(pylonGeo, concreteMat);
    pylon.position.set(startXM, 3.0, zPos);
    startGantry.add(pylon);

    // Banner "XUẤT PHÁT - 0M"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.2), flagRedMat);
    signBoard.position.set(startXM, 5.2, zPos + (idx === 0 ? 0.8 : -0.8));
    startGantry.add(signBoard);
  });

  courseGroup.add(startGantry);

  // -------------------------------------------------------------
  // 5. DISTANCE MILESTONE MARKERS (250M, 500M, 750M, 1000M)
  // -------------------------------------------------------------
  const milestones: THREE.Group[] = [];
  const milestoneDistances = [250, 500, 750];

  milestoneDistances.forEach((dist) => {
    const msGroup = new THREE.Group();
    msGroup.name = `MILESTONE_${dist}M`;

    // Signboard on both banks
    [-halfRiverW - 2.5, halfRiverW + 2.5].forEach((zPos) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.0, 8), concreteMat);
      pole.position.set(dist, 2.0 + embankmentHeight, zPos);
      msGroup.add(pole);

      const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.15), flagYellowMat);
      board.position.set(dist, 3.6 + embankmentHeight, zPos);
      msGroup.add(board);
    });

    // Milestone floating buoy flags in water
    const msBuoy = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), buoyYellowMat);
    msBuoy.position.set(dist, 0.1, 0);
    msGroup.add(msBuoy);

    const msFlag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1.0), flagYellowMat);
    msFlag.position.set(dist, 0.8, 0);
    msGroup.add(msFlag);

    courseGroup.add(msGroup);
    milestones.push(msGroup);
  });

  // -------------------------------------------------------------
  // 6. FINISH LINE AREA & GRANDSTAND A (VẠCH ĐÍCH & KHÁN ĐÀI A 1000M)
  // -------------------------------------------------------------
  const finishGantry = new THREE.Group();
  finishGantry.name = 'FINISH_LINE_GANTRY';

  // Finish Cable across the river
  const finishCable = new THREE.Mesh(startLineGeo, flagYellowMat);
  finishCable.position.set(finishXM, 0.1, 0);
  finishGantry.add(finishCable);

  // Checkerboard Finish Flags across the river
  for (let z = -34; z <= 34; z += 6) {
    const isWhite = Math.floor((z + 34) / 6) % 2 === 0;
    const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.9), isWhite ? flagWhiteMat : flagRedMat);
    flagMesh.position.set(finishXM, 0.5, z);
    finishGantry.add(flagMesh);
  }

  // Finish Overhead Arch Pylons & Banner
  const archPylonGeo = new THREE.CylinderGeometry(0.45, 0.55, 10.0, 10);
  [-halfRiverW - 1.5, halfRiverW + 1.5].forEach((zPos) => {
    const pylon = new THREE.Mesh(archPylonGeo, concreteMat);
    pylon.position.set(finishXM, 5.0, zPos);
    finishGantry.add(pylon);
  });

  // High Finish Arch Span
  const archBeamGeo = new THREE.BoxGeometry(1.2, 1.2, riverWidthM + 6);
  const archBeam = new THREE.Mesh(archBeamGeo, flagRedMat);
  archBeam.position.set(finishXM, 9.6, 0);
  finishGantry.add(archBeam);

  // Large Finish Line Board
  const finishBoardGeo = new THREE.BoxGeometry(0.4, 1.8, 22.0);
  const finishBoard = new THREE.Mesh(finishBoardGeo, flagYellowMat);
  finishBoard.position.set(finishXM, 9.6, 0);
  finishGantry.add(finishBoard);

  courseGroup.add(finishGantry);

  // -------------------------------------------------------------
  // 7. KHÁN ĐÀI A TRUNG TÂM (MAIN GRANDSTAND A)
  // Bờ Bắc (Z = -46m to -75m), Dài 110m (X = 930m to 1040m)
  // -------------------------------------------------------------
  const grandstandA = new THREE.Group();
  grandstandA.name = 'GRANDSTAND_A_CENTER';

  const grandstandStartX = 935;
  const grandstandLen = 110;
  const grandstandDepth = 24;

  // 7a. Stepped Seating Concrete Base (Bậc ngồi khán đài)
  const tiers = 8;
  for (let t = 0; t < tiers; t++) {
    const stepGeo = new THREE.BoxGeometry(grandstandLen, 0.75, grandstandDepth - t * 2.6);
    const stepMesh = new THREE.Mesh(stepGeo, concreteMat);
    stepMesh.position.set(
      grandstandStartX + grandstandLen / 2,
      embankmentHeight + t * 0.75 + 0.375,
      -(halfRiverW + embankmentSlopeW + 4.0 + (grandstandDepth - t * 2.6) / 2)
    );
    grandstandA.add(stepMesh);

    // Seating crowd on grandstand
    for (let cx = grandstandStartX + 5; cx < grandstandStartX + grandstandLen - 5; cx += 5) {
      const crowdGroup = createCrowdCluster(cx, embankmentHeight + (t + 1) * 0.75, -(halfRiverW + embankmentSlopeW + 6.0 + t * 2.2));
      grandstandA.add(crowdGroup);
    }
  }

  // 7b. Iconic Curved Blue Canopy Roof (Mái vòm che màu xanh dương)
  const roofGeo = new THREE.CylinderGeometry(
    grandstandDepth * 0.75,
    grandstandDepth * 0.75,
    grandstandLen + 6,
    16,
    1,
    true,
    Math.PI * 0.95,
    Math.PI * 0.65
  );
  roofGeo.rotateZ(Math.PI / 2);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Sóc Trăng Grandstand Blue
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const canopy = new THREE.Mesh(roofGeo, canopyMat);
  canopy.position.set(
    grandstandStartX + grandstandLen / 2,
    embankmentHeight + 9.5,
    -(halfRiverW + embankmentSlopeW + 16.0)
  );
  grandstandA.add(canopy);

  // Roof Support Pillars
  for (let px = grandstandStartX; px <= grandstandStartX + grandstandLen; px += 22) {
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 11.0, 8);
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(px, embankmentHeight + 5.5, -(halfRiverW + embankmentSlopeW + 4.5));
    grandstandA.add(pillar);

    const backPillar = new THREE.Mesh(pillarGeo, concreteMat);
    backPillar.position.set(px, embankmentHeight + 5.5, -(halfRiverW + embankmentSlopeW + 28.0));
    grandstandA.add(backPillar);
  }

  // 7c. Main Championship Banner
  const bannerGeo = new THREE.BoxGeometry(grandstandLen - 10, 2.2, 0.3);
  const bannerMesh = new THREE.Mesh(bannerGeo, flagRedMat);
  bannerMesh.position.set(
    grandstandStartX + grandstandLen / 2,
    embankmentHeight + 7.8,
    -(halfRiverW + embankmentSlopeW + 4.4)
  );
  grandstandA.add(bannerMesh);

  courseGroup.add(grandstandA);

  // -------------------------------------------------------------
  // 8. REFEREE & PHOTO-FINISH TOWER (THÁP TRỌNG TÀI BẤM GIỜ)
  // At X = 1000m on North Bank
  // -------------------------------------------------------------
  const refereeTower = new THREE.Group();
  refereeTower.name = 'REFEREE_TOWER';

  // 2-level observation tower
  const towerBaseGeo = new THREE.BoxGeometry(4.5, 7.0, 4.5);
  const towerBase = new THREE.Mesh(towerBaseGeo, concreteMat);
  towerBase.position.set(finishXM + 3.0, embankmentHeight + 3.5, -(halfRiverW + embankmentSlopeW + 5.0));
  refereeTower.add(towerBase);

  // Glass observation booth
  const glassBoothGeo = new THREE.BoxGeometry(4.2, 2.6, 4.2);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.65,
  });
  const glassBooth = new THREE.Mesh(glassBoothGeo, glassMat);
  glassBooth.position.set(finishXM + 3.0, embankmentHeight + 7.8, -(halfRiverW + embankmentSlopeW + 5.0));
  refereeTower.add(glassBooth);

  // Tower Roof & High Photo-finish Camera Pole
  const towerRoofGeo = new THREE.ConeGeometry(3.5, 2.0, 4);
  towerRoofGeo.rotateY(Math.PI / 4);
  const towerRoof = new THREE.Mesh(towerRoofGeo, flagRedMat);
  towerRoof.position.set(finishXM + 3.0, embankmentHeight + 10.0, -(halfRiverW + embankmentSlopeW + 5.0));
  refereeTower.add(towerRoof);

  courseGroup.add(refereeTower);

  // -------------------------------------------------------------
  // 9. ICONIC MASPÉRO BRIDGE IN DISTANCE (CẦU QUAY MASPÉRO 1280M)
  // -------------------------------------------------------------
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'MASPERO_BRIDGE_DOWNSTREAM';

  const bridgeX = 1260;
  const bridgeDeckGeo = new THREE.BoxGeometry(8.0, 1.2, riverWidthM + 30);
  const bridgeDeck = new THREE.Mesh(bridgeDeckGeo, concreteMat);
  bridgeDeck.position.set(bridgeX, 6.0, 0);
  bridgeGroup.add(bridgeDeck);

  // Bridge Piers (Trụ cầu giữa sông)
  [-halfRiverW * 0.5, halfRiverW * 0.5].forEach((pz) => {
    const pierGeo = new THREE.CylinderGeometry(1.2, 1.5, 6.5, 12);
    const pier = new THREE.Mesh(pierGeo, concreteMat);
    pier.position.set(bridgeX, 3.0, pz);
    bridgeGroup.add(pier);
  });

  // Arched Truss
  const archGeo = new THREE.TorusGeometry(halfRiverW * 0.6, 0.4, 8, 24, Math.PI);
  archGeo.rotateY(Math.PI / 2);
  const bridgeArch1 = new THREE.Mesh(archGeo, railingMat);
  bridgeArch1.position.set(bridgeX - 3.5, 6.0, 0);
  bridgeGroup.add(bridgeArch1);

  const bridgeArch2 = new THREE.Mesh(archGeo, railingMat);
  bridgeArch2.position.set(bridgeX + 3.5, 6.0, 0);
  bridgeGroup.add(bridgeArch2);

  courseGroup.add(bridgeGroup);

  // -------------------------------------------------------------
  // 10. REALTIME WATER ANIMATION & CLEANUP
  // -------------------------------------------------------------
  const updateWater = (timeSec: number) => {
    // Maspero water surface gentle river flow
    waterMat.opacity = 0.92 + 0.03 * Math.sin(timeSec * 1.5);
  };

  const dispose = () => {
    waterGeo.dispose();
    waterMat.dispose();
    concreteMat.dispose();
    pavementMat.dispose();
    grassMat.dispose();
    railingMat.dispose();
    flagYellowMat.dispose();
    flagRedMat.dispose();
    flagBlueMat.dispose();
    flagWhiteMat.dispose();
    flagOrangeMat.dispose();
    buoyRedMat.dispose();
    buoyYellowMat.dispose();
    buoyWhiteMat.dispose();
    trunkMat.dispose();
    foliageMat.dispose();
    canopyMat.dispose();
    glassMat.dispose();
  };

  return {
    group: courseGroup,
    waterMesh,
    startGantry,
    finishGantry,
    grandstandA,
    refereeTower,
    milestones,
    updateWater,
    dispose,
  };
}
