import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRaceGame} from '../src/race/gameplay.mjs';
import {introShot,ceremonyShot} from '../src/race/race-camera.mjs';
import {COURSE} from '../src/race/maspero-course.mjs';
import {flotsamPlacement} from '../src/race/river-flotsam.mjs';
globalThis.window??={};
const {ceremonyPlacement}=await import('../src/race/menu-ceremony.mjs');
for(const fps of[15,30,60,144]){
 const g=createRaceGame();g.start('normal',{intro:true});
 for(let i=0;i<fps*5;i++)g.advance(1/fps);
 assert.equal(g.state.phase,'intro');assert.deepEqual(g.state.distances,[0,0]);assert.equal(g.state.elapsed,0);assert.equal(g.state.countdown,3);assert.equal(g.stroke(),null);
 g.pause();const state=g.snapshot();g.advance(5);assert.deepEqual(g.snapshot(),state);g.resume();g.advance(5.001);assert.equal(g.state.phase,'countdown');assert(g.state.countdown>2.99);g.advance(3);assert.equal(g.state.phase,'racing');
 g.start('easy',{intro:true});g.skipIntro();assert.equal(g.state.phase,'countdown');assert.equal(g.state.countdown,3);
}
for(let i=0;i<=600;i++){const p=introShot(i/60);assert([...p.position,...p.target,p.fov].every(Number.isFinite));assert(p.position[1]>20);if(i){const before=introShot((i-1)/60);assert(Math.hypot(...p.position.map((n,k)=>n-before.position[k]))<15);}}
assert(introShot(0).target[2]<-40);assert(introShot(10).target[0]>2200);
for(const time of[0,17,300])for(let i=0;i<61;i++){const p=ceremonyPlacement(i,time);assert(Math.abs(p.x-COURSE.standX)<110);assert(Math.abs(p.yaw-Math.PI)<.04);for(let j=0;j<i;j++){const q=ceremonyPlacement(j,time);assert(Math.abs(p.x-q.x)>31||Math.abs(p.z-q.z)>2.2,'Ceremony hulls must remain separate');}}
const angles=new Set();for(let i=0;i<=1980;i++){const p=ceremonyShot(i/60);angles.add(p.name);assert([...p.position,...p.target,p.fov].every(Number.isFinite));assert(p.position[1]>4);if(i){const prev=ceremonyShot((i-1)/60);assert(Math.hypot(...p.position.map((n,k)=>n-prev.position[k]))<3);}}assert.equal(angles.size,6);
const crew=JSON.parse(await readFile('public/assets/athlete-master/ceremony-crew.json','utf8'));
assert(crew.vertices>=200&&crew.triangles<700);assert.equal(crew.sourceSha256,createHash('sha256').update(await readFile('public/assets/athlete-master/athlete-master.glb')).digest('hex'));
assert.equal(crew.motion.variants,2);assert.equal(crew.motion.frames,24);const samples=Buffer.from(crew.motion.pixels,'base64'),poses=new Float32Array(samples.buffer,samples.byteOffset,samples.byteLength/4);assert.equal(poses.length,crew.motion.width*crew.motion.height*4);assert(poses.every(Number.isFinite));assert(crew.cap.triangles>30&&crew.cap.triangles<180);assert(Math.max(...crew.motion.hatFrames.map(p=>p[1]))>1.45);assert(Math.abs(crew.motion.hatFrames[0][0]-crew.motion.hatFrames[6][0])>.05);
for(let i=0;i<40;i++){const p=flotsamPlacement(i,0),q=flotsamPlacement(i,10);assert(Math.abs(p.z)>20);assert(Math.abs(p.x-q.x-2.4)<1e-6);}
const music=JSON.parse(await readFile('public/assets/race-audio/menu/source.json','utf8'));assert.equal(music.id,'TCpeiecnktg');assert.equal(music.sha256,createHash('sha256').update(await readFile('public/assets/race-audio/menu/festival.mp3')).digest('hex'));
console.log('Presentation passed: race intro, six opening-film camera angles, dense separated 61-boat raft, animated hand-attached caps, bank-side drifting vegetation and exact menu music.');
