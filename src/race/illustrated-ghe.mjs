// Authored 2D artwork. No GLB, rendered frame, skin mesh or 3D pose is used here.
// The owner-supplied livery is the only bitmap painted onto the boat.
const TAU=Math.PI*2;
const INK='#354f46';
const SKINS=[['#bd8158','#e6ac7c'],['#a86745','#d99a6c'],['#c48a60','#edb786'],['#ac7654','#dba27b']];
const KEYS=[0,.18,.4,.51,.7,.89,1];
function curve(values,t){let i=0;while(i<KEYS.length-2&&t>KEYS[i+1])i++;const u=(t-KEYS[i])/(KEYS[i+1]-KEYS[i]),v=u*u*(3-2*u);return values[i]+(values[i+1]-values[i])*v;}
export function illustratedPose(phase){
 const t=((phase%1)+1)%1;
 const x=curve([-55,-28,50,55,5,-55,-55],t),y=curve([67,83,81,52,36,38,67],t),a=curve([.26,.01,-.52,-.55,-.15,.29,.26],t);
 const grip=d=>({x:x+Math.sin(a)*d,y:y-Math.cos(a)*d});
 return {shoulder:{x:curve([-25,-18,12,9,-10,-25,-25],t),y:-54},blade:{x,y},angle:a,upper:grip(121),lower:grip(88),immersed:y>66};
}
function fill(ctx,path,color,stroke=INK,width=1){ctx.fillStyle=color;ctx.fill(path);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(path);}}
function shape(commands){return new Path2D(commands);}
function line(ctx,points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.stroke();}
function gradient(ctx,a,b,dark,light){const g=ctx.createLinearGradient(a[0],a[1],b[0],b[1]);g.addColorStop(0,light);g.addColorStop(1,dark);return g;}
function elbow(a,b,bend){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),length=31,reach=Math.min(d,2*length-.001),height=Math.sqrt(length*length-reach*reach/4),inv=1/Math.max(d,.0001);
 return {x:(a.x+b.x)/2-dy*inv*height*bend,y:(a.y+b.y)/2+dx*inv*height*bend};
}
function limb(ctx,a,b,r1,r2,colors){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/d,ny=dx/d;
 const p=new Path2D();p.moveTo(a.x+nx*r1,a.y+ny*r1);p.bezierCurveTo(a.x+dx*.30+nx*r1*1.08,a.y+dy*.30+ny*r1*1.08,b.x-dx*.24+nx*r2,b.y-dy*.24+ny*r2,b.x+nx*r2,b.y+ny*r2);p.quadraticCurveTo(b.x+dx*.06,b.y+dy*.06,b.x-nx*r2,b.y-ny*r2);p.bezierCurveTo(b.x-dx*.30-nx*r2,b.y-dy*.30-ny*r2,a.x+dx*.24-nx*r1,a.y+dy*.24-ny*r1,a.x-nx*r1,a.y-ny*r1);p.closePath();
 fill(ctx,p,gradient(ctx,[a.x+nx*r1,a.y+ny*r1],[a.x-nx*r1,a.y-ny*r1],...colors),'#704d3b',.8);
 line(ctx,[[a.x+dx*.22+nx*r1*.25,a.y+dy*.22+ny*r1*.25],[b.x-dx*.25+nx*r2*.30,b.y-dy*.25+ny*r2*.30]],'#f3c29388',1.2);
}
function arm(ctx,shoulder,hand,colors,bend){const joint=elbow(shoulder,hand,bend);limb(ctx,shoulder,joint,5.5,4.5,colors);limb(ctx,joint,hand,4.5,3,colors);ctx.fillStyle=gradient(ctx,[joint.x-4,joint.y-4],[joint.x+4,joint.y+4],...colors);ctx.beginPath();ctx.ellipse(joint.x,joint.y,3.7,3.7,0,0,TAU);ctx.fill();ctx.fillStyle=colors[1];ctx.strokeStyle='#704d3b';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(hand.x,hand.y,4,3,-.4,0,TAU);ctx.fill();ctx.stroke();line(ctx,[[hand.x-2,hand.y-1],[hand.x+1,hand.y+1]],'#91664a',.65);}
function paddle(ctx,p,far){
 ctx.save();ctx.translate(p.blade.x,p.blade.y);ctx.rotate(p.angle);
 line(ctx,[[0,0],[0,-137]],far?'#a47746':'#735132',3.4);line(ctx,[[-.6,-24],[-.6,-134]],'#ead09b',1);
 const blade=shape('M -2 -24 C -7 -18 -9 -4 -8 5 Q 0 10 8 5 C 9 -4 7 -18 2 -24 Z');fill(ctx,blade,gradient(ctx,[-8,0],[8,0],'#a46133','#d5a369'),'#75553b',.7);line(ctx,[[0,-20],[0,5]],'#ebc18b',.7);
 ctx.restore();
}
function rower(ctx,x,y,scale,p,id,far=false,standing=false){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(far){ctx.globalAlpha=.96;}
 const colors=SKINS[id%SKINS.length],sx=p.shoulder.x,sy=p.shoulder.y;
 // Bent legs and cloth shorts are painted with tapered contours, not cylinders.
 if(standing){limb(ctx,{x:-8,y:0},{x:-12,y:38},8,4,colors);limb(ctx,{x:10,y:0},{x:19,y:38},7,4,colors);}
 else{limb(ctx,{x:1,y:-2},{x:-28,y:11},9,6,colors);limb(ctx,{x:-28,y:11},{x:-19,y:38},6,3.8,colors);limb(ctx,{x:8,y:0},{x:-16,y:16},7,5.2,colors);limb(ctx,{x:-16,y:16},{x:-6,y:38},5.2,3.5,colors);}
 fill(ctx,shape('M -8 -10 Q 10 -14 20 -3 L 4 16 Q -12 13 -28 9 L -27 0 Z'),gradient(ctx,[-25,0],[20,10],'#243f39','#527263'),'#2c4037');
 const shoulderBack={x:sx+8,y:sy+1},shoulderFront={x:sx-7,y:sy+3};
 arm(ctx,shoulderBack,p.upper,colors,-1);
 // Neck, shoulder and jersey have their own drawn silhouettes and fabric folds.
 limb(ctx,{x:sx-4,y:sy+2},{x:sx-8,y:sy-20},6,5,colors);
 const torso=new Path2D();torso.moveTo(-13,-7);torso.bezierCurveTo(-17,-24,sx-19,sy+17,sx-16,sy+3);torso.quadraticCurveTo(sx-8,sy-4,sx+7,sy-3);torso.bezierCurveTo(sx+20,sy+4,sx+14,sy+23,14,-4);torso.quadraticCurveTo(0,3,-13,-7);torso.closePath();
 fill(ctx,torso,gradient(ctx,[sx-15,sy],[17,-4],far?'#33745b':'#146a4c',far?'#78ae72':'#61ad70'),'#244b3c',1.15);
 line(ctx,[[sx-15,sy+4],[sx-14,sy+15]],'#f6d795',2);line(ctx,[[sx-10,sy+3],[sx-4,sy+9],[sx+3,sy+1]],'#dce9b8',1.8);
 line(ctx,[[sx+7,sy+14],[3,-18],[9,-10]],'#0a53394c',2);line(ctx,[[sx-9,sy+20],[-7,-10]],'#a0cc8a77',1.3);line(ctx,[[-12,-8],[12,-5]],'#edce9180',1.1);
 ctx.save();ctx.translate(sx-2,sy+26);ctx.rotate(-.12);ctx.font='600 6px system-ui';ctx.fillStyle='#e2edc6';ctx.fillText('TUM NÚP',-9,0);ctx.restore();
 // Side-profile face, ear, nose, brow and a soft fabric cap.
 const hx=sx-10,hy=sy-24;ctx.save();ctx.translate(hx,hy);ctx.rotate(-.12-sx*.003);
 const face=shape('M 8 -14 Q -4 -18 -10 -10 L -11 -2 L -16 1 L -12 4 Q -13 12 -6 16 L 2 16 Q 11 10 11 0 Z');fill(ctx,face,gradient(ctx,[-10,-6],[10,9],...colors),'#79533d',.75);
 fill(ctx,shape('M 6 -8 Q 10 -9 11 -3 Q 10 2 7 3 Z'),colors[0],'#8f6045',.7);
 line(ctx,[[-11,-4],[-6,-5]],'#503e31',1.2);ctx.fillStyle='#30362d';ctx.beginPath();ctx.ellipse(-9,-2,1.1,.85,0,0,TAU);ctx.fill();line(ctx,[[-12,8],[-7,8.7]],'#845542',.8);line(ctx,[[5,9],[1,14]],'#976447',.6);
 const cap=shape('M -12 -11 C -11 -27 14 -28 15 -11 L 10 -5 Q -2 -9 -12 -7 Z');fill(ctx,cap,gradient(ctx,[-12,-23],[14,-7],'#dadaca','#fff6dd'),'#7f8b75',.8);
 fill(ctx,shape('M -12 -9 Q -22 -9 -21 -6 Q -14 -3 -5 -5 L 9 -8 Z'),'#eee8cb','#8f957e',.65);line(ctx,[[1,-22],[2,-12]],'#bdc4ab',.7);line(ctx,[[8,-20],[9,-11]],'#d1d4bd',.7);ctx.restore();
 paddle(ctx,p,far);arm(ctx,shoulderFront,p.lower,colors,1);
 ctx.restore();
}
function hullPath(close){return shape(close?'M -2000 17 L 2000 17 L 2000 70 L -2000 70 Z':'M 0 -61 C 17 -33 77 -6 170 10 C 420 16 910 15 1054 7 C 1124 -6 1170 -37 1200 -77 C 1170 -15 1138 22 1050 33 C 814 46 373 47 157 36 C 76 30 19 -3 0 -61 Z');}
function hull(ctx,livery,close){
 const outline=hullPath(close);fill(ctx,outline,gradient(ctx,[0,12],[0,75],'#4b4e37','#b67c42'),'#384c39',2);
 ctx.save();ctx.clip(outline);ctx.fillStyle='#bd713a';ctx.fillRect(-2000,12,4000,21);
 if(livery)ctx.drawImage(livery,close?-600:0,close?24:14,1200,close?40:27);
 const shadow=ctx.createLinearGradient(0,25,0,75);shadow.addColorStop(0,'#ffedb52a');shadow.addColorStop(.6,'#58372410');shadow.addColorStop(1,'#203f37aa');ctx.fillStyle=shadow;ctx.fillRect(-2000,18,4000,65);
 line(ctx,[[-2000,24],[2000,24]],'#f1cb79',2);line(ctx,[[-2000,64],[2000,64]],'#e4bf6755',1);ctx.restore();
 if(close){line(ctx,[[-2000,16],[2000,16]],'#f0c287',3);line(ctx,[[-2000,19],[2000,19]],'#7b5635',2);}
 else{const rail=shape('M 0 -61 C 17 -33 77 -6 170 10 C 420 16 910 15 1054 7 C 1124 -6 1170 -37 1200 -77');ctx.strokeStyle='#f0cb83';ctx.lineWidth=3;ctx.stroke(rail);ctx.strokeStyle='#576549';ctx.lineWidth=1;ctx.stroke(rail);}
}
export function paintIllustratedRiver(ctx,w,h,time){
 const horizon=h*.33,sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#f4e7c9');sky.addColorStop(1,'#e2d9b9');ctx.fillStyle=sky;ctx.fillRect(0,0,w,horizon+25);
 // Brush-like banks and their broken reflections are separate parallax layers.
 for(let layer=0;layer<3;layer++){const offset=(time*(1+layer)*1.4)%(w*.6);ctx.fillStyle=['#a7b495','#8ea687','#71997d'][layer];ctx.beginPath();ctx.moveTo(-w,horizon+20);for(let x=-w;x<w*2;x+=32)ctx.lineTo(x-offset,horizon-14+layer*7-Math.sin(x*.013+layer)*17-Math.sin(x*.027+layer)*7);ctx.lineTo(w*2,horizon+28);ctx.closePath();ctx.fill();}
 ctx.fillStyle='#bcad86';ctx.fillRect(0,horizon+15,w,9);
 for(let i=0;i<10;i++){const x=(i*w/9-time*2)%(w+90),y=horizon-8;ctx.strokeStyle='#5f8469';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y+20);ctx.quadraticCurveTo(x-7,y-9,x+1,y-49);ctx.stroke();for(let j=0;j<6;j++){const a=j*.63-2.9;ctx.beginPath();ctx.moveTo(x+1,y-48);ctx.quadraticCurveTo(x+Math.cos(a)*19,y-66,x+Math.cos(a)*32,y-43+Math.sin(a)*15);ctx.stroke();}}
 for(let i=0;i<6;i++){const x=i*w*.21-time*2,y=horizon+9,bw=w*.15;fill(ctx,shape(`M ${x} ${y} l 9 -12 h ${bw-18} l 9 12 Z`),'#758b74',null);for(let n=0;n<22;n++){ctx.fillStyle=['#607559','#c78459','#d6b570','#417568'][n%4];ctx.beginPath();ctx.ellipse(x+9+n*(bw-18)/22,y+7,1.7,3,0,0,TAU);ctx.fill();}}
 const water=ctx.createLinearGradient(0,horizon,0,h);water.addColorStop(0,'#9aac89');water.addColorStop(.38,'#6f9e8d');water.addColorStop(1,'#356e69');ctx.fillStyle=water;ctx.fillRect(0,horizon+24,w,h);
 for(let i=0;i<135;i++){const depth=(i%31)/31,y=horizon+30+depth*depth*(h-horizon),len=10+depth*92,x=((i*139-time*(10+depth*19))%(w+len)+w+len)%(w+len)-len;ctx.strokeStyle=i%4?'#dce4bf25':'#325f5425';ctx.lineWidth=.7+depth*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+len*.2,y-1,x+len*.5,y+2,x+len,y);ctx.stroke();}
}
export function drawIllustratedGhe(ctx,w,h,phase,view,livery){
 const close=view==='crew',scale=close?Math.min((w-60)/310,(h-380)/220):w*.93/1200;
 const ox=close?w*.5:(w-1200*scale)/2,oy=h*.54,contacts=[];
 const point=(x,y)=>({x:ox+x*scale,y:oy+y*scale});
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.lineJoin='round';
 ctx.fillStyle='#234f4350';ctx.beginPath();ctx.ellipse(close?0:620,74,close?320:560,close?11:14,0,0,TAU);ctx.fill();
 // Far gunwale, benches and both crew rows are layered, rather than projected 3D.
 fill(ctx,close?shape('M -2000 -8 H 2000 V 18 H -2000 Z'):shape('M 0 -61 Q 116 19 230 -8 L 1040 -8 Q 1143 -15 1200 -77 L 1080 22 L 151 22 Z'),'#bb8a55','#6f6948',1);
 const indexes=close?[11]:Array.from({length:25},(_,i)=>i);
 for(const i of indexes){const x=close?-26:166+i*33.8;line(ctx,[[x-14,-5],[x+22,20]],'#edbe7e',4);line(ctx,[[x-14,-3],[x+22,22]],'#6b603e',1);}
 const actorScale=close?1:.43;
 for(const far of [true,false])for(const i of indexes){const x=close?-26:166+i*33.8,offset=far?(close?34:10):0,y=far?(close?-16:-8):7,p=illustratedPose(phase+(i%3-1)*.005);rower(ctx,x+offset,y,actorScale,p,i*2+(far?0:1),far);const contactX=p.blade.x+(p.blade.y-66)*Math.tan(p.angle);contacts.push({...point(x+offset+contactX*actorScale,y+66*actorScale),immersed:p.immersed,front:!far});}
 if(!close){const p=illustratedPose(phase);rower(ctx,119,-20,.46,p,50,false,true);rower(ctx,604,-24,.49,p,51,false,true);for(let i=0;i<3;i++)rower(ctx,1040+i*34,-22,.46,illustratedPose(.34),52+i,i===0,true);}
 hull(ctx,livery,close);
 // Blades occupy the foreground after the near rail, making contact readable.
 for(const i of indexes){const x=close?-26:166+i*33.8,p=illustratedPose(phase+(i%3-1)*.005);ctx.save();ctx.beginPath();ctx.rect(-2000,17,4000,1000);ctx.clip();ctx.translate(x,7);ctx.scale(actorScale,actorScale);paddle(ctx,p,false);ctx.restore();}
 ctx.restore();return {contacts,waterline:oy+(7+66*actorScale)*scale,crewCount:close?2:55};
}
