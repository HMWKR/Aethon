from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import cairosvg

ROOT=Path(__file__).resolve().parent
INPUTS=ROOT/'build-inputs'
ICONS=INPUTS/'icon-assets-v3'
NS='http://www.w3.org/2000/svg'; S='{'+NS+'}'
ET.register_namespace('',NS)
fonts={False:TTFont('C:/Windows/Fonts/malgun.ttf'),True:TTFont('C:/Windows/Fonts/malgunbd.ttf')}
for f in fonts.values(): f.cmap_best=f.getBestCmap()
simple=ET.parse(INPUTS/'aethon-architecture-current-v3.svg').getroot()
simple_groups=[g for g in simple if g.tag.endswith('g') and 'transform' in g.attrib]
def element(parent,tag,**kw):return ET.SubElement(parent,S+tag,{k.replace('_','-'):str(v) for k,v in kw.items()})
def doc():
 r=ET.Element(S+'svg',{'width':'1920','height':'850','viewBox':'0 0 1920 850'})
 d=element(r,'defs')
 for name,color in [('a','#178c82'),('p','#8770aa')]:
  m=element(d,'marker',id=name,viewBox='0 0 10 10',refX=9,refY=5,markerWidth=7,markerHeight=7,orient='auto')
  element(m,'path',d='M0 0L10 5L0 10Z',fill=color)
 element(r,'rect',x=0,y=0,width=1920,height=850,fill='white')
 return r
def box(r,x,y,w,h,fill='#ffffff',stroke='#b9d8d1',rx=9): element(r,'rect',x=x,y=y,width=w,height=h,rx=rx,fill=fill,stroke=stroke,stroke_width=2)
def txt(r,x,y,s,size=30,bold=False,color='#213b3b'):
 t=element(r,'text',x=x,y=y,font_size=size,font_weight=700 if bold else 400,fill=color);t.text=s
def arrow(r,points,external=False):
 element(r,'polyline',points=' '.join(f'{x},{y}' for x,y in points),fill='none',stroke='#8770aa' if external else '#178c82',stroke_width=3,stroke_dasharray='9 6' if external else '0',marker_end='url(#p)' if external else 'url(#a)')
def icon(r,name,x,y,size=38):
 f=ET.parse(ICONS/name).getroot(); n=element(r,'svg',x=x,y=y,width=size,height=size,viewBox=f.attrib.get('viewBox','0 0 80 80'))
 for c in list(f):
  if not c.tag.endswith('title'): n.append(c)
def webicon(r,i,x,y,size=31):
 g=simple_groups[i];p=g.find(S+'path');n=element(r,'svg',x=x,y=y,width=size,height=size,viewBox='0 0 24 24')
 element(n,'path',d=p.attrib['d'],fill=g.attrib.get('fill','#38728a'))
def node(r,x,y,w,h,title,sub='',ic=None):
 box(r,x,y,w,h)
 if ic: icon(r,ic,x+w-43,y+10,32)
 txt(r,x+12,y+36,title,30,True)
 if sub: txt(r,x+12,y+h-14,sub,28,False,'#506c68')
def overview():
 r=doc()
 for yy,label in [(48,'현재 · 부분 구현 / 제한 시험'),(447,'향후 · 도입 검토 / 미구현')]:txt(r,30,yy,label,32,True,'#168a7f')
 for y in [66,465]:
  box(r,25,y,208,340,'#f9fbfb'); box(r,248,y,1257,340,'#f5fbf9','#96cfc1');box(r,1520,y,375,340,'#f7f9fc','#c3d3df')
  txt(r,39,y+38,'사용자',29,True);txt(r,263,y+38,'Aethon 플랫폼 · 로컬' if y==66 else 'AWS Cloud · 단계 도입',29,True);txt(r,1535,y+38,'외부 모델·서비스',29,True)
 # current principal flow
 node(r,44,185,171,100,'웹 작업대')
 for i in range(3):webicon(r,i,59+42*i,236)
 node(r,270,185,270,100,'기획·요청','Python HTTP')
 node(r,562,185,282,100,'생성 요청','승인 · 큐')
 node(r,866,185,282,100,'편집·검토','Take · FFmpeg')
 node(r,1170,185,310,100,'저장·전달','SQLite · 로컬 파일')
 for i,x in [(3,496),(4,1104),(5,1436)]:webicon(r,i,x,195,31)
 for x1,x2 in [(215,270),(540,562),(844,866),(1148,1170)]:arrow(r,[(x1,235),(x2,235)])
 node(r,1540,120,335,91,'Claude 대화','별도 주입 제한 시험')
 node(r,1540,250,335,91,'fal.ai 영상','기본 미연결')
 arrow(r,[(405,185),(405,150),(1510,150),(1510,165),(1540,165)],True)
 arrow(r,[(703,285),(703,305),(1510,305),(1510,295),(1540,295)],True)
 # future nested app area and state media below
 box(r,470,527,770,250,'#eaf7f2','#7cc4b1')
 txt(r,485,563,'VPC · 애플리케이션',29,True)
 node(r,44,616,171,95,'웹 사용자','브라우저')
 node(r,270,616,180,95,'웹 화면','Next.js 검토')
 node(r,490,585,230,98,'API · 기획','FastAPI 검토','Arch_Amazon-Elastic-Container-Service_64.svg')
 node(r,744,585,225,98,'생성 조율','승인 · 작업 상태')
 node(r,994,585,240,98,'检토·合성'.replace('检토','검토').replace('合성','합성'),'FFmpeg')
 node(r,1257,585,205,98,'저장·전달','S3 · CDN','Arch_Amazon-Simple-Storage-Service_64.svg')
 for x1,x2 in [(215,270),(450,490),(720,744),(969,994),(1234,1257)]:arrow(r,[(x1,664 if x1<490 else 634),(x2,664 if x1<490 else 634)])
 node(r,618,704,420,60,'PostgreSQL · 운영 상태','', 'Arch_Amazon-RDS_64.svg')
 arrow(r,[(605,683),(605,734),(618,734)])
 node(r,1540,520,335,91,'대화 모델','기획 · 도구 요청')
 node(r,1540,625,335,91,'RunPod · Wan','영상 추론 검토')
 node(r,1540,730,335,60,'Databricks · 분석','','Databricks-Logo-Icon.svg')
 arrow(r,[(857,585),(857,552),(1510,552),(1510,565),(1540,565)],True)
 arrow(r,[(900,683),(900,690),(1510,690),(1510,670),(1540,670)],True)
 arrow(r,[(1540,691),(1514,691),(1514,700),(1114,700),(1114,683)],True)
 arrow(r,[(1360,683),(1360,788),(1510,788),(1510,760),(1540,760)],True)
 return r
def lifecycle():
 r=doc();txt(r,35,50,'모델 고도화 · 연구 및 도입 검토',34,True,'#168a7f')
 box(r,30,125,320,515,'#f2faf7');txt(r,48,168,'권리 확인 데이터',33,True)
 for i,s in enumerate(['IP · 소재 사용권','기획 · 선택 기록','학습·평가셋 분리']):txt(r,48,235+i*62,s,30)
 icon(r,'Databricks-Logo-Icon.svg',48,537,44);txt(r,104,571,'Databricks 검토',30,True)
 for y,title,sub in [(115,'대화 모델','기획 · 도구 요청'),(295,'이미지 모델','캐릭터 · 스타일'),(475,'영상 모델','장면 · 움직임')]:
  node(r,435,y,465,140,title,sub)
 box(r,982,125,390,515,'#eaf8f3');txt(r,1002,168,'품질·비용·안전 평가',32,True)
 for i,s in enumerate(['기준 모델과 비교','사람의 선택 · 권리','조건 충족 시 승인']):txt(r,1002,240+i*62,s,30)
 box(r,1455,125,430,515,'#fff');txt(r,1477,168,'배포 · 관찰 · 복구',32,True)
 for i,s in enumerate(['모델 버전 관리','승인 후 추론 배포','이상 관찰 · 롤백']):txt(r,1477,240+i*62,s,30)
 txt(r,1477,570,'MLflow 레지스트리 검토',29,True,'#168a7f')
 for y in [185,365,545]:arrow(r,[(350,382),(390,382),(390,y),(435,y)])
 for y in [185,365,545]:arrow(r,[(900,y),(940,y),(940,382),(982,382)])
 arrow(r,[(1372,382),(1455,382)])
 txt(r,435,700,'미세조정 · 허용된 교사 기반 증류 검토',31,True,'#168a7f')
 txt(r,35,785,'권리 확보·평가가 전제이며 자체 모델 완성을 뜻하지 않습니다.',29,False,'#506c68')
 return r
def detail():
 r=doc()
 box(r,20,80,205,680,'#f9fbfb');txt(r,38,123,'사용자',31,True)
 box(r,242,35,1258,735,'#f8fcfa','#8ecfbe');txt(r,260,78,'AWS Cloud · 도입 검토',32,True)
 box(r,500,112,640,610,'#ebf8f4','#78c3b3');txt(r,518,154,'VPC · 애플리케이션',30,True)
 box(r,1520,80,375,680,'#f7f9fc','#c3d3df');txt(r,1538,123,'외부 모델 · 분석',30,True)
 node(r,38,340,170,105,'웹 사용자','브라우저')
 node(r,260,340,218,105,'전달','CloudFront','Arch_Amazon-CloudFront_64.svg')
 node(r,520,205,235,105,'서비스 API','ECS · Fargate','Arch_Amazon-Elastic-Container-Service_64.svg')
 node(r,785,205,230,105,'작업 조율','승인 · 상태')
 node(r,1170,205,285,105,'S3 미디어','결과 영상 · 최종본','Arch_Amazon-Simple-Storage-Service_64.svg')
 node(r,1170,455,285,105,'SQS · 알림','S3 Event 수신','Arch_Amazon-Simple-Queue-Service_64.svg')
 node(r,785,455,230,105,'검증','완료 조건')
 node(r,520,455,235,105,'PostgreSQL','장면 상태 기록','Arch_Amazon-RDS_64.svg')
 node(r,785,610,340,92,'합성 워커','FFmpeg','Arch_Amazon-Elastic-Container-Service_64.svg')
 node(r,1540,205,335,105,'대화 모델','기획 · 도구 요청')
 node(r,1540,345,335,105,'RunPod · Wan','영상 추론 검토')
 node(r,1540,600,335,105,'Databricks','허용 기록 분석','Databricks-Logo-Icon.svg')
 # Main chain: requests/API, GPU and media; event -> SQS -> verify -> DB -> FFmpeg -> S3 -> CDN
 arrow(r,[(208,392),(260,392)])
 arrow(r,[(260,420),(208,420)])
 arrow(r,[(478,392),(490,392),(490,257),(520,257)])
 arrow(r,[(755,257),(785,257)])
 arrow(r,[(1015,257),(1170,257)])
 arrow(r,[(900,205),(900,176),(1510,176),(1510,257),(1540,257)],True)
 arrow(r,[(900,310),(900,365),(1490,365),(1490,397),(1540,397)],True)
 arrow(r,[(1540,425),(1510,425),(1510,335),(1455,335),(1455,310)],True)
 arrow(r,[(1312,310),(1312,455)])
 arrow(r,[(1170,507),(1015,507)])
 arrow(r,[(785,507),(755,507)])
 arrow(r,[(637,560),(637,656),(785,656)])
 arrow(r,[(1125,656),(1150,656),(1150,300),(1170,300)])
 arrow(r,[(1170,235),(1150,235),(1150,179),(370,179),(370,340)])
 arrow(r,[(1455,270),(1505,270),(1505,650),(1540,650)],True)
 txt(r,37,705,'進捗'.replace('進捗','진행')+' 알림 검토',28,False,'#506c68')
 txt(r,265,818,'장면 업로드만 알림 · 최종본 이벤트 제외',28,False,'#506c68')
 return r
def outline(root):
 for parent in root.iter():
  for i,t in enumerate(list(parent)):
   if t.tag!=S+'text':continue
   assert not len(t)
   f=fonts[int(t.get('font-weight','400'))>=600];gs=f.getGlyphSet();sc=float(t.get('font-size'))/f['head'].unitsPerEm;x=float(t.get('x'));y=float(t.get('y'));g=ET.Element(S+'g',{'fill':t.get('fill','#000')})
   for ch in t.text or '':
    if ord(ch) not in f.cmap_best:raise ValueError(f'font missing {ch!r}')
    name=f.cmap_best[ord(ch)];p=SVGPathPen(gs);gs[name].draw(TransformPen(p,(sc,0,0,-sc,x,y)));d=p.getCommands()
    if d:element(g,'path',d=d)
    x+=f['hmtx'].metrics[name][0]*sc
   parent.remove(t);parent.insert(i,g)
 return root
ROOT.mkdir(parents=True,exist_ok=True)
for stem,func in [('architecture-overview',overview),('architecture-lifecycle',lifecycle),('architecture-aws-detail',detail)]:
 root=func();ET.ElementTree(root).write(ROOT/(stem+'.svg'),encoding='utf-8')
 root=outline(root);assert not any(x.tag in [S+'text',S+'tspan'] for x in root.iter())
 out=ROOT/(stem+'-outlined.svg');ET.ElementTree(root).write(out,encoding='utf-8')
 assert out.stat().st_size<1048576
 cairosvg.svg2png(url=str(out),write_to=str(ROOT/(stem+'-outlined.png')),output_width=1920,output_height=850)
 print(out.name,out.stat().st_size)
