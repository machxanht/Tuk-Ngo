"""Actual UI restore into a second browser and server-backed venue rankings."""
import argparse,json,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');p.add_argument('--source',required=True);p.add_argument('--race-report',required=True);p.add_argument('--secrets-file',required=True);p.add_argument('--out',required=True);args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
endpoint='https://tuk-ngo-online.oliverkhang.workers.dev';secret=json.loads(Path(args.secrets_file).read_text())['QA_SECRET']
request=urllib.request.Request(endpoint+'/session',b'{}',headers={'Origin':'https://machxanht.github.io','Content-Type':'application/json','X-QA-Token':secret,'User-Agent':'TukNgoQA'})
with urllib.request.urlopen(request)as response:original=json.load(response)
expected=json.loads(Path(args.race_report).read_text())['result']['changes'][0]['id'];report={'url':args.url,'errors':[],'physicalTabletTested':False}
with sync_playwright()as tool:
 browser=tool.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
 page.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','siem-reap');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));if(!localStorage.getItem('profile-test-seeded')){localStorage.setItem('tukngo-online-guest',"+json.dumps(json.dumps(original))+");localStorage.setItem('profile-test-seeded','1');}")
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 def opened():page.get_by_role('button',name='Đấu online',exact=True).click();page.get_by_text('Máy chủ sẵn sàng',exact=True).wait_for(timeout=20000)
 def password():return page.locator('.profile-transfer input[type=password]')
 def profile_id():return page.evaluate("JSON.parse(localStorage.getItem('tukngo-online-guest')).id")
 try:
  page.goto(args.url);page.wait_for_function("!!document.querySelector('[data-testid=art-stage]')?.boatPreview",timeout=120000);opened();page.locator('.profile-transfer summary').click()
  password().fill('wrong password');page.locator('.profile-transfer input[type=file]').set_input_files(args.source);page.get_by_text('Không mở được hồ sơ. Kiểm tra file, mật khẩu và kết nối mạng.',exact=True).wait_for();assert profile_id()==original['id'];report['wrongPasswordPreservesReceiver']=True
  password().fill('Fixture profile transfer only');page.locator('.profile-transfer input[type=file]').set_input_files(args.source);page.get_by_text('Đã khôi phục cùng hồ sơ và xếp hạng.',exact=True).wait_for(timeout=20000);assert profile_id()==expected;assert page.locator('.online-profile-rank strong').inner_text()=='1.016';report['restoredServerRating']=1016
  report['profileViewports']=[]
  for language,label in [('vi','VI'),('km','ខ្មែរ'),('en','EN')]:
   page.get_by_role('button',name=label,exact=True).click()
   for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
    page.set_viewport_size({'width':width,'height':height});page.locator('.profile-transfer').scroll_into_view_if_needed()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    for button in page.locator('.profile-transfer button').all():
     box=button.bounding_box();assert box['height']>=44 and 0<=box['x'] and box['x']+box['width']<=width+.5,box
    report['profileViewports'].append([language,width,height])
  page.set_viewport_size({'width':1024,'height':768});page.get_by_role('button',name='VI',exact=True).click();password().fill('Fixture profile transfer only')
  with page.expect_download()as result:page.get_by_role('button',name='Lưu hồ sơ',exact=True).click()
  file=out/'profile.tuk';result.value.save_as(file);assert file.stat().st_size<4096 and file.read_bytes().startswith(b'TUKNGO\x00\x01');assert b'token'not in file.read_bytes();page.screenshot(path=str(out/'restored-profile.png'))
  page.reload();page.wait_for_function("!!document.querySelector('[data-testid=art-stage]')?.boatPreview",timeout=120000);opened();assert profile_id()==expected;page.wait_for_function("document.querySelector('.online-profile-rank strong')?.textContent==='1.016'",timeout=15000);page.locator('.online-back').click()
  page.get_by_label('Sân đấu',exact=True).select_option('phnom-penh');page.wait_for_function("document.querySelector('[data-testid=art-stage]')?.boatPreview?.game.state.venueId==='phnom-penh'",timeout=120000);opened();assert page.locator('.online-profile-rank strong').inner_text()=='—';report['otherVenueRankSeparate']=True
  report['encryptedExport']=True;report['restoreSurvivesReload']=True
 except Exception:
  report['visibleStatus']=page.locator('.profile-transfer [role=status]').all_text_contents();report['onlineStatus']=page.locator('.online-status').all_text_contents();page.screenshot(path=str(out/'failure.png'));raise
 finally:
  (out/'checks.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');browser.close()
 assert not report['errors'],report['errors']
 print('Second-browser restore, wrong-password safety, live 1016 Elo, reload persistence, encrypted export and independent map rankings passed')
