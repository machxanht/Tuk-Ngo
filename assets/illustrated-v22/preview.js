/* Painted asset demo and practice view, independent of the legacy 3D route. */
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
const CONFIG=TukNgoConfig,W=CONFIG.camera.width;let H=CONFIG.camera.height,sceneMode='festival',gameMode='demo',renderedFrames=0,renderScale=1;
function resizeCanvas(){const width=Math.min(CONFIG.camera.maxRenderWidth,(canvas.clientWidth||innerWidth)*Math.min(devicePixelRatio||1,CONFIG.camera.maxPixelRatio));renderScale=width/W;canvas.width=Math.round(width);canvas.height=Math.round(H*renderScale);}
resizeCanvas();
const sources={hull:CONFIG.assets.hull,seated:'rower-seated-4poses.webp',standing:'rower-standing-4poses.webp',roles:'caller-controller-helm-2poses.webp',fx:'water-effects.webp'};
const images={};let ready=false,playing=true,time=0,cadence=80,last=null,manualPose=false;
const hull=CONFIG.boat.hull,profile=CONFIG.boat.profile,crew=CONFIG.boat.crew;
function edge(x,column){let i=0;while(i<profile.length-2&&x>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a[column]+(b[column]-a[column])*t;}
const world=(x,y)=>[hull.x+x*hull.sx,hull.y+y*hull.sy];
const seated=[
 {rect:[0,0,687,580],anchor:[560,405]},
 {rect:[687,0,687,580],anchor:[545,420]},
 {rect:[0,580,687,565],anchor:[405,375]},
 {rect:[687,580,687,565],anchor:[550,402]}
];
const standing=[
 {rect:[0,0,687,585],anchor:[490,570]},
 {rect:[687,0,687,585],anchor:[449,570]},
 {rect:[0,585,687,560],anchor:[447,526]},
 {rect:[687,585,687,560],anchor:[475,528]}
];
const roles={
 caller:[{rect:[0,0,400,540],anchor:[245,415]},{rect:[0,540,400,484],anchor:[245,400]}],
 controller:[{rect:[400,0,425,540],anchor:[225,516]},{rect:[400,540,425,484],anchor:[236,428]}],
 helm:[{rect:[825,0,711,540],anchor:[155,474]},{rect:[825,540,711,484],anchor:[178,393]}]
};
// The lower paddle is a separate foreground layer sampled from the same art.
// Its grip remains fixed while its length reaches past the gunwale into water.
const paddleLayers={
 seated:[
  {pivot:350,stretch:1.5,points:[[148,350],[164,354],[137,428],[105,540],[93,560],[57,571],[39,560],[39,541],[83,442],[122,397]]},
  {pivot:346,stretch:1.5,points:[[309,346],[326,342],[356,415],[397,539],[400,560],[380,572],[356,572],[339,551],[300,450]]},
  {pivot:342,stretch:1.35,points:[[469,348],[481,336],[530,374],[595,432],[650,485],[662,506],[650,526],[630,528],[611,521],[527,437],[508,408]]},
  {pivot:288,stretch:1.5,points:[[153,286],[168,294],[144,352],[114,416],[102,449],[90,465],[59,474],[44,460],[43,443],[99,367],[133,330]]}
 ],
 standing:[
  {pivot:366,stretch:1.4,points:[[170,366],[186,373],[151,444],[125,552],[108,572],[87,568],[84,550],[130,438]]},
  {pivot:314,stretch:1.4,points:[[300,314],[319,311],[345,409],[395,549],[396,565],[380,578],[355,577],[337,550],[313,440]]},
  {pivot:280,stretch:1.4,points:[[489,286],[503,274],[571,343],[646,415],[684,462],[677,488],[654,499],[630,489],[550,407],[525,341]]},
  {pivot:260,stretch:1.3,points:[[168,259],[189,266],[157,327],[140,350],[119,397],[95,437],[69,445],[49,430],[56,409],[111,333],[144,311]]}
 ]
};
const members=[];
for(let row=0;row<crew.rows;row++)for(let lane=0;lane<2;lane++)members.push({id:2+row*2+lane,role:'ROWER',posture:row<crew.seatedRows?'seated':'standing',row,lane,x:crew.firstRowX+row*crew.rowPitch+(row>11?crew.controllerGap:0)});
members.push({id:1,role:'BOW_CALLER',x:crew.callerX},{id:52,role:'MID_CONTROLLER',x:crew.controllerX});
for(let i=0;i<3;i++)members.push({id:53+i,role:'HELMSMAN',x:crew.helmFirstX+i*crew.helmPitch});
const practice={strokes:0,accuracy:0,lastScore:0};
function sprite(image,frame,x,y,scale,alpha=1){
 const [sx,sy,sw,sh]=frame.rect,[ax,ay]=frame.anchor;
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(image,sx,sy,sw,sh,x-ax*scale,y-ay*scale,sw*scale,sh*scale);ctx.restore();
}
function paddle(m,frame){
 const art=(m.posture==='seated'?seated:standing)[frame],layer=paddleLayers[m.posture][frame];
 const [sx,sy,sw,sh]=art.rect,[ax,ay]=art.anchor;
 const [x,y]=world(m.x,m.posture==='seated'?edge(m.x,1)+7:edge(m.x,2)-5);
 const scale=.219*(m.posture==='standing'?1:.98);
 ctx.save();ctx.translate(x-ax*scale,y-ay*scale);ctx.scale(scale,scale);
 ctx.translate(0,layer.pivot);ctx.scale(1,layer.stretch);ctx.translate(0,-layer.pivot);
 ctx.beginPath();layer.points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();
 ctx.drawImage(images[m.posture],sx,sy,sw,sh,0,0,sw,sh);ctx.restore();
}
function effect(index,x,y,width,alpha=1){
 const cols=3,rows=2,sw=images.fx.width/cols,sh=images.fx.height/rows;
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(images.fx,index%3*sw,Math.floor(index/3)*sh,sw,sh,x-width/2,y-width*.64,width,width*sh/sw);ctx.restore();
}
function water(t){
 const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#e4eee9');gradient.addColorStop(.18,'#cfcbc0');gradient.addColorStop(.62,'#c7af8c');gradient.addColorStop(1,'#b9956f');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
 for(let row=0;row<29;row++){
  const y=215+row*21;ctx.lineWidth=1.5+row*.025;ctx.strokeStyle=row%3?'#edf1e995':'#7399a35a';
  for(let col=0;col<22;col++){
   const x=((col*121+Math.sin(row*2.1)*50-t*(17+row*.4))%(W+160)+W+160)%(W+160)-80;
   ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+17,y-3,x+48,y+3,x+78,y+Math.sin(t+col)*1.5);ctx.stroke();
  }
 }
}
function drawBoat(t,animation={}){
 if(!ready)return;const tempo=animation.cadence??cadence,motion=animation.motion??1,cycles=animation.cycles??t*tempo/60;
 const phase=((cycles%1)+1)%1,frame=Math.floor(phase*4),roleFrame=phase<.5?0:1;
 if(motion>0)effect(4,2210,452,385+Math.max(0,tempo-85)*5,.72*motion);
 ctx.drawImage(images.hull,hull.x,hull.y,hull.width*hull.sx,hull.height*hull.sy);
 // Far bank of the boat is rendered before the near bank of rowers.
 for(const lane of [1,0])for(const m of members.filter(m=>m.role==='ROWER'&&m.lane===lane).reverse()){
  const rail=edge(m.x,1),floor=edge(m.x,2)-5-(lane?19:0);
  const [x,y]=world(m.x+(lane?7:0),m.posture==='seated'?rail+(lane?-20:7):floor);
  const scale=(lane?.205:.219)*(m.posture==='standing'?1:.98);
  sprite(images[m.posture],(m.posture==='seated'?seated:standing)[frame],x,y,scale);
 }
 const caller=members.find(m=>m.role==='BOW_CALLER'),controller=members.find(m=>m.role==='MID_CONTROLLER');
 sprite(images.roles,roles.caller[roleFrame],...world(caller.x,edge(caller.x,1)+3),.24);
 sprite(images.roles,roles.controller[roleFrame],...world(controller.x,edge(controller.x,2)-21),.26);
 for(const m of members.filter(m=>m.role==='HELMSMAN'))sprite(images.roles,roles.helm[roleFrame],...world(m.x,edge(m.x,2)-9),.30);
 // The painted outer hull covers the legs inside it. Pixels outside the boat
 // remain transparent, so the paddles stay visible below the waterline.
 ctx.save();ctx.beginPath();ctx.moveTo(...world(20,0));
 ctx.lineTo(...world(250,455));for(const p of profile.slice(1))ctx.lineTo(...world(p[0],p[1]));
 ctx.lineTo(...world(2168,30));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.clip();
 ctx.drawImage(images.hull,hull.x,hull.y,hull.width*hull.sx,hull.height*hull.sy);ctx.restore();
 for(const m of members.filter(m=>m.role==='ROWER'&&m.lane===0).reverse())paddle(m,frame);
 if(phase<.55&&motion>0){const strength=(phase<.25?.72:1)*(tempo/80)*motion;for(const m of members.filter(m=>m.role==='ROWER'&&m.lane===0)){const x=m.x+(frame===0?-53:frame===1?-18:19),[wx,wy]=world(x,edge(x,2)+8);effect(tempo>95?2:frame===1?1:0,wx,wy,58+(tempo-80)*.65,strength*.76);}}
 const [bx,by]=world(250,edge(250,2));if(motion>0)effect(3,bx-44,by+8,174,.72*motion);
 canvas.dataset.phase=String(frame);
}
function draw(t){
 if(!ready)return;
 ctx.setTransform(renderScale,0,0,renderScale,0,0);
 if(sceneMode==='festival'){
  const race=gameMode==='demo'?illustratedRace.state:null;
  ctx.save();
  if(race){const camera=race.camera;ctx.translate(W/2,H/2);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);}
  festivalScene.drawBack(ctx,t);
  if(race)illustratedRace.drawGates(ctx,race);
  const boats=race?race.boats:CONFIG.boat.lanes.slice(1);
  for(const boat of boats){
   ctx.save();ctx.translate(boat.x,boat.y+Math.sin(t*2+(boat.phase||0))*.6);ctx.scale(boat.scale,boat.scale);
   drawBoat(t+(boat.phase||0),race&&!manualPose?boat:{});
   if(race){ctx.font='600 38px system-ui';ctx.textAlign='center';ctx.strokeStyle='#edf0e8';ctx.lineWidth=5;ctx.strokeText(boat.name,165,617);ctx.fillStyle='#234b3e';ctx.fillText(boat.name,165,617);}
   ctx.restore();
  }
  festivalScene.drawFront(ctx,t);
  ctx.restore();
  if(race)updateRaceUI(race);
 }else{water(t);drawBoat(t);}
 renderedFrames++;canvas.dataset.time=t.toFixed(3);canvas.dataset.mode=sceneMode;
}
async function init(){
 await Promise.all(Object.entries(sources).map(([key,file])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error('Cannot load '+file));im.src=file;})));
 await festivalScene.load();ready=true;document.body.dataset.ready='true';updateModeUI();draw(0);requestAnimationFrame(loop);
}
let lastDraw=0;
// Carry the remainder: a browser callback around 31 ms must not turn a 30 fps
// target into one draw every two callbacks. Paused scenes only draw on edits.
function loop(now){const dt=last===null?0:Math.max(0,Math.min(.1,(now-last)/1000));last=now;if(playing&&!document.hidden){time+=dt;if(gameMode==='demo'&&sceneMode==='festival'&&!manualPose)illustratedRace.advance(dt);}const interval=1000/30,elapsed=now-lastDraw;if(playing&&!document.hidden&&elapsed>=interval){draw(time);lastDraw=now-elapsed%interval;}requestAnimationFrame(loop);}
function updateRaceUI(race){
 const leader=race.boats.find(b=>b.id===race.leader),winner=race.boats.find(b=>b.id===race.winner);
 const message=race.stage==='countdown'?`Xuất phát sau ${race.countdown}…`:race.stage==='finished'?`${winner.name} thắng · ${winner.finishTime.toFixed(1)} giây`:winner?`${winner.name} đã về đích · chờ ghe còn lại`:`${leader.name} dẫn đầu · ${Math.floor(leader.progress*100)}%`;
 const status=document.querySelector('#status'),text=(playing?'':'Tạm dừng · ')+message;
 if(status.textContent!==text)status.textContent=text;
 const scores=document.querySelector('#race-score'),score=`${race.run.toFixed(1)}s · ${race.boats.map(b=>`${b.name}: ${b.finished?'Về đích':Math.floor(b.progress*100)+'%'}`).join(' · ')}`;
 if(scores.textContent!==score)scores.textContent=score;
 document.querySelector('#camera').textContent=race.follow?'Góc nhìn: Theo ghe':'Góc nhìn: Toàn cảnh';
 canvas.dataset.raceStage=race.stage;canvas.dataset.raceTime=race.elapsed.toFixed(3);
}
function updateModeUI(){
 document.body.dataset.mode=gameMode;
 document.querySelector('#status').textContent=sceneMode==='boat'?'Xưởng ghe · cùng bộ asset':gameMode==='practice'?'Tập nhịp chèo · một ghe':'Đua thử · hai ghe';
 document.querySelector('#view').textContent=sceneMode==='festival'?'Xưởng ghe':'Về cảnh đua';
 document.querySelector('#practice-controls').hidden=gameMode!=='practice'||sceneMode!=='festival';
 const autoRace=gameMode==='demo'&&sceneMode==='festival';
 document.querySelectorAll('[data-race-control]').forEach(control=>control.hidden=!autoRace);
 document.querySelector('#cadence-control').hidden=autoRace;
 document.querySelectorAll('button[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===gameMode&&sceneMode==='festival')));
}
function setMode(mode){
 gameMode=mode;sceneMode='festival';H=CONFIG.camera.height;resizeCanvas();practice.strokes=0;practice.accuracy=0;practice.lastScore=0;time=0;playing=true;manualPose=false;illustratedRace.reset();document.querySelector('#toggle').textContent='Dừng';
 document.querySelector('#practice-result').textContent='Chạm sân hoặc bấm Chèo khi dằm vào nước';updateModeUI();draw(time);
}
document.querySelectorAll('button[data-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.mode));
document.querySelector('#restart').onclick=()=>setMode('demo');
document.querySelector('#camera').onclick=()=>{illustratedRace.toggleCamera();draw(time);};
document.querySelector('#view').onclick=()=>{sceneMode=sceneMode==='festival'?'boat':'festival';H=sceneMode==='festival'?CONFIG.camera.height:CONFIG.camera.workshopHeight;resizeCanvas();updateModeUI();draw(time);};
addEventListener('resize',()=>{resizeCanvas();draw(time);});
function stroke(){
 if(!ready||!playing||gameMode!=='practice')return;
 const phase=((time*cadence/60)%1+1)%1,distance=Math.min(phase,1-phase),score=Math.max(0,Math.round(100*(1-distance/.3)));
 practice.accuracy=(practice.accuracy*practice.strokes+score)/(practice.strokes+1);practice.strokes++;practice.lastScore=score;
 document.querySelector('#practice-result').textContent=`${practice.strokes} nhịp · đúng nhịp ${Math.round(practice.accuracy)}%`;
}
document.querySelector('#stroke').onclick=stroke;
canvas.onclick=()=>{if(sceneMode==='festival')stroke();};
document.querySelector('#fullscreen').onclick=async()=>{const target=document.querySelector('.stage');if(document.fullscreenElement)await document.exitFullscreen();else if(target.requestFullscreen)await target.requestFullscreen();else if(target.webkitRequestFullscreen)target.webkitRequestFullscreen();};
async function exitFullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();}
document.querySelector('#exit-fullscreen').onclick=exitFullscreen;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.fullscreenElement)exitFullscreen();});
document.querySelector('#toggle').onclick=()=>{playing=!playing;if(playing)manualPose=false;document.querySelector('#toggle').textContent=playing?'Dừng':'Tiếp tục';draw(time);};
document.querySelector('#cadence').oninput=e=>{cadence=Number(e.target.value);document.querySelector('#cadenceValue').textContent=cadence;draw(time);};
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{playing=false;manualPose=true;document.querySelector('#toggle').textContent='Tiếp tục';time=Number(b.dataset.pose)*.75;cadence=80;document.querySelector('#cadence').value=80;document.querySelector('#cadenceValue').textContent=80;draw(time);});
window.illustratedPreview={members,images,sources,seated,standing,roles,draw,setMode,practice,seek(t){playing=false;time=t;draw(t);},seekRace(t){playing=false;manualPose=false;time=Math.max(0,t);illustratedRace.seek(t);draw(time);},play(){playing=true;manualPose=false;document.querySelector('#toggle').textContent='Dừng';},get stats(){return{mode:sceneMode,gameMode,boats:sceneMode==='boat'||gameMode==='practice'?1:2,members:members.length,seated:members.filter(m=>m.posture==='seated').length,standing:members.filter(m=>m.posture==='standing').length,phase:canvas.dataset.phase,cadence,playing,renderedFrames,configuration:CONFIG.revision,camera:CONFIG.camera.id,direction:CONFIG.camera.direction,renderSize:[canvas.width,canvas.height],race:illustratedRace.state,festival:festivalScene.stats};},async record(seconds=8){
 const stream=canvas.captureStream(30),chunks=[],mime=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});playing=true;
 const complete=new Promise(resolve=>rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());resolve(new Blob(chunks,{type:mime}));});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.start();setTimeout(()=>rec.stop(),seconds*1000);const blob=await complete;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rowing-preview-v22.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return blob.size;
}};
init().catch(e=>{document.querySelector('#status').textContent=String(e);document.body.dataset.loadError=String(e);});
