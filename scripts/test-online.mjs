import assert from 'node:assert/strict';
import {createOnlineSimulation,cleanInput,cleanPlayerName,ratingChange,disconnectDecision,departureWinner} from '../src/race/online-rules.mjs';
import {RACE_VENUES} from '../src/race/race-venues.mjs';
import {createOnlineClient} from '../src/race/online-client.mjs';
import {ONLINE_COPY} from '../src/race/online-language.ts';

assert.deepEqual(cleanInput({row:1,boost:true,steer:Infinity,distance:10000}),{row:false,boost:true,steer:0});
assert.equal(cleanInput({steer:9}).steer,1);
assert.equal(cleanPlayerName(' <A>\n B\u200b '),'A B');
assert.equal(ratingChange(1000,1000,1),16);assert.equal(ratingChange(1000,1000,0),-16);assert.equal(ratingChange(1000,1000,.5),0);
assert.deepEqual(disconnectDecision([{connected:false,lastSeen:0},{connected:false,lastSeen:1000}],15500),{cancelled:true});
assert.deepEqual(disconnectDecision([{connected:false,lastSeen:0},{connected:true,lastSeen:15500}],15500),{winner:1});
assert.equal(disconnectDecision([{connected:false,lastSeen:0},{connected:true,lastSeen:10000}],14000),null);
assert.deepEqual(disconnectDecision([{connected:true,lastSeen:0},{connected:true,lastSeen:0}],21000),{cancelled:true});
assert.equal(departureWinner([70,null],0),0);assert.equal(departureWinner([null,70],1),1);assert.equal(departureWinner([null,null],1),0);
for(const venue of Object.values(RACE_VENUES)){
 const a=createOnlineSimulation(venue.id,71),b=createOnlineSimulation(venue.id,71);
 a.advance(13);b.advance(13);a.input(0,{row:true});a.input(1,{row:true});b.input(0,{row:true});b.input(1,{row:true});
 for(let n=0;n<1300;n++){a.advance(.05);b.advance(.025);b.advance(.025);}
 assert.deepEqual(a.checkpoint(),b.checkpoint(),'frame grouping must not change authoritative physics');
 const restored=createOnlineSimulation(venue.id,71);restored.restore(a.checkpoint());
 a.input(0,{row:true,boost:true,steer:.3});restored.input(0,{row:true,boost:true,steer:.3});
 for(let n=0;n<60;n++){a.advance(.05);restored.advance(.05);}
 assert.deepEqual(restored.snapshot(),a.snapshot(),'checkpoint retains stroke bookkeeping');
 for(let n=0;n<10000&&!['finished'].includes(a.snapshot().phase);n++){a.input(0,{row:true});a.input(1,{row:true});a.advance(.05);}
 const s=a.snapshot();assert.equal(s.phase,'finished');assert(s.finishTimes.every(Number.isFinite));assert.equal(s.raceLength,venue.length);assert.equal(s.distances[0],venue.length);
 const other=a.snapshot(1);assert.deepEqual(other.distances,[...s.distances].reverse());assert.equal(other.result,s.result==='win'?'loss':s.result==='loss'?'win':'tie');
}
for(const language of ['km','en'])assert.deepEqual(Object.keys(ONLINE_COPY[language]).sort(),Object.keys(ONLINE_COPY.vi).sort(),'online interface key parity');

// Unit-test request races with a controlled transport. External transport and
// durable storage are checked separately by check-online-server.mjs.
const original={fetch:globalThis.fetch,storage:globalThis.localStorage,ws:globalThis.WebSocket},storage=new Map();
let sessions=0,configurations=0,resolveQueue,queueStarted=false,webSockets=0;const order=[];
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
globalThis.WebSocket=class {constructor(){webSockets++;throw new Error('Cancelled request opened a WebSocket');}};
globalThis.fetch=async (address,options={})=>{
 const path=String(address);if(path.endsWith('online-config.json')){configurations++;return Response.json({url:'https://unit.invalid'});}
 if(path.endsWith('/session')){sessions++;await new Promise(resolve=>setImmediate(resolve));return Response.json({id:'unit-guest',token:'unit-token'});}
 if(path.endsWith('/health'))return Response.json({ok:true,protocol:1});
 if(path.includes('/leaderboard'))return Response.json({rows:[],viewer:null,total:0});
 if(path.endsWith('/queue')&&options.method==='POST'){queueStarted=true;return new Promise(resolve=>{resolveQueue=()=>{order.push('post-completed');resolve(Response.json({roomCode:'SABCDEFG'}));};});}
 if(path.includes('/queue')&&options.method==='DELETE'){order.push('delete');return Response.json({cancelled:true});}
 throw new Error('Unexpected unit request');
};
const client=createOnlineClient({baseUrl:'/unit/',venueId:'siem-reap'});
try{
 await Promise.all([client.open(),client.refresh()]);assert.equal(sessions,1);assert.equal(configurations,1);
 const finding=client.play('queue',{teamId:'unit-team'});while(!queueStarted)await new Promise(resolve=>setImmediate(resolve));
 const leaving=client.leave();assert(client.state.busy);await client.play('queue',{teamId:'ignored-while-leaving'});resolveQueue();await Promise.all([finding,leaving]);
 assert.deepEqual(order,['post-completed','delete']);assert.equal(webSockets,0);assert.equal(client.state.queued,false);assert.equal(client.state.busy,false);
}finally{client.dispose();globalThis.fetch=original.fetch;globalThis.localStorage=original.storage;globalThis.WebSocket=original.ws;}
console.log('Online: sanitized inputs, Elo, 3 courses, fixed ticks/checkpoints, human lanes, 3 languages, deduplicated sessions and cancellation during matchmaking passed.');
