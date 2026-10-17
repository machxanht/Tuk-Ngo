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
      for(let phase=0;phase<1;phase+=1/12){h.render(phase,phase/.45,{nearest:true});for(const a of representatives){
       const name=Object.keys(h.roles).find(name=>a.master===h.roles[name]),r=result[name]||{footClearanceM:[Infinity,-Infinity],paddleLengthM:null,maxWristAxisDistanceM:0,maxPalmGripGapM:0};
       let min=Infinity;for(const i of footIndices.get(a)){a.skin.getVertexPosition(i,point).applyMatrix4(a.group.matrixWorld);min=Math.min(min,point.y-a.footing);}
       r.footClearanceM=[Math.min(r.footClearanceM[0],min),Math.max(r.footClearanceM[1],min)];
       if(a.paddle){const paddle=a.paddle.getObjectByName('Race_Paddle');paddle.geometry.computeBoundingBox();r.paddleLengthM=-paddle.geometry.boundingBox.min.y;
        const inverse=a.paddle.matrixWorld.clone().invert(),grips=[];for(const side of ['l','r']){const bone=a.master.skeleton.bones.find(b=>b.name==='hand_'+side),middle=a.master.skeleton.bones.find(b=>b.name==='middle_01_'+side);bone.getWorldPosition(point).applyMatrix4(a.group.matrixWorld).applyMatrix4(inverse);r.maxWristAxisDistanceM=Math.max(r.maxWristAxisDistanceM,Math.hypot(point.x,point.z));const palm=bone.getWorldPosition(point).lerp(middle.getWorldPosition(point.clone()),.9).applyMatrix4(a.group.matrixWorld).applyMatrix4(inverse);grips.push([palm.distanceTo(point.clone().set(0,0,0)),palm.distanceTo(point.clone().set(0,-.53,0))]);}r.maxPalmGripGapM=Math.max(r.maxPalmGripGapM,Math.min(Math.max(grips[0][0],grips[1][1]),Math.max(grips[0][1],grips[1][0])));
       }result[name]=r;
      }}
      return {roles:result,masters:Object.keys(h.roles).length,stats:h.getDrawStats()};
    }''')
    lengths={'seated-port':1.22,'seated-starboard':1.22,'standing-port':1.75,'standing-starboard':1.75,'helm':4.2,'helm-starboard':4.2}
    for name,length in lengths.items():
        assert abs(report['geometry']['roles'][name]['paddleLengthM']-length)<.0001,(name,report['geometry'])
    assert report['geometry']['masters']==8
    for name,role in report['geometry']['roles'].items():
        assert all(abs(clearance-.002)<.0005 for clearance in role['footClearanceM']),(name,role)
        assert role['maxPalmGripGapM']<.02,(name,role)
    report['placement']=page.evaluate("""()=>{const h=document.querySelector('[data-testid=art-stage]').boatPreview.rig,v=h.boat.position.clone(),caller=h.actors.find(a=>a.role==='caller'),first=h.actors.find(a=>a.id===2),p=a=>a.master.root.getObjectByName('pelvis').getWorldPosition(v).applyMatrix4(a.group.matrixWorld).y;const result={callerX:caller.group.position.x,callerHipHeightDeltaM:p(caller)-p(first),minRowingOutboardM:Infinity,helmTipY:[Infinity,-Infinity],minHelmAftM:Infinity,kneelingActors:h.actors.filter(a=>a.stance==='half-kneeling').length,kneePadClearanceM:[Infinity,-Infinity]};const candidates=new Map();for(const a of h.actors.filter(a=>a.kneeRest).slice(0,2)){const g=a.skin.geometry,ids=[];for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.paintZone.getX(i)===1&&g.attributes.position.getY(i)>.35&&g.attributes.position.getY(i)<.63)ids.push(i);candidates.set(a,ids);}for(let i=0;i<24;i++){h.render(i/24,i/24/.45,{nearest:true});for(const a of h.actors){if(a.paddle){const length=a.role==='helm'?4.2:a.posture==='standing'?1.75:1.22,tip=v.set(0,-length,0).applyMatrix4(a.paddle.matrixWorld);if(a.role==='rower')result.minRowingOutboardM=Math.min(result.minRowingOutboardM,tip.z*a.side);if(a.role==='helm'){result.helmTipY=[Math.min(result.helmTipY[0],tip.y),Math.max(result.helmTipY[1],tip.y)];result.minHelmAftM=Math.min(result.minHelmAftM,a.group.position.x-tip.x);}}}for(const [a,ids]of candidates){const rest=a.kneeRest,knee=a.master.root.getObjectByName('calf_'+a.kneelingLeg).getWorldPosition(v).applyMatrix4(a.group.matrixWorld).clone();let min=Infinity;for(const id of ids){a.skin.getVertexPosition(id,v).applyMatrix4(a.group.matrixWorld);if(Math.abs(v.x-rest.position.x)<.11&&Math.abs(v.z-rest.position.z)<.09&&v.y>knee.y-.15&&v.y<knee.y+.02)min=Math.min(min,v.y);}const gap=min-rest.position.y-.02;result.kneePadClearanceM=[Math.min(result.kneePadClearanceM[0],gap),Math.max(result.kneePadClearanceM[1],gap)];}}return result;}""")
    assert report['placement']['callerX']>=12.3
    assert abs(report['placement']['callerHipHeightDeltaM'])<.01
    assert report['placement']['minRowingOutboardM']>.60
    assert report['placement']['kneelingActors']==34
    assert report['placement']['minHelmAftM']>3
    assert .06<report['placement']['helmTipY'][0]<.28
    assert .50<report['placement']['helmTipY'][1]<.80
    assert all(abs(gap-.002)<.001 for gap in report['placement']['kneePadClearanceM']),report['placement']
    report['environment']=page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,s=a.banks.stats,c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d');function pixels(t){a.banks.update(t,a.camera);a.renderer.render(a.scene,a.camera);ctx.drawImage(a.renderer.domElement,0,0,320,180);return ctx.getImageData(0,0,320,180).data;}const first=pixels(20),second=pixels(20.4);let changed=0;for(let i=0;i<first.length;i+=4)if(Math.abs(first[i]-second[i])+Math.abs(first[i+1]-second[i+1])+Math.abs(first[i+2]-second[i+2])>10)changed++;return {...s,animatedPixels:changed,khmerFont:[...document.fonts].some(f=>f.family.includes('Noto Sans Khmer')&&f.status==='loaded'),waterDaylight:a.scene.getObjectByName('Maspero_River_And_Banks').children[0].material.uniforms.uDaylight.value};}''')
    assert report['environment']['banks']==2
    assert min(report['environment']['peoplePerBank'])>=1000
    assert report['environment']['npcVariants']==11
    assert report['environment']['crowd']['drawCalls']>0
    assert len(report['environment']['crowd']['activityCounts'])>=6
    assert report['environment']['animatedPixels']>50,report['environment']
    assert report['environment']['khmerFont']
    assert report['environment']['waterDaylight']==1
    report['crewLayout']=page.evaluate('''()=>{const h=document.querySelector('[data-testid=art-stage]').boatPreview.rig,v=h.boat.position.clone(),seated=h.actors.filter(a=>a.role==='rower'&&a.posture==='seated'),controller=h.actors.find(a=>a.role==='controller'),bars=h.boat.children.filter(o=>o.name.startsWith('Cross_Thwart_'));const result={people:h.actors.length,helms:h.actors.filter(a=>a.role==='helm').length,pairSpacingM:Math.abs(seated[0].group.position.z-seated[1].group.position.z),controllerYaw:controller.group.rotation.y,barCount:bars.length,barHeightM:seated.map(a=>a.seatTop),minBarHullClearanceM:Infinity,minSeatedFootHullClearanceM:Infinity};
      for(const bar of bars){bar.geometry.computeBoundingBox();const box=bar.geometry.boundingBox;for(const dx of [-1,1])for(const dz of [-1,1]){v.set(dx*box.max.x,box.min.y,dz*box.max.z).applyMatrix4(bar.matrixWorld);result.minBarHullClearanceM=Math.min(result.minBarHullClearanceM,v.y-h.floorAt(v.x,v.z)+.015);}}
      for(const a of [...seated,h.actors.find(a=>a.role==='caller')]){const g=a.skin.geometry;for(let i=0;i<g.attributes.position.count;i++){let w=0;for(let k=0;k<4;k++)if(/^(foot|ball|toe)_/.test(a.master.skeleton.bones[g.attributes.skinIndex.getComponent(i,k)].name))w+=g.attributes.skinWeight.getComponent(i,k);if(w>.65){a.skin.getVertexPosition(i,v).applyMatrix4(a.group.matrixWorld);if(v.y<a.footing+.04)result.minSeatedFootHullClearanceM=Math.min(result.minSeatedFootHullClearanceM,v.y-h.floorAt(v.x,v.z)+.015);}}}return result;}''')
    assert report['crewLayout']['people']==54 and report['crewLayout']['helms']==2
    assert abs(report['crewLayout']['pairSpacingM']-.48)<.0001
    assert abs(report['crewLayout']['controllerYaw']+3.141592653589793/2)<.0001
    assert report['crewLayout']['barCount']==9
    assert max(report['crewLayout']['barHeightM'])<.54
    assert report['crewLayout']['minBarHullClearanceM']>=0,report['crewLayout']
    assert report['crewLayout']['minSeatedFootHullClearanceM']>=0,report['crewLayout']
    assert report['environment']['crowd']['outfits']['combinations']>200
    page.get_by_role('button',name='Dừng',exact=True).click()
    # Keep an independent reference to the calibrated shared trajectories before
    # disposing the boat; the standalone export must agree at every phase.
    page.evaluate("""()=>{const h=document.querySelector('[data-testid=art-stage]').boatPreview.rig,m=h.roles['seated-port'];window.approvedMotion=[];for(let i=0;i<96;i++){m.mixer.setTime(i/96*m.clip.duration);m.root.updateMatrixWorld(true);approvedMotion.push(Object.fromEntries(['head','spine_03','pelvis','hand_l','hand_r','foot_l'].map(n=>[n,m.root.worldToLocal(m.root.getObjectByName(n).getWorldPosition(m.root.position.clone())).toArray()])));}window.approvedDuration=m.clip.duration;}""")
    for name in ['Khán giả','Hai bờ sông','Toàn ghe','Nhìn từ trên','Cận tay bơi','Nhóm quỳ','Đầu ghe','Lái cuối ghe']:
        page.get_by_role('button',name=name,exact=True).click()
        page.wait_for_function("label=>document.querySelector('[data-testid=art-stage]').dataset.view===label",arg={'Khán giả':'crowd','Hai bờ sông':'banks','Toàn ghe':'boat','Nhìn từ trên':'top','Cận tay bơi':'crew','Nhóm quỳ':'kneel','Đầu ghe':'bow','Lái cuối ghe':'stern'}[name])
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
    report['motionAgreement']=page.evaluate("""()=>{const h=document.querySelector('[data-testid=art-stage]').athleteStudy,root=h.root,m=h.mixer,v=root.position.clone(),errors={};let maxGrip=0;for(let i=0;i<96;i++){m.setTime(i/96*approvedDuration);root.updateMatrixWorld(true);for(const [name,expected]of Object.entries(approvedMotion[i])){const actual=root.worldToLocal(root.getObjectByName(name).getWorldPosition(v));errors[name]=Math.max(errors[name]||0,actual.distanceTo(v.clone().fromArray(expected)));}const inv=root.getObjectByName('Dam_Wood_152cm').matrixWorld.clone().invert();const grips=['l','r'].map(side=>root.getObjectByName('hand_'+side).getWorldPosition(v.clone()).lerp(root.getObjectByName('middle_01_'+side).getWorldPosition(v.clone()),.9).applyMatrix4(inv));maxGrip=Math.max(maxGrip,Math.min(Math.max(grips[0].length(),grips[1].distanceTo(v.clone().set(0,-.53,0))),Math.max(grips[1].length(),grips[0].distanceTo(v.clone().set(0,-.53,0)))));}return {samples:96,maxBoneDriftM:errors,maxPalmGripGapM:maxGrip};}""")
    assert max(report['motionAgreement']['maxBoneDriftM'].values())<.00001,report['motionAgreement']
    # The baked keys satisfy the IK grip; linear interpolation between adjacent
    # keys has the same 5 mm tolerance as the shared-role sampler regression.
    assert report['motionAgreement']['maxPalmGripGapM']<.005,report['motionAgreement']
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
    assert report['remount']['crewCount']=='54'
    assert report['remount']['masterRigs']=='8'
    assert int(report['remount']['splashEvents'])>0
    assert page.locator('[data-testid=art-stage] canvas').count()==1
    report['errors']=errors
    (out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'motion':report['motionAgreement'],'initialBytes':report['initialLoad']['bytes'],'fpsHost':report['remount'].get('fps'),'errors':errors},ensure_ascii=True))
    assert not errors,errors
    browser.close()
