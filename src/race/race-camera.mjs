import * as T from 'three';
import {COURSE,raceX} from './maspero-course.mjs';
import {courseZ} from './maspero-layout.mjs';
import {ceremonyPlacement} from './ceremony-layout.mjs';
import {raceVenue,venueRaceX} from './race-venues.mjs';
import {cambodiaFeature} from './cambodia-geography.mjs';

const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
// Follow course progress, never cancel the player's lateral steering. The
// course-relative target also keeps the opponent visible during close duels.
export function playableShot(state,aspect=1,view='race'){
 const venue=raceVenue(state.venueId),x=venueRaceX(venue,state.distances[0])+15.1,other=venueRaceX(venue,state.distances[1])+15.1,gap=Math.abs(other-x);
 const anchor=x+(state.mode==='practice'?0:(other-x)*Math.max(0,.30-gap/140));
 const chase=view==='chase',target=[anchor+(chase?4:0),1,state.mode==='practice'?COURSE.lanes[0]:0];
 const direction=new T.Vector3(...(chase?[35,14,13]:[25,20,33])).normalize();
 const fov=48+(state.surgeActive?2:0),span=state.mode==='practice'?(chase?41:46):(chase?52:58),distance=span/(2*Math.tan(T.MathUtils.degToRad(fov/2))*Math.max(.55,Math.min(1.4,aspect)));
 return {position:target.map((n,i)=>n+direction.getComponent(i)*distance),target,fov};
}
// The sequence is timed by the simulation; pausing freezes the shot as well.
export function introShot(seconds,venueId='maspero'){
 const v=raceVenue(venueId),landmark=venueId==='maspero'?null:cambodiaFeature(venueId,venueId==='phnom-penh'?'moonlight':'royal-residence'),points=venueId==='maspero'?[
  {at:0,p:[COURSE.standX+42,25,courseZ(COURSE.standX,26)],t:[COURSE.standX,8,courseZ(COURSE.standX,-56)],f:52},
  {at:2.6,p:[COURSE.standX+120,73,courseZ(COURSE.standX,105)],t:[COURSE.standX+65,4,0],f:57},
  {at:5.3,p:[raceX(470)+30,230,95],t:[raceX(500),2,0],f:58},
  {at:8.2,p:[raceX(0)+90,94,80],t:[raceX(0)+8,1,0],f:49},
  {at:10,p:[raceX(0)+55,39,39],t:[raceX(0)+15,1,0],f:36},
 ]:[{at:0,p:[landmark.x+(venueId==='siem-reap'?90:25),32,landmark.z+(venueId==='siem-reap'?50:120)],t:[landmark.x,12,landmark.z],f:55},{at:2.6,p:[landmark.x+120,160,120],t:[landmark.x,2,landmark.z*.5],f:56},{at:5.3,p:[v.finishX+v.length*.5,160,65],t:[v.finishX+v.length*.5,1,0],f:58},{at:8.2,p:[venueRaceX(v,0)+70,80,65],t:[venueRaceX(v,0)+15,1,0],f:50},{at:10,p:[venueRaceX(v,0)+55,39,39],t:[venueRaceX(v,0)+15,1,0],f:36}];
 const time=T.MathUtils.clamp(seconds,0,10);let i=0;while(i<points.length-2&&time>points[i+1].at)i++;
 const a=points[i],b=points[i+1],u=smooth((time-a.at)/(b.at-a.at));
 return {position:a.p.map((v,j)=>lerp(v,b.p[j],u)),target:a.t.map((v,j)=>lerp(v,b.t[j],u)),fov:lerp(a.f,b.f,u),segment:i};
}
export function applyIntroCamera(camera,controls,seconds,venueId='maspero'){
 const shot=introShot(seconds,venueId);camera.position.fromArray(shot.position);controls.target.fromArray(shot.target);camera.fov=shot.fov;camera.lookAt(controls.target);camera.updateProjectionMatrix();return shot;
}

// Opening-film coverage: raft, VIP stand, both crowds and handheld-cap salutes.
export function ceremonyShot(seconds){
 const x=COURSE.standX,boat=ceremonyPlacement(31,seconds),points=[
  {name:'fleet',p:[x+95,70,95],t:[x,2,0],f:54},
  {name:'grandstand',p:[x+35,20,courseZ(x,23)],t:[x,8,courseZ(x,-56)],f:55},
  {name:'right-crowd',p:[x+12,6,courseZ(x+12,-31)],t:[x+6,3,courseZ(x+6,-47)],f:49},
  {name:'athletes',p:[boat.x-8,4.7,boat.z-7],t:[boat.x,1.25,boat.z],f:45},
  {name:'left-crowd',p:[x-46,7.5,courseZ(x-46,30)],t:[x-62,3,courseZ(x-62,48)],f:54},
  {name:'aerial',p:[x+15,126,28],t:[x+2,1,0],f:56},
 ];
 const segment=5.5,cycle=points.length*segment,t=((seconds%cycle)+cycle)%cycle,index=Math.floor(t/segment),a=points[index],b=points[(index+1)%points.length],within=t-index*segment,u=smooth(T.MathUtils.clamp((within-3.6)/1.9,0,1));
 const position=a.p.map((v,j)=>lerp(v,b.p[j],u));position[1]+=Math.sin(u*Math.PI)*8;
 return {position,target:a.t.map((v,j)=>lerp(v,b.t[j],u)),fov:lerp(a.f,b.f,u),name:a.name,index,cycle};
}
export function applyCeremonyCamera(camera,controls,seconds){
 const shot=ceremonyShot(seconds);camera.position.fromArray(shot.position);controls.target.fromArray(shot.target);camera.fov=shot.fov;camera.lookAt(controls.target);camera.updateProjectionMatrix();return shot;
}
