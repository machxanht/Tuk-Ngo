"""Import the owner's prepared Vietnamese team names without re-encoding them."""
import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/race-audio'
PACK_FILE = 'team-names/manifest.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n',
                    encoding='utf-8', newline='\n')


def apply_team_name_pack(manifest, reference, folder=OUT):
    """Prefer one supplied Vietnamese name per registration; preserve other audio."""
    if not reference:
        return
    pack_path = (folder / reference['file']).resolve()
    if reference['file'] != PACK_FILE or digest(pack_path) != reference['sha256']:
        raise ValueError('Changed team-name pack')
    pack = json.loads(pack_path.read_text(encoding='utf-8'))
    if pack['schema'] != 1 or pack['language'] != 'vi' or len(pack['clips']) != 53:
        raise ValueError('Expected exactly 53 prepared Vietnamese names')
    registrations = set()
    for key, clip in pack['clips'].items():
        registration, = clip['teamIds']
        expected = f'team-names/vi/{registration}.mp3'
        if (registration in registrations or registration not in manifest['teamProfiles']
                or clip['file'] != expected or key != f'supplied-name-{registration}-vi'
                or clip['sourceType'] != 'user-supplied-recording'
                or clip['role'] != 'team-name' or clip['channel'] != 'voice'
                or clip['lang'] != 'vi' or digest(folder / expected) != clip['sha256']
                or clip['suppliedEvidence']['inputSha256'] != clip['sha256']):
            raise ValueError('Invalid supplied team name: ' + key)
        if key in manifest['clips'] and manifest['clips'][key] != clip:
            raise ValueError('Team-name key collision: ' + key)
        registrations.add(registration)
        manifest['clips'][key] = clip
        profile = manifest['teamProfiles'][registration]
        profile['names']['voice'] = [key]
        profile['availability']['nameVi'] = True
    manifest['teamNamePack'] = reference
    manifest['teamCoverage'] = {
        key: sum(bool(p['availability'][key]) for p in manifest['teamProfiles'].values())
        for key in ['nameVi', 'nameKm', 'historyVi', 'historyKm']
    }


def write_team_archive(manifest, folder=OUT):
    archive = folder / 'team-audio.zip'
    clips, sources = manifest['clips'], manifest['sources']
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        def put(name, data):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data)
        put('README.txt', 'Original recordings from:\n' + '\n'.join(s['url'] for s in sources.values())
            + '\n' + json.dumps(manifest['teamCoverage'])
            + '\nEach folder is one current registration, not a race bib. Missing audio stays missing. '
            'Supplied names retain the original bytes and owner-provided labels; these are not '
            'independent listening or CC verification. Other profiles retain their original '
            'CC/ASR and historical evidence. Copyright remains with the recording owners.\n')
        if manifest.get('teamNamePack'):
            put(PACK_FILE, (folder / PACK_FILE).read_bytes())
        for registration, profile in sorted(manifest['teamProfiles'].items()):
            keys = sorted({key for section in ['names', 'history']
                           for channel in ['voice', 'khmer'] for key in profile[section][channel]})
            origin_ids = {clips[key].get('sourceId') for key in keys} & sources.keys()
            put(registration + '/profile.json', json.dumps({**profile,
                'sources': {key: sources[key] for key in sorted(origin_ids)},
                'recordings': {key: clips[key] for key in keys}}, ensure_ascii=False, indent=2) + '\n')
            for key in keys:
                put(registration + '/' + clips[key]['file'], (folder / clips[key]['file']).read_bytes())
    manifest['downloads'] = {'teamAudio': {'file': archive.name,
                            'bytes': archive.stat().st_size, 'sha256': digest(archive)}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-folder', type=Path, required=True)
    args = parser.parse_args()
    mapping_path = ROOT / 'docs/team-name-audio.json'
    mapping = json.loads(mapping_path.read_text(encoding='utf-8'))
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    roster = {r['id']: r for r in json.loads((ROOT / 'public/assets/data/roster-2025.json')
                                           .read_text(encoding='utf-8'))['records']}
    rows = mapping['recordings']
    if len(rows) != 53 or len({r['registrationId'] for r in rows}) != 53:
        raise ValueError('Mapping must identify 53 distinct registrations')
    actual = {p.name for p in args.source_folder.glob('*.mp3')}
    if actual != {r['file'] for r in rows}:
        raise ValueError('Prepared source files differ from the reviewed mapping')
    clips, prepared = {}, []
    for row in rows:
        registration = row['registrationId']
        if registration not in roster or roster[registration]['gender'] == 'female':
            raise ValueError('Invalid registration or a male/female name collision')
        if row['rosterName'] != roster[registration]['nameVi']:
            raise ValueError('Registration name differs from the reviewed mapping')
        source = args.source_folder / row['file']
        decoded = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-i',
            str(source), '-ar', '24000', '-ac', '1', '-f', 'f32le', '-'],
            capture_output=True, check=True)
        pcm = np.frombuffer(decoded.stdout, dtype='<f4')
        duration = len(pcm) / 24000
        peak = float(np.max(np.abs(pcm))) if len(pcm) else 0
        rms = float(np.sqrt(np.mean(pcm * pcm))) if len(pcm) else 0
        if not .2 < duration < 5 or not .01 < peak <= 1 or rms < .005:
            raise ValueError('Invalid, silent or clipped supplied name: ' + source.name)
        key = f'supplied-name-{registration}-vi'
        relative = f'team-names/vi/{registration}.mp3'
        sha = digest(source)
        clips[key] = {'role': 'team-name', 'channel': 'voice', 'lang': 'vi',
            'teamIds': [registration], 'text': row['label'], 'file': relative,
            'sourceType': 'user-supplied-recording', 'duration': round(duration, 4),
            'peak': round(peak, 6), 'rms': round(rms, 6), 'bytes': source.stat().st_size,
            'sha256': sha, 'suppliedEvidence': {'manifest': PACK_FILE,
                'inputFile': source.name, 'inputSha256': sha, 'mappingFile': 'docs/team-name-audio.json',
                'mappingSha256': digest(mapping_path), 'labelSource': 'owner-prepared-files',
                'independentListeningVerified': False},
            'processing': {'normalization': 'unchanged', 'reencoded': False}}
        prepared.append((source, OUT / relative))
    # Validate the complete batch before writing any recording.
    for source, target in prepared:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    write_json(OUT / PACK_FILE, {'schema': 1, 'language': 'vi',
        'sourceType': 'user-supplied-recording', 'review': mapping['review'], 'clips': clips})
    reference = {'file': PACK_FILE, 'sha256': digest(OUT / PACK_FILE)}
    apply_team_name_pack(manifest, reference)
    write_team_archive(manifest)
    write_json(manifest_path, manifest)
    recipe_path = ROOT / 'docs/broadcast-audio-cuts.json'
    recipe = json.loads(recipe_path.read_text(encoding='utf-8'))
    recipe['teamNamePack'] = reference
    write_json(recipe_path, recipe)
    print(json.dumps({'importedVietnameseNames': len(clips),
        'bytes': sum(c['bytes'] for c in clips.values()),
        'coverage': manifest['teamCoverage'], 'khmerChanged': False}))


if __name__ == '__main__':
    main()
