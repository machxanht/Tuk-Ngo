"""Three event identities, real contacts, sensor recovery and report export."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');p.add_argument('--out',required=True);p.add_argument('--art',required=True);args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview";report={'maps':{},'errors':[],'physicalTabletTested':False}
with sync_playwright() as tool:
 browser=tool.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True,device_scale_factor=2)
 page.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','maspero');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));")
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 def wait(venue):page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=120000)
 try:
  page.goto(args.url);wait('maspero');page.add_script_tag(path=args.art)
  banners=page.evaluate("""()=>['maspero','phnom-penh','siem-reap'].map(venue=>{const c=document.createElement('canvas');c.width=2048;c.height=256;const layout=festivalArt.paintFestivalBanner(c,'ពិធីបុណ្យអុំទូក',venue);return {venue,layout,png:c.toDataURL('image/png')};})""")
  for banner in banners:
   for line in banner['layout']['lineBounds']:assert 0<=line['left']<line['right']<=2048 and 0<=line['top']<line['bottom']<=256
   (out/(banner['venue']+'-banner.png')).write_bytes(base64.b64decode(banner['png'].split(',')[1]))
  for venue in ['maspero','phnom-penh','siem-reap']:
   if venue!='maspero':page.get_by_label('Sân đấu',exact=True).select_option(venue);wait(venue)
   data=page.evaluate(api+'.river.group.userData.banners');assert data['venueId']==venue;report['maps'][venue]={'banner':data,'title':page.locator('.game-menu-card h2').inner_text()};page.screenshot(path=str(out/(venue+'-menu.png')))
   page.locator('.game-practice').click();page.locator('.selection-start').click();page.wait_for_function(api+".game.state.phase==='countdown'",timeout=90000)
   page.evaluate(api+'.game.advance(Math.max(0,'+api+'.game.state.countdown-.6))');page.wait_for_function("!document.querySelector('[data-testid=stroke-pad]').disabled")
   row=page.get_by_test_id('stroke-pad');box=row.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_function(api+".game.state.phase==='racing'");page.wait_for_timeout(700);assert page.evaluate(api+'.game.state.distances[0]')>0;assert row.get_attribute('data-held')=='true'
   page.mouse.up();page.wait_for_timeout(80);assert not page.evaluate(api+'.game.state.rowingHeld')
   cdp=page.context.new_cdp_session(page);point={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':22};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(80);assert not page.evaluate(api+'.game.state.rowingHeld');cdp.detach()
   # A deliberate foreground stall must remain visible in the exported report.
   page.evaluate('()=>{const start=performance.now();while(performance.now()-start<400){}}');page.wait_for_timeout(100)
   # Diagnostics are generated in-browser; no profile/token is included.
   page.locator('.game-audio-options>summary').click()
   with page.expect_download() as received:page.get_by_role('button',name='Lưu báo cáo hiệu năng',exact=True).click()
   file=out/(venue+'-performance.json');received.value.save_as(file);diagnostic=json.loads(file.read_text());assert diagnostic['venueId']==venue and diagnostic['environment']['renderDpr']==2;assert diagnostic['frames']['maxMs']>=395 and diagnostic['frames']['stallsOver250Ms']>=1;assert 'token'not in file.read_text().lower();page.locator('.game-audio-options>summary').click()
   page.evaluate("()=>{const g="+api+".game;g.setRowingHeld(true);while(g.state.phase==='racing')g.advance(.1);}");page.locator('.game-result button').last.click()
  report['countdownHoldStarts']=True;report['contactReleaseAndCancel']=True;report['diagnosticExports']=True
 finally:
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
 assert not report['errors'],report['errors']
 print('Three event banners, countdown holds, release/cancel and private-free diagnostic exports passed')
