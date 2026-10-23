"""Real media, cinematic ordering and pointer-down input in the running game."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4175/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/race-presentation/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);report={'physicalTabletTested':False};errors=[];responses=[]
boat="document.querySelector('[data-testid=art-stage]').boatPreview"
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if '/menu/' in r.url else None)
 page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
 assert not responses,'Music must not compete with initial models before user interaction'
 report['ceremony']=page.evaluate(boat+'.ceremony.stats');assert report['ceremony']['boats']==61 and report['ceremony']['athletes']==3050
 report['world']=page.evaluate(boat+'.river.group.userData');buildings=report['world']['buildings']
 assert buildings['frontageTemplates']==12 and buildings['treeSilhouettes']==9 and buildings['backgroundHomes']>500
 assert len(report['world']['traffic']['types'])==8
 before=page.evaluate(boat+'.ceremony.group.children[0].instanceMatrix.array[13]');page.wait_for_timeout(700)
 assert before!=page.evaluate(boat+'.ceremony.group.children[0].instanceMatrix.array[13]')
 page.screenshot(path=str(out/'ceremony.png'))
 page.get_by_role('button',name='Chạm để bật nhạc',exact=True).tap()
 page.wait_for_function(boat+'.menuMusic.stats().playing&&'+boat+'.menuMusic.stats().time>.5',timeout=15000)
 report['menuMusic']=page.evaluate(boat+'.menuMusic.stats()');assert report['menuMusic']['loop'] and report['menuMusic']['source'].endswith('/menu/festival.mp3')
 page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).tap();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).tap()
 page.get_by_test_id('race-intro').wait_for();page.wait_for_selector('[data-view=intro]')
 assert not page.evaluate(boat+'.menuMusic.stats().playing')
 assert page.evaluate(boat+'.game.state.countdown')==3 and page.evaluate(boat+'.game.state.distances')==[0,0]
 assert not page.locator('.game-controls').count()
 page.screenshot(path=str(out/'intro-stand.png'))
 page.keyboard.press('Escape');page.get_by_role('dialog',name='Nghỉ một nhịp',exact=True).wait_for()
 frozen=page.evaluate(boat+'.game.state.introElapsed');page.wait_for_timeout(500);assert page.evaluate(boat+'.game.state.introElapsed')==frozen
 page.get_by_role('dialog',name='Nghỉ một nhịp',exact=True).get_by_role('button',name='Tiếp tục cuộc đua',exact=True).tap()
 page.wait_for_function(boat+'.game.state.introElapsed>=4',timeout=20000);page.screenshot(path=str(out/'intro-river.png'))
 page.wait_for_function(boat+'.game.state.introElapsed>=8',timeout=15000);page.screenshot(path=str(out/'intro-start.png'))
 page.wait_for_function(boat+".game.state.phase==='countdown'",timeout=12000);report['countdown']=page.evaluate(boat+'.game.snapshot()')
 assert report['countdown']['introElapsed']>=9.99 and report['countdown']['elapsed']==0 and report['countdown']['distances']==[0,0]
 page.screenshot(path=str(out/'countdown.png'))
 page.wait_for_function(boat+".game.state.phase==='racing'")
 cdp=page.context.new_cdp_session(page);button=page.locator('.game-stroke');box=button.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
 page.wait_for_function("()=>{const g="+boat+".game,s=g.snapshot();return s.strokeAvailable&&Math.abs(s.beatPhase-Math.round(s.beatPhase))*60/s.cadence<.045;}")
 before=page.evaluate(boat+'.game.state.perfect+'+boat+'.game.state.good')
 started=time.perf_counter();cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 accepted=page.evaluate(boat+'.game.state.perfect+'+boat+'.game.state.good')
 assert accepted==before+1,'The stroke must be accepted while the finger is still down'
 report['input']={'acceptedBeforeRelease':True,'dispatchToObservedMs':round((time.perf_counter()-started)*1000,2),'judgement':page.evaluate(boat+'.game.state.lastJudgement')}
 page.wait_for_timeout(180);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate(boat+'.game.state.perfect+'+boat+'.game.state.good')==accepted,'Release must not create a second stroke'
 button.focus();page.wait_for_function("()=>{const s="+boat+".game.snapshot();return s.strokeAvailable&&Math.abs(s.beatPhase-Math.round(s.beatPhase))*60/s.cadence<.045;}")
 before=page.evaluate(boat+'.game.state.perfect+'+boat+'.game.state.good');page.keyboard.down('Space');assert page.evaluate(boat+'.game.state.perfect+'+boat+'.game.state.good')==before+1
 page.keyboard.up('Space');assert page.evaluate(boat+'.game.state.perfect+'+boat+'.game.state.good')==before+1;report['keyboardAcceptedBeforeRelease']=True
 report['raceViewports']=[]
 for lang in ['vi','km']:
  page.get_by_role('button',name='VI' if lang=='vi' else 'ខ្មែរ',exact=True).tap()
  for width,height in[(1024,768),(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   stage=page.locator('.game-stage').bounding_box();footer=page.locator('.game-controls').bounding_box()
   assert stage['height']>=120 and footer['y']+footer['height']<=height+.5
   for button in page.locator('.game-inputs button').all():
    b=button.bounding_box();assert b['height']>=44 and b['x']>=0 and b['x']+b['width']<=width+.5
   page.screenshot(path=str(out/f'race-{lang}-{width}x{height}.png'));report['raceViewports'].append([lang,width,height])
 page.set_viewport_size({'width':1180,'height':820});page.get_by_role('button',name='VI',exact=True).tap();page.keyboard.press('Escape')
 page.get_by_role('button',name='Về menu chính',exact=True).tap();page.wait_for_selector('[data-boat-count="61"]')
 page.wait_for_function(boat+'.menuMusic.stats().playing&&'+boat+'.menuMusic.stats().time>.1')
 report['musicReturned']=page.evaluate(boat+'.menuMusic.stats()')
 page.get_by_role('button',name='Tắt âm thanh',exact=True).tap();assert not page.evaluate(boat+'.menuMusic.stats().playing')
 page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).tap();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).tap();page.get_by_test_id('race-intro').wait_for()
 page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).tap();page.wait_for_function(boat+".game.state.phase==='countdown'")
 assert page.evaluate(boat+'.game.state.elapsed')==0
 report['skipIntro']=True;report['errors']=errors;report['musicResponses']=responses
 assert not errors,errors;assert all(r['status'] in[200,206] for r in responses)
 browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'boats':61,'input':report['input'],'musicReturned':True,'viewports':len(report['raceViewports']),'errors':errors}))
