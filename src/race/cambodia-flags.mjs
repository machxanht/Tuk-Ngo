import * as T from 'three';

// One public-domain flag texture and one cloth draw, shared by all poles.
// The hoist (uv.x=0) is fixed; the free edge flutters with a per-instance phase.
export function buildCambodiaFlags(group,positions,base=''){
 const stats={count:positions.length,textureLoaded:false,textureError:false,aspect:1.5,animated:true};
 const texture=new T.TextureLoader().load(base+'assets/festival/cambodia-flag.svg',()=>stats.textureLoaded=true,undefined,()=>stats.textureError=true);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const geometry=new T.PlaneGeometry(3,2,12,4);geometry.translate(1.5,-1,0);
 const time={value:0},material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uFlagTime=time;
  shader.vertexShader='uniform float uFlagTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float seed=instanceMatrix[3].x*.17+instanceMatrix[3].z*.11;
   transformed.z+=uv.x*uv.x*(sin(uv.x*7.5-uFlagTime*3.4+seed)*.32+sin(uv.y*5.0+uFlagTime*2.1+seed)*.10);
   transformed.y-=uv.x*.12*(1.0+sin(uFlagTime*1.7+seed));`);
 };
 material.customProgramCacheKey=()=> 'cambodia-cloth';
 const flags=new T.InstancedMesh(geometry,material,positions.length),poleGeometry=new T.CylinderGeometry(.055,.075,10,6),poleMaterial=new T.MeshLambertMaterial({color:'#eee6cf'}),poles=new T.InstancedMesh(poleGeometry,poleMaterial,positions.length),dummy=new T.Object3D();
 positions.forEach((p,i)=>{dummy.position.set(p.x,11,p.z);dummy.rotation.set(0,p.rotation||0,0);dummy.updateMatrix();flags.setMatrixAt(i,dummy.matrix);dummy.position.y=6;dummy.rotation.set(0,0,0);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);});
 flags.computeBoundingSphere();flags.boundingSphere.radius+=1;flags.name='Cambodia_National_Flags';poles.name='Cambodia_Flagpoles';group.add(flags,poles);
 flags.userData={...stats,source:'Wikimedia Commons · Flag of Cambodia (3-2).svg · public domain',hoistFixed:true};
 return {stats,update(t){time.value=t;Object.assign(flags.userData,stats,{time:t});}};
}
