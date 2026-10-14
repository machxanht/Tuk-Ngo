"""Real browser checks for the standalone illustrated festival preview."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
import argparse, json, time

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4255/')
parser.add_argument('--out', required=True)
args = parser.parse_args()
proof = Path(args.out)
proof.mkdir(parents=True, exist_ok=True)
results = []

def changed(a, b, box):
    first = Image.open(a).crop(box)
    second = Image.open(b).crop(box)
    return ImageChops.difference(first, second).getbbox() is not None

def screen_box(image_path, world_box):
    image = Image.open(image_path)
    scale = min(image.width/2400, image.height/1500)
    ox, oy = (image.width-2400*scale)/2, (image.height-1500*scale)/2
    x0,y0,x1,y1 = world_box
    return tuple(round(v) for v in (ox+x0*scale,oy+y0*scale,ox+x1*scale,oy+y1*scale))

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for width, height in [(1440,1100),(1024,768),(768,1024)]:
        page = browser.new_page(viewport={'width':width,'height':height}, has_touch=True)
        errors, failed = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('requestfailed', lambda r: failed.append(r.url))
        response = page.goto(args.url, wait_until='domcontentloaded', timeout=60000)
        assert response.status == 200
        page.wait_for_selector('body[data-ready=true]', timeout=60000)
        stats = page.evaluate('illustratedPreview.stats')
        assert stats['boats'] == 2 and stats['members'] == 55
        assert stats['festival']['spectators'] >= 1800
        assert stats['festival']['identities'] == 28
        assert stats['configuration'] == 'hybrid-v32'
        assert stats['direction'] == -1
        assert stats['festival']['bridges'] == 1
        assert page.evaluate('Math.max(...TukNgoConfig.boat.lanes.map(l=>l.scale))/Math.min(...TukNgoConfig.boat.lanes.map(l=>l.scale))<1.1')
        assert page.evaluate('festivalScene.stalls.filter(s=>s.bank==="near").every(s=>s.y<festivalScene.roadEdge(s.x)-20)')
        assert page.evaluate('festivalScene.crowds.filter(p=>p.bank==="near").every(p=>p.y<festivalScene.roadEdge(p.x)-20)')
        assert page.evaluate('document.fonts.check("40px FestivalKhmer")')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        canvas_box = page.locator('#scene').bounding_box()
        controls_box = page.locator('.controls').bounding_box()
        assert controls_box['y'] >= canvas_box['y']+canvas_box['height']-1
        assert not page.locator('#asset-gallery').evaluate('(d)=>d.open')
        page.evaluate('illustratedPreview.seek(0)')
        first = proof/f'{width}-t0.png'
        second = proof/f'{width}-t3.png'
        page.locator('#scene').screenshot(path=str(first))
        page.evaluate('illustratedPreview.seek(3.31)')
        page.locator('#scene').screenshot(path=str(second))
        zones = {'far_crowd':(0,310,1250,490),'near_crowd':(100,1190,1400,1490),
                 'road':(1250,1390,2380,1498),'river':(100,650,500,850)}
        motion = {name:changed(first,second,screen_box(first,box)) for name,box in zones.items()}
        assert all(motion.values()), motion
        for stamp in [-.001,120,180,3600]:
            page.evaluate(f'illustratedPreview.seek({stamp})')
            assert page.evaluate('Number.isFinite(Number(canvas.dataset.time))')
        page.locator('#pose-controls summary').click()
        phases = []
        for i in range(4):
            page.locator('[data-pose]').nth(i).click()
            phases.append(page.evaluate('canvas.dataset.phase'))
        assert phases == ['0','1','2','3']
        page.locator('#view').click()
        assert page.evaluate('illustratedPreview.stats.mode') == 'boat'
        assert page.evaluate('Math.abs(canvas.height/canvas.width-860/2400)<.005')
        page.locator('#scene').screenshot(path=str(proof/f'{width}-boat.png'))
        page.locator('#view').click()
        assert page.evaluate('Math.abs(canvas.height/canvas.width-1500/2400)<.005')
        page.locator('[data-mode="practice"]').click()
        assert page.evaluate('illustratedPreview.stats.boats') == 1
        assert page.locator('#practice-controls').is_visible()
        camera = page.evaluate('illustratedPreview.stats.camera')
        page.locator('#stroke').click()
        assert page.evaluate('illustratedPreview.practice.strokes') == 1
        assert 0 <= page.evaluate('illustratedPreview.practice.accuracy') <= 100
        page.locator('#fullscreen').click()
        page.wait_for_function('document.fullscreenElement !== null')
        page.locator('#scene').tap()
        assert page.evaluate('illustratedPreview.practice.strokes') == 2
        page.locator('#exit-fullscreen').click()
        page.wait_for_function('document.fullscreenElement === null')
        page.locator('#toggle').click()
        page.locator('#stroke').click()
        assert page.evaluate('illustratedPreview.practice.strokes') == 2
        page.locator('[data-mode="demo"]').click()
        assert page.evaluate('illustratedPreview.stats.boats') == 2
        assert page.evaluate('illustratedPreview.stats.camera') == camera
        assert not page.locator('#practice-controls').is_visible()
        page.locator('#fullscreen').click()
        page.wait_for_function('document.fullscreenElement !== null')
        page.keyboard.press('Escape')
        page.wait_for_function('document.fullscreenElement === null')
        page.locator('#fullscreen').click()
        page.wait_for_function('document.fullscreenElement !== null')
        page.locator('#exit-fullscreen').click()
        page.wait_for_function('document.fullscreenElement === null')
        page.locator('[data-mode="practice"]').click()
        page.locator('#cadence').fill('105')
        assert page.locator('#cadenceValue').inner_text() == '105'
        if not page.evaluate('illustratedPreview.stats.playing'):
            page.locator('#toggle').click()
        start = page.evaluate('illustratedPreview.stats.renderedFrames')
        clock = time.monotonic()
        observed = set()
        for _ in range(32):
            page.wait_for_timeout(100)
            observed.add(page.evaluate('canvas.dataset.phase'))
        fps = (page.evaluate('illustratedPreview.stats.renderedFrames')-start)/(time.monotonic()-clock)
        assert observed == {'0','1','2','3'}, observed
        page.locator('#toggle').click()
        assert not page.evaluate('illustratedPreview.stats.playing')
        page.wait_for_function('canvas.dataset.time === time.toFixed(3)')
        paused = page.evaluate('canvas.dataset.time')
        page.wait_for_timeout(350)
        assert page.evaluate('canvas.dataset.time') == paused
        frozen_frames = page.evaluate('illustratedPreview.stats.renderedFrames')
        page.wait_for_timeout(200)
        assert page.evaluate('illustratedPreview.stats.renderedFrames') == frozen_frames
        page.locator('#pose-controls summary').click()
        page.evaluate('illustratedPreview.seek(.19)')
        page.screenshot(path=str(proof/f'{width}-page.png'))
        page.locator('#asset-gallery summary').click()
        page.locator('#asset-gallery img').evaluate_all('(items)=>items.forEach(img=>img.loading="eager")')
        page.wait_for_function('[...document.querySelectorAll("#asset-gallery img")].every(i=>i.complete&&i.naturalWidth>0)')
        assert not errors and not failed, (errors,failed)
        results.append({'viewport':[width,height],'status':response.status,'stats':stats,'motion_regions':motion,
                        'phases':phases,'headless_desktop_fps':round(fps,1),'errors':errors,'failed_requests':failed})
        page.close()
    browser.close()

report = {'url':args.url,'results':results,'physical_tablet_tested':False}
(proof/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False,indent=2))
