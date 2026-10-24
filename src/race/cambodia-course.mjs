import * as T from 'three';
import {buildFestivalCrowd} from './festival-crowd.mjs';
import {buildFestivalTraffic} from './festival-traffic.mjs';
import {FESTIVAL,FESTIVAL_BRANDS,paintFestivalBanner,festivalBannerSize} from './festival-branding.mjs';
import {venueIdentity} from './venue-identity.mjs';
import {cambodiaBank,cambodiaReserved,cambodiaFeature,cambodiaLayout} from './cambodia-geography.mjs';
import {buildCambodiaLandmarks} from './cambodia-landmarks.mjs';
import {buildCambodiaFlags} from './cambodia-flags.mjs';

// Sourced riverfront layout, straightened into the existing playable course.
// See docs/cambodia-research.md; no press photograph is used as a game texture.
const hash=n=>{let x=Math.imul(n+71,0x9e3779b9);x=Math.imul(x^(x>>>16),0x85ebca6b);return((x^(x>>>13))>>>0)/4294967296;};
export function buildCambodiaBanks(group,waterY,assets,_materials,options,venue){
 const pp=venue.id==='phnom-penh',edge=venue.width/2,from=venue.finishX-160,to=venue.finishX+venue.length+160,mid=(from+to)/2;
 const street={promenade:pp?16:10,roadCenter:pp?29:23,roadWidth:18.4,shopFront:pp?43:37,shopDepth:pp?14:11};
 const gable=new T.Shape();gable.moveTo(-.5,-.5);gable.lineTo(.5,-.5);gable.lineTo(0,.5);gable.closePath();
 const roofGeometry=new T.ExtrudeGeometry(gable,{depth:1,bevelEnabled:false});roofGeometry.translate(0,0,-.5);
 const geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(1,1,1,7),crown:new T.SphereGeometry(1,10,7),roof:roofGeometry,spire:new T.ConeGeometry(1,1,8)};
 // Feathered coconut leaves use fewer triangles than the old oval leaf balls.
 const frond=new T.BufferGeometry(),vertices=[];
 for(let i=1;i<12;i++){const t=i/12,y=-.65*t*t,z=t*2.5,length=Math.sin(t*Math.PI)*.65;for(const side of[-1,1])vertices.push(0,y,z,side*length,y-.10,z+.18,0,y-.02,z+.10);}
 frond.setAttribute('position',new T.Float32BufferAttribute(vertices,3));frond.computeVertexNormals();geometries.frond=frond;
 const crown=geometries.crown.attributes.position;for(let i=0;i<crown.count;i++){const x=crown.getX(i),y=crown.getY(i),z=crown.getZ(i),r=1+.09*Math.sin(x*9+y*5)*Math.cos(z*12);crown.setXYZ(i,x*r,y*r,z*r);}geometries.crown.computeVertexNormals();
 const material=new T.MeshLambertMaterial({color:'white'}),buckets=new Map(),dummy=new T.Object3D(),people=[],maps=new Map();let id=0;
 const frondMaterial=new T.MeshLambertMaterial({color:'white',side:T.DoubleSide});
 const surfaceMaterials=new Map();
 const shore=(x,side)=>cambodiaBank(venue.id,x,side),mapZ=(x,z)=>{const side=z<0?-1:1;return shore(x,side)+(z-side*edge);};
 function add(type,x,y,z,w,h,d,colour,ry=0,world=false){
  if(type==='box'&&w>100&&ry===0&&!world){const geometry=new T.BoxGeometry(w,h,d,Math.ceil(w/25),1,1);geometry.translate(x,y,z);const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++)positions.setZ(i,mapZ(positions.getX(i),positions.getZ(i)));geometry.computeVertexNormals();if(!surfaceMaterials.has(colour))surfaceMaterials.set(colour,new T.MeshLambertMaterial({color:colour}));const mesh=new T.Mesh(geometry,surfaceMaterials.get(colour));mesh.name='Cambodia_Continuous_Bank_Surface';group.add(mesh);return;}
  if(!world)z=mapZ(x,z);
  if(!buckets.has(type))buckets.set(type,[]);dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,ry,0);dummy.updateMatrix();buckets.get(type).push({matrix:dummy.matrix.clone(),colour:new T.Color(colour)});}
 const box=(x,y,z,w,h,d,c)=>add('box',x,y,z,w,h,d,c);
 const worldBox=(x,y,z,w,h,d,c)=>add('box',x,y,z,w,h,d,c,0,true);
 function lamp(x,z){add('pole',x,5.3,z,.07,8,.07,'#445c52');box(x,9.25,z,1.8,.08,.09,'#445c52');for(const dx of[-.8,.8]){add('crown',x+dx,9.0,z,.22,.32,.22,'#ffedb2');add('spire',x+dx,9.38,z,.3,.2,.3,'#6a7e6c');}}
 function tree(x,z,seed,palm=false){
  const height=5+hash(seed)*4;add('pole',x,1+height/2,z,.18,height,.18,'#8e7755');
  if(palm){for(let j=0;j<9;j++)add('frond',x,height+1,z,1,.9+(j%3)*.12,1.1,j%2?'#399654':'#4cac54',j*Math.PI*2/9);}
  else for(let j=0;j<4;j++)add('crown',x+Math.sin(j*2.4)*1.1,height+.5+(j%2),z+Math.cos(j*2.4)*1.1,1.8,1.9,1.7,['#47994d','#67af52','#328b4d'][j%3]);
 }
 function roof(x,y,z,w,d,height,colour){add('roof',x,y+height/2,z,d,height,w,colour,Math.PI/2);}
 const homeFamilies=['shutter-townhouse','raised-timber-home','courtyard-home','flat-roof-home','tiled-veranda-home','colonial-balcony-home'],homeCounts={};
 function inlandHome(x,z,seed,w,h,side){
  const family=Math.floor(hash(seed+71)*homeFamilies.length),floor=family===1?2.1:1,depth=family===2?9:11,wall=['#e6d9be','#e0d6c4','#d2e0cf','#d8e2df','#efdbb6'][seed%5];homeCounts[homeFamilies[family]]=(homeCounts[homeFamilies[family]]||0)+1;
  h=Math.min(h,family===1?4.2:family===2?5.6:family===4?5:12);
  box(x,floor+h/2,z,w,h,depth,family===1?'#a88660':wall);
  if(family===3){box(x,floor+h+.15,z,w+.5,.3,depth+.5,'#eadfc9');for(const dz of[-depth/2,depth/2])box(x,floor+h+.6,z+dz,w,.7,.2,wall);}
  else roof(x,floor+h,z,w+1,depth+1,family===1?3.6:2.8,seed%2?'#b6663f':'#a76e49');
  const front=z-side*(depth/2+.1);
  for(let level=1.6;level<h;level+=3.3)for(const dx of[-w*.28,w*.28]){box(x+dx,floor+level,front,1.6,Math.min(2.1,h*.5),.10,'#527d78');if(family===0||family===5)for(const shutter of[-1,1])box(x+dx+shutter*.92,floor+level,front-side*.15,.32,Math.min(2.1,h*.5),.12,'#7e9b84');}
  if([1,4,5].includes(family)){
   const veranda=z-side*(depth/2+1.3),y=family===5?floor+h*.5:floor;box(x,y+.05,veranda,w+.4,.18,2.6,'#d5b58a');
   for(const dx of[-w*.44,0,w*.44]){add('pole',x+dx,y+1.55,veranda-side,.10,3,.10,family===1?'#987652':'#f0e4c9');box(x+dx,y+.6,veranda-side*1.25,w*.25,.08,.08,'#ae9473');}
   roof(x,y+3.1,veranda,w+.8,3.2,.75,seed%2?'#b6663f':'#8e9a8a');
  }
  if(family===1){for(const dx of[-w*.4,w*.4])for(const dz of[-depth*.38,depth*.38])add('pole',x+dx,1.55,z+dz,.14,1.2,.14,'#7d6951');for(let s=0;s<4;s++)box(x+w*.35,1+s*.25,front-side*(1+s*.3),1.8,.22,.5,'#b49a75');}
  if(family===2){const wingX=x+w*.32;box(wingX,2.1,z+side*8,w*.42,2.2,5,wall);roof(wingX,3.2,z+side*8,w*.42+1,6,1.7,'#b6663f');}
 }
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
 const bannerMaterials=new Map(),bannerGeometry=new Map();
 function banner(text,x,y,z,w,h,side){
  const size=festivalBannerSize(w,h),key=JSON.stringify([text,size]);let map=maps.get(key);
  if(!map){const canvas=document.createElement('canvas');Object.assign(canvas,size);paintFestivalBanner(canvas,text,venue.id);map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;map.userData.festivalBranding=true;map.userData.venueId=venue.id;maps.set(key,map);}
  // Box faces carry independently oriented UVs: street-side text never mirrors.
  if(!bannerMaterials.has(map))bannerMaterials.set(map,new T.MeshBasicMaterial({map,toneMapped:false}));
  const dimensions=w+':'+h;if(!bannerGeometry.has(dimensions))bannerGeometry.set(dimensions,new T.BoxGeometry(w,h,.035));
  const mesh=new T.Mesh(bannerGeometry.get(dimensions),bannerMaterials.get(map));mesh.name='Cambodia_Banner';mesh.userData.readableBothSides=true;mesh.position.set(x,y,mapZ(x,z));mesh.rotation.y=side<0?0:Math.PI;group.add(mesh);
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
  box(mid,-.3,side*(edge+350),to-from+200,2,700,'#72b85a');
  box(mid,.75,side*(edge+street.promenade/2),to-from,.5,street.promenade,'#e6d7b8');
  box(mid,1.04,side*(edge+street.roadCenter),to-from,.3,street.roadWidth,'#637576');
  const inner=edge+street.roadCenter-street.roadWidth/2,outer=edge+street.roadCenter+street.roadWidth/2;
  for(const z of[inner-.35,outer+.35])box(mid,1.24,side*z,to-from,.22,.45,'#e8e1ca');
  box(mid,.9,side*(outer+1.8),to-from,.4,3,'#ded4bb');
  box(mid,1.205,side*(edge+street.roadCenter),to-from,.025,.12,'#f5d472');
  for(let x=from+5;x<to;x+=13)for(const lane of[-3.25,3.25])box(x,1.207,side*(edge+street.roadCenter)+lane,5,.025,.12,'#f3eee0');
  // Junctions align with gaps between blocks. Crosswalks link promenades and shops.
  for(let x=from+85;x<to;x+=180){
   if(cambodiaReserved(venue.id,x,mapZ(x,side*(edge+90)),18))continue;
   box(x,1.02,side*(edge+90),9,.3,120,'#72827a');
   for(const dx of[-7,7])for(let dz=-8;dz<=8;dz+=1.4)box(x+dx,1.215,side*(edge+street.roadCenter)+dz,2.8,.026,.65,'#f4edda');
  }
  box(mid,1.1,side*(edge+.2),to-from,1.1,.4,'#e2d6b9');box(mid,1.9,side*(edge+.2),to-from,.10,.13,'#d4bd8a');
  for(let x=from;x<to;x+=3){add('pole',x,1.55,side*(edge+.2),.035,.8,.035,'#d4bd8a');}
  for(let x=from+7;x<to;x+=17){tree(x,side*(edge+street.promenade-1),id++,pp||id%4===0);if(id%2)lamp(x+6,side*(edge+street.promenade+1));}
  for(let x=from+18;x<to;x+=15){
   const k=id++,junction=((x-from-85+90)%180+180)%180-90,central=cambodiaReserved(venue.id,x,mapZ(x,side*(edge+street.shopFront+street.shopDepth/2)),20);
   if(Math.abs(junction)<13||central)continue;
   shophouse(x,side,k);
   if(pp&&side>0&&k%4===0){const z=side*(edge+265+hash(k+44)*35),h=22+hash(k+66)*46;box(x,h/2+1,z,15,h,19,'#c3dfdf');box(x,h+1,z,16,.7,20,'#eeebda');for(let level=3;level<h;level+=3.2)box(x,level,side*(Math.abs(z)-9.55),14,.55,.08,'#709fba');}
  }
  // Inland neighbourhoods extend the city behind the first frontage. Keep
  // trees in yards and block interiors, away from road surfaces and roofs.
  for(let row=0;row<3;row++){
   const depth=edge+105+row*48;
   for(let roadX=from+20;roadX<to;roadX+=40)if(!cambodiaReserved(venue.id,roadX,mapZ(roadX,side*(depth+15)),24))box(roadX,1.0,side*(depth+15),40,.25,7,'#859083');
   for(let x=from+10,n=0;x<to;x+=28,n++){
    const junction=((x-from-85+90)%180+180)%180-90;
    if(Math.abs(junction)<15)continue;
    const seed=11000+row*210+n+side*441,xx=x+(hash(seed)-.5)*7,royal=cambodiaReserved(venue.id,xx,mapZ(xx,side*depth),20);
    if(!royal){const w=13+hash(seed+4)*5,h=pp?7+hash(seed+9)*12:4+hash(seed+9)*5;inlandHome(xx,side*depth,seed,w,h,side);}
    for(let j=0;j<3;j++){const tx=xx-11+hash(seed+j*38)*3,tz=side*(depth-10-j*3);if(!cambodiaReserved(venue.id,tx,mapZ(tx,tz),4))tree(tx,tz,seed+j,pp&&j===0);}
   }
  }
  // Irregular promenade and market crowds, using the existing animated NPCs.
  const count=pp?7200:3600;
  for(let n=0;n<count;n++){
   const x=from+hash(n+side*131)*(to-from),row=hash(n+911+side)*(street.promenade-3);
   people.push({id:n+(side>0?count:0),x,floor:1.0,z:mapZ(x,side*(edge+1+row)),activity:n%17===0?'walk':n%4===0?'clap':n%3===0?'wave':'cheer',path:n%17===0?{dx:1,dz:0,extent:.5+hash(n)*1.5}:undefined});
  }
  for(let x=from+35,n=0;x<to;x+=50,n++){
   const z=side*(edge+street.promenade+2.4);box(x,2.1,z,5,2.2,2.5,['#d04460','#338d95','#e3ad37'][n%3]);roof(x,3.3,z,6,3,1.2,['#e65c43','#e4b52e','#3f9f86'][n%3]);
   banner(n%3===0?FESTIVAL_BRANDS[n%2]:n%3===1?FESTIVAL.titleKm:'សូមស្វាគមន៍',x,4.8,side*(edge+.5),14,1.8,side);
  }
 }
 const landmarks=buildCambodiaLandmarks(group,venue.id);
 // Real Siem Reap bridge positions frame the course. Phnom Penh's invented
 // steel arch is removed: Chroy Changvar is outside this palace race segment.
 if(!pp)for(const name of ['nr6-bridge','tep-vong-bridge']){
  const f=cambodiaFeature(venue.id,name),x=f.x,span=58;
  worldBox(x,5.5,0,12,.6,span,'#d9ccb0');
  for(const dx of[-6,6]){worldBox(x+dx,6.7,0,.35,1.4,span,'#e9dbbb');for(let z=-span/2;z<=span/2;z+=2)worldBox(x+dx,6.6,z,.25,1.4,.3,'#eee1c4');}
  for(const z of[-12,12])worldBox(x,2.8,z,8,5.6,1,'#c7bda8');
 }
 // Garden trees are irregular and do not occupy mapped building footprints.
 for(const area of (pp?['palace-compound','palace-park']:['royal-gardens','residence-compound'])){
  const f=cambodiaFeature(venue.id,area),xs=f.footprint.map(p=>p[0]),zs=f.footprint.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  for(let n=0;n<(pp?110:55);n++){
   const x=minX+hash(n+1300)*(maxX-minX),z=minZ+hash(n+1700)*(maxZ-minZ),building=landmarks.some(l=>!l.id.includes('compound')&&!l.id.includes('park')&&!l.id.includes('gardens')&&Math.abs(l.x-x)<55&&Math.abs(l.z-z)<55);
   if(!building&&z<shore(x,-1)-20)tree(x,-edge+(z-shore(x,-1)),n+2500,n%5===0);
  }
 }
 // A modest temporary festival stand is separate from the permanent palace.
 const standX=pp?venue.finishX+35:venue.finishX+45;
 pavilion(standX,-(edge+4),pp?30:23,8,false);
 banner(FESTIVAL.titleKm,standX,6.3,-(edge+1),pp?30:23,3,-1);
 const flagPositions=[];
 for(const side of[-1,1])for(let x=from+25,n=0;x<to;x+=65,n++)flagPositions.push({x,z:shore(x,side)+side*(street.promenade-1),rotation:side<0?Math.PI*.15:-Math.PI*.15});
 for(const l of landmarks)if(!l.id.includes('compound')&&!l.id.includes('park')&&!l.id.includes('gardens'))flagPositions.push({x:l.x+18,z:l.z+15,rotation:.2});
 const flags=buildCambodiaFlags(group,flagPositions,options.baseUrl||'');
 for(const distance of[0,venue.length])for(const side of[-1,1])banner(distance?'ទីបញ្ចប់':'ចំណុចចាប់ផ្តើម',venue.finishX+venue.length-distance,5.2,side*(edge+.8),12,2,side);
 // Drifting irregular plant clusters stay outside both paddle corridors.
 const floating=new T.InstancedMesh(geometries.crown,new T.MeshLambertMaterial({color:'#61ad4e'}),150),floats=[];
 for(let i=0;i<150;i++)floats.push({x:from+hash(i+67)*(to-from),z:(()=>{const x=from+hash(i+67)*(to-from),bank=shore(x,i%2?1:-1);return bank*(.67+hash(i+92)*.18);})()});
 floating.name='Cambodia_Drifting_Plants';group.add(floating);
 // Spatial batches let the renderer reject off-screen neighbourhoods. A single
 // river-length tree batch submitted every tree even in a close athlete view.
 let staticBatches=0;
 for(const[type,list]of buckets){
  const cells=new Map();
  for(const p of list){const e=p.matrix.elements,macro=Math.max(Math.abs(e[0]),Math.abs(e[5]),Math.abs(e[10]))>160,key=macro?'long-surface':Math.floor(e[12]/128)+':'+Math.floor(e[14]/96);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
  for(const[key,items]of cells){const mesh=new T.InstancedMesh(geometries[type],type==='frond'?frondMaterial:material,items.length);items.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,p.colour);});mesh.computeBoundingSphere();mesh.name=(pp?'PhnomPenh_':'SiemReap_')+type+'_'+key;group.add(mesh);staticBatches++;}
 }
 const crowd=buildFestivalCrowd(group,people,assets,{...options,middleLimit:60,farLimit:16000,radius:430});
 const traffic=buildFestivalTraffic(group,{road:(x,side,lane=0)=>shore(x,side)+side*street.roadCenter+lane,minX:from,maxX:to,profile:venue.id});
 crowd.stats.peoplePerBank=[people.length/2,people.length/2];
 group.userData={...group.userData,venueId:venue.id,spectators:people.length,crowd:crowd.stats,traffic:traffic.stats,street,homeFamilies:homeCounts,staticBatches,banners:{branding:'venue-event',venueId:venue.id,place:venueIdentity(venue.id).place,language:'km',textureCount:maps.size},courseLength:venue.length,reference:'docs/cambodia-research.md',measured:false,geography:{source:cambodiaLayout.source,projection:cambodiaLayout.projection,waterWay:cambodiaLayout.venues[venue.id].waterWay,bankSamples:cambodiaLayout.venues[venue.id].banks,landmarks},flags:flags.stats,landmarks:landmarks.map(l=>l.name)};
 return {update(time,cameraX,cameraZ,visibility){crowd.update(time,cameraX,cameraZ,visibility);traffic.update(time,cameraX,visibility);flags.update(time);floats.forEach((p,i)=>{dummy.position.set(from+((p.x-from+time*.2)%(to-from)),waterY+.03,p.z);dummy.rotation.set(0,hash(i)*6+Math.sin(time*.1+i)*.08,0);dummy.scale.set(.3+hash(i)*.8,.06,.35+hash(i+1)*.5);dummy.updateMatrix();floating.setMatrixAt(i,dummy.matrix);});floating.instanceMatrix.needsUpdate=true;},dispose(){crowd.dispose();traffic.dispose();}};
}
