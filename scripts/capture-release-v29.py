"""Capture the deployed game using its real clock and visible inspector controls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,argparse
parser=argparse.ArgumentParser();parser.add_argument('--version',default='30');parser.add_argument('--url',default='https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/');args=parser.parse_args()
out=Path('E:/AI/Um Tuk/asset-studio/hybrid-v'+args.version+'/public-release');out.mkdir(parents=True,exist_ok=True)
url=args.url
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000);assert page.evaluate('illustratedPreview.stats.configuration')=='hybrid-v'+args.version
 page.wait_for_timeout(18000);page.locator('#toggle').click();page.screenshot(path=str(out/'festival.png'))
 page.locator('#view').click();page.locator('#posture').select_option('caller');page.locator('#study-focus').select_option('face');page.locator('#pose-controls summary').click();page.locator('[data-pose=".25"]').click();page.locator('#pose-controls summary').click();page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/'athlete-face.png'))
 assert not errors,errors
 (out/'check.json').write_text(json.dumps({'url':url,'version':int(args.version),'capture':'Actual served page, browser-clock automatic race and visible inspector buttons','errors':errors},indent=2),encoding='utf8');print(str(out));browser.close()
