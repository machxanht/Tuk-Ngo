"""Compare native and instanced shirts at identical real WebGL poses."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');p.add_argument('--out',required=True);args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as tool:
 browser=tool.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':800,'height':600});errors=[]
 page.add_init_script("localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));localStorage.setItem('tukngo-language','vi');localStorage.setItem('tukngo-venue','maspero');")
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url);page.wait_for_function("!!document.querySelector('[data-testid=art-stage]')?.boatPreview",timeout=120000);page.locator('.game-quick').click();page.wait_for_timeout(1000)
 report=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,gl=a.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=()=>{const b=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,b);return b;},rows=[];
 a.rigs[1].boat.visible=false;a.scene.updateMatrixWorld(true);a.camera.clearViewOffset();a.camera.fov=38;a.camera.position.copy(a.rig.boat.localToWorld(a.camera.position.clone().set(6,2.7,4.5)));a.camera.lookAt(a.rig.boat.localToWorld(a.camera.position.clone().set(6,.9,0)));a.camera.updateProjectionMatrix();a.camera.updateMatrixWorld(true);
 for(const type of ['plywood','dugout']){a.rigs.forEach(r=>r.setConstruction(type));for(let i=0;i<12;i++){
  const draw=enabled=>{a.rigs.forEach((r,n)=>{r.boat.userData.shirtBatchingEnabled=enabled;r.render(i/12,2,{teamId:a.assetSelection.teamIds[n],connectedKit:true,updateOnly:true,nearest:true});});a.renderer.render(a.scene,a.camera);return {pixels:pixels(),calls:a.renderer.info.render.calls};};
  const native=draw(false),batched=draw(true);let changed=0,error=0,max=0;for(let j=0;j<native.pixels.length;j++){const d=Math.abs(native.pixels[j]-batched.pixels[j]);if(d>2)changed++;error+=d;max=Math.max(max,d);}rows.push({type,phase:i/12,nativeCalls:native.calls,batchedCalls:batched.calls,changedFraction:changed/native.pixels.length,meanPixelError:error/native.pixels.length,maxPixelError:max});
 }}const png=a.renderer.domElement.toDataURL('image/png'),shown=pixels();a.rig.boat.traverse(m=>{if(m.name==='Instanced_Approved_Shirts')m.visible=false;});a.renderer.render(a.scene,a.camera);const hidden=pixels();let shirtPixels=0;for(let j=0;j<shown.length;j+=4)if(Math.abs(shown[j]-hidden[j])+Math.abs(shown[j+1]-hidden[j+1])+Math.abs(shown[j+2]-hidden[j+2])>15)shirtPixels++;
 return {rows,png,shirtCoverage:shirtPixels/(w*h),vertexAttributeLimit:gl.getParameter(gl.MAX_VERTEX_ATTRIBS),batches:a.rig.boat.userData.shirtBatching};}""")
 (out/'shirts.png').write_bytes(base64.b64decode(report.pop('png').split(',')[1]));report['errors']=errors;(out/'checks.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');browser.close()
 assert not errors,errors
 assert all(r['meanPixelError']<.1 and r['changedFraction']<.001 for r in report['rows']),report['rows']
 assert all(r['batchedCalls']<r['nativeCalls']-30 for r in report['rows'])
 assert report['shirtCoverage']>.005,'Shirts must occupy a visible portion of the compared close-up'
 print('24 identical-pose comparisons passed; maximum mean error:',max(r['meanPixelError']for r in report['rows']),'draws saved:',min(r['nativeCalls']-r['batchedCalls']for r in report['rows']))
