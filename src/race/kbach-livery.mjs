import {kbachMotifs} from './kbach-motifs.mjs';

export const KBACH_SIZE={width:8192,height:512};
const reference={ground:'#080b09',band:'#d81024',gold:'#ffe14b'};
const paths=new Map();
function layout(draw){
 draw('center',2140,0,3912,512,false);
 for(const mirror of[false,true]){
  draw('end',0,0,690,512,mirror);draw('end',690,0,690,512,mirror);
  draw('transition',1380,0,760,512,mirror);
 }
}
export function paintKbachLivery(context,team=null){
 const c=context,palette={...reference,band:team?.jersey||reference.band};
 c.save();c.scale(2048/KBACH_SIZE.width,256/KBACH_SIZE.height);c.fillStyle=palette.ground;c.fillRect(0,0,8192,512);
 layout((name,x,y,w,h,mirror)=>{
  const motif=kbachMotifs[name];c.save();if(mirror){c.translate(8192,0);c.scale(-1,1);}
  c.beginPath();c.rect(x,y,w,h);c.clip();
  // Repeat the physical flower interval instead of stretching one screenshot.
  const interval=name==='center'?200:name==='end'?230:w;
  for(let at=x;at<x+w;at+=interval){
   c.save();c.translate(at,y);c.scale(interval/motif.width,h/motif.height);
   for(const key of['red','gold']){const cache=name+key;if(!paths.has(cache))paths.set(cache,new Path2D(motif[key]));c.fillStyle=palette[key==='red'?'band':'gold'];c.fill(paths.get(cache),'evenodd');}
   c.restore();
  }
  c.restore();
 });
 c.restore();
}
export function kbachSvg(team=null){
 const palette={...reference,band:team?.jersey||reference.band},defs=Object.entries(kbachMotifs).filter(([,v])=>v?.gold).map(([name,m])=>`<g id="${name}"><path d="${m.red}" fill="${palette.band}" fill-rule="evenodd"/><path d="${m.gold}" fill="${palette.gold}" fill-rule="evenodd"/></g>`).join('');let body='';
 layout((name,x,y,w,h,mirror)=>{const m=kbachMotifs[name],interval=name==='center'?200:name==='end'?230:w,id='clip-'+name+'-'+x+'-'+mirror;body+=`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g${mirror?' transform="translate(8192 0) scale(-1 1)"':''} clip-path="url(#${id})">`;for(let at=x;at<x+w;at+=interval)body+=`<use href="#${name}" transform="translate(${at} ${y}) scale(${interval/m.width} ${h/m.height})"/>`;body+='</g>';});
 return `<svg xmlns="http://www.w3.org/2000/svg" width="8192" height="512" viewBox="0 0 8192 512"><title>Kbach from the owner-supplied graphic clip</title><desc>Vector contour reconstruction from 56 and 68 seconds; source SHA256 ${kbachMotifs.sourceSha256}. Palette variants are game samples.</desc><defs>${defs}</defs><rect width="8192" height="512" fill="${palette.ground}"/>${body}</svg>`;
}
