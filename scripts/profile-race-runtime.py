"""Repeatable desktop runtime sample; not a physical tablet benchmark."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/runtime-response/baseline.json');args=parser.parse_args()
api="document.querySelector('[data-testid=art-stage]').boatPreview"
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=b.new_page(viewport={'width':1024,'height':768},has_touch=True);page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
  cdp=page.context.new_cdp_session(page);cdp.send('Profiler.enable');report={'environment':'Desktop Edge headless 1024x768, GPU may be software; not tablet','scenes':{}}
  page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;window.cost={};window.install=(object,key,name)=>{const old=object[key];object[key]=function(...args){const at=performance.now();try{return old.apply(this,args)}finally{(cost[name]??=[]).push(performance.now()-at)}}};install(a.renderer,'render','render');install(a.river,'update','river');install(a.ceremony,'update','ceremony');install(a.game,'advance','simulation');a.rigs.forEach((r,i)=>install(r,'render','crew'+i));}""")
  for scene in ['ceremony','race']:
   if scene=='race':
    page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).click();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).click();page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).click();page.wait_for_function(api+".game.state.phase==='racing'");page.evaluate(api+'.game.setRowingHeld(true)')
   page.wait_for_timeout(1200);page.evaluate('window.cost={}')
   cdp.send('Profiler.start');frames=page.evaluate("""()=>new Promise(resolve=>{const samples=[],start=performance.now();let last=start;function frame(now){samples.push(now-last);last=now;if(now-start<4500)requestAnimationFrame(frame);else resolve(samples)}requestAnimationFrame(frame)})""")
   profile=cdp.send('Profiler.stop')['profile'];nodes={n['id']:n for n in profile['nodes']};totals={}
   for sample,dt in zip(profile.get('samples',[]),profile.get('timeDeltas',[])):
    f=nodes[sample]['callFrame'];key=(f['functionName'],f['url'],f['lineNumber']);totals[key]=totals.get(key,0)+dt/1000
   summary=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,gl=a.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {cost,triangles:a.renderer.info.render.triangles,drawCalls:a.renderer.info.render.calls,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'',pixelRatio:a.renderer.getPixelRatio(),crew:a.rigs.map(r=>r.getDrawStats())}}""")
   def stats(values):
    values=sorted(values);return {'count':len(values),'median':values[len(values)//2] if values else 0,'p95':values[min(len(values)-1,int(len(values)*.95))] if values else 0,'total':sum(values)}
   summary['cost']={k:stats(v) for k,v in summary['cost'].items()};summary['frames']=stats(frames);summary['topCpu']=[{'function':k[0],'url':k[1],'line':k[2]+1,'selfMs':round(v,2)} for k,v in sorted(totals.items(),key=lambda item:-item[1])[:15]];report['scenes'][scene]=summary
  out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
 finally:b.close()
