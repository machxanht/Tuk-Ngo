"""Cold transfer, decoded asset size and submitted geometry; no tablet claim."""
import argparse,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='https://machxanht.github.io/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/simple-controls/before-size.json');parser.add_argument('--published-ref',default='origin/gh-pages',help='Exact deployed commit, or a freshly fetched remote ref');parser.add_argument('--inspect',action='store_true',help='Also measure a normal cached switch from the race to its model viewer');args=parser.parse_args()
root=Path.cwd();report={'url':args.url,'physicalTabletTested':False}
tracked=subprocess.check_output(['git','ls-files','-z'],text=True).split('\0');report['trackedWorkingBytes']=sum((root/f).stat().st_size for f in tracked if f and (root/f).is_file())
public=list((root/'public').rglob('*'));report['publicBytes']=sum(f.stat().st_size for f in public if f.is_file());groups={}
for f in public:
 if f.is_file():key='/'.join(f.relative_to(root/'public').parts[:2]);groups[key]=groups.get(key,0)+f.stat().st_size
report['publicGroups']=sorted(groups.items(),key=lambda p:-p[1])[:16]
report['publishedTreeRevision']=subprocess.check_output(['git','rev-parse',args.published_ref],text=True).strip()
rows=subprocess.check_output(['git','ls-tree','-rl',report['publishedTreeRevision']],text=True).splitlines();report['publishedTreeBytes']=sum(int(r.split('\t')[0].split()[-1]) for r in rows if r.split('\t')[0].split()[-1].isdigit())
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=b.new_page(viewport={'width':1024,'height':768},has_touch=True);cdp=page.context.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.setCacheDisabled',{'cacheDisabled':True});network={}
  cdp.on('Network.responseReceived',lambda e:network.setdefault(e['requestId'],{}).update(url=e['response']['url'],mime=e['response']['mimeType']))
  cdp.on('Network.loadingFinished',lambda e:network.setdefault(e['requestId'],{}).update(transfer=e['encodedDataLength']))
  page.goto(args.url);page.wait_for_selector('[data-boat-count="61"],.game-loading button',timeout=90000);assert page.locator('[data-boat-count="61"]').count(),page.locator('.game-loading').all_text_contents();page.wait_for_timeout(1500)
  def capture():
   resources=page.evaluate("performance.getEntriesByType('resource').map(r=>({url:r.name,encoded:r.encodedBodySize,decoded:r.decodedBodySize}))")
   return {'networkTransferBytes':sum(r.get('transfer',0) for r in network.values()),'encodedBodyBytes':sum(r['encoded'] for r in resources),'decodedBodyBytes':sum(r['decoded'] for r in resources),'requests':len(network),'largest':sorted(resources,key=lambda r:-r['decoded'])[:16]}
  report['menu']=capture();page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).click();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).click();page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).click()
  api="document.querySelector('[data-testid=art-stage]').boatPreview";page.wait_for_function(api+".game.state.phase==='racing'");page.evaluate(api+'.game.setRowingHeld(true)');page.wait_for_timeout(2500);report['race']=capture()
  report['draw']=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,draws={},drawCalls={},gl=a.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');a.scene.traverse(o=>{if(!o.isMesh)return;const old=o.onBeforeRender;o.onBeforeRender=function(renderer,scene,camera,geometry,material,group){const n=(group?.count??geometry.index?.count??geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);draws[o.name||o.type]=(draws[o.name||o.type]||0)+n;drawCalls[o.name||o.type]=(drawCalls[o.name||o.type]||0)+1;old.call(this,renderer,scene,camera,geometry,material,group);};});a.renderer.render(a.scene,a.camera);return {triangles:a.renderer.info.render.triangles,calls:a.renderer.info.render.calls,fps:document.querySelector('[data-testid=art-stage]').dataset.fps,renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'',largestCalls:Object.entries(drawCalls).sort((a,b)=>b[1]-a[1]).slice(0,12),largest:Object.entries(draws).sort((a,b)=>b[1]-a[1]).slice(0,18)};}""")
  if args.inspect:
   cdp.send('Network.setCacheDisabled',{'cacheDisabled':False})
   page.evaluate(api+'.game.finish()');page.locator('.game-result').wait_for();page.get_by_role('button',name='Menu chính',exact=True).click();page.get_by_role('button',name='Xem mô hình',exact=True).click()
   page.wait_for_selector('.art-canvas[aria-busy="false"]',timeout=90000);page.wait_for_timeout(1800)
   report['inspector']=capture();report['inspector']['additionalTransferBytes']=report['inspector']['networkTransferBytes']-report['race']['networkTransferBytes'];report['inspector']['cachePolicy']='Normal browser cache re-enabled for viewer transition'
  out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'publishedTreeMB':report['publishedTreeBytes']/1e6,'menuTransferMB':report['menu']['networkTransferBytes']/1e6,'raceTransferMB':report['race']['networkTransferBytes']/1e6,'draw':report['draw']}))
 finally:b.close()
