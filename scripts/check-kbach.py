"""Inspect the source-derived kbach on the actual animated hull and menu fleet."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4175/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/kbach/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True);errors=[];report={'url':args.url,'physicalTabletTested':False}
api="document.querySelector('[data-testid=art-stage]').boatPreview"
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url,wait_until='domcontentloaded');page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
 report['ceremony']=page.evaluate(api+'.ceremony.stats');assert report['ceremony']['kbach']['texture']==[2048,2048] and report['ceremony']['kbach']['designs']==39
 page.get_by_role('button',name='Ẩn menu',exact=True).tap();page.wait_for_function(api+".ceremony.stats.cameraShot==='athletes'",timeout=90000);page.screenshot(path=str(out/'ceremony.png'))
 page.get_by_role('button',name='Hiện menu',exact=True).tap();page.get_by_role('button',name='Xem mô hình',exact=True).tap();page.wait_for_selector('[data-render-mode="race"]',timeout=90000)
 page.get_by_role('button',name='Cả ghe 3D',exact=True).tap();page.wait_for_selector('[data-render-mode="boat"]',timeout=90000)
 page.get_by_role('button',name='Kbach từ clip',exact=True).tap();page.wait_for_timeout(200)
 page.get_by_role('button',name='Dừng',exact=True).tap();page.get_by_role('button',name='Cận hoa văn',exact=True).tap();page.wait_for_timeout(300)
 hull=api+".boat.getObjectByName('Hull_Watertight_30_20x1_12')"
 report['reference']=page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;let painted;a.boat.getObjectByName('Hull_Watertight_30_20x1_12').traverse(o=>{if(o.isMesh&&o.material.map)painted=o;});window.kbachMesh=painted;return {texture:[painted.material.map.image.width,painted.material.map.image.height],anisotropy:painted.material.map.anisotropy,flipY:painted.material.map.flipY,uuid:painted.material.map.uuid,rigs:a.rig.animation.stats,uvCount:painted.geometry.attributes.uv.count};}''')
 assert report['reference']['texture']==[4096,512] and not report['reference']['flipY'];assert page.get_by_role('button',name='Kbach từ clip',exact=True).get_attribute('aria-pressed')=='true'
 page.screenshot(path=str(out/'detail.png'))
 # Compare the pre-existing low-detail clip bitmap under the identical camera,
 # lighting, geometry and UVs. This is an isolated material diagnostic.
 page.evaluate('''async()=>{const m=window.kbachMesh;window.kbachNewMap=m.material.map;const image=new Image();image.src=new URL('assets/ghe-ngo/kbach-from-reference.webp',location.href).href;await image.decode();const old=m.material.map.clone();old.image=image;old.needsUpdate=true;m.material.map=old;window.kbachOldMap=old;}''');page.wait_for_timeout(150);page.screenshot(path=str(out/'detail-before.png'))
 page.evaluate('()=>{window.kbachMesh.material.map=window.kbachNewMap;window.kbachOldMap.dispose();}');page.wait_for_timeout(150)
 page.get_by_role('button',name='Màu đội Tum Núp 2',exact=True).tap();page.wait_for_timeout(150);assert page.evaluate('window.kbachMesh.material.map.uuid')!=report['reference']['uuid']
 page.get_by_role('button',name='Kbach từ clip',exact=True).tap();page.wait_for_timeout(150);assert page.evaluate('window.kbachMesh.material.map.uuid')==report['reference']['uuid']
 report['switchReusesTexture']=True
 for name in ['Toàn ghe','Đầu ghe']:
  page.get_by_role('button',name=name,exact=True).tap();page.wait_for_timeout(200);page.screenshot(path=str(out/('boat.png' if name=='Toàn ghe' else 'bow.png')))
 report['viewports']=[]
 for w,h in [(768,1024),(1180,430),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for name in ['Kbach từ clip','Màu đội Tum Núp 2']:
   box=page.get_by_role('button',name=name,exact=True).bounding_box();assert box['height']>=43.99 and box['x']>=0 and box['x']+box['width']<=w+.01
  assert page.get_by_test_id('art-stage').bounding_box()['height']>=160
  page.screenshot(path=str(out/f'boat-{w}x{h}.png'));report['viewports'].append([w,h])
 response=page.request.get(args.url+'assets/ghe-ngo/kbach-master.svg');assert response.ok and '<image' not in response.text() and 'source SHA256' in response.text();report['svgBytes']=len(response.body())
 report['comparison']='same camera and hull; old original clip bitmap vs source-contour master'
 report['errors']=errors;assert not errors,errors;report['passed']=True;browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'passed':True,'texture':report['reference']['texture'],'viewports':len(report['viewports']),'errors':errors}))
