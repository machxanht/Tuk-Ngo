"""Actual browser retry UI/GLB initialization, with labelled network fixtures."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);page=b.new_page(viewport={'width':1024,'height':768});errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def fail_once(route):
  requests.append(route.request.url)
  if len(requests)==1:route.abort('timedout')
  else:route.continue_()
 page.route('**/athlete-rig-v27.glb*',fail_once);page.goto(args.url);page.wait_for_selector('body[data-ready=true]',timeout=90000)
 assert len(requests)==2 and 'asset-retry=1' in requests[1],requests;assert int(page.evaluate('document.body.dataset.loadRetries'))>=1
 assert page.evaluate('illustratedPreview.hybrid.actors.length')==55;page.screenshot(path=str(out/'recovered.png'))
 page.unroute('**/athlete-rig-v27.glb*');page.route('**/athlete-rig-v27.glb*',lambda r:r.abort('timedout'));page.reload();page.wait_for_selector('body[data-load-error]',timeout=90000)
 assert page.locator('#asset-retry').is_visible();assert 'Không tải được' in page.locator('#status').inner_text();page.screenshot(path=str(out/'retry-button.png'))
 page.unroute('**/athlete-rig-v27.glb*');page.locator('#asset-retry').click();page.wait_for_selector('body[data-ready=true]',timeout=90000);assert not page.locator('#asset-retry').is_visible();assert not errors,errors
 (out/'check.json').write_text(json.dumps({'url':args.url,'fixture':'First model request aborted, then all model requests aborted; actual retry and user reload checked','firstFailureRecovered':True,'boundedFailureShowsRetry':True,'actualReloadRecovers':True,'requests':requests,'errors':errors},indent=2),encoding='utf8');print('Browser asset failure/retry/reload passed');b.close()
