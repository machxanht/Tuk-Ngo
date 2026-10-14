import assert from 'node:assert/strict';
import {strokePhase} from '../src/race/rowing-effort-v32.mjs';
for(const effort of [0,.3,1]){
 assert.equal(strokePhase(0,effort),0);let previous=0;
 for(let i=1;i<1000;i++){const current=strokePhase(i/1000,effort);assert(current>previous&&current<1);previous=current;}
 assert(Math.abs((1-strokePhase(.999999,effort))-.000001)<1e-10);
 assert(Math.abs(strokePhase(.000001,effort)-.000001)<1e-10);
}
assert.equal(strokePhase(.25,0),.25);assert(strokePhase(.25,1)>.31);assert(strokePhase(.5,1)>.63);
assert.equal(strokePhase(.25,NaN),.25);assert.equal(strokePhase(.25,-1),.25);assert.equal(strokePhase(.25,2),strokePhase(.25,1));
console.log('Sprint stroke timing: monotone, continuous, beat-aligned and stronger pull.');
