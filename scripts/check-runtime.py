"""Real renderer cache, ownership and performance checks on Edge headless."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4255/')
parser.add_argument('--out',default='docs/qa/runtime/performance')
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 page=b.new_page(viewport={'width':1180,'height':820});errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 started=time.monotonic();page.goto(args.url);page.wait_for_selector('body[data-ready=true]',timeout=90000)
 load=time.monotonic()-started;page.evaluate('illustratedPreview.seekRace(16)')
 result=page.evaluate('''()=>{
 const h=illustratedPreview.hybrid,near=hybridTeams.near.id,far=hybridTeams.far.id;
 const state=()=>Object.values(h.roles).flatMap(r=>r.skeleton.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.matrixWorld.elements]));
 h.render(.21,.5,{viewKey:'cache-check',teamId:far,frameId:0,distance:80});const saved=state();
 h.render(.83,2,{viewKey:'near',teamId:near,frameId:1,nearest:true});const other=state();
 h.render(.91,3,{viewKey:'cache-check',teamId:far,frameId:1,distance:80});const restored=state();
 const maxRestoreError=Math.max(...saved.map((v,i)=>Math.abs(v-restored[i]))),differentPose=Math.max(...saved.map((v,i)=>Math.abs(v-other[i])));
 if(maxRestoreError>1e-10||differentPose<.01)throw Error('Far cache used another boat pose');
 h.render(.1,0,{teamId:near});h.render(.2,0,{teamId:far});const materials=h.getDrawStats().kitMaterials;
 const start=performance.now();for(let i=0;i<60;i++){h.render(i/60,i/60,{teamId:near});h.render(i/60+.1,i/60,{teamId:far});}
 const render120Ms=performance.now()-start,before=h.getDrawStats();
 for(let i=0;i<60;i++){h.render(i/60,i/60,{teamId:near,viewKey:'near',frameId:i,nearest:true});h.render(i/60+.1,i/60,{teamId:far,viewKey:'far-bench',frameId:i,distance:80});}
 const after=h.getDrawStats();if(after.kitMaterials!==materials)throw Error('Unbounded material cache');
 const updates=after.poseUpdates-before.poseUpdates,restores=after.poseRestores-before.poseRestores,gpuReuses=after.gpuReuses-before.gpuReuses;
 if(updates!==90||restores!==30||gpuReuses!==30)throw Error('Distance throttle is not half rate');
 if(Object.keys(h.roles).length!==8||new Set(h.actors.map(a=>a.master)).size!==8)throw Error('Master rig count changed');
 return {maxRestoreError,differentPose,render120Ms,updates,restores,gpuReuses,stats:after,masterRigs:8,shirtTopology:h.actors[0].shirt.geometry.userData.shirtV32.topology};
 }''')
 page.evaluate('illustratedPreview.play()');page.wait_for_timeout(1000)
 frames=page.evaluate('illustratedPreview.stats.renderedFrames');started=time.monotonic();page.wait_for_timeout(5000)
 result['headlessFps']=(page.evaluate('illustratedPreview.stats.renderedFrames')-frames)/(time.monotonic()-started)
 result['loadSeconds']=load;result['physicalTabletTested']=False
 page.screenshot(path=str(out/'festival.png'))
 result['disposal']=page.evaluate('''()=>{const h=illustratedPreview.hybrid;illustratedPreview.seek(0);h.dispose();return {...h.renderer.info.memory};}''')
 assert result['disposal']['geometries']==0,result['disposal']
 assert result['disposal']['textures']==0,result['disposal']
 assert not errors,errors;result['errors']=errors
 (out/'check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(result,ensure_ascii=False));b.close()
