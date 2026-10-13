"""Verify the fitted garment uses anatomical positions/weights across real poses."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000);page.locator('#view').click()
 for posture in ['caller','controller','standing','seated']:
  page.locator('#posture').select_option(posture)
  for phase in [0,.25,.5,.75]:page.evaluate('(phase)=>illustratedPreview.seek(phase*.75)',phase);page.locator('#scene').screenshot(path=str(out/f'{posture}-{phase}.png'))
 report=page.evaluate('''()=>{
 const h=illustratedPreview.hybrid,results=[];
 for(const a of h.actors.filter(a=>a.role==='caller'||a.role==='controller'||(a.role==='rower'&&[2,18].includes(a.id)))){
  const g=a.skin.geometry,p=g.attributes.position,z=g.attributes.paintZone,j=g.attributes.skinIndex,w=g.attributes.skinWeight,used=[...new Set(g.index.array)],body=used.filter(i=>z.getX(i)===1),cloth=used.filter(i=>z.getX(i)===7),pairs=[];let restGap=0,weightDifference=0;
  for(const i of cloth){let closest=-1,distance=Infinity;for(const k of body){const d=(p.getX(i)-p.getX(k))**2+(p.getY(i)-p.getY(k))**2+(p.getZ(i)-p.getZ(k))**2;if(d<distance){distance=d;closest=k;}}pairs.push([i,closest]);restGap=Math.max(restGap,Math.sqrt(distance));for(let k=0;k<4;k++){if(j.getComponent(i,k)!==j.getComponent(closest,k))weightDifference=Infinity;weightDifference=Math.max(weightDifference,Math.abs(w.getComponent(i,k)-w.getComponent(closest,k)));}}
  let poseGap=0;
  for(let step=0;step<17;step++){h.render(step/17,step/17,{teamId:'tum-nup-2'});for(const [i,k]of pairs){const one=a.skin.getVertexPosition(i,a.group.position.clone()),two=a.skin.getVertexPosition(k,a.group.position.clone());poseGap=Math.max(poseGap,one.distanceTo(two));}}
  results.push({id:a.id,role:a.role,posture:a.posture,clothVertices:cloth.length,maxRestGapM:restGap,maxPosedGapM:poseGap,skinWeightDifference:weightDifference});
 }
 return results;
 }''')
 assert all(r['clothVertices']>0 and r['maxRestGapM']<.006 and r['maxPosedGapM']<.006 and r['skinWeightDifference']==0 for r in report),report;assert not errors,errors
 (out/'check.json').write_text(json.dumps({'url':args.url,'garmentFit':report,'posesPerActor':17,'errors':errors},indent=2),encoding='utf8');print(json.dumps(report));browser.close()
