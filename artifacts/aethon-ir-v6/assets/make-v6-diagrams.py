from pathlib import Path
import json, re, html, copy
import xml.etree.ElementTree as ET
from PIL import ImageFont
import cairosvg

ROOT=Path('C:/Users/jusan/Desktop/AethonP/artifacts/aethon-ir-v6/assets')
SRC=Path('C:/Users/jusan/.codex/visualizations/2026/10/27/01a17c71-00c0-7b42-be8c-167feaa93918')
SPEC=json.loads((SRC/'v5-architecture-spec.json').read_text(encoding='utf-8'))
SIMPLE=ET.parse(SRC/'aethon-architecture-current-v3.svg').getroot()
FUTURE=ET.parse(SRC/'aethon-architecture-future-v3.svg').getroot()
NAMESPACE='{http://www.w3.org/2000/svg}'
FONT='C:/Windows/Fonts/malgun.ttf'
fontcache={}
def getfont(size):
    size=max(1,int(size))
    if size not in fontcache: fontcache[size]=ImageFont.truetype(FONT,size)
    return fontcache[size]
def fit(s,size,width,minimum=17):
    while size>minimum and getfont(size).getlength(s)>width:size-=1
    return size
def start():
    return ['<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="760" viewBox="0 0 1920 760">',
      '<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#198b83"/></marker><marker id="p" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#8072a1"/></marker></defs>',
      '<rect x="0" y="0" width="1920" height="760" fill="#fff"/>']
def box(o,x,y,w,h,fill='white',stroke='#b9d4d0',radius=8,sw=1.6):
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
def txt(o,x,y,t,fs=22,color='#1d3033',bold=False):
    o.append(f'<text x="{x}" y="{y}" font-size="{fs}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(t)}</text>')
def simple_icon(o,source,index,x,y,size=28):
    root=SIMPLE if source=='now' else FUTURE
    groups=[g for g in root if g.tag.endswith('g') and 'transform' in g.attrib]
    g=groups[index]; p=g.find(NAMESPACE+'path')
    d=html.escape(p.attrib['d'],quote=True);color=g.attrib.get('fill','#386c85')
    o.append(f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 24 24"><path fill="{color}" d="{d}"/></svg>')
def official_icon(o,name,x,y,size=28):
    root=ET.parse(SRC/'icon-assets-v3'/name).getroot()
    # Assets used here have no external references or gradient IDs.
    for item in root.iter():
        item.attrib.pop('id',None)
        for k in list(item.attrib):
            if 'font-family' in k or 'href' in k:del item.attrib[k]
    inner=''.join(ET.tostring(c,encoding='unicode') for c in root if not c.tag.endswith('title'))
    inner=inner.replace('ns0:','').replace(':ns0','')
    vb=root.attrib.get('viewBox','0 0 80 80')
    o.append(f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{vb}">{inner}</svg>')
def icon_for(o,id,x,y,size):
    mapping={
      'ov-now-api':('simple','now',3),'ov-now-render':('simple','now',4),'ov-now-db':('simple','now',5),
      'ov-next-db':('simple','future',4),'ov-next-media':('aws','Arch_Amazon-Simple-Storage-Service_64.svg'),
      'ov-next-dbx':('aws','Databricks-Logo-Icon.svg'),'dt-cdn':('aws','Arch_Amazon-CloudFront_64.svg'),
      'dt-api':('aws','Arch_Amazon-Elastic-Container-Service_64.svg'),'dt-pg':('aws','Arch_Amazon-RDS_64.svg'),
      'dt-worker':('aws','Arch_Amazon-Elastic-Container-Service_64.svg'),'dt-s3':('aws','Arch_Amazon-Simple-Storage-Service_64.svg'),
      'dt-databricks':('aws','Databricks-Logo-Icon.svg')}
    if id not in mapping:return False
    m=mapping[id]
    if m[0]=='simple':simple_icon(o,m[1],m[2],x,y,size)
    else:official_icon(o,m[1],x,y,size)
    return True
def connector(o,e):
    roles={'control':('#2a9b8e',False),'storage':('#448c7e',False),'external':('#8072a1',True),'event':('#81979c',True)}
    color,dash=roles[e['role']]
    pts=' '.join(f'{x},{y}' for x,y in e['waypoints'])
    mk='p' if e['role']=='external' else 'a'
    o.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.2"'+(' stroke-dasharray="8 6"' if dash else '')+f' marker-end="url(#{mk})"/>')
def group(o,g):
    colors={'userBoundary':('#f9fbfb','#c5d9d5'),'platformBoundary':('#f7fcfa','#acd9ce'),'cloudBoundary':('#f9fcfb','#9bcfc0'),'vpcBoundary':('#edf8f5','#7ec6b7'),'externalBoundary':('#f7f9fc','#c6d5df')}
    fill,stroke=colors[g['role']]
    box(o,g['x'],g['y'],g['w'],g['h'],fill,stroke,9,1.7)
    txt(o,g['x']+12,g['y']+27,g['label'],min(21,g['fontSize']),'#284d4a',True)
def node(o,c):
    x,y,w,h=(c[k] for k in ('x','y','w','h'))
    box(o,x,y,w,h,'#fff','#b9d5d1',7,1.5)
    name=c['id'];label=c['label'];sub=c.get('subLabel')
    if name=='ov-next-cpu':label='검증·승인';sub='FFmpeg 합성'
    if name=='ov-now-render':sub='Take · FFmpeg · FFprobe'
    if name=='dt-verify':sub='S3 Event → SQS'
    if name=='ov-now-web':
        txt(o,x+10,y+25,'웹 작업대',20,bold=True)
        for i in range(3):simple_icon(o,'now',i,x+12+i*34,y+42,25)
        return
    if h<=60:
        has_icon=icon_for(o,name,x+9,y+(h-27)/2,27)
        tx=x+(43 if has_icon else 11); f=fit(label,21,w-(tx-x)-8,18)
        txt(o,tx,y+h/2+7,label,f,bold=True);return
    # Preserve text width: use role icon in the upper-right, not as a long wordmark.
    has_icon=icon_for(o,name,x+w-35,y+10,25)
    tw=w-22-(30 if has_icon else 0)
    size=fit(label,min(23,c.get('fontSize',22)),tw,17)
    txt(o,x+10,y+29,label,size,bold=True)
    if sub:
        size=fit(sub,19,w-20,17)
        txt(o,x+10,y+h-14,sub,size,'#526e6a')
def from_spec(kind):
    slide=next(s for s in SPEC['slides'] if s['id']==kind)
    o=start()
    # Crop the 1600×900 reference to its body, preserving aspect and arrows.
    if kind=='overview':o.append('<g transform="translate(65 -173) scale(1.17)">')
    else:o.append('<g transform="translate(92 -156) scale(1.10)">')
    if kind=='overview':
        txt(o,36,178,'현재 · 부분 구현 / 제한 시험',23,'#168a7f',True)
        txt(o,36,498,'향후 · 도입 검토 / 미구현',23,'#168a7f',True)
    for g in slide['groups']:group(o,g)
    for e in slide['edges']:connector(o,e)
    if kind=='overview':
        connector(o,{'role':'external','waypoints':[[1206,684],[1160,684],[1160,727],[1000,727],[1000,670],[983,670]]})
    for c in slide['components']:node(o,c)
    if kind=='overview':txt(o,1013,768,'허용 기록만',17,'#5b7773')
    if kind=='future-detail':
        txt(o,50,682,'SSE 또는',17,'#5b7773')
        txt(o,50,706,'WebSocket 검토',17,'#5b7773')
        txt(o,1222,718,'허용 기록만',17,'#5b7773')
        txt(o,778,527,'검증·승인 후 합성',17,'#168a7f',True)
    o.append('</g></svg>')
    return ''.join(o)

def lifecycle():
    o=start()
    txt(o,30,42,'모델 고도화 · 연구 및 도입 검토',26,'#168a7f',True)
    box(o,30,100,330,480,'#f3faf7','#add8ca',10)
    txt(o,54,146,'허용 데이터',29,bold=True)
    for i,line in enumerate(['IP·소재 권리','선택·수정 기록','학습·평가셋 분리']):txt(o,54,220+i*42,line,25)
    official_icon(o,'Databricks-Logo-Icon.svg',55,470,42);txt(o,108,499,'Databricks 검토',22,bold=True)
    for y,title,sub in [(92,'기획용 언어 모델','기획 · 도구 사용 · 일관성'),(258,'이미지 모델','캐릭터 · 스타일 유지'),(424,'영상 모델','장면 품질 · 움직임 · 연결')]:
        box(o,430,y,530,125,'#fff','#b9d5d1',9)
        txt(o,456,y+43,title,27,bold=True);txt(o,456,y+89,sub,22,'#526e6a')
    box(o,1035,100,300,480,'#eaf8f3','#a9d6c9',10)
    txt(o,1058,146,'평가',29,bold=True)
    for i,line in enumerate(['기준 대비 품질','비용 · 안전 · 권리','사람의 채택']):txt(o,1058,220+i*42,line,24)
    box(o,1405,100,475,480,'#fff','#b9d5d1',10)
    txt(o,1430,146,'운영',29,bold=True)
    for i,line in enumerate(['모델 버전 등록','승인 후 배포','관찰 · 이전 버전 복구']):txt(o,1430,220+i*42,line,24)
    txt(o,1430,500,'MLflow 검토',23,'#168a7f',True)
    for d in ['M360 340H395V155H430','M360 340H430','M360 340H395V487H430',
              'M960 155H995V340H1035','M960 340H1035','M960 487H995V340H1035',
              'M1335 340H1405']:
        o.append(f'<path d="{d}" fill="none" stroke="#198b83" stroke-width="2.5" marker-end="url(#a)"/>')
    txt(o,430,630,'미세조정 · 조건부 증류 검토',25,'#168a7f',True)
    txt(o,30,708,'사용 권리가 확인된 데이터와 교사 모델을 선택하며, 자체 모델 완성을 뜻하지 않습니다.',22,'#526e6a')
    o.append('</svg>');return ''.join(o)

outputs={'aethon-overview-v6.svg':from_spec('overview'),'aethon-future-detail-v6.svg':from_spec('future-detail'),'aethon-model-lifecycle-v6.svg':lifecycle()}
ROOT.mkdir(parents=True,exist_ok=True)
for name,s in outputs.items():
    assert len(s.encode('utf-8'))<1024*1024
    for forbidden in ['font-family','<!DOCTYPE','<script','http://', 'https://','href=']:
        check=s.replace('http://www.w3.org/2000/svg','')
        assert forbidden not in check,(name,forbidden)
    ET.fromstring(s)
    (ROOT/name).write_text(s,encoding='utf-8')
    # A temporary font substitution is used only for the raster preview; the delivered SVG contains no font-family.
    preview=s.replace('<svg xmlns=', '<svg style="font-family: Malgun Gothic" xmlns=',1)
    cairosvg.svg2png(bytestring=preview.encode('utf-8'),write_to=str(ROOT/(Path(name).stem+'.png')),output_width=1920,output_height=760)
    print(name,len(s.encode('utf-8')))
