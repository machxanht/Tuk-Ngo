"""Three-mode UI, independent touch contacts, steering, real engine finishes and cup persistence."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--out',default='docs/qa/race-modes/local')
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]').boatPreview"
errors=[];report={'physicalTabletTested':False}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  def ready():page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
  def state(expression):return page.evaluate(api+'.game.'+expression)
  def finish_with_engine():
   page.wait_for_function(api+".game.state.phase==='intro'||"+api+".game.state.phase==='countdown'||"+api+".game.state.phase==='racing'",timeout=30000)
   # Run the actual fixed-step simulation faster for a complete match. Never
   # assign a result or overwrite the tournament; UI observers consume it.
   page.evaluate("""()=>{const g=document.querySelector('[data-testid=art-stage]').boatPreview.game;g.advance(13);g.setRowingHeld(true);for(let n=0;n<4000&&g.state.phase==='racing';n++)g.advance(.1);if(g.state.phase!=='finished')throw Error('Race did not finish');}""")
   page.get_by_role('dialog',name='Kết quả trận đua',exact=True).wait_for(timeout=10000)
  def menu():page.get_by_role('button',name='Menu chính',exact=True).click();ready()
  page.goto(args.url);ready();page.screenshot(path=str(out/'menu.png'))
  assert page.get_by_role('button',name='Luyện tập',exact=True).count()==1
  assert page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).count()==1
  page.get_by_role('button',name='Luyện tập',exact=True).click()
  page.get_by_role('button',name='Bắt đầu luyện tập',exact=True).click()
  page.wait_for_function(api+".game.state.phase==='racing'")
  page.wait_for_selector('[data-boat-count="1"]')
  assert state('state.mode')=='practice'
  assert page.get_by_test_id('practice-coach').is_visible()
  assert not page.evaluate(api+'.rigs[1].boat.visible')
  # Two actual touch contacts: row with finger 1 and steer with finger 2.
  pad=page.get_by_test_id('stroke-pad').bounding_box();left=page.get_by_test_id('steer-left').bounding_box()
  touch=lambda b,i:{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2,'id':i}
  row_touch=touch(pad,1);left_touch=touch(left,2);cdp=page.context.new_cdp_session(page)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[row_touch]})
  page.wait_for_function(api+'.game.state.perfect>=8',timeout=30000)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[row_touch,left_touch]})
  page.wait_for_function(api+'.game.state.lateralPositions[0]<-.85',timeout=20000)
  assert state('state.rowingHeld')
  assert page.evaluate(api+'.rigs[0].boat.rotation.y')>3.2
  grips=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,rig=a.rigs[0],helms=rig.actors.filter(x=>x.role==='helm'),gaps=[0,0];for(const steering of[-1,1])for(let frame=0;frame<96;frame++){rig.render(frame/96,frame/96*2.5,{teamId:a.assetSelection.teamIds[0],connectedKit:true,updateOnly:true,viewKey:'race-0',nearest:true,steering});helms.forEach((x,j)=>{const root=x.master.root,paddle=x.master.paddle,inverse=paddle.matrixWorld.clone().invert(),v=root.position.clone(),palms=['l','r'].map(side=>root.getObjectByName('hand_'+side).getWorldPosition(v.clone()).lerp(root.getObjectByName('middle_01_'+side).getWorldPosition(v.clone()),.9).applyMatrix4(inverse));gaps[j]=Math.max(gaps[j],Math.min(...palms.map((p,i)=>Math.max(p.length(),palms[1-i].distanceTo(v.set(0,-.53,0))))));const axis=v.set(0,1,0).transformDirection(paddle.matrixWorld);if(axis.y<Math.cos(20*Math.PI/180))throw Error('Rudder leans too far');});}return gaps;}""")
  assert max(grips)<.006,grips
  report['steeringPalmGapM']=grips;report['steeringPoseSamples']=384
  page.screenshot(path=str(out/'practice-steering.png'))
  before=state('state.perfect')
  # CDP touchEnd identifies the contact being lifted (not those remaining).
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[left_touch]})
  assert state('state.rowingHeld'),'Releasing steering must preserve rowing'
  assert state('state.steeringInput')==0
  page.wait_for_function(api+f'.game.state.perfect>{before}',timeout=10000)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  assert not state('state.rowingHeld')
  # Keyboard contacts can overlap, and the most recently pressed rudder wins.
  page.locator('canvas').click(position={'x':300,'y':300})
  page.keyboard.down('Space');page.keyboard.down('ArrowRight')
  assert state('state.rowingHeld') and state('state.steeringInput')==1
  page.keyboard.up('ArrowRight');assert state('state.rowingHeld')
  page.keyboard.up('Space');assert not state('state.rowingHeld')
  page.get_by_role('button',name='Giữ sức',exact=True).click()
  page.get_by_role('button',name='Đều nhịp',exact=True).click()
  finish_with_engine();assert state('state.result')=='complete'
  assert state('state.distances[1]')==0
  assert page.evaluate(api+'.audio.stats().cues')==[],'Solo practice must not announce an opponent or a match winner'
  assert all(state('snapshot().practiceTasks'))
  assert page.evaluate("Number(localStorage.getItem('tukngo-practice-best-assisted'))")>0
  page.screenshot(path=str(out/'practice-result.png'));report['practice']=True
  menu()
  # Choose a distinct AI opponent; assistance is independent of AI difficulty.
  page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).click()
  opponents=page.get_by_label('Chọn đội AI',exact=True)
  assert opponents.locator('option').count()==60
  selected=opponents.locator('option').nth(3).get_attribute('value');opponents.select_option(selected)
  page.get_by_label('Độ khó',exact=True).select_option('hard')
  page.screenshot(path=str(out/'ai-setup.png'))
  page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).click()
  page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).click()
  page.wait_for_function(api+".game.state.phase==='racing'")
  assert state('state.difficulty')=='hard' and state('state.rowingAssist')
  assert page.evaluate(api+'.assetSelection.teamIds[1]')==selected
  report['viewports']=[]
  for language in ['vi','km']:
   page.get_by_role('button',name='VI' if language=='vi' else 'ខ្មែរ',exact=True).click()
   for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
    page.set_viewport_size({'width':width,'height':height})
    page.wait_for_timeout(100)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for name in ['stroke-pad','steer-left','steer-right']:
     b=page.get_by_test_id(name).bounding_box();assert b['height']>=44 and b['width']>=44
     assert b['x']>=0 and b['x']+b['width']<=width+.5
    page.screenshot(path=str(out/f'ai-{language}-{width}x{height}.png'))
    report['viewports'].append([language,width,height])
  page.set_viewport_size({'width':1024,'height':768});page.get_by_role('button',name='VI',exact=True).click()
  # Pause while both controls are held; resuming must not leave either stuck.
  page.locator('canvas').click(position={'x':300,'y':300});page.keyboard.down('Space');page.keyboard.down('KeyD');page.keyboard.press('Escape')
  page.get_by_role('dialog',name='Nghỉ một nhịp',exact=True).wait_for()
  assert not state('state.rowingHeld') and state('state.steeringInput')==0
  page.keyboard.up('Space');page.keyboard.up('KeyD');page.get_by_role('button',name='Tiếp tục cuộc đua',exact=True).click()
  assert not state('state.rowingHeld') and state('state.steeringInput')==0
  finish_with_engine();assert all(t is not None for t in state('state.finishTimes'))
  report['ai']=True;page.screenshot(path=str(out/'ai-result.png'));menu()
  # Complete a real 61-team cup, restoring the saved bracket after its first win.
  page.get_by_role('button',name='Cúp lễ hội · 61 ghe',exact=True).click()
  page.get_by_label('Độ khó',exact=True).select_option('easy')
  page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).click()
  rounds=0
  while rounds<7:
   finish_with_engine();rounds+=1
   cup=page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup'))")
   if cup['status']=='champion':break
   assert cup['status']=='ready'
   if rounds==1:
    before=cup;menu();page.reload();ready()
    assert page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup'))")==before
    page.get_by_role('button',name='Tiếp tục cúp đã lưu',exact=True).click()
    page.get_by_role('button',name='Tiếp tục giải',exact=True).click()
   else:page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).click()
  assert 5<=rounds<=6 and cup['status']=='champion'
  assert cup['champion']==cup['playerId'] and len(cup['teamIds'])==61
  assert page.get_by_role('heading',name='Bạn đã vô địch!',exact=True).is_visible()
  page.screenshot(path=str(out/'cup-champion.png'))
  report['cup']={'races':rounds,'teams':61,'savedBracketRestored':True,'champion':cup['champion']}
  # New draw, controlled real-engine tie at the line, then a no-input DNF.
  page.get_by_role('button',name='Chọn ghe · chơi giải mới',exact=True).click()
  page.get_by_role('button',name='Bốc thăm giải mới',exact=True).click()
  page.evaluate("""()=>{const g=document.querySelector('[data-testid=art-stage]').boatPreview.game;g.advance(13);Object.assign(g.state,{distances:[1199.99,1199.99],speeds:[6,6],power:1,cohesion:1});g.advance(.01);}""")
  page.get_by_role('button',name='Đua lại lượt hòa',exact=True).wait_for(timeout=10000)
  page.get_by_role('button',name='Đua lại lượt hòa',exact=True).click()
  page.evaluate(api+'.game.advance(400)')
  page.get_by_role('dialog',name='Kết quả trận đua',exact=True).wait_for(timeout=10000)
  lost=page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup'))")
  assert lost['status']=='eliminated' and lost['champion'] is not None
  report['cup']['tieReplayAndElimination']=True
  assert not errors,errors
  report['errors']=errors
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  print(json.dumps(report))
 finally:browser.close()
