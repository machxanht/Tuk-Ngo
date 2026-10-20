(function(){
 'use strict';
 const data=window.AUDIO_STUDIO_DATA,rules=window.AudioStudioRules;
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const searchText=v=>String(v).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 if(!data||!rules){$('summary').textContent='Chưa mở được bộ dữ liệu. Hãy xuất lại dashboard.';return;}
 const baseline=structuredClone(data.script),storageKey='tukngo-audio-desk-'+data.packageId;
 let script=structuredClone(baseline),selected='go',stage='',tab='script',lang='vi',serial=0,queue=[],activeSimulation=null;
 const state={phase:'racing',distance:960,elapsed:170,gap:1,pace:'sprint',combo:35,stamina:45,surgeActive:false,leadChanged:false,result:'win',cupChampion:false,player:'can_tho-23',opponent:'ca_mau-05'};
 const player=$('player');
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(saved?.schema===1&&Array.isArray(saved.cues))for(const c of script.cues){const old=saved.cues.find(x=>x.id===c.id);if(old&&typeof old.text?.vi==='string'&&typeof old.text?.km==='string')c.text={vi:old.text.vi.slice(0,4000),km:old.text.km.slice(0,4000)};}
 }catch{}
 const current=()=>script.cues.find(c=>c.id===selected)||script.cues[0];
 const edited=c=>JSON.stringify(c.text)!==JSON.stringify(baseline.cues.find(x=>x.id===c.id)?.text);
 const statusLabel=s=>({ready:'Có audio', 'needs-audio':'Cần audio','reference-only':'Cần khớp lời','not-scripted':'Chưa soạn',invalid:'Lỗi liên kết'}[s]);
 const sourceLabel=c=>c.sourceType==='azure-stock-neural'?'Khmer AI · Azure Piseth':c.sourceType==='user-supplied-recording'?'Bản tên ghe bạn cung cấp':c.sourceType==='licensed-recording'?'Bản thu thể thao · CC0':c.sourceType==='broadcast-separated'?'Trống tách từ giải đấu':'BLV · bản thu gốc';
 function save(){
  try{localStorage.setItem(storageKey,JSON.stringify({schema:1,cues:script.cues.map(c=>({id:c.id,text:c.text}))}));$('save-status').textContent=script.cues.filter(edited).length+' câu chỉnh · đã lưu trên trình duyệt này';}
  catch{$('save-status').textContent='Chưa lưu được trên trình duyệt. Hãy xuất JSON để giữ bản chỉnh.';}
 }
 function renderSummary(){
  const missing=script.cues.filter(c=>['vi','km'].some(l=>['needs-audio','reference-only'].includes(rules.lineStatus(c,l,data.clips)))).length;
  $('summary').innerHTML=[[script.cues.length,'tình huống','10 chặng · khai mạc đến kết quả'],[Object.keys(data.clips).length,'đoạn audio','Bản thu gốc / Khmer AI có nguồn'],[data.coverage.nameVi+'/61','tên Việt',data.coverage.nameKm+'/61 tên Khmer trong bộ xuất'],[missing,'câu cần xử lý','Thiếu audio hoặc chưa khớp kịch bản']].map(([v,t,n])=>`<div class="metric"><strong>${v}</strong><span>${t}</span><p>${n}</p></div>`).join('');
  $('cue-count').textContent=script.cues.length;
 }
 function renderStages(){
  $('stages').innerHTML=[{id:'',title:'Tất cả tình huống'},...script.stages].map(s=>`<button class="stage-button" data-stage="${s.id}" aria-pressed="${s.id===stage}"><span>${esc(s.title)}</span><small>${script.cues.filter(c=>!s.id||c.stage===s.id).length}</small></button>`).join('');
 }
 function renderList(){
  const query=searchText($('search').value),filter=$('status-filter').value;
  const entries=script.cues.filter(c=>(!stage||c.stage===stage)&&(!query||searchText(c.title+' '+c.id+' '+c.text.vi+' '+c.text.km).includes(query))).filter(c=>{
   if(filter==='edited')return edited(c);const s=['vi','km'].map(l=>rules.lineStatus(c,l,data.clips));
   return !filter||filter==='ready'&&s.every(v=>v==='ready')||filter==='missing'&&s.some(v=>v!=='ready');
  });
  $('list-title').textContent=script.stages.find(s=>s.id===stage)?.title||'Toàn bộ tình huống';
  $('list-caption').textContent=entries.length+' cảnh · chọn một cảnh để sửa lời và nghe đối chiếu';
  $('cue-list').innerHTML=entries.map(c=>`<button class="cue-card ${c.id===selected?'selected':''}" data-cue="${esc(c.id)}" aria-pressed="${c.id===selected}"><div class="cue-card-top"><span class="code">${esc(c.id)}</span><span class="pill">P${c.priority}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.when)}</p><div class="cue-flags">${['vi','km'].map(l=>{const s=rules.lineStatus(c,l,data.clips);return `<span class="pill ${s==='ready'?'ready':'missing'}">${l.toUpperCase()} · ${statusLabel(s)}</span>`;}).join('')}${edited(c)?'<span class="pill edited">Đã chỉnh</span>':''}</div></button>`).join('')||'<p class="empty">Không có tình huống phù hợp. Thử bỏ bớt bộ lọc.</p>';
 }
 function option(value,label,actual){return `<option value="${esc(value)}" ${String(value)===String(actual)?'selected':''}>${esc(label)}</option>`;}
 function teamOptions(actual){return Object.entries(data.teams).map(([id,t])=>option(id,t.nameVi,actual)).join('');}
 function conditionCopy(c){
  const r=c.conditions,parts=[];
  if(r.phases)parts.push('Trạng thái: '+r.phases.join(' / '));
  if(r.minDistance!=null||r.maxDistance!=null)parts.push('Ghe người chơi: '+(r.minDistance??0)+'–'+(r.maxDistance??1200)+' m (không gồm mốc cuối).');
  if(r.minElapsed!=null||r.maxElapsed!=null)parts.push('Thời gian đua: '+(r.minElapsed??0)+'–'+(r.maxElapsed??'∞')+' giây.');
  if(r.maxAbsGap!=null)parts.push('Chênh lệch ≤ '+r.maxAbsGap+' m.');
  if(r.minAbsGap!=null)parts.push('Chênh lệch ≥ '+r.minAbsGap+' m.');
  if(r.minCombo!=null)parts.push('Ít nhất '+r.minCombo+' nhịp đúng liên tục.');
  if(r.maxStamina!=null)parts.push('Sức bền ≤ '+r.maxStamina+'%.');
  if(r.surgeActive)parts.push('Đạp đang bật ngay lúc phát.');
  if(r.leadChanged)parts.push('Đổi ngôi đã thực sự xảy ra.');
  if(r.cupChampion)parts.push('Đã xác nhận vô địch toàn bộ cúp.');
  if(r.teamIds)parts.push('Đúng đội: '+r.teamIds.map(id=>data.teams[id]?.nameVi||id).join(', '));
  if(r.results)parts.push('Kết quả: '+r.results.join(' / '));
  parts.push('Ưu tiên '+c.priority+' · cách lần phát trước '+c.cooldownSeconds+' giây · hết hạn sau '+c.maxQueueAgeSeconds+' giây chờ.');
  return parts;
 }
 function renderDetail(){
  const c=current(),status=rules.lineStatus(c,lang,data.clips),clips=c.audio[lang].map(k=>({key:k,...data.clips[k]}));
  $('cue-detail').innerHTML=`<div class="detail-head"><p class="eyebrow">ĐANG BIÊN TẬP · ${esc(c.id)}</p><h2>${esc(c.title)}</h2><p>${esc(c.when)}</p></div><div class="detail-body"><div class="language-tabs" aria-label="Ngôn ngữ kịch bản"><button data-lang="vi" aria-pressed="${lang==='vi'}">Tiếng Việt</button><button data-lang="km" aria-pressed="${lang==='km'}">ភាសាខ្មែរ</button></div><div class="script-label"><label for="script-editor">KỊCH BẢN MUỐN DÙNG</label><span class="pill ${status==='ready'?'ready':'missing'}">${statusLabel(status)}</span></div><textarea id="script-editor" class="script-editor" lang="${lang}" maxlength="4000">${esc(c.text[lang])}</textarea><span class="source-note">Chỉnh lời lưu trên trình duyệt; audio giữ nguyên cho đến khi cắt hoặc tạo lại.</span><div class="audio-excerpt"><b>AUDIO ĐANG CÓ</b>${clips.length?clips.map(a=>`<p lang="${lang}">${esc(a.text)}</p><span class="source-note">${esc(sourceLabel(a))} · ${a.duration.toFixed(2)} s${a.dashboardOnly?' · mẫu bàn giao':''}</span>`).join(''):'<p>Chưa có bản thu cho câu này. Bộ xuất sẽ ghi yêu cầu xử lý.</p>'}<div class="action-row"><button class="secondary" data-play-cue="${esc(c.id)}" data-language="${lang}" ${clips.length?'':'disabled'}>Nghe audio hiện có</button>${clips.length?`<a class="text-link" href="${esc(clips[0].file)}" download>Tải đoạn đầu ↓</a>`:''}</div></div>${c.notes?`<p class="source-note">${esc(c.notes)}</p>`:''}<details><summary>Điều kiện phát & ưu tiên</summary><ul class="condition-list">${conditionCopy(c).map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></details><div class="scenario"><h3>Thử đúng tình huống</h3><div class="scenario-fields"><label>Trạng thái<select data-state="phase">${[['ceremony','Khai mạc'],['intro','Lia máy'],['ready','Sẵn sàng'],['countdown','Đếm ngược'],['racing','Đang đua'],['paused','Tạm dừng'],['finished','Kết thúc']].map(([v,l])=>option(v,l,state.phase)).join('')}</select></label><label>Ghe bạn tại (m)<input data-state="distance" type="number" min="0" max="1200" value="${state.distance}"></label><label>Thời gian đua (s)<input data-state="elapsed" type="number" min="0" value="${state.elapsed}"></label><label>Chênh lệch (+ bạn dẫn)<input data-state="gap" type="number" value="${state.gap}"></label><label>Ghe của bạn<select data-state="player">${teamOptions(state.player)}</select></label><label>Đối thủ<select data-state="opponent">${teamOptions(state.opponent)}</select></label><label>Cách chèo<select data-state="pace">${[['recover','Giữ sức'],['steady','Đều nhịp'],['sprint','Nước rút']].map(([v,l])=>option(v,l,state.pace)).join('')}</select></label><label>Kết quả<select data-state="result">${[['win','Bạn thắng'],['loss','Đối thủ thắng'],['tie','Hòa'],['dnf','Không hoàn thành']].map(([v,l])=>option(v,l,state.result)).join('')}</select></label><label>Chuỗi nhịp<input data-state="combo" type="number" min="0" value="${state.combo}"></label><label>Sức (%)<input data-state="stamina" type="number" min="0" max="100" value="${state.stamina}"></label></div>${[['surgeActive','Đạp đang bật'],['leadChanged','Vừa đổi ngôi thật'],['cupChampion','Đã vô địch cả cúp']].map(([k,l])=>`<label class="check"><input type="checkbox" data-state="${k}" ${state[k]?'checked':''}>${l}</label>`).join('')}<button class="text-button" id="apply-scene">Áp dụng điều kiện của cảnh này ↗</button><div id="eligibility" class="eligibility" role="status"></div><button id="play-scene" class="primary">Phát thử theo trạng thái</button></div></div>`;
  updateEligibility();
 }
 function updateEligibility(){
  const c=current(),e=rules.eligibility(c,state),s=rules.selection(c,lang,data,state);
  $('eligibility').className='eligibility'+(s.allowed?'':' blocked');
  $('eligibility').textContent=s.allowed?'Đủ điều kiện · '+s.keys.length+' đoạn sẽ phát nối tiếp.':e.allowed?s.reasons.join(' · ')+'. Nghe bản hiện có ở phía trên để đối chiếu.':e.reasons.join(' · ');
  $('play-scene').disabled=!s.allowed;
  if(activeSimulation){const live=rules.selection(script.cues.find(c=>c.id===activeSimulation.cueId),activeSimulation.lang,data,state);if(!live.allowed)stop('Đã hủy lượt nghe vì trạng thái không còn đúng.');}
 }
 function applyScene(){
  const c=current(),r=c.conditions;
  Object.assign(state,{phase:r.phases?.[0]||'racing',distance:r.minDistance??(r.maxDistance!=null?Math.min(100,r.maxDistance-1):400),elapsed:r.minElapsed??(r.maxElapsed!=null?Math.min(1,r.maxElapsed):50),gap:r.minAbsGap??0,pace:r.paces?.[0]||(c.stage==='final'?'sprint':'steady'),combo:r.minCombo??35,stamina:r.maxStamina??70,surgeActive:r.surgeActive??false,leadChanged:!!r.leadChanged,cupChampion:!!r.cupChampion,result:r.results?.[0]||'win'});
  if(r.teamIds)state.player=r.teamIds[0];
  if(state.player===state.opponent)state.opponent=Object.keys(data.teams).find(id=>id!==state.player);
  renderDetail();
 }
 function renderTeams(){
  const q=searchText($('team-search').value);
  $('team-list').innerHTML=Object.entries(data.teams).filter(([id,t])=>searchText(id+' '+t.nameVi+' '+t.nameKm).includes(q)).map(([id,t])=>{
   const km=t.names.khmer.map(k=>data.clips[k]),vi=t.names.voice;
   return `<article class="team-card"><p class="code">${esc(id)} · ${t.gender==='male'?'NAM':t.gender==='female'?'NỮ':'GIỚI TÍNH CHƯA CHỐT'}</p><h3>${esc(t.nameVi)}</h3><p class="khmer-name" lang="km">${esc(t.nameKm||km[0]?.text||'Tên Khmer chưa xác minh')}</p><p class="source-note">${vi.length?'Việt · bản thu gốc':'Việt · chưa có audio'}<br>${km.length?km.some(c=>c.sourceType==='azure-stock-neural')?'Khmer · Azure stock, chờ duyệt phát âm':'Khmer · bản thu gốc':'Khmer · chưa có audio'}</p><div class="action-row"><button class="secondary" data-team="${esc(id)}" data-language="vi" ${vi.length?'':'disabled'}>Nghe Việt</button><button class="secondary" data-team="${esc(id)}" data-language="km" ${km.length?'':'disabled'}>Nghe Khmer</button></div></article>`;
  }).join('')||'<p class="empty">Không tìm thấy đội phù hợp.</p>';
 }
 function stop(message='Đã dừng lượt nghe.'){
  serial++;queue=[];activeSimulation=null;player.pause();player.removeAttribute('src');player.load();$('play-status').textContent=message;
 }
 function play(keys,title,detail,simulation=null){
  stop('');if(!keys.length){$('play-status').textContent='Chưa có bản thu phù hợp.';return;}
  activeSimulation=simulation;queue=keys.map(key=>({key,clip:data.clips[key]}));const token=serial;
  $('playing-title').textContent=title;$('playing-detail').textContent=detail;
  const next=()=>{
   if(token!==serial)return;
   if(activeSimulation&&!rules.selection(script.cues.find(c=>c.id===activeSimulation.cueId),activeSimulation.lang,data,state).allowed){stop('Trạng thái đã đổi. Bỏ audio hết ngữ cảnh.');return;}
   const entry=queue.shift();if(!entry){activeSimulation=null;$('play-status').textContent='Đã phát hết lượt nghe.';return;}
   const {clip,key}=entry;
   $('player-language').textContent=clip.lang==='km'?'ភាសាខ្មែរ · KHMER':'TIẾNG VIỆT';
   $('play-status').textContent=sourceLabel(clip)+' · '+key+' · '+(queue.length?'còn '+queue.length+' đoạn':'đoạn cuối');
   player.src=clip.file+'?audio='+clip.sha256.slice(0,12);player.onended=()=>{if(token===serial)setTimeout(next,150);};
   player.onerror=()=>{if(token===serial)stop('Không tải được audio. Kiểm tra file hoặc kết nối rồi thử lại.');};
   player.play().catch(()=>{if(token===serial)$('play-status').textContent='Chưa phát được. Bấm Play trong thanh nghe để thử lại.';});
  };next();
 }
 function selectTab(value){
  tab=value;for(const id of ['script','teams','handoff'])$(id+'-view').hidden=id!==value;
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===value));
  if(value==='teams')renderTeams();
 }
 function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportScript(){return {...script,exportReview:{packageId:data.packageId,editedCueIds:script.cues.filter(edited).map(c=>c.id),audioFilesChanged:false,recheckAudioAgainstEditedText:true}};}
 function csv(){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const rows=[['cue_id','stage','language','when','conditions_json','script_text','actual_audio_text','audio_keys','status']];for(const c of script.cues)for(const l of ['vi','km'])rows.push([c.id,c.stage,l,c.when,JSON.stringify(c.conditions),c.text[l],c.audio[l].map(k=>data.clips[k].text).join(' '),c.audio[l].join(';'),rules.lineStatus(c,l,data.clips)]);return '\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n');}
 document.addEventListener('click',event=>{
  const b=event.target.closest('button,a');if(!b)return;
  if(b.dataset.tab){selectTab(b.dataset.tab);return;}
  if(b.dataset.stage!=null){stage=b.dataset.stage;renderStages();renderList();return;}
  if(b.dataset.cue){selected=b.dataset.cue;renderList();renderDetail();if(innerWidth<=620)$('cue-detail').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  if(b.dataset.lang){lang=b.dataset.lang;renderDetail();return;}
  if(b.dataset.playCue){const c=current();play(c.audio[b.dataset.language],c.title,'Audio hiện có để đối chiếu; không giả lập đủ điều kiện.');return;}
  if(b.dataset.team){const t=data.teams[b.dataset.team];play(t.names[b.dataset.language==='vi'?'voice':'khmer'],t.nameVi,b.dataset.team+' · chỉ tên đội được chọn');return;}
  if(b.id==='stop-playback')stop();
  if(b.id==='apply-scene')applyScene();
  if(b.id==='play-scene'){const c=current(),s=rules.selection(c,lang,data,state);if(s.allowed)play(s.keys,c.title,'Đang kiểm tra điều kiện trước từng đoạn.',{cueId:c.id,lang});}
  if(b.id==='export-json')download('audio-script.json',JSON.stringify(exportScript(),null,2)+'\n','application/json;charset=utf-8');
  if(b.id==='export-csv')download('audio-cue-sheet.csv',csv(),'text/csv;charset=utf-8');
  if(b.id==='reset-edits'){script=structuredClone(baseline);try{localStorage.removeItem(storageKey);}catch{}$('save-status').textContent='Đã khôi phục kịch bản gốc.';renderSummary();renderList();renderDetail();}
 });
 let editTimer;
 document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='script-editor'){current().text[lang]=el.value;save();clearTimeout(editTimer);editTimer=setTimeout(()=>{renderSummary();renderList();const s=rules.lineStatus(current(),lang,data.clips),badge=document.querySelector('.script-label .pill');badge.textContent=statusLabel(s);badge.className='pill '+(s==='ready'?'ready':'missing');updateEligibility();},200);}
  if(el.id==='search'||el.id==='status-filter')renderList();
  if(el.id==='team-search')renderTeams();
  if(el.dataset.state){state[el.dataset.state]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;updateEligibility();}
 });
 document.addEventListener('change',event=>{if(event.target.id==='status-filter')renderList();});
 window.addEventListener('pagehide',()=>stop(''));
 for(const a of document.querySelectorAll('[data-file]'))a.href=data.downloadBase+a.dataset.file;
 $('download-zip').hidden=!data.packageZip;$('local-package').hidden=!!data.packageZip;
 if(data.packageZip)$('download-zip').href=data.packageZip;
 const requests=script.cues.flatMap(c=>['vi','km'].filter(l=>['needs-audio','reference-only'].includes(rules.lineStatus(c,l,data.clips))).map(l=>c.id+' · '+l.toUpperCase()));
 $('request-summary').innerHTML='<h3>'+requests.length+' dòng còn cần xử lý</h3><p>'+requests.map(esc).join(' / ')+'</p>';
 $('waveform').innerHTML=Array.from({length:48},(_,i)=>`<i style="height:${12+Math.round((.5+.5*Math.sin(i*1.29))*Math.sin(i*.12+1)*45+10)}px"></i>`).join('');
 renderSummary();renderStages();renderList();renderDetail();
 if(script.cues.some(edited))$('save-status').textContent=script.cues.filter(edited).length+' câu chỉnh · đã khôi phục từ trình duyệt';
 // Public diagnostic surface for reproducible tests; no account or network credentials.
 window.AudioStudio={data,state,getScript:()=>structuredClone(script),stop};
})();
