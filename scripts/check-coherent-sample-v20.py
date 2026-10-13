"""Inspect the real production sample, responsive controls and retained routes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json,hashlib,time

parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://localhost:3000/Tuk-Ngo/');parser.add_argument('--output',required=True);parser.add_argument('--duration',type=int,default=180)
args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True);repo=Path(__file__).resolve().parent.parent
report={'base':args.base,'errors':[],'viewports':[],'physicalTabletTested':False,'visualAcceptance':'Screenshots require direct inspection; runtime checks do not score likeness.'}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--ignore-gpu-blocklist','--use-angle=d3d11'])
 page=browser.new_page(viewport={'width':1200,'height':850},accept_downloads=True)
 page.on('pageerror',lambda error:report['errors'].append(str(error)))
 page.goto(args.base+'?demo=studio',wait_until='domcontentloaded');page.wait_for_selector('[data-sample-version="COHERENT_V20"]',timeout=90000)
 stage=page.get_by_test_id('coherent-stage');root=page.locator('.coherent-sample')
 for width,height in [(1024,768),(768,1024),(800,600)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
  assert root.get_attribute('data-controls-open')=='false';assert page.get_by_role('button').count()==1
  box=page.get_by_role('button',name='Điều khiển',exact=True).bounding_box();assert box['height']>=44 and box['y']+box['height']<=height
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(out/f'clean-{width}x{height}.png'))
  page.get_by_role('button',name='Điều khiển',exact=True).click();assert page.locator('.sample-controls').is_visible()
  page.screenshot(path=str(out/f'controls-{width}x{height}.png'))
  page.get_by_role('button',name='VĐV',exact=True).click();assert root.get_attribute('data-controls-open')=='false'
  page.wait_for_function('document.activeElement===document.querySelector(".sample-toggle")',timeout=5000)
  report['viewports'].append({'width':width,'height':height,'oneDefaultButton':True,'touchTarget':True,'noOverflow':True,'viewClosesPanel':True})
 page.set_viewport_size({'width':1200,'height':850});page.get_by_role('button',name='Điều khiển',exact=True).click();page.get_by_role('slider',name='Pha chèo',exact=True).fill('32');page.keyboard.press('Escape');assert root.get_attribute('data-controls-open')=='false'
 for label,filename in [('VĐV','hero'),('Khuôn mặt','face'),('Áo sau','back'),('NPC','npc'),('Đường phố','street'),('Toàn cảnh','wide')]:
  page.get_by_role('button',name='Điều khiển',exact=True).click();page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(350);page.screenshot(path=str(out/(filename+'.png')))
 before=json.loads(stage.get_attribute('data-sample-stats'));page.wait_for_timeout(1800);after=json.loads(stage.get_attribute('data-sample-stats'))
 assert abs(before['phase']-after['phase'])<1e-5 and after['ambientTime']>before['ambientTime']+1
 report['heroPauseKeepsEnvironmentAlive']=True
 page.get_by_role('button',name='Điều khiển',exact=True).click();page.get_by_role('button',name='VĐV',exact=True).click()
 for phase in [0,25,50,75]:
  page.get_by_role('button',name='Điều khiển',exact=True).click();page.get_by_role('slider',name='Pha chèo',exact=True).fill(str(phase));page.keyboard.press('Escape');page.wait_for_timeout(250);page.screenshot(path=str(out/f'hero-phase-{phase}.png'))
 page.get_by_role('button',name='Điều khiển',exact=True).click()
 with page.expect_download(timeout=90000) as download:page.get_by_role('link',name='GLB VĐV mới',exact=True).click()
 downloaded=out/'downloaded-athlete-v20.glb';download.value.save_as(downloaded)
 sha=hashlib.sha256(downloaded.read_bytes()).hexdigest();assert sha==hashlib.sha256((repo/'public/assets/coherent-v20/athlete-v20.glb').read_bytes()).hexdigest();report['downloadSha256']=sha
 page.get_by_role('button',name='Chèo',exact=True).click();page.keyboard.press('Escape')
 start=time.monotonic();report['longRun']=[]
 for target in range(0,args.duration+1,60):
  while time.monotonic()-start<target:page.wait_for_timeout(1000)
  stats=json.loads(stage.get_attribute('data-sample-stats'));assert stats['triangles']>50000 and stats['ambientTime']>=0
  assert page.locator('canvas').count()==1 and not page.locator('.sample-loading').is_visible()
  page.screenshot(path=str(out/f'continuous-{target}s.png'));report['longRun'].append({'elapsedSeconds':target,'stats':stats,'fps':stage.get_attribute('data-fps')});print(f'continuous sample {target}s OK',flush=True)
 page.goto(args.base+'?demo=studio&scene=race',wait_until='domcontentloaded');page.wait_for_selector('[data-scene-version="MASPERO_TWO_CREWS_V18"]',timeout=90000)
 assert page.get_by_test_id('race-stage').get_attribute('data-crew-count')=='110';report['fullRaceRetained']=True
 page.goto(args.base+'?demo=play',wait_until='domcontentloaded');page.wait_for_selector('[data-scene-version="MASPERO_TWO_CREWS_V18_GAMEPLAY"]',timeout=90000)
 page.get_by_role('button',name='Bắt đầu đua',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector("[data-testid=race-stage]").dataset.gameplay||"{}").phase==="racing"',timeout=15000)
 page.get_by_role('button',name='CHÈO',exact=True).click();page.get_by_role('button',name='Tạm dừng cuộc đua',exact=True).click();page.wait_for_timeout(300);assert page.get_by_role('button',name='Tiếp tục đua',exact=True).is_visible();report['gameStartStrokePause']=True
 report['pass']=not report['errors'];(out/'runtime-review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8');assert report['pass'];browser.close();print(json.dumps(report,ensure_ascii=False),flush=True)
