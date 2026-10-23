import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRaceGame} from '../src/race/gameplay.mjs';
import {introShot,ceremonyShot} from '../src/race/race-camera.mjs';
import {COURSE} from '../src/race/maspero-course.mjs';
import {flotsamPlacement,FLOTSAM_COUNTS} from '../src/race/river-flotsam.mjs';
import {ceremonyCrewDigest} from '../src/race/asset-digests.mjs';
import {ceremonyHullOverlaps} from '../src/race/ceremony-layout.mjs';
import {finishSpectatorPositions} from '../src/race/finish-spectators.mjs';
import {FESTIVAL,FESTIVAL_BRANDS} from '../src/race/festival-branding.mjs';
globalThis.window??={};
assert.equal(FESTIVAL.year,'2026');assert.equal(FESTIVAL.titleKm,'ពិធីបុណ្យអុំទូក');assert.equal(FESTIVAL.provinceKm,'ខេត្តឃ្លាំង');assert.deepEqual(FESTIVAL_BRANDS,['Kuon Khmer','Angkor Soul']);
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
for(const time of[0,17,300])for(let i=0;i<61;i++){const p=ceremonyPlacement(i,time);assert(Math.abs(p.x-COURSE.standX)<111);assert(Math.abs(p.yaw-Math.PI)<.14);for(let j=0;j<i;j++)assert(!ceremonyHullOverlaps(p,ceremonyPlacement(j,time)),'Angled ceremony hulls must remain separate');}
const raft=Array.from({length:61},(_,i)=>ceremonyPlacement(i));assert(new Set(raft.map(p=>Math.round(p.x))).size>40);assert(new Set(raft.map(p=>Math.round(p.z))).size>25);assert(Math.max(...raft.map(p=>p.yaw))-Math.min(...raft.map(p=>p.yaw))>.20);
const angles=new Set();for(let i=0;i<=1980;i++){const p=ceremonyShot(i/60);angles.add(p.name);assert([...p.position,...p.target,p.fov].every(Number.isFinite));assert(p.position[1]>4);if(i){const prev=ceremonyShot((i-1)/60);assert(Math.hypot(...p.position.map((n,k)=>n-prev.position[k]))<3);}}assert.equal(angles.size,6);
const crew=JSON.parse(await readFile('public/assets/athlete-master/ceremony-crew.json','utf8'));
assert.equal(crew.wardrobe.clothingShells,1);assert(crew.wardrobe.hiddenSkinTriangles>50,'Hidden anatomy must be removed below the shorts');assert.equal(crew.wardrobe.sourceVertexMapping,'exact','Do not reattach decimated vertices by proximity');assert(crew.wardrobe.nativeShortsPreserved);assert(crew.wardrobe.shortsTriangles>=1000,'Retain native cuff and waist topology for close camera shots');
assert(crew.farTriangles<900);assert(crew.farIndices.every(i=>i>=0&&i<crew.vertices));
assert(crew.wardrobe.shortsVertices>=30,'Seated hips and upper legs must retain shorts coverage');
assert(crew.vertices>=200&&crew.triangles<7000);assert.equal(crew.sourceSha256,createHash('sha256').update(await readFile('public/assets/athlete-master/athlete-master.glb')).digest('hex'));
assert.equal(ceremonyCrewDigest,createHash('sha256').update(await readFile('public/assets/athlete-master/ceremony-crew.json')).digest('hex'));
assert(crew.hair.vertices>=60);assert.equal(crew.hair.styles,4);assert.equal(crew.attributes.aScalp.array.length,crew.vertices*4);assert(crew.attributes.aScalp.array.some((v,i)=>i%4===3&&v>.8&&v<1.5));
assert.equal(crew.motion.variants,2);assert.equal(crew.motion.frames,24);const samples=Buffer.from(crew.motion.pixels,'base64'),poses=new Float32Array(samples.buffer,samples.byteOffset,samples.byteLength/4);assert.equal(poses.length,crew.motion.width*crew.motion.height*4);const shortsIds=[];for(let i=0;i<crew.vertices;i++){const c=crew.attributes.color.array.slice(i*3,i*3+3);if(c[0]<.02&&c[1]>.025&&c[2]>.06)shortsIds.push(i);}assert.equal(shortsIds.length,crew.wardrobe.shortsVertices);for(let frame=1;frame<crew.motion.frames*crew.motion.variants;frame++)for(const i of shortsIds)for(let axis=0;axis<3;axis++)assert.equal(poses[(frame*crew.vertices+i)*4+axis],poses[i*4+axis],'Raising either arm must not stretch or tear the planted shorts');assert(poses.every(Number.isFinite));assert(crew.cap.triangles>30&&crew.cap.triangles<180);assert(Math.max(...crew.motion.hatFrames.map(p=>p[1]))>1.45);assert(Math.abs(crew.motion.hatFrames[0][0]-crew.motion.hatFrames[6][0])>.05);
const drift=Array.from({length:FLOTSAM_COUNTS.hyacinth+FLOTSAM_COUNTS.banana},(_,i)=>flotsamPlacement(i));assert(drift.length>150);assert(new Set(drift.map(p=>p.cluster)).size>25);assert(new Set(drift.map(p=>Math.round(Math.abs(p.z)*10))).size>60);
for(let i=0;i<drift.length;i++){const p=drift[i],q=flotsamPlacement(i,10);assert(Math.min(...COURSE.lanes.map(lane=>Math.abs(p.z-lane)))>4,'Floating plants must clear both racing lanes');assert(Math.abs(p.x-q.x-2.4)<1e-6);}
const waders=finishSpectatorPositions(COURSE.finishX,.28);assert(waders.length>500);assert.equal(new Set(waders.map(p=>p.cluster)).size,10);assert(waders.some(p=>p.z<0)&&waders.some(p=>p.z>0));for(const p of waders){assert(p.x>COURSE.finishX&&p.x<COURSE.finishX+100);assert(Math.abs(p.z)>21);assert.equal(p.waterY,.28);assert.equal(p.submergedHeight,.9);assert(['wave','cheer','clap'].includes(p.activity));}
const music=JSON.parse(await readFile('public/assets/race-audio/menu/source.json','utf8'));assert.equal(music.id,'TCpeiecnktg');assert.equal(music.sha256,createHash('sha256').update(await readFile('public/assets/race-audio/menu/festival.mp3')).digest('hex'));
console.log('Presentation passed: race intro, six camera angles, irregular separated 61-boat raft, scalp/hair coverage, animated handheld caps, ten final-100m spectator clusters, drifting vegetation and exact menu music.');
