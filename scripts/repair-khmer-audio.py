"""Bake the explicitly listed Khmer review repairs, with cached F0 requests and provenance.

This never edits the AGY originals or the game manifest. Without --synthesize it
only validates/publishes an existing, matching cache; it makes no network calls.
"""
import argparse
import array
import importlib.util
import io
import json
import math
import shutil
import subprocess
from pathlib import Path
import wave

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'docs/khmer-audio-review.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--config', type=Path)
    parser.add_argument('--synthesize', action='store_true')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('trial', ROOT / 'scripts/build-commentary-trial.py')
    trial = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(trial)
    definitions = json.loads(SPEC.read_text(encoding='utf-8'))
    handoff = json.loads((ROOT / 'public/assets/race-audio/khmer-review/source/manifest.json').read_text(encoding='utf-8'))
    voice = {'name': 'km-KH-PisethNeural', 'locale': 'km-KH'}
    samples = []
    for repair in definitions['repairs']:
        if handoff['clips'][repair['sourceFilename']]['sha256'] != repair['originalSha256']:
            raise ValueError('Repair no longer matches the original handoff')
        text = repair['textKm']
        if not text.strip() or any(c in text for c in '<>{}') or len(text) > 250:
            raise ValueError('Use a short, resolved Khmer line')
        xml = trial.ssml({'voices': {'km': voice}}, {'rate': 0, 'text': {'km': text}}, 'km')
        samples.append({'id': repair['id'], 'cueId': repair['cueId'], 'language': 'km',
            'voice': voice['name'], 'text': text, 'ssml': xml,
            'requestSha256': trial.sha(xml.encode('utf-8')), 'maxSeconds': 10,
            'file': repair['id'] + '.wav'})
    plan = {'schema': 1, 'mode': 'khmer-review-repairs', 'runtimeEnabled': False,
        'scriptSha256': trial.sha(SPEC.read_bytes()), 'sampleCount': len(samples),
        'textCharacters': sum(len(s['text']) for s in samples),
        'requestCharactersUpperBound': sum(len(s['ssml']) for s in samples), 'samples': samples}
    args.cache = args.cache.resolve()
    if args.cache.is_relative_to(ROOT):
        raise ValueError('Keep the synthesis cache outside the repository')
    if args.synthesize:
        trial.synthesize({'voices': {'km': voice}, 'review': {'nativeListeningVerified': False},
                          'userAgent': 'Tuk-Ngo-audio-review'},
                         plan, args.cache, args.config, 1500)
    cached = json.loads((args.cache / 'manifest.json').read_text(encoding='utf-8'))
    entries = {s['id']: s for s in cached['samples']}
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    target = ROOT / 'public/assets/race-audio/khmer-review/repairs'
    validated = []
    for sample, repair in zip(samples, definitions['repairs']):
        entry = entries.get(sample['id'], {})
        wav = args.cache / sample['file']
        if entry.get('requestSha256') != sample['requestSha256'] or trial.sha(wav.read_bytes()) != entry.get('sha256'):
            raise ValueError('Missing or stale synthesis cache')
        trial.inspect_wav(wav.read_bytes(), sample['maxSeconds'])
        mp3 = args.cache / (sample['id'] + '.mp3')
        subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar',
                        '24000', '-codec:a', 'libmp3lame', '-b:a', '96k', str(mp3)],
                       check=True, capture_output=True)
        decoded = args.cache / 'decoded.wav'
        subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(mp3), '-acodec',
                        'pcm_s16le', str(decoded)], check=True, capture_output=True)
        signal = trial.inspect_wav(decoded.read_bytes(), sample['maxSeconds'] + .1)
        with wave.open(io.BytesIO(decoded.read_bytes()), 'rb') as audio:
            pcm = array.array('h', audio.readframes(audio.getnframes()))
        signal['rms'] = round(math.sqrt(sum(v * v for v in pcm) / len(pcm)) / 32768, 6)
        validated.append((mp3, {**repair, **signal, 'bytes': mp3.stat().st_size,
            'file': 'khmer-review/repairs/' + mp3.name, 'sha256': trial.sha(mp3.read_bytes()),
            'sourceWavSha256': entry['sha256'], 'requestSha256': sample['requestSha256'],
            'ssml': sample['ssml'], 'voice': voice['name'], 'sourceType': 'azure-stock-neural',
            'nativeListeningVerified': False, 'textEvidence': 'synthesis-request'}))
    target.mkdir(parents=True, exist_ok=True)
    for path, _ in validated:
        shutil.copyfile(path, target / path.name)
    (target / 'manifest.json').write_text(json.dumps({'schema': 1, 'runtimeChanged': False,
        'repairs': [entry for _, entry in validated]}, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8', newline='\n')
    print(json.dumps({'publishedRepairs': len(validated), 'runtimeChanged': False}))


if __name__ == '__main__':
    main()
