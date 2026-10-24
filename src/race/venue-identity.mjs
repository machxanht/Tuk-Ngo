// Game event identities; not seals or sponsorship claims of real organisers.
export const VENUE_IDENTITY=Object.freeze({
 maspero:{id:'maspero',title:'ពិធីបុណ្យអុំទូក',place:'ខេត្តឃ្លាំង · ម៉ាស្ពេរ៉ូ',short:'ឃ្លាំង',background:'#064d46',accent:'#ec3556',gold:'#ffd05a',water:'#11a9df',motif:'delta',name:{vi:'Lễ hội đua ghe Ngo',km:'ពិធីបុណ្យអុំទូក · ឃ្លាំង',en:'Ngo Boat Racing Festival'}},
 'phnom-penh':{id:'phnom-penh',title:'ពិធីបុណ្យអុំទូក',place:'រាជធានីភ្នំពេញ · ទន្លេសាប',short:'ភ្នំពេញ',background:'#142c62',accent:'#b83e58',gold:'#ffd36b',water:'#3085cb',motif:'royal',name:{vi:'Lễ hội đua thuyền Phnom Penh',km:'ពិធីបុណ្យអុំទូក · ភ្នំពេញ',en:'Phnom Penh Water Festival'}},
 'siem-reap':{id:'siem-reap',title:'ពិធីបុណ្យអុំទូក',place:'ខេត្តសៀមរាប · ស្ទឹងសៀមរាប',short:'សៀមរាប',background:'#66352c',accent:'#087c80',gold:'#ffce79',water:'#33b3b5',motif:'lotus',name:{vi:'Lễ hội đua thuyền Siem Reap',km:'ពិធីបុណ្យអុំទូក · សៀមរាប',en:'Siem Reap Water Festival'}},
});
export const venueIdentity=(id='maspero')=>VENUE_IDENTITY[id]||VENUE_IDENTITY.maspero;
