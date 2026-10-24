import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cambodiaBank,cambodiaFeature,cambodiaLayout,cambodiaReserved} from '../src/race/cambodia-geography.mjs';
import {introShot} from '../src/race/race-camera.mjs';
for(const id of ['phnom-penh','siem-reap']){
 const data=cambodiaLayout.venues[id];
 for(let x=930;x<=1090+data.gameLength+160;x+=5){assert(cambodiaBank(id,x,-1)<=-19);assert(cambodiaBank(id,x,1)>=19);}
 for(const f of data.features){assert(f.osmWay>0);assert(f.footprint.flat().every(Number.isFinite));if(!f.id.endsWith('bridge'))assert(cambodiaReserved(id,f.x,f.z));}
 const primary=cambodiaFeature(id,id==='phnom-penh'?'moonlight':'royal-residence'),intro=introShot(0,id);assert.equal(intro.target[0],primary.x);assert.equal(intro.target[2],primary.z);
}
const pp=id=>cambodiaFeature('phnom-penh',id),sr=id=>cambodiaFeature('siem-reap',id);
assert(pp('throne-hall').z<pp('moonlight').z-100,'Throne Hall is inland of the quay pavilion');
assert(pp('silver-pagoda').x<pp('throne-hall').x,'Silver Pagoda is south of Throne Hall');
assert(pp('national-museum').x>pp('moonlight').x,'Museum is north of the palace');
assert(sr('royal-gardens').x>1500,'Gardens belong near NR6/start, not finish');
assert(sr('nr6-bridge').x>1590+20);assert(sr('tep-vong-bridge').x<1090-20);
const flag=await readFile('public/assets/festival/cambodia-flag.svg','utf8');assert(flag.includes('900')&&flag.includes('600'));assert(flag.length<16000);
assert.deepEqual(JSON.parse(await readFile('public/assets/maps/cambodia-layout.json','utf8')),cambodiaLayout);
console.log('Sourced landmark ordering, both mapped shores, clear bridges, intro framing and national-flag asset passed.');
