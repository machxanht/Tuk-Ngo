export const FESTIVAL={titleVi:'Lễ hội đua ghe Ngo',titleKm:'ពិធីបុណ្យអុំទូក',year:'2026',yearKm:'២០២៦',provinceVi:'Tỉnh Sóc Trăng',provinceKm:'ខេត្តឃ្លាំង'};
export const FESTIVAL_BRANDS=['Kuon Khmer','Angkor Soul'];
export const FESTIVAL_PALETTE={red:'#ce2029',deepRed:'#a41520',gold:'#ffd16b',white:'#fffdf4'};
// Original vector drawing, informed by the user's red/white festival poster.
// These exact paths drive both the SVG logo and every in-world banner.
export const FESTIVAL_MARK={
 boat:'M18 142 C97 166 230 172 301 131 C337 110 360 77 373 42 L403 34 C389 85 362 127 319 153 C243 199 94 192 18 142Z',
 echo:'M30 115 C108 135 223 133 270 104 C285 95 297 82 306 69 L326 65 C306 104 282 124 248 134 C178 155 83 143 30 115Z',
 water:'M183 187 H403 M224 197 H403 M280 207 H403',
 temple:'M34 80 H142 M43 70 H133 L115 60 L88 35 L62 60 Z M61 60 H115 M65 67 V94 M88 67 V94 M111 67 V94 M39 96 H137 M46 88 H130 M78 45 L88 22 L98 45'
};
export function festivalLogoSvg(){const c=FESTIVAL_PALETTE,m=FESTIVAL_MARK;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 224" role="img" aria-labelledby="title"><title id="title">Lễ hội đua ghe Ngo · ពិធីបុណ្យអុំទូក</title><rect width="420" height="224" rx="18" fill="${c.red}"/><circle cx="342" cy="50" r="27" fill="${c.gold}"/><path d="${m.temple}" fill="none" stroke="${c.white}" stroke-width="3.5" stroke-linejoin="round" opacity=".88"/><path d="${m.echo}" fill="${c.gold}"/><path d="${m.boat}" fill="${c.white}"/><path d="${m.water}" fill="none" stroke="${c.white}" stroke-width="3.5" stroke-linecap="round"/></svg>`;}
export function paintFestivalMark(p,x,y,width,height){
 const c=FESTIVAL_PALETTE,m=FESTIVAL_MARK;p.save();p.translate(x,y);p.scale(width/420,height/224);
 p.fillStyle=c.red;p.fillRect(0,0,420,224);p.fillStyle=c.gold;p.beginPath();p.arc(342,50,27,0,Math.PI*2);p.fill();
 p.strokeStyle=c.white;p.lineWidth=3.5;p.lineJoin='round';p.stroke(new Path2D(m.temple));p.fillStyle=c.gold;p.fill(new Path2D(m.echo));p.fillStyle=c.white;p.fill(new Path2D(m.boat));p.lineCap='round';p.stroke(new Path2D(m.water));p.restore();
}
export function paintFestivalBanner(canvas,text){
 const p=canvas.getContext('2d'),w=canvas.width,h=canvas.height,c=FESTIVAL_PALETTE,brand=FESTIVAL_BRANDS.includes(text),festival=text.includes(FESTIVAL.titleKm);
 p.fillStyle=c.red;p.fillRect(0,0,w,h);p.fillStyle=c.deepRed;p.fillRect(0,h*.86,w,h*.14);p.fillStyle=c.gold;p.fillRect(0,0,w,h*.025);p.fillRect(0,h*.965,w,h*.035);
 const logoW=h*1.62;paintFestivalMark(p,h*.12,h*.12,logoW,h*.76);
 p.strokeStyle=c.gold;p.lineWidth=h*.008;p.beginPath();p.moveTo(h*1.92,h*.17);p.lineTo(h*1.92,h*.82);p.stroke();
 const lines=brand?[text,text==='Kuon Khmer'?'កម្លាំង និង សាមគ្គីភាព':'ស្មារតីអង្គរ']:festival?[FESTIVAL.titleKm+' · '+FESTIVAL.yearKm,FESTIVAL.provinceKm]:[text];
 const left=h*2.15,right=w-h*.22,available=Math.max(h*.5,right-left),cx=(left+right)/2;
 p.textAlign='center';p.textBaseline='middle';
 lines.forEach((line,i)=>{const base=h*(lines.length===1?.43:i===0?.36:.23);p.font='800 '+base+'px "Noto Sans Khmer"';const size=Math.min(base,base*available/Math.max(1,p.measureText(line).width));p.font='800 '+size+'px "Noto Sans Khmer"';p.fillStyle=i===1?c.gold:c.white;p.fillText(line,cx,h*(lines.length===1?.49:i===0?.36:.73));});
}
