// Browser integration diagnostic: runs against the actual loaded race rig,
// including skinned surface vertices and the canonical hull triangles.
import * as T from 'three';
import {profile} from '../src/race/boat.mjs';

export function checkCrewClearance(api,{phases=12,phaseOffset=0,phaseTotal=phases}={}){
 if(!Number.isInteger(phases)||phases<1||phases>12)throw new RangeError('Run at most 12 phases per browser call; use phaseOffset/phaseTotal for a complete cycle.');
 const rig=api.rig,inverse=new T.Matrix4(),point=new T.Vector3(),top=new T.Vector3(),tip=new T.Vector3(),ray=new T.Raycaster();
 const result={phases,actors:rig.actors.length,maxFootPenetrationM:0,maxShinPenetrationM:0,shaftIntersections:0,minRailGapM:Infinity,maxCoachElbowHeightM:-Infinity,maxCoachHandSpeedM:0,spearHeightRatio:0,worst:null};
 const geometry=rig.actors[0].skin.geometry,names=rig.actors[0].master.skeleton.bones.map(b=>b.name),foot=[],shin=[];
 for(let i=0;i<geometry.attributes.position.count;i++){
  const weights={foot:0,shin:0};for(let k=0;k<4;k++){const name=names[geometry.attributes.skinIndex.getComponent(i,k)],weight=geometry.attributes.skinWeight.getComponent(i,k);if(/^(foot|ball|toe)_/.test(name))weights.foot+=weight;if(/^(calf|foot|ball|toe)_/.test(name))weights.shin+=weight;}
  if(weights.foot>.65)foot.push(i);if(weights.shin>.45)shin.push(i);
 }
 const hull=rig.boat.getObjectByName('Canonical_Boat_Hull'),previousHands=new Map();
 for(let frame=0;frame<phases;frame++){
  rig.render((frame+phaseOffset)/phaseTotal,(frame+phaseOffset)/(phaseTotal*.4),{updateOnly:true,connectedKit:true,nearest:true});rig.boat.updateMatrixWorld(true);inverse.copy(rig.boat.matrixWorld).invert();
  for(const actor of rig.actors){
   actor.master.skeleton.update();
   for(const [key,indices]of [['maxFootPenetrationM',foot],['maxShinPenetrationM',shin]])for(const index of indices){
    actor.skin.getVertexPosition(index,point).applyMatrix4(actor.group.matrixWorld).applyMatrix4(inverse);
    const penetration=rig.floorAt(point.x,point.z)-.015-point.y;
    if(penetration>result[key]){result[key]=penetration;result.worst={actor:actor.id,role:actor.role,phase:(frame+phaseOffset)/phaseTotal,surface:key,point:point.toArray()};}
   }
   if(actor.paddle){
    const length=actor.role==='helm'?2.05:actor.posture==='standing'?1.75:1.22;
    top.set(0,-.04,0).applyMatrix4(actor.paddle.matrixWorld);tip.set(0,-length,0).applyMatrix4(actor.paddle.matrixWorld);
    ray.set(top,tip.clone().sub(top).normalize());ray.far=top.distanceTo(tip);if(ray.intersectObject(hull,true).length)result.shaftIntersections++;
    top.applyMatrix4(inverse);tip.applyMatrix4(inverse);
    if(top.y>profile(top.x).g&&tip.y<profile(tip.x).g){let lo=0,hi=1;for(let i=0;i<16;i++){const t=(lo+hi)/2;point.lerpVectors(top,tip,t);if(point.y>profile(point.x).g)lo=t;else hi=t;}point.lerpVectors(top,tip,(lo+hi)/2);result.minRailGapM=Math.min(result.minRailGapM,Math.abs(point.z)-profile(point.x).b);}
   }
   if(actor.role==='controller')for(const side of['l','r']){
    const root=actor.master.root,elbow=root.getObjectByName('lowerarm_'+side).getWorldPosition(point);result.maxCoachElbowHeightM=Math.max(result.maxCoachElbowHeightM,elbow.y);
    const hand=root.getObjectByName('hand_'+side).getWorldPosition(new T.Vector3()),previous=previousHands.get(side);if(previous)result.maxCoachHandSpeedM=Math.max(result.maxCoachHandSpeedM,hand.distanceTo(previous)*phaseTotal);previousHands.set(side,hand);
   }
  }
 }
 const caller=rig.actors.find(a=>a.role==='caller');
 if(rig.construction==='dugout'){
  const spear=caller.group.getObjectByName('Dugout_Bow_Command_Spear'),head=caller.master.root.getObjectByName('head').getWorldPosition(new T.Vector3()).applyMatrix4(caller.group.matrixWorld).applyMatrix4(inverse),tip=new T.Vector3(0,.36,0).applyMatrix4(spear.matrixWorld).applyMatrix4(inverse),floor=rig.floorAt(caller.group.position.x,0)-.015;
  result.spearHeightRatio=(tip.y-floor)/(head.y+.15-floor);
 }
 result.pass=result.maxFootPenetrationM<.008&&result.maxShinPenetrationM<.008&&result.shaftIntersections===0&&result.minRailGapM>.02&&(!result.spearHeightRatio||(result.spearHeightRatio>.84&&result.spearHeightRatio<.98));
 rig.animation.clear();return result;
}
