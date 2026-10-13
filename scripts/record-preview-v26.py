"""Capture the real current canvas, preserving moving proof without synthetic frames."""
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('E:/AI/Um Tuk/asset-studio/hybrid-v26/video');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900})
 page.goto('http://127.0.0.1:4255/',wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000)
 page.evaluate('illustratedPreview.seekRace(25)')
 with page.expect_download(timeout=30000) as download:page.evaluate('illustratedPreview.record(8)')
 download.value.save_as(out/'festival-continuous-v26.webm');page.screenshot(path=str(out/'festival-v26.png'))
 page.locator('#view').click();page.locator('#posture').select_option('seated');page.locator('#study-kit').select_option('#23855e')
 with page.expect_download(timeout=30000) as download:page.evaluate('illustratedPreview.record(6)')
 download.value.save_as(out/'athlete-continuous-v26.webm');page.screenshot(path=str(out/'athlete-v26.png'))
 print(str(out));browser.close()
