"""Bake recorded coach whistle, separated broadcast drums and licensed crowd beds.

The --study folder contains the original CC0 whistle and hashed Demucs stems;
models and full broadcasts stay outside the site. No synthesized sound is used.
"""
import argparse,hashlib,json,subprocess
from pathlib import Path
import numpy as np
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/race-audio/field'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--study',required=True,type=Path)
 parser.add_argument('--inputs',required=True,type=Path)
 args=parser.parse_args();study=args.study;ff=imageio_ffmpeg.get_ffmpeg_exe()
 separations={s['id']:s for s in json.loads((study/'separation.json').read_text())}
 recipe=json.loads((ROOT/'docs/broadcast-audio-cuts.json').read_text(encoding='utf-8'))
 inputs=json.loads(args.inputs.read_text(encoding='utf-8'))
 for sid in {s['sourceId'] for s in separations.values()}:
  if sha(Path(inputs[sid]['audio']))!=recipe['sources'][sid]['sha256']:raise ValueError('Changed original '+sid)
 OUT.mkdir(parents=True,exist_ok=True);clips={}
 def bake(key,source,start,duration,filters,metadata,channels=1):
  path=OUT/(key+'.mp3');af=[*filters,'aresample=24000','apad',f'atrim=end_sample={round(duration*24000)}','asetpts=PTS-STARTPTS','afade=t=in:d=0.008',f'afade=t=out:st={duration-.012:.6f}:d=0.012']
  # Enforce duration after tempo/loudness filters, using sample timestamps. An
  # output -t / duration-based trim can shorten resampled bars by 30–90ms.
  subprocess.run([ff,'-v','error','-y','-ss',str(start),'-i',str(source),'-af',','.join(af),'-ar','24000','-ac',str(channels),'-c:a','libmp3lame','-b:a','128k' if channels==2 else '96k',str(path)],capture_output=True,check=True)
  raw=subprocess.run([ff,'-v','error','-i',str(path),'-ac','1','-ar','24000','-f','f32le','-'],capture_output=True,check=True).stdout
  pcm=np.frombuffer(raw,dtype='<f4');peak=float(np.abs(pcm).max())
  if not .01<peak<1:raise ValueError('Silent/clipped field audio '+key)
  clips[key]={**metadata,'file':'field/'+path.name,'duration':round(len(pcm)/24000,6),'peak':round(peak,6),'bytes':path.stat().st_size,'sha256':sha(path),'render':{'inputSha256':sha(source),'start':start,'requestedDuration':duration,'filters':af,'channels':channels}}
 def stem(group,label):
  s=separations[group];data=s['files'][label];path=Path(data['path'])
  if sha(path)!=data['sha256']:raise ValueError('Changed separated stem')
  return path,{'sourceType':'broadcast-separated','sourceId':s['sourceId'],'sourceUrl':recipe['sources'][s['sourceId']]['url'],'sourceStart':s['start'],'sourceEnd':s['end'],'separation':{'engine':s['engine'],'modelSha256':s['modelSha256'],'stem':label,'parentSourceSha256':recipe['sources'][s['sourceId']]['sha256']}}
 source,origin=stem('finish-ambience','drums')
 # Use the racing passage beside the paddlers (the CC mentions their whistles),
 # rather than the cleaner but unrelated opening-music percussion trial.
 lo,hi=6.443537415,10.123900227;base_bpm=480/(hi-lo);grooves=[]
 for name,bpm in [('recover',72),('cruise',84),('gentle',90),('start',96),('final',102),('power',114),('sprint',120)]:
  duration=480/bpm;key='drum-groove-'+name
  # atrim before atempo, then enforce exactly eight beat periods. Pitch stays fixed.
  filters=[f'atrim=start={lo}:end={hi}','asetpts=PTS-STARTPTS','highpass=f=55','lowpass=f=6500',f'atempo={bpm/base_bpm:.10f}','apad',f'atrim=duration={duration:.10f}','loudnorm=I=-21:TP=-3:LRA=7']
  bake(key,source,0,duration,filters,{**origin,'channel':'drums','lang':None,'text':'Nhịp trống tách từ bản thu giải đấu','bpm':bpm,'beats':8,'sourceStart':origin['sourceStart']+lo,'sourceEnd':origin['sourceStart']+hi,'timeStretch':round(bpm/base_bpm,10)})
  grooves.append({'key':key,'bpm':bpm,'beats':8})
 # The trial broadcast beds retained traffic/music after separation. Keep them
 # out of the game; licensed nonverbal crowd recordings provide the crowd bed.
 for key,name,length in [('river-bank-bed','crowd',40),('finish-crowd-bed','cheer',20)]:
  source=study/(name+'-original.mp3');info=json.loads((study/(name+'-source.json')).read_text())
  if sha(source)!=info['sha256']:raise ValueError('Changed crowd recording')
  bake(key,source,0,length,['highpass=f=130','lowpass=f=7000','loudnorm=I=-23:TP=-3:LRA=8'],{'sourceType':'licensed-recording','sourceUrl':info['url'],'recording':info,'channel':'crowd','lang':None,'text':'Khán giả cổ vũ — bản thu thể thao CC0, không phải audio tại Maspéro'},2)
 whistle=study/'coach-whistle-original.mp3';info=json.loads((study/'whistle-source.json').read_text())
 if sha(whistle)!=info['sha256']:raise ValueError('Changed whistle recording')
 for key,start,duration in [('coach-whistle-short',.14,.19),('coach-whistle-strong',.14,.30)]:
  bake(key,whistle,start,duration,['highpass=f=1400','lowpass=f=7500','volume=0.72'],{'sourceType':'licensed-recording','sourceUrl':info['url'],'recording':info,'channel':'whistle','lang':None,'text':'Còi HLV theo nhịp dầm — bản thu còi thật SpliceSound (CC0)'})
 result={'schema':1,'scope':'Real recordings: Demucs-separated broadcast drums; separately licensed sports whistle and nonverbal crowd beds. Broadcast ambience separation trials were withheld because of residual traffic/music. Crowd recordings are not from Maspero. Machine-assisted checks, not independent listening certification.','clips':clips,'grooves':grooves,'ambience':{'cruise':'river-bank-bed','final':'finish-crowd-bed'},'whistle':{'normal':'coach-whistle-short','strong':'coach-whistle-strong'},'basePercussionBpm':round(base_bpm,6)}
 (OUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 recipe['fieldPack']={'file':'field/manifest.json','sha256':sha(OUT/'manifest.json')}
 recipe['review']['field']='40/20-second licensed nonverbal sports crowd beds replace the old 3.87-second broadcast loop. Broadcast separation trials retained traffic/music and were withheld. Crowd/whistle are credited CC0 sports recordings, not Maspero field recordings.'
 (ROOT/'docs/broadcast-audio-cuts.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({'fieldClips':len(clips),'bytes':sum(c['bytes'] for c in clips.values()),'basePercussionBpm':result['basePercussionBpm']}))

if __name__=='__main__':main()
