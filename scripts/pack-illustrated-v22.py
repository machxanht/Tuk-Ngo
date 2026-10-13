"""Encode runtime WebP files losslessly, retaining the original downloadable PNGs."""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib, json

root = Path(__file__).resolve().parents[1] / 'public/assets/illustrated-v22'
report = []
for source in sorted(root.glob('*.png')):
    if source.name == 'approved-concept.png':
        continue
    image = Image.open(source)
    target = source.with_suffix('.webp')
    if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
        image.save(target, format='WEBP', lossless=True, quality=85, method=6, exact=True)
    decoded = Image.open(target).convert(image.mode)
    assert ImageChops.difference(image, decoded).getbbox() is None, source.name
    # Compare all RGBA channels, including hidden RGB under zero alpha.
    assert image.tobytes() == decoded.tobytes(), source.name
    report.append({'source': source.name, 'runtime': target.name, 'source_bytes': source.stat().st_size,
                   'runtime_bytes': target.stat().st_size, 'decoded_pixels_identical': True,
                   'runtime_sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
(root / 'runtime-images.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'files': len(report), 'png_bytes': sum(v['source_bytes'] for v in report),
                  'webp_bytes': sum(v['runtime_bytes'] for v in report), 'all_pixels_identical': True}))
