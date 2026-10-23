"""Full-viewport render, visible short-tap steering and unblocked touch targets."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8780/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/immersive-race/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);api="document.querySelector('[data-testid=art-stage]').boatPreview";errors=[];report={'physicalTabletTested':False}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
  page.get_by_role('button',name='Luyện tập',exact=True).click();page.get_by_role('button',name='Bắt đầu luyện tập',exact=True).click()
  page.wait_for_function(api+".game.state.phase==='racing'")
  def s(expression):return page.evaluate(api+'.game.'+expression)
  def point(testid,id):
   box=page.get_by_test_id(testid).bounding_box();return {'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':id}
  cdp=page.context.new_cdp_session(page);row=point('stroke-pad',1);right=point('steer-right',2)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[row]});page.wait_for_function(api+'.game.state.perfect>=8',timeout=20000)
  before=s('state.lateralPositions[0]');project=lambda:page.evaluate(api+'.boat.position.clone().project('+api+'.camera).x*innerWidth/2')
  pixel_before=project();page.screenshot(path=str(out/'before-steering.png'))
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[row,right]});page.wait_for_timeout(60)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[right]})
  assert s('state.rowingHeld');assert s('state.steeringPulseRemaining')>.5
  page.wait_for_function(api+f'.game.state.lateralPositions[0]>{before}+.6',timeout=7000)
  delta=s('state.lateralPositions[0]')-before;pixels=project()-pixel_before
  assert pixels>5,(delta,pixels)
  page.screenshot(path=str(out/'tap-steering.png'));report['shortTap']={'touchDurationMs':60,'lateralTravelM':delta,'screenTravelPx':pixels,'otherFingerStillRowing':True}
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  page.get_by_test_id('steer-left').click();assert s('state.steeringPulseRemaining')>0,'Mouse/tap must steer without requiring a hold'
  # Move through the actual simulation to show the flow section and both cameras.
  page.evaluate(api+'.game.setRowingHeld(true);'+api+'.game.advance(25)');page.wait_for_timeout(250)
  assert page.evaluate(api+".scene.getObjectByName('Playable_River_Flow').visible")
  for view in ['chase','banks','race']:
   page.get_by_role('button',name='Góc nhìn',exact=True).click();page.wait_for_selector('[data-view='+view+']')
   page.screenshot(path=str(out/f'camera-{view}.png'))
  report['viewports']=[]
  for language in ['vi','km']:
   page.get_by_role('button',name='VI' if language=='vi' else 'ខ្មែរ',exact=True).click()
   for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(120)
    canvas=page.locator('canvas').bounding_box();assert canvas['x']==0 and canvas['y']==0 and canvas['width']==width and canvas['height']==height,canvas
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.locator('.game-controls').evaluate("e=>getComputedStyle(e).pointerEvents==='none'&&getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'")
    for testid in ['stroke-pad','steer-left','steer-right']:
     button=page.get_by_test_id(testid);box=button.bounding_box();assert box['width']>=44 and box['height']>=44
     assert 0<=box['x'] and box['x']+box['width']<=width+.5 and 0<=box['y'] and box['y']+box['height']<=height+.5
     assert button.evaluate("e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return e===hit||e.contains(hit)}"),testid+' obscured'
     assert button.evaluate("e=>getComputedStyle(e).pointerEvents==='auto'")
    page.screenshot(path=str(out/f'practice-{language}-{width}x{height}.png'));report['viewports'].append([language,width,height])
  page.set_viewport_size({'width':1024,'height':768});page.get_by_role('button',name='VI',exact=True).click()
  page.keyboard.press('Escape');page.get_by_role('button',name='Về menu chính',exact=True).click()
  # Manual timing remains visible without an opaque footer/panel.
  page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).click();page.get_by_label('Giữ nút để tự căn nhịp',exact=True).uncheck();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).click();page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).click();page.wait_for_function(api+".game.state.phase==='racing'")
  page.wait_for_function("!document.querySelector('[data-testid=stroke-pad]').disabled");assert page.locator('.game-timing-cue').is_visible();page.screenshot(path=str(out/'manual-rhythm.png'))
  report['manualTimingVisible']=True;report['errors']=errors;assert not errors,errors
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
 finally:browser.close()
