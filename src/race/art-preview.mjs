import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {buildRiver,buildSplashes} from './river.mjs';
import {paintIllustratedRiver,drawIllustratedGhe} from './illustrated-ghe.mjs';

function stepClock(clock,settings,now){
 const c=clock.current,s=settings.current,dt=Math.min(.05,Math.max(0,(now-c.last)/1000));c.last=now;
 if(s.playing){c.seconds+=dt;c.phase=(c.phase+dt*s.cadence/60)%1;}
 return s.playing?dt:0;
}
function saveCanvas(canvas,name){canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
function recordCanvas(canvas,name){
 if(!canvas.captureStream||!globalThis.MediaRecorder)throw Error('Trình duyệt này chưa hỗ trợ xuất clip.');
 const stream=canvas.captureStream(30),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
 const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
 if(!mimeType){stream.getTracks().forEach(track=>track.stop());throw Error('Trình duyệt này chưa hỗ trợ xuất WebM.');}
 return new Promise((resolve,reject)=>{
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:3000000}),chunks=[];
  const timer=setTimeout(()=>recorder.stop(),10000);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=e=>{clearTimeout(timer);stream.getTracks().forEach(track=>track.stop());reject(Error(e.error?.message||'Không ghi được clip.'));};
  recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());const url=URL.createObjectURL(new Blob(chunks,{type:mimeType})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);resolve();};
  recorder.start();
 });
}
function imageAt(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Không tải được '+url));image.src=url;});}

// The background is deliberately painted as a few coherent layers. It is an
// illustrative river setting; it is not a photogrammetry reconstruction.
function paintRiver(ctx,w,h,time,close){
 const horizon=h*(close?.26:.33),sky=ctx.createLinearGradient(0,0,0,horizon);
 sky.addColorStop(0,'#efe9d7');sky.addColorStop(1,'#d6dfce');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const haze=ctx.createLinearGradient(0,horizon*.60,0,horizon*1.12);haze.addColorStop(0,'#819b7d');haze.addColorStop(1,'#a4b5a0');
 ctx.fillStyle=haze;ctx.beginPath();ctx.moveTo(0,horizon*.8);
 for(let x=0;x<=w+30;x+=30)ctx.lineTo(x,horizon*.8-Math.sin(x*.017)*11-Math.sin(x*.039)*7);
 ctx.lineTo(w,horizon+28);ctx.lineTo(0,horizon+28);ctx.fill();
 // Distant palms have asymmetrical fronds rather than spherical crowns.
 ctx.strokeStyle='#738970';ctx.lineCap='round';
 for(let i=0;i<12;i++){const x=i*w/11+Math.sin(i*7)*23,y=horizon-12,scale=.7+(i%3)*.17;
  ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(x,y+12);ctx.quadraticCurveTo(x-5,y-15,x+3,y-39*scale);ctx.stroke();
  for(let j=0;j<7;j++){const a=j*Math.PI/4.7;ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(x+3,y-39*scale);ctx.quadraticCurveTo(x+Math.cos(a)*17*scale,y-59*scale+Math.sin(a)*7,x+Math.cos(a)*32*scale,y-38*scale+Math.sin(a)*16);ctx.stroke();}
 }
 ctx.fillStyle='#b7b6a0';ctx.fillRect(0,horizon+10,w,12);
 // Small roofs, flags and a distant crowd suggest the festival bank in photos.
 for(let i=0;i<5;i++){const x=(i*.24-.03)*w,y=horizon-3,bw=w*.19;
  ctx.fillStyle=i%2?'#83978b':'#8fa4a0';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12,y-14);ctx.lineTo(x+bw-12,y-14);ctx.lineTo(x+bw,y);ctx.fill();
  ctx.fillStyle='#53675b';ctx.fillRect(x+12,y,2,14);ctx.fillRect(x+bw-14,y,2,14);
  for(let n=0;n<22;n++){ctx.fillStyle=['#72735b','#9b6b4f','#708e79','#c4b47c'][n%4];ctx.fillRect(x+18+n*(bw-36)/22,y+4,3,7);}
 }
 const river=ctx.createLinearGradient(0,horizon,0,h);river.addColorStop(0,'#aeb7a4');river.addColorStop(.24,'#809d91');river.addColorStop(1,'#3d665d');ctx.fillStyle=river;ctx.fillRect(0,horizon+22,w,h);
 for(let i=0;i<86;i++){
  const depth=(i%23)/23,y=horizon+26+depth*depth*(h-horizon),length=12+depth*75;
  const x=((i*137.51-time*(14+depth*27))%(w+length*2)+w+length*2)%(w+length*2)-length;
  ctx.strokeStyle=i%3?'rgba(225,231,207,.12)':'rgba(38,76,64,.12)';ctx.lineWidth=.7+depth*.8;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+length*.5,y+2*depth,x+length,y);ctx.stroke();
 }
 const light=ctx.createLinearGradient(0,horizon,0,h);light.addColorStop(0,'rgba(244,227,179,.09)');light.addColorStop(1,'rgba(26,68,57,0)');ctx.fillStyle=light;ctx.fillRect(0,horizon,w,h-horizon);
}

export async function startSpritePreview(host,settings,clock,base,onReady){
 const response=await fetch(base+'assets/ghe-ngo/sprites/manifest.json');if(!response.ok)throw Error('Thiếu bộ ảnh động');
 const manifest=await response.json(),images={};
 await Promise.all(Object.entries(manifest.views).map(async([key,view])=>{images[key]=await Promise.all(view.pages.map(page=>imageAt(base+'assets/ghe-ngo/sprites/'+page)));}));
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Ghe Ngo 2.5D, đội chèo và mặt nước');host.appendChild(canvas);const ctx=canvas.getContext('2d',{alpha:false});
 let raf=0,disposed=false,w=1,h=1,dpr=1,lastView='',lastPhase=clock.current.phase,events=0,particles=[],rings=[];
 function resize(){w=host.clientWidth;h=host.clientHeight;dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(now){if(disposed)return;const dt=stepClock(clock,settings,now),s=settings.current,c=clock.current,v=manifest.views[s.view],frames=v.frames;
  const fi=Math.floor(c.phase*frames.length)%frames.length,f=frames[fi],next=frames[(fi+1)%frames.length],blend=c.phase*frames.length-fi;
  if(lastView!==s.view){particles=[];rings=[];lastView=s.view;lastPhase=c.phase;}
  ctx.setTransform(dpr,0,0,dpr,0,0);paintRiver(ctx,w,h,c.seconds,s.view==='crew');
  const width=s.view==='boat'?w*.94:Math.min(w*.86,h*.55),height=width*v.height/v.width,x=(w-width)/2,y=(s.view==='boat'?h*.48:h*.39)-height*.30+Math.sin(c.phase*Math.PI*2)*.7;
  // Soft contact shadow and stern wake stay under the sprite.
  ctx.fillStyle='rgba(25,58,44,.17)';ctx.beginPath();ctx.ellipse(w*.5,y+height*.66,width*.44,height*.07,-.055,0,Math.PI*2);ctx.fill();
  if(s.view==='boat'&&s.playing){ctx.strokeStyle='rgba(238,239,217,.20)';ctx.lineWidth=2;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(x-16,y+height*(.71+k*.023));ctx.quadraticCurveTo(x+width*.17,y+height*(.60+k*.03),x+width*.31,y+height*(.64+k*.024));ctx.stroke();}}
  const previousFrame=frames[Math.floor(lastPhase*frames.length)%frames.length];
  if(s.splash&&dt>0){for(let i=0;i<f.contacts.length;i++){const p=f.contacts[i],n=next.contacts[i],before=previousFrame.contacts[i];
    const px=x+(p.x+(n.x-p.x)*blend)*width,py=y+(p.y+(n.y-p.y)*blend)*height;
    if(before&&((before.depth>0&&p.depth<=0)||(before.depth<=0&&p.depth>0))){events++;rings.push({x:px,y:py,age:0,scale:width/v.width});for(let k=0;k<4;k++)particles.push({x:px,y:py,vx:(Math.random()-.65)*32,vy:-22-Math.random()*28,age:0,life:.32+Math.random()*.20,front:p.front});}
  }}lastPhase=c.phase;
  if(!s.splash){particles=[];rings=[];}
  particles=particles.filter(p=>p.age< p.life);rings=rings.filter(r=>r.age<.52);
  for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;}
  for(const r of rings){r.age+=dt;ctx.strokeStyle=`rgba(235,237,214,${Math.max(0,.25-r.age*.48)})`;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(r.x,r.y,(3+r.age*24)*r.scale,(1+r.age*6)*r.scale,-.04,0,Math.PI*2);ctx.stroke();}
  function drawDrops(front){for(const p of particles)if(p.front===front){ctx.fillStyle=`rgba(247,245,223,${Math.max(0,1-p.age/p.life)*.82})`;ctx.beginPath();ctx.ellipse(p.x,p.y,1.1,1.7,-.3,0,Math.PI*2);ctx.fill();}}
  drawDrops(false);
  const page=images[s.view][f.page];ctx.drawImage(page,f.sx,f.sy,v.width,v.height,x,y,width,height);
  drawDrops(true);
  host.dataset.renderMode='sprite';host.dataset.frame=String(fi);host.dataset.phase=c.phase.toFixed(4);host.dataset.splashEvents=String(events);host.dataset.activeParticles=String(particles.length);host.dataset.crewCount='55';host.dataset.view=s.view;host.dataset.drawCalls='0';host.dataset.atlasVersion=manifest.version;
  raf=requestAnimationFrame(frame);
 }
 onReady({reset(){particles=[];rings=[];events=0;lastPhase=clock.current.phase;},capture(){saveCanvas(canvas,'ghe-ngo-2.5d-'+settings.current.view+'.png');},record(){return recordCanvas(canvas,'ghe-ngo-2.5d-'+settings.current.view+'-10s.webm');},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();canvas.remove();for(const list of Object.values(images))for(const image of list)image.src='';}});
 raf=requestAnimationFrame(frame);
}

export async function startIllustratedPreview(host,settings,clock,base,onReady){
 const livery=await imageAt(base+'assets/ghe-ngo/kbach-from-reference.webp');
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Ghe Ngo minh họa 2D với người chèo vẽ riêng');host.appendChild(canvas);const ctx=canvas.getContext('2d',{alpha:false});
 let raf=0,disposed=false,w=1,h=1,dpr=1,lastView='',previous=[],events=0,particles=[],rings=[];
 function resize(){w=host.clientWidth;h=host.clientHeight;dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);previous=[];particles=[];rings=[];}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function drawWater(front){
  for(const r of rings)if(r.front===front){ctx.strokeStyle=`rgba(238,234,193,${Math.max(0,.48-r.age*.67)})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(r.x,r.y,4+r.age*36,1+r.age*9,0,0,Math.PI*2);ctx.stroke();}
  for(const p of particles)if(p.front===front){ctx.fillStyle=`rgba(247,239,201,${Math.max(0,1-p.age/p.life)*.9})`;ctx.beginPath();ctx.ellipse(p.x,p.y,1.4,2.1,-.25,0,Math.PI*2);ctx.fill();}
 }
 function frame(now){if(disposed)return;const dt=stepClock(clock,settings,now),s=settings.current,c=clock.current;
  if(lastView!==s.view){previous=[];particles=[];rings=[];lastView=s.view;}
  ctx.setTransform(dpr,0,0,dpr,0,0);paintIllustratedRiver(ctx,w,h,c.seconds);
  if(!s.splash){particles=[];rings=[];}
  particles=particles.filter(p=>p.age<p.life);rings=rings.filter(p=>p.age<.7);
  for(const r of rings)r.age+=dt;for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=140*dt;}
  drawWater(false);
  const {contacts,crewCount}=drawIllustratedGhe(ctx,w,h,c.phase,s.view,livery);
  if(s.splash&&dt>0)for(let i=0;i<contacts.length;i++){const p=contacts[i],before=previous[i];if(before&&before.immersed!==p.immersed){events++;rings.push({x:p.x,y:p.y,age:0,front:p.front});for(let k=0;k<7;k++)particles.push({x:p.x,y:p.y,vx:(Math.random()-.55)*42,vy:-30-Math.random()*34,age:0,life:.4+Math.random()*.18,front:p.front});}}
  previous=contacts;drawWater(true);
  host.dataset.renderMode='illustrated';host.dataset.phase=c.phase.toFixed(4);host.dataset.view=s.view;host.dataset.crewCount=String(crewCount);host.dataset.drawCalls='0';host.dataset.splashEvents=String(events);host.dataset.activeParticles=String(particles.length);host.dataset.artSource='AUTHORED_2D_V5';
  raf=requestAnimationFrame(frame);
 }
 onReady({reset(){previous=[];particles=[];rings=[];events=0;},capture(){saveCanvas(canvas,'ghe-ngo-minh-hoa-'+settings.current.view+'.png');},record(){return recordCanvas(canvas,'ghe-ngo-minh-hoa-'+settings.current.view+'-10s.webm');},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();canvas.remove();livery.src='';}});
 raf=requestAnimationFrame(frame);
}

export async function startModelPreview(host,settings,clock,base,onReady){
 const model=await new GLTFLoader().loadAsync(base+'assets/ghe-ngo/ghe-ngo-crew.glb'),root=model.scene;
 const scene=new T.Scene();scene.background=new T.Color('#d6dfce');scene.fog=new T.Fog('#d6dfce',75,200);
 scene.add(new T.HemisphereLight('#fff4dc','#557062',1.25));
 const key=new T.DirectionalLight('#ffe6b5',2.6);key.position.set(-12,22,18);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-20;key.shadow.camera.right=20;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.normalBias=.015;scene.add(key);
 const rim=new T.DirectionalLight('#d0e4df',.65);rim.position.set(12,10,-16);scene.add(rim);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});scene.add(root);
 const river=buildRiver(scene,.28),fx=buildSplashes(scene,.28),mixer=new T.AnimationMixer(root);
 if(!model.animations.length)throw Error('GLB thiếu chu kỳ chèo');const clip=model.animations[0],action=mixer.clipAction(clip);action.play();
 const athletes=[];root.traverse(o=>{if(o.userData.component==='athlete'&&o.userData.role==='ROWER'){const paddle=root.getObjectByName('Paddle_'+o.userData.id);if(paddle)athletes.push({root:o,role:'ROWER',paddle});}});
 root.userData.spec={paddleLength:1.22};const boat={root,athletes};
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Ghe Ngo 3D và người chèo từ cùng mô hình nguồn');host.appendChild(renderer.domElement);
 const camera=new T.OrthographicCamera(-18,18,6,-6,.05,500);let raf=0,disposed=false,lastView='',w=1,h=1;
 function resize(){w=host.clientWidth;h=host.clientHeight;renderer.setSize(w,h);lastView='';fx.setDpr(renderer.getPixelRatio());}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function setCamera(view){const ratio=w/h;
  root.traverse(o=>{if(o.userData.component==='athlete')o.visible=view==='boat'||[16,17].includes(o.userData.id);if(o.userData.component==='paddle'){const id=Number(o.name.replace('Paddle_',''));o.visible=view==='boat'||[16,17].includes(id);}});
  if(view==='boat'){const width=33.8;camera.left=-width/2;camera.right=width/2;camera.top=width/ratio/2;camera.bottom=-width/ratio/2;camera.position.set(10,13,43);camera.lookAt(0,1,0);}
  else{const spritePixels=Math.min(w*.86,h*.55),width=2.4*w/spritePixels;camera.left=-width/2;camera.right=width/2;camera.top=width/ratio/2;camera.bottom=-width/ratio/2;camera.position.set(5.4,2.25,4.5);camera.lookAt(4.27,.90,.06);}
  // Move the framed model below the page heading, matching the sprite layout.
  camera.setViewOffset(w,h,0,view==='boat'?-h*.05:0,w,h);camera.updateProjectionMatrix();lastView=view;
 }
 function frame(now){if(disposed)return;const dt=stepClock(clock,settings,now),s=settings.current,c=clock.current;
  if(s.view!==lastView){setCamera(s.view);fx.reset();}mixer.setTime(c.phase*clip.duration);root.position.y=Math.sin(c.phase*Math.PI*2)*.006;root.updateMatrixWorld(true);
  river.update(c.seconds);boat.athletes=athletes.filter(a=>a.root.visible);fx.update(dt,boat,4.2,c.seconds,s.splash);renderer.render(scene,camera);
  host.dataset.renderMode='model';host.dataset.artSource='MAKEHUMAN_GLB_MOTION_V6';host.dataset.phase=c.phase.toFixed(4);host.dataset.view=s.view;host.dataset.crewCount='55';host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.splashEvents=String(fx.stats().events);host.dataset.activeParticles=String(fx.stats().particles);
  raf=requestAnimationFrame(frame);
 }
 onReady({reset(){fx.reset();},capture(){saveCanvas(renderer.domElement,'ghe-ngo-3d-'+settings.current.view+'.png');},record(){return recordCanvas(renderer.domElement,'ghe-ngo-3d-'+settings.current.view+'-10s.webm');},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();mixer.stopAllAction();fx.dispose();river.dispose();scene.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});renderer.dispose();renderer.domElement.remove();}});
 raf=requestAnimationFrame(frame);
}
