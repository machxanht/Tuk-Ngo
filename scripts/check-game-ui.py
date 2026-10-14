"""Actual Edge touch controls and layouts; race completion uses accelerated legal beats."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4255/')
parser.add_argument('--out', default='docs/qa/runtime/game-ui')
parser.add_argument('--viewport', help='Only one WIDTHxHEIGHT layout (cup is still checked)')
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
reports = []

def ready(page):
    page.wait_for_selector('body[data-ready=true]', timeout=90000)
    page.wait_for_function('!hybridTeams.busy', timeout=30000)

def layout(page):
    canvas = page.locator('#scene').bounding_box()
    hud = page.locator('#play-panel').bounding_box()
    assert hud['y'] + hud['height'] <= canvas['y'] + 1, (hud, canvas)
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    for selector in ['#play-stroke', '#play-surge', '[data-pace=steady]']:
        box = page.locator(selector).bounding_box()
        assert box and box['height'] >= 44, (selector, box)
    return {'canvas': canvas, 'hud': hud}

advance = """(untilFinal)=>{const g=quickRace.model;let strokes=0;const stages=new Set();
 while(g.state.phase==='racing'&&strokes++<900){
  if(untilFinal&&g.snapshot().canSurge)break;
  const s=g.snapshot();stages.add(s.raceStage);g.advance((Math.floor(s.beatPhase+1e-8)+1-s.beatPhase)*60/s.cadence+1/240);
  quickRace.stroke();
 }illustratedPreview.draw(g.state.elapsed);return {state:quickRace.state,strokes,stages:[...stages]};} """

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for width, height in ([tuple(map(int,args.viewport.split('x')))] if args.viewport else [(1366,900),(1024,768),(1180,820),(768,1024),(1180,430)]):
        page = browser.new_page(viewport={'width':width,'height':height}, has_touch=True)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(args.url, wait_until='domcontentloaded')
        ready(page)
        page.locator('button[data-mode=play]:not([data-kind])').tap()
        page.screenshot(path=str(out/f'{width}x{height}-ready.png'))
        page.locator('#play-start').tap()
        assert page.evaluate('quickRace.state.phase') == 'countdown'
        page.locator('#toggle').tap()
        frozen = page.evaluate('quickRace.state')
        page.wait_for_timeout(120)
        assert page.evaluate('quickRace.state') == frozen
        page.locator('#play-start').tap()
        page.evaluate('illustratedPreview.seek(0);quickRace.model.advance(3.1);quickRace.update()')
        page.evaluate('''()=>{const g=quickRace.model,s=g.snapshot();g.advance((Math.floor(s.beatPhase)+1-s.beatPhase)*60/s.cadence);quickRace.update();}''')
        rig_sync=page.evaluate('''()=>{const s=quickRace.state;illustratedPreview.draw(s.elapsed);const phase=s.beatPhase%1;return Object.entries(illustratedPreview.hybrid.roles).filter(([name])=>!name.startsWith('helm')).map(([name,rig])=>{const actual=(rig.mixer.time/rig.clip.duration)%1,delta=Math.abs(actual-phase);return {name,delta:Math.min(delta,1-delta)};});}''')
        assert all(r['delta']<.001 for r in rig_sync),rig_sync
        page.locator('#play-stroke').tap()
        assert page.evaluate('quickRace.state.judgement') == 'PERFECT'
        page.locator('#play-stroke').tap()
        page.locator('#play-stroke').tap()
        assert page.evaluate('quickRace.state.judgement') == 'BAD'
        assert page.evaluate('quickRace.projected().boats.find(b=>b.id==="near").desyncIntensity')>0
        page.evaluate('''()=>{const g=quickRace.model,s=g.snapshot();g.advance((Math.floor(s.beatPhase)+1-s.beatPhase)*60/s.cadence+.12);quickRace.update();}''')
        page.locator('#play-stroke').tap()
        assert page.evaluate('quickRace.state.judgement') == 'GOOD'
        assert page.locator('#play-surge').is_disabled()
        boxes = layout(page)
        page.screenshot(path=str(out/f'{width}x{height}-racing.png'))
        page.locator('#fullscreen').tap()
        page.wait_for_function('!!document.fullscreenElement')
        layout(page)
        exit_box=page.locator('#exit-fullscreen').bounding_box()
        for selector in ['#play-cadence','#stamina-value']:
            box=page.locator(selector).bounding_box()
            assert box['x']+box['width']<=exit_box['x'] or box['y']>=exit_box['y']+exit_box['height'], (selector,box,exit_box)
        page.screenshot(path=str(out/f'{width}x{height}-fullscreen.png'))
        page.locator('#exit-fullscreen').tap()
        page.wait_for_function('!document.fullscreenElement')
        # Restart via DOM; every forward movement below follows real rule integration.
        page.evaluate('quickRace.pause()')
        page.locator('button[data-mode=play]:not([data-kind])').tap()
        page.locator('#play-start').tap()
        page.evaluate('illustratedPreview.seek(0);quickRace.model.advance(3);quickRace.update()')
        final = page.evaluate(advance, True)
        assert final['state']['canSurge'], final
        page.locator('#play-surge').tap()
        assert page.evaluate('quickRace.state.surgeActive')
        assert page.locator('#play-surge').is_disabled()
        projected = page.evaluate('quickRace.projected()')
        near = next(b for b in projected['boats'] if b['id']=='near')
        assert near['surge'] and near['effort']==1
        assert near['cadence']==projected['player']['cadence'] and near['cycles']==projected['player']['beatPhase']
        assert final['stages']==['start','cruise'], final['stages']
        page.screenshot(path=str(out/f'{width}x{height}-surge.png'))
        result = page.evaluate(advance, False)['state']
        assert result['phase']=='finished' and result['result']=='win', result
        page.screenshot(path=str(out/f'{width}x{height}-result.png'))
        assert not errors, errors
        reports.append({'viewport':[width,height], 'layout':boxes, 'actualTouchJudgements':['PERFECT','BAD','GOOD'], 'rigEntrySync':rig_sync, 'surgeProjected':projected, 'finishTime':result['finishTimes'][0], 'errors':errors})
        page.close()

    page = browser.new_page(viewport={'width':1024,'height':768}, has_touch=True)
    page.goto(args.url)
    ready(page)
    page.locator('[data-kind=cup]').tap()
    ready(page)
    page.locator('#cup-panel summary').tap()
    page.screenshot(path=str(out/'cup-quarterfinal.png'))
    cup_rounds = []
    for index in range(3):
        match = page.evaluate('hybridCup.match')
        assert match['roundIndex']==index, match
        page.locator('#play-start').tap()
        page.wait_for_function('quickRace.state.phase==="countdown"')
        assert page.locator('#cup-team').is_disabled()
        page.evaluate('illustratedPreview.seek(0);quickRace.model.advance(3);quickRace.update()')
        page.evaluate(advance, True)
        page.locator('#play-surge').tap()
        result = page.evaluate(advance, False)['state']
        assert result['result']=='win', result
        cup_rounds.append(match)
        state = page.evaluate('hybridCup.state')
        if index==0:
            page.reload()
            ready(page)
            page.locator('[data-kind=cup]').tap()
            ready(page)
            assert page.evaluate('hybridCup.state')==state
        page.screenshot(path=str(out/f'cup-round-{index+1}.png'))
    assert page.evaluate('hybridCup.state.status')=='champion'
    if args.viewport and (out/'check.json').exists():
        previous=json.loads((out/'check.json').read_text(encoding='utf8'))
        reports=[r for r in previous['reports'] if r['viewport']!=list(map(int,args.viewport.split('x')))]+reports
    report = {'url':args.url,'raceTiming':'accelerated legal beats; actual touch buttons; no injected distances/results','physicalTabletTested':False,'reports':reports,'cupRounds':cup_rounds,'cupReloadRestored':True}
    (out/'check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'viewports':len(reports),'cupRounds':len(cup_rounds),'errors':[]}))
    browser.close()
