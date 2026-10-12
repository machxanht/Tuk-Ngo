import fs from 'node:fs';
import assert from 'node:assert/strict';
import {profile,legacyProfile,END_FAIRING_START,SPEC} from '../src/race/boat.mjs';
const report={pass:true,occupiedRegionUnchanged:true,ends:[]};
for(let x=-END_FAIRING_START;x<=END_FAIRING_START;x+=.01)assert.deepEqual(profile(x),legacyProfile(x));
for(const side of [-1,1]){
 let minGap=Infinity,minSlope=Infinity,previous=profile(side*END_FAIRING_START);
 for(let x=END_FAIRING_START+.001;x<15.1;x+=.001){const p=profile(side*x);minGap=Math.min(minGap,p.g-p.k);minSlope=Math.min(minSlope,(p.g-previous.g)/.001);assert.ok(Number.isFinite(p.g)&&p.g>=p.k-1e-9&&p.g<= (side>0?SPEC.bow:SPEC.stern)+1e-8);previous=p;}
 const tip=profile(side*15.1);assert.ok(Math.abs(tip.g-(side>0?SPEC.bow:SPEC.stern))<1e-8);assert.ok(minSlope>.05,'No clipped/flat upper tip segment');
 const eps=.0001,f=x=>profile(side*x).g,start=END_FAIRING_START,leftSlope=(f(start)-f(start-eps))/eps,rightSlope=(f(start+eps)-f(start))/eps,leftCurvature=(f(start)-2*f(start-eps)+f(start-2*eps))/(eps*eps),rightCurvature=(f(start+2*eps)-2*f(start+eps)+f(start))/(eps*eps);
 assert.ok(Math.abs(leftSlope-rightSlope)<.0003);assert.ok(Math.abs(leftCurvature-rightCurvature)<.01);
 report.ends.push({side:side>0?'bow':'stern',minGapM:minGap,minUpperSlope:minSlope,joinSlopeGap:Math.abs(leftSlope-rightSlope),joinCurvatureGap:Math.abs(leftCurvature-rightCurvature),tipHeightM:tip.g});
}
fs.mkdirSync('docs/qa/crew-v15',{recursive:true});fs.writeFileSync('docs/qa/crew-v15/end-profile-check.json',JSON.stringify(report,null,2)+'\n');console.log(report);
