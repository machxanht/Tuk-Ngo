import fs from 'node:fs';
import {RACE_TEAMS_2025} from '../src/race/teams.mjs';

// Author new vector paint from observed 2025 on-land video. No downloaded
// video/photo pixels become game textures. Exact hidden brushwork is unknown.
// Sources and identity limits: the appearance and hull-binding follow-up docs.
const folder='public/assets/ghe-ngo/teams-2025';fs.mkdirSync(folder,{recursive:true});
const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const path=(d,fill,stroke='#162218',width=2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
function scroll(x,y,s,fill,accent){return `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 84 C30 48 68 24 108 38 C142 50 146 82 120 94 C92 108 76 78 93 69 C89 87 111 89 116 77 C124 58 97 47 80 57 C51 74 27 112 0 115 Z',fill,'#132b1e',2.8)}${path('M45 84 C69 61 81 29 73 5 C96 20 100 38 87 60 C72 78 58 83 45 84 Z',fill)}${path('M118 99 C136 59 160 45 183 50 C169 72 175 88 194 100 C165 115 142 110 118 99 Z',fill)}${path('M7 111 Q43 78 69 68 M82 49 Q130 36 130 76', 'none',accent,3)}</g>`;}
function scales(x,y,fill,accent,flame=false){let s='';for(let r=0;r<3;r++)for(let n=0;n<50;n++){const a=x+n*83+(r%2)*41,b=y+r*65;s+=path(`M${a} ${b} Q${a+41} ${b-54} ${a+83} ${b} Q${a+65} ${b+56} ${a+41} ${b+61} Q${a+15} ${b+50} ${a} ${b} Z`,fill,'#173b28',5)+path(`M${a+16} ${b-3} Q${a+42} ${b-26} ${a+67} ${b-3}`,'none',accent,5);}if(flame)for(let n=0;n<44;n++)s+=path(`M${n*96} 143 Q${n*96+15} 98 ${n*96+62} 91 Q${n*96+35} 135 ${n*96+86} 132 L${n*96+96} 160 Z`,'#edc526','#db6737',4);return s;}
function rosette(x,y){return `<g transform="translate(${x} ${y})">${[0,90,180,270].map(a=>`<g transform="rotate(${a})">${path('M0 -8 C-26 -6 -29 -27 -15 -44 C-2 -59 5 -32 21 -23 C21 -6 5 -1 0 -8 Z','#ed7829','#f5c74a',2)}</g>`).join('')}<circle r="17" fill="#f8c739" stroke="#a94b19" stroke-width="4"/><circle r="8" fill="#cf4923"/></g>`;}
function lotus(x,y){return `<g transform="translate(${x} ${y})">${path('M0 45 Q15 8 52 0 Q90 8 107 45 Q88 71 52 73 Q18 70 0 45 Z','#d52c37','#edc846',5)}${path('M18 43 Q18 23 44 23 Q32 10 52 2 Q72 10 60 24 Q85 20 89 44 Q70 39 52 56 Q37 39 18 43 Z','#f8bc40','#9d3830',2)}</g>`;}
function animal(x,y,mirror=false){return `<g transform="translate(${x} ${y}) scale(${mirror?-1:1} 1)">${path('M0 140 C40 134 37 88 70 74 C101 51 153 95 209 84 Q228 39 248 35 Q248 68 237 93 Q267 89 270 62 C292 35 300 90 281 105 Q259 121 231 115 Q247 136 268 145 L255 153 Q214 136 206 117 L126 114 Q112 131 108 163 L84 170 Q76 137 90 108 Q57 83 30 135 Z','#dd5392','#efca45',6)}${path('M91 91 C63 88 76 53 93 40 L78 22 L106 25 Q118 20 133 35 L139 57 L124 83 Z','#ec9b33','#efd450',4)}${path('M97 54 Q107 48 123 54 L117 66 L102 64 Z','#fff2be','#65214a',2)}<circle cx="119" cy="50" r="4" fill="#152837"/>${path('M121 69 Q151 49 182 49 Q157 70 137 80','#f1d184','#7b2867',3)}${path('M81 130 Q112 98 159 99 M115 157 L135 152 M217 120 L229 148','none','#f9d646',4)}</g>`;}
// Hull UVs span 30.2m horizontally but less than a metre down the middle.
// Compress the authored leaf locally so it reads as a leaf on that surface.
const narrowScroll=(x,y,fill,accent,vertical=1)=>`<g transform="translate(${x} ${y}) scale(.32 ${vertical})">${scroll(0,0,1,fill,accent)}</g>`;
function naga(){
 let upper=[],lower=[];
 for(let x=420;x<=4210;x+=20){const y=236+Math.sin((x-420)/270)*49;upper.push([x,y-99]);lower.push([x,y+103]);}
 const outline='M'+upper.map(p=>p.join(' ')).join(' L')+' L'+lower.reverse().map(p=>p.join(' ')).join(' L')+' Z';
 let s=`<defs><clipPath id="naga-body">${path(outline,'white','none')}</clipPath></defs>`+path(outline,'#228d43','#133926',7);
 let scales='';for(let r=0;r<7;r++)for(let n=0;n<155;n++){const x=400+n*25+(r%2)*12.5,y=80+r*43;scales+=path(`M${x} ${y} Q${x+12.5} ${y-20} ${x+25} ${y} Q${x+23} ${y+29} ${x+12.5} ${y+37} Q${x+2} ${y+29} ${x} ${y} Z`,'#4eaa39','#152b27',3.2)+path(`M${x+5} ${y+4} Q${x+12.5} ${y-5} ${x+21} ${y+4}`,'none','#77ba40',1.6);}
 s+=`<g clip-path="url(#naga-body)">${scales}</g>`;
 // Finished September side: yellow curled crest and a segmented pink belly
 // border. These details recur on the October river hull; numbered identity
 // is still resolved from the race17 footage rather than a spare's old bib12.
 for(let n=0;n<122;n++){const x=420+n*31,y=137+Math.sin((x-420)/270)*49;s+=path(`M${x-6} ${y+8} Q${x+9} ${y-15} ${x+3} ${y-40} Q${x+22} ${y-21} ${x+20} ${y-4} Q${x+36} ${y+1} ${x+28} ${y+11} Q${x+13} ${y+3} ${x-6} ${y+8} Z`,'#d5d931','#193729',2.3)+path(`M${x+9} ${y-25} Q${x+19} ${y-2} ${x+25} ${y+3}`,'none','#4f721e',1.4);}
 for(let n=0;n<168;n++){const x=420+n*23,y=339+Math.sin((x-420)/270)*49,next=339+Math.sin((x+23-420)/270)*49;s+=path(`M${x} ${y-9} Q${x+11} ${y-12} ${x+23} ${next-9} L${x+22} ${next+10} Q${x+11} ${y+9} ${x+1} ${y+10} Z`,'#df79a7','#382939',2.5);}
 for(let n=0;n<5;n++)s+=narrowScroll(235+n*39,101,'#73b645','#dae164',1.18);
 s+=path('M283 139 Q263 86 230 113 Q190 127 173 197 L123 213 L108 255 L140 278 L116 317 Q149 373 215 326 Q246 331 284 312 Z','#bf3929','#e2be56',5);
 s+=path('M137 220 Q176 178 224 204 L230 240 Q180 231 139 257 Z','#e6c668','#211e24',4)+path('M131 283 Q168 263 219 276 Q199 326 148 315 Z','#311927','#e9ca83',4)+path('M155 283 L164 307 L173 279 L185 303 L194 280','#f3e9c4','#3b2526',2)+`<ellipse cx="219" cy="174" rx="18" ry="24" fill="#f8e8a7" stroke="#211e24" stroke-width="4"/><ellipse cx="215" cy="174" rx="7" ry="14" fill="#171b23"/>`;
 return s;
}
function flameFlower(x,y,large=false){
 const scale=large?1:.62;let s='';
 for(const angle of [0,60,120,180,240,300])s+=`<g transform="rotate(${angle})">${path('M-10 -8 Q-37 -36 -27 -87 Q-16 -66 0 -91 Q6 -55 30 -48 Q24 -19 10 -8 Z','#e87577','#422b32',2)}${path('M-27 -70 Q-28 -31 -10 -17 Q-17 -47 -3 -70 Q8 -37 24 -36 Q23 -19 10 -8 Q16 -25 8 -41 Q-4 -29 -4 -18 Q-18 -33 -27 -70 Z','#edc666','#b57638',1.2)}${path('M-5 -19 Q-18 -49 -14 -72','none','#fff0a9',2)}</g>`;
 s+=`<ellipse cy="0" rx="20" ry="28" fill="#36c2cb" stroke="#255c78" stroke-width="4"/><ellipse cx="-5" cy="-5" rx="7" ry="17" fill="#68decf"/>`;
 return `<g transform="translate(${x} ${y}) scale(${.30*scale} ${scale})">${s}</g>`;
}
function cyanWing(x,mirror=false){let s=path('M0 178 Q58 84 150 161 Q238 235 359 103 Q347 255 256 299 Q136 342 0 178 Z','#19bfd3','#29203d',5);for(let i=0;i<12;i++){const a=40+i*22;s+=path(`M${a} ${185+i%3*12} Q${170+i*9} ${230+i*3} ${320-i*6} ${139+i*9}`,'none',i%2?'#155996':'#7adddc',4);}s+=path('M13 173 Q36 134 59 169 Q67 192 49 205 L8 207 Z','#edb645','#723135',4);return `<g transform="translate(${x} 65) scale(${mirror?-.52:.52} 1)">${s}</g>`;}

for(const t of RACE_TEAMS_2025){
 let svg='',base='#142b36';
 if(t.pattern==='tum-naga'){
  base='#183957';svg+=naga();
 }else if(t.pattern==='prek-scroll'){
  base='#17232f';for(let n=-1;n<27;n++){svg+=scroll(n*169,94,1.13,'#ed852c','#f4d269');svg+=scroll(n*169+45,325,.69,'#b73232','#eedc68');}
  for(const x of [530,1820,3150])svg+=path(`M${x} 36 L${x+260} 36 L${x+72} 460 L${x-150} 460 Z`,'#daeb87','#288f51',17)+path(`M${x+74} 36 L${x+134} 36 L${x-68} 460 L${x-128} 460 Z`,'#f7f0de','#edc932',6);
 }else if(t.pattern==='tra-cuon-scale'){
  base='#166f9c';svg+=scales(0,168,'#3a973a','#b4bd37',true);
  svg+=rect(0,372,4096,12,'#dd797f');
 }else if(t.pattern==='tra-tim-flowers'){
  // fneO2kuutM0 at200s supplies an unobstructed finished flower-band side.
  // Keep it separate from the nearby diagonal/Phoenix boats in the same video.
  base='#822434';svg+=rect(0,35,4096,221,'#125c35');
  for(let n=-1;n<43;n++){const x=n*98;svg+=flameFlower(x+23,144,true)+flameFlower(x+72,144,false);svg+=path(`M${x+15} 292 Q${x+20} 324 ${x+40} 312 Q${x+46} 294 ${x+59} 284 Q${x+57} 324 ${x+38} 343 Q${x+26} 364 ${x+7} 407 Q${x+10} 357 ${x+27} 337 Q${x+11} 343 ${x+15} 292 Z`,'#e7cc62','#75402b',2.2)+path(`M${x+20} 381 Q${x+30} 340 ${x+50} 314`,'none','#fff09a',2);}
  svg+=rect(0,25,4096,11,'#c3ef4c')+rect(0,254,4096,14,'#bbed46');
 }else if(t.pattern==='om-scroll'){
  base='#14211c';for(let n=-1;n<65;n++){svg+=narrowScroll(n*64,48,'#9fe431','#e6d742',1.28);svg+=`<g transform="translate(${n*64+25} 348) scale(1 -1)">${narrowScroll(0,0,'#61bd37','#d3df42',.85)}</g>`;}
  for(const x of [490,3430])svg+=path(`M${x} 27 L${x+94} 27 L${x-40} 512 L${x-134} 512 Z`,'#df4c32','#dbd95b',6)+path(`M${x+38} 27 L${x+57} 27 L${x-77} 512 L${x-96} 512 Z`,'#207b52','#d1e66a',3);
  svg+=rect(0,29,365,483,'#dc4c31')+rect(3750,29,346,483,'#dc4c31')+cyanWing(82)+cyanWing(4005,true);
  for(let n=0;n<6;n++)svg+=narrowScroll(n*58,31,'#b9e24a','#f0cd44',.55)+narrowScroll(3750+n*58,31,'#b9e24a','#f0cd44',.55);
  // The real central red panel is visible, but its lettering is not legible.
  // Leave the name area untranscribed instead of inventing a pagoda spelling.
  svg+=rect(1770,55,310,166,'#c62e32');
 }else if(t.pattern==='kos-scroll'){
  base='#141f29';for(let n=0;n<45;n++){const x=n*92;svg+=narrowScroll(x,62,'#ed9636','#f7d852',.8)+`<g transform="translate(${x+26} 146) scale(.29 .77)">${rosette(0,0)}</g>`+path(`M${x+71} 79 L${x+92} 150 L${x+71} 214 L${x+51} 150 Z`,'#63ce47','#eddd70',3)+path(`M${x+71} 106 L${x+84} 150 L${x+71} 190 L${x+59} 150 Z`,'none','#177548',3)+narrowScroll(x+15,268,'#8bc844','#dce777',.58);}
  svg+=rect(0,233,4096,7,'#e4c455');
  // Race49 shows the green/gold diagonal bow field and a dark name inset.
  svg+=path('M0 29 L385 29 L225 420 L0 420 Z','#3eab46','#d6d653',7);
  for(let n=0;n<6;n++)svg+=narrowScroll(n*60,68,'#ef922e','#f1d069',1.06);
  svg+=rect(496,92,220,80,'#242037');
 }else if(t.pattern==='satharam-red'){
  base='#b8262b';svg+=rect(0,37,4096,75,'#7f2332')+rect(0,110,4096,11,'#e7cc32');
  // Repeated golden curling upper/lower units are visible in the new
  // ceremony close-up. They are ornament, not a transcription of blurred text.
  for(let n=-1;n<86;n++){const x=n*49;svg+=path(`M${x} 97 L${x} 51 Q${x+19} 30 ${x+33} 44 L${x+31} 73 Q${x+16} 69 ${x+11} 92 L${x+9} 105 Z`,'#e9c838','#382226',3);}
  svg+=rect(0,310,4096,10,'#e4c733')+rect(0,321,4096,69,'#81202a')+rect(0,390,4096,10,'#e4c733');
  for(let n=-1;n<86;n++){const x=n*49;svg+=path(`M${x} 382 Q${x+8} 328 ${x+30} 334 Q${x+44} 338 ${x+34} 359 Q${x+27} 374 ${x+17} 360 Q${x+24} 363 ${x+28} 354 Q${x+30} 341 ${x+21} 348 Q${x+10} 356 ${x+8} 382 Z`,'#e8c637','#421e26',2);}
 }else if(t.pattern==='khsach-animal'){
  base='#1a3145';for(let n=-1;n<26;n++)svg+=scroll(n*163,52,1.1,'#e77c30','#f5cc37');
  for(let n=0;n<7;n++)svg+=animal(530+n*510,68,n%2===1);
  svg+=rect(0,418,4096,14,'#226ead')+rect(0,438,4096,9,'#e34083');
 }
 const rail=t.pattern==='satharam-red'?'#a6232e':t.pattern==='tra-tim-flowers'?'#b5df42':'#cc3940';
 svg=rect(0,0,4096,512,base)+svg+rect(0,0,4096,23,rail)+rect(0,24,4096,5,'#efc751');
 const text=`<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="512" viewBox="0 0 4096 512"><title>${t.name} · authored 2025 visible paint reconstruction</title>${svg}</svg>`;
 fs.writeFileSync(`${folder}/${t.id}.svg`,text);
}
console.log(`Authored ${RACE_TEAMS_2025.length} source-specific SVG liveries; unresolved details are recorded in the catalogue.`);

// Additional finished hulls are texture studies, kept out of the numbered
// race roster until their kit/physical identity is established.
const studiesFolder='public/assets/ghe-ngo/kbach-studies';fs.mkdirSync(studiesFolder,{recursive:true});
let khleang=rect(0,0,4096,512,'#171e22');
for(let n=-1;n<46;n++){
 const x=n*92;khleang+=`<g transform="translate(${x+30} 146) scale(.31 1)">${[0,90,180,270].map(angle=>`<g transform="rotate(${angle})">${path('M-8 -7 Q-43 -31 -27 -82 Q-14 -65 0 -102 Q8 -69 30 -64 Q43 -25 8 -7 Z','#eac936','#98672f',2.5)}${path('M0 -85 Q-13 -57 -7 -22 Q8 -48 18 -58 Q10 -26 8 -7 L0 -3 L-12 -15 Q-28 -42 -21 -66','#e59d2b','#b57b2d',1)}</g>`).join('')}<path d="M-10 -26 L10 -26 L10 26 L-10 26 Z" fill="#f4dc58" stroke="#a8712b" stroke-width="3"/></g>`;
 khleang+=path(`M${x+13} 290 Q${x+8} 329 ${x+2} 387 Q${x+16} 401 ${x+35} 371 Q${x+49} 332 ${x+26} 345 Q${x+43} 351 ${x+26} 374 Q${x+13} 385 ${x+13} 364 L${x+28} 290 Z`,'#edcb38','#a77631',2.2);
}
khleang+=rect(0,0,4096,24,'#e2c632')+rect(0,257,4096,12,'#dfc731');
let diagonal=rect(0,0,4096,512,'#852e37');
for(let n=-1;n<66;n++){diagonal+=narrowScroll(n*64,65,'#dcb85b','#fff0a0',1.5);diagonal+=narrowScroll(n*64+24,305,'#d5953e','#eace70',.75);}
for(const x of [210,1170,2230,3240]){
 diagonal+=path(`M${x} 27 L${x+94} 27 L${x+255} 470 L${x+161} 470 Z`,'#5cbd84','#e1cc79',5);
 for(let n=0;n<18;n++)diagonal+=`<circle cx="${x+18+n*10}" cy="${45+n*24}" r="5" fill="#eac578"/>`;
 diagonal+=path(`M${x+118} 28 L${x+208} 28 L${x+369} 473 L${x+279} 473 Z`,'#cf6b99','#f4becc',4)+path(`M${x+208} 28 L${x+249} 28 L${x+410} 473 L${x+369} 473 Z`,'#263d70','#d7dfd5',3);
}
diagonal+=rect(0,0,4096,23,'#8b3340')+rect(0,26,4096,6,'#a5e0c2');
const studies=[{id:'khleang-gold-2025',name:'Khleang · hoa vàng trên nền đen',year:2025,svg:khleang,source:'https://www.youtube.com/watch?v=f7ZVm1-x5Wo&t=300s',time:300,status:'Hoa văn đã vẽ xong; đang phủ bóng.'},{id:'tra-tim-diagonal-2025',name:'Trà Tim · cuộn vàng và dải chéo',year:2025,svg:diagonal,source:'https://www.youtube.com/watch?v=fneO2kuutM0&t=650s',time:650,status:'Ghe trong nhà ghe; chưa xác nhận là ghe số 08 thi đấu.'}];
for(const s of studies)fs.writeFileSync(`${studiesFolder}/${s.id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="512" viewBox="0 0 4096 512"><title>${s.name} · finished video study · ${s.year}</title>${s.svg}</svg>`);
fs.writeFileSync(`${studiesFolder}/manifest.json`,JSON.stringify({channel:'https://www.youtube.com/@mrchanhung72',reviewed:'2026-10-12',studies:studies.map(({svg,...s})=>({...s,file:s.id+'.svg',raceRoster:false}))},null,2)+'\n');
const sources={
 'tum-nup-2':['https://www.youtube.com/watch?v=uG4E4LHORIE&t=250s','Rồng xanh · mào vàng · bụng hồng; ghe trên bờ chưa ghép chắc với số 17.'],
 'chroi-tum-chas':['https://www.youtube.com/watch?v=fneO2kuutM0&t=200s','Hoa hồng/vàng · tâm xanh · dải lá vàng; mẫu hoa riêng trong nhà ghe.'],
 'prek-on-dok-2':['https://www.youtube.com/watch?v=qT1jWHE3YpY&t=80s','Cuộn cam/vàng · dải chéo; bổ sung góc quay trên Maspéro.'],
 'prek-ta-cuol':['https://www.youtube.com/watch?v=sfENfcv6K8M&t=250s','Vảy xanh · nền xanh lam; giữ nguồn đã vẽ xong năm 2025.'],
 'om-pou-year':['https://www.youtube.com/watch?v=_UmcujLuEMg&t=180s','Lá xanh trên nền đen · đầu đỏ/xanh; ghép ghe số 23 còn chưa chắc.'],
 'kos-thum-1':['https://www.youtube.com/watch?v=itFNM66tvL0&t=45s','Hoa cam xen hình thoi xanh; đã đối chiếu ghe số 49.'],
 'pothi-satharam-2':['https://www.youtube.com/watch?v=8GN4hkDfqHY&t=300s','Nền đỏ · dải cuộn vàng; ghép ghe số 07 còn chưa chắc.'],
 'pothi-khsach':['https://www.youtube.com/watch?v=waFNI0MzD7s&t=100s','Nguồn hạ thủy ghi rõ Pô Thi Khsách; giữ hoa văn 2025 đã quan sát.'],
};
const cards=RACE_TEAMS_2025.map(t=>{const [source,note]=sources[t.id];return `<article><h2>${t.name} · ${t.number}</h2><img src="../teams-2025/${t.id}.svg?v=15" alt="Hoa văn ${t.name}"/><p>${note}</p><nav><a href="${source}">Clip tham khảo</a><a href="../teams-2025/${t.id}.svg?v=15" download="${t.id}-kbach-2025.svg">Tải kbach</a><a href="../teams-2025/${t.id}-2025.glb?v=21" download>GLB đội</a></nav></article>`;}).join('');
const studyCards=studies.map(s=>`<article><h2>${s.name}</h2><img src="${s.id}.svg" alt="${s.name}"/><p>${s.status} Bản vẽ nghiên cứu riêng, chưa đưa vào đội hình đua.</p><nav><a href="${s.source}">Clip tham khảo</a><a href="${s.id}.svg" download>Tải kbach</a></nav></article>`).join('');
fs.writeFileSync(`${studiesFolder}/index.html`,`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kbach từng ghe · Tuk Ngo</title><style>body{margin:0;background:#eff6f3;color:#173a31;font:16px system-ui;line-height:1.55}main{max-width:1100px;margin:auto;padding:24px}h1{font-size:clamp(27px,5vw,40px)}article{background:white;border:1px solid #ccdcd5;border-radius:12px;padding:18px;margin:18px 0}h2{font-size:20px;margin:0 0 14px}img{display:block;width:100%;background:#d6e1db;border-radius:5px}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#136754}nav a{padding:7px 11px;background:#e9f3ee;border-radius:6px}p{margin:12px 0}</style><main><a href="../../../?demo=studio">← Xem ghe trên sông</a><h1>Kbach từng ghe</h1><p>Vẽ lại từ những phần nhìn rõ trong clip thật. Mỗi mẫu có nguồn riêng để đối chiếu. Các dải bên dưới là bản hoa văn trải phẳng; khi gắn lên mạn ghe, tỉ lệ thay đổi theo dáng ghe.</p><p><a href="https://www.youtube.com/@mrchanhung72">Kênh Trường Dương bạn cung cấp</a> bổ sung góc cận trên bờ. Những đội chưa có góc hoàn thiện phù hợp trong kênh này giữ nguồn năm 2025 đã kiểm tra trước đó. Hoa văn khuất và việc ghép một số ghe với số thi đấu vẫn chưa xác minh đủ.</p>${cards}<h1>Mẫu ghe khác đã vẽ xong</h1>${studyCards}</main></html>`);
console.log(`Authored ${studies.length} separate finished-paint studies and a source-linked kbach gallery.`);
