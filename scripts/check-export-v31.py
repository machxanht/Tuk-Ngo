"""Reload actual portable GLBs, render kit/face and check animated joints."""
import argparse,json,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--bundle',default='E:/AI/Um Tuk/asset-studio/hybrid-v31/inspect-export.js');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(args.url);pg.wait_for_selector('body[data-ready=true]',timeout=60000);pg.add_script_tag(path=args.bundle)
 for role in ['seated','caller']:
  poses=[]
  for phase in [0,.25,.5,.75]:
   result=pg.evaluate('args=>inspectExportV31(...args)',[args.url+f'athlete-{role}-v31.glb',phase,False]);(out/f'{role}-{phase}.png').write_bytes(base64.b64decode(result.pop('image').split(',')[1]));poses.append(result)
  one=pg.evaluate('args=>inspectExportV31(...args)',[args.url+f'athlete-{role}-v31.glb',.25,True]);(out/f'{role}-face.png').write_bytes(base64.b64decode(one.pop('image').split(',')[1]))
  assert len(poses[0]['bones'])==53;assert poses[0]['animations'][0]['tracks']>100
  hand=lambda pose:next(b['position'] for b in pose['bones'] if b['name']=='hand_l')
  movement=max(abs(a-b) for a,b in zip(hand(poses[0]),hand(poses[1])));assert movement>.01,movement
  if role=='caller':assert 0<poses[0]['maxGarmentGapM']<.006,poses[0]['maxGarmentGapM']
  reports.append({'role':role,'animations':poses[0]['animations'],'bones':53,'handMotionM':movement,'maxGarmentGapM':poses[0]['maxGarmentGapM']})
 assert not errors,errors;(out/'check.json').write_text(json.dumps({'url':args.url,'reports':reports,'errors':errors},indent=2),encoding='utf8');print(json.dumps(reports));b.close()
