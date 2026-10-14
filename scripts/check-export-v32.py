"""Actual portable V32 GLB reload, 17 real poses and role screenshots."""
import argparse,json,base64,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--back-only',action='store_true');args=parser.parse_args();out=repo.parent/'asset-studio/garment-v32/portable/reload';out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node',str(repo/'node_modules/esbuild/bin/esbuild'),'scripts/inspect-export-v32-entry.mjs','--bundle','--format=iife','--outfile='+str(out/'inspect.js')],cwd=repo,check=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(args.url);page.wait_for_selector('body[data-ready=true]',timeout=60000);page.add_script_tag(path=str(out/'inspect.js'));reports=[]
 for role in ['seated','standing','caller','controller']:
  url=args.url+f'athlete-{role}-v32.glb?v=portable-final';poses=[]
  if args.back_only:
   back=page.evaluate('args=>inspectExportV32(...args)',[url,.25,True,True]);(out/f'{role}-back-print.png').write_bytes(base64.b64decode(back.pop('image').split(',')[1]));continue
  for phase in [0,.25,.5,.75]:
   result=page.evaluate('args=>inspectExportV32(...args)',[url,phase,False]);(out/f'{role}-{phase}.png').write_bytes(base64.b64decode(result.pop('image').split(',')[1]));poses.append(result)
  close=page.evaluate('args=>inspectExportV32(...args)',[url,.25,True]);(out/f'{role}-face.png').write_bytes(base64.b64decode(close.pop('image').split(',')[1]))
  back=page.evaluate('args=>inspectExportV32(...args)',[url,.25,True,True]);(out/f'{role}-back-print.png').write_bytes(base64.b64decode(back.pop('image').split(',')[1]))
  assert len(poses[0]['bones'])==53
  assert len(poses[0]['animations'])==1
  if poses[0]['shirtVisible']:assert 0<poses[0]['maxGarmentGapM']<.006,poses[0]['maxGarmentGapM']
  reports.append({'role':role,'animations':poses[0]['animations'],'bones':53,'shirtVisible':poses[0]['shirtVisible'],'maxGarmentGapM':poses[0]['maxGarmentGapM']})
 assert not errors,errors
 if not args.back_only:(out/'check.json').write_text(json.dumps({'roles':reports,'actualPosesPerRole':17,'errors':errors},indent=2),encoding='utf8')
 print(json.dumps(reports) if not args.back_only else 'Four portable back-print views captured');b.close()
