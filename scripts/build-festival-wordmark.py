"""Outline the existing Khmer font once; no font or shaping library at runtime.

Optional authoring tools: fonttools, uharfbuzz. On this PC they are installed
under E:/AI/_Data/Tools/branding-python; pass --libraries for another location.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--libraries', default='E:/AI/_Data/Tools/branding-python')
args = parser.parse_args()
sys.path.insert(0, args.libraries)
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parent.parent
source = root / 'public/assets/illustrated-v22/NotoSansKhmer.ttf'
font = TTFont(source)
if 'fvar' in font:
    font = instantiateVariableFont(font, {'wght': 800}, inplace=True)
stream = io.BytesIO()
font.save(stream)
face = hb.Face(stream.getvalue())
shaper = hb.Font(face)
hb.ot_font_set_funcs(shaper)
shaper.scale = (face.upem, face.upem)
text = 'បុណ្យអុំទូក'
buffer = hb.Buffer()
buffer.add_str(text)
buffer.guess_segment_properties()
hb.shape(shaper, buffer)
glyphs, order = font.getGlyphSet(), font.getGlyphOrder()
placements = []
x = y = 0
bounds = BoundsPen(glyphs)
for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
    assert info.codepoint != 0, 'Missing Khmer glyph'
    glyph = order[info.codepoint]
    transform = (1, 0, 0, -1, x + position.x_offset, -y - position.y_offset)
    glyphs[glyph].draw(TransformPen(bounds, transform))
    placements.append((glyph, transform))
    x += position.x_advance
    y += position.y_advance
left, top, right, bottom = bounds.bounds
pen = SVGPathPen(glyphs, ntos=lambda value: format(round(value, 2), 'g'))
for glyph, transform in placements:
    a, b, c, d, e, f = transform
    glyphs[glyph].draw(TransformPen(pen, (a, b, c, d, e - left, f - top)))
mark = {'text': text, 'width': right-left, 'height': bottom-top,
        'path': pen.getCommands(), 'weight': 800,
        'fontSha256': hashlib.sha256(source.read_bytes()).hexdigest()}
destination = root / 'src/race/festival-wordmark.mjs'
destination.write_text('// Generated from the repo Noto Sans Khmer font using HarfBuzz shaping.\n'
                       'export const FESTIVAL_WORDMARK=' + json.dumps(mark, ensure_ascii=False,
                       separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'Outlined {text}: {len(placements)} shaped glyphs; {destination.stat().st_size} bytes')
