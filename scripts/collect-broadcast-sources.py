"""Discover deduplicated YouTube race references; search results never approve audio."""
import argparse
import concurrent.futures
import datetime
import json
import re
from pathlib import Path
import yt_dlp

ROOT = Path(__file__).resolve().parents[1]
OFFICIAL = 'UCNBvVM7nAXZIdFgwPJKMigQ'
SEEDS = ['Y2fp9gYRIZ8', 'CRdgAAg7Mo0', 'crZF3hghbgQ', 'kQ2as2kBDxk', 'tnb7TdUVRkU', 'wI7VrFiAUYs']


def search(query, limit):
    options = {'quiet': True, 'extract_flat': True, 'skip_download': True,
               'socket_timeout': 20, 'retries': 1, 'js_runtimes': {'node': {}}}
    with yt_dlp.YoutubeDL(options) as downloader:
        result = downloader.extract_info(f'ytsearch{limit}:{query}', download=False)
    return query, list(result.get('entries', []))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--first-year', type=int, default=2008)
    parser.add_argument('--last-year', type=int, default=datetime.date.today().year)
    parser.add_argument('--limit', type=int, default=8)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/broadcast-sources.json')
    args = parser.parse_args()
    queries = [f'đua ghe ngo Sóc Trăng {year} trực tiếp STV' for year in range(args.first_year, args.last_year + 1)]
    queries += ['STV đua ghe ngo bình luận tiếng Khmer', 'đua ghe ngo Sóc Trăng chung kết truyền hình trực tiếp']
    videos = {key: {'videoId': key, 'url': f'https://www.youtube.com/watch?v={key}', 'discoveredBy': ['user-reference-or-official-broadcast']} for key in SEEDS}
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(search, query, args.limit): query for query in queries}
        for future in concurrent.futures.as_completed(futures):
            query = futures[future]
            try:
                _, entries = future.result()
                for entry in entries:
                    key = entry.get('id')
                    if not key:
                        continue
                    record = videos.setdefault(key, {'videoId': key, 'url': f'https://www.youtube.com/watch?v={key}', 'discoveredBy': []})
                    record.update({k: entry.get(k) for k in ['title', 'duration', 'channel', 'channel_id', 'live_status']})
                    record['discoveredBy'].append(query)
                    record['yearsInTitle'] = sorted({int(y) for y in re.findall(r'\b(?:19|20)\d{2}\b', entry.get('title', ''))})
                    record['eventYearStatus'] = 'title-only-unverified'
                    record['sourceClass'] = 'reference-broadcaster' if entry.get('channel_id') == OFFICIAL else 'reference-only'
                    record['audioEligibility'] = 'not-reviewed'
                print(json.dumps({'query': query, 'results': len(entries)}, ensure_ascii=False), flush=True)
            except Exception as error:
                failures.append({'query': query, 'error': str(error)})
    catalog = {'schema': 1, 'searchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'scope': {'firstYear': args.first_year, 'lastYear': args.last_year, 'resultsPerQuery': args.limit,
                         'completeYouTubeArchive': False, 'queries': queries},
               'notes': ['Deduplicated discovery catalog, not a claim to all YouTube videos.',
                         'A year in a title or query does not verify the event year.',
                         'Same channel does not establish the same commentators; captions do not label speakers.',
                         'Only separately reviewed cuts can enter the game; historical participation does not assign current registration IDs.'],
               'failures': failures, 'videos': sorted(videos.values(), key=lambda v: (v.get('yearsInTitle', [0]) or [0], v['videoId']))}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'videos': len(videos), 'failures': len(failures)}))


if __name__ == '__main__':
    main()
