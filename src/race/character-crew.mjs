import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {boatHullGeometry,profile,section} from './boat.mjs';
import {characterIdentity,identitySignature,faceIdentity,createIdentityMaterials} from './character-identity.mjs';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),I=new T.Matrix4();
const cameraSpecs={whole:{target:[0,.85,0],offset:[13,10,-22],fit:true},upper:{target:[7.6,1,0],offset:[1.8,1.6,-3.7]},face:{target:[9.8,1.25,-.27],offset:[.55,.20,-1.25]},front:{target:[11.5,1,0],offset:[3.8,1.8,-3.8]},stern:{target:[-11.6,1,0],offset:[-2,1.7,-3.9]},top:{target:[0,.85,0],offset:[0,28,.01],fit:true}};
export async function createCharacterCrew(models,hairLibrary){
 const scene=new T.Scene();scene.background=new T.Color('#c9e9f2');scene.fog=new T.Fog('#c9e9f2',65,160);
 scene.add(new T.HemisphereLight('#e6f7ff','#d4bd8c',2));
 const sun=new T.DirectionalLight('#fff3dc',2.8);sun.position.set(8,18,-12);scene.add(sun);
 const fill=new T.DirectionalLight('#ddedff',.8);fill.position.set(-8,6,6);scene.add(fill);
 const water=new T.Mesh(new T.PlaneGeometry(600,600,1,1),new T.ShaderMaterial({uniforms:{time:{value:0}},
  vertexShader:'varying vec3 point;void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
  fragmentShader:'varying vec3 point;uniform float time;void main(){float w=sin(point.x*2.1+sin(point.z*1.8)+time*2.7)*sin(point.z*2.2-time*1.8);float glint=pow(max(0.,w),12.);vec3 color=mix(vec3(.29,.51,.48),vec3(.52,.68,.60),w*.5+.5);color+=glint*vec3(.28,.27,.19);gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
 water.rotation.x=-Math.PI/2;water.position.y=.28;scene.add(water);
 const boat=new T.Group();boat.name='Crew_D_F_Boat';scene.add(boat);
 const wood=new T.MeshStandardMaterial({color:'#be8a4c',roughness:.8}),rim=new T.MeshStandardMaterial({color:'#e9c55f',roughness:.57}),paint=new T.MeshStandardMaterial({color:'white',roughness:.7,side:T.DoubleSide});
 const texture=await new T.TextureLoader().loadAsync('../assets/ghe-ngo/kbach-from-reference.webp');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;paint.map=texture;
 const hull=new T.Mesh(boatHullGeometry(),[paint,wood,rim]);hull.name='Canonical_30m_Hull';boat.add(hull);
 const boards=[];
 function board(name,x,y,z,width=.85,depth=.17){const m=new T.Object3D();m.name=name;m.position.set(x,y,z);m.scale.set(depth,.035,width);boat.add(m);boards.push(m);return m;}
 const masters=new Map(),actors=[],identities=createIdentityMaterials(),hairGeometries=new Map();
 hairLibrary.scene.updateMatrixWorld(true);
 hairLibrary.scene.traverse(o=>{if(o.isMesh){const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(new T.Matrix4().makeRotationX(Math.PI/2));hairGeometries.set(o.name,geometry);}});
 const hairMaterial=new T.MeshStandardMaterial({name:'Hair library',color:'#181511',roughness:.8});
 const clipName=(posture,side,role)=>role==='controller'||role==='caller'?role:role==='helm'?'helm-'+side:posture==='seated'?(side==='port'?'seated':'seated-starboard'):'kneeling-'+side;
 function master(model,posture,side,role){
  const clip=clipName(posture,side,role),key=model+':'+clip;if(masters.has(key))return masters.get(key);
  const gltf=models[model],root=clone(gltf.scene),mixer=new T.AnimationMixer(root);let skin;
  root.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o;});
  mixer.clipAction(gltf.animations.find(a=>a.name===clip)).play();mixer.setTime(0);root.updateMatrixWorld(true);skin.skeleton.update();
  const m={root,mixer,skeleton:skin.skeleton,paddle:root.getObjectByName('ComparisonPaddle'),head:root.getObjectByName('head')};masters.set(key,m);return m;
 }
 function actor(index,x,side,posture,role='rower'){
  const group=new T.Group();group.name='Crew_'+index;group.position.set(x,0,role==='rower'?(side==='port'?-.25:.25):0);group.rotation.y=['caller','controller'].includes(role)?-Math.PI/2:Math.PI/2;
  const seat=profile(x).g-.075;group.position.y=posture==='seated'?seat-.50:.04;
  boat.add(group);const a={index,x,side,posture,role,group,meshes:[],footBoards:['l','r'].map(s=>board('Foot_support_'+index+'_'+s,x,.1,0,.14,.29)),hair:new T.Mesh(hairGeometries.get('d-Crop'),hairMaterial)};a.hair.matrixAutoUpdate=false;group.add(a.hair);
  a.paddle=models.d.scene.getObjectByName('ComparisonPaddle').clone();a.paddle.matrixAutoUpdate=false;group.add(a.paddle);
  a.whistle=new T.Mesh(new T.CapsuleGeometry(.008,.018,3,6),new T.MeshStandardMaterial({color:'#e7ce72',metalness:.3,roughness:.5}));a.whistle.visible=role==='controller';group.add(a.whistle);
  if(posture==='seated'&&(side==='port'||role==='caller'))board('Thwart_'+index,x,seat-.0175,0,Math.max(.36,profile(x).b*1.80));
  if(role==='rower'&&posture==='kneeling'){a.kneeBoard=board('Knee_support_'+index,x,.17,side==='port'?-.14:.14,.24,.26);}
  actors.push(a);
 }
 for(let row=0;row<25;row++)for(const side of ['port','starboard'])actor(actors.length,10-row*20/24,side,row<8?'seated':'kneeling');
 actor(50,12.25,'port','seated','caller');actor(51,5.50,'port','standing','controller');actor(52,-11.2,'port','standing','helm');actor(53,-12.15,'starboard','standing','helm');
 board('Bow_board',12.25,.34,0,.36,.7);board('Coach_board',5.5,.065,0,.55,.42);board('Stern_board',-11.7,.07,0,.55,1.8);
 const boardMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),wood,boards.length),hiddenBoard=new T.Matrix4().makeScale(0,0,0);
 boardMesh.name='Shared_Thwarts_Footboards';boardMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);boardMesh.frustumCulled=false;boat.add(boardMesh);
 function styleActor(a,style){
  for(const mesh of a.meshes)a.group.remove(mesh);a.meshes=[];a.identity=style;a.master=master(style.model,a.posture,a.side,a.role);
  models[style.model].scene.traverse(source=>{
   if(!source.isSkinnedMesh)return;
   const mesh=new T.SkinnedMesh(source.geometry,identities.get(source.material,style.model,style));mesh.name=source.name;mesh.bindMode='detached';mesh.bind(a.master.skeleton,source.bindMatrix);
   // Bounds are measured in the baked role pose, with allowance for the stroke.
   // The GLB's rest/T-pose bounds do not describe seated or kneeling athletes.
   mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.30;
   mesh.userData.nativeHair=/Hair_SimpleParted|hair_base/.test(source.name);mesh.visible=!mesh.userData.nativeHair||style.hair===0;
   a.group.add(mesh);a.meshes.push(mesh);
  });
  const hairName=style.model==='d'?['Parted','Crop','Tied','Long'][style.hair]:['Parted','Crop','Parted','Long'][style.hair];
  a.hair.geometry=hairGeometries.get(style.model+'-'+hairName);a.hair.material=identities.get(hairMaterial,style.model,style);a.hair.visible=style.hair!==0;
 }
 let seed=20261023;
 function floorAt(x,z){const p=profile(x);if(Math.abs(z)>p.b-.008)return p.g;let lo=0,hi=1;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(Math.abs(section(x,mid).z)<Math.abs(z))lo=mid;else hi=mid;}return section(x,(lo+hi)/2).y+.024;}
 function fitFeet(){
  boat.updateMatrixWorld(true);
  for(const a of actors){
   a.group.position.y=a.posture==='seated'?profile(a.x).g-.575:.04;a.group.updateMatrixWorld(true);
   let lift=0;const feet={l:new T.Box3(),r:new T.Box3()};
   for(const mesh of a.meshes){const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');if(!indices)continue;
    for(let i=0;i<indices.count;i+=2){let amount=0;for(let k=0;k<4;k++)if(/^(foot|ball)_/.test(a.master.skeleton.bones[indices.getComponent(i,k)]?.name))amount+=weights.getComponent(i,k);if(amount<.65)continue;
     const point=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld);lift=Math.max(lift,floorAt(point.x,point.z)+.004-point.y);
     let foot='l',best=0;for(let k=0;k<4;k++){const name=a.master.skeleton.bones[indices.getComponent(i,k)]?.name,w=weights.getComponent(i,k);if(/^(foot|ball)_/.test(name)&&w>best){best=w;foot=name.at(-1);}}feet[foot].expandByPoint(point);
    }
   }
   a.requiredLift=lift;
   const applied=a.posture!=='seated'?Math.max(0,lift):0;a.group.position.y+=applied;a.group.updateMatrixWorld(true);
   for(const [i,s]of ['l','r'].entries()){const box=feet[s];a.footBoards[i].visible=!box.isEmpty();if(!box.isEmpty()){const center=box.getCenter(V());a.footBoards[i].position.set(center.x,box.min.y+applied-.0175,center.z);}}
  }
 }
 function randomize(next=seed+7919){seed=next;for(const a of actors)styleActor(a,characterIdentity(seed,a.index));update(0,0);fitFeet();update(0,0);return stats();}
 const splashGeometry=new T.SphereGeometry(.017,4,3),splashMaterial=new T.MeshBasicMaterial({color:'#e5f6e9',transparent:true,opacity:.72});
 const splash=new T.InstancedMesh(splashGeometry,splashMaterial,actors.length*6);splash.instanceMatrix.setUsage(T.DynamicDrawUsage);splash.frustumCulled=false;scene.add(splash);
 const dummy=new T.Object3D(),point=V();
 function update(phase,elapsed){
  water.material.uniforms.time.value=elapsed;boat.position.y=Math.sin(elapsed*2)*.004;boat.rotation.z=Math.sin(elapsed*1.7)*.0008;
  for(const m of masters.values()){m.mixer.setTime(phase*1.2);m.root.updateMatrixWorld(true);m.skeleton.update();}
  let drop=0;
  for(const a of actors){
   a.group.updateMatrixWorld(true);
   const m=a.master;a.paddle.matrix.copy(m.paddle.matrixWorld);a.paddle.visible=!['caller','controller'].includes(a.role);
   a.hair.matrix.copy(m.head.matrixWorld);
   const blink=Math.max(0,1-Math.abs(((elapsed+a.index*.39)%4.7)-3.5)/.095);
   for(const mesh of a.meshes)faceIdentity(mesh,a.identity,{blink,effort:a.role==='rower'?.24:0});
   if(a.kneeBoard){const s=a.side==='port'?'l':'r',knee=m.root.getObjectByName('calf_'+s).getWorldPosition(V()).applyMatrix4(a.group.matrix);a.kneeBoard.position.set(knee.x,knee.y-.072,knee.z);}
   if(a.role==='controller'){a.whistle.position.copy(m.head.getWorldPosition(V()).add(V(.035,.025,.135)));}
   a.group.updateMatrixWorld(true);
   if(a.role!=='rower')continue;
   point.set(0,-1.05,0).applyMatrix4(a.paddle.matrixWorld);const wet=point.y<.34&&phase>.08&&phase<.59;
   for(let i=0;i<6;i++){
    const t=((phase*3.2+i*.163+a.index*.013)%1),r=(a.index*17+i*31)%101/101;
    dummy.position.set(point.x+(r-.5)*t*.75,.29+t*.52*(1-t)*3,point.z+(i%2?1:-1)*t*.30);
    dummy.scale.setScalar(wet?(1-t)*(.8+r):0);dummy.updateMatrix();splash.setMatrixAt(drop++,dummy.matrix);
   }
  }
  for(;drop<splash.count;drop++){dummy.scale.setScalar(0);dummy.updateMatrix();splash.setMatrixAt(drop,dummy.matrix);}splash.instanceMatrix.needsUpdate=true;
  for(let i=0;i<boards.length;i++){boards[i].updateMatrix();boardMesh.setMatrixAt(i,boards[i].visible?boards[i].matrix:hiddenBoard);}boardMesh.instanceMatrix.needsUpdate=true;
 }
 function stats(){const roster=actors.map(a=>({index:a.index,role:a.role,posture:a.posture,side:a.side,...a.identity}));return {crew:actors.length,d:roster.filter(a=>a.model==='d').length,f:roster.filter(a=>a.model==='f').length,uniqueIdentities:new Set(actors.map(a=>identitySignature(a.identity))).size,skinTones:new Set(roster.map(a=>a.skin)).size,hairStyles:new Set(roster.map(a=>a.model+':'+a.hair)).size,faceProfiles:new Set(roster.map(a=>a.model+':'+a.face)).size,sharedSkeletons:masters.size,materialVariants:identities.size,roster};}
 randomize(seed);
 return {scene,boat,actors,update,randomize,stats,floorAt,cameraSpec:mode=>cameraSpecs[mode]||cameraSpecs.whole};
}
