// Men's quarter-finalists, Maspéro 4–5 November 2025. The losing quarter-
// finalists are not assigned invented individual ranks 5, 6, 7 or 8.
// Color values are authored visual matches under game lighting, not measured
// paint specifications. Khmer back lettering remains the user's custom kit.
export const RACE_TEAMS_2025 = [
 {id:'tum-nup-2',name:'Tum Núp 2',rank:1,number:'17',jersey:'#36b85d',trim:'#f0f0df',cap:'#f5f3e9',roleKit:{BOW_CALLER:{jersey:'#a6cde5',cap:'#f5f3e9',shorts:'#24394e',sleeve:'#a6cde5'},MID_CONTROLLER:{jersey:'#171b22',cap:'#f5f3e9',shorts:'#244566',sleeve:'#171b22'}},pattern:'tum-naga',evidenceStatus:'bib17 race naga and role kit observed; hidden paint approximate'},
 {id:'prek-on-dok-2',name:'Prêk On Đơk 2',rank:2,number:'25',jersey:'#f6d820',trim:'#242524',cap:'#f6d820',sleeve:'#22232b',pattern:'prek-scroll',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
 {id:'prek-ta-cuol',name:'Prếk Ta Cuôl · Trà Cuôn',rank:3,number:'19',jersey:'#75379f',trim:'#edc925',cap:'#f5d51b',pattern:'tra-cuon-scale',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
 {id:'chroi-tum-chas',name:'Chrôi Tưm Chắs · Trà Tim cũ',rank:4,number:'08',jersey:'#c92336',trim:'#efeee5',cap:'#df2837',sleeve:'#edece5',roleKit:{BOW_CALLER:{jersey:'#b85c8e',cap:'#df2837',shorts:'#245782',sleeve:'#b85c8e'},MID_CONTROLLER:{jersey:'#ed693b',cap:'#df2837',sleeve:'#ed693b'}},pattern:'tra-tim-flowers',evidenceStatus:'kit confirmed; carried launch hull reconstructed; race binding approximate'},
 {id:'om-pou-year',name:'Om Pou Year',rank:null,number:'23',jersey:'#ef562c',trim:'#ecb739',cap:'#dc282e',sleeve:'#242c44',pattern:'om-scroll',evidenceStatus:'race kit confirmed; finished 2025 black/lime side and cyan end observed; bib23 hull binding unresolved'},
 {id:'kos-thum-1',name:'Kos Thum 1',rank:null,number:'49',jersey:'#f4d522',trim:'#25212b',cap:'#ee6c27',capVariants:['#ee6c27','#dc342e','#ee6c27'],interior:'#2d74b5',roleKit:{BOW_CALLER:{jersey:'#f4d522',cap:'#f4d522'},MID_CONTROLLER:{jersey:'#8eb9de',cap:'#f4d522',sleeve:'#8eb9de'}},pattern:'kos-scroll',evidenceStatus:'bib49 blue interior, diamond/floral side and orange/red caps matched to race; hidden paint approximate'},
 {id:'pothi-satharam-2',name:'Pôthi Satharam 2',rank:null,number:'07',jersey:'#ce2830',alternateJersey:'#e66924',trim:'#f4d433',cap:'#f28321',capVariants:['#f28321','#ed342c','#238a52'],sleeve:'#20262d',pattern:'satharam-red',evidenceStatus:'mixed race kit confirmed; finished red side and lower curl border observed; bib07 hull binding unresolved'},
 {id:'pothi-khsach',name:'Pôthi Khsach · Kế Sách',rank:null,number:'44',jersey:'#219251',lowerJersey:'#e3d52c',trim:'#f0eee4',cap:'#d52b31',sleeve:'#eceee6',pattern:'khsach-animal',evidenceStatus:'kit confirmed; visible kbach reconstructed'},
];
export const DEFAULT_TEAM_IDS = ['tum-nup-2','prek-on-dok-2'];
export function team2025(id){const team=RACE_TEAMS_2025.find(t=>t.id===id);if(!team)throw Error('Unknown 2025 team: '+id);return team;}
