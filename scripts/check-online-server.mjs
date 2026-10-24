import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import WebSocket from 'ws';
import {teamsForVenue} from '../src/race/festival-teams.mjs';

const url=process.argv[2]||'http://127.0.0.1:8790',out=process.argv[3];
const origin='https://machxanht.github.io',venueId='siem-reap',teams=teamsForVenue(venueId).slice(-2),report={url,teams:teams.map(t=>t.id),checks:[],startedAt:new Date().toISOString()};
async function request(path,method='GET',data,guest,expected=200){const response=await fetch(url+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(guest?{Authorization:'Bearer '+guest.token}:{}),...(path==='/session'&&process.env.TUKNGO_QA_SECRET?{'X-QA-Token':process.env.TUKNGO_QA_SECRET}:{})},...(data?{body:JSON.stringify(data)}:{})});const value=await response.json();assert.equal(response.status,expected,JSON.stringify(value));return value;}
const guests=await Promise.all([0,1].map(()=>request('/session','POST',{},null,201)));
await request('/queue','POST',{venueId,teamId:teams[0].id,name:'No token'},null,401);
await request('/queue','POST',{venueId:'unknown',teamId:'x'},guests[0],400);
const denied=await fetch(url+'/health',{headers:{Origin:'https://untrusted.example'}});assert.equal(denied.status,403);report.checks.push('authentication and origin enforcement');
const before=await request('/leaderboard?venueId='+venueId,'GET',null,guests[0]);
const first=await request('/queue','POST',{venueId,teamId:teams[0].id,name:'River QA A'},guests[0]);assert(first.queued);
const second=await request('/queue','POST',{venueId,teamId:teams[1].id,name:'River QA B'},guests[1]);assert(second.roomCode);
const match=await request('/queue?venueId='+venueId,'GET',null,guests[0]);assert.equal(match.roomCode,second.roomCode);report.checks.push('two guest matchmaking and shared room');
const sockets=[],states=[null,null],rooms=[null,null];let finishedResolve,finishedReject;
const finished=new Promise((resolve,reject)=>{finishedResolve=resolve;finishedReject=reject;});
const start=Date.now();let seq=[0,0],networked=0;
function connect(index){return new Promise((resolve,reject)=>{const socket=new WebSocket(url.replace(/^http/,'ws')+'/rooms/'+match.roomCode+'/socket',['tukngo','token.'+guests[index].token],{origin});sockets[index]=socket;socket.on('error',reject);socket.on('open',()=>resolve(socket));socket.on('message',data=>{try{const packet=JSON.parse(data);if(packet.room){rooms[index]=packet.room;seq[index]=Math.max(seq[index],packet.room.inputSequence??-1);}if(packet.game){states[index]=packet.game;networked++;}if(packet.room?.status==='finished'&&packet.room.settled)finishedResolve(packet.room);}catch(error){finishedReject(error);}});});}
let controls,timeout;
try{
 await Promise.all([connect(0),connect(1)]);sockets.forEach(socket=>socket.send(JSON.stringify({type:'ready',ready:true})));
 controls=setInterval(()=>{for(let i=0;i<2;i++){const socket=sockets[i];if(socket.readyState===1){const racing=states[i]?.phase==='racing';socket.send(JSON.stringify({type:'input',row:racing&&(i===0||states[i].elapsed>5),boost:false,steer:0,seq:++seq[i]}));socket.send(JSON.stringify({type:'ping',at:Date.now()}));}}},300);
 // The server must ignore client positions, timestamps and forged results.
 await new Promise(resolve=>setTimeout(resolve,15500));
 sockets[0].send(JSON.stringify({type:'finish',winner:0,time:.001,distance:500}));
 sockets[0].send(JSON.stringify({type:'input',row:true,seq:++seq[0],distance:500,elapsed:99999,finishTimes:[.001,null]}));
 await new Promise(resolve=>setTimeout(resolve,500));assert(states[0].distances[0]<60);assert.equal(states[0].finishTimes[0],null);report.checks.push('forged distance/time/result ignored');
 const oldSequence=seq[0];sockets[0].close();await new Promise(resolve=>setTimeout(resolve,1000));await connect(0);await new Promise(resolve=>setTimeout(resolve,500));assert(rooms[0].status==='running');assert(seq[0]>=oldSequence);report.checks.push('reconnection within grace and input sequence resume');
 timeout=setTimeout(()=>finishedReject(new Error('Real-time race did not finish within 150 seconds')),150000);
 const result=await finished;clearTimeout(timeout);clearInterval(controls);
 assert.equal(result.ranked,true);assert.equal(result.result.reason,'finish');assert.equal(result.result.winner,0);assert(result.result.times.every(t=>t>50));assert.equal(result.changes.length,2);assert.equal(result.changes[0].change,-result.changes[1].change);
 const after=await request('/leaderboard?venueId='+venueId,'GET',null,guests[0]);assert.equal(after.viewer.wins,1);assert.equal(after.viewer.matches,1);assert.equal(after.viewer.rating,1016);assert.equal(after.total,before.total+2);
 await new Promise(resolve=>setTimeout(resolve,1000));const duplicate=await request('/leaderboard?venueId='+venueId,'GET',null,guests[0]);assert.deepEqual(duplicate.viewer,after.viewer);report.checks.push('full human race, authoritative finish and exactly-once persisted Elo');
 const friendly=await request('/rooms','POST',{venueId,teamId:teams[0].id,name:'River QA A'},guests[0],201);await request('/rooms/'+friendly.roomCode+'/join','POST',{venueId,teamId:teams[1].id,name:'River QA B'},guests[1]);await request('/queue?venueId='+venueId,'DELETE',null,guests[0]);const privateRoom=await request('/rooms/'+friendly.roomCode,'GET',null,guests[1]);assert.equal(privateRoom.ranked,false);assert.equal(privateRoom.status,'cancelled');const unchanged=await request('/leaderboard?venueId='+venueId,'GET',null,guests[0]);assert.deepEqual(unchanged.viewer,after.viewer);report.checks.push('private room creation/join/cancellation does not change rank');
 report.result={winner:result.result.winner,times:result.result.times,changes:result.changes,networkPackets:networked,elapsedSeconds:(Date.now()-start)/1000};
 if(out){await mkdir(out,{recursive:true});await writeFile(out+'/server.json',JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
}finally{clearInterval(controls);clearTimeout(timeout);sockets.forEach(socket=>socket.close());}
