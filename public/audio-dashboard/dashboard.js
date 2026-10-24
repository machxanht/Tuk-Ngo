(function(){
 'use strict';
 const data=window.AUDIO_STUDIO_DATA,$=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const searchText=v=>String(v??'').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 if(!data){$('item-title').textContent='Chưa mở được dữ liệu audio.';return;}
 const handoff=data.khmerHandoff||{},storageKey='tukngo-audio-review',player=$('player');
 const script=structuredClone(data.script),clips={...data.clips},fileNotes={};
 for(const cue of script.cues)if(handoff.cues?.[cue.id])cue.text=structuredClone(handoff.cues[cue.id].text);
 script.cues.sort((a,b)=>script.stages.findIndex(s=>s.id===a.stage)-script.stages.findIndex(s=>s.id===b.stage)||(a.conditions.minDistance||0)-(b.conditions.minDistance||0));
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
 let view=['cues','teams','field','venues'].includes(saved.view)?saved.view:'cues',lang=saved.lang==='vi'?'vi':saved.lang==='en'&&saved.view==='venues'?'en':'km';
 let venuePack=null,venueRows=[],venuePromise=null;
 const languageName=()=>lang==='en'?'English':lang==='km'?'Khmer':'Việt';
 async function loadVenues(){
  if(venuePack)return;if(venuePromise)return venuePromise;
  venuePromise=(data.venuePack?Promise.resolve(data.venuePack):fetch('../assets/race-audio/venues/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();})).then(pack=>{
   venuePack=pack;const city={maspero:'Maspéro','phnom-penh':'Phnom Penh','siem-reap':'Siem Reap'},cue={flyover:'Toàn cảnh',intro:'Giới thiệu đường đua',cruise:'Giữ nhịp đường trường','team-name':'Tên đội'};
   venueRows=Object.entries(pack.clips).map(([key,c])=>{clips[key]={...c,file:data.venuePack?c.file:'../assets/race-audio/'+c.file,reviewWarnings:c.lang==='km'?['Bản AI Khmer cần người biết tiếng Khmer nghe duyệt.']:[]};const venue=c.venueIds[0];return {id:key,venueId:venue,title:c.role==='team-name'?c.text:city[venue]+' · '+(cue[c.cueId]||c.cueId||key),subtitle:city[venue]+' · '+(c.lang==='km'?'Khmer':'English'),when:c.role==='team-name'?'Chỉ dùng cho đúng mã đội trên sân này.':'Lời bình riêng của sân. Không đưa sang map khác.',text:{vi:'',km:c.lang==='km'?c.text:'',en:c.lang==='en'?c.text:''},audio:{[c.lang]:[key]}};});render();
  }).catch(()=>{$('save-status').textContent='Chưa tải được audio theo sân. Chọn lại mục để thử lại.';venuePromise=null;});return venuePromise;
 }
 const selected={cues:'ceremony-teams',teams:'can_tho-23',field:null,...objectMap(saved.selected)};
 let playingKey=null,playSerial=0,autoListen=!!saved.autoListen;
 $('advance').checked=saved.advance!==false;$('auto-listen').checked=autoListen;
 for(const file of Object.values(handoff.files||{}))fileNotes[file.clipId]=[...new Set([...(fileNotes[file.clipId]||[]),...file.reviewWarnings])];
 if(data.beds?.menuMusic)clips['menu-music']={...data.beds.menuMusic,lang:'music',text:'Nhạc main menu · chỉ phát trước khi vào trận.',sourceType:'music',role:'menu-music'};
 const unique=arr=>[...new Set(arr||[])].filter(k=>clips[k]);
 const phaseName=id=>script.stages.find(s=>s.id===id)?.title||id;
 const sourceName=c=>c?.sourceType==='azure-stock-neural'?'AI '+(c.lang==='en'?'English':'Khmer')+' · Azure':c?.sourceType==='user-supplied-recording'?'Bản tên đội đã cung cấp':c?.sourceType==='music'?'Nhạc menu':c?.sourceType==='licensed-recording'?'Bản thu CC0':'Bản thu gốc';
 const statusName=s=>({pending:'Chưa duyệt',pass:'Đạt',fix:'Cần sửa'}[s]||'Chưa duyệt');
 function items(which=view){
  if(which==='venues')return venueRows;
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
 const labelSignature=key=>JSON.stringify([clips[key]?.text||'',clips[key]?.meaningVi||'',clips[key]?.usage||null]);
 const reviewId=(item,key,l=lang,which=view)=>slot(item,l,which)+':'+(key||'missing');
 function reviewFor(item,key=keyFor(item),l=lang,which=view){
  const raw=objectMap(reviews[reviewId(item,key,l,which)]);
  const valid=['pending','pass','fix'].includes(raw.status)&&raw.sha256===(clips[key]?.sha256||null)&&raw.expectedText===expected(item)&&raw.labelSignature===labelSignature(key);
  return {...raw,status:valid&&!(raw.status==='pass'&&!key)?raw.status:'pending',note:typeof raw.note==='string'?raw.note.slice(0,3000):''};
 }
 function warningsFor(item,key){
  const notes=[...(clips[key]?.reviewWarnings||[]),...(fileNotes[key]||[])];
  notes.push(...(handoff.cueWarnings?.[item.id]?.[lang]||[]));
  const usage=clips[key]?.usage;
  if(usage?.kind==='fragment')notes.push('Đây là câu nối, chưa phải một lời bình hoàn chỉnh có tên đội.');
  if(usage?.kind==='resolved-match'||usage?.kind==='resolved-winner')notes.push('Bản cố định: '+usage.label+'. Không dùng cho đội khác.');
  if(!key)notes.push('Chưa có audio cho ngôn ngữ này.');
  if(failedAudio.has(key))notes.push('Lần tải audio trước bị lỗi. Bấm Thử lại để kiểm tra kết nối hoặc file.');
  if(view==='teams'&&lang==='km'&&!item.text.km)notes.push('Tên Khmer chuẩn của đăng ký này còn cần xác minh.');
  return [...new Set(notes)];
 }
 function itemStatus(item){
  const keys=keysFor(item);if(!keys.length)return 'pending';
  const states=keys.map(k=>reviewFor(item,k).status);
  return states.includes('fix')?'fix':states.every(s=>s==='pass')?'pass':'pending';
 }
 function visible(){
  const q=searchText($('search').value),filter=$('review-filter').value,stage=$('stage-filter').value;
  return items().filter(item=>(view!=='venues'||keysFor(item).length&&(!$('venue-filter').value||item.venueId===$('venue-filter').value))&&(view!=='cues'||!stage||item.stage===stage)&&(!q||searchText(item.id+' '+item.title+' '+item.text.vi+' '+item.text.km+' '+(item.text.en||'')).includes(q))).filter(item=>!filter||(filter==='issue'?(keysFor(item).length?keysFor(item).some(key=>warningsFor(item,key).length>0):warningsFor(item,null).length>0):filter==='pending'?(!keysFor(item).length||keysFor(item).some(k=>reviewFor(item,k).status==='pending')):itemStatus(item)===filter));
 }
 const current=()=>items().find(item=>item.id===selected[view])||null;
 function persist(){
  try{localStorage.setItem(storageKey,JSON.stringify({schema:2,reviews,choices,edits,view,lang,selected,advance:$('advance').checked,autoListen}));$('save-status').textContent='Đã lưu trên trình duyệt này';}
  catch{$('save-status').textContent='Chưa lưu được. Hãy xuất JSON để giữ kết quả.';}
 }
 function stop(message=''){
  playSerial++;player.pause();player.removeAttribute('src');player.load();playingKey=null;player.onended=null;player.onerror=null;player.oncanplay=null;
  $('play').textContent=view==='field'?'Nghe đoạn này':'Nghe '+languageName();
  $('play-status').textContent=message||'Audio chỉ tải khi bấm nghe.';
 }
 function renderList(){
  const all=items(),entries=visible(),total=all.reduce((n,i)=>n+keysFor(i).length,0),done=all.reduce((n,i)=>n+keysFor(i).filter(k=>reviewFor(i,k).status!=='pending').length,0);
  $('progress').textContent=done+'/'+total+' bản đã đánh dấu · '+entries.length+' mục đang hiện';
  $('item-list').innerHTML=entries.map(item=>{const status=itemStatus(item),keys=keysFor(item),warning=keys.some(k=>warningsFor(item,k).length>0),done=keys.filter(k=>reviewFor(item,k).status!=='pending').length;return `<button class="item" data-item="${esc(item.id)}" aria-pressed="${item.id===selected[view]}"><span class="item-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}${keys.length>1?' · '+done+'/'+keys.length+' bản':''}${warning?' · Có lưu ý':''}</small></span><span class="status-dot ${status}" aria-label="${statusName(status)}">${status==='pass'?'✓':status==='fix'?'!':'·'}</span></button>`;}).join('')||'<p class="empty">Không có mục phù hợp. Thử bỏ bộ lọc.</p>';
 }
 function variantName(key,index){
  const c=clips[key],duration=Number.isFinite(c.duration)?' · '+c.duration.toFixed(1)+'s':'';
  const label=c.usage?.label||(c.role==='team-name'?(c.text||'Chưa có lời chép'):(key.startsWith('agy-')?'AGY':sourceName(c)));
  return (index+1)+'. '+label+duration;
 }
 function renderTexts(item,key){
  const clip=clips[key];
  $('vi-panel').querySelector('h3').firstChild.textContent=view==='venues'&&lang==='en'?'English ':'Tiếng Việt ';
  if(view==='venues'&&lang==='en'){$('km-panel').hidden=true;$('text-vi').textContent=clip?.text||'';$('text-vi').lang='en';$('vi-label').textContent='Lời trong hồ sơ audio';$('transcript-note').hidden=true;return;}
  $('text-vi').lang='vi';
  $('text-km').textContent=lang==='km'&&view!=='field'?(clip?.text||'Chưa có lời chép cho đoạn này. Nghe và ghi chú bên dưới.'):(item.text.km||'Chưa có bản Khmer tương ứng.');
  $('text-vi').textContent=lang==='vi'||view==='field'?(clip?.text||item.text.vi||'Chưa có lời chép.'):view==='teams'?item.text.vi:(clip?.meaningVi||'Chưa có nghĩa Việt cho chính đoạn đang chọn. Không dùng lời của bản thu Việt để thay cho bản dịch.');
  $('km-label').textContent=lang==='km'?'Lời trong hồ sơ audio':'Kịch bản Khmer để đối chiếu';
  $('vi-label').textContent=lang==='vi'?'Lời trong hồ sơ audio':view==='teams'?'Tên đăng ký cần kiểm tra':'Nghĩa của lời Khmer · bản dịch nháp';
  $('km-panel').classList.toggle('active-language',lang==='km'&&view!=='field');
  $('vi-panel').classList.toggle('active-language',lang==='vi'||view==='field');
  $('km-panel').hidden=view==='field'||lang==='vi';
  $('transcript-note').textContent=lang==='km'&&view==='cues'?'Nghĩa Việt được dịch từ lời Khmer trong hồ sơ. Phát âm và lời nghe thực tế còn cần đối chiếu.':'';
  $('transcript-note').hidden=!(lang==='km'&&view==='cues');
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
  $('position').textContent=item?(view==='teams'?'TÊN ĐỘI':view==='field'?'ÂM THANH NỀN':view==='venues'?'THEO SÂN':phaseName(item.stage))+' · '+(index+1)+' / '+entries.length:'';
  $('item-title').textContent=item?.title||'Không có mục phù hợp';$('item-context').textContent=item?.when?.replace('tournament.championId trùng đội thắng chung kết','game xác nhận đội thắng chung kết là nhà vô địch').replace('registrationId','mã đăng ký')||'Thử bỏ tìm kiếm hoặc bộ lọc để tiếp tục.';
  for(const el of document.querySelectorAll('.variant-wrap,.listen,.transcripts,.review,.more'))el.hidden=!item;
  $('audio-note').hidden=!item;$('warning').hidden=true;$('transcript-note').hidden=true;if(!item)return;
  const keys=keysFor(item),key=keyFor(item),clip=clips[key],r=reviewFor(item,key);
  $('variant-wrap').hidden=keys.length<=1;
  $('variant').innerHTML=keys.map((k,i)=>`<option value="${esc(k)}" ${k===key?'selected':''}>${esc(variantName(k,i))}</option>`).join('');
  $('audio-note').textContent=key?sourceName(clip)+(Number.isFinite(clip.duration)?' · '+clip.duration.toFixed(2)+' giây':'')+(handoff.summary?' · Bản để nghe duyệt':''):'Chưa có audio';
  renderWarnings(item,key);
  $('play').disabled=!key;$('replay').disabled=!key;$('play').textContent=failedAudio.has(key)?'Thử lại':view==='field'?'Nghe đoạn này':'Nghe '+languageName();
  renderTexts(item,key);
  $('review-state').textContent=statusName(r.status);$('review-note').value=r.note||'';
  $('review-question').textContent=key?'Đánh giá bản '+(keys.indexOf(key)+1)+' / '+keys.length:'Chưa có bản audio';
  updateReviewControls(item);
  $('edit-fields').hidden=view!=='cues';$('edit-km').value=item.text.km;$('edit-vi').value=item.text.vi;
  $('more').open=false;
  $('source-detail').innerHTML=(key?`<p>${esc(key)}</p><p>File: <code>${esc(clip.file)}</code></p><p>SHA-256: <code>${esc(clip.sha256)}</code></p><a href="${esc(clip.file)}" download>Tải audio đang chọn</a>${clip.sourceUrl?`<p><a href="${esc(clip.sourceUrl)}" target="_blank" rel="noopener">Mở nguồn gốc</a>${clip.sourceStart!=null?' · từ '+clip.sourceStart+' giây':''}</p>`:''}`:'<p>Chưa có file để nghe.</p>')+(item.cue?`<p>Điều kiện phát trong game:</p><pre>${esc(JSON.stringify(item.cue.conditions,null,2))}</pre><p>Ưu tiên ${item.cue.priority} · cách lần trước ${item.cue.cooldownSeconds}s. Thử nghe ở đây không kích hoạt lời bình trong game.</p>`:'')+`<p>Đánh dấu ở dashboard là kết quả kiểm tra của người nghe. Phát âm Khmer bản ngữ chưa được xác nhận tự động.</p>`;
 }
 function render(){
  const entries=visible();if(!entries.some(i=>i.id===selected[view]))selected[view]=entries[0]?.id||null;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang));
  document.querySelector('.language-tabs').hidden=view==='field';$('stage-filter').hidden=view!=='cues';$('venue-filter').hidden=view!=='venues';document.querySelector('[data-lang=en]').hidden=view!=='venues';document.querySelector('[data-lang=vi]').hidden=view==='venues';
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
  reviews[reviewId(item,key)]={status,note:$('review-note').value,sha256:clips[key]?.sha256||null,expectedText:expected(item),labelSignature:labelSignature(key),updatedAt:new Date().toISOString()};
  let advanced=false;
  if(status!=='pending'&&$('advance').checked){
   const keys=keysFor(item),remaining=[...keys.slice(keys.indexOf(key)+1),...keys.slice(0,keys.indexOf(key))].find(k=>reviewFor(item,k).status==='pending');
   if(remaining){choices[slot(item)]=remaining;advanced=true;}
   else if(nextId){selected[view]=nextId;advanced=true;}
  }
  stop();render();persist();if(autoListen&&advanced)play();
  if(selected[view]!==item.id&&innerWidth<=700)$('detail').scrollIntoView({block:'start',behavior:'auto'});
 }
 function exportEntries(){
  const out=[];
  for(const which of ['cues','teams','field','venues'])for(const item of items(which))for(const l of which==='field'?['vi']:which==='venues'?Object.keys(item.audio):['vi','km']){
   const keys=keysFor(item,l);for(const key of keys.length?keys:[null]){
    const clip=clips[key],r=reviewFor(item,key,l,which);
    out.push({group:which,itemId:item.id,title:item.title,language:which==='field'?'field':l,clipId:key,
     file:clip?.file||null,sha256:clip?.sha256||null,sourceType:clip?.sourceType||null,status:r.status,note:r.note||'',
     expectedText:item.text[l],audioTextLabel:clip?.text||'',meaningVi:clip?.meaningVi||null,usage:clip?.usage||null,reviewedAt:r.updatedAt||null,nativeListeningVerified:false});
   }
  }
  return out;
 }
 function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportReview(){return {schema:2,packageId:data.packageId,sourceHashes:handoff.sourceHashes||{},runtimeChanged:false,reviewType:'owner-listening-review',entries:exportEntries()};}
 function csv(){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const entries=exportEntries(),cols=['group','itemId','title','language','clipId','status','note','audioTextLabel','meaningVi','expectedText','file','sha256'];return '\ufeff'+[cols,...entries.map(r=>cols.map(c=>r[c]))].map(r=>r.map(quote).join(',')).join('\r\n');}
 document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.view){stop();view=b.dataset.view;if(view==='venues'&&lang==='vi'||view!=='venues'&&lang==='en')lang='km';if(view==='venues')void loadVenues();$('search').value='';$('review-filter').value='';$('stage-filter').value='';render();persist();return;}
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
   reviews[reviewId(item,key)]={...r,note:el.value,sha256:clips[key]?.sha256||null,expectedText:expected(item),labelSignature:labelSignature(key)};persist();
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
  if(el.id==='stage-filter'||el.id==='review-filter'||el.id==='venue-filter'){stop();render();}
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
 $('package-note').textContent=handoff.summary?`Đã nhận ${handoff.summary.files} file Khmer từ AGY: ${handoff.summary.reusedByHash} file trùng bản có sẵn, ${handoff.summary.newFiles} file mới. Đã tạo lại ${handoff.repairs?.generated||0} biến thể có hồ sơ sai. Phần tên đội có ứng viên cho ${handoff.summary.namedRegistrations} đăng ký. Chưa nhập gói này vào game; phát âm Khmer còn chờ duyệt.`:'Bộ nghe thử độc lập với game. Khmer còn cần duyệt phát âm.';
 $('save-status').textContent=recoveryNeeded?'Phần lưu bị lỗi đã được phục hồi; dữ liệu gốc được giữ dự phòng.':Object.keys(reviews).length?'Đã khôi phục kết quả trên trình duyệt':'Chưa có mục nào được đánh dấu';
 render();
 if(data.venuePack||view==='venues')void loadVenues();
 window.AudioStudio={data,getScript:()=>structuredClone(script),getReview:exportReview,getVisible:()=>visible().map(i=>i.id),stop};
})();
