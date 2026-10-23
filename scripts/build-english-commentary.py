"""Generate/cache stock English neural narration using the existing Azure F0.
Credentials stay in the existing local config and never enter the public pack.
"""
import argparse,hashlib,json,subprocess,time,urllib.request,urllib.error
import array,imageio_ffmpeg
from pathlib import Path
from xml.sax.saxutils import escape

parser=argparse.ArgumentParser();parser.add_argument('--config',default='../asset-studio/audio-references/azure-speech.json');args=parser.parse_args()
config=json.loads(Path(args.config).read_text(encoding='utf-8-sig'))
if str(config.get('tier','')).upper()!='F0':raise SystemExit('Only the existing F0 resource is allowed.')
root=Path('public/assets/race-audio/english');root.mkdir(parents=True,exist_ok=True)
voice='en-US-GuyNeural'
script={
 'ready':'Both crews are ready. Watch the start.',
 'go':'And they are off! Both boats launch from the line.',
 'intro':'Two crews, one finish line. Stay together and find your racing rhythm.',
 'cruise':'The opening drive is over. Settle into the race and save enough energy for the finish.',
 'halfway':'Halfway through. This is where steady teamwork makes the difference.',
 'final':'The final sprint is on! The paddles accelerate and the crowd comes alive.',
 'last-hundred':'One hundred metres to go! Both crews are pushing for the line.',
 'last-fifty':'The final fifty metres! Every stroke counts now.',
 'surge':'A powerful acceleration! The crew digs in and the water flies.',
 'pace-sprint':'The pace is rising. Watch the energy level and make this effort count.',
 'recover':'A short recovery. Gather your strength, then build the speed again.',
 'cohesion':'Excellent teamwork. The paddles are moving together.',
 'fatigue':'The crew is tiring. A brief recovery could make all the difference.',
 'close-race':'There is almost nothing between them! This race is wide open.',
 'lead':'A change at the front! One crew has found an extra gear.',
 'finish':'Across the line! A hard-earned victory after a tremendous effort.',
 'loss':'The other boat reaches the finish first. A brave effort from both crews.',
 'dnf':'The race has ended before your crew could complete the course.',
 'tie':'Too close to separate! Both boats reach the line together.',
}
old={}
if (root/'manifest.json').exists():old=json.loads((root/'manifest.json').read_text(encoding='utf-8')).get('clips',{})
clips={};events={}
for cue,text in script.items():
 key='ai-'+cue+'-en';p=root/(cue+'.mp3');request_hash=hashlib.sha256((voice+'|'+text+'|+8%').encode()).hexdigest()
 if not(p.exists() and old.get(key,{}).get('requestSha256')==request_hash):
  ssml='<speak version="1.0" xml:lang="en-US"><voice name="'+voice+'"><prosody rate="+8%">'+escape(text)+'</prosody></voice></speak>'
  req=urllib.request.Request('https://'+config['region']+'.tts.speech.microsoft.com/cognitiveservices/v1',data=ssml.encode(),headers={'Ocp-Apim-Subscription-Key':config['key'],'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-96kbitrate-mono-mp3','User-Agent':'TukNgo-EnglishAuthoring'})
  try:
   with urllib.request.urlopen(req,timeout=40) as response:data=response.read()
  except urllib.error.HTTPError as error:raise SystemExit('Azure synthesis returned HTTP '+str(error.code)+'. No credential values logged.')
  if len(data)<1000:raise SystemExit('Synthesis returned no usable audio.')
  p.write_bytes(data);time.sleep(.2)
 pcm=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(p),'-f','f32le','-ac','1','-ar','24000','-']);samples=array.array('f');samples.frombytes(pcm);duration=len(samples)/24000;peak=max(abs(x) for x in samples)
 if not(.01<peak<=1.01):raise SystemExit('Audio failed peak verification.')
 clips[key]={'file':'english/'+p.name,'channel':'khmer','lang':'en','text':text,'sourceType':'azure-stock-neural','voice':voice,'requestSha256':request_hash,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'duration':duration,'peak':peak,'bytes':p.stat().st_size}
 events[cue]=[key]
 (root/'manifest.json').write_text(json.dumps({'schema':1,'language':'en','events':events,'clips':clips},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(cue,duration,p.stat().st_size,flush=True)
print('Complete:',len(clips),'stock AI clips; no cloned voice.')
