from pathlib import Path
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import RectangleObject
base=Path(__file__).parent
reader=PdfReader(base/'powerpoint-print-v5.2.pdf')
assert len(reader.pages)==18
writer=PdfWriter()
lengths=[]
for page in reader.pages:
    w,h=float(page.mediabox.width),float(page.mediabox.height)
    assert (w,h)==(792,612),(w,h)
    out_h=w*9/16
    margin=(h-out_h)/2
    page.add_transformation(Transformation().translate(0,-margin))
    page.mediabox=RectangleObject([0,0,w,out_h])
    page.cropbox=RectangleObject([0,0,w,out_h])
    writer.add_page(page)
    lengths.append(len(page.extract_text() or ''))
writer.add_metadata({'/Title':'Aethon IR | 2026-10-27','/Author':'RealizeSoft | 이성민','/Subject':'현재 구현과 향후 아키텍처를 구분한 IR 피칭 자료'})
out=base.parent/'output/Aethon-IR-20261027-v5.2.pdf'
with out.open('wb') as f: writer.write(f)
check=PdfReader(out)
assert len(check.pages)==18 and all(length>20 for length in lengths)
print('PDF_VERIFIED',len(check.pages),'pages','selectable_text',lengths,'bytes',out.stat().st_size)

