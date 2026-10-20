"""Build the standalone audio desk and a deterministic Antigravity handoff."""
import argparse
import copy
import csv
import hashlib
import io
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
AUDIO = PUBLIC / 'assets/race-audio'
DESK = PUBLIC / 'audio-dashboard'
EVIDENCE_FILES = {
    'team-names/manifest.json': AUDIO / 'team-names/manifest.json',
    'team-names/khmer.json': AUDIO / 'team-names/khmer.json',
    'commentary-trial/manifest.json': AUDIO / 'commentary-trial/manifest.json',
    'commentary-script.json': AUDIO / 'commentary-script.json',
    'field/manifest.json': AUDIO / 'field/manifest.json',
    'menu/source.json': AUDIO / 'menu/source.json',
    'docs/team-name-audio.json': ROOT / 'docs/team-name-audio.json',
    'docs/khmer-team-audio.json': ROOT / 'docs/khmer-team-audio.json',
    'docs/audio-direction.json': ROOT / 'docs/audio-direction.json',
    'docs/broadcast-audio-cuts.json': ROOT / 'docs/broadcast-audio-cuts.json',
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def csv_bytes(header, rows):
    stream = io.StringIO(newline='')
    writer = csv.writer(stream)
    writer.writerow(header)
    writer.writerows(rows)
    return ('\ufeff' + stream.getvalue()).encode('utf-8')


def collect():
    script_raw = (ROOT / 'docs/audio-direction.json').read_bytes()
    script = json.loads(script_raw)
    runtime = read(AUDIO / 'manifest.json')
    clips = copy.deepcopy(runtime['clips'])
    teams = copy.deepcopy(runtime['teamProfiles'])
    khmer = read(AUDIO / 'team-names/khmer.json')
    for key, clip in khmer['clips'].items():
        if key in clips:
            raise ValueError('Duplicate preview clip')
        clips[key] = copy.deepcopy(clip)
        registration, = clip['teamIds']
        if teams[registration]['names']['khmer']:
            raise ValueError('Preview names must not replace existing Khmer recordings')
        teams[registration]['names']['khmer'] = [key]
        clips[key]['dashboardOnly'] = True
    trial = read(AUDIO / 'commentary-trial/manifest.json')
    needed = {key for cue in script['cues'] for keys in cue['audio'].values() for key in keys}
    for sample in trial['samples']:
        key = 'trial-' + sample['id']
        if key not in needed:
            continue
        if sample['language'] != 'km':
            raise ValueError('Vietnamese AI is not included in the handoff')
        clips[key] = {**sample, 'channel': 'khmer', 'lang': 'km', 'role': 'team-history',
            'teamIds': [], 'sourceType': 'azure-stock-neural', 'dashboardOnly': True,
            'synthesisEvidence': {'manifest': 'commentary-trial/manifest.json',
                'voice': sample['voice'], 'scriptSha256': trial['scriptSha256'],
                'requestSha256': sample['requestSha256'], 'nativeListeningVerified': False}}
        clips[key]['teamIds'] = next(cue['conditions']['teamIds'] for cue in script['cues']
                                     if key in cue['audio']['km'])
        for registration in clips[key]['teamIds']:
            teams[registration]['history']['khmer'].append(key)
    for cue in script['cues']:
        for language, keys in cue['audio'].items():
            for key in keys:
                if key not in clips or clips[key]['lang'] != language:
                    raise ValueError('Invalid cue/audio language: ' + cue['id'] + '/' + key)
    roster = {r['id']: r for r in read(PUBLIC / 'assets/data/roster-2025.json')['records']}
    for registration, profile in teams.items():
        profile['registrationId'] = registration
        profile['gender'] = roster[registration]['gender']
        for section in ['names', 'history']:
            for channel in ['voice', 'khmer']:
                for key in profile[section][channel]:
                    if registration not in clips[key]['teamIds']:
                        raise ValueError('Team audio identity mismatch')
    media = {}
    for key, clip in clips.items():
        source = (AUDIO / clip['file']).resolve()
        if not source.is_relative_to(AUDIO.resolve()) or sha(source.read_bytes()) != clip['sha256']:
            raise ValueError('Changed or unsafe audio source: ' + key)
        lane = clip['lang'] if clip['channel'] in ['voice', 'khmer'] else 'field'
        relative = f'media/{lane}/{key}.mp3'
        media[relative] = source
        clip['sourceFile'] = clip['file']
        clip['file'] = relative
        clip['review'] = ('native-review-pending' if clip['sourceType'] == 'azure-stock-neural'
                          else 'owner-labelled' if clip['sourceType'] == 'user-supplied-recording'
                          else 'source-evidence-available')
    music = read(AUDIO / 'menu/source.json')
    # Menu music uses its own source manifest and remains separate from commentary.
    music_files = list((AUDIO / 'menu').glob('*.mp3'))
    if len(music_files) != 1:
        raise ValueError('Expected one menu music recording')
    media['media/music/menu.mp3'] = music_files[0]
    beds = {'menuMusic': {'file': 'media/music/menu.mp3',
        'sha256': sha(music_files[0].read_bytes()), 'source': music,
        'when': 'Menu only, user gesture required. Loop; stop/fade before race introduction.'},
        'field': runtime['field'], 'notes': [
            'Whistle onset follows the paddle catch clock, not a free-running interval.',
            'Keep the eight-beat drum bar in time with cadence; do not stack impact samples.',
            'Stronger final splashes and crowd depend on actual effort and own-boat distance.',
            'All speech pauses with the match. Never play Vietnamese and Khmer together.']}
    coverage = {name: sum(bool(p[section][channel]) for p in teams.values())
                for name, section, channel in [('nameVi', 'names', 'voice'),
                    ('nameKm', 'names', 'khmer'), ('historyVi', 'history', 'voice'),
                    ('historyKm', 'history', 'khmer')]}
    data = {'schema': 1, 'packageId': sha(script_raw + ''.join(
        c['sha256'] for c in clips.values()).encode())[:16], 'scriptSha256': sha(script_raw),
        'script': script, 'clips': clips, 'teams': teams, 'coverage': coverage,
        'beds': beds, 'sources': runtime['sources'],
        'provenanceFiles': [{'file': name, 'sha256': sha(path.read_bytes())}
                            for name, path in EVIDENCE_FILES.items()],
        'runtimeChanged': False, 'review': {
            'khmerNativeListeningVerified': False,
            'originalCommentatorsCloned': False,
            'withheldFolder': 'audio/output_audio/tieng_khmer',
            'withheldReason': 'Prepared filenames conflict with sampled language/team content; not imported.',
            'handoffIsNotAutomaticGameIntegration': True}}
    return data, media


def bundle_files(data, media):
    script = data['script']
    files = {'manifest.json': dump({k: v for k, v in data.items() if k != 'script'}).encode(),
             'script.json': dump(script).encode()}
    for name, source in EVIDENCE_FILES.items():
        files[name] = source.read_bytes()
    cue_rows, requests = [], []
    lines = ['# Kịch bản audio · Lễ hội đua ghe Ngo', '',
        'Cự ly 1.200 m. Một giọng nói tại một thời điểm. Tiếng Việt dùng bản thu gốc; '
        'Khmer có thể dùng giọng stock AI. Chữ Khmer và phát âm còn chờ người rành tiếng duyệt.', '']
    for stage in script['stages']:
        lines += ['## ' + stage['title'] + ' · ' + stage['range'], '']
        for cue in [c for c in script['cues'] if c['stage'] == stage['id']]:
            lines += ['### ' + cue['id'] + ' · ' + cue['title'], '',
                      '**Khi phát:** ' + cue['when'], '',
                      '**Việt:** ' + cue['text']['vi'], '',
                      '**Khmer:** ' + (cue['text']['km'] or 'Chưa soạn / chưa đủ nguồn.'), '',
                      '**Lưu ý:** ' + (cue['notes'] or 'Kiểm tra lại điều kiện ngay trước khi phát.'), '']
            for language in ['vi', 'km']:
                keys = cue['audio'][language]
                actual = ' '.join(data['clips'][key]['text'] for key in keys)
                text = cue['text'][language]
                status = ('not-scripted' if not text else 'needs-audio' if not keys
                          else 'ready' if actual.strip() == text.strip() else 'reference-only')
                cue_rows.append([cue['id'], stage['title'], language, cue['title'], cue['when'],
                    json.dumps(cue['conditions'], ensure_ascii=False), cue['priority'],
                    cue['cooldownSeconds'], text, actual, ';'.join(keys), status])
                if status in ['needs-audio', 'reference-only']:
                    requests.append({'cueId': cue['id'], 'language': language, 'text': text,
                        'action': 'find-and-cut-original' if language == 'vi' else 'synthesize-stock-khmer',
                        'voice': 'km-KH-PisethNeural' if language == 'km' else None,
                        'conditions': cue['conditions'], 'names': cue['names'],
                        'placeholders': [p for p in ['player_name', 'opponent_name', 'winner_name']
                                         if '{' + p + '}' in text],
                        'reviewRequired': True, 'autoApprove': False})
    files['script.md'] = ('\n'.join(lines) + '\n').encode()
    files['cue-sheet.csv'] = csv_bytes(['cue_id', 'stage', 'language', 'title', 'when',
        'conditions_json', 'priority', 'cooldown_seconds', 'script_text', 'actual_audio_text',
        'audio_keys', 'status'], cue_rows)
    files['requests.json'] = dump({'schema': 1, 'packageId': data['packageId'],
        'vietnameseTtsAllowed': False, 'requests': requests}).encode()
    files['teams.csv'] = csv_bytes(['registration_id', 'name_vi', 'name_km', 'gender',
        'vi_audio_keys', 'km_audio_keys'], [[reg, p['nameVi'], p.get('nameKm', ''),
            p.get('gender') or 'unresolved', ';'.join(p['names']['voice']),
            ';'.join(p['names']['khmer'])] for reg, p in data['teams'].items()])
    files['ANTIGRAVITY.md'] = ('''# Audio handoff for Antigravity

Read `manifest.json`, `script.json`, `requests.json` and `cue-sheet.csv` first.
This is a separate review/export dashboard. Do not assume these files have been integrated into the game.

1. Match each team by `registrationId`. Never use source ordinal as a bib, infer gender from colours, or transfer male/female or team-1/team-2 histories.
2. Resolve `audio` keys against `manifest.clips`. Paths under `media/` are relative to this folder. Verify SHA-256 before use. `script_text` is the desired line; `actual_audio_text` is what the existing recording is labelled as saying. They are not interchangeable. Original evidence JSON files are included at the paths listed in `provenanceFiles`; their audio paths describe the original repository, so resolve transferred MP3s through the main manifest's `file` and `sourceFile` fields.
3. Vietnamese speech uses original recordings only. Requests with `find-and-cut-original` need source audio/context review; do not generate Vietnamese TTS. Khmer may use `km-KH-PisethNeural`. Stock AI is not a cloned commentator. Native pronunciation remains unverified.
4. Resolve names through the selected registration profiles. Never synthesize literal `{player_name}`, `{opponent_name}` or `{winner_name}`. Dynamic lines need name/phrase assembly or a separate per-match render; keep gaps natural and never overlap speakers.
5. `conditions` use the player's own distance in metres, elapsed racing seconds, gap in metres, actual pace, stamina, combo, surge and confirmed result. All conditions must hold immediately before playback. `teamIds` requires that exact participant. `leadChanged` requires an observed change, not merely a nonzero gap. `cupChampion` requires the tournament champion, not a heat win.
6. One speech bus. Finish cancels pending race commentary; pause freezes all audio; restart clears the old match queue. Honour priority, expiry and cooldown. Alternate languages between phrases instead of playing both every time. Duck beds during speech. Keep recorded coach whistle and drum bars aligned with the paddle clock.
7. `requests.json` lists missing/reference-only lines. Do not mark them completed just because an unrelated MP3 exists. Keep original source URLs/timestamps, recording hashes, and synthesis provenance. Recheck any edited script against its audio.
8. The prepared folder `audio/output_audio/tieng_khmer` is withheld because sampled names/languages conflict with labels. Do not import it blindly. `rejected-khmer-review.json` explains the evidence and limits.
9. Preserve the shared crew/hull assets, 8-boat cup, 61-team festival and tablet controls. Do not make version-suffixed source files. Run affected tests and inspect the actual playback before committing game integration.

Open `dashboard/index.html` directly for offline review. The browser downloads no audio until a play button is pressed. Edits save in that browser only: use Export JSON to produce a portable revised script. The export does not silently change the live game.
''').encode()
    files['README.md'] = (f'''# Ghe Ngo · Audio Studio

Package `{data['packageId']}` · {len(script['cues'])} situations · {len(data['teams'])} registrations.

Open [the dashboard](dashboard/index.html). Read [the script](script.md), [Antigravity instructions](ANTIGRAVITY.md), [CSV cue sheet](cue-sheet.csv), [team list](teams.csv), and [remaining requests](requests.json).

Vietnamese name coverage: {data['coverage']['nameVi']}/61. Khmer name coverage in this review package: {data['coverage']['nameKm']}/61. The 44 new Khmer names are stock Azure recordings for review/handoff; the game's runtime manifest is unchanged. Do not call these a verified imitation of the original commentators.

There are {len(requests)} language/line requests still requiring audio or an exact-text match. Existing source audio is included for review, with its provenance. The package contains no Azure key, local account configuration, full event video or executable tool.

To serve over HTTP if preferred: `python -m http.server 4180 --bind 127.0.0.1 --directory "E:/AI/Um Tuk/audio/antigravity"`, then open `http://127.0.0.1:4180/dashboard/`.
''').encode()
    report = ROOT / 'docs/qa/team-audio/khmer-folder-review.json'
    if report.exists():
        files['rejected-khmer-review.json'] = report.read_bytes()
    for relative, source in media.items():
        files[relative] = source.read_bytes()
    for name in ['index.html', 'styles.css', 'dashboard.js', 'rules.js']:
        raw = (DESK / name).read_bytes()
        if name == 'styles.css':
            raw = raw.replace(b'../assets/fonts/', b'./fonts/')
        if name == 'index.html':
            raw = raw.replace(b'class="back-link" href="../"',
                              b'class="back-link" href="https://machxanht.github.io/Tuk-Ngo/"')
        files['dashboard/' + name] = raw
    font = PUBLIC / 'assets/fonts/NotoSansKhmer.ttf'
    files['dashboard/fonts/NotoSansKhmer.ttf'] = font.read_bytes()
    local = copy.deepcopy(data)
    for clip in local['clips'].values():
        clip['file'] = '../' + clip['file']
    local['beds']['menuMusic']['file'] = '../media/music/menu.mp3'
    local['downloadBase'] = '../'
    local['packageZip'] = None
    files['dashboard/data.js'] = ('window.AUDIO_STUDIO_DATA=' + json.dumps(local,
        ensure_ascii=False).replace('</', '<\\/') + ';\n').encode()
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, help='Explicit local handoff folder')
    parser.add_argument('--zip-out', type=Path, help='Optional explicit copy of the complete ZIP')
    args = parser.parse_args()
    data, media = collect()
    files = bundle_files(data, media)
    public_data = copy.deepcopy(data)
    for clip in public_data['clips'].values():
        clip['file'] = '../assets/race-audio/' + clip['sourceFile']
    public_data['beds']['menuMusic']['file'] = '../assets/race-audio/menu/' + next(
        (AUDIO / 'menu').glob('*.mp3')).name
    public_data.update(downloadBase='./export/', packageZip='./handoff.zip')
    (DESK / 'data.js').write_text('window.AUDIO_STUDIO_DATA=' + json.dumps(public_data,
        ensure_ascii=False).replace('</', '<\\/') + ';\n', encoding='utf-8', newline='\n')
    for relative, raw in files.items():
        if relative.startswith(('media/', 'dashboard/')):
            continue
        target = DESK / 'export' / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
    with zipfile.ZipFile(DESK / 'handoff.zip', 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for relative, raw in sorted(files.items()):
            info = zipfile.ZipInfo(relative, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, raw)
    if args.out:
        destination = args.out.resolve()
        if destination == ROOT or destination.is_relative_to(ROOT):
            raise ValueError('Use an explicit handoff folder outside the repository')
        for relative, raw in files.items():
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
    if args.zip_out:
        if args.zip_out.suffix.lower() != '.zip':
            raise ValueError('ZIP output must have a .zip extension')
        args.zip_out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(DESK / 'handoff.zip', args.zip_out)
    print(json.dumps({'cues': len(data['script']['cues']), 'clips': len(data['clips']),
        'teams': len(data['teams']), 'coverage': data['coverage'], 'packageId': data['packageId'],
        'handoffFiles': len(files), 'zipBytes': (DESK / 'handoff.zip').stat().st_size}))


if __name__ == '__main__':
    main()
