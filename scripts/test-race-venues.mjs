import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRaceGame} from '../src/race/gameplay.mjs';
import {raceVenue,RACE_VENUES,venueRaceX,commentaryDistance} from '../src/race/race-venues.mjs';
import {introShot,playableShot} from '../src/race/race-camera.mjs';
import {teamsForVenue,cupTeamIds,festivalTeam,isVenueTeam,roomTeamsMatchVenue} from '../src/race/festival-teams.mjs';
import {searchTeams} from '../src/race/team-search.mjs';
import {constructionForLane,opponentConstruction} from '../src/race/construction-rules.mjs';
import {createTournament} from '../src/race/tournament.mjs';
import {CAMBODIA_TEAMS,CAMBODIA_RESEARCH_ONLY} from '../src/race/cambodia-teams.mjs';
import {createCommentaryDirector} from '../src/race/race-audio.mjs';
const finishes={};
for(const venue of Object.values(RACE_VENUES)){
 assert.equal(venueRaceX(venue,venue.length),venue.finishX);
 let baseline;
 for(const fps of [15,60,144]){
  const g=createRaceGame({venueId:venue.id});g.start('easy',{simpleControls:true,steeringEnabled:true});g.advance(3);g.setRowingHeld(true);
  while(g.state.phase==='racing')g.advance(1/fps);
  assert.equal(g.state.phase,'finished');assert.equal(g.state.result,'win');assert.deepEqual(g.state.distances,[venue.length,venue.length]);assert(g.state.finishTimes.every(Number.isFinite));
  if(baseline)assert.deepEqual(g.snapshot(),baseline);else baseline=g.snapshot();
 }
 finishes[venue.id]={seconds:baseline.finishTimes[0],stamina:baseline.stamina};
 const g=createRaceGame({venueId:venue.id});g.start('normal',{simpleControls:true,mode:'practice',steeringEnabled:true});g.advance(3);g.setRowingHeld(true);g.setSteering(1);g.advance(12);assert(g.state.lateralPositions[0]<=venue.steeringLimit);g.setBoostHeld(true);const stamina=g.state.stamina;g.advance(2);assert(g.state.stamina<stamina-10);g.pause();const paused=g.snapshot();g.advance(2);assert.deepEqual(g.snapshot(),paused);g.resume();g.setRowingHeld(true);while(g.state.phase==='racing')g.advance(.1);assert.equal(g.state.result,'complete');assert.equal(g.state.distances[1],0);
 for(const d of[0,venue.startEnd,venue.length/2,venue.finalStart,venue.length-100,venue.length-50,venue.length])assert(Number.isFinite(commentaryDistance(d,venue)));
 assert.equal(commentaryDistance(venue.length/2,venue),600);assert.equal(commentaryDistance(venue.length-100,venue),1100);assert.equal(commentaryDistance(venue.length-50,venue),1150);
 let last=-1;for(let d=0;d<=venue.length;d++){const projected=commentaryDistance(d,venue);assert(projected>=last);last=projected;const shot=playableShot({venueId:venue.id,distances:[d,d],mode:'ai'},1.3);assert(shot.position.every(Number.isFinite));}
 const director=createCommentaryDirector(),cues=[];for(let d=0;d<venue.length;d++)cues.push(...director.update({phase:'racing',distances:[commentaryDistance(d,venue),0],elapsed:d,pace:'steady',gap:0,stamina:80,combo:0}).map(c=>({id:c.id,d})));
 assert.equal(cues.find(c=>c.id==='last-hundred').d,venue.length-100);assert.equal(cues.find(c=>c.id==='last-fifty').d,venue.length-50);
 for(let t=0;t<=10;t+=.05){const s=introShot(t,venue.id);assert([...s.position,...s.target,s.fov].every(Number.isFinite));}
 const roster=teamsForVenue(venue.id),player=roster.at(-1),ids=cupTeamIds(32,venue.id,player.id),cup=createTournament({playerId:player.id,teamIds:ids});let rounds=0;while(cup.currentMatch()){const match=cup.currentMatch();cup.finish({matchId:match.matchId,result:'win'});rounds++;}assert.equal(cup.snapshot().status,'champion');assert(rounds>0&&rounds<=(venue.id==='maspero'?6:3));assert(roster.every(t=>festivalTeam(t.id)===t));assert.equal(ids.length,venue.id==='maspero'?61:8);assert.equal(new Set(ids).size,ids.length);
 if(venue.id!=='maspero'){assert.equal(constructionForLane(0,venue.id),'dugout');assert.equal(constructionForLane(1,venue.id),'dugout');assert.equal(opponentConstruction('dugout',venue.id),'dugout');}
}
assert(finishes['phnom-penh'].stamina<finishes.maspero.stamina-20);assert(finishes['siem-reap'].seconds<finishes.maspero.seconds/2);
assert.equal(raceVenue('unknown').id,'maspero');assert.equal(CAMBODIA_TEAMS.length,25);assert(CAMBODIA_RESEARCH_ONLY.every(t=>!CAMBODIA_TEAMS.some(p=>p.id===t.id)));
assert.deepEqual(Object.keys(RACE_VENUES).map(id=>teamsForVenue(id).length),[61,16,8]);
assert.deepEqual(teamsForVenue('unknown'),[]);
for(const id of Object.keys(RACE_VENUES)){
 const roster=teamsForVenue(id);
 for(const team of roster){const ids=cupTeamIds(91,id,team.id);assert(ids.every(t=>isVenueTeam(id,t)));assert(ids.includes(team.id));assert(roomTeamsMatchVenue({venueId:id,players:[{venueId:id,teamId:team.id}]}));}
 for(const foreign of Object.keys(RACE_VENUES).filter(other=>other!==id))for(const team of teamsForVenue(foreign)){
  assert(!isVenueTeam(id,team.id));assert.throws(()=>cupTeamIds(91,id,team.id));assert(!roomTeamsMatchVenue({venueId:id,players:[{venueId:id,teamId:team.id}]}));
 }
 assert(!isVenueTeam(id,'kh-sdach-damrey'),'Province alone is not city-event entry evidence');
}
assert(!roomTeamsMatchVenue({venueId:'siem-reap',players:[{venueId:'phnom-penh',teamId:teamsForVenue('siem-reap')[0].id}]}));
assert(searchTeams(teamsForVenue('maspero'),'tum nup').some(t=>t.id==='tum-nup-2'));assert.equal(searchTeams(CAMBODIA_TEAMS,'សារាយ')[0].id,'kh-saray-techo');assert.equal(searchTeams(CAMBODIA_TEAMS,'keo pursat')[0].id,'kh-techo-keo-vichey');assert.equal(searchTeams(CAMBODIA_TEAMS,'not a real boat').length,0);
const large=Array.from({length:380},(_,i)=>({id:'test-'+i,name:'Test boat '+i,nameKm:'សាកល្បង'}));assert.equal(searchTeams(large,'boat 379')[0].id,'test-379');assert.equal(searchTeams(large,'').length,380);
const exported=JSON.parse(await readFile('public/assets/data/cambodia-teams.json'));assert.deepEqual(exported.teams,CAMBODIA_TEAMS);for(const id of ['phnom-penh','siem-reap'])assert.deepEqual(exported.venues[id],teamsForVenue(id).map(t=>t.id));
const english=JSON.parse(await readFile('public/assets/race-audio/english/manifest.json'));assert.equal(Object.keys(english.clips).length,19);
for(const clip of Object.values(english.clips)){assert.equal(clip.lang,'en');assert.equal(clip.sourceType,'azure-stock-neural');assert(clip.peak>.01&&clip.peak<=1.01);const data=await readFile('public/assets/race-audio/'+clip.file);assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256);}
console.log('Venue courses, both finish times, 15/60/144 FPS determinism, boost/rest/pause, narrow steering, exact audio milestones, 61/8-team cups and 19 hashed English AI clips passed.',finishes);
