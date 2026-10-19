import {COURSE} from './maspero-course.mjs';
import {courseZ} from './maspero-layout.mjs';

// Separating axes of padded hull rectangles, including a little room for arms.
export function ceremonyHullOverlaps(a,b,margin=0){
 const dx=b.x-a.x,dz=b.z-a.z;
 for(const yaw of[a.yaw,b.yaw])for(const turn of[0,Math.PI/2]){
  const angle=yaw+turn,ux=Math.cos(angle),uz=-Math.sin(angle),radius=p=>15.55*Math.abs(ux*Math.cos(p.yaw)-uz*Math.sin(p.yaw))+1.0*Math.abs(ux*Math.sin(p.yaw)+uz*Math.cos(p.yaw));
  if(Math.abs(dx*ux+dz*uz)>radius(a)+radius(b)+margin)return false;
 }
 return true;
}
let seed=0x83bf21;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},raft=[];
// Continuous random packing: no rank/lane grid underneath the opening scene.
for(let attempt=0;raft.length<61&&attempt<20000;attempt++){
 const x=COURSE.standX+(random()-.5)*220,z=courseZ(x,(random()-.5)*58),yaw=Math.PI+(random()-.5)*.26,candidate={x,z,yaw};
 if(raft.every(p=>!ceremonyHullOverlaps(p,candidate,.25)))raft.push(candidate);
}
if(raft.length!==61)throw Error('Cannot fit the complete opening fleet without overlapping hulls');
export function ceremonyPlacement(index,time=0){
 const p=raft[index];return {x:p.x+Math.sin(time*.09+index*.4)*.07,y:Math.sin(time*.9+index)*.025,z:p.z,yaw:p.yaw+Math.sin(time*.17+index)*.001};
}
