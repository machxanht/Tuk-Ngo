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
// Warm sun, water halo and sunbeams.
circle(212,106,96,'#e3f6ec');circle(212,79,61,c.gold);circle(212,79,50,'#ffe598');
for(let i=0;i<13;i++){const a=(i*15-180)*Math.PI/180,x=212+69*Math.cos(a),y=79+69*Math.sin(a);path(`M${x} ${y}l${Math.cos(a)*7} ${Math.sin(a)*7}`,null,'#efad38',2.6);}
// Khmer pagoda: curved eaves, layered roof, finial and lit colonnade.
path('M163 89 H257 V133 H163Z','#fff4ca',c.deepRed,1.8);
for(const x of [171,188,205,222,239])path(`M${x} 91v41h7V91Z`,'#ffd575');
path('M181 102h12v30h-12Z M222 102h12v30h-12Z',c.deepRed);
path(FESTIVAL_MARK.temple,c.red,c.deepRed,1.8);
path('M148 91 Q163 88 171 80 L184 77 L210 38 L236 77 L249 80 Q257 88 272 91 L267 96 H153Z',c.gold,c.deepRed,1.5);
path('M171 75 L187 63 L210 29 L233 63 L249 75 L238 74 L210 48 L182 74Z',c.red,c.gold,2.5);
path('M187 61L210 18L233 61L221 54L210 33L199 54Z',c.red,c.gold,2);
path('M210 23V10 M205 19L210 7L215 19 M148 91L143 80L157 87 M272 91L277 80L263 87',null,c.gold,2.7);
path('M157 131H263L270 137H150Z',c.gold,c.deepRed,1.4);
// Sugar palms identify the bright southern river landscape.
for(const [x,flip]of [[113,1],[305,-1]]){
 path(`M${x} 133 Q${x+flip*8} 101 ${x+flip*4} 67 L${x+flip*10} 67 Q${x+flip*15} 104 ${x+flip*7} 133Z`,'#9e6041');
 const ox=x+flip*7;
 for(const [dx,dy,bend]of [[-30,-12,-22],[-20,-26,-5],[0,-30,10],[24,-23,7],[35,-5,-10],[-33,8,-16],[28,10,18]])path(`M${ox} 68 Q${ox+dx*.55} ${68+dy+bend} ${ox+dx} ${68+dy} Q${ox+dx*.47} ${68+dy+10} ${ox} 68Z`,dy<0?'#099b75':'#087d6a');
 circle(ox,69,4,'#c99648');
}
path('M82 148Q160 124 223 137T361 136L361 185H67Z','#8ad4cb');
path('M90 151Q150 140 199 149T301 146T357 141',null,'#effdf5',3);
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
// Rippling river and two lotus flowers finish the crest.
path(FESTIVAL_MARK.water,null,c.blue,3.5);
path('M41 201Q64 192 82 200 M346 198Q366 187 386 191',null,c.white,3);
for(const [x,y,scale]of [[42,202,1],[376,199,.9]]){
 path(`M${x} ${y}q${-21*scale} ${4*scale} ${-25*scale} ${-7*scale}q${18*scale} ${-4*scale} ${25*scale} ${7*scale}q${12*scale} ${-11*scale} ${25*scale} ${-7*scale}q${-2*scale} ${11*scale} ${-25*scale} ${7*scale}Z`,c.jade);
 for(const [dx,dy]of [[-13,-17],[13,-17],[0,-25]])path(`M${x} ${y-2}Q${x+dx*scale} ${y-3} ${x+dx*scale} ${y+dy*scale}Q${x+dx*.15*scale} ${y+dy*.67*scale} ${x} ${y-2}Z`,dx===0?'#fa8b99':'#de4e79',c.white,.8);
 circle(x,y-3,3,c.gold);
}
function shapeSvg(s){const style=`fill="${s.fill||'none'}"${s.stroke?` stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"`:''}`;return s.type==='path'?`<path d="${s.d}" ${style}/>`:`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" ${style}/>`;}
export function festivalLogoSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 228" role="img" aria-labelledby="title"><title id="title">Lễ hội đua ghe Ngo · ពិធីបុណ្យអុំទូក · ២០២៦</title>${art.map(shapeSvg).join('')}</svg>`;}
export function paintFestivalMark(p,x,y,width,height){
 p.save();p.translate(x,y);p.scale(width/420,height/228);p.lineJoin='round';p.lineCap='round';
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
