// Real HTTP requests; private QA profiles keep normal rankings untouched.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {teamsForVenue,isVenueTeam} from '../src/race/festival-teams.mjs';
const endpoint=process.argv[2]||'http://127.0.0.1:8790',out=process.argv[3],venues=['maspero','phnom-penh','siem-reap'];
const report={endpoint,checks:[],venues:{}};
async function request(path,method='GET',data,profile,expected=200){
 const response=await fetch(endpoint+path,{method,headers:{Origin:'https://machxanht.github.io',...(data?{'Content-Type':'application/json'}:{}),...(profile?{Authorization:'Bearer '+profile.token}:{}),...(path==='/session'&&process.env.TUKNGO_QA_SECRET?{'X-QA-Token':process.env.TUKNGO_QA_SECRET}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const value=await response.json();assert.equal(response.status,expected,JSON.stringify(value));return value;
}
const profiles=await Promise.all(venues.map(async()=>Promise.all([0,1].map(()=>request('/session','POST',{},null,201)))));
for(const [i,venueId]of venues.entries()){
 const [host,guest]=profiles[i],teams=teamsForVenue(venueId),foreign=teamsForVenue(venues[(i+1)%3])[0];
 const valid={venueId,teamId:teams[0].id,name:'Roster QA',construction:venueId==='maspero'?'plywood':'dugout'};
 for(const path of ['/queue','/rooms'])assert.equal((await request(path,'POST',{...valid,teamId:foreign.id},host,400)).error,'invalid-team');
 const room=await request('/rooms','POST',valid,host,201);
 assert.equal((await request('/rooms/'+room.roomCode+'/join','POST',{...valid,venueId:venues[(i+1)%3],teamId:foreign.id},guest,400)).error,'wrong-map');
 assert.equal((await request('/rooms/'+room.roomCode+'/join','POST',{...valid,teamId:foreign.id},guest,400)).error,'invalid-team');
 await request('/rooms/'+room.roomCode+'/join','POST',{...valid,teamId:teams[1].id},guest);
 const joined=await request('/rooms/'+room.roomCode,'GET',null,host);assert.equal(joined.venueId,venueId);assert(joined.players.every(p=>isVenueTeam(venueId,p.teamId)));
 await request('/queue?venueId='+venueId,'DELETE',null,host);
 const stopped=await request('/rooms/'+room.roomCode,'GET',null,guest);assert.equal(stopped.status,'cancelled');
 const ranks=await request('/leaderboard?venueId='+venueId,'GET',null,host);assert.equal(ranks.viewer,null);
 report.venues[venueId]={roster:teams.length,foreignTeamRejected:foreign.id,privateRoomOwnTeamsOnly:true,noRatingChange:true};
}
// One person searching on each different map must not form a cross-map pair.
try{
 for(const[i,venueId]of venues.entries())assert((await request('/queue','POST',{venueId,teamId:teamsForVenue(venueId)[0].id,name:'Separate map QA'},profiles[i][0])).queued);
 for(const[i,venueId]of venues.entries())assert((await request('/queue?venueId='+venueId,'GET',null,profiles[i][0])).queued);
 report.checks.push('foreign teams rejected by queue/create/join on all three maps','room code cannot override the selected venue','private rooms contain only their venue roster','queues on different maps do not pair','rejected choices and cancelled rooms do not change Elo');
}finally{await Promise.all(venues.map((venueId,i)=>request('/queue?venueId='+venueId,'DELETE',null,profiles[i][0])));}
if(out){await mkdir(out,{recursive:true});await writeFile(out+'/rosters.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
