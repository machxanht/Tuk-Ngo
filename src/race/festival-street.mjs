import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { courseZ,nearCourseBridge } from './maspero-layout.mjs';
import { trafficRoad } from './traffic.mjs';

const hash = n => { let x=Math.imul(n+1,0x9e3779b9); x=Math.imul(x^(x>>>16),0x85ebca6b); return ((x^(x>>>13))>>>0)/4294967296; };
const COLORS={ivory:'#eadfc9',teal:'#649b96',clay:'#b56e53',wood:'#72503a',green:'#385f47',dark:'#304346',cream:'#d3c6ad',glass:'#638a91',concrete:'#bcb9a9',trim:'#f1e9d8',metal:'#8a9491',roofTile:'#b56e53',roofTin:'#8a9491'};
function builder() {
 const parts={wall:[],tile:[],tin:[],details:[]};
 function add(geo,key,x,y,z,rotation=[0,0,0]) {
   const q=new T.Quaternion().setFromEuler(new T.Euler(...rotation));geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),q,new T.Vector3(1,1,1)));
   const kind=key==='roofTile'?'tile':key==='roofTin'?'tin':['ivory','cream','clay','teal'].includes(key)?'wall':'details';
   const c=new T.Color(COLORS[key]||key),values=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<values.length;i+=3)values.set(c.toArray(),i);geo.setAttribute('color',new T.BufferAttribute(values,3));
   const p=geo.attributes.position,n=geo.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(kind==='wall'&&Math.abs(n.getX(i))>.6?p.getZ(i):p.getX(i))/2;uv[i*2+1]=(kind==='wall'&&Math.abs(n.getY(i))<.6?p.getY(i):p.getZ(i))/2;}geo.setAttribute('uv',new T.BufferAttribute(uv,2));
   const ready=geo.index?geo.toNonIndexed():geo;if(ready!==geo)geo.dispose();parts[kind].push(ready);
 }
 function box(key,x,y,z,w,h,d,radius=.02,rotation) { const geo=radius>=.04&&Math.min(w,h,d)>.4?new RoundedBoxGeometry(w,h,d,1,Math.min(radius,.035)):new T.BoxGeometry(w,h,d);add(geo,key,x,y,z,rotation); }
 function rod(key,a,b,r,end=r) {const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),g=new T.CylinderGeometry(end,r,v.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));add(g,key,...av.add(bv).multiplyScalar(.5).toArray());}
 function finish() {const result={};for(const [kind,list]of Object.entries(parts)){if(!list.length)continue;result[kind]=mergeGeometries(list,false);list.forEach(g=>g.dispose());}return result;}
 return {add,box,rod,finish};
}
function houseTemplate(templateId) {
 const {add,box,rod,finish}=builder();
  const lots = [
    { x:-20.5,w:6.4,h:3.5,family:'old-tiled-dwelling',color:'ivory' },
    { x:-13.5,w:6.5,h:7.2,family:'shutter-shophouse',color:'teal' },
    { x:-6.3,w:6.6,h:8.3,family:'modern-townhouse',color:'cream' },
    { x:1,w:6.5,h:4.1,family:'open-front-shop',color:'ivory' },
    { x:8.1,w:6.3,h:3.2,family:'tin-local-house',color:'clay' },
    { x:15.2,w:6.5,h:6.8,family:'shutter-shophouse',color:'cream' },
    { x:21.4,w:4.7,h:7.7,family:'modern-townhouse',color:'ivory' },
  ];
  function window(x,y,z,w,h,shutter=false) {
    box('wood',x,y,z,w+.16,h+.16,.14,.018);
    box('glass',x,y,z-.09,w,h,.035,.006);
    box('wood',x,y,z-.13,.06,h,.06,.008);
    box('wood',x,y,z-.13,w,.06,.06,.008);
    if(shutter) for(const sign of [-1,1]) {
      box('teal',x+sign*(w/2+.21),y,z,.34,h+.13,.09,.015);
      for(let dy=-h/2+.1;dy<h/2;dy+=.16) box('dark',x+sign*(w/2+.21),y+dy,z-.055,.29,.035,.025,.002);
    }
    box('trim',x,y-h/2-.11,z-.08,w+.33,.13,.3,.016);
  }
  function door(x,z,wood=true) {
    box('dark',x,1.2,z,1.65,2.4,.14,.012);
    box(wood?'wood':'glass',x,1.19,z-.09,1.48,2.3,.04,.008);
    for(const dx of [-.36,.36]) box('cream',x+dx,1.25,z-.12,.02,2.15,.025,.002);
    rod('metal',[x+.12,1.05,z-.15],[x+.12,1.35,z-.15],.018);
  }
  function roof(l,key,h,z=16.6,depth=7.5,pitch=.32) {
    const half=depth/2, rise=Math.tan(pitch)*half;
    for(const side of [-1,1]) box(key,l.x,h+rise/2,z+side*half/2,l.w+.6,.12,half/Math.cos(pitch)+.08,.014,[side*pitch,0,0]);
    rod(key,[l.x-l.w/2-.3,h+rise+.08,z],[l.x+l.w/2+.3,h+rise+.08,z],.075);
    for(let dx=-l.w/2;dx<l.w/2;dx+=key==='roofTile'?.25:.4) for(const side of [-1,1]) rod(key,[l.x+dx,h+rise+.09,z],[l.x+dx,h+.08,z+side*half],.027);
    // Filled end gables close the roof rather than floating planes.
    const shape=new T.Shape();shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(0,rise);shape.closePath();
    for(const side of [-1,1]) add(new T.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false}),l.color,l.x+side*(l.w/2-.05),h,z,[0,-Math.PI/2,0]);
  }
  function shell(l,front=13.2,depth=7) {
    box(l.color,l.x,l.h/2,front+depth/2,l.w,l.h,depth,.025);
    box('concrete',l.x,.13,front-.15,l.w+.12,.26,.5,.012);
  }
  function rail(x,y,z,w,key='metal') {
    rod(key,[x-w/2,y+.8,z],[x+w/2,y+.8,z],.035);
    for(let dx=-w/2;dx<=w/2+.001;dx+=.32) rod(key,[x+dx,y,z],[x+dx,y+.8,z],.02);
  }
  const i = templateId, original = lots[i], l = {...original, x:0};
  {
    if(l.family==='old-tiled-dwelling') {
      shell(l,14.4,5.8); roof(l,'roofTile',l.h,16.6,8.1,.38);
      box('clay',l.x,.2,13.7,l.w,.4,2,.018);
      box('cream',l.x,.08,12.95,2.3,.16,.4,.015);
      for(const dx of [-l.w/2+.3,0,l.w/2-.3]) box('trim',l.x+dx,1.8,13.05,.25,3.6,.25,.018);
      door(l.x,14.31); window(l.x-1.95,1.9,14.3,1.05,1.8,true);window(l.x+1.95,1.9,14.3,1.05,1.8,true);
      box('trim',l.x,3.3,12.96,l.w+.1,.18,.25,.014);
      rail(l.x-l.w*.34,.45,12.7,l.w*.27,'wood');rail(l.x+l.w*.34,.45,12.7,l.w*.27,'wood');
      for(const dx of [-2.3,2.3]) { add(new T.CylinderGeometry(.22,.16,.45,12),'clay',l.x+dx,.43,13.45); add(new T.SphereGeometry(.36,12,8),'green',l.x+dx,.83,13.45); }
    } else if(l.family==='shutter-shophouse') {
      shell(l);roof(l,'roofTile',l.h,16.7,7.6,.23);
      box('dark',l.x,1.4,13.04,l.w-.5,2.8,.1,.012);
      // Roll-down shutter versus double timber shop doors distinguish the two lots.
      if(i===1) { door(l.x-1.25,12.96,false);window(l.x+1.3,1.65,12.96,1.7,1.7); }
      else { for(let y=.3;y<2.7;y+=.15) box('metal',l.x,y,12.96,l.w-.9,.09,.06,.004); }
      box('clay',l.x,2.9,12.7,l.w-.2,.09,1.2,.016,[.18,0,0]);
      box('trim',l.x,3.4,12.9,l.w+.1,.2,.4,.015);
      box('cream',l.x,3.8,12.4,l.w-.4,.17,1.45,.018);rail(l.x,3.9,11.72,l.w-.7,'wood');
      const count=i===1?2:3;for(let j=0;j<count;j++) window(l.x+(j-(count-1)/2)*(count===2?2.5:1.65),5.3,13.04,count===2?1.25:.85,2.1,true);
      box('trim',l.x,l.h-.25,13.02,l.w+.1,.23,.28,.018);
      box('wood',l.x,3.1,12.55,2.2,.32,.07,.01);
    } else if(l.family==='modern-townhouse') {
      shell(l,13.7,6.5);
      // Vertical narrow bay, concrete frame and flat terrace parapet.
      box('dark',l.x-1.05,4.45,13.55,1.55,6.55,.08,.006);
      for(let y=2.7;y<7.3;y+=2.1) window(l.x-1.05,y,13.5,1.25,1.6);
      box('trim',l.x+l.w*.26,4.2,13.46,l.w*.42,7.8,.27,.012);
      for(let y=4.1;y<7.4;y+=2.2) window(l.x+l.w*.26,y,13.24,l.w*.3,1.5);
      box('concrete',l.x,l.h+.06,16.8,l.w+.22,.19,6.9,.016);
      for(const dx of [-l.w/2+.07,l.w/2-.07]) box('trim',l.x+dx,l.h+.45,16.8,.18,.8,6.8,.012);
      box('trim',l.x,l.h+.45,13.4,l.w,.8,.18,.012);
      // Setback gated entry, not a storefront awning.
      door(l.x-.25,13.57,false);
      box('concrete',l.x,.03,12.95,l.w,.06,1.1,.008);
      for(let dx=-l.w/2+.2;dx<l.w/2;dx+=.22) rod('metal',[l.x+dx,.1,12.4],[l.x+dx,1.65,12.4],.02);
      box('metal',l.x,.92,12.4,l.w-.2,.055,.06,.007);
      box('clay',l.x+l.w*.32,3.05,13.17,.7,.32,.45,.045);
      add(new T.SphereGeometry(.38,12,8),'green',l.x+l.w*.32,3.32,13.17);
    } else if(l.family==='open-front-shop') {
      // Real 4m-deep open bay: floor, rear wall, side wall and small cafe fixtures.
      box('cream',l.x,.05,16.2,l.w,.1,6.6,.008);
      box(l.color,l.x,l.h/2,19.3,l.w,l.h,.3,.022);
      box(l.color,l.x+l.w/2-.15,l.h/2,16.2,.3,l.h,6.3,.022);
      box(l.color,l.x,l.h-.22,16.2,l.w,.44,6.6,.022);
      for(const dx of [-l.w/2+.18,l.w/2-.18]) box('wood',l.x+dx,1.9,13.05,.18,3.8,.18,.014);
      roof(l,'roofTin',l.h,16.2,7.1,.18);
      box('teal',l.x,3.2,12.65,l.w+.2,.1,1.2,.012,[.16,0,0]);
      box('wood',l.x+1.15,.55,16.9,2.4,1.1,.75,.02);
      box('trim',l.x+1.15,1.16,16.9,2.5,.11,.85,.018);
      for(let y=1.35;y<2.8;y+=.65) box('wood',l.x+1.2,y,19.07,2.5,.08,.4,.008);
      for(let j=0;j<9;j++) add(new T.CylinderGeometry(.08,.08,.28,8),j%2?'teal':'clay',l.x+.2+(j%3)*.7,1.53+Math.floor(j/3)*.65,18.85);
      for(const [dx,dz] of [[-1.35,14.9],[-1.35,17.4]]) {
        add(new T.CylinderGeometry(.62,.62,.08,16),'wood',l.x+dx,.78,dz);rod('metal',[l.x+dx,0,dz],[l.x+dx,.74,dz],.055);
        for(const a of [0,2.1,4.2]) { const sx=l.x+dx+Math.cos(a)*.88,sz=dz+Math.sin(a)*.88;add(new T.CylinderGeometry(.24,.24,.08,12),'clay',sx,.42,sz);for(const d of [-.12,.12]) rod('wood',[sx+d,0,sz],[sx+d,.4,sz],.025); }
      }
      box('wood',l.x,3.53,12.57,2.5,.32,.09,.014);
    } else {
      shell(l,14.25,5.7);roof(l,'roofTin',l.h,16.7,7.7,.3);
      door(l.x-.85,14.16);window(l.x+1.45,1.85,14.16,1.3,1.2,true);
      box('roofTin',l.x,2.75,13.38,l.w+.2,.08,1.7,.012,[.12,0,0]);
      for(const dx of [-l.w/2+.15,l.w/2-.15]) rod('wood',[l.x+dx,0,12.6],[l.x+dx,2.6,12.6],.055);
      box('wood',l.x,.45,13.25,1.8,.12,.5,.018);
      for(const dx of [-.65,.65]) box('wood',l.x+dx,.2,13.25,.12,.4,.45,.008);
      // Small side vent and restrained exposed foundation band.
      box('concrete',l.x,.32,14.13,l.w,.42,.08,.004);
      window(l.x,2.8,14.14,.75,.28);
    }
  }

  const result=finish();for(const g of Object.values(result))g.translate(0,0,-12.4);
  return {parts:result,family:original.family,width:original.w};
}
function plantTemplate(kind) {
 const {add,box,rod,finish}=builder();
 const trunk=kind===4?6.5:kind===2?5.1:3.9;
 rod('wood',[0,0,0],[.13,trunk,0],kind===4?.14:.19, .07);
 if(kind===4) {
   for(let n=0;n<11;n++){const a=n*Math.PI*2/11;
     const points=Array.from({length:8},(_,j)=>{const t=j/7;return [.13+Math.cos(a)*t*3.1,trunk+.6*Math.sin(t*Math.PI)-t*1.3,Math.sin(a)*t*3.1];});
     for(let j=0;j<7;j++)rod('green',points[j],points[j+1],.022,.009);
     for(let j=1;j<7;j++)for(const side of[-1,1]){const p=new T.Vector3(...points[j]),w=.66*Math.sin(j/7*Math.PI),q=p.clone().add(new T.Vector3(Math.cos(a+side*.9)*w,-.17,Math.sin(a+side*.9)*w)),mid=p.clone().lerp(q,.45),v=new T.Vector3(-Math.sin(a)*.06,0,Math.cos(a)*.06),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...p.toArray(),...mid.clone().add(v).toArray(),...q.toArray(),...p.toArray(),...q.toArray(),...mid.clone().sub(v).toArray()],3));g.computeVertexNormals();add(g,'green',0,0,0);}
   }
 } else {
   const count=kind===3?10:7;
   for(let i=0;i<count;i++){const a=i*2.4+kind,r=kind===0?1.4:kind===1?.75:kind===2?1.05:1.9, x=Math.cos(a)*r*(i%3?.9:.4),z=Math.sin(a)*r,y=trunk+(i%3)*.4;
     rod('wood',[.1,trunk*.65,0],[x,y,z],.07,.025);
     const g=new T.SphereGeometry(1,12,8);g.scale(kind===1?.75:kind===2?.95:1.4,kind===1?1.45:kind===2?1.5:.85,kind===1?.75:kind===2?.95:1.3);add(g,i%2?'green':'#668447',x,y,z);
   }
 }
 if(kind!==4)box('concrete',0,.13,0,1.2,.26,1.2,.04);
 return finish();
}
function stallTemplate() {
 const {add,box,rod,finish}=builder();
 for(const x of[-1.3,1.3])for(const z of[-.6,.6])rod('wood',[x,0,z],[x,2.4,z],.045);
 box('teal',0,2.5,0,3,.1,1.9,.01,[.13,0,0]);box('wood',0,.6,0,2.6,1.2,.6,.01);box('trim',0,1.24,0,2.7,.08,.8,.01);
 for(let j=0;j<7;j++){add(new T.CylinderGeometry(.10,.12,.13,10),j%2?'clay':'trim',-.9+j*.3,1.34,-.1);}
 return finish();
}
function excluded(x,side){return nearCourseBridge(x,22)||(side<0?x>994&&x<1184:x>981&&x<1184);}
function bridgeGap(x){return nearCourseBridge(x,22);}
/** Detailed foreground street only; caller retains road/promena�de floors and mapped distant mass. */
export function buildFestivalStreet(parent,bankMaterials={}) {
 const group=new T.Group();group.name='Festival_Street_V21';parent.add(group);
 const people=[],batches=[],templates=Array.from({length:7},(_,i)=>houseTemplate(i)),plants=Array.from({length:5},(_,i)=>plantTemplate(i)),stall=stallTemplate(),dummy=new T.Object3D(),ownedMaterials=new Set();
 const materialFor=(kind,leaves=false)=>{
   const src=bankMaterials[kind],m=src?src.clone():new T.MeshStandardMaterial({vertexColors:true,roughness:.85});m.vertexColors=true;m.side=T.DoubleSide;
   if(src){const strength=kind==='wall'?.07:.2;m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',`sampledDiffuseColor.rgb=mix(vec3(1.),sampledDiffuseColor.rgb,${strength.toFixed(2)});diffuseColor *= sampledDiffuseColor;`));};m.customProgramCacheKey=()=> 'festival-crowd-'+kind;if(m.normalMap)m.normalScale.set(.12,.12);}
   if(leaves){m.onBeforeCompile=s=>{s.uniforms.ambientTime={value:0};m.userData.shader=s;s.vertexShader='uniform float ambientTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(ambientTime*.8 + instanceMatrix[3].x*.11 + instanceMatrix[3].z*.17 + position.y*1.4 + position.z*.7)*.025*max(position.y-2.,0.);');};m.customProgramCacheKey=()=> 'festival-crowd-leaves';}
   ownedMaterials.add(m);return m;
 };
 const mats={wall:materialFor('wall'),tile:materialFor('tile'),tin:materialFor('tin'),details:materialFor('details')},plantMat=materialFor('details',true);
 const lots=[],trees=[],stalls=[],families={};let previousFamily=null;
 for(const side of[-1,1])for(let x=854,id=0;x<2430;id++){
   const seed=id+(side+1)*971;let template=Math.floor(hash(seed+1)*7);if(templates[template].family===previousFamily)template=(template+1)%7;if(templates[template].family===previousFamily)template=(template+1)%7;const t=templates[template],widthScale=.91+hash(seed+97)*.22;previousFamily=t.family;
   if(!bridgeGap(x)){const z=trafficRoad(x,side)+side*9.5,slope=(trafficRoad(x+.2,side)-trafficRoad(x-.2,side))/.4;
     lots.push({x,y:1.39,z,yaw:-Math.atan(slope)+(side<0?Math.PI:0),sx:widthScale,sy:.92+hash(seed+13)*.16,sz:.9+hash(seed+81)*.22,template,tint:new T.Color().setHSL(.09+hash(seed+9)*.02,.04,.88+hash(seed+44)*.1)});families[t.family]=(families[t.family]||0)+1;
     // People in shop forecourts; avoid stands only for riverward bank placement.
     if(hash(seed+55)<.68){const front=z-side*.75;people.push({x:x-.9,floor:1.4,z:front,id:21000+seed*4,seated:false,activity:'walk',path:{dx:1,dz:slope,extent:1+hash(seed+29)*1.3},yaw:Math.PI/2});}
     if(hash(seed+56)<.45)people.push({x:x+.9,floor:1.4,z:z-side*.35,id:21001+seed*4,seated:false,activity:'talk',yaw:side<0?0:Math.PI});
     if(t.family==='open-front-shop'){
       people.push({x:x+(side<0?-1.15:1.15),floor:1.49,z:z+side*5.1,id:21002+seed*4,seated:false,activity:'vendor',yaw:side<0?0:Math.PI});
       people.push({x:x+(side<0?1.2:-1.2),floor:1.49,z:z+side*1.4,id:41000+seed*3,seated:false,activity:'eat',yaw:side<0?0:Math.PI});
       people.push({x:x+(side<0?-1.1:1.1),floor:1.49,z:z+side*3.2,id:41001+seed*3,seated:false,activity:'talk',yaw:side<0?Math.PI:0});
     }
   }
   x+=t.width*widthScale+.3+hash(seed+24)*.6;
 }
 for(const side of[-1,1])for(let x=858,id=0;x<2430;x+=15.5+hash(id+7)*10,id++){
   if(excluded(x,side))continue;const kind=Math.floor(hash(id+side*17+118)*5);
   trees.push({x,y:1.4,z:courseZ(x,side*52.3),yaw:hash(id+31)*6.28,sx:.78+hash(id+19)*.28,sy:.8+hash(id+20)*.3,sz:.8+hash(id+19)*.28,template:kind});
   if(id%3===0)trees.push({x:x+6,y:1.39,z:trafficRoad(x+6,side)+side*8.3,yaw:hash(id+2)*6.28,sx:.65,sy:.7,sz:.65,template:(kind+2)%5});
 }
 for(const side of[-1,1])for(let x=862,id=0;x<2430;x+=31,id++){
   if(excluded(x,side)||trees.some(t=>Math.sign(t.z)===side&&Math.abs(t.x-x)<3.5))continue;const z=courseZ(x,side*52.1);stalls.push({x,y:1.4,z,yaw:side<0?Math.PI:0,sx:1,sy:1,sz:1});
   people.push({x:x-.4,floor:1.4,z:z+side*.6,id:31000+(side+1)*700+id*8,seated:false,activity:'vendor',yaw:side<0?0:Math.PI});
   people.push({x:x+.6,floor:1.4,z:z-side*.9,id:31001+(side+1)*700+id*8,seated:false,activity:'eat',yaw:side<0?Math.PI:0});
   // Table/chairs sit on the same promenade floor; seated actor origin remains floor.
   people.push({x:x+(side<0?-2.35:2.35),floor:1.4,z:z-.05,id:31002+(side+1)*700+id*8,seated:true,seatY:1.92,activity:'eat',yaw:side<0?Math.PI/2:-Math.PI/2});
 }
 // Two busy sidewalk corridors remain outside road lanes and frontage piers.
 for(const side of[-1,1])for(let row=0;row<2;row++)for(let x=853,id=0;x<2436;x+=2.25,id++){
   if(nearCourseBridge(x,27))continue;
   const seed=5000+(side+1)*1801+row*997+id,extent=1.7+hash(seed+8)*.5;
   const px=x+(hash(seed+2)-.5)*.6,pz=trafficRoad(px,side)+side*(row===0?7.3:8.6)+(hash(seed+3)-.5)*.25;
   if(trees.some(t=>Math.abs(t.z-pz)<1.35&&Math.abs(t.x-px)<extent+1.2))continue;
   if(stalls.some(t=>Math.hypot(t.x-px,t.z-pz)<1.5))continue;
   const walking=hash(seed+7)<.68,slope=(trafficRoad(x+.2,side)-trafficRoad(x-.2,side))/.4;
   people.push({x:px,floor:1.4,z:pz,id:60000+seed,zone:'roadside-sidewalk',seated:false,activity:walking?'walk':hash(seed+9)<.5?'talk':'eat',yaw:walking?(hash(seed+10)<.5?Math.PI/2:-Math.PI/2):side<0?0:Math.PI,...(walking?{path:{dx:1,dz:slope,extent}}:{})});
 }
 for(const p of people){p.width=.92;p.height=1;p.shirt='#c6aa7c';}
 function instance(parts,list,label,materialOverride=null,range=180){
   for(const [kind,g]of Object.entries(parts)){const mesh=new T.InstancedMesh(g,materialOverride||mats[kind],list.length);mesh.name=label+'_'+kind;mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=!materialOverride;mesh.count=0;group.add(mesh);batches.push({mesh,list,range,fade:false});}
 }
 templates.forEach((t,i)=>instance(t.parts,lots.filter(l=>l.template===i),'Festival_Frontage_'+i,null,125));
 plants.forEach((t,i)=>instance(t,trees.filter(l=>l.template===i),'Festival_Tree_'+i,plantMat,220));
 instance(stall,stalls,'Festival_Food_Stall',null,180);
 // Simple distant roof/wall silhouettes keep the skyline between detailed neighborhoods.
 const farBuilder=builder();farBuilder.box('ivory',0,2.1,3.6,6.4,4.2,7.2,.01);farBuilder.box('roofTin',0,4.3,3.6,6.8,.2,7.5,.01);const far=farBuilder.finish();instance(far,lots,'Festival_Distant_Lots',null,440);for(const b of batches)if(b.mesh.name.startsWith('Festival_Distant'))b.fade=true;
 // Shared small table and stool geometry at stall patrons, batched globally.
 const furniture=builder();furniture.add(new T.CylinderGeometry(.5,.5,.09,12),'wood',2.8,.78,0);furniture.rod('metal',[2.8,0,0],[2.8,.73,0],.055);furniture.add(new T.CylinderGeometry(.23,.23,.08,10),'clay',2.35,.43,0);for(const dx of[-.13,.13])furniture.rod('wood',[2.35+dx,0,0],[2.35+dx,.4,0],.025);const furnitureParts=furniture.finish();instance(furnitureParts,stalls,'Festival_Stall_Seats',null,150);
 const stats={version:21,houses:lots.length,frontageFamilies:families,trees:trees.length,treeSilhouettes:5,foodStalls:stalls.length,people:people.length,roadsidePeople:people.filter(p=>p.zone==='roadside-sidewalk').length,activityCounts:people.reduce((a,p)=>(a[p.activity]=(a[p.activity]||0)+1,a),{}),drawCalls:batches.length,geometryTriangles:0,visibleHouses:0,visibleInstances:0,submittedTriangles:0,range:{detailedHouses:125,distantHouses:440,trees:220,stalls:180},source:'Original regional architectural study; not measured Maspero facades'};
 const unique=new Set();for(const b of batches)if(!unique.has(b.mesh.geometry)){unique.add(b.mesh.geometry);stats.geometryTriangles+=(b.mesh.geometry.index?.count||b.mesh.geometry.attributes.position.count)/3;}
 function update(time,cameraX=1090,cameraZ=0){let visible=0,tri=0;for(const b of batches){let count=0;for(const p of b.list){const d=Math.hypot(p.x-cameraX,(p.z-cameraZ)*.45);if(d>b.range||(b.fade&&d<120))continue;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();b.mesh.setMatrixAt(count,dummy.matrix);if(p.tint)b.mesh.setColorAt(count,p.tint);count++;}b.mesh.count=count;b.mesh.visible=count>0;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;visible+=count;tri+=count*(b.mesh.geometry.index?.count||b.mesh.geometry.attributes.position.count)/3;}for(const m of ownedMaterials)if(m.userData.shader)m.userData.shader.uniforms.ambientTime.value=time;stats.visibleHouses=lots.filter(p=>Math.abs(p.x-cameraX)<125).length;stats.visibleInstances=visible;stats.submittedTriangles=tri;}
 update(0,1090,0);group.userData={festivalStreet:stats};
 return {group,stats,people,update,dispose(){group.removeFromParent();for(const b of batches)b.mesh.dispose();unique.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());group.clear();}};
}
