"""Cold public asset transfer per venue, separately from all stored study files."""
import argparse,json,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser();p.add_argument('--url',default='https://machxanht.github.io/Tuk-Ngo/');p.add_argument('--out',required=True);args=p.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'url':args.url,'cacheDisabled':True,'audioMuted':True,'physicalTabletTested':False,'maps':{}}
with sync_playwright()as tool:
 browser=tool.chromium.launch(channel='msedge',headless=True)
 try:
  for venue in ['maspero','phnom-penh','siem-reap']:
   context=browser.new_context(viewport={'width':1024,'height':768},device_scale_factor=2)
   context.add_init_script('localStorage.setItem("tukngo-language","vi");localStorage.setItem("tukngo-venue",'+json.dumps(venue)+');localStorage.setItem("tukngo-quality","sharp");localStorage.setItem("tukngo-race-audio",JSON.stringify({enabled:false}));')
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   cdp=context.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.setCacheDisabled',{'cacheDisabled':True});requests={}
   def requested(e):requests[e['requestId']]={'url':e['request']['url'],'transferBytes':0}
   def response(e):
    if e['requestId']in requests:requests[e['requestId']].update(status=e['response']['status'],mime=e['response']['mimeType'])
   def finished(e):
    if e['requestId']in requests:requests[e['requestId']]['transferBytes']=e['encodedDataLength']
   cdp.on('Network.requestWillBeSent',requested);cdp.on('Network.responseReceived',response);cdp.on('Network.loadingFinished',finished)
   start=time.monotonic();page.goto(args.url);page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=120000);ready=time.monotonic()-start;page.wait_for_timeout(2000)
   resources=list(requests.values());bad=[r for r in resources if r.get('status',0)>=400];assert not bad,bad;assert not errors,errors
   paths=[urlparse(r['url']).path for r in resources]
   assert not any('/teams-2025/'in path or path.endswith('.zip')or path.endswith('.webm')for path in paths),'Full exports/review media should not auto-load'
   assert not any(path.endswith('.mp3')for path in paths),'Muted menu should not download audio'
   dpr=page.evaluate(api+'.renderer.getPixelRatio()');assert dpr==2
   report['maps'][venue]={'readySeconds':round(ready,3),'transferBytesIncludingHeaders':sum(r['transferBytes']for r in resources),'completedRequests':sum(bool(r['transferBytes'])for r in resources),'renderDpr':dpr,'largest':[{'path':urlparse(r['url']).path,'bytes':r['transferBytes']}for r in sorted(resources,key=lambda r:-r['transferBytes'])[:12]],'errors':errors}
   print(venue,report['maps'][venue]['transferBytesIncludingHeaders'],'bytes; ready',round(ready,2),'seconds',flush=True);context.close()
 finally:
  browser.close();(out/'checks.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
