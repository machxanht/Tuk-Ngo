import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRaceGame} from '../src/race/gameplay.mjs';
import {introShot} from '../src/race/race-camera.mjs';
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
for(let i=0;i<61;i++){const p=ceremonyPlacement(i);assert(p.x>1100&&p.x<1800);assert(Math.abs(p.yaw-Math.PI)<.1);for(let j=0;j<i;j++){const q=ceremonyPlacement(j);assert(Math.hypot(p.x-q.x,p.z-q.z)>8);}}
const crew=JSON.parse(await readFile('public/assets/athlete-master/ceremony-crew.json','utf8'));
assert(crew.vertices>=200&&crew.triangles<600);assert.equal(crew.sourceSha256,createHash('sha256').update(await readFile('public/assets/athlete-master/athlete-master.glb')).digest('hex'));
const music=JSON.parse(await readFile('public/assets/race-audio/menu/source.json','utf8'));assert.equal(music.id,'TCpeiecnktg');assert.equal(music.sha256,createHash('sha256').update(await readFile('public/assets/race-audio/menu/festival.mp3')).digest('hex'));
console.log('Presentation passed: intro/pause/skip timing, continuous camera, separated 61-boat layout, anatomical derived LOD and exact user-selected music.');
