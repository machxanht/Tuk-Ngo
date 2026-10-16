import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildCoherentBank} from './river-bank.mjs';
import {buildFestivalCrowd,loadFestivalCrowd} from './festival-crowd.mjs';

// A bounded, entirely 3D festival reach for inspecting the current boat.
// River width is 61 m; a quay separates spectators from the paddle envelope.
export async function loadFestivalBanks(scene,base){
 const assets=await loadFestivalCrowd(base,{compact:true});
 if(![...document.fonts].some(f=>f.family.replace(/["']/g,'')==='Noto Sans Khmer')){
  const font=new FontFace('Noto Sans Khmer','url('+base+'assets/illustrated-v22/NotoSansKhmer.ttf)',{weight:'100 900'});document.fonts.add(await font.load());
 }
 await document.fonts.load('600 64px "Noto Sans Khmer"');
 const group=new T.Group();group.name='Festival_Both_Banks';scene.add(group);
 const owned=new Set(),buckets=new Map(),people=[],banks=[],signs=[];
 const colors=['#ef6251','#f7c447','#43bbaf','#65a8dc','#ac84cb','#f09ac4'];
 function box(color,x,y,z,w,h,d,ry=0,rx=0){
  const g=new T.BoxGeometry(w,h,d);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,0)),new T.Vector3(1,1,1)));
  if(!buckets.has(color))buckets.set(color,[]);buckets.get(color).push(g);
 }
 function banner(text,x,y,z,width,height,side,color='#0f786c'){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,2048,256);c.fillStyle='#fff1b0';c.fillRect(18,18,2012,5);c.fillRect(18,233,2012,5);
  c.fillStyle='#ffffff';c.font='600 110px "Noto Sans Khmer",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,1024,128,1970);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),geometry=new T.PlaneGeometry(width,height),sign=new T.Mesh(geometry,material);
  sign.name='Khmer_Festival_Banner';sign.position.set(x,y,z);sign.rotation.y=side===1?Math.PI:0;sign.userData={language:'km',text};group.add(sign);signs.push(sign);owned.add(texture);owned.add(material);owned.add(geometry);
 }
 const ground=1.0,edge=30.5,origin=32.65;
 for(const side of [-1,1]){
  const bank=buildCoherentBank(group,{vibrant:true,clearPromenade:true});bank.group.position.set(0,ground,side*origin);if(side<0)bank.group.rotation.y=Math.PI;banks.push(bank);
  // Repeat seven frontage types along 150 m without duplicating their meshes.
  for(const source of [...bank.group.children].filter(o=>o.isMesh)){
   const instances=new T.InstancedMesh(source.geometry,source.material,3);
   for(let i=0;i<3;i++)instances.setMatrixAt(i,new T.Matrix4().makeTranslation((i-1)*50,0,0));
   instances.computeBoundingSphere();bank.group.remove(source);bank.group.add(instances);owned.add(instances);
  }
  // Continuous land, walkway and two traffic lanes continue beyond the shops.
  box('#9fc66b',0,.35,side*87,300,.7,110);
  box('#dedcc6',0,.86,side*33.5,180,.28,6);
  box('#8d9995',0,.80,side*40.65,180,.20,8);
  box('#e5d8b5',0,.95,side*(edge-.10),180,.7,.4);
  box('#cce0cf',0,1.95,side*(edge-.02),180,.10,.10);
  for(let x=-89;x<=89;x+=2){box('#cce0cf',x,1.52,side*(edge-.02),.055,.8,.055);box('#f9edbf',x,.91,side*40.65,.9,.018,.10);}
  // Tier tops and seated pelvis heights agree. The front promenade remains
  // clear of the tier structure, and cars stay behind the entire stand.
  for(let row=0;row<4;row++){
   const z=side*(origin+.6+row*1.05),top=ground+.45+row*.48;
   box('#efd7a5',0,(top+ground)/2,z,28,top-ground,1.05);
   box(colors[(row+(side>0?0:2))%colors.length],0,top+.20,z+.12*side,27.6,.12,.40);
   for(let x=-13.1;x<13.2;x+=.61)people.push({id:people.length,x,floor:top,seatY:top+.40,z,height:1,seated:true,yaw:side>0?Math.PI:0});
  }
  for(const x of [-14,-7,0,7,14])for(const dz of [.10,4.5])box('#f8e6b9',x,3.50,side*(origin+dz),.12,5,.12);
  // A shallow pitched canopy, with a separate warm-colour roof opposite.
  const roofColor=side>0?'#e57e52':'#49adaf';
  for(const slope of [-1,1])box(roofColor,0,6.25,side*(origin+2.2)+slope*1.4,30,.12,2.9,0,slope*.18);
  banner('ពិធីបុណ្យអុំទូក',0,5.30,side*(origin-.15),22,1.12,side);
  for(let row=0;row<4;row++)for(let x=-68;x<=68;x+=.64){
   if(row===3&&(Math.abs(x)<16||[-57,-42,42,57].some(stall=>Math.abs(x-stall)<3)))continue;
   const jitter=Math.sin(x*61+row*8+side)*.08;
   people.push({id:people.length,x:x+jitter,floor:ground,z:side*(edge+.52+row*.63),yaw:side>0?Math.PI:0});
  }
  // Animated vendors and diners share the same people models as the crowd.
  for(const x of [-57,-42,42,57]){
   const z=side*(origin+1.9),color=colors[(Math.abs(x)+side+6)%colors.length];
   for(const dx of [-2,2])for(const dz of [-1.3,1.3])box('#f2e8d3',x+dx,2.25,z+dz,.07,2.5,.07);
   box(color,x,3.65,z,4.5,.13,3.1);box('#f2e2b5',x,1.58,z,3.9,1.16,.65);
   banner('អាហារ និងភេសជ្ជៈ',x,3.20,z-side*1.42,4.1,.55,side,color);
   for(let i=0;i<9;i++)people.push({id:people.length,x:x-2.1+(i%5)*.82,floor:ground,z:z+side*(i<5?-1.9:1),activity:i<5?'eat':'vendor',yaw:side>0?Math.PI:0});
  }
  for(let i=0;i<85;i++){
   const x=-67+i*1.6,z=side*(origin+(i%2?12.65:12.05));
   people.push({id:people.length,x,floor:ground-.10,z,activity:i%3?'walk':'talk',path:{dx:1,dz:0,extent:.6+(i%4)*.28}});
  }
  for(let i=0;i<45;i++){
   const x=(i%2?1:-1)*(18+Math.floor(i/2)*2.1),z=side*(origin+3.65);
   people.push({id:people.length,x,floor:ground,z,activity:'walk',path:{dx:1,dz:0,extent:.48}});
  }
 }
 for(const [color,parts]of buckets){
  const geometry=mergeGeometries(parts,false),material=new T.MeshStandardMaterial({color,roughness:.85}),mesh=new T.Mesh(geometry,material);parts.forEach(g=>g.dispose());group.add(mesh);owned.add(geometry);owned.add(material);
 }
 const crowd=buildFestivalCrowd(group,people,assets,{vibrant:true,middleLimit:280});
 const stats={banks:2,people:people.length,peoplePerBank:[people.filter(p=>p.z<0).length,people.filter(p=>p.z>0).length],stands:2,banners:signs.length,houses:banks.reduce((s,b)=>s+b.stats.lots*3,0),clothingColors:12,npcVariants:assets.models.length,riverWidthM:61,continuousLand:true,source:'Quaternius CC0 people; existing authored Mekong street',crowd:crowd.stats};
 group.userData.festival=stats;
 return {group,stats,update(time,camera){crowd.update(time,camera.position.x,camera.position.z);for(const b of banks)b.update(time);},dispose(){crowd.dispose();banks.forEach(b=>b.dispose());owned.forEach(o=>o.dispose());assets.dispose();scene.remove(group);group.clear();}};
}
