import * as T from 'three';
import {DESIGN_GUIDES} from './design-profile.mjs';
import {prepareActors,makeAthlete,setAthleteGrips} from './imported-athlete.mjs';

// The photos establish appearance; the repository establishes approximate design dimensions.
export const SPEC = Object.freeze({id:'GHE_NGO_MAKEHUMAN_ART_V4',loa:30.2,beam:1.12,depth:0.58,bow:1.38,stern:1.52,waterY:0.28,rows:25,crew:55,kemDiameter:0.09,kemLength:28.5,kemSupports:24,paddleLength:1.22,steeringLength:4.2});
export const SOURCES = [
 {id:'USER-DESIGN-01',publisher:'User supplied assetghe.mp4',date:'2026-10-09',url:'https://drive.google.com/file/d/1P4vzMy9rbXIHvB8kH6aNWpenhgbOcVoA/view',file:'../../references/user-ghe-design/assetghe.mp4',role:'Primary shape and livery reference; upper design in clip, original video pixels from 0–36 seconds'},
 {id:'REAL-01',publisher:'Báo Nhân Dân',date:'2024-11-15',url:'https://nhandan.vn/gan-1-trieu-luot-nguoi-du-le-hoi-ooc-om-boc-dua-ghe-ngo-soc-trang-nam-2024-post845131.html',files:['../../references/tum-nup-2-2024/nhandan-tum-nup-2-no12.png','../../references/tum-nup-2-2024/nhandan-final-finish.png']},
 {id:'REAL-04',publisher:'Báo Sóc Trăng / Pon Lư',date:'2024-12-01',url:'https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hanh-trinh-gianh-ngoi-quan-quan-cua-2-doi-ghe-ngo-nam-nu-chua-tum-nup-0971e97/',files:['../../references/tum-nup-2-2024/baosoctrang-final-men.jpg']},
 {id:'REAL-02',publisher:'Giang trần TV',date:'2024-11-15',url:'https://www.youtube.com/watch?v=P5FvDeN7vow&t=25s',observed:'00:25, distant bank view; no precise angle measurement'}
];
const knots=[-15.1,-13,-10,-5,0,5,10,13,15.1], breadth=[0,.215,.38,.52,.56,.53,.41,.235,0];
// Natural cubic interpolation through the documented cross-section widths (C2).
const second=new Array(knots.length).fill(0),tmp=new Array(knots.length).fill(0);
for(let i=1;i<knots.length-1;i++){
 const sig=(knots[i]-knots[i-1])/(knots[i+1]-knots[i-1]),p=sig*second[i-1]+2;
 second[i]=(sig-1)/p;
 tmp[i]=(6*((breadth[i+1]-breadth[i])/(knots[i+1]-knots[i])-(breadth[i]-breadth[i-1])/(knots[i]-knots[i-1]))/(knots[i+1]-knots[i-1])-sig*tmp[i-1])/p;
}
for(let i=knots.length-2;i>=0;i--)second[i]=second[i]*second[i+1]+tmp[i];
function halfBeam(x){
 let k=0;while(k<knots.length-2 && x>knots[k+1])k++;
 const h=knots[k+1]-knots[k],a=(knots[k+1]-x)/h,b=(x-knots[k])/h;
 return Math.max(0,Math.min(.56,a*breadth[k]+b*breadth[k+1]+((a*a*a-a)*second[k]+(b*b*b-b)*second[k+1])*h*h/6));
}
function guideSpline(values){const knots=DESIGN_GUIDES.t,n=knots.length,second=new Array(n).fill(0),temp=new Array(n).fill(0);for(let i=1;i<n-1;i++){const s=(knots[i]-knots[i-1])/(knots[i+1]-knots[i-1]),p=s*second[i-1]+2;second[i]=(s-1)/p;temp[i]=(6*((values[i+1]-values[i])/(knots[i+1]-knots[i])-(values[i]-values[i-1])/(knots[i]-knots[i-1]))/(knots[i+1]-knots[i-1])-s*temp[i-1])/p;}for(let i=n-2;i>=0;i--)second[i]=second[i]*second[i+1]+temp[i];return t=>{let i=0;while(i<n-2&&t>knots[i+1])i++;const h=knots[i+1]-knots[i],a=(knots[i+1]-t)/h,b=(t-knots[i])/h;return a*values[i]+b*values[i+1]+((a*a*a-a)*second[i]+(b*b*b-b)*second[i+1])*h*h/6;};}
const guides={bow:{k:guideSpline(DESIGN_GUIDES.bow.keel),g:guideSpline(DESIGN_GUIDES.bow.gunwale)},stern:{k:guideSpline(DESIGN_GUIDES.stern.keel),g:guideSpline(DESIGN_GUIDES.stern.gunwale)}};
export function profile(x){const t=Math.min(1,Math.abs(x)/15.1),h=x>=0?SPEC.bow:SPEC.stern,guide=x>=0?guides.bow:guides.stern,g=Math.max(.58,Math.min(h,guide.g(t))),k=Math.max(0,Math.min(g,guide.k(t)));return {x,b:halfBeam(x),k,g,p:1.8-.75*Math.pow(t,1.6)};}
let designTexture;
export async function prepareDesign(textureUrl,actorUrl){const result=await Promise.all([new T.TextureLoader().loadAsync(textureUrl),prepareActors(actorUrl)]);designTexture=result[0];designTexture.colorSpace=T.SRGBColorSpace;designTexture.anisotropy=8;}
function section(x,s){
 const p=profile(x),q=Math.pow(Math.abs(s),p.p),d=p.g-p.k;
 const slope=Math.min(.85,d*Math.tan(14.5*Math.PI/180)/Math.max(p.b,.001)),coef=slope-1/p.p;
 const f=q===0?0:Math.pow(q,1/p.p)*(1-coef+coef*q);
 return new T.Vector3(x,p.k+d*q,Math.sign(s)*p.b*f);
}
const V=(x,y,z)=>new T.Vector3(x,y,z),Y=V(0,1,0);
const sphereGeo=new T.SphereGeometry(1,12,8),cylinderGeo=new T.CylinderGeometry(1,1,1,10),boxGeo=new T.BoxGeometry(1,1,1);
const m=(color,roughness=.6)=>new T.MeshStandardMaterial({color,roughness,metalness:.02});
const MAT={blue:m('#17367d',.34),wood:m('#89532b'),darkwood:m('#614022'),gold:m('#ebbe4f',.4),green:m('#21b84b',.46),red:m('#e83731'),white:m('#f3f2de'),skin:m('#9c613f'),shorts:m('#172831'),hair:m('#171c18'),shirt:m('#079348'),cyan:m('#79cce4'),khaki:m('#475f54'),steel:m('#7a7e7d')};
MAT.gold.metalness=.22;
function mesh(parent,name,geo,mat,pos,scale){const o=new T.Mesh(geo,mat);o.name=name;if(pos)o.position.copy(pos);if(scale)o.scale.copy(scale);parent.add(o);return o;}
function ellipsoid(parent,name,mat,pos,scale){return mesh(parent,name,sphereGeo,mat,pos,scale);}
function bone(parent,name,mat,a,b,r1=.035,r2=r1){const o=mesh(parent,name,cylinderGeo,mat);placeBone(o,a,b,r1);return o;}
function placeBone(o,a,b,r){const d=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(r,d.length(),r);o.quaternion.setFromUnitVectors(Y,d.normalize());}
function ribbonMesh(name,points,material){const g=new T.BufferGeometry().setFromPoints(points);const idx=[];for(let i=0;i<points.length/2-1;i++)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,material);o.name=name;return o;}
function photoLiveryCanvas(){
 const c=document.createElement('canvas');c.width=4096;c.height=512;const ctx=c.getContext('2d');
 ctx.fillStyle='#17367d';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#e73b35';ctx.fillRect(0,0,c.width,24);ctx.fillStyle='#dac350';ctx.fillRect(0,24,c.width,7);
 // Layered green Naga scales, outlined in yellow, from the visible race livery.
 for(let row=0;row<3;row++)for(let n=-1;n<66;n++){
   const x=n*64+(row%2)*32,y=94+row*94;
   ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+32,y-58,x+64,y);ctx.quadraticCurveTo(x+48,y+42,x+32,y+53);ctx.quadraticCurveTo(x+16,y+42,x,y);
   ctx.fillStyle=row===1?'#43c945':'#169e3b';ctx.fill();ctx.strokeStyle='#dfce57';ctx.lineWidth=4;ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+17,y+4);ctx.quadraticCurveTo(x+32,y-20,x+47,y+4);ctx.strokeStyle='#0d4a32';ctx.lineWidth=3;ctx.stroke();
 }
 ctx.fillStyle='#122551';ctx.fillRect(0,365,c.width,147);
 // Painted Khmer flowing flame/leaf detail; reconstructed, not a traced original.
 for(let n=0;n<72;n++){
   const x=n*57;ctx.beginPath();ctx.moveTo(x,461);ctx.bezierCurveTo(x+48,474,x+57,396,x+18,411);ctx.bezierCurveTo(x+47,443,x+14,448,x,461);
   ctx.fillStyle='#e4c35a';ctx.fill();ctx.strokeStyle='#da493a';ctx.lineWidth=2;ctx.stroke();
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
function hull(){
 const N=300,S=60,pos=[],uv=[],outer=[],inner=[],caps=[];const ring=2*(S+1);
 for(let i=1;i<N;i++){
   const x=-15.1+30.2*i/N,p=profile(x),d=p.g-p.k;
   for(let skin=0;skin<2;skin++)for(let j=0;j<=S;j++){
     const s=2*j/S-1,a=section(x,s);
     if(skin===1){const l=section(x,Math.max(-1,s-.0001)),r=section(x,Math.min(1,s+.0001));const tangent=r.clone().sub(l),normal=V(0,tangent.z,-tangent.y).normalize();a.addScaledVector(normal,Math.min(.035-.011*Math.abs(s),d*.4,p.b*.4));a.y=Math.min(a.y,p.g);}
     pos.push(...a.toArray());uv.push(1-i/N,Math.pow(Math.abs(s),p.p));
   }
 }
 for(let i=0;i<N-2;i++)for(let j=0;j<S;j++){
   const a=i*ring+j,b=a+ring;outer.push(a,b,a+1,b,b+1,a+1);
   const c=a+S+1,e=c+ring;inner.push(c,c+1,e,e,c+1,e+1);
 }
 for(let i=0;i<N-2;i++)for(const j of [0,S]){const a=i*ring+j,b=a+ring,c=a+S+1,d=b+S+1;if(j===0)caps.push(a,c,b,b,c,d);else caps.push(a,b,c,b,d,c);}
 const tail=pos.length/3;pos.push(-15.1,SPEC.stern,0);uv.push(0,0);const bow=pos.length/3;pos.push(15.1,SPEC.bow,0);uv.push(1,0);
 for(let j=0;j<S;j++){
   outer.push(tail,j,j+1);inner.push(tail,S+1+j+1,S+1+j);
   const a=(N-2)*ring+j;outer.push(bow,a+1,a);inner.push(bow,a+S+1,a+S+2);
 }
 caps.push(tail,S+1,0,tail,S,2*S+1);const e=(N-2)*ring;caps.push(bow,e,e+S+1,bow,e+2*S+1,e+S);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex([...outer,...inner,...caps]);
 g.addGroup(0,outer.length,0);g.addGroup(outer.length,inner.length,1);g.addGroup(outer.length+inner.length,caps.length,2);g.computeVertexNormals();
 const painted=m('#ffffff',.30);painted.map=designTexture;painted.metalness=.16;const o=new T.Mesh(g,[painted,MAT.wood,MAT.gold]);o.name='Hull_Watertight_30_20x1_12';o.userData={component:'hull',dimensionsEvidence:'APPROXIMATE',appearanceEvidence:'USER-DESIGN-01 original vector-video pixels',woodThicknessM:{bottom:.035,side:.024},sourceRevision:'3e6280fda9cecfb595d60ea365d1d9b049f5f512'};return o;
}
function deck(group,side){
 const pts=[];for(let i=0;i<=70;i++){const x=side*(10.6+4.48*i/70),p=profile(x);pts.push(V(x,p.g-.025,-p.b*.92),V(x,p.g-.025,p.b*.92));}
 const o=ribbonMesh(side>0?'Foredeck':'SternDeck',pts,MAT.wood);o.material=MAT.wood.clone();o.material.side=T.DoubleSide;group.add(o);
}
function paintedNagaCanvas(){
 const c=document.createElement('canvas');c.width=1024;c.height=384;const p=c.getContext('2d');
 p.fillStyle='#17367d';p.fillRect(0,0,1024,384);
 p.lineJoin='round';p.lineCap='round';p.lineWidth=13;
 p.beginPath();p.moveTo(10,272);p.bezierCurveTo(240,350,430,295,533,231);p.bezierCurveTo(620,205,650,205,727,216);p.bezierCurveTo(856,224,861,98,976,71);p.lineTo(992,26);p.bezierCurveTo(901,35,792,87,740,110);p.bezierCurveTo(650,83,572,62,502,70);p.lineTo(410,24);p.lineTo(440,122);p.bezierCurveTo(282,120,284,250,180,267);p.lineTo(10,272);
 p.fillStyle='#179941';p.fill();p.strokeStyle='#e3c13b';p.stroke();
 p.beginPath();p.moveTo(442,137);p.bezierCurveTo(516,105,590,166,646,182);p.bezierCurveTo(590,204,555,193,505,232);p.lineTo(454,223);p.bezierCurveTo(510,181,544,176,568,172);p.bezierCurveTo(516,142,480,145,442,137);
 p.fillStyle='#dd312b';p.fill();p.strokeStyle='#f1d869';p.lineWidth=9;p.stroke();
 p.beginPath();p.ellipse(543,105,42,18,-.17,0,Math.PI*2);p.fillStyle='#ede49b';p.fill();p.strokeStyle='#201c18';p.lineWidth=4;p.stroke();p.beginPath();p.arc(556,105,9,0,Math.PI*2);p.fillStyle='#171b17';p.fill();
 p.strokeStyle='#efc45b';p.lineWidth=5;for(let i=0;i<6;i++){p.beginPath();p.moveTo(65+i*51,270-i*8);p.quadraticCurveTo(96+i*51,195-i*7,131+i*51,270-i*9);p.stroke();}
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return tx;
}
function sideDecal(group,name,x0,x1,texture,heightFrac=.65,offset=.008){
 const mat=new T.MeshStandardMaterial({map:texture,roughness:.65,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
 for(const side of [-1,1]){
   const pos=[],uv=[],idx=[],vertical=20;
   for(let i=0;i<=60;i++){const x=x0+(x1-x0)*i/60;for(let j=0;j<=vertical;j++){const s=heightFrac+(.97-heightFrac)*j/vertical,a=section(x,side*s);a.z+=side*offset;a.y-=.003;pos.push(...a.toArray());uv.push(i/60,j/vertical);}}
   for(let i=0;i<60;i++)for(let j=0;j<vertical;j++){const a=i*(vertical+1)+j,b=a+vertical+1;idx.push(a,a+1,b,a+1,b+1,b);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,mat);o.name=name+(side<0?'_Port':'_Starboard');group.add(o);
 }
}
function labelTexture(text,fg,bg){const c=document.createElement('canvas');c.width=512;c.height=192;const p=c.getContext('2d');p.fillStyle=bg;p.fillRect(0,0,512,192);p.fillStyle=fg;p.font='bold 148px Arial';const size=Math.min(148,Math.floor(148*468/p.measureText(text).width));p.font='bold '+size+'px Arial';p.textAlign='center';p.textBaseline='middle';p.fillText(text,256,100);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function decorations(g){
 // The supplied design contains a continuous Kbach livery with no race number or painted head.
 // Red painted ends integrated into the hull, no separate dragon-head sculptures.
 for(const side of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const x=side*(14.1+.99*i/24),p=profile(x);pts.push(V(x,p.g-.014,-p.b),V(x,p.g-.014,p.b));}g.add(ribbonMesh(side>0?'Red_Integrated_Prow':'Red_Integrated_Stern',pts,MAT.red));}
 const black=m('#10120f',.92);for(const end of [-1,1]){const x=end*14.90,p=profile(x);const origin=V(x,p.g-.03,0);bone(g,'Tassel_Collar_'+end,MAT.gold,origin,origin.clone().add(V(0,-.05,0)),.032);for(let i=0;i<14;i++){const a=i/14*Math.PI*2,points=[origin.clone().add(V(Math.cos(a)*.018,-.04,Math.sin(a)*.018)),origin.clone().add(V(Math.cos(a)*.038,-.20,Math.sin(a)*.038)),origin.clone().add(V(Math.cos(a)*.021,-.36,Math.sin(a)*.021))];mesh(g,'Black_Tassel_'+end+'_'+i,new T.TubeGeometry(new T.CatmullRomCurve3(points),8,.0055,5,false),black);}}
}
function interior(g){
 for(let row=0;row<25;row++){const x=10-row*20/24,p=profile(x);mesh(g,'Thwart_'+String(row+1).padStart(2,'0'),boxGeo,MAT.wood,V(x,p.g-.055,0),V(.12,.035,2*p.b-.055));}
 const k=new T.Group();k.name='Kem_90mm_28_5m_24Supports';k.userData={evidence:'INFERRED',conflict:'90mm V2; historical 140mm reference not reconciled by a real interior photograph'};
 const pts=[];for(let i=0;i<=150;i++){const x=-14.25+i*28.5/150;pts.push(V(x,profile(x).k+.11,0));}
 mesh(k,'Kem_Spine',new T.TubeGeometry(new T.CatmullRomCurve3(pts),180,.045,10,false),MAT.darkwood);
 for(let i=0;i<24;i++){const x=-10.5+i*21/23,p=profile(x);bone(k,'Kem_Support_'+i,MAT.darkwood,V(x,p.k+.035,0),V(x,p.k+.11,0),.021);}
 g.add(k);
 for(let i=0;i<48;i++){const x=-12.25+i*24.5/47,p=profile(x);const pts=[];for(let j=0;j<=24;j++){const a=section(x,2*j/24-1);a.y+=.035;a.z*=.94;pts.push(a);}mesh(g,'Rib_'+String(i+1).padStart(2,'0'),new T.TubeGeometry(new T.CatmullRomCurve3(pts),28,.018,6,false),MAT.darkwood);}
 mesh(g,'Midship_Command_Platform',boxGeo,MAT.darkwood,V(.18,profile(.18).g-.025,0),V(.4,.065,.21));
 deck(g,1);deck(g,-1);
}
function paddle(g,name,length=SPEC.paddleLength){
 const p=new T.Group();p.name=name;
 bone(p,name+'_Shaft',MAT.gold,V(0,0,0),V(0,-length+.4,0),.017);
 bone(p,name+'_TGrip',MAT.wood,V(-.06,0,0),V(.06,0,0),.016);
 const shape=new T.Shape();shape.moveTo(-.03,0);shape.bezierCurveTo(-.11,-.12,-.12,-.3,0,-.42);shape.bezierCurveTo(.12,-.3,.11,-.12,.03,0);shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.006,curveSegments:6});
 const blade=mesh(p,name+'_Blade',geo,MAT.wood,V(0,-length+.42,-.009));p.userData={component:'paddle',lengthM:length,blade:'wood colour from photos; hidden blade finish not asserted'};g.add(p);return p;
}
function person(g,id,role,x,z){
 const a=makeAthlete(id,role),seatY=profile(x).g-.01;
 a.root.position.set(x,role==='ROWER'?seatY:profile(x).g+(role==='STEERSMAN'?a.steeringHipHeight:a.standingHipHeight+(role==='MID_COMMAND'?.03:-.025)),z);g.add(a.root);Object.assign(a,{x,z,seatY,role});a.root.updateMatrixWorld(true);return a;
}
// Smooth seven-phase pose. Cadence is a preview control, not a measured 2024 value.
const KEYS=[0,.10,.22,.42,.60,.74,.94,1];
const LEAN=[26,26,24,2,-10,-7,20,26],SWEEP=[26,26,22,-5,-24,-12,22,26],DEPTH=[.08,.035,-.13,-.15,-.12,.085,.08,.08];
function smoothKey(values,t){let i=0;while(i<KEYS.length-2 && t>=KEYS[i+1])i++;const u=(t-KEYS[i])/(KEYS[i+1]-KEYS[i]),s=u*u*(3-2*u);return T.MathUtils.lerp(values[i],values[i+1],s);}
function armsToGrips(a,grips,direction){a.root.updateWorldMatrix(true,false);return setAthleteGrips(a,grips.map(p=>a.root.localToWorld(p.clone())),direction?.clone().transformDirection(a.root.matrixWorld));}
function updateRower(a,cycle,phaseLag){
 const t=(cycle-phaseLag+1)%1,side=Math.sign(a.z),lean=smoothKey(LEAN,t)*Math.PI/180,sw=smoothKey(SWEEP,t)*Math.PI/180,depth=smoothKey(DEPTH,t);
 a.setTorsoLean(lean);
 a.setHeadPitch(lean*.70);
 const recovery=t>=.70&&t<=.94?Math.sin(Math.PI*(t-.70)/.24)**2:0;
 const cant=(27.5+12.5*recovery)*Math.PI/180;
 // Blade toe is outside the actual local rail; root position is solved from water height.
 const localHalfBeam=profile(a.x).b,bladeZ=side*(localHalfBeam+.34);
 const dir=V(-Math.sin(sw)*Math.cos(cant),Math.cos(sw)*Math.cos(cant),-side*Math.sin(cant)).normalize();
 a.paddle.quaternion.setFromUnitVectors(Y,dir);a.paddle.quaternion.multiply(new T.Quaternion().setFromAxisAngle(Y,recovery*Math.PI/2));const toe=V(a.x+.18+.22*Math.sin(lean)-dir.x*SPEC.paddleLength,SPEC.waterY+depth,bladeZ);
 const top=toe.clone().addScaledVector(dir,SPEC.paddleLength);a.paddle.position.copy(top);
 const gripTop=top.clone().sub(a.root.position),gripLow=top.clone().addScaledVector(dir,-.44).sub(a.root.position);
 armsToGrips(a,side<0?[gripLow,gripTop]:[gripTop,gripLow],dir);
 a.paddle.userData.outboardBladeZ=bladeZ;
}
function updateStanding(a,cycle){
 const sway=Math.sin(cycle*Math.PI*2)*.025;a.setTorsoLean(-sway);
 if(a.paddle){const side=a.steerSide,toe=V(a.x-2.65,SPEC.waterY-.13,side*(profile(a.x).b+.75)),center=a.root.position.clone().add(V(.23,.28,side*.10)),dir=center.clone().sub(toe).normalize(),top=toe.clone().addScaledVector(dir,SPEC.steeringLength);a.paddle.position.copy(top);a.paddle.quaternion.setFromUnitVectors(Y,dir);const upper=center.clone().addScaledVector(dir,.19).sub(a.root.position),lower=center.clone().addScaledVector(dir,-.19).sub(a.root.position);armsToGrips(a,side<0?[lower,upper]:[upper,lower],dir);}
 else{const l=V(.32,.62+Math.sin(cycle*6.28)*.08,-.28),r=a.role==='MID_COMMAND'?V(.21,.75,.28):V(.34,.50,.26);armsToGrips(a,[l,r]);}
}
export function buildBoat(){
 const root=new T.Group();root.name=SPEC.id;root.userData={spec:SPEC,evidencePolicy:'User design video controls shape and livery; real race photos control crew clothing. No generated image references.',repoRevision:'3e6280fda9cecfb595d60ea365d1d9b049f5f512',sources:SOURCES};
 const shell=new T.Group();shell.name='Boat_Hull_and_Structure';root.add(shell);const body=hull();shell.add(body);interior(shell);decorations(shell);
 const crew=new T.Group();crew.name='Crew_55';root.add(crew);const paddles=new T.Group();paddles.name='Paddles_50_plus_3';root.add(paddles);const athletes=[];
 for(let row=0;row<25;row++){
   const x=10-row*20/24,b=profile(x).b;
   for(const side of [-1,1]){const a=person(crew,2+row*2+(side>0?1:0),'ROWER',x,side*Math.min(.24,b*.52));a.pair=row+1;a.paddle=paddle(paddles,'Paddle_'+a.root.userData.id);a.paddle.userData.side=side;a.paddle.userData.row=row+1;athletes.push(a);}
 }
 athletes.push(person(crew,1,'PROW_COMMAND',11.7,0));athletes.push(person(crew,52,'MID_COMMAND',.2,0));
 for(let i=0;i<3;i++){const a=person(crew,53+i,'STEERSMAN',-11.2-i*.95,(i%2?-.08:.08));a.steerSide=i%2?-1:1;a.paddle=paddle(paddles,'Steering_Oar_'+(i+1),SPEC.steeringLength);athletes.push(a);}
 function pose(cycle=0){root.updateMatrixWorld(true);for(const a of athletes){if(a.role==='ROWER')updateRower(a,cycle,(a.pair-1)*.025/24);else updateStanding(a,cycle);}root.updateMatrixWorld(true);}
 pose(.25);
 return {root,shell,crew,paddles,body,athletes,pose};
}
export function bakeAnimation(boat,cadence=90){
 const dynamic=[];for(const a of boat.athletes){dynamic.push(...a.bones);if(a.paddle)dynamic.push(a.paddle);}
 const times=[],samples=new Map(dynamic.map(o=>[o,{p:[],q:[],s:[]}]));const frames=80,duration=60/cadence;
 for(let i=0;i<=frames;i++){times.push(i*duration/frames);boat.pose(i===frames?0:i/frames);for(const o of dynamic){const s=samples.get(o);s.p.push(...o.position.toArray());s.q.push(...o.quaternion.toArray());s.s.push(...o.scale.toArray());}}
 const tracks=[];for(const o of dynamic){const s=samples.get(o);tracks.push(new T.VectorKeyframeTrack(o.name+'.position',times,s.p),new T.QuaternionKeyframeTrack(o.name+'.quaternion',times,s.q),new T.VectorKeyframeTrack(o.name+'.scale',times,s.s));}
 boat.pose(.25);return new T.AnimationClip('Rowing_7_Phases_Preview_'+cadence+'SPM',duration,tracks);
}
export function verifyBoat(boat){
 const errors=[],checks={};boat.pose(.25);const b=new T.Box3().setFromObject(boat.body),size=b.getSize(new T.Vector3());
 checks.hullBoundsMeters={min:b.min.toArray(),max:b.max.toArray(),size:size.toArray()};
 for(const [label,a,want] of [['loa',size.x,SPEC.loa],['beam',size.z,SPEC.beam],['maxHullHeight',b.max.y,SPEC.stern]])if(Math.abs(a-want)>.0001)errors.push(label+': '+a+' != '+want);
 const roles={};for(const a of boat.athletes)roles[a.role]=(roles[a.role]||0)+1;checks.roles=roles;
 if(boat.athletes.length!==55 || roles.ROWER!==50 || roles.STEERSMAN!==3 || roles.MID_COMMAND!==1 || roles.PROW_COMMAND!==1)errors.push('Crew distribution');
 checks.thwarts=boat.root.getObjectsByProperty('isMesh',true).filter(o=>/^Thwart_/.test(o.name)).length;if(checks.thwarts!==25)errors.push('Thwart count');
 const edgeCounts=new Map(),index=boat.body.geometry.index.array,positions=boat.body.geometry.attributes.position;let minArea=Infinity;
 for(let i=0;i<index.length;i+=3){const a=index[i],b=index[i+1],c=index[i+2];for(const [x,y]of [[a,b],[b,c],[c,a]]){const k=x<y?x+':'+y:y+':'+x;edgeCounts.set(k,(edgeCounts.get(k)||0)+1);}const pa=new T.Vector3().fromBufferAttribute(positions,a),pb=new T.Vector3().fromBufferAttribute(positions,b),pc=new T.Vector3().fromBufferAttribute(positions,c);minArea=Math.min(minArea,pb.sub(pa).cross(pc.sub(pa)).length()/2);}
 checks.hullTopology={triangles:index.length/3,openOrNonmanifoldEdges:[...edgeCounts.values()].filter(c=>c!==2).length,minTriangleArea:minArea};if(checks.hullTopology.openOrNonmanifoldEdges!==0)errors.push('Hull shell open edges');if(minArea<1e-12)errors.push('Degenerate hull faces');
 let minClearance=Infinity,minShaftClearance=Infinity,gripGap=0,armLengthError=0,worstGrip=null;const gripByRole={};
 for(let frame=0;frame<=80;frame++){boat.pose(frame===80?0:frame/80);for(const a of boat.athletes){for(const gap of a.gripErrors){gripByRole[a.role]=Math.max(gripByRole[a.role]||0,gap);if(gap>gripGap){gripGap=gap;worstGrip={id:a.root.userData.id,role:a.role,phase:frame/80,gap};}}for(const arm of a.arms){const upper=arm.upper.getWorldPosition(new T.Vector3()),elbow=arm.elbow.getWorldPosition(new T.Vector3()),wrist=arm.wrist.getWorldPosition(new T.Vector3());armLengthError=Math.max(armLengthError,Math.abs(upper.distanceTo(elbow)-arm.upperLength),Math.abs(elbow.distanceTo(wrist)-arm.foreLength));}}}
 for(let frame=0;frame<=80;frame++){boat.pose(frame===80?0:frame/80);for(const a of boat.athletes.filter(o=>o.role==='ROWER')){
   const tip=V(0,-SPEC.paddleLength,0).applyQuaternion(a.paddle.quaternion).add(a.paddle.position);const clearance=Math.abs(tip.z)-profile(tip.x).b;minClearance=Math.min(minClearance,clearance);
   const top=a.paddle.position.clone(),direction=Y.clone().applyQuaternion(a.paddle.quaternion);
   for(let sample=0;sample<=24;sample++){const point=top.clone().addScaledVector(direction,-SPEC.paddleLength*sample/24),p=profile(point.x);if(Math.abs(point.x)<15.1 && point.y>p.k && point.y<p.g){const s=Math.pow((point.y-p.k)/(p.g-p.k),1/p.p),boundary=Math.abs(section(point.x,s).z);minShaftClearance=Math.min(minShaftClearance,Math.abs(point.z)-boundary);}}
 }}
 const savedPosition=boat.root.position.clone(),savedRotation=boat.root.quaternion.clone();let translatedGripGap=0;boat.root.position.set(650,.012,-18);boat.root.rotation.y=.13;
 for(let frame=0;frame<=80;frame++){boat.pose(frame===80?0:frame/80);for(const a of boat.athletes)for(const gap of a.gripErrors)translatedGripGap=Math.max(translatedGripGap,gap);}
 boat.root.position.copy(savedPosition);boat.root.quaternion.copy(savedRotation);boat.root.updateMatrixWorld(true);
 checks.animation={sampledPhases:81,translatedSampledPhases:81,translatedMaxHandGripGapM:translatedGripGap,minBladeOutboardClearanceM:minClearance,minShaftClearanceBelowRailM:minShaftClearance,maxHandGripGapM:gripGap,maxArmLengthErrorM:armLengthError,worstGrip,gripByRole};checks.rig={athletes:boat.athletes.length,joints:boat.athletes.reduce((n,a)=>n+a.bones.length,0),skinnedMeshes:boat.athletes.reduce((n,a)=>n+a.meshes.length,0)};if(minClearance<.15)errors.push('Blade penetrates hull');if(minShaftClearance<.019)errors.push('Paddle shaft intersects hull below rail');if(gripGap>.002||translatedGripGap>.002)errors.push('Hands detached from paddles');if(armLengthError>.00001)errors.push('Arm length changes during motion');
 boat.pose(.25);return {pass:errors.length===0,errors,checks,limits:['Dimensions are repository constraints, not field measurements','Hidden livery and interior are inferred','Crew anatomy and stroke animation are illustrative, not motion capture']};
}
