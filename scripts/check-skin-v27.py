"""Inspect actual face renders, variant changes and contact-preserving body detail."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import json,argparse
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',default='E:/AI/Um Tuk/asset-studio/hybrid-v27/skin');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900});errors=[]
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(args.url,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000)
 page.locator('#view').click();page.evaluate('illustratedPreview.seek(.15)');page.locator('#study-focus').select_option('face')
 for variant in range(12):
  page.locator('#study-face').select_option(str(variant));page.locator('#scene').screenshot(path=str(out/f'face-{variant}.png'))
 assert ImageChops.difference(Image.open(out/'face-0.png').convert('RGB'),Image.open(out/'face-5.png').convert('RGB')).getbbox()
 for posture in ['caller','controller','helm']:
  page.locator('#posture').select_option(posture);page.locator('#scene').screenshot(path=str(out/f'{posture}-face.png'))
 page.locator('#posture').select_option('seated');page.locator('#study-face').select_option('2');page.locator('#display-options summary').click();page.locator('#quality').click()
 page.locator('#scene').screenshot(path=str(out/'low-power-face.png'));page.locator('#quality').click();page.locator('#scene').screenshot(path=str(out/'textured-face.png'))
 assert ImageChops.difference(Image.open(out/'low-power-face.png').convert('RGB'),Image.open(out/'textured-face.png').convert('RGB')).getbbox()
 assert page.evaluate('illustratedPreview.stats.hybrid.geometryVariants')==12
 mesh=page.evaluate('''()=>{const g=illustratedPreview.hybrid.actors[0].skin.geometry,p=g.attributes.position,n=g.attributes.normal,z=g.attributes.paintZone,u=g.attributes.paintUV,seen=new Map();let duplicates=0,split=0;const min=[Infinity,Infinity],max=[-Infinity,-Infinity];for(let i=0;i<p.count;i++){if(z.getX(i)!==1)continue;for(let k=0;k<2;k++){min[k]=Math.min(min[k],u.getComponent(i,k));max[k]=Math.max(max[k],u.getComponent(i,k));}const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(','),normal=[n.getX(i),n.getY(i),n.getZ(i)];if(seen.has(key)){duplicates++;if(Math.max(...normal.map((v,k)=>Math.abs(v-seen.get(key)[k])))>.05)split++;}else seen.set(key,normal);}return{uvMin:min,uvMax:max,duplicates,splitSmoothNormals:split};}''')
 assert mesh['uvMax'][0]-mesh['uvMin'][0]>.5 and mesh['uvMax'][1]-mesh['uvMin'][1]>.5,mesh
 assert mesh['splitSmoothNormals']==0,mesh
 assert not errors,errors
 (out/'check.json').write_text(json.dumps({'actualShaderErrors':errors,'variantsInspected':12,'lowPowerDisablesSkinDetail':True,'runtimeSkinUVAndNormals':mesh,'physicalTabletTested':False},indent=2),encoding='utf8');print(str(out));browser.close()
