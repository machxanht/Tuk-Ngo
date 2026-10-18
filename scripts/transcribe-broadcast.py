"""Transcribe bounded original-audio excerpts for review, never auto-approve game cuts."""
import argparse
import hashlib
import json
import subprocess
import urllib.request
import uuid
from pathlib import Path
import imageio_ffmpeg


def khmer_asr(path):
    host = 'https://vatho-khmer-ocm.hf.space'
    boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="files"; filename="{path.name}"\r\nContent-Type: audio/wav\r\n\r\n'.encode()
            + path.read_bytes() + f'\r\n--{boundary}--\r\n'.encode())
    request = urllib.request.Request(host + '/gradio_api/upload', data=body,
                                    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    with urllib.request.urlopen(request, timeout=30) as response:
        uploaded = json.load(response)
    data = {'data': [{'path': uploaded[0], 'orig_name': path.name, 'meta': {'_type': 'gradio.FileData'}}]}
    request = urllib.request.Request(host + '/gradio_api/call/transcribe', data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        event = json.load(response)
    event_type = None
    with urllib.request.urlopen(host + '/gradio_api/call/transcribe/' + event['event_id'], timeout=50) as response:
        for line in response:
            line = line.decode().strip()
            if line.startswith('event:'):
                event_type = line[6:].strip()
            if line.startswith('data:') and event_type == 'complete':
                return json.loads(line[5:])[0]
            if line.startswith('data:') and event_type == 'error':
                raise RuntimeError('Khmer ASR service returned an error: ' + line[5:])
    raise RuntimeError('No completed ASR result')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--requests', required=True, type=Path, help='JSON array of {id,audio,start,end,language}')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--model', type=Path, help='Local CTranslate2 Whisper model for the local backend')
    parser.add_argument('--backend', choices=['khmer-service', 'local-whisper'], default='khmer-service')
    args = parser.parse_args()
    requests = json.loads(args.requests.read_text(encoding='utf-8'))
    results = json.loads(args.output.read_text(encoding='utf-8')) if args.output.exists() else {'schema': 1, 'results': {}}
    model = None
    if args.backend == 'local-whisper':
        import numpy as np
        from faster_whisper import WhisperModel
        if not args.model or not (args.model / 'model.bin').is_file():
            parser.error('A completely downloaded local model is required')
        model = WhisperModel(str(args.model), device='cpu', compute_type='int8', cpu_threads=4)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for item in requests:
        key = item['id'] + ':' + args.backend
        if results['results'].get(key, {}).get('status') == 'transcribed':
            continue
        if not 0 < item['end'] - item['start'] <= 30:
            parser.error('Review excerpts must be at most 30 seconds')
        wav = args.output.parent / (item['id'] + '.wav')
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y', '-ss', str(item['start']), '-i', item['audio'], '-t', str(item['end'] - item['start']), '-ar', '16000', '-ac', '1', str(wav)], check=True)
        result = {**item, 'backend': args.backend, 'audioSha256': hashlib.sha256(wav.read_bytes()).hexdigest(),
                  'reviewStatus': 'machine-transcript-only', 'independentListeningVerified': False,
                  'note': 'Forced-language ASR is not a language or speaker detector. Compare against original CC/context before selecting any cut.'}
        try:
            if model:
                decoded = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-i', str(wav), '-f', 'f32le', '-'], check=True, capture_output=True)
                segments, info = model.transcribe(np.frombuffer(decoded.stdout, dtype='<f4'), language=item.get('language'), beam_size=5, condition_on_previous_text=False, word_timestamps=True)
                result['detectedLanguage'] = info.language
                result['languageProbability'] = info.language_probability
                if not item.get('language'):
                    result['note'] = 'Automatic language detection/transcript is machine evidence, not a speaker-identity or native-pronunciation review.'
                result['segments'] = [{'start': s.start + item['start'], 'end': s.end + item['start'], 'text': s.text, 'averageLogProbability': s.avg_logprob, 'words': [{'start': w.start + item['start'], 'end': w.end + item['start'], 'word': w.word, 'probability': w.probability} for w in s.words or []]} for s in segments]
                result['text'] = ''.join(s['text'] for s in result['segments'])
            else:
                result['text'] = khmer_asr(wav)
                result['model'] = 'https://huggingface.co/Vatho/Khmer-ocm'
            result['status'] = 'transcribed'
        except Exception as error:
            result.update(status='failed', error=str(error))
        results['results'][key] = result
        args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(json.dumps({'id': item['id'], 'status': result['status'], 'text': result.get('text'), 'error': result.get('error')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
