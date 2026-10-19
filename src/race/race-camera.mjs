import * as T from 'three';
import {COURSE,raceX} from './maspero-course.mjs';
import {courseZ} from './maspero-layout.mjs';

const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
// The sequence is timed by the simulation; pausing freezes the shot as well.
export function introShot(seconds){
 const points=[
  {at:0,p:[COURSE.standX+42,25,courseZ(COURSE.standX,26)],t:[COURSE.standX,8,courseZ(COURSE.standX,-56)],f:52},
  {at:2.6,p:[COURSE.standX+120,73,courseZ(COURSE.standX,105)],t:[COURSE.standX+65,4,0],f:57},
  {at:5.3,p:[raceX(470)+30,230,95],t:[raceX(500),2,0],f:58},
  {at:8.2,p:[raceX(0)+90,94,80],t:[raceX(0)+8,1,0],f:49},
  {at:10,p:[raceX(0)+55,39,39],t:[raceX(0)+15,1,0],f:36},
 ];
 const time=T.MathUtils.clamp(seconds,0,10);let i=0;while(i<points.length-2&&time>points[i+1].at)i++;
 const a=points[i],b=points[i+1],u=smooth((time-a.at)/(b.at-a.at));
 return {position:a.p.map((v,j)=>lerp(v,b.p[j],u)),target:a.t.map((v,j)=>lerp(v,b.t[j],u)),fov:lerp(a.f,b.f,u),segment:i};
}
export function applyIntroCamera(camera,controls,seconds){
 const shot=introShot(seconds);camera.position.fromArray(shot.position);controls.target.fromArray(shot.target);camera.fov=shot.fov;camera.lookAt(controls.target);camera.updateProjectionMatrix();return shot;
}
