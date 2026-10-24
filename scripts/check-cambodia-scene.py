"""Rendered Cambodian streets and touch-friendly boat picker, using real assets.
This is desktop Chromium emulation; it is not a physical-tablet FPS test.
"""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--out',required=True)
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'url':args.url,'physicalTabletTested':False,'scenes':{},'viewports':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,device_scale_factor=1)
 context.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','phnom-penh');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));")
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 def wait(venue):page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=120000)
 def value(code):return page.evaluate(api+code)
 def finish():page.evaluate("()=>{const g="+api+".game;g.skipIntro();g.advance(3);g.setRowingHeld(true);while(g.state.phase==='racing')g.advance(.1);}");page.locator('.game-result').wait_for()
 try:
  page.goto(args.url);wait('phnom-penh')
  for venue in ['phnom-penh','siem-reap']:
   if venue=='siem-reap':page.get_by_label('Sân đấu',exact=True).select_option(venue);wait(venue)
   page.wait_for_timeout(1000)
   data=value('.river.group.userData');assert data['traffic']['profile']==venue
   assert data['traffic']['carShare']>.75
   assert data['street']['roadWidth']/2>data['traffic']['laneOffsets']['bicycle']+.5
   assert value('.assetSelection.constructionTypes')==['dugout','dugout']
   page.screenshot(path=str(out/(venue+'-menu.png')))
   page.locator('.game-quick').click();picker=page.locator('.boat-selection>.team-browser');picker.wait_for()
   assert picker.locator('.team-choice').count()<=8
   # Accent-insensitive Latin, Khmer, province and no-results searches.
   search=picker.locator('input[type=search]')
   for query,expected in [('keo pursat','Techo Keo'),('សារាយ','Saray'),('narind','Narind')]:
    search.fill(query);assert picker.locator('.team-choice').count()==1
    assert expected in picker.locator('.team-choice').inner_text()
   picker.locator('.team-choice').click();page.wait_for_function(api+".assetSelection.teamIds[0]==='kh-narind-rangsey'")
   search.fill('zzzzzz');assert picker.locator('.team-choice').count()==0;picker.get_by_role('status').wait_for();search.fill('')
   for language,label in [('vi','VI'),('km','ខ្មែរ'),('en','EN')]:
    page.get_by_role('button',name=label,exact=True).click()
    for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
     page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
     assert search.is_visible()
     assert picker.locator('.team-choices').evaluate('e=>e.clientHeight')>=52
     start=page.locator('.selection-start');box=start.bounding_box();assert 0<=box['y'] and box['y']+box['height']<=height,box
     assert start.evaluate("e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h)}")
     for button in picker.locator('button:visible').all():assert button.bounding_box()['height']>=44
     for button in picker.locator('.team-pages button:visible').all():
      assert button.evaluate("e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h)}")
     page.screenshot(path=str(out/f'{venue}-picker-{language}-{width}x{height}.png'))
     report['viewports'].append([venue,language,width,height])
   page.set_viewport_size({'width':1024,'height':768});page.get_by_role('button',name='VI',exact=True).click()
   # All catalogue pages are reachable without a select/dropdown.
   picker.get_by_role('button',name='Trang sau',exact=True).click();assert picker.locator('.team-choice').count()==8
   picker.get_by_role('button',name='Trang sau',exact=True).click();assert picker.locator('.team-choice').count()==1
   page.locator('.selection-start').click();page.wait_for_function(api+".game.state.phase==='intro'",timeout=15000)
   value('.game.skipIntro()');value('.game.advance(3)');page.wait_for_function(api+".game.state.phase==='racing'")
   page.get_by_test_id('stroke-pad').focus();page.keyboard.down('Space');page.wait_for_timeout(1200);assert value('.game.state.distances[0]')>0;page.keyboard.up('Space')
   page.screenshot(path=str(out/(venue+'-race.png')));finish();assert value('.game.state.result')=='win'
   page.locator('.game-result button').last.click()
   # Real render + simulated cup progression: selected late-catalogue team is valid.
   page.locator('.menu-actions .game-primary').click();page.locator('.selection-start').click();rounds=0
   while True:
    finish();rounds+=1;cup=page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup-"+venue+"'))")
    if cup['status']=='champion':break
    page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).click()
   assert rounds==3 and len(cup['teamIds'])==8
   report['scenes'][venue]={'traffic':data['traffic']['types'],'carShare':data['traffic']['carShare'],'landmarks':data['landmarks'],'roster':17,'cupTeams':8,'cupRounds':rounds,'dugoutDefault':True}
   page.locator('.game-result button').last.click()
   # The same search component is used in the online lobby; no live writes here.
   page.get_by_role('button',name='Đấu online',exact=True).click();online=page.locator('.online-profile .team-browser');online.wait_for()
   online.locator('input[type=search]').fill('kiri');assert online.locator('.team-choice').count()==1
   online.locator('.team-choice').click();assert 'Kiri' in online.locator('.team-choice[aria-pressed=true]').inner_text()
   page.locator('.online-back').click()
   print(venue,'passed',flush=True)
  assert not report['errors'],report['errors']
 finally:
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
