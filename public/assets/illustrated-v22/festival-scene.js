/* Painted festival layers for the standalone illustration preview. */
(()=>{
 const WIDTH=2400,HEIGHT=1500,images={},groups={};let background;
 let seed=20251004;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const wrap=(x,span)=>((x%span)+span)%span;
 const nearFeet=x=>1420-x*.145;
 const crowds=[],walkers=[],traffic=[],stalls=[];
 for(let row=0;row<7;row++)for(let col=0;col<156;col++){
  const x=col*15.6+(row%2)*7+rand()*5;
  crowds.push({bank:'far',id:crowds.length,x,y:423+row*6+rand()*4,variant:Math.floor(rand()*8),height:43+rand()*12,phase:rand()*6.28,speed:1.7+rand()*2.3});
 }
 for(let row=0;row<5;row++)for(let col=0;col<81;col++){
  const x=col*30+(row%2)*13+rand()*6;
  crowds.push({bank:'near',id:crowds.length,x,y:nearFeet(x)+row*17+rand()*5,variant:8+Math.floor(rand()*4),height:102+rand()*23,phase:rand()*6.28,speed:1.4+rand()*2.8});
 }
 // Occupy the main stand's seats, below its roof and behind its front railing.
 for(let row=0;row<6;row++)for(let col=0;col<62;col++)crowds.push({bank:'stand',id:crowds.length,x:220+col*14.4+rand()*3,y:292+row*16+col*.032,variant:Math.floor(rand()*8),height:31+rand()*6,phase:rand()*6.28,speed:1.2+rand()*2.8});
 for(let row=0;row<4;row++)for(let col=0;col<45;col++)crowds.push({bank:'nearStand',id:crowds.length,x:col*18+rand()*3,y:1360+row*18+col*.42,variant:8+Math.floor(rand()*4),height:58+rand()*7,phase:rand()*6.28,speed:1.2+rand()*2.8});
 for(let i=0;i<71;i++)crowds.push({bank:'bridge',id:crowds.length,x:1486+i*18,y:369+i*.75,variant:Math.floor(rand()*8),height:28,phase:rand()*6.28,speed:1.4+rand()*2});
 for(let i=0;i<64;i++)walkers.push({id:i,bank:i<42?'far':'near',x:rand()*2600,variant:i%4,height:i<42?51+rand()*7:111+rand()*12,speed:12+rand()*14,phase:rand()*4,dir:i%3?1:-1});
 for(let i=0;i<16;i++)traffic.push({id:i,bank:i<10?'far':'near',x:rand()*2800,variant:i%6,speed:35+rand()*42,dir:i%2?1:-1});
 for(let i=0;i<10;i++)stalls.push({bank:'far',x:1320+i*107,y:426,height:98,variant:i%4,vendor:i%8});
 stalls.push({bank:'near',x:1660,y:1430,height:260,variant:1,vendor:2},{bank:'near',x:2000,y:1380,height:305,variant:0,vendor:4},{bank:'near',x:2310,y:1320,height:290,variant:3,vendor:0});

 function paint(ctx,key,index,x,y,height,flip=false,alpha=1){
  const frame=groups[key].cells[index],image=images[key];
  const [sx,sy,sw,sh]=frame.rect,[ax,ay]=frame.anchor,s=height/frame.height;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(flip?-s:s,s);ctx.drawImage(image,sx,sy,sw,sh,-ax,-ay,sw,sh);ctx.restore();
 }
 function person(ctx,p,t){
  const frame=Math.sin(t*p.speed+p.phase)>0?1:0;
  const row=Math.floor(p.variant/2),col=p.variant%2*2+frame;
  const base=groups.spectators.cells[row*4+col];
  const pair=groups.spectators.cells.slice(row*4+p.variant%2*2,row*4+p.variant%2*2+2);
  const referenceHeight=Math.max(...pair.map(c=>c.height));
  const child=(p.variant===6||p.variant===7)? .75:1;
  paint(ctx,'spectators',row*4+col,p.x,p.y+Math.sin(t*p.speed+p.phase)*.55,p.height*child*base.height/referenceHeight);
 }
 function sign(ctx,text,x,y,width,height){
  ctx.save();ctx.fillStyle='#a91e19';ctx.fillRect(x-width/2,y-height/2,width,height);
  ctx.strokeStyle='#eec574';ctx.lineWidth=2;ctx.strokeRect(x-width/2+3,y-height/2+3,width-6,height-6);
  ctx.font=`600 ${Math.round(height*.57)}px FestivalKhmer`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffe4a0';
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
  for(let i=0;i<24;i++)paint(c,'plants',i%3,i*105+Math.sin(i*2.7)*30,338,130+(i%4)*20);
  for(let i=0;i<19;i++)paint(c,'buildings',i%6,55+i*128,347,175+(i%4)*28);
  for(let i=0;i<14;i++)paint(c,'plants',i%6,82+i*173,355,85+(i%4)*28);
 }
 function drawTraffic(ctx,t,bank){
  for(const v of traffic.filter(v=>v.bank===bank)){
   const x=wrap(v.x-t*v.speed*v.dir+150,2800)-150;
   const y=bank==='far'?393:1620-x*.117;
   const height=bank==='far'?(v.variant<3?53:45):(v.variant<3?130:105);
   paint(ctx,'vehicles',v.variant,x,y+Math.sin(t*6+v.id)*.4,height,v.dir<0);
  }
 }
 function drawWalkers(ctx,t,bank){
  for(const p of walkers.filter(p=>p.bank===bank)){
   const x=wrap(p.x-t*p.speed*p.dir+80,2560)-80;
   const y=bank==='far'?412:1540-x*.145;
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
   const vendor={x:s.x,y:s.y-s.height*.11,variant:s.vendor,height:s.height*.64,phase:s.x,speed:1.3};
   ctx.save();ctx.beginPath();ctx.rect(s.x-s.height*.3,s.y-s.height*.68,s.height*.6,s.height*.39);ctx.clip();person(ctx,vendor,t);ctx.restore();
   const [sx,sy,sw,sh]=cell.rect;
   ctx.save();ctx.beginPath();ctx.rect(s.x-ax*scale,s.y-s.height*.34,sw*scale,s.height*.36);ctx.clip();
   ctx.drawImage(images.stalls,sx,sy,sw,sh,s.x-ax*scale,s.y-ay*scale,sw*scale,sh*scale);ctx.restore();
   if(bank==='near'){
    sign(ctx,s.variant===1?'អាហារ':'ភេសជ្ជៈ',s.x,s.y-s.height*.63,s.height*.53,30);
    for(let j=0;j<3;j++)person(ctx,{x:s.x-s.height*.44+j*s.height*.3,y:s.y+7,variant:(s.vendor+j*2)%8,height:s.height*.42,phase:j*3+s.x,speed:1.4+j*.3},t);
   }
  }
 }
 function drawBack(ctx,t){
  ctx.drawImage(background,0,0);
  // Ripples cover only water, leaving the painted banks still.
  ctx.save();ctx.beginPath();ctx.moveTo(0,510);ctx.lineTo(WIDTH,475);ctx.lineTo(WIDTH,958);ctx.lineTo(0,1310);ctx.closePath();ctx.clip();
  for(let row=0;row<35;row++)for(let col=0;col<20;col++){
   const x=wrap(col*130+Math.sin(row*3)*38-t*(20+row*.8),WIDTH+150)-75,y=510+row*23;
   ctx.strokeStyle=row%3?'#fff8de80':'#809caa50';ctx.lineWidth=1.3+(row/60);ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+16,y-2,x+40,y+2,x+67,y+Math.sin(t+col)*1.5);ctx.stroke();
  }ctx.restore();
  drawTraffic(ctx,t,'far');drawWalkers(ctx,t,'far');
  paint(ctx,'infrastructure',0,675,444,297);
  for(const p of crowds.filter(p=>p.bank==='stand'))person(ctx,p,t);
  // Reinstate the stand's front rail/foundation after its spectators.
  const frame=groups.infrastructure.cells[0],s=297/frame.height,[ax,ay]=frame.anchor,[sx,sy,sw,sh]=frame.rect;
  ctx.save();ctx.beginPath();ctx.rect(130,399,1100,51);ctx.clip();ctx.drawImage(images.infrastructure,sx,sy,sw,sh,675-ax*s,444-ay*s,sw*s,sh*s);ctx.restore();
  sign(ctx,'ពិធីបុណ្យអកអំបុក · ប្រណាំងទូកង',681,232,798,53);
  drawStalls(ctx,t,'far');
  for(const p of crowds.filter(p=>p.bank==='far'))person(ctx,p,t);
  // Bridges are in front of the farther promenade; their arches must remain
  // visible above the crowd, while the boats pass in front of their piers.
  paint(ctx,'infrastructure',2,2130,604,388);
  paint(ctx,'infrastructure',3,2730,586,255);
  for(const p of crowds.filter(p=>p.bank==='bridge'))person(ctx,p,t);
  sign(ctx,'សូមស្វាគមន៍',1380,491,300,43);
  sign(ctx,'ប្រណាំងទូកង',1770,491,295,43);
  sign(ctx,'អបអរសាទរ',2180,484,286,43);
 }
 function drawFront(ctx,t){
  // The near-bank crowd faces away from the camera and toward the boats.
  for(const p of crowds.filter(p=>p.bank==='near').sort((a,b)=>a.y-b.y))person(ctx,p,t);
  drawWalkers(ctx,t,'near');drawTraffic(ctx,t,'near');
  paint(ctx,'infrastructure',1,380,1490,270);
  for(const p of crowds.filter(p=>p.bank==='nearStand'))person(ctx,p,t);
  const frame=groups.infrastructure.cells[1],scale=270/frame.height,[ax,ay]=frame.anchor,[sx,sy,sw,sh]=frame.rect;
  ctx.save();ctx.beginPath();ctx.rect(0,1441,1000,80);ctx.clip();ctx.drawImage(images.infrastructure,sx,sy,sw,sh,380-ax*scale,1490-ay*scale,sw*scale,sh*scale);ctx.restore();
  sign(ctx,'ប្រណាំងទូកង',403,1470,700,40);
  paint(ctx,'buildings',2,2530,1520,390);
  drawStalls(ctx,t,'near');
  paint(ctx,'plants',3,35,nearFeet(35)+30,180);paint(ctx,'plants',5,1430,nearFeet(1430)+10,100);
 }
 async function load(){
  const response=await fetch('festival-atlas.json');if(!response.ok)throw Error('Cannot load festival atlas');Object.assign(groups,await response.json());
  const files={landscape:'festival-landscape.webp',...Object.fromEntries(Object.entries(groups).map(([key,value])=>[key,value.file.replace(/\.png$/,'.webp')]))};
  await Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(Error('Cannot load '+file));img.src=file;})));
  const font=new FontFace('FestivalKhmer','url(NotoSansKhmer.ttf)');await font.load();document.fonts.add(font);bake();
 }
 window.festivalScene={load,drawBack,drawFront,WIDTH,HEIGHT,crowds,walkers,traffic,stalls,groups,images,stats:{spectators:crowds.length,identities:16,walkers:walkers.length,vehicles:traffic.length,stalls:stalls.length,buildingTypes:6,plantTypes:6,stands:2,bridges:2}};
})();
