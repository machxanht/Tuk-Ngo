"""Render sourced Cambodian landmarks and flag cloth on the actual game page.
Desktop Edge with tablet-sized viewports; no physical-tablet FPS claim.
"""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--out',required=True)
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'url':args.url,'physicalTabletTested':False,'errors':[],'venues':{}}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1180,'height':820},has_touch=True,device_scale_factor=1)
 context.add_init_script("localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','phnom-penh');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));")
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m: report['errors'].append(m.text) if m.type=='error' and ('WebGL' in m.text or 'shader' in m.text) else None)
 try:
  page.goto(args.url)
  for city,ids in [('phnom-penh',['moonlight','throne-hall','silver-pagoda','national-museum']),('siem-reap',['royal-residence','royal-shrine','fcc-angkor'])]:
   page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+city+"'",timeout=120000)
   page.wait_for_function(api+'.river.group.userData.flags.textureLoaded',timeout=15000)
   data=page.evaluate(api+'.river.group.userData');assert not data['flags']['textureError'];assert data['flags']['count']>20
   assert data['geography']['waterWay']>0
   assert all(b[1]<=-19 and b[2]>=19 for b in data['geography']['bankSamples'])
   if city=='phnom-penh':assert max(b[2]-b[1] for b in data['geography']['bankSamples'])>500
   landmarks={l['id']:l for l in data['geography']['landmarks']}
   assert all(i in landmarks for i in ids)
   page.screenshot(path=str(out/(city+'-menu.png')))
   page.locator('.menu-visibility-toggle').click()
   page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
   def camera(target,position):
    page.evaluate('''a=>{const p='''+api+''';p.camera.fov=52;p.camera.clearViewOffset();p.camera.position.fromArray(a.position);p.controls.target.fromArray(a.target);p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();p.controls.update();p.setConstruction(p.assetSelection.constructionTypes);}''',{'position':position,'target':target});page.wait_for_timeout(700)
    actual=page.evaluate(api+'.controls.target.toArray()');assert max(abs(a-b) for a,b in zip(actual,target))<.1,(target,actual)
   for ident in ids:
    l=landmarks[ident];dist=125 if city=='phnom-penh' else 65
    camera([l['x'],16 if city=='phnom-penh' else 6,l['z']],[l['x']+dist*(.25 if city=='phnom-penh' else .9),32 if city=='phnom-penh' else 18,l['z']+dist*(1 if city=='phnom-penh' else .55)])
    page.screenshot(path=str(out/(city+'-'+ident+'.png')))
   first=landmarks[ids[0]]
   camera([first['x'],0,-90],[first['x']+180,310,280])
   page.screenshot(path=str(out/(city+'-overview.png')))
   flag=page.evaluate(api+".river.group.children.find(c=>c.name==='Cambodia_National_Flags').userData")
   before=flag['time'];page.wait_for_timeout(400);assert page.evaluate(api+".river.group.children.find(c=>c.name==='Cambodia_National_Flags').userData.time")>before
   report['venues'][city]={'geography':data['geography'],'flags':data['flags'],'render':page.evaluate(api+'.renderer.info.render'),'flagTimeAdvanced':True}
   page.locator('.menu-visibility-toggle').click()
   if city=='phnom-penh':page.get_by_label('Sân đấu',exact=True).select_option('siem-reap')
  assert not report['errors'],report['errors']
 finally:
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
