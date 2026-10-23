"""Inspect real instanced crowds, traffic and backyard vegetation in the game."""
import argparse, base64, json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--out', default='docs/qa/gameplay-polish/local')
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True, args=['--enable-unsafe-swiftshader'])
    try:
        page = browser.new_page(viewport={'width':1180,'height':820}, has_touch=True)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.goto(args.url)
        page.wait_for_selector('[data-boat-count="61"]', timeout=90000)
        report = page.evaluate("""()=>{
          const a=document.querySelector('[data-testid=art-stage]').boatPreview;
          a.river.update(40,1120,-70);
          const world=a.river.group.userData;
          const groves=[],outfits=new Set(),faces=new Set();
          a.river.group.traverse(o=>{
            if(o.name.startsWith('Festival_Backyard_Grove_'))groves.push(o.count);
            if(o.name.startsWith('FestivalNPC_')&&o.count){
              const style=o.geometry.attributes.aStyle,tint=o.geometry.attributes.aTint;
              for(let i=0;i<o.count;i++){
                faces.add(style.getW(i).toFixed(3));
                outfits.add([tint.getX(i),tint.getY(i),tint.getZ(i),style.getZ(i)].join(':'));
              }
            }
          });
          return {spectators:world.spectators,traffic:world.traffic,buildings:world.buildings,
            crowd:world.crowd,backyardInstances:groves.reduce((n,c)=>n+c,0),
            visibleOutfits:outfits.size,visibleFaceShapes:faces.size,ceremony:a.ceremony.stats};
        }""")
        assert report['traffic']['count'] >= 4000
        assert report['traffic']['visible'] >= 400
        assert len(report['traffic']['types']) == 8
        assert report['buildings']['backyardTrees'] >= 1000
        assert report['buildings']['roadsidePeople'] >= 5000
        assert report['spectators'] >= 50000
        assert report['crowd']['variantCount'] == 11
        assert report['visibleOutfits'] > 100
        assert report['visibleFaceShapes'] > 100
        road=min(report['traffic']['samples'],key=lambda v:abs(v['x']-1180))
        for name, position, target in [
            ('street-density',[road['x']+30,11,road['z']+13],[road['x']-20,2.2,road['z']]),
            ('backyard-canopy',[1185,52,-83],[1110,1,-157]),
        ]:
            encoded = page.evaluate("""({position,target})=>{
              const a=document.querySelector('[data-testid=art-stage]').boatPreview,c=a.camera.clone();
              c.position.set(...position);c.fov=54;c.lookAt(...target);c.updateProjectionMatrix();
              a.river.update(42,position[0],position[2]);a.renderer.render(a.scene,c);
              return a.renderer.domElement.toDataURL('image/png');
            }""", {'position':position,'target':target})
            (out/(name+'.png')).write_bytes(base64.b64decode(encoded.split(',')[1]))
        assert not errors, errors
        report['errors'] = errors
        report['physicalTabletTested'] = False
        (out/'density-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'passed':True,'spectators':report['spectators'],
            'vehicles':report['traffic']['count'],'backyardTrees':report['buildings']['backyardTrees'],
            'roadsidePeople':report['buildings']['roadsidePeople'],'errors':errors}))
    finally:
        browser.close()
