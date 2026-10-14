/* The cup shares the existing race, canvas and touch controls. */
(()=>{
 const q=id=>document.getElementById(id),catalog=TukNgoTeams,storageKey='tuk-ngo-cup-v31',names={quarterfinal:'Tứ kết',semifinal:'Bán kết',final:'Chung kết'};
 let cup=null,active=false,busy=false,startedMatch=null,lastBracket='',message='';
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&saved.teamIds.every(id=>catalog.list.some(t=>t.id===id))){cup=TukNgoTournament.createTournament();cup.restore(saved);}}catch{cup=null;}
 for(const team of catalog.list){const option=document.createElement('option');option.value=team.id;option.textContent=team.name+' · '+team.number;q('cup-team').append(option);}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify(cup.snapshot()));}catch{}}
 function fresh(playerId){cup=TukNgoTournament.createTournament({playerId,seed:Date.now()>>>0});startedMatch=null;lastBracket='';message='';save();}
 async function prepare(){
  const match=cup.currentMatch();if(!match)return true;
  busy=true;update(quickRace.state);
  try{const loaded=await hybridTeams.setPair([match.playerId,match.opponentId]);message=loaded?'':'Chưa tải được hoa văn đối thủ. Bấm Bắt đầu để thử lại.';return loaded;}
  finally{busy=false;update(quickRace.state);}
 }
 function drawBracket(s){
  const key=JSON.stringify(s.bracket);if(key===lastBracket)return;lastBracket=key;
  const target=q('cup-bracket');target.replaceChildren();
  for(const round of s.bracket){const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent=names[round.round];section.append(heading,list);
   for(const match of round.matches){const li=document.createElement('li');li.textContent=match.teams.map(id=>catalog.get(id).name).join(' — ')+(match.winner?' · Thắng: '+catalog.get(match.winner).name:match.result==='tie'?' · Hòa, đua lại':' · Chờ đấu');if(match.teams.includes(s.playerId))li.className='cup-player';list.append(li);}target.append(section);
  }
 }
 function update(race){
  q('cup-panel').hidden=!active;if(!active||!cup)return;
  const s=cup.snapshot(),match=cup.currentMatch(),locked=busy||['countdown','racing','paused'].includes(race.phase);
  q('cup-team').value=s.playerId;q('cup-team').disabled=q('cup-reset').disabled=locked;
  q('play-start').disabled=busy||hybridTeams.busy;
  const status=s.status==='champion'?'Vô địch · '+catalog.get(s.playerId).name:s.status==='eliminated'?'Đã bị loại':`${names[match.round]} · ${catalog.get(match.playerId).name} gặp ${catalog.get(match.opponentId).name}`;
  q('cup-status').textContent=message||status;drawBracket(s);
  if(['ready','finished'].includes(race.phase)){
   if(s.status==='champion'){q('play-title').textContent='Bạn đã vô địch giải 8 ghe!';q('play-start').textContent='Giải mới';}
   else if(s.status==='eliminated'){q('play-title').textContent='Ghe bạn dừng bước';q('play-start').textContent='Giải mới';}
   else if(s.status==='tie'){q('play-title').textContent='Hòa · đua lại cùng đối thủ';q('play-start').textContent='Đua lại vòng này';}
   else{q('play-start').textContent=race.phase==='finished'?'Vào '+names[match.round].toLowerCase():'Bắt đầu '+names[match.round].toLowerCase();if(race.phase==='ready')q('play-title').textContent=names[match.round]+' · 1.200 m';}
   if(race.phase==='ready')q('play-description').textContent='Bạn ở làn gần. Chạm Chèo đúng nhịp, giữ sức rồi nước rút. Thắng ba trận để vô địch; kết quả được lưu sau mỗi trận.';
  }
 }
 q('cup-reset').onclick=async()=>{if(busy||['countdown','racing','paused'].includes(quickRace.state.phase))return;fresh(q('cup-team').value);quickRace.model.reset(q('difficulty').value);quickRace.refreshChoice();await prepare();};
 q('cup-team').onchange=q('cup-reset').onclick;
 window.hybridCup={get locksTeams(){return active;},get state(){return cup?.snapshot();},get match(){return cup?.currentMatch();},update,
  async enter(kind){active=kind==='cup';startedMatch=null;if(!active){q('cup-panel').hidden=true;return;}if(!cup)fresh(hybridTeams.near.id);await prepare();},
  leave(){active=false;q('cup-panel').hidden=true;},
  async beforeStart(){if(!active||busy||hybridTeams.busy)return false;const s=cup.snapshot();if(['champion','eliminated'].includes(s.status))fresh(s.playerId);else if(s.status==='tie'){cup.retryTie();save();}return prepare();},
  raceStarted(){if(active)startedMatch=cup.currentMatch()?.matchId;},
  finished(race){if(!active||!startedMatch)return;cup.finish({matchId:startedMatch,result:race.result});startedMatch=null;save();},
 };
})();
