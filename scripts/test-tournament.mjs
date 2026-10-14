import assert from 'node:assert/strict';
// Canonical eight-team bracket and persistence gate.
import {createTournament} from '../src/race/tournament.mjs';
import {RACE_TEAMS_2025} from '../src/race/teams.mjs';

for(const team of RACE_TEAMS_2025){
 const tournament=createTournament({playerId:team.id,seed:901});
 const quarter=tournament.snapshot().bracket[0];
 assert.equal(quarter.matches.length,4);
 assert.equal(new Set(quarter.matches.flatMap(m=>m.teams)).size,8);
 for(let round=0;round<3;round++){
  const current=tournament.currentMatch();
  assert.equal(current.roundIndex,round);assert.notEqual(current.opponentId,team.id);
  const result=tournament.finish({matchId:current.matchId,result:'win'});
  assert.deepEqual(tournament.finish({matchId:current.matchId,result:'win'}),result);
  assert.throws(()=>tournament.finish({matchId:current.matchId,result:'loss'}));
  if(round<2){
   const previous=result.bracket[round].matches.map(m=>m.winner);
   assert.deepEqual(result.bracket[round+1].matches.flatMap(m=>m.teams),previous);
  }
 }
 assert.equal(tournament.snapshot().champion,team.id);
 assert.equal(tournament.currentMatch(),null);
 const saved=JSON.parse(JSON.stringify(tournament.snapshot()));
 const restored=createTournament();assert.deepEqual(restored.restore(saved),saved);
 assert.equal(tournament.reset().bracket.length,1);
 assert.equal(tournament.snapshot().history.length,0);
}
for(const result of ['loss','dnf']){
 const t=createTournament();t.finish({matchId:t.currentMatch().matchId,result});
 assert.equal(t.snapshot().status,'eliminated');assert.equal(t.snapshot().bracket.length,1);assert.equal(t.currentMatch(),null);
 assert.throws(()=>t.retryTie());
}
const tied=createTournament(),first=tied.currentMatch();
tied.finish({matchId:first.matchId,result:'tie'});
assert.equal(tied.snapshot().bracket.length,1);assert.equal(tied.currentMatch().blocked,true);
assert.throws(()=>tied.finish({matchId:first.matchId,result:'win'}));
tied.retryTie();assert.notEqual(tied.currentMatch().matchId,first.matchId);
assert.equal(tied.currentMatch().opponentId,first.opponentId);
tied.finish({matchId:tied.currentMatch().matchId,result:'win'});
assert.deepEqual(createTournament().restore(tied.snapshot()),tied.snapshot());
const a=createTournament({seed:42}),b=createTournament({seed:42});
assert.deepEqual(a.snapshot(),b.snapshot());
const exposed=a.snapshot();exposed.bracket[0].matches[0].teams[0]='mutated';
assert.notEqual(a.snapshot().bracket[0].matches[0].teams[0],'mutated');
for(const mutate of [s=>s.bracket[0].matches[1].winner='bogus',s=>s.teamIds[1]=s.teamIds[0],s=>s.seed=-1,s=>s.status='champion',s=>s.history.push({type:'bogus'}),s=>s.extra=true]){
 const invalid=b.snapshot();mutate(invalid);const before=a.snapshot();
 assert.throws(()=>a.restore(invalid));assert.deepEqual(a.snapshot(),before);
}
assert.throws(()=>createTournament({playerId:'unknown'}));
assert.throws(()=>a.finish({matchId:'stale',result:'win'}));
console.log('Tournament V31: all bracket, progression, replay, idempotency and restore invariants passed.');
