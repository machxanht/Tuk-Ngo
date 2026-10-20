"""Decode and inspect dashboard audio without reencoding or modifying its sources."""
import argparse
import concurrent.futures
import hashlib
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public/assets/race-audio'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    ffmpeg = args.ffmpeg or shutil.which('ffmpeg')
    if not ffmpeg:
        try:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        except ImportError:
            raise SystemExit('Supply --ffmpeg /path/to/ffmpeg, or install FFmpeg.')
    manifest = json.loads((ROOT / 'public/audio-dashboard/export/manifest.json').read_text(encoding='utf-8'))
    entries = [(key, AUDIO / clip['sourceFile'], clip) for key, clip in manifest['clips'].items()]
    music = manifest['beds']['menuMusic']
    sources = list((AUDIO / 'menu').glob('*.mp3'))
    if len(sources) != 1:
        raise SystemExit('Expected one menu music file')
    entries.append(('menu-music', sources[0], music))

    def check(entry):
        key, path, expected = entry
        try:
            if not path.resolve().is_relative_to(AUDIO.resolve()):
                raise ValueError('Audio path escapes its source folder')
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != expected['sha256']:
                raise ValueError('SHA-256 mismatch')
            result = subprocess.run([ffmpeg, '-nostdin', '-hide_banner', '-nostats', '-v', 'info', '-i',
                str(path), '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-'],
                capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=45)
            if result.returncode:
                raise ValueError('FFmpeg decode failed')
            peaks = re.findall(r'Peak level dB:\s*([-\w.]+)', result.stderr)
            if not peaks:
                raise ValueError('Missing decoded peak measurement')
            peak_db = max(float(v) for v in peaks)
            if not math.isfinite(peak_db) or peak_db <= -40 or peak_db > .001:
                raise ValueError('Silent/too quiet or peak exceeds full scale: ' + str(peak_db))
            counts = re.findall(r'Number of samples:\s*([\d.]+)', result.stderr)
            rates = re.findall(r'Audio:.*?,\s*(\d+) Hz', result.stderr)
            duration = float(counts[-1]) / int(rates[0]) if counts and rates else None
            if duration is not None and expected.get('duration') is not None:
                if abs(duration - expected['duration']) > .15:
                    raise ValueError('Decoded duration differs from manifest')
            return {'clipId': key, 'sha256': digest, 'status': 'pass',
                    'decodedDuration': round(duration, 4) if duration is not None else None,
                    'peakDb': round(peak_db, 4)}
        except Exception as error:
            return {'clipId': key, 'status': 'fail', 'error': str(error)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(check, entries))
    report = {'files': len(results), 'passed': sum(r['status'] == 'pass' for r in results),
        'failed': sum(r['status'] == 'fail' for r in results), 'records': results,
        'semanticAccuracyVerified': False, 'nativePronunciationVerified': False}
    if args.report:
        target = ROOT / args.report
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'records'}))
    for result in results:
        if result['status'] == 'fail':
            print(json.dumps(result, ensure_ascii=False))
    if report['failed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
