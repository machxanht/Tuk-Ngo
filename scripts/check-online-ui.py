"""Real two-browser WebSocket races and responsive lobby checks.
QA session credentials use the live worker's isolated ranking namespace.
No game time, position, result or network transport is mocked.
"""
import argparse,json,time,urllib.request,urllib.parse,re
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--endpoint')
parser.add_argument('--secrets-file',required=True)
parser.add_argument('--out',required=True)
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
if args.endpoint:endpoint=args.endpoint
else:
 with urllib.request.urlopen(urllib.parse.urljoin(args.url,'online-config.json')) as response:endpoint=json.load(response)['url']
qa=json.loads(Path(args.secrets_file).read_text(encoding='utf-8'))['QA_SECRET']
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'url':args.url,'endpoint':endpoint,'configurationOverridden':bool(args.endpoint),'physicalTabletTested':False,'viewports':[],'errors':[]}
with sync_playwright() as p:
 browsers=[];pages=[];contexts=[]
 try:
  for i in range(2):
   browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader']);browsers.append(browser)
   context=browser.new_context(viewport={'width':1024,'height':768},device_scale_factor=1,has_touch=True);contexts.append(context)
   context.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','siem-reap');localStorage.setItem('tukngo-quality','balanced');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));")
   if args.endpoint:context.route('**/online-config.json',lambda route:route.fulfill(json={'url':endpoint}))
   def session_header(route):
    if route.request.method=='POST':route.continue_(headers={**route.request.headers,'X-QA-Token':qa})
    else:route.continue_()
   context.route(endpoint+'/session',session_header)
   page=context.new_page();pages.append(page);page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.goto(args.url);page.wait_for_function('!!'+api,timeout=120000)
   page.get_by_role('button',name='Đấu online',exact=True).click()
   page.get_by_text('Máy chủ sẵn sàng',exact=True).wait_for(timeout=20000)
   page.get_by_label('Tên hiển thị',exact=True).fill('Tablet QA '+str(i+1))
  a,b=pages
  # Three languages and phone/tablet layouts, using the same live service.
  for language,label in [('vi','VI'),('km','ខ្មែរ'),('en','EN')]:
   a.get_by_role('button',name=label,exact=True).click()
   for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
    a.set_viewport_size({'width':width,'height':height});a.wait_for_timeout(100)
    assert a.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert a.get_by_test_id('online-lobby').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    buttons=a.get_by_test_id('online-lobby').locator('button:visible')
    for button in buttons.all():
     rect=button.bounding_box();assert rect['width']>=43 and rect['height']>=43,rect
    a.screenshot(path=str(out/f'lobby-{language}-{width}x{height}.png'));report['viewports'].append([language,width,height])
  a.set_viewport_size({'width':1024,'height':768});a.get_by_role('button',name='VI',exact=True).click()
  # A complete friend-room setup, then leave before start: no rating change.
  a.get_by_role('button',name='Phòng bạn bè',exact=True).click();a.get_by_role('button',name='Tạo phòng',exact=True).click()
  code=a.locator('.online-room-code input');code.wait_for(timeout=20000);room_code=code.input_value();assert len(room_code)==8
  b.get_by_role('button',name='Phòng bạn bè',exact=True).click();b.get_by_label('Mã phòng',exact=True).fill(room_code);b.get_by_role('button',name='Vào phòng',exact=True).click()
  a.get_by_text('Tablet QA 2',exact=False).wait_for(timeout=15000);a.screenshot(path=str(out/'friend-room.png'))
  a.get_by_role('button',name='Rời phòng',exact=True).click();b.get_by_text('Phòng đã hủy. Chưa tính hạng.',exact=True).wait_for(timeout=15000)
  # Public matchmaking, two independent browser processes / storage profiles.
  for page in pages:
   page.get_by_role('button',name='Đua trực tuyến',exact=True).click();page.get_by_role('button',name='Tìm đối thủ',exact=True).click()
  for page in pages:
   page.get_by_role('button',name='Sẵn sàng đua',exact=True).wait_for(timeout=20000)
   page.get_by_role('button',name='Sẵn sàng đua',exact=True).click()
  for page in pages:page.wait_for_function(api+".game.state.phase==='racing'",timeout=25000)
  a.keyboard.down('Space');a.wait_for_timeout(1200)
  assert a.evaluate(api+'.game.state.rowingHeld')
  a.keyboard.down('ShiftLeft');a.wait_for_function(api+'.game.state.boostActive',timeout=5000)
  before_boost=a.evaluate(api+'.game.state.stamina');a.wait_for_timeout(1500)
  assert a.evaluate(api+'.game.state.stamina')<before_boost-7
  a.keyboard.up('ShiftLeft');a.wait_for_function('!'+api+'.game.state.boostActive',timeout=5000)
  a.keyboard.down('KeyD');a.wait_for_timeout(1800);a.keyboard.up('KeyD');assert a.evaluate(api+'.game.state.lateralPositions[0]')>.1
  b.keyboard.down('Space');b.wait_for_timeout(1000);assert b.evaluate(api+'.game.state.rowingHeld')
  a.screenshot(path=str(out/'two-players-racing.png'))
  # An online menu cannot pause the other human's clock.
  a.get_by_role('button',name='Tạm dừng cuộc đua',exact=True).click();a.get_by_role('dialog',name='Rời trận online?',exact=True).wait_for()
  before=a.evaluate(api+'.game.state.elapsed');a.wait_for_timeout(1100);assert a.evaluate(api+'.game.state.elapsed')>before+.5
  a.get_by_role('button',name='Tiếp tục đua',exact=True).click();a.keyboard.up('Space');a.keyboard.down('Space');report['onlineDoesNotPause']=True
  # Disconnect / reconnect, then reload: input counters and room survive.
  contexts[0].set_offline(True);a.wait_for_timeout(2300);contexts[0].set_offline(False)
  a.wait_for_function(api+".game.state.phase==='racing'",timeout=12000);a.wait_for_timeout(2000);a.keyboard.up('Space');a.keyboard.down('Space')
  reload_started=time.monotonic();resume_times={}
  def resumed_socket(socket):socket.on('framereceived',lambda _:resume_times.setdefault('firstState',time.monotonic()))
  a.on('websocket',resumed_socket)
  a.reload();a.wait_for_function('!!'+api,timeout=120000);graphics_ready=time.monotonic()
  assert resume_times.get('firstState',float('inf'))<graphics_ready
  report['reloadTimingMs']={'firstServerState':round((resume_times['firstState']-reload_started)*1000),'graphicsReady':round((graphics_ready-reload_started)*1000)}
  a.wait_for_function(api+".game.online&&"+api+".game.state.phase==='racing'",timeout=20000);a.keyboard.up('Space');a.keyboard.down('Space');a.wait_for_timeout(1200)
  assert a.evaluate(api+'.game.state.rowingHeld');report['reloadAndReconnect']=True
  for page in pages:page.get_by_role('dialog',name='Kết quả trận đua',exact=True).wait_for(timeout=140000)
  results=[page.evaluate(api+'.game.snapshot()') for page in pages]
  assert {s['result'] for s in results}=={'win','loss'},[s['result'] for s in results]
  assert all(all(t is not None for t in s['finishTimes']) for s in results)
  assert all(s['distances']==[500,500] for s in results)
  report['results']=[{'result':s['result'],'times':s['finishTimes']} for s in results]
  a.screenshot(path=str(out/'online-result.png'));a.get_by_role('button',name='Về phòng chờ',exact=True).click()
  a.get_by_role('button',name='Xếp hạng',exact=True).click();a.locator('.online-table tr.is-you').wait_for(timeout=15000)
  report['ownRankRow']=a.locator('.online-table tr.is-you').inner_text()
  current_tab=a.locator('.online-tabs button[aria-pressed=true]');current_tab.hover()
  colors=current_tab.evaluate('e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor]}')
  def luminance(color):
   values=[float(v)/255 for v in re.findall(r'[\d.]+',color)[:3]];values=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
   return sum(v*w for v,w in zip(values,[.2126,.7152,.0722]))
  values=sorted([luminance(color) for color in colors]);report['selectedTabContrast']=(values[1]+.05)/(values[0]+.05);assert report['selectedTabContrast']>=4.5
  a.screenshot(path=str(out/'leaderboard.png'))
  a.emulate_media(reduced_motion='reduce');a.set_viewport_size({'width':390,'height':844});a.screenshot(path=str(out/'leaderboard-phone-reduced-motion.png'))
  assert not report['errors'],report['errors'];(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
 except Exception:
  for i,page in enumerate(pages):
   try:page.screenshot(path=str(out/f'failure-{i}.png'));(out/f'failure-{i}.json').write_text(json.dumps({'text':page.locator('body').inner_text(),'errors':report['errors'],'game':page.evaluate(api+'.game.snapshot()') if page.evaluate('!!'+api) else None},ensure_ascii=False,indent=2),encoding='utf-8')
   except:pass
  raise
 finally:
  for browser in browsers:browser.close()
