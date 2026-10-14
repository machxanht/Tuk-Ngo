"""Inspect the actual full festival, tablet controls and rowing game."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json,time

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://localhost:3000/Tuk-Ngo/')
parser.add_argument('--output',required=True)
parser.add_argument('--duration',type=int,default=180)
args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
report={'base':args.base,'errors':[],'consoleErrors':[],'viewports':[],
        'physicalTabletTested':False,'visualAcceptance':'Directly inspect these actual renders; counts are not a likeness score.'}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True,args=['--ignore-gpu-blocklist','--use-angle=d3d11'])
    page=browser.new_page(viewport={'width':1200,'height':850})
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
    page.goto(args.base+'?demo=studio',wait_until='domcontentloaded')
    page.wait_for_selector('[data-scene-version="MASPERO_FESTIVAL_V21"]',timeout=120000)
    stage=page.get_by_test_id('race-stage');root=page.locator('.race-demo')
    page.wait_for_function('Number(document.querySelector("[data-testid=race-stage]").dataset.drawCalls)>0')
    assert stage.get_attribute('data-crew-count')=='110'
    report['environment']=json.loads(stage.get_attribute('data-environment'))
    report['faces']=json.loads(stage.get_attribute('data-face-variants'))
    report['roles']=json.loads(stage.get_attribute('data-crew-roles'))
    report['caps']=json.loads(stage.get_attribute('data-cap-orientations'))
    assert report['environment']['nationalFlags']==0
    assert report['environment']['fullCourseCrowdRows']==10
    for width,height in [(1024,768),(768,1024),(800,600)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(300)
        assert root.get_attribute('data-controls-open')=='false'
        assert page.get_by_role('button').count()==1
        toggle=page.get_by_role('button',name='Điều khiển',exact=True)
        box=toggle.bounding_box();assert box['height']>=44 and box['y']+box['height']<=height
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(out/f'tablet-{width}x{height}.png'))
        toggle.click();page.get_by_role('button',name='Hai ghe',exact=True).click()
        assert root.get_attribute('data-controls-open')=='false'
        report['viewports'].append({'width':width,'height':height,'oneDefaultButton':True,'touchTarget':True,'noOverflow':True})
    page.set_viewport_size({'width':1200,'height':850})
    def inspect(label,filename,extra=False):
        page.get_by_role('button',name='Điều khiển',exact=True).click()
        if extra:page.locator('summary').filter(has_text='Người trên ghe & khán giả').click()
        page.get_by_role('button',name=label,exact=True).click()
        page.wait_for_timeout(800);page.screenshot(path=str(out/(filename+'.png')))
        print('captured '+filename,flush=True)
    for label,file in [('Hai ghe','overview'),('VĐV','crew'),('Khán đài','stand'),('Khán giả','crowd'),('Đường phố','street'),('Biểu ngữ','banner'),('Cầu C247','bridge-start'),('Cầu 30/4','bridge-end')]:inspect(label,file)
    for label,file in [('VĐV đứng','standing'),('Người đầu ghe','bow'),('Điều khiển','controller'),('Lái đuôi ghe','helm'),('Khán giả bờ đối diện','opposite-crowd')]:inspect(label,file,True)
    inspect('Hai ghe','continuous-start')
    start=time.monotonic();report['longRun']=[]
    for target in range(0,args.duration+1,60):
        while time.monotonic()-start<target:page.wait_for_timeout(1000)
        state=stage.evaluate('(e)=>({...e.dataset})')
        camera=json.loads(state['cameraPosition']);assert all(abs(n)<10000 for n in camera) and camera[1]<200
        assert float(state['drawCalls'])>0 and page.locator('canvas').count()==1
        assert 'loadError' not in state
        page.screenshot(path=str(out/f'continuous-{target}s.png'))
        report['longRun'].append({'elapsedSeconds':target,'fps':state.get('fps'),'triangles':state.get('triangles'),'drawCalls':state.get('drawCalls'),'camera':camera,'traffic':json.loads(state['traffic'])})
        print(f'full course {target}s OK',flush=True)
    page.get_by_role('button',name='Điều khiển',exact=True).click()
    page.get_by_role('button',name='Dừng',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(600)
    before=stage.evaluate('(e)=>({...e.dataset})');page.wait_for_timeout(1500);after=stage.evaluate('(e)=>({...e.dataset})')
    assert abs(float(after['distance'])-float(before['distance']))<.2
    assert float(after['crowdTime'])>float(before['crowdTime'])+1
    assert json.loads(after['traffic'])['samples']!=json.loads(before['traffic'])['samples']
    report['pausedRowingKeepsFestivalAlive']=True
    page.goto(args.base+'?demo=play',wait_until='domcontentloaded')
    page.wait_for_selector('[data-scene-version="MASPERO_FESTIVAL_V21_GAMEPLAY"]',timeout=120000)
    page.get_by_role('button',name='Bắt đầu đua',exact=True).click()
    page.wait_for_function('JSON.parse(document.querySelector("[data-testid=race-stage]").dataset.gameplay||"{}").phase==="racing"')
    page.get_by_role('button',name='CHÈO',exact=True).click()
    page.get_by_role('button',name='Tạm dừng cuộc đua',exact=True).click()
    assert page.get_by_role('button',name='Tiếp tục đua',exact=True).is_visible()
    page.screenshot(path=str(out/'gameplay-paused.png'))
    page.get_by_role('button',name='Tiếp tục đua',exact=True).click()
    page.wait_for_function('JSON.parse(document.querySelector("[data-testid=race-stage]").dataset.gameplay||"{}").phase==="racing"')
    report['gameStartStrokePauseResume']=True
    report['pass']=not report['errors'] and not report['consoleErrors']
    (out/'runtime-review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
    assert report['pass'],report
    browser.close();print('PASS '+str(out/'runtime-review.json'),flush=True)
