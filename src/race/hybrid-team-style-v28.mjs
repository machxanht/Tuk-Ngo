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
varying vec2 vHybridSkinUV; varying float vHybridSkin; varying float vSleeve;
`).replace('#include <color_vertex>',`#include <color_vertex>
vHybridSkinUV=paintUV;
vHybridSkin=(paintZone>0.9 && paintZone<1.1 && color.r>0.06)?hybridSkinDetail:0.0;
vSleeve=paintZone>6.9 && paintZone<7.1?1.0:0.0;
if(vHybridSkin>0.0) vColor.rgb=mix(vColor.rgb,vec3(clamp(color.r/.56,.65,1.3)*.75),vHybridSkin);
if(paintZone>1.9 && paintZone<2.1) vColor.rgb=kit_cap;
if(paintZone>2.9 && paintZone<4.1) vColor.rgb=mix(kit_lower,kit_jersey,shirtMix);
if(paintZone>4.9 && paintZone<5.1) vColor.rgb=kit_trim;
if(paintZone>5.9 && paintZone<6.1) vColor.rgb=kit_shorts;
if(vSleeve>0.0) vColor.rgb=kit_sleeve;
`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D hybridSkinMap; uniform float kit_sleeved;
varying vec2 vHybridSkinUV; varying float vHybridSkin; varying float vSleeve;
`).replace('#include <color_fragment>',`#include <color_fragment>
if(vSleeve>0.5 && kit_sleeved<0.5) discard;
if(vHybridSkin>0.0) diffuseColor.rgb *= mix(vec3(1.0),texture2D(hybridSkinMap,vHybridSkinUV).rgb,vHybridSkin);
`);
  };
  cache.set(key,material);return material;
 }
 return {get,dispose(){for(const material of cache.values())material.dispose();},get size(){return cache.size;}};
}

// Fit six smooth cloth rings to each anatomical upper arm in its bind pose.
// Nearest body vertices supply the original four joint influences, so the
// cuff follows the arm without an independently animated floating tube.
export function shortSleeves(body,jointNames,skeleton){
 const p=body.attributes.position,j=body.attributes.skinIndex,w=body.attributes.skinWeight,values={position:[],normal:[],uv:[],skinIndex:[],skinWeight:[],color:[],paintZone:[],shirtMix:[]},indices=[];
 const point=new T.Vector3(),radial=new T.Vector3(),segments=24,rings=6;
 for(const side of ['l','r']){
  const upper=jointNames.indexOf('upperarm_'+side),lower=jointNames.indexOf('lowerarm_'+side);
  const a=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[upper].clone().invert()),b=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[lower].clone().invert());
  const axis=b.sub(a),length=axis.length();axis.normalize();const u=new T.Vector3(0,0,1).cross(axis).normalize(),v=axis.clone().cross(u).normalize(),candidates=[];
  for(let i=0;i<p.count;i++){
   let amount=0;for(let k=0;k<4;k++)if(j.getComponent(i,k)===upper)amount+=w.getComponent(i,k);
   if(amount<.4)continue;point.fromBufferAttribute(p,i).sub(a);const along=point.dot(axis),radius=point.clone().addScaledVector(axis,-along).length();
   if(along>-.04&&along<length*.8)candidates.push({i,along,radius});
  }
  const offset=values.paintZone.length;
  for(let ring=0;ring<rings;ring++){
   const along=-.006+ring/(rings-1)*Math.min(.19,length*.70),near=candidates.filter(c=>Math.abs(c.along-along)<.045).map(c=>c.radius).sort((a,b)=>a-b);
   const radius=T.MathUtils.clamp((near[Math.floor(near.length*.9)]||.055)+.006,.047,.085);
   for(let segment=0;segment<segments;segment++){
    const theta=segment/segments*Math.PI*2;radial.copy(u).multiplyScalar(Math.cos(theta)).addScaledVector(v,Math.sin(theta));point.copy(a).addScaledVector(axis,along).addScaledVector(radial,radius);
    let nearest=candidates[0]?.i??0,best=Infinity;for(const c of candidates){const d=(p.getX(c.i)-point.x)**2+(p.getY(c.i)-point.y)**2+(p.getZ(c.i)-point.z)**2;if(d<best){best=d;nearest=c.i;}}
    values.position.push(...point.toArray());values.normal.push(...radial.toArray());values.uv.push(segment/segments,ring/(rings-1));values.color.push(1,1,1);values.paintZone.push(7);values.shirtMix.push(1);
    for(let k=0;k<4;k++){values.skinIndex.push(j.getComponent(nearest,k));values.skinWeight.push(w.getComponent(nearest,k));}
   }
  }
  for(let ring=0;ring<rings-1;ring++)for(let s=0;s<segments;s++){const a=offset+ring*segments+s,b=offset+ring*segments+(s+1)%segments;indices.push(a,b,a+segments,b,b+segments,a+segments);}
 }
 const source=new T.BufferGeometry();for(const [name,array] of Object.entries(values)){const size=body.attributes[name].itemSize,type=name==='skinIndex'?Uint16Array:Float32Array;source.setAttribute(name,new T.BufferAttribute(new type(array),size));}source.setIndex(indices);
 return source;
}

export function teamTextures(base){
 const textures=new Map(),ready=new Map(),loader=new T.TextureLoader();
 async function load(ids){await Promise.all([...new Set(ids)].map(id=>{
  team2025(id);if(!textures.has(id))textures.set(id,loader.loadAsync(base+'teams-2025/'+id+'.svg').then(texture=>{texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;ready.set(id,texture);return texture;}).catch(error=>{textures.delete(id);throw error;}));return textures.get(id);
 }));}
 return {load,get(id){return ready.get(id);},textures,dispose(){for(const texture of ready.values())texture.dispose();}};
}
