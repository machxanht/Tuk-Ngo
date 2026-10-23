import * as T from 'three';
import {boatHullGeometry} from './boat.mjs';
import {courseZ} from './maspero-layout.mjs';
import {FESTIVAL_TEAMS} from './festival-teams.mjs';
import {acquireKbachAtlas} from './kbach-library.mjs';
import {assetBytes,releaseAssetBytes} from './asset-transfer.mjs';
import {ceremonyCrewDigest} from './asset-digests.mjs';
import {ceremonyPlacement} from './ceremony-layout.mjs';
export {ceremonyPlacement} from './ceremony-layout.mjs';

export async function buildMenuCeremony(scene,base){
 const url=base+'assets/athlete-master/ceremony-crew.json?sha='+ceremonyCrewDigest,data=JSON.parse(new TextDecoder().decode(await assetBytes(url)));releaseAssetBytes(url);
 const group=new T.Group();group.name='Festival_Ceremony_61_Boats';group.visible=false;scene.add(group);
 const resources=[],geometries=[],meshes=[],uniform={value:0};
 const libraryRoot=base+'assets/ghe-ngo/kbach-library/',sharedAtlas=acquireKbachAtlas(libraryRoot),{catalog,texture}=await sharedAtlas.ready;
 const hullGeo=boatHullGeometry({segments:84,sections:10,interior:false}),kbachRows=Float32Array.from({length:61},(_,i)=>i%catalog.items.length);hullGeo.setAttribute('aKbachRow',new T.InstancedBufferAttribute(kbachRows,1));geometries.push(hullGeo);
 const hullMat=new T.MeshLambertMaterial({map:texture,side:T.DoubleSide});
 hullMat.onBeforeCompile=s=>{s.vertexShader='attribute float aKbachRow;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
 vMapUv.y=(aKbachRow*${catalog.atlas.cellHeight.toFixed(1)}+${catalog.atlas.padding.toFixed(1)}+vMapUv.y*${(catalog.atlas.cellHeight-2*catalog.atlas.padding).toFixed(1)})/${catalog.atlas.size[1].toFixed(1)};
 `);};resources.push(hullMat);
 const hulls=new T.InstancedMesh(hullGeo,hullMat,61);hulls.name='Ceremony_Painted_Hulls';hulls.frustumCulled=false;group.add(hulls);meshes.push(hulls);
 const count=61*50,tints=new Float32Array(count*3),motions=new Float32Array(count*4),hairStyles=Float32Array.from({length:count},(_,i)=>(i*7+Math.floor(i/50))%4);
 for(let i=0;i<count;i++){new T.Color(FESTIVAL_TEAMS[Math.floor(i/50)].jersey).toArray(tints,i*3);motions.set([(i*1.713)%data.motion.duration,.86+(i%13)*.023,i%3?0:1,i%2?1:-1],i*4);}
 function crewGeometry(indices){
  const g=new T.BufferGeometry();for(const [name,a]of Object.entries(data.attributes))g.setAttribute(name,new T.Float32BufferAttribute(a.array,a.size));g.setIndex(indices);
  g.setAttribute('aTint',new T.InstancedBufferAttribute(tints.slice(),3));g.setAttribute('aMotion',new T.InstancedBufferAttribute(motions.slice(),4));g.setAttribute('aHairStyle',new T.InstancedBufferAttribute(hairStyles.slice(),1));
  g.setAttribute('aVertexId',new T.Float32BufferAttribute(Array.from({length:data.vertices},(_,i)=>i),1));geometries.push(g);return g;
 }
 const crewGeo=crewGeometry(data.indices),farCrewGeo=crewGeometry(data.farIndices);
 const bytes=Uint8Array.from(atob(data.motion.pixels),c=>c.charCodeAt(0)),poses=new T.DataTexture(new Float32Array(bytes.buffer),data.motion.width,data.motion.height,T.RGBAFormat,T.FloatType);poses.needsUpdate=true;poses.minFilter=poses.magFilter=T.NearestFilter;poses.generateMipmaps=false;resources.push(poses);
 const crewMat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});resources.push(crewMat);
 crewMat.onBeforeCompile=s=>{
  s.uniforms.uCeremonyTime=uniform;s.uniforms.uCeremonyPoses={value:poses};
  s.vertexShader=`attribute float aKit;attribute vec3 aTint;attribute vec4 aMotion;attribute float aVertexId;attribute vec4 aScalp;attribute float aHairStyle;varying vec4 vScalp;varying float vHairStyle;varying float vKit;varying vec3 vTint;uniform float uCeremonyTime;uniform sampler2D uCeremonyPoses;
   vec3 ceremonyPose(float normalRow){float f=mod((uCeremonyTime*aMotion.y+aMotion.x)/${data.motion.duration.toFixed(4)}*${data.motion.frames}.,${data.motion.frames}.);float row=aMotion.z*${data.motion.frames}.+normalRow;float x=(aVertexId+.5)/${data.vertices}.;vec3 a=texture2D(uCeremonyPoses,vec2(x,(row+floor(f)+.5)/${data.motion.height}.)).xyz,b=texture2D(uCeremonyPoses,vec2(x,(row+mod(floor(f)+1.,${data.motion.frames}.)+.5)/${data.motion.height}.)).xyz;vec3 p=mix(a,b,fract(f));p.x*=aMotion.w;return p;}
  `+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`vec3 objectNormal=normalize(ceremonyPose(${data.motion.frames*data.motion.variants}.))*aMotion.w;`).replace('#include <begin_vertex>','vec3 transformed=ceremonyPose(0.);vKit=aKit;vTint=aTint;vScalp=aScalp;vHairStyle=aHairStyle;');
  s.fragmentShader='varying float vKit;varying vec3 vTint;varying vec4 vScalp;varying float vHairStyle;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   diffuseColor.rgb=mix(diffuseColor.rgb,vTint,vKit);
   float front=smoothstep(-.005,.055,vScalp.z),hairline=mix(.014,.071,front);
   if(vHairStyle>.5&&vHairStyle<1.5)hairline-=.015;
   if(vHairStyle>1.5&&vHairStyle<2.5)hairline+=vScalp.x*.22;
   if(vHairStyle>2.5)hairline+=sin(vScalp.x*65.)*.008-.006;
   float hairMask=vScalp.w>1.5?1.:smoothstep(.72,.88,vScalp.w)*smoothstep(hairline-.002,hairline+.002,vScalp.y);
   diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.018,.014,.012),vec3(.065,.035,.020),vHairStyle/3.),hairMask);
  `);
 };
 const crew=new T.InstancedMesh(crewGeo,crewMat,count),farCrew=new T.InstancedMesh(farCrewGeo,crewMat,count);crew.name='Ceremony_Hat_Salute_Athletes';farCrew.name='Ceremony_Distant_Athletes';crew.frustumCulled=farCrew.frustumCulled=false;crew.count=0;group.add(crew,farCrew);meshes.push(crew,farCrew);
 const capGeo=new T.BufferGeometry();for(const [name,a]of Object.entries(data.cap.attributes))capGeo.setAttribute(name,new T.Float32BufferAttribute(a.array,a.size));capGeo.setIndex(data.cap.indices);geometries.push(capGeo);
 const capMat=new T.MeshLambertMaterial({color:'white',side:T.DoubleSide}),caps=new T.InstancedMesh(capGeo,capMat,count);caps.name='Ceremony_Handheld_Baseball_Caps';caps.frustumCulled=false;resources.push(capMat);group.add(caps);meshes.push(caps);
 const capColors=['#ffdc42','#f9f4df','#20a96e','#f34d45','#289bd7','#ec74b0','#a570cf','#ff9c30'];for(let i=0;i<count;i++)caps.setColorAt(i,new T.Color(capColors[(Math.floor(i/50)*5+(i%17===0?1:0))%capColors.length]));
 const paddleGeo=new T.BoxGeometry(.045,1.35,.055),bladeGeo=new T.BoxGeometry(.13,.47,.025),wood=new T.MeshLambertMaterial({color:'#d19b4a'});geometries.push(paddleGeo,bladeGeo);resources.push(wood);
 const paddles=new T.InstancedMesh(paddleGeo,wood,61*4),blades=new T.InstancedMesh(bladeGeo,wood,61*4);paddles.frustumCulled=blades.frustumCulled=false;group.add(paddles,blades);meshes.push(paddles,blades);
 const floorGeo=new T.BoxGeometry(25.8,.045,.75),floorMat=new T.MeshLambertMaterial({color:'white'}),floors=new T.InstancedMesh(floorGeo,floorMat,61);geometries.push(floorGeo);resources.push(floorMat);floors.frustumCulled=false;group.add(floors);meshes.push(floors);
 // At aerial distance the colored interior reinforces each crew's jersey mass.
 FESTIVAL_TEAMS.forEach((team,i)=>floors.setColorAt(i,new T.Color(team.interior||team.jersey).lerp(new T.Color('#c19554'),.18)));
 const dummy=new T.Object3D(),local=new T.Object3D(),hat=new T.Object3D(),m=new T.Matrix4(),personMatrix=new T.Matrix4();
 let last=-Infinity;
 function update(time,camera){
  uniform.value=time;if(!group.visible||time-last<1/20)return;last=time;
  const placements=Array.from({length:61},(_,i)=>ceremonyPlacement(i,time)),near=new Set(camera&&camera.position.y<16?placements.map((p,i)=>({i,d:Math.hypot(p.x-camera.position.x,p.z-camera.position.z)})).filter(p=>p.d<24).sort((a,b)=>a.d-b.d).slice(0,2).map(p=>p.i):[]);
  let nearCount=0,farCount=0;
  function person(mesh,index,original,matrix){mesh.setMatrixAt(index,matrix);for(const [name,values,size]of [['aTint',tints,3],['aMotion',motions,4],['aHairStyle',hairStyles,1]])mesh.geometry.attributes[name].array.set(values.subarray(original*size,(original+1)*size),index*size);}
  for(let b=0;b<61;b++){
   const p=placements[b];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();hulls.setMatrixAt(b,dummy.matrix);
   local.position.set(0,.36,0);local.rotation.set(0,0,0);local.updateMatrix();floors.setMatrixAt(b,m.multiplyMatrices(dummy.matrix,local.matrix));
   for(let j=0;j<50;j++){
    const side=j%2?1:-1,x=-11.4+Math.floor(j/2)*.94,i=b*50+j;
    local.position.set(x,.02,side*.24);local.rotation.set(0,Math.PI/2,0);local.scale.set(1,1,1);local.updateMatrix();personMatrix.multiplyMatrices(dummy.matrix,local.matrix);person(near.has(b)?crew:farCrew,near.has(b)?nearCount++:farCount++,i,personMatrix);
    const frame=((time*motions[i*4+1]+motions[i*4])/data.motion.duration*data.motion.frames)%data.motion.frames,f=Math.floor(frame),u=frame-f,a=data.motion.hatFrames[motions[i*4+2]*data.motion.frames+f],h=data.motion.hatFrames[motions[i*4+2]*data.motion.frames+(f+1)%data.motion.frames],value=k=>a[k]+(h[k]-a[k])*u;
    hat.position.set(value(0)*motions[i*4+3],value(1),value(2));hat.rotation.set(value(3),value(4)*motions[i*4+3],value(5)*motions[i*4+3]);hat.updateMatrix();caps.setMatrixAt(i,m.multiplyMatrices(personMatrix,hat.matrix));
   }
   for(let j=0;j<4;j++){local.position.set(-8+j*5,.60,j%2?.30:-.30);local.rotation.set(0,0,Math.PI/2);local.updateMatrix();paddles.setMatrixAt(b*4+j,m.multiplyMatrices(dummy.matrix,local.matrix));local.position.x-=.63;local.updateMatrix();blades.setMatrixAt(b*4+j,m.multiplyMatrices(dummy.matrix,local.matrix));}
  }
  crew.count=nearCount;farCrew.count=farCount;stats.nearAthletes=nearCount;stats.farAthletes=farCount;
  for(const mesh of [crew,farCrew])for(const name of ['aTint','aMotion','aHairStyle'])mesh.geometry.attributes[name].needsUpdate=true;
  meshes.forEach(mesh=>mesh.instanceMatrix.needsUpdate=true);
 }
 const stats={boats:61,athletes:count,crewTriangles:data.triangles,farCrewTriangles:data.farTriangles,wardrobe:data.wardrobe,maxDetailedBoats:2,capTriangles:data.cap.triangles,saluteVariants:data.motion.variants,saluteFrames:data.motion.frames,handheldCaps:count,capColors:capColors.length,hair:data.hair,kbach:{sharedAtlas:true,texture:catalog.atlas.size,designs:catalog.items.length,source:catalog.uploader},formation:'irregular tightly packed raft at the main grandstand',reference:'https://www.youtube.com/watch?v=hNSDABjJ6GU',drawCalls:meshes.length,source:data.source};group.userData=stats;
 return {group,stats,update,dispose(){group.removeFromParent();meshes.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());resources.forEach(r=>r.dispose());sharedAtlas.release();}};
}
