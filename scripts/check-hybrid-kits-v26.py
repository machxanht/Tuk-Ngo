"""Read pixels from the actual renderer to verify independent jersey colours."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('E:/AI/Um Tuk/asset-studio/hybrid-v26/kits');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1200,'height':900});errors=[]
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto('http://127.0.0.1:4255/',wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=60000)
 page.locator('#view').click();page.evaluate('illustratedPreview.seek(.1875)');result={}
 for name,value in [('green','#23855e'),('amber','#cc9335')]:
  page.locator('#study-kit').select_option(value);page.screenshot(path=str(out/(name+'.png')))
  result[name]=page.evaluate('''()=>{const image=illustratedPreview.hybrid.renderer.domElement,c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);const d=x.getImageData(0,0,c.width,Math.floor(c.height*.66)).data;let green=0,amber=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>200){if(d[i+1]>d[i]*1.2&&d[i+1]>d[i+2]*1.25)green++;if(d[i]>d[i+1]*1.15&&d[i+1]>d[i+2]*1.4)amber++;}return {green,amber};}''')
 assert result['green']['green']>result['amber']['green']+500,result
 assert result['amber']['amber']>result['green']['amber']+500,result
 assert not errors,errors
 (out/'check.json').write_text(json.dumps({'actualRendererPixels':result,'errors':errors},indent=2),encoding='utf8');print(json.dumps(result));browser.close()
