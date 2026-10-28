# Aethon 프로젝트 작업 안내

## 사업계획서와 발표자료

외부 자료(양식·다른 계획서·평가 의견 등)를 분석해 Aethon에 맞게 다시 만드는 요청은 [적용 파이프라인](.claude/skills/aethon-adapt/SKILL.md)을 따른다. 순서는 원본 추상화 → 기준 로드 → 본질 점검 → 병렬 리서치 → 일반화 → 작성 → 독립 검증 → 기준 등록 → 보고다.

Aethon의 사업계획서, 투자·지원사업 제안서 또는 PPT를 작성·수정할 때는 작업에 맞는 아래 자료를 먼저 읽고 작성 기준으로 사용한다. 사용자의 현재 요청과 제출 양식이 더 구체적이면 그 요구에 맞게 적용한다.

- 사업계획: [사업계획 온톨로지 안내](docs/knowledge/business-plan/README.md), [작성 가이드](docs/knowledge/business-plan/WRITING-GUIDE.md), [온톨로지 데이터](docs/knowledge/business-plan/ontology.json).
- 발표자료: [발표 온톨로지 안내](docs/knowledge/presentation/README.md), [슬라이드 작성 브리프](docs/knowledge/presentation/SLIDE-BRIEF-TEMPLATE.md), [온톨로지 데이터](docs/knowledge/presentation/ontology.json).
- 경진대회 서류용 HWP 8칸: [제출 원고](docs/knowledge/business-plan/HWP8-SUBMISSION.md)와 [작성 가이드의 HWP 8칸 원칙](docs/knowledge/business-plan/WRITING-GUIDE.md), [전문가 의견 반영 기록](docs/knowledge/business-plan/REVIEW-FEEDBACK-20261016.md). HWP 원고는 md 기준 문서를 먼저 확정한 뒤 마지막 단계에서 고치므로 2026-10-28 후속 결정(`BP-FACT-015/016/017`)이 아직 반영되지 않았다. 반영 전 원고가 md 기준 문서([상세 사업계획서](docs/knowledge/business-plan/BUSINESS-PLAN.md)·[시장 범위](docs/knowledge/business-plan/MARKET-SCOPE.md)·조사·온톨로지)나 작성 가이드의 칸별 원칙과 다르면 기준 문서와 칸별 원칙을 따른다. 루트의 `01_hwp_8.md`·`aethon_v7*.md`는 피벗 이전 10월 16일 양식 원본이며 내용 근거로 쓰지 않는다.
- 최신 대표 정보·TAM/SAM/SOM/LAM·구조도 SVG/PNG·최종 PPT와 근거: [현재 IR 자료 모음](docs/knowledge/presentation/CURRENT-IR.md). 과거 후보 타깃과 최신 사용자 확인을 구분한다.
- 초기 타깃·경쟁·권리·시장 규모의 최신 근거는 [2026-10-28 조사](docs/knowledge/business-plan/RESEARCH-20261028.md)다(타깃 개정 `BP-FACT-014`, 웹툰 IP 추가 `BP-FACT-015`, AI 생성 표시 서술 폐기 `BP-FACT-016`, 3단계 글로벌 진출 일본 `BP-FACT-017`).
- 관련 수치는 [시장 조사](docs/knowledge/business-plan/RESEARCH-20261027.md)와 [비교 가격 조사](docs/knowledge/business-plan/COMPETITIVE-PRICES-20261027.md)에서 출처·측정 범위·기준일을 확인하고, 변동 가능한 외부 자료는 사용 전에 원문을 다시 확인한다.
- 작성 전 [온톨로지 운영 안내](docs/knowledge/ONTOLOGY-OPERATIONS.md)에 따라 그래프 검증과 작업 문맥을 생성하고, 저장한 문맥의 변경 여부를 확인한다. 근거가 바뀌면 `impact`로 관련 사업 장과 슬라이드를 찾고 실제 산출물을 검토한다.

피벗 후에도 Aethon 이름을 유지하는 현재 방향을 따르며, 제품 방향·제한된 시험·사업 가설·자사 실적을 구분한다. 확인되지 않은 고객 수, 매출, 가격, 원가나 과거 사업의 승계를 만들어 내지 않는다. 지식 파일의 출처와 식별자를 활용해 사업계획과 슬라이드의 주장을 연결하고, 근거가 바뀌면 영향을 받는 산출물을 다시 검토한다. 별도 기존 `project_kit`과의 조회는 운영 안내의 브리지를 사용하며, 신규 온톨로지의 자동 등록·PPT 자동 동기화는 지원하지 않는다.
