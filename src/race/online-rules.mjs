import {createRaceGame} from './gameplay.mjs';
import {raceVenue,venueStage} from './race-venues.mjs';

export const ONLINE_PROTOCOL=1;
export const ONLINE_RULESET='ngo-two-buttons';
export const DISCONNECT_GRACE_MS=15000;
export function disconnectDecision(players,now){
 const expired=players.map(player=>(!player.connected&&now-player.lastSeen>DISCONNECT_GRACE_MS)||now-player.lastSeen>DISCONNECT_GRACE_MS+5000);
 if(!expired.some(Boolean))return null;
 if(expired.every(Boolean)||players.every(player=>!player.connected))return {cancelled:true};
 const loser=expired.findIndex(Boolean);return {winner:1-loser};
}
export function departureWinner(times,departingIndex){
 // Crossing first remains a win even if the finisher leaves before the other
 // boat completes. A late app close cannot award that unfinished boat a win.
 const finisher=times.findIndex(time=>time!=null);return finisher>=0?finisher:1-departingIndex;
}
export function cleanPlayerName(value){
 const name=String(value??'').normalize('NFC').replace(/[\p{Cc}\p{Cf}<>]/gu,'').trim().replace(/\s+/gu,' ');
 return [...name].slice(0,24).join('')||'Rower';
}
export function cleanInput(value){
 return {row:value?.row===true,boost:value?.boost===true,steer:Number.isFinite(value?.steer)?Math.max(-1,Math.min(1,value.steer)):0};
}
export function ratingChange(a,b,score){return Math.round(32*(score-1/(1+10**((b-a)/400))));}
export function ratingTier(rating,matches=0){return !matches?'unranked':rating>=1600?'gold':rating>=1300?'silver':'bronze';}

// Each human uses the existing fixed-tick player physics. Neither lane is AI.
// Network messages can supply controls only; time and distance are server-owned.
export function createOnlineSimulation(venueId,flowSeed=17){
 const games=[0,1].map(()=>{const game=createRaceGame({venueId});game.start('normal',{intro:true,mode:'practice',simpleControls:true,rowingAssist:true,steeringAssist:true,steeringEnabled:true,flowSeed});return game;});
 return {
  games,
  input(index,value){const input=cleanInput(value),game=games[index];game.setBoostHeld(input.boost);game.setRowingHeld(input.row||input.boost);game.setSteering(input.steer);},
  advance(seconds){games.forEach(game=>game.advance(seconds));},
  checkpoint(){return games.map(game=>game.checkpoint());},
  restore(checkpoints){games.forEach((game,i)=>game.restoreCheckpoint(checkpoints[i]));},
  snapshot(index=0){
   const self=games[index].snapshot(),other=games[1-index].snapshot(),length=raceVenue(venueId).length;
   const finished=games.every(game=>game.state.finishTimes[0]!=null),times=[self.finishTimes[0],other.finishTimes[0]];
   const result=finished?(Math.abs(times[0]-times[1])<=.03?'tie':times[0]<times[1]?'win':'loss'):null;
   return {...self,mode:'online',phase:finished?'finished':self.phase==='finished'?'racing':self.phase,result,
    distances:[self.distances[0],other.distances[0]],speeds:[self.speeds[0],other.speeds[0]],finishTimes:times,
    lateralPositions:[self.lateralPositions[0],other.lateralPositions[0]],headings:[self.headings[0],other.headings[0]],
    aiPhase:other.beatPhase%1,aiCadence:other.cadence,aiStamina:other.stamina,aiRaceStage:venueStage(other.distances[0],raceVenue(venueId)),aiSurgeActive:other.boostActive,
    aiSurgeRemaining:other.boostActive?1:0,gap:self.distances[0]-other.distances[0],raceLength:length,
    waitingForOpponent:self.finishTimes[0]!=null&&other.finishTimes[0]==null,online:true};
  },
 };
}
