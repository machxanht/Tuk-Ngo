import fs from 'node:fs';
import {RACE_TEAMS_2025} from '../src/race/teams-2025.mjs';

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
 let center=[],upper=[],lower=[];
 for(let x=270;x<=4210;x+=20){const y=228+Math.sin((x-270)/280)*47;center.push([x,y]);upper.push([x,y-86]);lower.push([x,y+99]);}
 const outline='M'+upper.map(p=>p.join(' ')).join(' L')+' L'+lower.reverse().map(p=>p.join(' ')).join(' L')+' Z';
 let s=`<defs><clipPath id="naga-body">${path(outline,'white','none')}</clipPath></defs>`+path(outline,'#228d43','#133926',7);
 let scales='';for(let r=0;r<6;r++)for(let n=0;n<122;n++){const x=267+n*33+(r%2)*16,y=90+r*43;scales+=path(`M${x} ${y} Q${x+16} ${y-22} ${x+33} ${y} Q${x+29} ${y+34} ${x+16} ${y+39} Q${x+3} ${y+29} ${x} ${y} Z`,'#49af46','#154c32',3)+path(`M${x+6} ${y+3} Q${x+16} ${y-7} ${x+27} ${y+3}`,'none','#8ac64a',2);}
 s+=`<g clip-path="url(#naga-body)">${scales}</g>`;
 for(let n=0;n<81;n++){const x=282+n*48,y=142+Math.sin((x-270)/280)*47;s+=path(`M${x-13} ${y+10} Q${x+7} ${y-35} ${x+24} ${y-48} Q${x+10} ${y-11} ${x+31} ${y+7} Z`,'#ecdc95','#314326',3);}
 s+=path('M283 139 Q263 86 230 113 Q190 127 173 197 L123 213 L108 255 L140 278 L116 317 Q149 373 215 326 Q246 331 284 312 Z','#bf3929','#e2be56',5);
 s+=path('M137 220 Q176 178 224 204 L230 240 Q180 231 139 257 Z','#e6c668','#211e24',4)+path('M131 283 Q168 263 219 276 Q199 326 148 315 Z','#311927','#e9ca83',4)+path('M155 283 L164 307 L173 279 L185 303 L194 280','#f3e9c4','#3b2526',2)+`<ellipse cx="219" cy="174" rx="18" ry="24" fill="#f8e8a7" stroke="#211e24" stroke-width="4"/><ellipse cx="215" cy="174" rx="7" ry="14" fill="#171b23"/>`;
 return s;
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
  // Use the hull actually carried at launch (800s), rather than assigning
  // the ornate blue spare still sitting in the shelter (250s) to boat 08.
  base='#bf2934';svg+=rect(0,58,4096,192,'#24773d');
  for(let n=-1;n<25;n++){const x=n*174;svg+=rosette(x+55,155);svg+=path(`M${x+112} 90 Q${x+140} 85 ${x+157} 103 L${x+181} 103 L${x+192} 129 Q${x+222} 149 ${x+192} 170 L${x+181} 196 L${x+157} 196 Q${x+140} 215 ${x+112} 204 L${x+94} 183 L${x+81} 161 L${x+81} 135 Z`,'#ebbf35','#d55225',4)+`<ellipse cx="${x+145}" cy="149" rx="38" ry="17" fill="#1ebce1" stroke="#1d5d9a" stroke-width="5"/><ellipse cx="${x+145}" cy="149" rx="23" ry="5" fill="#d8e145"/>`;svg+=path(`M${x+62} 284 Q${x+105} 330 ${x+133} 399 Q${x+93} 381 ${x+85} 358 Q${x+88} 324 ${x+62} 284 Z`,'#efc33d','#98432a',2);}
  svg+=rect(0,45,4096,13,'#e9d136')+rect(0,248,4096,10,'#e5c930');
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
 const rail=t.pattern==='satharam-red'?'#a6232e':'#cc3940';
 svg=rect(0,0,4096,512,base)+svg+rect(0,0,4096,23,rail)+rect(0,24,4096,5,'#efc751');
 const text=`<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="512" viewBox="0 0 4096 512"><title>${t.name} · authored 2025 visible paint reconstruction</title>${svg}</svg>`;
 fs.writeFileSync(`${folder}/${t.id}.svg`,text);
}
console.log(`Authored ${RACE_TEAMS_2025.length} source-specific SVG liveries; unresolved details are recorded in the catalogue.`);
