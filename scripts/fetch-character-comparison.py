"""Fetch official D/F comparison sources into the external asset cache."""
import hashlib
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT.parent / 'tools/asset-cache/character-comparison'
SOURCES = {
    'd': {'name': 'Quaternius Universal Base Characters Standard / Superhero Male',
          'page': 'https://quaternius.itch.io/universal-base-characters',
          'license': 'CC0', 'credit': 'Quaternius',
          'cachedZip': ROOT.parent / 'tools/asset-cache/coherent-v19/universal-base-standard.zip'},
    'f': {'name': 'Snow', 'page': 'https://studio.blender.org/characters/snow/v4/',
          'download': 'https://studio.blender.org/download-source/files/ba/0f/ba0fe6d810333b1d73c1c359e4dc03cb-6.zip',
          'license': 'CC-BY-4.0', 'credit': 'Snow Rig © Blender Foundation | studio.blender.org'},
}


def digest(path):
    with path.open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    records = {}
    for key, source in SOURCES.items():
        archive = CACHE / ('quaternius-standard.zip' if key == 'd' else 'snow.zip')
        if not archive.exists():
            if 'cachedZip' in source:
                shutil.copyfile(source['cachedZip'], archive)
            else:
                request = urllib.request.Request(source['download'], headers={'User-Agent': 'Mozilla/5.0'})
                pending = archive.with_suffix('.zip.part')
                count = 0
                with urllib.request.urlopen(request, timeout=60) as response, pending.open('wb') as file:
                    while chunk := response.read(1024 * 1024):
                        file.write(chunk)
                        count += len(chunk)
                        if count % (20 * 1024 * 1024) == 0:
                            print(json.dumps({'source': key, 'downloadedMB': count // 1048576}), flush=True)
                if not zipfile.is_zipfile(pending):
                    raise ValueError('Official download did not return a ZIP archive')
                pending.replace(archive)
        destination = (CACHE / key).resolve()
        with zipfile.ZipFile(archive) as bundle:
            for entry in bundle.infolist():
                target = (destination / entry.filename).resolve()
                if not target.is_relative_to(destination):
                    raise ValueError('Unsafe archive member')
            bundle.extractall(destination)
        records[key] = {k: v for k, v in source.items() if k not in ('cachedZip', 'download')}
        records[key].update(archiveSha256=digest(archive), archiveBytes=archive.stat().st_size,
                            extractedFiles=sum(p.is_file() for p in destination.rglob('*')))
        print(json.dumps({'source': key, **records[key]}, ensure_ascii=False), flush=True)
    (CACHE / 'sources.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
