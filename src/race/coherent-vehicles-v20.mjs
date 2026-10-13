import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original authored street vehicles. Dimensions are representative, not brand scans. */
export function buildCoherentVehicles(parent) {
  const group=new T.Group();group.name='Coherent_Vehicles_V20';parent.add(group);
  const geometries=new Set(),materials=new Set(),cars=[];
  const mat=(color,roughness=.45,metalness=.05)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;};
  const rubber=mat('#22262a',.92),alloy=mat('#aab2b8',.25,.75),trim=mat('#242d33',.7),glass=mat('#243b49',.17,.28),inside=mat('#3d4144',.8),white=mat('#edf3e9',.25),red=mat('#b32b25',.28),chrome=mat('#c2c6c7',.24,.7);
  function mesh(g,m,p,x,y,z){geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  const box=(p,m,x,y,z,a,b,c)=>mesh(new T.BoxGeometry(a,b,c),m,p,x,y,z);
  function hull(p,m,sections){const v=[],ix=[];for(const [x,y0,y1,w0,w1]of sections)v.push(x,y0,-w0,x,y0,w0,x,y1,w1,x,y1,-w1);for(let s=0;s<sections.length-1;s++)for(let k=0;k<4;k++){let a=s*4+k,b=s*4+(k+1)%4,c=b+4,d=a+4;ix.push(a,d,b,b,d,c);}ix.push(0,1,3,1,2,3);let n=(sections.length-1)*4;ix.push(n,n+3,n+1,n+1,n+3,n+2);let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return mesh(g,m,p,0,0,0);}
  function panel(p,m,points){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const o=mesh(g,m,p,0,0,0);o.material.side=T.DoubleSide;return o;}
  function line(p,m,a,b,r=.012){let av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);let o=mesh(new T.CylinderGeometry(r,r,d.length(),6),m,p,...av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
  function batchStatic(p){const buckets=new Map();for(const o of [...p.children]){if(!o.isMesh)continue;o.updateMatrix();let g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}g.deleteAttribute('uv');if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);p.remove(o);}for(const[m,list]of buckets){const g=mergeGeometries(list,false);for(const part of list)part.dispose();geometries.add(g);const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;p.add(o);}}
  function vehicle(kind,color,z,offset,speed,direction){const c=new T.Group();c.name=kind==='pickup'?'Small_Pickup_V20':'Compact_Sedan_V20';group.add(c);let paint=mat(color,.36,.28),pickup=kind==='pickup',length=pickup?4.8:4.4,w=.87,wheelR=.31,axles=pickup?[-1.48,1.37]:[-1.30,1.27];
    hull(c,paint,[[-length/2,.42,.67,.70,.76],[-1.75,.39,.91,w,w],[-.9,.39,.97,w,w],[.8,.39,.91,w,w],[1.67,.41,.78,w,.83],[length/2,.46,.66,.73,.76]]);
    box(c,trim,0,.39,0,length-.35,.11,1.55);box(c,paint,0,.59,0,length-.08,.20,1.72);
    const rear=pickup?-.65:-1.35,front=.80,roofFront=.32,roofRear=pickup?-.65:-.72;
    hull(c,paint,[[rear,.89,1.02,.79,.74],[roofRear,.93,1.48,.80,.64],[roofFront,.91,1.48,.79,.64],[front,.86,1.01,.79,.75]]);
    panel(c,glass,[[roofFront+.025,1.44,-.61],[roofFront+.025,1.44,.61],[front+.028,1.035,.72],[front+.028,1.035,-.72]]);
    panel(c,glass,[[rear-.018,1.045,-.70],[rear-.018,1.045,.70],[roofRear-.018,1.43,.60],[roofRear-.018,1.43,-.60]]);
    for(const side of [-1,1]){let a=side*.795,b=side*.648;
      panel(c,glass,[[rear+.10,1.045,a],[front-.10,1.03,a],[roofFront-.08,1.42,b],[roofRear+.08,1.42,b]]);
      line(c,paint,[-.18,1.035,a],[-.18,1.44,b],.038);line(c,trim,[rear+.1,1.01,a],[front-.1,1.01,a],.015);
      for(const x of pickup?[.05]:[-.68,.34]){line(c,trim,[x-.28,.98,side*.88],[x-.28,.59,side*.88],.007);box(c,chrome,x,.94,side*.883,.14,.024,.02);}
      box(c,trim,.59,1.07,side*.89,.12,.035,.16);box(c,paint,.57,1.12,side*.98,.20,.115,.14);box(c,glass,.57,1.12,side*1.054,.145,.07,.009);
      line(c,trim,[-length/2+.15,.50,side*.78],[length/2-.15,.50,side*.78],.012);
    }
    // Visible dash/seats behind the glass silhouette; glass stays opaque enough
    // to avoid depth-sorting artifacts on lower-end mobile GPUs.
    box(c,inside,.40,1.05,0,.22,.14,1.35);for(const zseat of [-.37,.37])box(c,inside,-.20,1.10,zseat,.22,.40,.42);
    if(pickup){box(c,trim,-1.55,.93,0,1.65,.04,1.45);for(const s of [-1,1])box(c,paint,-1.55,1.10,s*.79,1.66,.25,.12);box(c,paint,-2.34,1.10,0,.12,.25,1.58);line(c,chrome,[-2.32,1.24,-.79],[-2.32,1.24,.79],.012);}
    box(c,trim,length/2+.014,.59,0,.05,.17,.92);for(let z=-.38;z<.4;z+=.095)box(c,chrome,length/2+.043,.60,z,.02,.014,.07);
    for(const s of [-1,1]){box(c,white,length/2+.025,.71,s*.57,.06,.15,.35);box(c,red,-length/2-.026,.70,s*.59,.06,.19,.27);box(c,trim,-length/2-.018,.48,s*.47,.055,.055,.32);}
    for(const end of [-1,1]){box(c,chrome,end*(length/2+.03),.46,0,.06,.065,1.40);box(c,white,end*(length/2+.065),.56,0,.02,.09,.29);}
    const wheels=[];for(const x of axles)for(const side of [-1,1]){const root=new T.Group();root.position.set(x,wheelR,side*.87);c.add(root);wheels.push(root);let tire=mesh(new T.CylinderGeometry(wheelR,wheelR,.19,24),rubber,root,0,0,0);tire.rotation.x=Math.PI/2;let rim=mesh(new T.CylinderGeometry(.20,.20,.202,16),alloy,root,0,0,0);rim.rotation.x=Math.PI/2;let hub=mesh(new T.CylinderGeometry(.07,.07,.213,12),trim,root,0,0,0);hub.rotation.x=Math.PI/2;
      for(let k=0;k<5;k++){let spoke=box(root,chrome,0,0,side*.108,.032,.32,.012);spoke.rotation.z=k*2*Math.PI/5;}
      let arch=mesh(new T.TorusGeometry(.335,.038,6,24,Math.PI),paint,c,x,wheelR,side*.889);arch.rotation.z=0;
    }
    for(const wheel of wheels)batchStatic(wheel);batchStatic(c);
    c.position.set(offset,-.1,z);if(direction<0)c.rotation.y=Math.PI;cars.push({c,wheels,offset,speed,direction,wheelR});
  }
  vehicle('sedan','#d5dadd',6,-15,2.5,1);vehicle('pickup','#587b86',10,12,2.1,-1);
  function update(time){for(const a of cars){a.c.position.x=((a.offset+a.direction*time*a.speed+36)%72+72)%72-36;for(const wheel of a.wheels)wheel.rotation.z=-time*a.speed/a.wheelR;}}
  update(0);return {group,update,dispose(){group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();},stats:{vehicles:2,types:['compact sedan','small pickup'],source:'Original authored geometry',license:'Project source license; no third-party vehicle asset',externalAssetBytes:0,lanes:[6,10],roadTopY:-.1}};
}
