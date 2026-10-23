"""Prepare portable textures from the official Snow archive and shared race shirt."""
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT.parent / 'tools/asset-cache/character-comparison'
source = CACHE / 'f/Snow/textures'
output = CACHE / 'textures'
output.mkdir(parents=True, exist_ok=True)

# Preserve the original three UDIM tiles; the exporter maps U / 3 into this atlas.
atlas = Image.new('RGB', (3072, 1024))
for i, tile in enumerate([1001, 1002, 1003]):
    image = Image.open(source / f'skin_diffuse.{tile}.png').convert('RGB')
    image = image.resize((1024, 1024), Image.Resampling.LANCZOS)
    atlas.paste(image, (i * 1024, 0))
atlas.save(output / 'snow-skin.jpg', quality=94)
for name in ['hair_diffuse', 'eyes_diffuse', 'shirt_normal']:
    image = Image.open(source / (name + '.png')).convert('RGB')
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    image.save(output / (name + '.jpg'), quality=94)
shutil.copyfile(ROOT / 'art/character-comparison/jersey.png', output / 'jersey.png')
print('Prepared original Snow texture atlas and shared race jersey')
