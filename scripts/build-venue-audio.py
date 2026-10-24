"""Render reviewed venue scripts with the existing F0 stock voices, never VI AI."""
import argparse,array,hashlib,importlib.util,json,math,subprocess
from pathlib import Path
from xml.sax.saxutils import escape
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
def digest(data):return hashlib.sha256(data).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--config',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--synthesize',action='store_true');p.add_argument('--package-only',action='store_true');args=p.parse_args()
 script=json.loads((ROOT/'docs/venue-audio-script.json').read_text(encoding='utf-8'))
 teams=json.loads((ROOT/'public/assets/data/cambodia-teams.json').read_text(encoding='utf-8'))['teams']
 requests=[];mapping={};profiles={}
 def add(key,text,lang,venue=None,cue=None,team=None):
  voice=script['voices'][lang];xml=f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{voice["locale"]}"><voice name="{voice["name"]}"><prosody rate="+3%">{escape(text)}</prosody></voice></speak>'
  requests.append({'id':key,'cueId':cue or 'team-name','language':lang,'voice':voice['name'],'text':text,'ssml':xml,'requestSha256':digest(xml.encode()),'maxSeconds':45,'file':key+'.wav'})
  if venue:mapping.setdefault(venue,{}).setdefault(lang,{})[cue]=[key]
  if team:profiles[team]={'names':{'voice':[],'khmer':[key]},'history':{'voice':[],'khmer':[]}}
 for venue,cues in script['venues'].items():
  for cue,lines in cues.items():
   for lang,text in lines.items():add(venue+'-'+cue+'-'+lang,text,lang,venue,cue)
 for team in teams:
  if team['venueIds']:add(team['id']+'-name-km',team['nameKm'],'km',team=team['id'])
 plan={'schema':1,'scriptSha256':digest((ROOT/'docs/venue-audio-script.json').read_bytes()),'requestCharactersUpperBound':sum(len(s['ssml'])for s in requests),'samples':requests}
 args.out.mkdir(parents=True,exist_ok=True);(args.out/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Plan:',len(requests),'requests;',plan['requestCharactersUpperBound'],'SSML characters',flush=True)
 if not args.synthesize and not args.package_only:return
 spec=importlib.util.spec_from_file_location('trial',ROOT/'scripts/build-commentary-trial.py');trial=importlib.util.module_from_spec(spec);spec.loader.exec_module(trial)
 result=json.loads((args.out/'manifest.json').read_text(encoding='utf-8'))if args.package_only else trial.synthesize(script,plan,args.out,args.config,16000)
 if result['scriptSha256']!=plan['scriptSha256']or len(result['samples'])!=len(requests):raise ValueError('Incomplete or stale synthesis pack')
 target=ROOT/'public/assets/race-audio/venues';target.mkdir(parents=True,exist_ok=True);clips={}
 for sample in result['samples']:
  file=target/(sample['id']+'.mp3');subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-y','-i',str(args.out/sample['file']),'-af','loudnorm=I=-17:TP=-2:LRA=7','-ar','24000','-ac','1','-b:a','96k',str(file)],check=True,capture_output=True)
  decoded=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(file),'-ar','24000','-ac','1','-f','f32le','-'],check=True,capture_output=True);pcm=array.array('f');pcm.frombytes(decoded.stdout);peak=max(abs(v)for v in pcm)
  if not .01<peak<1 or len(pcm)<2400:raise ValueError('Silent, clipped or incomplete encoded audio')
  clips[sample['id']]={**{k:sample[k]for k in ['text','voice','cueId','requestSha256']},'file':'venues/'+file.name,'duration':round(len(pcm)/24000,4),'peak':peak,'rms':math.sqrt(sum(v*v for v in pcm)/len(pcm)),'sourceWavSha256':sample['sha256'],'bytes':file.stat().st_size,'sha256':digest(file.read_bytes()),'lang':sample['language'],'channel':'khmer','sourceType':'azure-stock-neural','nativeListeningVerified':False,'role':'team-name'if sample['cueId']=='team-name'else'commentary'}
  for team,profile in profiles.items():
   if sample['id'] in profile['names']['khmer']:clips[sample['id']].update(teamIds=[team],venueIds=next(t['venueIds']for t in teams if t['id']==team))
  for venue,languages in mapping.items():
   if any(sample['id']in keys for cues in languages.values()for keys in cues.values()):clips[sample['id']]['venueIds']=[venue]
 manifest={'schema':1,'review':script['review'],'scriptSha256':plan['scriptSha256'],'events':mapping,'teamProfiles':profiles,'clips':clips}
 (target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('Packaged',len(clips),'venue/name clips',flush=True)
if __name__=='__main__':main()
