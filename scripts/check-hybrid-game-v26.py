"""Exercise the actual hybrid UI and distinguish simulation from browser-clock play."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,TimeoutError as PlaywrightTimeout
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);parser.add_argument('--realtime',action='store_true');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
def outside(a,b):
 return b['y']>=a['y']+a['height']-1 or b['x']>=a['x']+a['width']-1
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 for width,height in [(1024,768),(768,1024),(390,844),(834,480)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=True);errors=[];failed=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
  page.goto(args.url,wait_until='domcontentloaded',timeout=60000)
  page.wait_for_function('document.body.dataset.ready==="true" || !!document.body.dataset.loadError',timeout=60000)
  assert not page.evaluate('document.body.dataset.loadError'),page.locator('#status').inner_text()
  page.locator('button[data-mode=play]:not([data-kind])').click();assert page.evaluate('quickRace.state.phase')=='ready'
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  a,b=page.locator('#scene').bounding_box(),page.locator('#play-panel').bounding_box();assert outside(a,b),(a,b)
  assert page.locator('#play-start').bounding_box()['height']>=60
  page.screenshot(path=str(out/f'{width}-ready.png'))
  page.locator('#play-start').click();assert page.evaluate('quickRace.state.phase')=='countdown'
  page.locator('#toggle').click();before=page.evaluate('quickRace.state');page.wait_for_timeout(250)
  assert page.evaluate('quickRace.state')==before;assert not page.locator('#play-stroke').is_enabled()
  page.locator('#play-start').click();assert page.evaluate('quickRace.state.phase')=='countdown'
  page.evaluate('illustratedPreview.seek(0);quickRace.model.advance(3.1);quickRace.update()')
  # A real UI click on a legal beat, with the scene clock frozen for repeatability.
  page.evaluate('quickRace.model.advance((1-quickRace.state.beatPhase)*60/quickRace.state.cadence);illustratedPreview.draw(1)')
  page.locator('#play-stroke').click();assert page.evaluate('quickRace.state.perfect')==1
  page.locator('#play-stroke').click();assert page.evaluate('quickRace.state.perfect')==1
  page.locator('[data-pace=sprint]').click();assert page.evaluate('quickRace.state.cadence')==105
  page.locator('[data-pace=recover]').click();page.evaluate('quickRace.model.state.stamina=40;quickRace.model.advance(4);illustratedPreview.draw(5)')
  assert page.evaluate('quickRace.state.stamina')>40
  page.locator('[data-pace=steady]').click()
  page.locator('#fullscreen').click();page.wait_for_function('!!document.fullscreenElement')
  page.screenshot(path=str(out/f'{width}-fullscreen.png'))
  assert page.locator('#play-stroke').is_visible();assert outside(page.locator('#scene').bounding_box(),page.locator('#play-panel').bounding_box())
  page.locator('#exit-fullscreen').click();page.wait_for_function('!document.fullscreenElement')
  # Integrated model/adapter completion, accelerated; this is not a timed human race.
  result=page.evaluate('''()=>{const g=quickRace.model;g.start('normal');g.advance(3);let count=0;while(g.state.phase==='racing'&&count++<600){g.setPace(g.state.distances[0]>1000?'sprint':'steady');const next=Math.floor(g.state.beatPhase+1e-7)+1;g.advance((next-g.state.beatPhase)*60/TukNgoGameRules.PACES[g.state.pace].cadence);quickRace.stroke();}illustratedPreview.draw(200);return quickRace.state;}''')
  assert result['phase']=='finished' and result['result']=='win',result
  assert 'thắng' in page.locator('#play-title').inner_text()
  page.screenshot(path=str(out/f'{width}-win.png'))
  page.reload();page.wait_for_selector('body[data-ready=true]',timeout=60000);page.locator('button[data-mode=play]:not([data-kind])').click()
  assert 'Kỷ lục thắng' in page.locator('#play-record').inner_text()
  page.locator('#play-start').click();assert page.evaluate('quickRace.state.distances')==[0,0]
  page.evaluate('illustratedPreview.seek(0);quickRace.model.advance(363);illustratedPreview.draw(363)')
  assert page.evaluate('quickRace.state.result')=='dnf';assert 'chưa hoàn thành' in page.locator('#play-title').inner_text()
  page.locator('#display-options summary').click();page.locator('#quality').click();assert page.evaluate('illustratedPreview.stats.lowPower')
  page.locator('#quality').click();assert not page.evaluate('illustratedPreview.stats.lowPower')
  if width==1024:
   page.evaluate('illustratedPreview.play()');page.locator('#sound').click();page.wait_for_function('crowdAudio.currentTime>0 && !crowdAudio.paused',timeout=10000)
   page.locator('#toggle').click();assert page.evaluate('crowdAudio.paused')
   page.locator('#sound').click();assert not page.evaluate('illustratedPreview.stats.sound')
  reports.append({'viewport':[width,height],'simulatedFinish':result['finishTimes'][0],'simulationResult':result['result'],'actualButtonInput':True,'pausedClockFrozen':True,'fullscreenPanelOutsideScene':True,'recordReload':True,'errors':list(errors),'failedRequests':list(failed)})
  assert not errors and not failed,(errors,failed)
  page.close()
 if args.realtime:
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(args.url,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000)
  page.locator('button[data-mode=play]:not([data-kind])').click();page.locator('#difficulty').select_option('easy');page.locator('#play-start').click();started=time.monotonic();pressed=0;lastBeat=0
  while True:
   s=page.evaluate('quickRace.state')
   if s['phase']=='finished':break
   assert time.monotonic()-started<310,'Real race failed to finish'
   if s['phase']=='racing':
    beat=round(s['beatPhase'])
    if beat>lastBeat and abs(s['beatPhase']-beat)*60/s['cadence']<.07:
     try:
      page.locator('#play-stroke').click(timeout=1000);pressed+=1;lastBeat=beat
     except PlaywrightTimeout:
      # The real clock may cross the finish between inspection and the click.
      ended=page.evaluate('quickRace.state')
      if ended['phase']=='finished':s=ended;break
      page.screenshot(path=str(out/'real-clock-input-failure.png'))
      (out/'real-clock-input-failure.json').write_text(json.dumps({'state':ended,'inspected':s,'stats':page.evaluate('illustratedPreview.stats')},ensure_ascii=False,indent=2),encoding='utf8')
      raise
    if s['distances'][0]>1000 and s['pace']!='sprint':page.locator('[data-pace=sprint]').click()
   page.wait_for_timeout(15)
  page.screenshot(path=str(out/'real-clock-finish.png'))
  assert s['result']=='win' and not errors,s
  reports.append({'realBrowserClockSeconds':round(time.monotonic()-started,2),'actualButtonPresses':pressed,'result':s['result'],'state':s,'errors':errors})
  page.close()
 browser.close()
report={'url':args.url,'physicalTabletTested':False,'reports':reports};(out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False))
