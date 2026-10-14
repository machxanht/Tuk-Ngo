"""Read-only pixel analysis + optional byte-identical atlas copy and browser QA."""
import argparse,asyncio,base64,hashlib,json,shutil,subprocess,time
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

EXPECTED='c8cd22fc2afc2aaeae2e6dbf5b09bce29897765dfaeb062bb9497333f2e292d6'
def build_metadata(repo,source):
 folder=Path(repo)/'public/assets/illustrated-v22';raw=Path(source).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
 target=folder/'spectators-action-v32.png';shutil.copyfile(source,target);assert target.read_bytes()==raw
 im=Image.open(target);assert im.mode=='RGBA' and im.size==(1024,1536);alpha=np.array(im.getchannel('A'));assert (int(alpha.min()),int(alpha.max()))==(0,254)
 components=[]
 for col in range(4):
  mask=alpha[:,col*256:(col+1)*256]>32;seen=np.zeros(mask.shape,dtype=bool);column=[]
  for yy,xx in zip(*np.nonzero(mask)):
   if seen[yy,xx]:continue
   todo=deque([(int(xx),int(yy))]);seen[yy,xx]=True;xs=[];ys=[]
   while todo:
    x,y=todo.popleft();xs.append(x+col*256);ys.append(y)
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
     nx=x+dx;ny=y+dy
     if 0<=nx<256 and 0<=ny<1536 and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;todo.append((nx,ny))
   if len(xs)>1000:column.append({'xs':np.array(xs),'ys':np.array(ys),'area':len(xs)})
  column.sort(key=lambda v:int(v['ys'].min()));assert len(column)==4
  for row,c in enumerate(column):c.update(row=row,col=col);components.append(c)
 cells=[]
 for c in sorted(components,key=lambda c:(c['row'],c['col'])):
  xs,ys=c['xs'],c['ys'];x0=max(c['col']*256,int(xs.min())-2);x1=min((c['col']+1)*256,int(xs.max())+3);y0=max(0,int(ys.min())-2);y1=min(1536,int(ys.max())+3)
  foot=ys>=int(ys.max())-7;weights=alpha[ys[foot],xs[foot]].astype(float);anchorX=float(np.average(xs[foot]+.5,weights=weights));anchorY=int(ys.max())+1
  # An expanded row-span contour excludes other figures whose hands/feet overlap Y.
  overlaps=[];foreignX=[];foreignY=[]
  for other in components:
   if other is c:continue
   inside=(other['xs']>=x0-2)&(other['xs']<x1+2)&(other['ys']>=y0-2)&(other['ys']<y1+2)
   if inside.any():
    overlaps.append({'row':other['row'],'col':other['col'],'pixels':int(inside.sum())});foreignX.extend(other['xs'][inside].tolist());foreignY.extend(other['ys'][inside].tolist())
  foreignX=np.array(foreignX);foreignY=np.array(foreignY);spans=[]
  if overlaps:
   for y in range(y0,y1):
    coverage=np.zeros(x1-x0,dtype=bool);near=np.abs(ys-y)<=2
    for x in np.unique(xs[near]):coverage[max(0,int(x)-x0-2):min(x1-x0,int(x)-x0+3)]=True
    for x in np.unique(foreignX[np.abs(foreignY-y)<=1]):coverage[max(0,int(x)-x0-1):min(x1-x0,int(x)-x0+2)]=False
    coverage[xs[ys==y]-x0]=True
    padded=np.r_[False,coverage,False];starts=np.flatnonzero(np.diff(padded.astype(int))==1);ends=np.flatnonzero(np.diff(padded.astype(int))==-1)
    spans.extend([[y-y0,int(left),int(right)]for left,right in zip(starts,ends)])
  cells.append({'rect':[x0,y0,x1-x0,y1-y0],'anchor':[round(anchorX-x0,3),anchorY-y0],'bounds':[int(xs.min())-x0,int(ys.min())-y0,int(xs.max())+1-x0,int(ys.max())+1-y0],'height':int(ys.max())+1-int(ys.min()),'row':c['row'],'col':c['col'],'clipRows':spans if overlaps else None,'overlappingForeignPixels':overlaps})
 identities=[{'id':0,'name':'raspberry blouse woman overhead clap','facing':'front','relativeScale':1,'action':'overhead-clap','poses':[0,1,2,3]},{'id':1,'name':'mustard polo man wave','facing':'front','relativeScale':1,'action':'wave','poses':[4,5,6,7]},{'id':2,'name':'teal blouse woman photograph rear','facing':'back','relativeScale':1,'action':'photograph','poses':[8,9,10,11]},{'id':3,'name':'blue tee child yellow shorts cheer','facing':'front','relativeScale':.75,'action':'child-cheer','poses':[12,13,14,15]}]
 metadata={'file':target.name,'runtime':target.name,'sha256':EXPECTED,'size':list(im.size),'poseCount':4,'cells':cells,'identities':identities,'extraction':'Alpha connected components >32; bbox padded2px; expanded row-span clips only when foreign component intersects bbox; original PNG unchanged','alphaRange':[0,254]}
 (folder/'spectators-action-v32-atlas.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({'cells':len(cells),'identities':len(identities),'clippedCells':[i for i,c in enumerate(cells)if c['clipRows']],'pngUnchanged':True,'sha256':EXPECTED},indent=2))

async def browser_check(args):
 output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
 node="import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';const path='public/assets/illustrated-v22/festival-scene.js',config=fs.readFileSync('public/assets/illustrated-v22/scene-config.js','utf8');function read(s){const c={Math};c.window=c;vm.createContext(c);vm.runInContext(config,c);vm.runInContext(s,c);return c.festivalScene;}const a=read(execFileSync('git',['show','HEAD:'+path],{encoding:'utf8'})),b=read(fs.readFileSync(path,'utf8')),pack=s=>JSON.stringify([s.crowds,s.walkers,s.traffic,s.stalls]),old=pack(a),now=pack(b);const times=[0,2,6,13],motionSame=b.crowds.every(p=>b.identityAt(p)>=24||times.every(t=>JSON.stringify(a.motionAt(p,t,.4))===JSON.stringify(b.motionAt(p,t,.4))));const coverage={};for(let id=24;id<28;id++){const p=b.crowds.find(p=>b.identityAt(p)===id),frames=new Set();for(let t=0;t<60;t+=.05)frames.add(b.motionAt(p,t,1).frame);coverage[id]=[...frames].sort();if(coverage[id].length!==4)throw Error('Missing source phase '+id);}console.log(JSON.stringify({unchanged:old===now,oldProfilesMotionUnchanged:motionSame,actionFrameCoverage:coverage,sha256:createHash('sha256').update(now).digest('hex')}));if(old!==now||!motionSame)process.exitCode=1;"
 preservation=json.loads(subprocess.run(['node','--input-type=module','-e',node],cwd=args.repo,capture_output=True,text=True,check=True).stdout)
 report={'placements':preservation,'viewports':[]}
 assert hashlib.sha256((Path(args.repo)/'public/assets/illustrated-v22/spectators-action-v32.png').read_bytes()).hexdigest()==EXPECTED
 async with async_playwright() as p:
  browser=await p.chromium.launch(channel='msedge',headless=True,args=['--ignore-gpu-blocklist','--use-angle=d3d11'])
  for name,width,height in [('desktop',1440,1080),('tablet',1024,768)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("window.crowdQA={bad:[],originals:{}};for(const name of ['translate','scale','transform','setTransform','drawImage']){const fn=CanvasRenderingContext2D.prototype[name];crowdQA.originals[name]=fn;CanvasRenderingContext2D.prototype[name]=function(...a){if(a.some(v=>typeof v==='number'&&!Number.isFinite(v)))crowdQA.bad.push(name);return fn.apply(this,a);};}")
   async def expose_raster(route):
    response=await route.fetch();body=await response.text();body=body.replace('window.festivalScene={','window._crowdRaster=personRaster;window.festivalScene={');await route.fulfill(response=response,body=body)
   await page.route('**/festival-scene.js*',expose_raster)
   await page.goto(args.url);await page.wait_for_function("document.body.dataset.ready==='true'",timeout=120000)
   for t in [2,6]:await page.evaluate(f'illustratedPreview.seek({t})');await page.screenshot(path=str(output/f'{name}-time{t}.png'))
   data=await page.evaluate("()=>({spectators:festivalScene.crowds.length,walkers:festivalScene.walkers.length,traffic:festivalScene.traffic.length,stalls:festivalScene.stalls.length,uniqueSourceIds:[...new Set(festivalScene.crowds.map(p=>festivalScene.identityAt(p)))].sort((a,b)=>a-b),identities:festivalScene.stats.identities,mix:festivalScene.stats.identityMix,bad:window.crowdQA.bad})")
   if name=='desktop':
    for sprite_height in [110,220]:
     gallery=await page.evaluate('''height=>{const c=document.createElement('canvas'),w=height===110?160:256,h=height===110?170:300;c.width=w*4;c.height=h*4;const ctx=c.getContext('2d'),checks=[];ctx.fillStyle='#e8eee7';ctx.fillRect(0,0,c.width,c.height);for(let id=24;id<28;id++){const source=festivalScene.crowds.find(p=>festivalScene.identityAt(p)===id);for(let f=0;f<4;f++){const p={...source,height},r=window._crowdRaster(p,f),i=(id-24)*4+f,x=(i%4)*w+w/2,y=Math.floor(i/4)*h+h-15,atlas=festivalScene.groups.spectatorsAction,cell=atlas.cells[(id-24)*4+f],relative=atlas.identities[id-24].relativeScale,quant=Math.round(height*relative/4)*4,scale=quant/Math.max(...atlas.cells.slice((id-24)*4,(id-24)*4+4).map(c=>c.height));ctx.fillStyle='#486055';ctx.font='12px sans-serif';ctx.fillText('ID '+id+' pose '+f,x-w/2+8,y-h+30);ctx.strokeStyle='#7c9785';ctx.beginPath();ctx.moveTo(x-35,y);ctx.lineTo(x+35,y);ctx.stroke();ctx.drawImage(r.image,x+r.x,y+r.y);checks.push({id,pose:f,footAnchorError:Math.max(Math.abs(1+cell.anchor[0]*scale+r.x),Math.abs(1+cell.anchor[1]*scale+r.y)),raster:[r.image.width,r.image.height]});}}return{image:c.toDataURL(),checks};}''',sprite_height)
     (output/f'sprites-actions-{sprite_height}.png').write_bytes(base64.b64decode(gallery['image'].split(',')[1]));report[f'sprites{sprite_height}']=gallery['checks'];assert max(c['footAnchorError']for c in gallery['checks'])<1e-8
   data['adjacentRepeatRate']=await page.evaluate('''()=>{let same=0,pairs=0;for(let i=1;i<festivalScene.crowds.length;i++){const a=festivalScene.crowds[i-1],b=festivalScene.crowds[i];if(a.bank===b.bank&&Math.abs(a.x-b.x)<60&&Math.abs(a.y-b.y)<15){pairs++;if(festivalScene.identityAt(a)===festivalScene.identityAt(b))same++;}}return{pairs,same,rate:same/pairs};}''')
   await page.evaluate('for(const [key,value]of Object.entries(crowdQA.originals))CanvasRenderingContext2D.prototype[key]=value;illustratedPreview.play()');before=await page.evaluate('illustratedPreview.stats.renderedFrames');started=time.perf_counter();await page.wait_for_timeout(5000);after=await page.evaluate('illustratedPreview.stats.renderedFrames');elapsed=time.perf_counter()-started
   data.update(viewport=name,size=[width,height],frames=after-before,measuredFPS=round((after-before)/elapsed,2),pageErrors=errors);report['viewports'].append(data);assert data['spectators']==1949 and data['identities']==28 and len(data['uniqueSourceIds'])==28 and data['walkers']==64 and data['traffic']==16 and data['stalls']==10 and not data['bad'] and not errors,json.dumps(data);await page.close()
  await browser.close()
 (output/'report.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({'placements':report['placements'],'viewports':[{k:v[k]for k in ['viewport','spectators','identities','measuredFPS','pageErrors','adjacentRepeatRate']}for v in report['viewports']],'maxFootAnchorError':max(c['footAnchorError']for key in ['sprites110','sprites220']for c in report[key])},indent=2))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--repo',default=str(Path(__file__).resolve().parents[1]));parser.add_argument('--source',default='C:/Users/OliverkhangPC/.codex/generated_images/01a129e6-456f-7f71-8c83-228b43dadf95/exec-d53c70f7-ddc8-4c14-8649-27e321c7f496.png');parser.add_argument('--build-metadata',action='store_true');parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--output',default='E:/AI/Um Tuk/asset-studio/crowd-actions-v32/qa');args=parser.parse_args()
 if args.build_metadata:build_metadata(args.repo,args.source)
 else:asyncio.run(browser_check(args))
