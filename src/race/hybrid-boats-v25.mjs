import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {athletePalette,makeAthleteMaterials,shortSleeves,teamTextures} from './hybrid-team-style-v28.mjs';

const W=2400,H=860;
const roleNames=['seated-port','seated-starboard','standing-port','standing-starboard','caller','controller','helm','helm-starboard'];
const v=new T.Vector3(),identity=new T.Matrix4();
const materialCache=new WeakMap();
function materialFrom(m){if(!materialCache.has(m))materialCache.set(m,new T.MeshLambertMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,side:T.DoubleSide,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest}));return materialCache.get(m);}
function regularAttribute(a,type=Float32Array){const array=new type(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)array[i*a.itemSize+k]=a.getComponent(i,k);return new T.BufferAttribute(array,a.itemSize);}

window.createHybridBoats=async function(base=''){
 const loader=new GLTFLoader(),roles={};
 const [model,hull,...motions]=await Promise.all([loader.loadAsync(base+'athlete-rig-v27.glb'),loader.loadAsync(base+'hull-rig-v25.glb'),...roleNames.map(r=>loader.loadAsync(base+'motion-'+r+'-v25.glb'))]);
 model.scene.updateMatrixWorld(true);
 const skins=[];model.scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
 const reference=skins[0],jointNames=reference.skeleton.bones.map(b=>b.name),solid=[],decals=[];
 for(const skin of skins){
  const g=skin.geometry.clone().applyMatrix4(skin.bindMatrix);
  for(const n of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(n))g.deleteAttribute(n);
  for(const n of ['position','normal','uv','skinIndex','skinWeight','color'])if(g.getAttribute(n))g.setAttribute(n,regularAttribute(g.getAttribute(n),n==='skinIndex'?Uint16Array:Float32Array));
  const joints=g.getAttribute('skinIndex');for(let i=0;i<joints.count;i++)for(let k=0;k<4;k++)joints.setComponent(i,k,jointNames.indexOf(skin.skeleton.bones[joints.getComponent(i,k)].name));
  const source=g.getAttribute('color'),color=new Float32Array(g.attributes.position.count*3);
  const materialColor=skin.material.name==='Painted_Skin_V25'?[.56,.31,.15]:skin.material.color.toArray();for(let i=0;i<g.attributes.position.count;i++)for(let k=0;k<3;k++)color[i*3+k]=materialColor[k]*(source?source.getComponent(i,k):1);
  g.setAttribute('color',new T.BufferAttribute(color,3));
  const zone=new Float32Array(g.attributes.position.count),zones={Painted_Skin_V25:1,White_Cotton_Cap:2,Painted_Vest_V25:3,Painted_Ivory_Binding_V25:5,Painted_Shorts_V25:6};zone.fill(zones[skin.material.name]||0);g.setAttribute('paintZone',new T.BufferAttribute(zone,1));
  if(skin.material.name==='Painted_Ivory_Binding_V25'){g.computeBoundingBox();if(g.boundingBox.min.x>.11||g.boundingBox.max.x<-.11)zone.fill(8);}
  const blend=new Float32Array(g.attributes.position.count),p=g.attributes.position;for(let i=0;i<p.count;i++)blend[i]=T.MathUtils.smoothstep(p.getY(i),.86,1.30);g.setAttribute('shirtMix',new T.BufferAttribute(blend,1));
  if(!g.getAttribute('uv'))g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(skin.material.map&&skin.material.name!=='Painted_Skin_V25')decals.push({geometry:g,material:materialFrom(skin.material)});else solid.push(g);
  if(skin.material.name==='Painted_Skin_V25')solid.push(shortSleeves(g,jointNames,reference.skeleton));
 }
 const merged=mergeGeometries(solid,false);solid.forEach(g=>g.dispose());if(!merged)throw Error('Cannot merge continuous athlete skin');
 merged.setAttribute('paintUV',merged.attributes.uv);
 const skinMap=skins.find(s=>s.material.name==='Painted_Skin_V25')?.material.map;if(!skinMap)throw Error('Anatomical skin/UV source is missing');skinMap.colorSpace=T.SRGBColorSpace;skinMap.flipY=false;
 const detail={value:1};
 const materials=makeAthleteMaterials(skinMap,detail),liveries=teamTextures(base);
 const skinMaterial=materials.get(athletePalette(null,0,'rower','#23855e'));
 const roleGeometry=new Map();
 const headId=jointNames.indexOf('head'),headInverse=reference.skeleton.boneInverses[headId],headBind=headInverse.clone().invert();
 const headNormalInverse=new T.Matrix3().getNormalMatrix(headInverse),headNormalBind=new T.Matrix3().getNormalMatrix(headBind),normalProbe=new T.Vector3(),headAxis=new T.Vector3(0,1,0);
 const geometryVariants=[];
 for(let variant=0;variant<12;variant++){
  const g=merged.clone(),p=g.attributes.position,normals=g.attributes.normal,colors=g.attributes.color,index=g.attributes.skinIndex,weight=g.attributes.skinWeight,zone=g.attributes.paintZone,sx=.92+(variant%6)*.031,sz=.94+(variant%4)*.031;
  for(let i=0;i<p.count;i++){
   if(zone.getX(i)===1){const shade=.89+(variant%4)*.065;colors.setXYZ(i,colors.getX(i)*shade,colors.getY(i)*shade,colors.getZ(i)*shade);}
   let h=0;for(let k=0;k<4;k++)if(index.getComponent(i,k)===headId)h+=weight.getComponent(i,k);
   if(h<.55)continue;
   v.fromBufferAttribute(p,i).applyMatrix4(headInverse);v.x*=sx;v.z*=sz;
   normalProbe.fromBufferAttribute(normals,i).applyMatrix3(headNormalInverse);normalProbe.x/=sx;normalProbe.z/=sz;
   if(zone.getX(i)===1&&v.y>.061&&(v.z<-.008||Math.abs(v.x)>.065)){colors.setXYZ(i,.022,.016,.012);}
   if(zone.getX(i)===2&&variant%3!==0){v.applyAxisAngle(headAxis,Math.PI);normalProbe.applyAxisAngle(headAxis,Math.PI);}
   v.applyMatrix4(headBind);p.setXYZ(i,v.x,v.y,v.z);
   normalProbe.applyMatrix3(headNormalBind).normalize();normals.setXYZ(i,normalProbe.x,normalProbe.y,normalProbe.z);
  }
  // Preserve Blender's shared smooth normals at UV seams. Recalculating after
  // export splits equal-position vertices into hard shading patches.
  g.computeBoundingSphere();geometryVariants.push(g);
 }
 const scene=new T.Scene(),boat=new T.Group();scene.add(boat);
 scene.add(new T.HemisphereLight('#fff8e4','#d7c5a4',2.1));const sun=new T.DirectionalLight('#ffedcd',1.05);sun.position.set(5,12,-8);scene.add(sun);
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
 renderer.setSize(1600,Math.round(1600*H/W),false);
 const camera=new T.OrthographicCamera(-15.8,18.7,34.5*H/W/2,-34.5*H/W/2,.1,120);
 function fullCamera(){camera.left=-15.8;camera.right=18.7;camera.top=34.5*H/W/2;camera.bottom=-camera.top;camera.position.set(9,13.2,-28);camera.lookAt(0,-.8,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 fullCamera();
 hull.scene.updateMatrixWorld(true);const hullBody=hull.scene.getObjectByName('Hull_Watertight_30_20x1_12');
 const texture=await new T.TextureLoader().loadAsync(base+'hull-slim-bow-v23.webp');texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;
 const paintCanvas=document.createElement('canvas');paintCanvas.width=texture.image.width;paintCanvas.height=texture.image.height;const pc=paintCanvas.getContext('2d');pc.drawImage(texture.image,0,0);const pixels=pc.getImageData(0,0,paintCanvas.width,paintCanvas.height).data,bands=new Map();
 function bandAt(column){
  const x=T.MathUtils.clamp(Math.round(column),0,paintCanvas.width-1);if(bands.has(x))return bands.get(x);
  let top=paintCanvas.height,bottom=0,rail=-1;
  for(let y=0;y<paintCanvas.height;y++){const i=(y*paintCanvas.width+x)*4;if(pixels[i+3]<160)continue;top=Math.min(top,y);bottom=y;if(pixels[i]>120&&pixels[i]>pixels[i+1]*1.6&&pixels[i]>pixels[i+2]*1.6)rail=y;}
  const value=[rail>=0?Math.max(top,rail-3):top,Math.max(bottom,top+1)];bands.set(x,value);return value;
 }
 const paintedHull=[],hullInteriors=[],hullEnds=[];
 hull.scene.traverse(o=>{
  if(!o.isMesh)return;
  if(/Bench|Command_Platform/.test(o.name)){o.visible=false;return;}
  const old=o.material;o.material=materialFrom(old);
  if(old.map&&hullBody){
   const g=o.geometry.clone(),uv=g.attributes.uv,p=g.attributes.position,originalUV=uv.clone();
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const sourceX=T.MathUtils.clamp((15.1-v.x)/30.2*2120+30,30,2150),band=bandAt(sourceX),depth=T.MathUtils.clamp(uv.getY(i),0,1);
    uv.setXY(i,sourceX/paintCanvas.width,(band[0]+(band[1]-band[0])*depth)/paintCanvas.height);
   }
   o.geometry=g;o.material.map=texture;o.material.color.set('white');paintedHull.push({mesh:o,originalUV,paintedUV:uv});
  }else if(/Wood|Timber|Rib|Beam/.test(old.name))o.material.color.set('#b9844d');
  if(/Red_Integrated_Prow|Red_Integrated_Stern/.test(o.name))hullEnds.push(o);
  // The optimized hull GLB strips material names. Identify its two untextured
  // inner primitives by ancestry, and isolate them from shared timber paint.
  let ancestor=o;while(ancestor&&ancestor!==hullBody)ancestor=ancestor.parent;
  if(!old.map&&ancestor===hullBody){o.material=o.material.clone();hullInteriors.push({mesh:o,color:o.material.color.clone()});}
 });
 boat.add(hull.scene);
 // Keep the real hull depth. A depth-only water plane hides submerged mesh
 // while preserving the painted water behind the transparent WebGL layer.
 const waterShape=new T.Shape();waterShape.moveTo(-50,-15);waterShape.lineTo(50,-15);waterShape.lineTo(50,15);waterShape.lineTo(-50,15);waterShape.closePath();
 const widthPoints=[[-15.1,.025],[-13,.24],[-10,.405],[-5,.545],[0,.585],[5,.555],[10,.435],[13,.26],[15.1,.025]],hole=new T.Path();
 hole.moveTo(widthPoints[0][0],widthPoints[0][1]);for(const [x,w] of widthPoints.slice(1))hole.lineTo(x,w);for(const [x,w] of [...widthPoints].reverse())hole.lineTo(x,-w);hole.closePath();waterShape.holes.push(hole);
 const plane=new T.Mesh(new T.ShapeGeometry(waterShape),new T.MeshBasicMaterial({colorWrite:false,side:T.DoubleSide}));plane.rotation.x=-Math.PI/2;plane.position.y=.28;plane.renderOrder=-10;scene.add(plane);
 for(let i=0;i<roleNames.length;i++){
  const root=clone(model.scene);root.visible=false;scene.add(root);root.updateMatrixWorld(true);
  let first;root.traverse(o=>{if(o.isSkinnedMesh&&!first)first=o;});
  const mixer=new T.AnimationMixer(root),clip=motions[i].animations[0];if(!clip)throw Error('Missing continuous '+roleNames[i]);mixer.clipAction(clip).play();
  roles[roleNames[i]]={root,skeleton:first.skeleton,mixer,clip,paddle:root.getObjectByName('Dam_Wood_152cm')};
 }
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),actors=[],boards=[],paddleGeometry=new Map();
 function floor(x,z){ray.set(new T.Vector3(x,3,z),down);const hits=ray.intersectObject(hullBody,true);return hits.length?hits[0].point.y+.015:.07;}
 const wood=new T.MeshLambertMaterial({color:'#b78550'});
 function actor(id,x,side,posture,role='rower'){
  const key=role==='rower'?posture+(side<0?'-port':'-starboard'):role==='helm'&&side>0?'helm-starboard':role,master=roles[key],group=new T.Group();
  group.name='Hybrid_Athlete_'+id;group.position.set(x,0,role==='rower'?side*.16:0);group.rotation.y=role==='caller'?-Math.PI/2:Math.PI/2;
  const forward=role==='caller'?-1:1,footing=Math.max(floor(x+forward*.12,group.position.z-.14),floor(x+forward*.12,group.position.z+.14))+(role==='controller'?.16:0);group.position.y=footing;
  const variant=id%12;let geometry=geometryVariants[variant];
  if(['caller','controller'].includes(role)){
   const key=role+variant;if(!roleGeometry.has(key)){
    const g=geometry.clone(),c=g.attributes.color,zone=g.attributes.paintZone,tone=new T.Color(role==='caller'?'#8d965c':'#73aebd');
    for(let i=0;i<c.count;i++)if(zone.getX(i)===3){c.setXYZ(i,tone.r,tone.g,tone.b);zone.setX(i,4);}roleGeometry.set(key,g);
   }geometry=roleGeometry.get(key);
  }
  const skin=new T.SkinnedMesh(geometry,skinMaterial);skin.bindMode='detached';skin.bind(master.skeleton,identity);skin.frustumCulled=false;group.add(skin);
  for(const d of decals){const mesh=new T.SkinnedMesh(d.geometry,d.material);mesh.bindMode='detached';mesh.bind(master.skeleton,identity);mesh.frustumCulled=false;group.add(mesh);}
  let paddle;
  if(!['caller','controller'].includes(role)){
   paddle=master.paddle.clone(true);paddle.matrixAutoUpdate=false;
   const length=role==='helm'?4.2:posture==='standing'?1.75:1.52;
   if(length!==1.52)paddle.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+length;if(!paddleGeometry.has(key)){
    const g=o.geometry.clone(),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i);if(/Blade/.test(o.name))p.setY(i,y-(length-1.52));else if(/Shaft/.test(o.name)&&y<-.53)p.setY(i,-.53+(y+.53)*(length-.48-.53)/(1.04-.53));}
    g.computeVertexNormals();paddleGeometry.set(key,g);
   }o.geometry=paddleGeometry.get(key);
   });
   paddle.traverse(o=>{if(o.isMesh)o.material=materialFrom(o.material);});group.add(paddle);
  }
  // A real crosswise footboard supports the soles inside the hull.
  const board=new T.Mesh(new T.BoxGeometry(role==='controller'?.65:.40,role==='controller'?.18:.023,role==='controller'?.65:.34),wood);board.position.set(x+forward*.14,footing-(role==='controller'?.09:.012),group.position.z);boat.add(board);boards.push(board);
  if(posture==='seated'){const seat=new T.Mesh(new T.BoxGeometry(.18,.03,.40),wood);seat.position.set(x,footing+.515,group.position.z);boat.add(seat);boards.push(seat);}
  boat.add(group);actors.push({id,group,master,paddle,role,posture,side,variant,footing,skin,baseGeometry:geometry});
 }
 for(let row=0;row<25;row++)for(const side of [-1,1])actor(2+row*2+(side>0?1:0),10-row*20/24,side,row<8?'seated':'standing');
 actor(1,10.65,0,'seated','caller');actor(52,3.2,0,'standing','controller');for(let i=0;i<3;i++)actor(53+i,-10.8-i*.8,i%2?1:-1,'standing','helm');
 boat.updateMatrixWorld(true);
 const boardParts=boards.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)),boardGeometry=mergeGeometries(boardParts,false);boardParts.forEach(g=>g.dispose());
 const boardBatch=new T.Mesh(boardGeometry,wood);boat.add(boardBatch);boards.forEach(o=>o.visible=false);
 const accessories=new Map();
 for(const a of actors)if(a.paddle)a.paddle.traverse(mesh=>{if(!mesh.isMesh)return;const key=mesh.geometry.uuid+mesh.material.uuid;if(!accessories.has(key))accessories.set(key,[]);accessories.get(key).push({owner:a,mesh});mesh.visible=false;});
 const batches=[...accessories.values()].map(entries=>{const batch=new T.InstancedMesh(entries[0].mesh.geometry,entries[0].mesh.material,entries.length);batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);boat.add(batch);return {batch,entries};});
 function pose(phase,t){
  for(const [name,master] of Object.entries(roles)){master.mixer.setTime((name.startsWith('helm')?((t*.20)%1+1)%1:phase)*master.clip.duration);master.root.updateMatrixWorld(true);master.skeleton.update();}
  for(const a of actors)if(a.paddle){a.paddle.matrix.copy(a.master.paddle.matrixWorld);a.paddle.matrixWorldNeedsUpdate=true;}
  boat.updateMatrixWorld(true);
 }
 function project(point){const p=point.clone().project(camera);return [(p.x+1)*W/2,(1-p.y)*H/2];}
 const bow=project(new T.Vector3(15.1,1.38,0)),waterBow=project(new T.Vector3(14.2,.28,0)),stern=project(new T.Vector3(-15.1,.28,0));
 const tips=[];
 function render(phase,t,{study=false,posture='seated',kitColor='#23855e',teamId=null,faceVariant=null,skinDetail=1,focus='body'}={}){
  const team=teamId?window.TukNgoTeams.get(teamId):null,map=team?liveries.get(team.id):null;
  if(team&&!map)throw Error('Team livery is not loaded: '+teamId);
  for(const {mesh,originalUV,paintedUV} of paintedHull){mesh.geometry.setAttribute('uv',team?originalUV:paintedUV);mesh.material.map=team?map:texture;}
  for(const mesh of hullEnds)mesh.material.color.set(team?.pattern==='om-scroll'?'#ed6826':'#c83239');
  for(const {mesh,color} of hullInteriors)mesh.material.color.copy(team?.interior?new T.Color(team.interior):color);
  for(const a of actors){const palette=athletePalette(team,a.id,a.role,kitColor);a.skin.material=materials.get(palette);a.teamId=teamId;a.palette=palette;}
  detail.value=T.MathUtils.clamp(skinDetail,0,1);actors.forEach(a=>a.skin.geometry=a.baseGeometry);
  pose(phase,t);
  if(study){
   const target=actors.find(a=>['seated','standing'].includes(posture)?a.role==='rower'&&a.posture===posture&&a.side===-1:a.role===posture);actors.forEach(a=>a.group.visible=a===target);
   if(Number.isInteger(faceVariant)&&faceVariant>=0&&faceVariant<12){
    let geometry=geometryVariants[faceVariant];
    if(['caller','controller'].includes(target.role)){
     const key=target.role+faceVariant;
     if(!roleGeometry.has(key)){const g=geometry.clone(),c=g.attributes.color,zone=g.attributes.paintZone,tone=new T.Color(target.role==='caller'?'#8d965c':'#73aebd');for(let i=0;i<c.count;i++)if(zone.getX(i)===3){c.setXYZ(i,tone.r,tone.g,tone.b);zone.setX(i,4);}roleGeometry.set(key,g);}geometry=roleGeometry.get(key);
    }target.skin.geometry=geometry;
   }
   const x=target.group.position.x,y=target.footing+.82;
   const span=focus==='face'?1.3:posture==='helm'?9:5.6;camera.left=-span/2;camera.right=span/2;camera.top=span*H/W/2;camera.bottom=-camera.top;
   if(focus==='face'){const head=target.master.skeleton.bones.find(b=>b.name==='head').getWorldPosition(new T.Vector3()).applyMatrix4(target.group.matrixWorld);head.y+=.06;camera.position.copy(head).add(new T.Vector3(target.role==='caller'?-.65:.65,.18,-.75));camera.lookAt(head);}else{camera.position.set(x+1.4,y+1.05,-3.3);camera.lookAt(x,y,0);}camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  }else{actors.forEach(a=>a.group.visible=true);fullCamera();}
  for(const {batch,entries} of batches){let n=0;for(const {owner,mesh} of entries)if(owner.group.visible)batch.setMatrixAt(n++,mesh.matrixWorld);batch.count=n;batch.instanceMatrix.needsUpdate=true;}
  renderer.render(scene,camera);
  tips.length=0;
  for(const a of actors.filter(a=>a.role==='rower'&&a.side===-1&&a.group.visible)){
   const p=new T.Vector3(0,a.posture==='standing'?-1.75:-1.52,0).applyMatrix4(a.paddle.matrixWorld);tips.push({point:project(p),inWater:p.y<.30,world:p.toArray()});
  }
  return renderer.domElement;
 }
 pose(0,0);
 // The anatomical ankle is not the sole. Measure the deformed foot surface
 // once, then align the actors by its exact bind-to-sole offset onto the boards.
 const footIds=jointNames.map((name,i)=>/^foot_|^ball_|^toe_/.test(name)?i:-1).filter(i=>i>=0),probe=actors[0].group.children.find(o=>o.isSkinnedMesh),weights=probe.geometry.attributes.skinWeight,joints=probe.geometry.attributes.skinIndex;
 let sole=Infinity;
 for(let i=0;i<joints.count;i++){let amount=0;for(let k=0;k<4;k++)if(footIds.includes(joints.getComponent(i,k)))amount+=weights.getComponent(i,k);if(amount>.65)sole=Math.min(sole,probe.getVertexPosition(i,new T.Vector3()).y);}
 const soleLift=Number.isFinite(sole)?.002-sole:0;for(const a of actors)a.group.position.y+=soleLift;boat.updateMatrixWorld(true);
 return {render,bow,waterBow,stern,tips,actors,roles,boat,scene,renderer,camera,prepareTeams:liveries.load,stats:{revision:'hybrid-v30',athletes:actors.length,geometryVariants:12,skinTexture:'Official MakeHuman CC0; original UVs and pixels',animation:'continuous-skinned-3d',sharedPoseRigs:roleNames.length,trianglesPerActor:merged.index.count/3,soleLiftM:soleLift},resize(width){const w=Math.min(1600,Math.max(640,Math.round(width)));renderer.setSize(w,Math.round(w*H/W),false);},getDrawStats(){return {triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,teamTextures:liveries.textures.size,kitMaterials:materials.size};},dispose(){renderer.dispose();merged.dispose();geometryVariants.forEach(g=>g.dispose());roleGeometry.forEach(g=>g.dispose());texture.dispose();skinMap.dispose();materials.dispose();liveries.dispose();}};
};
