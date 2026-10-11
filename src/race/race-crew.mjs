import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {DEFAULT_TEAM_IDS,team2025} from './teams-2025.mjs';
import {loadTeamLiveries,applyTeamIdentity} from './team-style-2025.mjs';


// Rendering-only consolidation. The persisted GLB vertices, weights, inverse
// binds and animation remain the source of the two racing crews.
export function optimizeRaceBoat(root,jerseyColor){
 root.updateMatrixWorld(true);
 const actors=[],paddles=[],ownedGeometry=[],ownedMaterials=[],skinCache=new Map();
 root.traverse(o=>{if(/^Athlete_\d+_/.test(o.name)&&o.userData.component==='athlete')actors.push(o);if(o.userData.component==='paddle')paddles.push(o);});
 // V11 garment material names survive Blender's shared mesh LOD. Clone only
 // the team colour slots so both teams retain their own recognizable kit.
 if(jerseyColor){const tinted=new Map();root.traverse(o=>{if(!o.isMesh)return;const tint=m=>{if(!/^Competition_Green_Fabric|^Green_Ribbed_Binding/.test(m.name))return m;if(!tinted.has(m)){const c=m.clone();c.color.set(jerseyColor);tinted.set(m,c);ownedMaterials.push(c);}return tinted.get(m);};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);});}
 const skinMaterials=new Map();
 let mergedActors=0;
 for(const actor of actors){
  const allSkins=[];actor.traverse(o=>{if(o.isSkinnedMesh)allSkins.push(o);});
  let skins=allSkins;
  // V11 keeps the licensed skin and Khmer print as distinct textured surfaces.
  // Merge the compatible solid garment primitives without dropping those maps.
  if(!allSkins[0]?.material?.userData?.athleteAtlas){const groups=new Map();for(const skin of allSkins){if(Array.isArray(skin.material)||skin.material.map||skin.morphTargetInfluences)continue;const key=skin.parent.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(skin);}skins=[...groups.values()].sort((a,b)=>b.length-a.length)[0]||[];}
  if(skins.length<2)continue;
  const first=skins[0];if(!first)continue;
  // Atlas-backed skins can share one draw call only when all maps and PBR
  // settings match. Arbitrary source materials still remain separate.
  const atlas=first.material.map&&first.material.userData.athleteAtlas;
  const compatible=skins.every(s=>s.parent===first.parent&&s.matrix.equals(first.matrix)&&s.bindMatrix.equals(first.bindMatrix)&&s.skeleton.bones.every((b,i)=>b===first.skeleton.bones[i])&&!Array.isArray(s.material)&&!s.morphTargetInfluences&&
   (atlas?s.material.userData.athleteAtlas===atlas&&['map','normalMap','roughnessMap','metalnessMap'].every(k=>s.material[k]===first.material[k])&&s.material.normalScale.equals(first.material.normalScale)&&s.material.roughness===first.material.roughness&&s.material.metalness===first.material.metalness&&!s.material.transparent:!s.material.map));
  if(!compatible)continue;
  const materialKey=atlas?first.material.map.uuid:'untextured';
  if(!skinMaterials.has(materialKey)){
   const material=atlas?first.material.clone():new T.MeshStandardMaterial({roughness:.9,side:T.DoubleSide});
   material.color.set('white');material.vertexColors=true;material.side=T.DoubleSide;
   skinMaterials.set(materialKey,material);ownedMaterials.push(material);
  }
  const skinMaterial=skinMaterials.get(materialKey);
  const key=skins.map(s=>s.geometry.uuid+':'+s.material.color.getHexString()).join('|')+':'+(jerseyColor||'original');
  let geometry=skinCache.get(key);
  if(!geometry){
   const parts=skins.map(s=>{
    const g=s.geometry.clone();for(const name of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight',...(atlas?['tangent']:[])].includes(name))g.deleteAttribute(name);
    if(!g.getAttribute('uv'))g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const sourceUv=g.getAttribute('uv'),uv=new Float32Array(sourceUv.count*2);
    for(let i=0;i<sourceUv.count;i++){uv[i*2]=sourceUv.getX(i);uv[i*2+1]=sourceUv.getY(i);}g.setAttribute('uv',new T.BufferAttribute(uv,2));
    // glTF quantizes JOINTS differently for body and cloth. Decode values
    // through attribute getters, including normalized weights, before merging.
    for(const name of ['skinIndex','skinWeight']){const a=g.getAttribute(name),values=name==='skinIndex'?new Uint16Array(a.count*4):new Float32Array(a.count*4);for(let i=0;i<a.count;i++){values[i*4]=a.getX(i);values[i*4+1]=a.getY(i);values[i*4+2]=a.getZ(i);values[i*4+3]=a.getW(i);}g.setAttribute(name,new T.BufferAttribute(values,4));}
    const isJersey=s.userData.name==='Athlete_jersey'||/^Athlete_jersey(?:_\d+)?$/.test(s.name);
    const color=isJersey&&jerseyColor?new T.Color(jerseyColor):s.material.color,source=s.geometry.getAttribute('color'),colors=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<g.attributes.position.count;i++){colors[i*3]=color.r*(source?source.getX(i):1);colors[i*3+1]=color.g*(source?source.getY(i):1);colors[i*3+2]=color.b*(source?source.getZ(i):1);}
    g.setAttribute('color',new T.BufferAttribute(colors,3));return g;
   });
   geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
   if(!geometry)throw Error('Không gộp được mesh VĐV');skinCache.set(key,geometry);ownedGeometry.push(geometry);
  }
  const skin=new T.SkinnedMesh(geometry,skinMaterial);skin.name=actor.name+'_RaceSkin';skin.position.copy(first.position);skin.quaternion.copy(first.quaternion);skin.scale.copy(first.scale);skin.bind(first.skeleton,first.bindMatrix);skin.frustumCulled=false;first.parent.add(skin);skins.forEach(s=>s.visible=false);mergedActors++;
 }
 const rigid=[],staticGroups=new Map(),dynamicGroups=new Map(),inverse=root.matrixWorld.clone().invert();
 root.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o.visible&&!o.isInstancedMesh)rigid.push(o);});
 for(const mesh of rigid){
  let animated=false;for(let p=mesh.parent;p&&p!==root;p=p.parent)if(p.isBone||p.userData.component==='athlete'||p.userData.component==='paddle'){animated=true;break;}
  if(Array.isArray(mesh.material))continue;
  const key=animated?mesh.geometry.uuid+':'+mesh.material.uuid:mesh.material.uuid;
  const groups=animated?dynamicGroups:staticGroups;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 }
 let mergedStatic=0;
 for(const meshes of staticGroups.values()){
  const material=meshes[0].material,parts=meshes.map(m=>{
   const g=m.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));
   for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);
   if(!g.getAttribute('uv'))g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;
  });
  for(const g of parts)for(const name of ['position','normal','uv']){const a=g.getAttribute(name),values=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++){values[i*a.itemSize]=a.getX(i);values[i*a.itemSize+1]=a.getY(i);if(a.itemSize===3)values[i*a.itemSize+2]=a.getZ(i);}g.setAttribute(name,new T.BufferAttribute(values,a.itemSize));}
  const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)continue;
  ownedGeometry.push(geometry);const mesh=new T.Mesh(geometry,material);mesh.name='RaceStatic_'+material.uuid;root.add(mesh);meshes.forEach(m=>m.visible=false);mergedStatic++;
 }
 const batches=[];
 for(const meshes of dynamicGroups.values()){
  const batch=new T.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);batch.name='RaceAccessories_'+meshes[0].name;batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(batch);meshes.forEach(m=>m.visible=false);batches.push({batch,meshes});
 }
 const matrix=new T.Matrix4(),rootInverse=new T.Matrix4();
 function updateInstances(){root.updateMatrixWorld(true);rootInverse.copy(root.matrixWorld).invert();for(const {batch,meshes} of batches){for(let i=0;i<meshes.length;i++){matrix.multiplyMatrices(rootInverse,meshes[i].matrixWorld);batch.setMatrixAt(i,matrix);}batch.instanceMatrix.needsUpdate=true;}}
 const actorById=new Map(actors.map(a=>[a.userData.id,a]));
 const athletes=paddles.filter(p=>/^Paddle_\d+$/.test(p.name)).map(p=>{const actor=actorById.get(p.userData.id??Number(p.name.slice(7)));return {role:'ROWER',posture:actor?.userData.posture||'seated',root:actor||{name:p.name},paddle:p};});
 updateInstances();
 return {root,athletes,actors,accessoryBatches:batches,updateInstances,stats:{actors:actors.length,mergedActors,staticBatches:mergedStatic,dynamicBatches:batches.length},dispose(){ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());batches.forEach(({batch})=>batch.dispose());}};
}

export async function loadRaceCrews(url){
 const base=url.slice(0,url.indexOf('assets/ghe-ngo/'));
 const [gltf,liveries]=await Promise.all([new GLTFLoader().loadAsync(url),loadTeamLiveries(base)]),clip=gltf.animations[0];if(!clip)throw Error('GLB thiếu chu kỳ chèo');
 function makeTeam(id,i){
  const root=clone(gltf.scene);root.name='RaceTeam_'+(i+1);root.userData.spec={...root.userData.spec,paddleLength:root.userData.spec?.paddleLength||1.52};
  root.traverse(o=>{if(o.userData.component==='paddle'&&o.userData.lengthM)o.userData.length=o.userData.lengthM;});
  const style=applyTeamIdentity(root,id,liveries),boat=optimizeRaceBoat(root),mixer=new T.AnimationMixer(root),baseAction=mixer.clipAction(clip).play(),sprintClip=gltf.animations.find(a=>a.name.startsWith('Rowing_Sprint_')),sprintAction=sprintClip?mixer.clipAction(sprintClip).play():null;
  sprintAction?.setEffectiveWeight(0);
  return {...boat,identity:style.team,mixer,phase:i?.17:.28,pose(phase,strength=0){const power=sprintAction?T.MathUtils.clamp(strength,0,1):0;baseAction.setEffectiveWeight(1-power);sprintAction?.setEffectiveWeight(power);mixer.setTime(phase*clip.duration);boat.updateInstances();},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);boat.dispose();style.dispose();root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}};
 }
 const teams=DEFAULT_TEAM_IDS.map(makeTeam);
 const resources={geometry:new Set(),material:new Set(),texture:new Set(),skeleton:new Set()};
 gltf.scene.traverse(o=>{if(o.geometry)resources.geometry.add(o.geometry);if(o.isSkinnedMesh)resources.skeleton.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){resources.material.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.texture.add(value);}});
 return {teams,setTeamIdentity(i,id){
  team2025(id);if(![0,1].includes(i))throw Error('Unknown lane');if(teams[1-i].identity.id===id)throw Error('Hai làn cần hai đội khác nhau');
  const previous=teams[i];if(previous.identity.id===id)return previous;
  const next=makeTeam(id,i);next.phase=previous.phase;next.root.position.copy(previous.root.position);next.root.quaternion.copy(previous.root.quaternion);next.root.scale.copy(previous.root.scale);next.pose(next.phase);
  const parent=previous.root.parent;parent?.remove(previous.root);parent?.add(next.root);teams[i]=next;previous.dispose();return next;
 },async exportTeam(i){
  // Serve the validated baked asset. Avoid baking 55 rigs and textures in
  // tablet memory or pausing a live race during GLTFExporter processing.
  if(!teams[i])throw Error('Unknown lane');
  const response=await fetch(base+'assets/ghe-ngo/teams-2025/'+teams[i].identity.id+'-2025.glb');
  if(!response.ok)throw Error('GLB download HTTP '+response.status);
  return await response.arrayBuffer();
 },dispose(){teams.forEach(t=>t.dispose());for(const list of Object.values(resources))for(const r of list)r.dispose();liveries.dispose();},clipDuration:clip.duration};
}

export function buildBoatWake(scene,waterY){
 // A tapering foam trail and contact shadow; no opaque rectangle on the water.
 const points=[],uv=[],indices=[];const n=28;
 for(let i=0;i<=n;i++){const t=i/n,x=-14-t*24,w=.44+t*3.7;points.push(x,0,-w,x,0,w);uv.push(t,0,t,1);if(i<n){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float edge=abs(vUv.y-.5)*2.;float arms=exp(-pow((edge-.68)*17.,2.));float noise=.5+.5*sin(vUv.x*100.-uTime*9.+sin(vUv.y*37.));float foam=(arms*.36+pow(noise,5.)*(1.-edge)*.13)*pow(1.-vUv.x,1.6)*smoothstep(0.,.07,vUv.x);gl_FragColor=vec4(.78,.81,.68,foam);}' });
 const mesh=new T.Mesh(g,m);mesh.position.y=waterY+.028;scene.add(mesh);
 const shadow=new T.Mesh(new T.PlaneGeometry(31,2),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=max(0.,1.-p.x*p.x)*exp(-p.y*p.y*8.)*smoothstep(.54,.68,abs(p.y));gl_FragColor=vec4(.12,.10,.05,a*.26);}'}));shadow.rotation.x=-Math.PI/2;shadow.position.y=waterY+.009;scene.add(shadow);
 return {update(root,time,moving){mesh.position.x=root.position.x;mesh.position.z=root.position.z;m.uniforms.uTime.value=time;mesh.visible=moving;shadow.position.x=root.position.x;shadow.position.z=root.position.z;},dispose(){g.dispose();m.dispose();shadow.geometry.dispose();shadow.material.dispose();scene.remove(mesh,shadow);}};
}
