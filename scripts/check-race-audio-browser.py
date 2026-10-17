"""Real Web Audio decoding/output, race-linked cues and tablet audio controls."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4173/Tuk-Ngo/');parser.add_argument('--out',default='docs/qa/race-audio/local');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'physicalTabletTested':False};errors=[];responses=[]
audio="document.querySelector('[data-testid=art-stage]').boatPreview.audio"
boat="document.querySelector('[data-testid=art-stage]').boatPreview"
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1180,'height':820},has_touch=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if '/race-audio/' in r.url else None)
 page.goto(args.url);page.wait_for_selector('[data-render-mode=race]',timeout=90000)
 assert page.evaluate(audio+'.stats().context')=='uninitialized'
 assert not responses,'Audio must not compete with initial GLBs'
 page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).tap()
 page.wait_for_function(audio+".stats().voiceClips>=1",timeout=20000)
 page.wait_for_function(audio+".stats().outputRms>.004",timeout=15000)
 report['start']=page.evaluate(audio+'.stats()')
 assert report['start']['context']=='running' and report['start']['decoded']>=4
 assert 'ready' in report['start']['cues']
 page.wait_for_function(audio+".stats().played.filter(p=>p.key.startsWith('name-')).length>=2",timeout=25000)
 page.wait_for_function(audio+'.stats().drumHits>=4',timeout=15000)
 report['intro']=page.evaluate(audio+'.stats()')
 assert set('name-'+id for id in report['intro']['teams']).issubset(p['key'] for p in report['intro']['played'])
 page.get_by_role('button',name='Tạm dừng cuộc đua',exact=True).tap();page.wait_for_timeout(200)
 report['pause']=page.evaluate(audio+'.stats()');assert report['pause']['sources']==0 and not report['pause']['queued'] and report['pause']['outputRms']<.0001
 page.get_by_role('button',name='Tiếp tục cuộc đua',exact=True).tap()
 page.wait_for_function(audio+'.stats().sources>0')
 page.get_by_role('button',name='Tắt âm thanh',exact=True).tap();page.wait_for_timeout(150)
 report['mute']=page.evaluate(audio+'.stats()');assert report['mute']['sources']==0 and report['mute']['outputRms']<.0001
 page.get_by_role('button',name='Bật âm thanh',exact=True).tap()
 page.wait_for_function(audio+'.stats().sources>0')
 page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
 page.get_by_label('Bình luận tiếng Việt',exact=True).uncheck();page.get_by_label('Trống nhịp chèo',exact=True).uncheck()
 page.get_by_label('Âm lượng',exact=True).focus();page.keyboard.press('Home')
 for _ in range(11):page.keyboard.press('ArrowRight')
 report['mix']=page.evaluate(audio+'.stats().mix');assert not report['mix']['voice'] and not report['mix']['drums'] and report['mix']['volume']==.55
 assert json.loads(page.evaluate("localStorage.getItem('tukngo-race-audio')"))==report['mix']
 page.get_by_label('Bình luận tiếng Việt',exact=True).check();page.get_by_label('Trống nhịp chèo',exact=True).check()
 report['viewports']=[]
 for width,height in [(1024,768),(768,1024),(1180,430)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
  options=page.locator('.game-audio-options>div').bounding_box()
  if width==1024:page.screenshot(path=str(out/'mix-controls.png'))
  assert options['x']>=0 and options['x']+options['width']<=width
  for label in ['Bình luận tiếng Việt','Câu hò Khmer','Trống nhịp chèo','Tiếng khán giả']:
   box=page.get_by_label(label,exact=True).locator('..').bounding_box();assert box['height']>=44
  page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
  stage=page.locator('.game-stage').bounding_box();footer=page.locator('.game-controls').bounding_box()
  assert stage['height']>=120 and stage['y']+stage['height']<=footer['y']+.5
  assert footer['y']+footer['height']<=height+.5 and page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'audio-{width}x{height}.png'))
  report['viewports'].append({'size':[width,height],'stage':stage,'options':options})
  page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
 page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
 # Continue legal timed strokes during the real-time final audio wait.
 page.evaluate('''()=>{let last=-1;window.audioCheckStrokeTimer=setInterval(()=>{const a=document.querySelector('[data-testid=art-stage]')?.boatPreview;if(!a)return;const s=a.game.state,b=Math.round(s.beatPhase);if(s.phase==='racing'&&b>=1&&b>last&&Math.abs(s.beatPhase-b)<.08){a.game.stroke();last=b;}},20);}''')
 # Advance the actual fixed-step race using legal strokes, without injecting
 # distance, charge or result. Skipped milestones must not become an audio queue.
 page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<90000&&g.state.distances[0]<960;i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}}''')
 try:page.wait_for_function(audio+".stats().cues.includes('final')",timeout=15000)
 except Exception:
  diagnostic={'audio':page.evaluate(audio+'.stats()'),'race':page.evaluate(boat+'.game.snapshot()'),'errors':errors}
  (out/'failure.json').write_text(json.dumps(diagnostic,ensure_ascii=False,indent=2),encoding='utf-8');page.screenshot(path=str(out/'failure.png'));raise
 page.wait_for_function(audio+".stats().drumKinds['drum-rim']>=3",timeout=15000)
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='chant-encourage'&&p.at<s.audioTime);}",timeout=15000)
 report['final']=page.evaluate(audio+'.stats()');assert not any(c in report['final']['queued'] for c in ['cruise','halfway'])
 page.get_by_role('button',name='ĐẠP!',exact=False).tap()
 page.wait_for_function(audio+".stats().cues.includes('surge')")
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='chant-ho'&&p.at<s.audioTime);}",timeout=15000)
 report['surge']=page.evaluate(audio+'.stats()');assert report['surge']['drumHits']>report['intro']['drumHits']
 page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<70000&&g.state.phase!=='finished';i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}}''')
 page.wait_for_selector('[aria-label="Kết quả trận đua"]',timeout=15000)
 page.wait_for_function(audio+".stats().cues.includes('finish')")
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='chant-victory'&&p.at<s.audioTime);}",timeout=15000)
 report['finish']=page.evaluate(audio+'.stats()');report['result']=page.evaluate(boat+'.game.snapshot()')
 assert report['result']['result']=='win'
 assert not report['finish']['errors'],report['finish']['errors']
 page.get_by_role('button',name='Đua vòng tiếp theo',exact=True).tap()
 page.wait_for_function(boat+".game.state.phase==='countdown'")
 page.wait_for_function(audio+'.stats().teams[1]!=='+json.dumps(report['intro']['teams'][1]))
 report['nextHeat']=page.evaluate(audio+'.stats()');assert report['nextHeat']['queued']==[]
 page.get_by_role('button',name='Nhánh đấu',exact=True).tap();page.wait_for_timeout(200)
 assert page.evaluate(audio+'.stats().sources')==0
 page.get_by_role('button',name='Đóng nhánh đấu',exact=True).tap()
 page.get_by_role('button',name='Tắt âm thanh',exact=True).tap()
 page.evaluate('clearInterval(window.audioCheckStrokeTimer);'+audio+'.dispose()');page.wait_for_function(audio+".stats().context==='closed'")
 report['closedActiveContext']=page.evaluate(audio+'.stats()');assert report['closedActiveContext']['sources']==0
 page.reload()
 page.wait_for_selector('[data-render-mode=race]',timeout=90000)
 assert page.get_by_role('button',name='Bật âm thanh',exact=True).count()==1
 report['reload']=page.evaluate(audio+'.stats()');assert report['reload']['context']=='uninitialized' and report['reload']['mix']['volume']==.55
 page.evaluate('window.previousRaceAudio='+audio)
 page.get_by_role('button',name='Xem mô hình',exact=True).tap()
 page.wait_for_selector('.art-preview [data-render-mode=race]',timeout=90000)
 report['disposed']=page.evaluate('window.previousRaceAudio.stats()');assert report['disposed']['disposed'] and report['disposed']['context'] in ['closed','uninitialized'] and report['disposed']['sources']==0
 assert not errors,errors;assert all(r['status']==200 for r in responses),responses
 report['responses']=responses;report['errors']=errors
 browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':True,'intro':report['intro']['teams'],'drumHits':report['finish']['drumHits'],'clipsDecoded':report['finish']['decoded'],'startOutputRms':report['start']['outputRms'],'result':report['result']['result'],'errors':errors}))
