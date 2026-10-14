"""Inspect actual face profiles, distribution and shared body/UV invariants."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page(viewport={'width':1200,'height':900});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(args.url);pg.wait_for_selector('body[data-ready=true]',timeout=60000);pg.locator('#view').click();pg.locator('#posture').select_option('caller');pg.locator('#study-focus').select_option('face');pg.evaluate('illustratedPreview.seek(.28)');profiles=[]
 for face in range(12):
  pg.locator('#study-face').select_option(str(face));pg.locator('#scene').screenshot(path=str(out/f'face-{face}.png'))
  profiles.append(pg.evaluate('''()=>{const g=illustratedPreview.hybrid.actors.find(a=>a.role==='caller').skin.geometry;let finite=true,unitNormalError=0;for(const [name,a]of Object.entries(g.attributes)){for(const n of a.array)if(!Number.isFinite(n))finite=false;}const n=g.attributes.normal;for(let i=0;i<n.count;i++)unitNormalError=Math.max(unitNormalError,Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1));return {...g.userData.face,finite,unitNormalError};}'''))
 assert len({r['name'] for r in profiles})==12 and all(r['maxDisplacementM']<.02 and r['changedVertices']>1000 and r['finite'] and r['unitNormalError']<1e-4 for r in profiles),profiles
 distributions=pg.evaluate('''()=>{const h=illustratedPreview.hybrid,out=[];for(const teamId of ['tum-nup-2','prek-on-dok-2']){h.render(.25,1,{teamId});out.push({teamId,faces:h.actors.map(a=>a.variant)});}return out;}''')
 assert len(set(distributions[0]['faces']))==12 and len(set(distributions[1]['faces']))==12 and distributions[0]['faces']!=distributions[1]['faces'],distributions
 assert not errors,errors;(out/'check.json').write_text(json.dumps({'url':args.url,'profiles':profiles,'seededTeamDistributions':distributions,'source':'12 generic authored localized morphs of one licensed anatomy; not named athletes or scanned identities','errors':errors},ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'profiles':12,'distributionBothTeams':12,'errors':errors}));b.close()
