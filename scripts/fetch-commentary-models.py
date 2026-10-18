"""Fetch only the official checkpoints needed by the isolated Seed-VC trial.

Bounded HTTP ranges avoid stalled multi-gigabyte downloads. All LFS hashes (or
Git blob hashes for small files) are verified before adding a snapshot to cache.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import time
import urllib.request

MODELS = {
    'facebook/hubert-large-ll60k': ['config.json', 'preprocessor_config.json', 'pytorch_model.bin'],
    'openai/whisper-small': ['config.json', 'tokenizer_config.json', 'tokenizer.json',
                            'special_tokens_map.json', 'vocab.json', 'merges.txt',
                            'normalizer.json', 'added_tokens.json'],
    'nvidia/bigvgan_v2_22khz_80band_256x': ['config.json', 'bigvgan_generator.pt'],
    'Plachta/Seed-VC': ['v2/cfm_small.pth', 'v2/ar_base.pth'],
    'Plachta/ASTRAL-quantization': ['bsq32/bsq32_light.pth', 'bsq2048/bsq2048_light.pth'],
    'funasr/campplus': ['campplus_cn_common.bin'],
}


def validate(path, entry):
    if not path.exists() or path.stat().st_size != entry['size']:
        return False
    h = hashlib.sha256() if entry.get('lfs') else hashlib.sha1()
    if not entry.get('lfs'):
        h.update(f"blob {entry['size']}\0".encode())
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest() == (entry['lfs']['sha256'] if entry.get('lfs') else entry['blobId'])


def fetch(job):
    repo, revision, entry, target = job
    if validate(target, entry):
        print('Cached ' + repo + '/' + entry['rfilename'], flush=True)
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(target.suffix + '.partial')
    size = entry['size']
    # A partial contains only complete, sequentially written ranges.
    offset = partial.stat().st_size if partial.exists() else 0
    if offset > size:
        raise ValueError('Oversized partial download')
    url = 'https://huggingface.co/' + repo + '/resolve/' + revision + '/' + entry['rfilename']
    def read_range(bounds):
        begin, end = bounds
        for attempt in range(3):
            try:
                req = urllib.request.Request(url + f'?trial_range={begin}-{end}&attempt={attempt}',
                          headers={'Range': f'bytes={begin}-{end}'})
                with urllib.request.urlopen(req, timeout=40) as response:
                    data = response.read(end - begin + 2)
                    if len(data) != end - begin + 1:
                        raise ValueError('Incorrect HTTP range length')
                    if response.status == 206 and response.headers.get('Content-Range') != f'bytes {begin}-{end}/{size}':
                        raise ValueError('Incorrect Content-Range')
                    if response.status != 206 and (begin != 0 or len(data) != size):
                        raise ValueError('Server ignored HTTP range')
                return data
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1 + attempt)
    with partial.open('ab') as f, ThreadPoolExecutor(max_workers=4) as ranges:
        while offset < size:
            bounds = [(begin, min(size-1, begin+8*1024*1024-1))
                      for begin in range(offset, min(size, offset+32*1024*1024), 8*1024*1024)]
            # Write in order so an interrupted .partial always remains a prefix.
            for data in ranges.map(read_range, bounds):
                f.write(data)
                f.flush()
                offset += len(data)
                if offset == size or offset % (64 * 1024 * 1024) == 0:
                    print(f"{repo}/{entry['rfilename']}: {offset/1e6:.0f}/{size/1e6:.0f} MB", flush=True)
    if not validate(partial, entry):
        raise ValueError('Model content hash mismatch: ' + repo + '/' + entry['rfilename'])
    partial.replace(target)
    print(f"Verified {repo}/{entry['rfilename']} ({size / 1e6:.1f} MB)", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    root = args.cache.resolve()
    repo_root = Path(__file__).resolve().parents[1]
    if root == repo_root or repo_root in root.parents:
        parser.error('Models must stay outside the game repository')
    jobs, inventory = [], []
    for repo, names in MODELS.items():
        with urllib.request.urlopen('https://huggingface.co/api/models/' + repo + '?blobs=true', timeout=30) as res:
            info = json.load(res)
        folder = root / ('models--' + repo.replace('/', '--'))
        for name in names:
            entry = next(f for f in info['siblings'] if f['rfilename'] == name)
            target = folder / 'snapshots' / info['sha'] / name
            jobs.append((repo, info['sha'], entry, target))
            inventory.append(dict(repo=repo, revision=info['sha'], file=name, bytes=entry['size'],
                                  sha256=entry.get('lfs', {}).get('sha256'), gitBlob=entry['blobId']))
        (folder / 'refs').mkdir(parents=True, exist_ok=True)
        (folder / 'refs/main').write_text(info['sha'])
    print(f"Fetching {len(jobs)} official files, {sum(j[2]['size'] for j in jobs)/1e9:.2f} GB", flush=True)
    for job in jobs:
        fetch(job)
    (root.parent / 'model-inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
    print('All official model hashes verified', flush=True)


if __name__ == '__main__':
    main()
