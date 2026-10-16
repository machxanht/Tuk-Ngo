"""Real game and standalone GLB inspection in Edge; no mocked rendering."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4173/Tuk-Ngo/')
parser.add_argument('--studio',default='',help='Optional separate 3D entry; defaults to the current page')
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
    page.wait_for_selector('[data-render-mode=boat]',timeout=90000)
    report['initialLoad']=page.evaluate("()=>({readyMs:performance.now(),bytes:performance.getEntriesByType('resource').reduce((s,e)=>s+e.encodedBodySize,0),urls:performance.getEntriesByType('resource').map(e=>e.name)})")
    assert not any(name in url for url in report['initialLoad']['urls'] for name in ['festival-landscape','spectators-','rower-seated','mekong-buildings','festival-scene.js','ghe-ngo-crew-v18','App-']),report['initialLoad']
    report['geometry']=page.evaluate('''()=>{
      const h=document.querySelector('[data-testid=art-stage]').boatPreview.rig,representatives=Object.keys(h.roles).map(name=>h.actors.find(a=>a.master===h.roles[name]));
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
    page.get_by_role('button',name='Dừng',exact=True).click()
    # Keep an independent reference to original joint trajectories before
    # disposing the boat; the standalone export must agree at every phase.
    page.evaluate("""()=>{const h=document.querySelector('[data-testid=art-stage]').boatPreview.rig,m=h.roles['seated-port'];window.approvedMotion=[];for(let i=0;i<96;i++){m.mixer.setTime(i/96*m.clip.duration);m.root.updateMatrixWorld(true);approvedMotion.push(Object.fromEntries(['head','spine_03','pelvis','hand_l','hand_r','foot_l'].map(n=>[n,m.root.worldToLocal(m.root.getObjectByName(n).getWorldPosition(m.root.position.clone())).toArray()])));}window.approvedDuration=m.clip.duration;}""")
    for name in ['Toàn ghe','Cận tay bơi','Đầu ghe','Lái cuối ghe']:
        page.get_by_role('button',name=name,exact=True).click()
        page.wait_for_function("label=>document.querySelector('[data-testid=art-stage]').dataset.view===label",arg={'Toàn ghe':'boat','Cận tay bơi':'crew','Đầu ghe':'bow','Lái cuối ghe':'stern'}[name])
        page.screenshot(path=str(out/f'boat-{name}.png'))
    report['boatLayouts']=[]
    page.get_by_role('button',name='Toàn ghe',exact=True).click()
    for width,height in [(1024,768),(768,1024),(1180,430)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
        canvas=page.locator('[data-testid=art-stage]').bounding_box();controls=page.locator('.art-controls').bounding_box();heading=page.locator('.art-view-controls').bounding_box()
        assert canvas['y']>=heading['y']+heading['height']-.5
        assert canvas['y']+canvas['height']<=controls['y']+.5
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        report['boatLayouts'].append({'viewport':[width,height],'canvas':canvas,'controls':controls})
        page.screenshot(path=str(out/f'boat-tablet-{width}x{height}.png'))
    page.set_viewport_size({'width':1180,'height':820})
    if args.record:
        page.locator('.art-tools summary').click()
        with page.expect_download(timeout=30000) as event:page.get_by_role('button',name='Clip 10s',exact=True).click()
        event.value.save_as(str(out.parent/'boat-rowing.webm'))
        page.wait_for_function("!document.querySelector('.art-segment button').disabled")
        page.get_by_role('button',name='Dừng',exact=True).click()
        page.locator('.art-tools summary').click()
    page.get_by_role('button',name='Một VĐV',exact=True).click()
    page.wait_for_selector('[data-render-mode=athlete-study]',timeout=90000)
    page.wait_for_function("document.querySelector('[data-testid=art-stage]')?.athleteStudy?.root",timeout=15000)
    report['standalone']=page.locator('[data-testid=art-stage]').evaluate('(e)=>({...e.dataset})')
    assert report['standalone']['artSource']=='BLENDER_MASTER'
    report['motionAgreement']=page.evaluate("""()=>{const h=document.querySelector('[data-testid=art-stage]').athleteStudy,root=h.root,m=h.mixer,v=root.position.clone(),errors={};let maxGrip=0;for(let i=0;i<96;i++){m.setTime(i/96*approvedDuration);root.updateMatrixWorld(true);for(const [name,expected]of Object.entries(approvedMotion[i])){const actual=root.worldToLocal(root.getObjectByName(name).getWorldPosition(v));errors[name]=Math.max(errors[name]||0,actual.distanceTo(v.clone().fromArray(expected)));}const inv=root.getObjectByName('Dam_Wood_152cm').matrixWorld.clone().invert();for(const [side,y]of [['l',0],['r',-.53]]){const palm=root.getObjectByName('hand_'+side).getWorldPosition(v).lerp(root.getObjectByName('middle_01_'+side).getWorldPosition(v.clone()),.9).applyMatrix4(inv);maxGrip=Math.max(maxGrip,palm.distanceTo(v.clone().set(0,y,0)));}}return {samples:96,maxBoneDriftM:errors,maxPalmGripGapM:maxGrip};}""")
    assert max(report['motionAgreement']['maxBoneDriftM'].values())<.00001,report['motionAgreement']
    assert report['motionAgreement']['maxPalmGripGapM']<.003,report['motionAgreement']
    for name in ['Trước','Ngang','Sau','Dằm']:
        page.get_by_role('button',name=name,exact=True).click();page.wait_for_timeout(80)
        page.screenshot(path=str(out/f'glb-{name}.png'))
    for width,height in [(1024,768),(768,1024),(1180,430)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(120)
        page.screenshot(path=str(out/f'glb-tablet-{width}x{height}.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.get_by_role('button',name='Cả ghe 3D',exact=True).click()
    page.wait_for_selector('[data-render-mode=boat]',timeout=90000)
    page.get_by_role('button',name='Chèo',exact=True).click()
    page.wait_for_timeout(3000)
    report['remount']=page.locator('[data-testid=art-stage]').evaluate('(e)=>({...e.dataset})')
    assert report['remount']['crewCount']=='55'
    assert report['remount']['masterRigs']=='8'
    assert int(report['remount']['splashEvents'])>0
    assert page.locator('[data-testid=art-stage] canvas').count()==1
    report['errors']=errors
    (out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'motion':report['motionAgreement'],'initialBytes':report['initialLoad']['bytes'],'fpsHost':report['remount'].get('fps'),'errors':errors},ensure_ascii=True))
    assert not errors,errors
    browser.close()
