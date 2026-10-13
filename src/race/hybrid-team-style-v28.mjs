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
  material.userData.palette={...palette};
  material.onBeforeCompile=shader=>{
   for(const name of ['jersey','lower','cap','trim','shorts','sleeve'])shader.uniforms['kit_'+name]={value:new T.Color(palette[name]||palette.jersey)};
   shader.uniforms.kit_sleeved={value:palette.sleeve?1:0};
   shader.uniforms.hybridSkinMap={value:skinMap};shader.uniforms.hybridSkinDetail=detail;
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float paintZone; attribute vec2 paintUV; attribute float shirtMix;
uniform vec3 kit_jersey,kit_lower,kit_cap,kit_trim,kit_shorts,kit_sleeve;
uniform float hybridSkinDetail;
varying vec2 vHybridSkinUV; varying float vHybridSkin; varying float vSleeve; varying float vArmBinding;
`).replace('#include <color_vertex>',`#include <color_vertex>
vHybridSkinUV=paintUV;
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
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D hybridSkinMap; uniform float kit_sleeved;
varying vec2 vHybridSkinUV; varying float vHybridSkin; varying float vSleeve; varying float vArmBinding;
`).replace('#include <color_fragment>',`#include <color_fragment>
if(vSleeve>0.5 && kit_sleeved<0.5) discard;
if(vArmBinding>0.5 && kit_sleeved>0.5) discard;
if(vHybridSkin>0.0) diffuseColor.rgb *= mix(vec3(1.0),texture2D(hybridSkinMap,vHybridSkinUV).rgb,vHybridSkin);
`);
  };
  cache.set(key,material);return material;
 }
 return {get,dispose(){for(const material of cache.values())material.dispose();},get size(){return cache.size;}};
}

// Follow the anatomical shoulder/upper-arm surface with its exact original
// weights. This closes the tank armhole when a sleeved kit is selected.
export function shortSleeves(body,jointNames,skeleton){
 const p=body.attributes.position,j=body.attributes.skinIndex,w=body.attributes.skinWeight,selected=[],arms=[];
 for(const side of ['l','r']){
  const upper=jointNames.indexOf('upperarm_'+side),lower=jointNames.indexOf('lowerarm_'+side),clavicle=jointNames.indexOf('clavicle_'+side);
  const a=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[upper].clone().invert()),b=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[lower].clone().invert());
  arms.push({upper,clavicle,start:a,axis:b.sub(a),sign:Math.sign(a.x)});
 }
 const center=new T.Vector3(),probe=new T.Vector3();
 for(let face=0;face<body.index.count;face+=3){
  const vertices=[0,1,2].map(k=>body.index.getX(face+k));center.set(0,0,0);for(const i of vertices)center.add(probe.fromBufferAttribute(p,i));center.multiplyScalar(1/3);
  const closesArmhole=Math.abs(center.x)>.10&&Math.abs(center.x)<.21&&center.y>1.105&&center.y<1.445;
  const onArm=arms.some(arm=>{let amount=0;for(const i of vertices)for(let k=0;k<4;k++)if([arm.upper,arm.clavicle].includes(j.getComponent(i,k)))amount+=w.getComponent(i,k)/3;const along=probe.copy(center).sub(arm.start).dot(arm.axis)/arm.axis.lengthSq();return amount>.16&&along>-.32&&along<.78&&center.x*arm.sign>Math.abs(arm.start.x)*.6;});
  if(closesArmhole||onArm)selected.push(...vertices);
 }
 const used=[...new Set(selected)],lookup=new Map(used.map((old,i)=>[old,i])),source=new T.BufferGeometry();
 for(const [name,attribute] of Object.entries(body.attributes)){
  const type=name==='skinIndex'?Uint16Array:Float32Array,array=new type(used.length*attribute.itemSize);
  for(const [i,old] of used.entries())for(let k=0;k<attribute.itemSize;k++)array[i*attribute.itemSize+k]=name==='position'?attribute.getComponent(old,k)+body.attributes.normal.getComponent(old,k)*.0045:name==='paintZone'?7:name==='color'?1:attribute.getComponent(old,k);
  source.setAttribute(name,new T.BufferAttribute(array,attribute.itemSize));
 }
 source.setIndex(selected.map(old=>lookup.get(old)));source.userData.fit={normalOffsetM:.0045,skinWeights:'exact anatomical surface weights',closesArmholes:true};
 return source;
}

export function teamTextures(base){
 const textures=new Map(),ready=new Map(),loader=new T.TextureLoader();
 async function load(ids){await Promise.all([...new Set(ids)].map(id=>{
  team2025(id);if(!textures.has(id))textures.set(id,loader.loadAsync(base+'teams-2025/'+id+'.svg').then(texture=>{texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;ready.set(id,texture);return texture;}).catch(error=>{textures.delete(id);throw error;}));return textures.get(id);
 }));}
 return {load,get(id){return ready.get(id);},textures,dispose(){for(const texture of ready.values())texture.dispose();}};
}
