import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { courseZ,nearCourseBridge } from './maspero-layout.mjs';
import { trafficRoad } from './traffic.mjs';

const hash = n => { let x=Math.imul(n+1,0x9e3779b9); x=Math.imul(x^(x>>>16),0x85ebca6b); return ((x^(x>>>13))>>>0)/4294967296; };
const COLORS={ivory:'#fff0d4',teal:'#49aeba',clay:'#d98863',wood:'#886044',green:'#4b9451',dark:'#304e60',cream:'#ebddbf',glass:'#6ba9bf',concrete:'#c6c5b4',trim:'#fff8df',metal:'#96abae',roofTile:'#cb7956',roofTin:'#84a4ad'};
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
    { x:0,w:9.2,h:4.6,family:'garden-veranda',color:'#e8d58e' },
    { x:0,w:5.7,h:4.4,family:'raised-wood-house',color:'wood' },
    { x:0,w:5.5,h:8.5,family:'balcony-shophouse',color:'#9fcbd4' },
    { x:0,w:8.8,h:4.7,family:'covered-market',color:'ivory' },
    { x:0,w:7.4,h:6.2,family:'corner-cafe',color:'#f0c7ae' },
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
    } else if(l.family==='garden-veranda') {
      shell(l,15,6.3);roof(l,'roofTile',l.h,17.4,8.1,.4);
      for(const dx of[-3.8,0,3.8]){box('trim',dx,1.9,12.8,.23,3.8,.23);box('clay',dx,.24,12.8,.43,.48,.43);}
      box('cream',0,.15,13.4,l.w+.1,.3,3.2);box('trim',0,3.8,13.4,l.w+.4,.2,2.8);door(0,14.9);for(const dx of[-2.7,2.7])window(dx,2.1,14.9,1.25,1.8,true);
      for(const dx of[-3.4,3.4]){rail(dx,.3,11.8,2.3,'wood');add(new T.CylinderGeometry(.3,.2,.5,8),'clay',dx,.55,13.6);add(new T.SphereGeometry(.52,10,6),'green',dx,1.1,13.6);}
    } else if(l.family==='raised-wood-house') {
      box('wood',0,3.0,17,l.w,2.9,6.6);roof(l,'roofTin',4.45,17,7.5,.4);
      for(const dx of[-2.45,0,2.45])for(const z of[13.5,19.7])rod('wood',[dx,0,z],[dx,2.0,z],.09);
      box('clay',0,1.48,13.65,l.w,.16,1.2);rail(-1.9,1.55,13.0,1.7,'wood');rail(1.9,1.55,13.0,1.7,'wood');
      box('dark',0,2.7,13.65,1.45,2.3,.06);window(-1.7,3.1,13.65,.9,1.1,true);window(1.7,3.1,13.65,.9,1.1,true);
      for(let step=0;step<6;step++)box('wood',0,.13+step*.24,11.2+step*.36,1.15,.18,.40);
      for(let x=-2.6;x<2.7;x+=.27)box('#6f543c',x,3,13.63,.025,2.7,.05);
    } else if(l.family==='balcony-shophouse') {
      shell(l,13.5,6.8);door(0,13.4,false);
      for(const y of[3.1,5.8]){box('trim',0,y,12.75,l.w+.2,.17,1.65);rail(0,y+.14,11.93,l.w-.2);for(const dx of[-1.35,1.35])window(dx,y+1.28,13.4,1.05,1.85,true);}
      box('trim',0,l.h+.35,13.5,l.w+.2,.7,.2);for(const dx of[-2.55,2.55])box('trim',dx,4.35,13.25,.2,8.7,.25);roof(l,'roofTin',8.55,17,7,.12);
      add(new T.CylinderGeometry(.24,.18,.4,8),'clay',1.8,3.4,12.1);add(new T.SphereGeometry(.48,10,6),'green',1.8,3.8,12.1);
    } else if(l.family==='covered-market') {
      box('cream',0,.1,16.5,l.w,.2,7.5);box('ivory',0,2.2,20.1,l.w,4.4,.22);roof(l,'roofTile',4.45,16.5,8.2,.38);
      for(const dx of[-4,-1.4,1.4,4])rod('teal',[dx,.1,12.75],[dx,4.4,12.75],.075);
      box('wood',0,.75,15.3,7,1.3,.95);box('trim',0,1.45,15.3,7.2,.12,1.05);
      for(let n=0;n<12;n++){const x=-3.2+n*.58;add(new T.SphereGeometry(.17,8,5),n%2?'#e6aa39':'#69aa53',x,1.65,15.25);add(new T.CylinderGeometry(.16,.12,.25,8),'clay',x,1.61,15.6);}
      box('teal',0,3.6,12.65,l.w,.65,.1);
    } else if(l.family==='corner-cafe') {
      shell(l,14.3,6.5);roof(l,'roofTile',6.25,17.2,7.8,.25);
      for(const dx of[-2.5,0,2.5]){window(dx,4.8,14.18,1.3,1.65,true);rod('trim',[dx,0,12.2],[dx,3.1,12.2],.065);}
      box('dark',0,1.45,14.15,6.4,2.8,.08);box('trim',0,3.15,13.0,7.8,.12,2.8,.01,[.1,0,0]);
      for(let n=0;n<12;n++)box(n%2?'teal':'trim',-3.55+n*.64,3.22,12.9,.6,.025,2.6,.004,[.1,0,0]);
      for(const x of[-2.5,0,2.5]){add(new T.CylinderGeometry(.46,.46,.08,12),'wood',x,.78,13.0);rod('metal',[x,0,13],[x,.75,13],.045);for(const z of[12.2,13.8])add(new T.CylinderGeometry(.23,.23,.44,8),'clay',x,.22,z);}
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
 const trunk=kind===4?6.5:kind===6?8.4:kind===5?2.6:kind===7?2.8:kind===8?5.8:kind===2?5.1:3.9;
 rod('wood',[0,0,0],[.13,trunk,0],kind===4?.14:.19, .07);
 if(kind===4||kind===6) {
   for(let n=0;n<11;n++){const a=n*Math.PI*2/11;
     const points=Array.from({length:8},(_,j)=>{const t=j/7;return [.13+Math.cos(a)*t*3.1,trunk+.6*Math.sin(t*Math.PI)-t*1.3,Math.sin(a)*t*3.1];});
     for(let j=0;j<7;j++)rod('green',points[j],points[j+1],.022,.009);
     for(let j=1;j<7;j++)for(const side of[-1,1]){const p=new T.Vector3(...points[j]),w=.66*Math.sin(j/7*Math.PI),q=p.clone().add(new T.Vector3(Math.cos(a+side*.9)*w,-.17,Math.sin(a+side*.9)*w)),mid=p.clone().lerp(q,.45),v=new T.Vector3(-Math.sin(a)*.06,0,Math.cos(a)*.06),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...p.toArray(),...mid.clone().add(v).toArray(),...q.toArray(),...p.toArray(),...q.toArray(),...mid.clone().sub(v).toArray()],3));g.computeVertexNormals();add(g,'green',0,0,0);}
   }
 } else if(kind===5) {
   for(let n=0;n<8;n++){const a=n*2.4,shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.8,.7,2.1,.55,2.9,0);shape.bezierCurveTo(2,-.45,.8,-.5,0,0);const g=new T.ShapeGeometry(shape,8);g.rotateX(-Math.PI/2);g.rotateY(a);g.rotateZ((n%3-1)*.14);add(g,n%2?'#77bb4b':'#459347',0,trunk+(n%3)*.12,0);rod('green',[0,trunk,0],[Math.cos(a)*2.5,trunk-.2,Math.sin(a)*2.5],.035);}
 } else {
   const count=kind===3?10:7;
   for(let i=0;i<count;i++){const a=i*2.4+kind,r=kind===0?1.4:kind===1?.75:kind===2?1.05:1.9, x=Math.cos(a)*r*(i%3?.9:.4),z=Math.sin(a)*r,y=trunk+(i%3)*.4;
     rod('wood',[.1,trunk*.65,0],[x,y,z],.07,.025);
     const g=new T.SphereGeometry(1,10,7);g.scale(kind===8?2.1:kind===7?.85:kind===1?.75:kind===2?.95:1.4,kind===8?.7:kind===1?1.45:kind===2?1.5:.85,kind===8?1.9:kind===7?.75:kind===1?.75:kind===2?.95:1.3);add(g,kind===7?(i%3?'#5a9c42':'#83ad51'):i%2?'green':'#79a855',x,y,z);
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
 const people=[],batches=[],templates=Array.from({length:12},(_,i)=>houseTemplate(i)),plants=Array.from({length:9},(_,i)=>plantTemplate(i)),stall=stallTemplate(),dummy=new T.Object3D(),ownedMaterials=new Set(),extraGeometry=[];
 const materialFor=(kind,leaves=false)=>{
   const src=bankMaterials[kind],m=src?src.clone():new T.MeshStandardMaterial({vertexColors:true,roughness:.85});m.vertexColors=true;m.side=T.DoubleSide;
   if(src){const strength=kind==='wall'?.07:.2;m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',`sampledDiffuseColor.rgb=mix(vec3(1.),sampledDiffuseColor.rgb,${strength.toFixed(2)});diffuseColor *= sampledDiffuseColor;`));};m.customProgramCacheKey=()=> 'festival-crowd-'+kind;if(m.normalMap)m.normalScale.set(.12,.12);}
   if(leaves){m.onBeforeCompile=s=>{s.uniforms.ambientTime={value:0};m.userData.shader=s;s.vertexShader='uniform float ambientTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(ambientTime*.8 + instanceMatrix[3].x*.11 + instanceMatrix[3].z*.17 + position.y*1.4 + position.z*.7)*.025*max(position.y-2.,0.);');};m.customProgramCacheKey=()=> 'festival-crowd-leaves';}
   ownedMaterials.add(m);return m;
 };
 const mats={wall:materialFor('wall'),tile:materialFor('tile'),tin:materialFor('tin'),details:materialFor('details')},plantMat=materialFor('details',true);
 const lots=[],trees=[],stalls=[],families={};let previousFamily=null;
 for(const side of[-1,1])for(let x=854,id=0;x<2430;id++){
   const seed=id+(side+1)*971;let template=Math.floor(hash(seed+1)*templates.length);if(templates[template].family===previousFamily)template=(template+1)%templates.length;if(templates[template].family===previousFamily)template=(template+1)%templates.length;const t=templates[template],widthScale=.91+hash(seed+97)*.22;previousFamily=t.family;
   if(!bridgeGap(x)){const z=trafficRoad(x,side)+side*9.5,slope=(trafficRoad(x+.2,side)-trafficRoad(x-.2,side))/.4;
     lots.push({x,y:1.39,z,yaw:-Math.atan(slope)+(side<0?Math.PI:0),sx:widthScale,sy:.92+hash(seed+13)*.16,sz:.9+hash(seed+81)*.22,template,tint:new T.Color().setHSL(.09+hash(seed+9)*.02,.04,.88+hash(seed+44)*.1)});families[t.family]=(families[t.family]||0)+1;
     // People in shop forecourts; avoid stands only for riverward bank placement.
     if(hash(seed+55)<.68){const front=z-side*.75;people.push({x:x-.9,floor:1.4,z:front,id:21000+seed*4,seated:false,activity:'walk',path:{dx:1,dz:slope,extent:1+hash(seed+29)*1.3},yaw:Math.PI/2});}
     if(hash(seed+56)<.45)people.push({x:x+.9,floor:1.4,z:z-side*.35,id:21001+seed*4,seated:false,activity:'talk',yaw:side<0?0:Math.PI});
     if(['open-front-shop','covered-market','corner-cafe'].includes(t.family)){
       people.push({x:x+(side<0?-1.15:1.15),floor:1.49,z:z+side*5.1,id:21002+seed*4,seated:false,activity:'vendor',yaw:side<0?0:Math.PI});
       people.push({x:x+(side<0?1.2:-1.2),floor:1.49,z:z+side*1.4,id:41000+seed*3,seated:false,activity:'eat',yaw:side<0?0:Math.PI});
       people.push({x:x+(side<0?-1.1:1.1),floor:1.49,z:z+side*3.2,id:41001+seed*3,seated:false,activity:'talk',yaw:side<0?Math.PI:0});
     }
   }
   x+=t.width*widthScale+.3+hash(seed+24)*.6;
 }
 for(const side of[-1,1])for(let x=858,id=0;x<2430;x+=15.5+hash(id+7)*10,id++){
   if(excluded(x,side))continue;const kind=Math.floor(hash(id+side*17+118)*plants.length);
   trees.push({x,y:1.4,z:courseZ(x,side*52.3),yaw:hash(id+31)*6.28,sx:.78+hash(id+19)*.28,sy:.8+hash(id+20)*.3,sz:.8+hash(id+19)*.28,template:kind});
   if(id%3===0)trees.push({x:x+6,y:1.39,z:trafficRoad(x+6,side)+side*8.3,yaw:hash(id+2)*6.28,sx:.65,sy:.7,sz:.65,template:(kind+2)%plants.length});
 }
 for(const side of[-1,1])for(let x=862,id=0;x<2430;x+=31,id++){
   if(excluded(x,side)||trees.some(t=>Math.sign(t.z)===side&&Math.abs(t.x-x)<3.5))continue;const z=courseZ(x,side*52.1);stalls.push({x,y:1.4,z,yaw:side<0?Math.PI:0,sx:1,sy:1,sz:1});
   people.push({x:x-.4,floor:1.4,z:z+side*.6,id:31000+(side+1)*700+id*8,seated:false,activity:'vendor',yaw:side<0?0:Math.PI});
   people.push({x:x+.6,floor:1.4,z:z-side*.9,id:31001+(side+1)*700+id*8,seated:false,activity:'eat',yaw:side<0?Math.PI:0});
   // Table/chairs sit on the same promenade floor; seated actor origin remains floor.
   people.push({x:x+(side<0?-2.35:2.35),floor:1.4,z:z-.05,id:31002+(side+1)*700+id*8,seated:true,seatY:1.92,activity:'eat',yaw:side<0?Math.PI/2:-Math.PI/2});
 }
 // Two busy sidewalk corridors remain outside road lanes and frontage piers.
 // Irregular sidewalk clusters, with enough room between bodies and shops.
 const occupied=new Map();
 for(const side of[-1,1])for(let i=0;i<12500;i++){
   const seed=58001+i+(side+1)*17003,px=853+hash(seed)*1583;
   if(nearCourseBridge(px,27))continue;
   const pz=trafficRoad(px,side)+side*(7.1+hash(seed+31)*3.05),key=Math.floor(px/.52)+':'+Math.floor(pz/.52);
   const cellX=Math.floor(px/.52),cellZ=Math.floor(pz/.52);let blocked=false;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const q=occupied.get((cellX+dx)+':'+(cellZ+dz));if(q&&Math.hypot(q.x-px,q.z-pz)<.50)blocked=true;}
   if(occupied.has(key)||blocked||trees.some(t=>Math.abs(t.z-pz)<1.1&&Math.abs(t.x-px)<1.3)||stalls.some(t=>Math.hypot(t.x-px,t.z-pz)<1.5))continue;
   occupied.set(key,{x:px,z:pz});const walking=hash(seed+7)<.58,slope=(trafficRoad(px+.2,side)-trafficRoad(px-.2,side))/.4;
   people.push({x:px,floor:1.4,z:pz,id:60000+seed,zone:'roadside-sidewalk',seated:false,activity:walking?'walk':['talk','eat','wave','clap'][Math.floor(hash(seed+9)*4)],yaw:walking?(hash(seed+10)<.5?Math.PI/2:-Math.PI/2):hash(seed+11)*Math.PI*2,...(walking?{path:{dx:1,dz:slope,extent:.45+hash(seed+8)*.5}}:{})});
 }
 for(const p of people){p.width=.92;p.height=1;p.shirt='#c6aa7c';}
 function instance(parts,list,label,materialOverride=null,range=180){
   for(const [kind,g]of Object.entries(parts)){const mesh=new T.InstancedMesh(g,materialOverride||mats[kind],list.length);mesh.name=label+'_'+kind;mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=!materialOverride;mesh.count=0;group.add(mesh);batches.push({mesh,list,range,fade:false});}
 }
 templates.forEach((t,i)=>instance(t.parts,lots.filter(l=>l.template===i),'Festival_Frontage_'+i,null,125));
 plants.forEach((t,i)=>instance(t,trees.filter(l=>l.template===i),'Festival_Tree_'+i,plantMat,440));
 instance(stall,stalls,'Festival_Food_Stall',null,180);
 // Three roof silhouettes retain the street's character between detail ranges.
 const neighborhoods=[];
 const laneMaterial=new T.MeshLambertMaterial({color:'#a0a894'});ownedMaterials.add(laneMaterial);
 for(const side of[-1,1])for(let row=0;row<6;row++){
  const g=new T.BoxGeometry(1200,.045,3.5,48,1,1);g.translate(1456,1.27,side*(98+row*22));const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,courseZ(p.getX(i),p.getZ(i)));g.computeVertexNormals();extraGeometry.push(g);group.add(new T.Mesh(g,laneMaterial));
 }
 for(const side of[-1,1])for(let row=0;row<6;row++)for(let x=862,id=0;x<2050;x+=12.5,id++){
  if(nearCourseBridge(x,20))continue;const seed=12000+id+row*211+(side+1)*433;
  neighborhoods.push({x:x+(hash(seed)-.5)*3,y:1.39,z:courseZ(x,side*(101+row*22)),yaw:side<0?Math.PI:0,sx:.85+hash(seed+2)*.45,sy:.58+hash(seed+3)*.35,sz:.82+hash(seed+4)*.3,template:Math.floor(hash(seed+5)*3),tint:new T.Color().setHSL(hash(seed+6)*.1,.04,.93)});
 }
 // Backyard groves are scattered around homes, with clear inland lanes.
 // Positions come from independent seeds, never a repeated row of trees.
 const inlandCanopy=[];
 for(const side of[-1,1])for(let i=0;i<2400;i++){
  const seed=93001+i+(side+1)*3907,x=856+hash(seed)*1582,depth=108+hash(seed+3)*137;
  if(nearCourseBridge(x,25)||Array.from({length:6},(_,r)=>98+r*22).some(lane=>Math.abs(depth-lane)<3.5))continue;
  const z=courseZ(x,side*depth);
  if(neighborhoods.some(p=>Math.abs(p.x-x)<4.2*p.sx&&Math.abs(p.z-z)<6.0*p.sz))continue;
  const scale=.95+hash(seed+5)*.9,tree={x,y:1.39,z,yaw:hash(seed+4)*6.28,sx:scale,sy:scale,sz:scale,template:[0,2,4,6,8][Math.floor(hash(seed+6)*5)]};
  trees.push(tree);inlandCanopy.push(tree);
 }
 // The plant batches were created before the inland roofs. Add separate
 // instanced batches for these groves, reusing the same cached geometries.
 plants.forEach((t,i)=>instance(t,inlandCanopy.filter(p=>p.template===i),'Festival_Backyard_Grove_'+i,plantMat,540));
 for(let variant=0;variant<3;variant++){
   const fb=builder(),height=variant===0?6.6:variant===1?3.5:4.5;
   fb.box(variant===0?'teal':variant===1?'ivory':'cream',0,height/2,3.6,6.4,height,7.2,.01);
   if(variant===0){fb.box('trim',0,height+.2,3.6,6.7,.4,7.5,.01);fb.box('glass',0,4.1,-.03,3.7,1.6,.03);}
   else for(const side of[-1,1])fb.box(variant===1?'roofTile':'roofTin',0,height+.55,3.6+side*1.9,6.8,.14,4.1,.01,[side*.28,0,0]);
   const far=fb.finish();instance(far,lots.filter(p=>p.template%3===variant),'Festival_Distant_Lots_'+variant,null,660);instance(far,neighborhoods.filter(p=>p.template===variant),'Festival_Inland_Roofs_'+variant,null,660);
 }
 for(const b of batches)if(b.mesh.name.startsWith('Festival_Distant'))b.fade=true;
 // Shared small table and stool geometry at stall patrons, batched globally.
 const furniture=builder();furniture.add(new T.CylinderGeometry(.5,.5,.09,12),'wood',2.8,.78,0);furniture.rod('metal',[2.8,0,0],[2.8,.73,0],.055);furniture.add(new T.CylinderGeometry(.23,.23,.08,10),'clay',2.35,.43,0);for(const dx of[-.13,.13])furniture.rod('wood',[2.35+dx,0,0],[2.35+dx,.4,0],.025);const furnitureParts=furniture.finish();instance(furnitureParts,stalls,'Festival_Stall_Seats',null,150);
 const stats={version:21,houses:lots.length,backgroundHomes:neighborhoods.length,frontageFamilies:families,trees:trees.length,backyardTrees:inlandCanopy.length,placement:'seeded irregular scatter with home and lane clearance',treeSilhouettes:plants.length,frontageTemplates:templates.length,foodStalls:stalls.length,people:people.length,roadsidePeople:people.filter(p=>p.zone==='roadside-sidewalk').length,activityCounts:people.reduce((a,p)=>(a[p.activity]=(a[p.activity]||0)+1,a),{}),drawCalls:batches.length,geometryTriangles:0,visibleHouses:0,visibleInstances:0,submittedTriangles:0,range:{detailedHouses:125,distantHouses:660,trees:440,stalls:180},source:'Regional architectural study: 12 frontages, 9 plant silhouettes; authored dimensions'};
 const unique=new Set();for(const b of batches)if(!unique.has(b.mesh.geometry)){unique.add(b.mesh.geometry);stats.geometryTriangles+=(b.mesh.geometry.index?.count||b.mesh.geometry.attributes.position.count)/3;}
 function update(time,cameraX=1090,cameraZ=0){let visible=0,tri=0;for(const b of batches){let count=0;for(const p of b.list){const d=Math.hypot(p.x-cameraX,(p.z-cameraZ)*.45);if(d>b.range||(b.fade&&d<120))continue;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();b.mesh.setMatrixAt(count,dummy.matrix);if(p.tint)b.mesh.setColorAt(count,p.tint);count++;}b.mesh.count=count;b.mesh.visible=count>0;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;visible+=count;tri+=count*(b.mesh.geometry.index?.count||b.mesh.geometry.attributes.position.count)/3;}for(const m of ownedMaterials)if(m.userData.shader)m.userData.shader.uniforms.ambientTime.value=time;stats.visibleHouses=lots.filter(p=>Math.abs(p.x-cameraX)<125).length;stats.visibleInstances=visible;stats.submittedTriangles=tri;}
 update(0,1090,0);group.userData={festivalStreet:stats};
 return {group,stats,people,update,dispose(){group.removeFromParent();for(const b of batches)b.mesh.dispose();unique.forEach(g=>g.dispose());extraGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());group.clear();}};
}
