import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createHybridBoats} from './hybrid-boats.mjs';
import {buildRiver,buildSplashes} from './river.mjs';
import {buildBoatWake} from './race-crew.mjs';
import {saveCanvas,recordCanvas} from './art-preview.mjs';
import {buildMasperoSky,COURSE,raceX} from './maspero-course.mjs';
import {courseZ} from './maspero-layout.mjs';
import {loadFestivalCrowd} from './festival-crowd.mjs';
import {ROWING_LAYOUT} from './rowing-pose.mjs';
import {buildStartOfficial} from './start-official.mjs';

// Both boats use the current continuous 3D athletes, independent role clocks,
// one scene and one renderer. The old cup entry remains independently usable.
export async function startBoatPreview(host,settings,clock,base,onReady,onProgress=(_loaded,_total)=>{}){
 const racing=!!settings.current.racing,rigs=[];let teamIds=[...(settings.current.teamIds||['tum-nup-2','prek-on-dok-2'])];
 let river,sky,assets,disposed=false,raf=0,observer,controls;
 try{
  rigs.push(await createHybridBoats(base+'assets/illustrated-v22/',{onProgress}));
  if(racing)rigs.push(await createHybridBoats(base+'assets/illustrated-v22/',{sharedRenderer:rigs[0].renderer}));
  await Promise.all(rigs.map((r,i)=>r.prepareTeams([teamIds[i]])));
  assets=await loadFestivalCrowd(base,{compact:true});
  if(![...document.fonts].some(f=>f.family.replace(/["']/g,'')==='Noto Sans Khmer')){
   const font=new FontFace('Noto Sans Khmer','url('+base+'assets/illustrated-v22/NotoSansKhmer.ttf)',{weight:'100 900'});document.fonts.add(await font.load());
  }
  await document.fonts.load('700 64px "Noto Sans Khmer"');
 }catch(error){rigs.reverse().forEach(r=>r.dispose());assets?.dispose();throw error;}
 const rig=rigs[0],{scene,boat,renderer,actors}=rig;
 scene.background=new T.Color('#b9e9ff');scene.fog=new T.Fog('#d5f2fc',280,1000);
 // Broad daylight fill keeps the unlit sides readable without a post-process
 // pass, extra shadow maps, or changes to the verified athlete geometry.
 scene.children.filter(o=>o.isHemisphereLight).forEach(o=>{o.color.set('#fffefa');o.groundColor.set('#b4dce4');o.intensity=2.6;});
 scene.children.filter(o=>o.isDirectionalLight).forEach(o=>{o.color.set('#fff3d6');o.intensity=1.6;});
 const fill=new T.DirectionalLight('#d8f0ff',.7);fill.position.set(-8,9,12);scene.add(fill);
 for(const r of rigs){const mask=r.scene.children.find(o=>o.isMesh&&o.material.colorWrite===false);if(mask)mask.visible=false;scene.add(r.boat);}
 river=buildRiver(scene,.28,{detailed:true,bright:true,crowdAssets:assets,crowdOptions:{vibrant:true,middleLimit:280,farLimit:12000,radius:430}});
 const courseOffset=racing?0:-(raceX(COURSE.length)+15.1);river.group.position.x=courseOffset;
 const official=buildStartOfficial(scene,assets,{x:raceX(0)+8+courseOffset});
 sky=buildMasperoSky(scene);river.setBoats(rigs.map(r=>r.boat));
 const banks={group:river.group,stats:{people:river.group.userData.spectators,banks:2,peoplePerBank:river.group.userData.crowd.peoplePerBank,npcVariants:assets.models.length,crowd:river.group.userData.crowd},update(time,camera){river.update(time,camera.position.x-courseOffset,camera.position.z);}};
 const effects=rigs.map(()=>buildSplashes(scene,.28)),wakes=rigs.map(()=>buildBoatWake(scene,.28));
 const crews=rigs.map(r=>({root:r.boat,athletes:r.actors.filter(a=>a.role==='rower').map(a=>{a.paddle.userData.length=a.posture==='standing'?1.75:ROWING_LAYOUT.seatedPaddleLength;return {root:a.group,paddle:a.paddle,role:'ROWER'};})}));
 rigs.forEach(r=>r.boat.userData.spec={paddleLength:ROWING_LAYOUT.seatedPaddleLength});
 const camera=new T.PerspectiveCamera(36,1,.04,5000);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=1.2;controls.maxDistance=3500;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=true;
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));effects.forEach(e=>e.setDpr(renderer.getPixelRatio()));
 renderer.domElement.setAttribute('aria-label',racing?'Hai ghe 3D tự đua 1.200 mét trên sông Maspéro, khán đài chính bên phải, cầu và khán giả hai bờ.':'Ghe Ngo 3D 54 người với thanh ngồi thấp trong lòng ghe, hai người lái và khán giả hai bờ.');host.appendChild(renderer.domElement);
 const race={elapsed:0,countdown:3,distance:rigs.map(()=>0),speed:rigs.map(()=>0),phases:rigs.map((_,i)=>i?.17:.28),finishTimes:rigs.map(()=>null),state:'countdown'};
 let lastView='',width=1,height=1,frames=0,frameId=0,lastStats=performance.now(),lastUi=0;
 const center=()=>{const p=boat.position.clone();if(racing){const other=rigs[1].boat.position,gap=Math.abs(other.x-p.x);p.lerp(other,settings.current.game?.state?.phase==='ready'?.5:settings.current.game?Math.max(0,.45-gap/200):.5);}return p;};
 function stage(distance){return distance<200?'Xuất phát':distance<950?'Đường trường':'Nước rút';}
 function snapshot(){return {...race,distance:[...race.distance],finishTimes:[...race.finishTimes],stages:race.distance.map(stage),length:COURSE.length,teams:teamIds.slice(0,rigs.length).map(id=>window.TukNgoTeams.get(id).name),game:settings.current.game?.snapshot()};}
 function syncGame(){const s=settings.current.game?.state;if(!s)return;Object.assign(race,{elapsed:s.elapsed,countdown:s.countdown,distance:[...s.distances],speed:[...s.speeds],phases:[s.beatPhase%1,s.aiPhase],finishTimes:[...s.finishTimes],state:s.phase});}
 function advance(dt){
  if(settings.current.game){settings.current.game.advance(dt);syncGame();return;}
  // Fixed-size integration also handles seeking / fast-view without a large
  // frame step overshooting the finish or starving a second boat's result.
  while(dt>1e-8){const step=Math.min(.05,dt);dt-=step;
   if(race.countdown>0){race.countdown=Math.max(0,race.countdown-step);if(!race.countdown)race.state='racing';continue;}
   if(race.state==='finished')break;
   race.elapsed+=step;
   rigs.forEach((r,i)=>{
    if(race.finishTimes[i]!=null){race.speed[i]*=Math.exp(-step*.6);return;}
    const d=race.distance[i],final=d>=950,start=d<200;
    const target=(start?5.45:final?5.85:5.10)+(i?(final?-.035:.025):(final?.055:0))+.06*Math.sin(race.elapsed*.13+i*2);
    race.speed[i]+=(target-race.speed[i])*(1-Math.exp(-step*(start?.65:.9)));
    const travel=race.speed[i]*step,remaining=COURSE.length-d;
    if(travel>=remaining){race.finishTimes[i]=race.elapsed-step+step*remaining/travel;race.distance[i]=COURSE.length;}
    else race.distance[i]+=travel;
    const cadence=settings.current.cadence+(start?18:final?24:0)+(i?-.7:0);
    race.phases[i]=(race.phases[i]+step*cadence/60)%1;
   });
   if(race.finishTimes.every(t=>t!=null))race.state='finished';
  }
 }
 function place(){rigs.forEach((r,i)=>{r.boat.rotation.y=racing?Math.PI:0;r.boat.position.set(racing?raceX(race.distance[i])+15.1:0,0,racing?COURSE.lanes[i]:0);r.boat.updateMatrixWorld(true);});}
 function setView(view){
  scene.fog.near=view==='banks'?1000:280;scene.fog.far=view==='banks'?3800:1000;
  camera.fov=view==='stand'?60:36;camera.updateProjectionMatrix();
  const anchor=center(),local=(x,y,z)=>new T.Vector3(x,y,z).applyMatrix4(boat.matrixWorld);
  const views={menu:{target:anchor.clone().add(new T.Vector3(-12,0,6)),offset:[38,29,46],span:79},race:{target:anchor.clone().setY(1),offset:settings.current.game?[40,30,40]:[40,50,50],span:settings.current.game?72:86},boat:{target:local(0,.65,0),offset:[24,20,26],span:39},top:{target:local(0,.65,0),offset:[0,30,.02],span:33},crew:{target:local(7.5,.9,0),offset:[2,1.5,5],span:5.3},kneel:{target:local(-3.2,.9,0),offset:[.8,1.3,4.8],span:4.8},bow:{target:local(12,.95,0),offset:[2.8,1.9,5.5],span:6},stern:{target:local(-11.3,1,0),offset:[-3,2,-6.5],span:8},
   banks:{target:new T.Vector3(raceX(600),1,0),offset:[70,1000,560],span:1500},
   stand:{target:new T.Vector3(COURSE.standX,7.5,courseZ(COURSE.standX,-55)),offset:[50,3,100],span:150},
   crowd:{target:new T.Vector3(COURSE.standX-96,2.5,courseZ(COURSE.standX-96,-45.6)),offset:[2,1,8],span:10},
   start:{target:new T.Vector3(raceX(0)+8,1.5,0),offset:[-38,29,28],span:64},
   official:{target:new T.Vector3(raceX(0)+8,1.8,0),offset:[-16,7,17],span:23},
   bridge:{target:new T.Vector3(COURSE.bridgeEnd,8,0),offset:[65,30,65],span:110},
   finish:{target:new T.Vector3(COURSE.finishX+15,2,0),offset:[65,34,65],span:185}};
  const v=views[view]||views.race;if(['banks','stand','crowd','bridge','finish','start','official'].includes(view))v.target.x+=courseOffset;controls.target.copy(v.target);
  const direction=new T.Vector3(...v.offset).normalize();if(['boat','top','crew','kneel','bow','stern'].includes(view))direction.applyQuaternion(boat.quaternion);
  const distance=v.span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.min(1.7,camera.aspect));
  camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();lastView=view;
 }
 function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();lastView='';}
 observer=new ResizeObserver(resize);observer.observe(host);place();resize();
 function reset(){if(settings.current.game){settings.current.game.reset(settings.current.game.state.difficulty);syncGame();}else Object.assign(race,{elapsed:0,countdown:3,distance:rigs.map(()=>0),speed:rigs.map(()=>0),phases:rigs.map((_,i)=>i?.17:.28),finishTimes:rigs.map(()=>null),state:'countdown'});effects.forEach(e=>e.reset());place();lastView='';settings.current.onRace?.(snapshot());}
 const api={rig,rigs,scene,boat,camera,controls,renderer,banks,sky,river,official,effects,game:settings.current.game,race,snapshot,advance,reset,
  async setTeams(ids){await Promise.all(rigs.map((r,i)=>r.prepareTeams([ids[i]])));if(disposed)return;teamIds=[...ids];effects.forEach(e=>e.reset());},
  seek(distance){const d=T.MathUtils.clamp(distance,0,COURSE.length);race.distance.fill(d);race.speed.fill(5.1);race.countdown=0;race.elapsed=d/5.1;race.finishTimes.fill(d===COURSE.length?race.elapsed:null);race.state=d===COURSE.length?'finished':'racing';effects.forEach(e=>e.reset());place();lastView='';settings.current.onRace?.(snapshot());},
  capture(){saveCanvas(renderer.domElement,'ghe-ngo-3d.png');},record(){return recordCanvas(renderer.domElement,'ghe-ngo-cheo-10s.webm');},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();effects.forEach(e=>e.dispose());wakes.forEach(w=>w.dispose());official.dispose();sky.dispose();river.dispose();assets.dispose();for(const r of rigs.slice(1)){r.scene.add(r.boat);r.dispose();}rig.dispose();renderer.domElement.remove();if(host.boatPreview===api)delete host.boatPreview;}
 };
 host.boatPreview=api;
 function frame(now){
  if(disposed)return;const s=settings.current,c=clock.current,dt=Math.min(.05,Math.max(0,(now-c.last)/1000));c.last=now;const previous=center();
  if(s.playing||s.ambientPlaying)c.seconds+=dt;
  if(s.playing){if(racing){advance(dt*(s.fast?3:1));c.phase=race.phases[0];}else c.phase=(c.phase+dt*s.cadence/60)%1;}
  syncGame();const game=s.game?.snapshot();
  place();
  if(lastView!==s.view){setView(s.view);effects.forEach(e=>e.reset());}
  else if(!['banks','stand','crowd','bridge','finish','start','official'].includes(s.view)){const delta=center().sub(previous);camera.position.add(delta);controls.target.add(delta);}
  controls.update();
  frameId++;
  rigs.forEach((r,i)=>r.render(racing?race.phases[i]:c.phase,c.seconds,{teamId:teamIds[i],effort:game?(i?(game.aiRaceStage==='final'?.7:.1):Math.max(game.raceStage==='final'?.65:0,game.strength)):0,desyncIntensity:game&&i===0?game.desyncIntensity:0,connectedKit:true,updateOnly:true,viewKey:'race-'+i,frameId,distance:camera.position.distanceTo(r.boat.position),nearest:i===0}));
  sky.update(camera);banks.update(c.seconds,camera);official.update(c.seconds,racing?race:{state:'racing'},camera);
  rigs.forEach((r,i)=>{const moving=s.playing&&(!racing||race.state==='racing'),strength=racing?(race.distance[i]>=950?.85:race.distance[i]<200?.45:.12):Math.max(0,(s.cadence-72)/24);effects[i].update(s.playing?dt:0,crews[i],racing?race.speed[i]:4.2,c.seconds,s.splash&&moving,Math.max(0,Math.min(1,strength+(game&&i===0?(game.pace==='recover'?-.18:game.pace==='sprint'?.5*game.strength:0):0)+((game&&(i?game.aiSurgeActive:game.surgeActive)) ? .15 : 0))));wakes[i].update(r.boat,c.seconds,moving);});
  renderer.render(scene,camera);
  frames++;if(now-lastStats>=1000){host.dataset.fps=(frames*1000/(now-lastStats)).toFixed(1);frames=0;lastStats=now;}
  if(game)s.onGameFrame?.(game);
  if(racing&&now-lastUi>(game?100:250)){s.onRace?.(snapshot());lastUi=now;}
  Object.assign(host.dataset,{renderMode:racing?'race':'boat',boatCount:String(rigs.length),crewCount:String(actors.length*rigs.length),masterRigs:String(8*rigs.length),phase:c.phase.toFixed(4),view:s.view,triangles:String(renderer.info.render.triangles),drawCalls:String(renderer.info.render.calls),splashEvents:String(effects.reduce((n,e)=>n+e.stats().events,0)),banks:'2',spectators:String(banks.stats.people),daylight:'bright',raceState:race.state,courseLength:String(COURSE.length),raceDistances:JSON.stringify(race.distance)});
  raf=requestAnimationFrame(frame);
 }
 onReady(api);raf=requestAnimationFrame(frame);
}
