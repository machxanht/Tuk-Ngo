"""Pointer identity, early correction and ceremony garment visual checks."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/gameplay-polish/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);errors=[];boat="document.querySelector('[data-testid=art-stage]').boatPreview"
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
  page.screenshot(path=str(out/'menu-logo.png'))
  # Render the actual ceremony shader/geometry near the seated hips and thighs.
  image=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,crew=a.ceremony.group.getObjectByName('Ceremony_Distant_Athletes'),m=a.boat.matrix.clone();crew.getMatrixAt(31*50+24,m);const e=m.elements,camera=a.camera.clone();camera.position.set(e[12]-1.8,2.1,e[14]-3.2);camera.fov=42;camera.lookAt(e[12],.70,e[14]);camera.updateProjectionMatrix();a.ceremony.update(100,camera);if(a.ceremony.stats.nearAthletes<50||a.ceremony.stats.nearAthletes>100)throw Error("Near LOD not selected");a.renderer.render(a.scene,camera);return a.renderer.domElement.toDataURL('image/png');}""")
  (out/'ceremony-clothing.png').write_bytes(base64.b64decode(image.split(',')[1]))
  page.get_by_role('button',name='Đua nhanh · 2 ghe',exact=True).tap();page.get_by_role('button',name='Bắt đầu đua nhanh',exact=True).tap()
  page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).tap();page.wait_for_function(boat+".game.state.phase==='racing'",timeout=20000)
  # Freeze only the simulation clock for repeatable input-edge tests. All
  # contacts still pass through Chromium's real touchscreen and React handlers.
  page.evaluate(boat+".game.testAdvance="+boat+".game.advance;"+boat+".game.advance=()=>{}")
  button=page.get_by_test_id('stroke-pad');box=button.bounding_box();x=box['x']+box['width']*.55;y=box['y']+box['height']*.5
  cdp=page.context.new_cdp_session(page)
  page.evaluate(boat+".game.state.beatPhase=10.52")
  page.wait_for_timeout(50)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
  assert page.evaluate(boat+".game.state.lastTiming")=='early'
  assert page.evaluate(boat+".game.snapshot().strokeAvailable")
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  page.evaluate(boat+".game.state.beatPhase=11")
  page.wait_for_timeout(50)
  before=page.evaluate(boat+".game.state.perfect")
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
  assert page.evaluate(boat+".game.state.perfect")==before+1
  assert button.get_attribute('data-contact')=='accepted'
  # Keep finger one down, then use a non-primary second finger next beat.
  page.evaluate(boat+".game.state.beatPhase=12")
  page.wait_for_timeout(50)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1},{'x':x+14,'y':y+8,'id':2}]})
  assert page.evaluate(boat+".game.state.perfect")==before+2,'A second finger must not be ignored by isPrimary'
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  assert page.evaluate(boat+".game.state.perfect")==before+2,'Release/click must not double-score'
  page.screenshot(path=str(out/'input-receipt.png'))
  page.evaluate(boat+".game.advance="+boat+".game.testAdvance;delete "+boat+".game.testAdvance")
  assert not errors,errors
  report={'realTouchPointerEvents':True,'scoringClockControlled':True,'earlyCorrection':True,'nonPrimaryFingerAccepted':True,'releaseDoesNotDoubleScore':True,'ceremonyClothingRender':True,'errors':errors}
  (out/'input-regression.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  print(json.dumps(report))
 finally:browser.close()
