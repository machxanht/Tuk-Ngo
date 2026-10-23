import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {athletePalette,makeAthleteMaterials,shortSleeves,teamTextures} from './team-style.mjs';
import {buildFaceVariants,FACE_PROFILES} from './athlete-faces.mjs';
import {strokePhase} from './rowing-effort.mjs';
import {connectedShirt} from './athlete-shirt.mjs';
import {assetBytes,releaseAssetBytes} from './asset-transfer.mjs';
import {crewAnimation} from './crew-animation.mjs';
import {finishAthleteShirt} from './athlete-finish.mjs';
import {ROWING_LAYOUT,rowingPose} from './rowing-pose.mjs';
import {rowingMotionDigest} from './asset-digests.mjs';
import {profile,boatHullGeometry} from './boat.mjs';
import {buildConstructionDetails,BOAT_CONSTRUCTIONS} from './boat-construction.mjs';
import {createCharacterHeads} from './character-heads.mjs';
import {athleteFacesDigest} from './asset-digests.mjs';

const W=2400,H=860;
const roleNames=['seated-port','seated-starboard','standing-port','standing-starboard','caller','controller','helm','helm-starboard'];
const v=new T.Vector3(),identity=new T.Matrix4();
const materialCache=new WeakMap();
function materialFrom(m){if(!materialCache.has(m))materialCache.set(m,new T.MeshLambertMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,side:T.DoubleSide,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest}));return materialCache.get(m);}
function regularAttribute(a,type=Float32Array){const array=new type(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)array[i*a.itemSize+k]=a.getComponent(i,k);return new T.BufferAttribute(array,a.itemSize);}

export async function createHybridBoats(base='',{onProgress=()=>{},sharedRenderer=null,faces=true}={}){
 const loader=new GLTFLoader(),roles={};
 const motionFile='../athlete-master/rowing-motion.glb?sha='+rowingMotionDigest;
 let loaded=0;
 const transfer={onRetry(){document.body.dataset.loadRetries=String(Number(document.body.dataset.loadRetries||0)+1);const status=document.querySelector('#status');if(status&&!document.body.dataset.loadError)status.textContent='Kết nối chậm · đang thử tải lại…';}};
 const loadModel=async file=>{const result=await loader.parseAsync(await assetBytes(base+file,transfer),T.LoaderUtils.extractUrlBase(new URL(base+file,document.baseURI).href));onProgress(++loaded,faces?5:4);return result;};
 const [shirtData,model,hull,equipment,motions]=await Promise.all([assetBytes(base+'shirt-runtime-v32.json',transfer).then(b=>JSON.parse(new TextDecoder().decode(b))),loadModel('athlete-rig-v27.glb'),loadModel('hull-rig-v25.glb'),loadModel('../athlete-master/athlete-details.glb'),loadModel(motionFile)]);
 model.scene.updateMatrixWorld(true);
 const skins=[];model.scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
 const reference=skins[0],jointNames=reference.skeleton.bones.map(b=>b.name),solid=[],decals=[];
 const headId=jointNames.indexOf('head'),headInverse=reference.skeleton.boneInverses[headId],headBind=headInverse.clone().invert();
 const shirtAsset=finishAthleteShirt(await connectedShirt(shirtData,jointNames,base));
 for(const skin of skins){
  if(skin.material.name==='White_Cotton_Cap')continue;
  const g=skin.geometry.clone().applyMatrix4(skin.bindMatrix);
  for(const n of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(n))g.deleteAttribute(n);
  for(const n of ['position','normal','uv','skinIndex','skinWeight','color'])if(g.getAttribute(n))g.setAttribute(n,regularAttribute(g.getAttribute(n),n==='skinIndex'?Uint16Array:Float32Array));
  const joints=g.getAttribute('skinIndex');for(let i=0;i<joints.count;i++)for(let k=0;k<4;k++)joints.setComponent(i,k,jointNames.indexOf(skin.skeleton.bones[joints.getComponent(i,k)].name));
  const source=g.getAttribute('color'),color=new Float32Array(g.attributes.position.count*3);
  const materialColor=skin.material.name==='Painted_Skin_V25'?[.56,.31,.15]:skin.material.color.toArray();for(let i=0;i<g.attributes.position.count;i++)for(let k=0;k<3;k++)color[i*3+k]=materialColor[k]*(source?source.getComponent(i,k):1);
  g.setAttribute('color',new T.BufferAttribute(color,3));
  const zone=new Float32Array(g.attributes.position.count),zones={Painted_Skin_V25:1,White_Cotton_Cap:2,Painted_Vest_V25:3,Painted_Ivory_Binding_V25:5,Painted_Shorts_V25:6};zone.fill(zones[skin.material.name]||0);g.setAttribute('paintZone',new T.BufferAttribute(zone,1));
  if(skin.material.name==='White_Uniform_Print')zone.fill(9);
  if(skin.material.name==='Painted_Ivory_Binding_V25'){g.computeBoundingBox();if(g.boundingBox.min.x>.11||g.boundingBox.max.x<-.11)zone.fill(8);}
  const blend=new Float32Array(g.attributes.position.count),p=g.attributes.position;for(let i=0;i<p.count;i++)blend[i]=T.MathUtils.smoothstep(p.getY(i),.86,1.30);g.setAttribute('shirtMix',new T.BufferAttribute(blend,1));
  if(!g.getAttribute('uv'))g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(skin.material.map&&skin.material.name!=='Painted_Skin_V25')decals.push({geometry:g,material:materialFrom(skin.material)});else solid.push(g);
  if(skin.material.name==='Painted_Skin_V25')solid.push(shortSleeves(g,jointNames,reference.skeleton));
 }
 // Authored in Blender in head-local metres, then rigidly weighted to the
 // original head. Merge into the existing body draw call and identity cache.
 equipment.scene.updateMatrixWorld(true);
 for(const [name,zoneId] of [['Race_Cap',2],['Race_Hair',10]]){
  const source=equipment.scene.getObjectByName(name);if(!source?.isMesh)throw Error('Missing Blender equipment: '+name);
  const g=source.geometry.clone().applyMatrix4(source.matrixWorld).applyMatrix4(headBind),count=g.attributes.position.count;
  for(const name of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(name))g.deleteAttribute(name);
  for(const name of ['position','normal','uv','color'])if(g.attributes[name])g.setAttribute(name,regularAttribute(g.attributes[name]));
  if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(count*2),2));
  // glTF COLOR_0 may include alpha; the merged body uses RGB.
  const colors=new Float32Array(count*3);for(let i=0;i<count;i++)for(let k=0;k<3;k++)colors[i*3+k]=g.attributes.color?.getComponent(i,k)??1;
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);for(let i=0;i<count;i++){indices[i*4]=headId;weights[i*4]=1;}
  g.setAttribute('skinIndex',new T.BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.BufferAttribute(weights,4));
  g.setAttribute('paintZone',new T.BufferAttribute(new Float32Array(count).fill(zoneId),1));g.setAttribute('shirtMix',new T.BufferAttribute(new Float32Array(count),1));solid.push(g);
 }
 const merged=mergeGeometries(solid,false);solid.forEach(g=>g.dispose());if(!merged)throw Error('Cannot merge continuous athlete skin');
 let offset=0,bodyOffset=0;const garmentPairs=[];
 for(const g of solid){if(g.attributes.paintZone.getX(0)===1)bodyOffset=offset;if(g.userData.sourceBarycentric)for(const [i,weights] of g.userData.sourceBarycentric.entries())garmentPairs.push([offset+i,weights.map(([source,amount])=>[bodyOffset+source,amount])]);offset+=g.attributes.position.count;}
 merged.userData.garmentPairs=garmentPairs;
 const cuffA=new Float32Array(merged.attributes.position.count*4),cuffB=new Float32Array(cuffA.length),cuffWeights=new Float32Array(cuffA.length),mp=merged.attributes.position,mn=merged.attributes.normal,mj=merged.attributes.skinIndex,mw=merged.attributes.skinWeight;
 for(let i=0;i<mp.count;i++)cuffA[i*4+3]=-1;
 const pack=(a,b)=>a+b*4096,packedJoints=i=>[0,1,2,3].reduce((sum,k)=>sum+mj.getComponent(i,k)*64**k,0),packedWeights=i=>[0,1,2,3].map(k=>Math.round(mw.getComponent(i,k)*4095));
 for(const [i,source]of garmentPairs)if(source.length===2){for(const [n,[k]]of source.entries()){const array=n===0?cuffA:cuffB;for(let c=0;c<3;c++)array[i*4+c]=mp.getComponent(k,c)+mn.getComponent(k,c)*.0045;array[i*4+3]=packedJoints(k);const ws=packedWeights(k);cuffWeights.set([pack(ws[0],ws[1]),pack(ws[2],ws[3])],i*4+n*2);}merged.attributes.shirtMix.setX(i,source[1][1]);}
 merged.setAttribute('cuffSourceA',new T.BufferAttribute(cuffA,4));merged.setAttribute('cuffSourceB',new T.BufferAttribute(cuffB,4));merged.setAttribute('cuffWeights',new T.BufferAttribute(cuffWeights,4));
 merged.setAttribute('paintUV',merged.attributes.uv);
 const skinMap=skins.find(s=>s.material.name==='Painted_Skin_V25')?.material.map;if(!skinMap)throw Error('Anatomical skin/UV source is missing');skinMap.colorSpace=T.SRGBColorSpace;skinMap.flipY=false;
 const detail={value:1};
 const materials=makeAthleteMaterials(skinMap,detail),liveries=teamTextures(base);
 const skinMaterial=materials.get(athletePalette(null,0,'rower','#23855e'));
 const geometryVariants=buildFaceVariants(merged,headInverse,headBind,headId);
 // Leader zone 4 and rower zone 3 already use the same shader expression;
 // kit roles differ through their cached palettes, not duplicated geometry.
 let faceController=null;
 const geometryFor=(role,variant)=>faceController?faceController.mask(geometryVariants[variant]):geometryVariants[variant];
 function faceFor(id,teamId){let seed=id*0x45d9f3b;for(const c of teamId||'prototype')seed=Math.imul(seed^c.charCodeAt(0),16777619);seed=Math.imul(seed^(seed>>>16),0x7feb352d);return ((seed^(seed>>>15))>>>0)%geometryVariants.length;}
 const scene=new T.Scene(),boat=new T.Group();scene.add(boat);
 scene.add(new T.HemisphereLight('#fff8e4','#d7c5a4',2.1));const sun=new T.DirectionalLight('#ffedcd',1.05);sun.position.set(5,12,-8);scene.add(sun);
 const renderer=sharedRenderer||new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 if(!sharedRenderer){renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.setSize(1600,Math.round(1600*H/W),false);}
 const camera=new T.OrthographicCamera(-15.8,18.7,34.5*H/W/2,-34.5*H/W/2,.1,120);
 function fullCamera(){camera.left=-15.8;camera.right=18.7;camera.top=34.5*H/W/2;camera.bottom=-camera.top;camera.position.set(9,13.2,-28);camera.lookAt(0,-.8,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 fullCamera();
 hull.scene.updateMatrixWorld(true);const sourceHull=hull.scene.getObjectByName('Hull_Watertight_30_20x1_12');
 const hullBody=new T.Group();hullBody.name='Canonical_Boat_Hull';
 const paintedHull=[],hullInteriors=[],hullEnds=[];
 hull.scene.traverse(o=>{
  if(!o.isMesh)return;
  let parent=o;while(parent&&parent!==sourceHull)parent=parent.parent;
  if(parent===sourceHull||/Bench|Command_Platform|Foredeck|SternDeck|Red_Integrated_Prow|Red_Integrated_Stern/.test(o.name)){o.visible=false;return;}
  const old=o.material;o.material=materialFrom(old);
  if(old.map){
   o.geometry=o.geometry.clone();o.material.color.set('white');paintedHull.push({mesh:o});
  }else if(/Wood|Timber|Rib|Beam/.test(old.name))o.material.color.set('#b9844d');
  if(/Red_Integrated_Prow|Red_Integrated_Stern/.test(o.name))hullEnds.push(o);
  // The optimized hull GLB strips material names. Identify its two untextured
  // inner primitives by ancestry, and isolate them from shared timber paint.
 });
 const hullGeometry=boatHullGeometry(),hullMaterials=[new T.MeshLambertMaterial({color:'white',side:T.DoubleSide}),new T.MeshLambertMaterial({color:'#b9844d',side:T.DoubleSide}),new T.MeshLambertMaterial({color:'#e6b455',side:T.DoubleSide})];
 for(const [i,part]of hullGeometry.groups.entries()){
  const geometry=new T.BufferGeometry();for(const [name,attribute]of Object.entries(hullGeometry.attributes))geometry.setAttribute(name,attribute);
  geometry.setIndex(new T.BufferAttribute(hullGeometry.index.array.slice(part.start,part.start+part.count),1));const mesh=new T.Mesh(geometry,hullMaterials[i]);mesh.name=['Painted_Hull','Inner_Hull','Rounded_Rim'][i];hullBody.add(mesh);
  if(i===0)paintedHull.push({mesh});if(i===1)hullInteriors.push({mesh,color:mesh.material.color.clone()});
 }
 hullGeometry.dispose();hull.scene.add(hullBody);hull.scene.updateMatrixWorld(true);
 boat.add(hull.scene);
 const constructionDetails=buildConstructionDetails(boat);let construction='plywood';
 // Keep the real hull depth. A depth-only water plane hides submerged mesh
 // while preserving the painted water behind the transparent WebGL layer.
 const waterShape=new T.Shape();waterShape.moveTo(-50,-15);waterShape.lineTo(50,-15);waterShape.lineTo(50,15);waterShape.lineTo(-50,15);waterShape.closePath();
 const widthPoints=[[-15.1,.025],[-13,.24],[-10,.405],[-5,.545],[0,.585],[5,.555],[10,.435],[13,.26],[15.1,.025]],hole=new T.Path();
 hole.moveTo(widthPoints[0][0],widthPoints[0][1]);for(const [x,w] of widthPoints.slice(1))hole.lineTo(x,w);for(const [x,w] of [...widthPoints].reverse())hole.lineTo(x,-w);hole.closePath();waterShape.holes.push(hole);
 const plane=new T.Mesh(new T.ShapeGeometry(waterShape),new T.MeshBasicMaterial({colorWrite:false,side:T.DoubleSide}));plane.rotation.x=-Math.PI/2;plane.position.y=.28;plane.renderOrder=-10;scene.add(plane);
 const sourcePaddles=[];
 for(let i=0;i<roleNames.length;i++){
  const root=clone(model.scene);root.visible=false;scene.add(root);root.updateMatrixWorld(true);
  let first;root.traverse(o=>{if(o.isSkinnedMesh&&!first)first=o;});
  const mixer=new T.AnimationMixer(root),clip=motions.animations.find(clip=>clip.name===roleNames[i]);if(!clip)throw Error('Missing continuous '+roleNames[i]);mixer.clipAction(clip).play();mixer.setTime(0);root.updateMatrixWorld(true);first.skeleton.update();
  const paddle=root.getObjectByName('Dam_Wood_152cm');if(!paddle)throw Error('Missing protected paddle animation pivot');
  paddle.traverse(o=>{if(o.isMesh)sourcePaddles.push(o);});paddle.clear();paddle.add(equipment.scene.getObjectByName('Race_Paddle').clone());
  roles[roleNames[i]]={root,skeleton:first.skeleton,mixer,clip,paddle};
 }
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),actors=[],boards=[],paddleGeometry=new Map(),floorSlices=new Map();
 // A vertical placement ray only needs its half-metre hull slice. Share the
 // protected vertex buffers; keep small CPU-only triangle indices per slice.
 const floorBins=new Map();
 hullBody.traverse(source=>{if(!source.isMesh)return;const g=source.geometry,xs=new Float32Array(g.attributes.position.count);
  for(let i=0;i<xs.length;i++)xs[i]=v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(source.matrixWorld).x;
  const fi=g.index,count=fi?.count??xs.length;
  for(let i=0;i<count;i+=3){const tri=[0,1,2].map(k=>fi?fi.getX(i+k):i+k),lo=Math.floor(Math.min(...tri.map(i=>xs[i]))*2),hi=Math.floor(Math.max(...tri.map(i=>xs[i]))*2);for(let bin=lo;bin<=hi;bin++){if(!floorBins.has(bin))floorBins.set(bin,new Map());const byMesh=floorBins.get(bin);if(!byMesh.has(source))byMesh.set(source,[]);byMesh.get(source).push(...tri);}}
 });
 function floor(x,z){
  const bin=Math.floor(x*2);if(!floorSlices.has(bin)){
   const meshes=[];for(const [source,indices]of floorBins.get(bin)||[]){const geometry=new T.BufferGeometry();for(const [key,attribute]of Object.entries(source.geometry.attributes))geometry.setAttribute(key,attribute);
    geometry.setIndex(indices);geometry.boundingSphere=source.geometry.boundingSphere;const mesh=new T.Mesh(geometry,source.material);mesh.matrixAutoUpdate=false;meshes.push({source,mesh});
   }floorSlices.set(bin,meshes);
  }
  const slices=floorSlices.get(bin);for(const {source,mesh}of slices)mesh.matrixWorld.copy(source.matrixWorld);ray.set(new T.Vector3(x,3,z),down);const hits=ray.intersectObjects(slices.map(s=>s.mesh),false);return hits.length?hits[0].point.y+.015:.07;
 }
 function innerHalfWidth(x,y){let lo=0,hi=profile(x).b;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(floor(x,mid)-.015<y)lo=mid;else hi=mid;}return Math.max(.02,lo-.008);}
 const wood=new T.MeshLambertMaterial({color:'#b78550'});
 function actor(id,x,side,posture,role='rower'){
  const key=role==='rower'?posture+(side<0?'-port':'-starboard'):role==='helm'&&side>0?'helm-starboard':role,master=roles[key],group=new T.Group();
  group.name='Hybrid_Athlete_'+id;group.position.set(x,0,role==='rower'?side*ROWING_LAYOUT.rowerOffset:0);group.rotation.y=['caller','controller'].includes(role)?-Math.PI/2:Math.PI/2;
  if(role==='rower')group.scale.x=ROWING_LAYOUT.lateralScale;
  const forward=['caller','controller'].includes(role)?-1:1,seated=posture==='seated';
  const seatTop=seated?(role==='caller'?actors[0].seatTop:profile(x).g-ROWING_LAYOUT.seatedBarDrop):null;
  let footing=role==='helm'?ROWING_LAYOUT.sternDeckY:role==='rower'?floor(x,.13):floor(x,0)+.16;
  group.position.y=seated?seatTop-.515:footing;
  const variant=faceFor(id,null),geometry=geometryFor(role,variant);
  const skin=new T.SkinnedMesh(geometry,skinMaterial);skin.bindMode='detached';skin.bind(master.skeleton,identity);skin.frustumCulled=false;group.add(skin);
  const shirt=new T.SkinnedMesh(shirtAsset.geometry,shirtAsset.material(athletePalette(null,id,role,'#23855e')));shirt.bindMode='detached';shirt.bind(master.skeleton,identity);shirt.frustumCulled=false;shirt.name='Connected_Shirt_V32';group.add(shirt);
  for(const d of decals){const mesh=new T.SkinnedMesh(d.geometry,d.material);mesh.bindMode='detached';mesh.bind(master.skeleton,identity);mesh.frustumCulled=false;mesh.userData.oldKitPrint=true;group.add(mesh);}
  let paddle;
  if(!['caller','controller'].includes(role)){
   paddle=master.paddle.clone(true);paddle.matrixAutoUpdate=false;
   const length=role==='helm'?ROWING_LAYOUT.steeringPaddleLength:posture==='standing'?1.75:ROWING_LAYOUT.seatedPaddleLength;
   if(length!==1.52)paddle.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+length;if(!paddleGeometry.has(key)){
    const g=o.geometry.clone(),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i);if(o.name==='Race_Paddle')p.setY(i,y-(length-1.52)*T.MathUtils.clamp((-y-.30)/.69,0,1));else if(/Blade/.test(o.name))p.setY(i,y-(length-1.52));else if(/Shaft/.test(o.name)&&y<-.53)p.setY(i,-.53+(y+.53)*(length-.48-.53)/(1.04-.53));}
    g.computeVertexNormals();paddleGeometry.set(key,g);
   }o.geometry=paddleGeometry.get(key);
   });
   paddle.traverse(o=>{if(o.isMesh)o.material=materialFrom(o.material);});group.add(paddle);
  }
  boat.add(group);group.updateMatrixWorld(true);
  // Fit the actual soles/shins to this hull section. The previous placement
  // sampled an outboard point beside the feet, lifting rear rows onto the rim.
  // Keep seated hips on their low cross-thwart; their legs tuck in via IK.
  if(!seated&&role==='rower'){
   let clearance=-Infinity;const g=skin.geometry,point=new T.Vector3();
   for(let i=0;i<g.attributes.position.count;i++){
    let weight=0;for(let k=0;k<4;k++)if(/^(calf|foot|ball|toe)_/.test(jointNames[g.attributes.skinIndex.getComponent(i,k)]))weight+=g.attributes.skinWeight.getComponent(i,k);
    if(weight>.45){skin.getVertexPosition(i,point).applyMatrix4(group.matrixWorld);clearance=Math.max(clearance,floor(point.x,point.z)-point.y);}
   }
   group.position.y+=clearance+.012;footing=group.position.y;group.updateMatrixWorld(true);
  }
  const feet=new T.Box3(),point=new T.Vector3();
  if(seated){const g=skin.geometry;for(let i=0;i<g.attributes.position.count;i++){let w=0;for(let k=0;k<4;k++)if(/^(foot|ball|toe)_/.test(jointNames[g.attributes.skinIndex.getComponent(i,k)]))w+=g.attributes.skinWeight.getComponent(i,k);if(w>.65)feet.expandByPoint(skin.getVertexPosition(i,point).applyMatrix4(group.matrixWorld));}footing=feet.min.y-.002;}
  const feetSize=seated?feet.getSize(new T.Vector3()):null;
  const board=new T.Mesh(new T.BoxGeometry(role==='controller'?.65:role==='helm'?.80:seated?feetSize.x+.012:.40,role==='controller'?.18:.023,role==='controller'?.65:role==='helm'?.28:seated?feetSize.z+.012:.34),wood);
  const footCenter=seated?feet.getCenter(new T.Vector3()):new T.Vector3(x+(role==='helm'?0:forward*.14),0,group.position.z);
  board.position.set(footCenter.x,footing-(role==='controller'?.09:.012),footCenter.z);board.userData.owner=id;boat.add(board);boards.push(board);
  let seat;
  if(seated&&(role==='caller'||side<0)){const half=Math.min(innerHalfWidth(x-.09,seatTop-.037),innerHalfWidth(x+.09,seatTop-.037));seat=new T.Mesh(new T.BoxGeometry(.18,.035,half*2),wood);seat.name='Cross_Thwart_'+id;seat.position.set(x,seatTop-.0175,0);seat.userData.owner=id;boat.add(seat);boards.push(seat);}
  actors.push({id,group,master,paddle,role,posture,side,variant,footing,seatTop,seat,skin,shirt,baseGeometry:geometry});
 }
 for(let row=0;row<25;row++)for(const side of [-1,1])actor(2+row*2+(side>0?1:0),10-row*20/24,side,row<8?'seated':'standing');
 actor(1,ROWING_LAYOUT.callerX,0,'seated','caller');actor(52,ROWING_LAYOUT.controllerX,0,'standing','controller');for(let i=0;i<2;i++)actor(53+i,-11-i,i?1:-1,'standing','helm');
 boat.updateMatrixWorld(true);
 const footIds=jointNames.map((name,i)=>/^foot_|^ball_|^toe_/.test(name)?i:-1).filter(i=>i>=0),probe=actors.find(a=>a.posture==='standing').skin,weights=probe.geometry.attributes.skinWeight,joints=probe.geometry.attributes.skinIndex;
 let sole=Infinity;
 for(let i=0;i<joints.count;i++){let amount=0;for(let k=0;k<4;k++)if(footIds.includes(joints.getComponent(i,k)))amount+=weights.getComponent(i,k);if(amount>.65)sole=Math.min(sole,probe.getVertexPosition(i,new T.Vector3()).y);}
 const soleLift=Number.isFinite(sole)?.002-sole:0;
 // Seated placement is governed by the inside thwart; standing placement is
 // governed by its soles. Never lift the low thwart with the foot correction.
 for(const a of actors)if(a.posture!=='seated')a.group.position.y+=soleLift;boat.updateMatrixWorld(true);
 for(const a of actors)if(a.role==='rower'&&a.posture==='standing'){
  a.stance='half-kneeling';a.kneelingLeg=a.side<0?'l':'r';
  const knee=a.master.root.getObjectByName('calf_'+a.kneelingLeg).getWorldPosition(new T.Vector3()).applyMatrix4(a.group.matrixWorld);
  const rest=new T.Mesh(new T.BoxGeometry(.22,.04,.18),wood);rest.position.copy(knee);
  // Fit the support below the actual deformed knee/shin surface, rather than
  // the joint centre. The leg pose is planted throughout the stroke.
  const p=new T.Vector3(),g=a.skin.geometry;let surface=Infinity;
  for(let i=0;i<g.attributes.position.count;i++){if(g.attributes.paintZone.getX(i)!==1)continue;a.skin.getVertexPosition(i,p).applyMatrix4(a.group.matrixWorld);if(Math.abs(p.x-knee.x)<.11&&Math.abs(p.z-knee.z)<.09&&p.y>knee.y-.15&&p.y<knee.y+.02)surface=Math.min(surface,p.y);}
  rest.position.y=(Number.isFinite(surface)?surface:knee.y-.075)-.022;rest.userData.owner=a.id;boat.add(rest);boards.push(rest);a.kneeRest=rest;
 }
 for(const board of boards){const box=board.geometry.parameters,bottom=board.position.y-box.height/2,half=Math.min(innerHalfWidth(board.position.x-box.width/2,bottom),innerHalfWidth(board.position.x+box.width/2,bottom));board.scale.z=Math.min(1,Math.max(.02,half-Math.abs(board.position.z))*2/box.depth);}
 boat.updateMatrixWorld(true);
 const callerBoards=boards.filter(o=>o.userData.owner===1);
 const boardParts=boards.filter(o=>o.userData.owner!==1).map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)),boardGeometry=mergeGeometries(boardParts,false);boardParts.forEach(g=>g.dispose());
 const boardBatch=new T.Mesh(boardGeometry,wood);boat.add(boardBatch);boards.forEach(o=>o.visible=false);
 const accessories=new Map();
 for(const a of actors)if(a.paddle)a.paddle.traverse(mesh=>{if(!mesh.isMesh)return;const key=mesh.geometry.uuid+mesh.material.uuid;if(!accessories.has(key))accessories.set(key,[]);accessories.get(key).push({owner:a,mesh});mesh.visible=false;});
 const batches=[...accessories.values()].map(entries=>{const batch=new T.InstancedMesh(entries[0].mesh.geometry,entries[0].mesh.material,entries.length);batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);boat.add(batch);return {batch,entries};});
 let helmSteering=null;
 const rudderSolvers=actors.filter(a=>a.role==='helm').map(a=>({actor:a,apply:rowingPose(a.master,{role:'helm',posture:'standing',side:a.side})}));
 function applyPose(phase,t,desyncIntensity=0){
  for(const [name,master] of Object.entries(roles)){const offset=/^(seated|standing)/.test(name)?(name.endsWith('port')?-.035:.035)*desyncIntensity:0;master.mixer.setTime((name.startsWith('helm')?((t*.4+(name==='helm-starboard'?.12:0))%1+1)%1:((phase+offset)%1+1)%1)*master.clip.duration);master.root.updateMatrixWorld(true);master.skeleton.update();}
  // Capture steering with the complete pose so distant crews keep their
  // existing half-rate cache, and the helmsman's torso/arms share one clock.
  if(helmSteering!=null)for(const {actor,apply}of rudderSolvers){apply(((t*.4+(actor.side>0?.12:0))%1+1)%1,{steering:helmSteering,steeringOnly:true});actor.master.skeleton.update();}
 }
 const animation=crewAnimation(roles,applyPose,{distanceThreshold:window.TukNgoConfig?.performance?.crewDistanceThreshold??44});
 const caller=actors.find(a=>a.role==='caller'),coach=actors.find(a=>a.role==='controller');
 const seatedCallerY=caller.group.position.y;
 const spear=new T.Group();spear.name='Dugout_Bow_Command_Spear';spear.matrixAutoUpdate=false;
 const shaft=new T.Mesh(new T.CylinderGeometry(.014,.018,1.16,8),wood);shaft.position.y=-.54;spear.add(shaft);
 const bladeShape=new T.Shape();bladeShape.moveTo(-.025,.10);bladeShape.quadraticCurveTo(-.09,.26,-.026,.36);bladeShape.quadraticCurveTo(.075,.32,.045,.10);bladeShape.closePath();
 const spearhead=new T.Mesh(new T.ExtrudeGeometry(bladeShape,{depth:.016,bevelEnabled:false}),new T.MeshLambertMaterial({color:'#272c2a'}));spearhead.position.z=-.008;spear.add(spearhead);
 const collar=new T.Mesh(new T.BoxGeometry(.11,.075,.045),new T.MeshLambertMaterial({color:'#dc3539'}));collar.position.y=.065;spear.add(collar);
 for(const [i,color]of ['#ee3b4b','#f6ca43','#6dc64e'].entries()){const ribbon=new T.Mesh(new T.PlaneGeometry(.022,.35+i*.035),new T.MeshLambertMaterial({color,side:T.DoubleSide}));ribbon.position.set((i-1)*.035,-.16-i*.018,.027);ribbon.rotation.z=(i-1)*.12;spear.add(ribbon);}
 caller.group.add(spear);spear.visible=false;
 const whistle=new T.Mesh(new T.BoxGeometry(.032,.025,.065),new T.MeshLambertMaterial({color:'#e8d259'}));whistle.name='Coach_Whistle';coach.group.add(whistle);
 const callerWhistle=whistle.clone();callerWhistle.name='Bow_Caller_Whistle';caller.group.add(callerWhistle);
 function setConstruction(type){
  if(!BOAT_CONSTRUCTIONS.includes(type))throw Error('Unknown boat construction '+type);
  construction=type;constructionDetails.set(type);boat.userData.construction=type;
  styleKey=null;
  const master=roles.caller;master.mixer.stopAllAction();master.clip=motions.animations.find(c=>c.name===(type==='dugout'?'bow-spear':'caller'));master.mixer.clipAction(master.clip).reset().play();
  caller.posture=type==='dugout'?'standing':'seated';caller.group.position.y=type==='dugout'?floor(ROWING_LAYOUT.callerX,0)+soleLift:seatedCallerY;
  callerBoards.forEach(board=>board.visible=type==='plywood');
  spear.visible=type==='dugout';animation.clear();farImages.clear();
 }
 function pose(phase,t,options={}){
  animation.update(phase,t,options);
  for(const a of actors)if(a.paddle){a.paddle.matrix.copy(a.master.paddle.matrixWorld);a.paddle.matrixWorldNeedsUpdate=true;}
  if(spear.visible){spear.matrix.copy(roles.caller.paddle.matrixWorld);spear.matrixWorldNeedsUpdate=true;}
  roles.controller.root.getObjectByName('head').getWorldPosition(whistle.position);whistle.position.add(new T.Vector3(.055,-.10,.17));
  roles.caller.root.getObjectByName('head').getWorldPosition(callerWhistle.position);callerWhistle.position.add(new T.Vector3(.025,-.10,construction==='dugout'?.08:.14));
  boat.updateMatrixWorld(true);
 }
 function project(point){const p=point.clone().project(camera);return [(p.x+1)*W/2,(1-p.y)*H/2];}
 const bow=project(new T.Vector3(15.1,1.38,0)),waterBow=project(new T.Vector3(14.2,.28,0)),stern=project(new T.Vector3(-15.1,.28,0));
 const tips=[],tipVector=new T.Vector3();
 let styleKey,studyOverride,gpuRenders=0,gpuReuses=0;
 const styles=new Map(),farImages=new Map();
 const boatInverse=new T.Matrix4(),accessoryMatrix=new T.Matrix4();
 function render(phase,t,{study=false,posture='seated',kitColor='#23855e',teamId=null,referenceKbach=false,kbachTexture=null,faceVariant=null,skinDetail=1,focus='body',angle='three-quarter',effort=0,viewKey='study',frameId,distance=0,nearest=false,desyncIntensity=0,externalCamera=null,beforeRender=null,connectedKit=false,updateOnly=false,steering=null}={}){
  if(studyOverride){studyOverride.variant=faceFor(studyOverride.id,studyOverride.teamId);studyOverride.skin.geometry=geometryFor(studyOverride.role,studyOverride.variant);studyOverride=null;}
  const team=teamId?window.TukNgoTeams.get(teamId):null,map=team?liveries.get(team.id):null;
  if(team&&!map)throw Error('Team livery is not loaded: '+teamId);
  const kitKey=teamId+'|'+kitColor+'|'+connectedKit,key=kitKey+'|'+referenceKbach+'|'+(kbachTexture?.uuid||'');
  if(styleKey!==key){
   let identitySeed=2166136261;for(const ch of teamId||'prototype')identitySeed=Math.imul(identitySeed^ch.charCodeAt(0),16777619);faceController?.randomize(identitySeed>>>0);
   for(const {mesh} of paintedHull){mesh.material.map=kbachTexture||(referenceKbach||!team?liveries.reference():map);mesh.material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
   for(const mesh of hullEnds)mesh.material.color.set(team?.pattern==='om-scroll'?'#ed6826':'#c83239');
   for(const {mesh,color} of hullInteriors)mesh.material.color.copy(construction==='dugout'?new T.Color('#a86936'):team?.interior?new T.Color(team.interior):color);
   let prepared=styles.get(kitKey);
   if(!prepared){prepared=actors.map(a=>{const palette=athletePalette(team,a.id,a.role,kitColor),variant=faceFor(a.id,teamId);if(connectedKit&&['rower','helm'].includes(a.role))palette.sleeve=palette.jersey;return {palette,variant,geometry:geometryFor(a.role,variant),skin:materials.get(palette),shirt:shirtAsset.material(palette)};});styles.set(kitKey,prepared);}
   actors.forEach((a,i)=>{const p=prepared[i];a.skin.material=p.skin;a.shirt.visible=!!p.palette.sleeve;a.shirt.material=p.shirt;for(const mesh of a.group.children)if(mesh.userData.oldKitPrint)mesh.visible=!p.palette.sleeve;a.teamId=teamId;a.palette=p.palette;a.variant=p.variant;a.skin.geometry=p.geometry;});
   styleKey=key;
  }
  detail.value=T.MathUtils.clamp(skinDetail,0,1);
  helmSteering=steering;pose(strokePhase(phase,effort),t,{viewKey,frameId,distance,nearest,desyncIntensity});
  faceController?.update();
  if(study){
   const target=actors.find(a=>['seated','standing'].includes(posture)?a.role==='rower'&&a.posture===posture&&a.side===-1:a.role===posture);actors.forEach(a=>a.group.visible=a===target);
   boardBatch.visible=false;boards.forEach(board=>board.visible=board.userData.owner===target.id&&(target.id!==1||construction==='plywood'));
   if(Number.isInteger(faceVariant)&&faceVariant>=0&&faceVariant<12){
    target.skin.geometry=geometryFor(target.role,faceVariant);target.variant=faceVariant;studyOverride=target;
   }
   const x=target.group.position.x,y=target.footing+.82;
   const span=focus==='face'?1.3:posture==='helm'?9:5.6;camera.left=-span/2;camera.right=span/2;camera.top=span*H/W/2;camera.bottom=-camera.top;
   const direction={front:[1,.10,0],side:[0,.10,-1],back:[-1,.10,0],'three-quarter':[.65,.18,-.75]}[angle]||[.65,.18,-.75],offset=new T.Vector3(...direction);if(target.role==='caller')offset.x*=-1;
   if(focus==='face'){const head=target.master.skeleton.bones.find(b=>b.name==='head').getWorldPosition(new T.Vector3()).applyMatrix4(target.group.matrixWorld);head.y+=.06;camera.position.copy(head).add(offset);camera.lookAt(head);}else{const center=new T.Vector3(x,y,0);camera.position.copy(center).add(offset.multiplyScalar(3.3)).add(new T.Vector3(0,.45,0));camera.lookAt(center);}camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  }else{actors.forEach(a=>a.group.visible=true);boardBatch.visible=true;boards.forEach(board=>board.visible=board.userData.owner===1&&construction==='plywood');if(!externalCamera)fullCamera();}
  // Instance matrices are local to the boat. A moving/rotating race boat must
  // not apply its world transform to the paddles a second time.
  faceController?.sync(boat,study);
  boatInverse.copy(boat.matrixWorld).invert();
  for(const {batch,entries} of batches){let n=0;for(const {owner,mesh} of entries)if(owner.group.visible)batch.setMatrixAt(n++,accessoryMatrix.multiplyMatrices(boatInverse,mesh.matrixWorld));batch.count=n;batch.instanceMatrix.needsUpdate=true;}
  if(updateOnly)return renderer.domElement;
  const far=!study&&!nearest&&Number.isInteger(frameId)&&distance>animation.distanceThreshold;
  const imageKey=key+'|'+skinDetail,previous=farImages.get(viewKey),reuse=far&&frameId%2&&previous?.key===imageKey&&previous.canvas.width===renderer.domElement.width;
  beforeRender?.();
  if(!reuse){renderer.render(scene,externalCamera||camera);gpuRenders++;}else gpuReuses++;
  tips.length=0;
  for(const a of actors)if(a.role==='rower'&&a.side===-1&&a.group.visible){
   const p=tipVector.set(0,a.posture==='standing'?-1.75:-ROWING_LAYOUT.seatedPaddleLength,0).applyMatrix4(a.paddle.matrixWorld);tips.push({point:project(p),inWater:p.y<.30,world:p.toArray()});
  }
  if(far){
   if(reuse)return previous.canvas;
   let record=previous;
   if(!record){const canvas=document.createElement('canvas');record={canvas,context:canvas.getContext('2d'),key:imageKey};farImages.set(viewKey,record);}
   if(record.canvas.width!==renderer.domElement.width||record.canvas.height!==renderer.domElement.height){record.canvas.width=renderer.domElement.width;record.canvas.height=renderer.domElement.height;}
   record.context.clearRect(0,0,record.canvas.width,record.canvas.height);record.context.drawImage(renderer.domElement,0,0);record.key=imageKey;
   return record.canvas;
  }
  return renderer.domElement;
 }
 // Fit feet/boards using the untouched body above, then replace head triangles.
 // This does not alter any source geometry attribute or the eight pose rigs.
 let faceLibrary;
 const faceFile='../character-comparison/athlete-faces.glb?sha='+athleteFacesDigest;
 if(faces){faceLibrary=await loadModel(faceFile);faceController=createCharacterHeads(faceLibrary,actors,headId);}
 setConstruction('plywood');pose(0,0);faceController?.update();
 return {render,bow,waterBow,stern,tips,actors,roles,boat,scene,renderer,camera,animation,faces:faceController,setConstruction,get construction(){return construction;},kbachLibrary:liveries.library,floorAt:floor,prepareTeams:liveries.load,stats:{revision:'hybrid-v32',athletes:actors.length,geometryVariants:12,faceProfiles:FACE_PROFILES.map(p=>({name:p.name,hair:p.hair,beard:p.beard})),skinTexture:'Official MakeHuman CC0; original UVs and pixels',animation:'continuous-skinned-3d',sharedPoseRigs:roleNames.length,trianglesPerActor:merged.index.count/3,soleLiftM:soleLift},resize(width){const w=Math.min(1600,Math.max(640,Math.round(width)));renderer.setSize(w,Math.round(w*H/W),false);farImages.clear();animation.clear();},getDrawStats(){return {gpuRenders,gpuReuses,poseUpdates:animation.counters.updates,poseRestores:animation.counters.restores,poseUpdatesByView:{...animation.counters.byView},geometryCacheSize:geometryVariants.length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,teamTextures:liveries.textures.size,kitMaterials:materials.size,vertexAttributes:Math.max(...renderer.info.programs.map(p=>Object.values(p.getAttributes()).reduce((sum,a)=>sum+(a.locationSize||1),0))),vertexAttributeLimit:renderer.getContext().getParameter(renderer.getContext().MAX_VERTEX_ATTRIBS)};},dispose(){
   animation.clear();styles.clear();for(const {canvas} of farImages.values()){canvas.width=1;canvas.height=1;}farImages.clear();for(const master of Object.values(roles)){master.mixer.stopAllAction();master.mixer.uncacheRoot(master.root);master.skeleton.dispose();}
   const geometries=new Set(),meshMaterials=new Set(),maps=new Set();
   scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){meshMaterials.add(m);for(const value of Object.values(m))if(value?.isTexture)maps.add(value);}});
   equipment.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)meshMaterials.add(o.material);});
   for(const o of sourcePaddles){geometries.add(o.geometry);meshMaterials.add(o.material);}
   for(const g of paddleGeometry.values())geometries.add(g);for(const d of decals)geometries.add(d.geometry);
   for(const o of boards)geometries.add(o.geometry);geometries.add(merged);for(const g of geometryVariants)geometries.add(g);
    geometries.forEach(g=>g.dispose());for(const slices of floorSlices.values())for(const {mesh}of slices)mesh.geometry.dispose();floorSlices.clear();meshMaterials.forEach(m=>m.dispose());maps.forEach(t=>t.dispose());
   faceController?.dispose();if(faceLibrary){faceLibrary.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});releaseAssetBytes(base+faceFile);}
   shirtAsset.dispose();materials.dispose();liveries.dispose();skinMap.dispose();if(!sharedRenderer)renderer.dispose();
   for(const file of ['shirt-runtime-v32.json','athlete-rig-v27.glb','hull-rig-v25.glb','../athlete-master/athlete-details.glb',motionFile])releaseAssetBytes(base+file);
   scene.clear();
  }};
}
window.createHybridBoats=createHybridBoats;
