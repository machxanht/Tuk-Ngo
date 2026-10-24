"""Actual picker/AI/practice/cup/online lists and saved-map isolation.
Finish/cup checks accelerate the real engine; they are not network races.
"""
import argparse,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',required=True);args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {VENUE_TEAMS,cupTeamIds} from './src/race/festival-teams.mjs';import {createTournament} from './src/race/tournament.mjs';const teams=Object.fromEntries(Object.entries(VENUE_TEAMS).map(([k,v])=>[k,v.map(t=>({id:t.id,name:t.nameVi}))]));const player=teams['phnom-penh'][0].id;console.log(JSON.stringify({teams,legacy:createTournament({playerId:player,teamIds:cupTeamIds(31,'phnom-penh',player)}).snapshot()}));"],text=True,encoding='utf-8'))
api="document.querySelector('[data-testid=art-stage]')?.boatPreview";report={'url':args.url,'maps':{},'errors':[],'physicalTabletTested':False}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
 legacy=json.dumps(fixture['legacy'],separators=(',',':'),ensure_ascii=False)
 page.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','maspero');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));if(!localStorage.getItem('roster-test-seeded')){localStorage.setItem('tukngo-festival-cup-siem-reap',"+json.dumps(legacy)+");localStorage.setItem('roster-test-seeded','1');}")
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 def value(code):return page.evaluate(api+code)
 def wait(venue):page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=120000)
 def collect(picker):
  search=picker.locator('input[type=search]');search.fill('');ids=[]
  while True:
   ids.extend(picker.locator('.team-choice').evaluate_all('es=>es.map(e=>e.dataset.teamId)'))
   next_page=picker.get_by_role('button',name='Trang sau',exact=True)
   if not next_page.count() or next_page.is_disabled():break
   next_page.click()
  return ids
 def finish():
  # Asset preparation is async; do not advance the previous menu's engine.
  page.wait_for_function(api+"&&['intro','countdown','racing'].includes("+api+".game.state.phase)",timeout=90000)
  page.evaluate("()=>{const g="+api+".game;g.skipIntro();g.advance(3);g.setRowingHeld(true);while(g.state.phase==='racing')g.advance(.1);}");page.locator('.game-result').wait_for()
 def menu():page.locator('.game-result button').last.click()
 try:
  page.goto(args.url);wait('maspero');saved={}
  for venue,teams in fixture['teams'].items():
   if venue!='maspero':page.get_by_label('Sân đấu',exact=True).select_option(venue);wait(venue)
   allowed=[t['id'] for t in teams];foreign=[t for name,rows in fixture['teams'].items() if name!=venue for t in rows]
   page.locator('.game-quick').click();picker=page.locator('.boat-selection>.team-browser');assert collect(picker)==allowed
   for team in foreign[::max(1,len(foreign)//3)]:picker.locator('input[type=search]').fill(team['id']);assert picker.locator('.team-choice').count()==0
   chosen=allowed[-1];picker.locator('input[type=search]').fill(chosen);picker.locator('.team-choice').click();page.wait_for_function(api+".assetSelection.teamIds[0]==='"+chosen+"'")
   assert all(t in allowed for t in value('.assetSelection.teamIds'))
   page.locator('.selection-options summary').click();opponent=page.locator('.selection-options .team-browser');assert collect(opponent)==[t for t in allowed if t!=chosen]
   page.locator('.selection-options summary').click();page.screenshot(path=str(out/(venue+'-selection.png')))
   page.locator('.selection-start').click();finish();assert value('.game.state.result')=='win';assert all(t in allowed for t in value('.assetSelection.teamIds'));menu()
   page.locator('.game-practice').click();page.locator('.selection-start').click();finish();assert value('.game.state.result')=='complete';menu()
   page.locator('.menu-actions .game-primary').click();page.locator('.selection-start').click();finish()
   key='tukngo-festival-cup'+('' if venue=='maspero' else '-'+venue);raw=page.evaluate('(key)=>localStorage.getItem(key)',key);saved[venue]=raw;cup=json.loads(raw);assert set(cup['teamIds']).issubset(allowed);assert len(cup['history'])==1;menu()
   page.get_by_role('button',name='Đấu online',exact=True).click();online=page.locator('.online-profile .team-browser');online.locator('input').wait_for();page.wait_for_function("!document.querySelector('.online-profile .team-browser input').disabled")
   assert collect(online)==allowed
   online.locator('input').fill(foreign[0]['id']);assert online.locator('.team-choice').count()==0;page.locator('.online-back').click()
   report['maps'][venue]={'teams':allowed,'ai':True,'practice':True,'cupOwnTeamsOnly':True,'opponentOwnTeamsOnly':True,'onlineOwnTeamsOnly':True};print(venue,len(allowed),'passed',flush=True)
  assert page.evaluate("localStorage.getItem('tukngo-festival-cup-siem-reap-roster-backup')")==legacy
  for venue,raw in saved.items():
   page.get_by_label('Sân đấu',exact=True).select_option(venue);wait(venue)
   key='tukngo-festival-cup'+('' if venue=='maspero' else '-'+venue);assert page.evaluate('(key)=>localStorage.getItem(key)',key)==raw
  report['separateProgressPreserved']=True;report['oldMixedCupBackedUp']=True
  assert not report['errors'],report['errors']
 except Exception:
  page.screenshot(path=str(out/'failure.png'));raise
 finally:
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
