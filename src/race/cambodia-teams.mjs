// Sourced Khmer identities; display transliterations and colours are game art.
const builder='https://thmeythmey.com/detail/141902';
const results2019='https://khmernote.com.kh/news/61403';
const results2024='https://kohsantepheapdaily.com.kh/article/2007453.html';
/** @type {Array<[string,string,string,string,string,number|null]>} */
const records=[
 ['kh-sovan-reachsey','សុវណ្ណរាជសី បារមីបន្ទាយមហានគរ','Sovan Reachsey Baramey Banteay Mahanokor','Banteay Meanchey','https://ams.com.kh/news/central/1167878',76],
 ['kh-chey-samrith','ជ័យសំរឹទ្ធ','Chey Samrith','Prey Veng','https://thmeythmey.com/detail/142042',22],
 ['kh-hanuman','កំពូលអធិរាជត្រៃភព ហនុមានសែនជ័យ','Kampul Athireach Traiphop Hanuman Senchey','Phnom Penh',builder,null],
 ['kh-maha-tonsay','មហាទន្សាយតេជោសែនជ័យ','Maha Tonsay Techo Senchey','Cambodia',builder,null],
 ['kh-srei-krang-youv','ស្រីក្រាំងយ៉ូវ','Srei Krang Youv','Cambodia',builder,null],
 ['kh-sea-senchey','ស៊ាសែនជ័យបារមីតេជៈ','Sea Senchey Baramey Techo','Cambodia',builder,null],
 ['kh-chao-pech','ចៅពេជ្រកុមារ','Chao Pech Komar','Cambodia',builder,null],
 ['kh-sdach-damrey','ស្ដេចដំរីសភ្លុកខៀវមានជ័យ បារមីវត្តអារញ្ញសាគរ','Sdach Damrey Sa Phluk Khiev Meanchey Baramey Wat Aranh Sakor','Siem Reap','https://takeo.info.gov.kh/km/article/01a13e92-415c-767b-827c-4bf4c090200a',null],
 ['kh-techo-keo-vichey','តេជោកែវវិជ័យ បារមីចៅសែន','Techo Keo Vichey Baramey Chao Sen','Pursat',results2024,null],
 ['kh-saray-techo','សារាយតេជោសែនជ័យ','Saray Techo Senchey','Kandal',results2024,null],
 ['kh-koh-ker-thipadei','កោះកេរធិបតី','Koh Ker Thipadei','Preah Vihear',results2024,null],
 ['kh-narind-rangsey','នរិន្ទរង្សីពិជ័យចិត្របុត្រ','Narind Rangsey Pichey Chit Bot','Battambang','https://thmeythmey.com/detail/142074',75],
 ['kh-pka-ram','ផ្ការាំស័ក្តិសិទ្ធិ','Pka Ram Saksith','Kandal',results2019,null],
 ['kh-rontah-pech','រន្ទះពេជ្រសែនជ័យ','Rontah Pech Senchey','Kampong Chhnang',results2019,null],
 ['kh-kaek-sa','ក្អែកសតេជោសែនជ័យ','Kaek Sa Techo Senchey','Phnom Penh',results2019,null],
 ['kh-vibol-panha','សម្តេចវិបុលបញ្ញាបារមីមានជ័យ','Samdech Vibol Panha Baramey Meanchey','Takeo',results2019,null],
 ['kh-kiri-vong','គិរីវង់សុខសែនជ័យ','Kiri Vong Sok Senchey','Takeo',results2019,null],
];
const colours=['#f6c12e','#24ad78','#ef713e','#398dd2','#ab52b7','#e83c50','#21b5b0','#ec719d'];
export const CAMBODIA_TEAMS=records.map(([id,nameKm,name,province,sourceUrl,crew],i)=>({id,registrationId:id,name,nameVi:name,nameKm,teamNumberKm:'',country:'KH',province,sourceUrl,season:sourceUrl===results2019?2019:id==='kh-sdach-damrey'?2026:2024,reportedCrew:crew,appearance:'sample',jersey:colours[i%colours.length],trim:'#ffe2a1',cap:colours[(i+2)%colours.length],sleeve:colours[i%colours.length],pattern:'festival-sample',gender:id==='kh-rontah-pech'?'women':'unverified',transliterationVerified:false,construction:'dugout',constructionEvidence:'Game art default; original timber construction not verified',identityEvidence:'published-name',entryScope:sourceUrl===results2019?'Phnom Penh 2019':id==='kh-sdach-damrey'?'Provincial event 2026':'Cambodian reporting 2024'}));
export const CAMBODIA_RESEARCH_ONLY=[{id:'kh-tepthida',nameKm:'ទេពធីតាសែនជ័យបារមីជំទាវទេព',name:'Tepthida Senchey Baramey Chumteav Tep',province:'Kampong Chhnang',season:2024,reportedCrew:46,reportedLength:29.73,reportedClass:'chev',sourceUrl:'https://kohsantepheapdaily.com.kh/article/2003391.html',playable:false,reason:'Different rowing mechanism; not attached to the paddle rig.'}];

// Event membership is explicit. A boat's home province does not prove that it
// entered the city-river event; the provincial 2026 record remains unassigned.
CAMBODIA_TEAMS.forEach(team=>{team.venueIds=team.id==='kh-sdach-damrey'?[]:['phnom-penh'];});
const siemSource='https://ams.com.kh/news/central/161417';
const siemRecords=[
 ['sr-maha-kosa','មហាកោសាមានជ័យ','Maha Kosa Meanchey','men'],
 ['sr-sotr-nikum','សូទ្រនិគមសែនជ័យបារមីតាពេទ្រ','Sotr Nikum Senchey Baramey Ta Petr','men'],
 ['sr-krud-meas','គ្រុឌមាសតេជោសែនជ័យ','Krud Meas Techo Senchey','men'],
 ['sr-peam-sameakki','ពាមសាមគ្គីសែនជ័យ','Peam Sameakki Senchey','men'],
 ['sr-hong-chan','ហង្សច័ន្ទមានជ័យបារមីមហានគរ','Hong Chan Meanchey Baramey Mahanokor','women'],
 ['sr-yeay-tep','យាយទេពសំដែងរិទ្ធ','Yeay Tep Samdeng Rith','women'],
 ['sr-angkor-chum','អង្គរជុំមានជ័យ','Angkor Chum Meanchey','women'],
 ['sr-kong-chey','គង់ជ័យបារមីស្រីខ្ទុម','Kong Chey Baramey Srei Khtum','women'],
];
export const SIEM_REAP_TEAMS=siemRecords.map(([id,nameKm,name,gender],i)=>({id,registrationId:id,name,nameVi:name,nameKm,teamNumberKm:'',country:'KH',province:'Siem Reap',sourceUrl:siemSource,season:2018,reportedCrew:null,appearance:'sample',jersey:colours[i],trim:'#ffe2a1',cap:colours[(i+2)%colours.length],sleeve:colours[i],pattern:'festival-sample',gender,transliterationVerified:false,construction:'dugout',constructionEvidence:'Game art default; original timber construction not verified',identityEvidence:'published-event-results',entryScope:'Siem Reap city river 2018',venueIds:['siem-reap']}));
CAMBODIA_TEAMS.push(...SIEM_REAP_TEAMS);
export const PHNOM_PENH_TEAMS=CAMBODIA_TEAMS.filter(team=>team.venueIds.includes('phnom-penh'));
