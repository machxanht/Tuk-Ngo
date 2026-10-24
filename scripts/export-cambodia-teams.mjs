import {writeFile} from 'node:fs/promises';
import {CAMBODIA_TEAMS,CAMBODIA_RESEARCH_ONLY,PHNOM_PENH_TEAMS,SIEM_REAP_TEAMS} from '../src/race/cambodia-teams.mjs';
const data={reviewed:'2026-10-24',scope:'Separate historical event catalogues, not complete official 2026 entry lists. Unassigned records are not playable. Romanisations, uniforms and hull construction remain game art.',venues:{'phnom-penh':PHNOM_PENH_TEAMS.map(t=>t.id),'siem-reap':SIEM_REAP_TEAMS.map(t=>t.id)},teams:CAMBODIA_TEAMS,researchOnly:CAMBODIA_RESEARCH_ONLY};
await writeFile('public/assets/data/cambodia-teams.json',JSON.stringify(data,null,2)+'\n');
const columns=['id','name','nameKm','province','season','reportedCrew','venueIds','entryScope','sourceUrl','appearance','transliterationVerified'];
const rows=[columns,...CAMBODIA_TEAMS.map(t=>columns.map(key=>t[key]??''))];
await writeFile('docs/cambodia-teams.csv','\ufeff'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n'));
console.log('Exported '+CAMBODIA_TEAMS.length+' sourced identities and '+CAMBODIA_RESEARCH_ONLY.length+' research-only chev record.');
