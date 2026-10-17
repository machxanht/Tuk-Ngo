"""Exercise the shipped playable cup, actual 3D paddle water and tablet controls."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4173/Tuk-Ngo/')
parser.add_argument('--out',default='docs/qa/festival-game')
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'physicalTabletTested':False};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url);page.wait_for_selector('[data-render-mode=race]',timeout=90000)
 assert page.get_by_label('Chọn đội ghe',exact=True).locator('option').count()==61
 page.screenshot(path=str(out/'selection.png'))
 page.get_by_label('Tìm ghe',exact=True).fill('Khle');assert page.get_by_label('Chọn đội ghe',exact=True).locator('option').count()==2
 page.get_by_label('Chọn đội ghe',exact=True).select_option('can_tho-03');page.get_by_label('Tìm ghe',exact=True).fill('')
 page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).tap()
 page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.game.state.phase==='countdown'")
 page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.advance(3)")
 page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.game.state.phase==='racing'")
 # Use both actual touch and keyboard handlers at legal beat boundaries.
 for i in range(6):
  page.wait_for_function("()=>{const s=document.querySelector('[data-testid=art-stage]').boatPreview.game.state;return s.beatPhase>=1&&Math.abs(s.beatPhase-Math.round(s.beatPhase))<.10;}")
  if i%2:page.keyboard.press('Space')
  else:page.get_by_role('button',name='CHÈO Space / chạm',exact=True).tap()
  page.wait_for_timeout(240)
 report['input']=page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.game.snapshot()")
 assert report['input']['perfect']+report['input']['good']>=4,report['input']
 assert report['input']['distances'][0]>0
 steady_force=page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.effects[0].stats().strength")
 page.get_by_role('button',name='Nước rút',exact=True).tap();page.wait_for_timeout(150)
 sprint_force=page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.effects[0].stats().strength")
 assert sprint_force>steady_force+.1,(steady_force,sprint_force)
 report['paceWater']={'steady':steady_force,'sprintBeforeFinal':sprint_force}
 page.get_by_role('button',name='Đều nhịp',exact=True).tap()
 page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.audio.stats().drumHits>0",timeout=20000)
 report['audio']=page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.audio.stats()")
 assert report['audio']['context']=='running' and not report['audio']['errors']
 page.get_by_role('button',name='Giữ sức',exact=True).tap();assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.game.state.pace")=='recover'
 page.get_by_role('button',name='Đều nhịp',exact=True).tap()
 page.get_by_role('button',name='Tạm dừng cuộc đua',exact=True).tap()
 paused=page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.game.snapshot()")
 page.wait_for_timeout(250);assert paused==page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.game.snapshot()")
 report['viewports']=[]
 for width,height in [(1024,768),(768,1024),(1180,430)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
  canvas=page.locator('.game-stage').bounding_box();footer=page.locator('.game-controls').bounding_box()
  assert canvas['height']>=120 and canvas['y']+canvas['height']<=footer['y']+.5
  assert footer['y']+footer['height']<=height+.5
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  stroke=page.get_by_role('button',name='CHÈO Space / chạm',exact=True).bounding_box();assert stroke['width']>=44 and stroke['height']>=44
  report['viewports'].append({'size':[width,height],'canvas':canvas,'strokeButton':stroke});page.screenshot(path=str(out/f'play-{width}x{height}.png'))
 page.get_by_role('button',name='Tiếp tục cuộc đua',exact=True).tap()
 # Complete the actual fixed-step rules with legal timed strokes, never inject
 # a distance/winner. This is fast integrator playback, not wall-clock racing.
 report['rounds']=[]
 for round_index in range(6):
  if round_index==0:
   page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<90000&&g.state.distances[0]<960;i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}}''')
   page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.effects[0].stats().strength>.8")
   page.get_by_role('button',name='Nước rút',exact=True).tap()
   page.get_by_role('button',name='ĐẠP!',exact=False).tap();page.wait_for_timeout(250)
   report['sprint']=page.evaluate("()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;return {state:a.game.snapshot(),water:a.effects[0].stats()};}")
   assert report['sprint']['state']['surgeActive'] and report['sprint']['water']['strength']==1
   page.screenshot(path=str(out/'sprint-live.png'))
   page.get_by_role('button',name='Đều nhịp',exact=True).tap()
  result=page.evaluate('''()=>{
   const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1,surges=0;
   for(let i=0;i<90000&&g.state.phase!=='finished';i++){
    a.advance(1/240);
    if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}
    if(g.snapshot().canSurge){g.surge();surges++;}
   }return {...g.snapshot(),surges};
  }''')
  assert result['result']=='win',result
  report['rounds'].append(result)
  page.wait_for_selector('[aria-label="Kết quả trận đua"]',timeout=15000)
  before=json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"))
  assert len([e for e in before['history'] if e['type']=='finish'])==round_index+1
  page.wait_for_timeout(400)
  assert before==json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')")), 'Result must not complete next match repeatedly'
  if before['status']=='champion':break
  page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).tap()
  page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.game.state.phase==='countdown'")
 report['cup']=json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"))
 assert report['cup']['champion']=='can_tho-03' and len(report['rounds']) in [5,6]
 assert len(report['cup']['teamIds'])==61
 assert len([m for r in report['cup']['bracket'] for m in r['matches'] if m['result']!='bye'])==60
 page.screenshot(path=str(out/'champion.png'))
 page.get_by_role('button',name='Xem toàn bộ nhánh đấu',exact=True).tap();page.screenshot(path=str(out/'bracket.png'))
 page.get_by_role('button',name='Đóng nhánh đấu',exact=True).tap()
 # Compare water intensity on the actual rowers/blade matrices over the same
 # three cycles. Both runs use the same trajectory; only force changes.
 report['water']=page.evaluate('''()=>{
  const a=document.querySelector('[data-testid=art-stage]').boatPreview,r=a.rigs[0],e=a.effects[0],crew={root:r.boat,athletes:r.actors.filter(p=>p.role==='rower').map(p=>({root:p.group,paddle:p.paddle,role:'ROWER'}))},runs=[];
  for(const force of [.12,1]){e.reset();let height=0,maxFans=0;
   for(let i=0;i<360;i++){const time=i/120,phase=(time*1.5)%1;r.render(phase,time,{teamId:'can_tho-03',nearest:true,connectedKit:true,updateOnly:true});e.update(1/120,crew,5.1,time,true,force);const p=e.droplets.geometry.attributes.position;for(let j=0;j<p.count;j++)height=Math.max(height,p.getY(j)-.28);maxFans=Math.max(maxFans,e.stats().sprayFans);}
   runs.push({...e.stats(),maxHeightM:height,maxFans});
  }
  // Preserve a close rendered view of the actual sprint spray before the
  // normal finished-race frame hides effects again.
  a.camera.position.copy(r.boat.position).add({x:3,y:7,z:15});a.controls.target.copy(r.boat.position).add({x:0,y:1,z:0});a.controls.update();a.renderer.render(a.scene,a.camera);
  return {runs,png:a.renderer.domElement.toDataURL('image/png')};
 }''')
 data=report['water'].pop('png');(out/'sprint-water.png').write_bytes(base64.b64decode(data.split(',')[1]))
 normal,sprint=report['water']['runs'];assert normal['catches']>0 and normal['releases']>0
 assert sprint['emitted']>normal['emitted']*1.8 and sprint['maxHeightM']>normal['maxHeightM']*1.4
 assert sprint['maxFans']>0
 # Reload proves the same 61-team cup, including the title, survives storage.
 page.reload();page.wait_for_selector('[data-render-mode=race]',timeout=90000)
 assert json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"))==report['cup']
 page.get_by_role('button',name='Nhánh đấu',exact=True).tap();assert page.get_by_label('Nhánh đấu 61 ghe',exact=True).get_by_text('Khleáng (Đội 1)',exact=False).count()>0
 page.get_by_role('button',name='Đóng nhánh đấu',exact=True).tap()
 page.get_by_label('Chọn đội ghe',exact=True).select_option('ca_mau-13')
 page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).tap()
 page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.game.state.phase==='countdown'")
 page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.advance(400)")
 page.wait_for_selector('[aria-label="Kết quả trận đua"]',timeout=15000)
 report['eliminated']=json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"))
 assert report['eliminated']['status']=='eliminated' and report['eliminated']['champion']!='ca_mau-13'
 page.get_by_role('button',name='Chọn ghe · chơi giải mới',exact=True).tap()
 page.get_by_role('button',name='Bốc thăm giải mới',exact=True).tap()
 page.wait_for_function("document.querySelector('[data-testid=art-stage]').boatPreview.game.state.phase==='countdown'")
 page.wait_for_timeout(400)
 fresh=json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"));assert fresh['history']==[] and len(fresh['teamIds'])==61
 report['newCupAfterElimination']=True
 report['dispose']=page.evaluate("()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;a.dispose();return {...a.renderer.info.memory};}")
 assert report['dispose']['geometries']==0 and report['dispose']['textures']==1,report['dispose']
 page.get_by_role('button',name='Xem mô hình',exact=True).tap()
 page.wait_for_selector('.art-preview [data-render-mode=race]',timeout=90000)
 assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.rigs.length")==2
 page.get_by_role('button',name='Cả ghe 3D',exact=True).tap()
 page.wait_for_selector('[data-render-mode=boat]',timeout=90000)
 assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.rig.actors.length")==54
 page.get_by_role('button',name='Chơi cúp 61 ghe',exact=True).tap()
 page.wait_for_selector('[data-testid=festival-game] [data-render-mode=race]',timeout=90000)
 assert page.get_by_label('Chọn đội ghe',exact=True).locator('option').count()==61
 report['inspectionNavigation']=['two-boat trial','54-person boat','61-team game']
 assert not errors,errors
 report['errors']=errors;report['loadUrls']=page.evaluate("performance.getEntriesByType('resource').map(r=>r.name)")
 browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':True,'rounds':len(report['rounds']),'champion':report['cup']['champion'],'water':report['water'],'errors':errors},ensure_ascii=False))
