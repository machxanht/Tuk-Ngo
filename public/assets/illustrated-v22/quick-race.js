/* UI adapter for the existing tested race rules and the shared hybrid scene. */
(()=>{
 const rules=TukNgoGameRules,model=rules.createRaceGame(),q=id=>document.getElementById(id),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const recordKey='tuk-ngo-hybrid-records-v26';let records={},lastPhase='',kind='quick';
 try{const saved=JSON.parse(localStorage.getItem(recordKey)||'{}');for(const key of Object.keys(rules.DIFFICULTIES))if(Number.isFinite(saved[key])&&saved[key]>0)records[key]=saved[key];}catch{}
 function text(id,value){const element=q(id);if(element.textContent!==value)element.textContent=value;}
 function update(){
  const s=model.snapshot(),phase=s.phase,canStroke=phase==='racing'&&s.finishTimes[0]===null;
  window.hybridTeams?.update(phase);
  q('play-card').hidden=!['ready','finished','paused'].includes(phase);
  q('play-live').hidden=['ready','finished'].includes(phase);
  q('difficulty-control').hidden=phase==='paused';
  q('play-stroke').disabled=!canStroke;
  for(const button of document.querySelectorAll('[data-pace]'))button.setAttribute('aria-pressed',String(button.dataset.pace===s.pace));
  q('beat-marker').style.transform=`translateX(${s.rhythmProgress*100}cqw) translateX(-50%)`;
  text('play-stage-label',s.stageLabel);text('play-cadence',`${Math.round(s.cadence)} nhịp/phút`);
  q('play-charge').value=s.surgeCharge*100;text('play-charge-value',`${Math.round(s.surgeCharge*100)}%`);
  q('play-surge').disabled=!s.canSurge;q('play-surge').setAttribute('aria-pressed',String(!!s.surgeActive));
  text('play-surge',s.surgeActive?`Đang đạp · ${Math.ceil(s.surgeRemaining)}s`:'Đạp');
  q('perfect-zone').style.width=`${Math.min(90,.1*s.cadence/60*200)}%`;
  q('timing-zone').style.width=`${Math.min(90,rules.DIFFICULTIES[s.difficulty].window*s.cadence/60*200)}%`;
  q('stamina').value=s.stamina;q('stamina').setAttribute('aria-valuetext',`${Math.round(s.stamina)} phần trăm`);
  text('stamina-value',`${Math.round(s.stamina)}%`);text('play-distance',`${Math.floor(s.distances[0])} / 1.200 m`);
  text('play-gap',Math.abs(s.gap)<1?'Hai ghe ngang nhau':`${s.gap>0?'Dẫn':'Kém'} ${Math.round(Math.abs(s.gap))} m`);
  text('play-combo',`${s.combo} nhịp liên tiếp · ${s.accuracy}% đúng nhịp`);
  text('play-feedback',phase==='countdown'?`Xuất phát sau ${Math.ceil(s.countdown)}…`:phase==='paused'?'Đã tạm dừng':s.finishTimes[0]!==null?'Ghe bạn đã về đích':s.judgement&&!s.feedback.startsWith(s.judgement)?`${s.judgement} · ${s.feedback}`:s.feedback);
  q('play-feedback').dataset.quality=s.elapsed-s.feedbackAt<1.1?s.judgement==='PERFECT'?'perfect':s.judgement==='GOOD'?'good':'missed':'';
  if(phase!==lastPhase){
   if(phase==='finished'){
    window.hybridCup?.finished(s);
    if(s.result==='win'){const t=s.finishTimes[0];if(!records[s.difficulty]||t<records[s.difficulty]){records[s.difficulty]=t;try{localStorage.setItem(recordKey,JSON.stringify(records));}catch{}}}
    const titles={win:'Ghe bạn thắng!',loss:'Ghe đối thủ thắng',tie:'Hai ghe hòa nhau',dnf:'Ghe bạn chưa hoàn thành'};
    text('play-title',titles[s.result]);
    text('play-description',`Bạn: ${s.finishTimes[0]===null?'Chưa về đích':rules.formatRaceTime(s.finishTimes[0])} · Đối thủ: ${s.finishTimes[1]===null?'Chưa về đích':rules.formatRaceTime(s.finishTimes[1])}. ${s.accuracy}% đúng nhịp, chuỗi tốt nhất ${s.maxCombo} nhịp.`);
    text('play-start','Đua lại');
   }else if(phase==='paused'){
    text('play-title','Trận đua tạm dừng');text('play-description',s.pauseReason||'Bấm Tiếp tục khi sẵn sàng.');text('play-start','Tiếp tục');
   }else if(phase==='ready'){
    text('play-title','Đua 1.200 m');text('play-description','Bạn điều khiển ghe ở làn gần. Chạm Chèo khi vạch vào vùng sáng; giữ sức rồi nước rút ở cuối đường đua.');text('play-start','Bắt đầu');
   }
   if(['ready','paused','finished'].includes(phase))text('race-announcement',q('play-title').textContent);
   lastPhase=phase;
  }
  text('play-record',records[s.difficulty]?`Kỷ lục thắng: ${rules.formatRaceTime(records[s.difficulty])}`:'Chưa có kỷ lục thắng ở độ khó này');
  window.hybridCup?.update(s);
  return s;
 }
 function projected(){
  const s=model.snapshot(),active=s.phase==='racing'||s.phase==='paused',done=s.phase==='finished';
  const make=(i)=>({name:i===0?'Ghe bạn':'Ghe đối thủ',progress:s.distances[i]/rules.RACE_LENGTH,finished:s.finishTimes[i]!==null,finishTime:s.finishTimes[i],cadence:i===0?s.cadence:s.aiCadence,cycles:active&&s.finishTimes[i]===null?(i===0?s.beatPhase:s.aiPhase):.75,motion:active&&!done&&s.finishTimes[i]===null?clamp(i===0?s.power:s.speeds[1]/6):0,effort:i===0?Math.max(s.strength,s.raceStage==='start'?.45:s.raceStage==='final'?.65:0):s.aiSurgeActive?1:s.aiRaceStage==='start'?.45:s.aiRaceStage==='final'?.7:0,surge:i===0?s.surgeActive:s.aiSurgeActive,desyncIntensity:i===0?s.desyncIntensity:0,kitColor:i===0?'#23855e':'#cc9335'});
  return illustratedRace.project([make(1),make(0)],{stage:s.phase==='ready'?'ready':s.phase==='countdown'?'countdown':done?'finished':'racing',countdown:Math.ceil(s.countdown),run:s.elapsed,elapsed:s.elapsed,player:s,winner:done?s.result==='win'?'near':s.result==='loss'||s.result==='dnf'?'far':null:null});
 }
 q('play-start').onclick=async()=>{if(model.state.phase==='paused')model.resume();else{if(kind==='cup'&&!await hybridCup.beforeStart())return;model.start(q('difficulty').value);window.hybridCup?.raceStarted();}window.illustratedPreview?.play();update();};
 q('difficulty').onchange=()=>{if(['ready','finished'].includes(model.state.phase)){model.reset(q('difficulty').value);lastPhase='';update();}};
 document.querySelectorAll('[data-pace]').forEach(button=>button.onclick=()=>{model.setPace(button.dataset.pace);update();});
 function stroke(){const result=model.stroke();if(result)text('race-announcement',model.state.feedback);update();return result;}
 q('play-stroke').onclick=stroke;
 q('play-surge').onclick=()=>{model.surge();update();};
 window.quickRace={model,update,projected,stroke,get kind(){return kind;},refreshChoice(){lastPhase='';update();},enter(nextKind='quick'){kind=nextKind;model.reset(q('difficulty').value);lastPhase='';window.hybridCup?.enter(kind);update();},advance(dt){model.advance(dt);},pause(reason=''){model.pause(reason);update();},resume(){model.resume();update();},get state(){return model.snapshot();}};
 update();
})();
