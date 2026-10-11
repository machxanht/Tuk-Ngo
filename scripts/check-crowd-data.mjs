import fs from 'node:fs';
import assert from 'node:assert/strict';

const levels=[];
for(const level of ['near','far']){
 const meta=JSON.parse(fs.readFileSync(`public/assets/human/crowd-v10-${level}.json`,'utf8'));
 const raw=fs.readFileSync(`public/assets/human/${meta.binary}`);
 const values=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
 const expectedBytes=meta.vertices*meta.frames*meta.activities*6*4;
 assert.equal(raw.byteLength,expectedBytes);
 assert.equal(meta.indices.length,meta.triangles*3);
 assert(meta.indices.every(i=>Number.isInteger(i)&&i>=0&&i<meta.vertices));
 assert.equal(meta.region.length,meta.vertices);
 assert.equal(meta.accessory.length,meta.vertices);
 assert.equal(meta.hand.length,meta.vertices);
 assert.equal(meta.rest.length,meta.vertices*3);
 assert.equal(meta.poses.length,6);
 let maxNormalError=0;
 for(let i=0;i<values.length;i+=6){
  assert(values.subarray(i,i+6).every(Number.isFinite));
  const length=Math.hypot(values[i+3],values[i+4],values[i+5]);
  maxNormalError=Math.max(maxNormalError,Math.abs(length-1));
 }
 assert(maxNormalError<.001);
 levels.push({level,vertices:meta.vertices,triangles:meta.triangles,bytes:raw.byteLength,expectedBytes,maxNormalError,textureWidth:meta.vertices*2,textureHeight:meta.frames*meta.activities});
}
fs.writeFileSync('docs/qa/crowd-data-v10.json',JSON.stringify({levels,errors:[],pass:true},null,2)+'\n');
console.log({pass:true,levels});
