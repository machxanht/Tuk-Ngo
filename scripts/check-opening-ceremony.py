"""Inspect the referenced opening formation and all six moving camera angles."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4175/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/opening-ceremony/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);errors=[];api="document.querySelector('[data-testid=art-stage]').boatPreview";report={'url':args.url,'physicalTabletTested':False}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url,wait_until='domcontentloaded')
 try:page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
 except Exception:
  page.screenshot(path=str(out/'loading-diagnostic.png'));(out/'loading-diagnostic.json').write_text(json.dumps({'errors':errors,'text':page.locator('body').inner_text()},ensure_ascii=False,indent=2),encoding='utf-8');raise
 report['ceremony']=page.evaluate(api+'.ceremony.stats');report['world']=page.evaluate(api+'.river.group.userData')
 assert report['ceremony']['handheldCaps']==3050 and report['ceremony']['capColors']==8 and report['ceremony']['saluteVariants']==2
 assert report['ceremony']['hair']['styles']==4 and report['ceremony']['hair']['vertices']>=60
 assert 'irregular' in report['ceremony']['formation']
 assert report['world']['finishWaterCrowd']['count']>500 and report['world']['finishWaterCrowd']['raceProgressM']==[1000,1200]
 assert report['world']['traffic']['count']==1280
 assert report['world']['buildings']['activityCounts']['walk']>4000
 assert report['world']['banners']['count']>70 and report['world']['banners']['textureCount']<report['world']['banners']['count']/2
 assert report['world']['flotsam']['hyacinthPatches']==32 and report['world']['flotsam']['fallenBananaStems']==8
 caps=api+".ceremony.group.getObjectByName('Ceremony_Handheld_Baseball_Caps')"
 before=page.evaluate(caps+'.instanceMatrix.array.slice(0,16)');floating=page.evaluate(api+'.river.flotsam.stats.samples[0].x');page.wait_for_timeout(700)
 assert before!=page.evaluate(caps+'.instanceMatrix.array.slice(0,16)');assert floating!=page.evaluate(api+'.river.flotsam.stats.samples[0].x')
 report['pinkCanopyVertices']=page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;let n=0;a.river.group.traverse(o=>{if(!o.name.startsWith('Festival_Tree_'))return;const c=o.geometry?.attributes.color;if(c)for(let i=0;i<c.count;i++)if(c.getX(i)>.45&&c.getZ(i)>.25&&c.getY(i)<c.getX(i)*.7)n++;});return n;}''');assert report['pinkCanopyVertices']==0
 for language,hide,show in [('vi','Ẩn menu','Hiện menu'),('km','លាក់ម៉ឺនុយ','បង្ហាញម៉ឺនុយ')]:
  page.get_by_role('button',name='VI' if language=='vi' else 'ខ្មែរ',exact=True).tap()
  toggle=page.get_by_role('button',name=hide,exact=True);assert toggle.get_attribute('aria-expanded')=='true';toggle.tap()
  assert not page.get_by_test_id('main-menu').is_visible() and not page.locator('.game-heading').is_visible()
  assert abs(page.locator('.game-stage').bounding_box()['height']-820)<1
  page.get_by_role('button',name=show,exact=True).wait_for();page.keyboard.press('Escape');assert page.get_by_test_id('main-menu').is_visible()
 page.get_by_role('button',name='VI',exact=True).tap();page.get_by_role('button',name='Ẩn menu',exact=True).tap()
 page.wait_for_function(api+'.menuMusic.stats().playing',timeout=15000);music=page.evaluate(api+'.menuMusic.stats().time');camera=page.evaluate(api+'.ceremony.stats.cameraSeconds');page.wait_for_timeout(600)
 assert page.evaluate(api+'.menuMusic.stats().time')>music and page.evaluate(api+'.ceremony.stats.cameraSeconds')>camera
 report['cinema']={'bothLanguages':True,'escapeRestores':True,'musicAndCameraContinue':True,'fullHeight':True}
 report['shots']=[]
 names=['fleet','grandstand','right-crowd','athletes','left-crowd','aerial'];start=names.index(page.evaluate(api+'.ceremony.stats.cameraShot'))
 for name in names[start:]+names[:start]:
  page.wait_for_function(api+f".ceremony.stats.cameraShot==='{name}'",timeout=90000)
  page.wait_for_timeout(250);page.screenshot(path=str(out/(name+'.png')))
  report['shots'].append(page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;return {name:a.ceremony.stats.cameraShot,seconds:a.ceremony.stats.cameraSeconds,position:a.camera.position.toArray(),target:a.controls.target.toArray(),calls:a.renderer.info.render.calls,triangles:a.renderer.info.render.triangles};}'''))
 for w,h in [(768,1024),(1180,430),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert abs(page.locator('.game-stage').bounding_box()['height']-h)<1
  # CSS reports 44px; a transitioning translateY can yield 43.999998px in DOMRect.
  box=page.get_by_role('button',name='Hiện menu',exact=True).bounding_box();assert box['height']>=44-.01 and box['x']>=0 and box['x']+box['width']<=w+.01
  page.screenshot(path=str(out/f'cinema-{w}x{h}.png'));page.get_by_role('button',name='Hiện menu',exact=True).tap();assert page.get_by_test_id('main-menu').is_visible();page.screenshot(path=str(out/f'menu-{w}x{h}.png'));page.get_by_role('button',name='Ẩn menu',exact=True).tap()
 page.get_by_role('button',name='Hiện menu',exact=True).tap();page.set_viewport_size({'width':1180,'height':820})
 page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).tap();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).tap();page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).tap();page.wait_for_function(api+".game.state.phase==='racing'")
 page.locator('.game-pause').tap();page.add_style_tag(content='.game-pause-dialog{visibility:hidden}')
 page.wait_for_timeout(180)
 for side in [-1,1]:
  page.evaluate('''side=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,p=a.river.group.userData.finishWaterCrowd.samples.find(s=>s.z*side>0&&s.x>1130&&s.x<1250);a.controls.target.set(p.x,.65,p.z);a.camera.position.set(p.x-4,1.8,p.z-side*5);a.camera.fov=49;a.camera.updateProjectionMatrix();a.controls.update();}''',side)
  page.wait_for_timeout(250);page.screenshot(path=str(out/('water-crowd-right.png' if side<0 else 'water-crowd-left.png')))
 report['wadingViews']='paused diagnostic camera, pause dialog hidden; actual in-world crowd and water'
 report['errors']=errors;assert not errors,errors;report['passed']=True;browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'shots':len(report['shots']),'caps':3050,'traffic':1280,'walking':report['world']['buildings']['activityCounts']['walk'],'banners':report['world']['banners']['count'],'errors':errors}))
