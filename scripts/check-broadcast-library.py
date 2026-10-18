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
    # Stock Azure samples remain separate from the original commentators/game manifest.
    page.goto(args.url.split('?')[0] + '?view=script')
    page.wait_for_function("document.querySelector('#script-review').hidden===false&&document.querySelectorAll('#rows tr').length===20")
    assert page.get_by_text('40 mẫu giọng stock Azure · Chưa chuyển giọng hai BLV.', exact=True).is_visible()
    assert page.locator('#rows button').count() == 40
    assert page.locator('#rows p:lang(vi)').count() == 20
    assert page.locator('#rows p:lang(km)').count() == 20
    before_trial_playback = len(requests)
    report['azurePlayback'] = []
    for language, file in [('Việt', 'cruise-vi.mp3'), ('Khmer', 'cruise-km.mp3')]:
        page.get_by_role('button', name=f'Nghe mẫu {language} · Vào đường trường', exact=True).tap()
        page.wait_for_function('(file)=>document.querySelector("#player").src.includes("commentary-trial/"+file)&&document.querySelector("#player").currentTime>.2', arg=file)
        report['azurePlayback'].append(page.locator('#player').evaluate('(a)=>({src:a.src,duration:a.duration,currentTime:a.currentTime})'))
    assert len(requests) == before_trial_playback + 2, 'Only the two selected Azure samples should load'
    prior_requests = len(requests)
    page.get_by_label('Ngôn ngữ', exact=True).select_option('km')
    assert page.locator('#rows p:lang(vi)').count() == 0
    page.get_by_label('Giai đoạn', exact=True).select_option('result')
    assert page.locator('#rows tr').count() == 4
    page.get_by_label('Giai đoạn', exact=True).select_option('team-history')
    assert page.locator('#rows tr').count() == 2
    assert '២០២៤' in page.locator('#rows').inner_text()
    page.get_by_label('Giai đoạn', exact=True).select_option('')
    page.get_by_label('Ngôn ngữ', exact=True).select_option('')
    report['scriptViewports'] = []
    for width, height in [(1024, 768), (768, 1024), (1180, 430)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Script causes body overflow'
        assert page.locator('#rows p:lang(km)').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)') >= 18
        assert page.get_by_role('button', name='Kịch bản thử', exact=True).bounding_box()['height'] >= 44
        page.screenshot(path=str(out / f'script-{width}-{height}.png'), full_page=True)
        report['scriptViewports'].append([width, height])
    assert len(requests) == prior_requests, 'Script browsing must not request audio'
    report['scriptTrial'] = {'situations': 20, 'vietnameseLines': 20, 'khmerDraftLines': 20,
                             'azureAudioCreated': True, 'azureSampleCount': 40,
                             'commentatorsCloned': False, 'nativeReview': False}
    before_voice = len(requests)
    page.goto(args.url.split('?')[0] + '?view=voice')
    page.wait_for_function("document.querySelector('#voice-review').hidden===false&&document.querySelectorAll('#rows tr').length===6")
    assert page.locator('#rows button').count() == 18
    assert len(requests) == before_voice, 'Voice review must not preload audio'
    report['voicePlayback'] = []
    for language in ['Việt', 'Khmer']:
        for level in ['Giới thiệu', 'Giằng co', 'Nước rút']:
            page.get_by_role('button', name=f'AI chuyển giọng · {level} · {language}', exact=True).tap()
            page.wait_for_function("document.querySelector('#player').src.includes('/voice-trial/')&&document.querySelector('#player').currentTime>.2")
            report['voicePlayback'].append(page.locator('#player').evaluate('(a)=>({src:a.src,duration:a.duration,currentTime:a.currentTime})'))
    page.get_by_role('button', name='Azure · Nước rút · Việt', exact=True).tap()
    page.wait_for_function("document.querySelector('#player').src.includes('/commentary-trial/final-vi.mp3')&&document.querySelector('#player').currentTime>.2")
    page.get_by_role('button', name='Giọng gốc · lời khác · Nước rút · Khmer', exact=True).tap()
    page.wait_for_function("document.querySelector('#player').src.includes('/voice-trial/sprint-km-reference.mp3')&&document.querySelector('#player').currentTime>.2")
    page.get_by_role('button', name='Nghe đối chứng chỉ đổi chất giọng', exact=True).tap()
    page.wait_for_function("document.querySelector('#player').src.includes('/voice-trial/timbre-contest-vi.mp3')&&document.querySelector('#player').currentTime>.2")
    assert page.get_by_text('6 mẫu AI thử — chưa đạt kiểm tra giữ lời, chưa ghép vào game.', exact=True).is_visible()
    assert len(requests) == before_voice + 9, 'Fetch exactly the nine selected comparison files'
    before_filters = len(requests)
    page.get_by_label('Ngôn ngữ', exact=True).select_option('km')
    assert page.locator('#rows tr').count() == 3
    page.get_by_label('Giai đoạn', exact=True).select_option('final')
    assert page.locator('#rows tr').count() == 1
    page.get_by_label('Ngôn ngữ', exact=True).select_option('')
    page.get_by_label('Giai đoạn', exact=True).select_option('')
    report['voiceViewports'] = []
    for width, height in [(1024, 768), (768, 1024), (1180, 430)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Voice view causes body overflow'
        for button in page.locator('#rows button').all():
            assert button.bounding_box()['height'] >= 48
        assert page.locator('#rows p:lang(km)').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)') >= 18
        page.screenshot(path=str(out / f'voice-{width}-{height}.png'), full_page=True)
        report['voiceViewports'].append([width, height])
    assert len(requests) == before_filters, 'Filtering/resizing must not fetch audio'
    page.get_by_role('button', name='Bản thu', exact=True).tap()
    assert page.locator('#player').evaluate('(a)=>a.paused'), 'Navigation must pause audio'
    report['voiceTrial'] = {'referenceConditionedSamples': 6, 'timbreOnlyControl': 1, 'contentReviewApproved': False, 'trainedSpeakerModels': False,
                            'independentListeningVerified': False, 'emotionVerified': False}
    assert not errors, errors
    report.update(passed=True, errors=errors, mp3Requests=requests)
    browser.close()
(out / 'library-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(report, ensure_ascii=False))
