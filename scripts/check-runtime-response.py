"""English flow, exact input receipts, quality preferences and skill results.

Scripted beat positions verify judgement boundaries, not human reaction skill.
Real multi-touch actionability is checked separately by check-immersive-race.py.
"""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/runtime-response/english');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]').boatPreview"
errors=[];report={'physicalTabletTested':False,'screens':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
  page.get_by_role('button',name='EN',exact=True).click();assert page.locator('html').get_attribute('lang')=='en'
  for w,h in [(1024,768),(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for button in page.locator('.menu-actions>button').all():
    b=button.bounding_box();assert b['height']>=44 and b['x']>=0 and b['y']+b['height']<=h
   page.screenshot(path=str(out/f'menu-{w}x{h}.png'));report['screens'].append(['menu',w,h])
  page.set_viewport_size({'width':1024,'height':768})
  page.get_by_role('button',name='How to play',exact=True).click();assert page.locator('.help-steps li').count()==4;page.screenshot(path=str(out/'help.png'));page.get_by_role('button',name='Back',exact=True).click()
  page.get_by_role('button',name='Race AI · 2 boats',exact=True).click()
  for w,h in [(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'setup-{w}x{h}.png'))
  page.set_viewport_size({'width':1024,'height':768})
  page.get_by_label('Hold to row with automatic timing',exact=True).uncheck()
  page.get_by_role('button',name='Start AI race',exact=True).click();page.get_by_role('button',name='Skip introduction',exact=True).click();page.wait_for_function(api+".game.state.phase==='racing'")
  assert page.evaluate(api+".game.state.ruleset==='ngo-skill'&&!"+api+'.game.state.rowingAssist')
  results=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game,b=document.querySelector('[data-testid=stroke-pad]'),receipt=document.querySelector('.stroke-receipt');
   function press(){b.click();return {text:receipt.textContent,judgement:g.state.lastJudgement,contact:b.dataset.contact};}
   a.flushInput();let next=Math.floor(g.state.beatPhase)+2;g.advance((next-g.state.beatPhase)*60/g.snapshot().cadence-.29);const early=press();g.advance((Math.round(g.state.beatPhase)-g.state.beatPhase)*60/g.snapshot().cadence+.01);const perfect=press(),duplicate=press();g.advance(60/g.snapshot().cadence+.28);const late=press();return {early,perfect,duplicate,late,stats:a.inputStats};} """)
  assert results['early']['text'].startswith('Early'),results
  assert results['perfect']['judgement']=='PERFECT' and results['perfect']['text']=='STROKE RECEIVED',results
  assert results['duplicate']['text'].startswith('Already rowed'),results
  # An expired beat cannot be claimed by a late press.
  assert results['late']['contact'] in ['late','waiting'] and results['late']['text'].startswith('Late'),results
  report['receipts']=results;
  for n in range(10):
   page.get_by_test_id('stroke-pad').tap();page.wait_for_timeout(45)
  page.wait_for_timeout(200);page.screenshot(path=str(out/'manual-rhythm.png'))
  page.locator('.game-audio-options>summary').click()
  for quality,ratio in [('low',.75),('balanced',1),('auto',1)]:
   page.get_by_label('Quality',exact=True).select_option(quality);page.wait_for_function(api+f'.renderer.getPixelRatio()==={ratio}');assert page.evaluate("localStorage.getItem('tukngo-quality')")==quality
  page.wait_for_timeout(1100);report['metrics']=page.evaluate(api+'.inputStats');assert report['metrics']['received']>=4
  page.screenshot(path=str(out/'settings.png'));page.locator('.game-audio-options>summary').click()
  page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;for(let n=0;n<900&&g.state.phase==='racing';n++){const s=g.snapshot(),next=Math.floor(s.beatPhase)+1;g.advance((next-s.beatPhase)*60/s.cadence+.001);g.stroke();}if(g.state.phase!=='finished')throw Error('Not finished');}""")
  page.get_by_role('dialog',name='Race results',exact=True).wait_for();assert page.get_by_text('Mean timing error',exact=False).count();page.screenshot(path=str(out/'skill-result.png'))
  report['skillResult']=page.evaluate(api+'.game.snapshot()')
  page.get_by_role('button',name='Main menu',exact=True).click();page.reload();page.wait_for_selector('[data-boat-count="61"]',timeout=90000);assert page.locator('html').get_attribute('lang')=='en'
  report['englishPersisted']=True
  page.get_by_role('button',name='Practice',exact=True).click();page.get_by_role('button',name='Start practice',exact=True).click()
  page.wait_for_function(api+".game.state.phase==='countdown'||"+api+".game.state.phase==='racing'")
  page.evaluate(api+'.game.advance(3);'+api+'.game.setRowingHeld(true);'+api+'.game.advance(400)')
  assert page.evaluate(api+'.game.state.phase')=='finished',page.evaluate(api+'.game.snapshot()')
  page.get_by_role('dialog',name='Race results',exact=True).wait_for();assert 'Automatic' in page.locator('.result-stats').inner_text();assert '100%' not in page.locator('.result-stats').inner_text();page.screenshot(path=str(out/'assisted-result.png'))
  report['assistedResultHasNoManualAccuracy']=True
  page.get_by_role('button',name='Main menu',exact=True).click();page.get_by_role('button',name='Festival cup · 61 boats',exact=True).click();page.get_by_role('button',name='Bracket',exact=True).click();page.get_by_role('dialog',name='Bracket · 61 boats',exact=True).wait_for();page.screenshot(path=str(out/'cup-bracket.png'));page.get_by_role('button',name='Close bracket',exact=True).click()
  report['englishCupBracket']=True;report['errors']=errors;assert not errors,errors
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'pass':True,'metrics':report['metrics'],'errors':errors}))
 finally:browser.close()
