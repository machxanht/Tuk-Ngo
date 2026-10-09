import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';

// Original Quaternius mesh/skin weights. Source and CC0 grant are in public/assets/human.
let template;
const SCALE=.96, V=(x,y,z)=>new T.Vector3(x,y,z);
const skin=new T.Color('#ac7959'),jersey=new T.Color('#087d46'),shorts=new T.Color('#192a32');
export async function prepareActors(url){
 const loader=new GLTFLoader(),gltf=typeof url==='string'?await loader.loadAsync(url):await loader.parseAsync(url,'');template=gltf.scene;template.updateMatrixWorld(true);
 template.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;
  if(o.name==='SuperHero_Male'){
   const geo=o.geometry.clone(),p=geo.attributes.position,colors=[];
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),c=y>.99&&y<1.50&&Math.abs(x)<.245?jersey:y>.68&&y<=1.02&&Math.abs(x)<.27?shorts:skin;colors.push(c.r,c.g,c.b);}
   geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));o.geometry=geo;o.material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.82});
  }else if(o.name==='Eyebrows')o.material=new T.MeshStandardMaterial({color:'#25231e',roughness:.8});
  else o.material=new T.MeshStandardMaterial({color:'#e9e9df',roughness:.45});
 });
}
function worldPos(o){return o.getWorldPosition(new T.Vector3());}
function worldQuat(o){return o.getWorldQuaternion(new T.Quaternion());}
function setWorldQuat(b,q){b.quaternion.copy(worldQuat(b.parent).invert().multiply(q));b.updateWorldMatrix(false,true);}
function pointDirection(b,child,desired){
 const from=worldPos(child).sub(worldPos(b)).normalize(),q=new T.Quaternion().setFromUnitVectors(from,desired.clone().normalize()).multiply(worldQuat(b));setWorldQuat(b,q);
}
function frameQ(x,y){y=y.clone().normalize();x=x.clone().sub(y.clone().multiplyScalar(x.dot(y))).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,x.clone().cross(y).normalize()));}

export function makeAthlete(id,role){
 if(!template)throw Error('Actor model must load before building crew');
 const root=new T.Group();root.name=`Athlete_${id}_${role}`;root.userData={component:'athlete',id,role,source:'Quaternius Universal Base Characters (CC0), preserved mesh and skin weights'};
 const model=clone(template);root.add(model);model.rotation.y=Math.PI/2;model.scale.setScalar(SCALE);root.updateMatrixWorld(true);
 const byName=new Map(),bones=[],meshes=[];model.traverse(o=>{if(o.isBone){byName.set(o.name,o);bones.push(o);}if(o.isSkinnedMesh)meshes.push(o);});
 const hips=byName.get('pelvis'),torso=byName.get('spine_01'),head=byName.get('Head');
 const hip=worldPos(hips);model.position.sub(hip);root.updateMatrixWorld(true);
 const standingHipHeight=.92;
 const standingFeet=new Map(['l','r'].map(s=>[s,worldQuat(byName.get('foot_'+s))]));
 if(role==='ROWER'||role==='STEERSMAN')for(const s of ['l','r']){
  pointDirection(byName.get('thigh_'+s),byName.get('calf_'+s),role==='ROWER'?V(.9,-.28,0):V(-.18,-.34,0));
  pointDirection(byName.get('calf_'+s),byName.get('foot_'+s),role==='ROWER'?V(.35,-.93,0):V(.18,-.29,0));
  setWorldQuat(byName.get('foot_'+s),standingFeet.get(s));
 }
 const arms=[];
 for(const [suffix,side] of [['l',-1],['r',1]]){
  const upper=byName.get('upperarm_'+suffix),elbow=byName.get('lowerarm_'+suffix),wrist=byName.get('hand_'+suffix);
  const palm=byName.get('middle_01_'+suffix).position.clone().multiplyScalar(.57),across=byName.get('index_01_'+suffix).position.clone().sub(byName.get('pinky_01_'+suffix).position);
  const palmNormal=worldPos(byName.get('middle_01_'+suffix)).sub(worldPos(wrist)).cross(worldPos(byName.get('index_01_'+suffix)).sub(worldPos(byName.get('pinky_01_'+suffix)))).normalize().multiplyScalar(side===-1?1:-1);
  for(const finger of ['index','middle','ring','pinky','thumb'])for(let n=1;n<=3;n++){
   const b=byName.get(finger+'_0'+n+'_'+suffix),child=b.children.find(x=>x.isBone);if(!child)continue;
   const d=worldPos(child).sub(worldPos(b)).normalize(),axis=d.clone().cross(palmNormal).normalize().applyQuaternion(worldQuat(b).invert());
   if(role==='ROWER'||role==='STEERSMAN')b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,finger==='thumb'?.48:n===1?.95:n===2?1.15:.78));
  }
  root.updateMatrixWorld(true);
  arms.push({side,upper,elbow,wrist,palm,palmLength:palm.length()*SCALE,handBasis:frameQ(across,palm),upperLength:worldPos(upper).distanceTo(worldPos(elbow)),foreLength:worldPos(elbow).distanceTo(worldPos(wrist))});
 }
 // White cap and pupil details are accessories; the face and body are the imported mesh.
 const cap=new T.Mesh(new T.SphereGeometry(.105,20,10,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:'#f0f0e7',roughness:.88}));
 const hp=worldPos(head),capWorld=V(hp.x+.006,hp.y+.173,hp.z);cap.position.copy(head.worldToLocal(capWorld));cap.quaternion.copy(worldQuat(head).invert());head.add(cap);
 for(const z of [-.029,.029]){const eye=new T.Mesh(new T.SphereGeometry(.008,10,8),new T.MeshStandardMaterial({color:'#2a251d',roughness:.35}));const p=V(.119,1.696-.949,z).multiplyScalar(SCALE);eye.position.copy(head.worldToLocal(p));head.add(eye);}
 const preset=new Map(bones.map(b=>[b,b.quaternion.clone()]));
 const reset=()=>{for(const b of bones)b.quaternion.copy(preset.get(b));root.updateMatrixWorld(true);};
 const rotateFromPreset=(b,angle)=>{const axis=V(0,0,1).applyQuaternion(worldQuat(root)),q=worldQuat(b);setWorldQuat(b,new T.Quaternion().setFromAxisAngle(axis,angle).multiply(q));};
 for(const b of bones)b.name=root.name+'_Joint_'+b.name.replace(/[^a-zA-Z0-9_]/g,'_');
 return {root,model,bones,meshes,hips,torso,head,arms,role,standingHipHeight,steeringHipHeight:.76,gripErrors:[],
  setTorsoLean(lean){reset();rotateFromPreset(torso,-lean);},setHeadPitch(pitch){rotateFromPreset(head,pitch);},
 };
}

export function setAthleteGrips(a,grips,shaftDirection){
 a.root.updateMatrixWorld(true);a.gripErrors=[];
 for(let i=0;i<2;i++){
  const arm=a.arms[i],origin=worldPos(arm.upper),toward=grips[i].clone().sub(origin).normalize();
  const wristTarget=grips[i].clone().addScaledVector(toward,-arm.palmLength),delta=wristTarget.clone().sub(origin),raw=delta.length();
  const distance=Math.min(arm.upperLength+arm.foreLength-.0001,Math.max(.025,raw)),axis=delta.normalize();
  const along=(arm.upperLength**2-arm.foreLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,arm.upperLength**2-along**2));
  const pole=V(.20,-.25,arm.side*.65).applyQuaternion(worldQuat(a.root));pole.sub(axis.clone().multiplyScalar(pole.dot(axis))).normalize();
  const elbow=origin.clone().addScaledVector(axis,along).addScaledVector(pole,height),end=origin.clone().addScaledVector(axis,distance);
  pointDirection(arm.upper,arm.elbow,elbow.clone().sub(origin));pointDirection(arm.elbow,arm.wrist,end.clone().sub(elbow));
  const y=grips[i].clone().sub(end).normalize(),x=(shaftDirection||V(0,1,0)).clone().sub(y.clone().multiplyScalar(y.dot(shaftDirection||V(0,1,0))));
  if(x.lengthSq()<.01)x.copy(V(0,0,arm.side));
  const q=frameQ(x,y).multiply(arm.handBasis.clone().invert());setWorldQuat(arm.wrist,q);
  const actual=arm.wrist.localToWorld(arm.palm.clone());a.gripErrors.push(actual.distanceTo(grips[i]));
 }
 for(const mesh of a.meshes)mesh.skeleton.update();return a.gripErrors;
}
