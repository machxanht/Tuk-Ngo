"""Render shared artwork and inspect real in-world banners. No tablet FPS claim."""
import argparse
import base64
import json
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--out',default='docs/qa/festival-branding/local')
args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bundle=subprocess.check_output(['node','--input-type=module','-e',
 "import {build} from 'esbuild';const r=await build({entryPoints:['src/race/festival-branding.mjs'],bundle:true,format:'esm',write:false,minify:true});process.stdout.write(r.outputFiles[0].text);"],text=True)
module='data:text/javascript;base64,'+base64.b64encode(bundle.encode()).decode()
api="document.querySelector('[data-testid=art-stage]').boatPreview"
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1200,'height':1500})
  proof=args.url+'brand-proof'
  page.route(proof,lambda route:route.fulfill(content_type='text/html',body='<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'))
  page.goto(proof)
  result=page.evaluate("""async({module,base})=>{
   const b=await import(module),font=new FontFace('Noto Sans Khmer','url('+base+'assets/illustrated-v22/NotoSansKhmer.ttf)',{weight:'100 900'});document.fonts.add(await font.load());await document.fonts.load('800 64px "Noto Sans Khmer"');
   document.head.insertAdjacentHTML('beforeend','<style>body{margin:0;padding:38px 48px;background:#f0f4ee;color:#00563c;font-family:Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:2px solid #f5b51b}h1{font-size:21px;margin:0}small{font-size:12px;letter-spacing:1px}section{margin:22px 0;padding:18px 24px;border-radius:14px;background:#fffdf1;box-shadow:0 1px 8px #00563c09}section>p{font-size:11px;margin:0 0 12px;letter-spacing:1px;color:#4c6d5a}#logo{display:block;width:850px;max-width:100%;margin:auto}canvas{display:block;width:100%;height:auto}footer{font-size:11px;line-height:1.7;color:#4c6d5a}</style>');
   document.body.innerHTML='<header><h1>LỄ HỘI ĐUA GHE NGO · 2026</h1><small>KHLEANG / SÓC TRĂNG</small></header><section><p>LOGO · VECTOR / TRANSPARENT</p><img id="logo" alt="Logo lễ hội"></section>';
   const svg=b.festivalLogoSvg(),img=document.querySelector('#logo');img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));await img.decode();
   const kinds=[['FESTIVAL',b.FESTIVAL.titleKm,32,3.1],['SUPPORTERS','សូមស្វាគមន៍',18,2.4],['KUON KHMER','Kuon Khmer',17,3.2],['ANGKOR SOUL','Angkor Soul',17,3.2],['START / FINISH','ចំណុចចាប់ផ្តើម',7,1.1]],reports=[];
   for(const[label,text,w,h]of kinds){const section=document.createElement('section');section.innerHTML='<p>'+label+'</p>';const canvas=document.createElement('canvas');Object.assign(canvas,b.festivalBannerSize(w,h));section.append(canvas);document.body.append(section);reports.push(b.paintFestivalBanner(canvas,text));}
   document.body.insertAdjacentHTML('beforeend','<footer>One vector mark · Jade / gold / red / river blue · Khmer lettering outlined in the logo<br>Banner captions use the existing Noto Sans Khmer font. No per-frame texture painting.</footer>');
   const a=document.createElement('canvas'),c=document.createElement('canvas');a.width=c.width=1200;a.height=c.height=540;a.getContext('2d').drawImage(img,0,0,1200,540);b.paintFestivalMark(c.getContext('2d'),0,0,1200,540);const x=a.getContext('2d').getImageData(0,0,1200,540).data,y=c.getContext('2d').getImageData(0,0,1200,540).data;let difference=0,filled=0;for(let i=0;i<x.length;i++){difference+=Math.abs(x[i]-y[i]);if(i%4===3&&x[i]>0)filled++;}
   return {banners:reports,svgBytes:new TextEncoder().encode(svg).length,svgCanvasMeanDifference:difference/x.length,colouredPixels:filled,outlined:!svg.includes('<text')&&!svg.includes('<image'),palette:b.FESTIVAL_PALETTE};
  }""",{'module':module,'base':args.url})
  assert result['outlined'] and result['svgBytes']<16000 and result['colouredPixels']>15000
  assert result['svgCanvasMeanDifference']<1.5,result['svgCanvasMeanDifference']
  for banner in result['banners']:
   for line in banner['lineBounds']:
    assert 0<=line['left']<line['right']<=banner['width']
    assert banner['height']*.05<=line['top']<line['bottom']<=banner['height']*.86,line
  page.screenshot(path=str(out/'brand-sheet.png'),full_page=True)
  page.locator('#logo').screenshot(path=str(out/'logo.png'))
  page.close()
  page=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
  page.goto(args.url);page.wait_for_selector('[data-boat-count="61"]',timeout=90000)
  published=page.request.get(args.url+'assets/festival/festival-logo.svg')
  assert published.ok and published.text()==Path('public/assets/festival/festival-logo.svg').read_text(encoding='utf-8')
  assert page.locator('[data-testid=festival-game]').evaluate("e=>getComputedStyle(e).getPropertyValue('--teal').trim()") == result['palette']['jade']
  result['responsive']=[]
  for width,height in [(1024,768),(768,1024),(1180,430),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.locator('.festival-menu-logo').evaluate('e=>e.complete&&e.naturalWidth===1200')
   for button in page.locator('.menu-actions button').all():
    assert button.bounding_box()['height']>=44
   page.screenshot(path=str(out/f'menu-{width}x{height}.png'))
   result['responsive'].append([width,height])
  page.set_viewport_size({'width':1024,'height':768})
  page.wait_for_function("document.querySelector('[data-testid=art-stage] canvas').clientWidth>=1000")
  page.wait_for_timeout(200)
  result['world']=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,maps=new Map();let unbranded=0;a.river.group.traverse(o=>{if(!o.name.startsWith('CourseSign_'))return;const t=o.material.map;maps.set(t.uuid,[t.image.width,t.image.height]);if(!t.userData.festivalBranding||o.material.toneMapped)unbranded++;});return {bannerCount:a.river.group.userData.banners.count,uniqueTextures:maps.size,estimatedTextureBytes:[...maps.values()].reduce((s,[w,h])=>s+w*h*4*4/3,0),unbranded,branding:a.river.group.userData.banners.branding};}""")
  assert result['world']['unbranded']==0 and result['world']['bannerCount']>50
  image=page.evaluate("""()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview;let sign;a.river.group.traverse(o=>{if(o.name.startsWith('CourseSign_')&&o.userData.width===32)sign=o;});a.scene.updateMatrixWorld(true);const matrix=sign.matrixWorld.clone();sign.getMatrixAt(0,matrix);matrix.premultiply(sign.matrixWorld);const target=a.camera.position.clone().setFromMatrixPosition(matrix),normal=target.clone().set(0,0,1).transformDirection(matrix),camera=a.camera.clone();camera.position.copy(target).addScaledVector(normal,60);camera.lookAt(target);camera.fov=35;camera.aspect=a.renderer.domElement.width/a.renderer.domElement.height;camera.updateProjectionMatrix();a.renderer.render(a.scene,camera);return a.renderer.domElement.toDataURL('image/png').split(',')[1];}""")
  (out/'grandstand-banner.png').write_bytes(base64.b64decode(image))
  page.get_by_role('button',name='Đua với AI · 2 ghe',exact=True).click();page.get_by_role('button',name='Bắt đầu đua với AI',exact=True).click()
  page.get_by_role('button',name='Bỏ qua giới thiệu',exact=True).click();page.wait_for_function(api+".game.state.phase==='racing'")
  assert page.locator('.game-inputs button').count()==2
  page.screenshot(path=str(out/'race.png'))
  assert not errors,errors
  result['errors']=errors;result['physicalTabletTested']=False
  (out/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  print(json.dumps({k:result[k] for k in ['svgBytes','svgCanvasMeanDifference','world','responsive','errors']},ensure_ascii=False))
 finally:browser.close()
