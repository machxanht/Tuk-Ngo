import * as T from 'three';

// Authored adult silhouettes, not identities of people in event photographs.
export const crowdVariants=[
 ['young man tee',1,1,0],['woman blouse',.88,.95,1],['older man polo',1.12,.96,2],['older woman tunic',1.08,.91,3],
 ['slim man vest',.86,1.07,0],['woman long sleeve',.92,1.02,1],['stocky man tee',1.24,.98,0],['woman dress',1.02,.97,3],
 ['man cap',1.03,1.05,4],['woman cap',.91,.96,4],['older man grey hair',1.09,.93,2],['woman bob',.96,1.03,3],
 ['tall man striped polo',.95,1.12,0],['woman striped blouse',.88,1.06,1],['stocky older woman',1.19,.94,2],['man light cap',1.13,1.02,4],
];

export async function loadCrowdAssets(base){
 const levels=await Promise.all(['near','far'].map(async name=>{const res=await fetch(base+'assets/human/crowd-v10-'+name+'.json');if(!res.ok)throw Error('Không tải được NPC');const meta=await res.json(),binary=await fetch(base+'assets/human/'+meta.binary);if(!binary.ok)throw Error('Không tải được chuyển động NPC');return {meta,data:new Float32Array(await binary.arrayBuffer())};}));
 return levels;
}

// Baked anatomical poses are interpolated on the GPU. Thousands of NPCs share
// two meshes per 80 m section, instead of thousands of skeletons/draw calls.
export function buildCrowd(group,people,assets){
 const clip=p=>p.seated?(p.id%3?4:2):[5,1,5,3,5,0,5][p.id%7];
 const activityCounts=Object.fromEntries(assets[0].meta.poses.map((name,id)=>[name,people.filter(p=>clip(p)===id).length]));
 group.userData.crowd={variants:crowdVariants.map(v=>v[0]),variantCount:16,people:people.length,activityCounts,activities:assets[0].meta.poses,lods:assets.map(a=>({vertices:a.meta.vertices,triangles:a.meta.triangles,textureBytes:a.data.byteLength/3*4})),motion:'Independent deterministic clip, phase and speed; calm watcher majority'};
 const batches=[],dummy=new T.Object3D(),shared=[];
 for(const asset of assets){
  const {meta,data}=asset,g=new T.BufferGeometry(),positions=new Float32Array(meta.vertices*3),normals=new Float32Array(meta.vertices*3);
  for(let i=0;i<meta.vertices;i++){positions.set(data.subarray(i*6,i*6+3),i*3);normals.set(data.subarray(i*6+3,i*6+6),i*3);}
  g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('aVertex',new T.Float32BufferAttribute(Array.from({length:meta.vertices},(_,i)=>i),1));g.setAttribute('aRegion',new T.Float32BufferAttribute(meta.region,1));g.setIndex(meta.indices);
  g.setAttribute('aRest',new T.Float32BufferAttribute(meta.rest,3));g.setAttribute('aHand',new T.Float32BufferAttribute(meta.hand,1));
  g.setAttribute('aAccessory',new T.Float32BufferAttribute(meta.accessory,1));
  const texture=new T.DataTexture(data,meta.vertices*2,meta.frames*meta.activities,T.RGBFormat,T.FloatType);
  // WebGL2 does not support RGB32F uploads on every tablet. Expand to RGBA32F.
  const rgba=new Float32Array(data.length/3*4);for(let i=0;i<data.length/3;i++){rgba.set(data.subarray(i*3,i*3+3),i*4);rgba[i*4+3]=1;}texture.image={data:rgba,width:meta.vertices*2,height:meta.frames*meta.activities};texture.format=T.RGBAFormat;texture.needsUpdate=true;
  const uniforms={uCrowdTime:{value:0},uCrowdPoses:{value:texture},uCrowdSize:{value:new T.Vector2(meta.vertices*2,meta.frames*meta.activities)}};
  const m=new T.MeshStandardMaterial({roughness:.92,side:T.DoubleSide});
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    attribute float aVertex;attribute float aRegion;attribute vec4 aActivity;attribute vec4 aStyle;attribute vec3 aRest;attribute float aHand;attribute float aAccessory;varying float vAccessory;varying float vHand;varying vec3 vRest;varying vec4 vStyle;uniform float uCrowdTime;uniform sampler2D uCrowdPoses;uniform vec2 uCrowdSize;
    vec3 crowdSample(float f,float offset){return texture2D(uCrowdPoses,vec2((aVertex*2.+offset+.5)/uCrowdSize.x,(aActivity.x*${meta.frames}.+f+.5)/uCrowdSize.y)).xyz;}
    vec3 crowdPose(float offset){float phase=mod(uCrowdTime*(3.8+aActivity.z)+aActivity.y,${meta.frames}.);return mix(crowdSample(0.,offset),mix(crowdSample(floor(phase),offset),crowdSample(mod(floor(phase)+1.,${meta.frames}.),offset),fract(phase)),aActivity.w);}
   `).replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(crowdPose(1.));').replace('#include <begin_vertex>',`vec3 transformed=crowdPose(0.);vRest=aRest;vStyle=aStyle;vHand=aHand;vAccessory=aAccessory;
    float head=smoothstep(1.40,1.48,aRest.y);
    transformed.x*=mix(aStyle.y,.94+mod(aStyle.x,4.)*.045,head);transformed.z*=mix(aStyle.y,1.,head);
    transformed.y+=head*(aRest.y-1.54)*(mod(aStyle.x,4.)-1.5)*.06;
    // Blouse/tunic hems and long skirts create recognisable clothing outlines.
    if(mod(aStyle.x,8.)==7.&&aRest.y>.35&&aRest.y<.95){transformed.x+=sign(aRest.x)*(.95-aRest.y)*.12;transformed.z+=sign(aRest.z)*.025;}
    if(mod(aStyle.x,4.)==3.&&aRest.y>.80&&aRest.y<1.15){transformed.x*=1.10;transformed.z*=1.08;}
    if(aAccessory>.5){bool showCap=aAccessory<1.5&&aStyle.w==4.;bool showHair=aAccessory>1.5&&(aStyle.w==1.||aStyle.w==3.);if(!showCap&&!showHair)transformed=vec3(0.);}
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCrowdRegion;varying float vCrowdSkin;varying vec3 vRest;varying vec4 vStyle;varying float vHand;varying float vAccessory;');
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vCrowdRegion;varying float vCrowdSkin;').replace('#include <color_vertex>','#include <color_vertex>\nvCrowdRegion=aRegion;vCrowdSkin=aActivity.z;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
    vec3 npcColor=mix(vec3(.36,.20,.12),vec3(.72,.49,.32),vStyle.z);
    float variant=floor(vStyle.x+.5);float hairType=floor(vStyle.w+.5);
    float y=vRest.y;float x=abs(vRest.x);float front=step(.104,vRest.z);
    bool head=y>1.435;
    bool shirt=y>.94&&y<1.405&&(x<.25||vCrowdRegion>.5&&vCrowdRegion<1.5);
    if(mod(variant,4.)==1.&&y>.98&&y<1.39&&x<.46)shirt=true;
    if(mod(variant,4.)==3.&&y>.80&&y<1.405&&x<.29)shirt=true;
    if(vHand>.12)shirt=false;
    if(shirt){npcColor=vColor.rgb;if(variant>11.5&&variant<14.)npcColor*=mix(.60,1.,step(.5,fract(y*17.)));}
    if(!head&&y<.94&&vHand<.12)npcColor=mix(vec3(.055,.075,.105),vec3(.28,.22,.17),mod(variant,3.)*.5);
    if(y<.075)npcColor=vec3(.065,.057,.045);
    if(head){
     float hairline=hairType==1.?1.61:1.637;
     bool hair=y>hairline||(vRest.z<.045&&y>(hairType==1.||hairType==3.?1.47:1.58));
     vec3 hairColor=hairType==2.?vec3(.31,.29,.25):vec3(.045,.033,.022);
     if(hair)npcColor=hairType==4.?mix(vec3(.83,.78,.64),vColor.rgb,.35):hairColor;
     // Eye/brow/mouth marks stay tied to the rest head while the body animates.
     float eyes=(1.-smoothstep(.010,.015,abs(x-(.027+mod(variant,4.)*.002))))*(1.-smoothstep(.004,.008,abs(y-1.577)))*front;
     float brows=(1.-smoothstep(.013,.018,abs(x-.031)))*(1.-smoothstep(.002,.004,abs(y-1.590)))*front;
     float mouth=(1.-smoothstep(.017,.022,x))*(1.-smoothstep(.002,.005,abs(y-1.508)))*front;
     npcColor=mix(npcColor,vec3(.045,.030,.023),max(eyes,max(brows,mouth*.65)));
    }
    if(vAccessory>.5)npcColor=vAccessory<1.5?vec3(.90,.91,.85):vec3(.045,.033,.023);
    diffuseColor.rgb*=npcColor;`);
  };
  m.customProgramCacheKey=()=> 'anatomical-crowd-v10-'+meta.vertices;shared.push({g,m,texture,uniforms});
 }
 const sections=new Map();for(const p of people){const key=Math.floor(p.x/80);if(!sections.has(key))sections.set(key,[]);sections.get(key).push(p);}
 for(const list of sections.values()){
  const cx=list.reduce((n,p)=>n+p.x,0)/list.length;
  for(let level=0;level<2;level++){
   const s=shared[level],g=s.g.clone(),activity=[],style=[];const mesh=new T.InstancedMesh(g,s.m,list.length);mesh.name='Crowd_Anatomical_'+level+'_'+Math.round(cx);mesh.frustumCulled=false;
   list.forEach((p,i)=>{const id=p.id%16,v=crowdVariants[id];dummy.position.set(p.x,p.floor,p.z);dummy.rotation.set(0,(p.z<0?0:Math.PI)+Math.sin(p.id*2.13)*.16,0);dummy.scale.set(p.width,p.height*v[2],p.width);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(p.shirt));activity.push(clip(p),p.id*7.731%24,-1.8+(p.id*13%17)/17*3.0,.55+(p.id*11%9)/20);style.push(id,v[1],(p.id*7%13)/12,v[3]);});
   g.setAttribute('aActivity',new T.InstancedBufferAttribute(new Float32Array(activity),4));group.add(mesh);batches.push({mesh,cx,level});
   g.setAttribute('aStyle',new T.InstancedBufferAttribute(new Float32Array(style),4));
  }
 }
 return {count:people.length,update(time,cameraX){shared.forEach(s=>s.uniforms.uCrowdTime.value=time);for(const b of batches){const distance=Math.abs(cameraX-b.cx);b.mesh.visible=distance<520&&(distance<55?0:1)===b.level;}},dispose(){batches.forEach(b=>{b.mesh.geometry.dispose();b.mesh.dispose();group.remove(b.mesh);});shared.forEach(s=>{s.g.dispose();s.m.dispose();s.texture.dispose();});}};
}
