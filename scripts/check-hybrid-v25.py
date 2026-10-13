"""Direct renders and continuity checks for the shared 3D athlete prototype."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True)
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1200,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(args.url,wait_until='domcontentloaded',timeout=60000)
    page.wait_for_function('document.body.dataset.ready === "true" || !!document.body.dataset.loadError',timeout=60000)
    assert not page.evaluate('document.body.dataset.loadError'),page.locator('#status').inner_text()
    assert page.evaluate('illustratedPreview.stats.hybrid.animation')=='continuous-skinned-3d'
    assert page.evaluate('illustratedPreview.stats.configuration')=='hybrid-v30'
    page.evaluate('illustratedPreview.seekRace(16)')
    page.screenshot(path=str(out/'festival.png'))
    page.locator('#view').click()
    for posture in ['seated','standing','caller','controller','helm']:
        page.locator('#posture').select_option(posture)
        for phase in [0,.125,.25,.5,.75]:
            page.evaluate('(t)=>illustratedPreview.seek(t*.75)',phase)
            page.locator('#scene').screenshot(path=str(out/f'{posture}-{phase}.png'))
        page.evaluate('illustratedPreview.seek(.075)')
        if posture in ['seated','standing']:
            bone_a=page.evaluate('illustratedPreview.hybrid.roles["'+posture+'-port"].root.getObjectByName("upperarm_l").quaternion.toArray()')
        first=out/f'{posture}-continuity-a.png';page.locator('#scene').screenshot(path=str(first))
        page.evaluate('illustratedPreview.seek(.0825)')
        if posture in ['seated','standing']:
            bone_b=page.evaluate('illustratedPreview.hybrid.roles["'+posture+'-port"].root.getObjectByName("upperarm_l").quaternion.toArray()')
            assert max(abs(a-b) for a,b in zip(bone_a,bone_b))>1e-5,'Rig did not move between pose checkpoints'
        second=out/f'{posture}-continuity-b.png';page.locator('#scene').screenshot(path=str(second))
        assert ImageChops.difference(Image.open(first).convert('RGB'),Image.open(second).convert('RGB')).getbbox(), 'Sub-frame pose did not move'
    contacts=page.evaluate('''()=>{
      const h=illustratedPreview.hybrid,actors=h.actors.filter(a=>a.role==='rower'&&[2,3,18,19].includes(a.id));
      const initial=new Map();let maxPalmGap=0,maxFootDrift=0;
      for(let step=0;step<33;step++){
       h.render(step/33,step/33);
       for(const a of actors){
        const bones=a.master.skeleton.bones,position=n=>bones.find(b=>b.name===n).getWorldPosition(a.group.position.clone()).applyMatrix4(a.group.matrixWorld);
        const upper=a.side<0?'l':'r';
        for(const [i,s] of [upper,upper==='l'?'r':'l'].entries()){
         const palm=position('hand_'+s).lerp(position('middle_01_'+s),.9);
         const grip=a.group.position.clone().set(0,i?-.53:0,0).applyMatrix4(a.paddle.matrixWorld);
         maxPalmGap=Math.max(maxPalmGap,palm.distanceTo(grip));
        }
        for(const s of ['l','r']){const key=a.id+s,foot=position('foot_'+s);if(!initial.has(key))initial.set(key,foot.clone());maxFootDrift=Math.max(maxFootDrift,foot.distanceTo(initial.get(key)));}
       }
      }
      return {maxPalmGapM:maxPalmGap,maxAnkleDriftM:maxFootDrift};
    }''')
    assert contacts['maxPalmGapM']<.008,contacts
    assert contacts['maxAnkleDriftM']<.003,contacts
    stats=page.evaluate('illustratedPreview.stats');assert not errors,errors
    page.locator('#view').click();page.locator('#restart').click()
    frames=page.evaluate('illustratedPreview.stats.renderedFrames');started=time.monotonic();page.wait_for_timeout(4000)
    fps=(page.evaluate('illustratedPreview.stats.renderedFrames')-frames)/(time.monotonic()-started)
    report={'url':args.url,'stats':stats,'contacts':contacts,'continuousBetweenQuarterPoses':True,'headless_desktop_fps':round(fps,1),'errors':errors,'physical_tablet_tested':False}
    (out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'fps':fps,'errors':errors,'hybrid':stats['hybrid'],'draw3D':stats['draw3D']},ensure_ascii=False))
    browser.close()
