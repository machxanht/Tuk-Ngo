"""Real Web Audio decoding/output, race-linked cues and tablet audio controls."""
import argparse,json
from pathlib import Path
from urllib.parse import urlsplit
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
 page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if '/race-audio/' in r.url and '/menu/' not in r.url else None)
 page.goto(args.url);page.wait_for_selector('[data-render-mode=race]',timeout=90000)
 page.get_by_role('button',name='Cúp lễ hội · 61 ghe',exact=True).tap()
 page.locator('.team-profile>summary').tap()
 assert page.evaluate(audio+'.stats().context')=='uninitialized'
 assert not responses,'Audio must not compete with initial GLBs'
 # Real source-name/history playback in the setup, without advancing the cup.
 page.get_by_role('button',name='Nghe tên Việt · Khmer',exact=True).tap()
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='name-tum-nup-km'&&p.kind==='name'&&p.at+.4<s.audioTime);}",timeout=25000)
 report['namePreview']=page.evaluate(audio+'.stats()')
 assert {'name-tum-nup-two-vi','name-tum-nup-km'}.issubset(p['key'] for p in report['namePreview']['played'])
 assert len([r for r in responses if '.mp3' in r['url']])==2,'Name audition loads only this team, not the full library'
 assert page.evaluate(boat+".game.state.phase")=='ready'
 page.wait_for_function(audio+'.stats().previewing===false')
 page.get_by_role('button',name='Nghe lịch sử thi đấu',exact=True).tap()
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='history-tum-nup-champion-vi'&&p.at+.2<s.audioTime);}")
 assert page.get_by_role('link',name='Nguồn 2024',exact=True).count()==1
 page.get_by_role('button',name='Dừng nghe lịch sử',exact=True).tap()
 assert page.evaluate(audio+'.stats().sources')==0
 page.get_by_role('listbox',name='Chọn đội ghe',exact=True).select_option('can_tho-05')
 page.get_by_role('button',name='Nghe lịch sử thi đấu',exact=True).tap()
 page.get_by_text('Chưa tìm được đoạn BLV kể thành tích cũ của đội này.',exact=True).wait_for()
 assert page.evaluate(audio+'.stats().sources')==0
 page.get_by_role('listbox',name='Chọn đội ghe',exact=True).select_option('can_tho-06')
 page.get_by_role('button',name='Nghe lịch sử thi đấu',exact=True).tap()
 page.wait_for_function(audio+".stats().played.some(p=>p.key==='history-sro-lon-third-vi'&&p.kind==='history')")
 page.get_by_role('listbox',name='Chọn đội ghe',exact=True).select_option('can_tho-10')
 page.wait_for_function(audio+'.stats().sources===0')
 page.get_by_role('button',name='Nghe tên Việt · Khmer',exact=True).tap()
 page.get_by_text('Chưa xác định được bản thu tên đội này trong clip.',exact=True).wait_for()
 assert page.evaluate(audio+'.stats().sources')==0
 report['missingTeam']=page.evaluate(audio+'.stats()')
 page.get_by_role('listbox',name='Chọn đội ghe',exact=True).select_option('tum-nup-2')
 report['profileViewports']=[]
 for width,height in [(1024,768),(768,1024),(1180,430)]:
  page.set_viewport_size({'width':width,'height':height})
  for name in ['Nghe tên Việt · Khmer','Nghe lịch sử thi đấu']:
   button=page.get_by_role('button',name=name,exact=True);button.scroll_into_view_if_needed();box=button.bounding_box()
   assert box['height']>=44 and box['x']>=0 and box['x']+box['width']<=width
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'team-profile-{width}x{height}.png'))
  report['profileViewports'].append([width,height])
 page.set_viewport_size({'width':1180,'height':820})
 page.get_by_role('button',name='Bắt đầu cúp 61 ghe',exact=True).tap()
 page.wait_for_function(audio+".stats().cues.includes('ready')",timeout=20000)
 page.wait_for_function(audio+".stats().outputRms>.004",timeout=15000)
 report['start']=page.evaluate(audio+'.stats()')
 assert report['start']['context']=='running' and report['start']['decoded']>=4
 assert 'ready' in report['start']['cues']
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='broadcast-shore-paragraph'&&p.at+6.5<s.audioTime);}",timeout=25000)
 page.wait_for_function(audio+'.stats().whistleBlows>=4',timeout=15000)
 report['intro']=page.evaluate(audio+'.stats()')
 assert report['intro']['origin']=='broadcast-vi-ai-km' and report['intro']['sourceVideo']=='crZF3hghbgQ'
 assert {'broadcast-intro','broadcast-shore-paragraph'}.issubset(p['key'] for p in report['intro']['played'])
 assert any(p.get('cue')=='go' and p['key'].startswith('broadcast-') for p in report['intro']['played'])
 assert any(p['key']=='name-tum-nup-two-vi' and not p.get('kind') and len(p['match'])==2 for p in report['intro']['played'])
 page.get_by_role('button',name='Tạm dừng cuộc đua',exact=True).tap();page.wait_for_timeout(200)
 report['pause']=page.evaluate(audio+'.stats()');assert report['pause']['sources']==0 and not report['pause']['queued'] and report['pause']['outputRms']<.0001
 page.get_by_role('dialog',name='Nghỉ một nhịp',exact=True).get_by_role('button',name='Tiếp tục cuộc đua',exact=True).tap()
 page.wait_for_function(audio+'.stats().sources>0')
 page.get_by_role('button',name='Tắt âm thanh',exact=True).tap();page.wait_for_timeout(150)
 report['mute']=page.evaluate(audio+'.stats()');assert report['mute']['sources']==0 and report['mute']['outputRms']<.0001
 page.get_by_role('button',name='Bật âm thanh',exact=True).tap()
 page.wait_for_function(audio+'.stats().sources>0')
 page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
 page.get_by_label('BLV Việt (âm gốc)',exact=True).uncheck();page.get_by_label('Trống nhịp chèo',exact=True).uncheck()
 page.get_by_label('Âm lượng',exact=True).focus();page.keyboard.press('Home')
 for _ in range(11):page.keyboard.press('ArrowRight')
 report['mix']=page.evaluate(audio+'.stats().mix');assert not report['mix']['voice'] and not report['mix']['drums'] and report['mix']['volume']==.55
 assert json.loads(page.evaluate("localStorage.getItem('tukngo-race-audio')"))==report['mix']
 page.get_by_label('BLV Việt (âm gốc)',exact=True).check();page.get_by_label('Trống nhịp chèo',exact=True).check()
 report['viewports']=[]
 for width,height in [(1024,768),(768,1024),(1180,430)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
  options=page.locator('.game-audio-options>div').bounding_box()
  if width==1024:page.screenshot(path=str(out/'mix-controls.png'))
  assert options['x']>=0 and options['x']+options['width']<=width
  for label in ['BLV Việt (âm gốc)','Bình luận Khmer (AI)','Còi HLV theo nhịp dầm','Trống nhịp chèo','Khán giả hai bờ']:
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
 # Hear a complete mid-course passage and the following routine call in real time.
 page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<90000&&g.state.distances[0]<205;i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}}''')
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.cue==='cruise'&&p.duration>=6&&p.at+p.duration<s.audioTime);}",timeout=40000)
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.cue==='race-call'&&p.duration>=5&&p.at<s.audioTime);}",timeout=40000)
 report['continuous']=page.evaluate(audio+'.stats()')
 assert report['continuous']['drumLoops']>=1 and report['continuous']['whistleBlows']>=20
 page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
 page.get_by_label('Còi HLV theo nhịp dầm',exact=True).uncheck();page.wait_for_timeout(120)
 assert page.evaluate(audio+".stats().sourcesByChannel.whistle")==0
 assert page.evaluate(audio+".stats().sourcesByChannel.drums")>=1
 page.get_by_label('Còi HLV theo nhịp dầm',exact=True).check()
 page.get_by_label('Tùy chỉnh âm thanh',exact=True).tap()
 # Advance the actual fixed-step race using legal strokes, without injecting
 # distance, charge or result. Skipped milestones must not become an audio queue.
 page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<90000&&g.state.distances[0]<960;i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}}''')
 try:page.wait_for_function(audio+".stats().cues.includes('final')",timeout=15000)
 except Exception:
  diagnostic={'audio':page.evaluate(audio+'.stats()'),'race':page.evaluate(boat+'.game.snapshot()'),'errors':errors}
  (out/'failure.json').write_text(json.dumps(diagnostic,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n');page.screenshot(path=str(out/'failure.png'));raise
 page.wait_for_function(audio+".stats().strongWhistles>=1&&"+audio+".stats().drumBpm>=102",timeout=15000)
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.cue==='final'&&p.at<s.audioTime);}",timeout=15000)
 report['final']=page.evaluate(audio+'.stats()');assert not any(c in report['final']['queued'] for c in ['cruise','halfway'])
 page.get_by_role('button',name='ĐẠP!',exact=False).tap()
 page.wait_for_function(audio+".stats().cues.includes('surge')")
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.cue==='surge'&&p.at<s.audioTime);}",timeout=15000)
 report['surge']=page.evaluate(audio+'.stats()');assert report['surge']['whistleBlows']>report['intro']['whistleBlows']
 page.evaluate('''()=>{const a=document.querySelector('[data-testid=art-stage]').boatPreview,g=a.game;let next=Math.floor(g.state.beatPhase)+1;for(let i=0;i<70000&&g.state.phase!=='finished';i++){a.advance(1/240);if(g.state.phase==='racing'&&g.state.beatPhase>=next){g.stroke();next++;}}}''')
 page.wait_for_selector('[aria-label="Kết quả trận đua"]',timeout=15000)
 page.wait_for_function(audio+".stats().cues.includes('finish')")
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.cue==='finish'&&p.key.startsWith('broadcast-')&&p.at<s.audioTime);}",timeout=15000)
 page.wait_for_function("()=>{const s="+audio+".stats();return s.played.some(p=>p.key==='ai-finish-win-km'&&p.at<s.audioTime);}",timeout=15000)
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
 manifest=page.request.get(args.url.rstrip('/')+'/assets/race-audio/manifest.json').json()
 # The records capture the actual state at scheduling, after fetch/decode.
 for played in report['finish']['played']:
  if played.get('kind') or not played.get('state'):continue
  clip=manifest['clips'][played['key']];rules=clip.get('conditions',{});state=played['state']
  if 'phases' in rules:assert state['phase'] in rules['phases'],played
  if 'minDistance' in rules:assert state['distance']>=rules['minDistance'],played
  if 'maxDistance' in rules:assert state['distance']<rules['maxDistance'],played
  if 'maxAbsGap' in rules:assert abs(state['gap'])<=rules['maxAbsGap'],played
  if 'results' in rules:assert state['result'] in rules['results'],played
 assert all(p['key']!='broadcast-wait' for p in report['finish']['played'])
 allowed={args.url.rstrip('/')+'/assets/race-audio/'+clip['file'] for clip in manifest['clips'].values()}
 assert all(r['url'].split('?')[0] in allowed for r in responses if '.mp3' in r['url']),'Only attributed original recordings or explicit Khmer AI assets'
 assert all(manifest['clips'][p['key']]['sourceType']=='broadcast' for p in report['finish']['played'] if manifest['clips'][p['key']]['channel']=='voice')
 assert any(manifest['clips'][p['key']]['sourceType']=='azure-stock-neural' for p in report['finish']['played']), 'Khmer AI must actually play during the race'
 assert report['finish']['khmerClips']>=3
 report['responses']=responses;report['errors']=errors
 browser.close()
(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'intro':report['intro']['teams'],'whistleBlows':report['finish']['whistleBlows'],'drumLoops':report['finish']['drumLoops'],'clipsDecoded':report['finish']['decoded'],'startOutputRms':report['start']['outputRms'],'result':report['result']['result'],'errors':errors}))
