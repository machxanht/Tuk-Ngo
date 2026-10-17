"""Cut actual Vietnamese/Khmer broadcast speech and field percussion, without TTS."""
import argparse,hashlib,json,subprocess,zipfile
from pathlib import Path
import numpy as np
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/race-audio'
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--source',required=True,type=Path,help='Local original audio downloaded from the attributed broadcast')
 parser.add_argument('--recipe',type=Path,default=ROOT/'docs/broadcast-audio-cuts.json')
 parser.add_argument('--captions',type=Path,help='Original YouTube JSON3 CC file used to verify the selected spoken words')
 args=parser.parse_args();source=args.source.resolve();recipe=json.loads(args.recipe.read_text(encoding='utf-8'))
 if not source.is_file():parser.error('Missing local source audio')
 digest=hashlib.sha256(source.read_bytes()).hexdigest()
 if digest!=recipe['source']['sha256']:parser.error('Source differs from the reviewed cut recipe; verify it before rebuilding')
 caption_source=recipe['source'].get('captions')
 if caption_source:
  if not args.captions or not args.captions.is_file():parser.error('This recipe requires --captions with the original YouTube JSON3 CC file')
  raw=args.captions.read_bytes()
  if hashlib.sha256(raw).hexdigest()!=caption_source['sha256']:parser.error('Caption track differs from the reviewed cut recipe')
  words=set()
  for event in json.loads(raw)['events']:
   for segment in event.get('segs',[]):
    text=segment.get('utf8','').strip()
    if text:words.add((round((event.get('tStartMs',0)+segment.get('tOffsetMs',0))/1000,3),text))
  for key,cut in recipe['cuts'].items():
   if cut['channel'] not in ['voice','khmer']:continue
   evidence=cut.get('captionEvidence',{});selected=evidence.get('words',[])
   if not selected or not all(tuple(word) in words and cut['start']<=word[0]<cut['end'] for word in selected):raise ValueError('Missing or mismatched caption words: '+key)
   actual=sorted(word for word in words if cut['start']<=word[0]<cut['end'])
   if actual!=sorted(tuple(word) for word in selected):raise ValueError('Unreviewed words inside cut: '+key)
   if cut['end']>evidence['nextWordStart']:raise ValueError('Cut includes the following phrase: '+key)
 profiles=recipe.get('teamProfiles',{})
 if profiles:
  roster=json.loads((ROOT/'public/assets/data/roster-2025.json').read_text(encoding='utf-8'))['records']
  if set(profiles)!={team['id'] for team in roster}:raise ValueError('Team audio profiles must cover the exact registration roster')
  for registration,profile in profiles.items():
   for section,role in [('names','team-name'),('history','team-history')]:
    for channel in ['voice','khmer']:
     for key in profile[section][channel]:
      cut=recipe['cuts'][key]
      if cut.get('role')!=role or cut['channel']!=channel or registration not in cut['teamIds']:raise ValueError('Wrong team/channel in profile '+registration)
   for fact in profile['historyFacts']:
    if fact['season']>=2025 or not fact['sources'] or fact['audioKey'] not in profile['history']['voice']+profile['history']['khmer']:raise ValueError('Unverified historical entry '+registration)
   profile['availability']={key:bool(profile[section][channel]) for key,section,channel in [('nameVi','names','voice'),('nameKm','names','khmer'),('historyVi','history','voice'),('historyKm','history','khmer')]}
 OUT.mkdir(parents=True,exist_ok=True)
 previous=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')) if (OUT/'manifest.json').exists() else {'clips':{}}
 clips={}
 for key,cut in recipe['cuts'].items():
  start,end=cut['start'],cut['end'];duration=end-start
  if not 0<=start<end<=recipe['source']['duration'] or not .08<duration<15:raise ValueError('Invalid cut '+key)
  voice=cut['channel'] in ['voice','khmer'];path=OUT/(key+'.mp3')
  filters=['highpass=f=75','lowpass=f=9000'] if voice else ['highpass=f=55','lowpass=f=1100'] if cut['channel']=='drums' else ['highpass=f=90','lowpass=f=7000']
  filters += ['afade=t=in:d=0.008',f'afade=t=out:st={max(0,duration-.045):.4f}:d=0.045']
  # Sub-second names do not provide a stable R128 loudness window. Normalize
  # their measured filtered peak with MP3 headroom instead of driving to 0 dBFS.
  processing={'normalization':'loudness'}
  if cut.get('role')=='team-name':
   raw=subprocess.run([FFMPEG,'-v','error','-ss',str(start),'-i',str(source),'-t',str(duration),'-af',','.join(filters),'-ar','24000','-ac','1','-f','f32le','-'],check=True,capture_output=True)
   measured=float(np.max(np.abs(np.frombuffer(raw.stdout,dtype='<f4'))))
   if measured<.0001:raise ValueError('Silent name cut '+key)
   gain=min(8,.72/measured);filters.append(f'volume={gain:.9f}');processing={'normalization':'peak','gain':round(gain,9),'targetPeak':.72}
  else:filters.append('loudnorm=I=-17:TP=-2:LRA=7' if voice else 'loudnorm=I=-20:TP=-3:LRA=7')
  subprocess.run([FFMPEG,'-v','error','-y','-ss',str(start),'-i',str(source),'-t',str(duration),'-af',','.join(filters),'-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','96k',str(path)],check=True,capture_output=True)
  decoded=subprocess.run([FFMPEG,'-v','error','-i',str(path),'-ar','24000','-ac','1','-f','f32le','-'],check=True,capture_output=True)
  pcm=np.frombuffer(decoded.stdout,dtype='<f4');peak=float(np.max(np.abs(pcm)))
  if peak<.01 or len(pcm)<1920:raise RuntimeError('Empty cut '+key)
  if peak>1:raise RuntimeError('Clipping after encoding '+key)
  clips[key]={**cut,'file':path.name,'duration':round(len(pcm)/24000,4),'peak':round(peak,4),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceType':'broadcast','sourceStart':start,'sourceEnd':end,'processing':processing}
 coverage={key:sum(bool(p['availability'][key]) for p in profiles.values()) for key in ['nameVi','nameKm','historyVi','historyKm']}
 manifest={'schema':2,'mode':'broadcast','source':recipe['source'],'review':recipe['review'],'ambience':recipe['ambience'],'warmup':recipe['warmup'],'events':recipe['events'],'clips':clips,'teamProfiles':profiles,'teamCoverage':coverage}
 # Remove only obsolete generated MP3s in this exact asset directory.
 for old in previous['clips'].values():
  path=(OUT/old['file']).resolve()
  if path.parent!=OUT.resolve() or path.suffix!='.mp3':raise ValueError('Unsafe obsolete audio path')
  if path.name not in {c['file'] for c in clips.values()} and path.exists():path.unlink()
 if profiles:
  archive=OUT/'team-audio.zip'
  with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as bundle:
   def put(name,data):
    info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;bundle.writestr(info,data)
   put('README.txt','Original recordings from https://www.youtube.com/watch?v=crZF3hghbgQ\n'+json.dumps(coverage)+'\nEach folder is one 2025 registration, not a race bib. Missing audio stays missing; profiles record exact source ranges, CC evidence and historical sources. Automatic CC/name matching has not received independent listening verification. Copyright remains with the broadcaster.\n')
   for registration,profile in sorted(profiles.items()):
    keys=sorted({key for section in ['names','history'] for channel in ['voice','khmer'] for key in profile[section][channel]})
    put(registration+'/profile.json',json.dumps({**profile,'source':recipe['source'],'recordings':{key:clips[key] for key in keys}},ensure_ascii=False,indent=2)+'\n')
    for key in keys:put(registration+'/'+clips[key]['file'],(OUT/clips[key]['file']).read_bytes())
  manifest['downloads']={'teamAudio':{'file':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({'clips':len(clips),'bytes':sum(c['bytes'] for c in clips.values()),'syntheticClips':0,'sourceSha256':digest}))

if __name__=='__main__':main()
