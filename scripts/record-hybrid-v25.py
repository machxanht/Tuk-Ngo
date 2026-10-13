"""Record the actual app canvas, not a fabricated animation storyboard."""
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('E:/AI/Um Tuk/asset-studio/hybrid-v25')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1200,'height':900})
    page.goto('http://127.0.0.1:4255/',wait_until='domcontentloaded')
    page.wait_for_selector('body[data-ready=true]',timeout=60000)
    page.locator('#view').click();page.locator('#posture').select_option('seated')
    with page.expect_download(timeout=30000) as download:
        page.evaluate('illustratedPreview.record(6)')
    target=out/'athlete-continuous-v25.webm';download.value.save_as(target)
    page.locator('#view').click();page.locator('#restart').click()
    page.wait_for_timeout(4200)
    page.screenshot(path=str(out/'current-demo-v25.png'))
    print(str(target));print(str(out/'current-demo-v25.png'))
    browser.close()
