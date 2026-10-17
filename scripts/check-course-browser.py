"""Inspect the shipped 3D crews and run the real automatic 1,200 m trial."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4173/Tuk-Ngo/')
parser.add_argument('--out',default='docs/qa/athlete-master/course')
parser.add_argument('--stability-seconds',type=int,default=0)
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'physicalTabletTested':False};errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1400,'height':1000},has_touch=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(args.url);page.wait_for_selector('[data-render-mode=race]',timeout=90000)
    report['load']=page.evaluate("()=>({readyMs:performance.now(),bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0),urls:performance.getEntriesByType('resource').map(r=>r.name)})")
    page.evaluate('''()=>{const renderer=document.querySelector('[data-testid=art-stage]').boatPreview.renderer,get=renderer.properties.get;window.trackedTextures=new Map();renderer.properties.get=function(o){if(o.isTexture&&!trackedTextures.has(o.uuid)){const rec={texture:o,disposed:false};trackedTextures.set(o.uuid,rec);o.addEventListener('dispose',()=>rec.disposed=true);}return get.call(this,o);};}''')
    assert not any(s in u for u in report['load']['urls'] for s in ['festival-landscape','spectators-','rower-seated','mekong-buildings','festival-scene.js','App-'])
    page.wait_for_timeout(7000)
    report['live']=page.evaluate("()=>{const h=document.querySelector('[data-testid=art-stage]'),a=h.boatPreview;return {data:{...h.dataset},race:a.snapshot(),sharedRenderer:a.rigs.every(r=>r.renderer===a.renderer),canvasCount:h.querySelectorAll('canvas').length,animation:a.rigs.map(r=>r.animation.counters),camera:a.camera.position.toArray()};}")
    assert report['live']['sharedRenderer'] and report['live']['canvasCount']==1
    assert report['live']['data']['boatCount']=='2' and report['live']['data']['crewCount']=='108'
    assert min(report['live']['race']['distance'])>0
    assert all(r['updates']>4 for r in report['live']['animation'])
    page.get_by_role('button',name='Dừng',exact=True).tap()
    before=page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.snapshot()")
    page.wait_for_timeout(350)
    assert before==page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.snapshot()")
    page.screenshot(path=str(out/'start.png'))
    report['elbows']=page.evaluate('''()=>{
      const a=document.querySelector('[data-testid=art-stage]').boatPreview,result=[];
      for(const [lane,r] of a.rigs.entries())for(const posture of ['seated','standing']){
       const pair=r.actors.filter(p=>p.role==='rower'&&p.posture===posture).slice(0,2),ids=new Map();let gap=Infinity,minElbows=Infinity;
       for(const p of pair){const g=p.skin.geometry,indices=[];for(let j=0;j<g.attributes.position.count;j++){let w=0;for(let k=0;k<4;k++)if(/^(upperarm|lowerarm)_/.test(p.master.skeleton.bones[g.attributes.skinIndex.getComponent(j,k)].name))w+=g.attributes.skinWeight.getComponent(j,k);if(w>.6)indices.push(j);}ids.set(p,indices);}
       for(let i=0;i<96;i++){
        r.render(i/96,i/96,{updateOnly:true,nearest:true,connectedKit:true,teamId:lane?'prek-on-dok-2':'tum-nup-2'});
        const edge=pair.map(p=>{let max=-Infinity;const v=p.group.position.clone();for(const j of ids.get(p)){p.skin.getVertexPosition(j,v).applyMatrix4(p.group.matrixWorld);r.boat.worldToLocal(v);max=Math.max(max,-p.side*v.z);}return max;});gap=Math.min(gap,-edge[0]-edge[1]);
        const elbows=pair.map(p=>['l','r'].map(s=>p.master.root.getObjectByName('lowerarm_'+s).getWorldPosition(p.group.position.clone()).applyMatrix4(p.group.matrixWorld)));
        for(const x of elbows[0])for(const y of elbows[1])minElbows=Math.min(minElbows,x.distanceTo(y));
       }result.push({lane,posture,samples:96,minArmSurfaceGapM:gap,minElbowCentresM:minElbows});
      }return result;
    }''')
    assert all(r['minArmSurfaceGapM']>.08 for r in report['elbows']),report['elbows']
    report['paddleInstances']=page.evaluate('''()=>{
      const a=document.querySelector('[data-testid=art-stage]').boatPreview,result=[];
      for(const r of a.rigs){let max=0;const batches=r.boat.children.filter(o=>o.isInstancedMesh),matrix=r.boat.matrixWorld.clone(),world=matrix.clone();
       for(const p of r.actors.filter(p=>p.paddle)){const mesh=p.paddle.getObjectByName('Race_Paddle'),v=p.group.position.clone().fromBufferAttribute(mesh.geometry.attributes.position,0),expected=v.clone().applyMatrix4(mesh.matrixWorld);let best=Infinity;
        for(const b of batches.filter(b=>b.geometry===mesh.geometry))for(let i=0;i<b.count;i++){b.getMatrixAt(i,matrix);world.multiplyMatrices(b.matrixWorld,matrix);best=Math.min(best,v.clone().applyMatrix4(world).distanceTo(expected));}max=Math.max(max,best);
       }result.push({boatPosition:r.boat.position.toArray(),maxMeshInstanceDriftM:max});
      }return result;
    }''')
    assert all(r['maxMeshInstanceDriftM']<.00001 for r in report['paddleInstances']),report['paddleInstances']
    report['environment']=page.evaluate("()=>document.querySelector('[data-testid=art-stage]').boatPreview.river.group.userData")
    env=report['environment'];assert env['mainStand']['bank']=='right in race direction'
    assert env['mainStand']['lengthM']>=120 and env['mainStand']['tiers']>=8
    assert min(env['crowd']['peoplePerBank'])>20000 and env['crowd']['variantCount']==11
    assert env['crowd']['outfits']['combinations']>300 and len(env['traffic']['types'])==5
    assert env['nationalFlags']==0 and env['signLanguage']=='km'
    report['startLayout']=page.evaluate('''()=>{
      const a=document.querySelector('[data-testid=art-stage]').boatPreview,ship=a.official,decks=[];a.reset();
      const matrix=a.boat.matrixWorld.clone(),position=a.boat.position.clone(),scale=position.clone(),rotation=a.boat.quaternion.clone();
      a.river.group.traverse(o=>{if(o.name!=='Maspero_box'||!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);if(Math.abs(scale.x-12)<.001&&Math.abs(scale.y-.78)<.001&&Math.abs(scale.z-115)<.001)decks.push(position.x);}});
      const startX=a.rigs[0].boat.position.x-15.1,shipPosition=ship.root.position.toArray();let minInnerPaddle=Infinity,maxShipSide=0;
      ship.floating.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){position.set(x,y,z).applyMatrix4(o.matrixWorld);maxShipSide=Math.max(maxShipSide,Math.abs(position.z));}});
      for(let phase=0;phase<96;phase++)for(const [lane,r]of a.rigs.entries()){
       r.render(phase/96,phase/96,{nearest:true,updateOnly:true,connectedKit:true,teamId:lane?'prek-on-dok-2':'tum-nup-2'});
       for(const p of r.actors.filter(p=>p.paddle)){const mesh=p.paddle.getObjectByName('Race_Paddle'),g=mesh.geometry;g.computeBoundingBox();for(const x of [g.boundingBox.min.x,g.boundingBox.max.x])for(const y of [g.boundingBox.min.y,g.boundingBox.max.y])for(const z of [g.boundingBox.min.z,g.boundingBox.max.z]){position.set(x,y,z).applyMatrix4(mesh.matrixWorld);minInnerPaddle=Math.min(minInnerPaddle,Math.abs(position.z));}}
      }return {startX,bridgeDeckCentres:decks,shipPosition,maxShipSideM:maxShipSide,minPaddleClearanceM:minInnerPaddle-maxShipSide,officials:ship.stats.crew.demographicCounts,officialCount:ship.stats.officials};
    }''')
    start=report['startLayout'];assert len(start['bridgeDeckCentres'])==2
    assert all(x<1090 or x>start['startX'] for x in start['bridgeDeckCentres']),start
    assert max(start['bridgeDeckCentres'])-start['startX']>=90,start
    assert start['shipPosition'][2]==0 and abs(start['shipPosition'][0]-start['startX']-8)<.001
    assert start['officialCount']==3 and start['officials']['age']=={'adult':3}
    assert start['minPaddleClearanceM']>2.5,start
    page.wait_for_timeout(100)
    assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.official.stats.signal")=='hold'
    page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.advance(3.2)")
    page.wait_for_timeout(100)
    assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.official.stats.signal")=='go'
    assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.official.root.position.toArray()")==start['shipPosition']
    report['startSignal']='hold -> go, synchronized with countdown'
    # Capture the starting arrangement while both race boats are still there.
    page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.reset()")
    for label,name in [('Xuất phát','start-line'),('Trọng tài','official')]:
        page.get_by_role('button',name=label,exact=True).tap();page.wait_for_timeout(250)
        page.screenshot(path=str(out/(name+'.png')))
    # Drive the same integrator used by requestAnimationFrame through the whole
    # course; check monotone distance and both bow/finish crossings.
    report['fullRace']=page.evaluate('''()=>{
      const a=document.querySelector('[data-testid=art-stage]').boatPreview;a.reset();let previous=[0,0],monotone=true;const checkpoints=[];
      for(let step=0;step<6000&&a.race.state!=='finished';step++){
       a.advance(.1);const s=a.snapshot();s.distance.forEach((d,i)=>{if(d<previous[i]||d>1200)monotone=false;});previous=s.distance;
       if(checkpoints.length<4&&s.distance[0]>=[0,200,950,1200][checkpoints.length])checkpoints.push({distance:s.distance,stages:s.stages,elapsed:s.elapsed});
      }return {monotone,checkpoints,result:a.snapshot()};
    }''')
    assert report['fullRace']['monotone']
    assert report['fullRace']['result']['state']=='finished' and report['fullRace']['result']['distance']==[1200,1200]
    assert all(180<t<270 for t in report['fullRace']['result']['finishTimes'])
    page.wait_for_timeout(350)
    report['finish']=page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;return a.rigs.map(r=>({bowX:r.boat.localToWorld(r.boat.position.clone().set(15.1,0,0)).x,root:r.boat.position.toArray()}));}''')
    assert all(abs(r['bowX']-1090)<.001 for r in report['finish']),report['finish']
    for label,name in [('Vạch đích','finish'),('Khán đài chính','stand'),('Cầu 30/4','bridge'),('Toàn tuyến 1.200 m','course'),('Cận tay bơi','crew')]:
        page.get_by_role('button',name=label,exact=True).tap();page.wait_for_timeout(250)
        page.screenshot(path=str(out/(name+'.png')))
        if name=='course':
            non_sky=page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,c=document.createElement('canvas');c.width=160;c.height=90;const x=c.getContext('2d');x.drawImage(a.renderer.domElement,0,0,160,90);const p=x.getImageData(0,0,160,90).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i+2]<p[i+1]*1.03)n++;return n;}''')
            assert non_sky>1000,('Full course hidden by sky',non_sky)
    report['viewports']=[]
    page.get_by_role('button',name='Theo cuộc đua',exact=True).tap()
    for width,height in [(1024,768),(768,1024),(1180,430)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
        canvas=page.locator('[data-testid=art-stage]').bounding_box();footer=page.locator('.art-controls').bounding_box();nav=page.locator('.art-view-controls').bounding_box()
        assert canvas['height']>=120 and canvas['y']>=nav['y']+nav['height']-.5 and canvas['y']+canvas['height']<=footer['y']+.5
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        report['viewports'].append({'size':[width,height],'canvas':canvas});page.screenshot(path=str(out/f'tablet-{width}x{height}.png'))
    page.get_by_role('button',name='Đua lại từ xuất phát',exact=True).tap();page.wait_for_timeout(100)
    assert page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.snapshot().distance")==[0,0]
    page.get_by_role('button',name='Tiếp tục',exact=True).tap();page.wait_for_timeout(4000)
    assert min(page.evaluate("document.querySelector('[data-testid=art-stage]').boatPreview.snapshot().distance"))>0
    if args.stability_seconds:
        page.get_by_label('Xem nhanh 3×',exact=True).check()
        report['stability']=[]
        for elapsed in range(0,args.stability_seconds,20):
            page.wait_for_timeout(min(20,args.stability_seconds-elapsed)*1000)
            sample=page.evaluate('''()=>{const h=document.querySelector('[data-testid=art-stage]'),a=h.boatPreview;return {race:a.snapshot(),camera:a.camera.position.toArray(),target:a.controls.target.toArray(),cameraOffset:a.camera.position.clone().sub(a.controls.target).toArray(),fps:h.dataset.fps};}''')
            assert all(abs(n)<5000 for n in sample['camera'])
            report['stability'].append(sample);print(json.dumps({'stabilitySeconds':elapsed+min(20,args.stability_seconds-elapsed),'state':sample['race']['state'],'distances':sample['race']['distance']},ensure_ascii=False),flush=True)
        first=report['stability'][0]['cameraOffset']
        assert all(max(abs(x-y) for x,y in zip(first,s['cameraOffset']))<.00001 for s in report['stability'])
        if args.stability_seconds>=120:assert report['stability'][-1]['race']['state']=='finished'
        page.screenshot(path=str(out/'stability-finish.png'))
    assert not errors,errors
    report['errors']=errors
    # Dispose the two rigs together and check WebGL resource accounting.
    report['dispose']=page.evaluate("()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;a.dispose();return {...a.renderer.info.memory,remainingTextures:[...trackedTextures.values()].filter(t=>!t.disposed).map(t=>({name:t.texture.name,width:t.texture.image?.width,height:t.texture.image?.height}))};}")
    # Three r185 caches its own 16x16 DFG_LUT globally. All application-owned
    # geometry/textures must be disposed; do not dispose another renderer's LUT.
    assert report['dispose']['geometries']==0
    assert report['dispose']['textures']==len(report['dispose']['remainingTextures'])==1
    assert report['dispose']['remainingTextures']==[{'name':'DFG_LUT','width':16,'height':16}],report['dispose']
    browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':True,'fullRace':report['fullRace'],'elbows':report['elbows'],'dispose':report['dispose'],'physicalTabletTested':False},ensure_ascii=False))
