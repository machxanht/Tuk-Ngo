export const FESTIVAL={titleVi:'Lễ hội đua ghe Ngo',titleKm:'ពិធីបុណ្យអុំទូក',year:'2026',yearKm:'២០២៦',provinceVi:'Tỉnh Sóc Trăng',provinceKm:'ខេត្តឃ្លាំង'};
export const FESTIVAL_BRANDS=['Kuon Khmer','Angkor Soul'];
export const FESTIVAL_PALETTE={red:'#ce203c',deepRed:'#8e1636',gold:'#ffd15d',white:'#fff8df',teal:'#057e88',jade:'#18a87e',blue:'#268cce',coral:'#f46c53'};
// One original vector illustration drives the logo and every canvas banner.
export const FESTIVAL_MARK={
 boat:'M25 161 Q39 178 84 181 Q220 203 350 160 Q387 148 398 119 L410 117 Q403 158 367 174 Q236 220 80 194 Q39 187 25 161Z',
 echo:'M66 124 Q85 141 128 141 Q252 157 330 124 Q350 114 358 93 L369 91 Q364 123 340 135 Q251 173 124 154 Q78 150 66 124Z',
 water:'M56 207 Q92 197 128 207 T200 207 T272 207 T344 207 M105 217 Q140 207 176 217 T248 217 T320 217',
 temple:'M153 91 L167 78 L188 68 L210 25 L232 68 L253 78 L267 91 L250 87 H170Z'
};
const art=[];
const path=(d,fill,stroke=null,width=1)=>art.push({type:'path',d,fill,stroke,width});
const circle=(x,y,r,fill,stroke=null,width=1)=>art.push({type:'circle',x,y,r,fill,stroke,width});
const c=FESTIVAL_PALETTE;
// Two crews and outboard paddles, never abstract boat-shaped ribbons.
function boat(back){
 const start=back?100:62,end=back?324:354,count=back?13:16,base=back?134:174;
 for(let i=0;i<count;i++){
  const x=start+(end-start)*i/(count-1),y=base+Math.sin(i/(count-1)*Math.PI)*(back?7:12),skin=['#bc8054','#d69865','#9b633f'][i%3],jersey=back?'#ffcf43':i%4===0?'#36b992':'#087d87';
  path(`M${x-3} ${y+4}l${back?-8:-12} 21l3 5`,null,'#a16b35',2.1);
  path(`M${x-4} ${y-13}q4-3 8 0l3 15h-15Z`,jersey,c.deepRed,.55);
  circle(x,y-18,4.3,skin);path(`M${x-5} ${y-21}q5-6 10 0h2l-1 2h-12Z`,i%4===0?c.coral:c.white);
  path(`M${x-3} ${y-10}l-5 9l4 4 M${x+3} ${y-10}l4 5l-8 7`,null,skin,2.4);
 }
 path(back?FESTIVAL_MARK.echo:FESTIVAL_MARK.boat,back?c.red:c.teal,c.deepRed,1.2);
 const y=back?147:187;
 for(let i=0;i<(back?17:23);i++){const x=(back?107:73)+i*(back?12.8:12),dy=Math.sin(i/(back?17:23)*Math.PI)*5;path(`M${x} ${y+dy}q3-5 6-1t6-1 M${x+4} ${y+dy+3}l2-2l2 2l-2 2Z`,null,c.gold,1.15);}
 path(back?'M77 137Q213 176 354 119':'M38 177Q213 225 396 140',null,c.gold,2.8);
 // Slim gilded naga prow with a small distinct eye.
 path(back?'M357 100q-5-14 4-22q-1 8 8 9l-1 9Z':'M397 130q-5-16 4-26q-2 8 10 10l-2 9Z',c.gold,c.deepRed,1.1);
 circle(back?364:405,back?90:117,1.3,c.deepRed);
}
boat(true);boat(false);
function shapeSvg(s){const style=`fill="${s.fill||'none'}"${s.stroke?` stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"`:''}`;return s.type==='path'?`<path d="${s.d}" ${style}/>`:`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" ${style}/>`;}
export function festivalLogoSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 65 405 150" role="img" aria-labelledby="title"><title id="title">Lễ hội đua ghe Ngo · ពិធីបុណ្យអុំទូក · ២០២៦</title>${art.map(shapeSvg).join('')}</svg>`;}
export function paintFestivalMark(p,x,y,width,height){
 p.save();p.translate(x,y);p.scale(width/405,height/150);p.translate(-15,-65);p.lineJoin='round';p.lineCap='round';
 for(const s of art){p.beginPath();const shape=s.type==='path'?new Path2D(s.d):null;if(!shape)p.arc(s.x,s.y,s.r,0,Math.PI*2);if(s.fill){p.fillStyle=s.fill;shape?p.fill(shape):p.fill();}if(s.stroke){p.strokeStyle=s.stroke;p.lineWidth=s.width;shape?p.stroke(shape):p.stroke();}}
 p.restore();
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
