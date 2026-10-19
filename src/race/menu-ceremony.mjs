import * as T from 'three';
import {profile} from './boat.mjs';
import {courseZ} from './maspero-layout.mjs';
import {FESTIVAL_TEAMS} from './festival-teams.mjs';
import {paintFestivalLivery} from './team-style.mjs';
import {assetBytes,releaseAssetBytes} from './asset-transfer.mjs';
import {ceremonyCrewDigest} from './asset-digests.mjs';
import {ceremonyPlacement} from './ceremony-layout.mjs';
export {ceremonyPlacement} from './ceremony-layout.mjs';

function hullGeometry(){
 const p=[],uv=[],ix=[],n=84,sides=10;
 for(let i=0;i<=n;i++){
  const x=-15.095+i/n*30.19,section=profile(x);
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI,y=section.g-(section.g-section.k)*Math.sin(a),z=section.b*Math.cos(a);p.push(x,y,z);uv.push(i/n,Math.sin(a));}
 }
 for(let i=0;i<n;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export async function buildMenuCeremony(scene,base){
 const url=base+'assets/athlete-master/ceremony-crew.json?sha='+ceremonyCrewDigest,data=JSON.parse(new TextDecoder().decode(await assetBytes(url)));releaseAssetBytes(url);
 const group=new T.Group();group.name='Festival_Ceremony_61_Boats';group.visible=false;scene.add(group);
 const resources=[],geometries=[],meshes=[],uniform={value:0};
 const atlas=document.createElement('canvas');atlas.width=4096;atlas.height=512;const ctx=atlas.getContext('2d');ctx.scale(2,2);paintFestivalLivery(ctx,null);
 const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.anisotropy=8;resources.push(texture);
 const hullGeo=hullGeometry(),bandTints=new Float32Array(61*3);FESTIVAL_TEAMS.forEach((team,i)=>new T.Color(team.jersey).toArray(bandTints,i*3));hullGeo.setAttribute('aBandTint',new T.InstancedBufferAttribute(bandTints,3));geometries.push(hullGeo);
 const hullMat=new T.MeshLambertMaterial({map:texture,side:T.DoubleSide});
 hullMat.onBeforeCompile=s=>{s.vertexShader='attribute vec3 aBandTint;varying vec3 vBandTint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vBandTint=aBandTint;');s.fragmentShader='varying vec3 vBandTint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n float bandMask=step(.25,sampledDiffuseColor.r)*step(sampledDiffuseColor.g*2.8,sampledDiffuseColor.r)*step(sampledDiffuseColor.b*2.8,sampledDiffuseColor.r);diffuseColor.rgb=mix(diffuseColor.rgb,vBandTint,bandMask);');};resources.push(hullMat);
 const hulls=new T.InstancedMesh(hullGeo,hullMat,61);hulls.name='Ceremony_Painted_Hulls';hulls.frustumCulled=false;group.add(hulls);meshes.push(hulls);
 const crewGeo=new T.BufferGeometry();for(const [name,a]of Object.entries(data.attributes))crewGeo.setAttribute(name,new T.Float32BufferAttribute(a.array,a.size));crewGeo.setIndex(data.indices);
 const count=61*50,tints=new Float32Array(count*3),motions=new Float32Array(count*4);
 for(let i=0;i<count;i++){new T.Color(FESTIVAL_TEAMS[Math.floor(i/50)].jersey).toArray(tints,i*3);motions.set([(i*1.713)%data.motion.duration,.86+(i%13)*.023,i%3?0:1,i%2?1:-1],i*4);}
 crewGeo.setAttribute('aTint',new T.InstancedBufferAttribute(tints,3));crewGeo.setAttribute('aMotion',new T.InstancedBufferAttribute(motions,4));crewGeo.setAttribute('aVertexId',new T.Float32BufferAttribute(Array.from({length:data.vertices},(_,i)=>i),1));geometries.push(crewGeo);
 crewGeo.setAttribute('aHairStyle',new T.InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>(i*7+Math.floor(i/50))%4),1));
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
 const crew=new T.InstancedMesh(crewGeo,crewMat,count);crew.name='Ceremony_Hat_Salute_Athletes';crew.frustumCulled=false;group.add(crew);meshes.push(crew);
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
 function update(time){
  uniform.value=time;if(!group.visible||time-last<1/20)return;last=time;
  for(let b=0;b<61;b++){
   const p=ceremonyPlacement(b,time);dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();hulls.setMatrixAt(b,dummy.matrix);
   local.position.set(0,.36,0);local.rotation.set(0,0,0);local.updateMatrix();floors.setMatrixAt(b,m.multiplyMatrices(dummy.matrix,local.matrix));
   for(let j=0;j<50;j++){
    const side=j%2?1:-1,x=-11.4+Math.floor(j/2)*.94,i=b*50+j;
    local.position.set(x,.02,side*.24);local.rotation.set(0,Math.PI/2,0);local.scale.set(1,1,1);local.updateMatrix();personMatrix.multiplyMatrices(dummy.matrix,local.matrix);crew.setMatrixAt(i,personMatrix);
    const frame=((time*motions[i*4+1]+motions[i*4])/data.motion.duration*data.motion.frames)%data.motion.frames,f=Math.floor(frame),u=frame-f,a=data.motion.hatFrames[motions[i*4+2]*data.motion.frames+f],h=data.motion.hatFrames[motions[i*4+2]*data.motion.frames+(f+1)%data.motion.frames],value=k=>a[k]+(h[k]-a[k])*u;
    hat.position.set(value(0)*motions[i*4+3],value(1),value(2));hat.rotation.set(value(3),value(4)*motions[i*4+3],value(5)*motions[i*4+3]);hat.updateMatrix();caps.setMatrixAt(i,m.multiplyMatrices(personMatrix,hat.matrix));
   }
   for(let j=0;j<4;j++){local.position.set(-8+j*5,.60,j%2?.30:-.30);local.rotation.set(0,0,Math.PI/2);local.updateMatrix();paddles.setMatrixAt(b*4+j,m.multiplyMatrices(dummy.matrix,local.matrix));local.position.x-=.63;local.updateMatrix();blades.setMatrixAt(b*4+j,m.multiplyMatrices(dummy.matrix,local.matrix));}
  }
  meshes.forEach(mesh=>mesh.instanceMatrix.needsUpdate=true);
 }
 const stats={boats:61,athletes:count,crewTriangles:data.triangles,capTriangles:data.cap.triangles,saluteVariants:data.motion.variants,saluteFrames:data.motion.frames,handheldCaps:count,capColors:capColors.length,hair:data.hair,kbach:{sharedMaster:true,texture:[4096,512],paletteVariants:61,source:'owner-supplied graphic clip; vector contours'},formation:'irregular tightly packed raft at the main grandstand',reference:'https://www.youtube.com/watch?v=hNSDABjJ6GU',drawCalls:meshes.length,source:data.source};group.userData=stats;
 return {group,stats,update,dispose(){group.removeFromParent();meshes.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());resources.forEach(r=>r.dispose());}};
}
