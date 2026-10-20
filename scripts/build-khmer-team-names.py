"""Bake missing Khmer names for separate dashboard review and Antigravity handoff."""
import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

from team_audio import OUT, ROOT, digest, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='Private resumable WAV cache outside the repo')
    args = parser.parse_args()
    if args.out.resolve().is_relative_to(ROOT):
        raise ValueError('Keep the synthesis cache outside the repository')
    path = ROOT / 'docs/khmer-team-audio.json'
    script = json.loads(path.read_text(encoding='utf-8'))
    recipe_path = ROOT / 'docs/broadcast-audio-cuts.json'
    recipe = json.loads(recipe_path.read_text(encoding='utf-8'))
    if (script['schema'] != 1 or script['kind'] != 'authored-khmer-team-names'
            or script['language'] != 'km' or script['voice'] != 'km-KH-PisethNeural'
            or len(script['names']) != 44 or len({r['registrationId'] for r in script['names']}) != 44):
        raise ValueError('Expected the 44 missing Khmer names')
    spec = importlib.util.spec_from_file_location('commentary_trial', ROOT / 'scripts/build-commentary-trial.py')
    trial = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(trial)
    voices = {'km': {'name': script['voice'], 'locale': 'km-KH'}}
    samples = []
    for row in script['names']:
        registration, text = row['registrationId'], row['text']
        if (registration not in recipe['teamProfiles']
                or recipe['teamProfiles'][registration]['names']['khmer']
                or not any('\u1780' <= c <= '\u17ff' for c in text)
                or any(c in text for c in '<>{}') or not 1 < len(text) < 100):
            raise ValueError('Invalid name or original recording would be replaced: ' + registration)
        xml = trial.ssml({'voices': voices}, {'text': {'km': text}, 'rate': script['rate']}, 'km')
        key = f'ai-name-{registration}-km'
        samples.append({'id': key, 'cueId': registration, 'language': 'km',
            'provider': 'azure-stock-neural', 'voice': script['voice'], 'text': text,
            'ssml': xml, 'requestSha256': trial.sha(xml.encode('utf-8')),
            'maxSeconds': script['maxSeconds'], 'file': key + '.wav'})
    plan = {'schema': 1, 'mode': 'authored-khmer-team-names', 'runtimeEnabled': False,
        'scriptSha256': digest(path), 'sampleCount': len(samples),
        'textCharacters': sum(len(s['text']) for s in samples),
        'requestCharactersUpperBound': sum(len(s['ssml']) for s in samples), 'samples': samples}
    source = trial.synthesize({'voices': voices, 'review': script['review']}, plan,
                              args.out, args.config, budget=15000)
    wav_entries = {s['id']: s for s in source['samples']}
    clips = {}
    pack_file = 'team-names/khmer.json'
    for sample in samples:
        key, registration = sample['id'], sample['cueId']
        relative = f'team-names/km/{registration}.mp3'
        target = OUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        wav = args.out / sample['file']
        if digest(wav) != wav_entries[key]['sha256']:
            raise ValueError('Changed synthesized WAV')
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y', '-i', str(wav),
            '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', str(target)],
            capture_output=True, check=True)
        # Check the encoded MP3, not just the synthesis response.
        import numpy as np
        raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-i', str(target),
            '-ar', '24000', '-ac', '1', '-f', 'f32le', '-'], capture_output=True, check=True)
        pcm = np.frombuffer(raw.stdout, dtype='<f4')
        duration, peak = len(pcm) / 24000, float(np.max(np.abs(pcm)))
        if not .2 < duration < script['maxSeconds'] + .1 or not .01 < peak <= 1:
            raise ValueError('Invalid decoded Khmer name: ' + registration)
        clips[key] = {'role': 'team-name', 'channel': 'khmer', 'lang': 'km',
            'teamIds': [registration], 'text': sample['text'], 'translationVi':
                next(r['nameVi'] for r in script['names'] if r['registrationId'] == registration),
            'file': relative, 'sourceType': 'azure-stock-neural',
            'duration': round(duration, 4), 'peak': round(peak, 6),
            'bytes': target.stat().st_size, 'sha256': digest(target),
            'synthesisEvidence': {'id': key, 'manifest': pack_file, 'voice': script['voice'],
                'scriptFile': 'docs/khmer-team-audio.json', 'scriptSha256': digest(path),
                'requestSha256': sample['requestSha256'], 'sourceWavSha256': digest(wav),
                'nativeListeningVerified': False, 'originalCommentatorsCloned': False}}
    write_json(OUT / pack_file, {'schema': 1, 'language': 'km',
        'sourceType': 'azure-stock-neural', 'scriptSha256': digest(path),
        'review': script['review'], 'clips': clips})
    print(json.dumps({'khmerNames': len(clips), 'bytes': sum(c['bytes'] for c in clips.values()),
                      'runtimeChanged': False, 'purpose': 'dashboard-review-and-handoff'}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Khmer name generation stopped: ' + (str(error) if isinstance(error, ValueError)
              else type(error).__name__ + '; check local configuration'), file=sys.stderr)
        sys.exit(1)
