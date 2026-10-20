(function(){
 'use strict';
 const data=window.AUDIO_STUDIO_DATA,$=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const searchText=v=>String(v??'').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 if(!data){$('item-title').textContent='Chưa mở được dữ liệu audio.';return;}
 const handoff=data.khmerHandoff||{},storageKey='tukngo-audio-review',player=$('player');
 const script=structuredClone(data.script),clips={...data.clips},fileNotes={};
 for(const cue of script.cues)if(handoff.cues?.[cue.id])cue.text=structuredClone(handoff.cues[cue.id].text);
 const baseline=structuredClone(script);
 const objectMap=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 let saved={},savedBytes=null,recoveryNeeded=false;
 try{savedBytes=localStorage.getItem(storageKey);saved=JSON.parse(savedBytes||'{}')||{};}catch{recoveryNeeded=!!savedBytes;}
 if(savedBytes&&(!saved||typeof saved!=='object'||Array.isArray(saved)||saved.schema!==2))recoveryNeeded=true;
 for(const key of ['reviews','choices','edits','selected'])if(saved[key]!=null&&objectMap(saved[key])!==saved[key])recoveryNeeded=true;
 if(recoveryNeeded&&savedBytes)try{if(localStorage.getItem(storageKey+'-recovery')===null)localStorage.setItem(storageKey+'-recovery',savedBytes);}catch{}
 if(saved.schema!==2)saved={};
 const reviews=objectMap(saved.reviews),choices=objectMap(saved.choices),edits=objectMap(saved.edits),failedAudio=new Set();
 for(const cue of script.cues)for(const l of ['vi','km'])if(typeof edits[cue.id]?.[l]==='string')cue.text[l]=edits[cue.id][l].slice(0,4000);
 let view=['cues','teams','field'].includes(saved.view)?saved.view:'cues',lang=saved.lang==='vi'?'vi':'km';
 const selected={cues:'ceremony-teams',teams:'can_tho-23',field:null,...objectMap(saved.selected)};
 let playingKey=null,playSerial=0,autoListen=!!saved.autoListen;
 $('advance').checked=saved.advance!==false;$('auto-listen').checked=autoListen;
 for(const file of Object.values(handoff.files||{}))fileNotes[file.clipId]=[...new Set([...(fileNotes[file.clipId]||[]),...file.reviewWarnings])];
 if(data.beds?.menuMusic)clips['menu-music']={...data.beds.menuMusic,lang:'music',text:'Nhạc main menu · chỉ phát trước khi vào trận.',sourceType:'music',role:'menu-music'};
 const unique=arr=>[...new Set(arr||[])].filter(k=>clips[k]);
 const phaseName=id=>script.stages.find(s=>s.id===id)?.title||id;
 const sourceName=c=>c?.sourceType==='azure-stock-neural'?'AI Khmer · Azure':c?.sourceType==='user-supplied-recording'?'Bản tên đội đã cung cấp':c?.sourceType==='music'?'Nhạc menu':c?.sourceType==='licensed-recording'?'Bản thu CC0':'Bản thu gốc';
 const statusName=s=>({pending:'Chưa duyệt',pass:'Đạt',fix:'Cần sửa'}[s]||'Chưa duyệt');
 function items(which=view){
  if(which==='cues')return script.cues.map(c=>({id:c.id,title:c.title,subtitle:phaseName(c.stage),stage:c.stage,when:c.when,cue:c,text:c.text,
   audio:{vi:unique(c.audio.vi),km:unique([...(handoff.cues?.[c.id]?.variantKeys||[]),...c.audio.km])}}));
  if(which==='teams')return Object.entries(data.teams).map(([id,t])=>({id,title:t.nameVi,subtitle:(t.gender==='male'?'Nam':t.gender==='female'?'Nữ':'Chưa rõ nam/nữ')+' · '+id,
   when:'Đối chiếu đúng tên, số đội và nam/nữ. Tên chùa chung có thể xuất hiện ở nhiều đăng ký.',text:{vi:t.nameVi,km:t.nameKm||''},
   audio:{vi:unique(t.names.voice),km:unique([...(handoff.names?.[id]||[]),...t.names.khmer])}}));
  return Object.entries(clips).filter(([,c])=>!['voice','khmer'].includes(c.channel)&&c.lang!=='vi'&&c.lang!=='km').map(([key,c])=>({id:key,
   title:c.role==='menu-music'?'Nhạc main menu':c.text||key,subtitle:sourceName(c),when:c.role==='menu-music'?'Lặp ở menu, dừng trước khi vào trận.':'Nghe riêng để kiểm tra tiếng trống, còi, khán giả và môi trường.',text:{vi:c.text||'',km:''},audio:{vi:[key],km:[key]}}));
 }
 const slot=(item,l=lang,which=view)=>which+':'+item.id+':'+(which==='field'?'field':l);
 const keysFor=(item,l=lang)=>item?item.audio[l]||[]:[];
 const keyFor=(item,l=lang,which=view)=>{const keys=keysFor(item,l);return keys.includes(choices[slot(item,l,which)])?choices[slot(item,l,which)]:keys[0]||null;};
 const expected=item=>JSON.stringify(item.text);
 const reviewId=(item,key,l=lang,which=view)=>slot(item,l,which)+':'+(key||'missing');
 function reviewFor(item,key=keyFor(item),l=lang,which=view){
  const raw=objectMap(reviews[reviewId(item,key,l,which)]);
  const valid=['pending','pass','fix'].includes(raw.status)&&raw.sha256===(clips[key]?.sha256||null)&&raw.expectedText===expected(item);
  return {...raw,status:valid&&!(raw.status==='pass'&&!key)?raw.status:'pending',note:typeof raw.note==='string'?raw.note.slice(0,3000):''};
 }
 function warningsFor(item,key){
  const notes=[...(clips[key]?.reviewWarnings||[]),...(fileNotes[key]||[])];
  if(!key)notes.push('Chưa có audio cho ngôn ngữ này.');
  if(failedAudio.has(key))notes.push('Lần tải audio trước bị lỗi. Bấm Thử lại để kiểm tra kết nối hoặc file.');
  if(view==='teams'&&lang==='km'&&!item.text.km)notes.push('Tên Khmer chuẩn của đăng ký này còn cần xác minh.');
  return [...new Set(notes)];
 }
 function visible(){
  const q=searchText($('search').value),filter=$('review-filter').value,stage=$('stage-filter').value;
  return items().filter(item=>(view!=='cues'||!stage||item.stage===stage)&&(!q||searchText(item.id+' '+item.title+' '+item.text.vi+' '+item.text.km).includes(q))).filter(item=>!filter||filter==='issue'?(!filter||warningsFor(item,keyFor(item)).length>0):reviewFor(item).status===filter);
 }
 const current=()=>items().find(item=>item.id===selected[view])||null;
 function persist(){
  try{localStorage.setItem(storageKey,JSON.stringify({schema:2,reviews,choices,edits,view,lang,selected,advance:$('advance').checked,autoListen}));$('save-status').textContent='Đã lưu trên trình duyệt này';}
  catch{$('save-status').textContent='Chưa lưu được. Hãy xuất JSON để giữ kết quả.';}
 }
 function stop(message=''){
  playSerial++;player.pause();player.removeAttribute('src');player.load();playingKey=null;player.onended=null;player.onerror=null;player.oncanplay=null;
  $('play').textContent=view==='field'?'Nghe đoạn này':'Nghe '+(lang==='km'?'Khmer':'Việt');
  $('play-status').textContent=message||'Audio chỉ tải khi bấm nghe.';
 }
 function renderList(){
  const all=items(),entries=visible(),done=all.filter(i=>reviewFor(i).status!=='pending').length;
  $('progress').textContent=done+'/'+all.length+' mục đã đánh dấu · '+entries.length+' đang hiện';
  $('item-list').innerHTML=entries.map(item=>{const r=reviewFor(item),warning=warningsFor(item,keyFor(item)).length>0;return `<button class="item" data-item="${esc(item.id)}" aria-pressed="${item.id===selected[view]}"><span class="item-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}${warning?' · Có lưu ý':''}</small></span><span class="status-dot ${r.status}" aria-label="${statusName(r.status)}">${r.status==='pass'?'✓':r.status==='fix'?'!':'·'}</span></button>`;}).join('')||'<p class="empty">Không có mục phù hợp. Thử bỏ bộ lọc.</p>';
 }
 function variantName(key,index){
  const c=clips[key],duration=Number.isFinite(c.duration)?' · '+c.duration.toFixed(1)+'s':'';
  const match=key.includes('kos-thum')?' · Kos Thum 1':key.includes('tum-nup')?' · Tum Núp 2':'';
  return (index+1)+'. '+(key.startsWith('agy-')?'AGY':sourceName(c))+(key.includes('carrier')?' · Câu dẫn':match)+duration;
 }
 function renderTexts(item,key){
  const clip=clips[key];
  $('text-km').textContent=lang==='km'&&view!=='field'?(clip?.text||'Chưa có lời chép cho đoạn này. Nghe và ghi chú bên dưới.'):(item.text.km||'Chưa có bản Khmer tương ứng.');
  $('text-vi').textContent=lang==='vi'||view==='field'?(clip?.text||item.text.vi||'Chưa có lời chép.'):(item.text.vi||'Chưa có phần Việt để đối chiếu.');
  $('km-label').textContent=lang==='km'?'Lời trong hồ sơ audio':'Kịch bản Khmer để đối chiếu';
  $('vi-label').textContent=lang==='vi'?'Lời trong hồ sơ audio':'Nội dung kịch bản, chưa phải bản dịch đã duyệt';
  $('km-panel').classList.toggle('active-language',lang==='km'&&view!=='field');
  $('vi-panel').classList.toggle('active-language',lang==='vi'||view==='field');
  $('km-panel').hidden=view==='field';
 }
 function updateReviewControls(item=current()){
  if(!item)return;const key=keyFor(item),r=reviewFor(item,key);
  document.querySelectorAll('[data-review]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.review===r.status);b.disabled=b.dataset.review==='pass'&&(!key||failedAudio.has(key));});
 }
 function renderWarnings(item,key){
  const warnings=warningsFor(item,key);$('warning').textContent=warnings.join(' ');$('warning').hidden=!warnings.length;
 }
 function renderDetail(){
  const item=current(),entries=visible(),index=entries.findIndex(i=>i.id===item?.id);
  $('previous').disabled=index<=0;$('next').disabled=index<0||index>=entries.length-1;
  $('position').textContent=item?(view==='teams'?'TÊN ĐỘI':view==='field'?'ÂM THANH NỀN':phaseName(item.stage))+' · '+(index+1)+' / '+entries.length:'';
  $('item-title').textContent=item?.title||'Không có mục phù hợp';$('item-context').textContent=item?.when||'Thử bỏ tìm kiếm hoặc bộ lọc để tiếp tục.';
  for(const el of document.querySelectorAll('.variant-wrap,.listen,.transcripts,.review,.more'))el.hidden=!item;
  $('audio-note').hidden=!item;$('warning').hidden=true;if(!item)return;
  const keys=keysFor(item),key=keyFor(item),clip=clips[key],r=reviewFor(item,key);
  $('variant-wrap').hidden=keys.length<=1;
  $('variant').innerHTML=keys.map((k,i)=>`<option value="${esc(k)}" ${k===key?'selected':''}>${esc(variantName(k,i))}</option>`).join('');
  $('audio-note').textContent=key?sourceName(clip)+(Number.isFinite(clip.duration)?' · '+clip.duration.toFixed(2)+' giây':'')+(handoff.summary?' · Bản để nghe duyệt':''):'Chưa có audio';
  renderWarnings(item,key);
  $('play').disabled=!key;$('replay').disabled=!key;$('play').textContent=failedAudio.has(key)?'Thử lại':view==='field'?'Nghe đoạn này':'Nghe '+(lang==='km'?'Khmer':'Việt');
  renderTexts(item,key);
  $('review-state').textContent=statusName(r.status);$('review-note').value=r.note||'';
  updateReviewControls(item);
  $('edit-fields').hidden=view!=='cues';$('edit-km').value=item.text.km;$('edit-vi').value=item.text.vi;
  $('more').open=false;
  $('source-detail').innerHTML=(key?`<p>${esc(key)}</p><p>File: <code>${esc(clip.file)}</code></p><p>SHA-256: <code>${esc(clip.sha256)}</code></p><a href="${esc(clip.file)}" download>Tải audio đang chọn</a>${clip.sourceUrl?`<p><a href="${esc(clip.sourceUrl)}" target="_blank" rel="noopener">Mở nguồn gốc</a>${clip.sourceStart!=null?' · từ '+clip.sourceStart+' giây':''}</p>`:''}`:'<p>Chưa có file để nghe.</p>')+(item.cue?`<p>Điều kiện phát trong game:</p><pre>${esc(JSON.stringify(item.cue.conditions,null,2))}</pre><p>Ưu tiên ${item.cue.priority} · cách lần trước ${item.cue.cooldownSeconds}s. Thử nghe ở đây không kích hoạt lời bình trong game.</p>`:'')+`<p>Đánh dấu ở dashboard là kết quả kiểm tra của người nghe. Phát âm Khmer bản ngữ chưa được xác nhận tự động.</p>`;
 }
 function render(){
  const entries=visible();if(!entries.some(i=>i.id===selected[view]))selected[view]=entries[0]?.id||null;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang));
  document.querySelector('.language-tabs').hidden=view==='field';$('stage-filter').hidden=view!=='cues';
  $('toggle-list').textContent='Chọn mục khác · '+items().length+' mục '+($('library').classList.contains('list-open')?'⌃':'⌄');
  renderList();renderDetail();
 }
 function play(restart=false){
  const item=current(),key=item&&keyFor(item);if(!key)return;
  if(!restart&&playingKey===key&&player.src){if(!player.paused){player.pause();return;}const token=playSerial;player.play().catch(()=>{if(token===playSerial&&playingKey===key)$('play-status').textContent='Bấm Play trên thanh nghe để tiếp tục.';});return;}
  stop();const token=playSerial;playingKey=key;player.loop=$('loop').checked;
  player.src=clips[key].file+'?audio='+clips[key].sha256.slice(0,12);
  player.onended=()=>{if(token===playSerial){$('play-status').textContent='Đã nghe hết. Đánh dấu hoặc nghe lại.';$('play').textContent='Nghe lại';}};
  player.onerror=()=>{if(token===playSerial){failedAudio.add(key);stop('Không tải được audio. Thử lại hoặc kiểm tra file.');$('play').textContent='Thử lại';renderWarnings(item,key);updateReviewControls(item);}};
  player.oncanplay=()=>{if(token===playSerial&&playingKey===key&&player.readyState>=2){failedAudio.delete(key);renderWarnings(item,key);updateReviewControls(item);}};
  player.play().catch(()=>{if(token===playSerial)$('play-status').textContent='Chưa phát được. Bấm Play trong thanh nghe để thử lại.';});
 }
 player.addEventListener('play',()=>{$('play').textContent='Tạm dừng';$('play-status').textContent='Đang nghe '+(current()?.title||'audio')+'.';});
 player.addEventListener('pause',()=>{if(playingKey&&!player.ended)$('play').textContent='Nghe tiếp';});
 function choose(id,listen=autoListen){stop();selected[view]=id;render();persist();if(listen)play();}
 function step(delta){const entries=visible(),i=entries.findIndex(x=>x.id===selected[view]),next=entries[i+delta];if(next)choose(next.id);}
 function mark(status){
  const item=current();if(!item)return;
  const key=keyFor(item),entries=visible(),index=entries.findIndex(i=>i.id===item.id),nextId=entries[index+1]?.id;
  if(status==='pass'&&(!key||failedAudio.has(key)))return;
  reviews[reviewId(item,key)]={status,note:$('review-note').value,sha256:clips[key]?.sha256||null,expectedText:expected(item),updatedAt:new Date().toISOString()};
  if(status!=='pending'&&$('advance').checked&&nextId)selected[view]=nextId;
  stop();render();persist();if(autoListen&&selected[view]!==item.id)play();
  if(selected[view]!==item.id&&innerWidth<=700)$('detail').scrollIntoView({block:'start',behavior:'auto'});
 }
 function exportEntries(){
  const out=[];
  for(const which of ['cues','teams','field'])for(const item of items(which))for(const l of which==='field'?['vi']:['vi','km']){
   const keys=keysFor(item,l);for(const key of keys.length?keys:[null]){
    const clip=clips[key],r=reviewFor(item,key,l,which);
    out.push({group:which,itemId:item.id,title:item.title,language:which==='field'?'field':l,clipId:key,
     file:clip?.file||null,sha256:clip?.sha256||null,sourceType:clip?.sourceType||null,status:r.status,note:r.note||'',
     expectedText:item.text[l],audioTextLabel:clip?.text||'',reviewedAt:r.updatedAt||null,nativeListeningVerified:false});
   }
  }
  return out;
 }
 function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportReview(){return {schema:2,packageId:data.packageId,sourceHashes:handoff.sourceHashes||{},runtimeChanged:false,reviewType:'owner-listening-review',entries:exportEntries()};}
 function csv(){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const entries=exportEntries(),cols=['group','itemId','title','language','clipId','status','note','audioTextLabel','expectedText','file','sha256'];return '\ufeff'+[cols,...entries.map(r=>cols.map(c=>r[c]))].map(r=>r.map(quote).join(',')).join('\r\n');}
 document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.view){stop();view=b.dataset.view;$('search').value='';$('review-filter').value='';$('stage-filter').value='';render();persist();return;}
  if(b.dataset.lang){stop();lang=b.dataset.lang;render();persist();return;}
  if(b.dataset.item){choose(b.dataset.item);if(innerWidth<=700){$('library').classList.remove('list-open');$('toggle-list').setAttribute('aria-expanded','false');$('toggle-list').textContent='Chọn mục khác · '+items().length+' mục ⌄';$('detail').focus({preventScroll:true});$('detail').scrollIntoView({block:'start',behavior:'auto'});}return;}
  if(b.dataset.review){mark(b.dataset.review);return;}
  if(b.id==='play')play();if(b.id==='replay')play(true);if(b.id==='previous')step(-1);if(b.id==='next')step(1);
  if(b.id==='toggle-list'){const open=$('library').classList.toggle('list-open');b.setAttribute('aria-expanded',open);b.textContent=open?'Đóng danh sách':'Chọn mục khác · '+items().length+' mục';}
  if(b.id==='export-json')download('audio-review.json',JSON.stringify(exportReview(),null,2)+'\n','application/json;charset=utf-8');
  if(b.id==='export-csv')download('audio-review.csv',csv(),'text/csv;charset=utf-8');
  if(b.id==='export-script')download('audio-script.json',JSON.stringify({...script,exportReview:{packageId:data.packageId,editedCueIds:script.cues.filter(c=>JSON.stringify(c.text)!==JSON.stringify(baseline.cues.find(b=>b.id===c.id).text)).map(c=>c.id),audioFilesChanged:false,recheckAudioAgainstEditedText:true}},null,2)+'\n','application/json;charset=utf-8');
 });
 document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='search'){stop();render();}
  if(el.id==='review-note'){
   const item=current();if(!item)return;const key=keyFor(item),r=reviewFor(item,key);
   reviews[reviewId(item,key)]={...r,note:el.value,sha256:clips[key]?.sha256||null,expectedText:expected(item)};persist();
  }
  if(el.id==='edit-km'||el.id==='edit-vi'){
   const item=current();if(!item?.cue)return;const l=el.id==='edit-km'?'km':'vi';item.cue.text[l]=el.value;
   edits[item.id]={...item.cue.text};persist();renderList();$('review-state').textContent='Lời đã sửa · cần đối chiếu lại';
   document.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.review===reviewFor(item).status));
   renderTexts(item,keyFor(item));
  }
 });
 document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='stage-filter'||el.id==='review-filter'){stop();render();}
  if(el.id==='variant'){const item=current();if(item){choices[slot(item)]=el.value;stop();renderDetail();renderList();persist();if(autoListen)play();}}
  if(el.id==='loop')player.loop=el.checked;
  if(el.id==='auto-listen'){autoListen=el.checked;persist();}
  if(el.id==='advance')persist();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){const tools=document.querySelector('.tools');if(tools.open){tools.open=false;tools.querySelector('summary').focus();}return;}
  if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,audio,button,summary'))return;
  if(event.key==='ArrowRight'){event.preventDefault();step(1);}if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
 });
 document.addEventListener('click',event=>{const tools=document.querySelector('.tools');if(tools.open&&!tools.contains(event.target))tools.open=false;});
 window.addEventListener('pagehide',()=>stop());
 $('stage-filter').innerHTML='<option value="">Mọi giai đoạn</option>'+script.stages.map(s=>`<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
 for(const a of document.querySelectorAll('[data-file]'))a.href=data.downloadBase+a.dataset.file;
 $('download-zip').hidden=!data.packageZip;if(data.packageZip)$('download-zip').href=data.packageZip;
 $('package-note').textContent=handoff.summary?`Đã nhận ${handoff.summary.files} file Khmer từ AGY: ${handoff.summary.reusedByHash} file trùng bản có sẵn, ${handoff.summary.newFiles} file mới. Phần tên đội có ứng viên cho ${handoff.summary.namedRegistrations} đăng ký. Chưa nhập gói này vào game; phát âm Khmer còn chờ duyệt.`:'Bộ nghe thử độc lập với game. Khmer còn cần duyệt phát âm.';
 $('save-status').textContent=recoveryNeeded?'Phần lưu bị lỗi đã được phục hồi; dữ liệu gốc được giữ dự phòng.':Object.keys(reviews).length?'Đã khôi phục kết quả trên trình duyệt':'Chưa có mục nào được đánh dấu';
 render();
 window.AudioStudio={data,getScript:()=>structuredClone(script),getReview:exportReview,getVisible:()=>visible().map(i=>i.id),stop};
})();
