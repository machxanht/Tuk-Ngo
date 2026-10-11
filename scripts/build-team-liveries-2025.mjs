import fs from 'node:fs';
import {RACE_TEAMS_2025} from '../src/race/teams-2025.mjs';

// Author new vector paint from observed 2025 on-land video. No downloaded
// video/photo pixels become game textures. Exact hidden brushwork is unknown.
// Source/timestamp and identity limits: docs/top-eight-2025-appearance.md.
const folder='public/assets/ghe-ngo/teams-2025';fs.mkdirSync(folder,{recursive:true});
const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const path=(d,fill,stroke='#162218',width=2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
function scroll(x,y,s,fill,accent){return `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 84 C30 48 68 24 108 38 C142 50 146 82 120 94 C92 108 76 78 93 69 C89 87 111 89 116 77 C124 58 97 47 80 57 C51 74 27 112 0 115 Z',fill,'#132b1e',2.8)}${path('M45 84 C69 61 81 29 73 5 C96 20 100 38 87 60 C72 78 58 83 45 84 Z',fill)}${path('M118 99 C136 59 160 45 183 50 C169 72 175 88 194 100 C165 115 142 110 118 99 Z',fill)}${path('M7 111 Q43 78 69 68 M82 49 Q130 36 130 76', 'none',accent,3)}</g>`;}
function scales(x,y,fill,accent,flame=false){let s='';for(let r=0;r<3;r++)for(let n=0;n<50;n++){const a=x+n*83+(r%2)*41,b=y+r*65;s+=path(`M${a} ${b} Q${a+41} ${b-54} ${a+83} ${b} Q${a+65} ${b+56} ${a+41} ${b+61} Q${a+15} ${b+50} ${a} ${b} Z`,fill,'#173b28',5)+path(`M${a+16} ${b-3} Q${a+42} ${b-26} ${a+67} ${b-3}`,'none',accent,5);}if(flame)for(let n=0;n<44;n++)s+=path(`M${n*96} 143 Q${n*96+15} 98 ${n*96+62} 91 Q${n*96+35} 135 ${n*96+86} 132 L${n*96+96} 160 Z`,'#edc526','#db6737',4);return s;}
function rosette(x,y){return `<g transform="translate(${x} ${y})">${[0,90,180,270].map(a=>`<g transform="rotate(${a})">${path('M0 -8 C-26 -6 -29 -27 -15 -44 C-2 -59 5 -32 21 -23 C21 -6 5 -1 0 -8 Z','#ed7829','#f5c74a',2)}</g>`).join('')}<circle r="17" fill="#f8c739" stroke="#a94b19" stroke-width="4"/><circle r="8" fill="#cf4923"/></g>`;}
function lotus(x,y){return `<g transform="translate(${x} ${y})">${path('M0 45 Q15 8 52 0 Q90 8 107 45 Q88 71 52 73 Q18 70 0 45 Z','#d52c37','#edc846',5)}${path('M18 43 Q18 23 44 23 Q32 10 52 2 Q72 10 60 24 Q85 20 89 44 Q70 39 52 56 Q37 39 18 43 Z','#f8bc40','#9d3830',2)}</g>`;}
function animal(x,y,mirror=false){return `<g transform="translate(${x} ${y}) scale(${mirror?-1:1} 1)">${path('M0 140 C40 134 37 88 70 74 C101 51 153 95 209 84 Q228 39 248 35 Q248 68 237 93 Q267 89 270 62 C292 35 300 90 281 105 Q259 121 231 115 Q247 136 268 145 L255 153 Q214 136 206 117 L126 114 Q112 131 108 163 L84 170 Q76 137 90 108 Q57 83 30 135 Z','#dd5392','#efca45',6)}${path('M91 91 C63 88 76 53 93 40 L78 22 L106 25 Q118 20 133 35 L139 57 L124 83 Z','#ec9b33','#efd450',4)}${path('M97 54 Q107 48 123 54 L117 66 L102 64 Z','#fff2be','#65214a',2)}<circle cx="119" cy="50" r="4" fill="#152837"/>${path('M121 69 Q151 49 182 49 Q157 70 137 80','#f1d184','#7b2867',3)}${path('M81 130 Q112 98 159 99 M115 157 L135 152 M217 120 L229 148','none','#f9d646',4)}</g>`;}

for(const t of RACE_TEAMS_2025){
 let svg='',base='#142b36';
 if(t.pattern==='tum-scroll'){
  base='#10211a';for(let n=-1;n<28;n++){svg+=scroll(n*156,70,1.02,'#6fdb47','#e8ef8b');svg+=`<g transform="translate(${n*156+78} 310) scale(1 -1)">${scroll(0,0,.64,'#28a844','#b5e363')}</g>`;}
  svg+=path('M0 321 Q1000 266 2048 315 T4096 305','none','#bcdd58',8);
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
  base='#e26826';for(let n=-1;n<29;n++)svg+=scroll(n*147,83,1.02,'#a7e32b','#f7c63c')+scroll(n*147+54,297,.63,'#dc302c','#ece047');
 }else if(t.pattern==='kos-scroll'){
  base='#121b23';for(let n=0;n<24;n++){const x=n*177;svg+=scroll(x,143,.64,'#ef9934','#f7d852')+rosette(x+90,203)+path(`M${x+169} 128 L${x+207} 201 L${x+169} 268 L${x+130} 201 Z`,'#66c148','#f1e67a',4)+path(`M${x+169} 152 L${x+193} 200 L${x+169} 244 L${x+146} 200 Z`,'none','#136c46',4);svg+=scroll(x+35,330,.48,'#97c648','#e2e976');}
 }else if(t.pattern==='satharam-red'){
  // Final footage establishes red and the pale Khmer name band. Do not add
  // an invented lower frieze concealed by the carriers/in the race water.
  base='#b8262b';svg+=rect(0,52,4096,62,'#f0d351');
  svg+=`<text x="2048" y="102" font-family="'Noto Sans Khmer',sans-serif" font-size="45" font-weight="700" text-anchor="middle" fill="#8f2337">ពោធិសត្ថារាម</text>`;
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
