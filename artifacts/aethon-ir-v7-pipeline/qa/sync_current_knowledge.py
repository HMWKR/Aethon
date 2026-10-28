"""Sync confirmed IR context; leaves historical deliverables untouched."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
bpath = root / 'docs/knowledge/business-plan/ontology.json'
ppath = root / 'docs/knowledge/presentation/ontology.json'
b = json.loads(bpath.read_text(encoding='utf-8-sig'))
p = json.loads(ppath.read_text(encoding='utf-8-sig'))

def put(seq, item, key='id'):
    for i, old in enumerate(seq):
        if old[key] == item[key]:
            seq[i] = item
            return
    seq.append(item)

def edge(seq, source, relation, target):
    item = {'from': source, 'type': relation, 'to': target}
    if item not in seq:
        seq.append(item)

def concept(ident, typ, title, cls, verification, desc, limit):
    put(b['concepts'], dict(id=ident,type=typ,title=title,classification=cls,
        verification=verification,description=desc,limit=limit))

def claim(ident,title,status,limit,bid,sid):
    put(p['entities'],dict(id=ident,type='Claim',title=title,status=status,qualification=limit))
    edge(p['relations'],ident,'supported_by',sid)
    ref=dict(local_id=ident,ontology='docs/knowledge/business-plan/ontology.json',target_id=bid,relation='same_topic')
    if ref not in p['external_references']:
        p['external_references'].append(ref)

user_limit='현재 대화의 본인 확인 기록이며 증명서 대조·외부 고객 검증을 뜻하지 않는다.'
put(b['sources'],dict(id='BP-SRC-012',kind='user_confirmation',title='대표 경력·자격·1인 진행·초기 타깃·LAM·사업 단계 확인',path=None,
    locator='현재 대화: 현직 데이터 엔지니어, 프로페셔널 자격 정정, 1인 진행, 아이돌 MV 타깃 및 LAM 답변; 2026-10-28 정리',limit=user_limit))
for ident,title,path in [
    ('BP-SRC-013','대표자·팀 정보','docs/knowledge/business-plan/FOUNDER-PROFILE.md'),
    ('BP-SRC-014','TAM·SAM·SOM·LAM 시장 범위','docs/knowledge/business-plan/MARKET-SCOPE.md'),
    ('BP-SRC-015','현재·향후 아키텍처와 보존 그림','docs/knowledge/presentation/ARCHITECTURE.md')]:
    put(b['sources'],dict(id=ident,kind='project_document',title=title,path=path,locator='전체; 기준일 2026-10-28',limit='본인 확인·문서화된 조사·향후 제안을 구분하며 운영 완성이나 외부 검증을 보증하지 않는다.'))

concept('BP-FACT-006','founder_profile','본인 확인에 따른 대표자 소개 기준','decision','user_confirmed',
 '이성민, RealizeSoft(현실화하는소프트) 대표, 경복대학교 소프트웨어융합학과. 현직 데이터 엔지니어이며 한화 포탈 데이터 엔지니어링 경험이 있다. Databricks 데이터 엔지니어 프로페셔널, 국가공인 네트워크관리사 2급, AI프러덕션 기획자 1급 보유라는 본인 표기로 소개한다. 현재 프로젝트는 대표 1인이 진행한다.',
 '증명서 대조 전 본인 확인 정보. 재학·졸업 여부, 현 고용 회사, 한화 직접 고용, 법인 설립, 자격 공식 영문명·발급기관·유효기간을 추정하지 않는다. 수상은 별도 과거 팀 이력이다.')
concept('BP-FACT-007','launch_market_definition','아이돌 MV 제작팀을 LAM으로 정한 초기 공략 범위','decision','user_confirmed',
 'TAM은 글로벌 MV 제작 소프트웨어, SAM은 국내 제공 가능 영역, SOM은 접근·판매·지원 가능한 국내 제작 조직, LAM은 출시 초기 소규모 아이돌 기획사·지하/라이브·버추얼 아이돌 MV 제작팀으로 정의한다. LAM은 Launch Addressable Market이다. 개인 VTuber 일반은 초기 타깃에서 제외한다.',
 '타깃 선택과 수요 검증은 다르다. 네 단계 금액·조직 수·지출 및 기간은 미산정이며 LAM을 보편 표준 약어로 주장하지 않는다.')
concept('BP-FACT-008','reported_business_stage','본인 확인된 1인 개발 및 고객 검증 전 상태','decision','user_confirmed',
 '현재 대표 1인이 개발하며 고객 인터뷰·시험 고객·매출은 없다는 본인 확인을 발표 기준으로 사용한다. 채용 시점·인원·확보 예산은 미정이다.',
 '외부 회계 검증이 아니며 가입자 수 등 미제공 지표까지 0으로 확장하지 않는다. 내부 출력 시험은 고객 성과가 아니다.')
concept('BP-FACT-009','documented_architecture','기존 코드 조사와 제한 시험의 현재 구성','evidence','source_documented',
 '2026-10-27 코드 조사와 10월 28일 발표 정리에서 HTML/CSS/JavaScript, Python HTTP, SQLite·로컬 파일, FFmpeg/FFprobe 및 자체 작업 조율 경로를 확인했다. Claude 대화 어댑터는 별도 주입 제한 시험, fal 영상 어댑터는 기본 미연결·실제 생성 미검증으로 구분한다.',
 '이번 문서 갱신에서 코드를 다시 실행하거나 외부 모델 운영을 입증하지 않았다. 현재 코드 변동 여부는 제품 작업 시 재확인한다.')
concept('BP-HYP-005','architecture_proposal','AWS·PostgreSQL·Databricks와 모델 고도화 후보','hypothesis','unverified',
 'Next.js·FastAPI, PostgreSQL, AWS S3·CloudFront·SQS·ECS/Fargate, RunPod/Wan 추론 및 Databricks 분석을 후보로 검토한다. 대화·이미지·영상 모델은 허용된 데이터와 조건에서 미세조정·증류 및 평가를 연구하는 방향이다.',
 '현재 도입·학습·상용 운영 성과가 아니다. 모든 서비스의 동시 도입, 특정 교사 모델의 사용 권리, 비용·품질 효과는 미확정이다.')
concept('BP-HYP-006','customer_segment','초기 아이돌 MV 제작팀의 구매·사용 가설','hypothesis','unverified',
 '소규모 아이돌 기획사·지하/라이브·버추얼 아이돌 제작 운영팀의 기획·자료 전달·수정·승인과 반복 작업이 초기 조사 대상이다. 구매자는 기획사 대표나 제작 책임자, 사용자는 콘텐츠 담당자나 외부 제작자일 수 있다.',
 '역할, 반복 빈도, 문제 크기, 예산과 지불 의향은 인터뷰 전 가설이다. 초기 타깃 선택은 BP-FACT-007, 시장 금액은 BP-UNKNOWN-002와 구분한다.')
for cid,sids in {
 'BP-FACT-006':['BP-SRC-012','BP-SRC-013'], 'BP-FACT-007':['BP-SRC-012','BP-SRC-014'],
 'BP-FACT-008':['BP-SRC-012','BP-SRC-013'], 'BP-FACT-009':['BP-SRC-015'],
 'BP-HYP-005':['BP-SRC-015'], 'BP-HYP-006':['BP-SRC-014']}.items():
    for sid in sids: edge(b['relations'],cid,'supported_by',sid)
edge(b['relations'],'BP-HYP-006','depends_on','BP-FACT-007')
for c in b['concepts']:
    if c['id']=='BP-HYP-002':
        c['title']='이전 검토한 반복 제작 고객군'
        c['limit']='과거 후보 기록. 2026-10-28 최신 타깃 결정은 BP-FACT-007, 수요 가설은 BP-HYP-006을 따른다. 개인 VTuber 일반은 현재 LAM이 아니다.'
    if c['id']=='BP-UNKNOWN-005':
        c['description']='대표 신원과 1인 진행은 BP-FACT-006/008에 본인 확인으로 기록했다. 법적 주체·등록, IP와 자료 권리, 투입 시간, 채용 조건 및 가용 자금은 별도 확인이 필요하다.'
    if c['id']=='BP-UNKNOWN-001':
        c['description']='BP-FACT-008에 본인 확인한 고객 인터뷰·시험 고객·매출 없음 상태를 기록했다. 고객 모집단, 반복 결제 검증, 과거 사업 실적의 관련성은 별도 확인 대상이다.'
for r in b['relations']:
    if r['from']=='BP-EXP-002' and r['to']=='BP-HYP-002': r['to']='BP-HYP-006'
for section in b['plan_sections']:
    section['inputs']=['BP-HYP-006' if i=='BP-HYP-002' else i for i in section['inputs']]
    if section['id'] in ['BP-SEC-002','BP-SEC-005']:
        for cid in ['BP-FACT-007','BP-FACT-008']:
            if cid not in section['inputs']: section['inputs'].append(cid)
    if section['id']=='BP-SEC-004':
        for cid in ['BP-FACT-009','BP-HYP-005']:
            if cid not in section['inputs']: section['inputs'].append(cid)
put(b['plan_sections'],dict(id='BP-SEC-008',title='대표자·팀과 자원',inputs=['BP-FACT-006','BP-FACT-008','BP-UNKNOWN-005'],
    writing_goal='본인이 확인한 대표 경력·자격·1인 진행과 과거 팀 수상을 구분하고 법인·권리·채용·자금의 남은 공백을 명시한다.'))

for ident,title,path in [
 ('PPT-SRC-005','대표자·팀 정보','docs/knowledge/business-plan/FOUNDER-PROFILE.md'),
 ('PPT-SRC-006','시장 4단계 최신 범위','docs/knowledge/business-plan/MARKET-SCOPE.md'),
 ('PPT-SRC-007','현재·향후 아키텍처 설명','docs/knowledge/presentation/ARCHITECTURE.md'),
 ('PPT-SRC-008','현재·향후 구조 SVG 원본','docs/knowledge/presentation/assets/architecture-overview.svg'),
 ('PPT-SRC-009','모델 고도화 SVG 원본','docs/knowledge/presentation/assets/architecture-lifecycle.svg'),
 ('PPT-SRC-010','AWS 상세 구조 SVG 원본','docs/knowledge/presentation/assets/architecture-aws-detail.svg')]:
    put(p['sources'],dict(id=ident,type='Source',title=title,path=path,locator='전체; 2026-10-28 기준',limitation='현재 확인 범위와 향후 제안을 구분한다. 외부 운영·학습 성공 또는 시장 수요 검증이 아니다.'))
claim('PPT-CLAIM-007','현직 데이터 엔지니어인 이성민 대표의 본인 확인 경력·자격과 1인 진행','documented_decision','FOUNDER-PROFILE의 본인 표기와 확인 한계를 따른다. 과거 팀 수상은 현 제품 성과와 분리한다.','BP-FACT-006','PPT-SRC-005')
claim('PPT-CLAIM-008','TAM·SAM·SOM·LAM과 아이돌 MV 제작팀 초기 공략 범위','documented_decision','시장 금액과 고객 수는 미산정, 개인 VTuber 일반 제외. LAM은 사용자 정의 출시 초기 공략 시장이다.','BP-FACT-007','PPT-SRC-006')
claim('PPT-CLAIM-009','1인 개발 중이며 고객 인터뷰·시험 고객·매출 없음이라는 본인 확인','documented_decision','고객 성과와 제한된 내부 시험을 구분한다.','BP-FACT-008','PPT-SRC-005')
claim('PPT-CLAIM-010','현재 코드 조사·제한 시험으로 설명할 아키텍처 범위','reported_test','기존 조사 시점의 문서상 구성이다. Claude 제한 시험과 fal 미연결·미검증을 함께 표시한다.','BP-FACT-009','PPT-SRC-007')
claim('PPT-CLAIM-011','AWS·PostgreSQL·Databricks·자체 모델 고도화 제안','hypothesis','미구현·도입 검토. 데이터·모델 권리, 비용과 품질 조건을 확인한다.','BP-HYP-005','PPT-SRC-007')
claim('PPT-CLAIM-012','아이돌 MV 제작팀의 구매·사용 역할과 반복 작업은 검증할 가설','hypothesis','타깃을 정했다는 사실과 실제 유료 수요는 다르다.','BP-HYP-006','PPT-SRC-006')
for e in p['entities']:
    if e['id']=='PPT-CLAIM-006':
        e['title']='이전 검토 고객군: 소규모 레이블·제작팀·개인 VTuber'
        e['qualification']='과거 가설 기록. 최신 타깃과 수요 가설은 PPT-CLAIM-008/012를 따른다. 개인 VTuber 일반은 현재 LAM에서 제외한다.'
for r in p['relations']:
    if r['type']=='uses_claim' and r['to']=='PPT-CLAIM-006': r['to']='PPT-CLAIM-012'
for slid,cid in [('PPT-SLIDE-002','PPT-CLAIM-008'),('PPT-SLIDE-006','PPT-CLAIM-008'),('PPT-SLIDE-004','PPT-CLAIM-009')]:
    edge(p['relations'],slid,'uses_claim',cid)
for ident,title,cids in [
 ('PPT-SLIDE-010','대표자·팀과 자원',['PPT-CLAIM-007','PPT-CLAIM-009']),
 ('PPT-SLIDE-011','현재·향후 시스템 아키텍처',['PPT-CLAIM-010','PPT-CLAIM-011'])]:
    put(p['entities'],dict(id=ident,type='Slide',title=title,status='proposed',constraint='현재 v7의 실제 장 번호와 안정 ID는 다르며 CURRENT-IR의 장별 대응을 따른다.'))
    for cid in cids: edge(p['relations'],ident,'uses_claim',cid)
    if ident not in p['deck_outline']: p['deck_outline'].append(ident)
for sid,cid in [('PPT-SRC-008','PPT-CLAIM-010'),('PPT-SRC-008','PPT-CLAIM-011'),('PPT-SRC-009','PPT-CLAIM-011'),('PPT-SRC-010','PPT-CLAIM-011')]:
    edge(p['relations'],cid,'supported_by',sid)
b['updated_at']=p['updated_at']='2026-10-28'
for path,data in [(bpath,b),(ppath,p)]:
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Updated business and presentation knowledge, retaining historical IDs.')
