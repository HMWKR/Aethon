# Aethon 사업계획·발표 온톨로지 계약

이 문서는 피벗 후 Aethon 사업계획과 발표자료에 쓰는 지식의 의미와 관계를 정의한다. 정본은 [사업 지식](business-plan/ontology.json)과 [발표 지식](presentation/ontology.json)이다. 현재 설계는 식별자와 타입이 있는 JSON 그래프이며 RDF/OWL 문서가 아니다. 전용 도구가 검사하는 제약과 사용자가 원문을 검토해야 하는 사항을 구별한다.

## 범위와 모델

온톨로지는 **개념 종류와 관계 규칙**을, 각 JSON의 레코드는 **그 규칙의 구체적인 인스턴스**를 제공한다. 예를 들어 `Claim`은 종류이고 `PPT-DATA-001`은 구체적인 주장이다. `BP-DATA-001`은 2025년 세계 녹음음악 매출에 관한 외부 통계이고 `BP-SRC-006`은 그 자료를 발표한 출처다. 이것이 Aethon의 매출이나 확보 가능 시장이라는 의미는 아니다.

| 종류 | 의미 | 현재 표현 |
|---|---|---|
| Source | 사용자 확인, 프로젝트 문서, 외부 발표 등의 출처. 출처 자체가 주장 전체의 진실을 보장하지 않음 | 사업 `sources`, 발표 `sources` |
| Decision | Aethon의 현재 방향에 관한 사용자 결정 또는 기록된 결정 | 사업 `concepts` 중 `classification=decision` |
| Evidence | 특정 범위의 시험 결과 또는 외부에서 보고한 수치 | 사업 `classification=evidence` |
| Hypothesis | 고객·문제·효과에 관한 검증 전 명제 | 사업 `classification=hypothesis` |
| Unknown | 확인할 정보가 부족하거나 별도 확인이 필요한 항목 | 사업 `classification=unknown`, 발표 `Unknown` |
| Experiment | 가설을 검토할 실험 설계. 설계가 수행 완료를 뜻하지 않음 | 사업 `classification=experiment` |
| Section | 사업계획의 한 장과 그 장에 필요한 입력 | 사업 `plan_sections` |
| Purpose / Audience | 발표가 이루려는 결과와 대상 | 발표 `entities` |
| Message / Claim | 청중에게 전달하는 메시지와 근거·상태를 구분할 주장 | 발표 `entities` |
| Slide / Visual / Review | 발표 단위, 시각 표현, 점검 활동 | 발표 `entities` |

`project_identity`, `customer_segment`, `external_quantitative_indicator` 같은 사업 `type`은 각 분류의 도메인 세부 종류다. `classification`과 `verification`은 의미와 증거 범위를 나타내며, 문자 그대로의 `FACT` 식별자가 모든 내용을 독립적으로 입증한다는 뜻이 아니다. 승인된 제품 방향, 실제 제품의 제한된 시험, 미검증 사업 효과와 미확인 수치를 혼동하지 않는다.

## 관계 계약

관계의 화살표는 **소비자 → 사용한 근거·의존 대상**이다. 기호 `|`는 허용하는 대안의 합을 뜻한다. `BPConcept`은 사업 개념(Decision, Evidence, Hypothesis, Unknown, Experiment)을 뜻하며, 발표 종류는 위 표의 이름을 사용한다.

| 관계 | 출발 종류 → 대상 종류 | 의미 |
|---|---|---|
| `supported_by` | BPConcept 또는 Claim → 같은 영역의 Source | 주장·관찰에 대한 출처 연결. 출처가 가설의 실제 효과를 입증했다는 뜻은 아님 |
| `depends_on` | BPConcept → BPConcept | 주장이 사용하거나 전제하는 지식 |
| `tests` | Experiment → Hypothesis | 실험 설계가 확인하려는 가설. 실험 실행·성공을 뜻하지 않음 |
| `constrained_by` | BPConcept → 사업 Unknown | 주장에 영향을 미치는 확인 필요 사항 |
| `addresses` | Purpose 또는 Message → Audience | 발표나 메시지의 대상 |
| `serves` | Message 또는 Slide → Purpose | 발표 목적과의 관계 |
| `conveys` | Slide → Message | 슬라이드가 전달하는 메시지 |
| `uses_claim` | Slide 또는 Message → Claim | 발표 단위가 사용하는 주장 |
| `visualizes` | Visual → Slide 또는 Claim | 시각 표현이 설명하는 대상 |
| `checks` | Review → Claim 또는 Audience | 검토 대상 |
| `requires` | Slide, Purpose, Visual 또는 Review → 발표 Unknown | 준비·제작에 필요한 미결 정보 |
| `inputs` | Section → BPConcept | 사업계획 장의 입력. JSON 배열을 그래프 의존 관계로 해석 |
| `same_topic`, `related_scope` | 발표 Claim → 사업 BPConcept | 동일 주제 또는 관련 범위의 항목 간 참조. 출처 검토 없이 완전히 같거나 입증됐음을 의미하지 않음 |
| `related_unknown` | 발표 Unknown → 사업 Unknown | 같은 확인 공백의 관련 항목 |

서로 다른 영역의 관계는 `external_references`에 명시한다. 외부 참조는 실제 대상 식별자가 있어야 하며 무관한 종류를 연결하지 않는다. 한 항목의 변경이 다른 항목에 미칠 영향을 찾을 때는 화살표를 **역방향**으로 따라간다. 예를 들어 `BP-SRC-006` ← `BP-DATA-001` ← `PPT-DATA-001` ← `PPT-SLIDE-006` 순서로 탐색한다. 이는 검토 대상 후보를 찾는 것이며 문서나 PPT 파일이 자동 수정된다는 뜻이 아니다.

## 데이터 계약과 증거 경계

1. 모든 출처·개념·장·발표 엔터티는 영역을 넘어 중복되지 않는 안정적인 `id`와 읽을 수 있는 제목이 있어야 한다. 기존 ID의 의미를 바꾸지 않고 의미가 크게 달라지면 새 ID를 발급한다. 과거 데이터는 임의로 삭제하거나 승격하지 않는다.
2. 사업 개념은 `type`, `classification`, `verification`, `description`, `limit`으로 세부 종류, 주장 상태, 증거 수준, 설명과 한계를 구분한다. 가설과 미확인은 `unverified`, 실행 전 실험은 `not_run`으로 유지한다. 출처 문서에 기록된 사실과 실제 제품 시험, 사용자 실측은 서로 다른 근거다.
3. 출처는 위치와 확인 가능한 범위를 기록한다. 저장소 파일은 루트 기준 경로와 해당 위치를, 외부 자료는 URL·확인일과 가능한 발행일을 갖는다. 사용자 대화는 대화 출처로 명시하며 존재하지 않는 로컬 파일 경로를 만들지 않는다.
4. 외부 수치인 사업 `external_quantitative_indicator`는 `value`, `unit`, `period`, `checked_at`, `limit` 및 출처 관계를 갖는다. 단위·지역·대상·조건은 한계나 설명에 남긴다. 범위는 두 값으로 표현하며 `초과`와 `이상`, 생성 시간과 완성 결과물 시간을 혼동하지 않는다. 계산된 API 단가는 계산식과 제외 비용을 함께 기록하고 실제 Aethon 청구로 승격하지 않는다.
5. 발표 `reported_external` 주장과 연결된 사업 수치는 표준화된 값·단위·기간 스냅샷으로 비교한다. 스냅샷은 변경 감지용이며 `same_topic` 자체는 동등성 증거가 아니다. 문장 안의 숫자, 보고서의 서술, 외부 PPT 산출물은 별도 원문 검토가 필요하다.
6. 외부 수치의 `checked_at`은 해당 시점에 확인한 날짜일 뿐 현재성이 영구 보장되는 기한이 아니다. 가격, 통계, 공급 조건과 사업 자료는 실제 작성·대외 제출 전에 원문을 다시 확인한다. 서로 다른 시점의 지표를 같은 기간으로 환산하거나, 산업 매출을 Aethon 고객·TAM·매출로 사용하지 않는다.

## 검증과 운영 경계

자동 검사 목표는 JSON 구조와 타입, 관계의 출발·도착, 식별자 중복·누락, 필수 속성 및 수치 스냅샷 일관성을 확인하는 것이다. 각 검사의 실제 실행 결과와 지원 범위는 도구의 사용 안내와 출력에서 확인한다. 검사 통과는 출처 내용의 진실성, 조사 시점 이후 최신성, 사업성, 사용권, 법적 권리, 실사용자 수용을 보증하지 않는다. 이를 판단하려면 해당 원문·실험 자료와 작성 맥락의 별도 검토가 필요하다.

실제 사업계획·PPT에는 사용한 항목 ID, 출처와 기준일을 남긴다. 기존 `docs/knowledge/project_kit`의 레지스트리는 별도 정본과 계약을 가진다. 이 JSON이 그 레지스트리에 자동 등록·승격되거나 제품 런타임 온톨로지에 자동 반영된다고 해석하지 않는다. 현재 작성 가이드와 기존 기록의 관계, 불일치 또는 자료 최신화 여부는 각각의 실제 문서를 기준으로 점검한다.
