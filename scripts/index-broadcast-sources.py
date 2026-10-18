"""Index downloaded CC for human review without confusing it with approved game audio."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def normalized(text, language):
    if language == 'km':
        return re.sub(r'[^\u1780-\u17ff]', '', text)
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower().replace('đ', 'd')) if not unicodedata.combining(c))


def index_vietnamese(cache, catalog, recipe):
    """Index every Latin-script CC span; this is a search pool, not runtime approval."""
    lexicon = {
        'start': ['xuat phat', 'san sang', 'chuan bi', 'roi diem'],
        'cruise': ['nhip dam', 'giu nhip', 'duong dua', 'nhung mai dam', 'giu suc'],
        'contest': ['so ke', 'can bang', 'ngang nhau', 'quyet liet', 'hap dan', 'bam duoi'],
        'lead': ['dan truoc', 'vuot len', 'but len', 'khoang cach', 'vuot qua'],
        'sprint': ['nuoc rut', 'tang toc', 'tang nhip', 'tang cuong', 'tang suc'],
        'finish': ['ve dich', 'chien thang', 'chuc mung', 'ket thuc', 'tuyet voi'],
    }
    sources, spans = [], []
    for video in catalog['videos']:
        if video.get('referenceStatus') != 'race-reference':
            continue
        key = video['videoId']
        cc = cache / ('youtube-captions.vi-orig.json3' if key == recipe['source']['videoId'] else f'captions-{key}.vi-orig.json3')
        if not cc.exists():
            continue
        payload = cc.read_bytes()
        audio_available = key in recipe['sources']
        sources.append(dict(sourceId=key, url=video['url'], captionsSha256=hashlib.sha256(payload).hexdigest(),
                            fullAudioAvailable=audio_available, uploadDate=video.get('upload_date'),
                            eventYear=video.get('eventYear'), speakerIdentityVerified=False))
        events = json.loads(payload)['events']
        for i, event in enumerate(events):
            text = ''.join(s.get('utf8', '') for s in event.get('segs', [])).strip()
            if not re.search(r'[A-Za-zÀ-ỹ]', text) or re.search(r'[\u1780-\u17ff]', text) or re.fullmatch(r'\[[^]]+\]', text):
                continue
            start = event['tStartMs'] / 1000
            next_start = events[i+1].get('tStartMs', 0) / 1000 if i+1 < len(events) else start + event.get('dDurationMs', 2000)/1000
            end = min(start + event.get('dDurationMs', 15000)/1000, next_start)
            folded = normalized(text, 'vi')
            tags = [tag for tag, terms in lexicon.items() if any(term in folded for term in terms)]
            spans.append(dict(sourceId=key, start=round(start, 3), end=round(max(start+.1, end), 3),
                              text=text, tags=tags, fullAudioAvailable=audio_available,
                              status='caption-candidate-not-approved'))
    result = dict(schema=1, scope='All Vietnamese-script cues in the locally downloaded race CC tracks; automatic captions, not certified transcripts or all YouTube broadcasts.',
                  sources=sources, sourceCount=len(sources), fullAudioSources=sum(s['fullAudioAvailable'] for s in sources),
                  spanCount=len(spans), taggedCount=sum(bool(s['tags']) for s in spans), spans=spans)
    (ROOT/'docs/vietnamese-commentary-index.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')
    return {key: result[key] for key in ['sourceCount', 'fullAudioSources', 'spanCount', 'taggedCount']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--vietnamese-only', action='store_true', help='Build the complete local Vietnamese CC search pool without modifying the existing source catalog')
    args = parser.parse_args()
    catalog_path = ROOT / 'docs/broadcast-sources.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    recipe = json.loads((ROOT / 'docs/broadcast-audio-cuts.json').read_text(encoding='utf-8'))
    if args.vietnamese_only:
        print(json.dumps(index_vietnamese(args.cache, catalog, recipe)))
        return
    roster = json.loads((ROOT / 'public/assets/data/roster-2025.json').read_text(encoding='utf-8'))['records']
    candidates = []
    for video in catalog['videos']:
        key = video['videoId']
        info = next((p for p in [args.cache / f'captions-{key}.info.json', args.cache / f'broadcast-{key}.info.json', args.cache / f'metadata-{key}.json'] if p.exists()), None)
        if info:
            data = json.loads(info.read_text(encoding='utf-8'))
            video.update({field: data.get(field) for field in ['title', 'channel', 'channel_id', 'upload_date', 'duration', 'release_timestamp']})
            video['metadataStatus'] = 'youtube-metadata-fetched'
            captions = data.get('automatic_captions', {})
            video['captionTracks'] = data.get('originalAutoCaptions') or [k for k in captions if k.endswith('-orig')]
            video['manualCaptionTracks'] = data.get('manualSubtitles') or list(data.get('subtitles', {}))
        else:
            video['metadataStatus'] = 'youtube-search-metadata-only'
        title = normalized(video.get('title') or '', 'vi')
        archive_race = ('om-boc' in title or 'om boc' in title) and any(k in title for k in ['vong', 'round', 'match', 'tuong thuat', 'excerpt'])
        video['referenceStatus'] = 'race-reference' if ('ghe ngo' in title or 'ngo boat' in title or 'boat rac' in title or 'ngo soc tr' in title or archive_race) else 'excluded-unrelated-search-result'
        video['yearsInTitle'] = sorted({int(y) for y in re.findall(r'\b(?:19|20)\d{2}\b', video.get('title') or '')})
        video['uploadYearDiffersFromTitle'] = bool(video.get('upload_date') and video['yearsInTitle'] and int(video['upload_date'][:4]) not in video['yearsInTitle'])
        video['speakerIdentityVerified'] = False
        video['runtimeCuts'] = [name for name, cut in recipe['cuts'].items() if cut.get('sourceId', recipe['source']['videoId']) == key]
        video['audioEligibility'] = 'contains-cc-reviewed-cuts-not-listening-certified' if video['runtimeCuts'] else 'reference-only-not-reviewed'
        if key in recipe.get('sources', {}):
            video['eventYear'] = recipe['sources'][key]['eventYear']
            video['eventYearStatus'] = 'broadcast-title-and-event-context-reviewed'
        cc = args.cache / f'captions-{key}.vi-orig.json3'
        if key == recipe['source']['videoId']:
            cc = args.cache / 'youtube-captions.vi-orig.json3'
        if not cc.exists():
            video['captionIndexStatus'] = 'not-downloaded' if video.get('captionTracks') else 'no-original-cc-found-or-not-yet-inspected'
            continue
        raw = cc.read_bytes()
        cues = []
        for event in json.loads(raw).get('events', []):
            text = ''.join(s.get('utf8', '') for s in event.get('segs', [])).strip()
            if text:
                cues.append({'at': round(event['tStartMs'] / 1000, 3), 'text': text})
        video['captionIndexStatus'] = 'indexed'
        video['captions'] = {'sha256': hashlib.sha256(raw).hexdigest(), 'cueCount': len(cues),
                             'khmerCues': sum(bool(re.search(r'[\u1780-\u17ff]', c['text'])) for c in cues),
                             'kind': 'automatic', 'speakerLabels': False}
        if video['referenceStatus'] != 'race-reference':
            continue
        for language in ['vi', 'km']:
            search_cues = [(cue, normalized(cue['text'], language)) for cue in cues]
            names = {}
            for team in roster:
                name = team.get('nameKm') if language == 'km' else re.sub(r'\([^)]*\)', '', team['nameVi']).strip()
                if not name:
                    continue
                names.setdefault(name, []).append(team['id'])
            for name, registrations in names.items():
                needle = normalized(name, language)
                for cue in [c for c, text in search_cues if needle in text][:3]:
                    candidates.append({'sourceId': key, 'sourceUrl': video['url'] + '&t=' + str(int(cue['at'])),
                                       'language': language, 'pagodaDisplayName': name,
                                       'currentPagodaReferences': registrations, 'at': cue['at'], 'rawCaption': cue['text'],
                                       'status': 'candidate-only', 'identityLevel': 'text-name-match-not-historical-registration',
                                       'speakerIdentityVerified': False})
    catalog['coverage'] = {'discoveredVideos': len(catalog['videos']),
                           'raceReferences': sum(v['referenceStatus'] == 'race-reference' for v in catalog['videos']),
                           'captionSources': sum(v['captionIndexStatus'] == 'indexed' for v in catalog['videos']),
                           'captionCues': sum(v.get('captions', {}).get('cueCount', 0) for v in catalog['videos']),
                           'khmerCaptionCues': sum(v.get('captions', {}).get('khmerCues', 0) for v in catalog['videos']),
                           'nameCandidates': len(candidates), 'runtimeAudioSources': len(recipe.get('sources', {recipe['source']['videoId']: recipe['source']}))}
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (ROOT / 'public/assets/race-audio/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (ROOT / 'docs/broadcast-candidates.json').write_text(json.dumps({'schema': 1, 'notes': 'CC search candidates only. No automatic runtime eligibility or historical team-number/gender assignment.', 'candidates': candidates}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(catalog['coverage']))


if __name__ == '__main__':
    main()
