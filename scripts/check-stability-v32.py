"""Keep the real browser clock running past the reported 2–3 minute failure."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);page=b.new_page(viewport={'width':1024,'height':768});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url);page.wait_for_selector('body[data-ready=true]',timeout=60000);start=time.monotonic();results=[]
 for stamp in [0,65,130,195]:
  delay=max(0,stamp-(time.monotonic()-start));page.wait_for_timeout(delay*1000)
  data=page.evaluate('''()=>{const h=illustratedPreview.hybrid,c=h.camera;return {revision:illustratedPreview.stats.configuration,frames:illustratedPreview.stats.renderedFrames,sceneTime:Number(document.querySelector('#scene').dataset.time),camera:c.position.toArray(),projection:c.projectionMatrix.toArray(),draw:h.getDrawStats(),actors:h.actors.length,phase:illustratedRace.state.phase};}''');data['elapsedSeconds']=round(time.monotonic()-start,2);results.append(data)
  assert data['revision']=='hybrid-v32' and data['actors']==55 and data['draw']['triangles']>900000
  assert all(abs(v)<100000 for v in data['camera']+data['projection']),data
  assert data['camera']==[9,13.2,-28],data
  if stamp:assert data['frames']>results[-2]['frames']+1000 and data['sceneTime']>results[-2]['sceneTime']+50,data
  page.locator('#scene').screenshot(path=str(out/f'actual-clock-{stamp}s.png'));print(json.dumps({'stamp':stamp,'elapsed':data['elapsedSeconds'],'frames':data['frames'],'camera':data['camera']}),flush=True)
 assert not errors,errors
 (out/'check.json').write_text(json.dumps({'url':args.url,'realBrowserClock':True,'checkpoints':results,'errors':errors,'physicalTabletTested':False},indent=2),encoding='utf8');b.close()
