"""Bake original race phrases/Khmer calls and original drum samples, never TV audio."""
import argparse,concurrent.futures,hashlib,json,math,subprocess,tempfile,wave
from pathlib import Path
import numpy as np
import imageio_ffmpeg
from gtts import gTTS

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/race-audio'
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
VOICE={
 'ready':('Hai đội đã vào vị trí. Chú ý hiệu lệnh xuất phát!',1.12),
 'go':('Xuất phát! Hai ghe đồng loạt tăng tốc!',1.20),
 'intro':('Làn của bạn là ghe',1.12),
 'versus':('Đối diện là ghe',1.12),
 'leading':('đang vươn lên dẫn đầu!',1.18),
 'close-race':('Hai mũi ghe đang bám đuổi rất sát nhau!',1.17),
 'cruise':('Đã vào đường trường. Giữ nhịp chắc, phối hợp đều tay!',1.10),
 'halfway':('Nửa chặng đường đã qua. Cuộc đua vẫn còn rất quyết liệt!',1.12),
 'final':('Hai trăm năm mươi mét cuối! Tất cả dồn sức cho nước rút!',1.21),
 'last-hundred':('Một trăm mét cuối cùng! Hai đội đang dốc toàn lực!',1.23),
 'last-fifty':('Còn năm mươi mét! Vạch đích đã ở ngay phía trước!',1.23),
 'surge':('Đạp! Đạp mạnh! Cả đội cùng dồn sức!',1.25),
 'pace-sprint':('Tăng nhịp chèo! Những mái dằm đang quạt nước mạnh hơn!',1.19),
 'recover':('Đội hình đang điều chỉnh nhịp, giữ sức cho đoạn cuối.',1.10),
 'cohesion':('Những mái dằm phối hợp rất đều. Hãy giữ chắc nhịp này!',1.12),
 'fatigue':('Đội hình có dấu hiệu xuống sức. Cần giữ nhịp thật chắc!',1.12),
 'finish':('Đã về đích!',1.22),
 'winner':('giành chiến thắng trong lượt đua này! Xin chúc mừng!',1.18),
 'loss':('Đối thủ về đích trước. Hẹn gặp lại ở giải đấu tiếp theo!',1.12),
 'tie':('Hai ghe về gần như cùng lúc! Lượt đua sẽ được tổ chức lại!',1.17),
 'dnf':('Ghe của bạn chưa hoàn thành cự ly. Hãy thử lại với nhịp chèo chắc hơn!',1.10),
}
CHANTS={
 'chant-ho':('ហ៊ោ! ហ៊ោ!', 'Hô! Hô!'),
 'chant-victory':('ជយោ! ជយោ!', 'Hoan hô! Hoan hô!'),
 'chant-encourage':('ខំប្រឹងឡើង!', 'Cố lên!'),
}

def transcode(source,target,rate):
 filters=f'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-42dB,areverse,atempo={rate},highpass=f=85,lowpass=f=7800,loudnorm=I=-17:TP=-2:LRA=7'
 subprocess.run([FFMPEG,'-v','error','-y','-i',str(source),'-af',filters,'-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','64k',str(target)],check=True,capture_output=True)

def pcm(path):
 result=subprocess.run([FFMPEG,'-v','error','-i',str(path),'-ar','24000','-ac','1','-f','f32le','-'],check=True,capture_output=True)
 return np.frombuffer(result.stdout,dtype='<f4')

def drum(kind):
 rate=24000;t=np.arange(int(rate*.72))/rate;rng=np.random.default_rng(830+kind)
 base=[94,126,175][kind];signal=np.zeros_like(t)
 for n,(ratio,weight) in enumerate(zip([1,1.59,2.14,2.30,2.65,3.16],[1,.5,.32,.22,.12,.08])):
  phase=2*math.pi*base*ratio*(t+.007*(1-np.exp(-t/.025)))
  signal+=weight*np.sin(phase)*np.exp(-t*(7+n*4+kind*2))
 attack=rng.normal(0,1,len(t));attack=np.r_[attack[0],np.diff(attack)]
 signal=signal*.62+attack*np.exp(-t*(90-kind*12))*.14
 signal*=np.minimum(1,t/.0008);signal/=max(.001,np.max(np.abs(signal)));signal*=.85
 return (signal*32767).astype('<i2')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--force',action='store_true');args=parser.parse_args()
 OUT.mkdir(parents=True,exist_ok=True)
 roster=json.loads((ROOT/'public/assets/data/roster-2025.json').read_text(encoding='utf-8'))['records']
 aliases={'can_tho-02':('pothi-satharam-2','Pôthi Satharam hai'),'can_tho-07':('chroi-tum-chas','Chrôi Tưm Chắs'),'can_tho-23':('tum-nup-2','Tum Núp hai'),'can_tho-35':('prek-ta-cuol','Prếk Ta Cuôl'),'can_tho-37':('om-pou-year','Om Pou Year'),'can_tho-39':('prek-on-dok-2','Prêk On Đơk hai'),'can_tho-46':('pothi-khsach','Pôthi Khsach'),'ca_mau-05':('kos-thum-1','Kos Thum một')}
 jobs=[(key,text,'vi',speed,None) for key,(text,speed) in VOICE.items()]
 jobs += [(key,text,'km',1.10,translation) for key,(text,translation) in CHANTS.items()]
 for record in roster:
  id,name=aliases.get(record['id'],(record['id'],record['nameVi']))
  jobs.append(('name-'+id,name,'vi',1.11,None))
 old=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')) if (OUT/'manifest.json').exists() else {'clips':{}}
 clips={}
 def build(job):
  key,text,language,speed,translation=job;path=OUT/(key+'.mp3');signature=hashlib.sha256(json.dumps([text,language,speed,'gtts-normalized'],ensure_ascii=False).encode()).hexdigest()
  if args.force or not path.exists() or old['clips'].get(key,{}).get('signature')!=signature:
   with tempfile.TemporaryDirectory(prefix='tukngo-speech-') as temp:
    raw=Path(temp)/'raw.mp3';gTTS(text,lang=language,timeout=30).save(str(raw));transcode(raw,path,speed)
  data=pcm(path);peak=float(np.max(np.abs(data)));duration=len(data)/24000
  if duration<.08 or peak<.01:raise RuntimeError('Empty audio '+key)
  return key,{'file':path.name,'text':text,'lang':language,'translationVi':translation,'duration':round(duration,4),'peak':round(peak,4),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'signature':signature}
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for key,value in pool.map(build,jobs):clips[key]=value
 for i,kind in enumerate(['drum-low','drum-open','drum-rim']):
  with tempfile.TemporaryDirectory(prefix='tukngo-drum-') as temp:
   raw=Path(temp)/'drum.wav'
   with wave.open(str(raw),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(drum(i).tobytes())
   path=OUT/(kind+'.mp3');subprocess.run([FFMPEG,'-v','error','-y','-i',str(raw),'-codec:a','libmp3lame','-b:a','96k',str(path)],check=True,capture_output=True)
  data=pcm(path)
  clips[kind]={'file':path.name,'peak':round(float(np.max(np.abs(data))),4),'duration':round(len(data)/24000,4),'lang':None,'text':'Original authored struck-membrane drum sample','bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 manifest={'schema':1,'reference':'https://www.youtube.com/watch?v=crZF3hghbgQ','referenceUse':'broadcast metadata verified; direct audio retrieval returned HTTP 403; no programme audio copied','speech':'Original authored text; Google Translate TTS generated via gTTS; prerecorded MP3, no runtime speech service','chantUse':'Short authored Khmer encouragement; not a documented traditional chant recording','drums':'Original deterministic membrane/stick synthesis, not a recording of the programme drum','clips':clips}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'clips':len(clips),'bytes':sum(c['bytes'] for c in clips.values()),'teamNames':len(roster),'khmerCalls':len(CHANTS)},ensure_ascii=False))
if __name__=='__main__':main()
