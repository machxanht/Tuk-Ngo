import fs from 'node:fs';
import {profile} from '../src/race/boat.mjs';
// Accepted hull cross-section, including inner wood and the foot footprint.
function floor(x,z){const p=profile(x);if(Math.abs(x)>10.6)return p.g-.025;const slope=Math.min(.85,(p.g-p.k)*Math.tan(14.5*Math.PI/180)/Math.max(p.b,.001)),coef=slope-1/p.p;let low=0,high=1;for(let i=0;i<36;i++){const s=(low+high)/2,q=s**p.p,w=p.b*s*(1-coef+coef*q);if(w<Math.abs(z))low=s;else high=s;}return p.k+(p.g-p.k)*((low+high)/2)**p.p+.035;}
const result=[];
function actor(id,role,x,side=0){const seated=role==='BOW_CALLER'||role==='ROWER'&&id<18,lat=role==='ROWER'?side*.17:0,forward=role==='BOW_CALLER'?-1:1;
 // The caller sits at the foredeck edge facing aft. Both feet rest down in
 // the open hull, rather than crouching with feet up on the raised foredeck.
 const targets=['l','r'].map((s,i)=>{const bx=role==='ROWER'?(i===0?.115:.015):(i===0?.075:-.075),by=role==='BOW_CALLER'?-.58:seated?-.32:role==='HELMSMAN'?(i===0?-.08:.12):-.07,boatX=x-forward*by,boatZ=lat+(side>0?-bx:bx);let support=0;for(const dx of [-.17,0,.17])for(const dz of [-.05,0,.05])support=Math.max(support,floor(boatX+dx,boatZ+dz));return {bone:s,target:[bx,by,support+.08],support};});
 const ankle=Math.max(...targets.map(t=>t.target[2])),hip=seated?(role==='BOW_CALLER'?profile(x).g+.11:profile(x).g-.018):ankle+(role==='MID_CONTROLLER'?.82:role==='HELMSMAN'?.76:.70);
 result.push({id,role,x,side,lat,hip,feet:targets});}
for(let row=0;row<25;row++)for(const side of [-1,1])actor(2+2*row+(side>0),'ROWER',10-row*20/24,side);
actor(1,'BOW_CALLER',10.65);actor(52,'MID_CONTROLLER',3.75);for(let i=0;i<3;i++)actor(53+i,'HELMSMAN',-11.2-.95*i,i%2?-1:1);
const text=JSON.stringify(result,null,2)+'\n';fs.mkdirSync('../asset-studio/crew-v12',{recursive:true});fs.mkdirSync('docs/qa/crew-v12',{recursive:true});fs.writeFileSync('../asset-studio/crew-v12/support-plan.json',text);fs.writeFileSync('docs/qa/crew-v12/support-plan.json',text);console.log({actors:result.length,ankleRange:[Math.min(...result.flatMap(a=>a.feet.map(f=>f.target[2]))),Math.max(...result.flatMap(a=>a.feet.map(f=>f.target[2])))]});
