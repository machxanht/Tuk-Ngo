"""Actual cup buttons/layout/restore; race clocks are accelerated, not human play."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
win="""()=>{const g=quickRace.model;g.advance(3);let count=0;while(g.state.phase==='racing'&&count++<600){g.setPace(g.state.distances[0]>1000?'sprint':'steady');g.advance((Math.floor(g.state.beatPhase+1e-7)+1-g.state.beatPhase)*60/TukNgoGameRules.PACES[g.state.pace].cadence);quickRace.stroke();}illustratedPreview.draw(200);return quickRace.state;}"""
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 for width,height in [(1024,768),(390,844),(834,480)]:
  pg=browser.new_page(viewport={'width':width,'height':height},has_touch=True);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.goto(args.url);pg.wait_for_selector('body[data-ready=true]',timeout=60000);pg.locator('[data-kind=cup]').click();pg.wait_for_function('!hybridTeams.busy && !document.querySelector("#play-start").disabled')
  assert pg.locator('#cup-panel').is_visible();assert pg.locator('#team-near').is_disabled();assert pg.locator('[data-kind=cup]').get_attribute('aria-pressed')=='true';assert pg.locator('button[data-mode=play]:not([data-kind])').get_attribute('aria-pressed')=='false'
  assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert pg.locator('#cup-team').bounding_box()['height']>=44
  pg.locator('#cup-panel summary').click();pg.screenshot(path=str(out/f'{width}-quarterfinal.png'));rounds=[]
  for index in range(3):
   match=pg.evaluate('hybridCup.match');assert match['roundIndex']==index;pg.locator('#play-start').click();pg.wait_for_function('quickRace.state.phase==="countdown"')
   assert pg.locator('#cup-team').is_disabled();assert pg.locator('#cup-reset').is_disabled()
   assert pg.evaluate('hybridTeams.picked')==[match['playerId'],match['opponentId']]
   pg.evaluate('illustratedPreview.seek(0)');result=pg.evaluate(win);assert result['result']=='win',result
   state=pg.evaluate('hybridCup.state');pg.evaluate('quickRace.update();quickRace.update()');assert pg.evaluate('hybridCup.state')==state
   rounds.append({'match':match,'acceleratedFinishSeconds':result['finishTimes'][0]})
   if index==0:
    pg.reload();pg.wait_for_selector('body[data-ready=true]',timeout=60000);pg.locator('[data-kind=cup]').click();pg.wait_for_function('!hybridTeams.busy && !document.querySelector("#play-start").disabled');assert pg.evaluate('hybridCup.state')==state
  assert pg.evaluate('hybridCup.state.status')=='champion';assert 'vô địch' in pg.locator('#play-title').inner_text();pg.screenshot(path=str(out/f'{width}-champion.png'))
  pg.locator('#play-start').click();pg.wait_for_function('quickRace.state.phase==="countdown"');assert pg.evaluate('hybridCup.match.roundIndex')==0
  pg.evaluate('illustratedPreview.seek(0);quickRace.model.advance(363);illustratedPreview.draw(363)');assert pg.evaluate('hybridCup.state.status')=='eliminated';assert pg.evaluate('quickRace.state.result')=='dnf'
  pg.locator('#cup-reset').click();pg.wait_for_function('!hybridTeams.busy && !document.querySelector("#play-start").disabled');assert pg.evaluate('quickRace.state.phase')=='ready'
  pg.locator('#play-start').click();pg.wait_for_function('quickRace.state.phase==="countdown"');pg.evaluate('illustratedPreview.seek(0);quickRace.model.state.finishTimes=[10,10];quickRace.model.finish();quickRace.update()')
  assert pg.evaluate('hybridCup.state.status')=='tie';before=pg.evaluate('hybridCup.match');pg.locator('#play-start').click();pg.wait_for_function('quickRace.state.phase==="countdown"');after=pg.evaluate('hybridCup.match');assert after['opponentId']==before['opponentId'] and after['matchId']!=before['matchId']
  pg.locator('button[data-mode=play]:not([data-kind])').click();assert pg.locator('#cup-panel').is_hidden();assert pg.locator('#team-near').is_enabled()
  assert not errors,errors;reports.append({'viewport':[width,height],'threeActualGameWinsAccelerated':rounds,'savedAfterRoundAndRestored':True,'tieFixtureRetry':True,'dnfEliminates':True,'errors':errors});pg.close()
 # A failed new opponent livery must keep both current boat appearances and
 # leave the race ready. A fresh click retries after the network recovers.
 pg=browser.new_page(viewport={'width':1024,'height':768});pg.goto(args.url);pg.wait_for_selector('body[data-ready=true]',timeout=60000);pg.locator('[data-kind=cup]').click();pg.wait_for_function('!hybridTeams.busy');previous=pg.evaluate('hybridTeams.picked')
 pg.route('**/pothi-satharam-2.svg',lambda route:route.abort());pg.locator('#cup-team').select_option('pothi-satharam-2');pg.wait_for_function('!hybridTeams.busy && !document.querySelector("#play-start").disabled');assert pg.evaluate('hybridTeams.picked')==previous;assert pg.evaluate('quickRace.state.phase')=='ready';assert 'Chưa tải' in pg.locator('#cup-status').inner_text()
 pg.unroute('**/pothi-satharam-2.svg');pg.locator('#play-start').click();pg.wait_for_function('quickRace.state.phase==="countdown"');assert pg.evaluate('hybridTeams.near.id')=='pothi-satharam-2';pg.close();browser.close()
 (out/'check.json').write_text(json.dumps({'url':args.url,'physicalTabletTested':False,'raceTiming':'accelerated model; actual UI buttons; tie outcome injected explicitly','reports':reports,'liveryFailureKeptPairAndRetried':True},ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'viewports':len(reports),'errors':[],'networkRetry':True}))
