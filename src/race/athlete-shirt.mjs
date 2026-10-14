import * as T from 'three';

// The sleeve cuts interpolate already skinned anatomical endpoints. Blending
// their weights first moves the new cuff away from the elbow during a stroke.
export async function connectedShirt(data,jointNames,base=''){
 if(![...document.fonts].some(f=>f.family==='FestivalKhmer'&&f.status==='loaded')){const font=new FontFace('FestivalKhmer',`url(${base}NotoSansKhmer.ttf)`);await font.load();document.fonts.add(font);}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.font='138px FestivalKhmer';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f8f1dd';ctx.fillText('កូនខ្មែរ',512,120,980);
 const printTexture=new T.CanvasTexture(canvas);printTexture.colorSpace=T.SRGBColorSpace;printTexture.flipY=false;
 const n=data.vertices.length,g=new T.BufferGeometry(),buffers={position:[3],normal:[3],uv:[2],skinIndex:[4],skinWeight:[4],shirtTint:[2],shirtA:[4],shirtB:[4],shirtC:[4],shirtWeights:[4],shirtWeightsC:[2],shirtBary:[2]};
 for(const [name,[size]]of Object.entries(buffers))buffers[name]=new Float32Array(n*size);
 const sourceBones=data.jointNames.map(name=>jointNames.indexOf(name));if(sourceBones.some(i=>i<0))throw Error('Connected shirt requires the original anatomical skeleton');
 const pack=(a,b)=>a+b*4096;
 for(const [i,vertex]of data.vertices.entries()){
  buffers.position.set(vertex.position,i*3);buffers.normal.set(vertex.normal,i*3);buffers.uv.set(vertex.uv,i*2);
  let armWeight=0;for(const point of vertex.endpoints)for(let k=0;k<4;k++)if(/^(upperarm|lowerarm)_/.test(data.jointNames[point.jointIndices[k]]))armWeight+=point.baryWeight*point.jointWeights[k];
  const sleeveMix=T.MathUtils.smoothstep(armWeight,.40,.78)*T.MathUtils.smoothstep(Math.abs(vertex.position[0]),.17,.22);
  buffers.shirtTint.set([T.MathUtils.smoothstep(vertex.position[1],.86,1.30),sleeveMix],i*2);
  const combined=new Map();
  for(let e=0;e<3;e++){
   const point=vertex.endpoints[e]||vertex.endpoints[0],array=buffers[['shirtA','shirtB','shirtC'][e]];
   array.set(point.position.map((p,k)=>p+data.normalOffsetM*point.normal[k]),i*4);
   array[i*4+3]=point.jointIndices.reduce((sum,b,k)=>sum+sourceBones[b]*64**k,0);
   const weights=point.jointWeights.map(w=>Math.round(w*4095)),packed=[pack(weights[0],weights[1]),pack(weights[2],weights[3])];
   if(e<2)buffers.shirtWeights.set(packed,i*4+e*2);else buffers.shirtWeightsC.set(packed,i*2);
   if(e>0)buffers.shirtBary[i*2+e-1]=vertex.endpoints[e]?.baryWeight||0;
  }
  for(const point of vertex.endpoints)for(let k=0;k<4;k++){const b=sourceBones[point.jointIndices[k]];combined.set(b,(combined.get(b)||0)+point.baryWeight*point.jointWeights[k]);}
  const strongest=[...combined].sort((a,b)=>b[1]-a[1]).slice(0,4),total=strongest.reduce((sum,[,w])=>sum+w,0);
  strongest.forEach(([b,w],k)=>{buffers.skinIndex[i*4+k]=b;buffers.skinWeight[i*4+k]=w/total;});
 }
 const sizes={position:3,normal:3,uv:2,skinIndex:4,skinWeight:4,shirtTint:2,shirtA:4,shirtB:4,shirtC:4,shirtWeights:4,shirtWeightsC:2,shirtBary:2};
 for(const [name,array]of Object.entries(buffers))g.setAttribute(name,new T.BufferAttribute(name==='skinIndex'?new Uint16Array(array):array,sizes[name]));
 g.setIndex(data.indices);g.userData={shirtV32:data,correspondence:'skin original endpoints, then interpolate'};
 const cache=new Map();
 function material(palette){
  const key=JSON.stringify([palette.jersey,palette.lower,palette.sleeve,palette.trim]);if(cache.has(key))return cache.get(key);
  const m=new T.MeshLambertMaterial({side:T.DoubleSide});m.userData.palette=palette;m.userData.printTexture=printTexture;
  m.onBeforeCompile=shader=>{
   for(const name of ['jersey','lower','sleeve'])shader.uniforms['shirt_'+name]={value:new T.Color(palette[name]||palette.jersey)};
   shader.uniforms.shirt_trim={value:new T.Color(palette.trim)};shader.uniforms.shirt_print={value:printTexture};
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute vec2 shirtTint,shirtBary; attribute vec4 shirtA,shirtB,shirtC,shirtWeights; attribute vec2 shirtWeightsC;
varying vec2 vShirtTint; varying vec3 vShirtPoint;
`).replace('#include <skinning_pars_vertex>',`#include <skinning_pars_vertex>
mat4 shirtMatrix(float packed,vec2 weights){
 vec4 indices=mod(floor(vec4(packed)/vec4(1.0,64.0,4096.0,262144.0)),64.0);
 vec4 w=vec4(mod(weights.x,4096.0),floor(weights.x/4096.0),mod(weights.y,4096.0),floor(weights.y/4096.0));w/=dot(w,vec4(1.0));
 return getBoneMatrix(indices.x)*w.x+getBoneMatrix(indices.y)*w.y+getBoneMatrix(indices.z)*w.z+getBoneMatrix(indices.w)*w.w;
}
`).replace('#include <skinning_vertex>',`#include <skinning_vertex>
vec4 shirtP=shirtMatrix(shirtA.w,shirtWeights.xy)*bindMatrix*vec4(shirtA.xyz,1.0)*(1.0-shirtBary.x-shirtBary.y);
shirtP+=shirtMatrix(shirtB.w,shirtWeights.zw)*bindMatrix*vec4(shirtB.xyz,1.0)*shirtBary.x;
shirtP+=shirtMatrix(shirtC.w,shirtWeightsC)*bindMatrix*vec4(shirtC.xyz,1.0)*shirtBary.y;
transformed=(bindMatrixInverse*shirtP).xyz; vShirtTint=shirtTint; vShirtPoint=position;
`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 shirt_jersey,shirt_lower,shirt_sleeve,shirt_trim; uniform sampler2D shirt_print; varying vec2 vShirtTint; varying vec3 vShirtPoint;
`).replace('#include <color_fragment>',`#include <color_fragment>
diffuseColor.rgb*=mix(mix(shirt_lower,shirt_jersey,vShirtTint.x),shirt_sleeve,vShirtTint.y);
float neckFront=1.31+.10*pow(vShirtPoint.x/.085,2.0),neckBack=1.397+.05*pow(vShirtPoint.x/.085,2.0);
float neck=mix(neckFront,neckBack,clamp((-vShirtPoint.z+.08)/.16,0.0,1.0));
if(abs(vShirtPoint.x)<.14 && neck-vShirtPoint.y<.011) diffuseColor.rgb=shirt_trim;
vec2 printUV=vec2(.5-vShirtPoint.x/.31,(1.31-vShirtPoint.y)/.09);
if(vShirtPoint.z<-.035 && printUV.x>0.0 && printUV.x<1.0 && printUV.y>0.0 && printUV.y<1.0){vec4 ink=texture2D(shirt_print,printUV);diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a);}
`);
  };
  cache.set(key,m);return m;
 }
 return {geometry:g,material,dispose(){g.dispose();printTexture.dispose();for(const m of cache.values())m.dispose();}};
}
