from pathlib import Path
import fitz
base=Path(__file__).parent
doc=fitz.open(base/'powerpoint-print.pdf')
print('pages',len(doc),'pagebox',doc[0].rect)
for idx in [0,9,15]:
    p=doc[idx]
    print(idx+1,'text',len(p.get_text()),'drawings',len(p.get_drawings()))
    print('large_rects',[str(d['rect']) for d in p.get_drawings() if d['rect'].width>p.rect.width*.7 and d['rect'].height>p.rect.height*.3][:8])
    p.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(base/f'pdf-original-{idx+1:02d}.png')
