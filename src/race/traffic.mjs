import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {courseZ} from './maspero-layout.mjs';

const MIN=-700,MAX=3000,LENGTH=MAX-MIN,GROUND=1.24;
const hash=n=>{let x=Math.imul(n+1,0x9e3779b9);x=Math.imul(x^(x>>>16),0x85ebca6b);return((x^(x>>>13))>>>0)/4294967296;};
export function trafficRoad(x,side,lane=0){const t=T.MathUtils.smoothstep(Math.abs(x-1090),80,145);return courseZ(x,side*(60+(side<0?24:6)*(1-t))+lane);}
export function trafficPose(vehicle,time){const x=MIN+((vehicle.start-MIN+vehicle.direction*vehicle.speed*time)%LENGTH+LENGTH)%LENGTH,z=trafficRoad(x,vehicle.side,vehicle.direction*2.15),slope=(trafficRoad(x+.1,vehicle.side)-trafficRoad(x-.1,vehicle.side))/.2;return{x,y:GROUND,z,yaw:-Math.atan(slope)+(vehicle.direction<0?Math.PI:0),wheelAngle:vehicle.direction*vehicle.speed*time/vehicle.radius};}
function geometry(type){const parts=[];const add=(g,color,x,y,z,rx=0,ry=0,rz=0)=>{g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);g.deleteAttribute('uv');const c=new T.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set(c.toArray(),i);g.setAttribute('color',new T.BufferAttribute(a,3));parts.push(g);};const box=(x,y,z,sx,sy,sz,c)=>add(new T.BoxGeometry(sx,sy,sz),c,x,y,z);const sphere=(x,y,z,r,c)=>add(new T.SphereGeometry(r,8,6),c,x,y,z);const limb=(a,b,r,c)=>{const v=new T.Vector3(...a),w=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,v.distanceTo(w),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),w.clone().sub(v).normalize()));const mid=v.add(w).multiplyScalar(.5);add(g,c,...mid.toArray());};
 if(type==='scooter'){
 box(0,.50,0,1.15,.25,.30,'#dbe5df');box(-.17,.65,0,.65,.10,.35,'#292c2b');box(.54,.74,0,.18,.63,.29,'#427875');box(.58,1.10,0,.20,.13,.18,'#eedbaa');box(.42,1.12,0,.09,.05,.67,'#3b4141');box(-.59,.66,0,.07,.10,.23,'#b43d32');
 // Seated adult rider, bent knees, hands on the handlebar, helmet and face.
 add(new T.CapsuleGeometry(.175,.22,4,8),'#7589ab',-.18,.985,0);add(new T.CylinderGeometry(.065,.070,.13,8),'#b78860',-.13,1.29,0);sphere(-.12,1.40,0,.145,'#b78860');add(new T.SphereGeometry(.158,10,6,0,Math.PI*2,0,Math.PI*.60),'#ded8bd',-.13,1.425,0);sphere(.020,1.40,0,.034,'#b78860');for(const eye of[-1,1])sphere(.014,1.437,eye*.058,.012,'#312820');for(const s of[-1,1]){limb([-.20,.80,s*.13],[.10,.62,s*.22],.07,'#394653');limb([.10,.62,s*.22],[.22,.39,s*.21],.06,'#394653');box(.27,.37,s*.22,.24,.09,.12,'#3a302b');limb([-.07,1.16,s*.20],[.21,1.03,s*.28],.055,'#7589ab');limb([.21,1.03,s*.28],[.42,1.12,s*.27],.046,'#b78860');}
 }else{const van=type==='minivan';box(0,.53,0,van?3.7:3.8,.65,van?1.68:1.65,'#afb9b6');box(van?-.12:-.25,van?1.19:1.02,0,van?2.95:2.10,van?.89:.57,1.48,'#d5d6c7');box(van?1.37:.81,van?1.27:1.09,0,.035,van?.54:.35,1.30,'#354a50');box(-1.14,1.11,0,.035,.34,1.30,'#354a50');for(const s of[-1,1]){box(van?-.12:-.24,van?1.30:1.10,s*.753,van?2.67:1.73,van?.49:.31,.03,'#354a50');box(1.90,.59,s*.50,.03,.16,.30,'#eee2bc');box(-1.88,.62,s*.58,.03,.15,.21,'#b3443b');}box(1.91,.30,0,.045,.14,1.4,'#3a4241');}
 const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());return merged;}
export function buildTraffic(group){const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.78}),wheelMat=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.90}),dummy=new T.Object3D(),vehicles=[],batches=[],colors=['#f0e5c9','#629297','#ad5551','#a4b6a3','#6f7f9c','#b69b67'];
 for(const side of[-1,1])for(const direction of[-1,1])for(let i=0;i<48;i++){const id=vehicles.length,r=hash(id+19),type=r<.78?'scooter':r<.94?'car':'minivan';vehicles.push({id,side,direction,type,start:MIN+(i+.18+hash(id)*.64)*LENGTH/48,speed:2.1+hash(id+50)*1.8,radius:type==='scooter'?.25:.31});}
 for(const type of['scooter','car','minivan']){const list=vehicles.filter(v=>v.type===type),g=geometry(type),body=new T.InstancedMesh(g,material,list.length);body.frustumCulled=false;body.name='Festival_Traffic_'+type;list.forEach((v,i)=>body.setColorAt(i,new T.Color(colors[Math.floor(hash(v.id+101)*colors.length)])));group.add(body);const wg=new T.CylinderGeometry(list[0]?.radius??.25,list[0]?.radius??.25,type==='scooter'?.09:.17,10);wg.rotateX(Math.PI/2);const wheelParts=[wg];for(const g of wheelParts){g.deleteAttribute('uv');g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:g.attributes.position.count},()=>[.025,.030,.033]).flat(),3));}for(const a of[0,Math.PI/2]){const spoke=new T.BoxGeometry((list[0]?.radius??.25)*1.65,.026,.19);spoke.rotateZ(a);spoke.deleteAttribute('uv');spoke.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:spoke.attributes.position.count},()=>[.43,.46,.45]).flat(),3));wheelParts.push(spoke);}const wheelGeometry=mergeGeometries(wheelParts,false);wheelParts.forEach(g=>g.dispose());const count=type==='scooter'?2:4,wheels=new T.InstancedMesh(wheelGeometry,wheelMat,list.length*count);wheels.frustumCulled=false;wheels.name=body.name+'_Wheels';group.add(wheels);batches.push({body,wheels,list,count});}
 const stats={count:vehicles.length,scooters:vehicles.filter(v=>v.type==='scooter').length,cars:vehicles.filter(v=>v.type==='car').length,minivans:vehicles.filter(v=>v.type==='minivan').length,drawCalls:6,roadY:GROUND,rightHandTraffic:true,lod:{bodyVisibleMeters:360,wheelsVisibleMeters:160},geometryTriangles:batches.reduce((n,b)=>n+(b.body.geometry.index.count+b.wheels.geometry.index.count)/3,0),visible:0,samples:[]};
 function update(time,cameraX){let visible=0;for(const b of batches)b.list.forEach((v,i)=>{const p=trafficPose(v,time),distance=Math.abs(cameraX-p.x),show=distance<360&&p.x>-140&&p.x<2440;visible+=show?1:0;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(show?1:0);dummy.updateMatrix();b.body.setMatrixAt(i,dummy.matrix);const matrix=dummy.matrix.clone();if(distance>160)matrix.scale(new T.Vector3(0,0,0));for(let k=0;k<b.count;k++){const forward=v.type==='scooter'?(k===0?-.60:.63):(k<2?-1.16:1.18),lateral=v.type==='scooter'?0:(k%2?-.82:.82);dummy.position.set(forward,v.radius,lateral);dummy.rotation.set(0,0,-v.speed*time/v.radius);dummy.scale.setScalar(1);dummy.updateMatrix();dummy.matrix.premultiply(matrix);b.wheels.setMatrixAt(i*b.count+k,dummy.matrix);}b.body.instanceMatrix.needsUpdate=true;b.wheels.instanceMatrix.needsUpdate=true;});stats.visible=visible;stats.samples=vehicles.filter(v=>{const p=trafficPose(v,time);return Math.abs(cameraX-p.x)<360&&p.x>-140&&p.x<2440;}).slice(0,8).map(v=>({id:v.id,type:v.type,direction:v.direction,...trafficPose(v,time)}));}
 update(0,1090);return {stats,update,dispose(){for(const b of batches){group.remove(b.body,b.wheels);b.body.geometry.dispose();b.wheels.geometry.dispose();b.body.dispose();b.wheels.dispose();}material.dispose();wheelMat.dispose();}};
}

// Detailed vehicles used by the bank and festival studio.

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
