"""Capture the current textured body/face and festival from the running canvas."""
from pathlib import Path
import argparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--version',default='27');parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--festival-only',action='store_true');args=parser.parse_args()
version='v'+args.version;out=Path('E:/AI/Um Tuk/asset-studio/hybrid-'+version+'/video');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900})
 page.goto(args.url,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000)
 if not args.festival_only:
  page.locator('#view').click();page.locator('#study-focus').select_option('face');page.locator('#posture').select_option('caller')
  with page.expect_download(timeout=30000) as download:page.evaluate('illustratedPreview.record(6)')
  download.value.save_as(out/('athlete-face-'+version+'.webm'));page.screenshot(path=str(out/('face-'+version+'.png')))
  page.locator('#study-focus').select_option('body');page.locator('#posture').select_option('seated')
  with page.expect_download(timeout=30000) as download:page.evaluate('illustratedPreview.record(6)')
  download.value.save_as(out/('athlete-continuous-'+version+'.webm'));page.screenshot(path=str(out/('athlete-'+version+'.png')))
  page.locator('#view').click()
 page.locator('#restart').click();page.evaluate('illustratedPreview.seekRace(25)')
 with page.expect_download(timeout=30000) as download:page.evaluate('illustratedPreview.record(8)')
 download.value.save_as(out/('festival-continuous-'+version+'.webm'));page.screenshot(path=str(out/('festival-'+version+'.png')))
 print(str(out));browser.close()
