import roster from '../../public/assets/data/roster-2025.json' with {type:'json'};
import {RACE_TEAMS_2025} from './teams.mjs';
import {CAMBODIA_TEAMS} from './cambodia-teams.mjs';

// The sourced registration roster includes men, women and unresolved labels.
// This mixed festival cup is a game format, not the official 2025 bracket.
const observed={
 'can_tho-02':'pothi-satharam-2','can_tho-07':'chroi-tum-chas',
 'can_tho-23':'tum-nup-2','can_tho-35':'prek-ta-cuol',
 'can_tho-37':'om-pou-year','can_tho-39':'prek-on-dok-2',
 'can_tho-46':'pothi-khsach','ca_mau-05':'kos-thum-1',
};
const colors=['#23a56b','#db473f','#388bd1','#a154bc','#eaa723','#df669d','#299eac','#d77935'];
export const FESTIVAL_TEAMS=roster.records.map((r,i)=>{
 const source=RACE_TEAMS_2025.find(t=>t.id===observed[r.id]);
 return {...(source||{id:r.id,jersey:colors[i%colors.length],trim:'#f6e3a7',cap:colors[(i+3)%colors.length],sleeve:colors[i%colors.length],pattern:'festival-sample'}),
  name:source?.name||r.nameVi,registrationId:r.id,nameVi:r.nameVi,nameKm:r.nameKm,teamNumberKm:r.teamNumberKm||'',gender:r.gender,
  appearance:source?'reference':'sample',sourceUrl:r.sourceUrl,khmerSourceUrl:r.khmerSourceUrl||null};
});
const byId=new Map([...FESTIVAL_TEAMS,...CAMBODIA_TEAMS].map(t=>[t.id,t]));
export const teamsForVenue=id=>id&&id!=='maspero'?CAMBODIA_TEAMS:FESTIVAL_TEAMS;
// Cambodian cups keep eight invitations; any researched identity can enter.
// The selector/online roster remains the full catalogue, independent of bracket size.
export function cupTeamIds(seed,venueId,playerId){
 const ids=shuffledFestivalIds(seed,teamsForVenue(venueId));
 return venueId==='maspero'?ids:[playerId,...ids.filter(id=>id!==playerId).slice(0,7)];
}
export function festivalTeam(id){const team=byId.get(id);if(!team)throw Error('Unknown festival team: '+id);return team;}
/** @param {number} seed @param {Array<{id:string}>} teams */
export function shuffledFestivalIds(seed,teams=FESTIVAL_TEAMS){
 const ids=teams.map(t=>t.id);let n=seed>>>0;
 for(let i=ids.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 return ids;
}
export const ROUND_LABELS={'round-of-64':'Vòng 61 ghe','round-of-32':'Vòng 32','round-of-16':'Vòng 16',quarterfinal:'Tứ kết',semifinal:'Bán kết',final:'Chung kết'};
