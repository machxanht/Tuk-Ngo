"""Inspect the referenced opening formation and all six moving camera angles."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4175/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/opening-ceremony/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);errors=[];api="document.querySelector('[data-testid=art-stage]').boatPreview";report={'url':args.url,'physicalTabletTested':False}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
 report['ceremony']=page.evaluate(api+'.ceremony.stats');report['world']=page.evaluate(api+'.river.group.userData')
 assert report['ceremony']['handheldCaps']==3050 and report['ceremony']['capColors']==8 and report['ceremony']['saluteVariants']==2
 assert report['world']['traffic']['count']==1280
 assert report['world']['buildings']['activityCounts']['walk']>4000
 assert report['world']['banners']['count']>70 and report['world']['banners']['textureCount']<report['world']['banners']['count']/2
 assert report['world']['flotsam']['hyacinthPatches']==32 and report['world']['flotsam']['fallenBananaStems']==8
 caps=api+".ceremony.group.getObjectByName('Ceremony_Handheld_Baseball_Caps')"
 before=page.evaluate(caps+'.instanceMatrix.array.slice(0,16)');floating=page.evaluate(api+'.river.flotsam.stats.samples[0].x');page.wait_for_timeout(700)
 assert before!=page.evaluate(caps+'.instanceMatrix.array.slice(0,16)');assert floating!=page.evaluate(api+'.river.flotsam.stats.samples[0].x')
 report['pinkCanopyVertices']=page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;let n=0;a.river.group.traverse(o=>{if(!o.name.startsWith('Festival_Tree_'))return;const c=o.geometry?.attributes.color;if(c)for(let i=0;i<c.count;i++)if(c.getX(i)>.45&&c.getZ(i)>.25&&c.getY(i)<c.getX(i)*.7)n++;});return n;}''');assert report['pinkCanopyVertices']==0
 report['shots']=[]
 for name in ['fleet','grandstand','right-crowd','athletes','left-crowd','aerial']:
  page.wait_for_function(api+f".ceremony.stats.cameraShot==='{name}'",timeout=90000)
  page.wait_for_timeout(250);page.screenshot(path=str(out/(name+'.png')))
  report['shots'].append(page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;return {name:a.ceremony.stats.cameraShot,seconds:a.ceremony.stats.cameraSeconds,position:a.camera.position.toArray(),target:a.controls.target.toArray(),calls:a.renderer.info.render.calls,triangles:a.renderer.info.render.triangles};}'''))
 for w,h in [(768,1024),(1180,430),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'menu-{w}x{h}.png'))
 report['errors']=errors;assert not errors,errors;report['passed']=True;browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'shots':len(report['shots']),'caps':3050,'traffic':1280,'walking':report['world']['buildings']['activityCounts']['walk'],'banners':report['world']['banners']['count'],'errors':errors}))
