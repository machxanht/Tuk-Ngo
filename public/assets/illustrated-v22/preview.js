/* Painted asset demo and practice view, independent of the legacy 3D route. */
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
const CONFIG=TukNgoConfig,W=CONFIG.camera.width;let H=CONFIG.camera.height,sceneMode='festival',gameMode='demo',renderedFrames=0,renderScale=1,lowPower=false;
function resizeCanvas(){const width=Math.min(CONFIG.camera.maxRenderWidth,(canvas.clientWidth||innerWidth)*Math.min(devicePixelRatio||1,CONFIG.camera.maxPixelRatio));renderScale=width/W;canvas.width=Math.round(width);canvas.height=Math.round(H*renderScale);hybrid?.resize(lowPower?Math.min(900,canvas.width):sceneMode==='boat'?canvas.width:canvas.width*.8);}
const sources={fx:'water-effects.webp'};
const images={},strokeEfforts=new Map();let ready=false,playing=true,time=0,cadence=80,last=null,manualPose=false,hybrid;
resizeCanvas();
const crowdAudio=new Audio('crowd-cheer-cc0.mp3');crowdAudio.loop=true;crowdAudio.preload='none';crowdAudio.volume=.18;let sound=false;
function updateAudio(){if(sound&&playing&&!document.hidden)crowdAudio.play().catch(()=>{sound=false;document.querySelector('#sound').textContent='Bật tiếng';document.querySelector('#sound').setAttribute('aria-pressed','false');});else crowdAudio.pause();}
const crew=CONFIG.boat.crew;
const members=[];
for(let row=0;row<crew.rows;row++)for(let lane=0;lane<2;lane++)members.push({id:2+row*2+lane,role:'ROWER',posture:row<crew.seatedRows?'seated':'standing',row,lane,x:crew.firstRowX+row*crew.rowPitch+(row>11?crew.controllerGap:0)});
members.push({id:1,role:'BOW_CALLER',x:crew.callerX},{id:52,role:'MID_CONTROLLER',x:crew.controllerX});
for(let i=0;i<3;i++)members.push({id:53+i,role:'HELMSMAN',x:crew.helmFirstX+i*crew.helmPitch});
const practice={strokes:0,accuracy:0,lastScore:0};
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
 if(!ready||!hybrid)return;
 const tempo=animation.cadence??cadence,motion=animation.motion??1,cycles=animation.cycles??t*tempo/60,phase=((cycles%1)+1)%1;
 const study=sceneMode==='boat',posture=document.querySelector('#posture').value;
 const effortKey=animation.id||'study',effortTarget=Math.max(animation.effort||0,Math.min(1,Math.max(0,(tempo-95)/10)))*motion;
 let effort=strokeEfforts.get(effortKey);if(!effort){effort={value:effortTarget,t};strokeEfforts.set(effortKey,effort);}else{const dt=Math.max(0,Math.min(.1,t-effort.t));effort.value+=(effortTarget-effort.value)*(1-Math.exp(-dt*5));effort.t=t;}
 ctx.drawImage(hybrid.render(phase,t,{study,posture,teamId:study?(document.querySelector('#study-kit').value==='team'?hybridTeams.near.id:null):animation.teamId||hybridTeams.near.id,kitColor:study?document.querySelector('#study-kit').value:animation.kitColor||'#23855e',faceVariant:study?Number(document.querySelector('#study-face').value):null,skinDetail:lowPower?0:1,focus:study?document.querySelector('#study-focus').value:'body',angle:study?document.querySelector('#study-angle').value:'three-quarter',effort:effort.value,viewKey:effortKey,frameId:renderedFrames,distance:32.6/(animation.scale||1),nearest:study||animation.id==='near',desyncIntensity:animation.desyncIntensity||0}),0,0,W,CONFIG.camera.workshopHeight);
 if(motion>0&&!study){
  for(const [i,tip] of hybrid.tips.entries())if(tip.inWater){
   effect(tempo>95?2:0,...tip.point,55+Math.max(0,tempo-80)*1.3,.55*motion);
   const energy=motion*(animation.surge?2.5:tempo>95?1.7:.7),count=Math.ceil(4+energy*6);
   ctx.save();ctx.fillStyle='#fff5df';
   for(let n=0;n<count;n++){
    const age=((t*2.9+n*.037+i*.071)% .32+.32)% .32,spread=Math.sin(i*19+n*7),x=tip.point[0]+age*(60+spread*100),y=tip.point[1]-age*(85+energy*95+n*5)+360*age*age;
    ctx.globalAlpha=motion*(1-age/.32)*.85;ctx.beginPath();ctx.ellipse(x,y,2+n%3,3+n%3,spread*.3,0,Math.PI*2);ctx.fill();
   }ctx.restore();
  }
  effect(4,...hybrid.stern,270+Math.max(0,tempo-85)*5,.55*motion);effect(3,...hybrid.waterBow,120,.62*motion);
 }
 canvas.dataset.phase=String(Math.floor(phase*4));canvas.dataset.animation='continuous-skinned-3d';
}
function draw(t){
 if(!ready)return;
 ctx.setTransform(renderScale,0,0,renderScale,0,0);
 if(sceneMode==='festival'){
  const sourceRace=gameMode==='demo'?illustratedRace.state:gameMode==='play'?quickRace.projected():null,race=sourceRace?hybridTeams.project(sourceRace):null;
  ctx.save();
  if(race){const camera=race.camera,surge=race.player?.surgeActive&&!matchMedia('(prefers-reduced-motion: reduce)').matches;ctx.translate(W/2+(surge?Math.sin(t*34)*1.8:0),H/2+(surge?Math.sin(t*29)*1.1:0));ctx.scale(camera.zoom*(surge?1.014:1),camera.zoom*(surge?1.014:1));ctx.translate(-camera.x,-camera.y);}
  if(festivalScene.setActivity)festivalScene.setActivity(race?.player?race.player.phase==='finished'?1:race.player.surgeActive?1:race.player.raceStage==='final'?.85:.45:race?.run>32?.8:.4);
  festivalScene.drawBack(ctx,t);
  if(race)illustratedRace.drawGates(ctx,race);
  const boats=race?race.boats:CONFIG.boat.lanes.slice(1);
  for(const boat of boats){
   ctx.save();ctx.translate(boat.x,boat.y+Math.sin(t*2+(boat.phase||0))*.6);ctx.scale(boat.scale,boat.scale);
   drawBoat(t+(boat.phase||0),race?{...boat,...(manualPose?{cycles:time*cadence/60,cadence}:{}),kitColor:boat.kitColor||(boat.id==='near'?'#cc9335':'#23855e')}:{});
   if(race){ctx.font='600 38px system-ui';ctx.textAlign='center';ctx.strokeStyle='#edf0e8';ctx.lineWidth=5;ctx.strokeText(boat.name,340,617,660);ctx.fillStyle='#234b3e';ctx.fillText(boat.name,340,617,660);}
   ctx.restore();
  }
  festivalScene.drawFront(ctx,t);
  ctx.restore();
  if(race){if(gameMode==='play'){const s=quickRace.update();updatePlayUI(s);}else updateRaceUI(race);}
 }else{water(t);drawBoat(t);}
 renderedFrames++;canvas.dataset.time=t.toFixed(3);canvas.dataset.mode=sceneMode;
}
async function init(){
 hybrid=await createHybridBoats();for(const [i,profile] of hybrid.stats.faceProfiles.entries())document.querySelector('#study-face').options[i].textContent=profile.name;await hybridTeams.init(hybrid);illustratedRace.setBowAnchor(hybrid.bow);resizeCanvas();
 await Promise.all(Object.entries(sources).map(([key,file])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error('Cannot load '+file));im.src=file;})));
 await festivalScene.load();ready=true;document.body.dataset.ready='true';updateModeUI();draw(0);requestAnimationFrame(loop);
}
let lastDraw=0;
// Carry fractional frame time. Near crews update at 60 Hz; distant crews
// evaluate their shared masters every other frame. Physics uses fixed ticks.
function loop(now){const dt=last===null?0:Math.max(0,Math.min(.1,(now-last)/1000));last=now;if(playing&&!document.hidden){time+=dt;if(sceneMode==='festival'&&!manualPose){if(gameMode==='demo')illustratedRace.advance(dt);else if(gameMode==='play')quickRace.advance(dt);}}const interval=1000/(lowPower?30:60),elapsed=now-lastDraw;if(playing&&!document.hidden&&elapsed>=interval){draw(time);lastDraw=now-elapsed%interval;}requestAnimationFrame(loop);}
function updatePlayUI(s){
 const status=document.querySelector('#status');
 const messages={ready:'Đua nhanh · '+hybridTeams.near.name+' ở làn gần',countdown:`Xuất phát sau ${Math.ceil(s.countdown)}…`,paused:'Trận đua tạm dừng',finished:document.querySelector('#play-title').textContent,racing:`${TukNgoGameRules.formatRaceTime(s.elapsed)} · ${Math.floor(s.distances[0])} m`};
 if(status.textContent!==messages[s.phase])status.textContent=messages[s.phase];
 canvas.dataset.raceStage=s.phase;canvas.dataset.raceTime=s.elapsed.toFixed(3);
 document.querySelector('#camera').textContent=illustratedRace.state.follow?'Góc nhìn: Theo ghe':'Góc nhìn: Toàn cảnh';
 crowdAudio.volume=s.phase==='finished'?.3:s.surgeActive?.42:s.raceStage==='final'?.3:.15;
 hybridTeams.update(s.phase);
}
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
 document.querySelector('#status').textContent=sceneMode==='boat'?'VĐV 3D · kiểm tra nhịp chèo':gameMode==='practice'?'Tập nhịp chèo · một ghe':'Đua tự động · hai ghe';
 document.querySelector('#view').textContent=sceneMode==='festival'?'VĐV cận':'Về cảnh đua';
 document.querySelector('#posture-control').hidden=sceneMode!=='boat';
 document.querySelector('#kit-control').hidden=sceneMode!=='boat';
 document.querySelector('#face-control').hidden=sceneMode!=='boat';
 document.querySelector('#focus-control').hidden=sceneMode!=='boat';
 document.querySelector('#angle-control').hidden=sceneMode!=='boat';
 document.querySelector('#practice-controls').hidden=gameMode!=='practice'||sceneMode!=='festival';
 document.querySelector('#play-panel').hidden=gameMode!=='play'||sceneMode!=='festival';
 document.querySelector('#view').hidden=gameMode==='play';
 const autoRace=gameMode==='demo'&&sceneMode==='festival';
 document.querySelectorAll('[data-race-control]').forEach(control=>control.hidden=!(autoRace||gameMode==='play'&&sceneMode==='festival'));
 document.querySelector('#race-score').hidden=!autoRace;document.querySelector('#restart').hidden=!autoRace;
 document.querySelector('#cadence-control').hidden=autoRace||gameMode==='play';
 document.querySelectorAll('button[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===gameMode&&sceneMode==='festival'&&(gameMode!=='play'||(button.dataset.kind||'quick')===quickRace.kind))));
}
function setMode(mode,kind='quick'){
 if(mode==='play')quickRace.enter(kind);else window.hybridCup?.leave();
  gameMode=mode;sceneMode='festival';H=CONFIG.camera.height;resizeCanvas();strokeEfforts.clear();practice.strokes=0;practice.accuracy=0;practice.lastScore=0;time=0;playing=true;manualPose=false;illustratedRace.reset();document.querySelector('#toggle').textContent='Dừng';
 document.querySelector('#practice-result').textContent='Chạm sân hoặc bấm Chèo khi dằm vào nước';updateModeUI();
 hybridTeams.update();draw(time);updateAudio();
}
document.querySelectorAll('button[data-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.mode,button.dataset.kind||'quick'));
document.querySelector('#restart').onclick=()=>setMode('demo');
document.querySelector('#camera').onclick=()=>{illustratedRace.toggleCamera();draw(time);};
document.querySelector('#posture').onchange=()=>draw(time);
document.querySelector('#study-kit').onchange=()=>draw(time);
document.querySelector('#study-face').onchange=()=>draw(time);
document.querySelector('#study-focus').onchange=()=>draw(time);
document.querySelector('#study-angle').onchange=()=>draw(time);
document.querySelector('#view').onclick=()=>{sceneMode=sceneMode==='festival'?'boat':'festival';H=sceneMode==='festival'?CONFIG.camera.height:CONFIG.camera.workshopHeight;resizeCanvas();updateModeUI();draw(time);};
addEventListener('resize',()=>{resizeCanvas();draw(time);});
function stroke(){
 if(!ready||!playing||gameMode!=='practice')return;
 const phase=((time*cadence/60)%1+1)%1,distance=Math.min(phase,1-phase),score=Math.max(0,Math.round(100*(1-distance/.3)));
 practice.accuracy=(practice.accuracy*practice.strokes+score)/(practice.strokes+1);practice.strokes++;practice.lastScore=score;
 document.querySelector('#practice-result').textContent=`${practice.strokes} nhịp · đúng nhịp ${Math.round(practice.accuracy)}%`;
}
document.querySelector('#stroke').onclick=stroke;
canvas.onclick=()=>{if(sceneMode==='festival'){if(gameMode==='play')quickRace.stroke();else stroke();}};
document.querySelector('#fullscreen').onclick=async()=>{const target=document.querySelector('.stage');if(document.fullscreenElement)await document.exitFullscreen();else if(target.requestFullscreen)await target.requestFullscreen();else if(target.webkitRequestFullscreen)target.webkitRequestFullscreen();};
async function exitFullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();}
document.querySelector('#exit-fullscreen').onclick=exitFullscreen;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.fullscreenElement)exitFullscreen();});
document.querySelector('#toggle').onclick=()=>{playing=!playing;if(playing){manualPose=false;if(gameMode==='play')quickRace.resume();}else if(gameMode==='play')quickRace.pause();document.querySelector('#toggle').textContent=playing?'Dừng':'Tiếp tục';updateAudio();draw(time);};
document.querySelector('#sound').onclick=()=>{sound=!sound;document.querySelector('#sound').textContent=sound?'Tắt tiếng':'Bật tiếng';document.querySelector('#sound').setAttribute('aria-pressed',String(sound));updateAudio();};
document.querySelector('#quality').onclick=()=>{lowPower=!lowPower;document.querySelector('#quality').setAttribute('aria-pressed',String(lowPower));document.querySelector('#quality').textContent=lowPower?'Chế độ nhẹ: Bật':'Chế độ nhẹ';resizeCanvas();draw(time);};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gameMode==='play'&&['racing','countdown'].includes(quickRace.state.phase)){quickRace.pause('Bạn đã chuyển khỏi trang. Bấm Tiếp tục để đua tiếp.');playing=false;document.querySelector('#toggle').textContent='Tiếp tục';}updateAudio();});
document.querySelector('#cadence').oninput=e=>{cadence=Number(e.target.value);document.querySelector('#cadenceValue').textContent=cadence;draw(time);};
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{playing=false;manualPose=true;document.querySelector('#toggle').textContent='Tiếp tục';time=Number(b.dataset.pose)*.75;cadence=80;document.querySelector('#cadence').value=80;document.querySelector('#cadenceValue').textContent=80;draw(time);});
document.querySelector('#pose-scrub').oninput=e=>{playing=false;manualPose=true;document.querySelector('#toggle').textContent='Tiếp tục';time=Number(e.target.value)/100*60/cadence;draw(time);};
window.illustratedPreview={members,images,sources,draw,setMode,practice,get hybrid(){return hybrid;},seek(t){playing=false;time=t;draw(t);},seekRace(t){playing=false;manualPose=false;time=Math.max(0,t);illustratedRace.seek(t);draw(time);},play(){playing=true;manualPose=false;if(gameMode==='play')quickRace.resume();document.querySelector('#toggle').textContent='Dừng';updateAudio();},get stats(){return{mode:sceneMode,gameMode,boats:sceneMode==='boat'||gameMode==='practice'?1:2,members:members.length,seated:members.filter(m=>m.posture==='seated').length,standing:members.filter(m=>m.posture==='standing').length,phase:canvas.dataset.phase,cadence,playing,lowPower,sound,renderedFrames,configuration:CONFIG.revision,camera:CONFIG.camera.id,direction:CONFIG.camera.direction,renderSize:[canvas.width,canvas.height],hybrid:hybrid?.stats,draw3D:hybrid?.getDrawStats(),race:gameMode==='play'?quickRace.projected():illustratedRace.state,festival:festivalScene.stats};},async record(seconds=8){
 const stream=canvas.captureStream(30),chunks=[],mime=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});playing=true;
 const complete=new Promise(resolve=>rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());resolve(new Blob(chunks,{type:mime}));});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.start();setTimeout(()=>rec.stop(),seconds*1000);const blob=await complete;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rowing-preview.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return blob.size;
}};
const loadRetryButton=document.querySelector('#asset-retry');if(loadRetryButton)loadRetryButton.onclick=()=>location.reload();
init().catch(e=>{document.querySelector('#status').textContent='Không tải được trận đua. Kiểm tra kết nối rồi tải lại trang.';document.body.dataset.loadError=String(e);if(loadRetryButton)loadRetryButton.hidden=false;});

addEventListener('pagehide',event=>{crowdAudio.pause();if(!event.persisted)hybrid?.dispose();});
