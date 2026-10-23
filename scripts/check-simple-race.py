"""Two-button UI, real browser sensor emulation, stamina and all three modes.
CDP touch/orientation are emulated; no physical tablet performance claim.
"""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/simple-controls/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);api="document.querySelector('[data-testid=art-stage]').boatPreview"
errors=[];report={'physicalTabletTested':False,'orientation':'Chromium CDP emulation','viewports':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True);cdp=page.context.new_cdp_session(page)
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(args.url);page.wait_for_selector('[data-boat-count="61"],.game-loading button',timeout=90000);assert page.locator('[data-boat-count="61"]').count(),page.locator('.game-loading').all_text_contents()
  def state(expression):return page.evaluate(api+'.game.'+expression)
  def started():page.wait_for_function(api+".game.state.phase==='intro'||"+api+".game.state.phase==='countdown'||"+api+".game.state.phase==='racing'")
  def menu():page.get_by_role('button',name='Menu chính',exact=True).click()
  def settings():page.locator('.game-audio-options>summary').click()
  def sensor(beta,gamma,n=8):
   for i in range(n):cdp.send('DeviceOrientation.setDeviceOrientationOverride',{'alpha':0,'beta':beta,'gamma':gamma+(i%2)*.25});page.wait_for_timeout(40)
  def point(testid,id):
   b=page.get_by_test_id(testid).bounding_box();return {'x':b['x']+b['width']/2,'y':b['y']+b['height']/2,'id':id}
  def finish():
   started();page.evaluate("""()=>{const g=document.querySelector('[data-testid=art-stage]').boatPreview.game;g.advance(13);g.setRowingHeld(true);while(g.state.phase==='racing')g.advance(.1);} """);page.get_by_role('dialog',name='Kết quả trận đua',exact=True).wait_for()
  page.evaluate("window.sensorEvents=[];addEventListener('deviceorientation',e=>{if(sensorEvents.length<12)sensorEvents.push({trusted:e.isTrusted,beta:e.beta,gamma:e.gamma})})")
  cdp.send('DeviceOrientation.setDeviceOrientationOverride',{'alpha':0,'beta':30,'gamma':0})
  page.get_by_role('button',name='Luyện tập',exact=True).click();page.get_by_role('button',name='Bắt đầu luyện tập',exact=True).click();started();sensor(30,0,6)
  page.wait_for_function(api+".game.state.phase==='racing'");assert page.get_by_test_id('tilt-status').get_attribute('data-sensor')=='active'
  assert page.locator('.game-inputs button').count()==2 and page.locator('.game-paces,.game-surge,.game-steering').count()==0
  assert page.locator('.simple-stamina progress').count()==1
  row=point('stroke-pad',1);boost=point('boost-pad',2)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[row]});page.wait_for_timeout(1800);assert state('state.stamina')<100
  sensor(30,24,10);page.wait_for_timeout(700);assert state('state.steeringInput')>.7 and state('state.lateralPositions[0]')>.1
  before=state('state.stamina');speed=state('state.speeds[0]');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[row,boost]});page.wait_for_timeout(2200)
  during=state('state.stamina');assert during<before-18 and state('state.boostActive') and state('state.speeds[0]')>speed
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[boost]});assert state('state.rowingHeld') and not state('state.boostHeld')
  sensor(30,-24,12);page.wait_for_timeout(400);assert state('state.steeringInput')<-.7
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert not state('state.rowingHeld')
  rested=state('state.stamina');page.wait_for_timeout(2200);recovered=state('state.stamina');assert recovered>rested+11
  report['stamina']={'beforeBoost':before,'afterBoost':during,'beforeRest':rested,'afterRest':recovered};report['independentTwoFingerContacts']=True
  report['sensorEvents']=page.evaluate('sensorEvents');assert all(e['trusted'] for e in report['sensorEvents']);page.screenshot(path=str(out/'two-controls.png'))
  cdp.send('Emulation.setDeviceMetricsOverride',{'width':1024,'height':768,'deviceScaleFactor':1,'mobile':False,'screenOrientation':{'type':'landscapePrimary','angle':90}})
  sensor(0,30,6);sensor(24,30,12);assert state('state.steeringInput')>.7;report['landscapeSteering']=True
  cdp.send('Emulation.clearDeviceMetricsOverride');sensor(30,0,6)
  for language in ['vi','km','en']:
   settings();page.get_by_role('button',name={'vi':'VI','km':'ខ្មែរ','en':'EN'}[language],exact=True).click();settings()
   for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    for testid in ['stroke-pad','boost-pad']:
     button=page.get_by_test_id(testid);b=button.bounding_box();assert b['width']>=48 and b['height']>=48 and 0<=b['x'] and b['x']+b['width']<=width+.5 and b['y']+b['height']<=height+.5
     assert button.evaluate("e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===e||e.contains(hit)}")
    page.screenshot(path=str(out/f'race-{language}-{width}x{height}.png'));report['viewports'].append([language,width,height])
  page.set_viewport_size({'width':1024,'height':768});settings();page.get_by_role('button',name='VI',exact=True).click();settings()
  with page.expect_download() as download:page.evaluate(api+'.capture()')
  download.value.save_as(str(out/'capture.png'));assert (out/'capture.png').stat().st_size>20000
  page.keyboard.down('Space');page.keyboard.down('ShiftLeft');page.keyboard.press('Escape');assert not state('state.rowingHeld') and not state('state.boostHeld');page.keyboard.up('Space');page.keyboard.up('ShiftLeft');page.get_by_role('button',name='Tiếp tục cuộc đua',exact=True).click()
  finish();assert state('state.result')=='complete';assert page.evaluate("Number(localStorage.getItem('tukngo-practice-best-simple'))")>0;report['practice']=True;menu()
  page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).click();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).click();finish();assert all(t is not None for t in state('state.finishTimes'));report['ai']=True;menu()
  page.get_by_role('button',name='Cúp lễ hội · 61 ghe',exact=True).click();page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).click();rounds=0
  while rounds<7:
   finish();rounds+=1;cup=page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup'))")
   if cup['status']=='champion':break
   assert cup['status']=='ready'
   if rounds==1:
    saved=cup;menu();page.reload();page.wait_for_selector('[data-boat-count="61"],.game-loading button',timeout=90000);assert page.locator('[data-boat-count="61"]').count(),page.locator('.game-loading').all_text_contents();assert page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup'))")==saved;page.get_by_role('button',name='Tiếp tục cúp đã lưu',exact=True).click();page.get_by_role('button',name='Tiếp tục giải',exact=True).click()
   else:page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).click()
  assert 5<=rounds<=6 and cup['status']=='champion';report['cup']={'races':rounds,'teams':61,'savedBracketRestored':True};page.screenshot(path=str(out/'cup-champion.png'))
  report['errors']=errors;assert not errors,errors;(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
 except Exception:
  page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'sensorEvents':page.evaluate('window.sensorEvents||[]'),'sensorStatus':page.get_by_test_id('tilt-status').get_attribute('data-sensor') if page.get_by_test_id('tilt-status').count() else None,'state':page.evaluate(api+'.game.snapshot()') if page.evaluate('!!'+api) else None},ensure_ascii=False,indent=2),encoding='utf-8');raise
 finally:browser.close()
