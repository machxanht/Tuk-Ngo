"""Build original Vietnamese cuts and explicitly sourced, pre-rendered Khmer AI cues."""
import argparse,hashlib,json,subprocess
from pathlib import Path
import numpy as np
import imageio_ffmpeg
from team_audio import apply_team_name_pack,write_team_archive

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/race-audio'
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()

def imported_khmer(cut):
 evidence=cut['aiSample'];pack=(OUT/evidence['manifest']).resolve()
 if not pack.is_relative_to(OUT.resolve()) or pack.suffix!='.json':raise ValueError('Unsafe AI manifest path')
 raw=pack.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=evidence['manifestSha256']:raise ValueError('AI sample pack changed')
 data=json.loads(raw);sample=next(s for s in data['samples'] if s['id']==evidence['id'])
 if cut['channel']!='khmer' or cut['lang']!='km' or sample['language']!='km' or sample['text']!=cut['text'] or data['sourceType']!='azure-stock-neural':raise ValueError('Only matching Khmer stock AI may be imported')
 path=(OUT/sample['file']).resolve()
 if not path.is_relative_to(OUT.resolve()) or path.suffix!='.mp3':raise ValueError('Unsafe AI audio path')
 if hashlib.sha256(path.read_bytes()).hexdigest()!=sample['sha256']:raise ValueError('AI audio bytes changed')
 return {**cut,**{k:sample[k] for k in ['file','duration','peak','bytes','sha256']},'sourceType':'azure-stock-neural',
         'synthesisEvidence':{**evidence,'voice':sample['voice'],'requestSha256':sample['requestSha256'],'sourceWavSha256':sample['sourceWavSha256'],'scriptSha256':data['scriptSha256'],'nativeListeningVerified':False}}

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--source',type=Path,help='Local original audio for the primary broadcast (legacy single-source rebuild)')
 parser.add_argument('--inputs',type=Path,help='Local JSON map: videoId -> {audio: path, captions: path}; original files stay outside Git')
 parser.add_argument('--recipe',type=Path,default=ROOT/'docs/broadcast-audio-cuts.json')
 parser.add_argument('--captions',type=Path,help='Original YouTube JSON3 CC file used to verify the selected spoken words')
 args=parser.parse_args();recipe=json.loads(args.recipe.read_text(encoding='utf-8'))
 field_path=OUT/recipe['fieldPack']['file'];field_raw=field_path.read_bytes()
 if hashlib.sha256(field_raw).hexdigest()!=recipe['fieldPack']['sha256']:raise ValueError('Changed field sound pack')
 field=json.loads(field_raw)
 for key,clip in field['clips'].items():
  path=(OUT/clip['file']).resolve()
  if not path.is_relative_to((OUT/'field').resolve()) or path.suffix!='.mp3' or clip['channel'] not in ['drums','crowd','whistle']:raise ValueError('Unsafe field asset '+key)
  if clip['sourceType'] not in ['broadcast-separated','licensed-recording'] or hashlib.sha256(path.read_bytes()).hexdigest()!=clip['sha256']:raise ValueError('Changed field recording '+key)
 primary=recipe['source']['videoId'];sources=recipe.get('sources',{primary:recipe['source']})
 inputs=json.loads(args.inputs.read_text(encoding='utf-8')) if args.inputs else {}
 if args.source:inputs[primary]={'audio':str(args.source),'captions':str(args.captions) if args.captions else None}
 used={cut.get('sourceId',primary) for cut in recipe['cuts'].values() if not cut.get('aiSample')};local={};caption_words={}
 for source_id in used:
  if source_id not in sources or source_id not in inputs:parser.error('Missing source metadata/local input: '+source_id)
  metadata=sources[source_id];source=Path(inputs[source_id]['audio']).resolve()
  if not source.is_file():parser.error('Missing local source audio: '+source_id)
  with source.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
  if digest!=metadata['sha256']:parser.error('Source differs from reviewed cut recipe: '+source_id)
  local[source_id]=source
  if metadata.get('captions'):
   captions=inputs[source_id].get('captions')
   if not captions or not Path(captions).is_file():parser.error('Missing original JSON3 CC: '+source_id)
   raw=Path(captions).read_bytes()
   if hashlib.sha256(raw).hexdigest()!=metadata['captions']['sha256']:parser.error('Caption track differs from reviewed cut recipe: '+source_id)
   words=set()
   for event in json.loads(raw)['events']:
    for segment in event.get('segs',[]):
     text=segment.get('utf8','').strip()
     if text:words.add((round((event.get('tStartMs',0)+segment.get('tOffsetMs',0))/1000,3),text))
   caption_words[source_id]=words
 for key,cut in recipe['cuts'].items():
  if cut.get('aiSample'):
   imported_khmer(cut)
   continue
  if cut['channel'] not in ['voice','khmer']:continue
  words=caption_words.get(cut.get('sourceId',primary),set());evidence=cut.get('captionEvidence',{});selected=evidence.get('words',[])
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
    if fact['season']>=recipe.get('rosterSeason',2025) or not fact['sources'] or fact['audioKey'] not in profile['history']['voice']+profile['history']['khmer']:raise ValueError('Unverified historical entry '+registration)
   profile['availability']={key:bool(profile[section][channel]) for key,section,channel in [('nameVi','names','voice'),('nameKm','names','khmer'),('historyVi','history','voice'),('historyKm','history','khmer')]}
 OUT.mkdir(parents=True,exist_ok=True)
 previous=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')) if (OUT/'manifest.json').exists() else {'clips':{}}
 clips={}
 for key,cut in recipe['cuts'].items():
  if cut.get('aiSample'):
   clip=imported_khmer(cut)
   raw=subprocess.run([FFMPEG,'-v','error','-i',str(OUT/clip['file']),'-ar','24000','-ac','1','-f','f32le','-'],check=True,capture_output=True)
   pcm=np.frombuffer(raw.stdout,dtype='<f4');peak=float(np.max(np.abs(pcm)))
   if not .01<peak<=1 or abs(len(pcm)/24000-clip['duration'])>.04:raise ValueError('Invalid pre-rendered Khmer audio '+key)
   clips[key]={**clip,'peak':round(peak,6)}
   continue
  source_id=cut.get('sourceId',primary);source=local[source_id]
  start,end=cut['start'],cut['end'];duration=end-start
  if not 0<=start<end<=sources[source_id]['duration'] or not .08<duration<24:raise ValueError('Invalid cut '+key)
  voice=cut['channel'] in ['voice','khmer'];path=OUT/(key+'.mp3')
  filters=['highpass=f=75','lowpass=f=9000'] if voice else ['highpass=f=55','lowpass=f=1100'] if cut['channel']=='drums' else ['highpass=f=90','lowpass=f=7000']
  filters += ['afade=t=in:d=0.008',f'afade=t=out:st={max(0,duration-.045):.4f}:d=0.045']
  # Sub-second names do not provide a stable R128 loudness window. Normalize
  # their measured filtered peak with MP3 headroom instead of driving to 0 dBFS.
  processing={'normalization':'loudness'}
  if cut.get('role')=='team-name' or voice and duration<1.5:
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
  clips[key]={**cut,'sourceId':source_id,'sourceUrl':sources[source_id]['url'],'file':path.name,'duration':round(len(pcm)/24000,4),'peak':round(peak,4),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceType':'broadcast','sourceStart':start,'sourceEnd':end,'processing':processing}
 if set(clips)&set(field['clips']):raise ValueError('Duplicate sound pack key')
 clips.update(field['clips'])
 coverage={key:sum(bool(p['availability'][key]) for p in profiles.values()) for key in ['nameVi','nameKm','historyVi','historyKm']}
 manifest={'schema':4,'mode':'broadcast-vi-ai-km','speechPolicy':{'voice':'original-broadcast-only','khmer':'pre-rendered-azure-stock-neural-with-original-broadcast-names','runtimeSynthesis':False},'source':recipe['source'],'sources':sources,'review':recipe['review'],'ambience':recipe['ambience'],'warmup':recipe['warmup'],'events':recipe['events'],'clips':clips,'teamProfiles':profiles,'teamCoverage':coverage}
 manifest['field']={key:field[key] for key in ['grooves','ambience','whistle']}
 manifest['fieldPack']=recipe['fieldPack']
 apply_team_name_pack(manifest,recipe.get('teamNamePack'),OUT)
 # Remove only obsolete generated MP3s in this exact asset directory.
 for old in previous['clips'].values():
  path=(OUT/old['file']).resolve()
  if not path.is_relative_to(OUT.resolve()) or path.suffix!='.mp3':raise ValueError('Unsafe obsolete audio path')
  # Imported trial assets have their own owner; this builder owns only root cuts.
  if path.parent==OUT.resolve() and path.name not in {c['file'] for c in clips.values()} and path.exists():path.unlink()
 if profiles:
  write_team_archive(manifest,OUT)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({'clips':len(clips),'bytes':sum(c['bytes'] for c in clips.values()),'originalVietnamese':sum(c['channel']=='voice' and c['sourceType']=='broadcast' for c in clips.values()),'syntheticKhmer':sum(c['sourceType']=='azure-stock-neural' for c in clips.values()),'sources':len(used)}))

if __name__=='__main__':main()
