import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import WebSocket from 'ws';
import {teamsForVenue} from '../src/race/festival-teams.mjs';

const url=process.argv[2]||'http://127.0.0.1:8790',out=process.argv[3],venueId='phnom-penh',teams=teamsForVenue(venueId),origin='https://machxanht.github.io';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(path,method='GET',value,guest){const r=await fetch(url+path,{method,headers:{Origin:origin,...(value?{'Content-Type':'application/json'}:{}),...(guest?{Authorization:'Bearer '+guest.token}:{}),...(path==='/session'&&process.env.TUKNGO_QA_SECRET?{'X-QA-Token':process.env.TUKNGO_QA_SECRET}:{})},...(value?{body:JSON.stringify(value)}:{})});const result=await r.json();assert(r.ok,JSON.stringify(result));return result;}
async function until(condition,seconds=25){const end=Date.now()+seconds*1000;while(!condition()){if(Date.now()>end)throw new Error('Timed out waiting for room lifecycle');await delay(100);}}
const guests=await Promise.all([0,1].map(()=>request('/session','POST',{}))),report={url,venueId,checks:[]};
for(const scenario of ['both-disconnect','one-disconnect']){
 const snapshots=[null,null],rooms=[null,null],sockets=[];let ping;
 try{
  await request('/queue','POST',{venueId,teamId:teams[0].id,name:'Lifecycle QA 1'},guests[0]);
  const queued=await request('/queue','POST',{venueId,teamId:teams[1].id,name:'Lifecycle QA 2'},guests[1]);const code=queued.roomCode;assert(code);
  await Promise.all(guests.map((guest,i)=>new Promise((resolve,reject)=>{const socket=new WebSocket(url.replace(/^http/,'ws')+'/rooms/'+code+'/socket',['tukngo','token.'+guest.token],{origin});sockets[i]=socket;socket.on('error',reject);socket.on('open',resolve);socket.on('message',raw=>{const data=JSON.parse(raw);if(data.game)snapshots[i]=data.game;if(data.room)rooms[i]=data.room;});})));
  sockets.forEach(socket=>socket.send(JSON.stringify({type:'ready',ready:true})));
  ping=setInterval(()=>sockets.forEach(socket=>{if(socket.readyState===1)socket.send(JSON.stringify({type:'ping',at:Date.now()}));}),2000);
  await until(()=>snapshots.every(s=>s?.phase==='racing'));sockets[0].close();
  if(scenario==='both-disconnect'){await delay(900);sockets[1].close();await delay(16000);const room=await request('/rooms/'+code,'GET',null,guests[0]);assert.equal(room.status,'cancelled');assert.equal(room.changes.length,0);const board=await request('/leaderboard?venueId='+venueId,'GET',null,guests[0]);assert.equal(board.viewer,null);report.checks.push('Both sockets close 900 ms apart: cancellation without a false winner or rating');}
  else{await until(()=>rooms[1]?.status==='finished'&&rooms[1]?.settled,23);assert.equal(rooms[1].result.reason,'disconnect');assert.equal(rooms[1].result.winner,1);const board=await request('/leaderboard?venueId='+venueId,'GET',null,guests[1]);assert.equal(board.viewer.rating,1016);assert.equal(board.viewer.wins,1);report.checks.push('One socket stays live: opponent forfeit after grace, exactly one win and +16 Elo');}
 }finally{clearInterval(ping);sockets.forEach(socket=>socket.close());}
}
if(out){await mkdir(out,{recursive:true});await writeFile(out+'/disconnect.json',JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
