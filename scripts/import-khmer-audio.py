"""Import an Antigravity handoff for dashboard review, without changing game audio."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public/assets/race-audio'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    supplied, script = read(source / 'manifest.json'), read(source / 'khmer-script.json')
    previous = read(ROOT / 'public/audio-dashboard/export/manifest.json')
    # Exclude an earlier import so rebuilding this pack never refers to itself.
    by_hash = {c['sha256']: (k, c) for k, c in previous['clips'].items()
               if not c.get('sourceFile', '').startswith('khmer-review/')}
    roster = {r['id']: r for r in read(ROOT / 'public/assets/data/roster-2025.json')['records']}
    target = AUDIO / 'khmer-review'
    clips, files, names, issues, transfers = {}, {}, {}, [], []
    for filename, entry in supplied['clips'].items():
        path = (source / entry['file']).resolve()
        if not path.is_relative_to(source / 'audio') or path.suffix.lower() != '.mp3':
            raise ValueError('Unsafe handoff audio path: ' + filename)
        if sha(path) != entry['sha256'] or path.stat().st_size != entry['bytes']:
            raise ValueError('Handoff audio hash/size mismatch: ' + filename)
        if entry['language'] != 'km':
            raise ValueError('Non-Khmer audio in Khmer handoff')
        reused = by_hash.get(entry['sha256'])
        key = reused[0] if reused else 'agy-' + path.stem
        hint = re.fullmatch(r'ai-name-((?:can_tho|ca_mau)-\d+)-km\.mp3', filename)
        registrations = list(reused[1].get('teamIds', [])) if reused else []
        warnings = []
        if entry.get('cueId') == 'team-name':
            if not registrations and hint and hint[1] in roster:
                registrations = [hint[1]]
                warnings.append('Mã đội suy từ tên file; cần nghe xác nhận nội dung.')
            if not registrations:
                raise ValueError('Team-name recording without a review identity: ' + filename)
            if len(registrations) > 1:
                warnings.append('Tên chùa dùng chung; audio chưa phân biệt đội hoặc nam/nữ.')
            for registration in registrations:
                names.setdefault(registration, []).append(key)
        text = entry.get('text', '')
        if text.lower().endswith('.mp3'):
            text = reused[1]['text'] if reused else ''
            if not reused:
                warnings.append('Gói chưa cung cấp lời chép Khmer cho file này.')
        if '-carrier-' in filename or filename == 'ai-champion-kos-thum-km.mp3':
            warnings.append('Nhãn lời bị chép giống bản Tum Núp 2; cần nghe đối chiếu biến thể.')
        if not reused:
            clips[key] = {'file': 'khmer-review/' + filename, 'lang': 'km', 'channel': 'khmer',
                'role': 'team-name' if entry.get('cueId') == 'team-name' else 'commentary',
                'teamIds': registrations, 'text': text, 'sourceType': entry['sourceType'],
                **{k: entry[k] for k in ['duration', 'peak', 'rms', 'bytes', 'sha256']},
                'dashboardOnly': True, 'nativeListeningVerified': False,
                'synthesisEvidence': {'voice': entry.get('voice'),
                    'manifest': 'khmer-review/source/manifest.json',
                    'nativeListeningVerified': False},
                'reviewWarnings': warnings, 'textIsVerifiedTranscript': False}
            transfers.append((path, target / filename))
        files[entry['file']] = {'clipId': key, 'declaredText': entry.get('text', ''),
            'declaredTextVi': entry.get('textVi', ''), 'reviewWarnings': warnings,
            'registrationIds': registrations, 'reusedByHash': bool(reused)}
        if warnings:
            issues.append({'sourceFile': entry['file'], 'clipId': key, 'messages': warnings})
    cues = {}
    for cue in script['cues']:
        primary = cue['audio']['primary']
        paths = list(dict.fromkeys([primary, *cue['audio'].get('variants', []),
            *(c['file'] for c in supplied['clips'].values() if c.get('cueId') == cue['id'])]))
        if any(p not in files for p in paths):
            raise ValueError('Missing cue recording: ' + cue['id'])
        cues[cue['id']] = {'primaryKey': files[primary]['clipId'],
            'variantKeys': list(dict.fromkeys(files[p]['clipId'] for p in paths)),
            'text': cue['text'], 'resolvedTextKm': cue.get('resolvedTextKm'),
            'conditions': cue['conditions'], 'notes': cue.get('notes', ''),
            'claimedStatus': cue['status'], 'nativeListeningVerified': False}
    if len(cues) != 29 or len(files) != len(list((source / 'audio').glob('*.mp3'))):
        raise ValueError('Incomplete handoff cue/file coverage')
    # Curated meanings are bound to the precise source bytes, never to a filename
    # guess. Keep the submitted metadata intact in source/ for comparison.
    review = read(ROOT / 'docs/khmer-audio-review.json')
    available = {**{k: c for k, c in previous['clips'].items()
                   if not c.get('sourceFile', '').startswith('khmer-review/')}, **clips}
    clip_reviews = {}
    for key, translation in review['translations'].items():
        clip = available[key]
        if clip['sha256'] != translation['sha256'] or clip['text'] != translation['textKm']:
            raise ValueError('Stale Khmer meaning: ' + key)
        clip_reviews[key] = {'sha256': clip['sha256'], 'meaningVi': translation['meaningVi'],
                            'translationStatus': translation['translationStatus']}
    for key, scope in review['scopes'].items():
        if available[key]['sha256'] != scope['sha256']:
            raise ValueError('Stale resolved-team scope: ' + key)
        clip_reviews.setdefault(key, {'sha256': scope['sha256']})['usage'] = {
            k: v for k, v in scope.items() if k != 'sha256'}
    repaired_path = target / 'repairs/manifest.json'
    repaired = {r['clipId']: r for r in read(repaired_path)['repairs']} if repaired_path.exists() else {}
    for definition in review['repairs']:
        key = definition['clipId']
        if clips[key]['sha256'] != definition['originalSha256']:
            raise ValueError('Stale copied-label correction: ' + key)
        repair = repaired.get(key)
        if not repair:
            # Known copied labels cannot be presented as the recording's words.
            clips[key]['text'] = ''
            continue
        for field in ['originalSha256', 'textKm', 'meaningVi', 'usage']:
            if repair[field] != definition[field]:
                raise ValueError('Stale synthesized repair: ' + key)
        audio_path = (AUDIO / repair['file']).resolve()
        if not audio_path.is_relative_to(target / 'repairs') or sha(audio_path) != repair['sha256']:
            raise ValueError('Changed synthesized repair: ' + key)
        clips[key].update({k: repair[k] for k in ['file', 'sha256', 'bytes', 'duration', 'peak', 'rms']})
        clips[key].update(text=repair['textKm'], meaningVi=repair['meaningVi'],
            usage=repair['usage'], textEvidence='synthesis-request',
            original={'file': 'khmer-review/' + definition['sourceFilename'],
                      'sha256': definition['originalSha256']},
            synthesisEvidence={k: repair[k] for k in ['voice', 'requestSha256', 'sourceWavSha256', 'ssml']},
            reviewWarnings=['Bản tạo lại từ văn bản xác định; phát âm Khmer còn chờ nghe duyệt.'])
    for entry in files.values():
        if entry['clipId'] in repaired:
            entry['reviewWarnings'] = clips[entry['clipId']]['reviewWarnings']
    issues = [{'sourceFile': path, 'clipId': entry['clipId'], 'messages': entry['reviewWarnings']}
              for path, entry in files.items() if entry['reviewWarnings']]
    for original, destination in transfers:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, destination)
    evidence = {}
    for filename in ['manifest.json', 'khmer-script.json', 'khmer-script.csv', 'review.md']:
        destination = target / 'source' / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / filename, destination)
        evidence[filename] = sha(destination)
    result = {'schema': 1, 'sourcePackageId': supplied['packageId'], 'sourceHashes': evidence,
        'summary': {'files': len(files), 'reusedByHash': len(files) - len(clips),
            'newFiles': len(clips), 'cues': len(cues), 'namedRegistrations': len(names),
            'filesWithReviewWarnings': len(issues)},
        'runtimeChanged': False, 'nativeListeningVerified': False,
        'clips': clips, 'cues': cues, 'names': names, 'files': files, 'issues': issues,
        'clipReviews': clip_reviews, 'cueWarnings': review['cueWarnings'],
        'repairs': {'requested': len(review['repairs']), 'generated': len(repaired)},
        'notice': 'Imported for listening/review. Hash matches verify bytes, not language, '
                  'team identity, translation, native pronunciation or gameplay suitability.'}
    (target / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n',
                                         encoding='utf-8', newline='\n')
    print(json.dumps(result['summary']))


if __name__ == '__main__':
    main()
