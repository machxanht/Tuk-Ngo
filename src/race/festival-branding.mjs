export const FESTIVAL={titleVi:'Lễ hội đua ghe Ngo',titleKm:'ពិធីបុណ្យអុំទូក',year:'2026',yearKm:'២០២៦',provinceVi:'Tỉnh Sóc Trăng',provinceKm:'ខេត្តឃ្លាំង'};
export const FESTIVAL_BRANDS=['Kuon Khmer','Angkor Soul'];

// Vector artwork stays crisp when the camera approaches the Khmer lettering.
export function paintFestivalBanner(canvas,text,background,foreground){
 const p=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=h*.075,brand=FESTIVAL_BRANDS.includes(text),festival=text.includes(FESTIVAL.titleKm);
 const gradient=p.createLinearGradient(0,0,w,h);gradient.addColorStop(0,background);gradient.addColorStop(.5,background);gradient.addColorStop(1,brand?'#692579':'#154f72');p.fillStyle=gradient;p.fillRect(0,0,w,h);
 p.strokeStyle='#ffda70';p.lineWidth=h*.035;p.strokeRect(pad,pad,w-pad*2,h-pad*2);
 // Mirrored lotus fans, sun discs, and a longboat with raised prow.
 for(const side of[-1,1]){p.save();p.translate(side<0?h*.83:w-h*.83,h*.51);p.scale(side,1);
  p.fillStyle='#ffca4d';p.beginPath();p.arc(0,-h*.10,h*.24,0,Math.PI*2);p.fill();
  for(let k=-2;k<=2;k++){p.save();p.rotate(k*.38);p.fillStyle=['#ff827c','#65e8ce','#f9ec9c','#65e8ce','#ff827c'][k+2];p.beginPath();p.moveTo(0,h*.12);p.bezierCurveTo(-h*.20,-h*.05,-h*.12,-h*.40,0,-h*.45);p.bezierCurveTo(h*.12,-h*.40,h*.20,-h*.05,0,h*.12);p.fill();p.restore();}
  p.strokeStyle='#ffffff';p.lineWidth=h*.022;p.beginPath();p.moveTo(-h*.60,h*.22);p.bezierCurveTo(-h*.45,h*.52,h*.42,h*.50,h*.61,h*.08);p.stroke();
  for(let k=-2;k<=2;k++){p.strokeStyle=k%2?'#f6cc47':'#65e8ce';p.lineWidth=h*.04;p.beginPath();p.moveTo(k*h*.13,h*.23);p.lineTo(k*h*.13+h*.16,h*.01);p.stroke();}
  p.restore();
 }
 const lines=brand?[text,text==='Kuon Khmer'?'កម្លាំង និង សាមគ្គីភាព':'ស្មារតីអង្គរ']:festival?[FESTIVAL.titleKm+' · '+FESTIVAL.yearKm,FESTIVAL.provinceKm]:[text];
 const available=w-h*3.25,base=h*(lines.length>1?.37:.49);p.fillStyle=foreground;p.textAlign='center';p.textBaseline='middle';
 lines.forEach((line,i)=>{p.font='800 '+base+'px "Noto Sans Khmer"';const size=Math.min(base,base*available/Math.max(1,p.measureText(line).width));p.font='800 '+size+'px "Noto Sans Khmer"';p.fillText(line,w/2,h*(lines.length===1?.54:i===0?.36:.73));});
}
