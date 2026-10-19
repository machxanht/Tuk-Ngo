import * as T from 'three';
import {profile} from './boat.mjs';
import {courseZ} from './maspero-layout.mjs';
import {FESTIVAL_TEAMS} from './festival-teams.mjs';
import {paintFestivalLivery} from './team-style.mjs';
import {assetBytes,releaseAssetBytes} from './asset-transfer.mjs';

export function ceremonyPlacement(index,time=0){
 const row=Math.floor(index/5),lane=index%5,x=1138+row*43+(lane%2)*12+Math.sin(index*7.3)*3-Math.sin(time*.09+index*.4)*.7;
 const z=(lane-2)*12+(Math.sin(index*17.13)*1.3);
 return {x,y:Math.sin(time*.9+index)*.025,z:courseZ(x,z),yaw:Math.PI+Math.sin(index*3.1)*.08+Math.sin(time*.17+index)*.006};
}
function hullGeometry(){
 const p=[],uv=[],ix=[],n=84,sides=10;
 for(let i=0;i<=n;i++){
  const x=-15.095+i/n*30.19,section=profile(x);
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI,y=section.g-(section.g-section.k)*Math.sin(a),z=section.b*Math.cos(a);p.push(x,y,z);uv.push(i/n,Math.sin(a)*.8);}
 }
 for(let i=0;i<n;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export async function buildMenuCeremony(scene,base){
 const url=base+'assets/athlete-master/ceremony-crew.json',data=JSON.parse(new TextDecoder().decode(await assetBytes(url)));releaseAssetBytes(url);
 const group=new T.Group();group.name='Festival_Ceremony_61_Boats';group.visible=false;scene.add(group);
 const resources=[],geometries=[],meshes=[],uniform={value:0};
 const atlas=document.createElement('canvas');atlas.width=4096;atlas.height=512;const ctx=atlas.getContext('2d');
 FESTIVAL_TEAMS.forEach((team,i)=>{ctx.save();ctx.setTransform(.25,0,0,.25,(i%8)*512,Math.floor(i/8)*64);paintFestivalLivery(ctx,team);ctx.restore();});
 const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;resources.push(texture);
 const hullGeo=hullGeometry(),tile=new Float32Array(61);for(let i=0;i<61;i++)tile[i]=i;hullGeo.setAttribute('aTile',new T.InstancedBufferAttribute(tile,1));geometries.push(hullGeo);
 const hullMat=new T.MeshLambertMaterial({map:texture,side:T.DoubleSide});
 hullMat.onBeforeCompile=s=>{s.vertexShader='attribute float aTile;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=(vMapUv+vec2(mod(aTile,8.),7.-floor(aTile/8.)))/8.;');};resources.push(hullMat);
 const hulls=new T.InstancedMesh(hullGeo,hullMat,61);hulls.name='Ceremony_Painted_Hulls';hulls.frustumCulled=false;group.add(hulls);meshes.push(hulls);
 const crewGeo=new T.BufferGeometry();for(const [name,a]of Object.entries(data.attributes))crewGeo.setAttribute(name,new T.Float32BufferAttribute(a.array,a.size));crewGeo.setIndex(data.indices);
 const count=61*50,tints=new Float32Array(count/2*3);for(let i=0;i<count/2;i++)new T.Color(FESTIVAL_TEAMS[Math.floor(i/25)].jersey).toArray(tints,i*3);crewGeo.setAttribute('aTint',new T.InstancedBufferAttribute(tints,3));geometries.push(crewGeo);
 const crewMat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});resources.push(crewMat);
 crewMat.onBeforeCompile=s=>{s.uniforms.uCeremonyTime=uniform;s.vertexShader='attribute float aKit;attribute vec3 aTint;varying float vKit;varying vec3 vTint;uniform float uCeremonyTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vKit=aKit;vTint=aTint;transformed.z+=sin(uCeremonyTime*.85+instanceMatrix[3].x*.07)*.035*max(position.y-.45,0.);');s.fragmentShader='varying float vKit;varying vec3 vTint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vTint,vKit);');};
 const mirrored=crewGeo.clone(),pos=mirrored.attributes.position,norm=mirrored.attributes.normal;
 for(let i=0;i<pos.count;i++){pos.setX(i,-pos.getX(i));norm.setX(i,-norm.getX(i));}for(let i=0;i<mirrored.index.count;i+=3){const a=mirrored.index.getX(i);mirrored.index.setX(i,mirrored.index.getX(i+1));mirrored.index.setX(i+1,a);}geometries.push(mirrored);
 const crew=[crewGeo,mirrored].map((geo,i)=>{const mesh=new T.InstancedMesh(geo,crewMat,count/2);mesh.name='Ceremony_Animated_Seated_Crews_'+i;mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);return mesh;});
 const paddleGeo=new T.BoxGeometry(.045,1.35,.055),bladeGeo=new T.BoxGeometry(.13,.47,.025),wood=new T.MeshLambertMaterial({color:'#d19b4a'});geometries.push(paddleGeo,bladeGeo);resources.push(wood);
 const paddles=new T.InstancedMesh(paddleGeo,wood,count),blades=new T.InstancedMesh(bladeGeo,wood,count);paddles.frustumCulled=blades.frustumCulled=false;group.add(paddles,blades);meshes.push(paddles,blades);
 const floorGeo=new T.BoxGeometry(25.8,.045,.75),floorMat=new T.MeshLambertMaterial({color:'white'}),floors=new T.InstancedMesh(floorGeo,floorMat,61);geometries.push(floorGeo);resources.push(floorMat);floors.frustumCulled=false;group.add(floors);meshes.push(floors);
 // At aerial distance the colored interior reinforces each crew's jersey mass.
 FESTIVAL_TEAMS.forEach((team,i)=>floors.setColorAt(i,new T.Color(team.interior||team.jersey).lerp(new T.Color('#c19554'),.18)));
 const dummy=new T.Object3D(),local=new T.Object3D(),m=new T.Matrix4();
 let last=-Infinity;
 function update(time){
  uniform.value=time;if(!group.visible||time-last<1/20)return;last=time;
  for(let b=0;b<61;b++){
   const p=ceremonyPlacement(b,time);dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();hulls.setMatrixAt(b,dummy.matrix);
   local.position.set(0,.36,0);local.rotation.set(0,0,0);local.updateMatrix();floors.setMatrixAt(b,m.multiplyMatrices(dummy.matrix,local.matrix));
   for(let j=0;j<50;j++){
    const side=j%2?1:-1,x=-11.4+Math.floor(j/2)*.94,i=b*50+j;
    local.position.set(x,.02,side*.24);local.rotation.set(0,Math.PI/2,0);local.scale.set(1,1,1);local.updateMatrix();crew[j%2].setMatrixAt(b*25+Math.floor(j/2),m.multiplyMatrices(dummy.matrix,local.matrix));
    const angle=side*(.48+Math.sin(time*.85+b*.4)*.1),reach=side*.70;
    local.scale.set(1,1,1);local.position.set(x+.1,.94,reach);local.rotation.set(angle,0,0);local.updateMatrix();paddles.setMatrixAt(i,m.multiplyMatrices(dummy.matrix,local.matrix));
    local.position.set(x+.1,.94-Math.cos(angle)*.55,reach-Math.sin(angle)*.55);local.updateMatrix();blades.setMatrixAt(i,m.multiplyMatrices(dummy.matrix,local.matrix));
   }
  }
  meshes.forEach(mesh=>mesh.instanceMatrix.needsUpdate=true);
 }
 const stats={boats:61,athletes:count,crewTriangles:data.triangles,drawCalls:meshes.length,source:data.source};group.userData=stats;
 return {group,stats,update,dispose(){group.removeFromParent();meshes.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());resources.forEach(r=>r.dispose());}};
}
