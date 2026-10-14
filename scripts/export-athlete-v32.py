"""Export four current runtime athletes; source/runtime code stays untouched."""
import argparse,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');args=parser.parse_args()
studio=repo.parent/'asset-studio/garment-v32/portable';studio.mkdir(parents=True,exist_ok=True);out=repo/'public/assets/illustrated-v22'
subprocess.run(['node',str(repo/'node_modules/esbuild/bin/esbuild'),'scripts/export-athlete-v32-entry.mjs','--bundle','--format=iife','--outfile='+str(studio/'exporter.js')],cwd=repo,check=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(args.url);page.wait_for_selector('body[data-ready=true]',timeout=60000);page.add_script_tag(path=str(studio/'exporter.js'));reports=[]
 for posture,face,team in [('seated',2,'chroi-tum-chas'),('standing',3,'chroi-tum-chas'),('caller',9,'tum-nup-2'),('controller',6,'tum-nup-2')]:
  with page.expect_download(timeout=120000) as download:report=page.evaluate('options=>exportAthleteV32(options)',{'posture':posture,'face':face,'teamId':team})
  download.value.save_as(out/f'athlete-{posture}-v32.glb');reports.append(report)
 assert not errors,errors
 (out/'athlete-v32-manifest.json').write_text(json.dumps({'exports':reports,'errors':errors,'source':'Current V32 connected-shirt runtime and authored 2025 palettes','portableAppearanceLimit':'Vertex-coloured shirts and conforming Khmer alpha print. Fine shader hair grain and thin runtime collar trim are omitted.'},indent=2),encoding='utf8')
 print(json.dumps(reports));browser.close()
