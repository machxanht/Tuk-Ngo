"""Check actual encoded excerpts against each hashed original; this does not verify meaning."""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', required=True, type=Path)
    parser.add_argument('--out', type=Path, default=ROOT / 'docs/qa/broadcast-audio/source-verification.json')
    args = parser.parse_args()
    inputs = json.loads(args.inputs.read_text(encoding='utf-8'))
    folder = ROOT / 'public/assets/race-audio'
    manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    def decode(arguments):
        process = subprocess.run([ffmpeg, '-v', 'error', *arguments, '-ar', '24000', '-ac', '1', '-f', 'f32le', '-'], capture_output=True, check=True)
        return np.frombuffer(process.stdout, dtype='<f4')

    sources = {}
    for key, source in manifest['sources'].items():
        with Path(inputs[key]['audio']).open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        assert digest == source['sha256'], key
        assert hashlib.sha256(Path(inputs[key]['captions']).read_bytes()).hexdigest() == source['captions']['sha256'], key
        sources[key] = {'url': source['url'], 'eventYear': source['eventYear'], 'sha256': digest, 'captionsSha256': source['captions']['sha256']}
    checks, ai_checks = [], []
    for key, clip in manifest['clips'].items():
        mp3 = folder / clip['file']
        assert hashlib.sha256(mp3.read_bytes()).hexdigest() == clip['sha256'], key
        if clip['sourceType'] == 'azure-stock-neural':
            assert clip['channel'] == 'khmer' and clip['lang'] == 'km', key
            evidence = clip['synthesisEvidence']
            pack = folder / evidence['manifest']
            assert hashlib.sha256(pack.read_bytes()).hexdigest() == evidence['manifestSha256'], key
            sample = next(s for s in json.loads(pack.read_text(encoding='utf-8'))['samples'] if s['id'] == evidence['id'])
            assert sample['sha256'] == clip['sha256'] and sample['text'] == clip['text'], key
            encoded = decode(['-i', str(mp3)])
            peak = float(np.max(np.abs(encoded)))
            assert .01 < peak <= 1 and abs(len(encoded)/24000-clip['duration']) < .04, key
            ai_checks.append({'clip': key, 'sourceType': clip['sourceType'], 'sha256': clip['sha256'], 'voice': evidence['voice'], 'decodedPeak': round(peak, 6), 'duration': clip['duration'], 'nativeListeningVerified': False})
            continue
        assert clip['sourceType'] == 'broadcast', key
        speech = clip['channel'] in ['voice', 'khmer']
        filters = ['highpass=f=75', 'lowpass=f=9000'] if speech else ['highpass=f=55', 'lowpass=f=1100'] if clip['channel'] == 'drums' else ['highpass=f=90', 'lowpass=f=7000']
        duration = clip['end'] - clip['start']
        filters += ['afade=t=in:d=0.008', f'afade=t=out:st={max(0, duration-.045):.4f}:d=0.045']
        raw = decode(['-ss', str(clip['start']), '-i', inputs[clip['sourceId']]['audio'], '-t', str(duration), '-af', ','.join(filters)])
        encoded = decode(['-i', str(mp3)])
        n = min(len(raw), len(encoded))
        correlation = float(np.corrcoef(raw[:n], encoded[:n])[0, 1])
        peak = float(np.max(np.abs(encoded)))
        assert correlation > .99 and .01 < peak <= 1, (key, correlation, peak)
        checks.append({'clip': key, 'sourceId': clip['sourceId'], 'sourceStart': clip['start'], 'sourceEnd': clip['end'], 'sha256': clip['sha256'], 'pcmCorrelation': round(correlation, 8), 'decodedPeak': round(peak, 6)})
    download = manifest['downloads']['teamAudio']
    archive = folder / download['file']
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == download['sha256']
    with zipfile.ZipFile(archive) as bundle:
        profiles = [name for name in bundle.namelist() if name.endswith('/profile.json')]
        assert len(profiles) == len(manifest['teamProfiles']) == 61
        for name in profiles:
            profile = json.loads(bundle.read(name))
            for recording in profile['recordings'].values():
                payload = bundle.read(name.removesuffix('profile.json') + recording['file'])
                assert hashlib.sha256(payload).hexdigest() == recording['sha256']
    result = {'sources': sources, 'cutCount': len(checks), 'syntheticKhmerCount': len(ai_checks), 'syntheticKhmer': ai_checks, 'minimumCorrelation': min(c['pcmCorrelation'] for c in checks), 'maxDecodedPeak': max(c['decodedPeak'] for c in checks+ai_checks), 'clips': checks,
              'archive': download, 'archiveProfiles': len(profiles), 'coverage': manifest['teamCoverage'], 'independentListeningVerified': False,
              'scope': 'Original excerpts: waveform correlation/hash/decode/archive. Khmer AI: synthesis-pack/hash/decode. Does not certify transcription, native pronunciation or commentator identity.'}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({key: result[key] for key in ['cutCount', 'syntheticKhmerCount', 'minimumCorrelation', 'maxDecodedPeak', 'archiveProfiles', 'coverage']}))


if __name__ == '__main__':
    main()
