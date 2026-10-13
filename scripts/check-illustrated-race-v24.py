"""Browser evidence for the autonomous race, including one real-time finish."""
import argparse, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4255/')
parser.add_argument('--out',required=True)
parser.add_argument('--realtime',action='store_true')
args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    for width,height in [(1024,768),(768,1024),(1440,1100)]:
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=True)
        errors=[];failed=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('requestfailed',lambda r:failed.append(r.url))
        page.goto(args.url,wait_until='domcontentloaded',timeout=60000)
        try:
            page.wait_for_function('document.body.dataset.ready === "true" || !!document.body.dataset.loadError',timeout=60000)
            assert not page.evaluate('document.body.dataset.loadError'),page.locator('#status').inner_text()
        except Exception:
            failure={'viewport':[width,height],'status':page.locator('#status').inner_text(),'errors':errors,'failed_requests':failed}
            (out/'load-failure.json').write_text(json.dumps(failure,ensure_ascii=False,indent=2),encoding='utf8')
            page.screenshot(path=str(out/'load-failure.png'))
            raise
        assert page.locator('button[data-mode=demo]').inner_text()=='Đua tự động'
        assert page.evaluate('illustratedPreview.stats.configuration')=='hybrid-v27'
        assert page.evaluate('illustratedRace.state.stage')=='countdown'
        # Validate geometry throughout the course rather than only endpoints.
        states=page.evaluate('Array.from({length:464},(_,i)=>illustratedRace.sample(i/10))')
        for a,b in zip(states,states[1:]):
            assert all(x['progress']<=y['progress'] for x,y in zip(a['boats'],b['boats']))
        for state in states:
            cam=state['camera'];zoom=cam['zoom']
            for boat in state['boats']:
                left=(boat['bow']['x']-cam['x'])*zoom+1200
                right=(boat['x']+2150*boat['scale']-cam['x'])*zoom+1200
                assert -1<=left<right<=2401, (state['elapsed'],left,right)
                gate=boat['bow']['x']-.145*(boat['bow']['y']-530)
                assert 180-1e-7<=gate<=970+1e-7
                if boat['finished']: assert abs(gate-180)<1e-7
        assert states[120]['leader']=='near'
        assert states[450]['winner']=='far' and not states[450]['boats'][1]['finished']
        assert states[-1]['stage']=='finished' and all(b['finished'] for b in states[-1]['boats'])
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        assert page.locator('#scene').bounding_box()['height']>200
        assert page.locator('.controls').bounding_box()['y']>=sum(page.locator('#scene').bounding_box()[k] for k in ['y','height'])-1
        assert not page.locator('#asset-gallery').evaluate('(d)=>d.open')
        page.locator('#toggle').click();paused=page.evaluate('illustratedRace.state.elapsed')
        page.wait_for_timeout(350)
        assert page.evaluate('illustratedRace.state.elapsed')==paused
        page.locator('#toggle').click();page.wait_for_timeout(350)
        assert page.evaluate('illustratedRace.state.elapsed')>paused
        page.evaluate('illustratedPreview.seekRace(24)')
        page.locator('#camera').click()
        assert page.evaluate('illustratedRace.state.camera.zoom')==1
        page.locator('#camera').click()
        assert page.evaluate('illustratedRace.state.camera.zoom')>1
        for stamp in [0,24,45,46.3]:
            page.evaluate('(t)=>illustratedPreview.seekRace(t)',stamp)
            page.screenshot(path=str(out/f'{width}-{stamp}.png'))
        page.locator('#view').click();before=page.evaluate('illustratedRace.state.elapsed')
        page.evaluate('illustratedPreview.play()');page.wait_for_timeout(350)
        assert page.evaluate('illustratedRace.state.elapsed')==before
        page.locator('#view').click()
        page.locator('#restart').click()
        assert page.evaluate('illustratedRace.state.elapsed')<.3
        assert all(b['progress']==0 for b in page.evaluate('illustratedRace.state.boats'))
        page.locator('#fullscreen').click();page.wait_for_function('!!document.fullscreenElement')
        page.wait_for_timeout(350)
        assert page.evaluate('illustratedRace.state.elapsed')>0
        page.locator('#exit-fullscreen').click();page.wait_for_function('!document.fullscreenElement')
        realtime=None
        if args.realtime and width==1024:
            page.locator('#restart').click();started=time.monotonic()
            records=[];previous=None;first=page.evaluate('illustratedPreview.stats.renderedFrames')
            while True:
                state=page.evaluate('illustratedRace.state')
                assert previous is None or state['elapsed']>=previous
                previous=state['elapsed']
                records.append({'elapsed':state['elapsed'],'stage':state['stage'],'leader':state['leader'],'winner':state['winner']})
                if state['stage']=='finished': break
                assert time.monotonic()-started<58,'Race did not finish in real time'
                page.wait_for_timeout(700)
            elapsed=time.monotonic()-started
            frames=page.evaluate('illustratedPreview.stats.renderedFrames')-first
            assert any(s['leader']=='near' and s['stage']=='racing' for s in records)
            assert state['winner']=='far' and all(b['finished'] for b in state['boats'])
            assert 'thắng' in page.locator('#status').inner_text()
            page.screenshot(path=str(out/'real-time-finish.png'))
            frozen=state['elapsed'];time_before=page.evaluate('Number(canvas.dataset.time)')
            page.wait_for_timeout(350)
            assert page.evaluate('illustratedRace.state.elapsed')==frozen
            assert page.evaluate('Number(canvas.dataset.time)')>time_before
            realtime={'wall_seconds':round(elapsed,2),'fps_headless_desktop':round(frames/elapsed,1),'samples':records}
        assert not errors and not failed,(errors,failed)
        results.append({'viewport':[width,height],'geometry_samples':len(states),'realtime':realtime,'errors':errors,'failed_requests':failed})
        page.close()
    browser.close()
report={'url':args.url,'physical_tablet_tested':False,'results':results}
(out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'url':args.url,'results':[{**r,'realtime':None if not r['realtime'] else {k:v for k,v in r['realtime'].items() if k!='samples'}} for r in results]},ensure_ascii=False))
