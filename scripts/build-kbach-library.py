"""Bake public, source-linked boat drawings into the existing hull's UV space.

Usage: python scripts/build-kbach-library.py <download-folder>
Requires Pillow, numpy and OpenCV. Originals stay outside the repository;
every source panel is recorded by SHA256 and dimensions in manifest.json.
No image generation, recoloring, invented lettering or super-resolution.
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SUPPLIED = ['7669657553378282770', '7681583457654295826',
            '7691171048493944071', '7689300429460507956', '7686697282644888840']
# The fifth slide in these posts is an isolated detail, not another hull panel.
ORDERS = {'7688664407185820946': [1, 2, 3, 4],
          '7675590936516250887': [1, 2, 3, 4]}
LABELS = ['Đen · hoa hồng và lam', 'Đen · naga vàng và hoa sen',
          'Xanh lá · viền lam', 'Đen · nét vàng đồng', 'Đen · dải cầu vồng']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def flatten(path):
    image = np.array(Image.open(path).convert('RGB'))
    h, w = image.shape[:2]
    # The supplied panels are drawings on uniform white, black, green or blue.
    background = np.median(image[:32, :128].reshape(-1, 3), axis=0)
    mask = (np.max(np.abs(image.astype(float)-background), axis=2) > 46).astype('uint8')
    # Remove a parasol's narrow upright before finding the continuous hull.
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 61), np.uint8))
    # White separators inside multicolored diagonals belong to the hull too.
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
    count, components, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if count < 2:
        raise ValueError(f'No hull silhouette in {path}')
    component = 1+np.argmax(stats[1:, cv2.CC_STAT_AREA])
    hull = components == component
    valid = np.flatnonzero(hull.sum(axis=0) > 12)
    if len(valid) < w*.65:
        raise ValueError(f'Hull does not span the panel: {path}')
    x0, x1 = int(valid[0]), int(valid[-1])+1
    top = hull.argmax(axis=0).astype('float32')
    bottom = (h-1-hull[::-1].argmax(axis=0)).astype('float32')
    # Median curves suppress the small eye ornament and rail protrusions.
    def median_curve(values, width):
        padded = np.pad(values, width//2, mode='edge')
        return np.median(np.lib.stride_tricks.sliding_window_view(padded, width), axis=1)
    top = median_curve(top, 101)+1
    bottom = median_curve(bottom, 61)-1
    x = np.tile(np.arange(x0, x1, dtype='float32'), (512, 1))
    v = np.linspace(0, 1, 512, dtype='float32')[:, None]
    y = top[x0:x1][None, :]*(1-v)+bottom[x0:x1][None, :]*v
    flat = cv2.remap(image, x, y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return Image.fromarray(flat), {'cropColumns': [x0, x1], 'sourceSize': [w, h],
                                 'railRange': [float(top[valid].min()), float(top[valid].max())],
                                 'keelRange': [float(bottom[valid].min()), float(bottom[valid].max())]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', type=Path)
    args = parser.parse_args()
    entries = json.loads((args.sources/'channel-index.json').read_text(encoding='utf-8'))
    by_id = {e['url'].split('/')[-1]: e for e in entries}
    ids = SUPPLIED+[e['url'].split('/')[-1] for e in entries
                    if len(e.get('images', [])) >= 4 and e['url'].split('/')[-1] not in SUPPLIED]
    out = ROOT/'public/assets/ghe-ngo/kbach-library'
    out.mkdir(exist_ok=True)
    items = []
    for index, ident in enumerate(ids):
        entry = by_id.get(ident, {'url': f'https://www.tiktok.com/@karn_chinda/photo/{ident}'})
        paths = sorted((args.sources/ident).glob('part-*.jpeg'))
        order = ORDERS.get(ident, list(range(1, len(paths)+1)))
        panels, sources = [], []
        for number in order:
            path = args.sources/ident/f'part-{number}.jpeg'
            panel, fit = flatten(path)
            panels.append(panel)
            sources.append({'slide': number, 'sha256': digest(path), **fit})
        total = sum(p.width for p in panels)
        strip = Image.new('RGB', (8192, 512))
        at = 0
        for i, panel in enumerate(panels):
            edge = round(sum(p.width for p in panels[:i+1])/total*8192)
            strip.paste(panel.resize((edge-at, 512), Image.Resampling.LANCZOS), (at, 0))
            at = edge
        file = f'{ident}.webp'
        strip.save(out/file, quality=95, method=4)
        strip.resize((1024, 64), Image.Resampling.LANCZOS).save(out/f'{ident}-thumb.webp', quality=88, method=6)
        # Preserve the uncropped source composition for the in-game comparison.
        if not (out/f'{ident}-source.webp').exists():
            Image.open(paths[0]).save(out/f'{ident}-source.webp', quality=95, method=4)
        items.append({'id': ident, 'name': LABELS[index] if index < len(LABELS) else f'Bộ {index+1:02d}',
                      'source': entry['url'], 'uploader': '@karn_chinda',
                      'caption': entry.get('caption', ''), 'supplied': ident in SUPPLIED,
                      'kind': 'complete-hull', 'texture': file,
                      'thumbnail': f'{ident}-thumb.webp', 'original': f'{ident}-source.webp',
                      'size': [8192, 512], 'panels': sources,
                      'bytes': (out/file).stat().st_size,
                      'sha256': digest(out/file),
                      'credit': '@KPC_កីឡា' if ident == '7672365998481083666' else None,
                      'rights': 'Authorship and reuse licence unverified; public-post source preserved. Experimental game study.'})
        print(f'{index+1}/{len(ids)} {ident} {len(panels)} panels', flush=True)
    # The fleet uses one atlas, one material and the existing one hull draw call.
    # Pad each row to isolate mip filtering from neighboring designs.
    cell_h = 48
    atlas = Image.new('RGB', (2048, 2048), '#090b0a')
    for i, item in enumerate(items):
        tile = Image.open(out/item['texture']).resize((2048, cell_h-4), Image.Resampling.LANCZOS)
        atlas.paste(tile, (0, i*cell_h+2))
        atlas.paste(tile.crop((0, 0, 2048, 1)).resize((2048, 2)), (0, i*cell_h))
        atlas.paste(tile.crop((0, cell_h-5, 2048, cell_h-4)).resize((2048, 2)), (0, (i+1)*cell_h-2))
    atlas.save(out/'fleet.webp', quality=78, method=6)
    manifest = {'uploader': 'https://www.tiktok.com/@karn_chinda', 'items': items,
                'postsIndexed': len(entries), 'coverage': f'{len(items)} complete boat albums, including all five supplied links. Not an exhaustive channel archive.',
                'sourceImages': sum(len(i['panels']) for i in items),
                'atlas': {'file': 'fleet.webp', 'size': [2048, 2048], 'cellHeight': cell_h, 'padding': 2},
                'method': 'Original RGB panels, ordered bow to stern, column-wise rail/keel UV rectification, Lanczos downsampling. No generative redrawing or recoloring.',
                'identity': 'Experimental Cambodian artwork library. Never evidence of a Vietnamese team’s historical livery.',
                'rights': 'Mixed sources; uploading account is not proof of authorship or a commercial reuse licence.'}
    (out/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    sheet = Image.new('RGB', (1600, len(items)*80), '#f8f5ec')
    draw = ImageDraw.Draw(sheet)
    for i, item in enumerate(items):
        thumb = Image.open(out/item['thumbnail']).resize((1360, 64))
        sheet.paste(thumb, (240, i*80))
        draw.text((8, i*80+8), item['id'], fill='black')
    sheet.save(args.sources/'baked-library.jpg', quality=94)
    print(json.dumps({'boats': len(items), 'panels': manifest['sourceImages'],
                      'textureBytes': sum(i['bytes'] for i in items)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
