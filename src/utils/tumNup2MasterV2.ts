import * as THREE from 'three';

/**
 * ============================================================================
 * TUM_NUP_2_2024_MASTER_V2 — PURE REBUILT HULL GEOMETRY ENGINE
 * ============================================================================
 * Source of Truth: Video Reference (@monghuorhout vector blueprint) & 2024 Race Photography
 * 
 * Dimensions:
 * - LOA (Length Overall): 30.20 m (X: -15.10m -> +15.10m)
 * - Beam Max (Thân giữa): 1.12 m (Half-beam b0 = 0.56m)
 * - Depth (Chiều cao mạn giữa): 0.58 m
 * - Bow Tip Rocker: +1.38 m (Chóp mũi rồng vươn nhọn)
 * - Stern Tip Rocker: +1.52 m (Chóp đuôi tôm vút cao)
 * - Flare Angle: 14.5 deg
 * ============================================================================
 */

export const BOAT_SPECS_V2 = {
  LOA: 30.20,
  BEAM_MAX: 1.12,
  DEPTH_MID: 0.58,
  BOW_HEIGHT: 1.38,
  STERN_HEIGHT: 1.52,
  FLARE_DEG: 14.5,
  WOOD_THICKNESS: 0.035, // 35mm sao wood
  STATIONS: 300,
  RADIAL_SLICES: 60,
};

export interface HullStationProfile {
  x: number;
  halfBeam: number;
  keelY: number;
  gunwaleY: number;
  flare: number;
  vSharpness: number;
  isCockpit: boolean;
}

/**
 * Mathematical Continuous C2 Hull Generator Function for Station u in [0, 1]
 * u = 0.0: Stern Tip (-15.10m)
 * u = 0.5: Midship / Centre of Buoyancy (0.00m)
 * u = 1.0: Prow Tip (+15.10m)
 */
export function getTumNup2ProfileV2(u: number): HullStationProfile {
  const halfLen = BOAT_SPECS_V2.LOA / 2; // 15.10m
  const x = (u - 0.5) * BOAT_SPECS_V2.LOA;

  let halfBeam = 0;
  let keelY = 0;
  let gunwaleY = 0;
  let flare = 0;
  let vSharpness = 0;

  if (u >= 0.5) {
    // Forward Section: Midship -> Bow Tip
    const t = (u - 0.5) / 0.5; // 0.0 -> 1.0

    // Waterline Half-Breadth b(t): Spindle planform tapering to ultra-fine needle stem
    const cosBase = Math.cos((t * Math.PI) / 2);
    const taper = Math.pow(cosBase, 0.76) * (1.0 - 0.82 * Math.pow(t, 3.6));
    halfBeam = Math.max(0.006, (BOAT_SPECS_V2.BEAM_MAX / 2) * taper);

    // Keel Rocker: Starts lifting after t > 0.28, accelerating smoothly to +1.38m
    const rockerT = Math.max(0, (t - 0.22) / 0.78);
    keelY = (BOAT_SPECS_V2.BOW_HEIGHT - 0.05) * Math.pow(rockerT, 2.45) + 0.05 * Math.pow(rockerT, 4.5);

    // Gunwale Sheer Line: Rises continuously from 0.58m to +1.38m
    gunwaleY = BOAT_SPECS_V2.DEPTH_MID + (BOAT_SPECS_V2.BOW_HEIGHT - BOAT_SPECS_V2.DEPTH_MID) * Math.pow(t, 2.05);

    // Flare angle & V-cutwater sharpness
    flare = 0.26 * (1.0 - Math.pow(t, 2.2));
    vSharpness = Math.pow(t, 1.45); // 0 (U-bottom) -> 1.0 (razor-sharp V-cutwater hydrofoil)
  } else {
    // Aft Section: Midship -> Stern Tail
    const t = (0.5 - u) / 0.5; // 0.0 -> 1.0

    // Waterline Half-Breadth b(t): Graceful taper to slender shrimp tail
    const cosBase = Math.cos((t * Math.PI) / 2);
    const taper = Math.pow(cosBase, 0.80) * (1.0 - 0.84 * Math.pow(t, 3.6));
    halfBeam = Math.max(0.005, (BOAT_SPECS_V2.BEAM_MAX / 2) * taper);

    // Keel Rocker: Sweeps upward like a Khmer shrimp tail to +1.52m
    const rockerT = Math.max(0, (t - 0.20) / 0.80);
    keelY = (BOAT_SPECS_V2.STERN_HEIGHT - 0.06) * Math.pow(rockerT, 2.35) + 0.06 * Math.pow(rockerT, 4.5);

    // Gunwale Sheer Line: Rises continuously from 0.58m to +1.52m
    gunwaleY = BOAT_SPECS_V2.DEPTH_MID + (BOAT_SPECS_V2.STERN_HEIGHT - BOAT_SPECS_V2.DEPTH_MID) * Math.pow(t, 1.95);

    // Flare & fin sharpness
    flare = 0.24 * (1.0 - Math.pow(t, 2.2));
    vSharpness = Math.pow(t, 1.35); // Compresses into thin steering fin
  }

  const isCockpit = Math.abs(x) < 11.2;

  return { x, halfBeam, keelY, gunwaleY, flare, vSharpness, isCockpit };
}

/**
 * Builds the complete TUM_NUP_2_2024_MASTER_V2 3D mesh hierarchy
 */
export function buildTumNup2MasterV2(
  mode: 'REALISTIC_PBR' | 'BLUEPRINT_CAD' | 'STRUCTURAL_KEM' = 'REALISTIC_PBR'
): THREE.Group {
  const masterGroup = new THREE.Group();
  masterGroup.name = 'TUM_NUP_2_2024_MASTER_V2';

  const isCAD = mode === 'BLUEPRINT_CAD';
  const isKemFocus = mode === 'STRUCTURAL_KEM';

  const STATIONS = BOAT_SPECS_V2.STATIONS;
  const SLICES = BOAT_SPECS_V2.RADIAL_SLICES;

  const outerVerts: number[] = [];
  const outerIndices: number[] = [];
  const outerColors: number[] = [];

  const innerVerts: number[] = [];
  const innerIndices: number[] = [];
  const innerColors: number[] = [];

  const capVerts: number[] = [];
  const capIndices: number[] = [];
  const capColors: number[] = [];

  // 1. Generate Lofted Cross-Section Points
  for (let i = 0; i <= STATIONS; i++) {
    const u = i / STATIONS;
    const { x, halfBeam, keelY, gunwaleY, flare, vSharpness } = getTumNup2ProfileV2(u);

    const wallThickness = Math.min(BOAT_SPECS_V2.WOOD_THICKNESS, Math.max(0.012, halfBeam * 0.30));
    const innerHalfBeam = Math.max(0.001, halfBeam - wallThickness);
    const innerKeelY = keelY + wallThickness;

    for (let j = 0; j <= SLICES; j++) {
      const v = j / SLICES;
      const angle = (v - 0.5) * Math.PI; // -PI/2 (Port Gunwale) -> 0 (Keel) -> +PI/2 (Starboard Gunwale)
      const s = Math.abs(Math.sin(angle));
      const sideSign = Math.sign(Math.sin(angle)) || (v < 0.5 ? -1 : 1);

      // Continuous exponent transition: U-bottom (1.75) -> razor V (1.03)
      const exponent = 1.75 - 0.72 * vSharpness;
      const uCurvature = Math.pow(s, exponent);

      // Outer Vertex
      const zOut = sideSign * halfBeam * s * (1.0 + (1.0 - vSharpness * 0.75) * flare * s * s);
      const yOut = keelY + uCurvature * (gunwaleY - keelY);
      outerVerts.push(x, yOut, zOut);

      // Color scheme EXACTLY MATCHING VIDEO REFERENCE (@monghuorhout vector blueprint):
      // 1. Chóp Mũi & Chóp Đuôi: Đỏ tươi (Scarlet Red) + Vàng kim
      // 2. Mép be trên cùng: Vàng kim rực rỡ (Bright Gold Gunwale)
      // 3. Dải băng hoa văn trên (Upper Band): Đỏ cờ (Crimson Red) kết hợp họa tiết quả trám vàng (Gold Rhombus)
      // 4. Mạn thân chính (Main Flank): Đen tuyền (Jet Black #0d0d0f) phủ hoa văn Kbach Phka Chan / Kbach Angkor vàng kim
      // 5. Sống đáy lườn: Sơn then đen bóng / Gỗ sao
      if (isCAD) {
        outerColors.push(0.22, 0.74, 0.97);
      } else if (isKemFocus) {
        outerColors.push(0.18, 0.24, 0.36);
      } else {
        if (u > 0.965) {
          // Prow Red Tip Cap
          outerColors.push(0.88, 0.12, 0.12);
        } else if (u < 0.035) {
          // Stern Red Tip Cap
          outerColors.push(0.88, 0.12, 0.12);
        } else {
          // Gunwale top edge: Pure Gold band
          const isTopGunwale = j <= 1 || j >= SLICES - 1;
          // Upper band: Red background with golden diamond pattern (Dải đỏ hoa văn quả trám dưới mép be)
          const isUpperRedBand = (j >= 2 && j <= 6) || (j >= SLICES - 6 && j <= SLICES - 2);
          
          if (isTopGunwale && halfBeam > 0.02) {
            outerColors.push(0.98, 0.76, 0.12); // Bright Gold Gunwale Sheer
          } else if (isUpperRedBand && halfBeam > 0.03) {
            // Golden Rhombus (Quả trám vàng) on Red Band
            const diamondFreq = 72; // Diamond repeat along boat length
            const diamondPhase = (u * diamondFreq) % 1.0;
            const jRel = (j <= 6 ? j - 2 : SLICES - 2 - j) / 4.0; // 0.0 -> 1.0 within red band
            const distToCenter = Math.abs(jRel - 0.5) * 2.0; // 0.0 at center, 1.0 at edge
            const inDiamond = (diamondPhase > 0.35 && diamondPhase < 0.65 && distToCenter < 0.65) ||
                              (Math.abs(diamondPhase - 0.5) + distToCenter * 0.5 < 0.35);

            if (inDiamond) {
              outerColors.push(0.98, 0.82, 0.15); // Golden Rhombus Motif
            } else {
              outerColors.push(0.86, 0.14, 0.14); // Scarlet / Crimson Red Ribbon
            }
          } else if (uCurvature < 0.08) {
            // Keel bottom base: Deep Ebony Black Lacquer
            outerColors.push(0.06, 0.06, 0.07);
          } else {
            // Main Flank: Deep Jet Black Base with Opulent Golden Kbach Floral Flourishes
            // Video reference: Flowing flame scrolls (Kbach Angkor / Phka Chan)
            const kbachWave1 = Math.sin(u * Math.PI * 68 + s * 4.0);
            const kbachWave2 = Math.cos(u * Math.PI * 34 - s * 6.0);
            const scrollMotif = (kbachWave1 * 0.6 + kbachWave2 * 0.4);
            const fineFeather = Math.sin(u * Math.PI * 136) * Math.sin(s * Math.PI * 8);

            // Layered gold density
            if (scrollMotif > 0.42 || (scrollMotif > 0.15 && fineFeather > 0.35)) {
              // Primary Brilliant Gold Kbach Pattern
              outerColors.push(0.96, 0.72, 0.10);
            } else if (scrollMotif > 0.28) {
              // Deep Amber Accent
              outerColors.push(0.88, 0.54, 0.06);
            } else {
              // Deep Jet Black Hull Background (from Video)
              outerColors.push(0.06, 0.06, 0.08);
            }
          }
        }
      }

      // Inner Cavity Vertex
      const zIn = sideSign * innerHalfBeam * s * (1.0 + (1.0 - vSharpness * 0.75) * flare * s * s);
      const yIn = Math.min(gunwaleY - 0.004, Math.max(innerKeelY, yOut - wallThickness * 0.45));
      innerVerts.push(x, yIn, zIn);

      if (isCAD) {
        innerColors.push(0.14, 0.48, 0.72);
      } else if (isKemFocus) {
        innerColors.push(0.12, 0.16, 0.24);
      } else {
        innerColors.push(0.35, 0.18, 0.08); // Sao Wood Interior
      }
    }
  }

  // 2. Build Triangulation Topology
  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < SLICES; j++) {
      const a = i * (SLICES + 1) + j;
      const b = (i + 1) * (SLICES + 1) + j;
      const c = (i + 1) * (SLICES + 1) + (j + 1);
      const d = i * (SLICES + 1) + (j + 1);

      // Outer Shell (CCW facing out)
      outerIndices.push(a, b, d);
      outerIndices.push(b, c, d);

      // Inner Shell (CW facing inside)
      innerIndices.push(a, d, b);
      innerIndices.push(b, d, c);
    }
  }

  // 3. Build Watertight Gunwale Capping Edge Rails
  for (let i = 0; i <= STATIONS; i++) {
    const outPortIdx = i * (SLICES + 1) + 0;
    const inPortIdx = i * (SLICES + 1) + 0;
    const outStbdIdx = i * (SLICES + 1) + SLICES;
    const inStbdIdx = i * (SLICES + 1) + SLICES;

    // Port gunwale edge
    capVerts.push(outerVerts[outPortIdx * 3], outerVerts[outPortIdx * 3 + 1], outerVerts[outPortIdx * 3 + 2]);
    capVerts.push(innerVerts[inPortIdx * 3], innerVerts[inPortIdx * 3 + 1], innerVerts[inPortIdx * 3 + 2]);

    // Starboard gunwale edge
    capVerts.push(outerVerts[outStbdIdx * 3], outerVerts[outStbdIdx * 3 + 1], outerVerts[outStbdIdx * 3 + 2]);
    capVerts.push(innerVerts[inStbdIdx * 3], innerVerts[inStbdIdx * 3 + 1], innerVerts[inStbdIdx * 3 + 2]);

    for (let c = 0; c < 4; c++) {
      if (isCAD) capColors.push(0.22, 0.74, 0.97);
      else if (isKemFocus) capColors.push(0.18, 0.24, 0.36);
      else capColors.push(0.98, 0.76, 0.12); // Bright Gold Gunwale Top Rail
    }
  }

  for (let i = 0; i < STATIONS; i++) {
    const p1 = i * 4;
    const p2 = (i + 1) * 4;

    // Port Cap Quad
    capIndices.push(p1, p2, p1 + 1);
    capIndices.push(p2, p2 + 1, p1 + 1);

    // Starboard Cap Quad
    capIndices.push(p1 + 2, p1 + 3, p2 + 2);
    capIndices.push(p2 + 2, p1 + 3, p2 + 3);
  }

  // 4. Assemble Three.js Buffer Geometries
  const outerGeo = new THREE.BufferGeometry();
  outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVerts, 3));
  outerGeo.setAttribute('color', new THREE.Float32BufferAttribute(outerColors, 3));
  outerGeo.setIndex(outerIndices);
  outerGeo.computeVertexNormals();

  const outerMat = isCAD
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : isKemFocus
    ? new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        transparent: true,
        opacity: 0.35,
        wireframe: false,
      })
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.32,
        metalness: 0.15,
        side: THREE.FrontSide,
      });

  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;
  masterGroup.add(outerMesh);

  const innerGeo = new THREE.BufferGeometry();
  innerGeo.setAttribute('position', new THREE.Float32BufferAttribute(innerVerts, 3));
  innerGeo.setAttribute('color', new THREE.Float32BufferAttribute(innerColors, 3));
  innerGeo.setIndex(innerIndices);
  innerGeo.computeVertexNormals();

  const innerMat = isCAD
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : isKemFocus
    ? new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.25,
      })
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.BackSide,
      });

  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.castShadow = true;
  innerMesh.receiveShadow = true;
  masterGroup.add(innerMesh);

  const capGeo = new THREE.BufferGeometry();
  capGeo.setAttribute('position', new THREE.Float32BufferAttribute(capVerts, 3));
  capGeo.setAttribute('color', new THREE.Float32BufferAttribute(capColors, 3));
  capGeo.setIndex(capIndices);
  capGeo.computeVertexNormals();

  const capMat = isCAD
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  masterGroup.add(capMesh);

  // 5. Transverse Station Frame Rings (Blueprint CAD Inspection Mode)
  if (isCAD) {
    const ringLineMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 });
    for (let sIdx = 0; sIdx <= STATIONS; sIdx += 6) {
      const ringPts: THREE.Vector3[] = [];
      for (let j = 0; j <= SLICES; j++) {
        const vIdx = (sIdx * (SLICES + 1) + j) * 3;
        ringPts.push(new THREE.Vector3(outerVerts[vIdx], outerVerts[vIdx + 1], outerVerts[vIdx + 2]));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      masterGroup.add(new THREE.Line(ringGeo, ringLineMat));
    }
  }

  // 6. Distinctive Prow Head Elements (Directly from Video Reference 00:02, 00:33)
  const prowGroup = new THREE.Group();
  prowGroup.name = 'ProwStemOrnament';
  prowGroup.position.set(BOAT_SPECS_V2.LOA / 2 - 0.05, BOAT_SPECS_V2.BOW_HEIGHT, 0);

  const scarletMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.6 });
  const blackTasselMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

  // A. Forward-pointing Scarlet Nose Cap (Chóp mũi đỏ vuốt nhọn từ Video)
  const noseCapGeo = new THREE.ConeGeometry(0.065, 0.42, 8);
  noseCapGeo.rotateZ(-Math.PI / 3.0);
  const noseCap = new THREE.Mesh(noseCapGeo, scarletMat);
  noseCap.position.set(0.16, 0.08, 0);
  prowGroup.add(noseCap);

  // B. Gold Ornament Collar at nose cap base
  const noseTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.06, 12), goldMat);
  noseTrim.rotation.z = -Math.PI / 3.0;
  noseTrim.position.set(0.04, 0.02, 0);
  prowGroup.add(noseTrim);

  // C. Sacred Hanging Black Tassel Tuft (Chùm tua râu thiêng đen rủ xuống)
  const tasselCap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.08, 10), goldMat);
  tasselCap.position.set(0.12, -0.06, 0);
  prowGroup.add(tasselCap);

  const tasselTuft = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.36, 10), blackTasselMat);
  tasselTuft.position.set(0.12, -0.24, 0);
  prowGroup.add(tasselTuft);

  // D. Upper Golden Swept Naga Crown
  const nagaCrownGeo = new THREE.ConeGeometry(0.05, 0.45, 8);
  nagaCrownGeo.rotateZ(-Math.PI / 3.6);
  const nagaCrown = new THREE.Mesh(nagaCrownGeo, goldMat);
  nagaCrown.position.set(-0.08, 0.16, 0);
  prowGroup.add(nagaCrown);

  masterGroup.add(prowGroup);

  // 7. Distinctive Stern Tail Elements (Frame 00:21 - 00:30)
  const sternGroup = new THREE.Group();
  sternGroup.name = 'SternTailOrnament';
  sternGroup.position.set(-BOAT_SPECS_V2.LOA / 2 + 0.05, BOAT_SPECS_V2.STERN_HEIGHT, 0);

  const shrimpTailGeo = new THREE.ConeGeometry(0.055, 0.52, 8);
  shrimpTailGeo.rotateZ(Math.PI / 3.2);
  const shrimpTail = new THREE.Mesh(shrimpTailGeo, scarletMat);
  shrimpTail.position.set(-0.18, 0.12, 0);
  sternGroup.add(shrimpTail);

  const tailTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.058, 0.06, 12), goldMat);
  tailTrim.rotation.z = Math.PI / 3.2;
  tailTrim.position.set(-0.05, 0.04, 0);
  sternGroup.add(tailTrim);

  masterGroup.add(sternGroup);

  // 8. Internal Master Tension Truss "Cây Kềm" (Trọng tâm kết cấu gia cường Ghe Ngo)
  const kemGroup = new THREE.Group();
  kemGroup.name = 'MasterKemTruss';

  const kemSplinePts: THREE.Vector3[] = [];
  const kemStations = 120;
  for (let k = 0; k <= kemStations; k++) {
    const ku = k / kemStations;
    const { x, keelY } = getTumNup2ProfileV2(ku);
    const kemY = keelY + 0.18;
    kemSplinePts.push(new THREE.Vector3(x, kemY, 0));
  }

  const kemCurve = new THREE.CatmullRomCurve3(kemSplinePts);
  const kemGeo = new THREE.TubeGeometry(kemCurve, 100, 0.045, 12, false);
  const kemMat = isKemFocus
    ? new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
    : new THREE.MeshStandardMaterial({
        color: 0x78350f, // Sao hardwood log
        roughness: 0.55,
      });

  const kemMesh = new THREE.Mesh(kemGeo, kemMat);
  kemGroup.add(kemMesh);

  // Vertical Truss Struts (Trụ chống chịu lực uốn nén)
  const strutGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 8);
  for (let sx = -11; sx <= 11; sx += 0.95) {
    const su = (sx + BOAT_SPECS_V2.LOA / 2) / BOAT_SPECS_V2.LOA;
    const { keelY } = getTumNup2ProfileV2(su);
    const bottomY = keelY + 0.035;
    const topY = keelY + 0.18;
    const strutHeight = Math.max(0.06, topY - bottomY);

    const strutMesh = new THREE.Mesh(strutGeo, kemMat);
    strutMesh.scale.set(1, strutHeight, 1);
    strutMesh.position.set(sx, (bottomY + topY) / 2, 0);
    kemGroup.add(strutMesh);
  }

  masterGroup.add(kemGroup);

  // 9. Transverse Seating Thwarts (26 Đòn ngồi gỗ sao bắc ngang mạn cho VĐV)
  const thwartsGroup = new THREE.Group();
  thwartsGroup.name = 'SeatingThwartsGroup';
  const thwartWoodMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e, // Natural Sao timber thwart
    roughness: 0.65,
    metalness: 0.05,
  });

  // 26 thwarts spaced along the cockpit from x = -10.5m to +10.5m (~0.84m spacing)
  for (let idx = 0; idx < 26; idx++) {
    const tx = -10.5 + idx * 0.84;
    const tu = (tx + BOAT_SPECS_V2.LOA / 2) / BOAT_SPECS_V2.LOA;
    const { halfBeam, gunwaleY } = getTumNup2ProfileV2(tu);

    if (halfBeam > 0.15) {
      const thwartWidth = halfBeam * 2 * 0.94;
      const thwartGeo = new THREE.BoxGeometry(0.085, 0.035, thwartWidth);
      const thwartMesh = new THREE.Mesh(thwartGeo, thwartWoodMat);
      // Place thwart slightly below the gunwale rim
      thwartMesh.position.set(tx, gunwaleY - 0.045, 0);
      thwartMesh.castShadow = true;
      thwartMesh.receiveShadow = true;
      thwartsGroup.add(thwartMesh);
    }
  }
  masterGroup.add(thwartsGroup);

  return masterGroup;
}
