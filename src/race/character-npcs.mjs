import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createAthleteRowing} from './athlete-rowing.mjs';
import {characterIdentity,faceIdentity,createIdentityMaterials} from './character-identity.mjs';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
export const NPC_ACTIVITIES=['idle','wave','clap','cheer','point','talk','phone','walk','seated-clap'];
const SHIRTS=['#ed6855','#f1bd3f','#42ad9e','#5c91ce','#b493cc','#e99bba','#efe7d6','#82aa55','#d68b48','#447d8c','#c95775','#a6aead'];
const PANTS=['#263346','#62574b','#83918a','#a9966d','#465b7c','#627255','#d2c4a3','#66606b'];

// Body-specific arm/leg lengths, with targets expressed in the character's
// metre-scaled rig space. Source geometry, wardrobe weights and face stay intact.
function civilianMotion(root,skeleton){
 const bones=Object.fromEntries(skeleton.bones.map(b=>[b.name,b])),p=name=>bones[name].getWorldPosition(V());
 const bind=Object.fromEntries(skeleton.bones.map((b,i)=>[b.name,skeleton.boneInverses[i].clone().invert()])),rest=name=>V().setFromMatrixPosition(bind[name]);
 const handFrames={};for(const side of ['l','r']){const finger=rest('middle_01_'+side).sub(rest('hand_'+side)).normalize(),across=rest('index_01_'+side).sub(rest('pinky_01_'+side));across.addScaledVector(finger,-across.dot(finger)).normalize();const frame=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(across,finger,across.clone().cross(finger)));handFrames[side]=frame.invert().multiply(Q().setFromRotationMatrix(bind['hand_'+side]));}
 const display=createAthleteRowing({root,skeleton,paddle:{scale:new T.Vector3()}},{posture:'standing',role:'display'});
 function rotate(name,quaternion){const b=bones[name];b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(quaternion));b.updateMatrixWorld(true);}
 function aim(name,child,direction){rotate(name,bones[name].getWorldQuaternion(Q()).premultiply(Q().setFromUnitVectors(p(child).sub(p(name)).normalize(),direction.normalize())));}
 function limb(a,b,c,target,pole){
  const origin=p(a),u=rest(a).distanceTo(rest(b)),v=rest(b).distanceTo(rest(c)),delta=target.clone().sub(origin),d=T.MathUtils.clamp(delta.length(),Math.abs(u-v)+.001,u+v-.015),axis=delta.normalize();
  pole=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(u*u-v*v+d*d)/(2*d),elbow=origin.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-along*along)));
  const end=origin.clone().addScaledVector(axis,d);aim(a,b,elbow.sub(origin));aim(b,c,end.sub(p(b)));
 }
 function hand(side,target){const sign=side==='l'?1:-1;limb('upperarm_'+side,'lowerarm_'+side,'hand_'+side,target,V(sign,.1,.7));}
 function palm(side,finger,normal){finger.normalize();normal.addScaledVector(finger,-normal.dot(finger)).normalize();const across=finger.clone().cross(normal).normalize();rotate('hand_'+side,Q().setFromRotationMatrix(new T.Matrix4().makeBasis(across,finger,normal)).multiply(handFrames[side]));}
 return(time,activity)=>{
  display(0);
  const chest=p('spine_03'),sway=Math.sin(time*.9)*.018,pulse=Math.sin(time*5.5),clap=.012+.11*(.5+.5*Math.cos(time*8));
  const base={l:chest.clone().add(V(.25,-.45,.10)),r:chest.clone().add(V(-.25,-.45,.10))};
  if(activity==='wave')base.l=chest.clone().add(V(.32,.28+.045*pulse,.10));
  if(activity==='clap'||activity==='seated-clap')for(const side of ['l','r'])base[side]=chest.clone().add(V((side==='l'?1:-1)*clap,-.12,.34));
  if(activity==='cheer')for(const side of ['l','r'])base[side]=chest.clone().add(V((side==='l'?1:-1)*.27,.36+.025*pulse,.07));
  if(activity==='point')base.l=chest.clone().add(V(.32,-.02,.43));
  if(activity==='talk'){base.l=chest.clone().add(V(.18,-.12+.025*pulse,.26));base.r=chest.clone().add(V(-.20,-.2,.20+.025*Math.sin(time*3)));}
  if(activity==='phone'){base.l=chest.clone().add(V(.08,-.09,.32));base.r=chest.clone().add(V(-.06,-.07+.012*pulse,.34));}
  if(activity==='walk')for(const side of ['l','r'])base[side]=chest.clone().add(V((side==='l'?1:-1)*.21,-.43,.1+(side==='l'?1:-1)*Math.sin(time*6.2)*.16));
  const seated=activity==='seated-clap';
  if(seated){const delta=.56-p('pelvis').y;root.position.y+=delta;root.updateMatrixWorld(true);for(const target of Object.values(base))target.y+=delta;}
  for(const side of ['l','r']){
   hand(side,base[side]);
   const fingers=activity==='cheer'||activity==='wave'||activity==='clap'||seated||activity==='phone'?V(.05*Math.sin(time*5),1,.05):V(0,-.25,1);
   palm(side,fingers,activity==='clap'||seated?V(side==='l'?-1:1,0,0):V(0,0,1));
   const sign=side==='l'?1:-1,step=Math.sin(time*6.2+(side==='l'?0:Math.PI));
   if(seated||activity==='walk'){
    const foot=V(sign*.10,seated?.10:.07+Math.max(0,step)*.07,seated?.36:Math.cos(time*6.2+(side==='l'?0:Math.PI))*.20);
    limb('thigh_'+side,'calf_'+side,'foot_'+side,foot,V(sign*.03,0,1));
    rotate('foot_'+side,Q().setFromRotationMatrix(bind['foot_'+side]));
   }
  }
  const head=bones.head,tilt=activity==='phone'?.18:Math.sin(time*.65)*.035;
  rotate('head',head.getWorldQuaternion(Q()).premultiply(Q().setFromAxisAngle(V(1,0,0),tilt)).premultiply(Q().setFromAxisAngle(V(0,1,0),Math.sin(time*.55)*.12)));
  rotate('spine_01',bones.spine_01.getWorldQuaternion(Q()).premultiply(Q().setFromAxisAngle(V(0,0,1),sway)));
  root.updateMatrixWorld(true);skeleton.update();
 };
}

export function createCharacterNpcs(models,hairLibrary){
 const scene=new T.Scene();scene.background=new T.Color('#d8edf0');
 scene.add(new T.HemisphereLight('#eff8ff','#c9b79b',2.2));const sun=new T.DirectionalLight('#fff2dc',2.7);sun.position.set(-5,12,8);scene.add(sun);
 const ground=new T.Mesh(new T.PlaneGeometry(80,45),new T.MeshStandardMaterial({color:'#d5c6a5',roughness:.9}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.025,1);scene.add(ground);
 const curb=new T.Mesh(new T.BoxGeometry(42,.16,.3),new T.MeshStandardMaterial({color:'#eae0c7'}));curb.position.set(0,-.01,-2);scene.add(curb);
 const identities=createIdentityMaterials(),hairGeometries=new Map(),hairMaterial=new T.MeshStandardMaterial({name:'Hair library',color:'#201c17',roughness:.85}),outfits=new Map(),casualShirts=new Map();
 hairLibrary.scene.updateMatrixWorld(true);hairLibrary.scene.traverse(o=>{if(o.isMesh)hairGeometries.set(o.name,o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(new T.Matrix4().makeRotationX(Math.PI/2)));});
 const entries=[],wood=new T.MeshStandardMaterial({color:'#a87540',roughness:.8});let seed=20261023;
 function outfit(source,color){const key=source.uuid+':'+color;if(!outfits.has(key)){const m=source.clone();m.map=null;m.color.set(color);m.roughness=.83;outfits.set(key,m);}return outfits.get(key);}
 for(let i=0;i<18;i++){
  const model=i%2?'f':'d',source=models[model],root=clone(source.scene),group=new T.Group(),x=(i%9-4)*2.45,z=i<9?0:4.5;
  group.position.set(x,0,z);scene.add(group);
  let skin;root.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o;});skin.skeleton.pose();root.updateMatrixWorld(true);skin.skeleton.update();
  const meshes=[];root.traverse(o=>{if(o.isSkinnedMesh){let geometry=o.geometry;
   if(model==='d'&&o.name==='Race_Shirt_D'){
    if(!casualShirts.has(geometry.uuid)){
     const g=geometry.clone(),hip=V().setFromMatrixPosition(skin.skeleton.boneInverses[skin.skeleton.bones.findIndex(b=>b.name==='pelvis')].clone().invert()),p=g.attributes.position;
     const pants=root.getObjectByName('GEO-snow-pants'),testGeometry=pants.geometry.clone().applyMatrix4(pants.bindMatrix),testMaterial=new T.MeshBasicMaterial({side:T.DoubleSide}),surface=new T.Mesh(testGeometry,testMaterial),ray=new T.Raycaster(),point=V(),direction=V(),inverse=o.bindMatrix.clone().invert();surface.updateMatrixWorld(true);
     // A longer casual hem covers the transferred waistband. Keep radial
     // clearance OUTSIDE the actual pants instead of crossing through its lip.
     for(let j=0;j<p.count;j++){
      point.fromBufferAttribute(p,j).applyMatrix4(o.bindMatrix);const amount=1-T.MathUtils.smoothstep(point.y,hip.y+.03,hip.y+.13);if(!amount)continue;
      const height=T.MathUtils.clamp(point.y,hip.y-.02,hip.y+.023),origin=V(hip.x,height,hip.z);direction.set(point.x-hip.x,0,point.z-hip.z);const radius=direction.length();if(radius<.001)continue;direction.normalize();ray.set(origin,direction);
      const hit=ray.intersectObject(surface,false)[0];if(!hit)continue;
      const wanted=Math.max(radius,hit.distance+.018),target=T.MathUtils.lerp(radius,wanted,amount);point.x=hip.x+direction.x*target;point.z=hip.z+direction.z*target;point.y-=.045*amount;point.applyMatrix4(inverse);p.setXYZ(j,point.x,point.y,point.z);
     }testGeometry.dispose();testMaterial.dispose();g.computeVertexNormals();casualShirts.set(geometry.uuid,g);
    }geometry=casualShirts.get(geometry.uuid);
   }
   const mesh=new T.SkinnedMesh(geometry,o.material);mesh.name=o.name;mesh.bindMode='detached';mesh.bind(skin.skeleton,o.bindMatrix);mesh.userData.sourceMaterial=o.material;mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);}});
  const bench=new T.Group();bench.position.set(x,0,z);bench.visible=false;scene.add(bench);
  for(const [size,position]of [[[.85,.06,.34],[0,.50,0]],[[.06,.48,.25],[-.31,.24,0]],[[.06,.48,.25],[.31,.24,0]]]){const m=new T.Mesh(new T.BoxGeometry(...size),wood);m.position.set(...position);bench.add(m);}
  const hair=new T.Mesh(hairGeometries.get(model+'-Crop'),hairMaterial);hair.matrixAutoUpdate=false;group.add(hair);
  const phone=new T.Mesh(new T.BoxGeometry(.065,.12,.012),new T.MeshStandardMaterial({color:'#1e2730',roughness:.35}));phone.matrixAutoUpdate=false;group.add(phone);phone.visible=false;
  root.updateMatrixWorld(true);skin.skeleton.update();
  entries.push({index:i,model,root,group,meshes,hair,phone,bench,head:root.getObjectByName('head'),skeleton:skin.skeleton,motion:civilianMotion(root,skin.skeleton),activity:NPC_ACTIVITIES[i%NPC_ACTIVITIES.length],x,z});
 }
 function randomize(next=seed+7919){seed=next;
  for(const e of entries){const style={...characterIdentity(seed,e.index+100),model:e.model};e.identity=style;e.phase=(e.index*1.713)%10;e.speed=.86+(e.index%5)*.07;
   e.shirt=(e.index+seed)%SHIRTS.length;e.pants=(e.index*3+seed)%PANTS.length;
   e.group.scale.set(.94+(e.index%4)*.035,.91+(e.index%6)*.025,.94+(e.index%4)*.035);
   e.bench.scale.copy(e.group.scale);
   for(const mesh of e.meshes){const source=mesh.userData.sourceMaterial;mesh.material=/Shared blue racing jersey/.test(source.name)?outfit(source,SHIRTS[e.shirt]):/Shared dark racing shorts/.test(source.name)?outfit(source,PANTS[e.pants]):identities.get(source,e.model,style);mesh.visible=!/Hair_SimpleParted|hair_base/.test(mesh.name)||style.hair===0;}
   const name=e.model==='d'?['Parted','Crop','Tied','Long'][style.hair]:['Parted','Crop','Parted','Long'][style.hair];e.hair.geometry=hairGeometries.get(e.model+'-'+name);e.hair.material=identities.get(hairMaterial,e.model,style);e.hair.visible=style.hair!==0;
  }update(0);return stats();
 }
 function update(elapsed){for(const e of entries){
  const time=elapsed*e.speed+e.phase;e.motion(time,e.activity);e.group.position.set(e.x,0,e.z);e.group.rotation.y=0;e.bench.visible=e.activity==='seated-clap';e.phone.visible=e.activity==='phone';
  e.hair.matrix.copy(e.head.matrixWorld);e.phone.matrix.copy(e.root.getObjectByName('hand_l').matrixWorld).multiply(new T.Matrix4().makeTranslation(0,.055,.025));
  if(e.activity==='walk'){const angle=time*.36;e.group.position.x=e.x+Math.sin(angle)*1.05;e.group.position.z=e.z+Math.cos(angle)*1.05;e.group.rotation.y=Math.atan2(Math.cos(angle),-Math.sin(angle));}
  const blink=Math.max(0,1-Math.abs((time%4.7)-3.6)/.095);for(const mesh of e.meshes)faceIdentity(mesh,e.identity,{blink,smile:['cheer','wave','clap','seated-clap'].includes(e.activity)?.28:.07});
  e.root.updateMatrixWorld(true);e.skeleton.update();
 }}
 function stats(){return {people:entries.length,d:9,f:9,activities:[...NPC_ACTIVITIES],shirtColors:new Set(entries.map(e=>e.shirt)).size,pantsColors:new Set(entries.map(e=>e.pants)).size,skinTones:new Set(entries.map(e=>e.identity.skin)).size,hairStyles:new Set(entries.map(e=>e.model+':'+e.identity.hair)).size,materialVariants:outfits.size+identities.size};}
 randomize(seed);
 return {scene,entries,update,randomize,stats,cameraSpec:mode=>mode==='face'?{target:[-9.8,1.52,0],offset:[.35,.1,1.35]}:mode==='upper'?{target:[-4.9,1.05,0],offset:[1.5,1.1,4.3]}:{target:[0,1,2.2],offset:[10,10,23],fit:true,fitBox:[12,1.5,4.6]}};
}
