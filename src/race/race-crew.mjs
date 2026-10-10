import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';


// Rendering-only consolidation. The persisted V6 vertices, weights, inverse
// binds and animation remain the source of the two racing crews.
export function optimizeRaceBoat(root,jerseyColor){
 root.updateMatrixWorld(true);
 const actors=[],paddles=[],ownedGeometry=[],ownedMaterials=[],skinCache=new Map();
 root.traverse(o=>{if(/^Athlete_\d+_/.test(o.name)&&o.userData.component==='athlete')actors.push(o);if(o.userData.component==='paddle')paddles.push(o);});
 const skinMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide});ownedMaterials.push(skinMaterial);
 let mergedActors=0;
 for(const actor of actors){
  const skins=[];actor.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
  const first=skins[0];if(!first)continue;
  // Never merge incompatible bind spaces, textured or morphed meshes.
  const compatible=skins.every(s=>s.parent===first.parent&&s.matrix.equals(first.matrix)&&s.bindMatrix.equals(first.bindMatrix)&&s.skeleton.bones.every((b,i)=>b===first.skeleton.bones[i])&&!Array.isArray(s.material)&&!s.material.map&&!s.morphTargetInfluences);
  if(!compatible)continue;
  const key=skins.map(s=>s.geometry.uuid+':'+s.material.color.getHexString()).join('|')+':'+(jerseyColor||'original');
  let geometry=skinCache.get(key);
  if(!geometry){
   const parts=skins.map(s=>{
    const g=s.geometry.clone();for(const name of Object.keys(g.attributes))if(!['position','normal','skinIndex','skinWeight'].includes(name))g.deleteAttribute(name);
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
 const athletes=paddles.filter(p=>/^Paddle_\d+$/.test(p.name)).map(p=>({role:'ROWER',root:{name:p.name},paddle:p}));
 updateInstances();
 return {root,athletes,actors,accessoryBatches:batches,updateInstances,stats:{actors:actors.length,mergedActors,staticBatches:mergedStatic,dynamicBatches:batches.length},dispose(){ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());batches.forEach(({batch})=>batch.dispose());}};
}

export async function loadRaceCrews(url){
 const gltf=await new GLTFLoader().loadAsync(url),clip=gltf.animations[0];if(!clip)throw Error('GLB thiếu chu kỳ chèo');
 const teams=[undefined,'#df8f29'].map((shirt,i)=>{
  const root=clone(gltf.scene);root.name='RaceTeam_'+(i+1);root.userData.spec={paddleLength:1.22};
  const boat=optimizeRaceBoat(root,shirt),mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();
  return {...boat,mixer,phase:i?.17:.28,pose(phase){mixer.setTime(phase*clip.duration);boat.updateInstances();},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);boat.dispose();}};
 });
 const resources={geometry:new Set(),material:new Set(),texture:new Set(),skeleton:new Set()};
 gltf.scene.traverse(o=>{if(o.geometry)resources.geometry.add(o.geometry);if(o.isSkinnedMesh)resources.skeleton.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){resources.material.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.texture.add(value);}});
 return {teams,dispose(){teams.forEach(t=>t.dispose());for(const list of Object.values(resources))for(const r of list)r.dispose();teams.forEach(t=>t.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();}));},clipDuration:clip.duration};
}

export function buildBoatWake(scene,waterY){
 // A tapering foam trail and contact shadow; no opaque rectangle on the water.
 const points=[],uv=[],indices=[];const n=28;
 for(let i=0;i<=n;i++){const t=i/n,x=-14-t*24,w=.44+t*3.7;points.push(x,0,-w,x,0,w);uv.push(t,0,t,1);if(i<n){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float edge=abs(vUv.y-.5)*2.;float arms=exp(-pow((edge-.68)*17.,2.));float noise=.5+.5*sin(vUv.x*100.-uTime*9.+sin(vUv.y*37.));float foam=(arms*.36+pow(noise,5.)*(1.-edge)*.13)*pow(1.-vUv.x,1.6)*smoothstep(0.,.07,vUv.x);gl_FragColor=vec4(.78,.81,.68,foam);}' });
 const mesh=new T.Mesh(g,m);mesh.position.y=waterY+.028;scene.add(mesh);
 const shadow=new T.Mesh(new T.PlaneGeometry(31,2),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=max(0.,1.-p.x*p.x)*exp(-p.y*p.y*8.);gl_FragColor=vec4(.12,.10,.05,a*.26);}'}));shadow.rotation.x=-Math.PI/2;shadow.position.y=waterY+.009;scene.add(shadow);
 return {update(root,time,moving){mesh.position.x=root.position.x;mesh.position.z=root.position.z;m.uniforms.uTime.value=time;mesh.visible=moving;shadow.position.x=root.position.x;shadow.position.z=root.position.z;},dispose(){g.dispose();m.dispose();shadow.geometry.dispose();shadow.material.dispose();scene.remove(mesh,shadow);}};
}
