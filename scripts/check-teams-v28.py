"""Inspect eight source-linked kits/liveries and exercise actual team selection."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900});errors=[];failed=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url));page.on('request',lambda r:requests.append(r.url))
 page.goto(args.url,wait_until='domcontentloaded');page.wait_for_function('document.body.dataset.ready==="true" || !!document.body.dataset.loadError',timeout=60000)
 assert not page.evaluate('document.body.dataset.loadError'),page.locator('#status').inner_text()
 assert len([u for u in requests if u.endswith('.svg')])==2,'Initial load should only fetch two selected team SVGs'
 page.locator('#team-options summary').click();teams=page.evaluate('TukNgoTeams.list');assert len(teams)==8
 for team in teams:
  page.locator('#team-near').select_option(team['id']);page.wait_for_function('(id)=>!hybridTeams.busy && hybridTeams.near.id===id',arg=team['id'])
  page.evaluate('illustratedPreview.seekRace(16)');page.screenshot(path=str(out/(team['id']+'-festival.png')))
  page.locator('#view').click();page.locator('#study-kit').select_option('team');page.locator('#posture').select_option('standing');page.evaluate('illustratedPreview.seek(.12)')
  page.locator('#scene').screenshot(path=str(out/(team['id']+'-kit.png')))
  actor=page.evaluate('illustratedPreview.hybrid.actors.find(a=>a.role==="rower"&&a.posture==="standing"&&a.side===-1).palette')
  assert actor['jersey']==team['jersey'],(team,actor)
  assert actor['cap']==team['cap'] or actor['cap'] in team.get('capVariants',[]),(team,actor)
  if team.get('interior'):
   interior=page.evaluate('''()=>{const colors=[];illustratedPreview.hybrid.boat.getObjectByName('Hull_Watertight_30_20x1_12').traverse(mesh=>{if(mesh.isMesh&&!mesh.material.map)colors.push('#'+mesh.material.color.getHexString());});return colors;}''')
   assert len(interior)==2 and all(color==team['interior'] for color in interior),interior
  for role in ['caller','controller']:
   if team.get('roleKit',{}).get('BOW_CALLER' if role=='caller' else 'MID_CONTROLLER'):
    page.locator('#posture').select_option(role);page.locator('#scene').screenshot(path=str(out/(team['id']+'-'+role+'.png')))
    palette=page.evaluate('(role)=>illustratedPreview.hybrid.actors.find(a=>a.role===role).palette',role)
    expected=team['roleKit']['BOW_CALLER' if role=='caller' else 'MID_CONTROLLER'];assert palette['jersey']==expected['jersey']
  report.append({'id':team['id'],'bib':team['number'],'rank':team['rank'],'rowerPalette':actor})
  page.locator('#view').click()
 assert ImageChops.difference(Image.open(out/'tum-nup-2-kit.png').convert('RGB'),Image.open(out/'chroi-tum-chas-kit.png').convert('RGB')).getbbox()
 page.locator('button[data-mode=play]:not([data-kind])').click();page.locator('#play-start').click();assert not page.locator('#team-near').is_enabled();assert not page.locator('#team-far').is_enabled()
 page.locator('#toggle').click();assert not page.locator('#team-near').is_enabled()
 page.locator('[data-mode=demo]').click();assert page.locator('#team-near').is_enabled()
 page.locator('#team-near').select_option('tum-nup-2');page.wait_for_function('!hybridTeams.busy && hybridTeams.near.id==="tum-nup-2"');page.locator('#team-far').select_option('tum-nup-2');page.wait_for_function('!hybridTeams.busy && hybridTeams.far.id==="tum-nup-2"')
 page.evaluate('illustratedPreview.seekRace(18)');page.screenshot(path=str(out/'same-team.png'))
 assert len([u for u in requests if u.endswith('.svg')])==8,'Every team should be cached once'
 for width,height in [(390,844),(768,1024),(834,480)]:
  page.set_viewport_size({'width':width,'height':height});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'{width}-team-picker.png'))
 page.locator('#team-options summary').click();page.set_viewport_size({'width':1024,'height':768});page.locator('#restart').click();frames=page.evaluate('illustratedPreview.stats.renderedFrames');started=time.monotonic();page.wait_for_timeout(4000);fps=(page.evaluate('illustratedPreview.stats.renderedFrames')-frames)/(time.monotonic()-started)
 assert not errors,errors;assert not failed,failed
 recovery=browser.new_page(viewport={'width':1024,'height':768});recoveryErrors=[];recovery.on('pageerror',lambda e:recoveryErrors.append(str(e)))
 recovery.route('**/teams-2025/om-pou-year.svg',lambda route:route.abort());recovery.goto(args.url,wait_until='domcontentloaded');recovery.wait_for_selector('body[data-ready=true]',timeout=60000);recovery.locator('#team-options summary').click();recovery.locator('#team-near').select_option('om-pou-year')
 recovery.wait_for_function('!hybridTeams.busy && document.getElementById("team-status").textContent.includes("Không tải")')
 assert recovery.evaluate('hybridTeams.near.id')=='tum-nup-2';assert recovery.locator('#team-near').input_value()=='tum-nup-2'
 recovery.unroute('**/teams-2025/om-pou-year.svg');recovery.locator('#team-near').select_option('om-pou-year');recovery.wait_for_function('!hybridTeams.busy && hybridTeams.near.id==="om-pou-year"');assert not recoveryErrors,recoveryErrors
 data={'url':args.url,'teams':report,'initialSVGRequests':2,'totalSVGRequests':8,'selectionLockedDuringRaceAndPause':True,'sameTeamAllowed':True,'forcedNetworkFailureKeepsPreviousTeamAndRetryWorks':True,'headlessDesktopFPS':round(fps,1),'draw3D':page.evaluate('illustratedPreview.stats.draw3D'),'errors':errors,'failedRequests':failed,'physicalTabletTested':False}
 (out/'check.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(data,ensure_ascii=False));browser.close()
