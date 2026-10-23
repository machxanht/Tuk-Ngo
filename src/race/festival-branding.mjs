import {FESTIVAL_WORDMARK} from './festival-wordmark.mjs';

export const FESTIVAL={titleVi:'Lễ hội đua ghe Ngo',titleKm:'ពិធីបុណ្យអុំទូក',year:'2026',yearKm:'២០២៦',provinceVi:'Tỉnh Sóc Trăng',provinceKm:'ខេត្តឃ្លាំង'};
export const FESTIVAL_BRANDS=['Kuon Khmer','Angkor Soul'];
export const FESTIVAL_PALETTE={red:'#e50935',deepRed:'#a21835',gold:'#f5b51b',deepGold:'#cc830d',white:'#fffdf1',teal:'#087d79',jade:'#00563c',blue:'#009bdf',coral:'#ef644b'};

// One path collection drives both the external SVG and the in-world artwork.
// Outlined Khmer is shaped once at authoring time, never by a tablet's fonts.
export const FESTIVAL_MARK={
 boat:'M99 187C139 260 218 312 299 332C327 340 334 359 326 384C279 387 205 351 166 307C133 269 111 222 99 187Z',
 echo:'M1101 187C1061 260 982 312 901 332C873 340 866 359 874 384C921 387 995 351 1034 307C1067 269 1089 222 1101 187Z',
 water:'M130 419C220 371 264 437 352 412S489 393 572 419S708 440 793 413S950 382 1070 415C955 396 914 459 800 437S672 430 588 447S440 425 354 439S220 404 130 419Z'
};
const c=FESTIVAL_PALETTE,art=[];
const path=(d,fill,transform,stroke,width)=>art.push({d,fill,transform,stroke,width});
path('M526 196a92 92 0 1 1 184 0a92 92 0 1 1-184 0Z',c.gold);
path('M504 206Q541 200 573 207L600 213H503ZM650 169Q679 162 706 170L731 177H650Z',c.white);
path(FESTIVAL_MARK.boat,c.jade);path(FESTIVAL_MARK.echo,c.jade);
path('M106 201C142 281 212 339 301 362C233 330 160 261 106 201ZM1094 201C1058 281 988 339 899 362C967 330 1040 261 1094 201Z',c.gold);
path('M102 182C81 176 86 146 105 120C102 144 124 147 125 165C127 175 114 182 102 182ZM1098 182C1119 176 1114 146 1095 120C1098 144 1076 147 1075 165C1073 175 1086 182 1098 182Z',c.gold);
path('M104 164Q112 170 102 177Q94 177 96 168ZM1096 164Q1088 170 1098 177Q1106 177 1104 168Z',c.deepGold);
path('M99 181C83 211 80 224 49 241C29 254 35 280 25 295C30 250 15 227 51 212C72 203 85 191 91 179Z M1101 181C1117 211 1120 224 1151 241C1171 254 1165 280 1175 295C1170 250 1185 227 1149 212C1128 203 1115 191 1109 179Z',c.red);
const scale=650/FESTIVAL_WORDMARK.width;
path(FESTIVAL_WORDMARK.path,c.jade,[scale,0,0,scale,275,280]);
// A single rower and a short paddle connect the sun to the wordmark.
path('M589 220a20 20 0 1 1 40 0a20 20 0 1 1-40 0Z',c.gold,[1,0,0,1,0,-15],c.white,10);
path('M586 251Q598 238 611 249L633 260L653 246Q661 243 665 251Q668 258 661 262L636 277Q629 280 622 276L611 270L611 291H581Z',c.jade,[1,0,0,1,0,-15],c.white,10);
path('M640 218Q637 212 643 210Q650 209 652 216L696 321Q709 332 705 343Q699 353 691 347Q681 340 683 326Z',c.gold,[1,0,0,1,0,-15],c.white,7);
path(FESTIVAL_MARK.water,c.blue,[1,0,0,1,0,80]);
path('M191 454C281 425 323 480 427 451S548 446 623 463S733 473 816 451S939 443 1010 454C928 451 889 489 799 478S689 476 615 487S498 461 430 476S289 452 191 454Z',c.blue,[1,0,0,1,0,80]);
path('M350 490C418 478 455 504 526 493S633 486 694 499S802 500 860 490C804 514 749 531 676 515S582 519 518 515S419 499 350 490Z',c.blue,[1,0,0,1,0,80]);
path('M397 413Q445 391 498 408Q450 405 427 419Z',c.gold,[1,0,0,1,0,80]);

function shapeSvg(s){const transform=s.transform?` transform="matrix(${s.transform.join(' ')})"`:'';return `<path d="${s.d}" fill="${s.fill}"${transform}${s.stroke?` stroke="${s.stroke}" stroke-width="${s.width}" stroke-linejoin="round"`:''}/>`;}
export function festivalLogoSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="540" viewBox="0 100 1200 540" role="img" aria-labelledby="title"><title id="title">${FESTIVAL.titleVi} · ${FESTIVAL.titleKm} · ${FESTIVAL.yearKm}</title>${art.map(shapeSvg).join('')}</svg>`;}
let canvasPaths;
export function paintFestivalMark(p,x,y,width,height){
 canvasPaths??=art.map(s=>new Path2D(s.d));
 const scale=Math.min(width/1200,height/540);
 p.save();p.translate(x+(width-1200*scale)/2,y+(height-540*scale)/2-100*scale);p.scale(scale,scale);
 art.forEach((s,i)=>{p.save();if(s.transform)p.transform(...s.transform);p.fillStyle=s.fill;p.fill(canvasPaths[i]);if(s.stroke){p.strokeStyle=s.stroke;p.lineWidth=s.width;p.lineJoin='round';p.stroke(canvasPaths[i]);}p.restore();});p.restore();
}

export function festivalBannerLayout(text){
 const brand=FESTIVAL_BRANDS.includes(text),festival=text===FESTIVAL.titleKm;
 const wayfinding=/^(ស្ពាន|ទីបញ្ចប់|ចំណុចចាប់ផ្តើម)|ម៉ែត្រ$/.test(text);
 return {kind:brand?'sponsor':wayfinding?'wayfinding':festival?'festival':'support',
  accent:text==='Kuon Khmer'?c.red:wayfinding?c.blue:c.jade,
  lines:brand?[text,text==='Kuon Khmer'?'កម្លាំង និងសាមគ្គីភាព':'ស្មារតីអង្គរ']:festival?[FESTIVAL.titleKm+' '+FESTIVAL.yearKm,FESTIVAL.provinceKm]:[text]};
}
export function festivalBannerSize(width,height){
 const pixels=width>=12?2048:1024;
 return {width:pixels,height:Math.min(512,Math.max(128,Math.round(pixels*height/width)))};
}
export function paintFestivalBanner(canvas,text){
 const p=canvas.getContext('2d'),w=canvas.width,h=canvas.height,layout=festivalBannerLayout(text);
 p.clearRect(0,0,w,h);p.fillStyle=c.white;p.fillRect(0,0,w,h);
 p.fillStyle=layout.accent;p.fillRect(0,0,h*.09,h*.91);p.fillRect(w-h*.09,0,h*.09,h*.91);
 p.fillStyle=c.gold;p.fillRect(0,0,w,h*.025);
 // Same three flowing bands as the logo, with no per-frame canvas painting.
 p.fillStyle=c.blue;p.beginPath();p.moveTo(0,h*.93);p.bezierCurveTo(w*.28,h*.78,w*.52,h*1.08,w*.76,h*.92);p.quadraticCurveTo(w*.9,h*.83,w,h*.91);p.lineTo(w,h);p.lineTo(0,h);p.fill();
 p.fillStyle=c.gold;p.beginPath();p.moveTo(0,h*.90);p.quadraticCurveTo(w*.17,h*.76,w*.31,h*.91);p.quadraticCurveTo(w*.16,h*.84,0,h*.95);p.fill();
 const emblem=layout.kind!=='wayfinding',logoW=emblem?Math.min(h*1.9,w*.25):0;
 if(emblem)paintFestivalMark(p,h*.13,h*.035,logoW,h*.85);
 const left=emblem?logoW+h*.38:h*.25,right=w-h*.25,available=right-left,cx=(left+right)/2;
 if(emblem){p.fillStyle=c.gold;p.fillRect(left-h*.12,h*.18,Math.max(1,h*.006),h*.51);}
 const lineBounds=[];p.textAlign='center';p.textBaseline='alphabetic';
 layout.lines.forEach((line,i)=>{
  const top=h*(layout.lines.length===1?.14:i===0?.095:.57),bottom=h*(layout.lines.length===1?.78:i===0?.52:.83);
  let size=h*(layout.lines.length===1?.53:i===0?.43:.24),m;
  const measure=()=>{p.font='800 '+size+'px "Noto Sans Khmer", sans-serif';return p.measureText(line);};m=measure();
  size*=Math.min(1,available/Math.max(1,m.width),(bottom-top)/Math.max(1,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));m=measure();
  const y=top+(bottom-top-m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2+m.actualBoundingBoxAscent;
  p.fillStyle=layout.kind==='sponsor'&&i===0?layout.accent:c.jade;p.fillText(line,cx,y);
  lineBounds.push({text:line,left:cx-m.width/2,right:cx+m.width/2,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});
 });
 return {kind:layout.kind,lineBounds,width:w,height:h};
}
