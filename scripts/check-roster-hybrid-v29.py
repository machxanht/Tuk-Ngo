"""Check the existing bilingual registration data through the current game."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':768,'height':1024});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url));page.goto(args.url,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000)
 with page.expect_navigation():page.get_by_role('link',name='Danh sách 61 ghe đăng ký 2025 · Việt/Khmer',exact=True).click()
 page.wait_for_function('document.querySelectorAll("#rows tr").length===61');page.evaluate('document.fonts.ready');assert page.evaluate('document.fonts.check("18px Khmer")')
 quality=page.locator('#quality').inner_text();page.screenshot(path=str(out/'roster-tablet.png'));assert '61' in quality
 page.locator('#search').fill('ពោធិសត្ថារាម');page.wait_for_function('document.querySelectorAll("#rows tr").length>0 && document.querySelectorAll("#rows tr").length<61');khmer=page.locator('#rows tr').count()
 page.locator('#search').fill('');page.locator('#region').select_option('ca_mau');ca_mau=page.locator('#rows tr').count();assert 0<ca_mau<61
 assert not errors,errors;assert not failed,failed
 with page.expect_navigation():page.get_by_role('link',name='← Trở về đua ghe Ngo',exact=True).click()
 page.wait_for_selector('body[data-ready=true]',timeout=60000);assert page.url.rstrip('/')==args.url.rstrip('/'),page.url
 data={'url':args.url,'registrationRows':61,'KhmerSearchMatches':khmer,'CaMauFilterMatches':ca_mau,'qualityNotice':quality,'KhmerFontLoaded':True,'returnToSameGame':True,'errors':errors,'failedRequests':failed}
 (out/'check.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(data,ensure_ascii=False));browser.close()
