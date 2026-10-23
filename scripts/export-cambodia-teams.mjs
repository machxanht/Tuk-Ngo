import {writeFile} from 'node:fs/promises';
import {CAMBODIA_TEAMS,CAMBODIA_RESEARCH_ONLY} from '../src/race/cambodia-teams.mjs';
const data={reviewed:'2026-10-24',scope:'Sourced identities for game invitations, not a complete official entry list. Romanisations and colours are game art. The common paddle rig is not a replica of each real crew.',teams:CAMBODIA_TEAMS,researchOnly:CAMBODIA_RESEARCH_ONLY};
await writeFile('public/assets/data/cambodia-teams.json',JSON.stringify(data,null,2)+'\n');
const columns=['id','name','nameKm','province','season','reportedCrew','sourceUrl','appearance','transliterationVerified'];
const rows=[columns,...CAMBODIA_TEAMS.map(t=>columns.map(key=>t[key]??''))];
await writeFile('docs/cambodia-teams.csv','\ufeff'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n'));
console.log('Exported eight sourced invitations and one research-only chev record.');
