from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import cairosvg

ROOT = Path('C:/Users/jusan/Desktop/AethonP/artifacts/aethon-ir-v6/assets')
NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', 'http://www.w3.org/2000/svg')
fonts = {
    False: TTFont('C:/Windows/Fonts/malgun.ttf'),
    True: TTFont('C:/Windows/Fonts/malgunbd.ttf'),
}
for font in fonts.values():
    font.cmap_best = font.getBestCmap()

def convert(text):
    assert len(text) == 0, 'Unexpected nested text element'
    value = text.text or ''
    weight = int(text.get('font-weight', '400'))
    font = fonts[weight >= 600]
    glyphs = font.getGlyphSet()
    units = font['head'].unitsPerEm
    size = float(text.get('font-size', '16'))
    scale = size / units
    x = float(text.get('x', '0'))
    y = float(text.get('y', '0'))
    names = []
    for ch in value:
        if ord(ch) not in font.cmap_best:
            raise ValueError(f'No glyph for U+{ord(ch):04X} in {value!r}')
        names.append(font.cmap_best[ord(ch)])
    width = sum(font['hmtx'].metrics[g][0] * scale for g in names)
    anchor = text.get('text-anchor', 'start')
    if anchor == 'middle': x -= width / 2
    elif anchor == 'end': x -= width
    elif anchor != 'start': raise ValueError(anchor)
    group = ET.Element(NS + 'g', {'fill': text.get('fill', '#000')})
    if 'transform' in text.attrib: group.set('transform', text.get('transform'))
    for name in names:
        pen = SVGPathPen(glyphs)
        transformed = TransformPen(pen, (scale, 0, 0, -scale, x, y))
        glyphs[name].draw(transformed)
        d = pen.getCommands()
        if d: ET.SubElement(group, NS + 'path', {'d': d})
        x += font['hmtx'].metrics[name][0] * scale
    return group

for stem in ['aethon-overview-v6', 'aethon-model-lifecycle-v6', 'aethon-future-detail-v6']:
    tree = ET.parse(ROOT / (stem + '.svg'))
    root = tree.getroot()
    for parent in root.iter():
        for i, child in enumerate(list(parent)):
            if child.tag == NS + 'text':
                parent.remove(child)
                parent.insert(i, convert(child))
    assert not any(n.tag in (NS + 'text', NS + 'tspan') for n in root.iter())
    target = ROOT / (stem + '-outlined.svg')
    tree.write(target, encoding='utf-8', xml_declaration=False)
    cairosvg.svg2png(url=str(target), write_to=str(ROOT / (stem + '-outlined.png')),
                     output_width=1920, output_height=760)
    print(target.name, target.stat().st_size)
