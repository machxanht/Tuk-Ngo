import * as T from 'three';
import {buildFestivalCrowd} from './festival-crowd.mjs';
import {buildFestivalTraffic} from './festival-traffic.mjs';
import {FESTIVAL_BRANDS,paintFestivalBanner,festivalBannerSize} from './festival-branding.mjs';

// Approximate playable interpretations of the documented riverfronts.
// See docs/cambodia-research.md; no press photograph is used as a game texture.
const hash=n=>{let x=Math.imul(n+71,0x9e3779b9);x=Math.imul(x^(x>>>16),0x85ebca6b);return((x^(x>>>13))>>>0)/4294967296;};
export function buildCambodiaBanks(group,waterY,assets,_materials,options,venue){
 const pp=venue.id==='phnom-penh',edge=venue.width/2,from=venue.finishX-160,to=venue.finishX+venue.length+160,mid=(from+to)/2;
 const street={promenade:pp?16:10,roadCenter:pp?29:23,roadWidth:18.4,shopFront:pp?43:37,shopDepth:pp?14:11};
 const gable=new T.Shape();gable.moveTo(-.5,-.5);gable.lineTo(.5,-.5);gable.lineTo(0,.5);gable.closePath();
 const roofGeometry=new T.ExtrudeGeometry(gable,{depth:1,bevelEnabled:false});roofGeometry.translate(0,0,-.5);
 const geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(1,1,1,7),crown:new T.SphereGeometry(1,10,7),roof:roofGeometry,spire:new T.ConeGeometry(1,1,8)};
 const material=new T.MeshLambertMaterial({color:'white'}),buckets=new Map(),dummy=new T.Object3D(),people=[],maps=new Map();let id=0;
 function add(type,x,y,z,w,h,d,colour,ry=0){if(!buckets.has(type))buckets.set(type,[]);dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,ry,0);dummy.updateMatrix();buckets.get(type).push({matrix:dummy.matrix.clone(),colour:new T.Color(colour)});}
 const box=(x,y,z,w,h,d,c)=>add('box',x,y,z,w,h,d,c);
 function lamp(x,z){add('pole',x,5.3,z,.07,8,.07,'#445c52');box(x,9.25,z,1.8,.08,.09,'#445c52');for(const dx of[-.8,.8]){add('crown',x+dx,9.0,z,.22,.32,.22,'#ffedb2');add('spire',x+dx,9.38,z,.3,.2,.3,'#6a7e6c');}}
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
 const shopSigns=['អង្គរសូល','កូនខ្មែរ','ភោជនីយដ្ឋាន','ផ្សាររាត្រី','សូមស្វាគមន៍'];
 function shophouse(x,side,k){
  const width=pp?12:10,depth=street.shopDepth,floors=pp?2+Math.floor(hash(k)*3):1+Math.floor(hash(k)*2),h=floors*3.3,front=edge+street.shopFront,z=side*(front+depth/2),wall=['#f0dfbb','#e9c7a6','#d3e0ca','#f4e9d0','#d9e8e2'][k%5];
  box(x,1+h/2,z,width,h,depth,wall);box(x,1.15,side*(front-1.3),width+1,.25,2.6,'#dbcfb3');
  // A shaded arcade, shop fronts and open balconies, rather than solid cubes.
  for(const dx of[-width*.42,0,width*.42]){add('pole',x+dx,2.7,side*(front-2),.12,3.2,.12,'#f5ebce');box(x+dx,2.4,side*(front-.05),2.4,2.7,.08,dx===0?'#4d6d64':'#487c7d');}
  box(x,4.1,side*(front-1),width+.5,.22,3,'#f5e4bc');
  for(let floor=1;floor<floors;floor++){
   const y=1+floor*3.3;box(x,y+.22,side*(front-.6),width+.5,.22,1.8,'#f8edcb');box(x,y+1,side*(front-1.35),width,.11,.08,'#765f46');
   for(let dx=-width/2+.4;dx<width/2;dx+=.8)box(x+dx,y+.65,side*(front-1.35),.05,.8,.07,'#765f46');
   for(const dx of[-width*.28,width*.28]){box(x+dx,y+1.7,side*(front-.05),2,2.3,.09,'#416b67');for(const shutter of[-1,1])box(x+dx+shutter*1.15,y+1.7,side*(front-.18),.5,2.3,.13,k%2?'#799789':'#986b50');}
  }
  if(k%3!==0)roof(x,1+h,z,width+1,depth+1,pp?2.4:3.2,k%2?'#b75c3c':'#bb743c');else{box(x,h+1.1,z,width+.4,.35,depth+.4,'#e7d7b1');box(x,h+1.6,z+side*(depth/2),width,.8,.18,wall);}
  if(k%4===0)banner(shopSigns[k%shopSigns.length],x,3.7,side*(front-.25),width-1,.9,side);
 }
 for(const side of[-1,1]){
  box(mid,-.3,side*(edge+150),to-from+200,2,300,'#72b85a');
  box(mid,.75,side*(edge+street.promenade/2),to-from,.5,street.promenade,'#e6d7b8');
  box(mid,1.04,side*(edge+street.roadCenter),to-from,.3,street.roadWidth,'#637576');
  const inner=edge+street.roadCenter-street.roadWidth/2,outer=edge+street.roadCenter+street.roadWidth/2;
  for(const z of[inner-.35,outer+.35])box(mid,1.24,side*z,to-from,.22,.45,'#e8e1ca');
  box(mid,.9,side*(outer+1.8),to-from,.4,3,'#ded4bb');
  box(mid,1.205,side*(edge+street.roadCenter),to-from,.025,.12,'#f5d472');
  for(let x=from+5;x<to;x+=13)for(const lane of[-3.25,3.25])box(x,1.207,side*(edge+street.roadCenter)+lane,5,.025,.12,'#f3eee0');
  // Junctions align with gaps between blocks. Crosswalks link promenades and shops.
  for(let x=from+85;x<to;x+=180){
   box(x,1.02,side*(edge+90),9,.3,120,'#72827a');
   for(const dx of[-7,7])for(let dz=-8;dz<=8;dz+=1.4)box(x+dx,1.215,side*(edge+street.roadCenter)+dz,2.8,.026,.65,'#f4edda');
  }
  box(mid,1.1,side*(edge+.2),to-from,1.1,.4,'#e2d6b9');box(mid,1.9,side*(edge+.2),to-from,.10,.13,'#d4bd8a');
  for(let x=from;x<to;x+=3){add('pole',x,1.55,side*(edge+.2),.035,.8,.035,'#d4bd8a');}
  for(let x=from+7;x<to;x+=17){tree(x,side*(edge+street.promenade-1),id++,pp||id%4===0);if(id%2)lamp(x+6,side*(edge+street.promenade+1));}
  for(let x=from+18;x<to;x+=15){
   const k=id++,junction=((x-from-85+90)%180+180)%180-90,central=side<0&&Math.abs(x-(venue.finishX+(pp?150:115)))<(pp?145:75);
   if(Math.abs(junction)<13||central)continue;
   shophouse(x,side,k);
   if(pp&&side>0&&k%4===0){const z=side*(edge+265+hash(k+44)*35),h=22+hash(k+66)*46;box(x,h/2+1,z,15,h,19,'#c3dfdf');box(x,h+1,z,16,.7,20,'#eeebda');for(let level=3;level<h;level+=3.2)box(x,level,side*(Math.abs(z)-9.55),14,.55,.08,'#709fba');}
  }
  // Inland neighbourhoods extend the city behind the first frontage. Keep
  // trees in yards and block interiors, away from road surfaces and roofs.
  for(let row=0;row<3;row++){
   const depth=edge+105+row*48;box(mid,1.0,side*(depth+15),to-from,.25,7,'#859083');
   for(let x=from+10,n=0;x<to;x+=28,n++){
    const junction=((x-from-85+90)%180+180)%180-90;
    if(Math.abs(junction)<15)continue;
    const seed=11000+row*210+n+side*441,xx=x+(hash(seed)-.5)*7,royal=side<0&&Math.abs(xx-(venue.finishX+(pp?150:115)))<(pp?148:80)&&row<=(pp?1:0);
    if(!royal){const w=13+hash(seed+4)*5,h=pp?7+hash(seed+9)*12:4+hash(seed+9)*5,z=side*depth;box(xx,1+h/2,z,w,h,11,['#e6d9be','#e0d6c4','#d2e0cf'][n%3]);if(!pp||n%3)roof(xx,1+h,z,w+1,12,2.8,n%2?'#b6663f':'#a76e49');for(const dx of[-w*.25,w*.25])box(xx+dx,2.7,side*(depth-5.55),1.6,1.8,.07,'#527d78');}
    for(let j=0;j<3;j++)tree(xx-11+hash(seed+j*38)*3,side*(depth-10-j*3),seed+j,pp&&j===0);
   }
  }
  // Irregular promenade and market crowds, using the existing animated NPCs.
  const count=pp?7200:3600;
  for(let n=0;n<count;n++){
   const x=from+hash(n+side*131)*(to-from),row=hash(n+911+side)*(street.promenade-3);
   people.push({id:n+(side>0?count:0),x,floor:1.0,z:side*(edge+1+row),activity:n%17===0?'walk':n%4===0?'clap':n%3===0?'wave':'cheer',path:n%17===0?{dx:1,dz:0,extent:.5+hash(n)*1.5}:undefined});
  }
  for(let x=from+35,n=0;x<to;x+=50,n++){
   const z=side*(edge+street.promenade+2.4);box(x,2.1,z,5,2.2,2.5,['#d04460','#338d95','#e3ad37'][n%3]);roof(x,3.3,z,6,3,1.2,['#e65c43','#e4b52e','#3f9f86'][n%3]);
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
  box(x,2.8,-(edge+43),220,3.5,1.1,'#f6ecd0');for(let dx=-105;dx<=105;dx+=7){box(x+dx,5.1,-(edge+43),.8,1.4,.8,'#f6ecd0');add('spire',x+dx,6.1,-(edge+43),.65,1,.65,'#edbd4b');}
  // Palace gardens and a lower city backdrop keep the royal roof silhouette clear.
  for(let n=0;n<130;n++){const xx=x-160+hash(n+700)*320,zz=edge+100+hash(n+820)*85;tree(xx,-zz,n+900,n%5===0);}
  pavilion(venue.finishX+8,-(edge+7),36,10,true);
 }else{
  pavilion(venue.finishX+60,-(edge+5),23,8,false);
  // Royal Gardens sit inland of Pokambor Avenue; no Angkor Wat beside this river.
  box(venue.finishX+115,1.1,-(edge+72),120,.25,55,'#94bf61');
  for(const dx of[-28,28]){box(venue.finishX+115+dx,2.8,-(edge+78),23,3.5,14,'#f3e5c3');roof(venue.finishX+115+dx,4.6,-(edge+78),28,18,4.6,'#b65f35');}
  box(venue.finishX+115,1.25,-(edge+72),6,.12,55,'#e4d4b6');
  for(let i=0;i<100;i++){const xx=venue.finishX+40+hash(i)*180,depth=46+hash(i+400)*48,roofHit=[87,143].some(dx=>Math.abs(xx-(venue.finishX+dx))<17&&Math.abs(depth-78)<14);if(!roofHit&&Math.abs(xx-(venue.finishX+115))>6)tree(xx,-(edge+depth),i+500,i%3===0);}
 }
 // Bridges sit beyond the start and finish; they do not obstruct the race.
 for(const x of(pp?[venue.finishX+venue.length+180]:[venue.finishX-85,venue.finishX+venue.length+85])){
  const span=venue.width+45;box(x,5.8,0,10,.65,span,'#cbc9b5');
  for(const z of[-venue.width*.35,venue.width*.35])box(x,2.7,z,6,5.4,1.2,'#b9bdb0');
  for(const dx of[-5,5]){box(x+dx,7,0,.17,.9,span,'#d9d5b9');for(let z=-span/2;z<span/2;z+=3)add('pole',x+dx,6.8,z,.045,1.8,.045,'#d9d5b9');}
  if(pp){for(const dx of[-4.5,4.5]){const points=[];for(let i=0;i<=32;i++){const z=-span/2+span*i/32;points.push(new T.Vector3(x+dx,7.4+Math.sin(i/32*Math.PI)*16,z));}const arch=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.28,6,false),new T.MeshLambertMaterial({color:'#b7d6df'}));group.add(arch);for(let z=-span/2+10;z<span/2;z+=10){const y=7.4+Math.sin((z+span/2)/span*Math.PI)*16;add('pole',x+dx,(y+6)/2,z,.04,y-6,.04,'#b7d6df');}}}
  else for(const z of[-span*.25,0,span*.25]){box(x,6.3,z,10,.55,3,'#eeddb3');for(const dx of[-5,5]){box(x+dx,7.6,z,.5,2,.5,'#e4c693');add('spire',x+dx,8.9,z,.42,.7,.42,'#ccab6d');}}
 }
 for(const distance of[0,venue.length])for(const side of[-1,1])banner(distance?'ទីបញ្ចប់':'ចំណុចចាប់ផ្តើម',venue.finishX+venue.length-distance,5.2,side*(edge+.8),12,2,side);
 // Drifting irregular plant clusters stay outside both paddle corridors.
 const floating=new T.InstancedMesh(geometries.crown,new T.MeshLambertMaterial({color:'#61ad4e'}),150),floats=[];
 for(let i=0;i<150;i++)floats.push({x:from+hash(i+67)*(to-from),z:(i%2?1:-1)*(Math.max(13,edge*.65)+hash(i+92)*Math.max(1,edge*.18))});
 floating.name='Cambodia_Drifting_Plants';group.add(floating);
 // Spatial batches let the renderer reject off-screen neighbourhoods. A single
 // river-length tree batch submitted every tree even in a close athlete view.
 let staticBatches=0;
 for(const[type,list]of buckets){
  const cells=new Map();
  for(const p of list){const e=p.matrix.elements,macro=Math.max(Math.abs(e[0]),Math.abs(e[5]),Math.abs(e[10]))>160,key=macro?'long-surface':Math.floor(e[12]/128)+':'+Math.floor(e[14]/96);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
  for(const[key,items]of cells){const mesh=new T.InstancedMesh(geometries[type],material,items.length);items.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,p.colour);});mesh.computeBoundingSphere();mesh.name=(pp?'PhnomPenh_':'SiemReap_')+type+'_'+key;group.add(mesh);staticBatches++;}
 }
 const crowd=buildFestivalCrowd(group,people,assets,{...options,middleLimit:60,farLimit:16000,radius:430});
 const traffic=buildFestivalTraffic(group,{road:(_x,side,lane=0)=>side*(edge+street.roadCenter)+lane,minX:from,maxX:to,profile:venue.id});
 crowd.stats.peoplePerBank=[people.length/2,people.length/2];
 group.userData={...group.userData,venueId:venue.id,spectators:people.length,crowd:crowd.stats,traffic:traffic.stats,street,staticBatches,banners:{branding:'festival-shared-vector',language:'km',textureCount:maps.size},courseLength:venue.length,reference:'docs/cambodia-research.md',measured:false,landmarks:pp?['Royal Palace interpretation','Moonlight Pavilion','Sisowath promenade','east-bank skyline','arcaded riverfront shophouses']:['Pokambor pavilion','Royal Gardens and Royal Residence interpretation','stone bridges','riverside markets','low-rise Khmer shophouses']};
 return {update(time,cameraX,cameraZ,visibility){crowd.update(time,cameraX,cameraZ,visibility);traffic.update(time,cameraX,visibility);floats.forEach((p,i)=>{dummy.position.set(from+((p.x-from+time*.2)%(to-from)),waterY+.03,p.z);dummy.rotation.set(0,hash(i)*6+Math.sin(time*.1+i)*.08,0);dummy.scale.set(.3+hash(i)*.8,.06,.35+hash(i+1)*.5);dummy.updateMatrix();floating.setMatrixAt(i,dummy.matrix);});floating.instanceMatrix.needsUpdate=true;},dispose(){crowd.dispose();traffic.dispose();}};
}
