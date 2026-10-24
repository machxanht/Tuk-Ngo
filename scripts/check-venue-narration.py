"""Real game/Web Audio playback and venue isolation; no native pronunciation claim."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8779/Tuk-Ngo/')
parser.add_argument('--out',required=True)
parser.add_argument('--venue',choices=['maspero','phnom-penh','siem-reap'])
parser.add_argument('--language',choices=['vi','km','en'])
parser.add_argument('--intro-delay-ms',type=int,default=0)
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
original=json.loads((root/'public/assets/race-audio/manifest.json').read_text(encoding='utf-8'))
english=json.loads((root/'public/assets/race-audio/english/manifest.json').read_text(encoding='utf-8'))
venues=json.loads((root/'public/assets/race-audio/venues/manifest.json').read_text(encoding='utf-8'))
clips={**original['clips'],**english['clips'],**venues['clips']}
api="document.querySelector('[data-testid=art-stage]')?.boatPreview"
report={'nativeListeningVerified':False,'introFetchDelayMs':args.intro_delay_ms,'cases':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 context=browser.new_context(viewport={'width':1024,'height':768},device_scale_factor=2,has_touch=True)
 context.add_init_script('const audioCase=new URLSearchParams(location.search);if(audioCase.has("qaVenue")){localStorage.setItem("tukngo-venue",audioCase.get("qaVenue"));localStorage.setItem("tukngo-language",audioCase.get("qaLanguage"));localStorage.setItem("tukngo-race-audio",JSON.stringify({enabled:true}));}')
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 if args.intro_delay_ms:
  def delayed_intro(route):time.sleep(args.intro_delay_ms/1000);route.continue_()
  page.route('**/race-audio/venues/*-intro-*.mp3*',delayed_intro)
 try:
  for venue in ([args.venue]if args.venue else['maspero','phnom-penh','siem-reap']):
   for language in ([args.language]if args.language else['vi','km','en']):
    # Start every case with storage set before React modules/effects can run.
    page.goto(args.url+('&'if '?'in args.url else'?')+'qaVenue='+venue+'&qaLanguage='+language)
    page.wait_for_function('!!'+api+'&&'+api+".game.state.venueId==='"+venue+"'",timeout=120000)
    page.locator('.game-quick').click();page.locator('.selection-start').click()
    page.wait_for_function(api+".game.state.phase==='intro'",timeout=90000)
    if language!='vi':
     page.wait_for_function(api+".audio.stats().played.some(p=>p.cue==='flyover')",timeout=20000)
     flyover=page.evaluate(api+".audio.stats().played.find(p=>p.cue==='flyover')")
     assert flyover['key']in venues['events'][venue][language]['flyover'],flyover
     page.wait_for_function(api+'.audio.stats().outputRms>.001',timeout=10000)
    page.evaluate(api+'.game.skipIntro()')
    page.wait_for_function(api+".game.state.phase==='racing'",timeout=10000)
    page.wait_for_function(api+".audio.stats().played.some(p=>p.cue==='intro')",timeout=30000)
    page.wait_for_function(api+'.audio.stats().outputRms>.001',timeout=10000)
    data=page.evaluate(api+'.audio.stats()');pair=data['teams']
    assert data['context']=='running' and data['language']==language and not data['errors'],data
    for item in data['played']:
     clip=clips[item['key']];assert clip['lang']==language,(venue,language,item)
     if clip.get('venueIds'):assert venue in clip['venueIds'],item
     if clip.get('teamIds'):assert any(t in pair for t in clip['teamIds']),(item,pair)
     if language=='vi':assert clip['sourceType']=='broadcast',clip
     else:assert any(s in clip['sourceType'].lower()for s in ['neural','synthes']),clip
    intro=[i['key']for i in data['played']if i['cue']=='intro']
    if language!='vi':assert any(key in venues['events'][venue][language]['intro']for key in intro),intro
    report['cases'].append({'venue':venue,'language':language,'intro':intro,'keys':[i['key']for i in data['played']],'rms':data['outputRms'],'decoded':data['decoded'],'actualWebAudio':True})
    print(venue,language,'playback passed',flush=True)
 except Exception:
  report['failure']={'venue':venue,'language':language,'audio':page.evaluate(api+'.audio.stats()'),'game':page.evaluate(api+'.game.snapshot()')};page.screenshot(path=str(out/'failure.png'));raise
 finally:
  (out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  browser.close()
 assert len(report['cases'])==(1 if args.venue else 3)*(1 if args.language else 3) and not report['errors'],report
