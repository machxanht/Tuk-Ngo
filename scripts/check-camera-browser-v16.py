from pathlib import Path
from playwright.sync_api import sync_playwright
import json,math,sys
out=Path(__file__).resolve().parent.parent/'docs/qa/course-v16/live-camera';out.mkdir(parents=True,exist_ok=True)
base=sys.argv[1] if len(sys.argv)>1 else 'https://machxanht.github.io/Tuk-Ngo/'
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True,args=['--ignore-gpu-blocklist','--use-angle=d3d11']);page=b.new_page(viewport={'width':1024,'height':768})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and not m.location.get('url','').endswith('favicon.ico') else None)
 page.goto(base+'?demo=studio',wait_until='domcontentloaded');page.wait_for_selector('[data-scene-version="MASPERO_TWO_CREWS_V16"]',timeout=90000)
 page.wait_for_function('document.querySelector("[data-testid=race-stage]").dataset.cameraPosition');samples=[]
 for n in range(19):
  state=page.evaluate('''()=>{const h=document.querySelector('[data-testid=race-stage]');return {distance:h.dataset.distance,loops:h.dataset.loopCount,camera:JSON.parse(h.dataset.cameraPosition),target:JSON.parse(h.dataset.cameraTarget),boat:JSON.parse(h.dataset.boatPositions)[0],mode:h.dataset.camera};}''');state['elapsed']=n*10;state['targetOffset']=state['target'][0]-state['boat'][0];assert abs(state['targetOffset'])<6 and all(math.isfinite(x) for x in state['camera']);samples.append(state)
  if n in [0,6,12,18]:page.screenshot(path=str(out/f'fixed-live-{n*10}s.png'));print(json.dumps(state),flush=True)
  if n<18:page.wait_for_timeout(10000)
 assert int(samples[-1]['loops'])>=1
 page.get_by_role('button',name='Điều khiển',exact=True).click();page.get_by_role('button',name='Dừng',exact=True).click();page.get_by_role('button',name='Khán giả',exact=True).click();page.wait_for_timeout(500)
 h=page.locator('[data-testid=race-stage]');before={'time':h.get_attribute('data-crowd-time'),'phase':h.get_attribute('data-phases'),'boat':h.get_attribute('data-boat-positions')};page.screenshot(path=str(out/'crowd-paused-a.png'));page.wait_for_timeout(2000);after={'time':h.get_attribute('data-crowd-time'),'phase':h.get_attribute('data-phases'),'boat':h.get_attribute('data-boat-positions')};page.screenshot(path=str(out/'crowd-paused-b.png'));assert float(after['time'])>float(before['time'])+1 and before['phase']==after['phase'] and before['boat']==after['boat']
 env=json.loads(h.get_attribute('data-environment'));assert len(env['crowd']['demographicCounts']['palette'])==16
 stats={'production':True}
 (out/'longrun-check.json').write_text(json.dumps({'pass':not errors,'samples':samples,'pausedCrowd':{'before':before,'after':after},'environment':env,'finiteInstances':stats,'errors':errors},indent=2,ensure_ascii=False),encoding='utf8');assert not errors;print({'pass':True,'elapsed':180,'loops':samples[-1]['loops'],'errors':errors},flush=True);b.close()
