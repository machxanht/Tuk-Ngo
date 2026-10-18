"""Check source browsing, user-started original media and tablet layout in the real browser."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4173/Tuk-Ngo/assets/race-audio/')
parser.add_argument('--out', default='docs/qa/broadcast-audio/local')
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
requests = []
errors = []
report = {'independentListeningVerified': False, 'physicalTabletTested': False}
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1024, 'height': 768}, has_touch=True)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url) if '.mp3' in r.url else None)
    page.goto(args.url)
    page.wait_for_function("document.querySelectorAll('#rows tr').length>0")
    assert not requests, 'No audio download before choosing Listen'
    page.get_by_label('Ngôn ngữ', exact=True).select_option('km')
    page.get_by_label('Giai đoạn', exact=True).select_option('final')
    assert page.locator('#rows tr').count() == 1
    assert 'ត្រូវតែខំប្រឹង' in page.locator('#rows').inner_text()
    page.locator('#rows button').tap()
    page.wait_for_function("document.querySelector('#player').currentTime>.25")
    assert page.locator('#source a').get_attribute('href').startswith('https://www.youtube.com/watch?v=tnb7TdUVRkU&t=11054')
    assert len(requests) == 1 and 'khmer-full-effort.mp3' in requests[0]
    report['stagePlayback'] = page.locator('#player').evaluate('(a)=>({duration:a.duration,currentTime:a.currentTime,readyState:a.readyState,paused:a.paused})')
    report['viewports'] = []
    for width, height in [(1024, 768), (768, 1024), (1180, 430)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        for button in page.locator('nav button').all():
            assert button.bounding_box()['height'] >= 44
        page.screenshot(path=str(out / f'library-{width}x{height}.png'), full_page=True)
        report['viewports'].append([width, height])
    page.get_by_role('button', name='Nguồn video', exact=True).tap()
    assert page.locator('#rows tr').count() >= 70
    page.get_by_label('Tìm tên / nội dung', exact=True).fill('2022')
    row = page.locator('#rows tr').filter(has=page.locator('a[href="https://www.youtube.com/watch?v=F3wU7YfIivk"]'))
    assert row.count() == 1 and '20241010' in row.inner_text() and 'đăng lại khác năm' in row.inner_text()
    page.get_by_role('button', name='Đội ghe', exact=True).tap()
    page.get_by_label('Tìm tên / nội dung', exact=True).fill('Pong Tứk')
    assert page.locator('#rows tr').count() == 1 and page.locator('#rows button').count() == 2
    page.locator('#rows button').nth(1).tap()
    page.wait_for_function("document.querySelector('#player').src.includes('name-pong-tuk-chas-km')&&document.querySelector('#player').currentTime>.2")
    report['teamPlayback'] = page.locator('#player').evaluate('(a)=>({src:a.src,duration:a.duration,currentTime:a.currentTime})')
    assert not errors, errors
    report.update(passed=True, errors=errors, mp3Requests=requests)
    browser.close()
(out / 'library-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(report, ensure_ascii=False))
