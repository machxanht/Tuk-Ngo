"""Repeatable Edge renderer benchmark. Desktop measurements are not tablet FPS."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/runtime-response/baseline.json');parser.add_argument('--seconds',type=float,default=8);args=parser.parse_args()
destination=Path(args.out);out=destination.parent if destination.suffix=='.json'else destination;out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'url':args.url,'viewport':[1024,768],'dpr':2,'physicalTabletTested':False,'samples':{},'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1024,'height':768},device_scale_factor=2,has_touch=True)
 page.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','maspero');localStorage.setItem('tukngo-quality','sharp');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));")
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 cdp=page.context.new_cdp_session(page);cdp.send('Profiler.enable')
 def wait(venue):page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=120000)
 def sample(name):
  page.evaluate("""()=>{const a="""+api+""";window.runtimeProfile={frames:[],stages:{},last:performance.now(),active:true};
   const wrap=(o,key,label)=>{const f=o[key];o[key]=function(...args){const start=performance.now();try{return f.apply(this,args);}finally{const v=window.runtimeProfile;if(v.active){const s=v.stages[label]??={calls:0,ms:0,max:0};const dt=performance.now()-start;s.calls++;s.ms+=dt;s.max=Math.max(s.max,dt);}}};return ()=>o[key]=f;};
   window.restoreRuntimeProfile=[wrap(a.renderer,'render','render'),wrap(a.river,'update','river'),...a.rigs.map((r,i)=>wrap(r,'render','crew'+i))];
   if(a.ceremony)window.restoreRuntimeProfile.push(wrap(a.ceremony,'update','ceremony'));
   const frame=now=>{const v=window.runtimeProfile;if(!v.active)return;v.frames.push(now-v.last);v.last=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);
  }""")
  cdp.send('Profiler.start');page.wait_for_timeout(args.seconds*1000);profile=cdp.send('Profiler.stop')['profile'];nodes={n['id']:n for n in profile['nodes']};totals={}
  for sample,dt in zip(profile.get('samples',[]),profile.get('timeDeltas',[])):
   f=nodes[sample]['callFrame'];key=(f['functionName'],f['url'],f['lineNumber']);totals[key]=totals.get(key,0)+dt/1000
  data=page.evaluate("""()=>{const a="""+api+""",v=window.runtimeProfile;v.active=false;window.restoreRuntimeProfile.forEach(f=>f());const sorted=v.frames.slice(1).sort((a,b)=>a-b);const gl=a.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {frames:sorted.length,meanFrameMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95FrameMs:sorted[Math.floor(sorted.length*.95)],stages:v.stages,drawCalls:a.renderer.info.render.calls,triangles:a.renderer.info.render.triangles,memory:a.renderer.info.memory,heapBytes:performance.memory?.usedJSHeapSize,renderDpr:a.renderer.getPixelRatio(),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),crowd:a.banks.stats.crowd,ceremony:a.ceremony?.stats,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,bytes:e.encodedBodySize,transfer:e.transferSize,duration:e.duration}))};}""")
  data['raceInput']=page.evaluate('()=>({held:'+api+'.game.state.rowingHeld,speed:'+api+'.game.state.speeds[0]})')
  if name.endswith('-race'):assert data['raceInput']['held'] and data['raceInput']['speed']>0,'Benchmark must keep a real held contact active'
  data['fps']=1000/data['meanFrameMs'];data['topCpu']=[{'function':k[0],'url':k[1],'line':k[2]+1,'selfMs':round(v,2)}for k,v in sorted(totals.items(),key=lambda i:-i[1])[:15]];report['samples'][name]=data;print(name,round(data['fps'],1),'FPS',data['drawCalls'],'draws',data['triangles'],'triangles',flush=True)
 try:
  start=time.monotonic();page.goto(args.url);wait('maspero');report['readySeconds']=time.monotonic()-start
  for venue in ['maspero','phnom-penh','siem-reap']:
   if venue!='maspero':page.get_by_label('Sân đấu',exact=True).select_option(venue);wait(venue)
   page.wait_for_timeout(2500);sample(venue+'-menu')
   page.locator('.game-quick').click();page.locator('.selection-start').click();page.wait_for_function(api+".game.state.phase==='intro'",timeout=90000)
   page.evaluate("()=>{const g="+api+".game;g.skipIntro();g.advance(3);g.setRowingHeld(true);g.advance(30);}");page.get_by_test_id('stroke-pad').focus();page.keyboard.down('Space');page.wait_for_function(api+'.game.state.rowingHeld');page.wait_for_timeout(1500);sample(venue+'-race');page.screenshot(path=str(out/(venue+'-race.png')));page.keyboard.up('Space')
   page.evaluate("()=>{const g="+api+".game;while(g.state.phase==='racing')g.advance(.1);}");page.locator('.game-result button').last.click()
 finally:
  (destination if destination.suffix=='.json'else out/'profile.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
 assert not report['errors'],report['errors']
