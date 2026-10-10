import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRaceGame,PACES,formatRaceTime,RACE_LENGTH} from '../src/race/gameplay.mjs';

function run({difficulty='normal',strategy=()=> 'steady',offset=0,hit=true}={}){
 const g=createRaceGame();g.start(difficulty);g.advance(3);
 while(g.state.phase==='racing'){
  g.setPace(strategy(g.state));
  const next=Math.floor(g.state.beatPhase+1e-7)+1;
  const until=(next-g.state.beatPhase)*60/PACES[g.state.pace].cadence;
  g.advance(until+offset);if(hit)g.stroke();
  if(offset>0)g.advance(Math.max(.001,(1-offset*PACES[g.state.pace].cadence/60)*.001));
 }
 return g.snapshot();
}
const report={checks:[],balance:{}};
function check(name,fn){fn();report.checks.push(name);}
check('Ready and countdown keep both bows at the start',()=>{const g=createRaceGame();g.advance(8);assert.deepEqual(g.state.distances,[0,0]);g.start();g.advance(2.99);assert.equal(g.state.phase,'countdown');assert.deepEqual(g.state.distances,[0,0]);g.advance(.01);assert.equal(g.state.phase,'racing');});
check('Perfect/good/early strokes and duplicate taps',()=>{const g=createRaceGame();g.start();g.advance(3+60/84);assert.equal(g.stroke().quality,'perfect');assert.equal(g.stroke(),null);g.advance(60/84+.16);assert.equal(g.stroke().quality,'good');g.advance(60/84-.16-.30);assert.equal(g.stroke().quality,'missed');assert.equal(g.state.combo,0);});
check('Missing a beat hurts power and resets combo',()=>{const g=createRaceGame();g.start();g.advance(3+60/84);g.stroke();g.advance(1);assert.ok(g.state.missed>=1);assert.equal(g.state.combo,0);});
check('Pause freezes clock, physics, countdown and input',()=>{const g=createRaceGame();g.start();g.advance(1);g.pause();const frozen=g.snapshot();g.advance(40);assert.deepEqual(g.snapshot(),frozen);assert.equal(g.stroke(),null);g.resume();g.advance(2);assert.equal(g.state.phase,'racing');g.pause();const running=g.snapshot();g.advance(40);assert.deepEqual(g.snapshot(),running);});
check('Endurance is bounded, sprint depletes and recovery restores it',()=>{const g=createRaceGame();g.start();g.advance(3);g.setPace('sprint');g.state.power=1;g.state.stamina=15;g.advance(3);const tired=g.state.stamina;assert.ok(tired<15);g.setPace('recover');g.advance(10);assert.ok(g.state.stamina>tired);assert.ok(g.state.stamina>=0&&g.state.stamina<=100);});
check('AI speed is independent of player distance',()=>{const a=createRaceGame(),b=createRaceGame();a.start();b.start();a.advance(3);b.advance(3);b.state.distances[0]=900;a.advance(20);b.advance(20);assert.equal(a.state.distances[1],b.state.distances[1]);});
check('No input produces a completed loss instead of an endless race',()=>{const g=createRaceGame();g.start();g.advance(363);assert.equal(g.state.phase,'finished');assert.equal(g.state.result,'dnf');assert.ok(g.state.finishTimes[1]>0);assert.equal(g.state.distances[0],0);});
check('Integration is independent of frame grouping',()=>{const a=createRaceGame(),b=createRaceGame();a.start();b.start();for(let i=0;i<3600;i++)a.advance(1/60);for(let i=0;i<1800;i++)b.advance(1/30);assert.ok(Math.abs(a.state.distances[1]-b.state.distances[1])<1e-6);assert.ok(Math.abs(a.state.elapsed-b.state.elapsed)<1e-7);});
check('Finish order uses interpolated bow crossings, including a tie',()=>{const g=createRaceGame();g.start();g.advance(3);g.state.distances=[1199.99,1199.99];g.state.speeds=[6,6];g.state.power=1;g.state.cohesion=1;g.advance(.01);assert.equal(g.state.phase,'finished');assert.equal(g.state.result,'tie');assert.ok(g.state.finishTimes[0]<.01);assert.equal(g.state.distances[0],RACE_LENGTH);});
check('Replay clears race state and preserves requested difficulty',()=>{const g=createRaceGame();g.start('hard');g.advance(363);g.start();assert.equal(g.state.difficulty,'hard');assert.equal(g.state.phase,'countdown');assert.deepEqual(g.state.distances,[0,0]);assert.equal(g.state.combo,0);assert.equal(g.state.stamina,100);assert.equal(g.state.result,null);});
check('Time formatting carries centiseconds into the next minute',()=>{assert.equal(formatRaceTime(59.999),'1:00.00');assert.equal(formatRaceTime(null),'—');});
for(const difficulty of ['easy','normal','hard']){
 for(const [name,strategy] of Object.entries({steady:()=> 'steady',sprint:()=> 'sprint',finishSprint:s=>s.distances[0]>1000?'sprint':'steady',restThenSprint:s=>s.distances[0]>1000?'sprint':s.distances[0]>800?'recover':'steady'})){
  const r=run({difficulty,strategy});report.balance[difficulty+'_'+name]={result:r.result,time:r.finishTimes[0],aiTime:r.finishTimes[1],distance:r.distances[0],accuracy:r.accuracy,stamina:r.stamina};
 }
}
const good=run({difficulty:'easy',offset:.16}),perfect=run({difficulty:'normal'});
assert.ok(perfect.distances[0]>good.distances[0]||perfect.finishTimes[0]<good.finishTimes[0]);
check('Good timing can win easy; late sprint is faster than steady',()=>{assert.equal(good.result,'win');assert.equal(report.balance.normal_steady.result,'win');assert.ok(report.balance.normal_finishSprint.time<report.balance.normal_steady.time);});
check('Hard can be won with a late sprint; sprinting all race loses',()=>{assert.equal(report.balance.hard_finishSprint.result,'win');assert.equal(report.balance.hard_steady.result,'loss');assert.notEqual(report.balance.normal_sprint.result,'win');});
report.balance.easy_goodTiming={result:good.result,time:good.finishTimes[0],accuracy:good.accuracy};
report.pass=true;fs.writeFileSync(process.argv[2]||'docs/qa/gameplay-v10.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
