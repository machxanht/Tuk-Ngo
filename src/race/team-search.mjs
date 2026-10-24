// Keep Khmer vowel signs; only Latin diacritics and invisible separators fold.
export function searchKey(value=''){
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').replace(/[\u200b-\u200d\ufeff]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
}
export function searchTeams(teams,query){
 const words=searchKey(query).split(' ').filter(Boolean);
 return teams.filter(t=>{const key=searchKey([t.name,t.nameVi,t.nameKm,t.province,t.registrationId,...(t.aliases||[])].join(' '));return words.every(word=>key.includes(word));});
}
