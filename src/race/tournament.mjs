import {RACE_TEAMS_2025} from './teams.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
const roundName=count=>count===2?'final':count===4?'semifinal':count===8?'quarterfinal':'round-of-'+count;
const results=['win','loss','tie','dnf'];
function aiWinner(seed,round,index){
 // Match-local seeded coin toss: no ranks, names or real team strength.
 let x=(seed^Math.imul(round+1,0x9e3779b9)^Math.imul(index+1,0x85ebca6b))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return (x^(x>>>16))&1;
}
function optionsValid({seed,playerId,teamIds}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Seed must be uint32');
 if(!Array.isArray(teamIds)||teamIds.length<2||teamIds.length>128||new Set(teamIds).size!==teamIds.length||teamIds.some(id=>typeof id!=='string'||!id.length))throw Error('Between two and 128 unique team IDs required');
 if(!teamIds.includes(playerId))throw Error('Player must be one of the eight teams');
}

export function createTournament({playerId=RACE_TEAMS_2025[0].id,seed=31,teamIds=RACE_TEAMS_2025.map(t=>t.id)}={}){
 let state;
 function beginRound(participants){
  const r=state.bracket.length;
  const matches=[];
  const slots=2**Math.ceil(Math.log2(participants.length)),byes=slots-participants.length;
  for(let i=0;i<participants.length;){
   const index=matches.length,teams=participants.slice(i,i+(index<byes?1:2)),isPlayer=teams.includes(state.playerId);i+=teams.length;
   matches.push({id:`r${r}-m${index}`,teams,winner:teams.length===1?teams[0]:isPlayer?null:teams[aiWinner(state.seed,r,index)],result:teams.length===1?'bye':isPlayer?null:'ai',attempt:0});
  }
  state.bracket.push({round:roundName(slots),matches});
  // A bye grants progression, never an invented opponent/race result.
  if(matches.some(m=>m.result==='bye'&&m.teams[0]===state.playerId))beginRound(matches.map(m=>m.winner));
 }
 function reset(config={}){
  const next={playerId:config.playerId??state?.playerId??playerId,seed:config.seed??state?.seed??seed,teamIds:copy(config.teamIds??state?.teamIds??teamIds)};
  optionsValid(next);
  state={version:1,...next,status:'ready',champion:null,bracket:[],history:[]};
  beginRound(state.teamIds);
  return snapshot();
 }
 function current(){
  if(!['ready','tie'].includes(state.status))return null;
  const round=state.bracket.at(-1),match=round.matches.find(m=>m.teams.includes(state.playerId));
  return {matchId:`${match.id}-a${match.attempt}`,round:round.round,roundIndex:state.bracket.length-1,playerId:state.playerId,opponentId:match.teams.find(id=>id!==state.playerId),teams:[...match.teams],blocked:state.status==='tie'};
 }
 function finish({matchId,result}){
  if(typeof matchId!=='string'||!results.includes(result))throw Error('Valid matchId and race result required');
  const previous=state.history.find(e=>e.type==='finish'&&e.matchId===matchId);
  if(previous){if(previous.result!==result)throw Error('Conflicting finish result');return snapshot();}
  const active=current();
  if(!active||active.blocked||active.matchId!==matchId)throw Error('Match is not available');
  const match=state.bracket.at(-1).matches.find(m=>m.teams.includes(state.playerId));
  state.history.push({type:'finish',matchId,result});match.result=result;
  if(result==='tie')state.status='tie';
  else if(result==='loss'||result==='dnf'){match.winner=active.opponentId;state.status='eliminated';}
  else{
   match.winner=state.playerId;
   if(state.bracket.at(-1).matches.length===1){state.status='champion';state.champion=state.playerId;}
   else beginRound(state.bracket.at(-1).matches.map(m=>m.winner));
  }
  return snapshot();
 }
 function retryTie(){
  if(state.status!=='tie')throw Error('Only a tied match can be replayed');
  const match=state.bracket.at(-1).matches.find(m=>m.teams.includes(state.playerId));
  state.history.push({type:'retry'});match.attempt++;match.result=null;state.status='ready';
  return snapshot();
 }
 function snapshot(){return copy(state);}
 function resolveRemaining(){
  if(state.status!=='eliminated')throw Error('Only an eliminated player can resolve remaining races');
  if(state.champion)return snapshot();
  state.history.push({type:'resolve'});
  while(state.bracket.at(-1).matches.length>1)beginRound(state.bracket.at(-1).matches.map(m=>m.winner));
  state.champion=state.bracket.at(-1).matches[0].winner;return snapshot();
 }
 function restore(saved){
  // Rebuild from validated events; never trust persisted winner/bracket fields.
  if(!saved||saved.version!==1||!Array.isArray(saved.history)||saved.history.length>128)throw Error('Invalid tournament snapshot');
  optionsValid(saved);
  const candidate=createTournament({playerId:saved.playerId,seed:saved.seed,teamIds:saved.teamIds});
  for(const event of saved.history){
   if(!event||typeof event!=='object')throw Error('Invalid history event');
   if(event.type==='finish')candidate.finish(event);
   else if(event.type==='retry')candidate.retryTie();
   else if(event.type==='resolve')candidate.resolveRemaining();
   else throw Error('Invalid history event');
  }
  const rebuilt=candidate.snapshot();
  // Canonical comparison tolerates JSON property order, rejects extra data.
  function canonical(value){
   if(Array.isArray(value))return value.map(canonical);
   if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
   return value;
  }
  if(JSON.stringify(canonical(rebuilt))!==JSON.stringify(canonical(saved)))throw Error('Snapshot does not match valid tournament history');
  state=rebuilt;return snapshot();
 }
 reset();
 return {currentMatch:current,finish,retryTie,resolveRemaining,snapshot,restore,reset};
}
