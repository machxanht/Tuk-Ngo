import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildCoherentVehicles } from './traffic.mjs';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A separate 50 m study; caller owns lighting and surrounding river/people. */
export function buildCoherentBank(scene, { materials = null, vibrant = false, clearPromenade = false } = {}) {
  const group = new T.Group(); group.name = 'Coherent_Bank_V20'; scene.add(group);
  const buckets = new Map(), owned = new Set();
  const palette = { ivory: '#eadfc9', teal: '#649b96', clay: '#b56e53', wood: '#72503a', green: '#385f47', dark: '#304346', cream: '#d3c6ad', glass: '#638a91', asphalt: '#727875', concrete: '#bcb9a9', trim: '#f1e9d8', leaf: '#48784c', leafLight: '#67864a', rubber: '#353b3b', metal: '#8a9491', roofTile: '#b56e53', roofTin: '#8a9491' };
  if (vibrant) Object.assign(palette,{ivory:'#fff0cc',teal:'#74c8bb',clay:'#e2936e',green:'#4e9851',cream:'#f2dba8',glass:'#8ec6d4',concrete:'#d8d4bd',leaf:'#54a958',leafLight:'#85bb58',roofTile:'#dd885c',roofTin:'#a0bdc0'});
  function mat(key) {
    if (!buckets.has(key)) {
      const source = ['ivory', 'teal', 'cream', 'clay'].includes(key) ? materials?.wall : key === 'roofTile' ? materials?.tile : key === 'roofTin' ? materials?.tin : null;
      const m = source ? source.clone() : new T.MeshStandardMaterial({ color: palette[key], roughness: key === 'glass' ? .3 : .82, metalness: key === 'metal' ? .25 : 0 });
      if (source) {
        m.vertexColors = false; m.color.set(palette[key]);
        const strength = key.startsWith('roof') ? .40 : .22;
        m.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', `sampledDiffuseColor.rgb = mix(vec3(1.), sampledDiffuseColor.rgb, ${strength.toFixed(2)}); diffuseColor *= sampledDiffuseColor;`)); };
        m.customProgramCacheKey = () => 'coherent-v20-' + key;
        if (m.normalMap) m.normalScale.set(.26, .26);
      }
      if (key === 'leaf') m.side = T.DoubleSide;
      owned.add(m); buckets.set(key, { material: m, geometries: [] });
    }
    return buckets.get(key);
  }
  function add(geo, key, x, y, z, rotation = null) {
    const matrix = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(...(rotation || [0, 0, 0]))), new T.Vector3(1, 1, 1));
    geo.applyMatrix4(matrix);
    if (['ivory', 'teal', 'cream', 'clay', 'roofTile', 'roofTin'].includes(key)) {
      const position = geo.attributes.position, normal = geo.attributes.normal, uv = geo.attributes.uv;
      for (let i = 0; i < position.count; i++) {
        if(key.startsWith('roof')||Math.abs(normal.getY(i))>.8)uv.setXY(i,position.getX(i)/2,position.getZ(i)/2);
        else uv.setXY(i,(Math.abs(normal.getX(i))>Math.abs(normal.getZ(i))?position.getZ(i):position.getX(i))/2,position.getY(i)/2);
      }
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
  // Continuous ground under entrances/verandas; there must be no sky-colored
  // void between the roadside curb and buildings set back from the street.
  box('concrete', 0, -.12, 16.4, 50, .18, 8.5, .02);
  for (let x = -24; x < 25; x += 2) {
    box('trim', x, -.09, 8, .8, .014, .08, .003);
    box('cream', x, .006, 1, .018, .01, 5.7, .002);
  }

  const lots = [
    { x:-20.5,w:6.4,h:3.5,family:'old-tiled-dwelling',color:'ivory' },
    { x:-13.5,w:6.5,h:7.2,family:'shutter-shophouse',color:'teal' },
    { x:-6.3,w:6.6,h:8.3,family:'modern-townhouse',color:'cream' },
    { x:1,w:6.5,h:4.1,family:'open-front-shop',color:'ivory' },
    { x:8.1,w:6.3,h:3.2,family:'tin-local-house',color:'clay' },
    { x:15.2,w:6.5,h:6.8,family:'shutter-shophouse',color:'cream' },
    { x:21.4,w:4.7,h:7.7,family:'modern-townhouse',color:'ivory' },
  ];
  function window(x,y,z,w,h,shutter=false) {
    box('wood',x,y,z,w+.16,h+.16,.14,.018);
    box('glass',x,y,z-.09,w,h,.035,.006);
    box('wood',x,y,z-.13,.06,h,.06,.008);
    box('wood',x,y,z-.13,w,.06,.06,.008);
    if(shutter) for(const sign of [-1,1]) {
      box('teal',x+sign*(w/2+.21),y,z,.34,h+.13,.09,.015);
      for(let dy=-h/2+.1;dy<h/2;dy+=.16) box('dark',x+sign*(w/2+.21),y+dy,z-.055,.29,.035,.025,.002);
    }
    box('trim',x,y-h/2-.11,z-.08,w+.33,.13,.3,.016);
  }
  function door(x,z,wood=true) {
    box('dark',x,1.2,z,1.65,2.4,.14,.012);
    box(wood?'wood':'glass',x,1.19,z-.09,1.48,2.3,.04,.008);
    for(const dx of [-.36,.36]) box('cream',x+dx,1.25,z-.12,.02,2.15,.025,.002);
    rod('metal',[x+.12,1.05,z-.15],[x+.12,1.35,z-.15],.018);
  }
  function roof(l,key,h,z=16.6,depth=7.5,pitch=.32) {
    const half=depth/2, rise=Math.tan(pitch)*half;
    for(const side of [-1,1]) box(key,l.x,h+rise/2,z+side*half/2,l.w+.6,.12,half/Math.cos(pitch)+.08,.014,[side*pitch,0,0]);
    rod(key,[l.x-l.w/2-.3,h+rise+.08,z],[l.x+l.w/2+.3,h+rise+.08,z],.075);
    for(let dx=-l.w/2;dx<l.w/2;dx+=key==='roofTile'?.25:.4) for(const side of [-1,1]) rod(key,[l.x+dx,h+rise+.09,z],[l.x+dx,h+.08,z+side*half],.027);
    // Filled end gables close the roof rather than floating planes.
    const shape=new T.Shape();shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(0,rise);shape.closePath();
    for(const side of [-1,1]) add(new T.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false}),l.color,l.x+side*(l.w/2-.05),h,z,[0,-Math.PI/2,0]);
  }
  function shell(l,front=13.2,depth=7) {
    box(l.color,l.x,l.h/2,front+depth/2,l.w,l.h,depth,.025);
    box('concrete',l.x,.13,front-.15,l.w+.12,.26,.5,.012);
  }
  function rail(x,y,z,w,key='metal') {
    rod(key,[x-w/2,y+.8,z],[x+w/2,y+.8,z],.035);
    for(let dx=-w/2;dx<=w/2+.001;dx+=.32) rod(key,[x+dx,y,z],[x+dx,y+.8,z],.02);
  }
  for(const [i,l] of lots.entries()) {
    if(l.family==='old-tiled-dwelling') {
      shell(l,14.4,5.8); roof(l,'roofTile',l.h,16.6,8.1,.38);
      box('clay',l.x,.2,13.7,l.w,.4,2,.018);
      box('cream',l.x,.08,12.95,2.3,.16,.4,.015);
      for(const dx of [-l.w/2+.3,0,l.w/2-.3]) box('trim',l.x+dx,1.8,13.05,.25,3.6,.25,.018);
      door(l.x,14.31); window(l.x-1.95,1.9,14.3,1.05,1.8,true);window(l.x+1.95,1.9,14.3,1.05,1.8,true);
      box('trim',l.x,3.3,12.96,l.w+.1,.18,.25,.014);
      rail(l.x-l.w*.34,.45,12.7,l.w*.27,'wood');rail(l.x+l.w*.34,.45,12.7,l.w*.27,'wood');
      for(const dx of [-2.3,2.3]) { add(new T.CylinderGeometry(.22,.16,.45,12),'clay',l.x+dx,.43,13.45); add(new T.SphereGeometry(.36,12,8),'green',l.x+dx,.83,13.45); }
    } else if(l.family==='shutter-shophouse') {
      shell(l);roof(l,'roofTile',l.h,16.7,7.6,.23);
      box('dark',l.x,1.4,13.04,l.w-.5,2.8,.1,.012);
      // Roll-down shutter versus double timber shop doors distinguish the two lots.
      if(i===1) { door(l.x-1.25,12.96,false);window(l.x+1.3,1.65,12.96,1.7,1.7); }
      else { for(let y=.3;y<2.7;y+=.15) box('metal',l.x,y,12.96,l.w-.9,.09,.06,.004); }
      box('clay',l.x,2.9,12.7,l.w-.2,.09,1.2,.016,[.18,0,0]);
      box('trim',l.x,3.4,12.9,l.w+.1,.2,.4,.015);
      box('cream',l.x,3.8,12.4,l.w-.4,.17,1.45,.018);rail(l.x,3.9,11.72,l.w-.7,'wood');
      const count=i===1?2:3;for(let j=0;j<count;j++) window(l.x+(j-(count-1)/2)*(count===2?2.5:1.65),5.3,13.04,count===2?1.25:.85,2.1,true);
      box('trim',l.x,l.h-.25,13.02,l.w+.1,.23,.28,.018);
      box('wood',l.x,3.1,12.55,2.2,.32,.07,.01);
    } else if(l.family==='modern-townhouse') {
      shell(l,13.7,6.5);
      // Vertical narrow bay, concrete frame and flat terrace parapet.
      box('dark',l.x-1.05,4.45,13.55,1.55,6.55,.08,.006);
      for(let y=2.7;y<7.3;y+=2.1) window(l.x-1.05,y,13.5,1.25,1.6);
      box('trim',l.x+l.w*.26,4.2,13.46,l.w*.42,7.8,.27,.012);
      for(let y=4.1;y<7.4;y+=2.2) window(l.x+l.w*.26,y,13.24,l.w*.3,1.5);
      box('concrete',l.x,l.h+.06,16.8,l.w+.22,.19,6.9,.016);
      for(const dx of [-l.w/2+.07,l.w/2-.07]) box('trim',l.x+dx,l.h+.45,16.8,.18,.8,6.8,.012);
      box('trim',l.x,l.h+.45,13.4,l.w,.8,.18,.012);
      // Setback gated entry, not a storefront awning.
      door(l.x-.25,13.57,false);
      box('concrete',l.x,.03,12.95,l.w,.06,1.1,.008);
      for(let dx=-l.w/2+.2;dx<l.w/2;dx+=.22) rod('metal',[l.x+dx,.1,12.4],[l.x+dx,1.65,12.4],.02);
      box('metal',l.x,.92,12.4,l.w-.2,.055,.06,.007);
      box('clay',l.x+l.w*.32,3.05,13.17,.7,.32,.45,.045);
      add(new T.SphereGeometry(.38,12,8),'green',l.x+l.w*.32,3.32,13.17);
    } else if(l.family==='open-front-shop') {
      // Real 4m-deep open bay: floor, rear wall, side wall and small cafe fixtures.
      box('cream',l.x,.05,16.2,l.w,.1,6.6,.008);
      box(l.color,l.x,l.h/2,19.3,l.w,l.h,.3,.022);
      box(l.color,l.x+l.w/2-.15,l.h/2,16.2,.3,l.h,6.3,.022);
      box(l.color,l.x,l.h-.22,16.2,l.w,.44,6.6,.022);
      for(const dx of [-l.w/2+.18,l.w/2-.18]) box('wood',l.x+dx,1.9,13.05,.18,3.8,.18,.014);
      roof(l,'roofTin',l.h,16.2,7.1,.18);
      box('teal',l.x,3.2,12.65,l.w+.2,.1,1.2,.012,[.16,0,0]);
      box('wood',l.x+1.15,.55,16.9,2.4,1.1,.75,.02);
      box('trim',l.x+1.15,1.16,16.9,2.5,.11,.85,.018);
      for(let y=1.35;y<2.8;y+=.65) box('wood',l.x+1.2,y,19.07,2.5,.08,.4,.008);
      for(let j=0;j<9;j++) add(new T.CylinderGeometry(.08,.08,.28,8),j%2?'teal':'clay',l.x+.2+(j%3)*.7,1.53+Math.floor(j/3)*.65,18.85);
      for(const [dx,dz] of [[-1.35,14.9],[-1.35,17.4]]) {
        add(new T.CylinderGeometry(.62,.62,.08,16),'wood',l.x+dx,.78,dz);rod('metal',[l.x+dx,0,dz],[l.x+dx,.74,dz],.055);
        for(const a of [0,2.1,4.2]) { const sx=l.x+dx+Math.cos(a)*.88,sz=dz+Math.sin(a)*.88;add(new T.CylinderGeometry(.24,.24,.08,12),'clay',sx,.42,sz);for(const d of [-.12,.12]) rod('wood',[sx+d,0,sz],[sx+d,.4,sz],.025); }
      }
      box('wood',l.x,3.53,12.57,2.5,.32,.09,.014);
    } else {
      shell(l,14.25,5.7);roof(l,'roofTin',l.h,16.7,7.7,.3);
      door(l.x-.85,14.16);window(l.x+1.45,1.85,14.16,1.3,1.2,true);
      box('roofTin',l.x,2.75,13.38,l.w+.2,.08,1.7,.012,[.12,0,0]);
      for(const dx of [-l.w/2+.15,l.w/2-.15]) rod('wood',[l.x+dx,0,12.6],[l.x+dx,2.6,12.6],.055);
      box('wood',l.x,.45,13.25,1.8,.12,.5,.018);
      for(const dx of [-.65,.65]) box('wood',l.x+dx,.2,13.25,.12,.4,.45,.008);
      // Small side vent and restrained exposed foundation band.
      box('concrete',l.x,.32,14.13,l.w,.42,.08,.004);
      window(l.x,2.8,14.14,.75,.28);
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
  tree(-17, clearPromenade?13.8:2.25, 1, .7); tree(7, clearPromenade?13.8:2.3, .9, 2); tree(21, clearPromenade?13.8:2.3, 1.1, 4);
  // Curved coconut fronds use tapered leaf surfaces, not cone or spike crowns.
  const px = -2, pz = clearPromenade?13.8:2.4;
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
  const vehicles = buildCoherentVehicles(group);
  const stats = { lengthMeters: 50, lots: lots.length, trees: 3, palms: 1, vehicles: vehicles.stats, frontageFamilies: [...new Set(lots.map(l => l.family))], drawCalls: 0, triangles: 0 };
  group.traverse(o => { if (o.isMesh) { stats.drawCalls++; stats.triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
  group.userData = { coherentBank: stats };
  function update(time) { vehicles.update(time); }
  update(0);
  return { group, stats, update, dispose() { vehicles.dispose(); scene.remove(group); owned.forEach(o => o.dispose()); group.clear(); } };
}
