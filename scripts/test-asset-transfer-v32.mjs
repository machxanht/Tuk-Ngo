import assert from 'node:assert/strict';
import {assetBytes} from '../src/race/asset-transfer-v32.mjs';
const url='https://example.test/model.glb',bytes=new Uint8Array([1,2,3]);let calls=0,retries=0,aborted=false;
const recovered=await assetBytes(url,{stallMs:15,onRetry:()=>retries++,fetcher:async(target,{signal})=>{
 calls++;if(calls===1)return {ok:true,body:{getReader(){return {read(){return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true}));}};}}};
 assert.equal(new URL(target).searchParams.get('asset-retry'),'1');return new Response(bytes);
}});
assert.deepEqual(new Uint8Array(recovered),bytes);assert.equal(calls,2);assert.equal(retries,1);assert(aborted);
const slow=await assetBytes(url,{stallMs:30,fetcher:async()=>new Response(new ReadableStream({async start(controller){for(let i=0;i<5;i++){await new Promise(r=>setTimeout(r,15));controller.enqueue(bytes);}controller.close();}}))});assert.equal(slow.byteLength,15);
calls=0;await assert.rejects(assetBytes(url,{attempts:2,fetcher:async()=>{calls++;return new Response('',{status:503});}}),/Unable to load/);assert.equal(calls,2);
console.log('Asset transfer: stalled stream abort/retry, progressing slow stream and bounded failure passed.');
