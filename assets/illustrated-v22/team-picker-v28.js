/* Uses the source-linked 2025 palette catalog bundled with the hybrid renderer. */
(()=>{
 const catalog=TukNgoTeams,near=document.getElementById('team-near'),far=document.getElementById('team-far'),status=document.getElementById('team-status');
 let picked=[...catalog.defaults],busy=true,lastSummary='',failure='';
 for(const [i,select] of [near,far].entries())for(const team of catalog.list){const option=document.createElement('option');option.value=team.id;option.textContent=`${team.name} · ${team.number}`;option.selected=team.id===picked[i];select.append(option);}
 function update(phase='ready'){
  const locked=busy||['countdown','racing','paused'].includes(phase);near.disabled=far.disabled=locked;
  document.getElementById('play-start').disabled=busy;
  const summary=busy?'Đang tải hoa văn…':failure||`${catalog.get(picked[0]).name} ở làn gần · ${catalog.get(picked[1]).name} ở làn xa${locked?' · đổi đội sau trận':''}`;
  if(summary!==lastSummary){status.textContent=summary;lastSummary=summary;}
 }
 async function select(){
  if(busy)return;const previous=[...picked],next=[near.value,far.value];busy=true;failure='';update();
  try{await illustratedPreview.hybrid.prepareTeams(next);picked=next;document.getElementById('team-options').dataset.loaded='true';}
  catch(error){near.value=previous[0];far.value=previous[1];failure='Không tải được hoa văn. Đội đang dùng được giữ lại; bạn có thể chọn lại để thử tải.';console.error(error);}
  finally{busy=false;update();illustratedPreview.draw(Number(document.getElementById('scene').dataset.time)||0);if(quickRace.state.phase==='ready')quickRace.refreshChoice();}
 }
 near.onchange=far.onchange=select;
 window.hybridTeams={get picked(){return [...picked];},get busy(){return busy;},get near(){return catalog.get(picked[0]);},get far(){return catalog.get(picked[1]);},update,async init(hybrid){await hybrid.prepareTeams(picked);busy=false;document.getElementById('team-options').dataset.loaded='true';update();},project(race){return {...race,boats:race.boats.map(boat=>{const team=catalog.get(picked[boat.id==='near'?0:1]);return {...boat,teamId:team.id,kitColor:team.jersey,name:team.name+' · '+team.number};})};}};
 update();
})();
