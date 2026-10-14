import * as T from 'three';

// Authored adult silhouettes, not identities of people in event photographs.
export const crowdVariants=[
 ['young man tee',1,1,0],['woman blouse',.88,.95,1],['older man polo',1.12,.96,2],['older woman tunic',1.08,.91,3],
 ['slim man vest',.86,1.07,0],['woman long sleeve',.92,1.02,1],['stocky man tee',1.24,.98,0],['woman dress',1.02,.97,3],
 ['man cap',1.03,1.05,4],['woman cap',.91,.96,4],['older man grey hair',1.09,.93,2],['woman bob',.96,1.03,3],
 ['tall man striped polo',.95,1.12,0],['woman striped blouse',.88,1.06,1],['stocky older woman',1.19,.94,2],['man light cap',1.13,1.02,4],
];

const palette=['#d56d43','#ca9c3e','#ae4f6b','#577e9c','#569079','#7866a0','#d5c59f','#8d4f38','#387b87','#c7829b','#718347','#ece2c7','#b2463d','#46669c','#967856','#8b9690'];
export function crowdIdentity(p){
 const seed=(Math.imul((p.id|0)^0x7f4a7c15,0x45d9f3b)^Math.imul(Math.round(p.x*100),0x27d4eb2d)^Math.imul(Math.round(p.z*100),0x165667b1))>>>0;
 const random=salt=>{let h=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return((h^(h>>>16))>>>0)/4294967296;};
 const profile=Math.floor(random(0)*16),v=crowdVariants[profile],r=random(1),age=r<.09?'adolescent':r<.29?'older adult':'young adult',feminine=[1,3,5,7,9,11,13,14].includes(profile),gender=feminine?'feminine styling':'masculine styling',choice=random(5),clip=p.seated?(choice<.68?4:2):choice<.50?5:choice<.69?1:choice<.86?3:0;
 const clothing=Math.floor(random(2)*8)*2+(feminine?1:0),hair=age==='older adult'&&random(3)<.70?2:feminine?[1,3,4][Math.floor(random(3)*3)]:[0,0,4][Math.floor(random(3)*3)];
 return {seed,profile,age,gender,clothing,hair,color:palette[Math.floor(random(4)*palette.length)],clip,phase:random(6)*24,speed:2.8+random(7)*3.8,intensity:(clip===4||clip===5?.75:.55)+random(8)*.25,width:v[1]*(.94+random(9)*.12),height:v[2]*(age==='adolescent'?.76:age==='older adult'?.94:1)*(.97+random(10)*.06),skin:random(11),yaw:(random(12)-.5)*.32,breathe:random(13)*6.283185};
}

export async function loadCrowdAssets(base){
 const levels=await Promise.all(['near','far'].map(async name=>{const res=await fetch(base+'assets/human/crowd-v10-'+name+'.json');if(!res.ok)throw Error('Không tải được NPC');const meta=await res.json(),binary=await fetch(base+'assets/human/'+meta.binary);if(!binary.ok)throw Error('Không tải được chuyển động NPC');return {meta,data:new Float32Array(await binary.arrayBuffer())};}));
 return levels;
}

// Baked anatomical poses are interpolated on the GPU. Thousands of NPCs share
// two meshes per 80 m section, instead of thousands of skeletons/draw calls.
export function buildCrowd(group,people,assets){
 const identities=new Map(people.map(p=>[p,crowdIdentity(p)])),clip=p=>identities.get(p).clip;
 const demographicCounts={age:{},gender:{},profile:{},palette:{}};for(const q of identities.values())for(const [key,value] of [['age',q.age],['gender',q.gender],['profile',q.profile],['palette',q.color]])demographicCounts[key][value]=(demographicCounts[key][value]||0)+1;
 const activityCounts=Object.fromEntries(assets[0].meta.poses.map((name,id)=>[name,people.filter(p=>clip(p)===id).length]));
 group.userData.crowd={variants:crowdVariants.map(v=>v[0]),variantCount:16,people:people.length,demographicCounts,randomization:{algorithm:'salted id and centimetre coordinates',samples:people.slice(0,24).map(p=>({id:p.id,...identities.get(p)}))},activityCounts,activities:assets[0].meta.poses,lods:assets.map(a=>({vertices:a.meta.vertices,triangles:a.meta.triangles,textureBytes:a.data.byteLength/3*4})),motion:'Independent deterministic clip, phase and speed; calm watcher majority'};
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
    attribute float aVertex;attribute float aRegion;attribute vec4 aActivity;attribute vec4 aStyle;attribute vec2 aMotion;attribute vec3 aRest;attribute float aHand;attribute float aAccessory;varying float vAccessory;varying float vHand;varying vec3 vRest;varying vec4 vStyle;uniform float uCrowdTime;uniform sampler2D uCrowdPoses;uniform vec2 uCrowdSize;
    vec3 crowdSample(float f,float offset){return texture2D(uCrowdPoses,vec2((aVertex*2.+offset+.5)/uCrowdSize.x,(aActivity.x*${meta.frames}.+f+.5)/uCrowdSize.y)).xyz;}
    vec3 crowdPose(float offset){float phase=mod(uCrowdTime*aActivity.z+aActivity.y,${meta.frames}.);return mix(crowdSample(0.,offset),mix(crowdSample(floor(phase),offset),crowdSample(mod(floor(phase)+1.,${meta.frames}.),offset),fract(phase)),aActivity.w);}
   `).replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(crowdPose(1.));').replace('#include <begin_vertex>',`vec3 transformed=crowdPose(0.);vRest=aRest;vStyle=aStyle;vHand=aHand;vAccessory=aAccessory;
    float upper=smoothstep(.78,1.40,aRest.y);transformed.y+=.005*sin(uCrowdTime*(1.35+aMotion.y*.07)+aMotion.x)*upper;transformed.z+=.006*sin(uCrowdTime*.67+aMotion.x)*upper;
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
  m.customProgramCacheKey=()=> 'anatomical-crowd-v16-'+meta.vertices;shared.push({g,m,texture,uniforms});
 }
 const sections=new Map();for(const p of people){const key=Math.floor(p.x/80)+':'+Math.sign(p.z);if(!sections.has(key))sections.set(key,[]);sections.get(key).push(p);}
 for(const list of sections.values()){
  const cx=list.reduce((n,p)=>n+p.x,0)/list.length,cz=list.reduce((n,p)=>n+p.z,0)/list.length;
  for(let level=0;level<2;level++){
   const s=shared[level],g=s.g.clone(),activity=[],style=[],motion=[];const mesh=new T.InstancedMesh(g,s.m,list.length);mesh.name='Crowd_Anatomical_'+level+'_'+Math.round(cx)+'_'+Math.sign(cz);mesh.frustumCulled=false;
   list.forEach((p,i)=>{const q=identities.get(p);dummy.position.set(p.x,p.floor,p.z);dummy.rotation.set(0,(p.z<0?0:Math.PI)+q.yaw,0);dummy.scale.set(p.width,p.height*q.height,p.width);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(q.color));activity.push(q.clip,q.phase,q.speed,q.intensity);style.push(q.clothing,q.width,q.skin,q.hair);motion.push(q.breathe,q.profile);});
   g.setAttribute('aActivity',new T.InstancedBufferAttribute(new Float32Array(activity),4));group.add(mesh);batches.push({mesh,cx,cz,level});
   g.setAttribute('aStyle',new T.InstancedBufferAttribute(new Float32Array(style),4));g.setAttribute('aMotion',new T.InstancedBufferAttribute(new Float32Array(motion),2));
  }
 }
 return {count:people.length,update(time,cameraX,cameraZ=0){shared.forEach(s=>s.uniforms.uCrowdTime.value=time);for(const b of batches){const distance=Math.hypot(cameraX-b.cx,cameraZ-b.cz);b.mesh.visible=distance<430&&(distance<45?0:1)===b.level;}},dispose(){batches.forEach(b=>{b.mesh.geometry.dispose();b.mesh.dispose();group.remove(b.mesh);});shared.forEach(s=>{s.g.dispose();s.m.dispose();s.texture.dispose();});}};
}

// Coherent studio NPCs; retains the baked festival crowd API above.
const THREE = T;

const IDS = ['casual-man', 'hoodie-man', 'casual-woman', 'beach-man', 'farmer-man', 'suit-man', 'worker-man', 'punk-man', 'formal-woman', 'suit-woman', 'worker-woman'];
const smooth = x => x * x * (3 - 2 * x);

export function orientBone(bone, child, destination, weight) {
  const position=bone.getWorldPosition(new THREE.Vector3()),current=child.getWorldPosition(new THREE.Vector3()).sub(position).normalize(),desired=destination.clone().sub(position).normalize();
  const world=bone.getWorldQuaternion(new THREE.Quaternion()),rotation=new THREE.Quaternion().setFromUnitVectors(current,desired).multiply(world);
  const local=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation);
  bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);
}
function gestureArm(entry,side,target,weight,kind) {
  const root=entry.root,upper=root.getObjectByName('UpperArm'+side),lower=root.getObjectByName('LowerArm'+side),wrist=root.getObjectByName('Wrist'+side);
  if(!upper||!lower||!wrist)return;
  const a=upper.getWorldPosition(new THREE.Vector3()),e=lower.getWorldPosition(new THREE.Vector3()),w=wrist.getWorldPosition(new THREE.Vector3());
  const upperLength=a.distanceTo(e),lowerLength=e.distanceTo(w),end=root.localToWorld(target.clone()),axis=end.clone().sub(a),distance=THREE.MathUtils.clamp(axis.length(),Math.abs(upperLength-lowerLength)+.01,upperLength+lowerLength-.01);axis.normalize();end.copy(a).addScaledVector(axis,distance);
  const sign=side==='L'?1:-1,hint=root.localToWorld(root.worldToLocal(a.clone()).add(new THREE.Vector3(sign*.25,-.15,.10))).sub(a);
  const bend=hint.addScaledVector(axis,-hint.dot(axis)).normalize(),along=(upperLength**2-lowerLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,upperLength**2-along**2)),elbow=a.clone().addScaledVector(axis,along).addScaledVector(bend,height);
  orientBone(upper,lower,elbow,weight);orientBone(lower,wrist,end,weight);
  const middle=root.getObjectByName('Middle2'+side),index=root.getObjectByName('Index2'+side),pinky=root.getObjectByName('Pinky2'+side);
  if(!middle||!index||!pinky)return;
  const origin=wrist.getWorldPosition(new THREE.Vector3()),long=middle.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),across=index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3()));across.addScaledVector(long,-across.dot(long)).normalize();
  const currentFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,long,across.clone().cross(long).normalize()));
  const forward=(kind==='indicate'?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0)).transformDirection(root.matrixWorld),width=(kind==='clap'?new THREE.Vector3(0,0,sign):new THREE.Vector3(1,0,0)).transformDirection(root.matrixWorld);
  const desiredFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(width,forward,width.clone().cross(forward).normalize())),desiredWorld=desiredFrame.multiply(currentFrame.invert()).multiply(wrist.getWorldQuaternion(new THREE.Quaternion()));
  const desiredLocal=wrist.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desiredWorld);wrist.quaternion.slerp(desiredLocal,weight);wrist.updateWorldMatrix(false,true);
}
export function crowdGesture(entry,time,weight) {
  if(weight<1e-5||entry.walk)return;
  const chest=entry.root.getObjectByName('Chest');if(!chest)return;entry.root.updateWorldMatrix(true,true);
  const center=entry.root.worldToLocal(chest.getWorldPosition(new THREE.Vector3())),kind=['clap','cheer','indicate'][entry.index%3];
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;if(kind==='indicate'&&side==='R')continue;
    let target;
    if(kind==='clap'){const separation=.014+.095*(.5+.5*Math.cos(time*2*Math.PI*1.65));target=center.clone().add(new THREE.Vector3(sign*separation,-.16,.30));}
    if(kind==='cheer')target=center.clone().add(new THREE.Vector3(sign*.27,.29+.025*Math.sin(time*5+sign),.10));
    if(kind==='indicate')target=center.clone().add(new THREE.Vector3(sign*.29,-.08,.34+.015*Math.sin(time*3)));
    gestureArm(entry,side,target,weight,kind);
  }
  entry.root.userData.crowdGesture=kind;
}

/** Absolute seconds, deterministic phases; all motion stays on the promenade. */
export async function createCoherentNpcs(scene, loader, base) {
  const url = base.replace(/\/?$/, '/') + 'assets/coherent-v20/npcs/';
  const models = await Promise.all(IDS.map(id => loader.loadAsync(url + id + '.glb')));
  const entries = models.map((model, index) => {
    const root = model.scene;
    root.name = 'Civilian_' + IDS[index];
    const box = new THREE.Box3().setFromObject(root);
    const height = index === 2 || index >= 8 ? 1.64 : 1.73;
    root.scale.setScalar(height / (box.max.y - box.min.y));
    const x = index < 3 ? [-1.7, .1, 1.9][index] : [-17, -12.5, -8, -4.5, 5.5, 10, 14.5, 18][index - 3];
    const z = index < 3 ? .3 : [1.05, 2.3, 1.55, 2.65, 1.05, 2.15, 1.4, 2.65][index - 3];
    root.position.set(x, -box.min.y * root.scale.y, z);
    root.rotation.y = Math.PI;
    root.updateMatrixWorld(true);
    const worldBounds=new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());worldBounds.radius*=1.4;
    root.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = !object.isSkinnedMesh; if(object.isSkinnedMesh){object.userData.coherentNpc=true;object.boundingSphere=worldBounds.clone().applyMatrix4(object.matrixWorld.clone().invert());object.frustumCulled=true;} } });
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const name of ['Idle_Neutral', 'Idle', 'Wave', 'Walk']) {
      const clip = model.animations.find(c => c.name === name);
      if (clip) actions[name] = mixer.clipAction(clip).play().setEffectiveWeight(0);
    }
    (actions.Idle_Neutral || actions.Idle)?.setEffectiveWeight(1);
    return { root, mixer, actions, x, z, index, phase: index * 3.719, walk: [5, 9].includes(index) };
  });
  let disposed = false;
  const roots = entries.map(e => e.root);
  return {
    roots,
    stats: { count: roots.length, uniqueModels: IDS.length, sourceActions: ['Idle', 'Idle_Neutral', 'Wave', 'Walk'], authoredActions: ['clap','cheer','indicate'], ids: [...IDS] },
    update(time) {
      if (disposed) return;
      for (const e of entries) {
        const t = time + e.phase;
        const cycle = ((t % 18) + 18) % 18;
        const wave = e.walk ? 0 : cycle < 5 ? Math.min(smooth(Math.min(cycle / .65, 1)), smooth(Math.min((5 - cycle) / .65, 1))) : 0;
        for (const a of Object.values(e.actions)) a.setEffectiveWeight(0);
        const idle = e.actions.Idle_Neutral || e.actions.Idle;
        const walkWeight = e.walk ? smooth(Math.min(Math.abs(Math.cos(t * .40)) / .3, 1)) : 0;
        idle?.setEffectiveWeight(e.walk ? 1 - walkWeight : 1 - wave);
        e.actions.Wave?.setEffectiveWeight(wave);
        e.actions.Walk?.setEffectiveWeight(walkWeight);
        e.mixer.setTime(t);
        const gestureWeight=cycle>6&&cycle<12?smooth(Math.min((cycle-6)/.8,1))*smooth(Math.min((12-cycle)/.8,1)):0;
        e.root.userData.crowdGesture=wave>.2?'wave':e.walk?'walk':'idle';crowdGesture(e,t,gestureWeight);
        if (e.walk) {
          // A short slow route with eased turns, bounded well inside X -20..20.
          const p = t * .40;
          e.root.position.x = e.x + Math.sin(p) * 1.25;
          e.root.rotation.y = Math.atan2(Math.cos(p), .15);
        }
        e.root.position.z = e.z;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
      for (const e of entries) {
        e.mixer.stopAllAction(); e.mixer.uncacheRoot(e.root); e.root.removeFromParent();
        e.root.traverse(o => { if (o.skeleton) skeletons.add(o.skeleton); if (o.isMesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value); } } });
      }
      for (const t of textures) t.dispose();
      for (const m of materials) m.dispose();
      for (const g of geometries) g.dispose();
      for (const s of skeletons) s.dispose();
    },
  };
}
