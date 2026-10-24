"""Measure the loaded canonical crew over a full stroke on both hull types."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/');p.add_argument('--diagnostic',required=True);p.add_argument('--out',required=True);args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
api="document.querySelector('[data-testid=art-stage]')?.boatPreview";report={'constructions':{},'errors':[]}
with sync_playwright() as tool:
 browser=tool.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1024,'height':768});page.add_init_script("localStorage.setItem('tukngo-venue','maspero');localStorage.setItem('tukngo-race-audio',JSON.stringify({enabled:false}));")
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 try:
  page.goto(args.url);page.wait_for_function('!!'+api,timeout=120000);page.locator('.game-quick').click();page.add_script_tag(path=args.diagnostic)
  for kind in ['plywood','dugout']:
   page.evaluate('(kind)=>'+api+'.rig.setConstruction(kind)',kind);results=[]
   for offset in range(0,96,12):
    results.append(page.evaluate('(offset)=>crewCheck.checkCrewClearance('+api+',{phases:12,phaseOffset:offset,phaseTotal:96})',offset));print(kind,offset+12,'/96',flush=True)
   report['constructions'][kind]=results;page.screenshot(path=str(out/(kind+'-crew.png')))
 finally:
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');browser.close()
 assert not report['errors'],report['errors']
 assert all(r['pass']for rows in report['constructions'].values()for r in rows),report['constructions']
 print('96 loaded-mesh phases passed for plywood and dugout')
