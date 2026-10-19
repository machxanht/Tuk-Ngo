import * as T from 'three';
import {courseZ} from './maspero-layout.mjs';

const hash=n=>{let x=Math.imul(n+1,0x9e3779b9);x=Math.imul(x^(x>>>16),0x85ebca6b);return((x^(x>>>13))>>>0)/4294967296;};
export function finishSpectatorPositions(finishX,waterY){
 const people=[];
 for(const side of[-1,1])for(let row=0;row<3;row++)for(let x=finishX+8,id=0;x<finishX+199;x+=1.8,id++){
  const seed=920000+(side+1)*10000+row*139+id;if(hash(seed)<.10)continue;
  const px=x+(hash(seed+2)-.5)*.7,z=courseZ(px,side*(35.8+row*2.2+(hash(seed+3)-.5)*.6));
  people.push({x:px,z,id:seed,zone:'finish-shallows',waterY,submergedHeight:.9,age:'adult',height:1,width:.94,seated:false,yaw:side<0?0:Math.PI,activity:['wave','cheer','clap'][Math.floor(hash(seed+4)*3)]});
 }
 return people;
}
export function buildFinishSpectators(parent,finishX,waterY){
 const people=finishSpectatorPositions(finishX,waterY),geometry=new T.RingGeometry(.25,.46,12);geometry.rotateX(-Math.PI/2);
 const time={value:0},material=new T.MeshBasicMaterial({color:'#b8e2d4',transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide});
 material.onBeforeCompile=s=>{s.uniforms.uShallowTime=time;s.vertexShader='uniform float uShallowTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float phase=uShallowTime*1.5+instanceMatrix[3].x*.31+instanceMatrix[3].z;transformed.xz*=1.+.12*sin(phase);transformed.y+=.025*sin(phase*.7);');};
 const ripples=new T.InstancedMesh(geometry,material,people.length),dummy=new T.Object3D();ripples.name='Finish_Shallow_Spectator_Ripples';ripples.frustumCulled=false;
 people.forEach((p,i)=>{dummy.position.set(p.x,waterY+.02,p.z);dummy.scale.setScalar(.83+hash(p.id+8)*.3);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);});parent.add(ripples);
 const stats={count:people.length,banks:2,raceProgressM:[1000,1200],waterY,waistDepthM:.9,activities:['wave','cheer','clap'],placement:'both shallow banks, clear of the racing lanes',samples:people.filter((_,i)=>i%67===0).map(p=>({x:p.x,z:p.z,activity:p.activity,submergedHeight:p.submergedHeight}))};
 return{people,stats,update(seconds){time.value=seconds;},dispose(){ripples.removeFromParent();ripples.dispose();geometry.dispose();material.dispose();}};
}
