import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A separate 50 m study; caller owns lighting and surrounding river/people. */
export function buildCoherentBank(scene, { materials = null } = {}) {
  const group = new T.Group(); group.name = 'Coherent_Bank_V19'; scene.add(group);
  const buckets = new Map(), owned = new Set(), moving = [];
  const palette = { ivory: '#eadfc9', teal: '#649b96', clay: '#b56e53', wood: '#72503a', green: '#385f47', dark: '#304346', cream: '#d3c6ad', glass: '#638a91', asphalt: '#727875', concrete: '#bcb9a9', trim: '#f1e9d8', leaf: '#48784c', leafLight: '#67864a', rubber: '#353b3b', metal: '#8a9491', roofTile: '#b56e53', roofTin: '#8a9491' };
  function mat(key) {
    if (!buckets.has(key)) {
      const source = key === 'ivory' ? materials?.wall : key === 'roofTile' ? materials?.tile : key === 'roofTin' ? materials?.tin : null;
      const m = source ? source.clone() : new T.MeshStandardMaterial({ color: palette[key], roughness: key === 'glass' ? .3 : .82, metalness: key === 'metal' ? .25 : 0 });
      if (source) {
        m.vertexColors = false; m.color.set(palette[key]);
        const strength = key === 'ivory' ? .07 : .20;
        m.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', `sampledDiffuseColor.rgb = mix(vec3(1.), sampledDiffuseColor.rgb, ${strength.toFixed(2)}); diffuseColor *= sampledDiffuseColor;`)); };
        m.customProgramCacheKey = () => 'coherent-v19-' + key;
        if (m.normalMap) m.normalScale.set(.12, .12);
      }
      if (key === 'leaf') m.side = T.DoubleSide;
      owned.add(m); buckets.set(key, { material: m, geometries: [] });
    }
    return buckets.get(key);
  }
  function add(geo, key, x, y, z, rotation = null) {
    const matrix = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(...(rotation || [0, 0, 0]))), new T.Vector3(1, 1, 1));
    geo.applyMatrix4(matrix);
    if (key === 'ivory' || key === 'roofTile' || key === 'roofTin') {
      const position = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / 2, (key === 'ivory' ? position.getY(i) : position.getZ(i)) / 2);
    }
    const ready = geo.index ? geo.toNonIndexed() : geo; if (ready !== geo) geo.dispose(); mat(key).geometries.push(ready);
  }
  function box(key, x, y, z, w, h, d, radius = .05, rotation) { add(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)), key, x, y, z, rotation); }
  function rod(key, a, b, radius, endRadius = radius) {
    const v = new T.Vector3(...b).sub(new T.Vector3(...a));
    const geo = new T.CylinderGeometry(endRadius, radius, v.length(), 8);
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.clone().normalize()));
    add(geo, key, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  }
  // River is toward negative Z. Public walking space remains open in front.
  box('concrete', 0, -.16, 1, 50, .32, 6, .05);
  box('cream', 0, -.06, -2.15, 50, .38, .3, .06);
  box('asphalt', 0, -.2, 8, 50, .2, 8, .03);
  box('cream', 0, -.05, 12.15, 50, .3, .28, .04);
  for (let x = -24; x < 25; x += 2) {
    box('trim', x, -.09, 8, .8, .014, .08, .003);
    box('cream', x, .006, 1, .018, .01, 5.7, .002);
  }
  const lots = [
    { x: -20.5, w: 6.4, h: 6.5, color: 'ivory', roof: 'roofTile', balcony: true },
    { x: -13.5, w: 6.5, h: 7.6, color: 'teal', roof: 'roofTin', balcony: true },
    { x: -6.3, w: 6.6, h: 5.8, color: 'cream', roof: 'roofTile', balcony: false },
    { x: 1, w: 6.5, h: 7, color: 'ivory', roof: 'roofTile', balcony: true },
    { x: 8.1, w: 6.3, h: 6.2, color: 'clay', roof: 'roofTin', balcony: false },
    { x: 15.2, w: 6.5, h: 7.5, color: 'teal', roof: 'roofTile', balcony: true },
    { x: 21.4, w: 4.7, h: 5.7, color: 'ivory', roof: 'roofTin', balcony: false },
  ];
  for (const [i, l] of lots.entries()) {
    const z = 16.5, front = 13.05;
    // Hollow shopfront: piers and lintel frame a recessed, shaded shop interior.
    box(l.color, l.x, (l.h + 3) / 2, z, l.w, l.h - 3, 7, .09);
    box(l.color, l.x - l.w / 2 + .27, 1.5, z, .54, 3, 7, .07);
    box(l.color, l.x + l.w / 2 - .27, 1.5, z, .54, 3, 7, .07);
    box('wood', l.x, 1.35, 14.2, l.w - .7, 2.7, .12, .025);
    box('dark', l.x, 1.35, 14.05, l.w - 1, 2.35, .1, .02);
    box('glass', l.x - .75, 1.4, 13.96, 1.35, 2.2, .04, .01);
    box('wood', l.x + .8, 1.35, 13.9, .85, 2.35, .12, .025);
    box('trim', l.x, 3.15, front - .15, l.w + .12, .22, .32, .04);
    // Sloped fabric/tin shade, warm sign panel without invented local branding.
    box(i % 2 ? 'teal' : 'clay', l.x, 2.75, 12.65, l.w - .3, .1, 1.05, .025, [.14, 0, 0]);
    box('wood', l.x, 3.55, 12.94, l.w * .55, .43, .13, .04);
    for (const dx of [-l.w * .25, l.w * .25]) {
      box('dark', l.x + dx, 4.8, 12.96, 1.45, 1.85, .14, .025);
      box('glass', l.x + dx, 4.8, 12.85, 1.2, 1.6, .035, .008);
      for (const side of [-1, 1]) {
        box('wood', l.x + dx + side * .82, 4.8, 12.88, .37, 1.85, .11, .02);
        for (let y = 4.05; y < 5.65; y += .18) box('cream', l.x + dx + side * .82, y, 12.8, .31, .055, .05, .008);
      }
      box('trim', l.x + dx, 3.84, 12.85, 1.75, .16, .36, .03);
    }
    if (l.balcony) {
      box('cream', l.x, 3.75, 12.5, l.w - .6, .17, 1.25, .04);
      rod('wood', [l.x - l.w / 2 + .45, 4.6, 11.95], [l.x + l.w / 2 - .45, 4.6, 11.95], .055);
      for (let dx = -l.w / 2 + .5; dx < l.w / 2 - .4; dx += .42) rod('wood', [l.x + dx, 3.85, 11.95], [l.x + dx, 4.6, 11.95], .025);
    }
    // Two shallow pitched roof planes with fine repeated tile/tin ribs.
    const slope = .2;
    for (const side of [-1, 1]) box(l.roof, l.x, l.h + .38, z + side * 1.85, l.w + .45, .15, 3.85, .03, [side * slope, 0, 0]);
    rod(l.roof, [l.x - l.w / 2 - .2, l.h + .78, z], [l.x + l.w / 2 + .2, l.h + .78, z], .105);
    for (let dx = -l.w / 2; dx < l.w / 2; dx += .32) {
      for (const side of [-1, 1]) rod(l.roof, [l.x + dx, l.h + .85, z], [l.x + dx, l.h + .12, z + side * 3.7], .035);
    }
  }
  function tree(x, z, scale, seed) {
    rod('wood', [x, 0, z], [x + .14, 3.4 * scale, z], .18 * scale, .095 * scale);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + seed, r = (i % 3 ? 1 : .4) * scale;
      const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r, cy = (3.65 + (i % 3) * .4) * scale;
      rod('wood', [x + .1, 2.4 * scale, z], [cx, cy, cz], .075 * scale, .025 * scale);
      const geo = new T.SphereGeometry(1, 20, 12); geo.scale((1.1 + i % 2 * .25) * scale, .95 * scale, 1.1 * scale);
      add(geo, i % 2 ? 'leaf' : 'leafLight', cx, cy, cz);
    }
    box('cream', x, .17, z, 1.6, .34, 1.6, .12);
  }
  tree(-17, 2.25, 1, .7); tree(7, 2.3, .9, 2); tree(21, 2.3, 1.1, 4);
  // Curved coconut fronds use tapered leaf surfaces, not cone or spike crowns.
  const px = -2, pz = 2.4;
  rod('wood', [px, 0, pz], [px + .35, 5.8, pz + .15], .15, .08);
  for (let n = 0; n < 10; n++) {
    const a = n * Math.PI * 2 / 10, points = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8, r = t * 2.8, y = 5.8 + Math.sin(t * Math.PI) * .5 - t * 1.15;
      points.push(new T.Vector3(px + .35 + Math.cos(a) * r, y, pz + .15 + Math.sin(a) * r));
    }
    for (let j = 0; j < 8; j++) rod('green', points[j].toArray(), points[j + 1].toArray(), .025 * (1 - j / 10));
    for (let j = 1; j < 8; j++) {
      const p = points[j], width = .65 * Math.sin(j / 8 * Math.PI);
      for (const side of [-1, 1]) {
        const q = p.clone().add(new T.Vector3(Math.cos(a + side * .9) * width, -.15, Math.sin(a + side * .9) * width));
        const mid = p.clone().lerp(q, .45), lateral = new T.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(.055);
        const vertices = [...p.toArray(), ...mid.clone().add(lateral).toArray(), ...q.toArray(), ...p.toArray(), ...q.toArray(), ...mid.clone().sub(lateral).toArray()];
        const leaf = new T.BufferGeometry(); leaf.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); leaf.setAttribute('uv', new T.Float32BufferAttribute([0,0,.5,1,1,0,0,0,1,0,.5,1],2)); leaf.computeVertexNormals();
        add(leaf, 'leaf', 0, 0, 0);
      }
    }
  }
  for (const [key, bucket] of buckets.entries()) {
    const geo = mergeGeometries(bucket.geometries, false); bucket.geometries.forEach(g => g.dispose());
    const mesh = new T.Mesh(geo, bucket.material); mesh.castShadow = true; mesh.receiveShadow = key !== 'leaf' && key !== 'leafLight'; group.add(mesh); owned.add(geo);
  }
  function vehicle(direction, color, start) {
    const v = new T.Group(); group.add(v); const wheels = [];
    function part(geo, key, x, y, z) { const mesh = new T.Mesh(geo, mat(key).material); mesh.position.set(x, y, z); v.add(mesh); owned.add(geo); mesh.castShadow = true; return mesh; }
    part(new RoundedBoxGeometry(3.65, .72, 1.55, 3, .22), color, 0, .73, 0);
    part(new RoundedBoxGeometry(1.95, .75, 1.36, 3, .22), 'glass', -.18, 1.34, 0);
    part(new RoundedBoxGeometry(1.9, .12, 1.4, 2, .04), color, -.18, 1.75, 0);
    for (const x of [-1.12, 1.12]) for (const z of [-.72, .72]) {
      const w = part(new T.CylinderGeometry(.32, .32, .17, 16), 'rubber', x, .27, z); w.rotation.x = Math.PI / 2; wheels.push(w);
      const hub = part(new T.CylinderGeometry(.16, .16, .19, 12), 'metal', x, .27, z); hub.rotation.x = Math.PI / 2; wheels.push(hub);
    }
    for (const z of [-.5, .5]) part(new RoundedBoxGeometry(.05, .16, .3, 1, .02), 'trim', 1.8, .8, z);
    v.rotation.y = direction < 0 ? Math.PI : 0;
    moving.push({ v, wheels, direction, start });
  }
  vehicle(1, 'ivory', -15); vehicle(-1, 'teal', 18);
  const stats = { lengthMeters: 50, lots: lots.length, trees: 3, palms: 1, vehicles: 2, drawCalls: 0, triangles: 0 };
  group.traverse(o => { if (o.isMesh) { stats.drawCalls++; stats.triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
  group.userData = { coherentBank: stats };
  function update(time) {
    for (const m of moving) {
      const raw = m.start + time * 2.2 * m.direction;
      m.v.position.set(((raw + 80) % 160 + 160) % 160 - 80, -.03, m.direction > 0 ? 6 : 10);
      m.v.visible = Math.abs(m.v.position.x) < 25;
      for (const wheel of m.wheels) wheel.rotation.y = -time * 2.2 / .32;
    }
  }
  update(0);
  return { group, stats, update, dispose() { scene.remove(group); owned.forEach(o => o.dispose()); group.clear(); } };
}
