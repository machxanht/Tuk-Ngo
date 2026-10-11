// Men's quarter-finalists, Maspéro 4–5 November 2025. The losing quarter-
// finalists are not assigned invented individual ranks 5, 6, 7 or 8.
// Color values are authored visual matches under game lighting, not measured
// paint specifications. Khmer back lettering remains the user's custom kit.
export const RACE_TEAMS_2025 = [
 {id:'tum-nup-2',name:'Tum Núp 2',rank:1,number:'17',jersey:'#36b85d',trim:'#f0f0df',cap:'#f5f3e9',pattern:'tum-scroll',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
 {id:'prek-on-dok-2',name:'Prêk On Đơk 2',rank:2,number:'25',jersey:'#f6d820',trim:'#242524',cap:'#f6d820',sleeve:'#22232b',pattern:'prek-scroll',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
 {id:'prek-ta-cuol',name:'Prếk Ta Cuôl · Trà Cuôn',rank:3,number:'19',jersey:'#75379f',trim:'#edc925',cap:'#f5d51b',pattern:'tra-cuon-scale',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
 {id:'chroi-tum-chas',name:'Chrôi Tưm Chắs · Trà Tim cũ',rank:4,number:'08',jersey:'#c92336',trim:'#efeee5',cap:'#df2837',sleeve:'#edece5',pattern:'tra-tim-flowers',evidenceStatus:'kit confirmed; carried launch hull reconstructed; race binding approximate'},
 {id:'om-pou-year',name:'Om Pou Year',rank:null,number:'23',jersey:'#ef562c',trim:'#ecb739',cap:'#dc282e',sleeve:'#242c44',pattern:'om-scroll',evidenceStatus:'kit confirmed; visible bow kbach only; middle approximate'},
 {id:'kos-thum-1',name:'Kos Thum 1',rank:null,jersey:'#f4d522',trim:'#25212b',cap:'#f7d61c',pattern:'kos-scroll',evidenceStatus:'kit confirmed; kbach under verification'},
 {id:'pothi-satharam-2',name:'Pôthi Satharam 2',rank:null,number:'07',jersey:'#ce2830',alternateJersey:'#e66924',trim:'#f4d433',cap:'#f28321',capVariants:['#f28321','#ed342c','#238a52'],sleeve:'#20262d',pattern:'satharam-red',evidenceStatus:'mixed kit confirmed; red/name band confirmed; lower detail unresolved'},
 {id:'pothi-khsach',name:'Pôthi Khsach · Kế Sách',rank:null,number:'44',jersey:'#219251',lowerJersey:'#e3d52c',trim:'#f0eee4',cap:'#d52b31',sleeve:'#eceee6',pattern:'khsach-animal',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
];
export const DEFAULT_TEAM_IDS = ['tum-nup-2','prek-on-dok-2'];
export function team2025(id){const team=RACE_TEAMS_2025.find(t=>t.id===id);if(!team)throw Error('Unknown 2025 team: '+id);return team;}
