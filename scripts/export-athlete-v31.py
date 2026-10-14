"""Export the actual fitted renderer athletes through the development bundle."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--bundle',default='E:/AI/Um Tuk/asset-studio/hybrid-v31/exporter.js');parser.add_argument('--out',default='public/assets/illustrated-v22');args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(args.url);pg.wait_for_selector('body[data-ready=true]',timeout=60000);pg.add_script_tag(path=args.bundle);reports=[]
 for posture,face in [('seated',2),('caller',9)]:
  with pg.expect_download(timeout=30000) as download:report=pg.evaluate('options=>exportAthleteV31(options)',{'posture':posture,'face':face,'teamId':'tum-nup-2'})
  download.value.save_as(out/f'athlete-{posture}-v31.glb');reports.append(report)
 assert not errors,errors;(out/'athlete-v31-manifest.json').write_text(json.dumps({'exports':reports,'errors':errors,'source':'Current hybrid renderer; generic CC0 human with authored 2025 Tum Nup palette','portableAppearanceLimit':'Hair and stubble are smooth vertex colours; fine procedural grain is not baked. Other team styles remain runtime selections.'},indent=2),encoding='utf8');print(json.dumps(reports));b.close()
