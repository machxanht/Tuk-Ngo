(function(root){
 'use strict';
 function eligibility(cue,state){
  const r=cue.conditions||{},reasons=[];
  if(r.phases&&!r.phases.includes(state.phase))reasons.push('Sai giai đoạn');
  if(r.minDistance!=null&&state.distance<r.minDistance)reasons.push('Chưa tới '+r.minDistance+' m');
  if(r.maxDistance!=null&&state.distance>=r.maxDistance)reasons.push('Đã qua '+r.maxDistance+' m');
  if(r.minElapsed!=null&&state.elapsed<r.minElapsed)reasons.push('Chưa tới '+r.minElapsed+' giây');
  if(r.maxElapsed!=null&&state.elapsed>r.maxElapsed)reasons.push('Đã hết thời gian phát');
  if(r.maxAbsGap!=null&&Math.abs(state.gap)>r.maxAbsGap)reasons.push('Hai ghe không còn so kè');
  if(r.minAbsGap!=null&&Math.abs(state.gap)<r.minAbsGap)reasons.push('Cách biệt chưa đủ');
  if(r.paces&&!r.paces.includes(state.pace))reasons.push('Sai cách chèo');
  if(r.minCombo!=null&&state.combo<r.minCombo)reasons.push('Chuỗi nhịp chưa đủ');
  if(r.maxStamina!=null&&state.stamina>r.maxStamina)reasons.push('Sức chưa xuống ngưỡng');
  if(r.surgeActive!=null&&state.surgeActive!==r.surgeActive)reasons.push('Đạp chưa bật');
  if(r.requiresHardEffort&&!(state.surgeActive||state.pace==='sprint'||state.distance>=950))reasons.push('Chưa phải lúc tăng sức');
  if(r.results&&!r.results.includes(state.result))reasons.push('Sai kết quả');
  if(r.leadChanged&&!state.leadChanged)reasons.push('Chưa có đổi ngôi thật');
  if(r.cupChampion&&!state.cupChampion)reasons.push('Chưa vô địch cả cúp');
  if(r.teamIds&&!r.teamIds.every(id=>[state.player,state.opponent].includes(id)))reasons.push('Đội được nhắc không có trong lượt');
  if(state.phase==='paused')reasons.push('Cuộc đua đang tạm dừng');
  return {allowed:reasons.length===0,reasons};
 }
 function lineStatus(cue,lang,clips){
  const text=cue.text[lang]?.trim(),keys=cue.audio[lang]||[];
  if(!text)return 'not-scripted';
  if(!keys.length)return 'needs-audio';
  if(keys.some(k=>!clips[k]||clips[k].lang!==lang))return 'invalid';
  return keys.map(k=>clips[k].text).join(' ').trim()===text?'ready':'reference-only';
 }
 function namedTeams(cue,state){
  if(cue.names==='participants')return [...new Set([state.player,state.opponent])];
  if(cue.names==='leader')return [state.gap>=0?state.player:state.opponent];
  if(cue.names==='winner'&&['win','loss'].includes(state.result))return [state.result==='win'?state.player:state.opponent];
  return [];
 }
 function selection(cue,lang,data,state){
  const allowed=eligibility(cue,state);if(!allowed.allowed)return {...allowed,keys:[]};
  const status=lineStatus(cue,lang,data.clips);
  if(status!=='ready')return {allowed:false,reasons:['Câu này chưa có audio đúng kịch bản'],keys:[]};
  const channel=lang==='vi'?'voice':'khmer';
  const names=namedTeams(cue,state).flatMap(id=>data.teams[id]?.names[channel]||[]);
  const keys=[...names,...cue.audio[lang]];
  if(keys.some(k=>!data.clips[k]||data.clips[k].lang!==lang))return {allowed:false,reasons:['Thiếu audio đúng ngôn ngữ'],keys:[]};
  for(const key of keys){const check=eligibility({conditions:data.clips[key].conditions||{}},state);if(!check.allowed)return {allowed:false,reasons:['Bản thu không còn đúng ngữ cảnh: '+check.reasons.join(' · ')],keys:[]};}
  return {allowed:true,reasons:[],keys};
 }
 root.AudioStudioRules={eligibility,lineStatus,namedTeams,selection};
})(globalThis);
