import * as T from 'three';

export async function loadCrowdAssets(base){
 const levels=await Promise.all(['near','far'].map(async name=>{const res=await fetch(base+'assets/human/crowd-'+name+'.json');if(!res.ok)throw Error('Không tải được NPC');const meta=await res.json(),binary=await fetch(base+'assets/human/'+meta.binary);if(!binary.ok)throw Error('Không tải được chuyển động NPC');return {meta,data:new Float32Array(await binary.arrayBuffer())};}));
 return levels;
}

// Baked anatomical poses are interpolated on the GPU. Thousands of NPCs share
// two meshes per 80 m section, instead of thousands of skeletons/draw calls.
export function buildCrowd(group,people,assets){
 const batches=[],dummy=new T.Object3D(),shared=[];
 for(const asset of assets){
  const {meta,data}=asset,g=new T.BufferGeometry(),positions=new Float32Array(meta.vertices*3),normals=new Float32Array(meta.vertices*3);
  for(let i=0;i<meta.vertices;i++){positions.set(data.subarray(i*6,i*6+3),i*3);normals.set(data.subarray(i*6+3,i*6+6),i*3);}
  g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('aVertex',new T.Float32BufferAttribute(Array.from({length:meta.vertices},(_,i)=>i),1));g.setAttribute('aRegion',new T.Float32BufferAttribute(meta.region,1));g.setIndex(meta.indices);
  const texture=new T.DataTexture(data,meta.vertices*2,meta.frames*meta.activities,T.RGBFormat,T.FloatType);
  // WebGL2 does not support RGB32F uploads on every tablet. Expand to RGBA32F.
  const rgba=new Float32Array(data.length/3*4);for(let i=0;i<data.length/3;i++){rgba.set(data.subarray(i*3,i*3+3),i*4);rgba[i*4+3]=1;}texture.image={data:rgba,width:meta.vertices*2,height:meta.frames*meta.activities};texture.format=T.RGBAFormat;texture.needsUpdate=true;
  const uniforms={uCrowdTime:{value:0},uCrowdPoses:{value:texture},uCrowdSize:{value:new T.Vector2(meta.vertices*2,meta.frames*meta.activities)}};
  const m=new T.MeshStandardMaterial({roughness:.92,side:T.DoubleSide});
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    attribute float aVertex;attribute float aRegion;attribute vec3 aActivity;uniform float uCrowdTime;uniform sampler2D uCrowdPoses;uniform vec2 uCrowdSize;
    vec3 crowdSample(float f,float offset){return texture2D(uCrowdPoses,vec2((aVertex*2.+offset+.5)/uCrowdSize.x,(aActivity.x*${meta.frames}.+f+.5)/uCrowdSize.y)).xyz;}
    vec3 crowdPose(float offset){float phase=mod(uCrowdTime*(3.8+aActivity.z)+aActivity.y,${meta.frames}.);return mix(crowdSample(floor(phase),offset),crowdSample(mod(floor(phase)+1.,${meta.frames}.),offset),fract(phase));}
   `).replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(crowdPose(1.));').replace('#include <begin_vertex>','vec3 transformed=crowdPose(0.);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCrowdRegion;varying float vCrowdSkin;');
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vCrowdRegion;varying float vCrowdSkin;').replace('#include <color_vertex>','#include <color_vertex>\nvCrowdRegion=aRegion;vCrowdSkin=aActivity.z;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`vec3 npcColor=mix(vec3(.36,.19,.10),vec3(.60,.36,.20),vCrowdSkin);if(vCrowdRegion>.5&&vCrowdRegion<1.5)npcColor=vColor.rgb;else if(vCrowdRegion>=1.5&&vCrowdRegion<2.5)npcColor=vec3(.08,.105,.13);else if(vCrowdRegion>=2.5)npcColor=vec3(.035,.03,.022);diffuseColor.rgb*=npcColor;`);
  };
  m.customProgramCacheKey=()=> 'anatomical-crowd-v8-'+meta.vertices;shared.push({g,m,texture,uniforms});
 }
 const sections=new Map();for(const p of people){const key=Math.floor(p.x/80);if(!sections.has(key))sections.set(key,[]);sections.get(key).push(p);}
 for(const list of sections.values()){
  const cx=list.reduce((n,p)=>n+p.x,0)/list.length;
  for(let level=0;level<2;level++){
   const s=shared[level],g=s.g.clone(),activity=[];const mesh=new T.InstancedMesh(g,s.m,list.length);mesh.name='Crowd_Anatomical_'+level+'_'+Math.round(cx);mesh.frustumCulled=false;
   list.forEach((p,i)=>{dummy.position.set(p.x,p.floor,p.z);dummy.rotation.set(0,p.z<0?0:Math.PI,0);dummy.scale.set(p.width,p.height,p.width);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(p.shirt));activity.push(p.seated?2:p.id%3?1:0,p.id*1.731%16,p.id%7/6);});
   g.setAttribute('aActivity',new T.InstancedBufferAttribute(new Float32Array(activity),3));group.add(mesh);batches.push({mesh,cx,level});
  }
 }
 return {count:people.length,update(time,cameraX){shared.forEach(s=>s.uniforms.uCrowdTime.value=time);for(const b of batches){const distance=Math.abs(cameraX-b.cx);b.mesh.visible=distance<520&&(distance<55?0:1)===b.level;}},dispose(){batches.forEach(b=>{b.mesh.geometry.dispose();b.mesh.dispose();group.remove(b.mesh);});shared.forEach(s=>{s.g.dispose();s.m.dispose();s.texture.dispose();});}};
}
