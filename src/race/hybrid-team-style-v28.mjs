import * as T from 'three';
import {RACE_TEAMS_2025,DEFAULT_TEAM_IDS,team2025} from './teams-2025.mjs';

// Visual choices never change a historical team's simulated strength.
window.TukNgoTeams={list:RACE_TEAMS_2025,defaults:DEFAULT_TEAM_IDS,get:team2025};

export function athletePalette(team,id,role,fallback){
 const leader=team?.roleKit?.[role==='caller'?'BOW_CALLER':role==='controller'?'MID_CONTROLLER':''];
 const jersey=leader?.jersey||(role==='caller'?'#8d965c':role==='controller'?'#73aebd':team?.alternateJersey&&id%7===0?team.alternateJersey:team?.jersey||fallback);
 return {jersey,lower:!leader&&role==='rower'?team?.lowerJersey||jersey:jersey,
  cap:leader?.cap||(team?.capVariants?team.capVariants[id%10<7?0:id%10<9?1:2]:team?.cap||'#f5f3e9'),
  trim:team?.trim||'#f0f0df',shorts:leader?.shorts||'#17222a',sleeve:leader?leader.sleeve:role==='rower'||role==='helm'?team?.sleeve:null};
}

export function makeAthleteMaterials(skinMap,detail){
 const cache=new Map();
 function get(palette){
  const key=JSON.stringify(palette);if(cache.has(key))return cache.get(key);
  const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
  material.userData.palette={...palette};material.userData.skinMap=skinMap;
  material.onBeforeCompile=shader=>{
   for(const name of ['jersey','lower','cap','trim','shorts','sleeve'])shader.uniforms['kit_'+name]={value:new T.Color(palette[name]||palette.jersey)};
   shader.uniforms.kit_sleeved={value:palette.sleeve?1:0};
   shader.uniforms.hybridSkinMap={value:skinMap};shader.uniforms.hybridSkinDetail=detail;
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float paintZone; attribute vec2 paintUV; attribute float shirtMix; attribute vec3 facePoint; attribute float beard; attribute float hair;
attribute vec4 cuffSourceA,cuffSourceB,cuffWeights;
uniform vec3 kit_jersey,kit_lower,kit_cap,kit_trim,kit_shorts,kit_sleeve;
uniform float hybridSkinDetail;
varying vec2 vHybridSkinUV; varying float vHybridSkin; varying float vSleeve; varying float vArmBinding;
varying vec3 vFacePoint; varying float vBeard; varying float vHair;
`).replace('#include <color_vertex>',`#include <color_vertex>
vHybridSkinUV=paintUV;
vFacePoint=facePoint; vBeard=beard; vHair=hair;
vHybridSkin=(paintZone>0.9 && paintZone<1.1 && color.r>0.06)?hybridSkinDetail:0.0;
vSleeve=paintZone>6.9 && paintZone<7.1?1.0:0.0;
vArmBinding=paintZone>7.9 && paintZone<8.1?1.0:0.0;
if(vHybridSkin>0.0) vColor.rgb=mix(vColor.rgb,vec3(clamp(color.r/.56,.65,1.3)*.75),vHybridSkin);
if(paintZone>1.9 && paintZone<2.1) vColor.rgb=kit_cap;
if(paintZone>2.9 && paintZone<4.1) vColor.rgb=mix(kit_lower,kit_jersey,shirtMix);
if((paintZone>4.9 && paintZone<5.1) || vArmBinding>0.0) vColor.rgb=kit_trim;
if(paintZone>5.9 && paintZone<6.1) vColor.rgb=kit_shorts;
if(vSleeve>0.0) vColor.rgb=kit_sleeve;
`);
   shader.vertexShader=shader.vertexShader.replace('#include <skinning_pars_vertex>',`#include <skinning_pars_vertex>
mat4 cuffMatrix(float packed,vec2 weights){
 vec4 indices=mod(floor(vec4(packed)/vec4(1.0,64.0,4096.0,262144.0)),64.0);
 vec4 w=vec4(mod(weights.x,4096.0),floor(weights.x/4096.0),mod(weights.y,4096.0),floor(weights.y/4096.0));w/=dot(w,vec4(1.0));
 return getBoneMatrix(indices.x)*w.x+getBoneMatrix(indices.y)*w.y+getBoneMatrix(indices.z)*w.z+getBoneMatrix(indices.w)*w.w;
}
`).replace('#include <skinning_vertex>',`#include <skinning_vertex>
if(cuffSourceA.w>=0.0){
 vec4 a=cuffMatrix(cuffSourceA.w,cuffWeights.xy)*bindMatrix*vec4(cuffSourceA.xyz,1.0);
 vec4 b=cuffMatrix(cuffSourceB.w,cuffWeights.zw)*bindMatrix*vec4(cuffSourceB.xyz,1.0);
 transformed=(bindMatrixInverse*mix(a,b,shirtMix)).xyz;
}
`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D hybridSkinMap; uniform float kit_sleeved;
varying vec2 vHybridSkinUV; varying float vHybridSkin; varying float vSleeve; varying float vArmBinding;
varying vec3 vFacePoint; varying float vBeard; varying float vHair;
`).replace('#include <color_fragment>',`#include <color_fragment>
if(vSleeve>0.5 && kit_sleeved<0.5) discard;
if(vArmBinding>0.5 && kit_sleeved>0.5) discard;
if(vHybridSkin>0.0) diffuseColor.rgb *= mix(vec3(1.0),texture2D(hybridSkinMap,vHybridSkinUV).rgb,vHybridSkin);
if(vHair>0.5){
 float line=vHair<1.5?.063:vHair<2.5?.056:vHair<3.5?.052:.058+.002*sin(vFacePoint.x*160.0);
 float side=smoothstep(.053,.067,abs(vFacePoint.x))*(1.0-smoothstep(.025,.052,vFacePoint.z));
 float back=1.0-smoothstep(-.018,-.008,vFacePoint.z);
 float mask=smoothstep(line-.002,line+.002,vFacePoint.y)*max(side,back);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.034,.026,.019),mask);
}
if(vBeard>0.0 && vHybridSkin>0.0){
 float front=smoothstep(.035,.075,vFacePoint.z);
 float lower=(1.0-smoothstep(-.032,-.014,vFacePoint.y))*smoothstep(-.089,-.065,vFacePoint.y);
 float moustache=exp(-pow(vFacePoint.x/.023,2.0)-pow((vFacePoint.y+.016)/.004,2.0));
 float grain=.75+.25*sin(vFacePoint.x*1700.0)*sin(vFacePoint.y*1900.0);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.38,.34,.30),vBeard*front*max(lower*.48,moustache*.55)*grain);
}
`);
  };
  cache.set(key,material);return material;
 }
 return {get,dispose(){for(const material of cache.values())material.dispose();},get size(){return cache.size;}};
}

// Follow the anatomical shoulder/upper-arm surface with its exact original
// weights. This closes the tank armhole when a sleeved kit is selected.
export function shortSleeves(body,jointNames,skeleton,cuffAlong=.55){
 const p=body.attributes.position,j=body.attributes.skinIndex,w=body.attributes.skinWeight,arms=[];
 for(const side of ['l','r']){
  const upper=jointNames.indexOf('upperarm_'+side),lower=jointNames.indexOf('lowerarm_'+side),clavicle=jointNames.indexOf('clavicle_'+side);
  const a=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[upper].clone().invert()),b=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[lower].clone().invert());
  arms.push({upper,clavicle,start:a,axis:b.sub(a),sign:Math.sign(a.x)});
 }
 const center=new T.Vector3(),probe=new T.Vector3(),source=new T.BufferGeometry(),records=[],indices=[],cache=new Map();
 const attributes=Object.entries(body.attributes),buffers=Object.fromEntries(attributes.map(([name])=>[name,[]]));
 let maxDiscardedWeight=0;
 function vertex(i){
  const values={};for(const [name,attribute] of attributes)values[name]=Array.from({length:attribute.itemSize},(_,k)=>name==='position'?attribute.getComponent(i,k)+body.attributes.normal.getComponent(i,k)*.0045:name==='paintZone'?7:name==='color'?1:attribute.getComponent(i,k));
  return {values,bary:[[i,1]]};
 }
 function interpolate(a,b,t){
  const bary=new Map();for(const [i,v] of a.bary)bary.set(i,(bary.get(i)||0)+v*(1-t));for(const [i,v] of b.bary)bary.set(i,(bary.get(i)||0)+v*t);
  const values={};for(const [name] of attributes)if(!['skinIndex','skinWeight'].includes(name))values[name]=a.values[name].map((v,k)=>v*(1-t)+b.values[name][k]*t);
  if(values.normal){const length=Math.hypot(...values.normal);values.normal=values.normal.map(v=>v/length);}
  const influences=new Map();for(const [i,amount] of bary)for(let k=0;k<4;k++){const bone=j.getComponent(i,k);influences.set(bone,(influences.get(bone)||0)+amount*w.getComponent(i,k));}
  const sorted=[...influences].filter(([,weight])=>weight>0).sort((a,b)=>b[1]-a[1]),kept=sorted.slice(0,4),total=kept.reduce((sum,[,weight])=>sum+weight,0);
  maxDiscardedWeight=Math.max(maxDiscardedWeight,sorted.slice(4).reduce((sum,[,weight])=>sum+weight,0));
  values.skinIndex=Array.from({length:4},(_,k)=>kept[k]?.[0]||0);values.skinWeight=Array.from({length:4},(_,k)=>(kept[k]?.[1]||0)/total);
  return {values,bary:[...bary]};
 }
 function emit(v){
  const key=v.bary.slice().sort((a,b)=>a[0]-b[0]).map(([i,w])=>`${i}:${w.toFixed(10)}`).join(',');
  if(cache.has(key))return cache.get(key);
  const index=records.length;cache.set(key,index);records.push(v.bary);
  for(const [name] of attributes)buffers[name].push(...v.values[name]);return index;
 }
 for(let face=0;face<body.index.count;face+=3){
  const vertices=[0,1,2].map(k=>body.index.getX(face+k));center.set(0,0,0);for(const i of vertices)center.add(probe.fromBufferAttribute(p,i));center.multiplyScalar(1/3);
  const closesArmhole=Math.abs(center.x)>.095&&Math.abs(center.x)<.30&&center.y>1.02&&center.y<1.445;
  const arm=arms.find(arm=>{let amount=0;for(const i of vertices)for(let k=0;k<4;k++)if([arm.upper,arm.clavicle].includes(j.getComponent(i,k)))amount+=w.getComponent(i,k)/3;const along=probe.copy(center).sub(arm.start).dot(arm.axis)/arm.axis.lengthSq();return (closesArmhole||amount>.16&&along>-.32)&&center.x*arm.sign>Math.abs(arm.start.x)*.6;});
  if(!arm)continue;
  const torsoPatch=closesArmhole&&Math.abs(center.x)<.20;
  const distance=v=>torsoPatch?-1:probe.fromArray(v.values.position).sub(arm.start).dot(arm.axis)/arm.axis.lengthSq()-cuffAlong;
  let polygon=vertices.map(vertex),clipped=[];
  for(let k=0;k<polygon.length;k++){
   const a=polygon[k],b=polygon[(k+1)%polygon.length],da=distance(a),db=distance(b);
   if(da<=0)clipped.push(a);
   if((da<=0)!==(db<=0))clipped.push(interpolate(a,b,da/(da-db)));
  }
  for(let k=1;k<clipped.length-1;k++){
   const triangle=[clipped[0],clipped[k],clipped[k+1]],a=new T.Vector3().fromArray(triangle[0].values.position),b=new T.Vector3().fromArray(triangle[1].values.position),c=new T.Vector3().fromArray(triangle[2].values.position);
   if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18)indices.push(...triangle.map(emit));
  }
 }
 for(const [name,attribute] of attributes){
  const type=name==='skinIndex'?Uint16Array:Float32Array;
  source.setAttribute(name,new T.BufferAttribute(new type(buffers[name]),attribute.itemSize));
 }
 source.setIndex(indices);source.userData.fit={normalOffsetM:.0045,skinWeights:'original or barycentric cuff interpolation; strongest four normalized',closesArmholes:true,maxDiscardedWeight,cuffAlong};source.userData.sourceBarycentric=records;
 return source;
}

export function teamTextures(base){
 const textures=new Map(),ready=new Map(),loader=new T.TextureLoader();
 async function load(ids){await Promise.all([...new Set(ids)].map(id=>{
  team2025(id);if(!textures.has(id))textures.set(id,loader.loadAsync(base+'teams-2025/'+id+'.svg').then(texture=>{texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;ready.set(id,texture);return texture;}).catch(error=>{textures.delete(id);throw error;}));return textures.get(id);
 }));}
 return {load,get(id){return ready.get(id);},textures,dispose(){for(const texture of ready.values())texture.dispose();}};
}
