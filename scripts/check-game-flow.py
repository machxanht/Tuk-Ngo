"""Exercise the shipped UI and real fixed-step game, in both interface languages."""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4175/Tuk-Ngo/')
parser.add_argument('--out',default='docs/qa/game-flow/local')
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'physicalTabletTested':False,'viewports':[]};errors=[]
boat="document.querySelector('[data-testid=art-stage]').boatPreview"
advance="""target=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<90000&&g.state.phase!=='finished'&&g.state.distances[0]<target;i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}} """

with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url)
 page.get_by_test_id('main-menu').wait_for()
 page.wait_for_selector('[data-render-mode=race]',timeout=90000)
 assert page.evaluate(boat+'.game.state.phase')=='ready'
 assert page.evaluate(boat+'.audio.stats().context')=='uninitialized'
 page.get_by_role('button',name='Tắt âm thanh',exact=True).tap()
 for language in ['vi','km']:
  page.get_by_role('button',name='VI' if language=='vi' else 'ខ្មែរ',exact=True).tap()
  assert page.locator('html').get_attribute('lang')==language
  for width,height in [(1440,900),(1024,768),(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for button in page.locator('.menu-actions>button').all():
    box=button.bounding_box();assert box['height']>=44 and box['x']>=0 and box['y']+box['height']<=height
   page.screenshot(path=str(out/f'menu-{language}-{width}x{height}.png'))
   report['viewports'].append({'screen':'menu','language':language,'width':width,'height':height})
  page.set_viewport_size({'width':1024,'height':768})
  page.get_by_role('button',name='Cách chơi' if language=='vi' else 'របៀបលេង',exact=True).tap()
  assert page.locator('.help-steps li').count()==4
  page.screenshot(path=str(out/f'help-{language}.png'))
  page.get_by_role('button',name='Quay lại' if language=='vi' else 'ត្រឡប់',exact=True).tap()
  page.get_by_role('button',name='Đua với AI · 2 ghe' if language=='vi' else 'ប្រណាំងជាមួយ AI · ២ ទូក',exact=True).tap()
  for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':width,'height':height})
   assert page.locator('.setup-selection select option').count()==61
   assert page.get_by_label('Chọn đội AI' if language=='vi' else 'ជ្រើសរើសក្រុម AI',exact=True).locator('option').count()==60
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.screenshot(path=str(out/f'setup-{language}-{width}x{height}.png'))
  if language=='vi':
   page.get_by_role('button',name='Quay lại',exact=True).tap()
 page.set_viewport_size({'width':1024,'height':768})
 page.get_by_role('listbox',name='ជ្រើសរើសក្រុមទូក',exact=True).select_option('can_tho-05')
 page.get_by_role('button',name='ចាប់ផ្ដើមប្រណាំងជាមួយ AI',exact=True).tap()
 page.wait_for_function(boat+".game.state.phase==='racing'")
 page.evaluate(advance,205);page.wait_for_timeout(300)
 assert page.evaluate(boat+'.game.snapshot().raceStage')=='cruise'
 for language in ['km','vi']:
  page.get_by_role('button',name='VI' if language=='vi' else 'ខ្មែរ',exact=True).tap()
  for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   stage=page.locator('.game-stage').bounding_box();footer=page.locator('.game-controls').bounding_box()
   assert stage['height']>=120,(language,width,height,stage)
   assert stage['y']+stage['height']<=footer['y']+.5
   assert footer['y']+footer['height']<=height+.5
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for button in page.locator('.game-inputs button').all():
    box=button.bounding_box();assert box['height']>=44 and box['x']>=0 and box['x']+box['width']<=width+.5
   page.screenshot(path=str(out/f'race-{language}-{width}x{height}.png'))
   report['viewports'].append({'screen':'race','language':language,'width':width,'height':height,'stageHeight':stage['height']})
 page.set_viewport_size({'width':1024,'height':768})
 page.keyboard.press('Escape');page.get_by_role('dialog',name='Nghỉ một nhịp',exact=True).wait_for()
 frozen=page.evaluate(boat+'.game.state.elapsed');page.wait_for_timeout(500)
 assert page.evaluate(boat+'.game.state.elapsed')==frozen
 page.get_by_role('dialog',name='Nghỉ một nhịp',exact=True).get_by_role('button',name='Tiếp tục cuộc đua',exact=True).tap()
 page.get_by_role('button',name='Góc nhìn',exact=True).tap()
 page.wait_for_selector('[data-view=banks]');page.screenshot(path=str(out/'course.png'))
 page.get_by_role('button',name='Góc nhìn',exact=True).tap()
 page.evaluate(advance,960);page.wait_for_timeout(300)
 assert page.evaluate(boat+'.game.snapshot().canSurge')
 page.get_by_role('button',name='ĐẠP!',exact=False).tap()
 assert page.evaluate(boat+'.game.state.surgeRemaining')>0
 page.screenshot(path=str(out/'sprint.png'))
 page.evaluate(advance,1200);page.evaluate(boat+'.game.completeRace()');page.get_by_role('dialog',name='Kết quả trận đua',exact=True).wait_for()
 page.wait_for_function("()=>{const a="+boat+",p=a.boat.position.clone().project(a.camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1&&!a.renderer.getContext().isContextLost();}")
 page.wait_for_timeout(500)
 report['quickRace']=page.evaluate(boat+'.game.snapshot()')
 assert report['quickRace']['result']=='win'
 assert not json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')||'{}'")).get('history'), 'Quick race must not mutate the cup'
 page.get_by_role('button',name='ខ្មែរ',exact=True).tap();page.screenshot(path=str(out/'result-km.png'))
 page.get_by_role('button',name='ម៉ឺនុយដើម',exact=True).tap()
 page.get_by_role('button',name='VI',exact=True).tap()
 page.get_by_role('button',name='Cúp lễ hội · 61 ghe',exact=True).tap()
 page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).tap()
 page.wait_for_function(boat+".game.state.phase==='racing'")
 page.evaluate(advance,1200);page.evaluate(boat+'.game.completeRace()');page.get_by_role('dialog',name='Kết quả trận đua',exact=True).wait_for()
 saved=json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"));report['cupAfterHeat']=saved
 assert len(saved['history'])==1 and saved['status']=='ready'
 page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).tap()
 page.wait_for_function(boat+".game.state.phase==='racing'")
 page.keyboard.press('Escape')
 page.get_by_role('button',name='Về menu chính',exact=True).tap()
 page.get_by_role('button',name='Tiếp tục cúp đã lưu',exact=True).wait_for()
 page.get_by_role('button',name='Nhánh đấu',exact=True).tap()
 page.get_by_role('dialog',name='Nhánh đấu · 61 ghe',exact=True).wait_for()
 # Future rounds are generated by the existing engine after their entrants
 # are known. Do not require six invented future brackets after one heat.
 assert page.locator('.bracket-rounds>section').count()==len(saved['bracket'])
 report['bracketRoundsVisible']=len(saved['bracket'])
 page.get_by_role('button',name='Đóng nhánh đấu',exact=True).tap()
 page.get_by_role('button',name='ខ្មែរ',exact=True).tap();page.reload()
 page.get_by_test_id('main-menu').wait_for();assert page.locator('html').get_attribute('lang')=='km'
 assert json.loads(page.evaluate("localStorage.getItem('tukngo-festival-cup')"))['history']==saved['history']
 report['languageRestored']=True;report['errors']=errors
 assert not errors,errors
 browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'viewports':len(report['viewports']),'quick':report['quickRace']['result'],'cupHistory':len(report['cupAfterHeat']['history']),'languageRestored':True,'errors':errors}))
