/* Painted festival layers for the standalone illustration preview. */
(()=>{
 const CONFIG=TukNgoConfig,LAYOUT=CONFIG.layout;
 const WIDTH=CONFIG.camera.width,HEIGHT=CONFIG.camera.height,images={},groups={};let background;
 const personRasters=new Map(),rippleRows=[];
 let seed=20251004;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const wrap=(x,span)=>((x%span)+span)%span;
 const nearFeet=x=>LAYOUT.near.frontY+x*LAYOUT.near.slope;
 function roadEdge(x){const points=LAYOUT.near.roadEdge;let i=0;while(i<points.length-2&&x>points[i+1][0])i++;const a=points[i],b=points[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*t;}
 const crowds=[],walkers=[],traffic=[],stalls=[];
 for(let row=0;row<LAYOUT.far.crowdRows;row++)for(let col=0;col<LAYOUT.far.crowdColumns;col++){
  const x=col*LAYOUT.far.crowdStep+(row%2)*7+rand()*5;
  // Leave an access strip to the upstream bridge abutment.
  if(x>1920&&x<2020)continue;
  crowds.push({bank:'far',id:crowds.length,x,y:LAYOUT.far.frontY+row*LAYOUT.far.rowDepth+rand()*4,variant:Math.floor(rand()*8),height:LAYOUT.far.humanHeight[0]+rand()*12,phase:rand()*6.28,speed:1.7+rand()*2.3});
 }
 for(let row=0;row<LAYOUT.near.crowdRows;row++)for(let col=0;col<LAYOUT.near.crowdColumns;col++){
  const x=col*LAYOUT.near.crowdStep+(row%2)*13+rand()*6;
  const depth=Math.min(LAYOUT.near.rowDepth,Math.max(5,(roadEdge(x)-30-nearFeet(x))/(LAYOUT.near.crowdRows-1))),y=nearFeet(x)+row*depth+rand()*4;
  if(LAYOUT.nearStalls.some(s=>Math.abs(x-s.x)<120&&y>s.y-58))continue;
  crowds.push({bank:'near',id:crowds.length,x,y,variant:8+Math.floor(rand()*4),height:LAYOUT.near.humanHeight[0]+rand()*16,phase:rand()*6.28,speed:1.4+rand()*2.8});
 }
 // Occupy the main stand's seats, below its roof and behind its front railing.
 for(let row=0;row<6;row++)for(let col=0;col<62;col++)crowds.push({bank:'stand',id:crowds.length,x:220+col*14.4+rand()*3,y:292+row*16+col*.032,variant:Math.floor(rand()*8),height:31+rand()*6,phase:rand()*6.28,speed:1.2+rand()*2.8});
 for(let row=0;row<4;row++)for(let col=0;col<45;col++)crowds.push({bank:'nearStand',id:crowds.length,x:20+col*16+rand()*3,y:1294+row*14+col*.24,variant:8+Math.floor(rand()*4),height:51+rand()*6,phase:rand()*6.28,speed:1.2+rand()*2.8});
 const [bridgeStart,bridgeEnd]=LAYOUT.bridge.deck;
 for(let x=bridgeStart.x;x<bridgeEnd.x;x+=18)crowds.push({bank:'bridge',id:crowds.length,x,y:bridgeStart.y+(x-bridgeStart.x)/(bridgeEnd.x-bridgeStart.x)*(bridgeEnd.y-bridgeStart.y),variant:Math.floor(rand()*8),height:32,phase:rand()*6.28,speed:1.4+rand()*2});
 for(let i=0;i<64;i++)walkers.push({id:i,bank:i<42?'far':'near',x:rand()*2600,variant:i%4,height:i<42?51+rand()*7:111+rand()*12,speed:12+rand()*14,phase:rand()*4,dir:i%3?1:-1});
 for(let i=0;i<16;i++)traffic.push({id:i,bank:i<10?'far':'near',x:rand()*2800,variant:i%6,speed:35+rand()*42,dir:i%2?1:-1});
 LAYOUT.farStalls.positions.forEach((x,i)=>stalls.push({bank:'far',x,y:LAYOUT.farStalls.y,height:LAYOUT.farStalls.height,variant:i%4,vendor:i%8}));
 LAYOUT.nearStalls.forEach(s=>stalls.push({bank:'near',...s}));

 function paint(ctx,key,index,x,y,height,flip=false,alpha=1){
  const frame=groups[key].cells[index],image=images[key];
  const [sx,sy,sw,sh]=frame.rect,[ax,ay]=frame.anchor,s=height/frame.height;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(flip?-s:s,s);ctx.drawImage(image,sx,sy,sw,sh,-ax,-ay,sw,sh);ctx.restore();
 }
 function person(ctx,p,t){
  const frame=Math.sin(t*p.speed+p.phase)>0?1:0;
  const row=Math.floor(p.variant/2),col=p.variant%2*2+frame;
  const base=groups.spectators.cells[row*4+col];
  const first=row*4+p.variant%2*2,referenceHeight=Math.max(groups.spectators.cells[first].height,groups.spectators.cells[first+1].height);
  const child=(p.variant===6||p.variant===7)? .75:1;
  const height=Math.max(4,Math.round(p.height*child/4)*4),key=`${p.variant}:${frame}:${height}`;
  let raster=personRasters.get(key);
  if(!raster){
   const [sx,sy,sw,sh]=base.rect,[ax,ay]=base.anchor,scale=height/referenceHeight,c=document.createElement('canvas');
   c.width=Math.ceil(sw*scale)+2;c.height=Math.ceil(sh*scale)+2;
   c.getContext('2d').drawImage(images.spectators,sx,sy,sw,sh,1,1,sw*scale,sh*scale);
   raster={image:c,x:-ax*scale-1,y:-ay*scale-1};personRasters.set(key,raster);
  }
  ctx.drawImage(raster.image,p.x+raster.x,p.y+raster.y+Math.sin(t*p.speed+p.phase)*.55);
 }
 function sign(ctx,text,x,y,width,height){
  ctx.save();ctx.fillStyle=CONFIG.style.banner;ctx.fillRect(x-width/2,y-height/2,width,height);
  ctx.strokeStyle='#eec574';ctx.lineWidth=2;ctx.strokeRect(x-width/2+3,y-height/2+3,width-6,height-6);
  ctx.font=`600 ${Math.round(height*.57)}px FestivalKhmer`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=CONFIG.style.bannerText;
  ctx.fillText(text,x,y+height*.03,width-22);ctx.restore();
 }
 function road(ctx){
  const g=ctx.createLinearGradient(0,330,0,405);g.addColorStop(0,'#b7b6aa');g.addColorStop(1,'#989d95');
  ctx.fillStyle=g;ctx.fillRect(0,335,WIDTH,68);ctx.strokeStyle='#efdfb690';ctx.lineWidth=2;ctx.setLineDash([26,28]);
  ctx.beginPath();ctx.moveTo(0,370);ctx.lineTo(WIDTH,370);ctx.stroke();ctx.setLineDash([]);
 }
 function bake(){
  background=document.createElement('canvas');background.width=WIDTH;background.height=HEIGHT;const c=background.getContext('2d');
  c.drawImage(images.landscape,0,0,WIDTH,HEIGHT);road(c);
  for(let i=0;i<20;i++)paint(c,'plants',i%3,i*132+Math.sin(i*2.7)*30,337,LAYOUT.plantHeights[i%3]);
  let frontage=-20;
  for(let i=0;frontage<WIDTH+100;i++){
   const type=i%6,cell=groups.buildings.cells[type],height=LAYOUT.buildingHeights[type],width=(cell.bounds[2]-cell.bounds[0])*height/cell.height;
   paint(c,'buildings',type,frontage+width*.5,347,height);frontage+=width*.89;
  }
  for(let i=0;i<12;i++)paint(c,'plants',i%6,80+i*211,355,LAYOUT.plantHeights[i%6]*.55);
  for(let row=0;row<35;row++){
   const strip=document.createElement('canvas');strip.width=2600;strip.height=10;const rc=strip.getContext('2d');
   rc.strokeStyle=row%3?'#fff8de80':'#809caa50';rc.lineWidth=1.3+row/60;
   for(let col=0;col<20;col++){const x=col*130+Math.sin(row*3)*38;rc.beginPath();rc.moveTo(x,5);rc.bezierCurveTo(x+16,3,x+40,7,x+67,5+Math.sin(col)*1.5);rc.stroke();}
   rippleRows.push(strip);
  }
  // Warm both poses before exposing the page as ready; reuse their rasters.
  const warmup=document.createElement('canvas');warmup.width=1;warmup.height=1;
  for(const p of crowds)for(const stamp of [0,Math.PI/p.speed])person(warmup.getContext('2d'),p,stamp);
 }
 function drawTraffic(ctx,t,bank){
  for(const v of traffic.filter(v=>v.bank===bank)){
   const x=wrap(v.x-t*v.speed*v.dir+150,2800)-150;
   const y=bank==='far'?LAYOUT.far.roadY:LAYOUT.near.roadY+x*LAYOUT.near.roadSlope;
   const height=bank==='far'?(v.variant<3?53:45):(v.variant<3?130:105);
   paint(ctx,'vehicles',v.variant,x,y+Math.sin(t*6+v.id)*.4,height,v.dir<0);
  }
 }
 function drawWalkers(ctx,t,bank){
  for(const p of walkers.filter(p=>p.bank===bank)){
   const x=wrap(p.x-t*p.speed*p.dir+80,2560)-80;
   const y=bank==='far'?LAYOUT.far.walkY:roadEdge(x)+LAYOUT.near.walkOffsetFromRoad;
   const frame=Math.floor(wrap(t*(3+p.variant*.25)+p.phase,4));
   const cell=groups.walkers.cells[p.variant*4+frame],ref=Math.max(...groups.walkers.cells.slice(p.variant*4,p.variant*4+4).map(c=>c.height));
   paint(ctx,'walkers',p.variant*4+frame,x,y,p.height*cell.height/ref,p.dir<0);
  }
 }
 function drawStalls(ctx,t,bank){
  for(const s of stalls.filter(s=>s.bank===bank)){
   const cell=groups.stalls.cells[s.variant],scale=s.height/cell.height;
   const [ax,ay]=cell.anchor;
   // Put the vendor behind the counter; redraw the painted counter in front.
   paint(ctx,'stalls',s.variant,s.x,s.y,s.height);
   const vendor={x:s.x,y:s.y,variant:s.vendor,height:bank==='near'?116:48,phase:s.x,speed:1.3};
   ctx.save();ctx.beginPath();ctx.rect(s.x-s.height*.3,s.y-s.height*.68,s.height*.6,s.height*.39);ctx.clip();person(ctx,vendor,t);ctx.restore();
   const [sx,sy,sw,sh]=cell.rect;
   ctx.save();ctx.beginPath();ctx.rect(s.x-ax*scale,s.y-s.height*.34,sw*scale,s.height*.36);ctx.clip();
   ctx.drawImage(images.stalls,sx,sy,sw,sh,s.x-ax*scale,s.y-ay*scale,sw*scale,sh*scale);ctx.restore();
   if(bank==='near'){
    sign(ctx,s.variant===1?'អាហារ':'ភេសជ្ជៈ',s.x,s.y-s.height*.63,s.height*.53,30);
    for(let j=0;j<3;j++)person(ctx,{x:s.x-s.height*.44+j*s.height*.3,y:s.y+7,variant:(s.vendor+j*2)%8,height:105,phase:j*3+s.x,speed:1.4+j*.3},t);
   }
  }
 }
 function drawBack(ctx,t){
  ctx.drawImage(background,0,0);
  // Ripples cover only water, leaving the painted banks still.
  ctx.save();ctx.beginPath();ctx.moveTo(0,510);ctx.lineTo(WIDTH,475);ctx.lineTo(WIDTH,958);ctx.lineTo(0,1310);ctx.closePath();ctx.clip();
  rippleRows.forEach((strip,row)=>{const x=-wrap(t*(20+row*.8),2600),y=505+row*23;ctx.drawImage(strip,x,y);ctx.drawImage(strip,x+2600,y);});ctx.restore();
  drawTraffic(ctx,t,'far');drawWalkers(ctx,t,'far');
  const main=LAYOUT.mainStand;
  paint(ctx,'infrastructure',0,main.x,main.y,main.height);
  for(const p of crowds.filter(p=>p.bank==='stand'))person(ctx,p,t);
  // Reinstate the stand's front rail/foundation after its spectators.
  const frame=groups.infrastructure.cells[0],s=main.height/frame.height,[ax,ay]=frame.anchor,[sx,sy,sw,sh]=frame.rect;
  ctx.save();ctx.beginPath();ctx.rect(...main.frontClip);ctx.clip();ctx.drawImage(images.infrastructure,sx,sy,sw,sh,main.x-ax*s,main.y-ay*s,sw*s,sh*s);ctx.restore();
  sign(ctx,'ពិធីបុណ្យអកអំបុក · ប្រណាំងទូកង',main.banner.x,main.banner.y,main.banner.width,main.banner.height);
  drawStalls(ctx,t,'far');
  for(const p of crowds.filter(p=>p.bank==='far'))person(ctx,p,t);
  // One upstream bridge crosses the river in perspective. The other bridge
  // belongs to the opposite course end, outside this racing window.
  const bridge=LAYOUT.bridge;
  ctx.drawImage(images.bridge,bridge.x,bridge.y,images.bridge.width*bridge.scale,images.bridge.height*bridge.scale);
  for(const p of crowds.filter(p=>p.bank==='bridge'))person(ctx,p,t);
  sign(ctx,'សូមស្វាគមន៍',1380,491,300,43);
  sign(ctx,'ប្រណាំងទូកង',1770,491,295,43);
  sign(ctx,'អបអរសាទរ',2180,484,286,43);
 }
 function drawFront(ctx,t){
  // The near-bank crowd faces away from the camera and toward the boats.
  for(const p of crowds.filter(p=>p.bank==='near').sort((a,b)=>a.y-b.y))person(ctx,p,t);
  const stand=LAYOUT.nearStand;
  paint(ctx,'infrastructure',1,stand.x,stand.y,stand.height);
  for(const p of crowds.filter(p=>p.bank==='nearStand'))person(ctx,p,t);
  const frame=groups.infrastructure.cells[1],scale=stand.height/frame.height,[ax,ay]=frame.anchor,[sx,sy,sw,sh]=frame.rect;
  ctx.save();ctx.beginPath();ctx.rect(...stand.frontClip);ctx.clip();ctx.drawImage(images.infrastructure,sx,sy,sw,sh,stand.x-ax*scale,stand.y-ay*scale,sw*scale,sh*scale);ctx.restore();
  sign(ctx,'ប្រណាំងទូកង',stand.banner.x,stand.banner.y,stand.banner.width,stand.banner.height);
  paint(ctx,'buildings',2,2530,1520,390);
  drawStalls(ctx,t,'near');
  drawWalkers(ctx,t,'near');drawTraffic(ctx,t,'near');
  paint(ctx,'plants',3,35,nearFeet(35)+30,180);paint(ctx,'plants',5,1430,nearFeet(1430)+10,100);
 }
 async function load(){
  const response=await fetch('festival-atlas.json');if(!response.ok)throw Error('Cannot load festival atlas');Object.assign(groups,await response.json());
  const files={landscape:'festival-landscape.webp',bridge:CONFIG.assets.bridge,...Object.fromEntries(Object.entries(groups).map(([key,value])=>[key,value.file.replace(/\.png$/,'.webp')]))};
  await Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(Error('Cannot load '+file));img.src=file;})));
  const font=new FontFace('FestivalKhmer','url(NotoSansKhmer.ttf)');await font.load();document.fonts.add(font);bake();
 }
 window.festivalScene={load,drawBack,drawFront,roadEdge,WIDTH,HEIGHT,crowds,walkers,traffic,stalls,groups,images,stats:{spectators:crowds.length,identities:16,walkers:walkers.length,vehicles:traffic.length,stalls:stalls.length,buildingTypes:6,plantTypes:6,stands:2,bridges:1,bridgeAssetTypes:2,configuration:CONFIG.revision}};
})();
