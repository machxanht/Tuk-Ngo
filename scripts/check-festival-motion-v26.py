"""Direct browser checks for the painted festival renderer; no bitmap writes."""
import argparse,asyncio,json,subprocess,time
from pathlib import Path
from playwright.async_api import async_playwright

async def main(args):
 output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
 node=r'''import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';const path='public/assets/illustrated-v22/festival-scene.js',config=fs.readFileSync('public/assets/illustrated-v22/scene-config.js','utf8');function read(source){const c={Math};c.window=c;vm.createContext(c);vm.runInContext(config,c);vm.runInContext(source,c);return c.festivalScene;}const old=read(execFileSync('git',['show','HEAD:'+path],{encoding:'utf8'})),now=read(fs.readFileSync(path,'utf8'));const data=s=>JSON.stringify([s.crowds,s.walkers,s.traffic,s.stalls]),a=data(old),b=data(now);console.log(JSON.stringify({placementsUnchanged:a===b,placementSHA256:createHash('sha256').update(b).digest('hex'),spectators:now.crowds.length,walkers:now.walkers.length,traffic:now.traffic.length,stalls:now.stalls.length}));if(a!==b||now.crowds.length!==1949)process.exitCode=1;'''
 check=subprocess.run(['node','--input-type=module','-e',node],cwd=args.repo,capture_output=True,text=True,check=True)
 report={'placement':json.loads(check.stdout),'viewports':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(channel='msedge',headless=True,args=['--ignore-gpu-blocklist','--use-angle=d3d11'])
  for name,width,height in [('desktop',1440,1080),('tablet',1024,768)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   await page.add_init_script('''window.motionQA={nonFinite:[],calls:0};window.motionQA.originals={};for(const key of ['translate','scale','transform','setTransform','drawImage']){const original=CanvasRenderingContext2D.prototype[key];motionQA.originals[key]=original;CanvasRenderingContext2D.prototype[key]=function(...args){motionQA.calls++;if(args.some(v=>typeof v==='number'&&!Number.isFinite(v)))motionQA.nonFinite.push(key);return original.apply(this,args);};}''')
   await page.goto(args.url,wait_until='domcontentloaded');await page.wait_for_function("document.body.dataset.ready==='true'",timeout=120000)
   await page.evaluate("festivalScene.setActivity(.4);illustratedPreview.seek(2)")
   await page.screenshot(path=str(output/f'{name}-time2.png'),full_page=False)
   await page.evaluate("illustratedPreview.seek(6)")
   await page.screenshot(path=str(output/f'{name}-time6.png'),full_page=False)
   data=await page.evaluate('''()=>{const points=festivalScene.crowds,counts={};for(const value of [0,.4,1]){counts[value]=[0,2,6,13,31].map(t=>points.filter(p=>festivalScene.motionAt(p,t,value).frame===1).length);}const motions=points.flatMap(p=>[0,2,6,13].map(t=>festivalScene.motionAt(p,t,1)));const finite=motions.every(m=>Object.values(m).every(Number.isFinite));const bounds=[festivalScene.setActivity(-2),festivalScene.setActivity(2),festivalScene.setActivity(NaN)];festivalScene.setActivity(.4);return{spectators:points.length,sourcePoseFrames:festivalScene.stats.sourcePoseFrames,counts,motionsFinite:finite,activityBounds:bounds,nonFiniteDraws:motionQA.nonFinite,calls:motionQA.calls,renderSize:illustratedPreview.stats.renderSize};}''')
   # Restore native methods so instrumentation does not skew the rendering rate.
   await page.evaluate("for(const [key,value]of Object.entries(motionQA.originals))CanvasRenderingContext2D.prototype[key]=value;illustratedPreview.play();")
   await page.wait_for_timeout(500)
   before=await page.evaluate('illustratedPreview.stats.renderedFrames');started=time.perf_counter();await page.wait_for_timeout(5000);after=await page.evaluate('illustratedPreview.stats.renderedFrames');elapsed=time.perf_counter()-started
   data.update({'viewport':name,'size':[width,height],'measuredFPS':round((after-before)/elapsed,2),'measurementSeconds':round(elapsed,3),'frames':after-before,'pageErrors':errors})
   assert data['spectators']==1949 and data['motionsFinite'] and not data['nonFiniteDraws'] and not errors,json.dumps(data)
   report['viewports'].append(data);await page.close()
  await browser.close()
 (output/'report.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report,indent=2))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--repo',default=str(Path(__file__).resolve().parents[1]));parser.add_argument('--output',default='E:/AI/Um Tuk/asset-studio/festival-motion-v26');asyncio.run(main(parser.parse_args()))
