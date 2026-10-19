import * as T from 'three';
import {crowdAssetDigest} from './asset-digests.mjs';

const COLORS=['#6e9b96','#b77753','#6785a9','#a66d8c','#92864e','#b5aba0','#735d94','#b84f48'];
const TROUSERS=['#26394d','#3b4246','#8b7755','#b4ae99','#426d99','#5e704a','#d6c6a6','#dedfdb'],SHOES=['#34383c','#67503e','#dddcd2','#49525c'];
const colorArray=colors=>colors.map(c=>'vec3('+new T.Color(c).toArray().map(v=>v.toFixed(5)).join(',')+')').join(',');
const random=(seed,salt)=>{let h=Math.imul(seed^salt,0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return((h^(h>>>16))>>>0)/4294967296;};
export async function loadFestivalCrowd(base,{compact=false}={}){
 const path=base.replace(/\/?$/,'/')+'assets/festival-crowd/';
 const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Festival NPC asset '+r.status);return r;};
 if(compact){
  const packed=await(await get(path+'crowd-compact.json?sha='+crowdAssetDigest)).json(),gzip=typeof DecompressionStream!=='undefined';
  const response=await get(path+'crowd-compact.'+(gzip?'packed':'bin')+'?sha='+packed.sha256);
  const geometry=await(gzip?new Response(response.body.pipeThrough(new DecompressionStream('gzip'))):response).arrayBuffer();
  if(geometry.byteLength!==packed.bytes)throw Error('Incomplete festival crowd asset');
  return {manifest:packed.manifest,models:packed.models.map(m=>({...m,bones:new Float32Array(geometry,m.boneOffset,m.boneCount),geometry})),dispose(){}};
 }
 const manifest=await(await get(path+'manifest.json')).json();
 const models=await Promise.all(manifest.models.map(async info=>{const meta=await(await get(path+info.file)).json();const [bones,geometry]=await Promise.all([get(path+meta.binary).then(r=>r.arrayBuffer()),get(path+meta.geometryBinary).then(r=>r.arrayBuffer())]);return{info,meta,bones:new Float32Array(bones),geometry};}));
 return{manifest,models,dispose(){/* Loader owns CPU buffers only; build owns GPU resources. */}};
}

export function buildFestivalCrowd(group,people,assets,{vibrant=false,middleLimit=600,farLimit=16000,radius=430}={}){
 let disposed=false,lastX=Infinity,lastZ=Infinity;
 const uniforms={time:{value:0}},batches=[],resources=[],dummy=new T.Object3D();
 const modelIds=new Map(assets.models.map((m,i)=>[m.meta.id,i]));
 const records=people.map((p,index)=>{const seed=((p.id|0)^Math.imul(Math.round(p.x*100),73856093)^Math.imul(Math.round(p.z*100),19349663))>>>0;
  const model=p.modelId?(modelIds.get(p.modelId)??0):Math.floor(random(seed,1)*assets.models.length),r=random(seed,2),activity=p.seated?6:p.activity==='walk'?2:['vendor','talk','indicate'].includes(p.activity)?5:p.activity==='wave'?1:p.activity==='clap'?3:p.activity==='cheer'?4:p.activity==='eat'||p.activity==='idle'?0:r<.35?0:r<.55?1:r<.75?3:r<.9?4:5,age=p.age||(random(seed,7)<.08?'adolescent':random(seed,7)<.3?'older adult':'adult');
  const palette=vibrant?['#ef5547','#ffbc35','#16b8a6','#39a4e3','#a478db','#f083b1','#e5e9e2','#73c553','#ef8952','#527ee0','#d45c97','#4cc6c0']:COLORS;
  return{p,index,seed,model,activity,age,phase:random(seed,3)*12,speed:.82+random(seed,4)*.34,width:(p.width||1)*(.94+random(seed,5)*.12),height:(p.height||1)*(.94+random(seed,6)*.12)*(age==='adolescent'?.80:age==='older adult'?.94:1),old:age==='older adult',color:new T.Color(p.uniform?.top||palette[Math.floor(random(seed,8)*palette.length)]),outfit:p.uniform?.bottom!=null?p.uniform.bottom+(p.uniform.shoes??0)/16:Math.floor(random(seed,11)*TROUSERS.length)+Math.floor(random(seed,12)*SHOES.length)/16,skin:.85+random(seed,9)*.25,face:random(seed,10)};});
 const counts={};for(const r of records){const key=assets.manifest.motion[r.activity];counts[key]=(counts[key]||0)+1;}
 const stats={version:21,people:people.length,placed:people.length,variantCount:assets.models.length,activities:assets.manifest.motion,activityCounts:counts,active:0,lodCounts:[0,0,0],limits:{near:24,middle:middleLimit,far:farLimit,radius},drawCalls:0,paletteBytes:assets.models.reduce((s,m)=>s+m.bones.byteLength,0),motion:'GPU bone palette interpolation; source idle/wave/walk + authored clap/cheer/indicate/seated',randomization:'independent salted placement id and coordinates, clothes/hair/skin/face proportions/age styling'};
 group.userData.crowd=stats;
 stats.peoplePerBank=[people.filter(p=>p.z<0).length,people.filter(p=>p.z>=0).length];
 stats.outfits={independentTrousers:TROUSERS.length,independentShoes:SHOES.length,regionPolicy:'separate upper garments, trousers/skirts, footwear, hats and small trim',combinations:new Set(records.map(r=>r.color.getHex()+':'+r.outfit)).size};
 stats.demographicCounts={age:{},gender:{},model:{}};for(const r of records)for(const [key,value]of [['age',r.age],['gender',assets.models[r.model].info.gender],['model',assets.models[r.model].meta.id]])stats.demographicCounts[key][value]=(stats.demographicCounts[key][value]||0)+1;
 for(let modelIndex=0;modelIndex<assets.models.length;modelIndex++){
  const model=assets.models[modelIndex],meta=model.meta;
  const texture=new T.DataTexture(model.bones,meta.bones*4,meta.frames*meta.motion.length,T.RGBAFormat,T.FloatType);texture.needsUpdate=true;texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;
  const duration=new Float32Array(meta.durations),shared={uFestivalTime:uniforms.time,uBones:{value:texture},uBoneSize:{value:new T.Vector2(meta.bones*4,meta.frames*meta.motion.length)},uDurations:{value:duration}};
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.8});
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,shared);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    attribute vec4 skinIndex;attribute vec4 skinWeight;attribute float aRegion;attribute vec4 aAct;attribute vec4 aStyle;attribute vec3 aTint;attribute vec3 aRoute;
    varying float vRegion;varying vec4 vStyle;varying vec3 vTint;
    uniform float uFestivalTime;uniform sampler2D uBones;uniform vec2 uBoneSize;uniform float uDurations[7];
    mat4 boneSample(float bone,float frame){float x=bone*4.;float y=(aAct.x*${meta.frames}.+frame+.5)/uBoneSize.y;return mat4(texture2D(uBones,vec2((x+.5)/uBoneSize.x,y)),texture2D(uBones,vec2((x+1.5)/uBoneSize.x,y)),texture2D(uBones,vec2((x+2.5)/uBoneSize.x,y)),texture2D(uBones,vec2((x+3.5)/uBoneSize.x,y)));}
    mat4 bonePose(float bone){float f=mod((uFestivalTime*aAct.z+aAct.y)/uDurations[int(aAct.x)]*${meta.frames}.,${meta.frames}.);if(aAct.w>1.5)return boneSample(bone,floor(f));return boneSample(bone,floor(f))*(1.-fract(f))+boneSample(bone,mod(floor(f)+1.,${meta.frames}.))*fract(f);}
    mat4 skinPose(){if(aAct.w>1.5)return bonePose(skinIndex.x);if(aAct.w>.5)return (bonePose(skinIndex.x)*skinWeight.x+bonePose(skinIndex.y)*skinWeight.y)/max(skinWeight.x+skinWeight.y,.0001);return bonePose(skinIndex.x)*skinWeight.x+bonePose(skinIndex.y)*skinWeight.y+bonePose(skinIndex.z)*skinWeight.z+bonePose(skinIndex.w)*skinWeight.w;}
   `).replace('#include <beginnormal_vertex>','mat4 festivalSkin=skinPose();vec3 objectNormal=normalize(mat3(festivalSkin)*normal);float festivalTurn=0.;if(aAct.x>1.5&&aAct.x<2.5)festivalTurn=atan(cos(uFestivalTime*.32+aAct.y),.12)-1.4514;mat2 festivalRotation=mat2(cos(festivalTurn),-sin(festivalTurn),sin(festivalTurn),cos(festivalTurn));objectNormal.xz=festivalRotation*objectNormal.xz;').replace('#include <begin_vertex>',`vec3 transformed=(festivalSkin*vec4(position,1.)).xyz;vRegion=aRegion;vStyle=aStyle;vTint=aTint;
    ${meta.outfitRegions?'':`if(aRegion>3.5){float height=position.y*${meta.scale};vRegion=height<.27?6.:height<.87?5.:height>1.43?7.:4.;}`}
    float head=smoothstep(${meta.headCenter-.08},${meta.headCenter+.02},position.y);transformed.x*=1.+head*(aStyle.w-.5)*.10;
    if(aAct.x>5.5)transformed.y-=${meta.seatedDrop};
    transformed.xz=festivalRotation*transformed.xz;
   `).replace('#include <project_vertex>',`vec4 mvPosition=instanceMatrix*vec4(transformed,1.);float route=sin(uFestivalTime*.32+aAct.y)*aRoute.z;mvPosition.xyz+=vec3(aRoute.x*route,0.,aRoute.y*route);mvPosition=modelViewMatrix*mvPosition;gl_Position=projectionMatrix*mvPosition;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying float vRegion;varying vec4 vStyle;varying vec3 vTint;
    const vec3 pants[8]=vec3[8](${colorArray(TROUSERS)});const vec3 shoes[4]=vec3[4](${colorArray(SHOES)});
   `).replace('#include <color_fragment>',`#include <color_fragment>
    if(vRegion>3.5&&vRegion<4.5)diffuseColor.rgb=${vibrant?'mix(diffuseColor.rgb,vTint,.75)':'mix(diffuseColor.rgb,diffuseColor.rgb*vTint*2.,.62)'};
    if(vRegion>4.5&&vRegion<5.5)diffuseColor.rgb=mix(diffuseColor.rgb,pants[int(floor(vStyle.z+.001))],.88);
    if(vRegion>5.5&&vRegion<6.5)diffuseColor.rgb=mix(diffuseColor.rgb,shoes[int(clamp(floor(fract(vStyle.z+.001)*16.),0.,3.))],.92);
    if(vRegion>.5&&vRegion<1.5)diffuseColor.rgb*=vStyle.x;
    if(vRegion>1.5&&vRegion<2.5&&vStyle.y>.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.29,.27,.24),.8);
   `);
  };
  material.customProgramCacheKey=()=> 'festival-bone-outfit-'+meta.bones+'-'+vibrant+'-'+!!meta.outfitRegions;
  resources.push({texture,material});
  const capacity=records.filter(r=>r.model===modelIndex).length;
  for(let level=0;level<3;level++){
   const data=meta.levels[level],geo=new T.BufferGeometry();
   for(const [key,size]of [['position',3],['normal',3],['skinWeight',4],['skinIndex',4],['color',3],['region',1]]){const d=data[key];geo.setAttribute(key==='region'?'aRegion':key,new T.BufferAttribute(new Float32Array(model.geometry,d.offset,d.count),size));}
   const ix=data.index;geo.setIndex(new T.BufferAttribute(new Uint32Array(model.geometry,ix.offset,ix.count),1));
   for(const [key,size]of [['aAct',4],['aStyle',4],['aTint',3],['aRoute',3]])geo.setAttribute(key,new T.InstancedBufferAttribute(new Float32Array(capacity*size),size));
   const mesh=new T.InstancedMesh(geo,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.name=`FestivalNPC_${meta.id}_LOD${level}`;group.add(mesh);
   batches.push({modelIndex,level,meta,mesh,geo});
  }
 }
 function pack(cameraX,cameraZ){
  const started=performance.now();
  const lists=[[],[],[]];const sorted=records.map(r=>({r,d:Math.hypot(cameraX-r.p.x,cameraZ-r.p.z)})).filter(q=>q.d<radius).sort((a,b)=>a.d-b.d);
  for(const q of sorted){const level=q.d<13&&lists[0].length<24?0:q.d<70&&lists[1].length<middleLimit?1:2;if(level===2&&lists[2].length>=farLimit)continue;lists[level].push(q.r);}
  for(const batch of batches){const chosen=lists[batch.level].filter(r=>r.model===batch.modelIndex);batch.mesh.count=chosen.length;
   chosen.forEach((r,i)=>{const p=r.p,floor=p.waterY!=null?p.waterY-(p.submergedHeight??.9)*r.height:(p.floor||0);dummy.position.set(p.x,p.seated&&p.seatY!=null?p.seatY-.55*r.height:floor-batch.meta.ground*batch.meta.scale*r.height,p.z);dummy.rotation.set(0,r.activity===2?Math.atan2(p.path?.dx??1,p.path?.dz??0):p.yaw??(p.z<0?0:Math.PI),0);dummy.scale.set(batch.meta.scale*r.width,batch.meta.scale*r.height,batch.meta.scale*r.width);dummy.updateMatrix();batch.mesh.setMatrixAt(i,dummy.matrix);
    batch.geo.attributes.aAct.setXYZW(i,r.activity,r.phase,r.speed,batch.level);batch.geo.attributes.aStyle.setXYZW(i,r.skin,r.old?1:0,r.outfit,r.face);batch.geo.attributes.aTint.setXYZ(i,r.color.r,r.color.g,r.color.b);
    const extent=r.activity===2?Math.min(p.path?.extent??.8,2):0;batch.geo.attributes.aRoute.setXYZ(i,p.path?.dx??1,p.path?.dz??0,extent);
   });batch.mesh.instanceMatrix.needsUpdate=true;for(const key of ['aAct','aStyle','aTint','aRoute'])batch.geo.attributes[key].needsUpdate=true;
  }
  stats.lodCounts=lists.map(l=>l.length);stats.active=stats.lodCounts.reduce((s,n)=>s+n,0);stats.drawCalls=batches.filter(b=>b.mesh.count).length;stats.visibleTriangles=batches.reduce((s,b)=>s+b.mesh.count*b.meta.levels[b.level].triangles,0);
  stats.lastPackMs=performance.now()-started;
 }
 return{count:people.length,stats,update(time,cameraX,cameraZ=0){if(disposed)return;uniforms.time.value=time;if(Math.hypot(cameraX-lastX,cameraZ-lastZ)>4){pack(cameraX,cameraZ);lastX=cameraX;lastZ=cameraZ;}},dispose(){if(disposed)return;disposed=true;for(const b of batches){group.remove(b.mesh);b.geo.dispose();b.mesh.dispose();}for(const r of resources){r.texture.dispose();r.material.dispose();}}};
}
