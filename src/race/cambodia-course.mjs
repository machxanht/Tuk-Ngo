import * as T from 'three';
import {buildFestivalCrowd} from './festival-crowd.mjs';
import {buildFestivalTraffic} from './festival-traffic.mjs';
import {FESTIVAL_BRANDS,paintFestivalBanner,festivalBannerSize} from './festival-branding.mjs';

// Approximate playable interpretations of the documented riverfronts.
// See docs/cambodia-research.md; no press photograph is used as a game texture.
const hash=n=>{let x=Math.imul(n+71,0x9e3779b9);x=Math.imul(x^(x>>>16),0x85ebca6b);return((x^(x>>>13))>>>0)/4294967296;};
export function buildCambodiaBanks(group,waterY,assets,_materials,options,venue){
 const pp=venue.id==='phnom-penh',edge=venue.width/2,from=venue.finishX-160,to=venue.finishX+venue.length+160,mid=(from+to)/2;
 const gable=new T.Shape();gable.moveTo(-.5,-.5);gable.lineTo(.5,-.5);gable.lineTo(0,.5);gable.closePath();
 const roofGeometry=new T.ExtrudeGeometry(gable,{depth:1,bevelEnabled:false});roofGeometry.translate(0,0,-.5);
 const geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(1,1,1,7),crown:new T.SphereGeometry(1,10,7),roof:roofGeometry,spire:new T.ConeGeometry(1,1,8)};
 const material=new T.MeshLambertMaterial({color:'white'}),buckets=new Map(),dummy=new T.Object3D(),people=[],maps=new Map();let id=0;
 function add(type,x,y,z,w,h,d,colour,ry=0){if(!buckets.has(type))buckets.set(type,[]);dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,ry,0);dummy.updateMatrix();buckets.get(type).push({matrix:dummy.matrix.clone(),colour:new T.Color(colour)});}
 const box=(x,y,z,w,h,d,c)=>add('box',x,y,z,w,h,d,c);
 function tree(x,z,seed,palm=false){
  const height=5+hash(seed)*4;add('pole',x,1+height/2,z,.18,height,.18,'#8e7755');
  if(palm){for(let j=0;j<8;j++){const a=j*Math.PI/4;add('crown',x+Math.cos(a)*1.5,height+1-Math.abs(j%2)*.3,z+Math.sin(a)*1.5,2.2,.35,.6,j%2?'#399654':'#4cac54',-a);}}
  else for(let j=0;j<4;j++)add('crown',x+Math.sin(j*2.4)*1.1,height+.5+(j%2),z+Math.cos(j*2.4)*1.1,1.8,1.9,1.7,['#47994d','#67af52','#328b4d'][j%3]);
 }
 function roof(x,y,z,w,d,height,colour){add('roof',x,y+height/2,z,d,height,w,colour,Math.PI/2);}
 function pavilion(x,z,w=25,d=13,royal=false){
  box(x,1.8,z,w+3,1.8,d+3,'#ead9b4');
  for(let a=-1;a<=1;a++)for(const b of[-1,1])add('pole',x+a*w*.37,5,z+b*d*.36,.18,5,.18,royal?'#ead58b':'#e5c79e');
  for(let layer=0;layer<3;layer++){
   const width=w-layer*4,depth=d-layer*2.2,y=7+layer*2.2;
   roof(x,y,z,width,depth,4.4,layer%2?'#bd5335':royal?'#dc8d27':'#ad4934');
   for(const side of[-1,1]){box(x,y+.05,z+side*depth/2,width+.4,.23,.3,'#f3ce65');add('spire',x+side*width/2,y+4.7,z,.3,2.3,.3,'#edc24e');}
  }
  add('spire',x,17.3,z,.55,5,.55,'#e9b94b');
 }
 function banner(text,x,y,z,w,h,side){
  const size=festivalBannerSize(w,h),key=JSON.stringify([text,size]);let map=maps.get(key);
  if(!map){const canvas=document.createElement('canvas');Object.assign(canvas,size);paintFestivalBanner(canvas,text);map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;map.userData.festivalBranding=true;maps.set(key,map);}
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false,side:T.DoubleSide}));mesh.name='Cambodia_Banner';mesh.position.set(x,y,z);mesh.rotation.y=side<0?0:Math.PI;group.add(mesh);
 }
 for(const side of[-1,1]){
  box(mid,-.3,side*(edge+150),to-from+200,2,300,'#72b85a');
  box(mid,.75,side*(edge+6),to-from,.5,12,'#e6d7b8');box(mid,1.0,side*(edge+23),to-from,.3,8,'#8a9995');
  box(mid,1.1,side*(edge+.2),to-from,1.1,.4,'#e2d6b9');box(mid,1.9,side*(edge+.2),to-from,.10,.13,'#d4bd8a');
  for(let x=from;x<to;x+=3){add('pole',x,1.55,side*(edge+.2),.035,.8,.035,'#d4bd8a');}
  for(let x=from;x<to;x+=11){tree(x,side*(edge+12),id++,pp||id%3===0);if(id%2)tree(x+4,side*(edge+37),id++);}
  for(let x=from;x<to;x+=19){
   const k=id++,central=pp&&side<0&&Math.abs(x-(venue.finishX+130))<145;
   if(central)continue;
   const h=pp&&side>0?10+hash(k)*36:5+hash(k)*5,z=side*(edge+43),wall=['#f1dfba','#d8e8d7','#f3d6b7','#e2e5df'][k%4];
   box(x,1+h/2,z,15,h,12,wall);if(h<13)roof(x,1+h,z,17,14,3,['#c96a36','#ad5039','#5d9580'][k%3]);
   for(let level=0;level<Math.floor(h/3);level++)for(let dx=-5;dx<=5;dx+=3.4)box(x+dx,2.8+level*3,side*(edge+36.94),1.6,1.7,.06,'#3f7c83');
   for(let row=0;row<4;row++){if(hash(k+row*311)>.16)tree(x+hash(k+row)*12,side*(edge+63+row*24+hash(k+row*103)*15),id++,row%3===0);}
  }
  // Irregular promenade and market crowds, using the existing animated NPCs.
  const count=pp?7200:3600;
  for(let n=0;n<count;n++){
   const x=from+hash(n+side*131)*(to-from),row=hash(n+911+side)*9.4;
   people.push({id:n+(side>0?count:0),x,floor:1.0,z:side*(edge+1+row),activity:n%17===0?'walk':n%4===0?'clap':n%3===0?'wave':'cheer',path:n%17===0?{dx:1,dz:0,extent:.5+hash(n)*1.5}:undefined});
  }
  for(let x=from+35,n=0;x<to;x+=50,n++){
   const z=side*(edge+15);box(x,2.1,z,6,2.2,3.3,['#d04460','#338d95','#e3ad37'][n%3]);roof(x,3.3,z,7.5,4.5,1.2,['#e65c43','#e4b52e','#3f9f86'][n%3]);
   banner(n%3===0?FESTIVAL_BRANDS[n%2]:'សូមស្វាគមន៍',x,4.8,side*(edge+.5),14,1.8,side);
  }
 }
 if(pp){
  // West-bank palace compound and the open Moonlight Pavilion on Sisowath Quay.
  const x=venue.finishX+150,z=-(edge+62);box(x,3,z,180,4,46,'#f1e6cb');
  for(const dx of[-63,0,63]){
   box(x+dx,7,z,49,9,26,'#f4e5b8');
   for(let column=-20;column<=20;column+=5){box(x+dx+column,7,z+13.1,.6,8,.6,'#fff3cd');box(x+dx+column,7,z+13.45,2.1,4.8,.12,'#6f6252');}
   for(let layer=0;layer<3;layer++){
    const y=12+layer*3.1,w=57-layer*9,d=33-layer*5;
    roof(x+dx,y,z,w,d,7,layer%2?'#bf6631':'#d99e25');
    for(const side of[-1,1]){box(x+dx,y+.05,z+side*d/2,w,.25,.3,'#f9d775');add('spire',x+dx+side*w/2,y+7.1,z,.4,3,.4,'#f5ce6a');}
   }
   if(dx===0){for(let step=0;step<5;step++)add('roof',x,26+step*1.9,z,9-step*1.4,2.6,9-step*1.4,'#eebd4c',Math.PI/4);add('spire',x,41,z,1,14,1,'#f5c64d');}
  }
  box(x,2.8,-(edge+36),220,3.5,1.1,'#f6ecd0');for(let dx=-105;dx<=105;dx+=7){box(x+dx,5.1,-(edge+36),.8,1.4,.8,'#f6ecd0');add('spire',x+dx,6.1,-(edge+36),.65,1,.65,'#edbd4b');}
  pavilion(venue.finishX+8,-(edge+17),36,16,true);
 }else{
  pavilion(venue.finishX+60,-(edge+15),23,12,false);
  for(let i=0;i<70;i++)tree(venue.finishX+130+hash(i)*90,-(edge+45+hash(i+400)*65),i+500,true);
 }
 // Bridges sit beyond the start and finish; they do not obstruct the race.
 for(const x of[venue.finishX-85,venue.finishX+venue.length+85]){
  const span=venue.width+45;box(x,5.8,0,10,.65,span,'#cbc9b5');
  for(const z of[-venue.width*.35,venue.width*.35])box(x,2.7,z,6,5.4,1.2,'#b9bdb0');
  for(const dx of[-5,5]){box(x+dx,7,0,.17,.9,span,'#d9d5b9');for(let z=-span/2;z<span/2;z+=3)add('pole',x+dx,6.8,z,.045,1.8,.045,'#d9d5b9');}
 }
 for(const distance of[0,venue.length])for(const side of[-1,1])banner(distance?'ទីបញ្ចប់':'ចំណុចចាប់ផ្តើម',venue.finishX+venue.length-distance,5.2,side*(edge+.8),12,2,side);
 // Drifting irregular plant clusters stay outside both paddle corridors.
 const floating=new T.InstancedMesh(geometries.crown,new T.MeshLambertMaterial({color:'#61ad4e'}),150),floats=[];
 for(let i=0;i<150;i++)floats.push({x:from+hash(i+67)*(to-from),z:(i%2?1:-1)*(Math.max(13,edge*.65)+hash(i+92)*Math.max(1,edge*.18))});
 floating.name='Cambodia_Drifting_Plants';group.add(floating);
 for(const[type,list]of buckets){const mesh=new T.InstancedMesh(geometries[type],material,list.length);list.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,p.colour);});mesh.computeBoundingSphere();mesh.name=pp?'PhnomPenh_'+type:'SiemReap_'+type;group.add(mesh);}
 const crowd=buildFestivalCrowd(group,people,assets,{...options,middleLimit:60,farLimit:16000,radius:430});
 const traffic=buildFestivalTraffic(group,{road:(_x,side,lane=0)=>side*(edge+23)+lane,minX:from,maxX:to});
 crowd.stats.peoplePerBank=[people.length/2,people.length/2];
 group.userData={...group.userData,venueId:venue.id,spectators:people.length,crowd:crowd.stats,banners:{branding:'festival-shared-vector',language:'km',textureCount:maps.size},courseLength:venue.length,reference:'docs/cambodia-research.md',measured:false,landmarks:pp?['Royal Palace interpretation','Moonlight Pavilion','Sisowath promenade','east-bank skyline']:['Pokambor pavilion','Royal Gardens','stone bridges','riverside markets']};
 return {update(time,cameraX,cameraZ,visibility){crowd.update(time,cameraX,cameraZ,visibility);traffic.update(time,cameraX,visibility);floats.forEach((p,i)=>{dummy.position.set(from+((p.x-from+time*.2)%(to-from)),waterY+.03,p.z);dummy.rotation.set(0,hash(i)*6+Math.sin(time*.1+i)*.08,0);dummy.scale.set(.3+hash(i)*.8,.06,.35+hash(i+1)*.5);dummy.updateMatrix();floating.setMatrixAt(i,dummy.matrix);});floating.instanceMatrix.needsUpdate=true;},dispose(){crowd.dispose();traffic.dispose();}};
}
