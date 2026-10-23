import {riverFlow} from './race-flow.mjs';
// Positive means right when facing the finish. Both boats stay in their lanes.
export const STEERING={maxHeading:8*Math.PI/180,limit:4.2,warning:3.2};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function advanceSteering(s,dt){
 const speed=s.speeds[0],input=s.steeringPulseRemaining>0?s.steeringPulse:s.steeringInput;
 s.steeringPulseRemaining=Math.max(0,s.steeringPulseRemaining-dt);
 const flow=riverFlow(s.distances[0],s.lateralPositions[0],s.flowSeed);
 const current=s.steeringEnabled&&speed>.25?flow.crossCurrent:0;
 // Assistance protects the boundary; it must not erase a deliberate line.
 const correction=s.steeringAssist&&Math.abs(input)<.01&&Math.abs(s.lateralPositions[0])>STEERING.warning?-Math.sign(s.lateralPositions[0])*.065:0;
 let target=clamp(input*STEERING.maxHeading+correction,-STEERING.maxHeading,STEERING.maxHeading);
 if(Math.abs(s.lateralPositions[0])>=STEERING.limit-.05&&target*s.lateralPositions[0]>0)target=0;
 s.headings[0]+=(target-s.headings[0])*(1-Math.exp(-dt*2.8));
 const before=s.lateralPositions[0];
 s.lateralPositions[0]=clamp(before+(Math.sin(s.headings[0])*speed+current)*dt,-STEERING.limit,STEERING.limit);
 if(speed>.5){s.steeringSeconds+=dt;s.steeringError+=Math.abs(s.lateralPositions[0])*dt;if(Math.abs(input)>.1)s.manualSteeringDistance+=Math.abs(s.lateralPositions[0]-before);}
 const aiFlow=riverFlow(s.distances[1],s.lateralPositions[1],s.flowSeed),skill=s.difficulty==='hard'?.92:s.difficulty==='normal'?.70:.35;
 const aiLine=s.steeringEnabled?aiFlow.center*skill:.18*Math.sin(s.elapsed*.11);
 const aiBefore=s.lateralPositions[1];
 s.lateralPositions[1]=s.mode==='practice'?0:aiBefore+(aiLine-aiBefore)*(1-Math.exp(-dt*1.5));
 s.headings[1]=s.mode==='practice'?0:clamp(Math.asin(clamp((s.lateralPositions[1]-aiBefore)/dt/Math.max(1,s.speeds[1]),-.1,.1)),-STEERING.maxHeading,STEERING.maxHeading);
 s.atLaneEdge=Math.abs(s.lateralPositions[0])>STEERING.warning;
 s.rudder=input||clamp(correction/STEERING.maxHeading,-1,1);
}
