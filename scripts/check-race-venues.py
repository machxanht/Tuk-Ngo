"""Actual browser rendering/input/audio checks; accelerated simulation for cup gates.
CDP device emulation is not a physical-tablet FPS measurement.
"""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/venues/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'physicalTabletTested':False,'cupFinishMethod':'Real game engine advanced faster than wall time','venues':{},'audio':{},'responsive':[]};errors=[]
clips=json.loads(Path('public/assets/race-audio/manifest.json').read_text(encoding='utf-8'))['clips']
clips.update(json.loads(Path('public/assets/race-audio/english/manifest.json').read_text(encoding='utf-8'))['clips'])
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True,device_scale_factor=2)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 def wait():page.wait_for_function('!!'+api,timeout=90000)
 def evaluate(code):return page.evaluate(api+code)
 def settings():page.locator('.game-audio-options>summary').click()
 def menu():page.locator('.game-result button').last.click()
 def finish():
  page.evaluate('''()=>{const g=document.querySelector('[data-testid=art-stage]').boatPreview.game;g.skipIntro();g.advance(3);g.setRowingHeld(true);while(g.state.phase==='racing')g.advance(.1);}''')
  page.locator('.game-result').wait_for()
 try:
  page.goto(args.url);wait();page.wait_for_function(api+".game.state.venueId==='maspero'")
  for language in ['vi','km','en']:
   page.get_by_role('button',name={'vi':'VI','km':'ខ្មែរ','en':'EN'}[language],exact=True).click()
   page.locator('.menu-actions .game-quick').click();page.wait_for_timeout(250)
   for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(120)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    start=page.locator('.selection-start');box=start.bounding_box();assert box['height']>=44 and box['y']>=0 and box['y']+box['height']<=height+.5
    assert start.evaluate("e=>{const b=e.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return h===e||e.contains(h)}")
    assert page.locator('.team-profile,.selected-team,.game-control-settings').count()==0
    page.screenshot(path=str(out/f'selection-{language}-{width}x{height}.png'));report['responsive'].append([language,width,height])
   page.set_viewport_size({'width':1024,'height':768});played_before=len(evaluate('.audio.stats().played'));page.locator('.selection-start').click();page.wait_for_function(api+".game.state.phase==='intro'")
   page.evaluate(api+'.game.skipIntro()');page.wait_for_function(api+".game.state.phase==='racing'",timeout=15000);page.wait_for_timeout(5000)
   audio=evaluate('.audio.stats()');current_played=audio['played'][played_before:];assert audio['language']==language and current_played,audio
   for item in current_played:
    clip=clips[item['key']];assert clip['lang']==language,(language,item)
    if language=='vi':assert clip['sourceType']=='broadcast'
    else:assert any(t in clip['sourceType'].lower() for t in ['neural','synthes'])
   assert not audio['errors'],audio['errors'];report['audio'][language]={'keys':[x['key'] for x in current_played],'rms':audio['outputRms'],'language':audio['language']}
   finish();menu();page.get_by_role('button',name='VI',exact=True).click();print('Language and responsive selection passed:',language,flush=True)
  quality=evaluate(".renderer.getPixelRatio()");assert quality==2
  assert evaluate('.renderer.getContext().getContextAttributes().antialias')
  report['resolution']={'nativeDpr':2,'renderDpr':quality,'antialias':True,'silentDownscale':False}
  for venue,length in [('phnom-penh',1700),('siem-reap',500)]:
   page.get_by_label('Sân đấu',exact=True).select_option(venue);page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=90000)
   page.wait_for_timeout(5500);page.screenshot(path=str(out/(venue+'-menu.png')))
   data=evaluate('.river.group.userData');assert data['venueId']==venue and data['courseLength']==length and len(data['landmarks'])>=4
   assert data['banners']['textureCount']<=6
   page.locator('.menu-actions .game-quick').click();select=page.locator('.boat-selection>.team-browser')
   ids=select.locator('.team-choice').evaluate_all('es=>es.map(e=>e.dataset.teamId)');assert len(ids)==8
   select.locator('.team-choice').nth(2).click();page.wait_for_function(api+".assetSelection.teamIds[0]==='"+ids[2]+"'")
   page.locator('.selection-start').click();page.wait_for_function(api+".game.state.phase==='intro'");page.evaluate(api+'.game.advance(3)');page.wait_for_timeout(250);page.screenshot(path=str(out/(venue+'-intro.png')))
   page.evaluate(api+'.game.skipIntro()');page.evaluate(api+'.game.advance(3)');page.wait_for_function(api+".game.state.phase==='racing'")
   page.wait_for_function("document.querySelector('[data-testid=stroke-pad]')?.disabled===false");page.get_by_test_id('stroke-pad').focus();page.keyboard.down('Space');page.wait_for_timeout(1800)
   assert evaluate('.game.state.distances[0]')>0
   before=evaluate('.game.state.stamina');page.keyboard.down('ShiftLeft');page.wait_for_timeout(1500);assert evaluate('.game.state.stamina')<before-8;page.keyboard.up('ShiftLeft')
   page.keyboard.down('KeyD');page.wait_for_timeout(700);page.keyboard.up('KeyD');assert evaluate('.game.state.lateralPositions[0]')>.05
   assert page.locator('.game-inputs button').count()==2
   buttons=[]
   for key in ['stroke-pad','boost-pad']:
    button=page.get_by_test_id(key);box=button.bounding_box();assert 48<=box['height']<=64 and box['width']<=145
    buttons.append({'id':key,**box,'background':button.evaluate('e=>getComputedStyle(e).backgroundColor')})
   page.wait_for_timeout(3500);page.screenshot(path=str(out/(venue+'-race.png')))
   fps=page.get_by_test_id('art-stage').get_attribute('data-fps');page.keyboard.up('Space');finish();state=evaluate('.game.snapshot()');assert state['distances']==[length,length];assert state['result']=='win';menu()
   page.locator('.menu-actions .game-practice').click();page.locator('.selection-start').click();finish();assert evaluate('.game.state.result')=='complete';assert page.evaluate("localStorage.getItem('tukngo-practice-best-simple-"+venue+"')") is not None;menu()
   page.locator('.menu-actions .game-primary').click();page.locator('.selection-start').click();rounds=0
   while rounds<4:
    finish();rounds+=1;cup=page.evaluate("JSON.parse(localStorage.getItem('tukngo-festival-cup-"+venue+"'))")
    if cup['status']=='champion':break
    page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).click()
   assert rounds==3 and cup['status']=='champion';page.screenshot(path=str(out/(venue+'-cup.png')));menu()
   report['venues'][venue]={'length':length,'aiResult':state['result'],'practice':True,'cupRounds':rounds,'roster':16 if venue=='phnom-penh' else 8,'choicesPerPage':len(ids),'spectators':data['spectators'],'landmarks':data['landmarks'],'fpsDpr2OnPc':fps,'buttons':buttons};print('Venue passed:',venue,flush=True)
  page.get_by_label('Sân đấu',exact=True).select_option('maspero');page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='maspero'",timeout=90000)
  assert not errors,errors;report['errors']=errors;(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
 except Exception:
  page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'text':page.locator('body').inner_text()[:7000],'state':evaluate('.game.snapshot()') if page.evaluate('!!'+api) else None,'focus':page.evaluate('document.activeElement?.tagName')},ensure_ascii=False,indent=2),encoding='utf-8');raise
 finally:browser.close()
