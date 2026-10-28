from pathlib import Path
import hashlib
import json
import re
from decimal import Decimal

ROOT = Path(__file__).resolve().parents[3]
bp_path = ROOT / 'docs/knowledge/business-plan/ontology.json'
bp = json.loads(bp_path.read_text(encoding='utf-8-sig'))
sources = [
    {'id': 'BP-SRC-016', 'kind': 'external_primary_source', 'title': 'fal Kling v2.5 Turbo Pro 이미지→영상 공개 단가', 'url': 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video', 'checked_at': '2026-10-28', 'locator': 'Pricing: 5 seconds $0.35; additional second $0.07', 'limit': '공개 API 단가이며 실제 Aethon 청구·전체 MV 원가·동등 품질을 보증하지 않는다.'},
    {'id': 'BP-SRC-017', 'kind': 'project_document', 'title': '사업계획 비용 근거·단위경제 검토', 'path': 'artifacts/aethon-business-plan-20261028/research/cost-check.md', 'locator': '2026-10-28 공식 단가 및 계산 조건 재확인', 'limit': '공개 단가와 계산 가정을 기록하며 실제 원가나 절감률 시험은 아니다.'},
    {'id': 'BP-SRC-018', 'kind': 'external_primary_source', 'title': 'NEKIRU 공식 아티스트 소개', 'url': 'https://www.nekiru.net/en', 'checked_at': '2026-10-28', 'locator': 'About: released over 17 singles since November 2020', 'limit': '단일 아티스트의 누적 싱글 발매 사례이며 MV 수·연간 빈도·전체 고객군 평균이 아니다.'},
    {'id': 'BP-SRC-019', 'kind': 'project_document', 'title': '초기 타깃 시장 근거 재확인', 'path': 'artifacts/aethon-business-plan-20261028/research/market-check.md', 'locator': '2026-10-28 공식 자료 4건 재확인', 'limit': '공개 사례와 통계의 범위를 확인한 자료이며 Aethon 구매 의향·시장 금액·고객 실적의 증거가 아니다.'},
]
concepts = [
    {'id': 'BP-DATA-009', 'type': 'external_quantitative_indicator', 'title': 'fal Kling v2.5 Turbo Pro 5초 생성 공개 단가', 'classification': 'evidence', 'verification': 'source_documented', 'value': 0.35, 'unit': 'USD per 5-second generation request, excluding additional costs', 'period': '2026-10-28', 'checked_at': '2026-10-28', 'description': '이미지→영상 API 5초 요청 0.35달러. 60컷 × 총 유료 요청 배수 1/2/3의 API 소계는 21/42/63달러라는 가정 계산에 사용한다.', 'limit': '입력 이미지·대화 모델·편집·저장·전송·인건비·권리·세금 등 제외. 실제 채택·실패 과금·납품·완성 MV 원가·실측 절감률이 아니다.'},
    {'id': 'BP-DATA-010', 'type': 'external_quantitative_indicator', 'title': 'NEKIRU 누적 싱글 발매 공개 사례', 'classification': 'evidence', 'verification': 'source_documented', 'value': 17, 'unit': 'singles, greater than', 'period': 'since November 2020; observed 2026-10-28', 'checked_at': '2026-10-28', 'description': '공식 소개의 싱글 17곡 초과 누적 발매. 한 아티스트에서 반복 음원 발매가 관찰되는 사례다.', 'limit': 'MV 편수·연간 발매량·전체 시장 평균이 아니며 Aethon의 고객·구매 의향이나 반복 사용을 입증하지 않는다.'},
]

def upsert(items, entry):
    for index, item in enumerate(items):
        if item['id'] == entry['id']:
            items[index] = entry
            return
    items.append(entry)

for entry in sources:
    upsert(bp['sources'], entry)
for entry in concepts:
    upsert(bp['concepts'], entry)
for subject, source_ids in [('BP-DATA-009', ['BP-SRC-016', 'BP-SRC-017']), ('BP-DATA-010', ['BP-SRC-018', 'BP-SRC-019'])]:
    for source_id in source_ids:
        relation = {'from': subject, 'type': 'supported_by', 'to': source_id}
        if relation not in bp['relations']:
            bp['relations'].append(relation)
for section in bp['plan_sections']:
    additions = {'BP-SEC-005': ['BP-DATA-010'], 'BP-SEC-006': ['BP-DATA-009']}.get(section['id'], [])
    section['inputs'].extend(x for x in additions if x not in section['inputs'])
for source in sources:
    if source.get('path') and source['path'] not in bp['research_documents']:
        bp['research_documents'].append(source['path'])
bp_path.write_text(json.dumps(bp, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

doc = ROOT / 'docs/knowledge/business-plan/BUSINESS-PLAN.md'
body = doc.read_text(encoding='utf-8-sig')
headings = re.findall(r'^## (\d+) ', body, flags=re.M)
assert headings == [str(i) for i in range(1, 17)], headings
images = re.findall(r'!\[[^\]]*\]\(([^)]+)\)', body)
assert len(images) == 3
missing = []
local_count = 0
for link in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', body):
    if re.match(r'https?://|mailto:|#', link):
        continue
    target = (doc.parent / link.split('#')[0]).resolve()
    local_count += 1
    if not target.is_file():
        missing.append(str(target))
assert not missing, missing
ids = {item['id'] for key in ('sources', 'concepts', 'plan_sections') for item in bp[key]}
assert not (set(re.findall(r'BP-[A-Z]+-\d{3}', body)) - ids)
totals = [Decimal(60) * Decimal(str(r)) * Decimal('0.35') for r in (1, 2, 3)]
assert totals == [Decimal('21'), Decimal('42'), Decimal('63')]
result = {'sections': len(headings), 'architecture_images': len(images), 'local_link_references': local_count, 'missing_local_links': 0, 'cost_scenarios_usd': [str(n) for n in totals], 'manuscript_sha256': hashlib.sha256(doc.read_bytes()).hexdigest(), 'architecture_sha256': {path: hashlib.sha256((doc.parent / path).read_bytes()).hexdigest() for path in images}}
(Path(__file__).parent / 'document-checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
