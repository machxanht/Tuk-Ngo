"""Real game and standalone GLB inspection in Edge; no mocked rendering."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4256/assets/illustrated-v22/')
parser.add_argument('--studio',default='http://127.0.0.1:4173/Tuk-Ngo/?demo=art')
parser.add_argument('--out',default='docs/qa/athlete-master/browser')
parser.add_argument('--record',action='store_true')
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
errors=[];report={'physicalTabletTested':False}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' else None)
    page.goto(args.url)
    page.wait_for_selector('body[data-ready=true]',timeout=90000)
    report['geometry']=page.evaluate('''()=>{
      const h=illustratedPreview.hybrid,representatives=Object.keys(h.roles).map(name=>h.actors.find(a=>a.master===h.roles[name]));
      const point=h.actors[0].group.position.clone(),footIndices=new Map(),result={};
      for(const a of representatives){const g=a.skin.geometry,indices=g.attributes.skinIndex,weights=g.attributes.skinWeight,feet=[];
       for(let i=0;i<indices.count;i++){let w=0;for(let j=0;j<4;j++)if(/^(foot|ball|toe)_/.test(a.master.skeleton.bones[indices.getComponent(i,j)].name))w+=weights.getComponent(i,j);if(w>.65)feet.push(i);}
       footIndices.set(a,feet);
      }
      for(let phase=0;phase<1;phase+=1/12){h.render(phase,phase,{nearest:true});for(const a of representatives){
       const name=Object.keys(h.roles).find(name=>a.master===h.roles[name]),r=result[name]||{footClearanceM:[Infinity,-Infinity],paddleLengthM:null,maxWristAxisDistanceM:0,maxPalmGripGapM:0};
       let min=Infinity;for(const i of footIndices.get(a)){a.skin.getVertexPosition(i,point).applyMatrix4(a.group.matrixWorld);min=Math.min(min,point.y-a.footing);}
       r.footClearanceM=[Math.min(r.footClearanceM[0],min),Math.max(r.footClearanceM[1],min)];
       if(a.paddle){const paddle=a.paddle.getObjectByName('Race_Paddle');paddle.geometry.computeBoundingBox();r.paddleLengthM=-paddle.geometry.boundingBox.min.y;
        const inverse=a.paddle.matrixWorld.clone().invert(),grips=[];for(const side of ['l','r']){const bone=a.master.skeleton.bones.find(b=>b.name==='hand_'+side),middle=a.master.skeleton.bones.find(b=>b.name==='middle_01_'+side);bone.getWorldPosition(point).applyMatrix4(a.group.matrixWorld).applyMatrix4(inverse);r.maxWristAxisDistanceM=Math.max(r.maxWristAxisDistanceM,Math.hypot(point.x,point.z));const palm=bone.getWorldPosition(point).lerp(middle.getWorldPosition(point.clone()),.9).applyMatrix4(a.group.matrixWorld).applyMatrix4(inverse);grips.push([palm.distanceTo(point.clone().set(0,0,0)),palm.distanceTo(point.clone().set(0,-.53,0))]);}r.maxPalmGripGapM=Math.max(r.maxPalmGripGapM,Math.min(Math.max(grips[0][0],grips[1][1]),Math.max(grips[0][1],grips[1][0])));
       }result[name]=r;
      }}
      return {roles:result,masters:Object.keys(h.roles).length,stats:h.getDrawStats()};
    }''')
    lengths={'seated-port':1.52,'seated-starboard':1.52,'standing-port':1.75,'standing-starboard':1.75,'helm':4.2,'helm-starboard':4.2}
    for name,length in lengths.items():
        assert abs(report['geometry']['roles'][name]['paddleLengthM']-length)<.0001,(name,report['geometry'])
    assert report['geometry']['masters']==8
    for name,role in report['geometry']['roles'].items():
        assert all(abs(clearance-.002)<.0005 for clearance in role['footClearanceM']),(name,role)
        assert role['maxPalmGripGapM']<.02,(name,role)
    page.locator('#view').click()
    page.evaluate('illustratedPreview.seek(.16)')
    for posture in ['seated','standing','caller','controller','helm']:
        page.locator('#posture').select_option(posture)
        page.locator('#study-angle').select_option('three-quarter')
        page.screenshot(path=str(out/f'{posture}.png'))
    page.locator('#posture').select_option('seated')
    for angle in ['front','side','back']:
        page.locator('#study-angle').select_option(angle)
        page.screenshot(path=str(out/f'athlete-{angle}.png'))
    page.locator('#study-focus').select_option('face')
    page.locator('#study-angle').select_option('three-quarter')
    for face in ['2','3','7','11']:
        page.locator('#study-face').select_option(face)
        page.screenshot(path=str(out/f'face-{face}.png'))
    page.locator('#study-focus').select_option('body')
    for width,height in [(1024,768),(768,1024),(1180,430)]:
        page.set_viewport_size({'width':width,'height':height})
        page.screenshot(path=str(out/f'tablet-{width}x{height}.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,height)
    page.locator('#view').click();page.evaluate('illustratedPreview.seekRace(16)')
    page.screenshot(path=str(out/'race.png'))
    if args.studio:
        page.set_viewport_size({'width':1180,'height':820})
        page.goto(args.studio)
        page.wait_for_selector('[data-render-mode=athlete-study]',timeout=90000)
        page.wait_for_function("document.querySelector('[data-testid=art-stage]')?.athleteStudy?.root",timeout=15000)
        report['standalone']=page.locator('[data-testid=art-stage]').evaluate('(e)=>({...e.dataset})')
        assert report['standalone']['artSource']=='BLENDER_MASTER'
        report['standaloneMotion']=page.evaluate('''()=>{const h=document.querySelector('[data-testid=art-stage]').athleteStudy,bone=h.root.getObjectByName('hand_l'),shirt=h.root.getObjectByName('Connected_Race_Shirt');h.mixer.setTime(0);h.root.updateMatrixWorld(true);const hand=bone.getWorldPosition(bone.position.clone()),weights=[...shirt.morphTargetInfluences];h.mixer.setTime(.35);h.root.updateMatrixWorld(true);return {handTravelM:hand.distanceTo(bone.getWorldPosition(bone.position.clone())),clothWeightChange:Math.max(...weights.map((v,i)=>Math.abs(v-shirt.morphTargetInfluences[i])))};}''')
        assert report['standaloneMotion']['handTravelM']>.08
        assert report['standaloneMotion']['clothWeightChange']>.1
        page.get_by_role('button',name='Dừng',exact=True).click()
        for name in ['Trước','Ngang','Sau','Dằm']:
            page.get_by_role('button',name=name,exact=True).click()
            page.screenshot(path=str(out/f'glb-{name}.png'))
        for width,height in [(1024,768),(768,1024),(1180,430)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(120)
            page.screenshot(path=str(out/f'glb-tablet-{width}x{height}.png'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if args.record:
            page.set_viewport_size({'width':1180,'height':820})
            page.get_by_role('button',name='Trước',exact=True).click()
            with page.expect_download(timeout=30000) as event:
                page.get_by_role('button',name='Clip 10s',exact=True).click()
            event.value.save_as(str(out.parent/'rowing.webm'))
    report['errors']=errors
    (out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(report,ensure_ascii=True))
    assert not errors,errors
    browser.close()
