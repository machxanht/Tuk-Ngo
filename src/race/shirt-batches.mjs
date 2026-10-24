import * as T from 'three';

// Instance approved shirts sharing one role skeleton and cached palette.
// Endpoint skinning, attributes and triangle indices stay exactly unchanged.
export function createShirtBatches(boat,actors){
 const groups=new Map(),resources=[];let signature='';
 const stats={drawCalls:0,shirts:0,sourceVertices:533,sourceTriangles:896};boat.userData.shirtBatching=stats;
 function clear(){for(const {mesh,geometry,material}of resources){mesh.removeFromParent();geometry.dispose();material.dispose();}resources.length=0;groups.clear();signature='';}
 function rebuild(){
  clear();
  for(const actor of actors){const source=actor.shirt;if(!actor.palette?.sleeve)continue;const key=actor.master.root.uuid+source.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(actor);}
  for(const list of groups.values()){
   const source=list[0].shirt,geometry=new T.InstancedBufferGeometry();
   for(const [name,attribute]of Object.entries(source.geometry.attributes))geometry.setAttribute(name,attribute);
   geometry.setIndex(source.geometry.index);geometry.instanceCount=list.length;
   geometry.setAttribute('aCrewOffset',new T.InstancedBufferAttribute(new Float32Array(list.length*4),4));
   geometry.setAttribute('aCrewFrame',new T.InstancedBufferAttribute(new Float32Array(list.length*4),4));
   const material=source.material.clone(),compile=source.material.onBeforeCompile;
   material.onBeforeCompile=shader=>{compile(shader);shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute vec4 aCrewOffset;attribute vec4 aCrewFrame;
vec3 crewRotate(vec3 p){return vec3(p.x*aCrewFrame.w+p.z*aCrewOffset.w,p.y,-p.x*aCrewOffset.w+p.z*aCrewFrame.w);}
`).replace('#include <skinnormal_vertex>','#include <skinnormal_vertex>\nobjectNormal=crewRotate(objectNormal/aCrewFrame.xyz);').replace('#include <project_vertex>','transformed=crewRotate(transformed*aCrewFrame.xyz)+aCrewOffset.xyz;\n#include <project_vertex>');};
   material.customProgramCacheKey=()=>source.material.customProgramCacheKey()+'|crew-transform';
   const mesh=new T.SkinnedMesh(geometry,material);mesh.name='Instanced_Approved_Shirts';mesh.bindMode='detached';mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;boat.add(mesh);
   list.forEach((a,i)=>{const p=a.group.position,s=a.group.scale,q=a.group.quaternion;geometry.attributes.aCrewOffset.setXYZW(i,p.x,p.y,p.z,2*(q.w*q.y+q.x*q.z));geometry.attributes.aCrewFrame.setXYZW(i,s.x,s.y,s.z,1-2*(q.y*q.y+q.z*q.z));});
   resources.push({mesh,geometry,material,list});
  }
  signature=actors.map(a=>[a.shirt.material.uuid,a.group.position.y,!!a.palette?.sleeve].join(':')).join('|');
  stats.drawCalls=resources.length;stats.shirts=resources.reduce((n,b)=>n+b.list.length,0);
 }
 return {stats,update(study=false){
  const next=actors.map(a=>[a.shirt.material.uuid,a.group.position.y,!!a.palette?.sleeve].join(':')).join('|');if(next!==signature)rebuild();
  const use=boat.userData.shirtBatchingEnabled!==false&&!study;for(const a of actors)a.shirt.visible=!use&&!!a.palette?.sleeve;for(const b of resources)b.mesh.visible=use;
 },dispose:clear};
}
